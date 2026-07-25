import { Rating } from '$lib/srs/scheduler';
import type { CardRecord, Mode, FactKind } from '$lib/srs/deck';
import { factById } from '$lib/srs/facts';
import { seventhChordSymbols, voicingStageForChord, type VoicingStage } from './shellVoicing';
import { PROGRESSION_TEMPLATES, PROGRESSION_KEYS, buildProgression } from './progressions';

/**
 * The pure, DOM-free HYBRID queue composer (27-CONTEXT "Queue model =
 * HYBRID"): turns FSRS due-cards (the three carded families - name-it,
 * build-it, interval) plus synthetic, non-persisted voicing/progression
 * items into one interleaved practice queue. No Svelte, no DOM, no direct
 * Dexie/localStorage access - CardRecord/Mode/FactKind are type-only
 * imports from srs/deck and srs/facts (single-source, no re-implementation
 * of the real FSRS engine).
 *
 * Host call order (documented per the plan's action block):
 *   1. getDueCards() / getAllCards()          (host, Dexie read)
 *   2. selectReviewCards(due)                 (srs/rotation, weakness+cap)
 *   3. interleaveQueue(selected, rng)         (srs/rotation, FSRS ordering)
 *   4. cardsToQueueItems(orderedCards)        (this module)
 *   5. syntheticVoicingItems(symbolCards)     (this module)
 *   6. syntheticProgressionItems(count, rng)  (this module)
 *   7. composePracticeQueue(carded, synthetic, rng) (this module - FINAL
 *      cross-family weave only; carded items arrive already FSRS-ordered,
 *      this module never re-sorts them by anything but the variety weave,
 *      preserving PRAC-03).
 *
 * Grading/advance loop:
 *   8. advanceHybridQueue(queue, outcome) on every answer - mirrors
 *      srs/session.ts's advanceQueue Rating.Again re-enqueue contract for
 *      carded items; synthetic items are always consumed.
 *
 * Song filter (PRAC-04, WR-02): the carded half is restricted upstream of
 * this module, by the host's own applySongFilter over the raw due
 * CardRecord[] (before selectReviewCards/cardsToQueueItems even run); only
 * the synthetic voicing half is filtered inside this module, via
 * filterVoicingsBySong, before composePracticeQueue is called. This module
 * never reads the song filter preference itself (host-owned, per
 * 27-CONTEXT's "read the global pref once via readSongFilter()").
 */

/** The five practice-hub drill families (27-CONTEXT domain boundary). */
export type PracticeFamily = 'name-it' | 'build-it' | 'interval' | 'voicing' | 'progression';

/** The three FSRS-backed families this module maps from a CardRecord. */
export type CardedFamily = 'name-it' | 'build-it' | 'interval';

/** A queue item backed by a real FSRS CardRecord - the host commits its grade via srs/deck.recordGrade. */
export interface CardedQueueItem {
	id: string;
	family: CardedFamily;
	factId: string;
	mode: Mode;
	factKind: FactKind;
	/** The chord symbol, populated for chord-formula (name-it/build-it) items only. */
	symbol?: string;
	/** The interval short code, populated for interval-size (interval) items only. */
	short?: string;
	card: CardRecord;
}

/** A synthetic (non-persisted) voicing queue item, staged by the chord's own card maturity. */
export interface VoicingQueueItem {
	id: string;
	family: 'voicing';
	symbol: string;
	stage: VoicingStage;
}

/** A synthetic (non-persisted) progression queue item: one template+key pair. */
export interface ProgressionQueueItem {
	id: string;
	family: 'progression';
	templateId: string;
	key: string;
}

/** The discriminated union every composed queue slot is one of. */
export type HybridQueueItem = CardedQueueItem | VoicingQueueItem | ProgressionQueueItem;

/**
 * Maps a CardRecord to its practice family. 'build-it' for chord-formula in
 * 'formula-build' mode (Phase 12's construction mode, reused as a recall
 * mode); 'name-it' for chord-formula in any OTHER mode (formula, see-play,
 * hear-name); 'interval' for interval-size regardless of mode; null for
 * scale-degree/scale-formula - scales practice is Phase 28, so those facts
 * must never enter this queue (T-27-01-02).
 */
export function familyForCard(card: CardRecord): CardedFamily | null {
	if (card.factKind === 'chord-formula') {
		return card.mode === 'formula-build' ? 'build-it' : 'name-it';
	}
	if (card.factKind === 'interval-size') {
		return 'interval';
	}
	return null;
}

