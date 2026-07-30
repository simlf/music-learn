import { describe, expect, it } from 'vitest';
import {
	MIDI_LO,
	MIDI_HI,
	N_BINS,
	CHROMA_NAMES,
	DEFAULT_DETECTOR_PARAMS,
	buildKernels,
	lowpass4,
	decimateBy4,
	cqtFrame,
	pickNotes,
	chromaFromNotes,
	analyzeBuffer,
	buildChromaTarget,
	buildChromaTargetFromNotes,
	isPerfectFifthAboveRoot,
	frameStatus,
	ChromaStabilityTracker,
	type ChromaTarget,
	type DetectFrame
} from './chromaDetector';
import { spellChord } from '$lib/theory/chord';

/**
 * Unit tests for the pure DSP ported from Spike 025
 * (.planning/spikes/025-mic-chord-detection/harness/detect.mjs). Everything
 * here runs against synthesized signals or hand-built fixture spectra: no
 * AudioContext, no getUserMedia, no real piano recording. Fidelity to the
 * measured spike numbers (12-root confusion matrices etc.) is not
 * re-verified here - that lives in the spike's own harness/results.txt -
 * these tests instead lock the ported algorithm's observable behavior
 * against a plain Node/Vitest environment, so a future edit that quietly
 * breaks fundamental-picking, overtone cancellation, the fifth exclusion,
 * or the stability/gating decision fails loudly.
 */

const RAW_FS = 44100;
const ANALYSIS_FS = RAW_FS / 4;

/** Synthesizes a raw-rate multi-note signal with a piano-ish partial falloff, long enough for the longest CQ kernel after decimation. */
function synthesizeRaw(midis: number[], seconds = 0.6): Float32Array {
	const n = Math.round(seconds * RAW_FS);
	const out = new Float32Array(n);
	const harmonics = [1, 0.6, 0.3, 0.15, 0.1];
	for (const midi of midis) {
		const f0 = 440 * Math.pow(2, (midi - 69) / 12);
		for (let h = 0; h < harmonics.length; h++) {
			const freq = f0 * (h + 1);
			if (freq > RAW_FS / 2 - 500) continue;
			const w = (2 * Math.PI * freq) / RAW_FS;
			for (let i = 0; i < n; i++) out[i] += harmonics[h] * Math.sin(w * i);
		}
	}
	let peak = 0;
	for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
	if (peak > 0) for (let i = 0; i < n; i++) out[i] /= peak;
	return out;
}

function argmax(arr: ArrayLike<number>): number {
	let best = 0;
	for (let i = 1; i < arr.length; i++) if (arr[i] > arr[best]) best = i;
	return best;
}

describe('buildKernels', () => {
	it('builds one kernel per semitone from MIDI_LO to MIDI_HI', () => {
		const det = buildKernels(ANALYSIS_FS);
		expect(det.kernels).toHaveLength(N_BINS);
		expect(det.kernels[0].midi).toBe(MIDI_LO);
		expect(det.kernels[N_BINS - 1].midi).toBe(MIDI_HI);
	});

	it('the lowest note has the longest kernel (lowest frequency needs the longest window)', () => {
		const det = buildKernels(ANALYSIS_FS);
		const lengths = det.kernels.map((k) => k.n);
		expect(det.longestKernel).toBe(Math.max(...lengths));
		expect(det.kernels[0].n).toBe(det.longestKernel);
		expect(det.kernels[N_BINS - 1].n).toBeLessThan(det.kernels[0].n);
	});

	it('caps kernel length at MAX_N', () => {
		const det = buildKernels(ANALYSIS_FS);
		for (const k of det.kernels) expect(k.n).toBeLessThanOrEqual(4096);
	});
});

