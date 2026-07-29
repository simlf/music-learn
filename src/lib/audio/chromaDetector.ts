import { chromaOf } from '$lib/theory/interval';
import type { ChordResult } from '$lib/theory/types';

/**
 * Pure chroma-detection DSP for the "check it on your piano" mic verifier
 * (Spike 025, `.planning/spikes/025-mic-chord-detection/`). Ported, not
 * re-derived: the constant-Q kernel construction, the harmonic-sum salience
 * (partial amplitude profile measured off the repo's own Salamander piano
 * samples), the matching-pursuit overtone cancellation, the chroma fold, and
 * the frame-accept decision are transcribed verbatim from
 * `harness/detect.mjs` and the spike's inlined `index.html` copy, which the
 * spike verified match each other to 8 decimal places (`harness/portcheck.mjs`).
 * Keeping that fidelity is the whole point of porting rather than rewriting.
 *
 * Nothing in this file touches `navigator`, `AudioContext`, or any other
 * browser global — every export is a pure function or a small stateful
 * class over plain numbers and typed arrays, so it can be unit-tested with
 * synthesized signals in plain Node/Vitest. `micInput.ts` is the thin
 * wrapper that feeds this module real microphone frames.
 *
 * ---- Grading philosophy (D-01/D-02, matchChord.ts) ----
 * Like the rest of this app's grading, verification is chroma-set equality,
 * never letter strings: octave, note order and duplicate notes are all
 * ignored.
 *
 * ---- The fifth (spike README, "Limitations" #1, GO WITH LIMITS verdict) ----
 * A perfect fifth above a root is that root's own 3rd partial: a voicing
 * that omits the fifth still shows a fifth in the chromagram, so its
 * absence cannot be told from its presence. `buildChromaTarget` therefore
 * marks a PERFECT fifth (root chroma + 7 semitones exactly) as "ignored":
 * neither required present nor flagged as an unexpected extra note. A
 * diminished or augmented fifth is NOT physically masked this way (it sits
 * at a different chroma than the root's 3rd partial), so it stays a normal,
 * fully-graded required note - only the perfect fifth is unverifiable, not
 * "the fifth scale degree" in general.
 */

/** Lowest analyzed fundamental: C2. Matches the spike's measured usable register floor. */
export const MIDI_LO = 36;
/** Highest analyzed fundamental: G7. Needs ~3 octaves of partial headroom above the highest fundamental of interest. */
export const MIDI_HI = 103;
export const N_BINS = MIDI_HI - MIDI_LO + 1;
/** Constant-Q quality factor. */
export const Q_FACTOR = 45;
/** Longest allowed kernel, in decimated (analysis-rate) samples. */
export const MAX_N = 4096;
/** Fixed decimation factor from the raw capture rate down to the analysis rate. */
export const DECIMATION = 4;
/** Anti-alias lowpass corner before decimation. */
export const ANTI_ALIAS_HZ = 4600;

/**
 * Fractional semitone offsets of partials 1..8, and the partial amplitude
 * profile MEASURED off the Salamander samples themselves
 * (`harness/partials.mjs`: mean over samples midi 36..72, three time
 * offsets, normalised to h=1). A guessed profile badly under-weights the
 * piano's strong 2nd partial, which leaves an uncancelled octave ghost.
 */
const HARM_OFFSETS = [0, 12, 19.0196, 24, 27.8631, 31.0196, 33.6883, 36];
const HARM_WEIGHTS = [1.0, 0.778, 0.352, 0.173, 0.226, 0.186, 0.132, 0.027];

/** Weight of the sub-harmonic penalty in `salience`. See detect.mjs for the full rationale. */
const SUB_PENALTY = 0.6;

/** Highest bin allowed to be a fundamental candidate: needs 3+ partials in band. */
const MAX_CANDIDATE_BIN = N_BINS - 20;

function midiToFreq(midi: number): number {
	return 440 * Math.pow(2, (midi - 69) / 12);
}

export interface CqKernel {
	midi: number;
	n: number;
	cos: Float32Array;
	sin: Float32Array;
}

