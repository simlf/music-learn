<script lang="ts">
	import { untrack } from 'svelte';
	import { generateQuestion, type ChordQuestion } from '$lib/drills/generateQuestion';
	import { spellChord } from '$lib/theory/chord';
	import { ensureAudioReady, playChord } from '$lib/audio/audio';
	import PianoKeyboard from './PianoKeyboard.svelte';
	import ChordGlyph from './ChordGlyph.svelte';
	import Button from './Button.svelte';
	import { t } from '$lib/i18n/locale.svelte';

	/**
	 * Practice hub render component (27-03): the name-it (chord
	 * identification) family, extracted so the Phase 27 host can mount one
	 * per queue item without re-entangling drills' monolith. Mirrors
	 * drills' identification branch (`src/routes/drills/+page.svelte`
	 * L1068-1099 prompt/choice-grid, L1153-1225 feedback) verbatim: grading
	 * is a symbol pick (never played-note chroma matching), the keyboard
	 * shows the chord's own notes throughout, and the correct-symbol glyph
	 * only reveals on a miss - a correct answer shows no extra chrome
	 * beyond the interval-badge reveal on the keyboard itself.
	 *
	 * Generation/grading is entirely delegated to the shared pure modules
	 * (generateQuestion, spellChord) - REG-01: no logic duplicated from
	 * drills, this component only re-authors the small markup.
	 */
	interface Props {
		/** The chord symbol this item drills (from the host's queue). */
		symbol: string;
		/** Fired exactly once, at the user's Next tap after the reveal. */
		onComplete: (correct: boolean) => void;
	}

	let { symbol, onComplete }: Props = $props();

	/**
	 * Computed once at init from the supplied symbol (a fresh component
	 * instance is expected per queue item, mirroring BuildSession/
	 * ShellVoicingDrill/ProgressionDrill's own embed-seam precedent of a
	 * one-shot init read rather than a live reactive re-derivation). Read via
	 * untrack (mirrors BuildSession's embedFact read) since this is a
	 * deliberate init-time snapshot, not a reactive dependency on `symbol`.
	 */
	const target = untrack(() => spellChord(symbol));
	const question = untrack(
		() => generateQuestion({ symbol, direction: 'identification' }) as ChordQuestion
	);

	let answered = $state(false);
	let correct = $state(false);

	/**
	 * Identification grading (drills D-05 parity): tapping a choice IS the
	 * complete answer - a symbol pick against the correct answer, never
	 * played-note chroma. Every answer plays the reveal chord once,
	 * correct or not, matching drills' recordGrade reveal rule.
	 */
	function selectChoice(choice: string): void {
		if (answered) return;
		answered = true;
		correct = choice === symbol;
		void ensureAudioReady();
		playChord(target.notes.map((note) => note.letter));
	}

	function handleNext(): void {
		onComplete(correct);
	}
</script>

<div data-testid="practice-chord-drill">
	<p class="text-body">{t('drills.prompt.nameChord')}</p>

	<div class="mt-4">
		<PianoKeyboard notes={target.notes} inspectable showIntervalBadges={answered} />
	</div>

	<div class="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4" data-testid="choice-grid">
		{#each question.choices ?? [] as choice (choice)}
			<Button
				type="button"
				variant="ghost"
				disabled={answered}
				aria-label={`${t('drills.aria.answerPrefix')} ${choice}`}
				onclick={() => selectChoice(choice)}
			>
				<span class="font-serif text-heading font-bold">{choice}</span>
			</Button>
		{/each}
	</div>

	{#if answered}
		<div class="mt-4 stamp" data-testid="chord-drill-feedback">
			{#if !correct}
				<div class="flex items-start gap-4">
					<ChordGlyph root={target.root} quality={target.symbol.slice(target.root.length)} />
				</div>
			{/if}
		</div>

		<div class="mt-4">
			<Button type="button" variant="primary" onclick={handleNext}>
				{t('drills.button.next')}
			</Button>
		</div>
	{/if}
</div>

<style>
	.stamp {
		animation: stamp-in 240ms ease-out;
	}
</style>
