<script lang="ts">
	import { untrack } from 'svelte';
	import {
		DEGREE_COUNT,
		degreeForTappedLetter,
		generateDegreeQuestion,
		gradeDegreeNoteTap,
		gradeDegreePick,
		isDegreeQuestionAnswerable,
		spellTappedLetter,
		type DegreeQuestion
	} from '$lib/practice/degreeQuestion';
	import { ensureAudioReady, playNote } from '$lib/audio/audio';
	import { toPitch } from '$lib/audio/voicing';
	import PianoKeyboard from './PianoKeyboard.svelte';
	import ScaleDegreeStrip from './ScaleDegreeStrip.svelte';
	import Button from './Button.svelte';
	import { t } from '$lib/i18n/locale.svelte';
	import type { SpelledNote } from '$lib/theory/types';

	/**
	 * Practice hub render component: the DEGREE family, both directions. The
	 * surface that finally makes the catalog's 84 scale-degree facts answerable
	 * on /practice, where they were introduced-then-dropped before (see
	 * practiceQueue.familyForCard).
	 *
	 * Mirrors PracticeIntervalDrill's shape deliberately, since it is the other
	 * two-direction family on this hub: one question, one graded answer, a
	 * reveal, an opt-in hint rung, and a single Next. Nothing here computes
	 * theory: generation and both graders live in the pure
	 * practice/degreeQuestion.ts (chroma-based, never letter-string equality).
	 *
	 * THE TWO ANSWER SURFACES, and why each one:
	 *
	 * - 'degree-to-note' ("Degree 5 of E♭ major?") is answered by PLAYING THE
	 *   KEY. The tonic is pre-highlighted as the anchor, exactly as interval
	 *   construction pre-highlights its root, so the question is about the scale
	 *   rather than about finding a letter on a board. A tap cannot be
	 *   eliminated down to from four chips, it is graded by pitch class so both
	 *   spellings of a black key are accepted, and it is the physical answer the
	 *   piano actually asks for.
	 *
	 * - 'note-to-degree' ("Which degree is G in E♭ major?") is answered by
	 *   tapping a NUMBER, 1 to 7, in one row. This is the direction the app
	 *   never had, and the one the pedagogy audit named as the single most
	 *   important idea for reading a real chart: 1-3-5 is the same shape in
	 *   every key, while C-E-G is only true in C. Seven wide cells in a single
	 *   row is also the most phone-friendly answer control on this hub: no
	 *   scrolling, no precision, one thumb.
	 *
	 * The reveal is the same in both directions on purpose: the WHOLE scale,
	 * numbered, via ScaleDegreeStrip. Whichever way the question was asked, the
	 * payoff is seeing the numbers and the letters side by side in that key, and
	 * every cell is tappable so the scale can be heard.
	 */
	interface Props {
		/** The scale tonic in display glyphs, e.g. "E♭", from the queue item's fact. */
		tonic: string;
		/** The degree under test, 1..7, from the queue item's fact. */
		degree: number;
		/** Fired exactly once, at the user's Next tap after the reveal. */
		onComplete: (correct: boolean) => void;
	}

	let { tonic, degree, onComplete }: Props = $props();

	/**
	 * Computed once at init (mirrors PracticeIntervalDrill's one-shot init
	 * read): a deliberate snapshot, not a reactive dependency on the props. The
	 * host force-remounts a fresh instance per queue item, so re-drawing the
	 * direction mid-question can never happen.
	 */
	const question: DegreeQuestion = untrack(() => generateDegreeQuestion({ tonic, degree }));
	const answerable = isDegreeQuestionAnswerable(question);

	let answered = $state(false);
	let correct = $state(false);
	/** The single graded keyboard tap (degree-to-note only). */
	let tappedLetter = $state<string | null>(null);
	/** The single graded degree pick (note-to-degree only). */
	let pickedDegree = $state<number | null>(null);

	/** The answer note, non-null whenever `answerable`. */
	const answerNote = $derived(question.note);

	/** Every degree number, for the answer row and the reveal strip. */
	const degrees = $derived(Array.from({ length: DEGREE_COUNT }, (_, index) => index + 1));

	/** The tonic as a keyboard highlight: the anchor the counting starts from. */
	const tonicNote = $derived<SpelledNote | null>(question.notes[0] ?? null);

	/**
	 * What the keyboard highlights. Before the answer: the tonic alone (the
	 * anchor). After: the tonic plus the answer, so the reveal shows the
	 * interval colour of the degree that was asked for.
	 */
	const keyboardNotes = $derived.by((): SpelledNote[] => {
		const anchor = tonicNote;
		if (anchor === null) return [];
		if (!answered || answerNote === null || answerNote.letter === anchor.letter) return [anchor];
		return [anchor, answerNote];
	});

	/** Which degree a wrong keyboard tap actually landed on, or null when it is outside the scale. */
	const tappedDegree = $derived(
		tappedLetter === null ? null : degreeForTappedLetter(question, tappedLetter)
	);

	/** The wrong tap re-spelled in this key's own vocabulary (a D♯ tap in E♭ major reads E♭). */
	const tappedSpelling = $derived(
		tappedLetter === null ? null : spellTappedLetter(question, tappedLetter)
	);

	/** Sounds the degree once, on every answer, correct or not. Best-effort: audio never gates the reveal. */
	function playAnswer(): void {
		if (answerNote === null) return;
		try {
			void ensureAudioReady();
			playNote(toPitch(answerNote.letter, 4));
		} catch {
			// Audio is an enhancement here, exactly as in RecallSession's reveal.
		}
	}

	function reveal(isCorrect: boolean): void {
		answered = true;
		correct = isCorrect;
		playAnswer();
	}

	/** degree-to-note: the FIRST tap is the whole answer, graded by pitch class. */
	function tapKey(letter: string): void {
		if (answered || question.direction !== 'degree-to-note') return;
		tappedLetter = letter;
		reveal(gradeDegreeNoteTap(question, letter));
	}

	/** note-to-degree: tapping a number IS the complete answer (the hub's own D-05 precedent). */
	function pickDegree(pick: number): void {
		if (answered || question.direction !== 'note-to-degree') return;
		pickedDegree = pick;
		reveal(gradeDegreePick(question, pick));
	}

	function handleNext(): void {
		onComplete(correct);
	}

	// ---- Inline opt-in hint: one rung, the counting METHOD --------------------

	/**
	 * Exactly one rung, and it teaches the transferable method rather than the
	 * answer: where to start and what the major scale's step pattern is. Inline
	 * rather than the shared HintLadder for the reason ProgressionDrill and
	 * PracticeIntervalDrill already state, that HintLadder's layer kinds are
	 * chord-shaped and take a chord symbol, which a degree question has none of.
	 * Its interaction grammar and CSS are reused verbatim.
	 *
	 * Offered before the answer in BOTH directions, because the method is not
	 * the answer in either: knowing "2 2 1 2 2 2 1 from E♭" still leaves the
	 * counting to do.
	 */
	let hintOpen = $state(false);

	const hintBody = $derived(
		question.direction === 'degree-to-note'
			? t('scales.degreeDrill.hintBodyUp')
					.replace('{TONIC}', question.tonic)
					.replace('{N}', String(question.degree))
			: t('scales.degreeDrill.hintBodyDown')
					.replace('{TONIC}', question.tonic)
					.replace('{NOTE}', answerNote?.letter ?? '')
	);
