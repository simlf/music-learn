import * as Tone from 'tone';
import { toAscendingPitches } from './voicing';

/**
 * Plain Tone.js synth playback for the "hear it" action (D-11). No sampled
 * piano, no sample loading, no perceptible delay - a lazily-initialized
 * PolySynth plays the given notes together via triggerAttackRelease.
 *
 * Kept isolated in src/lib/audio/ so the theory engine (src/lib/theory/*)
 * stays pure and never imports audio/DOM. Voicing math lives in voicing.ts.
 */

let synth: Tone.PolySynth | null = null;

function getSynth(): Tone.PolySynth {
	if (!synth) {
		synth = new Tone.PolySynth(Tone.Synth).toDestination();
	}
	return synth;
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
