// Salamander-sample chord renderer + phone-mic / room degradations.
// Emulates what Tone.Sampler does in the real app (src/lib/audio/audio.ts):
// nearest sample of the 30-file minor-third map, repitched by playbackRate.
import { existsSync } from 'node:fs';
import { readWavMono } from './wav.mjs';
import { prepareIR, convolve } from './fft.mjs';

export const FS = 44100;

/** MIDI numbers of the 30 Salamander samples (A0=21 then every minor third to C8=108). */
export const SAMPLE_MIDIS = Array.from({ length: 30 }, (_, i) => 21 + i * 3);

const PC_FILE = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];

/** Salamander file name for a sample MIDI number, e.g. 60 -> "C4.mp3" -> "C4". */
export function sampleFileStem(midi) {
	const pc = PC_FILE[midi % 12];
	const octave = Math.floor(midi / 12) - 1;
	return `${pc}${octave}`;
}

const cache = new Map();

/** Loads a decoded sample (mono 44.1k Float32Array) from the wav dir. */
function loadSample(wavDir, midi) {
	if (cache.has(midi)) return cache.get(midi);
	const path = `${wavDir}/${sampleFileStem(midi)}.wav`;
	if (!existsSync(path)) throw new Error(`missing decoded sample: ${path} (run decode.sh)`);
	const { sampleRate, data } = readWavMono(path);
	if (sampleRate !== FS) throw new Error(`sample rate ${sampleRate} != ${FS} for ${path}`);
	cache.set(midi, data);
	return data;
}

function nearestSampleMidi(midi) {
	let best = SAMPLE_MIDIS[0];
	for (const m of SAMPLE_MIDIS) if (Math.abs(m - midi) < Math.abs(best - midi)) best = m;
	return best;
}

/** Deterministic RNG (mulberry32) so every reported number is reproducible. */
export function rng(seed) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Renders one piano note into `out` starting at sample `startAt`, repitching the
 * nearest Salamander sample by 2^(semitones/12) with linear interpolation, the
 * same way Tone.Sampler does.
 */
export function renderNote(out, startAt, midi, gain, wavDir) {
	const src = loadSample(wavDir, nearestSampleMidi(midi));
	const rate = Math.pow(2, (midi - nearestSampleMidi(midi)) / 12);
	const n = out.length - startAt;
	for (let i = 0; i < n; i++) {
		const pos = i * rate;
		const i0 = Math.floor(pos);
		if (i0 + 1 >= src.length) break;
		const frac = pos - i0;
		out[startAt + i] += gain * (src[i0] * (1 - frac) + src[i0 + 1] * frac);
	}
}

/**
 * Renders a chord: notes struck with small human onset jitter and per-note gain
 * variation, held (natural sample decay, no artificial release) for `durationSec`.
 */
export function renderChord(midis, opts = {}) {
	const {
		durationSec = 2.6,
		wavDir,
		seed = 1,
		jitterMs = 18,
		gainSpread = 0.18,
		gain = 0.55,
		startSec = 0
	} = opts;
	const rand = rng(seed);
	const out = new Float32Array(Math.round(durationSec * FS));
	for (const midi of midis) {
		const jitter = Math.round((rand() * jitterMs * FS) / 1000);
		const g = gain * (1 - gainSpread * rand());
		renderNote(out, Math.round(startSec * FS) + jitter, midi, g, wavDir);
	}
	return out;
}

// ---------------------------------------------------------------- degradations

function biquad(x, b0, b1, b2, a1, a2) {
	const y = new Float32Array(x.length);
	let x1 = 0,
		x2 = 0,
		y1 = 0,
		y2 = 0;
	for (let i = 0; i < x.length; i++) {
		const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
		x2 = x1;
		x1 = x[i];
		y2 = y1;
		y1 = v;
		y[i] = v;
	}
	return y;
}

/** RBJ-cookbook 2nd-order highpass. */
export function highpass(x, f0, q = 0.7071, fs = FS) {
	const w0 = (2 * Math.PI * f0) / fs;
	const cw = Math.cos(w0);
	const alpha = Math.sin(w0) / (2 * q);
	const a0 = 1 + alpha;
	return biquad(x, (1 + cw) / 2 / a0, (-(1 + cw)) / a0, (1 + cw) / 2 / a0, (-2 * cw) / a0, (1 - alpha) / a0);
}

