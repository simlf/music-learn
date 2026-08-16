import type * as ToneNS from 'tone';
import { toAsciiPitchClass, toAscendingPitches, toCompPitches, toMelodyPitch } from './voicing';
import { SALAMANDER_BASE_URL, SALAMANDER_URLS } from './samples';
import { BEATS_PER_BAR, nextBarIndex, secondsPerBeat } from './loopTiming';

/**
 * The app's single audio engine (Track A contract, ARCHITECTURE-CONTRACTS.md).
 *
 * - Tone is loaded via a lazy dynamic import only: merely importing this
 *   module constructs nothing, so it is jsdom/test/prerender safe. Component
 *   tests mock this module (`vi.mock('$lib/audio/audio')`) and never touch a
 *   real AudioContext.
 * - Sampler-first, never a timbre swap mid-session: the Salamander sampled
 *   piano (1.9 MB, 30 mp3s, self-hosted so it loads fast) is preloaded on the
 *   first user gesture, and play calls await that load so the very first note
 *   sounds on the real piano - identical to every note after it. A PolySynth
 *   is kept as a fallback only: if the sample fetch fails (offline) or is
 *   still in flight when a note is played, the synth covers that note so the
 *   app is never silent. Once samples are in, every note is the sampler.
 * - `Tone.getContext().lookAhead = 0` kills tone's built-in 100ms scheduling
 *   delay so key touches feel immediate (R2-audio.md, risk 4).
 * - Spam hygiene: a 50ms per-note retrigger guard and a 16-voice soft cap on
 *   held notes (R2-audio.md, risk 5).
 * - Sound toggle: persisted to localStorage "music-learn:sound" (default
 *   true); while disabled every play call is a silent no-op and nothing is
 *   ever loaded.
 * - Comping loop (startCompLoop / stopCompLoop): the ONE repeating-playback
 *   path, scheduled on Tone's Transport rather than setTimeout, since a
 *   timer-driven loop drifts audibly within a few bars. At most one loop runs
 *   at a time, and turning sound off kills it. This engine schedules pitches
 *   and nothing else: it knows no chords, no progressions, and no theory.
 * - Chord-with-note demo (playNotesOverChord / stopChordDemo): a held chord
 *   with one note sounding over it, optionally twice in a row for an A/B. Same
 *   instrument as everything else; what it adds is cancellation, since a demo
 *   outlasts the click that started it.
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
/**
 * Conservative post-attack gate windows (ms) for `isAppAudioActive()`
 * (Spike 025 / the mic verifier, ARCHITECTURE-CONTRACTS.md Track A). Not
 * tempo-exact: NOTE_DURATION/CHORD_DURATION are Tone.js time strings ('8n',
 * '2n') that only resolve to real seconds against a live Transport, and
 * gating accuracy does not need that precision - it only needs to comfortably
 * outlast any real playback plus the sampler's release tail, so a caller
 * polling this signal never mistakes ring-out for silence. Spike 025 found
 * that WITHOUT this gate, a mic-based chord verifier accepted an unplayed
 * chord 97.2% of the time because it was hearing the app's own speaker.
 */
const NOTE_AUDIO_GATE_MS = 1200;
const CHORD_AUDIO_GATE_MS = 2600;
/**
 * Comp velocity, deliberately under CHORD_VELOCITY: the loop is an
 * accompaniment the player improvises OVER, so it must sit below whatever the
 * player is doing rather than compete with it.
 */
const COMP_VELOCITY = 0.62;
/** Fraction of the bar a comped chord is held for, leaving a small gap before the next bar lands. */
const COMP_HOLD_RATIO = 0.92;

type ToneModule = typeof ToneNS;
type Instrument = ToneNS.PolySynth | ToneNS.Sampler;

let tonePromise: Promise<ToneModule> | null = null;
let toneModule: ToneModule | null = null;
let synth: ToneNS.PolySynth | null = null;
let sampler: ToneNS.Sampler | null = null;
let samplesLoaded = false;
let samplerFailed = false;
/**
 * Resolves once the sampler has finished loading (onload) or definitively
 * failed (onerror). Play calls await this so the first audible note lands on
 * the sampled piano rather than the synth. null until sample loading begins.
 */
