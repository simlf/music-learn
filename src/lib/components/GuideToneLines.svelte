<script lang="ts">
	import { onDestroy } from 'svelte';
	import Button from '$lib/components/Button.svelte';
	import { onAppAudioStart, soundEnabled } from '$lib/audio/audio';
	import { onStrudelError, runStrudelPattern, stopStrudelPattern } from '$lib/audio/strudel';
	import { onPianorollError, startPianoroll, stopPianoroll } from '$lib/audio/strudelPianoroll';
	import { pianorollThemeFromTokens, sizePianorollCanvas } from '$lib/audio/pianorollCanvas';
	import { chordLabel, spellChord } from '$lib/theory/chord';
	import {
		GUIDE_TONE_CYCLE_KEYS,
		guideToneCycleBars,
		guideToneLines,
		guideTonePattern
	} from '$lib/practice/guideToneCycle';
	import { t } from '$lib/i18n/locale.svelte';

	/**
	 * Chapter 11's concept, heard (`.planning/design/improvisation.md` 4.3:
	 * the unit's EAR, never its grader): the ii-V-I of a chosen key as an
	 * editable Strudel pattern, one `note(...)` line per voice (the two guide
	 * tones, then the roots, `guideToneCycle.guideTonePattern`), with a
	 * pianoroll so the falling line is SEEN while it is heard. Deleting the
	 * roots line and hearing that the two guide tones still say ii V I is the
	 * point of making it editable.
	 *
	 * Same engine and discipline as the comping loop's live-code panel
	 * (`$lib/audio/strudel`, `$lib/audio/strudelPianoroll`): no grading, no
	 * counter, no persistence, and it stops when the page goes. The two
	 * engines never sound at once: anything on the page that plays through
	 * audio.ts (the lesson's Hear it, the drill's keys and Hear) stops this
	 * pattern first (`onAppAudioStart`). A play still loading when it is
	 * stopped, reseeded or left carries a generation token, so it hushes
	 * itself the moment it resolves instead of looping on. Strudel, the
	 * pianoroll and the CodeMirror editor are all lazy: nothing loads until
	 * Play or "Edit the pattern" is pressed (AGENTS.md: a static import of
	 * `StrudelEditor.svelte` would defeat that).
	 */

	const soundOn = soundEnabled();

	let key = $state('C');
	let patternText = $state(guideTonePattern('C'));
	let editorOpen = $state(false);
	let strudelEditorModule = $state<Promise<typeof import('$lib/components/StrudelEditor.svelte')> | null>(
		null
	);
	let running = $state(false);
	let error = $state<string | null>(null);
	let unavailable = $state(false);
	let visualUnavailable = $state(false);
	let canvas: HTMLCanvasElement | undefined = $state();
	let unsubscribeError: (() => void) | null = null;
	let unsubscribePianorollError: (() => void) | null = null;
	/** Bumped by every play and every stop (including a key change and destroy): a play whose awaits resolve under an older token is stale. */
	let generation = 0;
	const unsubscribeAppAudio = onAppAudioStart(stop);

	const symbols = $derived(guideToneCycleBars(key).map((bar) => chordLabel(spellChord(bar.symbol))));
	const lines = $derived(guideToneLines(key));
	const upperLetters = $derived(lines.upper.notes.map((note) => note.letter).join(' → '));
	const lowerLetters = $derived(lines.lower.notes.map((note) => note.letter).join(' → '));

	function seed(): void {
		patternText = guideTonePattern(key);
		error = null;
		unavailable = false;
		visualUnavailable = false;
	}

	/** Picking a key reseeds the pattern for it, discarding edits, and stops what was playing. */
	function pickKey(next: string): void {
		stop();
		key = next;
		seed();
	}

	function toggleEditor(): void {
		editorOpen = !editorOpen;
		if (editorOpen) strudelEditorModule ??= import('$lib/components/StrudelEditor.svelte');
	}

	async function play(): Promise<void> {
		const mine = ++generation;
		error = null;
		unavailable = false;
		visualUnavailable = false;
		unsubscribeError ??= onStrudelError((message) => {
			error = message;
		});
		unsubscribePianorollError ??= onPianorollError(() => {
			visualUnavailable = true;
		});
		const result = await runStrudelPattern(patternText);
		if (mine !== generation) {
			if (result.ok) stopStrudelPattern();
			return;
		}
		if (!result.ok) {
			unavailable = true;
			return;
		}
		running = true;
		const ctx = canvas && sizePianorollCanvas(canvas);
		if (ctx && result.pattern && result.now) {
			const drawn = await startPianoroll(result.pattern, result.now, ctx, pianorollThemeFromTokens());
			if (mine !== generation) {
				stopPianoroll();
				return;
			}
			visualUnavailable = !drawn.ok;
		} else {
			visualUnavailable = true;
		}
	}

	function stop(): void {
		generation += 1;
		running = false;
		stopStrudelPattern();
		stopPianoroll();
	}

	onDestroy(() => {
		stop();
		unsubscribeAppAudio();
		unsubscribeError?.();
		unsubscribePianorollError?.();
	});
