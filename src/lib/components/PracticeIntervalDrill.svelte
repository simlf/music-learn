<script lang="ts">
	import { untrack } from 'svelte';
	import {
		describeTappedInterval,
		generateIntervalQuestion,
		gradeIntervalTap,
		intervalQuestionNotes,
		type IntervalQuestion
	} from '$lib/drills/generateIntervalQuestion';
	import { intervalFromShort } from '$lib/theory/interval';
	import { ensureAudioReady, playChord, playNote } from '$lib/audio/audio';
	import { toPitch } from '$lib/audio/voicing';
	import PianoKeyboard from './PianoKeyboard.svelte';
	import IntervalChip from './IntervalChip.svelte';
	import Button from './Button.svelte';
	import { t } from '$lib/i18n/locale.svelte';

	/**
	 * Practice hub render component (27-03): the intervals family, both
	 * directions. Mirrors drills' interval identification/construction
	 * branches (`src/routes/drills/+page.svelte` L772-798 keyboard,
	 * L1100-1152 prompt/choices, L1188-1213 feedback) verbatim. Generation
	 * picks the direction; grading always delegates to the shared pure
	 * graders (gradeIntervalTap for construction taps - chroma arithmetic,
	 * octave/enharmonic-agnostic - and a plain shorthand-string compare for
	 * identification choices, exactly as drills does). REG-01: no logic
	 * duplicated from drills, this component only re-authors the markup.
	 */
	interface Props {
		/** The interval shorthand this item drills (e.g. "m3"), from the host's queue. */
		short: string;
		/** Fired exactly once, at the user's Next tap after the reveal. */
		onComplete: (correct: boolean) => void;
	}

	let { short, onComplete }: Props = $props();

	/**
	 * Computed once at init (mirrors PracticeChordDrill's one-shot init
	 * read). Read via untrack since this is a deliberate init-time
	 * snapshot, not a reactive dependency on `short`.
	 */
	const question: IntervalQuestion = untrack(() => generateIntervalQuestion({ short }));
	const notes = intervalQuestionNotes(question);

	let answered = $state(false);
	let correct = $state(false);
	/** The single graded tap (construction only), for the wrong-tap readout line and the reveal keyboard's wrong-fill. */
	let tappedLetter = $state<string | null>(null);

	const tappedReadout = $derived(
		question.direction === 'construction' && tappedLetter !== null
			? describeTappedInterval(question.root, tappedLetter)
			: null
	);

	/** Every answer plays the reveal (root + target) once, correct or not, matching drills' recordGrade reveal rule. */
	function reveal(isCorrect: boolean): void {
		answered = true;
		correct = isCorrect;
		void ensureAudioReady();
		playChord(notes.map((note) => note.letter));
	}

	/** Identification: tapping a shorthand choice IS the complete answer (drills D-05 parity). */
	function selectChoice(choice: string): void {
		if (answered || question.direction !== 'identification') return;
		reveal(choice === question.interval.short);
	}

	/**
	 * Construction: the FIRST tap is the whole answer, graded by chroma
	 * distance via gradeIntervalTap - octave-agnostic and enharmonic-
	 * agnostic, never a letter-string compare (T-27-03-01).
	 */
	function tapConstructionKey(letter: string): void {
		if (answered || question.direction !== 'construction') return;
		tappedLetter = letter;
		reveal(gradeIntervalTap(question.root, letter, question.interval.semitones));
	}

	/** Key-touch sound (Track A parity): every on-screen key press sounds its note. */
	function pressKey(letter: string, octave: number): void {
		void ensureAudioReady();
		playNote(toPitch(letter, octave));
	}

	function handleNext(): void {
		onComplete(correct);
	}
</script>

<div data-testid="practice-interval-drill">
	{#if question.direction === 'identification'}
		<p class="text-body">{t('drills.prompt.nameInterval')}</p>

		<div class="mt-4">
			<PianoKeyboard notes={notes} inspectable />
		</div>

		<div class="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4" data-testid="interval-choice-grid">
			{#each question.choices ?? [] as choice (choice)}
				<Button
					type="button"
					variant="ghost"
					disabled={answered}
					aria-label={`${t('drills.aria.answerPrefix')} ${choice}`}
					onclick={() => selectChoice(choice)}
				>
					<span class="flex flex-col items-center">
						<span class="font-mono text-heading font-bold">{choice}</span>
						<span class="text-label font-mono">{intervalFromShort(choice).longFr}</span>
					</span>
				</Button>
			{/each}
		</div>
	{:else}
		<p class="text-body" data-testid="interval-construction-prompt">
			{t('drills.prompt.tapPrefix')}
			<span class="font-mono font-bold">{question.interval.short}</span>
			{t('drills.prompt.tapAboveInfix')}
			<span class="font-mono font-bold">{question.root}</span>.
		</p>

		<div class="mt-4">
			<PianoKeyboard
				notes={answered ? notes : [notes[0]]}
				interactive={!answered}
				selected={answered ? undefined : new Set()}
				onToggle={answered ? undefined : tapConstructionKey}
				onPress={answered ? undefined : pressKey}
				wrongLetters={answered
					? correct
						? new Set()
						: new Set(tappedLetter === null ? [] : [tappedLetter])
					: undefined}
				inspectable={answered}
			/>
		</div>
	{/if}

	{#if answered}
		<div class="mt-4 stamp" data-testid="interval-drill-feedback">
			<IntervalChip
				role={question.interval.role}
				label={question.interval.short}
				longName={question.interval.longFr}
			/>
			<p class="text-label mt-2 font-mono uppercase" data-testid="interval-answer-line">
				{question.interval.short} · {question.interval.longFr}
			</p>
			{#if question.direction === 'construction' && tappedReadout}
				<p class="text-label mt-2 font-mono uppercase" data-testid="interval-tap-line">
					{t('drills.feedback.youTapped')} {tappedReadout.letter} · {tappedReadout.info.short} ·
					{tappedReadout.info.longFr}
				</p>
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
