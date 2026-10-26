import { describe, expect, it } from 'vitest';
import { Rating, State } from '$lib/srs/scheduler';
import type { CardRecord, Mode } from '$lib/srs/deck';
import {
	familyForCard,
	backlogFactCount,
	DUE_BACKLOG_GATE_FACTS,
	cardsToQueueItems,
	syntheticVoicingItems,
	sampleVoicingItems,
	SYNTHETIC_VOICING_COUNT,
	syntheticProgressionItems,
	syntheticInversionItems,
	syntheticChordScaleItems,
	composePracticeQueue,
	SCAFFOLD_HEAVY,
	isLowMasterySession,
	advanceHybridQueue,
	sliceRound,
	planRound,
	appliedSlotsFor,
	familyCapFor,
	progressionTemplateTaught,
	RETRY_MIN_GAP,
	RETRY_MAX_GAP,
	filterVoicingsBySong,
	filterInversionsBySong,
	filterChordScaleBySong,
	familiesInQueue,
	hybridSessionRemaining,
	isHybridSessionComplete,
	type CardedQueueItem,
	type VoicingQueueItem,
	type ProgressionQueueItem,
	type InversionQueueItem,
	type ChordScaleQueueItem,
	type HybridQueueItem
} from './practiceQueue';
import { seventhChordSymbols } from './shellVoicing';
import { MAX_NEW_CARDS_PER_DAY } from '$lib/srs/introBudget';

/**
 * TDD suite for the pure hybrid-queue composer (HYBRID queue model, 27-01
 * PLAN). Task 1 covers types + card-to-item mapping + synthetic-item
 * builders (familyForCard, cardsToQueueItems, syntheticVoicingItems,
 * syntheticProgressionItems). Task 2 (composePracticeQueue,
 * advanceHybridQueue, filterVoicingsBySong,
 * familiesInQueue, hybridSessionRemaining, isHybridSessionComplete) is
 * appended below once Task 1 is green.
 */

