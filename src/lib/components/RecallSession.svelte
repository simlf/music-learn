<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { Note } from 'tonal';
	import {
		introduceNewCards,
		getDueCards,
		getAllCards,
		recordGrade,
		type CardRecord,
		type Mode
	} from '$lib/srs/deck';
	import { selectReviewCards } from '$lib/srs/rotation';
	import { previewGrades, Rating } from '$lib/srs/scheduler';
	import { factById } from '$lib/srs/facts';
	import {
		buildQueue,
		advanceQueue,
		isSessionComplete,
		sessionRemaining,
		formatDayInterval,
		type QueueItem
	} from '$lib/srs/session';
	import { spellChord } from '$lib/theory/chord';
	import { intervalFromShort, toAsciiAccidentals, transposeFrom } from '$lib/theory/interval';
	import { majorScaleNotes } from '$lib/theory/scale';
	import { formulaFor } from '$lib/lookup/chordPresentation';
	import { matchChord, type MatchResult } from '$lib/drills/matchChord';
	import { pickDistractors } from '$lib/drills/generateQuestion';
	import { ensureAudioReady, playChord, playNote } from '$lib/audio/audio';
	import { toPitch } from '$lib/audio/voicing';
	import ChordGlyph from './ChordGlyph.svelte';
	import IntervalChip from './IntervalChip.svelte';
	import NoteLabel from './NoteLabel.svelte';
	import PianoKeyboard from './PianoKeyboard.svelte';
	import Button from './Button.svelte';
	import RevealInsight from './RevealInsight.svelte';
	import BuildSession from './BuildSession.svelte';
	import HintLadder from './HintLadder.svelte';

	/**
	 * Mode-signal chip label (UI-SPEC "Mode Surfaces" / Scope Decision 8):
	 * every mode a queue item can carry, including the pre-existing `formula`
	 * mode, reads its own uppercase label immediately below the "N LEFT
	 * TODAY" register. The arrow is the same "→" glyph already used
	 * elsewhere in this codebase, never an em dash.
	 */
	const MODE_LABELS: Record<Mode, string> = {
		formula: 'SYMBOL → FORMULA',
		'formula-build': 'FORMULA → BUILD',
		'see-play': 'SYMBOL → PLAY',
		'hear-name': 'SOUND → NAME'
	};

	/**
	 * Right-answer/wrong-answer confirmation variants (mirrors
	 * drills/+page.svelte's own CORRECT_VARIANTS/WRONG_VARIANTS/pickVariant
	 * verbatim, scoped to this component for Mode A's feedback line).
	 */
	const CORRECT_VARIANTS = ['Nailed it.', 'Et voilà.', 'Bang on.', 'Spot on, mon ami.'];
	const WRONG_VARIANTS = ['Not quite.', 'Close, but no cigar.', 'Not this time.'];

	/**
	 * Picks a variant, avoiding an immediate repeat, mirroring drills'
	 * pickVariant. Loop-free (a repeat draw just steps to the next variant)
	 * so a deterministic Math.random in tests can never spin forever.
	 */
	function pickVariant(variants: string[], lastIndex: number): [string, number] {
		if (variants.length === 1) return [variants[0], 0];
		let index = Math.floor(Math.random() * variants.length);
		if (index === lastIndex) {
			index = (index + 1) % variants.length;
		}
		return [variants[index], index];
	}

	/**
	 * Fisher-Yates shuffle via Math.random(), a per-module private copy
	 * mirroring generateQuestion.ts's/generateIntervalQuestion.ts's own
	 * established convention (a shared export is not this codebase's pattern).
	 * Used by Mode B ('hear-name') to shuffle its once-per-card choice grid.
	 */
	function shuffle<T>(items: T[]): T[] {
		const result = [...items];
		for (let i = result.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[result[i], result[j]] = [result[j], result[i]];
		}
		return result;
	}

	/**
	 * Review-mode reveal-then-grade session (MEM-01/MEM-02): the first
	 * user-facing surface for the whole memorization engine (11-01..11-04).
	 * Loads today's due-today queue (introduceNewCards then getDueCards, never
	 * the full 192-fact catalog), reveals one card at a time per its
	 * factKind's prompt/reveal template, then grades it Again/Hard/Good/Easy
	 * with live day-interval-labeled buttons (previewGrades + formatDayInterval,
	 * D-04). Tapping a grade both commits the FSRS rating (recordGrade) and
	 * advances the in-memory session queue (advanceQueue) in one action - no
	 * separate Next step. Self-contained: loads its own data on mount
	 * (mirrors Progress's onMount(() => void load()) pattern). Accepts an
	 * optional onViewMap callback (11-06): when provided, the completion
	 * card additionally renders a "View Recall Map" secondary CTA. Omitting
	 * the prop leaves the completion card's render byte-identical to 11-05.
	 */

	interface Props {
		onViewMap?: () => void;
	}

	let { onViewMap }: Props = $props();

	type PageState =
		| 'loading'
		| 'empty-no-deck'
		| 'empty-none-due'
		| 'reviewing'
		| 'complete'
		| 'error';

	let pageState = $state<PageState>('loading');
	let queue = $state<QueueItem[]>([]);
	let cardsByKey = $state(new Map<string, CardRecord>());
	let revealed = $state(false);
	let reviewedCount = $state(0);

	// ---- Mode A ('see-play') per-card state --------------------------------
	// See the symbol, play it on the keyboard, grade by chroma set equality
	// (D-03). `selected` is shared with the keyboard's own toggle state;
	// `modeAResult`/`modeARating` drive the transform-on-wrong feedback and
	// the binary auto-rating Next commits.
	let selected = $state<Set<string>>(new Set());
	let modeAAnswered = $state(false);
	let modeAResult = $state<MatchResult | undefined>();
	let modeARating = $state<Rating | undefined>();
	let confirmationText = $state('');
	let confirmationIndex = $state(-1);
	let headlineText = $state('');
	let wrongIndex = $state(-1);

	// ---- Mode B ('hear-name') per-card state -------------------------------
	// Hear the chord, pick its name from 4 same-root multiple-choice options
	// (D-04). Never gates progress: both a correct and a wrong choice auto-
	// advance the queue after HEAR_NAME_ADVANCE_MS, with no manual Next.
	let hearNameAnswered = $state(false);
	let hearNameGiven = $state('');
	let hearNameChoices = $state<string[]>([]);
	let hearNamePlayCount = $state(0);
	/** Not reactive state - a plain timer handle, mirroring BuildSession's flashTimer/feedbackTimer discipline. */
	let hearNameAdvanceTimer: ReturnType<typeof setTimeout> | undefined;
	/** Reuses BuildSession's exact feedbackTimer pacing value (Scope Decision 6) - not a new number invented for this plan. */
	const HEAR_NAME_ADVANCE_MS = 650;
	/**
	 * Post-answer hint-ladder wiring (Plan 04, HINT-01/HINT-02): the ladder
	 * mounts only after `hearNameAnswered`, so it can never spoil the ear test
	 * (D-03). Opening it cancels `hearNameAdvanceTimer` and surfaces an
	 * explicit Continue button that reuses `hearNameCommittedRating` - the
	 * SAME rating the timer would have used - so hint depth never touches the
	 * already-committed grade (D-04).
	 */
	let hearNameHintOpen = $state(false);
	let hearNameCommittedRating = $state<Rating | undefined>();

	/** Compound (factId, mode) key, matching deck.ts's own [factId+mode] convention. */
	function cardKey(factId: string, mode: string): string {
		return `${factId}|${mode}`;
	}

	/**
	 * Single source of per-mode HintLadder layer selection (HINT-01), reused by
	 * Plan 04 for hear-name. `see-play` and `hear-name` get the full 4-item
	 * ladder; `formula-build` skips the formula-chip layer (D-03) since the
	 * formula is already on-screen there, leaving the 3-item ladder.
	 */
	function hintLayersFor(mode: Mode): ('family' | 'formula' | 'keyboard' | 'spelling')[] {
		if (mode === 'formula-build') {
			return ['family', 'keyboard', 'spelling'];
		}
		return ['family', 'formula', 'keyboard', 'spelling'];
	}

	async function load(): Promise<void> {
		pageState = 'loading';
		try {
			await introduceNewCards();
			const due = await getDueCards();
			if (due.length === 0) {
				const all = await getAllCards();
				pageState = all.length === 0 ? 'empty-no-deck' : 'empty-none-due';
				return;
			}
			const selectedCards = selectReviewCards(due);
			cardsByKey = new Map(
				selectedCards.map((card) => [cardKey(card.factId, card.mode), card])
			);
			queue = buildQueue(selectedCards.map((card) => ({ factId: card.factId, mode: card.mode })));
			revealed = false;
			reviewedCount = 0;
			pageState = 'reviewing';
		} catch {
			pageState = 'error';
		}
	}

	onMount(() => {
		void load();
	});

	const currentItem = $derived(queue[0]);
	const currentCard = $derived(
		currentItem ? cardsByKey.get(cardKey(currentItem.factId, currentItem.mode)) : undefined
	);
	const currentFact = $derived(currentItem ? factById(currentItem.factId) : undefined);
	const previews = $derived(currentCard ? previewGrades(currentCard, new Date()) : []);
	const remaining = $derived(sessionRemaining(queue));

	/** The live day-interval tag for one of the four grade buttons (D-04). */
	function intervalTag(rating: Rating): string {
		const preview = previews.find((entry) => entry.rating === rating);
		return preview ? formatDayInterval(preview.days) : '';
	}

	/**
	 * Mode A's played-but-wrong letters (Sketch 001 Variant A's wrongLetters
	 * derivation, mirrored verbatim from drills/+page.svelte's own
	 * isExtraLetter/wrongLetters): a selected letter whose chroma is in the
	 * graded result's `extra` set gets the gray fill + ✕ mark once the
	 * keyboard transforms into its wrong-answer reveal.
	 */
	const extraLettersPlayed = $derived(
		new Set(
			[...selected].filter((letter) =>
				modeAResult?.extra.includes(Note.chroma(toAsciiAccidentals(letter))) ?? false
			)
		)
	);

	/**
	 * Shared per-card reset (13-03): both the existing formula-mode grade
	 * committer and Mode A's Next button return every per-card state field to
	 * its pre-answer default through this one seam.
	 */
	function resetPerCardState(): void {
		revealed = false;
		selected = new Set();
		modeAAnswered = false;
		modeAResult = undefined;
		modeARating = undefined;
		hearNameAnswered = false;
		hearNameGiven = '';
		hearNameChoices = [];
		hearNamePlayCount = 0;
		hearNameHintOpen = false;
		hearNameCommittedRating = undefined;
		clearTimeout(hearNameAdvanceTimer);
	}

	/** Toggles a Mode A key selection (mirrors Drills' toggleKey exactly); no-ops once answered. */
	function toggleModeAKey(letter: string): void {
		if (modeAAnswered) return;
		const next = new Set(selected);
		if (next.has(letter)) {
			next.delete(letter);
		} else {
			next.add(letter);
		}
		selected = next;
	}

	/** Key-touch sound (mirrors Drills' pressKey exactly); no-ops once answered. */
	function pressModeAKey(letter: string, octave: number): void {
		if (modeAAnswered) return;
		void ensureAudioReady();
		playNote(toPitch(letter, octave));
	}

	/**
	 * Grades the played chroma set against the target chord (D-03: chroma set
	 * equality only, never letter strings). Writes the FSRS rating
	 * fire-and-forget (D-04 auto-rating) so the write can never block the
	 * feedback/Next flow: a rejection is silently swallowed and the card
	 * simply stays in its pre-write state until a later successful write.
	 */
	function handleModeACheck(): void {
		if (!currentFact || currentFact.factKind !== 'chord-formula') return;

		const target = spellChord(currentFact.symbol);
		const playedChroma = new Set(
			[...selected].map((letter) => Note.chroma(toAsciiAccidentals(letter)))
		);
		const result = matchChord(playedChroma, target);
		modeAResult = result;
		modeAAnswered = true;

		const rating = result.correct ? Rating.Good : Rating.Again;
		modeARating = rating;

		if (result.correct) {
			const [text, index] = pickVariant(CORRECT_VARIANTS, confirmationIndex);
			confirmationText = text;
			confirmationIndex = index;
		} else {
			const [text, index] = pickVariant(WRONG_VARIANTS, wrongIndex);
			headlineText = text;
			wrongIndex = index;
		}

		const cardToGrade = currentCard;
		const key = currentItem ? cardKey(currentItem.factId, currentItem.mode) : undefined;
		if (cardToGrade && key) {
			void recordGrade(cardToGrade, rating, new Date())
				.then((updated) => {
					cardsByKey = new Map(cardsByKey).set(key, updated);
				})
				.catch(() => {
					// Best-effort write (D-04 auto-rating): never blocks Mode A's
					// feedback/Next flow.
				});
		}
	}

	/**
	 * Advances the recall queue after Mode A's feedback (single Next button,
	 * never the 4-button grade grid), re-enqueuing the card only when the
	 * computed rating was Again - the identical advanceQueue contract the
	 * existing grade buttons already use.
	 */
	function handleModeANext(): void {
		queue = advanceQueue(queue, modeARating ?? Rating.Again);
		resetPerCardState();
		reviewedCount += 1;
		if (isSessionComplete(queue)) pageState = 'complete';
	}

	/**
	 * Idempotent per-card choice-grid generation (D-04/UI-SPEC Mode B): the
	 * shuffled 4-choice grid is computed exactly once per card, never
	 * re-shuffled on every render, by guarding on `hearNameChoices` already
	 * being empty. `pickDistractors` is called unmodified (Phase 3's proven
	 * same-root distractor guarantee - no new distractor logic here).
	 */
	function ensureHearNameChoices(symbol: string): void {
		if (hearNameChoices.length === 0) {
			hearNameChoices = shuffle([symbol, ...pickDistractors(symbol, 3)]);
		}
	}

	/**
	 * Drives ensureHearNameChoices from an $effect rather than from inside the
	 * template ({@const} mutating $state during render trips Svelte 5's
	 * state_unsafe_mutation guard) - runs once per fresh hear-name card
	 * (guarded internally by ensureHearNameChoices' own idempotence check) and
	 * re-runs whenever the current queue item changes.
	 */
	$effect(() => {
		if (currentItem?.mode === 'hear-name' && currentFact?.factKind === 'chord-formula') {
			ensureHearNameChoices(currentFact.symbol);
		}
	});

	/**
	 * Plays (or replays) the current card's chord via the existing audio
	 * engine, verbatim reuse of the exact call shape `handleReveal` already
	 * makes for the `formula` mode. Never auto-plays on mount - only ever
	 * triggered by this explicit Play/Play again tap (browser gesture
	 * requirement).
	 */
	function handleHearNamePlay(chord: ReturnType<typeof spellChord>): void {
		hearNamePlayCount += 1;
		void ensureAudioReady();
		playChord(chord.notes.map((note) => note.letter));
	}

	/**
	 * The single hear-name advance path (Plan 04): both the existing
	 * auto-advance timer and the new Continue button call this, so there is
	 * exactly one place that advances the queue, resets per-card state, and
	 * bumps reviewedCount/completion for Mode B.
	 */
	function advanceHearName(rating: Rating): void {
		queue = advanceQueue(queue, rating);
		resetPerCardState();
		reviewedCount += 1;
		if (isSessionComplete(queue)) pageState = 'complete';
	}

	/** Cancels the auto-advance the instant a hint is opened post-answer (HINT-02); idempotent since clearTimeout on an already-fired/cleared timer is a no-op. */
	function onHearNameHintOpen(): void {
		clearTimeout(hearNameAdvanceTimer);
		hearNameHintOpen = true;
	}

	/**
	 * Tapping a choice IS the complete answer (D-05): grades immediately,
	 * writes the FSRS rating fire-and-forget (never blocks the advance), and
	 * always auto-advances after HEAR_NAME_ADVANCE_MS regardless of
	 * correctness - Mode B's D-04 "never gates" mandate applies to a wrong
	 * answer exactly as much as a correct one.
	 */
	function handleHearNameChoice(choice: string): void {
		if (hearNameAnswered || !currentFact || currentFact.factKind !== 'chord-formula') return;

		hearNameAnswered = true;
		hearNameGiven = choice;

		const rating = choice === currentFact.symbol ? Rating.Good : Rating.Again;
		hearNameCommittedRating = rating;

		if (rating === Rating.Good) {
			const [text, index] = pickVariant(CORRECT_VARIANTS, confirmationIndex);
			confirmationText = text;
			confirmationIndex = index;
		} else {
			const [text, index] = pickVariant(WRONG_VARIANTS, wrongIndex);
			headlineText = text;
			wrongIndex = index;
		}

		const cardToGrade = currentCard;
		const key = currentItem ? cardKey(currentItem.factId, currentItem.mode) : undefined;
		if (cardToGrade && key) {
			void recordGrade(cardToGrade, rating, new Date())
				.then((updated) => {
					cardsByKey = new Map(cardsByKey).set(key, updated);
				})
				.catch(() => {
					// Best-effort write (D-04 auto-rating): never blocks Mode B's
					// never-gates auto-advance.
				});
		}

		clearTimeout(hearNameAdvanceTimer);
		hearNameAdvanceTimer = setTimeout(() => {
			advanceHearName(rating);
		}, HEAR_NAME_ADVANCE_MS);
	}

	onDestroy(() => {
		clearTimeout(hearNameAdvanceTimer);
	});

	/**
	 * Mode C ('formula-build', 13-05): the inverse parse of facts.ts's
	 * scaleFormulaFactId/chord-formula factId string shapes ('chord-formula:'/
	 * 'scale-formula:' prefixes), deliberately independent of factById()/
	 * allFacts() - a scale-formula factId (created by Phase 12's standalone
	 * /build page) never resolves via the shared fact catalog (facts.ts's own
	 * documented prohibition against adding scale-formula to it), so this
	 * parse exists outside that catalog specifically so such a card can still
	 * render correctly here.
	 */
	function embedTargetFor(
		factId: string
	): { kind: 'chord'; symbol: string } | { kind: 'scale'; tonic: string } | undefined {
		if (factId.startsWith('chord-formula:')) {
			return { kind: 'chord', symbol: factId.slice('chord-formula:'.length) };
		}
		if (factId.startsWith('scale-formula:')) {
			return { kind: 'scale', tonic: factId.slice('scale-formula:'.length) };
		}
		return undefined;
	}

	/**
	 * Advances the recall queue after an embedded BuildSession instance
	 * completes (Mode C, Scope Decision 7). Construction's own rating
	 * (BuildSession's ratingForWrongTaps) is never Again, so any non-Again
	 * rating advances the queue identically - Rating.Good is passed purely to
	 * satisfy advanceQueue's signature, not to imply a specific grade was
	 * given. The FSRS write itself already happened inside BuildSession's own
	 * unchanged recordConstructionOutcome; this handler only advances the
	 * LOCAL in-memory queue, mirroring Mode A/B's own advance shape.
	 */
	function handleModeCNext(): void {
		queue = advanceQueue(queue, Rating.Good);
		resetPerCardState();
		reviewedCount += 1;
		if (isSessionComplete(queue)) pageState = 'complete';
	}

	/**
	 * Escape hatch (WR-01) for a selected queue item that resolves to no
	 * renderable branch: an `embedTargetFor` miss on a `formula-build` card,
	 * a missing `currentFact`, or a `mode` that doesn't match the current
	 * fact's `factKind`. There is nothing to grade here, so this never calls
	 * `recordGrade` - it only advances the LOCAL in-memory queue so the
	 * session can't stall permanently. `Rating.Good` is passed purely to
	 * satisfy `advanceQueue`'s signature and drop the item for this session
	 * (never `Rating.Again`, which would just re-enqueue the same
	 * unrenderable item and stall the session again later). `reviewedCount`
	 * is deliberately left untouched - nothing was actually reviewed.
	 */
	function handleUnrenderableSkip(): void {
		queue = advanceQueue(queue, Rating.Good);
		resetPerCardState();
		if (isSessionComplete(queue)) pageState = 'complete';
	}

	/**
	 * Reveals the current card's answer. Optionally plays the revealed fact's
	 * sound (best-effort enhancement, per the UI-SPEC's implementation notes) -
	 * an audio failure never affects `revealed`, which is already set above the
	 * try block.
	 */
	function handleReveal(): void {
		revealed = true;
		if (!currentFact) return;
		try {
			if (currentFact.factKind === 'chord-formula') {
				const chord = spellChord(currentFact.symbol);
				playChord(chord.notes.map((note) => note.letter));
			} else if (currentFact.factKind === 'interval-size') {
				const targetLetter = transposeFrom('C', currentFact.short);
				if (targetLetter) playNote(toPitch(targetLetter, 4));
			} else if (currentFact.factKind === 'scale-degree') {
				const degreeNote = majorScaleNotes(currentFact.tonic)[currentFact.degree - 1];
				if (degreeNote) playNote(toPitch(degreeNote.letter, 4));
			}
		} catch {
			// Audio is a best-effort enhancement; never let it break the reveal.
		}
	}

	/**
	 * Commits a grade and advances the queue in the same action (no separate
	 * Next tap, per the UI-SPEC's "tapping a choice IS the complete answer"
	 * precedent). Again-graded cards are re-enqueued (D-10): the register never
	 * decrements below its pre-re-enqueue value on an Again grade.
	 */
	async function handleGrade(rating: Rating): Promise<void> {
		if (!currentCard) return;
		try {
			const updated = await recordGrade(currentCard, rating, new Date());
			cardsByKey = new Map(cardsByKey).set(cardKey(updated.factId, updated.mode), updated);
			queue = advanceQueue(queue, rating);
			resetPerCardState();
			reviewedCount += 1;
			if (isSessionComplete(queue)) pageState = 'complete';
		} catch {
			pageState = 'error';
		}
	}

	const GRADES: { rating: Rating; label: string }[] = [
		{ rating: Rating.Again, label: 'Again' },
		{ rating: Rating.Hard, label: 'Hard' },
		{ rating: Rating.Good, label: 'Good' },
		{ rating: Rating.Easy, label: 'Easy' }
	];

	/** Inline style override for the Again grade button (D-color rule: reuses --color-wrong verbatim, no new token). */
	function gradeButtonStyle(rating: Rating): string | undefined {
		return rating === Rating.Again
			? 'background-color: var(--color-wrong); color: var(--color-ink);'
			: undefined;
	}
