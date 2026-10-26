import { beforeEach, describe, expect, it } from 'vitest';
import { newCard } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';
import { TIER_SEEN_KEY, takeUnlockMoment, tierPath } from './tierPath';
import { itemsForTier } from './tiers';

const NOW = new Date('2026-10-26T12:00:00Z');

function card(symbol: string, masteryDayCount: number): CardRecord {
	return {
		...newCard(NOW),
		factId: `chord-formula:${symbol}`,
		factKind: 'chord-formula',
		mode: 'see-play',
		lastRating: null,
		masteryDayCount
	};
}

beforeEach(() => {
	localStorage.clear();
});

describe('tierPath', () => {
	it('marks tiers below the current one reached, the current one current, the rest ahead', () => {
		const path = tierPath({ currentTier: 3, unlockedTiers: [1, 2, 3] }, []);
		expect(path.stops.map((stop) => stop.state)).toEqual([
			'reached',
			'reached',
			'current',
			'ahead',
			'ahead',
			'ahead'
		]);
	});

	it('keeps a tier reached before a move back down as reached, not ahead', () => {
		const path = tierPath({ currentTier: 1, unlockedTiers: [1, 2] }, []);
		expect(path.stops[1].state).toBe('reached');
	});

	it('fills the bar from the mastered chords the tier gate opens on', () => {
		const symbols = itemsForTier(1);
		// 14 chords, the gate opens at 80%: 12 needed.
		const cards = symbols.slice(0, 6).map((symbol) => card(symbol, 2));
		cards.push(card(symbols[6], 1));
		const path = tierPath({ currentTier: 1, unlockedTiers: [1] }, cards);
		expect(path.needed).toBe(12);
		expect(path.mastered).toBe(6);
		expect(path.percent).toBe(50);
		expect(path.top).toBe(false);
	});

	it('reads full, never overflowing, once a tier is past its gate', () => {
		const cards = itemsForTier(1).map((symbol) => card(symbol, 3));
		expect(tierPath({ currentTier: 1, unlockedTiers: [1] }, cards).percent).toBe(100);
	});

	it('knows the last rung has nothing further to fill toward', () => {
		expect(tierPath({ currentTier: 6, unlockedTiers: [1, 2, 3, 4, 5, 6] }, []).top).toBe(true);
	});
});

describe('takeUnlockMoment', () => {
	it('records the first visit without celebrating it', () => {
		expect(takeUnlockMoment(2)).toBeNull();
		expect(localStorage.getItem(TIER_SEEN_KEY)).toBe('2');
	});

	it('celebrates a new tier exactly once', () => {
		takeUnlockMoment(1);
		expect(takeUnlockMoment(2)).toBe(2);
		expect(takeUnlockMoment(2)).toBeNull();
	});

	it('never celebrates a tier twice after a move down and back up', () => {
		takeUnlockMoment(1);
		expect(takeUnlockMoment(3)).toBe(3);
		expect(takeUnlockMoment(1)).toBeNull();
		expect(takeUnlockMoment(3)).toBeNull();
	});
});
