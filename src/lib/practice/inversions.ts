import { Note } from 'tonal';
import { spellChord } from '$lib/theory/chord';
import { toAsciiAccidentals } from '$lib/theory/interval';
import type { ChordResult, IntervalRole, SpelledNote } from '$lib/theory/types';

/**
 * Pure inversion engine for the new inversion drill family (INV-01,
 * 35-UI-SPEC section 8). Derives, from `spellChord`'s tonal-backed data
 * only, the inversion count for a chord, the bass role/note for a given
 * inversion index, and the ascending inversion voicing (bass lowest,
 * remaining tones stacked upward with each note keeping its own fixed
 * role). No new theory source: everything is read off `ChordResult.notes`.
 *
 * Pure module: no DOM/Svelte/Dexie, mirroring shellVoicing.ts's purity
 * discipline. Every export is total - an unrecognized symbol or
 * out-of-range index returns an empty array/undefined rather than
 * throwing.
 */

/** The keyboard's fixed base octave for the bass note of any inversion (matches ProgressionDrill's KEYBOARD_BASE_OCTAVE), so callers pin bassHint/ghost keys to the same octave. */
export const INVERSION_BASE_OCTAVE = 4;

/** R/3/5/7 ghost markers by role, reusing ProgressionDrill's GHOST_MARKER_BY_ROLE vocabulary. */
const MARKER_BY_ROLE: Partial<Record<IntervalRole, string>> = {
	root: 'R',
	third: '3',
	fifth: '5',
	seventh: '7'
};

/** The single source of the inversion-index-to-bass-role table (0 root, 1 third, 2 fifth, 3 seventh). Both prompt copy and grading derive the bass role from this table - no parallel table. */
const BASS_ROLE_BY_INDEX: IntervalRole[] = ['root', 'third', 'fifth', 'seventh'];

/** One note in an ascending inversion voicing: its letter, assigned octave, fixed role, and R/3/5/7 marker. */
export interface InversionVoicingNote {
	letter: string;
	octave: number;
	role: IntervalRole;
	marker: string;
}

/**
 * Number of inversions a chord symbol exposes: 3 for a recognized triad, 4
 * for a recognized seventh chord, 0 for an unrecognized symbol. Total: never
 * throws.
 */
export function inversionCountFor(symbol: string): number {
	const chord = spellChord(symbol);
	return chord.recognized ? chord.notes.length : 0;
}

/**
 * The bass role for a given inversion index: 0 root, 1 third, 2 fifth,
 * 3 seventh. Undefined for any out-of-range index (negative, or 4+ for a
 * triad).
 */
export function bassRoleForIndex(index: number): IntervalRole | undefined {
	return BASS_ROLE_BY_INDEX[index];
}

/**
 * The spelled note carrying the bass role for a given inversion index, or
 * undefined when the index is out of range or the chord lacks that role
 * (e.g. index 3/seventh on a triad).
 */
export function bassNoteFor(chord: ChordResult, index: number): SpelledNote | undefined {
	const role = bassRoleForIndex(index);
	if (role === undefined) return undefined;
	return chord.notes.find((note) => note.role === role);
}

/**
 * The ascending inversion voicing for `chord` at `index`: rotates
 * `chord.notes` so the bass role leads, pins the bass to
 * `INVERSION_BASE_OCTAVE`, then walks the rotated notes assigning ascending
 * octaves - incrementing the octave whenever the next note's pitch class
 * does not sit strictly above the running pitch class (chroma-based, via
 * tonal's `Note.chroma`, the same ascending-placement idea keyboardLayout
 * uses). Each entry keeps its own fixed role and an R/3/5/7 marker. Returns
 * an empty array when the chord is unrecognized or the bass role is
 * missing for this index - total, never throws.
 */
export function inversionVoicing(chord: ChordResult, index: number): InversionVoicingNote[] {
	if (!chord.recognized || chord.notes.length === 0) return [];

	const bassNote = bassNoteFor(chord, index);
	if (!bassNote) return [];

	const bassPosition = chord.notes.findIndex((note) => note.role === bassNote.role);
	const rotated = [...chord.notes.slice(bassPosition), ...chord.notes.slice(0, bassPosition)];

	const result: InversionVoicingNote[] = [];
	let octave = INVERSION_BASE_OCTAVE;
	let runningChroma: number | undefined;

	for (const note of rotated) {
		const chroma = Note.chroma(toAsciiAccidentals(note.letter));
		if (chroma === undefined) continue;

		if (runningChroma !== undefined && chroma <= runningChroma) {
			octave += 1;
		}

		result.push({
			letter: note.letter,
			octave,
			role: note.role,
			marker: MARKER_BY_ROLE[note.role] ?? ''
		});

		runningChroma = chroma;
	}

	return result;
}
