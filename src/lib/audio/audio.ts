import type * as ToneNS from 'tone';
import { toAsciiPitchClass, toAscendingPitches, toPitch } from './voicing';
import { SALAMANDER_BASE_URL, SALAMANDER_URLS } from './samples';

/**
 * The app's single audio engine (Track A contract, ARCHITECTURE-CONTRACTS.md).
 *
 * - Tone is loaded via a lazy dynamic import only: merely importing this
 *   module constructs nothing, so it is jsdom/test/prerender safe. Component
 *   tests mock this module (`vi.mock('$lib/audio/audio')`) and never touch a
 *   real AudioContext.
 * - Synth-first, never silent: a PolySynth plays instantly on the very first
 *   gesture while the Salamander sampled piano (1.9 MB, 30 mp3s) loads in the
 *   background, then the sampler swaps in transparently. If the sample fetch
 *   fails (offline), the session stays synth-only.
 * - `Tone.getContext().lookAhead = 0` kills tone's built-in 100ms scheduling
 *   delay so key touches feel immediate (R2-audio.md, risk 4).
 * - Spam hygiene: a 50ms per-note retrigger guard and a 16-voice soft cap on
 *   held notes (R2-audio.md, risk 5).
 * - Sound toggle: persisted to localStorage "music-learn:sound" (default
 *   true); while disabled every play call is a silent no-op and nothing is
 *   ever loaded.
 */

export type InstrumentKind = 'sampled' | 'synth';

export interface PlayOpts {
	/** NormalRange 0..1 gain scale. Defaults: 0.75 for notes, 0.85 for chords. */
	velocity?: number;
	/** Length of the sound in seconds. Defaults: '8n' for notes, '2n' for chords. */
	durationSec?: number;
}

const STORAGE_KEY = 'music-learn:sound';
const STUDY_MODE_STORAGE_KEY = 'music-learn:study-mode';
const NOTE_VELOCITY = 0.75;
const CHORD_VELOCITY = 0.85;
const NOTE_DURATION = '8n';
const CHORD_DURATION = '2n';
const RETRIGGER_WINDOW_MS = 50;
const MAX_HELD_VOICES = 16;
const SAMPLER_RELEASE_SEC = 0.8;

type ToneModule = typeof ToneNS;
type Instrument = ToneNS.PolySynth | ToneNS.Sampler;

let tonePromise: Promise<ToneModule> | null = null;
let toneModule: ToneModule | null = null;
let synth: ToneNS.PolySynth | null = null;
let sampler: ToneNS.Sampler | null = null;
let samplesLoaded = false;
let samplerFailed = false;
/** null = not read from localStorage yet (lazy, so import stays side-effect free). */
let enabled: boolean | null = null;
/** null = not read from localStorage yet (lazy, so import stays side-effect free). */
let studyMode: boolean | null = null;
/** Per-note last-attack timestamps for the 50ms retrigger guard. */
const lastAttackAt = new Map<string, number>();
/** Held (noteOn without noteOff) pitches in attack order, for the voice cap. */
const heldNotes: string[] = [];

function readStoredEnabled(): boolean {
	try {
		return localStorage.getItem(STORAGE_KEY) !== 'false';
	} catch {
		return true;
	}
}

/** Whether app sound is on. Default true; persisted per device. */
export function soundEnabled(): boolean {
	if (enabled === null) enabled = readStoredEnabled();
	return enabled;
}

/**
 * Flips app sound on or off, persisting to localStorage (write failures
 * degrade to a session-only toggle). Turning sound off also releases any
 * currently ringing notes so nothing sustains into the silence.
 */
export function setSoundEnabled(value: boolean): void {
	enabled = value;
	try {
		localStorage.setItem(STORAGE_KEY, String(value));
	} catch {
		// Storage disabled or full: keep the in-memory toggle working.
	}
	if (!value) releaseAll();
}

