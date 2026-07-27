<script lang="ts">
	import { onMount } from 'svelte';
	import {
		composePracticeQueue,
		cardsToQueueItems,
		advanceHybridQueue,
		isHybridSessionComplete,
		hybridSessionRemaining,
		syntheticVoicingItems,
		syntheticProgressionItems,
		syntheticInversionItems,
		filterVoicingsBySong,
		isLowMasterySession,
		type HybridQueueItem,
		type VoicingQueueItem,
		type InversionQueueItem,
		type CardedQueueItem
	} from '$lib/practice/practiceQueue';
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
	import { consumeDrillSeeds, consumeLessonSeeds } from '$lib/practice/drillSeeds';
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
	let length = $state(0);

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

	/** Daily new-card intro budget + due-backlog gate (mirrors RecallSession's load() skeleton verbatim). */
	const DUE_BACKLOG_GATE = 20;

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

			queue = finalQueue;
			length = finalQueue.length;
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
	 * B1 fix: the in-session register was previously `Math.min(asked+1, length)
	 * of length`, where `length` is the queue's INITIAL size and `asked` only
	 * ever increments. A missed (Again-graded) carded item is re-enqueued to
	 * the back of `queue` (advanceHybridQueue), so the live queue can hold
	 * MORE unresolved items than `length - asked` implies - the fraction
	 * saturates at "N of N" while re-enqueued misses still remain, reading as
	 * a stuck/frozen session. Drive the register off the LIVE queue instead
	 * (mirrors RecallSession's own `remaining = sessionRemaining(queue)`
	 * convention) so a re-enqueued miss is honestly reflected as still-
	 * remaining work, not silently absorbed into a frozen total.
	 */
	const remaining = $derived(hybridSessionRemaining(queue));

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
	 * Family-cue chip label (27-UI-SPEC "Family Cue Between Questions") -
	 * always populated, never accent-colored. `$derived.by` (not a plain
	 * const) so a live locale flip re-renders it, mirroring RecallSession's
	 * MODE_LABELS convention.
	 */
	const CUE_LABELS = $derived.by(
		(): Record<HybridQueueItem['family'], string> => ({
			'name-it': t('practice.cue.nameIt'),
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
		if (correct) {
			score = { correct: score.correct + 1, streak: score.streak + 1 };
			bestStreak = Math.max(bestStreak, score.streak);
		} else {
			score = { correct: score.correct, streak: 0 };
			missed = [...missed, missedLabelFor(item)];
		}
		asked += 1;
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

	/** Grades + advances a carded (name-it/interval) item: FSRS commit via deck.recordGrade (PRAC-03/REG-01/T-27-04-01). */
	async function completeCarded(correct: boolean): Promise<void> {
		if (grading) return;
		const item = currentItem;
		// WR-01: allowlist the two families completeCarded actually grades
		// (name-it/interval), rather than denylisting the two synthetic
		// families - build-it is also a CardedFamily and commits its own FSRS
		// grade internally (see completeBuild's comment), so a denylist here
		// would silently double-commit if routing ever misdirected a
		// build-it item into this handler.
		if (item === undefined || (item.family !== 'name-it' && item.family !== 'interval')) {
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
			queue = advanceHybridQueue([updatedItem, ...queue.slice(1)], rating);
			questionShownAt = Date.now();
			cardEpoch += 1;
			if (isHybridSessionComplete(queue)) pageState = 'complete';
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
		queue = advanceHybridQueue(queue, rating);
		questionShownAt = Date.now();
		cardEpoch += 1;
		if (isHybridSessionComplete(queue)) pageState = 'complete';
	}

	/**
	 * Grades + advances a synthetic (voicing/progression/inversion) item.
	 * These items carry no FSRS card at all (HYBRID model, non-persisted per
	 * 27-CONTEXT's "no persisted-schema change") - recordGrade must NEVER be
	 * called for them (T-27-05-01, extended to inversions by T-35-06-02).
	 * onComplete only ever fires after a correct play/earn in ShellVoicingDrill,
	 * ProgressionDrill, and InversionDrill alike (they never gate to completion
	 * on a wrong answer), so the round counter always finishes the item as
	 * correct. The host only advances the local queue/score register here - no
	 * telemetry event is recorded for synthetic completions (the embedded
	 * components own their own internal behavior; adding a host-level
	 * recordPracticeAnswer call here would be new surface not required by any
	 * family's own contract).
	 */
	function completeSynthetic(): void {
		const item = currentItem;
		if (
			item === undefined ||
			(item.family !== 'voicing' && item.family !== 'progression' && item.family !== 'inversion')
		)
			return;
		finishItem(item, true);
		queue = advanceHybridQueue(queue, Rating.Good);
		questionShownAt = Date.now();
		cardEpoch += 1;
		if (isHybridSessionComplete(queue)) pageState = 'complete';
	}

	/**
	 * The end-card's "Run it again" CTA: re-runs load() and, when the freshly
	 * composed queue is non-empty, drops straight into a fresh round rather
	 * than stopping at the pre-start confirmation card again - matching
	 * drills' own "Run it again" behavior. A now-empty deck/due-set lands on
	 * the matching empty tier instead (load() already sets that state).
	 */
	async function runAgain(): Promise<void> {
		await load();
		if (pageState === 'pre-start') {
			questionShownAt = Date.now();
			pageState = 'reviewing';
		}
	}
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
				{length === 1
					? t('practice.pre.dueSingular')
					: t('practice.pre.duePlural').replace('{N}', String(length))}
			</p>
			<div class="mt-6">
				<Button type="button" variant="primary" onclick={startSession}>
					{t('practice.cta.start')}
				</Button>
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
				<PracticeChordDrill symbol={currentItem.symbol ?? ''} onComplete={(correct) => completeCarded(correct)} />
			{:else if currentItem.family === 'interval'}
				<PracticeIntervalDrill short={currentItem.short ?? ''} onComplete={(correct) => completeCarded(correct)} />
			{:else if currentItem.family === 'build-it'}
				<BuildSession
					embedFact={{ kind: 'chord', symbol: currentItem.symbol ?? '' }}
					onComplete={(rating) => completeBuild(rating)}
				/>
			{:else if currentItem.family === 'voicing'}
				<ShellVoicingDrill embedSymbol={currentItem.symbol} onComplete={() => completeSynthetic()} />
			{:else if currentItem.family === 'progression'}
				<ProgressionDrill
					embedTemplateId={currentItem.templateId}
					embedKey={currentItem.key}
					onComplete={() => completeSynthetic()}
				/>
			{:else if currentItem.family === 'inversion'}
				<InversionDrill
					symbol={currentItem.symbol}
					inversionIndex={currentItem.inversionIndex}
					onComplete={() => completeSynthetic()}
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

			{#if missed.length > 0}
				<p class="text-body mt-6">{t('drills.end.worthAnotherLook')}</p>
				<div class="mt-2 flex flex-wrap gap-2" data-testid="practice-end-card-misses">
					{#each missed as item (item)}
						<span class="font-serif font-bold">{item}</span>
					{/each}
				</div>
			{:else}
				<p class="text-body mt-6">{t('drills.end.cleanSheet')}</p>
			{/if}

			<div class="mt-6">
				<Button type="button" variant="primary" onclick={() => void runAgain()}>
					{t('drills.end.runAgain')}
				</Button>
			</div>
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
</style>
