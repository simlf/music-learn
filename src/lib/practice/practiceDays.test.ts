import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	PRACTICE_DAYS_KEY,
	computeStreakFromDays,
	localStreak,
	practicedOn,
	previousDay,
	readPracticeDays,
	recordPracticeDay
} from './practiceDays';

/**
 * B8 (local-first streak): the device owns the streak, so this module is what
 * makes the masthead chip work with no bearer token and no tailnet. The load-
 * bearing test at the bottom is the parity check against the server's own
 * computeStreak, including its one-day grace: the two numbers are combined
 * with a plain max(), so they must agree on what a streak IS.
 */

beforeEach(() => {
	localStorage.clear();
});

describe('readPracticeDays', () => {
	it('is empty when nothing was ever recorded', () => {
		expect(readPracticeDays()).toEqual([]);
	});

	it('returns days sorted ascending and deduplicated', () => {
		localStorage.setItem(
			PRACTICE_DAYS_KEY,
			JSON.stringify(['2026-07-14', '2026-07-12', '2026-07-14'])
		);
		expect(readPracticeDays()).toEqual(['2026-07-12', '2026-07-14']);
	});

	it('drops malformed entries instead of trusting them', () => {
		localStorage.setItem(
			PRACTICE_DAYS_KEY,
			JSON.stringify(['2026-07-14', 'yesterday', 42, null, '2026-7-1'])
		);
		expect(readPracticeDays()).toEqual(['2026-07-14']);
	});

	it('resets corrupt storage to empty rather than throwing', () => {
		localStorage.setItem(PRACTICE_DAYS_KEY, '{not json');
		expect(readPracticeDays()).toEqual([]);
	});

	it('reads empty when the stored value is not an array', () => {
		localStorage.setItem(PRACTICE_DAYS_KEY, JSON.stringify({ '2026-07-14': true }));
		expect(readPracticeDays()).toEqual([]);
	});
});

describe('recordPracticeDay', () => {
	it('records a day and is idempotent for repeat answers on the same day', () => {
		recordPracticeDay('2026-07-14');
		recordPracticeDay('2026-07-14');
		recordPracticeDay('2026-07-14');
		expect(readPracticeDays()).toEqual(['2026-07-14']);
	});

	it('accumulates distinct days in sorted order regardless of write order', () => {
		recordPracticeDay('2026-07-14');
		recordPracticeDay('2026-07-12');
		recordPracticeDay('2026-07-13');
		expect(readPracticeDays()).toEqual(['2026-07-12', '2026-07-13', '2026-07-14']);
	});

	it('ignores a malformed date rather than poisoning the set', () => {
		recordPracticeDay('not-a-date');
		expect(readPracticeDays()).toEqual([]);
	});

	it('never throws when storage writes fail (quota/disabled)', () => {
		const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('quota exceeded');
		});
		expect(() => recordPracticeDay('2026-07-14')).not.toThrow();
		spy.mockRestore();
	});

	it('caps the stored history, dropping the oldest days first', () => {
		// 405 consecutive days: the cap is 400, so the 5 oldest must be gone.
		let day = '2025-01-01';
		const written: string[] = [];
		for (let i = 0; i < 405; i++) {
			written.push(day);
			recordPracticeDay(day);
			day = nextDay(day);
		}
		const stored = readPracticeDays();
		expect(stored).toHaveLength(400);
		expect(stored[0]).toBe(written[5]);
		expect(stored[399]).toBe(written[404]);
	});
});