let samplerReady: Promise<void> | null = null;
/** null = not read from localStorage yet (lazy, so import stays side-effect free). */
let enabled: boolean | null = null;
/** null = not read from localStorage yet (lazy, so import stays side-effect free). */
let studyMode: boolean | null = null;
/** Per-note last-attack timestamps for the 50ms retrigger guard. */
const lastAttackAt = new Map<string, number>();
/** Held (noteOn without noteOff) pitches in attack order, for the voice cap. */
const heldNotes: string[] = [];
/** The single running comping loop, or null. See startCompLoop. */
let activeLoop: ActiveLoop | null = null;
/**
 * Timestamp (Date.now()) until which a one-shot playNote/playChord/
 * playArpeggio attack might still be ringing. Read only through
 * `isAppAudioActive()`, alongside the held-notes and comp-loop checks there.
 */
let audioBusyUntilMs = 0;
/**
 * Monotonic loop generation. Bumped by every start AND every stop, so an
 * in-flight `startCompLoop` whose awaits resolve after the component unmounted
 * (or after a newer loop started) sees a stale token and never touches the
 * Transport. This is the guard that keeps a loop from outliving its page.
 */
let loopToken = 0;

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
 * degrade to a session-only toggle). Turning sound off also kills the comping
 * loop and releases any currently ringing notes, so nothing keeps playing or
 * sustains into the silence. The loop is stopped BEFORE the release, so the
 * Transport cannot schedule one more bar after the voices were cut.
 */
export function setSoundEnabled(value: boolean): void {
	enabled = value;
	try {
		localStorage.setItem(STORAGE_KEY, String(value));
	} catch {
		// Storage disabled or full: keep the in-memory toggle working.
	}
	if (!value) {
		stopChordDemo();
		stopCompLoop();
		releaseAll();
		audioBusyUntilMs = 0;
	}
}

/**
 * True while app-triggered sound might still be audible: a held note or
 * comping loop is currently running, or a recent one-shot play call's
 * conservative gate window (see NOTE/CHORD_AUDIO_GATE_MS) has not elapsed.
 * The seam a mic-based verifier (Spike 025) polls to suppress detection
 * while the app's own speaker could be sounding the answer - see
 * MicCheckPanel.svelte, which resets its stability tracker whenever this is
 * true rather than letting a frame count toward a confirmed match.
 */
export function isAppAudioActive(): boolean {
	if (heldNotes.length > 0) return true;
	if (activeLoop !== null) return true;
	return Date.now() < audioBusyUntilMs;
}

/** Extends (never shortens) the audio-busy gate window. See isAppAudioActive. */
function markAudioBusyFor(ms: number): void {
	const until = Date.now() + ms;
	if (until > audioBusyUntilMs) audioBusyUntilMs = until;
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
	samplerReady = new Promise<void>((resolve) => {
		sampler = new t.Sampler({
			urls: SALAMANDER_URLS,
			baseUrl: SALAMANDER_BASE_URL,
			release: SAMPLER_RELEASE_SEC,
			onload: () => {
				samplesLoaded = true;
				resolve();
			},
			onerror: () => {
				// Offline or misconfigured hosting: stay on the synth for this
				// session rather than retry-looping a broken fetch.
				samplerFailed = true;
				samplesLoaded = false;
				resolve();
			}
		}).toDestination();
	});
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

/**
 * The instrument to attack on: the sampled piano once loaded, otherwise the
 * synth. Play calls await sample loading (see withInstrument) before reading
 * this, so the synth is only ever chosen when loading has failed - not merely
 * because it is still in flight.
 */
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
	const instrument = await readyInstrument();
	if (!instrument) return;
	try {
		action(instrument);
	} catch {
		// Stay silent; never throw into UI code.
	}
}

/**
 * Awaits the whole ready path (context unlock, Tone chunk, samples) and hands
 * back the instrument to attack on, or null when the engine could not come up.
 * Callers that must SEQUENCE attacks await this once up front, so a slow first
 * load delays the sequence instead of collapsing its steps into one tick.
 */