/** Stable queue-item id for a carded (FSRS) item: `fsrs:{factId}:{mode}`. */
function cardedItemId(factId: string, mode: Mode): string {
	return `fsrs:${factId}:${mode}`;
}

/**
 * Maps already-FSRS-ordered cards to CardedQueueItems, preserving input
 * order and dropping any card whose family is excluded (familyForCard
 * returns null). Derives `symbol`/`short` via factById(factId) - never by
 * string-slicing the factId - so a chord-formula card gets its `symbol` and
 * an interval-size card gets its `short`.
 */
export function cardsToQueueItems(orderedCards: CardRecord[]): CardedQueueItem[] {
	const items: CardedQueueItem[] = [];
	for (const card of orderedCards) {
		const family = familyForCard(card);
		if (family === null) continue;

		const fact = factById(card.factId);
		const symbol = fact !== undefined && fact.factKind === 'chord-formula' ? fact.symbol : undefined;
		const short = fact !== undefined && fact.factKind === 'interval-size' ? fact.short : undefined;

		items.push({
			id: cardedItemId(card.factId, card.mode),
			family,
			factId: card.factId,
			mode: card.mode,
			factKind: card.factKind,
			symbol,
			short,
			card
		});
	}
	return items;
}

/**
 * Builds one VoicingQueueItem per seventh-chord symbol (shellVoicing.ts's
 * seventhChordSymbols()), staged via voicingStageForChord over the
 * caller-supplied CardRecord[] for that symbol (`symbolCards.get(symbol) ??
 * []` when the symbol has no cards yet). Pure: never reads Dexie itself -
 * the caller owns fetching cards per symbol via srs/deck.ts.
 */
export function syntheticVoicingItems(symbolCards: Map<string, CardRecord[]>): VoicingQueueItem[] {
	return seventhChordSymbols().map((symbol) => ({
		id: `voicing:${symbol}`,
		family: 'voicing',
		symbol,
		stage: voicingStageForChord(symbolCards.get(symbol) ?? [])
	}));
}