/** A deterministic seeded PRNG (mulberry32), mirroring srs/rotation.test.ts's convention. */
function seededRng(seed: number): () => number {
	let state = seed;
	return () => {
		state |= 0;
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const now0 = new Date('2026-07-25T00:00:00.000Z');

/** Minimal CardRecord builder, mirroring rotation.test.ts's own makeCardRecord shape. */
function makeCardRecord(overrides: Partial<CardRecord> = {}): CardRecord {
	return {
		factId: 'chord-formula:Cm7',
		factKind: 'chord-formula',
		mode: 'formula',
		due: now0,
		stability: 1,
		difficulty: 1,
		elapsed_days: 0,
		scheduled_days: 0,
		learning_steps: 0,
		reps: 0,
		lapses: 0,
		state: State.New,
		last_review: undefined,
		lastRating: null,
		masteryDayCount: 0,
		...overrides
	};
}

describe('familyForCard', () => {
	it("returns 'build-it' for chord-formula + formula-build mode", () => {
		const card = makeCardRecord({ factKind: 'chord-formula', mode: 'formula-build' });
		expect(familyForCard(card)).toBe('build-it');
	});

	it("returns 'name-it' for chord-formula + 'formula' mode", () => {
		const card = makeCardRecord({ factKind: 'chord-formula', mode: 'formula' });
		expect(familyForCard(card)).toBe('name-it');
	});

	/**
	 * T13 (mode collapse): see-play and hear-name used to map to 'name-it' too,
	 * so all three modes rendered the SAME 4-choice identification question.
	 * One family per mode is what makes the three questions distinguishable at
	 * all; these tests pin the mapping so a future refactor cannot quietly fold
	 * them back together.
	 */
	it("returns 'play-it' for chord-formula + 'see-play' mode", () => {
		const card = makeCardRecord({ factKind: 'chord-formula', mode: 'see-play' });
		expect(familyForCard(card)).toBe('play-it');
	});

	it("returns 'ear-it' for chord-formula + 'hear-name' mode", () => {
		const card = makeCardRecord({ factKind: 'chord-formula', mode: 'hear-name' });
		expect(familyForCard(card)).toBe('ear-it');
	});

	it('maps the four chord-formula modes onto four DISTINCT families (no two modes collapse)', () => {
		const modes = ['formula', 'see-play', 'hear-name', 'formula-build'] as const;
		const families = modes.map((mode) =>
			familyForCard(makeCardRecord({ factKind: 'chord-formula', mode }))
		);
		expect(new Set(families).size).toBe(modes.length);
	});

	it("returns 'interval' for interval-size regardless of mode", () => {
		const card = makeCardRecord({
			factId: 'interval-size:M3',
			factKind: 'interval-size',
			mode: 'formula'
		});
		expect(familyForCard(card)).toBe('interval');
	});

	// Was `returns null for scale-degree`. That assertion encoded the defect: all
	// 84 scale-degree facts were introduced by the deck and then silently dropped
	// here, so 44% of the catalog was unreachable from /practice and gradable
	// only inside RecallSession. They now have their own family.
	it('returns degree for scale-degree', () => {
		const card = makeCardRecord({
			factId: 'scale-degree:C:1',
			factKind: 'scale-degree',
			mode: 'formula'
		});
		expect(familyForCard(card)).toBe('degree');
	});

	it('returns null for scale-formula (scales practice is Phase 28)', () => {
		const card = makeCardRecord({
			factId: 'scale-formula:C',
			factKind: 'scale-formula',
			mode: 'formula-build'
		});
		expect(familyForCard(card)).toBeNull();
	});
});

describe('cardsToQueueItems', () => {
	// scale-degree used to be the excluded kind here. It is now askable, so
	// scale-formula is the remaining null-family kind: those facts are
	// deliberately absent from CATALOG, so no such card is ever created, and the
	// exclusion is defence in depth rather than a live path.
	it('preserves input order and drops excluded (null-family) cards', () => {
		const cards: CardRecord[] = [
			makeCardRecord({ factId: 'chord-formula:Cm7', factKind: 'chord-formula', mode: 'formula' }),
			makeCardRecord({ factId: 'scale-formula:C', factKind: 'scale-formula', mode: 'formula-build' }),
			makeCardRecord({ factId: 'interval-size:M3', factKind: 'interval-size', mode: 'formula' })
		];
		const items = cardsToQueueItems(cards);
		expect(items.map((item) => item.factId)).toEqual(['chord-formula:Cm7', 'interval-size:M3']);
	});

	it('keeps scale-degree cards now that a surface can ask them', () => {
		const cards: CardRecord[] = [
			makeCardRecord({ factId: 'scale-degree:C:5', factKind: 'scale-degree', mode: 'formula' })
		];
		expect(cardsToQueueItems(cards).map((item) => item.factId)).toEqual(['scale-degree:C:5']);
	});

	it('populates symbol from factById for a chord-formula card', () => {
		const cards: CardRecord[] = [
			makeCardRecord({ factId: 'chord-formula:Cm7', factKind: 'chord-formula', mode: 'formula' })
		];
		const [item] = cardsToQueueItems(cards);
		expect(item.family).toBe('name-it');
		expect(item.symbol).toBe('Cm7');
		expect(item.short).toBeUndefined();
		expect(item.card).toBe(cards[0]);
		expect(item.id).toBe('fsrs:chord-formula:Cm7:formula');
	});

	it('populates short from factById for an interval-size card', () => {
		const cards: CardRecord[] = [
			makeCardRecord({ factId: 'interval-size:M3', factKind: 'interval-size', mode: 'formula' })
		];
		const [item] = cardsToQueueItems(cards);
		expect(item.family).toBe('interval');
		expect(item.short).toBe('M3');
		expect(item.symbol).toBeUndefined();
		expect(item.id).toBe('fsrs:interval-size:M3:formula');
	});

	it("classifies formula-build mode as 'build-it' with its symbol populated", () => {
		const cards: CardRecord[] = [
			makeCardRecord({ factId: 'chord-formula:Dm7', factKind: 'chord-formula', mode: 'formula-build' })
		];
		const [item] = cardsToQueueItems(cards);
		expect(item.family).toBe('build-it');
		expect(item.symbol).toBe('Dm7');
	});
});

describe('syntheticVoicingItems', () => {
	it('returns one item per seventh-chord symbol', () => {
		const items = syntheticVoicingItems(new Map());
		const symbols = seventhChordSymbols();
		expect(items).toHaveLength(symbols.length);
		expect(items.map((item) => item.symbol)).toEqual(symbols);
		expect(items.every((item) => item.family === 'voicing')).toBe(true);
	});

	it("stages 'meet' when the passed-in card map has no entry for a symbol (empty)", () => {
		const items = syntheticVoicingItems(new Map());
		expect(items.every((item) => item.stage === 'meet')).toBe(true);
	});

	it("stages 'drill' for a symbol whose cards include a State.Review card", () => {
		const [firstSymbol] = seventhChordSymbols();
		const cardMap = new Map<string, CardRecord[]>([
			[firstSymbol, [makeCardRecord({ factId: `chord-formula:${firstSymbol}`, state: State.Review })]]
		]);
		const items = syntheticVoicingItems(cardMap);
		const item = items.find((entry) => entry.symbol === firstSymbol);
		expect(item?.stage).toBe('drill');
	});
});

describe('sampleVoicingItems', () => {
	const voicingItem = (symbol: string): VoicingQueueItem => ({
		id: `voicing:${symbol}`,
		family: 'voicing',
		symbol,
		stage: 'drill'
	});
	const pool = ['Cmaj7', 'Dm7', 'E7', 'Fm7b5', 'Gdim7', 'Amaj7'].map(voicingItem);

	it('draws at most `count` items, each one an input item, none duplicated', () => {
		const drawn = sampleVoicingItems(pool, 2, seededRng(1));
		expect(drawn).toHaveLength(2);
		const ids = new Set(drawn.map((item) => item.id));
		expect(ids.size).toBe(2);
		const poolIds = new Set(pool.map((item) => item.id));
		expect(drawn.every((item) => poolIds.has(item.id))).toBe(true);
	});

	it('returns every item (a permutation) when count is at or above the pool size', () => {
		const drawn = sampleVoicingItems(pool, pool.length + 3, seededRng(1));
		expect(new Set(drawn.map((item) => item.id))).toEqual(new Set(pool.map((item) => item.id)));
	});

	it('returns [] for a zero or negative count', () => {
		expect(sampleVoicingItems(pool, 0, seededRng(1))).toEqual([]);
		expect(sampleVoicingItems(pool, -3, seededRng(1))).toEqual([]);
	});

	it('is deterministic for a given seeded rng and never mutates its input', () => {
		const before = [...pool];
		const a = sampleVoicingItems(pool, 3, seededRng(42));
		const b = sampleVoicingItems(pool, 3, seededRng(42));
		expect(a).toEqual(b);
		expect(pool).toEqual(before);
	});

	it('caps at the same small per-round scale as the sibling synthetic families', () => {
		// The host draws progression/inversion/chord-scale at 2 per round; the
		// voicing cap deliberately matches. Pinned so a future change is a
		// conscious one (mirrors the DUE_BACKLOG_GATE_FACTS relationship test).
		expect(SYNTHETIC_VOICING_COUNT).toBe(2);
	});
});

/**
 * Regression suite for the stuck-progression defect (scout task
 * ml-srs-diagnose-stuck-chord-progression): a realistic mid-tier-3 due set
 * holds 10-40 due seventh-chord symbols, and the pre-fix host wove ONE
 * voicing item per due seventh symbol into the round. Voicing was then the
 * single biggest family, composePracticeQueue's most-items-remaining
 * preference handed it two of every three slots, and because a voicing
 * completion commits no FSRS grade, a DAILY_TARGET-bounded round spent most
 * of its 12 questions on items the scheduler never heard about: the due
 * backlog never cleared, the intro gate stayed shut, and the same chords
 * came back day after day.
 *
 * The fixture mirrors that state: 20 due seventh symbols, each fact with the
 * 2 due cards selectReviewCards would pass through, spread across the four
 * chord modes the way a mature deck's due set actually lands (so the carded
 * half is several mid-sized families, not one big one), plus the host's
 * three capped synthetic families.
 */
describe('voicing cap preserves a bounded round scheduler throughput (regression)', () => {
	const CARDED_ROUND_FAMILIES = new Set(['name-it', 'play-it', 'ear-it', 'build-it']);
	const ROUND_TARGET = 12;

	function midTier3Fixture(rng: () => number): {
		cardedItems: CardedQueueItem[];
		voicingPool: VoicingQueueItem[];
		otherSynthetics: HybridQueueItem[];
	} {
		const dueSymbols = seventhChordSymbols().slice(0, 20);
		const cardsBySymbol = new Map<string, CardRecord[]>();
		const dueCards: CardRecord[] = [];
		dueSymbols.forEach((symbol, index) => {
			const modes: Mode[] =
				index % 2 === 0 ? ['formula', 'see-play'] : ['formula-build', 'hear-name'];
			const cards = modes.map((mode) =>
				makeCardRecord({
					factId: `chord-formula:${symbol}`,
					factKind: 'chord-formula',
					mode,
					state: State.Review,
					masteryDayCount: 1
				})
			);
			cardsBySymbol.set(symbol, cards);
			dueCards.push(...cards);
		});

		const cardedItems = cardsToQueueItems(dueCards);
		const voicingPool = syntheticVoicingItems(cardsBySymbol).filter((item) =>
			cardsBySymbol.has(item.symbol)
		);
		const otherSynthetics: HybridQueueItem[] = [
			...syntheticProgressionItems(2, rng),
			...syntheticInversionItems(dueSymbols, 2, rng),
			...syntheticChordScaleItems(dueSymbols, 2, rng)
		];
		return { cardedItems, voicingPool, otherSynthetics };
	}

	function familyCounts(round: HybridQueueItem[]): { carded: number; voicing: number } {
		let carded = 0;
		let voicing = 0;
		for (const item of round) {
			if (CARDED_ROUND_FAMILIES.has(item.family)) carded += 1;
			if (item.family === 'voicing') voicing += 1;
		}
		return { carded, voicing };
	}

	it('a capped draw keeps the majority of a 12-question round on FSRS-graded items', () => {
		const rng = seededRng(7);
		const { cardedItems, voicingPool, otherSynthetics } = midTier3Fixture(rng);
		const voicingItems = sampleVoicingItems(voicingPool, SYNTHETIC_VOICING_COUNT, rng);
		const composed = composePracticeQueue(cardedItems, [...voicingItems, ...otherSynthetics], rng);
		const { round } = sliceRound(composed, ROUND_TARGET);
		const { carded, voicing } = familyCounts(round);

		expect(round).toHaveLength(ROUND_TARGET);
		expect(voicing).toBeLessThanOrEqual(SYNTHETIC_VOICING_COUNT);
		// The bar that matters: at least half the bounded round must reach the
		// scheduler, or due cards stay due and the intro gate never reopens.
		expect(carded).toBeGreaterThanOrEqual(6);
	});

	it('planRound: the applied reserve is the cap, even over an uncapped voicing pool', () => {
		const rng = seededRng(7);
		const { cardedItems, voicingPool, otherSynthetics } = midTier3Fixture(rng);
		const { round } = planRound(cardedItems, [...voicingPool, ...otherSynthetics], ROUND_TARGET, rng);
		const { carded } = familyCounts(round);

		expect(round).toHaveLength(ROUND_TARGET);
		expect(round.length - carded).toBe(appliedSlotsFor(ROUND_TARGET));
		expect(carded).toBe(ROUND_TARGET - appliedSlotsFor(ROUND_TARGET));
	});

	it('documents the defect: an uncapped voicing draw starves the same round', () => {
		// Characterization of the pre-fix behavior, kept so the throughput
		// numbers above are legible as a real difference rather than a given:
		// with one voicing item per due seventh symbol (20 of them), voicing is
		// the single biggest family and the weave hands it up to 2 of every 3
		// slots, leaving the scheduler a minority of the round.
		const rng = seededRng(7);
		const { cardedItems, voicingPool, otherSynthetics } = midTier3Fixture(rng);
		const composed = composePracticeQueue(cardedItems, [...voicingPool, ...otherSynthetics], rng);
		const { round } = sliceRound(composed, ROUND_TARGET);
		const { carded, voicing } = familyCounts(round);

		expect(voicing).toBeGreaterThanOrEqual(6);
		expect(carded).toBeLessThanOrEqual(6);
	});
});

describe('syntheticProgressionItems', () => {
	it('returns n valid, distinct template+key pairs', () => {
		const items = syntheticProgressionItems(5, seededRng(1));
		expect(items).toHaveLength(5);
		const ids = new Set(items.map((item) => item.id));
		expect(ids.size).toBe(5);
		expect(items.every((item) => item.family === 'progression')).toBe(true);
	});

	it('is deterministic for a given seeded rng', () => {
		const a = syntheticProgressionItems(3, seededRng(42));
		const b = syntheticProgressionItems(3, seededRng(42));
		expect(a).toEqual(b);
	});
});

describe('syntheticInversionItems', () => {
	it('draws distinct, valid, stable-id {symbol, inversionIndex} pairs from the candidate symbols', () => {
		// Cm7 (seventh, 4 inversions) + C (triad, 3 inversions) = 7 total pairs.
		const items = syntheticInversionItems(['Cm7', 'C'], 5, seededRng(1));
		expect(items).toHaveLength(5);
		const ids = new Set(items.map((item) => item.id));
		expect(ids.size).toBe(5);
		for (const item of items) {
			expect(item.family).toBe('inversion');
			expect(item.id).toBe(`inversion:${item.symbol}:${item.inversionIndex}`);
			expect(['Cm7', 'C']).toContain(item.symbol);
			const maxIndex = item.symbol === 'Cm7' ? 4 : 3;
			expect(item.inversionIndex).toBeGreaterThanOrEqual(0);
			expect(item.inversionIndex).toBeLessThan(maxIndex);
		}
	});

	it('respects `count`, returning at most that many items', () => {
		const items = syntheticInversionItems(['Cm7'], 2, seededRng(2));
		expect(items).toHaveLength(2);
	});

	it('returns [] for an empty candidate list (single-type-due gate preserved)', () => {
		expect(syntheticInversionItems([], 5, seededRng(3))).toEqual([]);
	});

	it('is deterministic for a given seeded rng', () => {
		const a = syntheticInversionItems(['Cm7', 'C'], 4, seededRng(42));
		const b = syntheticInversionItems(['Cm7', 'C'], 4, seededRng(42));
		expect(a).toEqual(b);
	});
});

describe('syntheticChordScaleItems', () => {
	it('draws distinct, valid, stable-id items from the candidate symbols', () => {
		const items = syntheticChordScaleItems(['Dm7', 'G7'], 5, seededRng(1));
		expect(items).toHaveLength(2);
		const ids = new Set(items.map((item) => item.id));
		expect(ids.size).toBe(2);
		for (const item of items) {
			expect(item.family).toBe('chord-scale');
			expect(item.id).toBe(`chord-scale:${item.symbol}`);
			expect(['Dm7', 'G7']).toContain(item.symbol);
		}
	});

	it('excludes a candidate the guide has no honest scale answer for', () => {
		const items = syntheticChordScaleItems(['Dm7', 'Cdim7'], 5, seededRng(2));
		expect(items.map((item) => item.symbol)).toEqual(['Dm7']);
	});

	it('respects `count`, returning at most that many items', () => {
		const items = syntheticChordScaleItems(['Dm7', 'G7', 'Cmaj7'], 2, seededRng(3));
		expect(items).toHaveLength(2);
	});

	it('returns [] for an empty candidate list (single-type-due gate preserved)', () => {
		expect(syntheticChordScaleItems([], 5, seededRng(4))).toEqual([]);
	});

	it('is deterministic for a given seeded rng', () => {
		const a = syntheticChordScaleItems(['Dm7', 'G7', 'Cmaj7'], 2, seededRng(42));
		const b = syntheticChordScaleItems(['Dm7', 'G7', 'Cmaj7'], 2, seededRng(42));
		expect(a).toEqual(b);
	});
});

/** Test-only fixture builder for a CardedQueueItem, mirroring cardsToQueueItems' own id/shape. */
function makeCarded(
	family: 'name-it' | 'build-it' | 'interval',
	symbolOrShort: string,
	overrides: Partial<CardedQueueItem> = {}
): CardedQueueItem {
	const isInterval = family === 'interval';
	const factId = isInterval ? `interval-size:${symbolOrShort}` : `chord-formula:${symbolOrShort}`;
	const mode: Mode = family === 'build-it' ? 'formula-build' : 'formula';
	return {
		id: `fsrs:${factId}:${mode}`,
		family,
		factId,
		mode,
		factKind: isInterval ? 'interval-size' : 'chord-formula',
		symbol: isInterval ? undefined : symbolOrShort,
		short: isInterval ? symbolOrShort : undefined,
		card: makeCardRecord({ factId, factKind: isInterval ? 'interval-size' : 'chord-formula', mode }),
		...overrides
	};
}

/** Test-only fixture builder for a VoicingQueueItem. */
function makeVoicing(symbol: string): VoicingQueueItem {
	return { id: `voicing:${symbol}`, family: 'voicing', symbol, stage: 'meet' };
}

/** Test-only fixture builder for a ProgressionQueueItem. */
function makeProgression(templateId: string, key: string): ProgressionQueueItem {
	return { id: `prog:${templateId}:${key}`, family: 'progression', templateId, key };
}

/** Test-only fixture builder for an InversionQueueItem. */
function makeInversion(symbol: string, inversionIndex: number): InversionQueueItem {
	return { id: `inversion:${symbol}:${inversionIndex}`, family: 'inversion', symbol, inversionIndex };
}

/** Test-only fixture builder for a ChordScaleQueueItem. */
function makeChordScale(symbol: string): ChordScaleQueueItem {
	return { id: `chord-scale:${symbol}`, family: 'chord-scale', symbol };
}

/** True iff `queue` contains 3+ consecutive items from the same family. */
function hasThreeInARow(queue: HybridQueueItem[]): boolean {
	let run = 1;
	for (let i = 1; i < queue.length; i++) {
		if (queue[i].family === queue[i - 1].family) {
			run += 1;
			if (run >= 3) return true;
		} else {
			run = 1;
		}
	}
	return false;
}

describe('composePracticeQueue', () => {
	it('is a faithful permutation (every input present exactly once) for a 2-family input', () => {
		const carded: CardedQueueItem[] = [
			makeCarded('name-it', 'Cm7'),
			makeCarded('name-it', 'Dm7'),
			makeCarded('name-it', 'Em7')
		];
		const synthetic: HybridQueueItem[] = [makeVoicing('Cmaj7'), makeVoicing('Dmaj7'), makeVoicing('Emaj7')];
		const composed = composePracticeQueue(carded, synthetic, seededRng(7));

		const inputIds = [...carded, ...synthetic].map((item) => item.id).sort();
		const outputIds = composed.map((item) => item.id).sort();
		expect(outputIds).toEqual(inputIds);
	});

	it('preserves within-family relative order', () => {
		const carded: CardedQueueItem[] = [
			makeCarded('name-it', 'Cm7'),
			makeCarded('name-it', 'Dm7'),
			makeCarded('name-it', 'Em7')
		];
		const synthetic: HybridQueueItem[] = [makeVoicing('Cmaj7'), makeVoicing('Dmaj7')];
		const composed = composePracticeQueue(carded, synthetic, seededRng(11));

		const nameItOrder = composed.filter((item) => item.family === 'name-it').map((item) => item.id);
		expect(nameItOrder).toEqual(carded.map((item) => item.id));

		const voicingOrder = composed.filter((item) => item.family === 'voicing').map((item) => item.id);
		expect(voicingOrder).toEqual(synthetic.map((item) => item.id));
	});

	it('never runs a single family 3-in-a-row when 2+ families are present', () => {
		// Deliberately skewed: 6 name-it vs 2 voicing, across several seeds.
		const carded: CardedQueueItem[] = Array.from({ length: 6 }, (_, i) => makeCarded('name-it', `C${i}m7`));
		const synthetic: HybridQueueItem[] = [makeVoicing('Cmaj7'), makeVoicing('Dmaj7')];
		for (const seed of [1, 2, 3, 4, 5]) {
			const composed = composePracticeQueue(carded, synthetic, seededRng(seed));
			expect(hasThreeInARow(composed)).toBe(false);
		}
	});

	it('terminates and passes through unchanged for a single-family (worst-case infeasible) input (PRAC-05)', () => {
		const carded: CardedQueueItem[] = [
			makeCarded('name-it', 'Cm7'),
			makeCarded('name-it', 'Dm7'),
			makeCarded('name-it', 'Em7')
		];
		const composed = composePracticeQueue(carded, [], seededRng(3));
		expect(composed).toEqual(carded);
	});

	describe('same-symbol anti-adjacency (UAT G2)', () => {
		/** The `symbol` an item carries, or undefined for a ProgressionQueueItem (which has none). */
		function itemSymbol(item: HybridQueueItem): string | undefined {
			return item.family === 'progression' ? undefined : item.symbol;
		}

		/** True iff any two adjacent items in `queue` share a defined, equal `symbol`. */
		function hasAdjacentSameSymbol(queue: HybridQueueItem[]): boolean {
			for (let i = 1; i < queue.length; i++) {
				const prevSymbol = itemSymbol(queue[i - 1]);
				const curSymbol = itemSymbol(queue[i]);
				if (prevSymbol !== undefined && curSymbol !== undefined && prevSymbol === curSymbol) {
					return true;
				}
			}
			return false;
		}

		it('never lands two same-symbol name-it items adjacent when an alternative family item exists', () => {
			// Same chord (Cm7) twice inside ONE family. Since T13 gave each chord
			// mode its own family, familyForCard no longer produces this shape
			// from a teach cluster, but the composer's symbol rule must still
			// hold for any same-family repeat (a re-drawn symbol, a future
			// family that carries two items per symbol), so the items are built
			// directly here rather than mapped from cards.
			const carded: CardedQueueItem[] = [
				makeCarded('name-it', 'Cm7', { id: 'fsrs:chord-formula:Cm7:formula', mode: 'formula' }),
				makeCarded('name-it', 'Cm7', { id: 'fsrs:chord-formula:Cm7:see-play', mode: 'see-play' }),
				makeCarded('name-it', 'Dm7')
			];
			const synthetic: HybridQueueItem[] = [makeVoicing('Fmaj7'), makeVoicing('Gmaj7')];

			for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
				const composed = composePracticeQueue(carded, synthetic, seededRng(seed));
				// Still a faithful permutation and still respects the family rule.
				const inputIds = [...carded, ...synthetic].map((item) => item.id).sort();
				expect(composed.map((item) => item.id).sort()).toEqual(inputIds);
				expect(hasThreeInARow(composed)).toBe(false);
				expect(hasAdjacentSameSymbol(composed)).toBe(false);
			}
		});

		it('allows the repeat when NO alternative eligible item exists (e.g. every eligible family shares the trailing symbol)', () => {
			// Every family's next-up item shares symbol 'Cm7' (name-it AND the
			// only synthetic item, voicing, both drilling Cm7 right now) - no
			// alternative exists, so the anti-adjacency must not block progress.
			const carded: CardedQueueItem[] = [
				makeCarded('name-it', 'Cm7', { id: 'fsrs:chord-formula:Cm7:formula', mode: 'formula' }),
				makeCarded('name-it', 'Cm7', { id: 'fsrs:chord-formula:Cm7:see-play', mode: 'see-play' })
			];
			const synthetic: HybridQueueItem[] = [makeVoicing('Cm7')];

			for (const seed of [1, 2, 3]) {
				const composed = composePracticeQueue(carded, synthetic, seededRng(seed));
				const inputIds = [...carded, ...synthetic].map((item) => item.id).sort();
				expect(composed.map((item) => item.id).sort()).toEqual(inputIds);
				expect(composed).toHaveLength(3);
			}
		});

		it('still allows a legitimately-single-due symbol to repeat when it is the only family present (PRAC-05 preserved)', () => {
			const carded: CardedQueueItem[] = [
				makeCarded('name-it', 'Cm7', { id: 'fsrs:chord-formula:Cm7:formula', mode: 'formula' }),
				makeCarded('name-it', 'Cm7', { id: 'fsrs:chord-formula:Cm7:see-play', mode: 'see-play' })
			];
			const composed = composePracticeQueue(carded, [], seededRng(9));
			expect(composed).toEqual(carded);
		});
	});
});

	describe('inversion family in composePracticeQueue (Phase 35, INV-03)', () => {
		it('passes through unchanged when inversion is the only family present (single-type-due gate)', () => {
			const inversions: InversionQueueItem[] = [
				makeInversion('Cm7', 0),
				makeInversion('Cm7', 1),
				makeInversion('Cm7', 2)
			];
			const composed = composePracticeQueue([], inversions, seededRng(5));
			expect(composed).toEqual(inversions);
		});

		it('interleaves inversion items with the existing five without a 3-in-a-row of one family', () => {
			const carded: CardedQueueItem[] = Array.from({ length: 6 }, (_, i) =>
				makeCarded('name-it', `C${i}m7`)
			);
			const synthetic: HybridQueueItem[] = [
				makeVoicing('Cmaj7'),
				makeVoicing('Dmaj7'),
				makeProgression('major-ii-V-I', 'C'),
				makeInversion('Em7', 0),
				makeInversion('Em7', 1)
			];
			for (const seed of [1, 2, 3, 4, 5]) {
				const composed = composePracticeQueue(carded, synthetic, seededRng(seed));
				const inputIds = [...carded, ...synthetic].map((item) => item.id).sort();
				expect(composed.map((item) => item.id).sort()).toEqual(inputIds);
				expect(hasThreeInARow(composed)).toBe(false);
			}
		});

		it('is a faithful permutation including inversion items (none dropped or duplicated)', () => {
			const carded: CardedQueueItem[] = [makeCarded('interval', 'M3')];
			const synthetic: HybridQueueItem[] = [makeInversion('Cm7', 0), makeInversion('Cm7', 1)];
			const composed = composePracticeQueue(carded, synthetic, seededRng(6));
			const inputIds = [...carded, ...synthetic].map((item) => item.id).sort();
			expect(composed.map((item) => item.id).sort()).toEqual(inputIds);
		});
	});

	describe('REG-parity: existing-five ordering unchanged with no inversion items present', () => {
		it('produces the frozen baseline order for a fixed rng (byte-identical weave for the existing five, REG-01)', () => {
			const carded: CardedQueueItem[] = [
				makeCarded('name-it', 'Cm7'),
				makeCarded('build-it', 'Dm7'),
				makeCarded('interval', 'M3')
			];
			const synthetic: HybridQueueItem[] = [
				makeVoicing('Cmaj7'),
				makeVoicing('Dmaj7'),
				makeProgression('major-ii-V-I', 'C')
			];
			const composed = composePracticeQueue(carded, synthetic, seededRng(13));

			// Frozen baseline: captured from composePracticeQueue's own weave
			// output for this exact input+seed. Any future change to the weave
			// algorithm that changes this order (with zero inversion items
			// present) is a REG-01 regression and must fail this test.
			expect(composed.map((item) => item.id)).toEqual([
				'voicing:Cmaj7',
				'voicing:Dmaj7',
				'prog:major-ii-V-I:C',
				'fsrs:chord-formula:Cm7:formula',
				'fsrs:chord-formula:Dm7:formula-build',
				'fsrs:interval-size:M3:formula'
			]);
		});
	});

	describe('cold-session first-item ordering (QUEUE-01)', () => {
		it("never leads with 'progression' or 'inversion' when a simpler family is present, across seeds", () => {
			const carded: CardedQueueItem[] = [
				makeCarded('name-it', 'Cm7'),
				makeCarded('name-it', 'Dm7')
			];
			const synthetic: HybridQueueItem[] = [
				makeVoicing('Cmaj7'),
				makeProgression('major-ii-V-I', 'C'),
				makeInversion('Em7', 0),
				makeInversion('Em7', 1)
			];
			for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
				const composed = composePracticeQueue(carded, synthetic, seededRng(seed), { lowMastery: true });
				expect(SCAFFOLD_HEAVY.has(composed[0].family)).toBe(false);
				const inputIds = [...carded, ...synthetic].map((item) => item.id).sort();
				expect(composed.map((item) => item.id).sort()).toEqual(inputIds);
				expect(hasThreeInARow(composed)).toBe(false);
			}
		});

		it('is byte-identical to the warm result when only scaffold-heavy families are present (no simpler family to prefer)', () => {
			const synthetic: HybridQueueItem[] = [
				makeProgression('major-ii-V-I', 'C'),
				makeProgression('major-ii-V-I', 'D'),
				makeInversion('Em7', 0),
				makeInversion('Em7', 1)
			];
			for (const seed of [1, 2, 3, 4, 5]) {
				const cold = composePracticeQueue([], synthetic, seededRng(seed), { lowMastery: true });
				const warm = composePracticeQueue([], synthetic, seededRng(seed), { lowMastery: false });
				expect(cold).toEqual(warm);
			}
		});

		it('preserves the single-type-due gate for a scaffold-heavy-only single family under the cold signal', () => {
			const inversions: InversionQueueItem[] = [
				makeInversion('Cm7', 0),
				makeInversion('Cm7', 1),
				makeInversion('Cm7', 2)
			];
			const composed = composePracticeQueue([], inversions, seededRng(5), { lowMastery: true });
			expect(composed).toEqual(inversions);
		});

		it('defaults to the warm result when options are omitted (3-arg call)', () => {
			const carded: CardedQueueItem[] = [makeCarded('name-it', 'Cm7'), makeCarded('name-it', 'Dm7')];
			const synthetic: HybridQueueItem[] = [
				makeVoicing('Cmaj7'),
				makeProgression('major-ii-V-I', 'C'),
				makeInversion('Em7', 0)
			];
			for (const seed of [1, 2, 3]) {
				const threeArg = composePracticeQueue(carded, synthetic, seededRng(seed));
				const explicitWarm = composePracticeQueue(carded, synthetic, seededRng(seed), { lowMastery: false });
				expect(threeArg).toEqual(explicitWarm);
			}
		});

		it('preserves within-family relative order and no-3-in-a-row for a skewed multi-family input under the cold signal', () => {
			const carded: CardedQueueItem[] = Array.from({ length: 6 }, (_, i) => makeCarded('name-it', `C${i}m7`));
			const synthetic: HybridQueueItem[] = [
				makeVoicing('Cmaj7'),
				makeProgression('major-ii-V-I', 'C'),
				makeInversion('Em7', 0),
				makeInversion('Em7', 1)
			];
			for (const seed of [1, 2, 3, 4, 5]) {
				const composed = composePracticeQueue(carded, synthetic, seededRng(seed), { lowMastery: true });
				const nameItOrder = composed.filter((item) => item.family === 'name-it').map((item) => item.id);
				expect(nameItOrder).toEqual(carded.map((item) => item.id));
				expect(hasThreeInARow(composed)).toBe(false);
			}
		});
	});

