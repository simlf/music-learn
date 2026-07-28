import { beforeEach, describe, expect, it } from 'vitest';
import type { CardRecord } from '$lib/srs/deck';
import { State } from '$lib/srs/scheduler';
import { chordFormulaFactId } from '$lib/srs/facts';
import {
	LEVEL_KEY,
	MASTERY_DAY_COUNT,
	getLevelState,
	setCurrentTier,
	tierMastered,
	earnedTier,
	advanceTierOnMastery
} from './levelState';
import { itemsForTier } from './tiers';

beforeEach(() => {
	localStorage.clear();
});

/** A formula-mode CardRecord for one chord symbol at a given mastery day count. */
function formulaCard(symbol: string, masteryDayCount: number): CardRecord {
	return {
		factId: chordFormulaFactId(symbol),
		factKind: 'chord-formula',
		mode: 'formula',
		due: new Date('2026-07-20T00:00:00.000Z'),
		stability: 5,
		difficulty: 5,
		elapsed_days: 1,
		scheduled_days: 3,
		learning_steps: 0,
		reps: 3,
		lapses: 0,
		state: State.Review,
		last_review: new Date('2026-07-17T00:00:00.000Z'),
		lastRating: 3,
		masteryDayCount
	};
}

/** Every chord of `tier` mastered at MASTERY_DAY_COUNT. */
function masteredTierCards(tier: 1 | 2 | 3 | 4): CardRecord[] {
	return itemsForTier(tier).map((symbol) => formulaCard(symbol, MASTERY_DAY_COUNT));
}

describe('getLevelState defaults and persistence', () => {
	it('defaults to tier 1 with only tier 1 unlocked', () => {
		expect(getLevelState()).toEqual({ currentTier: 1, unlockedTiers: [1] });
	});

	it('resets corrupt storage to the default without throwing', () => {
		localStorage.setItem(LEVEL_KEY, '{broken');
		expect(getLevelState()).toEqual({ currentTier: 1, unlockedTiers: [1] });
	});

	it('resets a stored locked tier (5 or 6) to the default', () => {
		localStorage.setItem(LEVEL_KEY, JSON.stringify({ currentTier: 5, unlockedTiers: [1, 5] }));
		expect(getLevelState().currentTier).toBe(1);
	});

	it('a legacy record carrying the removed snooze field still loads (extra keys are ignored)', () => {
		localStorage.setItem(
			LEVEL_KEY,
			JSON.stringify({
				currentTier: 3,
				unlockedTiers: [1, 2, 3],
				snooze: { tier: 4, snoozedOn: '2026-07-14' }
			})
		);
		expect(getLevelState().currentTier).toBe(3);
		expect(getLevelState().unlockedTiers).toEqual([1, 2, 3]);
	});
});

describe('setCurrentTier (manual override)', () => {
	it('sets the tier and records everything up to it as reached', () => {
		const state = setCurrentTier(3);
		expect(state.currentTier).toBe(3);
		expect(state.unlockedTiers).toEqual([1, 2, 3]);
		expect(getLevelState().currentTier).toBe(3);
	});

	it('moving back DOWN lowers the current tier but keeps the reached set (additive)', () => {
		setCurrentTier(4);
		const state = setCurrentTier(2);
		expect(state.currentTier).toBe(2);
		// unlockedTiers is the record of what has already been offered, so it
		// never shrinks: that is what makes a deliberate step down stick
		// against the next mastery check.
		expect(state.unlockedTiers).toEqual([1, 2, 3, 4]);
	});

	it('ignores locked tiers 5 and 6', () => {
		setCurrentTier(3);
		const state = setCurrentTier(5 as 1);
		expect(state.currentTier).toBe(3);
	});
});

