/* TRACK-A-STUB: architect deletes at merge. Track A owns src/lib/audio/audio.ts;
 * this minimal typed stand-in only exists so Track D's /theory route can code
 * against the binding audio contract (ARCHITECTURE-CONTRACTS.md) in isolation.
 * It routes through the existing synth playChord so tappable lesson examples
 * are audible on this branch too. Tests must vi.mock('$lib/audio/audio'). */

import { playChord as legacyPlayChord } from './playChord';

export type InstrumentKind = 'sampled' | 'synth';

export interface PlayOpts {
	velocity?: number;
	durationSec?: number;
}

/** Idempotent; call inside the first user gesture. Legacy playChord awaits Tone.start itself. */
export async function ensureAudioReady(): Promise<void> {
	// The legacy synth path resumes the AudioContext lazily on first play.
}

/** Plays spelled-note letters as a chord; octave voicing resolved internally. */
export function playChord(notes: string[], _opts?: PlayOpts): void {
	void legacyPlayChord(notes).catch(() => {
		// Autoplay policy or missing AudioContext: stay silent, never break the page.
	});
}