async function readyInstrument(): Promise<Instrument | null> {
	try {
		await ensureAudioReady();
		// Wait for the sampled piano before choosing an instrument, so the
		// first note sounds on the real piano rather than the synth. If loading
		// fails (samplerReady resolves via onerror) or is somehow absent, we
		// fall through to the synth so the app is never silent.
		if (samplerReady) await samplerReady;
		return activeInstrument();
	} catch {
		return null;
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
	markAudioBusyFor(NOTE_AUDIO_GATE_MS);
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
	// A held note's own release tail: isAppAudioActive's heldNotes check ends
	// the instant this note is removed, so extend the busy window a little
	// further to cover the sampler's actual decay.
	if (heldNotes.length === 0) markAudioBusyFor(SAMPLER_RELEASE_SEC * 1000);
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
	markAudioBusyFor(CHORD_AUDIO_GATE_MS);
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
 * single-note attack per entry at `(opts.startDelayMs ?? 0) + index *
 * opts.staggerMs` ms. Notes are voiced via `toAscendingPitches` (ascending
 * root position), identical to `playChord` and the on-screen keyboard, so
 * every rolled pitch equals the pitch its key would strike. `startDelayMs`
 * (default 0) offsets every attack by the same amount, so the roll can be
 * aligned with a delayed visual roll; omitting it keeps note 0 attacking
 * synchronously at t=0.
 *
 * This primitive owns ONLY the audio stagger; it does not drive pulse or
 * per-key lighting timing (that is a BuildSession-level concern).
 */
export function playArpeggio(
	notes: string[],
	opts: { staggerMs: number; startDelayMs?: number }
): void {
	if (!soundEnabled()) return;
	if (notes.length === 0) return;
	const pitches = toAscendingPitches(notes);
	const startDelayMs = opts.startDelayMs ?? 0;
	markAudioBusyFor(startDelayMs + pitches.length * opts.staggerMs + NOTE_AUDIO_GATE_MS);
	pitches.forEach((pitch, index) => {
		setTimeout(() => {
			void withInstrument((instrument) => {
				instrument.triggerAttackRelease(pitch, NOTE_DURATION, undefined, NOTE_VELOCITY);
			});
		}, startDelayMs + index * opts.staggerMs);
	});
}

/**
 * ---- Chord-with-note demo ----
 *
 * "Hold the chord in the left hand, sound one note over it": the playback the
 * improvisation guide needs so an avoid note's rub and a color note's flavour
 * are heard rather than read. One step is one listen; two steps back to back
 * are the A/B comparison (the chord tone, then the half step above it).
 *
 * It is the same instrument, the same sample load and the same no-throw
 * contract as every other call here, not a second sound path. What it adds is
 * cancellation: a demo lasts seconds, so a second click must cut the first one
 * rather than stack a second chord on top of it.
 */

/** Seconds one demo step is held for. Long enough to hear a rub settle in. */
const DEMO_HOLD_SEC = 1.7;
/** Seconds of silence between two demo steps, so the pair reads as two events. */
const DEMO_GAP_SEC = 0.35;
/** The note being judged sits above comp velocity: it is the subject, the chord is the ground. */
const DEMO_MELODY_VELOCITY = 0.8;

export interface ChordDemoOptions {
	/** Seconds each step is held. Defaults to DEMO_HOLD_SEC. */
	holdSec?: number;
	/** Seconds of silence between steps. Defaults to DEMO_GAP_SEC. */
	gapSec?: number;
}

/** Generation counter: every start and every stop invalidates pending steps. */
let demoToken = 0;
const demoTimers: ReturnType<typeof setTimeout>[] = [];
/** Resolvers of the waits above, so a cut never leaves a step promise hanging. */
let demoWakeups: (() => void)[] = [];
/** Pitches a demo step attacked and that may still be ringing, for the cut. */
let demoRinging: string[] = [];
/** True from the click until the last step has rung out or been cut. */
let demoRunning = false;

/**
 * Waits between demo steps. The wait is registered so `stopChordDemo` can both
 * cancel the timer and resolve the promise: the sequence then wakes, sees a
 * stale token and returns, rather than leaving its chain pending forever.
 */
function demoWait(ms: number): Promise<void> {
	return new Promise<void>((resolve) => {
		const timer = setTimeout(() => {
			const timerIndex = demoTimers.indexOf(timer);
			if (timerIndex !== -1) demoTimers.splice(timerIndex, 1);
			const wakeIndex = demoWakeups.indexOf(resolve);
			if (wakeIndex !== -1) demoWakeups.splice(wakeIndex, 1);
			resolve();
		}, ms);
		demoTimers.push(timer);
		demoWakeups.push(resolve);
	});
}

/**
 * Cuts any running chord demo: drops its pending steps and releases whatever
 * it left ringing. Idempotent, safe before Tone has ever loaded, and safe to
 * call from a component teardown path.
 */
export function stopChordDemo(): void {
	demoToken += 1;
	demoRunning = false;
	for (const timer of demoTimers) clearTimeout(timer);
	demoTimers.length = 0;
	const wakeups = demoWakeups;
	demoWakeups = [];
	for (const wake of wakeups) wake();
	const ringing = demoRinging;
	demoRinging = [];
	if (ringing.length === 0) return;
	if (toneModule) {
		try {
			for (const pitch of ringing) releasePitch(pitch);
		} catch {
			// Never throw into UI code.
		}
	}
	markAudioBusyFor(SAMPLER_RELEASE_SEC * 1000);
}

/**
 * Plays the chord as a left-hand shell (root low, guide tones above, via
 * `toCompPitches`) once per entry in `melodies`, each entry sounding as a
 * single note voiced ABOVE that shell. An empty `melodies` plays the shell
 * alone, which is what the keyboard-tap path wants: there the tapped key
 * already sounds itself, so passing it here would play it twice.
 *
 * Letters are display glyphs ("B♭"), like `playChord`. Each call cancels the
 * previous demo first, so rapid clicking swaps the sound instead of piling
 * chords on top of each other.
 */
export function playNotesOverChord(
	root: string,
	chordNotes: string[],
	melodies: string[],
	opts: ChordDemoOptions = {}
): void {
	if (!soundEnabled()) return;
	if (chordNotes.length === 0) return;

	stopChordDemo();
	const token = demoToken;

	const holdSec = opts.holdSec ?? DEMO_HOLD_SEC;
	const gapSec = opts.gapSec ?? DEMO_GAP_SEC;
	const stepMs = (holdSec + gapSec) * 1000;

	// The root is voiced separately as the bass, so it must not also appear in
	// the upper shell; only the first occurrence is dropped, so a chord that
	// genuinely repeats a pitch class keeps it.
	const rootIndex = chordNotes.indexOf(root);
	const upper = rootIndex === -1 ? chordNotes : chordNotes.filter((_, i) => i !== rootIndex);
	const chordPitches = toCompPitches(root, upper);
	const steps = melodies.length === 0 ? [null] : melodies;

	demoRunning = true;
	markAudioBusyFor(steps.length * stepMs + CHORD_AUDIO_GATE_MS);

	void (async () => {
		// The engine is acquired ONCE, before any step is scheduled: on the first
		// gesture of a session the Tone chunk and the samples can take longer to
		// load than the step gap, and per-step awaits would then let every step
		// resolve in the same tick and attack together, destroying the A/B.
		const instrument = await readyInstrument();
		if (token !== demoToken) return;
		if (!instrument) {
			demoRunning = false;
			return;
		}
		// The gate window was armed at click time; re-arm it from the moment the
		// sound actually starts, so a slow load cannot let it expire mid-demo.
		markAudioBusyFor(steps.length * stepMs + CHORD_AUDIO_GATE_MS);

		for (const [index, melody] of steps.entries()) {
			if (index > 0) {
				await demoWait(stepMs);
				if (token !== demoToken) return;
			}
			try {
				instrument.triggerAttackRelease(chordPitches, holdSec, undefined, COMP_VELOCITY);
				demoRinging.push(...chordPitches);
				if (melody !== null) {
					const melodyPitch = toMelodyPitch(melody, chordPitches);
					instrument.triggerAttackRelease(melodyPitch, holdSec, undefined, DEMO_MELODY_VELOCITY);
					demoRinging.push(melodyPitch);
				}
			} catch {
				// Never throw into UI code.
			}
		}

		// Once the last step has rung out there is nothing left to cut, so the
		// demo stops counting as active without anyone having to click again.
		await demoWait((holdSec + SAMPLER_RELEASE_SEC) * 1000);
		if (token !== demoToken) return;
		demoRinging = [];
		demoRunning = false;
	})();
}

/** Whether a chord demo is still to sound, pending, or counts as ringing. */
export function chordDemoActive(): boolean {
	return demoRunning || demoTimers.length > 0 || demoRinging.length > 0;
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

/**
 * ---- Comping loop ----
 *
 * A repeating, Transport-scheduled accompaniment: one bar of pitches per
 * measure, on loop, until stopped. Used by the /learn play-along companion.
 * Nothing here grades or records anything; it is playback only.
 */

/** One bar of the loop: the already-voiced, Tone-ready ASCII pitches to strike. */
export interface CompLoopBar {
	pitches: string[];
}

export interface CompLoopOptions {
	/** The bars, in order. An empty list is refused (the loop would be silent). */
	bars: CompLoopBar[];
	/** Starting tempo in BPM. */
	bpm: number;
	/** Beats per bar. Defaults to 4; the loop strikes one chord per bar. */
	beatsPerBar?: number;
	/**
	 * Called with each bar's index as that bar SOUNDS, synchronised to the
	 * audio clock via Tone's Draw (not at schedule time, which runs ahead of
	 * the sound), so the on-screen chord symbol changes when the chord lands.
	 */
	onBar?: (barIndex: number) => void;
	/**
	 * Study mode: roll each bar's notes one at a time (a sixteenth apart)
	 * instead of striking them together, so the voices are separable by ear.
	 */
	roll?: boolean;
}

/** Live control of a running loop. Returned by startCompLoop; null means no loop started. */
export interface CompLoopHandle {
	/** Stops the loop, clears the Transport, and releases every ringing voice. Idempotent. */
	stop(): void;
	/** Changes tempo without interrupting the loop. Takes effect on the next bar boundary. */
	setTempo(bpm: number): void;
	/** Whether this handle's loop is still the running one. */
	isRunning(): boolean;
}

interface ActiveLoop {
	token: number;
	tone: ToneModule;
	repeatId: number;
	barIndex: number;
}

/**
 * Tears down whatever loop is running: clears the repeat, stops and rewinds
 * the Transport, drops any pending Draw callbacks, and releases every ringing
 * voice. Every failure is swallowed - teardown must never throw into UI code,
 * because it runs from component destroy paths.
 *
 * Does NOT bump loopToken; callers that need to invalidate in-flight starts
 * bump it themselves (stopCompLoop does, a supersede-on-start does not need
 * to because it already bumped).
 */
function teardownActiveLoop(): void {
	const loop = activeLoop;
	activeLoop = null;
	if (!loop) return;
	try {
		const transport = loop.tone.getTransport();
		transport.clear(loop.repeatId);
		transport.stop();
		transport.cancel(0);
		transport.position = 0;
		loop.tone.getDraw().cancel(0);
	} catch {
		// Never throw from teardown.
	}
	releaseAll();
	// isAppAudioActive's activeLoop check ends the instant activeLoop is
	// nulled above; extend the busy window to cover the last bar's release.
	markAudioBusyFor(CHORD_AUDIO_GATE_MS);
}

/**
 * Stops the comping loop, if one is running, and invalidates any start that
 * is still awaiting its samples. Safe to call when nothing is playing and
 * safe to call before Tone has ever loaded.
 */
export function stopCompLoop(): void {
	loopToken += 1;
	teardownActiveLoop();
}

/** Whether a comping loop is currently running. */
export function compLoopRunning(): boolean {
	return activeLoop !== null;
}

/**
 * Starts (or restarts) the comping loop and resolves with a handle, or null
 * when no loop started: sound is off, there are no bars, Tone failed to load,
 * or the caller was superseded/stopped while samples were loading.
 *
 * Timing is Tone's Transport (`scheduleRepeat` at one measure), never
 * setTimeout: a timer-driven chord loop accumulates audible drift within a few
 * bars, which would make the feature useless to play along with. The visual
 * bar change is dispatched through Tone's Draw so it lands with the sound
 * rather than with the scheduling, which runs ahead of it.
 *
 * At most one loop exists at a time: a second start tears the first one down.
 */
export async function startCompLoop(opts: CompLoopOptions): Promise<CompLoopHandle | null> {
	if (!soundEnabled()) return null;
	if (opts.bars.length === 0) return null;

	// Claim this generation first, so any earlier in-flight start is already
	// stale by the time it resolves, then tear down whatever is playing.
	const token = (loopToken += 1);
	teardownActiveLoop();

	const beatsPerBar =
		Number.isFinite(opts.beatsPerBar) && (opts.beatsPerBar ?? 0) > 0
			? Math.floor(opts.beatsPerBar as number)
			: BEATS_PER_BAR;

	try {
		const t = await loadTone();
		await t.start();
		beginSampleLoad(t);
		// Wait for the sampled piano the same way every other play path does,
		// so the loop's first bar sounds on the real piano.
		if (samplerReady) await samplerReady;
		// Unmounted, stopped, or superseded while loading: never start.
		if (token !== loopToken) return null;

		const transport = t.getTransport();
		transport.stop();
		transport.cancel(0);
		transport.position = 0;
		transport.timeSignature = beatsPerBar;
		transport.bpm.value = clampBpm(opts.bpm);

		const repeatId = transport.scheduleRepeat((time) => {
			const loop = activeLoop;
			if (!loop || loop.token !== token) return;

			const barIndex = loop.barIndex;
			const bar = opts.bars[barIndex];
			loop.barIndex = nextBarIndex(barIndex, opts.bars.length);
			if (!bar) return;

			const barSec = secondsPerBeat(transport.bpm.value) * beatsPerBar;
			const instrument = activeInstrument();
			if (instrument) {
				if (opts.roll) {
					const stagger = secondsPerBeat(transport.bpm.value) / 4;
					bar.pitches.forEach((pitch, i) => {
						instrument.triggerAttackRelease(
							pitch,
							Math.max(0.1, barSec * COMP_HOLD_RATIO - i * stagger),
							time + i * stagger,
							COMP_VELOCITY
						);
					});
				} else {
					instrument.triggerAttackRelease(
						bar.pitches,
						barSec * COMP_HOLD_RATIO,
						time,
						COMP_VELOCITY
					);
				}
			}

			// Draw runs the visual update on the animation frame that matches
			// `time`, so the symbol on screen is the chord in the speakers.
			t.getDraw().schedule(() => {
				if (loopToken === token) opts.onBar?.(barIndex);
			}, time);
		}, '1m');

		activeLoop = { token, tone: t, repeatId, barIndex: 0 };
		transport.start();

		return {
			stop() {
				if (activeLoop?.token === token) stopCompLoop();
			},
			setTempo(bpm: number) {
				if (activeLoop?.token !== token) return;
				try {
					t.getTransport().bpm.value = clampBpm(bpm);
				} catch {
					// Never throw into UI code.
				}
			},
			isRunning() {
				return activeLoop?.token === token;
			}
		};
	} catch {
		// Autoplay policy, chunk fetch, decode: audio is an enhancement.
		if (token === loopToken) teardownActiveLoop();
		return null;
	}
}

/**
 * Defensive BPM floor/ceiling for the Transport itself. The UI already clamps
 * to the learner range via loopTiming.clampTempo; this only guarantees the
 * Transport never receives 0 or a non-finite value, which would stall or
 * throw.
 */
function clampBpm(bpm: number): number {
	if (!Number.isFinite(bpm)) return 70;
	return Math.min(300, Math.max(20, bpm));
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
	stopChordDemo();
	demoToken = 0;
	teardownActiveLoop();
	audioBusyUntilMs = 0;
	loopToken = 0;
	tonePromise = null;
	toneModule = null;
	synth = null;
	sampler = null;
	samplesLoaded = false;
	samplerFailed = false;
	samplerReady = null;
	enabled = null;
	studyMode = null;
	lastAttackAt.clear();
	heldNotes.length = 0;
}
