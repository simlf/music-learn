import { beforeEach, describe, expect, it } from 'vitest';
import {
	DAILY_SESSION_KEY,
	DAILY_TARGET,
	answeredToday,
	applyAnswer,
	emptyDay,
	isDoneToday,
	isYesterday,
	localDay,
	markDoneToday,
	previousLocalDay,
	previousSummary,
	readDailySession,
	recordDailyAnswer,
	remainingDailyTarget,
	rollOver,
	todaySummary,
	type DaySummary
} from './dailySession';

/**
 * B1/B2/B5: the bounded daily session's persisted ledger. Covers the pure
 * folds (applyAnswer, rollOver) independently of storage, then the stored
 * accessors, the calendar rollover, and the defensive-parsing contract every
 * `music-learn:*` store in this app shares.
 */

const MONDAY = new Date(2026, 6, 27, 9, 0, 0); // 2026-07-27, local time
const TUESDAY = new Date(2026, 6, 28, 9, 0, 0); // 2026-07-28, local time

beforeEach(() => {
	localStorage.clear();
});

describe('localDay / previousLocalDay / isYesterday', () => {
	it('formats the LOCAL calendar day, zero-padded, never UTC-shifted', () => {
		// 23:30 local on the 27th is already the 28th in UTC for a positive
		// offset: toISOString would report the wrong day, localDay must not.
		expect(localDay(new Date(2026, 6, 27, 23, 30, 0))).toBe('2026-07-27');
		expect(localDay(new Date(2026, 0, 5, 0, 5, 0))).toBe('2026-01-05');
	});

	it('previousLocalDay crosses month and year boundaries via Date arithmetic', () => {
		expect(previousLocalDay(new Date(2026, 7, 1, 12, 0, 0))).toBe('2026-07-31');
		expect(previousLocalDay(new Date(2026, 0, 1, 12, 0, 0))).toBe('2025-12-31');
	});

	it('isYesterday is true only for the calendar day immediately before now', () => {
		expect(isYesterday('2026-07-27', TUESDAY)).toBe(true);
		expect(isYesterday('2026-07-26', TUESDAY)).toBe(false);
		expect(isYesterday('2026-07-28', TUESDAY)).toBe(false);
	});
});

describe('applyAnswer (pure fold)', () => {
	it('counts a correct answer, grows the run, and tracks the best run', () => {
		let day = emptyDay('2026-07-28');
		day = applyAnswer(day, { correct: true });
		day = applyAnswer(day, { correct: true });
		expect(day).toMatchObject({ answered: 2, correct: 2, streak: 2, bestStreak: 2, missed: [] });
	});

	it('a miss resets the live run, keeps the best run, and records the label once', () => {
		let day = emptyDay('2026-07-28');
		day = applyAnswer(day, { correct: true });
		day = applyAnswer(day, { correct: true });
		day = applyAnswer(day, { correct: false, label: 'F#ø7' });
		expect(day).toMatchObject({ answered: 3, correct: 2, streak: 0, bestStreak: 2 });
		expect(day.missed).toEqual(['F#ø7']);

		// Same item missed again later: listed once, in first-miss order.
		day = applyAnswer(day, { correct: false, label: 'Cm7b5' });
		day = applyAnswer(day, { correct: false, label: 'F#ø7' });
		expect(day.missed).toEqual(['F#ø7', 'Cm7b5']);
	});

	it('a later correct answer on a missed item keeps the miss listed (honest ledger)', () => {
		let day = applyAnswer(emptyDay('2026-07-28'), { correct: false, label: 'G7' });
		day = applyAnswer(day, { correct: true, label: 'G7' });
		expect(day.missed).toEqual(['G7']);
		expect(day.correct).toBe(1);
	});

	it('never mutates its input and ignores an empty/absent label', () => {
		const day = emptyDay('2026-07-28');
		const next = applyAnswer(day, { correct: false, label: '' });
		expect(day.answered).toBe(0);
		expect(next.missed).toEqual([]);
	});

	it('never flips `done` on its own', () => {
		const day = applyAnswer(emptyDay('2026-07-28'), { correct: true });
		expect(day.done).toBe(false);
	});
});