describe('isLowMasterySession', () => {
	it('returns false for an empty array (no basis - REG-01-safe warm default)', () => {
		expect(isLowMasterySession([])).toBe(false);
	});

	it('returns true for three State.New cards (all-New is cold)', () => {
		const cards = [makeCardRecord({ state: State.New }), makeCardRecord({ state: State.New }), makeCardRecord({ state: State.New })];
		expect(isLowMasterySession(cards)).toBe(true);
	});

	it('returns true for three State.Learning cards (Learning counts as not-mature)', () => {
		const cards = [
			makeCardRecord({ state: State.Learning }),
			makeCardRecord({ state: State.Learning }),
			makeCardRecord({ state: State.Learning })
		];
		expect(isLowMasterySession(cards)).toBe(true);
	});

	it('returns true when mature (State.Review) cards are a minority (1 of 3)', () => {
		const cards = [
			makeCardRecord({ state: State.Review }),
			makeCardRecord({ state: State.New }),
			makeCardRecord({ state: State.New })
		];
		expect(isLowMasterySession(cards)).toBe(true);
	});

	it('returns false when mature (State.Review) cards are a majority (2 of 3)', () => {
		const cards = [
			makeCardRecord({ state: State.Review }),
			makeCardRecord({ state: State.Review }),
			makeCardRecord({ state: State.New })
		];
		expect(isLowMasterySession(cards)).toBe(false);
	});

	it('returns false for three State.Review cards (fully warm)', () => {
		const cards = [
			makeCardRecord({ state: State.Review }),
			makeCardRecord({ state: State.Review }),
			makeCardRecord({ state: State.Review })
		];
		expect(isLowMasterySession(cards)).toBe(false);
	});
});

