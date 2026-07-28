// The detector under test: harmonically-weighted constant-Q chromagram with
// matching-pursuit overtone cancellation, plus a temporal-stability verifier.
//
// Shape mirrors what production would do: a streaming analyser emits one
// 12-bin chroma vector (+ a bass estimate) per hop, and a separate pure
// function decides whether the expected chroma SET is present. The decision
// half is deliberately target-driven, because the app always knows the answer
// (src/lib/drills/matchChord.ts already grades a chroma set).

import { lowpass } from './render.mjs';

export const ANALYSIS_FS = 11025;
export const HOP = 512; // 46.4 ms
export const MIDI_LO = 36; // C2
export const MIDI_HI = 103; // G7. Needs ~3 octaves of headroom above the
// highest fundamental of interest, because the harmonic sum reads partials up
// to +36 semitones. Stopping at B6 collapsed detection for chords voiced above
// middle C.
export const N_BINS = MIDI_HI - MIDI_LO + 1;
export const Q = 45;
export const MAX_N = 4096;

/**
 * Fractional semitone offsets of partials 1..8, and the partial amplitude
 * profile MEASURED off the Salamander samples themselves by partials.mjs
 * (mean over samples midi 36..72, three time offsets, normalised to h=1).
 * The 2nd partial of a real piano string is nearly as strong as the
 * fundamental, which a guessed profile badly under-weights: that under-weight
 * was leaving an uncancelled octave ghost on every note.
 */
const HARM_OFFSETS = [0, 12, 19.0196, 24, 27.8631, 31.0196, 33.6883, 36];
const HARM_WEIGHTS = [1.0, 0.778, 0.352, 0.173, 0.226, 0.186, 0.132, 0.027];

function midiToFreq(m) {
	return 440 * Math.pow(2, (m - 69) / 12);
}

/** Precomputed constant-Q kernels (one windowed complex exponential per semitone). */
export const KERNELS = (() => {
	const ks = [];
	for (let b = 0; b < N_BINS; b++) {
		const f = midiToFreq(MIDI_LO + b);
		const n = Math.max(128, Math.min(MAX_N, Math.round((Q * ANALYSIS_FS) / f)));
		const cos = new Float32Array(n);
		const sin = new Float32Array(n);
		const w = (2 * Math.PI * f) / ANALYSIS_FS;
		for (let i = 0; i < n; i++) {
			const han = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
			cos[i] = (han * Math.cos(w * i)) / n;
			sin[i] = (han * Math.sin(w * i)) / n;
		}
		ks.push({ midi: MIDI_LO + b, n, cos, sin });
	}
	return ks;
})();

export const LONGEST_KERNEL = Math.max(...KERNELS.map((k) => k.n));

/** Decimates 44.1 kHz -> 11.025 kHz with a 4th-order anti-alias lowpass. */
export function decimate4(x, fsIn = 44100) {
	const filtered = lowpass(lowpass(x, 4600, 0.7071, fsIn), 4600, 0.7071, fsIn);
	const out = new Float32Array(Math.floor(filtered.length / 4));
	for (let i = 0; i < out.length; i++) out[i] = filtered[i * 4];
	return out;
}

/** One constant-Q magnitude spectrum over the window ending at sample `end`. */
export function cqtFrame(x, end, out) {
	for (let b = 0; b < N_BINS; b++) {
		const k = KERNELS[b];
		const start = end - k.n;
		let re = 0;
		let im = 0;
		if (start < 0) {
			out[b] = 0;
			continue;
		}
		const c = k.cos;
		const s = k.sin;
		for (let i = 0; i < k.n; i++) {
			const v = x[start + i];
			re += v * c[i];
			im -= v * s[i];
		}
		out[b] = Math.sqrt(re * re + im * im);
	}
	return out;
}

/**
 * Upper partials of a real piano string are stretched SHARP by inharmonicity,
 * so partial h is read as the max over [round(offset), round(offset)+1]. The
 * FUNDAMENTAL is read at its exact bin: allowing a neighbourhood there let a
 * semitone-away candidate borrow the true note's peak, which made every
 * detection land a semitone flat (first bug this spike hit).
 */
function partialMax(spec, idx) {
	let best = 0;
	for (let d = 0; d <= 1; d++) {
		const i = idx + d;
		if (i >= 0 && i < N_BINS && spec[i] > best) best = spec[i];
	}
	return best;
}

/** Sum of the partial weights whose bin falls inside the analysed band. */
const IN_BAND_WEIGHT = (() => {
	const out = new Float32Array(N_BINS);
	for (let b = 0; b < N_BINS; b++) {
		let w = 0;
		for (let h = 0; h < HARM_OFFSETS.length; h++) {
			if (Math.round(b + HARM_OFFSETS[h]) < N_BINS) w += HARM_WEIGHTS[h];
		}
		out[b] = w;
	}
	return out;
})();

