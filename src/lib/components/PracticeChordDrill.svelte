<script lang="ts">
	import { untrack } from 'svelte';
	import { generateQuestion, type ChordQuestion } from '$lib/drills/generateQuestion';
	import { spellChord } from '$lib/theory/chord';
	import { ensureAudioReady, playChord } from '$lib/audio/audio';
	import PianoKeyboard from './PianoKeyboard.svelte';
	import ChordGlyph from './ChordGlyph.svelte';
	import CountingChipRow from './CountingChipRow.svelte';
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
	 * only reveals on a miss (see the UAT F4 note below for the right/wrong
	 * affirmation added alongside that reveal).
	 *
	 * Generation/grading is entirely delegated to the shared pure modules
	 * (generateQuestion, spellChord) - REG-01: no logic duplicated from
	 * drills, this component only re-authors the small markup.
	 *
	 * UAT F4 fix: a correct answer previously showed no affirmation at all
	 * (only the gated interval-badge reveal on the keyboard) - a returning
	 * player couldn't tell they'd gotten it right. Now both branches of the
	 * reveal carry an explicit right/wrong signal: a bold "Correct" line on
	 * a hit (mirrors RecallSession's hear-name `confirmationText` line), and
	 * a muted "Incorrect" marker beside the existing correct-symbol
	 * ChordGlyph on a miss (mirrors SongManager's muted "✕" remove-chip
	 * treatment) - deliberately NOT vermilion (reserved for primary CTAs
	 * per LocaleToggle's own comment) and NOT any of the four reserved
	 * interval-role colors, only the existing `text-muted` token already
	 * used for wrong-answer chrome elsewhere.
	 *
	 * E1 fix (name-it feedback, 30-CONTEXT): a miss previously revealed only
	 * the correct symbol, with no record of what was actually tapped - a
	 * returning player couldn't compare their own guess against the answer.
	 * `picked` snapshots the tapped choice at answer time; the miss branch
	 * now renders an explicit "you picked X, it was Y" line beside the
	 * existing correct-symbol ChordGlyph.
	 *
	 * E2/SHAPE-01 (Phase 32 Plan 01): after EITHER outcome, a CountingChipRow
	 * renders the answer chord's stacked-thirds gap pattern as role-tinted
	 * tone chips + fill/outline gap chips (replacing the old illegible grey
	 * uppercase mono shape line, "{quality}: {pattern}") so a beginner reads
	 * the invariant SHAPE per quality (m7 = small-big-small) at a glance
	 * instead of decoding letters. Rendered visually subordinate to the
	 * correct/incorrect affirmation above it - never competing with it.
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

	/** The answer chord's quality suffix ("m7", "m7b5", ...) - same slice ChordGlyph's quality prop already uses below. */
	const targetQuality = target.symbol.slice(target.root.length);

	let answered = $state(false);
	let correct = $state(false);
	/** E1: the choice the user actually tapped, snapshotted at answer time. */
	let picked = $state<string | undefined>(undefined);

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
		picked = choice;
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
			{#if correct}
				<p class="text-body font-bold" data-testid="chord-drill-correct">
					<span aria-hidden="true">✓</span>
					{t('drills.feedback.correct')}
				</p>
			{:else}
				<div class="flex items-start gap-4">
					<ChordGlyph root={target.root} quality={targetQuality} />
				</div>
				<p
					class="text-label text-muted mt-2 font-mono uppercase"
					data-testid="chord-drill-incorrect"
				>
					<span aria-hidden="true">✕</span>
					{t('drills.feedback.incorrect')}
				</p>
				<p class="text-body mt-2" data-testid="chord-drill-picked-vs-correct">
					{t('drills.feedback.pickedVsCorrect')
						.replace('{picked}', picked ?? '')
						.replace('{correct}', symbol)}
				</p>
			{/if}

			<div class="mt-2">
				<CountingChipRow chord={target} ariaLabel={t('drills.aria.chordShape')} />
			</div>
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
