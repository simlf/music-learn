<script lang="ts">
	import { onMount } from 'svelte';
	import {
		composePracticeQueue,
		cardsToQueueItems,
		advanceHybridQueue,
		isHybridSessionComplete,
		type HybridQueueItem
	} from '$lib/practice/practiceQueue';
	import { getDueCards, getAllCards, introduceNewCards, recordGrade, type CardRecord } from '$lib/srs/deck';
	import { selectReviewCards, interleaveQueue } from '$lib/srs/rotation';
	import { remainingIntroBudget, consumeIntroBudget } from '$lib/srs/introBudget';
	import { Rating } from '$lib/srs/scheduler';
	import { factById } from '$lib/srs/facts';
	import { readSongFilter } from '$lib/practice/songFilterPref';
	import { buildProvenanceIndex, symbolHasProvenance } from '$lib/practice/songProvenance';
	import { recordPracticeAnswer } from '$lib/practice/answerTelemetry';
	import { t } from '$lib/i18n/locale.svelte';
	import Button from '$lib/components/Button.svelte';
	import PracticeChordDrill from '$lib/components/PracticeChordDrill.svelte';
	import PracticeIntervalDrill from '$lib/components/PracticeIntervalDrill.svelte';
	import BuildSession from '$lib/components/BuildSession.svelte';

	/**
	 * Phase 27 Plan 04: the thin `/practice` host. Owns ONLY reactive session
	 * glue (load/compose, page-state, family cue, grade-commit, advance) and
	 * delegates every question surface to PracticeChordDrill/
	 * PracticeIntervalDrill/BuildSession (27-01/27-03). Never a mode-picker
	 * grid (PRAC-01) - a single "Start practice" action, populated by the
	 * hybrid FSRS+synthetic queue composed via practiceQueue.ts.
	 *
	 * Synthetic voicing/progression items are added by Plan 05; this plan's
	 * queue is carded-only (name-it/build-it/interval), composed via
	 * composePracticeQueue with an empty synthetic half (see the seam below).
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

			// Plan 05 seam: synthetic voicing/progression items are composed
			// and passed in here; this plan's queue is carded-only.
			const syntheticItems: HybridQueueItem[] = [];
			const composed = composePracticeQueue(cardedItems, syntheticItems, Math.random);

			if (composed.length === 0) {
				// Every due card belonged to an excluded family (scale
				// practice, Phase 28) - nothing practiceable is due right now.
				pageState = 'empty-none-due';
				return;
			}

			queue = composed;
			length = composed.length;
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
			progression: t('practice.cue.progression')
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

	/** Grades + advances a carded (name-it/interval) item: FSRS commit via deck.recordGrade (PRAC-03/REG-01/T-27-04-01). */
	async function completeCarded(correct: boolean): Promise<void> {
		const item = currentItem;
		if (item === undefined || item.family === 'voicing' || item.family === 'progression') {
			return;
		}
		const rating = correct ? Rating.Good : Rating.Again;
		const durationMs = Date.now() - questionShownAt;
		await recordGrade(item.card, rating);
		recordPracticeAnswer({
			item: item.family === 'interval' ? (item.short ?? '') : (item.symbol ?? ''),
			kind: item.family === 'interval' ? 'interval' : 'chord',
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
			{Math.min(asked + 1, length)} {t('drills.score.of')} {length} ·
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
			{/if}
			<!-- Plan 05 seam: 'voicing'/'progression' branches render ShellVoicingDrill/ProgressionDrill here. -->
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
</main>

<style>
	.stamp {
		animation: stamp-in 240ms ease-out;
	}
</style>
