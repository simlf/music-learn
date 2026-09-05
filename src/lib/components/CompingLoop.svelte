<script lang="ts">
	import { onDestroy } from 'svelte';
	import Button from '$lib/components/Button.svelte';
	import ChordGlyph from '$lib/components/ChordGlyph.svelte';
	import PianoKeyboard from '$lib/components/PianoKeyboard.svelte';
	import { renderableOctaves } from '$lib/components/keyboardLayout';
	import { soundEnabled, startCompLoop, studyModeEnabled } from '$lib/audio/audio';
	import type { CompLoopHandle } from '$lib/audio/audio';
	import { onStrudelError, runStrudelPattern, stopStrudelPattern } from '$lib/audio/strudel';
	import { onPianorollError, startPianoroll, stopPianoroll } from '$lib/audio/strudelPianoroll';
	import type { PianorollTheme } from '$lib/audio/strudelPianoroll';
	import { BEATS_PER_BAR, TEMPO_DEFAULT, nudgeTempo } from '$lib/audio/loopTiming';
	import {
		buildCompBars,
		compBarScale,
		compScaleGhosts,
		romanShape,
		templateMode
	} from '$lib/practice/compLoop';
	import { toStrudelPattern } from '$lib/practice/liveCode';
	import { PROGRESSION_KEYS, PROGRESSION_TEMPLATES } from '$lib/practice/progressions';
	import { t, type MessageKey } from '$lib/i18n/locale.svelte';

	/**
	 * The comping loop: a play-along companion, not a drill.
	 *
	 * The app comps a progression on repeat and the player improvises over it.
	 * There is deliberately NO grading, NO scoring, NO FSRS card, and no right
	 * answer: improvisation cannot be graded, so pretending to grade it would be
	 * dishonest. Nothing in this component writes an answer event, touches the
	 * daily intro budget, or reaches the practice queue. See
	 * .planning/design/improvisation.md.
	 *
	 * Three controls and nothing else: the form, the key, and the tempo. The
	 * only readouts are the current bar's symbol and where you are in the form,
	 * so the player can follow it without looking away from the keys.
	 *
	 * One optional fourth control, default OFF so the plain comp above is
	 * untouched for anyone not improvising: SCALE draws the current bar's
	 * chord-scale over the keyboard (design doc 4.3.2 and 5.2). It is purely a
	 * READING of what the loop is already playing - the derivation is
	 * `compBarScale`, i.e. the very answer the Lookup improvisation board
	 * gives for that symbol - and it touches no audio at all: no second
	 * playback path, nothing to overlap when the bar turns over. Left hand
	 * (the loop) holds the chord, right hand (the player) reads the hatch.
	 *
	 * Progressions come from the one existing engine (progressions.ts, 3 forms x
	 * 12 keys) via compLoop.ts. Timing is Tone's Transport (audio.ts's
	 * startCompLoop), never setTimeout, because a timer-driven chord loop drifts
	 * audibly within a few bars.
	 *
	 * Teardown is the load-bearing part: the handle is stopped on destroy, so
	 * navigating away kills the Transport and releases every voice, and a start
	 * that is still awaiting its samples when the component unmounts is stopped
	 * the moment it resolves. Turning sound off stops the loop too, inside
	 * setSoundEnabled.
	 */

	/** Read once at mount: the toggle lives on another route, so flipping it unmounts this. */
	const soundOn = soundEnabled();
	const studyOn = studyModeEnabled();

	let templateId = $state(PROGRESSION_TEMPLATES[0].id);
	let key = $state(PROGRESSION_KEYS[0]);
	let tempo = $state(TEMPO_DEFAULT);
	let barIndex = $state(0);
	let running = $state(false);
	let starting = $state(false);
	/**
	 * "Loop this bar" (improvisation.md 3.4/design section 4.3.1's recommended
	 * single extension): repeats the CURRENTLY DISPLAYED bar instead of
	 * advancing through the form, so a change like unit 11's G7 resolution can
	 * be drilled on repeat at a chosen tempo. No engine change: `startCompLoop`
	 * already accepts any `CompLoopBar[]`, so this passes a one-bar slice
	 * instead of the whole form and simply never advances `barIndex`.
	 */
	let holdBar = $state(false);
	/**
	 * The chord-scale overlay. Default off, and off is byte-identical to the
	 * loop as it shipped: no `ghostKeys` prop reaches the keyboard, no extra
	 * line renders. Visual only - flipping it never restarts the loop, because
	 * nothing about the sound changes.
	 */
	let scaleOn = $state(false);

	/**
	 * ---- Live code escape hatch ----
	 *
	 * Inspired by the Strudel live-coding environment: the current bars,
	 * rendered as an editable pattern (`$lib/practice/liveCode`) the player can
	 * change and hear, via a second, deliberately separate engine
	 * ($lib/audio/strudel; see its header for why). Same discipline as the
	 * rest of this component: no grading, no persistence, and it stops the
	 * moment the player leaves it. The two engines never sound at once: each
	 * start stops whichever one was playing.
	 *
	 * Two follow-ups from that PR landed here: syntax highlighting (a
	 * CodeMirror 6 editor, `StrudelEditor.svelte` + `$lib/practice/strudelHighlight`,
	 * restyled to app tokens) and a pianoroll so the player SEES the pattern
	 * they hear (`$lib/audio/strudelPianoroll`, wrapping `@strudel/draw`). Both
	 * are pinned/self-hosted and code-split behind their own lazy chunk (see
	 * the PR body for exact gzipped sizes) - neither loads until this panel is
	 * actually opened.
	 */
	let liveCodeOpen = $state(false);
	/**
	 * CodeMirror only loads the first time this panel is opened, the same
	 * lazy-on-first-use discipline `$lib/audio/strudel` already applies to
	 * `@strudel/web` - an escape hatch nobody opens should cost nothing on
	 * every other visit to this page.
	 */
	let strudelEditorModule = $state<Promise<typeof import('$lib/components/StrudelEditor.svelte')> | null>(
		null
	);
	let liveCodeText = $state('');
	let liveCodeRunning = $state(false);
	let liveCodeError = $state<string | null>(null);
	let liveCodeUnavailable = $state(false);
	/** The pianoroll canvas failed to load or draw; the pattern itself is still sounding fine (offline-honest, never a silent no-op). */
	let liveCodeVisualUnavailable = $state(false);
	let unsubscribeLiveCodeError: (() => void) | null = null;
	let unsubscribeLiveCodePianorollError: (() => void) | null = null;
	let liveCodeCanvas: HTMLCanvasElement | undefined = $state();

	let handle: CompLoopHandle | null = null;
	/**
	 * Bumped by every start and every stop request (including destroy), so an
	 * awaited start that resolves after the user stopped, changed the form, or
	 * left the page stops its own loop instead of leaving it playing.
	 */
	let intent = 0;

	const bars = $derived(buildCompBars(templateId, key));
	const currentBar = $derived(bars[barIndex] ?? bars[0]);
	const mode = $derived(templateMode(templateId));
	/** A ♭5 bar comps three notes above the root (3rd, ♭5, 7th), so the caption gains its sibling line. */
	const flatFiveBar = $derived((currentBar?.notes.length ?? 0) > 3);

	/*
	 * ---- The scale overlay ----
	 *
	 * Derived PER BAR, so it follows the changes the way the player's right
	 * hand has to. Every octave the board can render is hatched, taken from
	 * the board's own `renderableOctaves` rather than restated here: the
	 * loop's keyboard is the responsive one (one octave on a phone, two once
	 * there is room, and either span ends on a trailing C an octave above its
	 * span), and the comp's own notes are assigned to keys by position, so
	 * which octave a given scale note should appear in is not knowable here.
	 * Entries whose octave is not rendered simply match no key.
	 *
	 * The overlay stays an INSTRUMENT (design doc section 6): no grade, no
	 * counter, no streak, and no tap-a-key verdict. The verdict caption the
	 * Lookup board offers is per-chord prose, and a bar lasts four beats - it
	 * would be stale before it could be read, and reading is not what the
	 * player's hands are doing here.
	 */
	const OVERLAY_OCTAVES = renderableOctaves();
	const barScale = $derived(scaleOn && currentBar ? compBarScale(currentBar.symbol) : null);
	const scaleGhosts = $derived(barScale ? compScaleGhosts(barScale, OVERLAY_OCTAVES) : undefined);
	/**
	 * "G mixolydian", assembled exactly as the Lookup board assembles it: the
	 * tonic is a letter (an immune display value) and the mode name comes from
	 * the shared `improvise.scale.name.*` dictionary, so the two surfaces can
	 * never name the same scale differently.
	 */
	const scaleTitle = $derived(
		barScale ? `${barScale.tonic} ${t(`improvise.scale.name.${barScale.id}` as MessageKey)}` : ''
	);
	const scaleLine = $derived(
		t('learn.comping.scaleLine')
			.replace('{BAR}', String(barIndex + 1))
			.replace('{SCALE}', scaleTitle)
	);

	async function start(): Promise<void> {
		if (liveCodeRunning) stopLiveCode();
		const mine = ++intent;
		starting = true;
		// Holding: play only the one bar currently on screen, on repeat, and
		// never move barIndex - the on-screen bar IS the held bar for the whole
		// run. Not holding: the full form, advancing as it always has.
		const loopBars = holdBar ? bars.slice(barIndex, barIndex + 1) : bars;
		const started = await startCompLoop({
			bars: loopBars.map((bar) => ({ pitches: bar.pitches })),
			bpm: tempo,
			beatsPerBar: BEATS_PER_BAR,
			roll: studyOn,
			onBar: holdBar
				? undefined
				: (index) => {
						if (intent === mine) barIndex = index;
					}
		});
		if (mine !== intent) {
			// Stopped, restarted, or unmounted while the piano was loading.
			started?.stop();
			return;
		}
		starting = false;
		handle = started;
		running = started !== null;
	}

	function stop(): void {
		intent += 1;
		starting = false;
		running = false;
		barIndex = 0;
		handle?.stop();
		handle = null;
	}

	function toggle(): void {
		if (running || starting) stop();
		else void start();
	}

	/**
	 * Flips hold on or off. If a loop is already running, restarts it under
	 * the new mode on the SAME bar the player was just hearing: `stop()`
	 * zeroes `barIndex`, so the bar to resume on is captured before it runs.
	 */
	function toggleHold(): void {
		const wasPlaying = running || starting;
		const resumeIndex = barIndex;
		holdBar = !holdBar;
		if (wasPlaying) {
			stop();
			barIndex = resumeIndex;
			void start();
		}
	}

	/** Visual only: the loop keeps playing exactly as it was. */
	function toggleScale(): void {
		scaleOn = !scaleOn;
	}

	/** Changing the form or the key restarts the loop from bar 1 if it is playing. */
	function reseed(): void {
		const wasPlaying = running || starting;
		stop();
		if (wasPlaying) void start();
	}

	function pickForm(id: string): void {
		if (id === templateId) return;
		templateId = id;
		reseed();
	}

	function pickKey(next: string): void {
		if (next === key) return;
		key = next;
		reseed();
	}

	function changeTempo(direction: 1 | -1): void {
		const next = nudgeTempo(tempo, direction);
		if (next === tempo) return;
		tempo = next;
		handle?.setTempo(next);
	}

	/** The seeded pattern for the CURRENT bars and tempo, in Strudel's own syntax. */
	function seedLiveCode(): void {
		liveCodeText = toStrudelPattern(bars, tempo);
		liveCodeError = null;
		liveCodeUnavailable = false;
		liveCodeVisualUnavailable = false;
	}

	/** Reads the pianoroll's colours from the app's own CSS tokens (app.css), never a hardcoded hex. */
	function pianorollTheme(): PianorollTheme {
		const style = getComputedStyle(document.documentElement);
		return {
			active: style.getPropertyValue('--color-vermilion').trim(),
			inactive: style.getPropertyValue('--color-ink').trim(),
			background: 'transparent',
			playheadColor: style.getPropertyValue('--color-muted').trim()
		};
	}

	/**
	 * Sizes the canvas backing store for the device's pixel ratio, so notes
	 * stay crisp rather than blurry. `drawPianoroll` computes every
	 * coordinate as a fraction of `ctx.canvas.width`/`height` (the backing
	 * store, not the CSS size), so a bigger backing store alone is enough -
	 * no `ctx.scale()`, which would double-apply the ratio and draw
	 * everything squeezed into one corner.
	 */
	function sizeLiveCodeCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
		const ratio = window.devicePixelRatio || 1;
		canvas.width = canvas.clientWidth * ratio;
		canvas.height = canvas.clientHeight * ratio;
		return canvas.getContext('2d');
	}

	/**
	 * Opens or closes the live-code panel. Opening seeds it from what is on
	 * screen right now; closing stops whatever pattern was playing, since a
	 * sound with no visible stop control left behind would be dishonest.
	 */
	function toggleLiveCode(): void {
		liveCodeOpen = !liveCodeOpen;
		if (liveCodeOpen) {
			seedLiveCode();
			strudelEditorModule ??= import('$lib/components/StrudelEditor.svelte');
		} else if (liveCodeRunning) stopLiveCode();
	}

	/** Reseeds the pattern from the current form/key/tempo, discarding edits. */
	function resetLiveCode(): void {
		seedLiveCode();
	}

	/**
	 * Runs the edited pattern on Strudel's own engine, stopping the main loop
	 * first, and starts a matching pianoroll on the panel's canvas so the
	 * player SEES what they hear. The pianoroll is a bonus, never a gate: a
	 * failed visualization (chunk never cached offline, no 2d context) shows
	 * its own honest message but never stops or masks the sounding pattern.
	 */
	async function playLiveCode(): Promise<void> {
		if (running || starting) stop();
		liveCodeError = null;
		liveCodeUnavailable = false;
		liveCodeVisualUnavailable = false;
		if (!unsubscribeLiveCodeError) {
			unsubscribeLiveCodeError = onStrudelError((message) => {
				liveCodeError = message;
			});
		}
		if (!unsubscribeLiveCodePianorollError) {
			unsubscribeLiveCodePianorollError = onPianorollError(() => {
				liveCodeVisualUnavailable = true;
			});
		}
		const result = await runStrudelPattern(liveCodeText);
		if (!result.ok) {
			liveCodeUnavailable = true;
			return;
		}
		liveCodeRunning = true;
		const ctx = liveCodeCanvas && sizeLiveCodeCanvas(liveCodeCanvas);
		if (ctx && result.pattern && result.now) {
			const drawn = await startPianoroll(result.pattern, result.now, ctx, pianorollTheme());
			liveCodeVisualUnavailable = !drawn.ok;
		} else {
			liveCodeVisualUnavailable = true;
		}
	}

	function stopLiveCode(): void {
		liveCodeRunning = false;
		stopStrudelPattern();
		stopPianoroll();
	}

	onDestroy(() => {
		stop();
		if (liveCodeRunning) stopLiveCode();
		unsubscribeLiveCodeError?.();
		unsubscribeLiveCodePianorollError?.();
	});
