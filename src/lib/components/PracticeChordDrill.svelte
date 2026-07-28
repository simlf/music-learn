<script lang="ts">
	import { untrack } from 'svelte';
	import { Note } from 'tonal';
	import { generateQuestion, type ChordQuestion } from '$lib/drills/generateQuestion';
	import { spellChord } from '$lib/theory/chord';
	import { matchChord, type MatchResult } from '$lib/drills/matchChord';
	import { toAsciiAccidentals } from '$lib/theory/interval';
	import { ensureAudioReady, playChord } from '$lib/audio/audio';
	import PianoKeyboard from './PianoKeyboard.svelte';
	import ChordGlyph from './ChordGlyph.svelte';
	import CountingChipRow from './CountingChipRow.svelte';
	import HintLadder from './HintLadder.svelte';
	import RevealInsight from './RevealInsight.svelte';
	import Button from './Button.svelte';
	import { t } from '$lib/i18n/locale.svelte';

	/**
	 * Practice hub render component (27-03): the three CHORD question shapes,
	 * one per FSRS mode, extracted so the Phase 27 host can mount one per queue
	 * item without re-entangling drills' monolith.
	 *
	 * T13 (mode collapse fix). This component used to render exactly ONE
	 * question - the 4-choice identification grid - for every chord card the
	 * queue produced, and the host handed it every chord-formula card that was
	 * not 'formula-build'. So `formula`, `see-play` and `hear-name` (three modes
	 * the deck seeds separately, schedules separately, and believes it trains
	 * separately) produced byte-identical items: on day one, roughly 20
	 * multiple-choice questions over 10 symbols, each symbol asked twice with
	 * the same four chips. Two of the three skills were never practiced. The
	 * distinct modes DID exist, but only inside RecallSession, several taps deep
	 * in Progress, where they are almost never reached.
	 *
	 * The `mode` prop now selects the question:
	 *
	 *   - 'formula' (default, byte-identical to this component's whole previous
	 *     behavior): the notes are on the keyboard, name the chord from 4
	 *     same-root choices. Reads the QUALITY off the visible notes.
	 *   - 'see-play': the SYMBOL is the question. Play its notes on the
	 *     keyboard, one Check, graded by chroma set equality (matchChord) -
	 *     never by letter strings, so octave/inversion/enharmonic spelling all
	 *     compare equal. Deliberately a single-shot spelling recall, NOT a
	 *     second copy of BuildSession: build-it teaches the construction
	 *     PROCEDURE one interval at a time with scaffolding, see-play tests the
	 *     whole chord as one retrieval event with nothing but an opt-in hint.
	 *   - 'hear-name': the chord is PLAYED and nothing is shown. Name it from
	 *     the same 4 same-root choices. The keyboard stays absent until the
	 *     answer is in, so it can never spoil the ear test (RecallSession's own
	 *     rule for this mode).
	 *
	 * Grading is unchanged in every mode: `onComplete(correct)` fires once, on
	 * Next, and the host commits the same Rating through the same recordGrade
	 * call as before (REG-01 - this component has never known anything about
	 * FSRS and still does not).
	 *
	 * Generation/grading stay entirely delegated to the shared pure modules
	 * (generateQuestion, spellChord, matchChord): no logic is duplicated from
	 * drills or from RecallSession, this component only re-authors the markup.
	 *
	 * Teaching surfaces (T13 item 2). This is the app's busiest drill surface
	 * and it was also its thinnest: the escalating HintLadder and the confusion-
	 * contrast RevealInsight were wired into RecallSession, ProgressionDrill,
	 * InversionDrill and WhyTheseNotes, but not here, where the overwhelming
	 * majority of daily items are asked. Both are now wired in, under two rules:
	 *
	 *   - The ladder is OPT-IN and escalating, never an always-on inline hint
	 *     (an always-on hint kills the earn-the-symbol payoff).
	 *   - Where it can be offered BEFORE the answer depends on the question. In
	 *     'see-play' the answer is the notes and the symbol is already given, so
	 *     the ladder helps without spoiling and mounts before the answer (this
	 *     is exactly what RecallSession does for the same mode). In the two
	 *     IDENTIFICATION modes the answer IS the quality, and every ladder rung
	 *     is derived from that quality, so a pre-answer rung would simply be the
	 *     answer. There the ladder mounts only after a MISS, as an opt-in
	 *     escalating explanation at the moment of maximum attention (the same
	 *     placement RecallSession uses for hear-name).
	 *
	 * A hint never touches grading: `correct` is set by the answer alone, before
	 * any ladder is even mounted in the identification modes.
	 *
	 * Earlier fixes preserved verbatim:
	 *
	 * UAT F4: both branches of the reveal carry an explicit right/wrong signal -
	 * a bold "Correct" line on a hit, and a muted "Incorrect" marker on a miss
	 * (deliberately NOT vermilion, which is reserved for primary CTAs, and NOT
	 * any of the four reserved interval-role colors: only the existing
	 * `text-muted` token already used for wrong-answer chrome elsewhere).
	 *
	 * E1: `picked` snapshots the tapped choice at answer time, so an
	 * identification miss renders an explicit "you picked X, it was Y" line
	 * beside the correct-symbol ChordGlyph.
	 *
	 * E2/SHAPE-01: after EITHER outcome, a CountingChipRow renders the answer
	 * chord's stacked-thirds gap pattern as role-tinted tone chips + fill/outline
	 * gap chips, so a beginner reads the invariant SHAPE per quality (m7 =
	 * small-big-small) at a glance. Visually subordinate to the correct/incorrect
	 * affirmation above it, never competing with it.
	 */

	/** The three chord question shapes, named by the FSRS mode each one renders. */
	type ChordDrillMode = 'formula' | 'see-play' | 'hear-name';

	interface Props {
		/** The chord symbol this item drills (from the host's queue). */
		symbol: string;
		/**
		 * Which question to ask. Defaults to 'formula', so every caller written
		 * before this prop existed keeps exactly the render it had (REG-01).
		 */
		mode?: ChordDrillMode;
		/** Fired exactly once, at the user's Next tap after the reveal. */
		onComplete: (correct: boolean) => void;
	}

	let { symbol, mode = 'formula', onComplete }: Props = $props();

	/**
	 * Computed once at init from the supplied symbol (a fresh component
	 * instance is expected per queue item, mirroring BuildSession/
	 * ShellVoicingDrill/ProgressionDrill's own embed-seam precedent of a
	 * one-shot init read rather than a live reactive re-derivation). Read via
	 * untrack (mirrors BuildSession's embedFact read) since this is a
	 * deliberate init-time snapshot, not a reactive dependency on `symbol`.
	 */
	const target = untrack(() => spellChord(symbol));

	/** True for the two modes answered by picking a symbol from the choice grid. */
	const identifying = $derived(mode !== 'see-play');

	/**
	 * The 4 same-root choices, drawn only for the identification modes. The
	 * see-play question has no choices at all, and skipping the draw also keeps
	 * it from consuming the Math.random() sequence a caller may be controlling.
	 */
	const question = untrack(() =>
		identifying
			? (generateQuestion({ symbol, direction: 'identification' }) as ChordQuestion)
			: undefined
	);

	/** The answer chord's quality suffix ("m7", "m7b5", ...) - same slice ChordGlyph's quality prop already uses below. */
	const targetQuality = target.symbol.slice(target.root.length);

	/** The chord's own note letters, the form the audio contract takes. */
	const targetLetters = target.notes.map((note) => note.letter);

	let answered = $state(false);
	let correct = $state(false);
	/** E1: the choice the user actually tapped, snapshotted at answer time (identification only). */
	let picked = $state<string | undefined>(undefined);

	// ---- see-play state ----------------------------------------------------
	/** Letters the user has toggled on, shared with the keyboard's own selection. */
	let selected = $state<Set<string>>(new Set());
	/** The chroma-set grading result, kept for the reveal's wrong-note fill. */
	let playResult = $state<MatchResult | undefined>(undefined);

	// ---- hear-name state ---------------------------------------------------
	/** How many times the chord has been played, so the CTA can say "Play again". */
	let playCount = $state(0);

	/**
	 * The letters the user played that are NOT in the chord, for the reveal
	 * keyboard's gray wrong-fill. Derived from the graded chroma (playResult
	 * .extra), never from a letter-string comparison, so a flat-spelled tap
	 * still matches the key it landed on.
	 */
	const wrongLetters = $derived.by((): Set<string> | undefined => {
		if (playResult === undefined) return undefined;
		const extra = new Set(playResult.extra);
		return new Set(
			[...selected].filter((letter) => extra.has(Note.chroma(toAsciiAccidentals(letter))))
		);
	});

	/** The full escalating ladder, matching RecallSession's own layer choice for these modes. */
	const HINT_LAYERS = ['family', 'formula', 'keyboard', 'spelling'] as const;

	/**
	 * When the ladder is on screen. see-play offers it throughout (one instance,
	 * so the depth the user reached survives the reveal); the identification
	 * modes offer it only after a miss, where it can no longer be the answer.
	 */
	const hintVisible = $derived(mode === 'see-play' ? true : answered && !correct);

	/** Plays the answer chord. Every reveal plays it once, correct or not, matching drills' recordGrade reveal rule. */
	function playTarget(): void {
		void ensureAudioReady();
		playChord(targetLetters);
	}

	/**
	 * Identification grading (drills D-05 parity): tapping a choice IS the
	 * complete answer - a symbol pick against the correct answer, never
	 * played-note chroma.
	 */
	function selectChoice(choice: string): void {
		if (answered || !identifying) return;
		answered = true;
		correct = choice === symbol;
		picked = choice;
		playTarget();
	}

	function toggleKey(letter: string): void {
		if (answered) return;
		const next = new Set(selected);
		if (next.has(letter)) {
			next.delete(letter);
		} else {
			next.add(letter);
		}
		selected = next;
	}

	/**
	 * see-play grading: exact chroma SET equality against the target chord via
	 * the shared matchChord - octave-agnostic, inversion-agnostic and
	 * enharmonic-agnostic, and never a spelled-letter comparison (the project's
	 * standing "grade by chroma, never by letter strings" invariant).
	 */
	function checkPlay(): void {
		if (answered || identifying) return;
		const playedChroma = new Set(
			[...selected].map((letter) => Note.chroma(toAsciiAccidentals(letter)))
		);
		const result = matchChord(playedChroma, target);
		playResult = result;
		answered = true;
		correct = result.correct;
		playTarget();
	}

	/** hear-name's Play / Play again control: the question itself. */
	function hearChord(): void {
		playCount += 1;
		playTarget();
	}

	function handleNext(): void {
		onComplete(correct);
	}
