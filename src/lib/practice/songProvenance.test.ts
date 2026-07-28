import { beforeEach, describe, expect, it } from 'vitest';
import { saveSong, type Song } from './songs';
import {
	buildProvenanceIndex,
	drillableSongSymbols,
	normalizeSymbolForMatch,
	songsForSymbol,
	symbolHasProvenance
} from './songProvenance';

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

describe('songProvenance', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	describe('normalizeSymbolForMatch', () => {
		it('collapses Cm7, C-7, and Cmin7 to the same canonical value', () => {
			const cm7 = normalizeSymbolForMatch('Cm7');
			expect(normalizeSymbolForMatch('C-7')).toBe(cm7);
			expect(normalizeSymbolForMatch('Cmin7')).toBe(cm7);
		});

		it('collapses F♯ø7 and G♭ø7 (enharmonic + half-diminished glyph)', () => {
			expect(normalizeSymbolForMatch('F♯ø7')).toBe(normalizeSymbolForMatch('G♭ø7'));
		});

		it('falls back to the raw input for an unrecognized symbol without throwing', () => {
			expect(() => normalizeSymbolForMatch('NotAChord')).not.toThrow();
			expect(normalizeSymbolForMatch('NotAChord')).toBe('NotAChord');
		});

		/**
		 * LO-01 regression, now fixed at the source: a rootless quality-only
		 * symbol (e.g. a hand-entered "m7" with no letter) is a REAL reachable
		 * case. tonal's Chord.get resolves it to `tonic: '', notes: []`, and
		 * spellChord used to report that as `recognized: true` - so provenance
		 * needed its own NaN guard to stop every rootless symbol collapsing
		 * into one colliding "NaN:<quality>" bucket. spellChord now treats an
		 * empty root / empty note set as UNRECOGNIZED, so these symbols take
		 * the raw-input branch and the local NaN patch is gone. The observable
		 * contract below is unchanged either way.
		 */
		it('degrades a rootless symbol (e.g. "m7" alone) to raw-input self-identity, never colliding with an unrelated rootless quality', () => {
			expect(() => normalizeSymbolForMatch('m7')).not.toThrow();
			expect(normalizeSymbolForMatch('m7')).toBe('m7');
			// A different rootless quality must not collide with 'm7's key.
			expect(normalizeSymbolForMatch('7')).toBe('7');
			expect(normalizeSymbolForMatch('7')).not.toBe(normalizeSymbolForMatch('m7'));
		});
	});

	describe('buildProvenanceIndex', () => {
		it('collapses differently-spelled chords across songs into one entry, first-seen order', () => {
			saveSong(song({ id: 'a', name: 'A name', chordSymbols: ['Cm7'] }));
			saveSong(song({ id: 'b', name: 'B name', chordSymbols: ['C-7'] }));

			const index = buildProvenanceIndex();

			expect(index.size).toBe(1);
			expect(index.get(normalizeSymbolForMatch('Cm7'))).toEqual(['A name', 'B name']);
		});

		it('excludes inactive songs entirely', () => {
			saveSong(song({ id: 'a', name: 'Active song', chordSymbols: ['Cm7'], active: true }));
			saveSong(song({ id: 'b', name: 'Inactive song', chordSymbols: ['F7'], active: false }));

			const index = buildProvenanceIndex();

			expect(songsForSymbol('Cm7', index)).toEqual(['Active song']);
			expect(songsForSymbol('F7', index)).toEqual([]);
		});

		it('does not double-list a song name that repeats the same chord', () => {
			saveSong(song({ id: 'a', name: 'A name', chordSymbols: ['Cm7', 'Cm7', 'C-7'] }));

			const index = buildProvenanceIndex();

			expect(index.get(normalizeSymbolForMatch('Cm7'))).toEqual(['A name']);
		});

		it('returns an empty Map for an empty/missing/malformed store', () => {
			expect(buildProvenanceIndex().size).toBe(0);

			localStorage.setItem('music-learn:songs', 'not json {{{');
			expect(buildProvenanceIndex().size).toBe(0);

			localStorage.setItem('music-learn:songs', JSON.stringify({ sneaky: 'object' }));
			expect(buildProvenanceIndex().size).toBe(0);
		});
	});

	describe('songsForSymbol', () => {
		it('returns song names for a chord stored under a different (matching) spelling', () => {
			saveSong(song({ id: 'a', name: 'A name', chordSymbols: ['Cm7'] }));

			expect(songsForSymbol('C-7')).toEqual(['A name']);
		});

		it('returns [] for a symbol in no song', () => {
			saveSong(song({ id: 'a', name: 'A name', chordSymbols: ['Cm7'] }));

			expect(songsForSymbol('Dm7')).toEqual([]);
		});

		it('builds the index on demand when omitted, and reuses a passed index', () => {
			saveSong(song({ id: 'a', name: 'A name', chordSymbols: ['Cm7'] }));

			const index = buildProvenanceIndex();
			expect(songsForSymbol('Cm7', index)).toEqual(['A name']);
			expect(songsForSymbol('Cm7')).toEqual(['A name']);
		});
	});

	describe('symbolHasProvenance', () => {
		it('is true iff songsForSymbol returns a non-empty array', () => {
			saveSong(song({ id: 'a', name: 'A name', chordSymbols: ['Cm7'] }));
			const index = buildProvenanceIndex();

			expect(symbolHasProvenance('Cm7', index)).toBe(true);
			expect(symbolHasProvenance('C-7', index)).toBe(true);
			expect(symbolHasProvenance('Dm7', index)).toBe(false);
		});
	});

	describe('drillableSongSymbols', () => {
		it('returns deduped active-song symbols recognized by spellChord, first-seen order', () => {
			saveSong(
				song({ id: 'a', name: 'A name', chordSymbols: ['Cm7', 'F7', 'Bbmaj7', 'Cm7'] })
			);
			saveSong(song({ id: 'b', name: 'B name', chordSymbols: ['F7', 'Gm'], active: true }));

			expect(drillableSongSymbols()).toEqual(['Cm7', 'F7', 'Bbmaj7', 'Gm']);
		});

		it('excludes an unrecognized/exotic symbol so it never poses an unrenderable drill', () => {
			saveSong(song({ id: 'a', name: 'A name', chordSymbols: ['Cm7', 'NotAChord'] }));

			expect(drillableSongSymbols()).toEqual(['Cm7']);
		});

		it('excludes inactive songs', () => {
			saveSong(song({ id: 'a', name: 'Active', chordSymbols: ['Cm7'], active: true }));
			saveSong(song({ id: 'b', name: 'Inactive', chordSymbols: ['F7'], active: false }));

			expect(drillableSongSymbols()).toEqual(['Cm7']);
		});
	});
});
