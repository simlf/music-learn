import type * as ToneNS from 'tone';
import { toAsciiPitchClass, toAscendingPitches } from './voicing';
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
		stopCompLoop();
		releaseAll();
	}
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
	try {
		await ensureAudioReady();
		// Wait for the sampled piano before choosing an instrument, so the
		// first note sounds on the real piano rather than the synth. If loading
		// fails (samplerReady resolves via onerror) or is somehow absent, we
		// fall through to the synth so the app is never silent.
		if (samplerReady) await samplerReady;
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
	pitches.forEach((pitch, index) => {
		setTimeout(() => {
			void withInstrument((instrument) => {
				instrument.triggerAttackRelease(pitch, NOTE_DURATION, undefined, NOTE_VELOCITY);
			});
		}, startDelayMs + index * opts.staggerMs);
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
	teardownActiveLoop();
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