</script>

<div data-testid="practice-chord-drill" data-mode={mode}>
	{#if mode === 'formula'}
		<p class="text-body">{t('drills.prompt.nameChord')}</p>

		<div class="mt-4">
			<PianoKeyboard notes={target.notes} inspectable showIntervalBadges={answered} />
		</div>
	{:else if mode === 'see-play'}
		<div class="flex items-start gap-4" data-testid="chord-drill-play-prompt">
			<ChordGlyph root={target.root} quality={targetQuality} />
		</div>
		<p class="text-body mt-4">{t('recall.prompt.see-play')}</p>

		<div class="mt-4">
			<PianoKeyboard
				notes={answered ? target.notes : []}
				interactive={!answered}
				selected={answered ? undefined : selected}
				onToggle={answered ? undefined : toggleKey}
				{wrongLetters}
				inspectable={answered}
				showIntervalBadges={answered}
			/>
		</div>

		{#if !answered}
			<div class="mt-4">
				<Button
					type="button"
					variant="primary"
					disabled={selected.size === 0}
					onclick={checkPlay}
				>
					{t('recall.cta.check')}
				</Button>
			</div>
		{/if}
	{:else}
		<p class="text-body" data-testid="chord-drill-hear-prompt">{t('recall.prompt.hear-name')}</p>

		<div class="mt-4">
			<Button type="button" variant="primary" onclick={hearChord}>
				{playCount === 0 ? t('recall.cta.play') : t('recall.cta.play-again')}
			</Button>
		</div>

		{#if answered}
			<div class="mt-4">
				<PianoKeyboard notes={target.notes} inspectable showIntervalBadges />
			</div>
		{/if}
	{/if}

	{#if identifying}
		<div class="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4" data-testid="choice-grid">
			{#each question?.choices ?? [] as choice (choice)}
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
	{/if}

	{#if answered}
		<div class="mt-4 stamp" data-testid="chord-drill-feedback">
			{#if correct}
				<p class="text-body font-bold" data-testid="chord-drill-correct">
					<span aria-hidden="true">✓</span>
					{t('drills.feedback.correct')}
				</p>
			{:else}
				{#if identifying}
					<div class="flex items-start gap-4">
						<ChordGlyph root={target.root} quality={targetQuality} />
					</div>
				{/if}
				<p
					class="text-label text-muted mt-2 font-mono uppercase"
					data-testid="chord-drill-incorrect"
				>
					<span aria-hidden="true">✕</span>
					{t('drills.feedback.incorrect')}
				</p>
				{#if identifying}
					<p class="text-body mt-2" data-testid="chord-drill-picked-vs-correct">
						{t('drills.feedback.pickedVsCorrect')
							.replace('{picked}', picked ?? '')
							.replace('{correct}', symbol)}
					</p>
				{:else}
					<!--
						see-play's miss has no "picked symbol" to contrast, so the reveal
						keyboard above IS the readout: chord notes in their interval colors,
						the user's extra notes in the gray wrong-fill. This legend names
						those two fills, reusing the drills feedback copy verbatim.
					-->
					<p class="text-label mt-2 flex gap-4 font-mono" data-testid="chord-drill-legend">
						<span class="inline-flex items-center gap-2">
							<span
								class="inline-block h-3 w-3"
								style="background-color: var(--color-third);"
								aria-hidden="true"
							></span>
							{t('drills.feedback.legendChord')}
						</span>
						<span class="inline-flex items-center gap-2">
							<span
								class="inline-block h-3 w-3"
								style="background-color: var(--color-wrong);"
								aria-hidden="true"
							></span>
							{t('drills.feedback.legendExtra')}
						</span>
					</p>
				{/if}

				<!--
					The confusion contrast, on the wrong-answer path only, where it
					teaches at the moment of maximum attention ("Cm7 has E♭, C7 has
					E."). An identification miss has a picked symbol to contrast
					against; a see-play miss does not, so RevealInsight falls back to
					the quality's own mnemonic there. Never rendered on a hit.
				-->
				<RevealInsight correctSymbol={symbol} givenSymbol={identifying ? picked : undefined} />
			{/if}

			<div class="mt-2">
				<CountingChipRow chord={target} ariaLabel={t('drills.aria.chordShape')} />
			</div>
		</div>
	{/if}

	{#if hintVisible}
		<div class="mt-6">
			<HintLadder {symbol} layers={[...HINT_LAYERS]} />
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
</style>
