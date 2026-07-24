import { describe, expect, it } from 'vitest';
import { State } from '$lib/srs/scheduler';
import type { CardRecord, Mode } from '$lib/srs/deck';
import { familyForCard, cardsToQueueItems, syntheticVoicingItems, syntheticProgressionItems } from './practiceQueue';
import { seventhChordSymbols } from './shellVoicing';

/**
 * TDD suite for the pure hybrid-queue composer (HYBRID queue model, 27-01
 * PLAN). Task 1 covers types + card-to-item mapping + synthetic-item
 * builders (familyForCard, cardsToQueueItems, syntheticVoicingItems,
 * syntheticProgressionItems). Task 2 (composePracticeQueue,
 * advanceHybridQueue, filterCardedBySong, filterVoicingsBySong,
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
