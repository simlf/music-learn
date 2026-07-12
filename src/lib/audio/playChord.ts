import * as Tone from 'tone';
import { Note } from 'tonal';

/**
 * Plain Tone.js synth playback for the "hear it" action (D-11). No sampled
 * piano, no sample loading, no perceptible delay - a lazily-initialized
 * PolySynth plays the given notes together via triggerAttackRelease.
 *
 * Kept isolated in src/lib/audio/ so the theory engine (src/lib/theory/*)
 * stays pure and never imports audio/DOM.
 */

let synth: Tone.PolySynth | null = null;

function getSynth(): Tone.PolySynth {
	if (!synth) {
		synth = new Tone.PolySynth(Tone.Synth).toDestination();
	}
	return synth;
}

/** Converts a display-glyph letter (e.g. "B♭", "F♯") into an ASCII pitch class. */
function toAsciiPitchClass(letter: string): string {
	return letter.replace(/♯/g, '#').replace(/♭/g, 'b');
}

/**
 * Assigns ascending octaves to the given pitch classes so the chord sounds
 * in root position, matching the keyboard's ascending root-position voicing.
 * Starting at octave 4, the octave increments whenever the chroma wraps
 * (stops ascending), so G7 plays G4-B4-D5-F5 rather than an inversion with
 * the D and F below the root.
 */
function toAscendingPitches(notes: string[]): string[] {
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
 * Plays the given spelled-note letters as a chord on a plain synth. Must be
 * called from a user gesture handler (e.g. a button click) - Tone.start()
 * resumes the browser's Web Audio context, which browsers only allow after
 * an explicit user interaction (autoplay policy).
 */
export async function playChord(notes: string[]): Promise<void> {
	await Tone.start();
	getSynth().triggerAttackRelease(toAscendingPitches(notes), '4n');
}
