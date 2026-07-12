/**
 * Shared types for the theory engine. Pure data shapes only — no DOM, no audio,
 * no Svelte imports, so every later phase (drills, MIDI matching, scales) can
 * depend on this module freely.
 */

/** Which chord tone a spelled note represents, by scale-degree position. */
export type IntervalRole = 'root' | 'third' | 'fifth' | 'seventh';

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
