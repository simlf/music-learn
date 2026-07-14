import { Note } from 'tonal';

/**
 * Pure voicing math for the audio engine: how spelled-note letters (display
 * glyphs, e.g. "B♭") become concrete Tone-ready pitches (ASCII, e.g. "Bb4").
 * Extracted from the original playChord.ts so it stays directly unit-testable
 * with zero audio mocking. No DOM, no Tone, no Svelte imports.
 */

/** Converts a display-glyph letter (e.g. "B♭", "F♯") into an ASCII pitch class. */
export function toAsciiPitchClass(letter: string): string {
	return letter.replace(/♯/g, '#').replace(/♭/g, 'b');
}

/**
 * Assigns ascending octaves to the given pitch classes so the chord sounds
 * in root position, matching the keyboard's ascending root-position voicing.
 * Starting at octave 4, each note takes the lowest octave whose SOUNDING
 * midi (letter-based, matching Tone's convention where Cb4 sounds B3 and
 * B#4 sounds C5) rises above the previous note. Comparing chromas instead
 * would voice C♭/B♯ spellings an octave off: A♭m (A♭ C♭ E♭) must play
 * midi 68-71-75, not 68-59-75.
 */
export function toAscendingPitches(notes: string[]): string[] {
	let octave = 4;
	let prevMidi = -1;
	return notes.map((letter) => {
		const pitchClass = toAsciiPitchClass(letter);
		let midi = Note.midi(`${pitchClass}${octave}`) ?? 0;
		while (midi <= prevMidi) {
			octave += 1;
			midi = Note.midi(`${pitchClass}${octave}`) ?? midi + 12;
		}
		prevMidi = midi;
		return `${pitchClass}${octave}`;
	});
}

/**
 * Joins a key letter (display glyphs allowed) with an octave number into a
 * Tone-ready ASCII pitch, e.g. ("F♯", 5) -> "F#5". The on-screen keyboard
 * reports letter + octave; this is the single seam where they become a pitch.
 */
export function toPitch(letter: string, octave: number): string {
	return `${toAsciiPitchClass(letter)}${octave}`;
}
