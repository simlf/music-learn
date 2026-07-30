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
import { itemsForTier, type TierId } from './tiers';

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
function masteredTierCards(tier: TierId): CardRecord[] {
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

	it('resets a stored out-of-range tier (not a real TierId) to the default', () => {
		// Tiers 5 and 6 are real, available TierIds as of n1-tier-unlock (mastery
		// gates who REACHES them, not this validity check), so a stored
		// currentTier of 5 is now legitimate and no longer resets. Only a value
		// outside 1..6 entirely is still rejected.
		localStorage.setItem(LEVEL_KEY, JSON.stringify({ currentTier: 7, unlockedTiers: [1, 7] }));
		expect(getLevelState().currentTier).toBe(1);
	});

	it('accepts a stored currentTier of 5 or 6 (n1-tier-unlock: no longer locked)', () => {
		localStorage.setItem(LEVEL_KEY, JSON.stringify({ currentTier: 5, unlockedTiers: [1, 5] }));
		expect(getLevelState().currentTier).toBe(5);
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

	it('applies tier 5 or 6 (n1-tier-unlock: no longer locked, manual override reaches every available tier)', () => {
		setCurrentTier(3);
		const state = setCurrentTier(5);
		expect(state.currentTier).toBe(5);
		expect(state.unlockedTiers).toEqual([1, 2, 3, 4, 5]);
	});

	it('ignores a tier id outside the real TierId range', () => {
		setCurrentTier(3);
		const state = setCurrentTier(7 as 1);
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

	it('tier 5 mastery needs its OWN evidence: tier 4 cards alone do not satisfy it (n1-tier-unlock: tier 5 is unlocked, not a permanently-locked id)', () => {
		expect(tierMastered(5, masteredTierCards(4))).toBe(false);
	});

	it('tier 5 is mastered once every one of its own 48 chords clears the mastery gate', () => {
		expect(tierMastered(5, masteredTierCards(5))).toBe(true);
	});

	it('tier 6 is mastered once every one of its own 24 chords clears the mastery gate', () => {
		expect(tierMastered(6, masteredTierCards(6))).toBe(true);
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

	it("THE CORE CONTRACT (n1-tier-unlock): tier 5 opens on tier 4's mastery alone, not on tiers 1 through 4 combined", () => {
		// Tiers 1-3 deliberately carry NO mastery evidence here: the owner's
		// stated unlock rule is "previous tier mastered", specifically so a
		// couple of stubborn chords elsewhere on the ladder can never stall
		// progression indefinitely. Only tier 4's own 24 chords need to clear
		// the gate for tier 5 to open.
		const state = { currentTier: 4 as const, unlockedTiers: [1, 2, 3, 4] as TierId[] };
		expect(earnedTier(state, masteredTierCards(4))).toBe(5);
	});

	it('climbs from 4 all the way to 6 in one pass once tiers 4 and 5 are both mastered', () => {
		const cards = [...masteredTierCards(4), ...masteredTierCards(5)];
		const state = { currentTier: 4 as const, unlockedTiers: [1, 2, 3, 4] as TierId[] };
		expect(earnedTier(state, cards)).toBe(6);
	});

	it('a user who has NOT mastered tier 4 sees ZERO behavior change: stays at 4 exactly as before this task', () => {
		// The migration-safety proof: with no tier-4 mastery evidence at all
		// (or with tier 4 evidence one day short), earnedTier's result for a
		// tier-4 user is identical to what it was before tiers 5/6 existed.
		const noEvidence = { currentTier: 4 as const, unlockedTiers: [1, 2, 3, 4] as TierId[] };
		expect(earnedTier(noEvidence, [])).toBe(4);

		const oneChordShort = masteredTierCards(4);
		oneChordShort[oneChordShort.length - 1] = {
			...oneChordShort[oneChordShort.length - 1],
			masteryDayCount: 1
		};
		expect(earnedTier(noEvidence, oneChordShort)).toBe(4);
	});

	it('stops at tier 5 once mastered but tier 6 is not yet (does not skip ahead without its own evidence)', () => {
		const state = { currentTier: 4 as const, unlockedTiers: [1, 2, 3, 4] as TierId[] };
		expect(earnedTier(state, [...masteredTierCards(4), ...masteredTierCards(5)])).toBe(6);
		// Without tier 5's own mastery, stays at 4 even with tier 6 fully carded
		// (impossible in practice since tier 6 is never introduced before tier
		// 5 is earned, but earnedTier itself is pure evidence-in/tier-out, so
		// this pins that it never "skips ahead" on the wrong evidence).
		expect(earnedTier(state, masteredTierCards(6))).toBe(4);
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
