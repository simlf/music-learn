/**
 * Shared types for the theory engine. Pure data shapes only — no DOM, no audio,
 * no Svelte imports, so every later phase (drills, MIDI matching, scales) can
 * depend on this module freely.
 */

/**
 * Which scale-degree class a spelled note represents. Covers all seven
 * degree classes so scale degrees and extended/suspended chord tones render
 * through the same color pipeline; compound extensions map down to their
 * simple class (9 to second, 11 to fourth, 13 to sixth).
 */
export type IntervalRole =
	| 'root'
	| 'second'
	| 'third'
	| 'fourth'
	| 'fifth'
	| 'sixth'
	| 'seventh';

/** A single spelled note: letter name (with accidental glyph), French solfège, and its interval role. */
export interface SpelledNote {
	/** Letter name with proper accidental glyphs, e.g. "C♯", "B♭". Never ASCII #/b. */
	letter: string;
	/** French solfège syllable for the letter, e.g. "Do", "Ré". Degree-based: only the letter matters, not the accidental. */
	solfege: string;
	/** Position of this note in the chord's interval formula. */
	role: IntervalRole;
}

/** Result of spelling a jazz chord symbol. */
export interface ChordResult {
	/** The raw string passed in by the caller. */
	input: string;
	/** The canonical symbol tonal resolved to (e.g. "Cm7"). Empty string if unrecognized. */
	symbol: string;
	/** The chord's root/tonic letter, with accidental glyph. Empty string if unrecognized. */
	root: string;
	/** Human-readable quality name (e.g. "minor seventh"). Empty string if unrecognized. */
	quality: string;
	/** Whether the input was successfully parsed into a known chord. */
	recognized: boolean;
	/** All notation aliases tonal considers equivalent to this chord's quality. */
	aliases: string[];
	/** Ordered, interval-tagged, dual-named spelled notes. Empty array if unrecognized. */
	notes: SpelledNote[];
}
