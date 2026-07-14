import { beforeEach, describe, expect, it } from 'vitest';
import {
	appendPracticeAnswer,
	readPracticeLog,
	recentMisses,
	distinctPracticeDays,
	practiceDaysSince,
	PRACTICE_LOG_KEY
} from './practiceLog';

function seed(entries: unknown): void {
	localStorage.setItem(PRACTICE_LOG_KEY, JSON.stringify(entries));
}

beforeEach(() => {
	localStorage.clear();
});

describe('readPracticeLog', () => {
	it('returns [] when nothing is stored', () => {
		expect(readPracticeLog()).toEqual([]);
	});

	it('returns [] for corrupt JSON without throwing', () => {
		localStorage.setItem(PRACTICE_LOG_KEY, '{nope');
		expect(readPracticeLog()).toEqual([]);
	});

	it('filters malformed entries while keeping valid ones', () => {
		seed([
			{ item: 'Cm7', correct: true, assisted: false, date: '2026-07-14' },
			{ item: 42, correct: 'yes' },
			null,
			{ item: 'G7', correct: false, assisted: true, date: '2026-07-14' }
		]);
		const log = readPracticeLog();
		expect(log).toHaveLength(2);
		expect(log[0].item).toBe('Cm7');
		expect(log[1].item).toBe('G7');
	});
});

describe('appendPracticeAnswer', () => {
	it('appends entries in order, newest last', () => {
		appendPracticeAnswer({ item: 'Cm7', correct: true, assisted: false, date: '2026-07-14' });
		appendPracticeAnswer({ item: 'G7', correct: false, assisted: false, date: '2026-07-14' });
		const log = readPracticeLog();
		expect(log.map((entry) => entry.item)).toEqual(['Cm7', 'G7']);
	});

	it('caps the log at 200 entries, dropping the oldest first', () => {
		for (let i = 0; i < 205; i++) {
			appendPracticeAnswer({ item: `X${i}`, correct: true, assisted: false, date: '2026-07-14' });
		}
		const log = readPracticeLog();
		expect(log).toHaveLength(200);
		expect(log[0].item).toBe('X5');
		expect(log[199].item).toBe('X204');
	});
});

describe('recentMisses', () => {
	it('returns missed symbols newest-first, deduped', () => {
		appendPracticeAnswer({ item: 'Cm7', correct: false, assisted: false, date: '2026-07-13' });
		appendPracticeAnswer({ item: 'G7', correct: true, assisted: false, date: '2026-07-13' });
		appendPracticeAnswer({ item: 'F#m7b5', correct: false, assisted: false, date: '2026-07-14' });
		appendPracticeAnswer({ item: 'Cm7', correct: false, assisted: false, date: '2026-07-14' });
		expect(recentMisses(5)).toEqual(['Cm7', 'F#m7b5']);
	});

	it('respects the limit', () => {
		for (const item of ['A7', 'B7', 'C7', 'D7']) {
			appendPracticeAnswer({ item, correct: false, assisted: false, date: '2026-07-14' });
		}
		expect(recentMisses(2)).toEqual(['D7', 'C7']);
	});

	it('a symbol later answered correctly no longer counts as a recent miss', () => {
		appendPracticeAnswer({ item: 'Cm7', correct: false, assisted: false, date: '2026-07-14' });
		appendPracticeAnswer({ item: 'Cm7', correct: true, assisted: false, date: '2026-07-14' });
		expect(recentMisses(5)).toEqual([]);
	});
});

describe('distinctPracticeDays', () => {
	it('returns the sorted distinct dates present in the log', () => {
		appendPracticeAnswer({ item: 'Cm7', correct: true, assisted: false, date: '2026-07-14' });
		appendPracticeAnswer({ item: 'G7', correct: true, assisted: false, date: '2026-07-12' });
		appendPracticeAnswer({ item: 'F7', correct: true, assisted: false, date: '2026-07-14' });
		expect(distinctPracticeDays()).toEqual(['2026-07-12', '2026-07-14']);
	});
});

describe('practiceDaysSince', () => {
	it('counts distinct practice days strictly after the given date', () => {
		appendPracticeAnswer({ item: 'Cm7', correct: true, assisted: false, date: '2026-07-10' });
		appendPracticeAnswer({ item: 'G7', correct: true, assisted: false, date: '2026-07-12' });
		appendPracticeAnswer({ item: 'F7', correct: true, assisted: false, date: '2026-07-13' });
		appendPracticeAnswer({ item: 'D7', correct: true, assisted: false, date: '2026-07-13' });
		expect(practiceDaysSince('2026-07-10')).toBe(2);
		expect(practiceDaysSince('2026-07-13')).toBe(0);
	});
});