</script>

<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
	{t('learn.comping.label')}
</p>
<h2 class="text-heading font-bold">{t('learn.comping.heading')}</h2>
<p class="text-body">{t('learn.comping.intro')}</p>

{#if !soundOn}
	<p class="text-body text-muted" data-testid="comping-sound-off">{t('learn.comping.soundOff')}</p>
{/if}

<div class="flex flex-col gap-2">
	<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
		{t('learn.comping.formLabel')}
	</p>
	<div class="flex flex-wrap gap-2" data-testid="comping-form-row">
		{#each PROGRESSION_TEMPLATES as template (template.id)}
			<Button
				type="button"
				variant={template.id === templateId ? 'primary' : 'ghost'}
				aria-pressed={template.id === templateId}
				onclick={() => pickForm(template.id)}
			>
				{romanShape(template.id)}
			</Button>
		{/each}
	</div>
</div>

<div class="flex flex-col gap-2">
	<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
		{t('learn.comping.keyLabel')}
	</p>
	<div class="flex flex-wrap gap-2" data-testid="comping-key-row">
		{#each PROGRESSION_KEYS as root (root)}
			<Button
				type="button"
				variant={root === key ? 'primary' : 'ghost'}
				aria-pressed={root === key}
				onclick={() => pickKey(root)}
			>
				{root}
			</Button>
		{/each}
	</div>
</div>

<div class="flex flex-col gap-2">
	<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
		{t('learn.comping.tempoLabel')}
	</p>
	<div class="flex flex-wrap items-center gap-4" data-testid="comping-tempo-row">
		<Button
			type="button"
			variant="ghost"
			aria-label={t('learn.comping.tempoDown')}
			onclick={() => changeTempo(-1)}
		>
			−
		</Button>
		<span class="text-body font-mono font-bold" data-testid="comping-tempo-value">
			{tempo} {t('learn.comping.tempoUnit')}
		</span>
		<Button
			type="button"
			variant="ghost"
			aria-label={t('learn.comping.tempoUp')}
			onclick={() => changeTempo(1)}
		>
			+
		</Button>
	</div>
</div>

<div class="flex flex-col gap-2">
	<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
		{t('learn.comping.holdLabel')}
	</p>
	<div class="flex flex-wrap gap-2" data-testid="comping-hold-row">
		<Button type="button" variant={holdBar ? 'primary' : 'ghost'} aria-pressed={holdBar} onclick={toggleHold}>
			{t('learn.comping.holdBar')}
		</Button>
	</div>
</div>

<div class="flex flex-col gap-2">
	<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
		{t('learn.comping.scaleLabel')}
	</p>
	<div class="flex flex-wrap gap-2" data-testid="comping-scale-row">
		<Button
			type="button"
			variant={scaleOn ? 'primary' : 'ghost'}
			aria-pressed={scaleOn}
			onclick={toggleScale}
		>
			{t('learn.comping.scaleChip')}
		</Button>
	</div>
</div>

<div class="flex flex-col gap-2">
	<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
		{t('learn.comping.liveCodeLabel')}
	</p>
	<div class="flex flex-wrap gap-2" data-testid="comping-livecode-row">
		<Button
			type="button"
			variant={liveCodeOpen ? 'primary' : 'ghost'}
			aria-pressed={liveCodeOpen}
			onclick={toggleLiveCode}
		>
			{t('learn.comping.liveCodeChip')}
		</Button>
	</div>
</div>

{#if liveCodeOpen}
	<div class="border-ink flex flex-col gap-2 border-t-2 pt-4" data-testid="comping-livecode-panel">
		<p class="text-body">{t('learn.comping.liveCodeIntro')}</p>
		{#if strudelEditorModule}
			{#await strudelEditorModule then { default: StrudelEditor }}
				<StrudelEditor bind:value={liveCodeText} dataTestId="comping-livecode-input" />
			{/await}
		{/if}
		<canvas
			bind:this={liveCodeCanvas}
			class="border-ink bg-paper-bright h-24 w-full border-2"
			data-testid="comping-livecode-pianoroll"
		></canvas>
		<div class="flex flex-wrap gap-2">
			<Button type="button" variant="primary" disabled={!soundOn} onclick={playLiveCode}>
				{t('learn.comping.liveCodePlay')}
			</Button>
			<Button type="button" variant="ghost" onclick={stopLiveCode}>
				{t('learn.comping.liveCodeStop')}
			</Button>
			<Button type="button" variant="ghost" onclick={resetLiveCode}>
				{t('learn.comping.liveCodeReset')}
			</Button>
		</div>
		{#if liveCodeUnavailable}
			<p class="text-body text-muted" data-testid="comping-livecode-unavailable">
				{t('learn.comping.liveCodeUnavailable')}
			</p>
		{/if}
		{#if liveCodeVisualUnavailable}
			<p class="text-body text-muted" data-testid="comping-livecode-visual-unavailable">
				{t('learn.comping.liveCodeVisualUnavailable')}
			</p>
		{/if}
		{#if liveCodeError}
			<p class="text-body" data-testid="comping-livecode-error">
				{t('learn.comping.liveCodeErrorPrefix')}
				{liveCodeError}
			</p>
		{/if}
	</div>
{/if}

<div>
	<Button type="button" variant="primary" disabled={!soundOn} onclick={toggle}>
		{#if starting}
			{t('learn.comping.starting')}
		{:else if running}
			{t('learn.comping.stop')}
		{:else}
			{t('learn.comping.start')}
		{/if}
	</Button>
</div>

{#if currentBar}
	<div class="border-ink mt-4 flex flex-col gap-4 border-t-2 pt-4">
		<p
			class="text-label font-mono uppercase"
			style="letter-spacing: 0.08em;"
			data-testid="comping-position"
		>
			{t('learn.comping.keyLabel')}: {key}
			{t(mode === 'minor' ? 'progressions.key.minor' : 'progressions.key.major')} ·
			{t('progressions.bar.progress.label')}
			{barIndex + 1} / {bars.length}
		</p>

		<div class="flex flex-wrap items-end gap-4">
			<ChordGlyph root={currentBar.root} quality={currentBar.quality} />
		</div>

		<div class="flex flex-wrap gap-2" data-testid="comping-bar-strip">
			{#each bars as bar (bar.index)}
				<div
					class="border-ink flex min-w-[56px] flex-col items-center gap-1 border-2 px-2 py-1 {bar.index ===
					barIndex
						? 'bg-ink text-paper'
						: 'text-muted'}"
					data-testid="comping-bar-chip"
					data-current={bar.index === barIndex ? 'true' : undefined}
				>
					<span class="text-label font-mono">{bar.roman}</span>
					<span class="text-body">{bar.symbol}</span>
				</div>
			{/each}
		</div>

		<PianoKeyboard notes={currentBar.notes} ghostKeys={scaleGhosts} />
		{#if barScale}
			<p class="text-body font-bold" data-testid="comping-scale-line">{scaleLine}</p>
			<p class="text-body text-muted" data-testid="comping-scale-caption">
				{t('learn.comping.scaleCaption')}
			</p>
		{/if}
		<p class="text-body text-muted">{t('learn.comping.keyboardCaption')}</p>
		<p class="text-body">{t('learn.comping.voicingCaption')}</p>
		{#if flatFiveBar}
			<p class="text-body" data-testid="comping-flat5-caption">
				{t('learn.comping.voicingCaption-flat5')}
			</p>
		{/if}
		{#if studyOn}
			<p class="text-body text-muted" data-testid="comping-study-note">
				{t('learn.comping.studyNote')}
			</p>
		{/if}
		{#if holdBar}
			<p class="text-body text-muted" data-testid="comping-hold-note">
				{t('learn.comping.holdNote')}
			</p>
		{/if}
	</div>
{/if}
