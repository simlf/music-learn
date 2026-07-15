import { describe, expect, it } from 'vitest';
import { Rating } from '$lib/srs/scheduler';
import {
	advanceQueue,
	buildQueue,
	formatDayInterval,
	isSessionComplete,
	sessionRemaining,
	type QueueItem
} from './session';

const a: QueueItem = { factId: 'Cm7', mode: 'formula' };
const b: QueueItem = { factId: 'F#m7b5', mode: 'formula' };
const c: QueueItem = { factId: 'C-Eb', mode: 'formula' };

describe('buildQueue', () => {
	it('returns a new array with the same items in the same order', () => {
		const input = [a, b, c];
		const queue = buildQueue(input);

		expect(queue).not.toBe(input);
		expect(queue).toEqual([a, b, c]);
	});
});

describe('advanceQueue', () => {
	it('removes the front item on Good, without re-enqueueing', () => {
		expect(advanceQueue([a, b, c], Rating.Good)).toEqual([b, c]);
	});

	it('removes the front item on Hard, without re-enqueueing', () => {
		expect(advanceQueue([a, b, c], Rating.Hard)).toEqual([b, c]);
	});

	it('removes the front item on Easy, without re-enqueueing', () => {
		expect(advanceQueue([a, b, c], Rating.Easy)).toEqual([b, c]);
	});

	it('removes and re-enqueues the front item at the back on Again (D-10)', () => {
		const result = advanceQueue([a, b, c], Rating.Again);

		expect(result).toEqual([b, c, a]);
		expect(result.length).toBe(3);
	});

	it('does not mutate its input array', () => {
		const queue = [a, b, c];
		const originalLength = queue.length;
		const originalContents = [...queue];

		advanceQueue(queue, Rating.Again);

		expect(queue.length).toBe(originalLength);
		expect(queue).toEqual(originalContents);
	});

	it('returns [] without throwing on an empty queue', () => {
		expect(() => advanceQueue([], Rating.Good)).not.toThrow();
		expect(advanceQueue([], Rating.Good)).toEqual([]);
	});
});

describe('isSessionComplete', () => {
	it('is true for an empty queue', () => {
		expect(isSessionComplete([])).toBe(true);
	});

	it('is false for a non-empty queue', () => {
		expect(isSessionComplete([a])).toBe(false);
	});
});

describe('sessionRemaining', () => {
	it('counts the items in the queue', () => {
		expect(sessionRemaining([a, b, c])).toBe(3);
	});

	it('is 0 for an empty queue', () => {
		expect(sessionRemaining([])).toBe(0);
	});
});

describe('formatDayInterval', () => {
	it('formats the days<14 band as whole-day rounding', () => {
		expect(formatDayInterval(1)).toBe('1d');
		expect(formatDayInterval(3)).toBe('3d');
		expect(formatDayInterval(8)).toBe('8d');
		expect(formatDayInterval(13)).toBe('13d');
	});

	it('formats the 14<=days<60 band boundary exactly', () => {
		expect(formatDayInterval(14)).toBe('2w');
	});

	it('formats 57 and 59 days inside the week band', () => {
		expect(formatDayInterval(57)).toBe('8w');
		expect(formatDayInterval(59)).toBe('8w');
	});

	it('formats the days>=60 band boundary exactly', () => {
		expect(formatDayInterval(60)).toBe('2mo');
	});

	it('formats 90 days as 3mo', () => {
		expect(formatDayInterval(90)).toBe('3mo');
	});

	it('formats the real FSRS Good-chain fifth interval (586d) as 20mo', () => {
		expect(formatDayInterval(586)).toBe('20mo');
	});
});
