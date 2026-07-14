/* TRACK-A-STUB: architect deletes at merge */
/**
 * Minimal typed stand-in for the Track A audio engine, matching the
 * ARCHITECTURE-CONTRACTS.md audio contract signatures exactly so Track C
 * consumers (keyboard inspect mode, lookup register, /scales) compile and
 * make sound tonight. Track A's real module (sampled piano, noteOn/noteOff
 * voice tracking, lookAhead tuning) replaces this file at merge; only the
 * exported surface below is load-bearing.
 *
 * jsdom-safe: Tone is loaded via dynamic import inside a user-gesture
 * handler and every failure is swallowed. Vitest consumers must
 * vi.mock('$lib/audio/audio') and never construct a real AudioContext.
 */

export type InstrumentKind = 'sampled' | 'synth';

export interface PlayOpts {
	velocity?: number;
	durationSec?: number;
}

const SOUND_KEY = 'music-learn:sound';

type ToneModule = typeof import('tone');

let tonePromise: Promise<ToneModule | null> | null = null;
let synth: import('tone').PolySynth | null = null;

async function getTone(): Promise<ToneModule | null> {
	if (!tonePromise) {
		tonePromise = import('tone').catch(() => null);
	}
	return tonePromise;
}

async function getSynth(): Promise<import('tone').PolySynth | null> {
	const Tone = await getTone();
	if (!Tone) return null;
	try {
		await Tone.start();
		if (!synth) {
			synth = new Tone.PolySynth(Tone.Synth).toDestination();
		}
		return synth;
	} catch {
		return null;
	}
}

/** Idempotent audio warm-up; call inside the first user gesture. */
export async function ensureAudioReady(): Promise<void> {
	await getSynth();
}

/** Plays one note ("C4", "Eb3" style). No-op when sound is disabled or audio is unavailable. */
export function playNote(note: string, opts?: PlayOpts): void {
	if (!soundEnabled()) return;
	void getSynth().then((s) => {
		try {
			s?.triggerAttackRelease(note, opts?.durationSec ?? 0.4, undefined, opts?.velocity);
		} catch {
			// Unparseable pitch or closed context: stay silent, never throw.
		}
	});
}

export function noteOn(note: string): void {
	if (!soundEnabled()) return;
	void getSynth().then((s) => {
		try {
			s?.triggerAttack(note);
		} catch {
			// Never throw from audio.
		}
	});
}

export function noteOff(note: string): void {
	void getSynth().then((s) => {
		try {
			s?.triggerRelease(note);
		} catch {
			// Never throw from audio.
		}
	});
}

/** Plays the given pitches together. The real Track A module resolves octave voicing internally. */
export function playChord(notes: string[], opts?: PlayOpts): void {
	if (!soundEnabled()) return;
	void getSynth().then((s) => {
		try {
			s?.triggerAttackRelease(notes, opts?.durationSec ?? 0.6, undefined, opts?.velocity);
		} catch {
			// Never throw from audio.
		}
	});
}

export function releaseAll(): void {
	try {
		synth?.releaseAll();
	} catch {
		// Never throw from audio.
	}
}

export function audioState(): { instrument: InstrumentKind; samplesLoaded: boolean } {
	return { instrument: 'synth', samplesLoaded: false };
}

/** Persisted sound toggle: localStorage "music-learn:sound"; when false all play* are no-ops. */
export function setSoundEnabled(enabled: boolean): void {
	try {
		localStorage.setItem(SOUND_KEY, enabled ? 'true' : 'false');
	} catch {
		// Storage unavailable: the toggle degrades to session-default (true).
	}
}

/** Defaults to true when unset or storage is unavailable. */
export function soundEnabled(): boolean {
	try {
		return localStorage.getItem(SOUND_KEY) !== 'false';
	} catch {
		return true;
	}
}