/** Day-after helper used only to build a long consecutive run in the cap test. */
function nextDay(date: string): string {
	const [year, month, day] = date.split('-').map(Number);
	const parsed = new Date(Date.UTC(year, month - 1, day));
	parsed.setUTCDate(parsed.getUTCDate() + 1);
	const y = parsed.getUTCFullYear();
	const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
	const d = String(parsed.getUTCDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

describe('previousDay', () => {
	it('steps back one calendar day', () => {
		expect(previousDay('2026-07-14')).toBe('2026-07-13');
	});

	it('crosses a month boundary', () => {
		expect(previousDay('2026-07-01')).toBe('2026-06-30');
	});

	it('crosses a year boundary', () => {
		expect(previousDay('2026-01-01')).toBe('2025-12-31');
	});

	it('handles a leap day', () => {
		expect(previousDay('2028-03-01')).toBe('2028-02-29');
	});
});

describe('computeStreakFromDays', () => {
	it('is 0 with no practice at all', () => {
		expect(computeStreakFromDays([], '2026-07-14')).toBe(0);
	});

	it('is 1 on the first ever practice day', () => {
		expect(computeStreakFromDays(['2026-07-14'], '2026-07-14')).toBe(1);
	});

	it('counts a consecutive run ending today', () => {
		const days = ['2026-07-11', '2026-07-12', '2026-07-13', '2026-07-14'];
		expect(computeStreakFromDays(days, '2026-07-14')).toBe(4);
	});

	it('stops at the first gap, ignoring older runs', () => {
		const days = ['2026-07-01', '2026-07-02', '2026-07-13', '2026-07-14'];
		expect(computeStreakFromDays(days, '2026-07-14')).toBe(2);
	});

	it('keeps the streak alive through the one-day grace when today is not practiced yet', () => {
		const days = ['2026-07-12', '2026-07-13'];
		expect(computeStreakFromDays(days, '2026-07-14')).toBe(2);
	});

	it('resets to 0 once the gap exceeds one day', () => {
		const days = ['2026-07-01', '2026-07-02', '2026-07-03'];
		expect(computeStreakFromDays(days, '2026-07-14')).toBe(0);
	});

	it('is unaffected by duplicate day entries', () => {
		const days = ['2026-07-13', '2026-07-13', '2026-07-14', '2026-07-14'];
		expect(computeStreakFromDays(days, '2026-07-14')).toBe(2);
	});
});

describe('localStreak / practicedOn (storage-backed, no token, no network)', () => {
	it('reports the streak straight from recorded answers', () => {
		recordPracticeDay('2026-07-13');
		recordPracticeDay('2026-07-14');
		expect(localStreak('2026-07-14')).toBe(2);
	});

	it('reports 0 for a device that has never practiced', () => {
		expect(localStreak('2026-07-14')).toBe(0);
	});

	it('practicedOn is true only for a recorded day', () => {
		recordPracticeDay('2026-07-14');
		expect(practicedOn('2026-07-14')).toBe(true);
		expect(practicedOn('2026-07-13')).toBe(false);
	});
});

/**
 * The parity gate: the same day set must produce the same streak locally and on
 * the server, or max(local, server) would surface a number the other side
 * disagrees with.
 *
 * The expected values below are the server's, transcribed from
 * server/src/streak.ts's `computeStreak` (distinct client_date set, one-day
 * grace, any longer gap resets). The server module is deliberately NOT imported
 * here: it pulls in server/src/db.ts, whose better-sqlite3 dependency lives
 * only in server/node_modules and would break `npm run check` for the whole
 * client. Server-side coverage of the same table lives in server/test.
 */
describe('parity with the server streak semantics (B8)', () => {
	const cases: { label: string; days: string[]; today: string; expected: number }[] = [
		{ label: 'empty', days: [], today: '2026-07-14', expected: 0 },
		{ label: 'today only', days: ['2026-07-14'], today: '2026-07-14', expected: 1 },
		{
			label: 'four-day run through today',
			days: ['2026-07-11', '2026-07-12', '2026-07-13', '2026-07-14'],
			today: '2026-07-14',
			expected: 4
		},
		{
			label: 'grace day (yesterday practiced, today not yet)',
			days: ['2026-07-13'],
			today: '2026-07-14',
			expected: 1
		},
		{ label: 'lapsed run', days: ['2026-07-01', '2026-07-02'], today: '2026-07-14', expected: 0 },
		{
			label: 'run across a month boundary',
			days: ['2026-06-29', '2026-06-30', '2026-07-01'],
			today: '2026-07-01',
			expected: 3
		}
	];

	for (const { label, days, today, expected } of cases) {
		it(`matches the server number for: ${label}`, () => {
			expect(computeStreakFromDays(days, today)).toBe(expected);
		});
	}
});