/** Precomputed constant-Q analysis state for one analysis sample rate. */
export interface DetectorKernels {
	analysisSampleRate: number;
	kernels: CqKernel[];
	longestKernel: number;
	inBandWeight: Float32Array;
}

/**
 * Builds one constant-Q Hann-windowed complex-exponential kernel per
 * semitone from MIDI_LO to MIDI_HI, for the given ANALYSIS rate (i.e. the
 * raw capture rate already divided by DECIMATION). Pure function of the
 * sample rate; call once per AudioContext and reuse across frames.
 */
export function buildKernels(analysisSampleRate: number): DetectorKernels {
	const kernels: CqKernel[] = [];
	for (let b = 0; b < N_BINS; b++) {
		const f = midiToFreq(MIDI_LO + b);
		const n = Math.max(128, Math.min(MAX_N, Math.round((Q_FACTOR * analysisSampleRate) / f)));
		const cos = new Float32Array(n);
		const sin = new Float32Array(n);
		const w = (2 * Math.PI * f) / analysisSampleRate;
		for (let i = 0; i < n; i++) {
			const han = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
			cos[i] = (han * Math.cos(w * i)) / n;
			sin[i] = (han * Math.sin(w * i)) / n;
		}
		kernels.push({ midi: MIDI_LO + b, n, cos, sin });
	}
	const longestKernel = Math.max(...kernels.map((k) => k.n));
	const inBandWeight = new Float32Array(N_BINS);
	for (let b = 0; b < N_BINS; b++) {
		let w = 0;
		for (let h = 0; h < HARM_OFFSETS.length; h++) {
			if (Math.round(b + HARM_OFFSETS[h]) < N_BINS) w += HARM_WEIGHTS[h];
		}
		inBandWeight[b] = w;
	}
	return { analysisSampleRate, kernels, longestKernel, inBandWeight };
}

/**
 * Two-pass (4th-order) Butterworth lowpass, ported verbatim from the
 * spike's `index.html` (equivalent to `harness/render.mjs`'s
 * `lowpass(lowpass(x, f0, 0.7071, fs), f0, 0.7071, fs)`, run as one function
 * so there is a single obvious call site). Run fresh over the whole block
 * each call: the block length far exceeds the filter's settling time, so
 * carrying state between calls buys nothing.
 */
