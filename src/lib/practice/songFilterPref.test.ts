import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readSongFilter, writeSongFilter } from './songFilterPref';

/**
 * songFilterPref (quick task 260720-v9u): the single global "From my songs"
 * preference shared by /songs (writer), Drills, and Recall (readers). On
 * first read it OR-migrates the two legacy per-surface keys
 * (`music-learn:recall-song-filter`, `music-learn:drills-song-filter`) into
 * one `music-learn:song-filter` key and deletes both legacy keys. Every
 * storage access degrades to filter-off on failure, mirroring the existing
 * pattern in recall/+page.svelte and songs.ts.
 */

const NEW_KEY = 'music-learn:song-filter';
const RECALL_KEY = 'music-learn:recall-song-filter';
const DRILLS_KEY = 'music-learn:drills-song-filter';

beforeEach(() => {
	localStorage.clear();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('readSongFilter', () => {
	it('returns false on a completely empty storage and writes nothing', () => {
		expect(readSongFilter()).toBe(false);

		expect(localStorage.getItem(NEW_KEY)).toBeNull();
		expect(localStorage.getItem(RECALL_KEY)).toBeNull();
		expect(localStorage.getItem(DRILLS_KEY)).toBeNull();
	});

	it('migrates true from the legacy drills key alone, persists it, and removes both legacy keys', () => {
		localStorage.setItem(DRILLS_KEY, 'true');

		expect(readSongFilter()).toBe(true);

		expect(localStorage.getItem(NEW_KEY)).toBe('true');
		expect(localStorage.getItem(RECALL_KEY)).toBeNull();
		expect(localStorage.getItem(DRILLS_KEY)).toBeNull();
	});

	it('migrates true from the legacy recall key alone and removes both legacy keys', () => {
		localStorage.setItem(RECALL_KEY, 'true');

		expect(readSongFilter()).toBe(true);

		expect(localStorage.getItem(NEW_KEY)).toBe('true');
		expect(localStorage.getItem(RECALL_KEY)).toBeNull();
		expect(localStorage.getItem(DRILLS_KEY)).toBeNull();
	});

	it('migrates false when both legacy keys are false, persists false, and removes both legacy keys', () => {
		localStorage.setItem(RECALL_KEY, 'false');
		localStorage.setItem(DRILLS_KEY, 'false');

		expect(readSongFilter()).toBe(false);

		expect(localStorage.getItem(NEW_KEY)).toBe('false');
		expect(localStorage.getItem(RECALL_KEY)).toBeNull();
		expect(localStorage.getItem(DRILLS_KEY)).toBeNull();
	});

	it('when the new key already exists, wins immediately and never consults or deletes legacy keys', () => {
		localStorage.setItem(NEW_KEY, 'false');
		localStorage.setItem(RECALL_KEY, 'true');

		expect(readSongFilter()).toBe(false);

		// The legacy key is untouched: the new key won without migration.
		expect(localStorage.getItem(RECALL_KEY)).toBe('true');
	});

	it('a throwing localStorage.getItem degrades to false', () => {
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('storage disabled');
		});

		expect(readSongFilter()).toBe(false);
	});
});

describe('writeSongFilter', () => {
	it('writeSongFilter(true) then readSongFilter() returns true', () => {
		writeSongFilter(true);
		expect(readSongFilter()).toBe(true);
	});

	it('writeSongFilter(false) then readSongFilter() returns false', () => {
		writeSongFilter(true);
		writeSongFilter(false);
		expect(readSongFilter()).toBe(false);
	});

	it('a throwing localStorage.setItem is a no-op that does not throw', () => {
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('quota exceeded');
		});

		expect(() => writeSongFilter(true)).not.toThrow();
	});
});
