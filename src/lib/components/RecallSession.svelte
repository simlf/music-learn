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
	import { selectReviewCards, interleaveQueue } from '$lib/srs/rotation';
	import { remainingIntroBudget, consumeIntroBudget } from '$lib/srs/introBudget';
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
	import { symbolHasProvenance, songsForSymbol } from '$lib/practice/songProvenance';
	import { logConfidence, type Confidence } from '$lib/practice/confidenceLog';
	import { recordPracticeAnswer } from '$lib/practice/answerTelemetry';
	import { t } from '$lib/i18n/locale.svelte';
	import ChordGlyph from './ChordGlyph.svelte';
	import IntervalChip from './IntervalChip.svelte';
	import NoteLabel from './NoteLabel.svelte';
	import PianoKeyboard from './PianoKeyboard.svelte';
	import Button from './Button.svelte';
	import RevealInsight from './RevealInsight.svelte';
	import BuildSession from './BuildSession.svelte';
	import SongMark from './SongMark.svelte';
	import HintLadder from './HintLadder.svelte';

	/**
	 * Mode-signal chip label (UI-SPEC "Mode Surfaces" / Scope Decision 8):
	 * every mode a queue item can carry, including the pre-existing `formula`
	 * mode, reads its own uppercase label immediately below the "N LEFT
	 * TODAY" register. The arrow is the same "→" glyph already used
	 * elsewhere in this codebase, never an em dash.
	 */
	const MODE_LABELS = $derived.by(
		(): Record<Mode, string> => ({
			formula: t('recall.mode.formula'),
			'formula-build': t('recall.mode.formula-build'),
			'see-play': t('recall.mode.see-play'),
			'hear-name': t('recall.mode.hear-name')
		})
	);

	/**
	 * Right-answer/wrong-answer confirmation variants (mirrors
	 * drills/+page.svelte's own CORRECT_VARIANTS/WRONG_VARIANTS/pickVariant
	 * verbatim, scoped to this component for Mode A's feedback line).
	 */
	const CORRECT_VARIANTS = $derived.by(() => [
		t('recall.feedback.correct.0'),
		t('recall.feedback.correct.1'),
		t('recall.feedback.correct.2'),
		t('recall.feedback.correct.3')
	]);
	const WRONG_VARIANTS = $derived.by(() => [
		t('recall.feedback.wrong.0'),
		t('recall.feedback.wrong.1'),
		t('recall.feedback.wrong.2')
	]);

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
		/** SONG-02: "From my songs" restriction on the review queue. Default off (byte-identical to no filter). */
		songFilterOn?: boolean;
		/** Pre-built symbol -> song-names index (18-01's buildProvenanceIndex); the page builds it once and passes it down. */
		provenanceIndex?: Map<string, string[]>;
	}

	let { onViewMap, songFilterOn = false, provenanceIndex }: Props = $props();

	/**
	 * Gap closure (Plan 04 checkpoint deviation, 24-UAT Test 3 follow-up):
	 * `.review-action-dock`'s rendered height varies by mode/state (a single
	 * Reveal button row vs. the 2x2 grade grid, which is roughly 4x taller),
	 * but `--review-dock-clearance` in app.css was a static 60px sized only
	 * for the one-row state - the grade grid overflowed it and clipped the
	 * reveal content above with no way to scroll further. Self-measure the
	 * dock's actual height (mirrors PianoKeyboard's bind:this + guarded
	 * ResizeObserver convention, T-09-01) and push it onto the ancestor
	 * `main[data-review-dock]` as an inline custom-property override -
	 * CSS custom properties only cascade downward, and the padding-bottom
	 * consumer lives on `main` (an ancestor of this component, which renders
	 * no wrapping root element of its own), so the value must be written via
	 * the DOM rather than passed down through markup nesting.
	 */
	let dockEl: HTMLDivElement | undefined = $state();

	$effect(() => {
		if (!dockEl || typeof ResizeObserver === 'undefined') return;
		const mainEl = dockEl.closest<HTMLElement>('main[data-review-dock]');
		if (!mainEl) return;

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (entry) {
				mainEl.style.setProperty('--review-dock-clearance', `${entry.contentRect.height}px`);
			}
		});
		observer.observe(dockEl);

		return () => {
			observer.disconnect();
			mainEl.style.removeProperty('--review-dock-clearance');
		};
	});

	type PageState =
		| 'loading'
		| 'empty-no-deck'
		| 'empty-none-due'
		| 'empty-filtered-none-due'
		| 'reviewing'
		| 'complete'
		| 'error';

	let pageState = $state<PageState>('loading');
	let queue = $state<QueueItem[]>([]);
	let cardsByKey = $state(new Map<string, CardRecord>());
	let revealed = $state(false);
	let reviewedCount = $state(0);
	/**
	 * Sketch 020-B: optional confidence pick for the current formula-mode
	 * card. undefined = no dot picked (logs as 'unrated' on grade). Lives in
	 * content flow, not the action dock - it is enrichment, never a gate on
	 * Reveal or grading.
	 */
	let selectedConfidence = $state<Confidence | undefined>(undefined);
	/** MD-02: how many real due cards the song filter is currently hiding, for the filter-aware empty message. */
	let filteredHiddenCount = $state(0);
	/**
	 * Recall telemetry's per-card clock (260722-0ex, BACKLOG-2): a plain,
	 * non-reactive variable (mirrors hearNameAdvanceTimer's own "not reactive
	 * state" discipline - it drives no rendering, only a fire-and-forget
	 * durationMs computation at grade time). Set once when a card becomes
	 * current: at the point load() enters the 'reviewing' state, and again
	 * inside resetPerCardState() (which already runs after every advance).
	 */
	let questionShownAt = Date.now();
	/**
	 * Bumped on every card advance (resetPerCardState) so the Mode C
	 * `{#key}` block below always remounts a fresh BuildSession, even when
	 * advanceQueue's Again re-enqueue on a SOLE queue item returns the same
	 * head object (nothing else to reorder around) - without this, an
	 * Again-graded formula-build completion would key on an unchanged
	 * `factId|mode` string, leaving the just-completed BuildSession instance
	 * frozen on its own 'complete' screen forever (every further Next tap
	 * re-firing onComplete(Again) and inflating reviewedCount without ever
	 * showing a fresh construction).
	 */
	let cardEpoch = $state(0);

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
	 * SONG-02's queue restriction: when the filter is ON and a non-empty
	 * provenance index is available, keep only chord-formula cards whose
	 * symbol belongs to an active song (dropping non-song chords AND
	 * non-chord facts like interval-size/scale-degree). When the filter is ON
	 * but the index is empty (no derivable song chords), leave `due`
	 * unchanged so the session never dead-ends - the page already surfaces
	 * the fallback note in that case.
	 */
	function applySongFilter(due: CardRecord[]): CardRecord[] {
		if (!songFilterOn || !provenanceIndex || provenanceIndex.size === 0) return due;
		return due.filter((card) => {
			const fact = factById(card.factId);
			return (
				fact !== undefined &&
				fact.factKind === 'chord-formula' &&
				symbolHasProvenance(fact.symbol, provenanceIndex)
			);
		});
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

	/**
	 * Daily new-card intro budget + due-backlog gate (260722-0ex, BACKLOG-1):
	 * getDueCards() runs FIRST so the backlog gate can inspect the PRE-
	 * introduction due count. A backlog over 20 cards means zero new facts are
	 * introduced this mount, no matter how much of today's budget remains -
	 * the deck's job right now is clearing the backlog, not growing it
	 * further. Otherwise, up to the remaining daily budget is introduced
	 * (introduceNewCards returns a FACT count per the 13-01 convention, which
	 * is exactly what the budget consumes) and due cards are RE-FETCHED so
	 * any freshly-introduced New cards (due = now) enter this session.
	 */
	const DUE_BACKLOG_GATE = 20;

	async function load(): Promise<void> {
		pageState = 'loading';
		try {
			const preDue = await getDueCards();
			let dueBase: CardRecord[];
			if (preDue.length > DUE_BACKLOG_GATE) {
				dueBase = preDue;
			} else {
				const remaining = remainingIntroBudget(new Date());
				if (remaining > 0) {
					const introduced = await introduceNewCards(remaining);
					if (introduced > 0) consumeIntroBudget(introduced, new Date());
				}
				dueBase = await getDueCards();
			}
			const due = applySongFilter(dueBase);
			if (due.length === 0) {
				// MD-02: distinguish "the filter hid everything" from "truly
				// nothing due" - dueBase is only non-empty here when
				// applySongFilter actually restricted the set (filter ON with a
				// non-empty provenance index), so real due cards exist but are
				// hidden, never genuinely absent.
				if (dueBase.length > 0) {
					filteredHiddenCount = dueBase.length;
					pageState = 'empty-filtered-none-due';
					return;
				}
				const all = await getAllCards();
				pageState = all.length === 0 ? 'empty-no-deck' : 'empty-none-due';
				return;
			}
			const selectedCards = selectReviewCards(due);
			cardsByKey = new Map(
				selectedCards.map((card) => [cardKey(card.factId, card.mode), card])
			);
			// RECALL-03/BACKLOG-12: interleave the selected review cards so the
			// same fact (outside a State.New teach cluster) and the same chord
			// root never repeat too closely - cardsByKey stays keyed off
			// selectedCards (order-independent).
			const orderedCards = interleaveQueue(selectedCards, Math.random);
			queue = buildQueue(orderedCards.map((card) => ({ factId: card.factId, mode: card.mode })));
			revealed = false;
			reviewedCount = 0;
			questionShownAt = Date.now();
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
		questionShownAt = Date.now();
		cardEpoch += 1;
		selectedConfidence = undefined;
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

		// 260722-0ex (BACKLOG-2): recall telemetry, fire-and-forget, exactly
		// once per grade path.
		recordPracticeAnswer({
			item: currentFact.symbol,
			kind: 'chord',
			correct: result.correct,
			durationMs: Date.now() - questionShownAt
		});

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
	 * Tapping a choice IS the complete answer (D-05): grades immediately and
	 * writes the FSRS rating fire-and-forget (never blocks the advance).
	 *
	 * 260722-0ex (BACKLOG-7) deliberately revises D-04's "always auto-advance,
	 * never gates" mandate: a CORRECT choice still auto-advances after
	 * HEAR_NAME_ADVANCE_MS (the snappy path, unchanged). A WRONG choice no
	 * longer schedules that timer at all - instead it surfaces the existing
	 * Continue button immediately (the same `hearNameHintOpen` flag the
	 * hint-ladder's own onOpen path already uses to cancel the timer and show
	 * Continue), so the correction headline + RevealInsight + SongMark stay
	 * on screen until the user reads them and taps Continue themselves.
	 * Errors are exactly the cards that need study; the prior 650ms auto-
	 * advance let a wrong answer's own correction vanish before it could be
	 * read. Continue still calls advanceHearName(hearNameCommittedRating),
	 * so the queue-advance/re-enqueue contract is unchanged - only the
	 * TIMING of that advance differs for a wrong choice.
	 */
	function handleHearNameChoice(choice: string): void {
		if (hearNameAnswered || !currentFact || currentFact.factKind !== 'chord-formula') return;

		hearNameAnswered = true;
		hearNameGiven = choice;

		const rating = choice === currentFact.symbol ? Rating.Good : Rating.Again;
		hearNameCommittedRating = rating;
		const durationMs = Date.now() - questionShownAt;

		if (rating === Rating.Good) {
			const [text, index] = pickVariant(CORRECT_VARIANTS, confirmationIndex);
			confirmationText = text;
			confirmationIndex = index;
		} else {
			const [text, index] = pickVariant(WRONG_VARIANTS, wrongIndex);
			headlineText = text;
			wrongIndex = index;
		}

		// 260722-0ex (BACKLOG-2): recall telemetry, fire-and-forget, exactly
		// once per grade path.
		recordPracticeAnswer({
			item: currentFact.symbol,
			kind: 'chord',
			correct: rating === Rating.Good,
			durationMs
		});

		const cardToGrade = currentCard;
		const key = currentItem ? cardKey(currentItem.factId, currentItem.mode) : undefined;
		if (cardToGrade && key) {
			void recordGrade(cardToGrade, rating, new Date())
				.then((updated) => {
					cardsByKey = new Map(cardsByKey).set(key, updated);
				})
				.catch(() => {
					// Best-effort write (D-04 auto-rating): never blocks Mode B's
					// advance.
				});
		}

		if (rating === Rating.Good) {
			clearTimeout(hearNameAdvanceTimer);
			hearNameAdvanceTimer = setTimeout(() => {
				advanceHearName(rating);
			}, HEAR_NAME_ADVANCE_MS);
		} else {
			hearNameHintOpen = true;
		}
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
	 * completes (Mode C, Scope Decision 7). 260722-0ex (BACKLOG-6): threads
	 * BuildSession's own computed rating through to advanceQueue - a
	 * wrong-heavy construction (>= 2x its step count) now grades Again, so it
	 * re-enqueues exactly like Mode A/B, rather than the prior design's
	 * floor at Hard (which could never lapse). The FSRS write itself already
	 * happened inside BuildSession's own unchanged recordConstructionOutcome;
	 * this handler only advances the LOCAL in-memory queue, mirroring Mode
	 * A/B's own advance shape.
	 */
	function handleModeCNext(rating: Rating): void {
		queue = advanceQueue(queue, rating);
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
	 * Recall telemetry's item/kind pair for a fact (260722-0ex, BACKLOG-2),
	 * verified against AnswerEvent's `kind: 'chord' | 'scale' | 'interval'`
	 * union in progress.ts - no new kind is ever introduced here. Returns
	 * undefined for a missing/unrecognized fact (a scale-formula factId never
	 * resolves via factById, mirroring embedTargetFor's own independence from
	 * the shared catalog) so the caller can skip the telemetry call rather
	 * than throw.
	 */
	function telemetryDescriptor(
		fact: ReturnType<typeof factById>
	): { item: string; kind: 'chord' | 'interval' | 'scale' } | undefined {
		if (!fact) return undefined;
		if (fact.factKind === 'chord-formula') return { item: fact.symbol, kind: 'chord' };
		if (fact.factKind === 'interval-size') return { item: fact.short, kind: 'interval' };
		if (fact.factKind === 'scale-degree') return { item: `${fact.tonic} major`, kind: 'scale' };
		return undefined;
	}

	/**
	 * Commits a grade and advances the queue in the same action (no separate
	 * Next tap, per the UI-SPEC's "tapping a choice IS the complete answer"
	 * precedent). Again-graded cards are re-enqueued (D-10): the register never
	 * decrements below its pre-re-enqueue value on an Again grade.
	 */
	async function handleGrade(rating: Rating): Promise<void> {
		if (!currentCard) return;
		// Snapshotted before any await, mirroring logConfidence's own
		// currentCard-derived (never currentItem's) factId discipline below -
		// advanceQueue may reshuffle the queue once this resolves.
		const gradedFactId = currentCard.factId;
		const durationMs = Date.now() - questionShownAt;
		try {
			// Sketch 020-B: log the (picked or 'unrated') confidence pick paired
			// with correctness BEFORE the grade commits, using the card's own
			// factId/mode (never currentItem's, in case advanceQueue reshuffles
			// the queue below). logConfidence is already a total function (25-04
			// swallows quota/parse errors internally); the try/catch here keeps
			// the whole grade path resilient even against an unexpected throw, so
			// a full store can never block the review loop.
			try {
				logConfidence({
					factId: currentCard.factId,
					mode: currentCard.mode,
					confidence: selectedConfidence ?? 'unrated',
					// FSRS semantics: Hard is a PASSING grade (recalled, with
					// effort); only Again is a lapse. Counting Hard as wrong would
					// record an honest certain-then-Hard review as confident-but-
					// wrong, inflating the MISCALIBRATED flag and the /progress
					// danger list (WR-06).
					correct: rating !== Rating.Again,
					at: new Date().toISOString()
				});
			} catch {
				// Never let a logging failure block grading.
			}
			const updated = await recordGrade(currentCard, rating, new Date());
			cardsByKey = new Map(cardsByKey).set(cardKey(updated.factId, updated.mode), updated);

			// 260722-0ex (BACKLOG-2): recall telemetry, fire-and-forget, exactly
			// once per grade path. Mirrors logConfidence's correctness semantics
			// (Hard is a pass, only Again is a lapse).
			const descriptor = telemetryDescriptor(factById(gradedFactId));
			if (descriptor) {
				recordPracticeAnswer({ ...descriptor, correct: rating !== Rating.Again, durationMs });
			}

			queue = advanceQueue(queue, rating);
			resetPerCardState();
			reviewedCount += 1;
			if (isSessionComplete(queue)) pageState = 'complete';
		} catch {
			pageState = 'error';
		}
	}

	const GRADES = $derived.by(
		(): { rating: Rating; label: string }[] => [
			{ rating: Rating.Again, label: t('recall.grade.again') },
			{ rating: Rating.Hard, label: t('recall.grade.hard') },
			{ rating: Rating.Good, label: t('recall.grade.good') },
			{ rating: Rating.Easy, label: t('recall.grade.easy') }
		]
	);

	/**
	 * Sketch 020-B: the three optional confidence dots rendered under the
	 * formula-mode prompt (never in `.review-action-dock`). Literal glyphs
	 * stay untranslated (immunity); only the aria label is keyed.
	 */
	const CONFIDENCE_DOTS = $derived.by(
		(): { level: Confidence; glyph: string; aria: string }[] => [
			{ level: 'unsure', glyph: '?', aria: t('recall.confidence.aria.unsure') },
			{ level: 'somewhat', glyph: '~', aria: t('recall.confidence.aria.somewhat') },
			{ level: 'certain', glyph: '!', aria: t('recall.confidence.aria.certain') }
		]
	);

	/** Tapping the already-picked dot again clears it back to undefined (unrated). */
	function toggleConfidence(level: Confidence): void {
		selectedConfidence = selectedConfidence === level ? undefined : level;
	}

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
{#snippet formulaActions()}
	{#if !revealed}
		<div class="review-action-dock__row">
			<Button type="button" variant="primary" onclick={handleReveal}
				>{t('recall.cta.show-answer')}</Button
			>
		</div>
	{:else}
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="recall-grade-grid">
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
{/snippet}

<!--
	see-play mode's docked primary advance action (Task 2, issue #14): Check
	(unanswered) is the load-bearing dock action; Clear stays a secondary that
	rides alongside it. Once answered, Next replaces both - the single action
	that advances. Reused verbatim in-flow (desktop) and in the dock (phone).
-->
{#snippet seePlayActions()}
	{#if !modeAAnswered}
		<div class="mode-a-controls">
			<div class="mode-a-controls__primary">
				<Button type="button" variant="primary" disabled={selected.size === 0} onclick={handleModeACheck}>
					{t('recall.cta.check')}
				</Button>
			</div>
			<div class="mode-a-controls__secondary">
				<Button type="button" variant="ghost" onclick={() => (selected = new Set())}>
					{t('recall.cta.clear')}
				</Button>
			</div>
		</div>
	{:else}
		<div class="review-action-dock__row">
			<Button type="button" variant="primary" onclick={handleModeANext}
				>{t('recall.cta.next')}</Button
			>
		</div>
	{/if}
{/snippet}

<!--
	hear-name mode's docked primary advance action (Task 2, issue #14): the
	post-hint Continue button only exists once hearNameHintOpen is true (the
	choice grid auto-advances otherwise, per D-04's never-gates contract) - so
	this snippet renders nothing when the hint hasn't been opened, and the
	dock is simply empty for hear-name until then.
-->
{#snippet hearNameActions()}
	{#if hearNameHintOpen}
		<div class="review-action-dock__row">
			<Button
				type="button"
				variant="ghost"
				onclick={() => advanceHearName(hearNameCommittedRating ?? Rating.Again)}
			>
				{t('recall.cta.continue')}
			</Button>
		</div>
	{/if}
{/snippet}

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
		{t('recall.state.loading')}
	</p>
{:else if pageState === 'empty-no-deck'}
	<div data-testid="recall-empty-no-deck">
		<p class="text-heading font-bold">{t('recall.empty.no-deck.heading')}</p>
		<p class="text-body mt-4">
			{t('recall.empty.no-deck.body')}
		</p>
		<div class="mt-6">
			<Button variant="primary" href="/drills">{t('recall.cta.practice-now')}</Button>
		</div>
	</div>
{:else if pageState === 'empty-none-due'}
	<div data-testid="recall-empty-none-due">
		<p class="text-heading font-bold">{t('recall.empty.none-due.heading')}</p>
		<p class="text-body mt-4">
			{t('recall.empty.none-due.body')}
		</p>
		<div class="mt-6">
			<Button variant="ghost" href="/drills">{t('recall.cta.practice-now')}</Button>
		</div>
	</div>
{:else if pageState === 'empty-filtered-none-due'}
	<div data-testid="recall-empty-filtered-none-due">
		<p class="text-heading font-bold">{t('recall.empty.filtered.heading')}</p>
		<p class="text-body mt-4">
			{filteredHiddenCount}
			{filteredHiddenCount === 1
				? t('recall.empty.filtered.singular')
				: t('recall.empty.filtered.plural')}
		</p>
		<div class="mt-6">
			<Button variant="ghost" href="/drills">{t('recall.cta.practice-now')}</Button>
		</div>
	</div>
{:else if pageState === 'error'}
	<div data-testid="recall-error">
		<p class="text-body">
			{t('recall.error.body')}
		</p>
		<div class="mt-6">
			<Button type="button" variant="ghost" onclick={load}>{t('recall.cta.try-again')}</Button>
		</div>
	</div>
{:else if pageState === 'complete'}
	<div data-testid="recall-complete">
		<p class="text-heading font-bold">{t('recall.complete.heading')}</p>
		<p class="text-label mt-2 font-mono uppercase" data-testid="recall-reviewed-count">
			{reviewedCount} {t('recall.register.reviewed-today')}
		</p>
		<div class="mt-6">
			<Button variant="primary" href="/drills">{t('recall.cta.practice-now')}</Button>
			{#if onViewMap}
				<Button type="button" variant="ghost" onclick={onViewMap}>{t('recall.cta.view-map')}</Button>
			{/if}
		</div>
	</div>
{:else if pageState === 'reviewing' && currentItem}
	<p class="text-label font-mono uppercase" aria-live="polite" data-testid="recall-register">
		{remaining} {t('recall.register.left-today')}
	</p>
	<p class="text-label mt-2 font-mono uppercase" data-testid="recall-mode-chip">
		{MODE_LABELS[currentItem.mode as Mode]}
	</p>

	<!--
		Phone-only fixed action dock (Sketch 014-A, issue #14 point 1): pinned
		above the bottom tab bar via the shared --tab-bar-clearance token, so
		every review mode's primary advance action is reachable without
		scrolling on a 390px phone. Hidden on desktop (>=640px) by the
		self-contained media query below - the in-flow copies render there
		instead. formula-build (Mode C) renders no dock action; the embedded
		BuildSession owns its own actions/keyboard.
	-->
	<div class="review-action-dock" data-testid="recall-action-dock" bind:this={dockEl}>
		<div class="review-action-dock__inner">
			{#if currentItem.mode === 'formula' && currentFact}
				{@render formulaActions()}
			{:else if currentItem.mode === 'see-play' && currentFact?.factKind === 'chord-formula'}
				{@render seePlayActions()}
			{:else if currentItem.mode === 'hear-name' && currentFact?.factKind === 'chord-formula'}
				{@render hearNameActions()}
			{/if}
		</div>
	</div>

	{#if currentItem.mode === 'formula-build'}
		{@const embedTarget = embedTargetFor(currentItem.factId)}
		{#if embedTarget}
			{#key `${currentItem.factId}|${currentItem.mode}|${cardEpoch}`}
				{#if embedTarget.kind === 'chord'}
					<div class="mt-4">
						<HintLadder symbol={embedTarget.symbol} layers={hintLayersFor('formula-build')} />
					</div>
				{/if}
				<div class="mt-4">
					<SongMark
						songs={currentFact?.factKind === 'chord-formula'
							? songsForSymbol(currentFact.symbol, provenanceIndex)
							: []}
					/>
					<BuildSession embedFact={embedTarget} onComplete={handleModeCNext} />
				</div>
			{/key}
		{:else}
			<p class="text-body mt-4" data-testid="recall-unrenderable">
				{t('recall.unrenderable.message')}
			</p>
			<div class="mt-6">
				<Button type="button" variant="ghost" onclick={handleUnrenderableSkip}
					>{t('recall.cta.skip')}</Button
				>
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
						<SongMark songs={songsForSymbol(currentFact.symbol, provenanceIndex)} />
					</div>
					<p class="text-body mt-4">{t('recall.prompt.formula-question')}</p>
				{:else if currentFact.factKind === 'interval-size'}
					{@const targetLetter = transposeFrom('C', currentFact.short)}
					<p class="text-heading font-serif font-bold">
						C {t('recall.prompt.c-to')} {targetLetter}
					</p>
					<p class="text-body mt-4">{t('recall.prompt.interval-question')}</p>
				{:else if currentFact.factKind === 'scale-degree'}
					<p class="text-heading font-bold">
						{t('recall.prompt.degree-prefix')} {currentFact.degree} {t('recall.prompt.degree-of')}
						{currentFact.tonic} {t('recall.prompt.degree-major')}
					</p>
					<p class="text-body mt-4">{t('recall.prompt.note-question')}</p>
				{/if}
			</div>

			<!--
				Sketch 020-B (LOCKED): optional confidence dots sit in content flow
				between the prompt and the keyboard/reveal, a deliberate exception
				to the 014 docked-actions rule - rating is enrichment, never a
				required action, so it lives in scrolling content. Reveal stays in
				the action dock/in-flow slot below, untouched by this block. Gone
				entirely once revealed (no post-hoc re-rating).
			-->
			{#if !revealed}
				<div class="mt-4" data-testid="recall-confidence-dots">
					<div class="conf-dot-row" role="group" aria-label={t('recall.confidence.group-aria')}>
						{#each CONFIDENCE_DOTS as dot (dot.level)}
							<button
								type="button"
								class="conf-dot"
								class:picked={selectedConfidence === dot.level}
								aria-label={dot.aria}
								aria-pressed={selectedConfidence === dot.level}
								data-testid={`recall-confidence-${dot.level}`}
								onclick={() => toggleConfidence(dot.level)}
							>
								{dot.glyph}
							</button>
						{/each}
					</div>
					<p class="text-label mt-1 font-mono">{t('recall.confidence.legend')}</p>
				</div>
			{/if}

			{#if currentFact.factKind === 'chord-formula'}
				<div class="mt-4">
					{@render modeKeyboard()}
				</div>
			{/if}

			{#if revealed}
				<div class="stamp mt-6" data-testid="recall-reveal">
					{#if currentFact.factKind === 'chord-formula'}
						{@const chord = spellChord(currentFact.symbol)}
						<p class="text-body">{t('recall.reveal.formula')}</p>
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
						<p class="text-body">{t('recall.reveal.interval')}</p>
						<div class="mt-4">
							<IntervalChip role={info.role} label={info.short} longName={info.longFr} />
						</div>
					{:else if currentFact.factKind === 'scale-degree'}
						{@const degreeNote = majorScaleNotes(currentFact.tonic)[currentFact.degree - 1]}
						<p class="text-body">{t('recall.reveal.note')}</p>
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
			{/if}

			<!--
				Phone-only fixed action dock (Sketch 014-A, issue #14 point 1): the
				Révéler/grade actions render ONCE via {@render formulaActions()} and
				are placed EITHER here (desktop, in normal flow) OR in the dock below
				(phone) - never both, so the reveal/grade buttons can never diverge
				between the two placements. `.review-inflow-actions` is hidden on
				phone by the self-contained media query in this component's <style>.
			-->
			<div class="review-inflow-actions mt-6">
				{@render formulaActions()}
			</div>
		</div>
	{:else if currentItem.mode === 'see-play' && currentFact.factKind === 'chord-formula'}
		{@const target = spellChord(currentFact.symbol)}
		<div aria-live="polite">
			<div class="mt-4" data-testid="recall-prompt">
				<div class="flex items-start gap-4">
					<ChordGlyph root={target.root} quality={target.symbol.slice(target.root.length)} />
					<SongMark songs={songsForSymbol(currentFact.symbol, provenanceIndex)} />
				</div>
				<p class="text-body mt-4">{t('recall.prompt.see-play')}</p>
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
								{t('recall.legend.chord')}
							</span>
							<span class="inline-flex items-center gap-2">
								<span
									class="inline-block h-3 w-3"
									style="background-color: var(--color-wrong);"
									aria-hidden="true"
								></span>
								{t('recall.legend.extra-note')}
							</span>
						</p>
					{/if}
				</div>
			{/if}

			<!--
				Phone-only fixed action dock (Task 2, issue #14): seePlayActions
				renders ONCE and is placed EITHER here (desktop, in normal flow) OR
				in the dock (phone) - see the formula-mode comment above for the
				same discipline.
			-->
			<div class="review-inflow-actions mt-4">
				{@render seePlayActions()}
			</div>
		</div>
	{:else if currentItem.mode === 'hear-name' && currentFact.factKind === 'chord-formula'}
		{@const chord = spellChord(currentFact.symbol)}
		{@const hearNameCorrect = hearNameAnswered && hearNameGiven === currentFact.symbol}
		<div aria-live="polite">
			<div class="mt-4" data-testid="recall-prompt">
				<p class="text-body">{t('recall.prompt.hear-name')}</p>
			</div>

			<div class="mt-4">
				<Button
					type="button"
					variant="primary"
					onclick={() => handleHearNamePlay(chord)}
				>
					{hearNamePlayCount === 0 ? t('recall.cta.play') : t('recall.cta.play-again')}
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
						aria-label={`${t('recall.aria.answer-prefix')} ${choice}`}
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
					<div class="mt-4">
						<SongMark songs={songsForSymbol(currentFact.symbol, provenanceIndex)} />
					</div>
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

				<!--
					Phone-only fixed action dock (Task 2, issue #14): hearNameActions
					renders ONCE (Continue, only once hearNameHintOpen) and is placed
					EITHER here (desktop, in normal flow) OR in the dock (phone) - same
					discipline as formula/see-play above.
				-->
				<div class="review-inflow-actions mt-4">
					{@render hearNameActions()}
				</div>
			{/if}
		</div>
	{:else}
		<p class="text-body mt-4" data-testid="recall-unrenderable">
			{t('recall.unrenderable.message')}
		</p>
		<div class="mt-6">
			<Button type="button" variant="ghost" onclick={handleUnrenderableSkip}
				>{t('recall.cta.skip')}</Button
			>
		</div>
	{/if}
{:else}
	<p class="text-body mt-4" data-testid="recall-unrenderable">{t('recall.unrenderable.message')}</p>
	<div class="mt-6">
		<Button type="button" variant="ghost" onclick={handleUnrenderableSkip}
			>{t('recall.cta.skip')}</Button
		>
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

	/*
	 * Phone-only review action dock (Sketch 014-A, issue #14 point 1): pinned
	 * above the existing bottom tab bar via the shared --tab-bar-clearance
	 * token (no second hardcoded bar height), below the tab bar's z-index 50
	 * and below BottomSheet's 100/101, above page content.
	 *
	 * Mirrors +layout.svelte's own documented cascade-layers hazard fix
	 * (CR-01, 23-REVIEW): Tailwind v4 emits its utilities inside
	 * `@layer utilities`, while a Svelte component's own scoped `<style>`
	 * output is unlayered, so an unlayered normal-priority rule always beats
	 * a layered one regardless of specificity/source order - a `sm:hidden`
	 * utility class could never actually hide this element. The fix is the
	 * same: an explicit, unlayered `@media (min-width: 640px)` rule turns the
	 * dock off, matching Tailwind's `sm:` breakpoint exactly, with no
	 * reliance on a utility class to do the hiding.
	 */
	.review-action-dock {
		display: block;
	}

	@media (min-width: 640px) {
		.review-action-dock {
			display: none;
		}
	}

	@media (max-width: 639.98px) {
		.review-action-dock {
			position: fixed;
			left: 0;
			right: 0;
			bottom: var(--tab-bar-clearance);
			z-index: 45;
			border-top: 2px solid var(--color-ink);
			background: var(--color-paper-bright);
			padding: var(--spacing-sm);
			padding-bottom: 0;
		}
	}

	.review-action-dock__row {
		display: flex;
	}

	.review-action-dock__row :global(.ps-button) {
		width: 100%;
	}

	/*
	 * Desktop-in-flow copy of the same dock-driven actions (formulaActions
	 * snippet), hidden on phone since the dock above renders the same content
	 * there - the snippet is rendered exactly once per placement, never
	 * forked, so the two placements can never diverge.
	 */
	@media (max-width: 639.98px) {
		.review-inflow-actions {
			display: none;
		}
	}

	/*
	 * Confidence dots (sketch 020-B, LOCKED): three 44px square, zero-radius
	 * serif glyph buttons in content flow, adapted from the sketch reference's
	 * .conf-dot / .conf-dot.picked pattern verbatim.
	 */
	.conf-dot-row {
		display: flex;
		gap: var(--spacing-sm);
	}

	.conf-dot {
		width: 44px;
		height: 44px;
		border: 1px solid var(--color-ink);
		border-radius: 0;
		font-family: var(--font-serif);
		font-size: 20px;
		background: var(--color-paper-bright);
		color: var(--color-ink);
	}

	.conf-dot.picked {
		background: var(--color-ink);
		color: var(--color-paper-bright);
	}
</style>
