import { Scale } from 'tonal';
import { letterToSolfege } from './solfege';
import { toAsciiAccidentals, toGlyphAccidentals } from './interval';
import type { IntervalRole, SpelledNote } from './types';

/**
 * Major scale spelling for the /scales explorer. Pure (no DOM, no audio, no
 * Svelte), tonal-backed like chord.ts: Scale.get is the vetted source of
 * enharmonically correct degree spellings (F♯ major keeps its E♯).
 */

/** The 12 tonics offered by the scale explorer: the proven jazz root set, in display glyphs. */
export const MAJOR_SCALE_ROOTS: readonly string[] = [
	'C',
	'D♭',
	'D',
	'E♭',
	'E',
	'F',
	'F♯',
	'G',
	'A♭',
	'A',
	'B♭',
	'B'
] as const;

/** One role per scale degree, in order: the extended IntervalRole union makes all seven renderable. */
const DEGREE_ROLES: readonly IntervalRole[] = [
	'root',
	'second',
	'third',
	'fourth',
	'fifth',
	'sixth',
	'seventh'
] as const;

/**
 * The seven spelled notes of `root` major, tagged with their degree-class
 * roles and French solfège, ready for PianoKeyboard/IntervalChip. Accepts
 * display glyphs or ASCII. Total: an unknown root returns [].
 */
export function majorScaleNotes(root: string): SpelledNote[] {
	const letters = Scale.get(`${toAsciiAccidentals(root)} major`).notes;
	if (letters.length !== DEGREE_ROLES.length) return [];
	return letters.map((ascii, index) => {
		const letter = toGlyphAccidentals(ascii);
		return {
			letter,
			solfege: letterToSolfege(letter),
			role: DEGREE_ROLES[index]
		};
	});
}
