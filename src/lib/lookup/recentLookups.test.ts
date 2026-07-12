import { beforeEach, describe, expect, it } from 'vitest';
import { addRecentLookup, getRecentLookups } from './recentLookups';

describe('recentLookups', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('returns [] when the store is empty', () => {
		expect(getRecentLookups()).toEqual([]);
	});

	it('addRecentLookup persists a single symbol', () => {
		addRecentLookup('Cm7');
		expect(getRecentLookups()).toEqual(['Cm7']);
	});

	it('adds new symbols most-recent-first', () => {
		addRecentLookup('Cm7');
		addRecentLookup('Fmaj7');
		expect(getRecentLookups()).toEqual(['Fmaj7', 'Cm7']);
	});

	it('re-adding an existing symbol moves it to the front without duplicating', () => {
		addRecentLookup('Cm7');
		addRecentLookup('Fmaj7');
		addRecentLookup('Cm7');
		expect(getRecentLookups()).toEqual(['Cm7', 'Fmaj7']);
	});

	it('never exceeds 5 entries, dropping the oldest distinct symbol', () => {
		addRecentLookup('Cm7');
		addRecentLookup('Fmaj7');
		addRecentLookup('G7');
		addRecentLookup('Dm7');
		addRecentLookup('Bbmaj7');
		addRecentLookup('Am7');

		const result = getRecentLookups();
		expect(result).toHaveLength(5);
		expect(result).toEqual(['Am7', 'Bbmaj7', 'Dm7', 'G7', 'Fmaj7']);
		expect(result).not.toContain('Cm7');
	});

	it('dedupes duplicate entries from a legacy or foreign-written store on read', () => {
		localStorage.setItem('music-learn:recent-lookups', JSON.stringify(['Cm7', 'Cm7', 'Fmaj7']));
		expect(getRecentLookups()).toEqual(['Cm7', 'Fmaj7']);
	});

	it('caps an oversized stored list at 5 entries on read', () => {
		localStorage.setItem(
			'music-learn:recent-lookups',
			JSON.stringify(['Cm7', 'Fmaj7', 'G7', 'Dm7', 'Bbmaj7', 'Am7', 'Em7'])
		);
		expect(getRecentLookups()).toEqual(['Cm7', 'Fmaj7', 'G7', 'Dm7', 'Bbmaj7']);
	});

	it('treats a corrupt/non-array value in localStorage as empty', () => {
		localStorage.setItem('music-learn:recent-lookups', '{"not":"an array"}');
		expect(getRecentLookups()).toEqual([]);
	});

	it('treats a malformed JSON string in localStorage as empty', () => {
		localStorage.setItem('music-learn:recent-lookups', 'not json{{');
		expect(getRecentLookups()).toEqual([]);
	});
});
