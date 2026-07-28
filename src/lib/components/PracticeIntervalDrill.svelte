<script lang="ts">
	import { untrack } from 'svelte';
	import {
		describeTappedInterval,
		generateIntervalQuestion,
		gradeIntervalTap,
		intervalQuestionNotes,
		type IntervalQuestion
	} from '$lib/drills/generateIntervalQuestion';
	import { intervalFromShort, type IntervalInfo } from '$lib/theory/interval';
	import { songHookFor } from '$lib/theory/songHooks';
	import { ensureAudioReady, playChord } from '$lib/audio/audio';
	import PianoKeyboard from './PianoKeyboard.svelte';
	import IntervalChip from './IntervalChip.svelte';
	import SongHook from './SongHook.svelte';
	import Button from './Button.svelte';
	import { t, currentLocale } from '$lib/i18n/locale.svelte';

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
	 *
	 * Teaching surfaces (T13 item 2). Alongside PracticeChordDrill, this is one
	 * of the two components that generate the overwhelming majority of daily
	 * items, and neither had any teaching scaffold at all: the escalating hint
	 * ladder and the confusion-contrast line were wired into RecallSession,
	 * ProgressionDrill, InversionDrill and WhyTheseNotes, but not here. Both are
	 * now present, in the shape intervals actually need:
	 *
	 * - The ladder is INLINE rather than the shared HintLadder.svelte, following
	 *   the precedent ProgressionDrill set for exactly this reason: HintLadder's
	 *   layer kinds (family/formula/keyboard/spelling) are chord-shaped and take
	 *   a chord symbol, which an interval question does not have. Its escalating,
	 *   cumulative interaction grammar and its CSS are reused verbatim; only the
	 *   rungs differ (name -> count -> a tune you know).
	 * - It is OPT-IN and escalating, never an always-on inline hint. Where it can
	 *   be offered before the answer depends on the direction. In CONSTRUCTION
	 *   the root and the interval name are already given and the answer is a key,
	 *   so the rungs teach the method (what the name means, how many semitones to
	 *   count) and mount before the answer. In IDENTIFICATION the answer IS the
	 *   interval, and the semitone count is that answer restated, so the ladder
	 *   mounts only after a MISS.
	 * - The wrong-answer path now contrasts the two semitone counts, which is the
	 *   whole content of an interval confusion (M2 = 2, m3 = 3) and the piece the
	 *   surface never once showed. Identification also gains the picked-vs-correct
	 *   line the chord drill already had.
	 *
	 * A hint never touches grading: `correct` is set by the answer alone.
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
	/** The shorthand the user picked (identification only), for the picked-vs-correct and semitone-contrast lines. */
	let picked = $state<string | undefined>(undefined);

	const tappedReadout = $derived(
		question.direction === 'construction' && tappedLetter !== null
			? describeTappedInterval(question.root, tappedLetter)
			: null
	);

	/**
	 * What the user actually answered WITH, as an IntervalInfo, or null when
	 * there is nothing to contrast (a correct answer, or no answer yet). Both
	 * directions funnel into one value so the contrast line below has a single
	 * shape to render.
	 */
	const givenInterval = $derived.by((): IntervalInfo | null => {
		if (!answered || correct) return null;
		if (question.direction === 'construction') return tappedReadout?.info ?? null;
		return picked === undefined ? null : intervalFromShort(picked);
	});

	// ---- Inline escalating hint ladder (T13 item 2) -------------------------

	/** The interval ladder's rungs: what the name means, how far it is, how it sounds. */
	type IntervalHintRung = 'name' | 'count' | 'song';

	/** Only offered when this interval actually has a vetted tune (SongHook renders nothing otherwise, and an empty rung is worse than no rung). */
	const hasSongHook = songHookFor(question.interval.short) !== null;

	/**
	 * The rungs offered for THIS question. Construction leads with the name
	 * (the prompt shows only the shorthand); identification omits it, because
	 * its own choice chips already carry every long name on screen.
	 */
	const offeredRungs = $derived.by((): IntervalHintRung[] => {
		const rungs: IntervalHintRung[] =
			question.direction === 'construction' ? ['name', 'count'] : ['count'];
		if (hasSongHook) rungs.push('song');
		return rungs;
	});

	/**
	 * Construction can be helped before the answer (the rungs teach the method,
	 * not the key). Identification cannot: the semitone count IS the answer
	 * there, so the ladder waits for a miss.
	 */
	const hintVisible = $derived(
		question.direction === 'construction' ? true : answered && !correct
	);

	/** How many offered rungs are revealed. Never reset internally: the host mounts a fresh instance per queue item. */
	let hintDepth = $state(0);

	function revealHint(): void {
		hintDepth = Math.min(hintDepth + 1, offeredRungs.length);
	}

	const HINT_TIER_TITLE: Record<IntervalHintRung, string> = $derived({
		name: t('drills.hint.interval.tier.name'),
		count: t('drills.hint.interval.tier.count'),
		song: t('drills.hint.interval.tier.song')
	});

	/** Tier tags renumber sequentially from whichever rungs are actually offered (mirrors HintLadder's own tierLabel). */
	function hintTierLabel(index: number): string {
		return `${t('recall.hint.tier-prefix')} ${index + 1} · ${HINT_TIER_TITLE[offeredRungs[index]]}`;
	}

	const HINT_REVEAL_LABEL: Record<IntervalHintRung, string> = $derived({
		name: t('recall.hint.need-hint'),
		count: t('drills.hint.interval.reveal.count'),
		song: t('drills.hint.interval.reveal.song')
	});

	/** Depth-0 is always "Need a hint?"; after that the label names the next rung. */
	const hintControlLabel = $derived(
		hintDepth === 0
			? t('recall.hint.need-hint')
			: HINT_REVEAL_LABEL[offeredRungs[hintDepth] ?? 'count']
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
		picked = choice;
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

	function handleNext(): void {
		onComplete(correct);
	}

	/**
	 * The interval's long name in the READER's language, mirroring
	 * InspectRegister's own locale switch. This surface previously rendered
	 * `longFr` unconditionally, so an English session read "m3 · tierce
	 * mineure" and the app never once showed the English words "minor 3rd" in
	 * a drill while its prose said exactly that. The shorthand (m3/P5/m7)
	 * stays immune and identical across locales; only the long name switches,
	 * and it is never doubled, so the line stays one phone-width row.
	 */
	function longName(info: IntervalInfo): string {
		return currentLocale() === 'fr' ? info.longFr : info.long;
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
						<span class="text-label font-mono">{longName(intervalFromShort(choice))}</span>
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
				longName={longName(question.interval)}
			/>
			<p class="text-label mt-2 font-mono uppercase" data-testid="interval-answer-line">
				{question.interval.short} · {longName(question.interval)}
			</p>
			{#if question.direction === 'construction' && tappedReadout}
				<p class="text-label mt-2 font-mono uppercase" data-testid="interval-tap-line">
					{t('drills.feedback.youTapped')} {tappedReadout.letter} · {tappedReadout.info.short} ·
					{longName(tappedReadout.info)}
				</p>
			{:else if question.direction === 'identification' && !correct && picked !== undefined}
				<p class="text-body mt-2" data-testid="interval-picked-vs-correct">
					{t('drills.feedback.pickedVsCorrect')
						.replace('{picked}', picked)
						.replace('{correct}', question.interval.short)}
				</p>
			{/if}

			<!--
				The confusion contrast, on the wrong-answer path only. An interval
				confusion IS a semitone-count confusion (M2 = 2, m3 = 3), and this
				surface never showed a semitone count at all - not in the prompt, not
				in the reveal. Stated as counts rather than a sentence so it needs no
				singular/plural agreement in either language.
			-->
			{#if givenInterval && givenInterval.semitones >= 0}
				<p class="text-body mt-2" data-testid="interval-semitone-contrast">
					{t('drills.feedback.semitoneContrast')
						.replace('{A}', givenInterval.short)
						.replace('{N}', String(givenInterval.semitones))
						.replace('{B}', question.interval.short)
						.replace('{M}', String(question.interval.semitones))}
				</p>
			{/if}
		</div>
	{/if}

	{#if hintVisible && offeredRungs.length > 0}
		<div class="hint-ladder" data-testid="interval-hint-ladder">
			<div class="hints">
				{#each offeredRungs.slice(0, hintDepth) as rung, index (rung)}
					<div class="hint stamp" data-testid="interval-hint-layer" data-layer={rung}>
						<p class="text-label text-muted font-mono uppercase">{hintTierLabel(index)}</p>
						{#if rung === 'name'}
							<p class="text-body mt-2">
								{t('drills.hint.interval.nameBody')
									.replace('{SHORT}', question.interval.short)
									.replace('{LONG}', longName(question.interval))}
							</p>
						{:else if rung === 'count'}
							<p class="text-body mt-2">
								{question.direction === 'construction'
									? t('drills.hint.interval.countBodyUp')
											.replace('{ROOT}', question.root)
											.replace('{N}', String(question.interval.semitones))
									: t('drills.hint.interval.countBodyBetween').replace(
											'{N}',
											String(question.interval.semitones)
										)}
							</p>
						{:else}
							<SongHook short={question.interval.short} />
						{/if}
					</div>
				{/each}
			</div>

			{#if hintDepth < offeredRungs.length}
				<div class="hint-cta mt-6" data-testid="interval-hint-cta">
					<Button type="button" variant="ghost" onclick={revealHint}>{hintControlLabel}</Button>
				</div>
			{:else}
				<p class="hint-closing-line text-label mt-6" data-testid="interval-hint-closing-line">
					{t('drills.hint.interval.closing')}
				</p>
			{/if}
		</div>
	{/if}

	{#if answered}
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

	/* Escalating hint ladder: interaction grammar and CSS mirrored verbatim from
	   HintLadder.svelte's proven shape, exactly as ProgressionDrill already does
	   and for the same reason - that shared component's layer kinds are
	   chord-shaped and take a chord symbol, which an interval question has none
	   of. @keyframes stamp-in lives in app.css (shared), no new keyframe. */
	.hint-ladder {
		margin-top: var(--spacing-lg);
	}

	.hints {
		display: flex;
		flex-direction: column;
		gap: 3px;
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