describe('advanceHybridQueue', () => {
	it('re-enqueues an Again-graded carded item to the back', () => {
		const first = makeCarded('name-it', 'Cm7');
		const second = makeCarded('interval', 'M3');
		const queue: HybridQueueItem[] = [first, second];
		const advanced = advanceHybridQueue(queue, Rating.Again);
		expect(advanced).toEqual([second, first]);
		// Never mutates the input.
		expect(queue).toEqual([first, second]);
	});

	it('consumes a Good-graded carded item without re-enqueue', () => {
		const first = makeCarded('name-it', 'Cm7');
		const second = makeCarded('interval', 'M3');
		const advanced = advanceHybridQueue([first, second], Rating.Good);
		expect(advanced).toEqual([second]);
	});

	it('consumes a synthetic item regardless of outcome (never re-enqueued)', () => {
		const first = makeVoicing('Cmaj7');
		const second = makeProgression('major-ii-V-I', 'C');
		const advanced = advanceHybridQueue([first, second], Rating.Again);
		expect(advanced).toEqual([second]);
	});

	it('consumes an inversion item on Again without re-enqueue (synthetic, matches voicing/progression)', () => {
		const first = makeInversion('Cm7', 0);
		const second = makeCarded('interval', 'M3');
		const advanced = advanceHybridQueue([first, second], Rating.Again);
		expect(advanced).toEqual([second]);
	});

	it('consumes an inversion item on Good without re-enqueue', () => {
		const first = makeInversion('Cm7', 0);
		const second = makeCarded('interval', 'M3');
		const advanced = advanceHybridQueue([first, second], Rating.Good);
		expect(advanced).toEqual([second]);
	});
});

