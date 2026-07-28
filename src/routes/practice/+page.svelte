<script lang="ts">
	import { onMount } from 'svelte';
	import {
		composePracticeQueue,
		cardsToQueueItems,
		advanceHybridQueue,
		isHybridSessionComplete,
		sliceRound,
		RETRY_MIN_GAP,
		RETRY_MAX_GAP,
		syntheticVoicingItems,
		syntheticProgressionItems,
		syntheticInversionItems,
		filterVoicingsBySong,
		backlogFactCount,
		DUE_BACKLOG_GATE_FACTS,
		isLowMasterySession,
		type HybridQueueItem,
		type VoicingQueueItem,
		type InversionQueueItem,
		type CardedQueueItem
	} from '$lib/practice/practiceQueue';
	import {
		DAILY_TARGET,
		answeredToday,
		isYesterday,
		markDoneToday,
		previousSummary,
		recordDailyAnswer,
		remainingDailyTarget,
		type DaySummary
	} from '$lib/practice/dailySession';
	import { localDateString } from '$lib/api/progress';
	import { localStreak, recordPracticeDay } from '$lib/practice/practiceDays';
	import { pickStreakLine } from '$lib/copy/streak';
	import {
		getDueCards,
		getAllCards,
		introduceNewCards,
		recordGrade,
		type CardRecord,
		type Mode
	} from '$lib/srs/deck';
	import { selectReviewCards, interleaveQueue } from '$lib/srs/rotation';
	import { remainingIntroBudget, consumeIntroBudget } from '$lib/srs/introBudget';
	import { Rating, newCard } from '$lib/srs/scheduler';
	import { factById } from '$lib/srs/facts';
	import { consumeDrillSeeds, consumeLessonSeeds, setDrillSeeds } from '$lib/practice/drillSeeds';
	import { readSongFilter } from '$lib/practice/songFilterPref';
	import { buildProvenanceIndex, symbolHasProvenance } from '$lib/practice/songProvenance';
	import { recordPracticeAnswer } from '$lib/practice/answerTelemetry';
	import { t } from '$lib/i18n/locale.svelte';
	import Button from '$lib/components/Button.svelte';
	import PracticeChordDrill from '$lib/components/PracticeChordDrill.svelte';
	import PracticeIntervalDrill from '$lib/components/PracticeIntervalDrill.svelte';
	import BuildSession from '$lib/components/BuildSession.svelte';
	import ShellVoicingDrill from '$lib/components/ShellVoicingDrill.svelte';
	import ProgressionDrill from '$lib/components/ProgressionDrill.svelte';
	import InversionDrill from '$lib/components/InversionDrill.svelte';
	import ScaleKeyboardDrill from '$lib/components/ScaleKeyboardDrill.svelte';
	import { MAJOR_SCALE_ROOTS, majorScaleNotes } from '$lib/theory/scale';

	/**
	 * Phase 27 Plan 04+05: the thin `/practice` host. Owns ONLY reactive
	 * session glue (load/compose, page-state, family cue, grade-commit,
	 * advance) and delegates every question surface to PracticeChordDrill/
	 * PracticeIntervalDrill/BuildSession (the three FSRS-carded families,
	 * 27-01/27-03) and ShellVoicingDrill/ProgressionDrill (the two synthetic,
	 * non-persisted families, woven in by Plan 05 via their 27-02 embed
	 * seams). Never a mode-picker grid (PRAC-01) - a single "Start practice"
	 * action, populated by the hybrid FSRS+synthetic queue composed via
	 * practiceQueue.ts.
	 */

	type PageState =
		| 'loading'
		| 'pre-start'
		| 'empty-no-deck'
		| 'empty-none-due'
		| 'empty-filtered'
		| 'reviewing'
		| 'complete'
		| 'error';

	let pageState = $state<PageState>('loading');
	let queue = $state<HybridQueueItem[]>([]);

	/**
	 * B1, the bounded daily session.
	 *
	 * `roundTarget` is the round's hard ceiling in QUESTIONS: whatever the day
	 * still owes against DAILY_TARGET. It is a question budget, not an item
	 * count, which is what stops the round growing - a re-asked miss spends a
	 * slot rather than extending the round, so the round can never run longer
	 * than the number the user agreed to on the pre-start card.
	 *
	 * `roundSize` is how many distinct items the round drew (at most
	 * `roundTarget`), and `waiting` is what it deliberately left behind - shown
	 * on the pre-start card rather than hidden.
	 *
	 * `extraRound` marks a round opted into PAST the day's target: bounded at
	 * DAILY_TARGET of its own rather than uncapped. `answeredEarlier` is what
	 * the day had already banked before this round, so a resumed day says
	 * "5 of 12 done" instead of pretending the day starts over.
	 */
	let roundTarget = $state(0);
	let roundSize = $state(0);
	let waiting = $state(0);
	let extraRound = $state(false);
	let answeredEarlier = $state(0);

	/**
	 * B2, the closable end card. `dayDone` is what the card is allowed to
	 * claim: it is set from the PERSISTED day ledger at round end (target met,
	 * or the due queue genuinely ran dry), never inferred from the in-memory
	 * register, so the card never says "done for today" on a device whose
	 * ledger did not record it. `bankedToday` is the ledger's own count, used
	 * by the degraded line. `endStreakLine` is optional by design: the streak is
	 * owned elsewhere (the device's practice-day set) and a zero renders nothing
	 * at all, exactly as StreakBadge self-hides rather than showing a
	 * discouraging count.
	 */
	let dayDone = $state(false);
	let bankedToday = $state(0);
	let endStreakLine = $state<string | null>(null);

	/**
	 * B5, the re-entry cue. The Practice hub showed nothing at all about the
	 * last session; the only history lived two taps deep in Progress, which is
	 * the wrong place for it - the moment that matters is the moment the user is
	 * deciding whether to start. `lastSession` is the most recent PREVIOUS
	 * practice day's ledger, and `returningItems` is the part of it that is
	 * actually in the round about to be played, so the line makes a promise the
	 * session then keeps.
	 */
	let lastSession = $state<DaySummary | undefined>(undefined);
	let returningItems = $state<string[]>([]);

	/** At most this many of yesterday's misses are named, so the cue stays one line. */
	const MAX_RETURNING_NAMED = 3;

	/**
	 * B1: the host opts into practiceQueue's DELAYED in-session retry. A tail
	 * re-enqueue parks a missed item behind every remaining question, which a
	 * question-capped round may never reach; a 2-to-4 question gap re-asks it
	 * while the correction still means something, and cannot grow the round.
	 */
	const RETRY_OPTIONS = { retryMinGap: RETRY_MIN_GAP, retryMaxGap: RETRY_MAX_GAP };

	// Session-glue state (mirrors drills' score-register model, D- reused verbatim).
	let score = $state({ correct: 0, streak: 0 });
	let asked = $state(0);
	let bestStreak = $state(0);
	let missed = $state<string[]>([]);
	/**
	 * Bumped on every advance (mirrors RecallSession's cardEpoch, T-27-04
	 * regression precedent): the `{#key}` block below keys on
	 * `${currentItem.id}|${cardEpoch}`, not `currentItem.id` alone, so an
	 * Again-graded item re-enqueued as the SOLE queue item (same id, same
	 * object) still force-remounts a fresh drill component instead of
	 * leaving a stale, already-answered instance on screen forever.
	 */
	let cardEpoch = $state(0);

	/** MD-02 (mirrored from RecallSession): how many real due cards the song filter is hiding. */
	let filteredHiddenCount = $state(0);

	/**
	 * Phase 28 Plan 05 (LEARN-02): the additive "Scale practice" disclosure.
	 * Its own tonic/expanded state never touches `pageState`, the hybrid
	 * queue, or the FSRS grade/advance handlers above - it renders a
	 * completely separate, collapsed-by-default surface reached from the
	 * Practice hub (REG-01: Phase 27's interleaved session stays unchanged).
	 */
	let scaleExpanded = $state(false);
	let scaleTonic = $state('C');
	const scaleNotes = $derived(majorScaleNotes(scaleTonic));

	/**
	 * Quick task 260720-v9u: /practice reads the shared global "From my songs"
	 * preference once at init - no toggle renders on this page (PRAC-04, the
	 * control lives on /songs).
	 */
	const songFilterOn = readSongFilter();
	const provenanceIndex = buildProvenanceIndex();

	/**
	 * Byte-faithful to RecallSession's applySongFilter (SONG-02/PRAC-04): keeps
	 * only chord-formula cards with provenance when the filter is ON and the
	 * index is non-empty; otherwise passes every due card through unchanged.
	 */
	function applySongFilter(due: CardRecord[]): CardRecord[] {
		if (!songFilterOn || provenanceIndex.size === 0) return due;
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
	 * Daily new-card intro budget + due-backlog gate. The gate's threshold and
	 * its "how much backlog is there" measure both live in practiceQueue.ts (the
	 * pure module) rather than inline here, since both are pure card arithmetic
	 * and this host is meant to be thin. See DUE_BACKLOG_GATE_FACTS there for why
	 * it counts FACTS rather than cards, and why permanently-unanswerable
	 * scale-degree cards deliberately do not gate.
	 */

	/**
	 * The small, session-scaled count of synthetic progression items woven
	 * into one round when at least one chord-formula card is due (Plan 05).
	 * Kept low deliberately: progressions are the heaviest single item in the
	 * mix (a 4-bar earn-the-symbol grid), so a handful is "enough variety",
	 * not a flood that crowds out the carded half.
	 */
	const SYNTHETIC_PROGRESSION_COUNT = 2;

	/**
	 * The small, session-scaled count of synthetic inversion items woven into
	 * one round when at least one chord-formula card is due (Phase 35, INV-03).
	 * Inversions are one carded-symbol-per-item (lighter than a progression's
	 * 4-bar grid), so a small fixed count keeps variety without crowding the
	 * carded half - mirrors SYNTHETIC_PROGRESSION_COUNT's own rationale.
	 */
	const SYNTHETIC_INVERSION_COUNT = 2;

	/**
	 * REG-01 seed handoff: consumes both one-shot channels and builds
	 * prioritized name-it CardedQueueItems, mirroring the old /drills page's
	 * seed-consumption semantics (30-CONTEXT "Preserve the drill-seed
	 * handoff"). Both channels are drained via consumeDrillSeeds/
	 * consumeLessonSeeds regardless of which wins, so neither leaks into a
	 * later session; a lesson handoff takes precedence over a Progress
	 * weak-list handoff when both are somehow present. A symbol that does not
	 * resolve to a supported chord-formula fact (factById) is skipped
	 * (T-30-02-01: a tampered/malformed seed can never inject an unrenderable
	 * question).
	 */
	async function buildSeededItems(): Promise<CardedQueueItem[]> {
		const lessonSeedSymbols = consumeLessonSeeds();
		const drillSeedSymbols = consumeDrillSeeds();
		const seedSymbols = lessonSeedSymbols.length > 0 ? lessonSeedSymbols : drillSeedSymbols;
		if (seedSymbols.length === 0) return [];

		const existingCards = await getAllCards();
		const cardsByKey = new Map<string, CardRecord>();
		for (const card of existingCards) {
			cardsByKey.set(`${card.factId}:${card.mode}`, card);
		}

		const mode: Mode = 'formula';
		const now = new Date();
		const items: CardedQueueItem[] = [];
		for (const symbol of seedSymbols) {
			const factId = `chord-formula:${symbol}`;
			const fact = factById(factId);
			if (fact === undefined || fact.factKind !== 'chord-formula') continue;

			const card: CardRecord =
				cardsByKey.get(`${factId}:${mode}`) ??
				({
					...newCard(now),
					factId,
					factKind: 'chord-formula',
					mode,
					lastRating: null,
					masteryDayCount: 0
				} satisfies CardRecord);

			items.push({
				id: `fsrs:${factId}:${mode}`,
				family: 'name-it',
				factId,
				mode,
				factKind: 'chord-formula',
				symbol,
				short: undefined,
				card
			});
		}
		return items;
	}

	async function load(): Promise<void> {
		pageState = 'loading';
		try {
			const seededItems = await buildSeededItems();

			const preDue = await getDueCards();
			let dueBase: CardRecord[];
			if (backlogFactCount(preDue) > DUE_BACKLOG_GATE_FACTS) {
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
			if (due.length === 0 && seededItems.length === 0) {
				// MD-02: distinguish "the filter hid everything" from "truly
				// nothing due" - dueBase is only non-empty here when
				// applySongFilter actually restricted the set.
				if (dueBase.length > 0) {
					filteredHiddenCount = dueBase.length;
					pageState = 'empty-filtered';
					return;
				}
				const all = await getAllCards();
				pageState = all.length === 0 ? 'empty-no-deck' : 'empty-none-due';
				return;
			}

			const selectedCards = selectReviewCards(due);
			const orderedCards = interleaveQueue(selectedCards, Math.random);
			const cardedItems = cardsToQueueItems(orderedCards);

			/**
			 * PRAC-05 single-type-due gate: voicing/progression synthetics
			 * are gated on the FSRS due signal, not injected unconditionally.
			 * The due chord-formula symbols are read from `selectedCards`
			 * (the actual carded half selected above) - an interval-only due
			 * set yields an empty set here, so both synthetic halves stay
			 * empty and the session surfaces intervals only.
			 */
			const dueChordSymbols = new Set<string>();
			for (const card of selectedCards) {
				if (card.factKind !== 'chord-formula') continue;
				const fact = factById(card.factId);
				if (fact !== undefined && fact.factKind === 'chord-formula') {
					dueChordSymbols.add(fact.symbol);
				}
			}

			let voicingItems: VoicingQueueItem[] = [];
			let progressionItems: HybridQueueItem[] = [];
			let inversionItems: InversionQueueItem[] = [];
			if (dueChordSymbols.size > 0) {
				// Voicing synthetics: one item per DUE seventh chord only - a
				// chord card that isn't due never surfaces its voicing item,
				// even if it is a seventh chord.
				const allCards = await getAllCards();
				const cardsBySymbol = new Map<string, CardRecord[]>();
				for (const card of allCards) {
					if (card.factKind !== 'chord-formula') continue;
					const fact = factById(card.factId);
					if (fact === undefined || fact.factKind !== 'chord-formula') continue;
					if (!dueChordSymbols.has(fact.symbol)) continue;
					const list = cardsBySymbol.get(fact.symbol);
					if (list) {
						list.push(card);
					} else {
						cardsBySymbol.set(fact.symbol, [card]);
					}
				}
				voicingItems = syntheticVoicingItems(cardsBySymbol).filter((item) =>
					dueChordSymbols.has(item.symbol)
				);
				if (songFilterOn && provenanceIndex.size > 0) {
					voicingItems = filterVoicingsBySong(voicingItems, (symbol) =>
						symbolHasProvenance(symbol, provenanceIndex)
					);
				}

				// Progression synthetics: a small, session-scaled count, only
				// when at least one chord card is due (progressions are
				// chord-naming practice). Progressions have no single chord
				// symbol of their own to test against song provenance
				// (key/template-based, not single-song-chord based), so the
				// chosen filter policy is to omit them entirely when the
				// song filter is ON rather than guess at a partial
				// restriction (PRAC-04).
				if (!(songFilterOn && provenanceIndex.size > 0)) {
					progressionItems = syntheticProgressionItems(SYNTHETIC_PROGRESSION_COUNT, Math.random);
				}

				// Inversion synthetics (Phase 35, INV-03): drawn from the same
				// due chord-formula symbols as voicing, gated identically on the
				// due-chord signal (PRAC-05's single-type-due gate). Unlike
				// progressions, inversions DO carry a single chord symbol of
				// their own, so they are song-filterable exactly like voicing
				// rather than omitted entirely under the filter.
				let inversionCandidates = [...dueChordSymbols];
				if (songFilterOn && provenanceIndex.size > 0) {
					inversionCandidates = inversionCandidates.filter((symbol) =>
						symbolHasProvenance(symbol, provenanceIndex)
					);
				}
				inversionItems = syntheticInversionItems(
					inversionCandidates,
					SYNTHETIC_INVERSION_COUNT,
					Math.random
				);
			}

			const syntheticItems: HybridQueueItem[] = [
				...voicingItems,
				...progressionItems,
				...inversionItems
			];
			/**
			 * QUEUE-01 (36-CONTEXT): a session is cold/low-mastery when the
			 * carded half actually entering the weave is overwhelmingly
			 * New/Learning, with mature (State.Review) cards a minority -
			 * isLowMasterySession reads cardedItems (not selectedCards) so
			 * scale-family cards already dropped by cardsToQueueItems never
			 * skew the signal. When set and a simpler family (name-it/
			 * build-it/interval/voicing) is present, the composer keeps a
			 * scaffold-heavy progression/inversion item out of the very
			 * first slot only; seeded items are prepended after composition
			 * and always lead regardless. The warm path (majority-mature or
			 * empty carded half) is unchanged (REG-01).
			 */
			const lowMastery = isLowMasterySession(cardedItems.map((item) => item.card));
			const composed = composePracticeQueue(cardedItems, syntheticItems, Math.random, {
				lowMastery
			});

			if (composed.length === 0 && seededItems.length === 0) {
				// Every due card belonged to an excluded family (scale
				// practice, Phase 28) - nothing practiceable is due right now.
				pageState = 'empty-none-due';
				return;
			}

			// Seeded items lead the queue; a due card that is ALSO seeded is
			// deduped from the composed half by id, so it is drilled once, at
			// the front, not twice.
			const seedIds = new Set(seededItems.map((item) => item.id));
			const dedupedComposed = composed.filter((item) => !seedIds.has(item.id));
			const finalQueue: HybridQueueItem[] = [...seededItems, ...dedupedComposed];

			/**
			 * B1: bound the composed queue to what the DAY still owes, not to
			 * the whole due set. sliceRound preserves the composer's order
			 * exactly (its variety weave, its cold-session first-pick guard,
			 * and the seeded items leading the queue all survive the cut), and
			 * reports the remainder so the pre-start card can show it. A day
			 * whose target is already spent slices to nothing and lands on the
			 * pre-start card's done branch, where extra practice is an explicit
			 * opt-in rather than an unbounded default.
			 */
			answeredEarlier = answeredToday();
			roundTarget = extraRound ? DAILY_TARGET : remainingDailyTarget();
			const sliced = sliceRound(finalQueue, roundTarget);

			queue = sliced.round;
			roundSize = sliced.round.length;
			waiting = sliced.waiting;

			/**
			 * B5: yesterday's line, and specifically which of yesterday's misses
			 * the user is about to meet again. Intersecting with the ROUND (not
			 * the whole due set) keeps the claim true: an item held back in
			 * `waiting` is not coming back in this session.
			 */
			lastSession = previousSummary();
			const roundLabels = new Set(sliced.round.map(missedLabelFor));
			returningItems =
				lastSession === undefined
					? []
					: lastSession.missed
							.filter((label) => roundLabels.has(label))
							.slice(0, MAX_RETURNING_NAMED);

			asked = 0;
			score = { correct: 0, streak: 0 };
			bestStreak = 0;
			missed = [];
			cardEpoch = 0;
			pageState = 'pre-start';
		} catch {
			pageState = 'error';
		}
	}

	onMount(() => {
		void load();
	});

	const currentItem = $derived(queue[0]);

	/**
	 * Questions left in THIS round. Previously this was the live queue's
	 * length, because the round had no length of its own and a missed item was
	 * re-enqueued to the tail, so the queue could grow while the user worked
	 * and a frozen "N of N" fraction read as a stuck session.
	 *
	 * With the round bounded, this is the smaller of the two real limits: the
	 * unresolved items still in the queue, and the question budget the round
	 * has left. Both only ever fall (the queue never grows, since a delayed
	 * retry re-inserts rather than appends an extra slot; the budget is spent
	 * one question at a time), so the register only ever falls too, and it
	 * reaches zero exactly when the round ends. Items the round did not reach
	 * stay FSRS-due and come back (they are counted in `waiting`), so stopping
	 * at the target loses nothing.
	 */
	const remaining = $derived(Math.max(0, Math.min(queue.length, roundTarget - asked)));

	/**
	 * Per-item telemetry clock (mirrors RecallSession's questionShownAt): a
	 * plain, non-reactive variable - drives no rendering, only the
	 * fire-and-forget durationMs computation at grade time. Set when the
	 * user taps Start and again after every advance.
	 */
	let questionShownAt = Date.now();

	function startSession(): void {
		questionShownAt = Date.now();
		pageState = 'reviewing';
	}

	/**
	 * The explicit opt-in continuation (B1), reached from the pre-start card on
	 * an already-met day and from the end card whenever work is left.
	 * Recomposes from live FSRS state and drops straight into a fresh round.
	 *
	 * Whether that round is "extra" is decided from the ledger, not latched: a
	 * day that still owes questions continues on its own budget, and only a
	 * fully spent day starts a fresh bounded DAILY_TARGET. So extra practice is
	 * always offered and always bounded, and never implied to be owed.
	 */
	async function keepGoing(): Promise<void> {
		extraRound = remainingDailyTarget() === 0;
		await load();
		if (pageState === 'pre-start' && roundSize > 0) {
			questionShownAt = Date.now();
			pageState = 'reviewing';
		}
	}

	/**
	 * B5's two optional pre-start lines. The score line is suppressed when the
	 * last session scored nothing: this is a re-entry cue, not a report card,
	 * and a zero carries no cue value while still stinging (same reasoning as
	 * StreakBadge self-hiding at zero). "Yesterday" is only used when the last
	 * session literally was yesterday; otherwise the wording drops the claim
	 * rather than lying about the calendar.
	 */
	const lastSessionLine = $derived.by((): string | null => {
		const previous = lastSession;
		if (previous === undefined || previous.correct === 0) return null;
		const key = isYesterday(previous.date) ? 'practice.pre.yesterday' : 'practice.pre.lastRun';
		return t(key)
			.replace('{N}', String(previous.correct))
			.replace('{B}', String(previous.bestStreak));
	});

	const comingBackLine = $derived.by((): string | null => {
		if (returningItems.length === 0) return null;
		return t('practice.pre.comingBack').replace('{ITEMS}', returningItems.join(', '));
	});

	/**
	 * The pre-start card's register (B1). Three honest shapes:
	 * - the whole due set fits the round: the pre-existing "N CARDS DUE TODAY"
	 *   line, unchanged, because it is then exactly true;
	 * - the round is a slice: "12 TODAY · 27 WAITING", so the number is
	 *   finishable without the remainder being hidden;
	 * - the day is partly spent: "5 OF 12 DONE TODAY · 7 TO GO", so a resumed
	 *   day picks up instead of pretending to start over.
	 * A day whose target is already met gets the done line instead.
	 */
	const preStartRegister = $derived.by((): string => {
		const waitingLine = t('practice.pre.waiting').replace('{N}', String(waiting));
		if (roundSize === 0) {
			const done = t('practice.pre.doneToday');
			return waiting > 0 ? `${done} · ${waitingLine}` : done;
		}
		// The resume line only makes sense while a round is still spending the
		// day's own budget; an extra round past the target would otherwise read
		// "12 OF 12 DONE TODAY · 12 TO GO".
		if (answeredEarlier > 0 && !extraRound) {
			const resume = t('practice.pre.resume')
				.replace('{DONE}', String(answeredEarlier))
				.replace('{TARGET}', String(DAILY_TARGET));
			return `${resume} · ${t('practice.pre.toGo').replace('{N}', String(roundSize))}`;
		}
		if (waiting > 0) {
			return `${t('practice.pre.today').replace('{N}', String(roundSize))} · ${waitingLine}`;
		}
		return roundSize === 1
			? t('practice.pre.dueSingular')
			: t('practice.pre.duePlural').replace('{N}', String(roundSize));
	});

	/**
	 * Family-cue chip label (27-UI-SPEC "Family Cue Between Questions") -
	 * always populated, never accent-colored. `$derived.by` (not a plain
	 * const) so a live locale flip re-renders it, mirroring RecallSession's
	 * MODE_LABELS convention.
	 */
	const CUE_LABELS = $derived.by(
		(): Record<HybridQueueItem['family'], string> => ({
			'name-it': t('practice.cue.nameIt'),
			'play-it': t('practice.cue.playIt'),
			'ear-it': t('practice.cue.hearIt'),
			'build-it': t('practice.cue.buildIt'),
			voicing: t('practice.cue.voicing'),
			interval: t('practice.cue.interval'),
			progression: t('practice.cue.progression'),
			inversion: t('practice.cue.inversion')
		})
	);

	/** The item's own display label for the end-card's missed-item chips - every family carries one. */
	function missedLabelFor(item: HybridQueueItem): string {
		if (item.family === 'interval') return item.short ?? '';
		if (item.family === 'progression') return `${item.templateId} ${item.key}`;
		return item.symbol ?? '';
	}

	function finishItem(item: HybridQueueItem, correct: boolean): void {
		const label = missedLabelFor(item);
		if (correct) {
			score = { correct: score.correct + 1, streak: score.streak + 1 };
			bestStreak = Math.max(bestStreak, score.streak);
		} else {
			score = { correct: score.correct, streak: 0 };
			if (!missed.includes(label)) missed = [...missed, label];
		}
		asked += 1;
		/**
		 * B1: every graded answer lands in the day's persisted ledger too. The
		 * in-memory register above is destroyed the moment the user navigates
		 * away, which is exactly what made the reward feel gated behind
		 * finishing everything; the ledger is what lets a half-finished day
		 * resume honestly and what the end card reads to say "done for today".
		 * FSRS is untouched by it (dailySession never reads or writes a card).
		 */
		recordDailyAnswer({ correct, label: correct ? undefined : label });
		/**
		 * T13 item 5: the day's STREAK entry, recorded here for every family.
		 *
		 * The practice-day set used to be written only inside api/progress.ts's
		 * recordAnswer, which every carded answer reaches via answerTelemetry -
		 * but the three synthetic families (voicing, progression, inversion)
		 * deliberately post no server telemetry, because /answers accuracy means
		 * chord-IDENTIFICATION accuracy and a voicing attempt measures a different
		 * skill on the same symbol. So a round made only of synthetic items was
		 * real practice that the local streak never saw. Rare (synthetics are
		 * gated on at least one due chord card) but a genuine hole in the streak.
		 *
		 * `finishItem` is the one choke point every graded answer of every family
		 * passes through, which is exactly why the day belongs here rather than at
		 * each drill's call site. recordPracticeDay is idempotent per day, so the
		 * carded families now record it twice a day at most - once here, once via
		 * telemetry - and the second call is one localStorage read. The streak
		 * itself is still owned by practiceDays.ts; this only reports the day.
		 */
		recordPracticeDay(localDateString());
	}

	/**
	 * B1: the round ends when the queue is resolved, or when the day's question
	 * budget runs out, whichever comes first. Both conditions matter. The
	 * budget is the bound: it caps a 39-item due set at a finishable round and
	 * guarantees the round cannot grow past what the pre-start card promised.
	 * The empty queue is what lets a small due set (4 items on a quiet day)
	 * finish without burning the rest of the budget, AND what keeps a missed
	 * item's delayed retry inside the round instead of ending on the miss.
	 */
	function maybeFinishRound(): void {
		if (!isHybridSessionComplete(queue) && asked < roundTarget) return;

		/**
		 * B2: what is left over is everything the round never drew PLUS
		 * anything it drew but did not resolve (a late miss whose delayed retry
		 * fell outside the budget). Both are still FSRS-due, so both belong in
		 * the number the card shows.
		 */
		waiting = waiting + queue.length;
		bankedToday = answeredToday();
		dayDone = bankedToday >= DAILY_TARGET || waiting === 0;
		if (dayDone) markDoneToday();
		refreshEndStreak();
		pageState = 'complete';
	}

	/**
	 * B2's streak line. This host does not own the streak and must not invent
	 * one from its own day ledger, so it reads the practice-day set that owns it
	 * (practiceDays.localStreak) rather than deriving a second number: local,
	 * synchronous, no token and no tailnet, which is what makes the line show up
	 * on the phone where practice actually happens. A zero streak renders
	 * nothing at all, exactly as StreakBadge self-hides rather than showing a
	 * discouraging count, and the copy comes from the existing non-scolding
	 * rotation pool rather than new strings.
	 */
	function refreshEndStreak(): void {
		const streak = localStreak(localDateString());
		endStreakLine =
			streak >= 1 ? pickStreakLine('activePracticedToday').replace('{N}', String(streak)) : null;
	}

	/**
	 * In-flight guard for completeCarded (CR-02, adversarial-review fix):
	 * mirrors RecallSession.svelte's own `grading` flag (its "In-flight guard
	 * for handleGrade" precedent) - a double-tap on Next before the first
	 * recordGrade await resolves must never double-commit the FSRS grade,
	 * double-count the score register (finishItem), or double-advance the
	 * queue.
	 */
	let grading = $state(false);

	/**
	 * The families completeCarded actually grades. WR-01: an ALLOWLIST, not a
	 * denylist of the synthetic families - build-it is also a CardedFamily and
	 * commits its own FSRS grade internally (see completeBuild's comment), so a
	 * denylist here would silently double-commit if routing ever misdirected a
	 * build-it item into this handler. T13 adds play-it and ear-it: both are
	 * ordinary carded chord items whose grade this host commits, exactly as it
	 * already did when the same cards were mislabeled 'name-it'.
	 *
	 * A type predicate rather than an array `.includes` so the narrowing to
	 * CardedQueueItem (and therefore `item.card`) survives the check.
	 */
	function isHostGraded(item: HybridQueueItem): item is CardedQueueItem {
		return (
			item.family === 'name-it' ||
			item.family === 'play-it' ||
			item.family === 'ear-it' ||
			item.family === 'interval'
		);
	}

	/** Grades + advances a carded (name-it/play-it/ear-it/interval) item: FSRS commit via deck.recordGrade (PRAC-03/REG-01/T-27-04-01). */
	async function completeCarded(correct: boolean): Promise<void> {
		if (grading) return;
		const item = currentItem;
		if (item === undefined || !isHostGraded(item)) {
			return;
		}
		grading = true;
		try {
			const rating = correct ? Rating.Good : Rating.Again;
			const durationMs = Date.now() - questionShownAt;
			// CR-01: capture the CardRecord recordGrade actually persisted and
			// re-enqueue THAT (not the stale pre-grade snapshot still held by
			// `item`/`queue[0]`), so a re-enqueued Again item is graded from its
			// current FSRS state on its next pass - mirrors RecallSession's own
			// cardsByKey-refresh-after-grade pattern.
			const updatedCard = await recordGrade(item.card, rating);
			recordPracticeAnswer({
				item: item.family === 'interval' ? (item.short ?? '') : (item.symbol ?? ''),
				kind: item.family === 'interval' ? 'interval' : 'chord',
				correct,
				durationMs
			});
			finishItem(item, correct);
			const updatedItem = { ...item, card: updatedCard };
			queue = advanceHybridQueue([updatedItem, ...queue.slice(1)], rating, RETRY_OPTIONS);
			questionShownAt = Date.now();
			cardEpoch += 1;
			maybeFinishRound();
		} finally {
			grading = false;
		}
	}

	/**
	 * Grades + advances an embedded build-it item. BuildSession's own
	 * onComplete(rating) contract already committed the FSRS grade internally
	 * via its unchanged recordConstructionOutcome (getCard/recordGrade using
	 * the SAME (factId, 'formula-build') identity as this queue item's own
	 * card) - mirroring RecallSession's handleModeCNext precedent exactly.
	 * Calling recordGrade a second time here would double-apply the FSRS
	 * scheduler transition for one review (Rule 1 bug), so this handler only
	 * advances the local queue and records telemetry.
	 */
	function completeBuild(rating: Rating): void {
		const item = currentItem;
		if (item === undefined || item.family !== 'build-it') return;
		const correct = rating !== Rating.Again;
		const durationMs = Date.now() - questionShownAt;
		recordPracticeAnswer({
			item: item.symbol ?? '',
			kind: 'chord',
			correct,
			durationMs
		});
		finishItem(item, correct);
		queue = advanceHybridQueue(queue, rating, RETRY_OPTIONS);
		questionShownAt = Date.now();
		cardEpoch += 1;
		maybeFinishRound();
	}

	/**
	 * Grades + advances a synthetic (voicing/progression/inversion) item.
	 * These items carry no FSRS card at all (HYBRID model, non-persisted per
	 * 27-CONTEXT's "no persisted-schema change") - recordGrade must NEVER be
	 * called for them (T-27-05-01, extended to inversions by T-35-06-02).
	 * onComplete only ever fires after a correct play/earn in ShellVoicingDrill,
	 * ProgressionDrill, and InversionDrill alike (a wrong answer retries and
	 * never gates), so "completed" carries no information about whether the
	 * user got it right. This handler used to finish every synthetic item as
	 * CORRECT for exactly that reason, which made three of the six families
	 * free points: the end card's accuracy was dishonest upward by
	 * construction, and the more the round leaned on voicing/progression/
	 * inversion the more meaningless the number became.
	 *
	 * B3: each of those three components now reports `firstTry` - whether the
	 * item was earned with no wrong attempt at all - which is the same standard
	 * the carded families are graded by (PracticeChordDrill's `correct` is its
	 * first pick). The pedagogy is untouched: a wrong play still just retries,
	 * still never gates, and still commits no FSRS grade (these items carry no
	 * card at all, T-27-05-01/T-35-06-02). Only the round's own accuracy,
	 * best-run and missed-item register now tell the truth about them.
	 *
	 * Server telemetry stays deliberately silent for synthetic completions.
	 * /answers accuracy is chord-IDENTIFICATION accuracy, which /progress reads
	 * to pick weak items; a voicing or inversion attempt measures a different
	 * skill on the same symbol, so posting it there would quietly change what
	 * that number means (and REG-01 keeps the existing telemetry contract).
	 */
	function completeSynthetic(firstTry: boolean): void {
		const item = currentItem;
		if (
			item === undefined ||
			(item.family !== 'voicing' && item.family !== 'progression' && item.family !== 'inversion')
		)
			return;
		finishItem(item, firstTry);
		queue = advanceHybridQueue(queue, Rating.Good, RETRY_OPTIONS);
		questionShownAt = Date.now();
		cardEpoch += 1;
		maybeFinishRound();
	}

	/**
	 * The end card's own summary lines (B2). Three shapes, and only the first
	 * two ever claim the day is finished:
	 * - the day's target is met and work remains: say so, then offer the rest;
	 * - the day's target is met and nothing remains: say the deck is clear;
	 * - the ledger does not back a "done" claim (storage full or blocked):
	 *   report the round and claim nothing about the day.
	 */
	const endDoneLine = $derived.by((): string => {
		if (dayDone) return t('practice.end.doneToday');
		return t('practice.end.partial')
			.replace('{DONE}', String(bankedToday > 0 ? bankedToday : asked))
			.replace('{N}', String(waiting));
	});

	/**
	 * B4: which missed labels can actually seed a drill. `buildSeededItems`
	 * resolves a seed through factById('chord-formula:{symbol}') and skips
	 * anything that does not resolve, so an interval short ("m3") or a
	 * progression label ("major-ii-V-I C") would seed a round with nothing in
	 * it. Those chips stay inert text; only real chord symbols become actions,
	 * and the CTA counts only what it can genuinely deliver.
	 */
	const seedableMisses = $derived(
		missed.filter((label) => factById(`chord-formula:${label}`) !== undefined)
	);

	/**
	 * Re-enters practice with `symbols` at the front of the queue, through the
	 * SAME one-shot localStorage handoff Lookup's "Drill it" and the Progress
	 * hub's "Drill all N" already use (setDrillSeeds, drained by load() via
	 * buildSeededItems). No new mechanism, and no second code path that could
	 * drift from the one the rest of the app relies on.
	 *
	 * The one difference from those two callers is the navigation: they are on
	 * another route, so they goto('/practice') and the fresh mount consumes the
	 * seeds. Here we are already on /practice, where a same-route goto would not
	 * remount the page and the seeds would sit unconsumed until the next visit.
	 * So this re-runs the load/start path locally, which drains the very same
	 * channel.
	 */
	async function fixMisses(symbols: string[]): Promise<void> {
		if (symbols.length === 0) return;
		setDrillSeeds(symbols);
		await keepGoing();
	}

	const endRemainderLine = $derived.by((): string | null => {
		if (!dayDone) return null;
		if (waiting === 0) return t('practice.end.allClear');
		return waiting === 1
			? t('practice.end.moreReadySingular')
			: t('practice.end.moreReadyPlural').replace('{N}', String(waiting));
	});
</script>

<main class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8">
	<h1 class="text-heading mt-2 font-bold">{t('practice.page.title')}</h1>

	{#if pageState === 'loading'}
		<p class="text-label mt-6 font-mono uppercase" data-testid="practice-loading">
			{t('recall.state.loading')}
		</p>
	{:else if pageState === 'empty-no-deck'}
		<div class="mt-6" data-testid="practice-empty-no-deck">
			<p class="text-heading font-bold">{t('practice.empty.no-deck.heading')}</p>
			<p class="text-body mt-4">{t('practice.empty.no-deck.body')}</p>
		</div>
	{:else if pageState === 'empty-none-due'}
		<div class="mt-6" data-testid="practice-empty-none-due">
			<p class="text-heading font-bold">{t('recall.empty.none-due.heading')}</p>
			<p class="text-body mt-4">{t('recall.empty.none-due.body')}</p>
		</div>
	{:else if pageState === 'empty-filtered'}
		<div class="mt-6" data-testid="practice-empty-filtered">
			<p class="text-heading font-bold">{t('practice.empty.filtered.heading')}</p>
			<p class="text-body mt-4">
				{filteredHiddenCount === 1
					? t('practice.empty.filtered.body.singular')
					: t('practice.empty.filtered.body.plural').replace('{N}', String(filteredHiddenCount))}
			</p>
		</div>
	{:else if pageState === 'error'}
		<div class="mt-6" data-testid="practice-error">
			<p class="text-body">{t('practice.error.body')}</p>
			<div class="mt-6">
				<Button type="button" variant="ghost" onclick={load}>{t('recall.cta.try-again')}</Button>
			</div>
		</div>
	{:else if pageState === 'pre-start'}
		<div class="border-ink bg-paper-bright mt-6 border-2 p-6" data-testid="practice-pre-start">
			<p class="text-label font-mono uppercase" data-testid="practice-due-register">
				{preStartRegister}
			</p>

			{#if lastSessionLine || comingBackLine}
				<div class="mt-4" data-testid="practice-last-session">
					{#if lastSessionLine}
						<p class="text-body text-muted">{lastSessionLine}</p>
					{/if}
					{#if comingBackLine}
						<p class="text-body mt-1">{comingBackLine}</p>
					{/if}
				</div>
			{/if}

			<div class="mt-6">
				{#if roundSize > 0}
					<Button type="button" variant="primary" onclick={startSession}>
						{t('practice.cta.start')}
					</Button>
				{:else}
					<Button type="button" variant="primary" onclick={() => void keepGoing()}>
						{t('practice.cta.keepGoing')}
					</Button>
				{/if}
			</div>
		</div>
	{:else if pageState === 'reviewing' && currentItem}
		<p class="text-label mt-6 font-mono uppercase" aria-live="polite" data-testid="practice-register">
			{remaining} {t('practice.register.left')} ·
			{score.correct} {t('drills.score.right')} · {score.streak}
			{t('drills.score.streak')}
		</p>
		<p
			class="text-label text-muted mb-2 mt-4 font-mono uppercase"
			data-testid="question-source-tag"
		>
			{CUE_LABELS[currentItem.family]}
		</p>

		{#key `${currentItem.id}|${cardEpoch}`}
			{#if currentItem.family === 'name-it'}
				<PracticeChordDrill
					symbol={currentItem.symbol ?? ''}
					mode="formula"
					onComplete={(correct) => completeCarded(correct)}
				/>
			{:else if currentItem.family === 'play-it'}
				<!--
					T13: the three chord modes ask three different questions now. The
					mode is passed as a LITERAL per branch rather than forwarded from
					`currentItem.mode` (which is the deck's 4-value Mode, including
					'formula-build'), so the routing is total by construction and no
					narrowing cast is needed.
				-->
				<PracticeChordDrill
					symbol={currentItem.symbol ?? ''}
					mode="see-play"
					onComplete={(correct) => completeCarded(correct)}
				/>
			{:else if currentItem.family === 'ear-it'}
				<PracticeChordDrill
					symbol={currentItem.symbol ?? ''}
					mode="hear-name"
					onComplete={(correct) => completeCarded(correct)}
				/>
			{:else if currentItem.family === 'interval'}
				<PracticeIntervalDrill short={currentItem.short ?? ''} onComplete={(correct) => completeCarded(correct)} />
			{:else if currentItem.family === 'build-it'}
				<BuildSession
					embedFact={{ kind: 'chord', symbol: currentItem.symbol ?? '' }}
					onComplete={(rating) => completeBuild(rating)}
				/>
			{:else if currentItem.family === 'voicing'}
				<ShellVoicingDrill
					embedSymbol={currentItem.symbol}
					onComplete={(firstTry) => completeSynthetic(firstTry)}
				/>
			{:else if currentItem.family === 'progression'}
				<ProgressionDrill
					embedTemplateId={currentItem.templateId}
					embedKey={currentItem.key}
					onComplete={(firstTry) => completeSynthetic(firstTry)}
				/>
			{:else if currentItem.family === 'inversion'}
				<InversionDrill
					symbol={currentItem.symbol}
					inversionIndex={currentItem.inversionIndex}
					onComplete={(firstTry) => completeSynthetic(firstTry)}
				/>
			{/if}
		{/key}
	{:else if pageState === 'complete'}
		<div
			class="border-ink bg-paper-bright stamp mt-8 border-2 px-2 py-6 sm:px-6"
			data-testid="session-end-card"
		>
			<p class="text-label font-mono uppercase">{t('drills.end.roundComplete')}</p>
			<p class="text-display mt-2 font-mono font-bold">
				{score.correct} / {asked}
			</p>
			<p class="text-label font-mono uppercase" data-testid="practice-end-card-streak">
				{t('drills.end.bestRunPrefix')} {bestStreak} {t('drills.end.bestRunSuffix')}
			</p>

			<p class="text-body mt-4 font-bold" data-testid="practice-end-card-done">{endDoneLine}</p>
			{#if endRemainderLine}
				<p class="text-body text-muted mt-1" data-testid="practice-end-card-remainder">
					{endRemainderLine}
				</p>
			{/if}
			{#if endStreakLine}
				<p
					class="text-label mt-2 font-mono uppercase"
					data-testid="practice-end-card-day-streak"
				>
					{endStreakLine}
				</p>
			{/if}

			{#if missed.length > 0}
				<p class="text-body mt-6">{t('drills.end.worthAnotherLook')}</p>
				<div class="mt-2 flex flex-wrap gap-2" data-testid="practice-end-card-misses">
					{#each missed as item (item)}
						{#if seedableMisses.includes(item)}
							<button
								type="button"
								class="missed-chip font-serif font-bold"
								aria-label={t('practice.end.fixChipAria').replace('{SYMBOL}', item)}
								onclick={() => void fixMisses([item])}
							>
								{item}
							</button>
						{:else}
							<span class="font-serif font-bold">{item}</span>
						{/if}
					{/each}
				</div>
			{:else}
				<p class="text-body mt-6">{t('drills.end.cleanSheet')}</p>
			{/if}

			{#if seedableMisses.length > 0 || waiting > 0}
				<div class="mt-6 flex flex-wrap gap-2">
					{#if seedableMisses.length > 0}
						<Button
							type="button"
							variant="primary"
							onclick={() => void fixMisses(seedableMisses)}
						>
							{seedableMisses.length === 1
								? t('practice.end.fixThis')
								: t('practice.end.fixThese').replace('{N}', String(seedableMisses.length))}
						</Button>
					{/if}
					{#if waiting > 0}
						<Button
							type="button"
							variant={seedableMisses.length > 0 ? 'ghost' : 'primary'}
							onclick={() => void keepGoing()}
						>
							{t('practice.cta.keepGoing')}
						</Button>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	<div class="mt-8">
		<Button
			type="button"
			variant="ghost"
			aria-expanded={scaleExpanded}
			onclick={() => (scaleExpanded = !scaleExpanded)}
		>
			{scaleExpanded ? t('learn.scale-practice.close') : t('learn.scale-practice.toggle')}
		</Button>

		{#if scaleExpanded}
			<div class="border-ink bg-paper-bright mt-4 border-2 px-4 py-6" data-testid="scale-practice-card">
				<p class="text-heading font-bold">{t('learn.scale-practice.heading')}</p>
				<p class="text-body mt-2">{t('learn.scale-practice.body')}</p>

				<div class="mt-6 flex flex-wrap gap-2" data-testid="scale-practice-tonic-row">
					{#each MAJOR_SCALE_ROOTS as root (root)}
						<Button
							type="button"
							variant={root === scaleTonic ? 'primary' : 'ghost'}
							aria-label={`${root} ${t('scales.tonic.qualitySuffix')}`}
							aria-pressed={root === scaleTonic}
							onclick={() => (scaleTonic = root)}
						>
							{root}
						</Button>
					{/each}
				</div>

				<div class="mt-6">
					<ScaleKeyboardDrill notes={scaleNotes} tonic={scaleTonic} />
				</div>
			</div>
		{/if}
	</div>
</main>

<style>
	.stamp {
		animation: stamp-in 240ms ease-out;
	}

	/**
	 * B4: a missed chip is a control, so it has to look like one. Keeps the
	 * chip's serif chord-glyph treatment (chord symbols are typographically
	 * immune) and adds only the tappable affordance: a dotted underline in
	 * vermilion, the app's existing "act on this" accent.
	 */
	.missed-chip {
		color: var(--color-ink);
		text-decoration: underline dotted var(--color-vermilion);
		text-underline-offset: 0.2em;
		cursor: pointer;
		/* Phone-first: a comfortable tap target without changing the chip's look. */
		padding: 0.25rem 0.125rem;
	}

	.missed-chip:hover,
	.missed-chip:focus-visible {
		color: var(--color-vermilion);
	}
</style>
