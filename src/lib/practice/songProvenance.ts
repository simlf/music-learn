/**
 * Song-chord provenance: a pure, read-only derivation of "which of my songs
 * uses this chord?" from the songs stored via songs.ts. This module owns NO
 * localStorage key of its own (SONG-03 single source of truth) - it reads
 * songs exclusively through `listSongs()` / `activeSongChordSymbols()`, so
 * songs.ts stays the one place song data is persisted.
 *
 * Matching is enharmonic/alias-aware: two chord symbols "match" when they
 * normalize to the same canonical form via spellChord (tonal's parser), so
 * Cm7 = C-7 = Cmin7 and F♯ø7 = G♭ø7 collapse to one provenance entry. This
 * is never raw string equality.
 */

import { Note } from 'tonal';
import { spellChord } from '$lib/theory/chord';
import { activeSongChordSymbols, listSongs } from './songs';

/**
 * Normalizes a chord symbol for provenance matching: recognized symbols
 * collapse to a `${rootPitchClass}:${qualityName}` identity key built from
 * spellChord's already-parsed root/quality, so Cm7 = C-7 = Cmin7 (same
 * quality name, spellChord's own alias resolution) and F♯ø7 = G♭ø7 (root
 * pitch-class from `tonal`'s `Note.get`, quality name from spellChord,
 * ignoring the enharmonic letter spelling difference). An unrecognized
 * symbol falls back to its raw input unchanged, so a hand-entered/exotic
 * song symbol never throws and still matches itself.
 */
export function normalizeSymbolForMatch(symbol: string): string {
	const spelled = spellChord(symbol);
	if (!spelled.recognized) return symbol;

	const asciiRoot = spelled.root.replace(/♯/g, '#').replace(/♭/g, 'b');
	const rootChroma = Note.get(asciiRoot).chroma;
	// LO-01: a recognized chord with an empty/unparseable root (spellChord's
	// own `chord.tonic ?? ''` fallback, reachable via a rootless quality-only
	// symbol like "m7" - tonal's Chord.get resolves that to `tonic: ''`)
	// makes `Note.get('').chroma` come back NaN, not undefined. Without this
	// guard every such chord would collapse into the same colliding
	// "NaN:<quality>" bucket. Degrade the same way the unrecognized branch
	// above does: match only itself, never collide with an unrelated chord.
	if (Number.isNaN(rootChroma)) return symbol;
	return `${rootChroma}:${spelled.quality}`;
}

/**
 * Builds a symbol -> song-names index from all ACTIVE songs only (inactive
 * songs contribute nothing). Keys are normalized via
 * `normalizeSymbolForMatch`, so differently-spelled chords that mean the
 * same thing collapse to one entry. Values preserve first-seen order of
 * song names and never list the same song name twice for one symbol, even
 * if that song repeats the chord.
 */
export function buildProvenanceIndex(): Map<string, string[]> {
	const index = new Map<string, string[]>();

	for (const song of listSongs()) {
		if (!song.active) continue;

		for (const symbol of song.chordSymbols) {
			const key = normalizeSymbolForMatch(symbol);
			const names = index.get(key);
			if (names === undefined) {
				index.set(key, [song.name]);
			} else if (!names.includes(song.name)) {
				names.push(song.name);
			}
		}
	}

	return index;
}

/**
 * Song names containing the given chord symbol, in first-seen order.
 * Builds the index on demand when `index` is omitted (convenience for a
 * one-off call); pass a pre-built index when calling this repeatedly (e.g.
 * once per rendered chord) to avoid rebuilding it every time.
 */
export function songsForSymbol(symbol: string, index?: Map<string, string[]>): string[] {
	const provenanceIndex = index ?? buildProvenanceIndex();
	return provenanceIndex.get(normalizeSymbolForMatch(symbol)) ?? [];
}

/** True iff at least one active song contains this chord symbol. */
export function symbolHasProvenance(symbol: string, index?: Map<string, string[]>): boolean {
	return songsForSymbol(symbol, index).length > 0;
}

/**
 * The deduped active-song chord symbols, filtered to those spellChord
 * recognizes, in first-seen order. This is the restricted candidate
 * universe Drills draws from when the "From my songs" filter is ON:
 * recognized-only so a hand-entered/exotic song symbol never poses an
 * unrenderable drill question.
 */
export function drillableSongSymbols(): string[] {
	return activeSongChordSymbols().filter((symbol) => spellChord(symbol).recognized);
}