/**
 * B1: the bounded daily round. sliceRound cuts the composed queue down to the
 * day's target without re-ordering it, and the DELAYED retry re-asks a missed
 * item inside the round instead of parking it behind everything else.
 */

/** The `symbol` each slot carries (undefined for a progression), for order assertions. */
function symbolsOf(queue: HybridQueueItem[]): (string | undefined)[] {
	return queue.map((item) => (item.family === 'progression' ? undefined : item.symbol));
}

describe('sliceRound', () => {
	function queueOf(n: number): HybridQueueItem[] {
		return Array.from({ length: n }, (_, i) => makeCarded('name-it', `Cm7-${i}`));
	}

	it('cuts to the target and reports what it left waiting', () => {
		const queue = queueOf(30);
		const { round, waiting } = sliceRound(queue, 12);
		expect(round).toHaveLength(12);
		expect(waiting).toBe(18);
	});

	it('preserves the composed order exactly (never re-orders or re-picks)', () => {
		const queue = queueOf(20);
		expect(sliceRound(queue, 5).round).toEqual(queue.slice(0, 5));
	});

	it('never mutates the input queue', () => {
		const queue = queueOf(6);
		const snapshot = [...queue];
		sliceRound(queue, 3);
		expect(queue).toEqual(snapshot);
	});

	it('a target at or above the queue length takes everything, nothing waiting', () => {
		const queue = queueOf(4);
		expect(sliceRound(queue, 12)).toEqual({ round: queue, waiting: 0 });
		expect(sliceRound(queueOf(12), 12).waiting).toBe(0);
	});

	it('a non-positive or non-finite target yields an empty round with everything waiting', () => {
		expect(sliceRound(queueOf(7), 0)).toEqual({ round: [], waiting: 7 });
		expect(sliceRound(queueOf(7), -3).round).toEqual([]);
		expect(sliceRound(queueOf(7), Number.NaN).round).toEqual([]);
		expect(sliceRound(queueOf(7), Number.POSITIVE_INFINITY).round).toEqual([]);
	});

	it('an empty queue yields an empty round with nothing waiting', () => {
		expect(sliceRound([], 12)).toEqual({ round: [], waiting: 0 });
	});

	it('floors a fractional target rather than producing a fractional slice', () => {
		expect(sliceRound(queueOf(10), 3.9).round).toHaveLength(3);
	});
});