function readStoredStudyMode(): boolean {
	try {
		return localStorage.getItem(STUDY_MODE_STORAGE_KEY) === 'true';
	} catch {
		return false;
	}
}

/** Whether study mode (slower arpeggio roll on reveal) is on. Default false; persisted per device. */
export function studyModeEnabled(): boolean {
	if (studyMode === null) studyMode = readStoredStudyMode();
	return studyMode;
}

/**
 * Flips study mode on or off, persisting to localStorage (write failures
 * degrade to a session-only toggle). This is a playback-shape flag read at
 * call time, not an audio-output toggle, so it has no releaseAll() side
 * effect.
 */
export function setStudyModeEnabled(value: boolean): void {
	studyMode = value;
	try {
		localStorage.setItem(STUDY_MODE_STORAGE_KEY, String(value));
	} catch {
		// Storage disabled or full: keep the in-memory toggle working.
	}
}

function loadTone(): Promise<ToneModule> {
	if (!tonePromise) {
		tonePromise = import('tone').then((t) => {
			t.getContext().lookAhead = 0;
			synth = new t.PolySynth(t.Synth).toDestination();
			toneModule = t;
			return t;
		});
		// Allow a later retry if the code-split chunk failed to fetch.
		tonePromise.catch(() => {
			tonePromise = null;
		});
	}
	return tonePromise;
}

function beginSampleLoad(t: ToneModule): void {
	if (sampler || samplerFailed) return;
	sampler = new t.Sampler({
		urls: SALAMANDER_URLS,
		baseUrl: SALAMANDER_BASE_URL,
		release: SAMPLER_RELEASE_SEC,
		onload: () => {
			samplesLoaded = true;
		},
		onerror: () => {
			// Offline or misconfigured hosting: stay on the synth for this
			// session rather than retry-looping a broken fetch.
			samplerFailed = true;
			samplesLoaded = false;
		}
	}).toDestination();
}

/**
 * Unlocks the audio context and kicks off sample loading. Idempotent; call
 * it inside the first user gesture (Tone.start() only works from one).
 * Every play function also chains through it, so a missed explicit call
 * degrades gracefully rather than staying silent.
 */
export async function ensureAudioReady(): Promise<void> {
	if (!soundEnabled()) return;
	const t = await loadTone();
	await t.start();
	beginSampleLoad(t);
}

/** The instrument to attack on: sampled piano once loaded, synth until then. */
function activeInstrument(): Instrument | null {
	if (sampler && samplesLoaded) return sampler;
	return synth;
}

/**
 * Runs a play action once the engine is ready. Failures (autoplay policy,
 * chunk fetch, decode errors) are swallowed: audio is an enhancement and
 * must never break the drill loop.
 */
async function withInstrument(action: (instrument: Instrument) => void): Promise<void> {
	try {
		await ensureAudioReady();
		const instrument = activeInstrument();
		if (instrument) action(instrument);
	} catch {
		// Stay silent; never throw into UI code.
	}
}

/**
 * True when this pitch was attacked within the last 50ms (drag/tap spam).
 * Records the attempt time either way, so continuous spam stays gated.
 */
function isRetriggerSpam(pitch: string): boolean {
	const now = Date.now();
	const last = lastAttackAt.get(pitch);
	lastAttackAt.set(pitch, now);
	return last !== undefined && now - last < RETRIGGER_WINDOW_MS;
}

/** Releases a pitch on every instrument that could be sounding it. */
function releasePitch(pitch: string): void {
	synth?.triggerRelease(pitch);
	if (sampler && samplesLoaded) sampler.triggerRelease(pitch);
}

/** One-shot note (key tap). Accepts "C4" / "E♭3" style; glyphs normalized. */
export function playNote(note: string, opts: PlayOpts = {}): void {
	if (!soundEnabled()) return;
	const pitch = toAsciiPitchClass(note);
	if (isRetriggerSpam(pitch)) return;
	void withInstrument((instrument) => {
		instrument.triggerAttackRelease(
			pitch,
			opts.durationSec ?? NOTE_DURATION,
			undefined,
			opts.velocity ?? NOTE_VELOCITY
		);
	});
}

