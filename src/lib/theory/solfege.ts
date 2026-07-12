/**
 * Maps a note's letter name to French solfège. Solfège is degree-based (the
 * syllable follows the letter, not the accidental) - C♯ and C♭ both map to
 * "Do", matching how a French speaker would say the note aloud in solfège.
 *
 * Pure function: no DOM, no audio, no Svelte imports.
 */

const LETTER_TO_SOLFEGE: Record<string, string> = {
	C: 'Do',
	D: 'Ré',
	E: 'Mi',
	F: 'Fa',
	G: 'Sol',
	A: 'La',
	B: 'Si'
};

/**
 * Converts a note's letter (optionally with accidental glyphs/ASCII) to its
 * French solfège syllable. Only the base letter (first character) determines
 * the syllable.
 */
export function letterToSolfege(letter: string): string {
	const baseLetter = letter.charAt(0).toUpperCase();
	return LETTER_TO_SOLFEGE[baseLetter] ?? '';
}