describe('advanceHybridQueue: delayed in-session retry (B1)', () => {
	function queueOf(labels: string[]): HybridQueueItem[] {
		return labels.map((label) => makeCarded('name-it', label));
	}

	/** rng() = 0 draws the MINIMUM gap; just under 1 draws the maximum. */
	const minRng = () => 0;
	const maxRng = () => 0.999;
	const delayed = { retryMinGap: RETRY_MIN_GAP, retryMaxGap: RETRY_MAX_GAP };

	it('re-inserts a missed carded item `gap` questions ahead, not at the tail', () => {
		const advanced = advanceHybridQueue(queueOf(['A', 'B', 'C', 'D', 'E']), Rating.Again, {
			...delayed,
			rng: minRng
		});
		// Gap 2 = one other question, then A again.
		expect(symbolsOf(advanced)).toEqual(['B', 'A', 'C', 'D', 'E']);
	});

	it('honours the maximum gap draw', () => {
		const advanced = advanceHybridQueue(queueOf(['A', 'B', 'C', 'D', 'E']), Rating.Again, {
			...delayed,
			rng: maxRng
		});
		expect(symbolsOf(advanced)).toEqual(['B', 'C', 'D', 'A', 'E']);
	});

	it('keeps the round the same LENGTH: the retry displaces nothing and adds nothing', () => {
		const queue = queueOf(['A', 'B', 'C', 'D']);
		const advanced = advanceHybridQueue(queue, Rating.Again, { ...delayed, rng: minRng });
		expect(advanced).toHaveLength(queue.length);
		expect(new Set(advanced)).toEqual(new Set(queue));
	});

	it('appends rather than dropping when the gap runs past the remaining queue', () => {
		const advanced = advanceHybridQueue(queueOf(['A', 'B']), Rating.Again, {
			...delayed,
			rng: maxRng
		});
		expect(symbolsOf(advanced)).toEqual(['B', 'A']);
	});

	it('a sole remaining item comes straight back (nothing to interleave with)', () => {
		const advanced = advanceHybridQueue(queueOf(['A']), Rating.Again, { ...delayed, rng: minRng });
		expect(symbolsOf(advanced)).toEqual(['A']);
	});

	it('leaves synthetic items and non-Again outcomes alone even with retry options set', () => {
		const voicing = makeVoicing('Cmaj7');
		const carded = makeCarded('name-it', 'Cm7');
		const options = { ...delayed, rng: minRng };
		expect(advanceHybridQueue([voicing, carded], Rating.Again, options)).toEqual([carded]);
		expect(advanceHybridQueue([carded, voicing], Rating.Good, options)).toEqual([voicing]);
	});

	it('omitting the retry options keeps the legacy tail re-enqueue (REG-01)', () => {
		expect(symbolsOf(advanceHybridQueue(queueOf(['A', 'B', 'C']), Rating.Again))).toEqual([
			'B',
			'C',
			'A'
		]);
	});

	it('never mutates the input queue', () => {
		const queue = queueOf(['A', 'B', 'C']);
		const snapshot = [...queue];
		advanceHybridQueue(queue, Rating.Again, { ...delayed, rng: minRng });
		expect(queue).toEqual(snapshot);
	});

	it('clamps a degenerate gap configuration to a real gap of at least one question', () => {
		const advanced = advanceHybridQueue(queueOf(['A', 'B', 'C']), Rating.Again, {
			retryMinGap: 0,
			retryMaxGap: 0,
			rng: minRng
		});
		expect(symbolsOf(advanced)).toEqual(['A', 'B', 'C']);
	});

	it('a randomly drawn gap always lands inside the 2-to-4 window', () => {
		const rng = seededRng(99);
		for (let trial = 0; trial < 60; trial++) {
			const advanced = advanceHybridQueue(queueOf(['A', 'B', 'C', 'D', 'E', 'F']), Rating.Again, {
				...delayed,
				rng
			});
			const index = symbolsOf(advanced).indexOf('A');
			expect(index).toBeGreaterThanOrEqual(1);
			expect(index).toBeLessThanOrEqual(3);
		}
	});
});

describe('filterVoicingsBySong', () => {
	it('restricts voicing items by the song predicate', () => {
		const items: VoicingQueueItem[] = [makeVoicing('Cmaj7'), makeVoicing('Dmaj7'), makeVoicing('Emaj7')];
		const filtered = filterVoicingsBySong(items, (symbol) => symbol === 'Dmaj7');
		expect(filtered.map((item) => item.symbol)).toEqual(['Dmaj7']);
	});
});

describe('filterInversionsBySong', () => {
	it('restricts inversion items by the song predicate', () => {
		const items: InversionQueueItem[] = [
			makeInversion('Cm7', 0),
			makeInversion('Dm7', 0),
			makeInversion('Em7', 0)
		];
		const filtered = filterInversionsBySong(items, (symbol) => symbol === 'Dm7');
		expect(filtered.map((item) => item.symbol)).toEqual(['Dm7']);
	});
});

describe('filterChordScaleBySong', () => {
	it('restricts chord-scale items by the song predicate', () => {
		const items: ChordScaleQueueItem[] = [
			makeChordScale('Cm7'),
			makeChordScale('Dm7'),
			makeChordScale('Em7')
		];
		const filtered = filterChordScaleBySong(items, (symbol) => symbol === 'Dm7');
		expect(filtered.map((item) => item.symbol)).toEqual(['Dm7']);
	});
});

describe('familiesInQueue / hybridSessionRemaining / isHybridSessionComplete', () => {
	it('familiesInQueue returns the set of families present', () => {
		const queue: HybridQueueItem[] = [makeCarded('name-it', 'Cm7'), makeVoicing('Dmaj7')];
		expect(familiesInQueue(queue)).toEqual(new Set(['name-it', 'voicing']));
	});

	it('hybridSessionRemaining/isHybridSessionComplete mirror session.ts semantics', () => {
		const queue: HybridQueueItem[] = [makeCarded('name-it', 'Cm7')];
		expect(hybridSessionRemaining(queue)).toBe(1);
		expect(isHybridSessionComplete(queue)).toBe(false);
		expect(hybridSessionRemaining([])).toBe(0);
		expect(isHybridSessionComplete([])).toBe(true);
	});
});

