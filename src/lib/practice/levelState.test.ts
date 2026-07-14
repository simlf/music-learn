import { beforeEach, describe, expect, it } from 'vitest';
import type { StatItem } from '$lib/api/progress';
import type { LoggedAnswer } from './practiceLog';
import {
	LEVEL_KEY,
	UNLOCK_CRITERIA,
	getLevelState,
	setCurrentTier,
	snoozeSuggestion,
	isSnoozed,
	checkUnlock
} from './levelState';

beforeEach(() => {
	localStorage.clear();
});

function chordStat(item: string, attempts: number, accuracy: number): StatItem {
	return { item, kind: 'chord', attempts, accuracy, needsPractice: false };
}

/** Tier 1 stats fixture passing lifetime (40) and both per-quality floors. */
function passingTier1Stats(): StatItem[] {
	return [chordStat('C', 20, 0.9), chordStat('Cm', 20, 0.85)];
}

/**
 * Builds `total` tier-1 log answers across two dates with `correctCount`
 * correct, all cold (assisted: false) unless assistedCount is given (those
 * are appended as extra assisted entries).
 */
function tier1Log(total: number, correctCount: number, days: string[] = ['2026-07-13', '2026-07-14']): LoggedAnswer[] {
	const log: LoggedAnswer[] = [];
	for (let i = 0; i < total; i++) {
		log.push({
			item: i % 2 === 0 ? 'C' : 'Cm',
			correct: i < correctCount,
			assisted: false,
			date: days[i % days.length]
		});
	}
	return log;
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
});

describe('setCurrentTier (manual override)', () => {
	it('sets the tier and unlocks everything up to it', () => {
		const state = setCurrentTier(3);
		expect(state.currentTier).toBe(3);
		expect(state.unlockedTiers).toEqual([1, 2, 3]);
		expect(getLevelState().currentTier).toBe(3);
	});

	it('re-locking to a lower tier shrinks the unlocked set', () => {
		setCurrentTier(4);
		const state = setCurrentTier(2);
		expect(state.currentTier).toBe(2);
		expect(state.unlockedTiers).toEqual([1, 2]);
	});

	it('ignores locked tiers 5 and 6', () => {
		setCurrentTier(3);
		const state = setCurrentTier(5 as 1);
		expect(state.currentTier).toBe(3);
	});
});

describe('snooze (Not yet, 3 practice days)', () => {
	it('records the snoozed tier and date', () => {
		const state = snoozeSuggestion(2, '2026-07-14');
		expect(state.snooze).toEqual({ tier: 2, snoozedOn: '2026-07-14' });
	});

	it('isSnoozed is true under 3 practice days since snooze, false at 3', () => {
		const state = snoozeSuggestion(2, '2026-07-14');
		expect(isSnoozed(state, 2, 0)).toBe(true);
		expect(isSnoozed(state, 2, 2)).toBe(true);
		expect(isSnoozed(state, 2, 3)).toBe(false);
	});

	it('a snooze for one tier does not silence another tier', () => {
		const state = snoozeSuggestion(2, '2026-07-14');
		expect(isSnoozed(state, 3, 0)).toBe(false);
	});
});