/** Attacks and holds a note until noteOff (future MIDI echo / held keys). */
export function noteOn(note: string): void {
	if (!soundEnabled()) return;
	const pitch = toAsciiPitchClass(note);
	if (isRetriggerSpam(pitch)) return;
	while (heldNotes.length >= MAX_HELD_VOICES) {
		const oldest = heldNotes.shift();
		if (oldest === undefined) break;
		void withInstrument(() => releasePitch(oldest));
	}
	heldNotes.push(pitch);
	void withInstrument((instrument) => {
		instrument.triggerAttack(pitch, undefined, NOTE_VELOCITY);
	});
}

/** Releases a held note. Safe to call for notes that never sounded. */
export function noteOff(note: string): void {
	const pitch = toAsciiPitchClass(note);
	const heldIndex = heldNotes.lastIndexOf(pitch);
	if (heldIndex !== -1) heldNotes.splice(heldIndex, 1);
	// Nothing has ever sounded: do not load a whole audio stack to release.
	if (!toneModule) return;
	releasePitch(pitch);
}

/**
 * Plays spelled-note letters (e.g. ['C','E♭','G','B♭']) as a block chord.
 * Octave voicing is resolved internally (ascending root position, octave 4
 * up) via voicing.ts, matching the on-screen keyboard's layout.
 */
export function playChord(notes: string[], opts: PlayOpts = {}): void {
	if (!soundEnabled()) return;
	if (notes.length === 0) return;
	const pitches = toAscendingPitches(notes);
	void withInstrument((instrument) => {
		instrument.triggerAttackRelease(
			pitches,
			opts.durationSec ?? CHORD_DURATION,
			undefined,
			opts.velocity ?? CHORD_VELOCITY
		);
	});
}

/**
 * Plays spelled-note letters as a staggered arpeggio roll (study mode), one
 * single-note attack per entry at `index * opts.staggerMs` ms, starting
 * synchronously at index 0. Notes are normalized and voiced at octave 4,
 * matching the reveal keyboard's voicing.
 *
 * This primitive owns ONLY the audio stagger; it does not drive pulse or
 * per-key lighting timing (that is a BuildSession-level concern).
 */
export function playArpeggio(notes: string[], opts: { staggerMs: number }): void {
	if (!soundEnabled()) return;
	if (notes.length === 0) return;
	notes.forEach((note, index) => {
		const pitch = toPitch(note, 4);
		setTimeout(() => {
			void withInstrument((instrument) => {
				instrument.triggerAttackRelease(pitch, NOTE_DURATION, undefined, NOTE_VELOCITY);
			});
		}, index * opts.staggerMs);
	});
}

/** Releases every sounding note on every instrument (component teardown). */
export function releaseAll(): void {
	heldNotes.length = 0;
	if (!toneModule) return;
	try {
		synth?.releaseAll();
		if (sampler && samplesLoaded) sampler.releaseAll();
	} catch {
		// Never throw into UI code.
	}
}

/** Current engine snapshot: which instrument plays and whether samples are in. */
export function audioState(): { instrument: InstrumentKind; samplesLoaded: boolean } {
	return {
		instrument: sampler && samplesLoaded ? 'sampled' : 'synth',
		samplesLoaded
	};
}

/**
 * Test-only seam: clears every piece of module-level state so each Vitest
 * case starts from a fresh, never-loaded engine. Not part of the app-facing
 * contract; never call from app code.
 */
export function _resetForTests(): void {
	tonePromise = null;
	toneModule = null;
	synth = null;
	sampler = null;
	samplesLoaded = false;
	samplerFailed = false;
	enabled = null;
	studyMode = null;
	lastAttackAt.clear();
	heldNotes.length = 0;
}