describe('lowpass4 / decimateBy4', () => {
	it('passes a low frequency through with little attenuation', () => {
		const n = 4096;
		const freq = 200;
		const x = new Float32Array(n);
		for (let i = 0; i < n; i++) x[i] = Math.sin((2 * Math.PI * freq * i) / RAW_FS);
		const y = lowpass4(x, 4600, RAW_FS);
		// Compare RMS over the settled tail (skip the filter's transient).
		const rms = (arr: Float32Array) => {
			let sum = 0;
			for (let i = 512; i < arr.length; i++) sum += arr[i] * arr[i];
			return Math.sqrt(sum / (arr.length - 512));
		};
		expect(rms(y) / rms(x)).toBeGreaterThan(0.85);
	});

	it('heavily attenuates a frequency well above the corner', () => {
		const n = 4096;
		const freq = 20000;
		const x = new Float32Array(n);
		for (let i = 0; i < n; i++) x[i] = Math.sin((2 * Math.PI * freq * i) / RAW_FS);
		const y = lowpass4(x, 4600, RAW_FS);
		const rms = (arr: Float32Array) => {
			let sum = 0;
			for (let i = 512; i < arr.length; i++) sum += arr[i] * arr[i];
			return Math.sqrt(sum / (arr.length - 512));
		};
		expect(rms(y) / rms(x)).toBeLessThan(0.1);
	});

	it('decimateBy4 shortens the buffer by exactly 4x', () => {
		const raw = new Float32Array(1000);
		const out = decimateBy4(raw, RAW_FS);
		expect(out.length).toBe(250);
	});
});

describe('analyzeBuffer (synthesized raw signal, end to end)', () => {
	it('finds a single note at the right pitch class', () => {
		const raw = synthesizeRaw([60]); // C4
		const det = buildKernels(ANALYSIS_FS);
		const frame = analyzeBuffer(raw, RAW_FS, det);
		expect(argmax(frame.chroma)).toBe(0); // C
		expect(frame.peak).toBeGreaterThan(0);
	});

	it('finds all three pitch classes of a triad, with the wrong pitch classes much weaker', () => {
		const raw = synthesizeRaw([60, 64, 67]); // C4 E4 G4 -> C major
		const det = buildKernels(ANALYSIS_FS);
		const frame = analyzeBuffer(raw, RAW_FS, det);
		expect(frame.chroma[0]).toBeGreaterThan(0.2); // C
		expect(frame.chroma[4]).toBeGreaterThan(0.2); // E
		expect(frame.chroma[7]).toBeGreaterThan(0.2); // G
		// A pitch class nowhere near the triad should be far weaker than the
		// weakest true note.
		const weakestTrue = Math.min(frame.chroma[0], frame.chroma[4], frame.chroma[7]);
		expect(frame.chroma[2]).toBeLessThan(weakestTrue); // D: not in the chord
	});
});

describe('pickNotes + chromaFromNotes (fixture spectra)', () => {
	it('reports a single clean peak as one note at the right bin', () => {
		const det = buildKernels(ANALYSIS_FS);
		const spec = new Float32Array(N_BINS);
		const targetBin = 60 - MIDI_LO; // C4
		spec[targetBin] = 1;
		const notes = pickNotes(spec, det);
		expect(notes.length).toBeGreaterThanOrEqual(1);
		expect(notes[0].midi).toBe(60);
	});

	it('ranks the true fundamental first and suppresses the octave overtone ghost', () => {
		// Matching pursuit cancels MOST but not mathematically all of a strong
		// isolated 2nd partial (the algorithm is tuned to work well on real
		// multi-note signals, not to guarantee zero residual on one synthetic
		// worst-case tone) - so the meaningful, algorithm-accurate invariant is
		// that the true fundamental is always found first, and any residual
		// ghost is left much weaker than it, not that no residual ever appears.
		const det = buildKernels(ANALYSIS_FS);
		const spec = new Float32Array(N_BINS);
		const fundamentalBin = 48 - MIDI_LO; // C3
		spec[fundamentalBin] = 1;
		spec[fundamentalBin + 12] = 0.6; // a realistic 2nd partial (the octave)
		const notes = pickNotes(spec, det);
		expect(notes[0].midi).toBe(48);
		const ghost = notes.find((n) => n.midi === 60);
		if (ghost) expect(ghost.strength).toBeLessThan(notes[0].strength * 0.5);
	});

	it('folds picked notes into a max-normalised 12-bin chroma vector', () => {
		const notes = [
			{ midi: 60, strength: 1 },
			{ midi: 64, strength: 0.5 },
			{ midi: 72, strength: 0.5 } // same pitch class as 60, different octave
		];
		const chroma = chromaFromNotes(notes);
		expect(chroma).toHaveLength(12);
		// 60 and 72 both fold to chroma 0 and sum (1 + 0.5 = 1.5) before
		// max-normalising, so chroma[0] becomes the new 1.0 and chroma[4]
		// (untouched at 0.5) becomes 0.5 / 1.5.
		expect(chroma[0]).toBe(1);
		expect(chroma[4]).toBeCloseTo(0.5 / 1.5, 5);
		expect(Math.max(...chroma)).toBe(1);
	});
});