/** RBJ-cookbook 2nd-order lowpass. */
export function lowpass(x, f0, q = 0.7071, fs = FS) {
	const w0 = (2 * Math.PI * f0) / fs;
	const cw = Math.cos(w0);
	const alpha = Math.sin(w0) / (2 * q);
	const a0 = 1 + alpha;
	return biquad(x, (1 - cw) / 2 / a0, (1 - cw) / a0, (1 - cw) / 2 / a0, (-2 * cw) / a0, (1 - alpha) / a0);
}

/** Pink noise (Paul Kellet economy filter), unit-ish RMS. */
function pinkNoise(n, rand) {
	const out = new Float32Array(n);
	let b0 = 0,
		b1 = 0,
		b2 = 0,
		b3 = 0,
		b4 = 0,
		b5 = 0,
		b6 = 0;
	for (let i = 0; i < n; i++) {
		const w = rand() * 2 - 1;
		b0 = 0.99886 * b0 + w * 0.0555179;
		b1 = 0.99332 * b1 + w * 0.0750759;
		b2 = 0.969 * b2 + w * 0.153852;
		b3 = 0.8665 * b3 + w * 0.3104856;
		b4 = 0.55 * b4 + w * 0.5329522;
		b5 = -0.7616 * b5 - w * 0.016898;
		out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
		b6 = w * 0.115926;
	}
	return out;
}

function rms(x) {
	let acc = 0;
	for (let i = 0; i < x.length; i++) acc += x[i] * x[i];
	return Math.sqrt(acc / x.length);
}

/** Adds pink noise at a target SNR in dB, measured against the signal's own RMS. */
export function addNoise(x, snrDb, seed = 7) {
	const rand = rng(seed);
	const noise = pinkNoise(x.length, rand);
	const target = rms(x) * Math.pow(10, -snrDb / 20);
	const scale = target / (rms(noise) || 1);
	const out = new Float32Array(x.length);
	for (let i = 0; i < x.length; i++) out[i] = x[i] + noise[i] * scale;
	return out;
}

/** Freeverb-style Schroeder reverb: 8 damped combs into 4 allpasses. Small-room preset. */
export function reverb(x, wet = 0.3, roomSize = 0.6, damp = 0.35, fs = 11025) {
	const k = fs / 44100;
	const combDelays = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => Math.max(2, Math.round(d * k)));
	const apDelays = [556, 441, 341, 225].map((d) => Math.max(2, Math.round(d * k)));
	const fb = roomSize * 0.28 + 0.7;
	const n = x.length;
	const wetSig = new Float32Array(n);
	for (const d of combDelays) {
		const buf = new Float32Array(d);
		let idx = 0;
		let store = 0;
		for (let i = 0; i < n; i++) {
			const out = buf[idx];
			store = out * (1 - damp) + store * damp;
			buf[idx] = x[i] * 0.15 + store * fb;
			idx = idx + 1 === d ? 0 : idx + 1;
			wetSig[i] += out;
		}
	}
	let cur = wetSig;
	for (const d of apDelays) {
		const buf = new Float32Array(d);
		let idx = 0;
		const next = new Float32Array(n);
		for (let i = 0; i < n; i++) {
			const bufOut = buf[idx];
			const out = -cur[i] + bufOut;
			buf[idx] = cur[i] + bufOut * 0.5;
			idx = idx + 1 === d ? 0 : idx + 1;
			next[i] = out;
		}
		cur = next;
	}
	// Early reflections: a few discrete taps so it is not pure late tail.
	const taps = [
		[Math.round(0.008 * fs), 0.35],
		[Math.round(0.013 * fs), 0.28],
		[Math.round(0.021 * fs), 0.22]
	];
	const out = new Float32Array(n);
	for (let i = 0; i < n; i++) {
		let er = 0;
		for (const [d, g] of taps) if (i >= d) er += x[i - d] * g;
		out[i] = x[i] * (1 - wet) + (cur[i] + er) * wet;
	}
	return out;
}

/** Mixes two signals with a gain on b, padding to the longer length. */
export function mix(a, b, gainB = 1) {
	const n = Math.max(a.length, b.length);
	const out = new Float32Array(n);
	for (let i = 0; i < a.length; i++) out[i] += a[i];
	for (let i = 0; i < b.length; i++) out[i] += b[i] * gainB;
	return out;
}