/**
 * Highest bin still allowed to be a fundamental: it needs at least the first
 * three partials in band, otherwise its salience is estimated from too little
 * evidence and noise inflates it.
 */
const MAX_CANDIDATE_BIN = N_BINS - 20;

/**
 * Weight of the sub-harmonic penalty in `salience`. Strong energy exactly an
 * octave below a candidate makes that candidate much more likely to be the
 * octave partial of the lower note than a note of its own. Set to 0 to disable.
 * Cost of having it: a genuine octave DOUBLING (C3 played together with C4, a
 * completely normal piano thing) is scored down. That is harmless for chroma
 * verification, since both notes fold to the same pitch class, and it is one of
 * the reasons bass estimation stays unreliable.
 */
const SUB_PENALTY = 0.6;

/**
 * Harmonic-sum salience for a fundamental candidate at bin `b`, divided by the
 * weight actually available in band. Without that division a note high in the
 * register scores systematically lower than a bass note simply because fewer of
 * its partials fit inside the analysed band, which made every chord voiced at
 * or above middle C fail: all four notes were found, but the top voice landed
 * at 0.07-0.13 of the normalised chroma instead of ~0.45.
 */
function salience(spec, b) {
	if (b >= N_BINS) return 0;
	let acc = HARM_WEIGHTS[0] * spec[b];
	for (let h = 1; h < HARM_OFFSETS.length; h++) {
		const idx = Math.round(b + HARM_OFFSETS[h]);
		if (idx >= N_BINS) break;
		acc += HARM_WEIGHTS[h] * partialMax(spec, idx);
	}
	if (b >= 12) acc -= SUB_PENALTY * spec[b - 12];
	return Math.max(0, acc) / IN_BAND_WEIGHT[b];
}

/**
 * Matching pursuit over the log-frequency spectrum: repeatedly take the most
 * harmonically-supported bin, then subtract its predicted partial pattern from
 * the residual, so an overtone of an already-found note cannot be reported as
 * its own note. This is the "harmonic weighting to suppress overtone ghosts"
 * step; a plain chromagram without it lights up fifths and octaves.
 */