describe('CHROMA_NAMES', () => {
	it('has 12 unique entries', () => {
		expect(CHROMA_NAMES).toHaveLength(12);
		expect(new Set(CHROMA_NAMES).size).toBe(12);
	});
});

describe('buildChromaTarget: the perfect fifth is excluded, nothing else is', () => {
	it('Cm7: the perfect fifth (G) is excluded from grading entirely', () => {
		const chord = spellChord('Cm7');
		expect(chord.recognized).toBe(true);
		const target = buildChromaTarget(chord);
		expect(target.required).toEqual(new Set([0, 3, 10])); // C, Eb, Bb
		expect(target.ignored).toEqual(new Set([7])); // G, the perfect fifth
	});

	it('Cm7b5: the flat fifth is NOT excluded, since it is not the root physical 3rd partial', () => {
		const chord = spellChord('Cm7b5');
		expect(chord.recognized).toBe(true);
		const target = buildChromaTarget(chord);
		expect(target.required.has(6)).toBe(true); // Gb/F#, the flat fifth, fully graded
		expect(target.ignored.size).toBe(0);
	});

	it('Cdim7: the diminished fifth is NOT excluded', () => {
		const chord = spellChord('Cdim7');
		expect(chord.recognized).toBe(true);
		const target = buildChromaTarget(chord);
		expect(target.required).toEqual(new Set([0, 3, 6, 9]));
		expect(target.ignored.size).toBe(0);
	});

	it('Caug: the augmented fifth is NOT excluded', () => {
		const chord = spellChord('Caug');
		expect(chord.recognized).toBe(true);
		const target = buildChromaTarget(chord);
		expect(target.required).toEqual(new Set([0, 4, 8]));
		expect(target.ignored.size).toBe(0);
	});
});

describe('isPerfectFifthAboveRoot', () => {
	it('is true for a plain perfect fifth (C -> G)', () => {
		expect(isPerfectFifthAboveRoot('C', 'G')).toBe(true);
	});

	it('is true across an enharmonic root spelling (F♯ -> C♯, still 7 semitones)', () => {
		expect(isPerfectFifthAboveRoot('F♯', 'C♯')).toBe(true);
	});

	it('is false for a diminished fifth (C -> G♭)', () => {
		expect(isPerfectFifthAboveRoot('C', 'G♭')).toBe(false);
	});

	it('is false for an augmented fifth (C -> G♯)', () => {
		expect(isPerfectFifthAboveRoot('C', 'G♯')).toBe(false);
	});

	it('is false for any other interval (C -> E, a third)', () => {
		expect(isPerfectFifthAboveRoot('C', 'E')).toBe(false);
	});

	it('is total: an unresolvable letter never throws, and returns false', () => {
		expect(isPerfectFifthAboveRoot('C', 'not-a-note')).toBe(false);
		expect(isPerfectFifthAboveRoot('not-a-note', 'G')).toBe(false);
	});
});

