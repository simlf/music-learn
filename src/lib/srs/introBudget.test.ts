import { beforeEach, describe, expect, it } from 'vitest';
import {
	consumeIntroBudget,
	remainingIntroBudget,
	INTRO_BUDGET_KEY,
	MAX_NEW_CARDS_PER_DAY
} from './introBudget';

const day1 = new Date('2026-07-15T09:00:00.000Z');
const day1Later = new Date('2026-07-15T18:30:00.000Z');
const day2 = new Date('2026-07-16T09:00:00.000Z');

beforeEach(() => {
	localStorage.clear();
});

describe('remainingIntroBudget', () => {
	it('returns the full daily cap when the store is empty/absent', () => {
		expect(remainingIntroBudget(day1)).toBe(MAX_NEW_CARDS_PER_DAY);
	});

	it('returns cap - consumed after consuming some of the budget', () => {
		consumeIntroBudget(4, day1);
		expect(remainingIntroBudget(day1)).toBe(MAX_NEW_CARDS_PER_DAY - 4);
	});

	it('never goes negative: consuming at or beyond the cap returns 0', () => {
		consumeIntroBudget(MAX_NEW_CARDS_PER_DAY, day1);
		expect(remainingIntroBudget(day1)).toBe(0);

		consumeIntroBudget(50, day1);
		expect(remainingIntroBudget(day1)).toBe(0);
	});

	it('accumulates consumption across multiple calls within the SAME local calendar day', () => {
		consumeIntroBudget(3, day1);
		consumeIntroBudget(2, day1Later);
		expect(remainingIntroBudget(day1Later)).toBe(MAX_NEW_CARDS_PER_DAY - 5);
	});

	it('rollover: a later local date resets consumption, remaining returns the full cap again', () => {
		consumeIntroBudget(MAX_NEW_CARDS_PER_DAY, day1);
		expect(remainingIntroBudget(day1)).toBe(0);

		expect(remainingIntroBudget(day2)).toBe(MAX_NEW_CARDS_PER_DAY);
	});

	it('corrupt JSON resets to a fresh full budget rather than throwing', () => {
		localStorage.setItem(INTRO_BUDGET_KEY, '{not valid json');
		expect(remainingIntroBudget(day1)).toBe(MAX_NEW_CARDS_PER_DAY);
	});

	it('wrong-shape storage (missing/invalid fields) resets to a fresh full budget', () => {
		localStorage.setItem(INTRO_BUDGET_KEY, JSON.stringify({ date: 123, count: 'oops' }));
		expect(remainingIntroBudget(day1)).toBe(MAX_NEW_CARDS_PER_DAY);

		localStorage.setItem(INTRO_BUDGET_KEY, JSON.stringify({ date: '2026-07-15' }));
		expect(remainingIntroBudget(day1)).toBe(MAX_NEW_CARDS_PER_DAY);

		localStorage.setItem(INTRO_BUDGET_KEY, JSON.stringify({ date: '2026-07-15', count: -3 }));
		expect(remainingIntroBudget(day1)).toBe(MAX_NEW_CARDS_PER_DAY);

		localStorage.setItem(INTRO_BUDGET_KEY, JSON.stringify({ date: '2026-07-15', count: 1.5 }));
		expect(remainingIntroBudget(day1)).toBe(MAX_NEW_CARDS_PER_DAY);
	});

	it('a non-object (e.g. a bare array or string) resets to a fresh full budget', () => {
		localStorage.setItem(INTRO_BUDGET_KEY, JSON.stringify([1, 2, 3]));
		expect(remainingIntroBudget(day1)).toBe(MAX_NEW_CARDS_PER_DAY);

		localStorage.setItem(INTRO_BUDGET_KEY, JSON.stringify('hello'));
		expect(remainingIntroBudget(day1)).toBe(MAX_NEW_CARDS_PER_DAY);
	});
});

describe('consumeIntroBudget', () => {
	it('degrades to a no-op on a write failure (quota exceeded / storage disabled), never throws', () => {
		const originalSetItem = localStorage.setItem;
		localStorage.setItem = () => {
			throw new Error('QuotaExceededError');
		};
		try {
			expect(() => consumeIntroBudget(3, day1)).not.toThrow();
		} finally {
			localStorage.setItem = originalSetItem;
		}
	});

	it('rolling over to a new day starts consumption fresh (does not carry over the prior day\'s count)', () => {
		consumeIntroBudget(7, day1);
		consumeIntroBudget(2, day2);
		expect(remainingIntroBudget(day2)).toBe(MAX_NEW_CARDS_PER_DAY - 2);
		// The prior day's record is irrelevant now; re-checking day1 with a
		// fresh instant on that same date still reads the OLD stored count only
		// if the stored date still matches - since day2's write overwrote the
		// single stored record, day1 now reads as a rollover (0 consumed).
		expect(remainingIntroBudget(day1)).toBe(MAX_NEW_CARDS_PER_DAY);
	});

	it('never writes a negative count even if called with a negative n', () => {
		consumeIntroBudget(-5, day1);
		expect(remainingIntroBudget(day1)).toBe(MAX_NEW_CARDS_PER_DAY);
	});
});