</script>

<!--
	The ONE mode-aware keyboard: closes over the page's existing reactive
	state, so it reproduces exactly the props Mode A / formula-reveal / Mode B
	each need - never two input surfaces for the same fact. Rendered inline in
	each mode's block below. Mode C ('formula-build') renders nothing here;
	the embedded BuildSession owns its own keyboard.
-->
{#snippet modeKeyboard()}
	{#if currentItem?.mode === 'see-play' && currentFact?.factKind === 'chord-formula'}
		{@const target = spellChord(currentFact.symbol)}
		{@const modeAWrong = modeAAnswered && modeAResult !== undefined && !modeAResult.correct}
		<PianoKeyboard
			notes={modeAWrong ? target.notes : []}
			interactive
			selected={selected}
			onToggle={toggleModeAKey}
			onPress={pressModeAKey}
			wrongLetters={modeAWrong ? extraLettersPlayed : undefined}
		/>
	{:else if currentItem?.mode === 'hear-name'}
		<PianoKeyboard notes={[]} inspectable />
	{:else if currentItem?.mode === 'formula'}
		{#if revealed && currentFact?.factKind === 'chord-formula'}
			{@const chord = spellChord(currentFact.symbol)}
			<PianoKeyboard notes={chord.notes} inspectable />
		{:else}
			<PianoKeyboard notes={[]} inspectable />
		{/if}
	{/if}
{/snippet}

{#if pageState === 'loading'}
	<p class="text-label font-mono uppercase" data-testid="recall-loading">
		COUNTING TODAY'S CARDS...
	</p>
{:else if pageState === 'empty-no-deck'}
	<div data-testid="recall-empty-no-deck">
		<p class="text-heading font-bold">Nothing to recall yet.</p>
		<p class="text-body mt-4">
			Play a few Drills first. Recall cards show up here as you meet new chords, intervals, and
			scale degrees.
		</p>
		<div class="mt-6">
			<Button variant="primary" href="/drills">Practice Now</Button>
		</div>
	</div>
{:else if pageState === 'empty-none-due'}
	<div data-testid="recall-empty-none-due">
		<p class="text-heading font-bold">Nothing due today.</p>
		<p class="text-body mt-4">
			Every card's tucked in for later. Come back tomorrow, or warm up with free practice.
		</p>
		<div class="mt-6">
			<Button variant="ghost" href="/drills">Practice Now</Button>
		</div>
	</div>
{:else if pageState === 'error'}
	<div data-testid="recall-error">
		<p class="text-body">
			Couldn't open the practice ledger. Reload the page, mon ami. If it keeps happening, your
			browser's storage might be full or blocked.
		</p>
		<div class="mt-6">
			<Button type="button" variant="ghost" onclick={load}>Try Again</Button>
		</div>
	</div>
{:else if pageState === 'complete'}
	<div data-testid="recall-complete">
		<p class="text-heading font-bold">Voila. That's today's stack.</p>
		<p class="text-label mt-2 font-mono uppercase" data-testid="recall-reviewed-count">
			{reviewedCount} REVIEWED TODAY
		</p>
		<div class="mt-6">
			<Button variant="primary" href="/drills">Practice Now</Button>
			{#if onViewMap}
				<Button type="button" variant="ghost" onclick={onViewMap}>View Recall Map</Button>
			{/if}
		</div>
	</div>
{:else if pageState === 'reviewing' && currentItem}
	<p class="text-label font-mono uppercase" aria-live="polite" data-testid="recall-register">
		{remaining} LEFT TODAY
	</p>
	<p class="text-label mt-2 font-mono uppercase" data-testid="recall-mode-chip">
		{MODE_LABELS[currentItem.mode as Mode]}
	</p>

	{#if currentItem.mode === 'formula-build'}
		{@const embedTarget = embedTargetFor(currentItem.factId)}
		{#if embedTarget}
			{#key `${currentItem.factId}|${currentItem.mode}`}
				{#if embedTarget.kind === 'chord'}
					<div class="mt-4">
						<HintLadder symbol={embedTarget.symbol} layers={hintLayersFor('formula-build')} />
					</div>
				{/if}
				<div class="mt-4">
					<BuildSession embedFact={embedTarget} onComplete={handleModeCNext} />
				</div>
			{/key}
		{:else}
			<p class="text-body mt-4" data-testid="recall-unrenderable">
				Couldn't show this card.
			</p>
			<div class="mt-6">
				<Button type="button" variant="ghost" onclick={handleUnrenderableSkip}>Skip</Button>
			</div>
		{/if}
	{:else if currentFact}
	{#if currentItem.mode === 'formula'}
		<div aria-live="polite">
			<div class="mt-4" data-testid="recall-prompt">
				{#if currentFact.factKind === 'chord-formula'}
					{@const chord = spellChord(currentFact.symbol)}
					<div class="flex items-start gap-4">
						<ChordGlyph root={chord.root} quality={chord.symbol.slice(chord.root.length)} />
					</div>
					<p class="text-body mt-4">What's the formula?</p>
				{:else if currentFact.factKind === 'interval-size'}
					{@const targetLetter = transposeFrom('C', currentFact.short)}
					<p class="text-heading font-serif font-bold">C to {targetLetter}</p>
					<p class="text-body mt-4">What's the interval?</p>
				{:else if currentFact.factKind === 'scale-degree'}
					<p class="text-heading font-bold">
						Degree {currentFact.degree} of {currentFact.tonic} major
					</p>
					<p class="text-body mt-4">Which note?</p>
				{/if}
			</div>

			{#if currentFact.factKind === 'chord-formula'}
				<div class="mt-4">
					{@render modeKeyboard()}
				</div>
			{/if}

			{#if !revealed}
				<div class="mt-6">
					<Button type="button" variant="primary" onclick={handleReveal}>Show Answer</Button>
				</div>
			{:else}
				<div class="stamp mt-6" data-testid="recall-reveal">
					{#if currentFact.factKind === 'chord-formula'}
						{@const chord = spellChord(currentFact.symbol)}
						<p class="text-body">Here's the formula:</p>
						<div class="mt-4 flex flex-wrap gap-4">
							{#each formulaFor(chord) as entry (entry.role + entry.letter)}
								<div class="flex flex-col items-center gap-1">
									<IntervalChip role={entry.role} label={entry.label} longName={entry.longFr} />
									<span class="text-label font-mono">{entry.letter}</span>
									<span class="text-label font-mono">{entry.solfege}</span>
								</div>
							{/each}
						</div>
					{:else if currentFact.factKind === 'interval-size'}
						{@const info = intervalFromShort(currentFact.short)}
						<p class="text-body">Here's the interval:</p>
						<div class="mt-4">
							<IntervalChip role={info.role} label={info.short} longName={info.longFr} />
						</div>
					{:else if currentFact.factKind === 'scale-degree'}
						{@const degreeNote = majorScaleNotes(currentFact.tonic)[currentFact.degree - 1]}
						<p class="text-body">Here's the note:</p>
						{#if degreeNote}
							<div
								class="mt-4 inline-block border-2 p-2"
								style={`border-color: var(--color-ink); background-color: var(--color-${degreeNote.role}); color: var(--color-on-${degreeNote.role});`}
							>
								<NoteLabel letter={degreeNote.letter} solfege={degreeNote.solfege} highlighted />
							</div>
						{/if}
					{/if}
				</div>

				<div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="recall-grade-grid">
					{#each GRADES as grade (grade.rating)}
						<Button
							type="button"
							variant="ghost"
							style={gradeButtonStyle(grade.rating)}
							data-testid={`recall-grade-${grade.label.toLowerCase()}`}
							onclick={() => handleGrade(grade.rating)}
						>
							<span class="flex flex-col items-center gap-1">
								<span class="text-heading font-bold">{grade.label}</span>
								<span class="text-label font-mono">{intervalTag(grade.rating)}</span>
							</span>
						</Button>
					{/each}
				</div>
			{/if}
		</div>
	{:else if currentItem.mode === 'see-play' && currentFact.factKind === 'chord-formula'}
		{@const target = spellChord(currentFact.symbol)}
		<div aria-live="polite">
			<div class="mt-4" data-testid="recall-prompt">
				<div class="flex items-start gap-4">
					<ChordGlyph root={target.root} quality={target.symbol.slice(target.root.length)} />
				</div>
				<p class="text-body mt-4">Play it on the keyboard.</p>
			</div>

			<div class="mt-4">
				{@render modeKeyboard()}
			</div>

			{#if !modeAAnswered}
				{#key cardKey(currentItem.factId, currentItem.mode)}
					<div class="mt-6">
						<HintLadder symbol={currentFact.symbol} layers={hintLayersFor('see-play')} />
					</div>
				{/key}

				<div class="mode-a-controls mt-4">
					<div class="mode-a-controls__primary">
						<Button
							type="button"
							variant="primary"
							disabled={selected.size === 0}
							onclick={handleModeACheck}
						>
							Check
						</Button>
					</div>
					<div class="mode-a-controls__secondary">
						<Button type="button" variant="ghost" onclick={() => (selected = new Set())}>
							Clear
						</Button>
					</div>
				</div>
			{:else}
				<div class="stamp mt-6" data-testid="recall-mode-a-feedback">
					{#if modeAResult?.correct}
						<p class="text-body font-bold">{confirmationText}</p>
					{:else}
						<div class="bg-ink p-4">
							<p class="text-label text-mustard font-mono uppercase">{headlineText}</p>
						</div>
						<p class="text-label mt-4 flex gap-4 font-mono" data-testid="recall-mode-a-legend">
							<span class="inline-flex items-center gap-2">
								<span
									class="inline-block h-3 w-3"
									style="background-color: var(--color-third);"
									aria-hidden="true"
								></span>
								The chord
							</span>
							<span class="inline-flex items-center gap-2">
								<span
									class="inline-block h-3 w-3"
									style="background-color: var(--color-wrong);"
									aria-hidden="true"
								></span>
								Your extra note
							</span>
						</p>
					{/if}
				</div>

				<div class="mt-6">
					<Button type="button" variant="primary" onclick={handleModeANext}>Next</Button>
				</div>
			{/if}
		</div>
	{:else if currentItem.mode === 'hear-name' && currentFact.factKind === 'chord-formula'}
		{@const chord = spellChord(currentFact.symbol)}
		{@const hearNameCorrect = hearNameAnswered && hearNameGiven === currentFact.symbol}
		<div aria-live="polite">
			<div class="mt-4" data-testid="recall-prompt">
				<p class="text-body">Listen. Name the chord.</p>
			</div>

			<div class="mt-4">
				<Button
					type="button"
					variant="primary"
					onclick={() => handleHearNamePlay(chord)}
				>
					{hearNamePlayCount === 0 ? 'Play' : 'Play again'}
				</Button>
			</div>

			<div class="mt-4">
				{@render modeKeyboard()}
			</div>

			<div class="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4" data-testid="hear-name-choice-grid">
				{#each hearNameChoices as choice (choice)}
					<Button
						type="button"
						variant="ghost"
						disabled={hearNameAnswered}
						aria-label={`Answer: ${choice}`}
						onclick={() => handleHearNameChoice(choice)}
					>
						<span class="font-serif text-heading font-bold">{choice}</span>
					</Button>
				{/each}
			</div>

			{#if hearNameAnswered}
				<div class="stamp mt-6" data-testid="recall-hear-name-feedback">
					{#if hearNameCorrect}
						<p class="text-body font-bold">{confirmationText}</p>
					{:else}
						<div class="bg-ink p-4">
							<p class="text-label text-mustard font-mono uppercase">{headlineText}</p>
						</div>
						<RevealInsight correctSymbol={currentFact.symbol} givenSymbol={hearNameGiven} />
					{/if}
				</div>

				{#key cardKey(currentItem.factId, currentItem.mode)}
					<div class="mt-6">
						<HintLadder
							symbol={currentFact.symbol}
							layers={hintLayersFor('hear-name')}
							onOpen={onHearNameHintOpen}
						/>
					</div>
				{/key}

				{#if hearNameHintOpen}
					<div class="mt-4">
						<Button
							type="button"
							variant="ghost"
							onclick={() => advanceHearName(hearNameCommittedRating ?? Rating.Again)}
						>
							Continue
						</Button>
					</div>
				{/if}
			{/if}
		</div>
	{:else}
		<p class="text-body mt-4" data-testid="recall-unrenderable">
			Couldn't show this card.
		</p>
		<div class="mt-6">
			<Button type="button" variant="ghost" onclick={handleUnrenderableSkip}>Skip</Button>
		</div>
	{/if}
{:else}
	<p class="text-body mt-4" data-testid="recall-unrenderable">Couldn't show this card.</p>
	<div class="mt-6">
		<Button type="button" variant="ghost" onclick={handleUnrenderableSkip}>Skip</Button>
	</div>
{/if}
{/if}

<style>
	/* @keyframes stamp-in lives in app.css (shared with Drills/PianoKeyboard's
	   feedback-mode reveal beat); this local binding is what actually fires it
	   here, matching the per-consumer convention every other reveal surface
	   follows. */
	.stamp {
		animation: stamp-in 240ms ease-out;
	}

	/*
	 * Mode A's Check/Clear row (13-03): the same 3:1 primary/secondary flex
	 * ratio Drills' .drill-controls uses, reused here as a local style scoped
	 * to this component rather than a shared class.
	 */
	.mode-a-controls {
		display: flex;
		gap: var(--spacing-sm);
	}

	.mode-a-controls__primary {
		flex: 3;
	}

	.mode-a-controls__secondary {
		flex: 1;
	}

	.mode-a-controls__primary :global(.ps-button),
	.mode-a-controls__secondary :global(.ps-button) {
		width: 100%;
	}
</style>
