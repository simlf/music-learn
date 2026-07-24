/**
 * Maps a note name to French solfège. The syllable is degree-based (C→Do,
 * D→Ré…), and any accidental on the note carries through to the syllable so a
 * French reader sees the full name: "E♭" → "Mi♭" (mi bémol), "F♯" → "Fa♯"
 * (fa dièse), "F𝄪"/"Fx" → "Fa♯♯".
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
 * Normalizes an accidental suffix (ASCII `#`/`b`/`x` or glyph `♯`/`♭`) to the
 * app's display glyph convention (`♯`/`♭`). A double-sharp `x`/`𝄪` becomes
 * `♯♯`. Anything unrecognized is dropped.
 */
function accidentalToGlyphs(accidental: string): string {
	let out = '';
	for (const char of accidental) {
		if (char === '#' || char === '♯') {
			out += '♯';
		} else if (char === 'b' || char === '♭') {
			out += '♭';
		} else if (char === 'x' || char === '𝄪') {
			out += '♯♯';
		}
	}
	return out;
}

/**
 * Converts a note name (letter plus optional accidental, in ASCII or glyph
 * form) to its French solfège name, keeping the accidental: "E♭"/"Eb" → "Mi♭",
 * "F♯"/"F#" → "Fa♯". The base letter (first character) picks the syllable; the
 * remainder is normalized to display glyphs and appended.
 */
export function letterToSolfege(letter: string): string {
	const baseLetter = letter.charAt(0).toUpperCase();
	const syllable = LETTER_TO_SOLFEGE[baseLetter];
	if (syllable === undefined) {
		return '';
	}
	return syllable + accidentalToGlyphs(letter.slice(1));
}
