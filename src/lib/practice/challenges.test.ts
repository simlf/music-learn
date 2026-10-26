import { describe, expect, it } from 'vitest';
import { factById } from '$lib/srs/facts';
import { spellChord } from '$lib/theory/chord';
import { chromaOf } from '$lib/theory/interval';
import {
	CHALLENGE_IDS,
	MAX_MULTIPLIER,
	challengeOrder,
	challengePool,
	chipQuestion,
	comboMultiplier,
	dayNumber,
	formatClock,
	keyClimbQuality,
	keyClimbStops,
	reachedQualities,
	reachedTiers
} from './challenges';
import { itemsForTier } from './tiers';

describe('comboMultiplier', () => {
	it('climbs one step every three right answers in a row and stops at the cap', () => {
		expect([1, 2, 3].map(comboMultiplier)).toEqual([1, 1, 1]);
		expect([4, 5, 6].map(comboMultiplier)).toEqual([2, 2, 2]);
		expect(comboMultiplier(7)).toBe(3);
		expect(comboMultiplier(10)).toBe(MAX_MULTIPLIER);
		expect(comboMultiplier(500)).toBe(MAX_MULTIPLIER);
	});

	it('is x1 with no streak at all, so a miss only ever resets it', () => {
		expect(comboMultiplier(0)).toBe(1);
		expect(comboMultiplier(-3)).toBe(1);
	});
});

describe('daily rotation', () => {
	it('moves today\'s pick to the next challenge each day and keeps every challenge in the list', () => {
		const picks = ['2026-10-26', '2026-10-27', '2026-10-28'].map((date) => challengeOrder(date));
		for (const order of picks) expect([...order].sort()).toEqual([...CHALLENGE_IDS].sort());
		expect(new Set(picks.map((order) => order[0])).size).toBe(3);
	});

	it('wraps across month and year boundaries without skipping', () => {
		expect(dayNumber('2027-01-01') - dayNumber('2026-12-31')).toBe(1);
		expect(dayNumber('2026-03-01') - dayNumber('2026-02-28')).toBe(1);
	});

	it('treats a malformed date as day 0 rather than throwing', () => {
		expect(dayNumber('not a date')).toBe(0);
		expect(challengeOrder('nope')).toEqual([...CHALLENGE_IDS]);
	});
});

describe('what a challenge draws from', () => {
	it('only ever draws chords from tiers the user has reached', () => {
		const level = { currentTier: 1 as const, unlockedTiers: [1 as const] };
		expect(reachedTiers(level)).toEqual([1]);
		expect(challengePool(level).sort()).toEqual(itemsForTier(1).sort());
	});

	it('keeps a tier reached before a deliberate move back down', () => {
		const level = { currentTier: 2 as const, unlockedTiers: [1, 2, 3] as (1 | 2 | 3)[] };
		expect(reachedTiers(level)).toEqual([1, 2, 3]);
		expect(challengePool(level)).toContain('Cmaj7');
	});

	it('rotates the key climb through the reached qualities, one per day', () => {
		const level = { currentTier: 3 as const, unlockedTiers: [1, 2, 3] as (1 | 2 | 3)[] };
		const qualities = reachedQualities(level);
		expect(qualities).toEqual(['', 'm', 'dim', 'maj7', 'm7', '7']);
		const start = '2026-10-26';
		const seen = new Set<string>();
		for (let offset = 0; offset < qualities.length; offset++) {
			const date = new Date(Date.UTC(2026, 9, 26 + offset)).toISOString().slice(0, 10);
			seen.add(keyClimbQuality(date, level));
		}
		expect(seen.size).toBe(qualities.length);
		expect(qualities).toContain(keyClimbQuality(start, level));
	});
});

describe('keyClimbStops', () => {
	it('walks all twelve keys in falling fifths from C, each one a catalog chord', () => {
		const stops = keyClimbStops('m7');
		expect(stops).toHaveLength(12);
		expect(stops.slice(0, 4)).toEqual(['Cm7', 'Fm7', 'Bbm7', 'Ebm7']);
		expect(new Set(stops.map((symbol) => chromaOf(spellChord(symbol).notes[0].letter))).size).toBe(12);
		for (const symbol of stops) expect(factById(`chord-formula:${symbol}`)).toBeDefined();
	});

	it('spells major triads with no quality suffix', () => {
		expect(keyClimbStops('')[0]).toBe('C');
	});
});

describe('chipQuestion', () => {
	it('offers the answer among four distinct same-root choices', () => {
		const pool = itemsForTier(3);
		for (let i = 0; i < 25; i++) {
			const question = chipQuestion(pool);
			expect(question).toBeDefined();
			expect(question!.choices).toHaveLength(4);
			expect(new Set(question!.choices).size).toBe(4);
			expect(question!.choices).toContain(question!.symbol);
			const root = spellChord(question!.symbol).root;
			for (const choice of question!.choices) expect(spellChord(choice).root).toBe(root);
		}
	});

	it('never repeats the previous chord when the pool has another', () => {
		for (let i = 0; i < 25; i++) {
			expect(chipQuestion(['C', 'Dm'], 'C')!.symbol).toBe('Dm');
		}
		expect(chipQuestion(['C'], 'C')!.symbol).toBe('C');
	});

	it('is undefined for an empty pool', () => {
		expect(chipQuestion([])).toBeUndefined();
	});
});

describe('formatClock', () => {
	it('reads minutes and zero-padded seconds, floored', () => {
		expect(formatClock(0)).toBe('0:00');
		expect(formatClock(7_900)).toBe('0:07');
		expect(formatClock(67_000)).toBe('1:07');
		expect(formatClock(-5)).toBe('0:00');
	});
});