</script>

<div class="flex flex-col gap-4" data-testid="guide-lines">
	<div class="flex flex-col gap-2">
		<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">{t('book.ch11.lines.keyLabel')}</p>
		<div class="flex flex-wrap gap-2" data-testid="guide-lines-key-row">
			{#each GUIDE_TONE_CYCLE_KEYS as candidate (candidate)}
				<Button
					type="button"
					variant={candidate === key ? 'primary' : 'ghost'}
					aria-pressed={candidate === key}
					onclick={() => pickKey(candidate)}
				>
					{candidate}
				</Button>
			{/each}
		</div>
	</div>

	<p class="text-body font-bold" data-testid="guide-lines-symbols">{symbols.join(' ')}</p>
	<p class="text-body" data-testid="guide-lines-upper">{t('book.ch11.lines.upper')} {upperLetters}</p>
	<p class="text-body" data-testid="guide-lines-lower">{t('book.ch11.lines.lower')} {lowerLetters}</p>

	<canvas
		bind:this={canvas}
		class="border-ink bg-paper-bright h-24 w-full border-2"
		data-testid="guide-lines-pianoroll"
	></canvas>

	{#if !soundOn}
		<p class="text-body text-muted" data-testid="guide-lines-sound-off">{t('book.ch11.lines.soundOff')}</p>
	{/if}

	<div class="flex flex-wrap gap-2">
		<Button type="button" variant="primary" disabled={!soundOn} onclick={play}>
			{t('book.ch11.lines.play')}
		</Button>
		<Button type="button" variant="ghost" onclick={stop}>{t('book.ch11.lines.stop')}</Button>
		<Button
			type="button"
			variant={editorOpen ? 'primary' : 'ghost'}
			aria-pressed={editorOpen}
			onclick={toggleEditor}
		>
			{t('book.ch11.lines.edit')}
		</Button>
		<Button type="button" variant="ghost" onclick={seed}>{t('book.ch11.lines.reset')}</Button>
	</div>

	{#if editorOpen}
		<div class="border-ink flex flex-col gap-2 border-t-2 pt-4" data-testid="guide-lines-editor">
			<p class="text-body">{t('book.ch11.lines.editIntro')}</p>
			{#if strudelEditorModule}
				{#await strudelEditorModule then { default: StrudelEditor }}
					<StrudelEditor bind:value={patternText} dataTestId="guide-lines-input" />
				{/await}
			{/if}
		</div>
	{/if}

	{#if unavailable}
		<p class="text-body text-muted" data-testid="guide-lines-unavailable">{t('book.ch11.lines.unavailable')}</p>
	{/if}
	{#if visualUnavailable}
		<p class="text-body text-muted" data-testid="guide-lines-visual-unavailable">
			{t('book.ch11.lines.visualUnavailable')}
		</p>
	{/if}
	{#if error}
		<p class="text-body" data-testid="guide-lines-error">
			{t('book.ch11.lines.errorPrefix')}
			{error}
		</p>
	{/if}
</div>