/**
 * Small-room impulse response: direct delta, 8 randomised early reflections
 * between 5 and 40 ms, then an exponentially decaying noise tail (RT60 =
 * `rt60`). Everything after the direct sound is scaled so the direct-to-
 * reverberant ratio is exactly `drrDb`, which is the parameter that actually
 * describes "phone sitting on the music desk" (high DRR) versus "phone across
 * the room" (low DRR). Spectrally flat by construction, unlike a Schroeder
 * network, whose comb resonances colour the spectrum in a way a real room does
 * not.
 */
export function roomIR(fs, { rt60 = 0.5, drrDb = 6, seed = 99 } = {}) {
	const rand = rng(seed);
	const n = Math.round(rt60 * fs);
	const h = new Float32Array(n);
	h[0] = 1;
	const rest = new Float32Array(n);
	for (let i = 0; i < 8; i++) {
		const d = Math.round((0.005 + rand() * 0.035) * fs);
		if (d < n) rest[d] += (rand() < 0.5 ? -1 : 1) * (0.5 - 0.3 * rand());
	}
	const tau = rt60 / 6.908;
	const start = Math.round(0.005 * fs);
	for (let i = start; i < n; i++) {
		const g = Math.exp(-(i / fs) / tau);
		rest[i] += (rand() * 2 - 1) * g * 0.5;
	}
	let e = 0;
	for (let i = 0; i < n; i++) e += rest[i] * rest[i];
	const scale = Math.sqrt(Math.pow(10, -drrDb / 10) / (e || 1));
	for (let i = 0; i < n; i++) h[i] += rest[i] * scale;
	return h;
}

const irCache = new Map();
function irFor(fs, drrDb, signalLen) {
	const key = `${fs}|${drrDb}|${signalLen}`;
	if (!irCache.has(key)) irCache.set(key, prepareIR(roomIR(fs, { drrDb }), signalLen));
	return irCache.get(key);
}

/** Convolves with the room IR at the analysis rate. */
export function room(x, drrDb, fs = ANALYSIS_RATE) {
	return convolve(x, irFor(fs, drrDb, x.length));
}

/**
 * Degradation conditions, all applied at the 11.025 kHz ANALYSIS rate (the
 * detector never looks above 2 kHz, so modelling the phone's top-octave rolloff
 * separately would change nothing).
 *
 * "phone" = 2nd-order highpass at 100 Hz, the low rolloff a handset capsule and
 * case impose. "phoneHard" = 4th-order at 150 Hz, closer to what a handset does
 * with its voice-processing chain left enabled. "roomN" = small-room IR at a
 * direct-to-reverberant ratio of N dB. "snrN" = additive pink noise at N dB SNR.
 */
export const ANALYSIS_RATE = 11025;
const hp = (x, f = 100) => highpass(x, f, 0.7071, ANALYSIS_RATE);
const hpHard = (x) => highpass(highpass(x, 150, 0.7071, ANALYSIS_RATE), 150, 0.7071, ANALYSIS_RATE);

export const CONDITIONS = {
	clean: (x) => x,
	phone: (x) => hp(x),
	'phone+snr20': (x) => addNoise(hp(x), 20),
	'phone+snr10': (x) => addNoise(hp(x), 10),
	'phone+room12': (x) => room(hp(x), 12),
	'phone+room6': (x) => room(hp(x), 6),
	'phone+room0': (x) => room(hp(x), 0),
	'phone+room6+snr20': (x) => addNoise(room(hp(x), 6), 20),
	'phone+room6+snr15': (x) => addNoise(room(hp(x), 6), 15),
	'phone+room6+snr10': (x) => addNoise(room(hp(x), 6), 10),
	'phone+room0+snr10': (x) => addNoise(room(hp(x), 0), 10),
	'phoneHard+room6+snr15': (x) => addNoise(room(hpHard(x), 6), 15),
	// Cross-check against the algorithmic reverb this spike started with, to show
	// how much of the degraded loss is the room model rather than the detector.
	'phone+schroeder30+snr15': (x) => addNoise(reverb(hp(x), 0.3), 15)
};
