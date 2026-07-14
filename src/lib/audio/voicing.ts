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
 * Starting at octave 4, the octave increments whenever the chroma wraps
 * (stops ascending), so G7 plays G4-B4-D5-F5 rather than an inversion with
 * the D and F below the root.
 */
export function toAscendingPitches(notes: string[]): string[] {
	let octave = 4;
	let prev = -1;
	return notes.map((letter) => {
		const pitchClass = toAsciiPitchClass(letter);
		const chroma = Note.chroma(pitchClass) ?? 0;
		if (chroma <= prev) octave += 1;
		prev = chroma;
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