/** Fisher-Yates shuffle driven by the injected rng, mirroring srs/rotation.ts's shuffle convention. */
function shuffleWithRng<T>(items: T[], rng: () => number): T[] {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

/**
 * Draws `count` distinct template+key pairs from PROGRESSION_TEMPLATES x
 * PROGRESSION_KEYS via the injected rng, keeping only pairs whose
 * buildProgression is non-empty (T-25-01-01's own guard against a malformed
 * symbol - never surfaced here, just skipped). Never re-derives chord
 * symbols itself; delegates entirely to progressions.ts's proven generator.
 */
export function syntheticProgressionItems(
	count: number,
	rng: () => number = Math.random
): ProgressionQueueItem[] {
	const allPairs: { templateId: string; key: string }[] = [];
	for (const template of PROGRESSION_TEMPLATES) {
		for (const key of PROGRESSION_KEYS) {
			allPairs.push({ templateId: template.id, key });
		}
	}

	const shuffled = shuffleWithRng(allPairs, rng);
	const items: ProgressionQueueItem[] = [];
	for (const pair of shuffled) {
		if (items.length >= count) break;
		if (buildProgression(pair.templateId, pair.key).length === 0) continue;
		items.push({
			id: `prog:${pair.templateId}:${pair.key}`,
			family: 'progression',
			templateId: pair.templateId,
			key: pair.key
		});
	}
	return items;
}

/**
 * Weaves `cardedItems` and `syntheticItems` into one interleaved queue: a
 * permutation of every input item (none dropped or duplicated), preserving
 * each family's own within-list relative order, and avoiding a single
 * family running 3-in-a-row when 2+ families are present. With a single
 * family present, returns that family's items unchanged (PRAC-05's
 * single-type-due gate: no artificial variety injection, no padding).
 *
 * Algorithm mirrors srs/rotation.ts's interleaveQueue greedy-with-relaxation
 * pattern, re-expressed locally over PracticeFamily instead of chord root:
 * group items into one FIFO queue per family (preserving arrival order),
 * shuffle the family iteration order once via the injected rng (tie-break
 * baseline, matching interleaveQueue's own shuffle-then-greedy convention),
 * then greedily emit one item at a time - among families whose next pick
 * would NOT extend the trailing same-family run to 3, prefer the family
 * with the MOST items remaining (spend the scarcest family's items last, so
 * a heavily family-skewed queue doesn't dead-end into an unavoidable
 * 3-in-a-row later). If no family satisfies that constraint (a genuinely
 * infeasible composition), relax to any family different from the trailing
 * one, or failing that (a single remaining family) whichever family still
 * has items - so the pass always terminates (T-27-01-01) rather than
 * looping forever.
 */
export function composePracticeQueue(
	cardedItems: HybridQueueItem[],
	syntheticItems: HybridQueueItem[],
	rng: () => number = Math.random
): HybridQueueItem[] {
	const all = [...cardedItems, ...syntheticItems];

	const byFamily = new Map<PracticeFamily, HybridQueueItem[]>();
	for (const item of all) {
		const list = byFamily.get(item.family);
		if (list) {
			list.push(item);
		} else {
			byFamily.set(item.family, [item]);
		}
	}

	if (byFamily.size <= 1) return all;

	const familyOrder = shuffleWithRng([...byFamily.keys()], rng);
	const output: HybridQueueItem[] = [];
	let trailingFamily: PracticeFamily | undefined;
	let trailingRun = 0;

	while (output.length < all.length) {
		let bestFamily: PracticeFamily | undefined;
		let bestScore = -1;
		for (const family of familyOrder) {
			const items = byFamily.get(family);
			if (items === undefined || items.length === 0) continue;
			const wouldExtendRunTo3 = family === trailingFamily && trailingRun >= 2;
			if (wouldExtendRunTo3) continue;
			const score = items.length;
			if (score > bestScore) {
				bestScore = score;
				bestFamily = family;
			}
		}

		if (bestFamily === undefined) {
			// Relax: no family satisfies the no-3-in-a-row constraint. Prefer a
			// family different from the trailing one; failing that (a single
			// remaining family), pick whichever family still has items so the
			// loop always terminates.
			bestFamily = familyOrder.find((family) => {
				const items = byFamily.get(family);
				return items !== undefined && items.length > 0 && family !== trailingFamily;
			});
			if (bestFamily === undefined) {
				bestFamily = familyOrder.find((family) => {
					const items = byFamily.get(family);
					return items !== undefined && items.length > 0;
				});
			}
		}

		// Unreachable while output.length < all.length: some family always has
		// remaining items, so bestFamily is always found above.
		/* istanbul ignore next */
		if (bestFamily === undefined) break;

		const items = byFamily.get(bestFamily);
		/* istanbul ignore next */
		if (items === undefined) break;
		const next = items.shift();
		/* istanbul ignore next */
		if (next === undefined) break;
		output.push(next);

		if (bestFamily === trailingFamily) {
			trailingRun += 1;
		} else {
			trailingFamily = bestFamily;
			trailingRun = 1;
		}
	}

	return output;
}

/** True for the three FSRS-backed families (a CardedQueueItem), false for synthetic ones. */
function isCardedItem(item: HybridQueueItem): item is CardedQueueItem {
	return item.family === 'name-it' || item.family === 'build-it' || item.family === 'interval';
}

/**
 * Removes the front item of `queue`. Mirrors srs/session.ts's advanceQueue
 * D-10 contract: re-enqueues the front item to the back only when it is a
 * CardedQueueItem AND `outcome === Rating.Again`; every synthetic item and
 * every non-Again outcome is consumed without re-enqueue. Never mutates the
 * input array - always returns a new one.
 */
export function advanceHybridQueue(queue: HybridQueueItem[], outcome: Rating): HybridQueueItem[] {
	if (queue.length === 0) return queue;
	const [current, ...rest] = queue;
	if (isCardedItem(current) && outcome === Rating.Again) {
		return [...rest, current];
	}
	return rest;
}

/** Keeps only voicing items whose symbol satisfies `predicate` (PRAC-04's synthetic-half restriction). */
export function filterVoicingsBySong(
	items: VoicingQueueItem[],
	predicate: (symbol: string) => boolean
): VoicingQueueItem[] {
	return items.filter((item) => predicate(item.symbol));
}

/** The set of practice families present in `queue`. */
export function familiesInQueue(queue: HybridQueueItem[]): Set<PracticeFamily> {
	return new Set(queue.map((item) => item.family));
}

/** True once the queue has no items left to grade/consume. Mirrors srs/session.ts's isSessionComplete. */
export function isHybridSessionComplete(queue: HybridQueueItem[]): boolean {
	return queue.length === 0;
}

/** The "N LEFT" remaining-items count. Mirrors srs/session.ts's sessionRemaining. */
export function hybridSessionRemaining(queue: HybridQueueItem[]): number {
	return queue.length;
}
