import { describe, expect, it } from 'vitest';
import {
	BEATS_PER_BAR,
	TEMPO_DEFAULT,
	TEMPO_MAX,
	TEMPO_MIN,
	TEMPO_STEP,
	barDurationSec,
	clampTempo,
	nextBarIndex,
	nudgeTempo,
	secondsPerBeat
} from './loopTiming';

/**
 * The comping loop's clock, tested as pure math with no Tone and no audio.
 * These are the three things a play-along loop cannot get wrong: where the
 * form is (bar advance and wrap), how fast it moves (tempo clamping), and how
 * long a bar lasts (tempo to duration).
 */

describe('tempo range', () => {
	it('pins the learner range and default chosen for one chord per 4/4 bar', () => {
		expect(TEMPO_MIN).toBe(50);
		expect(TEMPO_MAX).toBe(120);
		expect(TEMPO_DEFAULT).toBe(70);
		expect(TEMPO_STEP).toBe(5);
		expect(BEATS_PER_BAR).toBe(4);
	});

	it('keeps the default inside the range, and the range wide enough to be worth a control', () => {
		expect(TEMPO_DEFAULT).toBeGreaterThanOrEqual(TEMPO_MIN);
		expect(TEMPO_DEFAULT).toBeLessThanOrEqual(TEMPO_MAX);
		expect((TEMPO_MAX - TEMPO_MIN) / TEMPO_STEP).toBeGreaterThanOrEqual(10);
	});

	it('spans bar lengths from about 2s to about 5s: fast enough to swing, slow enough to think', () => {
		expect(barDurationSec(TEMPO_MAX)).toBeCloseTo(2, 2);
		expect(barDurationSec(TEMPO_MIN)).toBeCloseTo(4.8, 2);
		expect(barDurationSec(TEMPO_DEFAULT)).toBeCloseTo(3.4286, 3);
	});
});

describe('clampTempo', () => {
	it('passes an in-range tempo through, rounded to a whole BPM', () => {
		expect(clampTempo(70)).toBe(70);
		expect(clampTempo(83.4)).toBe(83);
	});

	it('clamps below the floor and above the ceiling instead of refusing', () => {
		expect(clampTempo(10)).toBe(TEMPO_MIN);
		expect(clampTempo(400)).toBe(TEMPO_MAX);
		expect(clampTempo(0)).toBe(TEMPO_MIN);
		expect(clampTempo(-30)).toBe(TEMPO_MIN);
	});

	it('falls back to the default for a non-finite tempo rather than producing NaN', () => {
		expect(clampTempo(Number.NaN)).toBe(TEMPO_DEFAULT);
		expect(clampTempo(Number.POSITIVE_INFINITY)).toBe(TEMPO_DEFAULT);
	});
});

describe('nudgeTempo', () => {
	it('moves one step in each direction', () => {
		expect(nudgeTempo(70, 1)).toBe(75);
		expect(nudgeTempo(70, -1)).toBe(65);
	});

	it('stops at each end instead of wrapping around mid-loop', () => {
		expect(nudgeTempo(TEMPO_MAX, 1)).toBe(TEMPO_MAX);
		expect(nudgeTempo(TEMPO_MIN, -1)).toBe(TEMPO_MIN);
	});

	it('walks the whole range in whole steps with no dead value', () => {
		let value = TEMPO_MIN;
		const seen = [value];
		for (let i = 0; i < 100 && value < TEMPO_MAX; i++) {
			value = nudgeTempo(value, 1);
			seen.push(value);
		}
		expect(value).toBe(TEMPO_MAX);
		expect(seen).toEqual([50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120]);
	});
});

describe('secondsPerBeat / barDurationSec', () => {
	it('converts BPM to seconds per beat', () => {
		expect(secondsPerBeat(60)).toBeCloseTo(1, 6);
		expect(secondsPerBeat(120)).toBeCloseTo(0.5, 6);
	});

	it('multiplies by the beats in a bar, and defaults to 4/4', () => {
		expect(barDurationSec(60)).toBeCloseTo(4, 6);
		expect(barDurationSec(60, 3)).toBeCloseTo(3, 6);
		expect(barDurationSec(60, BEATS_PER_BAR)).toBe(barDurationSec(60));
	});

	it('clamps out-of-range input rather than returning a nonsense duration', () => {
		expect(barDurationSec(0)).toBeCloseTo(barDurationSec(TEMPO_MIN), 6);
		expect(barDurationSec(Number.NaN)).toBeCloseTo(barDurationSec(TEMPO_DEFAULT), 6);
	});
});

describe('nextBarIndex', () => {
	it('advances through a 3-bar form and wraps back to the first bar', () => {
		expect(nextBarIndex(0, 3)).toBe(1);
		expect(nextBarIndex(1, 3)).toBe(2);
		expect(nextBarIndex(2, 3)).toBe(0);
	});

	it('wraps a 4-bar form at its own length, not at 3', () => {
		expect(nextBarIndex(2, 4)).toBe(3);
		expect(nextBarIndex(3, 4)).toBe(0);
	});

	it('loops a single-bar form onto itself', () => {
		expect(nextBarIndex(0, 1)).toBe(0);
	});

	it('cycles a whole form repeatedly without drifting off the end', () => {
		let index = 0;
		const visited: number[] = [];
		for (let i = 0; i < 7; i++) {
			visited.push(index);
			index = nextBarIndex(index, 3);
		}
		expect(visited).toEqual([0, 1, 2, 0, 1, 2, 0]);
	});

	it('resolves to the first bar for an empty form or an out-of-range index (total)', () => {
		expect(nextBarIndex(0, 0)).toBe(0);
		expect(nextBarIndex(5, -2)).toBe(0);
		expect(nextBarIndex(99, 3)).toBe(0);
		expect(nextBarIndex(-4, 3)).toBe(0);
		expect(nextBarIndex(Number.NaN, 3)).toBe(0);
		expect(nextBarIndex(1, Number.NaN)).toBe(0);
	});
});