/**
 * T13 (mode collapse): the teach cluster's own shape, end to end through the
 * real cardsToQueueItems + composePracticeQueue. A new chord fact seeds
 * formula + see-play + formula-build together, and those three cards used to
 * become TWO name-it items and one build-it item, so two thirds of the cluster
 * asked the identical multiple-choice question about the identical symbol.
 */
describe('teach-cluster modes spread across families (T13)', () => {
	function clusterCards(symbol: string): CardRecord[] {
		const factId = `chord-formula:${symbol}`;
		return (['formula', 'see-play', 'formula-build', 'hear-name'] as Mode[]).map((mode) =>
			makeCardRecord({ factId, factKind: 'chord-formula', mode })
		);
	}

	it("maps one chord's four cards to four items in four distinct families", () => {
		const items = cardsToQueueItems(clusterCards('Cm7'));
		expect(items).toHaveLength(4);
		expect(new Set(items.map((item) => item.family)).size).toBe(4);
		// Every item still names the same chord and keeps its own card identity.
		for (const item of items) {
			expect(item.symbol).toBe('Cm7');
		}
		expect(new Set(items.map((item) => item.id)).size).toBe(4);
	});

	it('lets the composer break up a single chord\'s cluster instead of running it as one family block', () => {
		// One symbol only, so the SYMBOL rule cannot help - it is purely the
		// family split that gives the composer anything to interleave. Before
		// T13 the three non-build cards were one family, so the no-3-in-a-row
		// rule had to relax and the round read as the same question repeated.
		const items = cardsToQueueItems(clusterCards('Cm7'));
		for (const seed of [1, 2, 3, 4, 5]) {
			const composed = composePracticeQueue(items, [], seededRng(seed));
			expect(composed).toHaveLength(4);
			expect(hasThreeInARow(composed)).toBe(false);
		}
	});
});

/**
 * T13 item 4: the due-backlog gate compared a CARD count against a FACT budget.
 * One day's own introduction is ~30 cards (10 facts x a 3-mode teach cluster),
 * so on every day a cohort returned, 30 > 20 blocked new material and intake
 * self-throttled from about day 4 onward.
 */
describe('due-backlog gate (T13)', () => {
	it('states its threshold in the same unit as the budget it gates', () => {
		// The relationship, asserted against the REAL constant rather than a
		// mocked one: 20 is two full days of intake, not a coincidence.
		expect(DUE_BACKLOG_GATE_FACTS).toBe(2 * MAX_NEW_CARDS_PER_DAY);
	});

	it("counts a chord's whole teach cluster as ONE fact, not three cards", () => {
		const factId = 'chord-formula:Cm7';
		const cluster = (['formula', 'see-play', 'formula-build'] as Mode[]).map((mode) =>
			makeCardRecord({ factId, factKind: 'chord-formula', mode })
		);
		expect(cluster).toHaveLength(3);
		expect(backlogFactCount(cluster)).toBe(1);
	});

	it('lets one full day of intake through the gate, where the card count did not', () => {
		// 10 chord facts x 3 cluster modes = 30 cards, which is exactly the shape
		// that used to trip `30 > 20` and freeze intake.
		const symbols = ['Cm7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7b5', 'Cmaj7', 'D7', 'Emaj7'];
		const day: CardRecord[] = [];
		for (const symbol of symbols) {
			for (const mode of ['formula', 'see-play', 'formula-build'] as Mode[]) {
				day.push(
					makeCardRecord({ factId: `chord-formula:${symbol}`, factKind: 'chord-formula', mode })
				);
			}
		}

		expect(day).toHaveLength(30);
		expect(day.length > DUE_BACKLOG_GATE_FACTS).toBe(true); // the old, wrong comparison
		expect(backlogFactCount(day)).toBe(10);
		expect(backlogFactCount(day) > DUE_BACKLOG_GATE_FACTS).toBe(false); // the fixed one
	});

	it('still trips on a genuine backlog of three unpracticed days', () => {
		const facts: CardRecord[] = [];
		for (let i = 0; i < 30; i++) {
			facts.push(
				makeCardRecord({ factId: `interval-size:fact-${i}`, factKind: 'interval-size', mode: 'formula' })
			);
		}
		expect(backlogFactCount(facts)).toBe(30);
		expect(backlogFactCount(facts) > DUE_BACKLOG_GATE_FACTS).toBe(true);
	});

	/**
	 * The gate counts only facts a practice surface can actually ask, so a pile of
	 * unclearable cards can never permanently freeze intake.
	 *
	 * This test used to use the 84 scale-degree facts as its unaskable pile, which
	 * was the whole point: they were introduced by the deck and then dropped by
	 * familyForCard, so they were due forever. **They are now askable**, so they
	 * legitimately count, and the invariant is demonstrated with scale-formula
	 * instead. That kind is deliberately absent from CATALOG so no such card is
	 * ever created, which makes it the honest example of defence in depth rather
	 * than a live leak.
	 */
	it('ignores cards no practice surface can ask, so unclearable cards can never freeze intake', () => {
		const unaskable: CardRecord[] = [];
		for (const tonic of ['C', 'D', 'E', 'F', 'G', 'A', 'B']) {
			unaskable.push(
				makeCardRecord({
					factId: `scale-formula:${tonic}`,
					factKind: 'scale-formula',
					mode: 'formula-build'
				})
			);
		}
		expect(backlogFactCount(unaskable)).toBe(0);

		// And they do not drown out the real signal either.
		const withOneRealFact = [
			...unaskable,
			makeCardRecord({ factId: 'chord-formula:Cm7', factKind: 'chord-formula', mode: 'formula' })
		];
		expect(backlogFactCount(withOneRealFact)).toBe(1);
	});

	it('counts scale-degree facts now that a surface can ask them', () => {
		const degrees: CardRecord[] = [];
		for (let degree = 1; degree <= 7; degree++) {
			degrees.push(
				makeCardRecord({
					factId: `scale-degree:C:${degree}`,
					factKind: 'scale-degree',
					mode: 'formula'
				})
			);
		}
		expect(backlogFactCount(degrees)).toBe(7);
	});
});

