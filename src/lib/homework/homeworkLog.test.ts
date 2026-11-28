import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRecord, recordAttempt } from './homeworkLog';

describe('homeworkLog', () => {
	beforeEach(() => localStorage.clear());

	it('starts with no record', () => {
		expect(getRecord('rhythm:1:1')).toBeNull();
	});

	it('records the first attempt', () => {
		const r = recordAttempt('rhythm:1:1', 80, new Date('2026-01-02T03:04:05Z'));
		expect(r).toEqual({ attempts: 1, best: 80, last: 80, at: '2026-01-02T03:04:05.000Z' });
		expect(getRecord('rhythm:1:1')).toEqual(r);
	});

	it('keeps the best, tracks the last and counts attempts', () => {
		recordAttempt('k', 90);
		recordAttempt('k', 60);
		const r = recordAttempt('k', 70);
		expect(r).toMatchObject({ attempts: 3, best: 90, last: 70 });
	});

	it('keeps exercises apart', () => {
		recordAttempt('a', 10);
		recordAttempt('b', 99);
		expect(getRecord('a')?.best).toBe(10);
		expect(getRecord('b')?.best).toBe(99);
	});

	it('clamps and rounds scores, and survives NaN', () => {
		expect(recordAttempt('c', 140).last).toBe(100);
		expect(recordAttempt('c', -5).last).toBe(0);
		expect(recordAttempt('c', 66.6).last).toBe(67);
		expect(recordAttempt('d', Number.NaN).last).toBe(0);
	});

	it('survives corrupt storage', () => {
		localStorage.setItem('music-learn:homework-log', '{not json');
		expect(getRecord('x')).toBeNull();
		expect(recordAttempt('x', 50).attempts).toBe(1);
	});

	it('drops malformed entries but keeps good ones', () => {
		localStorage.setItem(
			'music-learn:homework-log',
			JSON.stringify({ bad: { attempts: 'many' }, good: { attempts: 2, best: 5, last: 4, at: 'x' } })
		);
		expect(getRecord('bad')).toBeNull();
		expect(getRecord('good')?.attempts).toBe(2);
	});

	it('ignores a log that is not an object', () => {
		localStorage.setItem('music-learn:homework-log', '[1,2]');
		expect(getRecord('x')).toBeNull();
	});

	it('does not throw when storage is blocked', () => {
		const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('blocked');
		});
		const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('blocked');
		});
		expect(() => getRecord('x')).not.toThrow();
		expect(recordAttempt('x', 70).last).toBe(70);
		get.mockRestore();
		set.mockRestore();
	});
});