describe('checkUnlock criteria edges (R3 exact numbers)', () => {
	it('29 rolling answers is not enough even at 100% accuracy', () => {
		const check = checkUnlock({
			tier: 1,
			stats: passingTier1Stats(),
			log: tier1Log(29, 29)
		});
		expect(check.rollingCount).toBe(29);
		expect(check.eligible).toBe(false);
	});

	it('30 rolling answers at 26/30 (86.7%) with all floors passing is eligible', () => {
		const check = checkUnlock({
			tier: 1,
			stats: passingTier1Stats(),
			log: tier1Log(30, 26)
		});
		expect(check.rollingCount).toBe(30);
		expect(check.rollingAccuracy).toBeCloseTo(26 / 30);
		expect(check.eligible).toBe(true);
		expect(check.nextTier).toBe(2);
	});

	it('30 rolling answers at 25/30 (83.3%) fails the 85% bar', () => {
		const check = checkUnlock({
			tier: 1,
			stats: passingTier1Stats(),
			log: tier1Log(30, 25)
		});
		expect(check.eligible).toBe(false);
	});

	it('only the LAST 30 tier answers count for the rolling window', () => {
		// 10 old misses followed by 30 straight correct: window is the 30 correct.
		const log = [...tier1Log(10, 0), ...tier1Log(30, 30)];
		const check = checkUnlock({ tier: 1, stats: passingTier1Stats(), log });
		expect(check.rollingCount).toBe(30);
		expect(check.rollingAccuracy).toBe(1);
		expect(check.eligible).toBe(true);
	});

	it('a per-quality floor below 8 attempts blocks the unlock', () => {
		const stats = [chordStat('C', 33, 0.9), chordStat('Cm', 7, 0.9)];
		const check = checkUnlock({ tier: 1, stats, log: tier1Log(30, 30) });
		const minorQuality = check.perQuality.find((entry) => entry.quality === 'm');
		expect(minorQuality?.passing).toBe(false);
		expect(check.eligible).toBe(false);
	});

	it('a per-quality accuracy below 75% blocks the unlock', () => {
		const stats = [chordStat('C', 20, 0.9), chordStat('Cm', 20, 0.7)];
		const check = checkUnlock({ tier: 1, stats, log: tier1Log(30, 30) });
		expect(check.eligible).toBe(false);
	});

	it('fewer than 40 lifetime tier attempts blocks the unlock', () => {
		const stats = [chordStat('C', 20, 0.9), chordStat('Cm', 15, 0.9)];
		const check = checkUnlock({ tier: 1, stats, log: tier1Log(30, 30) });
		expect(check.lifetimeAttempts).toBe(35);
		expect(check.eligible).toBe(false);
	});

	it('a single practice day blocks the unlock (needs 2 distinct days)', () => {
		const check = checkUnlock({
			tier: 1,
			stats: passingTier1Stats(),
			log: tier1Log(30, 30, ['2026-07-14'])
		});
		expect(check.distinctDays).toBe(1);
		expect(check.eligible).toBe(false);
	});

	it('assisted answers are excluded from the rolling window entirely', () => {
		const log = tier1Log(29, 29);
		// A 30th answer that was assisted must NOT complete the window.
		log.push({ item: 'C', correct: true, assisted: true, date: '2026-07-14' });
		const check = checkUnlock({ tier: 1, stats: passingTier1Stats(), log });
		expect(check.rollingCount).toBe(29);
		expect(check.eligible).toBe(false);
	});

	it('answers for items outside the tier are ignored (tier-scoped window)', () => {
		const log = tier1Log(30, 26);
		// Above-tier song chords (m7b5) never count toward tier 1 unlock stats.
		for (let i = 0; i < 10; i++) {
			log.push({ item: 'F#m7b5', correct: false, assisted: false, date: '2026-07-14' });
		}
		const check = checkUnlock({ tier: 1, stats: passingTier1Stats(), log });
		expect(check.rollingCount).toBe(30);
		expect(check.rollingAccuracy).toBeCloseTo(26 / 30);
		expect(check.eligible).toBe(true);
	});

	it('is never eligible with no stats (server unreachable or tokenless)', () => {
		const check = checkUnlock({ tier: 1, stats: null, log: tier1Log(30, 30) });
		expect(check.eligible).toBe(false);
	});

	it('tier 4 has no unlockable next tier while 5 is locked', () => {
		const stats = [
			...['C', 'Db', 'D', 'Eb'].map((root) => chordStat(`${root}m7b5`, 10, 0.9)),
			...['C', 'Db', 'D', 'Eb'].map((root) => chordStat(`${root}dim7`, 10, 0.9))
		];
		const log: LoggedAnswer[] = [];
		for (let i = 0; i < 30; i++) {
			log.push({
				item: i % 2 === 0 ? 'Cm7b5' : 'Cdim7',
				correct: true,
				assisted: false,
				date: i % 2 === 0 ? '2026-07-13' : '2026-07-14'
			});
		}
		const check = checkUnlock({ tier: 4, stats, log });
		expect(check.nextTier).toBeNull();
		expect(check.eligible).toBe(false);
	});
});

describe('UNLOCK_CRITERIA constants', () => {
	it('pins the exact R3 numbers', () => {
		expect(UNLOCK_CRITERIA).toEqual({
			rollingWindow: 30,
			rollingAccuracyMin: 0.85,
			minLifetimeAttempts: 40,
			perQualityMinAttempts: 8,
			perQualityAccuracyMin: 0.75,
			minDistinctDays: 2,
			snoozePracticeDays: 3
		});
	});
});