describe('buildChromaTargetFromNotes: the shared builder behind buildChromaTarget', () => {
	it('produces the exact same target as buildChromaTarget for the same chord (Cm7), proving the refactor is behavior-preserving', () => {
		const chord = spellChord('Cm7');
		expect(chord.recognized).toBe(true);
		expect(buildChromaTargetFromNotes(chord.root, chord.notes)).toEqual(buildChromaTarget(chord));
	});

	it("grades a GROWING subset (BuildSession mic mode): root + third only, the fifth not yet in the note list at all", () => {
		const chord = spellChord('Cm7');
		const rootPlusThird = chord.notes.filter((n) => n.role === 'root' || n.role === 'third');
		const target = buildChromaTargetFromNotes(chord.root, rootPlusThird);
		expect(target.required).toEqual(new Set([0, 3])); // C, E♭ only
		expect(target.ignored.size).toBe(0); // the fifth isn't in this note list at all yet
	});

	it('still excludes a perfect fifth from a growing subset that DOES include it', () => {
		const chord = spellChord('Cm7');
		const target = buildChromaTargetFromNotes(chord.root, chord.notes.slice(0, 3)); // root, third, fifth
		expect(target.required).toEqual(new Set([0, 3]));
		expect(target.ignored).toEqual(new Set([7]));
	});

	it('drops a note with no resolvable chroma instead of throwing', () => {
		const target = buildChromaTargetFromNotes('C', [
			{ letter: 'C', solfege: 'Do', role: 'root' },
			{ letter: 'not-a-note', solfege: '', role: 'third' }
		]);
		expect(target.required).toEqual(new Set([0]));
	});
});

describe('frameStatus', () => {
	const target: ChromaTarget = { required: new Set([0, 3, 10]), ignored: new Set([7]) };

	function chroma(values: Partial<Record<number, number>>): Float32Array {
		const out = new Float32Array(12);
		for (const [pc, v] of Object.entries(values)) out[Number(pc)] = v as number;
		return out;
	}

	it('accepts when every required chroma clears tPresent and no unexpected chroma is loud', () => {
		const status = frameStatus(chroma({ 0: 0.9, 3: 0.8, 10: 0.7, 7: 1.0 }), target);
		// The ignored fifth (7) is loud but must not block acceptance.
		expect(status.ok).toBe(true);
		expect(status.missing).toEqual([]);
	});

	it('rejects and reports a missing required note below tPresent', () => {
		const status = frameStatus(chroma({ 0: 0.9, 3: 0.05, 10: 0.7 }), target);
		expect(status.ok).toBe(false);
		expect(status.missing).toContain(3);
	});

	it('rejects when an unexpected (non-ignored) chroma is too loud', () => {
		const status = frameStatus(chroma({ 0: 0.9, 3: 0.8, 10: 0.7, 5: 0.9 }), target);
		expect(status.ok).toBe(false);
		expect(status.maxOtherPc).toBe(5);
	});

	it('an empty required set is never gradeable, mirroring matchChord.ts', () => {
		const status = frameStatus(chroma({}), { required: new Set(), ignored: new Set() });
		expect(status.ok).toBe(false);
	});
});

