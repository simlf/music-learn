<script lang="ts">
	import { onDestroy } from 'svelte';
	import Button from '$lib/components/Button.svelte';
	import ChordGlyph from '$lib/components/ChordGlyph.svelte';
	import PianoKeyboard from '$lib/components/PianoKeyboard.svelte';
	import { soundEnabled, startCompLoop, studyModeEnabled } from '$lib/audio/audio';
	import type { CompLoopHandle } from '$lib/audio/audio';
	import { BEATS_PER_BAR, TEMPO_DEFAULT, nudgeTempo } from '$lib/audio/loopTiming';
	import { buildCompBars, romanShape, templateMode } from '$lib/practice/compLoop';
	import { PROGRESSION_KEYS, PROGRESSION_TEMPLATES } from '$lib/practice/progressions';
	import { t } from '$lib/i18n/locale.svelte';

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

	async function start(): Promise<void> {
		const mine = ++intent;
		starting = true;
		const started = await startCompLoop({
			bars: bars.map((bar) => ({ pitches: bar.pitches })),
			bpm: tempo,
			beatsPerBar: BEATS_PER_BAR,
			roll: studyOn,
			onBar: (index) => {
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

	onDestroy(() => {
		stop();
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

		<PianoKeyboard notes={currentBar.notes} />
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
	</div>
{/if}
