import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	activeSongChordSymbols,
	deleteSong,
	findSongByPresetId,
	listSongs,
	saveSong,
	type Song
} from './songs';

const STORAGE_KEY = 'music-learn:songs';

/** Minimal valid Song factory so each test states only what it cares about. */
function song(overrides: Partial<Song> = {}): Song {
	return {
		id: 'song-1',
		name: 'Autumn Leaves (my chart)',
		chordSymbols: ['Cm7', 'F7', 'Bbmaj7'],
		createdAt: '2026-07-14T00:00:00.000Z',
		source: 'custom',
		active: true,
		...overrides
	};
}

describe('songs localStorage persistence', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('listSongs', () => {
		it('returns [] when the store is empty', () => {
			expect(listSongs()).toEqual([]);
		});

		it('returns saved songs in insertion order', () => {
			saveSong(song({ id: 'a', name: 'First' }));
			saveSong(song({ id: 'b', name: 'Second' }));

			expect(listSongs().map((s) => s.name)).toEqual(['First', 'Second']);
		});

		it('round-trips every Song field including the optional presetId', () => {
			const preset = song({
				id: 'p1',
				source: 'preset',
				presetId: 'blue-bossa-cm',
				active: false
			});
			saveSong(preset);

			expect(listSongs()).toEqual([preset]);
		});
	});

	describe('saveSong', () => {
		it('updates an existing song in place by id, keeping its list position', () => {
			saveSong(song({ id: 'a', name: 'First' }));
			saveSong(song({ id: 'b', name: 'Second' }));

			saveSong(song({ id: 'a', name: 'First, renamed', chordSymbols: ['Gm'] }));

			const names = listSongs().map((s) => s.name);
			expect(names).toEqual(['First, renamed', 'Second']);
			expect(listSongs()[0].chordSymbols).toEqual(['Gm']);
		});

		it('degrades to a no-op when localStorage writes fail', () => {
			vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
				throw new Error('quota exceeded');
			});

			expect(() => saveSong(song())).not.toThrow();
		});
	});

	describe('deleteSong', () => {
		it('removes the song with the given id', () => {
			saveSong(song({ id: 'a' }));
			saveSong(song({ id: 'b' }));

			deleteSong('a');

			expect(listSongs().map((s) => s.id)).toEqual(['b']);
		});

		it('is a no-op for an unknown id', () => {
			saveSong(song({ id: 'a' }));

			expect(() => deleteSong('nope')).not.toThrow();
			expect(listSongs()).toHaveLength(1);
		});
	});

	describe('activeSongChordSymbols', () => {
		it('returns [] when no songs exist', () => {
			expect(activeSongChordSymbols()).toEqual([]);
		});

		it('returns the deduped union across active songs, first seen first', () => {
			saveSong(
				song({ id: 'a', chordSymbols: ['Cm7', 'F7', 'Bbmaj7', 'Cm7'] })
			);
			saveSong(song({ id: 'b', chordSymbols: ['F7', 'Gm', 'D7'] }));

			expect(activeSongChordSymbols()).toEqual(['Cm7', 'F7', 'Bbmaj7', 'Gm', 'D7']);
		});

		it('excludes inactive songs entirely', () => {
			saveSong(song({ id: 'a', chordSymbols: ['Cm7'], active: true }));
			saveSong(song({ id: 'b', chordSymbols: ['Em7', 'A7'], active: false }));

			expect(activeSongChordSymbols()).toEqual(['Cm7']);
		});

		it('returns [] when every song is inactive', () => {
			saveSong(song({ id: 'a', active: false }));

			expect(activeSongChordSymbols()).toEqual([]);
		});
	});

	describe('findSongByPresetId (DPOL-01)', () => {
		it('returns undefined for an empty list', () => {
			expect(findSongByPresetId([], 'blue-bossa-cm')).toBeUndefined();
		});

		it('returns the song copied from the matching preset', () => {
			const preset = song({ id: 'p1', source: 'preset', presetId: 'blue-bossa-cm' });
			const other = song({ id: 'p2', source: 'preset', presetId: 'summertime-am' });

			expect(findSongByPresetId([other, preset], 'blue-bossa-cm')).toEqual(preset);
		});

		it('ignores custom songs (no presetId) and non-matching presetIds', () => {
			const custom = song({ id: 'c1', source: 'custom' });
			const otherPreset = song({ id: 'p1', source: 'preset', presetId: 'summertime-am' });

			expect(findSongByPresetId([custom, otherPreset], 'blue-bossa-cm')).toBeUndefined();
		});
	});

	describe('schema-guarded parsing (malformed storage never throws)', () => {
		it('falls back to [] on non-JSON garbage', () => {
			localStorage.setItem(STORAGE_KEY, 'not json {{{');

			expect(listSongs()).toEqual([]);
		});

		it('falls back to [] when the stored value is not an array', () => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ sneaky: 'object' }));

			expect(listSongs()).toEqual([]);
		});

		it('drops malformed entries while keeping valid ones', () => {
			const valid = song({ id: 'ok' });
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify([
					valid,
					null,
					42,
					'string',
					{ id: 'missing-fields' },
					{ ...song({ id: 'bad-chords' }), chordSymbols: ['Cm7', 7] },
					{ ...song({ id: 'bad-source' }), source: 'imported' },
					{ ...song({ id: 'bad-active' }), active: 'yes' },
					{ ...song({ id: 'bad-preset-ref' }), presetId: 12 }
				])
			);

			expect(listSongs()).toEqual([valid]);
		});

		it('recovers by overwriting the corrupt store on the next save', () => {
			localStorage.setItem(STORAGE_KEY, 'not json {{{');

			saveSong(song({ id: 'fresh' }));

			expect(listSongs().map((s) => s.id)).toEqual(['fresh']);
		});
	});
});
