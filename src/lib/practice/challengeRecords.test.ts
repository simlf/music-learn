import { beforeEach, describe, expect, it } from 'vitest';
import { CHALLENGE_RECORDS_KEY, readBest, recordKey, submitResult } from './challengeRecords';

beforeEach(() => {
	localStorage.clear();
});

describe('challenge personal bests', () => {
	it('keeps a higher-is-better best only when a run beats it', () => {
		expect(submitResult('sprint', 120, 'higher')).toEqual({ best: 120, newBest: true });
		expect(submitResult('sprint', 90, 'higher')).toEqual({ best: 120, newBest: false });
		expect(submitResult('sprint', 120, 'higher')).toEqual({ best: 120, newBest: false });
		expect(submitResult('sprint', 150, 'higher')).toEqual({ best: 150, newBest: true });
		expect(readBest('sprint')).toBe(150);
	});

	it('never plants a zero best for a run that scored nothing', () => {
		expect(submitResult('ear-duel', 0, 'higher')).toEqual({ best: undefined, newBest: false });
		expect(readBest('ear-duel')).toBeUndefined();
	});

	it('keeps a lower-is-better best (a climb time) per quality', () => {
		const m7 = recordKey('key-climb', 'm7');
		const triad = recordKey('key-climb', '');
		expect(m7).toBe('key-climb:m7');
		expect(submitResult(m7, 90_000, 'lower').newBest).toBe(true);
		expect(submitResult(m7, 95_000, 'lower').newBest).toBe(false);
		expect(submitResult(m7, 80_000, 'lower').newBest).toBe(true);
		expect(readBest(m7)).toBe(80_000);
		expect(readBest(triad)).toBeUndefined();
	});

	it('reads corrupt storage as no records rather than throwing', () => {
		localStorage.setItem(CHALLENGE_RECORDS_KEY, '{not json');
		expect(readBest('sprint')).toBeUndefined();
		localStorage.setItem(CHALLENGE_RECORDS_KEY, JSON.stringify({ sprint: 'lots', 'ear-duel': 7 }));
		expect(readBest('sprint')).toBeUndefined();
		expect(readBest('ear-duel')).toBe(7);
	});
});
