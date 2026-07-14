import { beforeEach, describe, expect, it } from 'vitest';
import { DRILL_SEEDS_KEY, setDrillSeeds, consumeDrillSeeds } from './drillSeeds';

beforeEach(() => {
	localStorage.clear();
});

describe('drill seeds one-shot handoff (Drill these -> /drills)', () => {
	it('round-trips seeds and clears them on consume', () => {
		setDrillSeeds(['Cm7', 'F#m7b5']);
		expect(consumeDrillSeeds()).toEqual(['Cm7', 'F#m7b5']);
		expect(consumeDrillSeeds()).toEqual([]);
	});

	it('returns [] when nothing was set', () => {
		expect(consumeDrillSeeds()).toEqual([]);
	});

	it('resets corrupt data to [] without throwing', () => {
		localStorage.setItem(DRILL_SEEDS_KEY, '{nope');
		expect(consumeDrillSeeds()).toEqual([]);
	});

	it('filters non-string entries', () => {
		localStorage.setItem(DRILL_SEEDS_KEY, JSON.stringify(['Cm7', 42, null]));
		expect(consumeDrillSeeds()).toEqual(['Cm7']);
	});
});