</script>

<div data-testid="practice-degree-drill">
	{#if !answerable}
		<!--
			Provably unreachable from the catalog: facts.test.ts pins every one of
			the 84 scale-degree facts as resolving to a defined note within 1..7,
			and degreeQuestion.test.ts re-proves it through the generator. Kept so
			the component stays total, and reporting the item as CORRECT so an app
			defect can never mark the user wrong.
		-->
		<p class="text-body" data-testid="degree-unrenderable">{t('recall.unrenderable.message')}</p>
		<div class="mt-4">
			<Button type="button" variant="ghost" onclick={() => onComplete(true)}>
				{t('recall.cta.skip')}
			</Button>
		</div>
	{:else if question.direction === 'degree-to-note'}
		<p class="text-body" data-testid="degree-prompt">
			{t('scales.degreeDrill.promptNote')
				.replace('{N}', String(question.degree))
				.replace('{TONIC}', question.tonic)}
		</p>
		<p class="text-label text-muted mt-1 font-mono uppercase">
			{t('scales.degreeDrill.promptNoteHelp')}
		</p>

		<div class="mt-4">
			<PianoKeyboard
				notes={keyboardNotes}
				interactive={!answered}
				selected={answered ? undefined : new Set()}
				onToggle={answered ? undefined : tapKey}
				wrongLetters={answered
					? correct
						? new Set()
						: new Set(tappedLetter === null ? [] : [tappedLetter])
					: undefined}
				inspectable={answered}
			/>
		</div>
	{:else}
		<p class="text-body" data-testid="degree-prompt">
			{t('scales.degreeDrill.promptDegree')
				.replace('{NOTE}', answerNote?.letter ?? '')
				.replace('{TONIC}', question.tonic)}
		</p>

		<div
			class="degree-row mt-4"
			role="group"
			aria-label={t('scales.degreeDrill.degreeRowLabel')}
			data-testid="degree-choice-row"
		>
			{#each degrees as choice (choice)}
				<button
					type="button"
					class="degree-cell font-mono font-bold"
					class:picked={pickedDegree === choice}
					class:answer={answered && choice === question.degree}
					class:wrong={answered && pickedDegree === choice && choice !== question.degree}
					disabled={answered}
					aria-label={t('scales.degreeDrill.degreeChoiceAria').replace('{N}', String(choice))}
					onclick={() => pickDegree(choice)}
				>
					{choice}
				</button>
			{/each}
		</div>
	{/if}

	{#if answerable && answered}
		<div class="stamp mt-4" data-testid="degree-drill-feedback">
			<p class="text-body font-bold" data-testid="degree-answer-line">
				{t('scales.degreeDrill.answerLine')
					.replace('{N}', String(question.degree))
					.replace('{TONIC}', question.tonic)
					.replace('{NOTE}', answerNote?.letter ?? '')}
			</p>

			{#if !correct && question.direction === 'degree-to-note' && tappedSpelling !== null}
				<p class="text-body mt-2" data-testid="degree-tap-line">
					{tappedDegree === null
						? t('scales.degreeDrill.tappedOutside')
								.replace('{NOTE}', tappedSpelling)
								.replace('{TONIC}', question.tonic)
						: t('scales.degreeDrill.tappedInScale')
								.replace('{NOTE}', tappedSpelling)
								.replace('{M}', String(tappedDegree))}
				</p>
			{:else if !correct && question.direction === 'note-to-degree' && pickedDegree !== null}
				<p class="text-body mt-2" data-testid="degree-picked-vs-correct">
					{t('scales.degreeDrill.pickedVsCorrect')
						.replace('{PICKED}', String(pickedDegree))
						.replace('{CORRECT}', String(question.degree))}
				</p>
			{/if}

			<p class="text-label mt-4 font-mono uppercase" data-testid="degree-strip-label">
				{t('scales.degreeDrill.stripLabel')}
			</p>
			<div class="mt-2">
				<ScaleDegreeStrip notes={question.notes} tonic={question.tonic} />
			</div>

			<!--
				The idea the whole family exists for, stated once per reveal. The
				pedagogy audit named it as the single most important thing for
				reading real charts, and the app said it nowhere.
			-->
			<p class="text-body text-muted mt-4" data-testid="degree-why-numbers">
				{t('scales.degreeDrill.whyNumbers')}
			</p>
		</div>
	{/if}

	{#if answerable && !answered}
		<div class="hint-ladder" data-testid="degree-hint-ladder">
			{#if hintOpen}
				<div class="hint stamp" data-testid="degree-hint-layer">
					<p class="text-label text-muted font-mono uppercase">
						{t('recall.hint.tier-prefix')} 1 · {t('scales.degreeDrill.hintTier')}
					</p>
					<p class="text-body mt-2">{hintBody}</p>
				</div>
				<p class="hint-closing-line text-label mt-6" data-testid="degree-hint-closing-line">
					{t('scales.degreeDrill.hintClosing')}
				</p>
			{:else}
				<div class="hint-cta mt-6" data-testid="degree-hint-cta">
					<Button type="button" variant="ghost" onclick={() => (hintOpen = true)}>
						{t('recall.hint.need-hint')}
					</Button>
				</div>
			{/if}
		</div>
	{/if}

	{#if answerable && answered}
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

	/*
	 * The 1..7 answer row. Equal columns in a single row, mirroring
	 * ScaleDegreeStrip's own grid so the answer control and the reveal strip
	 * read as the same object seen twice. min-height keeps every cell above the
	 * 44px phone tap-target floor the rest of the app holds to.
	 */
	.degree-row {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		gap: 3px;
	}

	.degree-cell {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 64px;
		font-size: var(--text-heading);
		border: 2px solid var(--color-ink);
		background: var(--color-paper-bright);
		color: var(--color-ink);
		cursor: pointer;
		/* Gesture hygiene, mirrors PianoKeyboard and ScaleDegreeStrip. */
		touch-action: manipulation;
		-webkit-touch-callout: none;
		user-select: none;
		transition:
			transform 90ms ease-out,
			filter 90ms ease-out;
	}

	.degree-cell:active:not(:disabled) {
		transform: scale(0.96);
		filter: brightness(0.94);
	}

	@media (prefers-reduced-motion: reduce) {
		.degree-cell:active:not(:disabled) {
			transform: none;
			filter: none;
		}
	}

	.degree-cell:disabled {
		cursor: default;
	}

	/* The right answer, in the app's own "this is the note" fill. */
	.degree-cell.answer {
		background: var(--color-root);
		color: var(--color-on-root);
	}

	/* A wrong pick, in the app's existing wrong-answer grey rather than a new colour. */
	.degree-cell.wrong {
		background: var(--color-faint);
		color: var(--color-muted);
		text-decoration: line-through;
	}

	/* Escalating hint: interaction grammar and CSS mirrored verbatim from
	   HintLadder.svelte via PracticeIntervalDrill's own inline copy, for the
	   same reason (HintLadder's layers take a chord symbol). @keyframes
	   stamp-in lives in app.css, no new keyframe. */
	.hint-ladder {
		margin-top: var(--spacing-lg);
	}

	.hint {
		background: var(--color-paper-bright);
		padding: var(--spacing-md);
	}

	.hint-closing-line {
		color: var(--color-muted);
		font-style: italic;
	}

	.hint-cta :global(.ps-button--ghost) {
		border-style: dashed;
		border-color: var(--color-faint);
		color: var(--color-muted);
		width: 100%;
	}
	.hint-cta:hover :global(.ps-button--ghost),
	.hint-cta:focus-within :global(.ps-button--ghost) {
		border-style: solid;
		border-color: var(--color-ink);
		color: var(--color-ink);
	}
</style>