export function lowpass4(x: Float32Array, f0: number, fs: number): Float32Array {
	const w0 = (2 * Math.PI * f0) / fs;
	const cw = Math.cos(w0);
	const alpha = Math.sin(w0) / (2 * 0.7071);
	const a0 = 1 + alpha;
	const b0 = (1 - cw) / 2 / a0;
	const b1 = (1 - cw) / a0;
	const b2 = b0;
	const a1 = (-2 * cw) / a0;
	const a2 = (1 - alpha) / a0;
	let cur: Float32Array = x;
	for (let pass = 0; pass < 2; pass++) {
		const y = new Float32Array(cur.length);
		let x1 = 0;
		let x2 = 0;
		let y1 = 0;
		let y2 = 0;
		for (let i = 0; i < cur.length; i++) {
			const v = b0 * cur[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
			x2 = x1;
			x1 = cur[i];
			y2 = y1;
			y1 = v;
			y[i] = v;
		}
		cur = y;
	}
	return cur;
}

/** Decimates a raw-rate signal down to the fixed analysis rate (raw / DECIMATION). */
export function decimateBy4(raw: Float32Array, rawSampleRate: number): Float32Array {
	const filtered = lowpass4(raw, ANTI_ALIAS_HZ, rawSampleRate);
	const n = Math.floor(filtered.length / DECIMATION);
	const out = new Float32Array(n);
	for (let i = 0; i < n; i++) out[i] = filtered[i * DECIMATION];
	return out;
}

/** One constant-Q magnitude spectrum over the window ending at decimated sample `end`. */
export function cqtFrame(
	decimated: Float32Array,
	end: number,
	det: DetectorKernels,
	out: Float32Array = new Float32Array(N_BINS)
): Float32Array {
	for (let b = 0; b < N_BINS; b++) {
		const k = det.kernels[b];
		const start = end - k.n;
		if (start < 0) {
			out[b] = 0;
			continue;
		}
		let re = 0;
		let im = 0;
		const cos = k.cos;
		const sin = k.sin;
		for (let i = 0; i < k.n; i++) {
			const v = decimated[start + i];
			re += v * cos[i];
			im -= v * sin[i];
		}
		out[b] = Math.sqrt(re * re + im * im);
	}
	return out;
}

/**
 * Upper partials of a real piano string are stretched SHARP by
 * inharmonicity, so partial h is read as the max over [round(offset),
 * round(offset)+1]. The fundamental itself is read at its exact bin only.
 */
function partialMax(spec: Float32Array, idx: number): number {
	let best = 0;
	for (let d = 0; d <= 1; d++) {
		const i = idx + d;
		if (i >= 0 && i < N_BINS && spec[i] > best) best = spec[i];
	}
	return best;
}

function salience(spec: Float32Array, b: number, det: DetectorKernels): number {
	if (b >= N_BINS) return 0;
	let acc = HARM_WEIGHTS[0] * spec[b];
	for (let h = 1; h < HARM_OFFSETS.length; h++) {
		const idx = Math.round(b + HARM_OFFSETS[h]);
		if (idx >= N_BINS) break;
		acc += HARM_WEIGHTS[h] * partialMax(spec, idx);
	}
	if (b >= 12) acc -= SUB_PENALTY * spec[b - 12];
	return Math.max(0, acc) / det.inBandWeight[b];
}

export interface PickedNote {
	midi: number;
	strength: number;
}

/**
 * Matching pursuit over the log-frequency spectrum: repeatedly take the
 * most harmonically-supported local-maximum bin, then multiplicatively
 * cancel its predicted partial pattern from the residual, so an overtone of
 * an already-found note is never reported as its own note (the "overtone
 * ghost" suppression).
 */
export function pickNotes(
	spec: Float32Array,
	det: DetectorKernels,
	opts: { maxNotes?: number; peakRel?: number } = {}
): PickedNote[] {
	const { maxNotes = 10, peakRel = 0.1 } = opts;
	const R = Float32Array.from(spec);
	const sal = new Float32Array(N_BINS);
	const notes: PickedNote[] = [];
	let firstMax = 0;
	for (let iter = 0; iter < maxNotes; iter++) {
		for (let b = 0; b < N_BINS; b++) sal[b] = salience(R, b, det);
		let bestB = -1;
		let bestS = 0;
		for (let b = 0; b <= MAX_CANDIDATE_BIN; b++) {
			if (b > 0 && sal[b] < sal[b - 1]) continue;
			if (b + 1 < N_BINS && sal[b] < sal[b + 1]) continue;
			if (sal[b] > bestS) {
				bestS = sal[b];
				bestB = b;
			}
		}
		if (bestB < 0) break;
		if (iter === 0) firstMax = bestS;
		if (bestS < peakRel * firstMax) break;
		notes.push({ midi: MIDI_LO + bestB, strength: bestS });
		for (let h = 0; h < HARM_OFFSETS.length; h++) {
			const centre = Math.round(bestB + HARM_OFFSETS[h]);
			const spread: [number, number][] = h === 0 ? [[0, 0.95]] : [[0, 0.95], [1, 0.6]];
			for (const [d, strength] of spread) {
				const i = centre + d;
				if (i < 0 || i >= N_BINS) continue;
				R[i] *= Math.max(0, 1 - strength * HARM_WEIGHTS[h]);
			}
		}
		R[bestB] = 0;
		for (const d of [-1, 1]) {
			const i = bestB + d;
			if (i >= 0 && i < N_BINS) R[i] *= 0.5;
		}
	}
	return notes;
}

/** Folds picked notes into a 12-bin, max-normalised chroma vector. */
export function chromaFromNotes(notes: PickedNote[]): Float32Array {
	const chroma = new Float32Array(12);
	for (const note of notes) chroma[((note.midi % 12) + 12) % 12] += note.strength;
	let max = 0;
	for (let c = 0; c < 12; c++) if (chroma[c] > max) max = chroma[c];
	if (max > 0) for (let c = 0; c < 12; c++) chroma[c] /= max;
	return chroma;
}

export interface DetectFrame {
	chroma: Float32Array;
	notes: PickedNote[];
	/** Raw time-domain peak amplitude (0..1-ish), used for the "is anything sounding at all" quiet gate. */
	peak: number;
}

/** Runs the whole per-frame pipeline (decimate, CQT, pick notes, fold chroma) over one raw capture buffer. */
export function analyzeBuffer(
	raw: Float32Array,
	rawSampleRate: number,
	det: DetectorKernels
): DetectFrame {
	let peak = 0;
	for (let i = 0; i < raw.length; i++) {
		const v = Math.abs(raw[i]);
		if (v > peak) peak = v;
	}
	const decimated = decimateBy4(raw, rawSampleRate);
	const spec = cqtFrame(decimated, decimated.length, det);
	const notes = pickNotes(spec, det);
	const chroma = chromaFromNotes(notes);
	return { chroma, notes, peak };
}

/** A target chroma set for verification: required-present vs. deliberately-ignored (see module doc: the fifth). */
export interface ChromaTarget {
	required: Set<number>;
	ignored: Set<number>;
}

/**
 * Builds a verification target from a looked-up chord. Excludes the PERFECT
 * fifth (root + 7 semitones) from grading entirely (neither required nor
 * flagged as extra) because it cannot be verified present or absent (see
 * module doc). A diminished/augmented fifth is left in `required` like any
 * other chord tone. An unspellable chord (any note without a resolvable
 * chroma) yields an empty `required` set, which `frameStatus` below always
 * treats as ungradeable - mirroring `matchChord.ts`'s own empty-target
 * guard (D-01/D-02).
 */
export function buildChromaTarget(chord: ChordResult): ChromaTarget {
	const rootChroma = chromaOf(chord.root);
	const required = new Set<number>();
	const ignored = new Set<number>();
	for (const note of chord.notes) {
		const chroma = chromaOf(note.letter);
		if (chroma === undefined) continue;
		const isPerfectFifth =
			note.role === 'fifth' && rootChroma !== undefined && (chroma - rootChroma + 12) % 12 === 7;
		if (isPerfectFifth) {
			ignored.add(chroma);
			continue;
		}
		required.add(chroma);
	}
	return { required, ignored };
}

export interface DetectorParams {
	/** The weakest required chroma must clear this (max-normalised) level. */
	tPresent: number;
	/** No non-required, non-ignored chroma may exceed this level. */
	tExtra: number;
	/** The weakest required chroma must beat the strongest unexpected one by this margin. */
	margin: number;
	/** Consecutive agreeing frames needed before a verdict latches. */
	stability: number;
	/** Trailing-frame window folded into the smoothed chroma before grading. */
	smooth: number;
	/** How long a latched "confirmed" verdict is held before it can re-arm. */
	latchHoldMs: number;
	/** Raw time-domain peak amplitude below which a frame counts as silence. */
	quietPeak: number;
}

/** Spike 025's chosen operating point: `mean true accept - 5 x mean false accept`, swept and reported in full in `harness/results.txt`. */
export const DEFAULT_DETECTOR_PARAMS: DetectorParams = {
	tPresent: 0.2,
	tExtra: 0.25,
	margin: 0.15,
	stability: 3,
	smooth: 5,
	latchHoldMs: 1600,
	quietPeak: 0.01
};

export interface FrameStatus {
	minTarget: number;
	maxOther: number;
	maxOtherPc: number;
	/** Required chroma currently below tPresent (candidates for a "missing X" message). */
	missing: number[];
	ok: boolean;
}

/**
 * Evaluates one (already smoothed) chroma vector against a target. Ignored
 * chroma (the unverifiable perfect fifth) count toward neither `minTarget`
 * nor `maxOther`: their presence or absence changes nothing, by design.
 * An empty `required` set is never satisfiable (mirrors matchChord.ts).
 */
export function frameStatus(
	chroma: Float32Array,
	target: ChromaTarget,
	params: DetectorParams = DEFAULT_DETECTOR_PARAMS
): FrameStatus {
	let minTarget = Infinity;
	let maxOther = 0;
	let maxOtherPc = -1;
	const missing: number[] = [];
	for (let c = 0; c < 12; c++) {
		if (target.required.has(c)) {
			if (chroma[c] < minTarget) minTarget = chroma[c];
			if (chroma[c] < params.tPresent) missing.push(c);
		} else if (!target.ignored.has(c)) {
			if (chroma[c] > maxOther) {
				maxOther = chroma[c];
				maxOtherPc = c;
			}
		}
	}
	const gradeable = target.required.size > 0;
	const ok =
		gradeable &&
		missing.length === 0 &&
		maxOther <= params.tExtra &&
		minTarget >= maxOther + params.margin;
	return {
		minTarget: Number.isFinite(minTarget) ? minTarget : 0,
		maxOther,
		maxOtherPc,
		missing,
		ok
	};
}

export type MicVerdictStatus = 'muted' | 'quiet' | 'listening' | 'holding' | 'confirmed';

export interface StabilityState extends FrameStatus {
	status: MicVerdictStatus;
	run: number;
	smoothedChroma: Float32Array;
}

/**
 * Stateful (but Date.now()-free, so fully deterministic) port of the
 * spike's `index.html` history/run/latch logic: a trailing sum-then-
 * max-normalise smoother, a consecutive-agreeing-frame counter, and a
 * latch that holds a "confirmed" verdict for `latchHoldMs` so a quick
 * chord release does not immediately flip the verdict back off.
 */
export class ChromaStabilityTracker {
	private history: Float32Array[] = [];
	private run = 0;
	private latched = false;
	private latchAt = 0;

	constructor(private params: DetectorParams = DEFAULT_DETECTOR_PARAMS) {}

	/** Clears all history/run/latch state (target changed, or listening (re)started). */
	reset(): void {
		this.history = [];
		this.run = 0;
		this.latched = false;
		this.latchAt = 0;
	}

	/**
	 * Feeds one raw detector frame. `nowMs` is caller-supplied (e.g.
	 * `performance.now()`) rather than read internally, so this stays pure
	 * enough to unit-test with synthetic timestamps.
	 *
	 * `gated` true means the app's own speaker is currently sounding (Spike
	 * 025 measured a 97.2% false accept without this gate): the frame is not
	 * evaluated at all, and run/latch state resets, so a chord ringing
	 * through the speaker can never be mistaken for the user playing it.
	 */
	push(frame: DetectFrame, target: ChromaTarget, nowMs: number, gated = false): StabilityState {
		if (gated) {
			this.reset();
			return {
				status: 'muted',
				run: 0,
				minTarget: 0,
				maxOther: 0,
				maxOtherPc: -1,
				missing: [],
				ok: false,
				smoothedChroma: new Float32Array(12)
			};
		}

		this.history.push(frame.chroma);
		while (this.history.length > this.params.smooth) this.history.shift();
		const smoothed = new Float32Array(12);
		for (const h of this.history) for (let c = 0; c < 12; c++) smoothed[c] += h[c];
		let smoothedMax = 0;
		for (let c = 0; c < 12; c++) if (smoothed[c] > smoothedMax) smoothedMax = smoothed[c];
		if (smoothedMax > 0) for (let c = 0; c < 12; c++) smoothed[c] /= smoothedMax;

		const quiet = frame.peak < this.params.quietPeak;
		const result = frameStatus(smoothed, target, this.params);
		const accepting = !quiet && result.ok;
		this.run = accepting ? this.run + 1 : 0;
		if (this.run >= this.params.stability && !this.latched) {
			this.latched = true;
			this.latchAt = nowMs;
		}
		if (this.latched && nowMs - this.latchAt > this.params.latchHoldMs) {
			this.latched = false;
		}

		let status: MicVerdictStatus;
		if (this.latched) status = 'confirmed';
		else if (quiet) status = 'quiet';
		else if (accepting) status = 'holding';
		else status = 'listening';

		return { ...result, status, run: this.run, smoothedChroma: smoothed };
	}
}

/** Flat-spelled pitch-class names for live diagnostic display only (missing/extra note lists), not canonical chord spelling. Mirrors the spike's own index.html PC table. */
export const CHROMA_NAMES = [
	'C',
	'D♭',
	'D',
	'E♭',
	'E',
	'F',
	'G♭',
	'G',
	'A♭',
	'A',
	'B♭',
	'B'
] as const;