describe('planRound (ml-practice-variety: what one bounded round asks)', () => {
	const ROUND = 12;

	/** One chord fact's due cards, all in `state`, in the given modes. */
	function chordCards(symbol: string, modes: Mode[], state: State = State.New): CardRecord[] {
		return modes.map((mode, index) =>
			makeCardRecord({
				factId: `chord-formula:${symbol}`,
				mode,
				state,
				stability: index + 1
			})
		);
	}

	const CLUSTER: Mode[] = ['formula', 'see-play', 'formula-build'];
	const TWELVE = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Cm', 'Dm', 'Em', 'Fm', 'Gm'];

	function subjectOf(item: HybridQueueItem): string {
		if (item.family === 'progression') return `${item.templateId}:${item.key}`;
		if (item.family === 'interval') return item.short ?? '';
		if (item.family === 'degree') return `${item.tonic}${item.degree}`;
		return item.symbol ?? '';
	}

	it('reserves 3 applied slots in 12, and caps a carded family at 4', () => {
		expect(appliedSlotsFor(12)).toBe(3);
		expect(appliedSlotsFor(5)).toBe(1);
		expect(appliedSlotsFor(3)).toBe(0);
		expect(familyCapFor(12)).toBe(4);
		expect(familyCapFor(3)).toBe(2);
	});

	it('asks each chord once: a 12-chord teach cohort is 12 chords, not 4 chords x 3 modes', () => {
		const carded = cardsToQueueItems(TWELVE.flatMap((symbol) => chordCards(symbol, CLUSTER)));
		const { round, waiting } = planRound(carded, [], ROUND, seededRng(1));

		expect(round).toHaveLength(ROUND);
		expect(new Set(round.map(subjectOf)).size).toBe(ROUND);
		expect(waiting).toBe(36 - ROUND);
	});

	it('teaches a new chord build-first, and spills to the next mode when the family is full', () => {
		const carded = cardsToQueueItems(TWELVE.flatMap((symbol) => chordCards(symbol, CLUSTER)));
		const { round } = planRound(carded, [], ROUND, seededRng(1));
		const counts = new Map<string, number>();
		for (const item of round) counts.set(item.family, (counts.get(item.family) ?? 0) + 1);

		// build-it first (4, the cap), then play-it (4), then name-it (4).
		expect(counts.get('build-it')).toBe(4);
		expect(counts.get('play-it')).toBe(4);
		expect(counts.get('name-it')).toBe(4);
	});

	it('asks an owed review weakest-first, the ear card last', () => {
		const cards = [
			makeCardRecord({ mode: 'hear-name', state: State.Review, stability: 0.1 }),
			makeCardRecord({ mode: 'see-play', state: State.Review, stability: 5 }),
			makeCardRecord({ mode: 'formula', state: State.Review, stability: 2 })
		];
		const { round } = planRound(cardsToQueueItems(cards), [], 1, seededRng(1));
		expect(round).toHaveLength(1);
		expect((round[0] as CardedQueueItem).mode).toBe('formula');
	});

	it('no carded family takes more than 4 of 12 while another family can fill', () => {
		const plays = TWELVE.flatMap((symbol) => chordCards(symbol, ['see-play'], State.Review));
		const intervals = ['m3', 'M3', 'P5', 'm7', 'M7', 'A4', 'M6', 'P4'].map((short) =>
			makeCardRecord({ factId: `interval-size:${short}`, factKind: 'interval-size', state: State.Review })
		);
		const degrees = [1, 3, 5, 7].map((degree) =>
			makeCardRecord({
				factId: `scale-degree:C:${degree}`,
				factKind: 'scale-degree',
				state: State.Review
			})
		);
		const { round } = planRound(
			cardsToQueueItems([...plays, ...intervals, ...degrees]),
			[],
			ROUND,
			seededRng(3)
		);
		expect(round).toHaveLength(ROUND);
		for (const family of ['play-it', 'interval', 'degree']) {
			expect(round.filter((item) => item.family === family)).toHaveLength(4);
		}
	});

	it('relaxes the family cap rather than ask fewer questions', () => {
		const plays = TWELVE.flatMap((symbol) => chordCards(symbol, ['see-play'], State.Review));
		const { round } = planRound(cardsToQueueItems(plays), [], ROUND, seededRng(3));
		expect(round).toHaveLength(ROUND);
	});

	it('gives the applied reserve its slots on a big due set, on chords the carded half then skips', () => {
		const rng = seededRng(5);
		const symbols = seventhChordSymbols().slice(0, 20);
		const carded = cardsToQueueItems(
			symbols.flatMap((symbol) => chordCards(symbol, ['formula'], State.Review))
		);
		const synthetic: HybridQueueItem[] = [
			...syntheticInversionItems(symbols, 6, rng),
			...syntheticChordScaleItems(symbols, 6, rng),
			...syntheticProgressionItems(2, rng)
		];
		const { round, waiting } = planRound(carded, synthetic, ROUND, rng);

		const applied = round.filter((item) => !('card' in item));
		expect(applied).toHaveLength(3);
		// One of each family before a second of any.
		expect(new Set(applied.map((item) => item.family)).size).toBe(3);
		// Every subject in the round is different.
		expect(new Set(round.map(subjectOf)).size).toBe(ROUND);
		// Only the CARDED items left behind count as waiting.
		expect(waiting).toBe(carded.length - (ROUND - 3));
	});

	it('spreads the applied items through the round: never first, never in the last two slots', () => {
		const rng = seededRng(9);
		const symbols = seventhChordSymbols().slice(0, 20);
		const carded = cardsToQueueItems(
			symbols.flatMap((symbol) => chordCards(symbol, ['formula'], State.Review))
		);
		const synthetic = [...syntheticInversionItems(symbols, 6, rng), ...syntheticChordScaleItems(symbols, 6, rng)];
		const { round } = planRound(carded, synthetic, ROUND, rng);
		const appliedAt = round.flatMap((item, index) => ('card' in item ? [] : [index]));

		expect(appliedAt).toHaveLength(3);
		expect(appliedAt[0]).toBeGreaterThan(0);
		expect(appliedAt[appliedAt.length - 1]).toBeLessThan(ROUND - 2);
	});

	it('never takes a small deck\'s chords away from their FSRS reviews', () => {
		const rng = seededRng(2);
		const symbols = ['Cm7', 'Dm7', 'G7'];
		const carded = cardsToQueueItems(
			symbols.flatMap((symbol) => chordCards(symbol, ['formula'], State.Review))
		);
		const synthetic = syntheticInversionItems(symbols, 6, rng);
		const { round, waiting } = planRound(carded, synthetic, ROUND, rng);

		expect(round.filter((item) => 'card' in item)).toHaveLength(3);
		expect(waiting).toBe(0);
		// The room left is spent on applied items reusing those symbols, one each.
		const inversions = round.filter((item) => item.family === 'inversion');
		expect(inversions.length).toBeLessThanOrEqual(3);
		expect(new Set(inversions.map(subjectOf)).size).toBe(inversions.length);
	});

	it('keeps a seeded symbol out of the applied half', () => {
		const rng = seededRng(4);
		const symbols = seventhChordSymbols().slice(0, 20);
		const carded = cardsToQueueItems(
			symbols.slice(1).flatMap((symbol) => chordCards(symbol, ['formula'], State.Review))
		);
		const synthetic = syntheticInversionItems([symbols[0]], 4, rng);
		const { round } = planRound(carded, synthetic, ROUND, rng, {
			excludeSymbols: new Set([symbols[0]])
		});
		expect(round.some((item) => item.family === 'inversion')).toBe(false);
	});

	it('a non-positive target plans an empty round with every carded item waiting', () => {
		const carded = cardsToQueueItems(chordCards('C', CLUSTER));
		expect(planRound(carded, [], 0, seededRng(1))).toEqual({ round: [], waiting: 3 });
		expect(planRound(carded, [], Number.NaN, seededRng(1))).toEqual({ round: [], waiting: 3 });
	});

	it('keeps the cold-session guard: a low-mastery round never opens on a scaffold-heavy item', () => {
		const rng = seededRng(6);
		const carded = cardsToQueueItems(chordCards('C', ['formula']));
		const { round } = planRound(carded, syntheticProgressionItems(2, rng), ROUND, rng, {
			lowMastery: true
		});
		expect(SCAFFOLD_HEAVY.has(round[0].family)).toBe(false);
	});
});

describe('progressionTemplateTaught', () => {
	it('needs every quality the template uses', () => {
		expect(progressionTemplateTaught('major-ii-V-I', new Set(['m7', '7', 'maj7']))).toBe(true);
		expect(progressionTemplateTaught('major-ii-V-I', new Set(['m7', '7']))).toBe(false);
		expect(progressionTemplateTaught('minor-ii-V-i', new Set(['m7', '7', 'maj7']))).toBe(false);
		expect(progressionTemplateTaught('nope', new Set(['m7', '7', 'maj7', 'm7b5']))).toBe(false);
	});

	it('restricts syntheticProgressionItems to the templates it accepts', () => {
		const items = syntheticProgressionItems(20, seededRng(1), (templateId) =>
			progressionTemplateTaught(templateId, new Set(['m7', '7', 'maj7']))
		);
		expect(items.length).toBeGreaterThan(0);
		expect(items.every((item) => item.templateId !== 'minor-ii-V-i')).toBe(true);
		expect(syntheticProgressionItems(5, seededRng(1), () => false)).toEqual([]);
	});
});
