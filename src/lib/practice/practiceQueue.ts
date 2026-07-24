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
 * Song filter (PRAC-04) restricts BOTH halves via filterCardedBySong /
 * filterVoicingsBySong before composePracticeQueue is called - this module
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
