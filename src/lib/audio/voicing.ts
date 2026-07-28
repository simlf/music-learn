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

/** Octave the block-chord/root-position voicing starts from. */
const ROOT_POSITION_OCTAVE = 4;
/** Octave the comping voicing puts its bass root in (a tenth or so below the guide tones). */
const COMP_BASS_OCTAVE = 3;
/** Octave the comping voicing starts its upper (guide-tone) notes from. */
const COMP_UPPER_OCTAVE = 4;

/**
 * Shared ascending-assignment walk: from `startOctave`, each pitch class takes
 * the lowest octave whose SOUNDING midi (letter-based, matching Tone's
 * convention where Cb4 sounds B3 and B#4 sounds C5) rises above `floorMidi`
 * and then above each previously assigned note. Comparing chromas instead
 * would voice C♭/B♯ spellings an octave off: A♭m (A♭ C♭ E♭) must play
 * midi 68-71-75, not 68-59-75.
 */
function ascendFrom(notes: string[], startOctave: number, floorMidi: number): string[] {
	let octave = startOctave;
	let prevMidi = floorMidi;
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
 * Assigns ascending octaves to the given pitch classes so the chord sounds
 * in root position, matching the keyboard's ascending root-position voicing.
 */
export function toAscendingPitches(notes: string[]): string[] {
	return ascendFrom(notes, ROOT_POSITION_OCTAVE, -1);
}

/**
 * The comping voicing: the root alone down in octave 3, then `upper` (the
 * chord's guide tones) ascending from octave 4, each strictly above the bass.
 * This is the left-hand shell a jazz pianist actually comps with: the root
 * anchors the change so the harmony is followable, the guide tones say which
 * chord it is, and everything from roughly C5 up is left empty for the player
 * to improvise in.
 *
 * The bass is assigned through the same `ascendFrom` walk (rather than a bare
 * string concat) so a B♯ root still sounds where its letter says it does, and
 * the upper notes are floored at the bass's own sounding midi so the voicing
 * is strictly ascending even for a root that sounds high inside its octave.
 *
 * Total: a root tonal cannot turn into a pitch (empty string, garbage) is
 * dropped rather than emitted as a bogus pitch string, leaving a plain
 * root-position voicing of `upper`.
 */
export function toCompPitches(root: string, upper: string[]): string[] {
	const [bass] = ascendFrom([root], COMP_BASS_OCTAVE, -1);
	const bassMidi = bass === undefined ? null : Note.midi(bass);
	if (bass === undefined || bassMidi === null) return toAscendingPitches(upper);
	return [bass, ...ascendFrom(upper, COMP_UPPER_OCTAVE, bassMidi)];
}

/**
 * Joins a key letter (display glyphs allowed) with an octave number into a
 * Tone-ready ASCII pitch, e.g. ("F♯", 5) -> "F#5". The on-screen keyboard
 * reports letter + octave; this is the single seam where they become a pitch.
 */
export function toPitch(letter: string, octave: number): string {
	return `${toAsciiPitchClass(letter)}${octave}`;
}
