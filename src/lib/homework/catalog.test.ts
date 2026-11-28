import { describe, expect, it } from 'vitest';
import {
	exerciseKey,
	exercisesOnPage,
	findExercise,
	lookupExercise,
	pagesFor,
	parseCount
} from './catalog';

describe('parseCount', () => {
	it.each([
		['5', 5],
		[' 12 ', 12],
		['05', 5],
		['1', 1]
	])('accepts %j as %i', (raw, n) => expect(parseCount(raw)).toBe(n));

	it.each(['', '  ', '0', '-1', '5.5', 'abc', '5a', '12345', '٣'])('rejects %j', (raw) =>
		expect(parseCount(raw)).toBeNull()
	);
});

describe('catalog lookups', () => {
	it('lists the printed pages that exist', () => {
		expect(pagesFor('reading')).toEqual([5, 6, 18]);
		expect(pagesFor('rhythm')).toEqual([1, 2, 3, 4]);
	});

	it('lists the exercises on a page', () => {
		expect(exercisesOnPage('reading', 5)).toEqual([1, 2]);
		expect(exercisesOnPage('rhythm', 4)).toEqual([19, 20, 21, 22, 23, 24]);
		expect(exercisesOnPage('rhythm', 99)).toEqual([]);
	});

	it('finds an exercise by page and number and tags its kind', () => {
		const e = findExercise('reading', 18, 2);
		expect(e?.kind).toBe('reading');
		expect(e?.page).toBe(18);
		expect(findExercise('rhythm', 18, 2)).toBeNull();
		expect(findExercise('reading', 5, 3)).toBeNull();
	});

	it('does not confuse the two books', () => {
		expect(findExercise('rhythm', 5, 1)).toBeNull();
		expect(findExercise('reading', 1, 1)).toBeNull();
	});
});

describe('lookupExercise', () => {
	it('opens an exercise from typed text', () => {
		const r = lookupExercise('rhythm', ' 4 ', '21');
		expect(r.ok && r.exercise.number).toBe(21);
	});

	it('reports unusable input', () => {
		expect(lookupExercise('reading', '', '1')).toEqual({ ok: false, reason: 'bad-input' });
		expect(lookupExercise('reading', '5', 'x')).toEqual({ ok: false, reason: 'bad-input' });
	});

	it('reports an unknown page', () => {
		expect(lookupExercise('reading', '7', '1')).toEqual({ ok: false, reason: 'no-page' });
	});

	it('reports an unknown exercise with what does exist on that page', () => {
		expect(lookupExercise('reading', '6', '9')).toEqual({
			ok: false,
			reason: 'no-exercise',
			available: [3, 4]
		});
	});
});

describe('exerciseKey', () => {
	it('is stable and distinct per kind', () => {
		expect(exerciseKey('rhythm', 1, 2)).toBe('rhythm:1:2');
		expect(exerciseKey('reading', 1, 2)).not.toBe(exerciseKey('rhythm', 1, 2));
	});
});