describe('rollOver (pure calendar rollover)', () => {
	const monday: DaySummary = { ...emptyDay('2026-07-27'), answered: 12, correct: 10 };

	it('keeps a same-day ledger as today', () => {
		expect(rollOver({ today: monday }, '2026-07-27')).toEqual({ today: monday, previous: undefined });
	});

	it('demotes a stale today to previous and starts today fresh', () => {
		expect(rollOver({ today: monday }, '2026-07-28')).toEqual({ previous: monday });
	});

	it('a stale today replaces an older previous (it is the more recent practice day)', () => {
		const older: DaySummary = { ...emptyDay('2026-07-20'), answered: 3 };
		expect(rollOver({ today: monday, previous: older }, '2026-07-28')).toEqual({ previous: monday });
	});

	it('drops nothing when there is no today at all', () => {
		expect(rollOver({ previous: monday }, '2026-07-28')).toEqual({ previous: monday });
	});
});

describe('stored ledger', () => {
	it('starts empty: nothing answered, nothing done, the full target owed', () => {
		expect(readDailySession(TUESDAY)).toEqual({ today: undefined, previous: undefined });
		expect(answeredToday(TUESDAY)).toBe(0);
		expect(isDoneToday(TUESDAY)).toBe(false);
		expect(remainingDailyTarget(TUESDAY)).toBe(DAILY_TARGET);
		expect(previousSummary(TUESDAY)).toBeUndefined();
	});

	it('records answers against today and shrinks the remaining target', () => {
		recordDailyAnswer({ correct: true }, TUESDAY);
		recordDailyAnswer({ correct: false, label: 'Cm7b5' }, TUESDAY);
		expect(answeredToday(TUESDAY)).toBe(2);
		expect(remainingDailyTarget(TUESDAY)).toBe(DAILY_TARGET - 2);
		expect(todaySummary(TUESDAY).missed).toEqual(['Cm7b5']);
	});

	it('never reports a negative remaining target when the user over-practices', () => {
		for (let i = 0; i < DAILY_TARGET + 4; i++) recordDailyAnswer({ correct: true }, TUESDAY);
		expect(remainingDailyTarget(TUESDAY)).toBe(0);
	});

	it('markDoneToday is idempotent and preserves the day counts', () => {
		recordDailyAnswer({ correct: true }, TUESDAY);
		markDoneToday(TUESDAY);
		markDoneToday(TUESDAY);
		expect(isDoneToday(TUESDAY)).toBe(true);
		expect(answeredToday(TUESDAY)).toBe(1);
	});

	it('rolls over at midnight: yesterday becomes previous, today resets, done clears', () => {
		recordDailyAnswer({ correct: true }, MONDAY);
		recordDailyAnswer({ correct: false, label: 'F#ø7' }, MONDAY);
		markDoneToday(MONDAY);

		expect(answeredToday(TUESDAY)).toBe(0);
		expect(isDoneToday(TUESDAY)).toBe(false);
		const yesterday = previousSummary(TUESDAY);
		expect(yesterday?.date).toBe('2026-07-27');
		expect(yesterday?.answered).toBe(2);
		expect(yesterday?.missed).toEqual(['F#ø7']);
	});

	it('a rolled-over day with nothing graded on it is not surfaced as a previous session', () => {
		markDoneToday(MONDAY); // done flagged, zero answers (degenerate)
		expect(previousSummary(TUESDAY)).toBeUndefined();
	});

	it('persists the rollover, so the next read no longer sees a stale today', () => {
		recordDailyAnswer({ correct: true }, MONDAY);
		recordDailyAnswer({ correct: true }, TUESDAY);
		const state = readDailySession(TUESDAY);
		expect(state.today?.date).toBe('2026-07-28');
		expect(state.today?.answered).toBe(1);
		expect(state.previous?.date).toBe('2026-07-27');
	});

	it('treats corrupt storage as an absent ledger rather than throwing', () => {
		localStorage.setItem(DAILY_SESSION_KEY, 'not json at all');
		expect(readDailySession(TUESDAY)).toEqual({ today: undefined, previous: undefined });

		localStorage.setItem(DAILY_SESSION_KEY, JSON.stringify({ today: { date: 5, answered: 'x' } }));
		expect(answeredToday(TUESDAY)).toBe(0);

		localStorage.setItem(DAILY_SESSION_KEY, JSON.stringify([1, 2, 3]));
		expect(isDoneToday(TUESDAY)).toBe(false);
	});

	it('rejects a ledger whose missed list is not all strings', () => {
		localStorage.setItem(
			DAILY_SESSION_KEY,
			JSON.stringify({ today: { ...emptyDay('2026-07-28'), missed: ['Cm7', 7] } })
		);
		expect(readDailySession(TUESDAY).today).toBeUndefined();
	});
});
