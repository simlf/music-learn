<script lang="ts">
	import { onDestroy } from 'svelte';
	import Button from '$lib/components/Button.svelte';
	import PianoKeyboard from '$lib/components/PianoKeyboard.svelte';
	import { soundEnabled } from '$lib/audio/audio';
	import { onStrudelError, runStrudelPattern, stopStrudelPattern } from '$lib/audio/strudel';
	import { spellChord } from '$lib/theory/chord';
	import { compBarScale, compScaleGhosts } from '$lib/practice/compLoop';
	import {
		CHORD_SCALE_CONCEPT_SYMBOL,
		chordScaleConceptLetters,
		chordScaleConceptPattern
	} from '$lib/practice/chordScalePattern';
	import { t } from '$lib/i18n/locale.svelte';

	/**
	 * PR #80 follow-up 2 (`.planning/design/improvisation.md`): the
	 * chord-tones-vs-scale-tones concept, shown and heard rather than told.
	 * Renders in `TheoryLessons.svelte` on /learn, right after the guide-tone
	 * lesson (unit 11) and before the dominant-function lesson: both of those
	 * assume the reader already knows a chord tone from a scale tone, and
	 * nothing on /learn taught that distinction before this section.
	 *
	 * Fixed to one demo (Cmaj7 over C ionian, `chordScalePattern.ts`'s own
	 * reference case), same as the guide-tone lesson's fixed ii V I in C: one
	 * clear example beats a picker for a "tiny" concept lesson. The keyboard
	 * half is the SHOW (chord tones role-filled by `PianoKeyboard`'s own
	 * `notes` prop, the rest of the scale ghost-hatched via `compScaleGhosts`,
	 * the exact visual grammar the comping loop's SCALE overlay and the
	 * Lookup board already use); the pattern half is the EDITABLE SOUND,
	 * mirroring `CompingLoop.svelte`'s own live-code escape hatch: an editable
	 * Strudel textarea plus Play/Stop/Reset, on the SAME engine
	 * ($lib/audio/strudel), never a duplicate.
	 *
	 * No grading, no counter, no persistence, no drill seed: reference and
	 * instrument only, per the design doc's standing rule for every
	 * improvisation-adjacent surface. This component does not stop the
	 * comping loop's own Tone Transport if it happens to be running above it
	 * on the same page; TheoryLessons's other demo buttons (hearSentence,
	 * hearGuideTones, hearResolution) already share that same non-exclusive
	 * precedent on audio.ts, and this section's own playback stops itself on
	 * unmount, so nothing is left sounding with no visible stop control.
	 */

	const soundOn = soundEnabled();

	const chord = spellChord(CHORD_SCALE_CONCEPT_SYMBOL);
	const scale = compBarScale(CHORD_SCALE_CONCEPT_SYMBOL);
	const ghosts = scale ? compScaleGhosts(scale, [4]) : undefined;
	const letters = chordScaleConceptLetters();

	let patternText = $state(chordScaleConceptPattern());
	let running = $state(false);
	let error = $state<string | null>(null);
	let unavailable = $state(false);
	let unsubscribeError: (() => void) | null = null;

	function resetPattern(): void {
		patternText = chordScaleConceptPattern();
		error = null;
		unavailable = false;
	}

	async function play(): Promise<void> {
		error = null;
		unavailable = false;
		if (!unsubscribeError) {
			unsubscribeError = onStrudelError((message) => {
				error = message;
			});
		}
		const result = await runStrudelPattern(patternText);
		if (!result.ok) {
			unavailable = true;
			return;
		}
		running = true;
	}

	function stop(): void {
		running = false;
		stopStrudelPattern();
	}

	onDestroy(() => {
		if (running) stop();
		unsubscribeError?.();
	});
</script>

<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
	{t('theory.chordScale.label')}
</p>
<h2 class="text-heading font-bold">{t('theory.chordScale.heading')}</h2>
<p class="text-body">{t('theory.chordScale.body')}</p>

<div style="max-width: 100%;">
	<PianoKeyboard notes={chord.notes} ghostKeys={ghosts} />
</div>

<p class="text-body" data-testid="chord-scale-chord-tones">
	{t('theory.chordScale.chordToneCaption')}
	{letters.chordTones.join(', ')}
</p>
<p class="text-body text-muted" data-testid="chord-scale-scale-tones">
	{t('theory.chordScale.scaleToneCaption')}
	{letters.scaleTones.join(', ')}
</p>

{#if !soundOn}
	<p class="text-body text-muted" data-testid="chord-scale-sound-off">
		{t('theory.chordScale.soundOff')}
	</p>
{/if}

<div class="flex flex-col gap-2">
	<textarea
		class="border-ink bg-paper-bright font-mono w-full border-2 p-2"
		rows="4"
		spellcheck="false"
		data-testid="chord-scale-pattern-input"
		bind:value={patternText}
	></textarea>
	<div class="flex flex-wrap gap-2">
		<Button type="button" variant="primary" disabled={!soundOn} onclick={play}>
			{t('theory.chordScale.play')}
		</Button>
		<Button type="button" variant="ghost" onclick={stop}>
			{t('theory.chordScale.stop')}
		</Button>
		<Button type="button" variant="ghost" onclick={resetPattern}>
			{t('theory.chordScale.reset')}
		</Button>
	</div>
	{#if unavailable}
		<p class="text-body text-muted" data-testid="chord-scale-unavailable">
			{t('theory.chordScale.unavailable')}
		</p>
	{/if}
	{#if error}
		<p class="text-body" data-testid="chord-scale-error">
			{t('theory.chordScale.errorPrefix')}
			{error}
		</p>
	{/if}
</div>
