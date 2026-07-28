// Sanity check + timing before running the full grid.
import { renderChord, CONDITIONS } from './render.mjs';
import { analyze, verify, LONGEST_KERNEL, ANALYSIS_FS } from './detect.mjs';

const wavDir = process.env.WAV_DIR;
const PC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

console.log('longest kernel', LONGEST_KERNEL, 'samples =', ((LONGEST_KERNEL / ANALYSIS_FS) * 1000).toFixed(0), 'ms');

const chords = {
	Cm7: [48, 51, 55, 58],
	Cmaj7: [48, 52, 55, 59],
	C7: [48, 52, 55, 58],
	Cm7b5: [48, 51, 54, 58]
};

for (const [name, midis] of Object.entries(chords)) {
	const t0 = Date.now();
	const sig = renderChord(midis, { wavDir, seed: 3 });
	const tRender = Date.now() - t0;
	const t1 = Date.now();
	const frames = analyze(sig);
	const tAnalyze = Date.now() - t1;
	const mid = frames[Math.floor(frames.length / 2)];
	const top = [...mid.chroma]
		.map((v, c) => [PC[c], v])
		.filter(([, v]) => v > 0.05)
		.sort((a, b) => b[1] - a[1])
		.map(([c, v]) => `${c}:${v.toFixed(2)}`)
		.join(' ');
	const own = new Set(midis.map((m) => m % 12));
	const v = verify(frames, own);
	console.log(
		name.padEnd(7),
		`frames=${frames.length}`,
		`render=${tRender}ms analyze=${tAnalyze}ms`,
		`bass=${mid.bassMidi} (${PC[mid.bassChroma]})`,
		`selfAccept=${v.accepted} lat=${v.latencyMs}`,
		'|',
		top
	);
}

// Degradation timing
const sig = renderChord(chords.Cm7, { wavDir, seed: 3 });
for (const [name, fn] of Object.entries(CONDITIONS)) {
	const t0 = Date.now();
	const deg = fn(sig);
	const frames = analyze(deg);
	const v = verify(frames, new Set([0, 3, 7, 10]));
	const mid = frames[Math.floor(frames.length / 2)];
	const top = [...mid.chroma]
		.map((x, c) => [PC[c], x])
		.filter(([, x]) => x > 0.05)
		.sort((a, b) => b[1] - a[1])
		.map(([c, x]) => `${c}:${x.toFixed(2)}`)
		.join(' ');
	console.log(name.padEnd(22), `${Date.now() - t0}ms`, `accept=${v.accepted} lat=${v.latencyMs}`, '|', top);
}