export function pickNotes(spec, opts = {}) {
	const { maxNotes = 10, peakRel = 0.1 } = opts;
	const R = Float32Array.from(spec);
	const sal = new Float32Array(N_BINS);
	const notes = [];
	let firstMax = 0;
	for (let iter = 0; iter < maxNotes; iter++) {
		for (let b = 0; b < N_BINS; b++) sal[b] = salience(R, b);
		let bestB = -1;
		let bestS = 0;
		for (let b = 0; b <= MAX_CANDIDATE_BIN; b++) {
			// Local-max gate: a semitone-away shoulder is never a salience peak,
			// so this alone kills most adjacent-semitone false positives.
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
		// Cancel this note's partials MULTIPLICATIVELY rather than by subtracting a
		// template-predicted amplitude. Per-note partial balance varies enormously
		// on a real piano (the Salamander C4 sample's 2nd partial measures 6x its
		// own fundamental, against a 0.78 average across the set), so a template
		// subtraction under-cancels the octave on exactly the notes that need it
		// most, and the octave ghost then wins the next pursuit round.
		for (let h = 0; h < HARM_OFFSETS.length; h++) {
			const centre = Math.round(bestB + HARM_OFFSETS[h]);
			// Inharmonicity only ever pushes a partial SHARP, so cancellation
			// spreads upward and never downward. An earlier symmetric spread ate the
			// major 7th of every close voicing: B3 sits exactly one bin below C3's
			// octave partial.
			const spread = h === 0 ? [[0, 0.95]] : [[0, 0.95], [1, 0.6]];
			for (const [d, strength] of spread) {
				const i = centre + d;
				if (i < 0 || i >= N_BINS) continue;
				R[i] *= Math.max(0, 1 - strength * HARM_WEIGHTS[h]);
			}
		}
		R[bestB] = 0;
		// Attenuate, do not erase, the immediate neighbours: two notes a semitone
		// apart must both stay detectable (b9 voicings, chromatic scale runs).
		for (const d of [-1, 1]) {
			const i = bestB + d;
			if (i >= 0 && i < N_BINS) R[i] *= 0.5;
		}
	}
	return notes;
}

/**
 * Analyses a 44.1 kHz signal into a per-hop series of
 * { tSec, chroma (12, max-normalised), bassChroma, bassMidi, level }.
 * Target-independent, so one analysis can be scored against many targets.
 */
export function analyze(signal, opts = {}) {
	const { untilSec = 2.0, bassRel = 0.2, fsIn = 44100, decimated = false } = opts;
	const x = decimated ? signal : decimate4(signal, fsIn);
	const limit = Math.min(x.length, Math.round(untilSec * ANALYSIS_FS));
	const spec = new Float32Array(N_BINS);
	const frames = [];
	for (let end = LONGEST_KERNEL; end <= limit; end += HOP) {
		cqtFrame(x, end, spec);
		let specMax = 0;
		for (let b = 0; b < N_BINS; b++) if (spec[b] > specMax) specMax = spec[b];
		const notes = pickNotes(spec);
		const chroma = new Float32Array(12);
		let maxStrength = 0;
		for (const n of notes) {
			chroma[n.midi % 12] += n.strength;
			if (n.strength > maxStrength) maxStrength = n.strength;
		}
		let chromaMax = 0;
		for (let c = 0; c < 12; c++) if (chroma[c] > chromaMax) chromaMax = chroma[c];
		if (chromaMax > 0) for (let c = 0; c < 12; c++) chroma[c] /= chromaMax;
		let bassMidi;
		for (const n of notes) {
			if (n.strength < bassRel * maxStrength) continue;
			if (bassMidi === undefined || n.midi < bassMidi) bassMidi = n.midi;
		}
		frames.push({
			tSec: end / ANALYSIS_FS,
			chroma,
			bassMidi,
			bassChroma: bassMidi === undefined ? undefined : bassMidi % 12,
			level: specMax,
			noteCount: notes.length
		});
	}
	return frames;
}

/** Operating point. See the full sweep surface in results.txt (E0). */
export const DEFAULT_PARAMS = {
	tPresent: 0.1,
	tExtra: 1.0,
	margin: 0.25,
	stability: 3,
	smooth: 5,
	windowSec: 0.8
};

/**
 * True when one frame's chroma vector satisfies the target chroma set.
 *
 * Two conditions, both needed:
 *  1. absolute: the WEAKEST expected chroma clears `tPresent` (max-normalised),
 *     so a chord with a missing note is rejected;
 *  2. absolute ceiling: no unexpected chroma exceeds `tExtra` (1.0 disables);
 *  3. separation: the weakest expected chroma beats the STRONGEST unexpected
 *     chroma by `margin`, so an extra note is rejected. The separation form is
 *     scale-free, which matters because a close low voicing puts 12 dB between
 *     its bass and its top voice.
 */
export function frameAccepts(chroma, targetSet, params = DEFAULT_PARAMS) {
	let minTarget = Infinity;
	let maxOther = 0;
	for (let c = 0; c < 12; c++) {
		if (targetSet.has(c)) {
			if (chroma[c] < minTarget) minTarget = chroma[c];
		} else if (chroma[c] > maxOther) {
			maxOther = chroma[c];
		}
	}
	if (minTarget < params.tPresent) return false;
	if (maxOther > params.tExtra) return false;
	if (minTarget < maxOther + params.margin) return false;
	return true;
}

/** Trailing moving average of the chroma series. Suppresses per-frame noise. */
function smoothChroma(frames, k) {
	if (k <= 1) return frames.map((f) => f.chroma);
	const out = [];
	for (let i = 0; i < frames.length; i++) {
		const acc = new Float32Array(12);
		const lo = Math.max(0, i - k + 1);
		for (let j = lo; j <= i; j++) for (let c = 0; c < 12; c++) acc[c] += frames[j].chroma[c];
		let mx = 0;
		for (let c = 0; c < 12; c++) if (acc[c] > mx) mx = acc[c];
		if (mx > 0) for (let c = 0; c < 12; c++) acc[c] /= mx;
		out.push(acc);
	}
	return out;
}

/**
 * Temporal-stability verdict: accept only after `stability` consecutive frames
 * agree, so a passing partial mid-transient cannot trigger a false accept.
 *
 * `windowSec` bounds how long after the onset the verdict may be taken. This is
 * load-bearing, not cosmetic: an upper voice of a close low voicing drops below
 * detectability after roughly half a second, at which point a played 4-note
 * chord genuinely looks like its own 3-note subset, and an unbounded search
 * will eventually accept the subset target.
 *
 * Returns { accepted, latencyMs, verdictFrame }.
 */
export function verify(frames, targetChroma, params = DEFAULT_PARAMS, onsetSec = 0) {
	const p = { ...DEFAULT_PARAMS, ...params };
	const targetSet = targetChroma instanceof Set ? targetChroma : new Set(targetChroma);
	const series = smoothChroma(frames, p.smooth);
	let run = 0;
	for (let i = 0; i < frames.length; i++) {
		if (frames[i].tSec - onsetSec > p.windowSec) break;
		if (frameAccepts(series[i], targetSet, p)) {
			run++;
			if (run >= p.stability) {
				return {
					accepted: true,
					latencyMs: Math.round((frames[i].tSec - onsetSec) * 1000),
					verdictFrame: i
				};
			}
		} else {
			run = 0;
		}
	}
	return { accepted: false, latencyMs: null, verdictFrame: null };
}
