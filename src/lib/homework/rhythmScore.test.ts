import { describe, expect, it } from 'vitest';
import {
	PASS_SCORE,
	beatMsFor,
	expectedOnsetTimes,
	goodWindowMs,
	perfectWindowMs,
	scoreRhythm
} from './rhythmScore';

// 60 BPM: one beat per second, so beat positions read straight as seconds.
const BPM = 60;

describe('tolerance windows', () => {
	it('is a quarter of a beat in the middle of the range', () => {
		expect(goodWindowMs(beatMsFor(120))).toBe(125);
	});
	it('never drops below 80 ms, however fast', () => {
		expect(goodWindowMs(beatMsFor(300))).toBe(80);
	});
	it('never exceeds 200 ms, however slow', () => {
		expect(goodWindowMs(beatMsFor(40))).toBe(200);
	});
	it('makes the perfect window 40% of the good window', () => {
		expect(perfectWindowMs(1000)).toBe(80);
	});
});

describe('expectedOnsetTimes', () => {
	it('converts beats to milliseconds at the tempo', () => {
		expect(expectedOnsetTimes([0, 1, 2.5], 120)).toEqual([0, 500, 1250]);
		expect(expectedOnsetTimes([0, 1], 60)).toEqual([0, 1000]);
	});
});

describe('scoreRhythm', () => {
	const expected = [0, 1000, 2000, 3000];

	it('scores exact taps 100 and passed', () => {
		const s = scoreRhythm(expected, [0, 1000, 2000, 3000], BPM);
		expect(s.score).toBe(100);
		expect(s.perfect).toBe(4);
		expect(s.missed).toBe(0);
		expect(s.extra).toBe(0);
		expect(s.passed).toBe(true);
		expect(s.meanOffsetMs).toBe(0);
		expect(s.tendency).toBe('steady');
	});

	it('calls a tap inside the perfect window perfect and just outside it good', () => {
		const perfect = perfectWindowMs(1000);
		const s = scoreRhythm([0, 1000], [perfect, 1000 + perfect + 1], BPM);
		expect(s.results.map((r) => r.verdict)).toEqual(['perfect', 'good']);
	});

	it('calls a tap at the edge of the good window good and beyond it missed', () => {
		const good = goodWindowMs(1000);
		const s = scoreRhythm([0, 1000], [good, 1000 + good + 1], BPM);
		expect(s.results.map((r) => r.verdict)).toEqual(['good', 'missed']);
	});

	it('reports early as negative and late as positive', () => {
		const s = scoreRhythm([1000, 2000], [940, 2060], BPM);
		expect(s.results.map((r) => r.offsetMs)).toEqual([-60, 60]);
	});

	it('counts a missing tap as missed with null tap and offset', () => {
		const s = scoreRhythm(expected, [0, 1000, 3000], BPM);
		expect(s.missed).toBe(1);
		expect(s.results[2]).toMatchObject({ tapMs: null, offsetMs: null, verdict: 'missed' });
		expect(s.score).toBe(75);
		expect(s.passed).toBe(true);
	});

	it('fails an attempt that misses half the notes', () => {
		const s = scoreRhythm(expected, [0, 1000], BPM);
		expect(s.score).toBe(50);
		expect(s.passed).toBe(false);
	});

	it('charges a quarter of an onset for each extra tap', () => {
		const s = scoreRhythm(expected, [0, 500, 1000, 2000, 3000], BPM);
		expect(s.extra).toBe(1);
		expect(s.score).toBe(94); // (4 - 0.25) / 4 = 93.75
	});

	it('keeps only the nearer of two taps on one onset and counts the other extra', () => {
		const s = scoreRhythm([1000], [1030, 1010], BPM);
		expect(s.results[0].tapMs).toBe(1010);
		expect(s.extra).toBe(1);
	});

	it('never lets a late tap steal a neighbour onset from a nearer tap', () => {
		// Taps at 1090 (near 1000) and 1900 (near 2000): each stays with its own.
		const s = scoreRhythm([1000, 2000], [1090, 1900], BPM);
		expect(s.results.map((r) => r.tapMs)).toEqual([1090, 1900]);
		expect(s.missed).toBe(0);
	});

	it('gives a tap to the nearest onset when two are in range (fast rhythm)', () => {
		// 240 BPM: beat 250 ms, good window 80 ms. A tap at 135 is 15 ms from 150.
		const s = scoreRhythm([100, 150], [135], 240);
		expect(s.results[1].tapMs).toBe(135);
		expect(s.results[0].verdict).toBe('missed');
	});

	it('treats a tap far from every onset as extra only', () => {
		const s = scoreRhythm([0], [0, 600], BPM);
		expect(s.extra).toBe(1);
		expect(s.perfect).toBe(1);
	});

	it('scores an empty tap list as zero with everything missed', () => {
		const s = scoreRhythm(expected, [], BPM);
		expect(s.score).toBe(0);
		expect(s.missed).toBe(4);
		expect(s.meanOffsetMs).toBeNull();
		expect(s.tendency).toBeNull();
		expect(s.passed).toBe(false);
	});

	it('scores an exercise with no onsets as zero, never passed, never NaN', () => {
		const s = scoreRhythm([], [100], BPM);
		expect(s.score).toBe(0);
		expect(s.passed).toBe(false);
		expect(Number.isNaN(s.score)).toBe(false);
	});

	it('never goes below 0 however many extra taps', () => {
		const s = scoreRhythm([0], [500, 600, 700, 800, 900, 1500, 1600], BPM);
		expect(s.score).toBe(0);
	});

	it('gives good taps 60% credit', () => {
		const s = scoreRhythm([0, 1000, 2000, 3000], [150, 1150, 2150, 3150], BPM);
		expect(s.good).toBe(4);
		expect(s.score).toBe(60);
		expect(s.passed).toBe(false);
	});

	it('detects rushing, dragging and steady playing', () => {
		expect(scoreRhythm(expected, [-70, 930, 1930, 2930], BPM).tendency).toBe('rushing');
		expect(scoreRhythm(expected, [70, 1070, 2070, 3070], BPM).tendency).toBe('dragging');
		expect(scoreRhythm(expected, [-10, 1010, 1995, 3005], BPM).tendency).toBe('steady');
	});

	it('reports the mean offset and spread of matched taps', () => {
		const s = scoreRhythm([0, 1000], [-20, 1040], BPM);
		expect(s.meanOffsetMs).toBe(10);
		expect(s.spreadMs).toBe(30);
	});

	it('compensates input latency with latencyOffsetMs', () => {
		const taps = [80, 1080, 2080, 3080];
		expect(scoreRhythm(expected, taps, BPM).tendency).toBe('dragging');
		const fixed = scoreRhythm(expected, taps, BPM, { latencyOffsetMs: 80 });
		expect(fixed.score).toBe(100);
		expect(fixed.tendency).toBe('steady');
	});

	it('does not depend on the order the taps arrive in the list', () => {
		const a = scoreRhythm(expected, [0, 1000, 2000, 3000], BPM);
		const b = scoreRhythm(expected, [3000, 0, 2000, 1000], BPM);
		expect(b.score).toBe(a.score);
		expect(b.results.map((r) => r.tapMs)).toEqual(a.results.map((r) => r.tapMs));
	});

	it('states the windows it used', () => {
		const s = scoreRhythm(expected, [], 120);
		expect(s.goodWindowMs).toBe(125);
		expect(s.perfectWindowMs).toBe(50);
	});

	it('uses a pass mark of 75', () => {
		expect(PASS_SCORE).toBe(75);
	});
});
