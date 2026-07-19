import { beforeEach, describe, expect, it } from 'vitest';
import {
	DRILL_SEEDS_KEY,
	setDrillSeeds,
	consumeDrillSeeds,
	LESSON_SEEDS_KEY,
	setLessonSeeds,
	consumeLessonSeeds
} from './drillSeeds';

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

describe('lesson seeds one-shot handoff (InteractiveLesson -> /drills)', () => {
	it('round-trips seeds and clears them on consume', () => {
		setLessonSeeds(['C', 'Cm']);
		expect(consumeLessonSeeds()).toEqual(['C', 'Cm']);
		expect(consumeLessonSeeds()).toEqual([]);
	});

	it('returns [] when nothing was set', () => {
		expect(consumeLessonSeeds()).toEqual([]);
	});

	it('resets corrupt data to [] without throwing', () => {
		localStorage.setItem(LESSON_SEEDS_KEY, '{nope');
		expect(consumeLessonSeeds()).toEqual([]);
	});

	it('filters non-string entries', () => {
		localStorage.setItem(LESSON_SEEDS_KEY, JSON.stringify(['C', 42, null]));
		expect(consumeLessonSeeds()).toEqual(['C']);
	});

	it('is independent of the drill-seeds channel: setLessonSeeds does not populate consumeDrillSeeds', () => {
		setLessonSeeds(['C', 'Cm']);
		expect(consumeDrillSeeds()).toEqual([]);
		// Lesson seeds are still there untouched (distinct key).
		expect(consumeLessonSeeds()).toEqual(['C', 'Cm']);
	});

	it('is independent of the drill-seeds channel: setDrillSeeds does not populate consumeLessonSeeds', () => {
		setDrillSeeds(['Cm7']);
		expect(consumeLessonSeeds()).toEqual([]);
		expect(consumeDrillSeeds()).toEqual(['Cm7']);
	});
});