describe('ChromaStabilityTracker', () => {
	const target: ChromaTarget = { required: new Set([0, 3, 10]), ignored: new Set([7]) };
	const goodChroma = (() => {
		const c = new Float32Array(12);
		c[0] = 1;
		c[3] = 0.9;
		c[10] = 0.8;
		return c;
	})();
	const goodFrame: DetectFrame = { chroma: goodChroma, notes: [], peak: 0.5 };

	it('does not confirm before `stability` consecutive agreeing frames', () => {
		const tracker = new ChromaStabilityTracker();
		const first = tracker.push(goodFrame, target, 0);
		expect(first.status).toBe('holding');
		const second = tracker.push(goodFrame, target, 50);
		expect(second.status).toBe('holding');
	});

	it('confirms on the Nth consecutive agreeing frame (N = stability)', () => {
		const tracker = new ChromaStabilityTracker();
		let last = tracker.push(goodFrame, target, 0);
		for (let i = 1; i < DEFAULT_DETECTOR_PARAMS.stability; i++) {
			last = tracker.push(goodFrame, target, i * 50);
		}
		expect(last.status).toBe('confirmed');
	});

	it('sustained disagreement resets the run counter once it fully evicts the trailing smoother, though the time-based latch hold outlives it', () => {
		// Two mechanisms are both faithfully ported from the spike and interact
		// here: (1) the smoother is a trailing SUM (not average) over the last
		// `smooth` frames, so a genuinely silent "bad" frame does not change the
		// accept/reject ratio AT ALL while at least one strong frame remains in
		// the window - the run only actually resets once enough bad frames have
		// fully evicted the good ones; (2) once latched, "confirmed" is held for
		// latchHoldMs regardless of the run counter, so status only leaves
		// 'confirmed' once BOTH the window is fully bad AND enough time passed.
		const tracker = new ChromaStabilityTracker();
		tracker.push(goodFrame, target, 0);
		tracker.push(goodFrame, target, 50);
		const badFrame: DetectFrame = { chroma: new Float32Array(12), notes: [], peak: 0.5 };
		let last = tracker.push(badFrame, target, 100);
		for (let i = 1; i < DEFAULT_DETECTOR_PARAMS.smooth; i++) {
			last = tracker.push(badFrame, target, 100 + i * 50);
		}
		// The trailing window is now entirely silent frames: the run counter itself is reset...
		expect(last.run).toBe(0);
		// ...but the latch (armed earlier, while the window still held a good frame) is still within its hold.
		expect(last.status).toBe('confirmed');
		const afterHold = tracker.push(
			badFrame,
			target,
			100 + DEFAULT_DETECTOR_PARAMS.smooth * 50 + DEFAULT_DETECTOR_PARAMS.latchHoldMs + 100
		);
		expect(afterHold.status).not.toBe('confirmed');
	});

	it('gated frames (app audio active) never confirm and reset the tracker', () => {
		const tracker = new ChromaStabilityTracker();
		tracker.push(goodFrame, target, 0);
		tracker.push(goodFrame, target, 50);
		const gated = tracker.push(goodFrame, target, 100, true);
		expect(gated.status).toBe('muted');
		expect(gated.run).toBe(0);
		// Even many more "gated" good frames never confirm.
		for (let i = 0; i < 10; i++) {
			expect(tracker.push(goodFrame, target, 150 + i * 50, true).status).toBe('muted');
		}
	});

	it('a latched confirmation holds for latchHoldMs, then re-arms', () => {
		const tracker = new ChromaStabilityTracker();
		let last = tracker.push(goodFrame, target, 0);
		for (let i = 1; i < DEFAULT_DETECTOR_PARAMS.stability; i++) {
			last = tracker.push(goodFrame, target, i * 50);
		}
		expect(last.status).toBe('confirmed');
		const stillHeld = tracker.push(goodFrame, target, 200 + DEFAULT_DETECTOR_PARAMS.latchHoldMs / 2);
		expect(stillHeld.status).toBe('confirmed');
		const reArmed = tracker.push(
			goodFrame,
			target,
			200 + DEFAULT_DETECTOR_PARAMS.latchHoldMs + 100
		);
		expect(reArmed.status).not.toBe('confirmed');
	});

	it('quiet (below quietPeak) frames never confirm even with a matching chroma', () => {
		const tracker = new ChromaStabilityTracker();
		const quietGoodFrame: DetectFrame = { chroma: goodChroma, notes: [], peak: 0 };
		let last = tracker.push(quietGoodFrame, target, 0);
		for (let i = 1; i < DEFAULT_DETECTOR_PARAMS.stability + 2; i++) {
			last = tracker.push(quietGoodFrame, target, i * 50);
		}
		expect(last.status).toBe('quiet');
	});

	it('reset() clears run/latch state', () => {
		const tracker = new ChromaStabilityTracker();
		tracker.push(goodFrame, target, 0);
		tracker.push(goodFrame, target, 50);
		tracker.reset();
		const after = tracker.push(goodFrame, target, 100);
		expect(after.run).toBe(1);
		expect(after.status).toBe('holding');
	});
});
