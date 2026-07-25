import { describe, expect, it } from 'vitest';
import { Rating, State } from '$lib/srs/scheduler';
import type { CardRecord, Mode } from '$lib/srs/deck';
import {
	familyForCard,
	cardsToQueueItems,
	syntheticVoicingItems,
	syntheticProgressionItems,
	composePracticeQueue,
	advanceHybridQueue,
	filterVoicingsBySong,
	familiesInQueue,
	hybridSessionRemaining,
	isHybridSessionComplete,
	type CardedQueueItem,
	type VoicingQueueItem,
	type ProgressionQueueItem,
	type HybridQueueItem
} from './practiceQueue';
import { seventhChordSymbols } from './shellVoicing';

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

	it("returns 'name-it' for chord-formula + 'see-play' mode", () => {
		const card = makeCardRecord({ factKind: 'chord-formula', mode: 'see-play' });
		expect(familyForCard(card)).toBe('name-it');
	});

	it("returns 'name-it' for chord-formula + 'hear-name' mode", () => {
		const card = makeCardRecord({ factKind: 'chord-formula', mode: 'hear-name' });
		expect(familyForCard(card)).toBe('name-it');
	});

	it("returns 'interval' for interval-size regardless of mode", () => {
		const card = makeCardRecord({
			factId: 'interval-size:M3',
			factKind: 'interval-size',
			mode: 'formula'
		});
		expect(familyForCard(card)).toBe('interval');
	});

	it('returns null for scale-degree (scales practice is Phase 28)', () => {
		const card = makeCardRecord({
			factId: 'scale-degree:C:1',
			factKind: 'scale-degree',
			mode: 'formula'
		});
		expect(familyForCard(card)).toBeNull();
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
	it('preserves input order and drops excluded (null-family) cards', () => {
		const cards: CardRecord[] = [
			makeCardRecord({ factId: 'chord-formula:Cm7', factKind: 'chord-formula', mode: 'formula' }),
			makeCardRecord({ factId: 'scale-degree:C:1', factKind: 'scale-degree', mode: 'formula' }),
			makeCardRecord({ factId: 'interval-size:M3', factKind: 'interval-size', mode: 'formula' })
		];
		const items = cardsToQueueItems(cards);
		expect(items.map((item) => item.factId)).toEqual(['chord-formula:Cm7', 'interval-size:M3']);
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
});

describe('filterVoicingsBySong', () => {
	it('restricts voicing items by the song predicate', () => {
		const items: VoicingQueueItem[] = [makeVoicing('Cmaj7'), makeVoicing('Dmaj7'), makeVoicing('Emaj7')];
		const filtered = filterVoicingsBySong(items, (symbol) => symbol === 'Dmaj7');
		expect(filtered.map((item) => item.symbol)).toEqual(['Dmaj7']);
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
