// Confirms the detector inlined in index.html is the same algorithm as
// harness/detect.mjs: identical input -> identical picked notes and chroma.
import { cqtFrame, pickNotes, KERNELS, N_BINS, LONGEST_KERNEL, ANALYSIS_FS } from './detect.mjs';
const fs = ANALYSIS_FS, n = 11025;
const sig = new Float32Array(n);
for (const m of [48, 51, 55, 58]) {
	const f = 440 * Math.pow(2, (m - 69) / 12);
	for (let h = 1; h <= 4; h++) for (let i = 0; i < n; i++) sig[i] += (0.3 / h) * Math.sin((2 * Math.PI * f * h * i) / fs + h);
}
const spec = new Float32Array(N_BINS);
cqtFrame(sig, sig.length, spec);
const notes = pickNotes(spec);
const ch = new Float32Array(12);
for (const nn of notes) ch[nn.midi % 12] += nn.strength;
let mx = 0;
for (let c = 0; c < 12; c++) if (ch[c] > mx) mx = ch[c];
if (mx > 0) for (let c = 0; c < 12; c++) ch[c] /= mx;
console.log(JSON.stringify({
	longestKernel: LONGEST_KERNEL,
	notes: notes.map((x) => [x.midi, +x.strength.toFixed(8)]),
	chroma: [...ch].map((v) => +v.toFixed(6))
}));
