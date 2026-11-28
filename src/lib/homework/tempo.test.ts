import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	HW_TEMPO_DEFAULT,
	HW_TEMPO_MAX,
	HW_TEMPO_MIN,
	HW_TEMPO_PRESETS,
	clampHwTempo,
	loadHomeworkPrefs,
	nudgeHwTempo,
	saveHomeworkPrefs
} from './tempo';

describe('clampHwTempo', () => {
	it('clamps to the range and rounds', () => {
		expect(clampHwTempo(10)).toBe(HW_TEMPO_MIN);
		expect(clampHwTempo(999)).toBe(HW_TEMPO_MAX);
		expect(clampHwTempo(72.4)).toBe(72);
	});
	it('falls back to the default for non-numbers', () => {
		expect(clampHwTempo(Number.NaN)).toBe(HW_TEMPO_DEFAULT);
		expect(clampHwTempo(Infinity)).toBe(HW_TEMPO_DEFAULT);
	});
	it('keeps every preset inside the range', () => {
		for (const p of HW_TEMPO_PRESETS) expect(clampHwTempo(p)).toBe(p);
	});
});

describe('nudgeHwTempo', () => {
	it('steps by five and stops at the ends', () => {
		expect(nudgeHwTempo(70, 1)).toBe(75);
		expect(nudgeHwTempo(70, -1)).toBe(65);
		expect(nudgeHwTempo(HW_TEMPO_MAX, 1)).toBe(HW_TEMPO_MAX);
		expect(nudgeHwTempo(HW_TEMPO_MIN, -1)).toBe(HW_TEMPO_MIN);
	});
});

describe('homework prefs', () => {
	beforeEach(() => localStorage.clear());

	it('defaults to 70 BPM and a one-bar count-in', () => {
		expect(loadHomeworkPrefs()).toEqual({ bpm: 70, countInBars: 1 });
	});
	it('round-trips', () => {
		saveHomeworkPrefs({ bpm: 90, countInBars: 2 });
		expect(loadHomeworkPrefs()).toEqual({ bpm: 90, countInBars: 2 });
	});
	it('repairs junk values', () => {
		localStorage.setItem('music-learn:homework-prefs', JSON.stringify({ bpm: 9999, countInBars: 7 }));
		expect(loadHomeworkPrefs()).toEqual({ bpm: HW_TEMPO_MAX, countInBars: 1 });
	});
	it('survives corrupt storage and blocked storage', () => {
		localStorage.setItem('music-learn:homework-prefs', 'nope');
		expect(loadHomeworkPrefs().bpm).toBe(HW_TEMPO_DEFAULT);
		const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('blocked');
		});
		expect(() => saveHomeworkPrefs({ bpm: 80, countInBars: 1 })).not.toThrow();
		set.mockRestore();
	});
});