describe('tierMastered (deck-derived, offline, no server)', () => {
	it('is false on an empty deck', () => {
		expect(tierMastered(1, [])).toBe(false);
	});

	it('is true once every chord of the tier has a formula card at masteryDayCount 2', () => {
		expect(tierMastered(1, masteredTierCards(1))).toBe(true);
	});

	it('is false when a single chord of the tier is one day short', () => {
		const cards = masteredTierCards(1);
		cards[cards.length - 1] = formulaCard(itemsForTier(1)[itemsForTier(1).length - 1], 1);
		expect(tierMastered(1, cards)).toBe(false);
	});

	it('is false when a chord of the tier has no card at all', () => {
		expect(tierMastered(1, masteredTierCards(1).slice(0, -1))).toBe(false);
	});

	it('ignores non-formula modes: a mastered see-play card does not count', () => {
		const cards = itemsForTier(1).map((symbol) => ({
			...formulaCard(symbol, MASTERY_DAY_COUNT),
			mode: 'see-play' as const
		}));
		expect(tierMastered(1, cards)).toBe(false);
	});

	it('mastering tier 1 does not master tier 2 (tier 2 adds accidental roots and dim)', () => {
		const cards = masteredTierCards(1);
		expect(tierMastered(1, cards)).toBe(true);
		expect(tierMastered(2, cards)).toBe(false);
	});

	it('a locked tier is never mastered, however much evidence exists', () => {
		expect(tierMastered(5 as 1, masteredTierCards(4))).toBe(false);
	});

	it('MASTERY_DAY_COUNT is 2, the same successive-relearning gate deriveCellState uses', () => {
		expect(MASTERY_DAY_COUNT).toBe(2);
	});
});

describe('earnedTier (pure progression)', () => {
	it('stays put with no evidence', () => {
		expect(earnedTier({ currentTier: 1, unlockedTiers: [1] }, [])).toBe(1);
	});

	it('climbs one rung when the current tier is mastered', () => {
		expect(earnedTier({ currentTier: 1, unlockedTiers: [1] }, masteredTierCards(1))).toBe(2);
	});

	it('climbs multiple rungs in one pass when several tiers are already mastered', () => {
		const cards = [...masteredTierCards(1), ...masteredTierCards(2), ...masteredTierCards(3)];
		expect(earnedTier({ currentTier: 1, unlockedTiers: [1] }, cards)).toBe(4);
	});

	it('never climbs past tier 4 while tiers 5 and 6 are locked', () => {
		const cards = [
			...masteredTierCards(1),
			...masteredTierCards(2),
			...masteredTierCards(3),
			...masteredTierCards(4)
		];
		expect(earnedTier({ currentTier: 4, unlockedTiers: [1, 2, 3, 4] }, cards)).toBe(4);
	});

	it('never descends, even with no mastery evidence at the current tier', () => {
		expect(earnedTier({ currentTier: 3, unlockedTiers: [1, 2, 3] }, [])).toBe(3);
	});

	it('respects a deliberate step back down: a tier already reached is not re-granted', () => {
		// The user climbed to 2, then chose to go back to 1. Tier 1 is
		// mastered, but tier 2 has already been offered, so nothing changes.
		const state = { currentTier: 1 as const, unlockedTiers: [1, 2] as (1 | 2)[] };
		expect(earnedTier(state, masteredTierCards(1))).toBe(1);
	});
});

describe('advanceTierOnMastery (the introduceNewCards hook)', () => {
	it('leaves storage untouched when nothing was earned', () => {
		const state = advanceTierOnMastery([]);
		expect(state.currentTier).toBe(1);
		expect(localStorage.getItem(LEVEL_KEY)).toBeNull();
	});

	it('persists the earned tier so /progress reflects it without any prompt', () => {
		const state = advanceTierOnMastery(masteredTierCards(1));
		expect(state.currentTier).toBe(2);
		expect(getLevelState().currentTier).toBe(2);
		expect(getLevelState().unlockedTiers).toEqual([1, 2]);
	});

	it('is idempotent: a second call with the same evidence does not climb again', () => {
		advanceTierOnMastery(masteredTierCards(1));
		const second = advanceTierOnMastery(masteredTierCards(1));
		expect(second.currentTier).toBe(2);
	});

	it('honours a manual jump ahead: mastery of a lower tier never pulls the tier back down', () => {
		setCurrentTier(4);
		expect(advanceTierOnMastery(masteredTierCards(1)).currentTier).toBe(4);
	});
});
