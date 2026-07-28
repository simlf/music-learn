// The experiment grid. Every number in README.md comes from this file's output.
//   WAV_DIR=<decoded samples> node measure.mjs > results.txt
import { writeFileSync } from 'node:fs';
import { renderChord, CONDITIONS, mix } from './render.mjs';
import { analyze, verify, decimate4, LONGEST_KERNEL, ANALYSIS_FS, HOP, Q, MAX_N } from './detect.mjs';

const wavDir = process.env.WAV_DIR;
if (!wavDir) throw new Error('set WAV_DIR (see decode.sh)');

const PC = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const ROOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

/** Root-relative semitones. Mirrors the qualities the app actually drills. */
const QUALITIES = {
	maj7: [0, 4, 7, 11],
	7: [0, 4, 7, 10],
	m7: [0, 3, 7, 10],
	m7b5: [0, 3, 6, 10],
	dim7: [0, 3, 6, 9],
	6: [0, 4, 7, 9],
	maj: [0, 4, 7],
	min: [0, 3, 7],
	dim: [0, 3, 6],
	aug: [0, 4, 8],
	'shell-7': [0, 4, 10],
	'shell-m7': [0, 3, 10],
	'shell-maj7': [0, 4, 11]
};

/** Close left-hand voicing: root in the C3-B3 octave, chord stacked upward. */
function voicing(rootPc, quality, baseOctaveMidi = 48) {
	return QUALITIES[quality].map((s) => baseOctaveMidi + rootPc + s);
}

function chromaSet(rootPc, quality) {
	return new Set(QUALITIES[quality].map((s) => (rootPc + s) % 12));
}

// ------------------------------------------------------------------ machinery

const analysisCache = new Map();

/**
 * Renders at 44.1 kHz, decimates to the 11.025 kHz analysis rate, applies the
 * named degradation there, then analyses. Cached per (voicing, condition).
 */
function analyseSignal(sig44k, condition, opts = {}) {
	return analyze(CONDITIONS[condition](decimate4(sig44k)), { ...opts, decimated: true });
}

function framesFor(midis, condition, seed = 11) {
	const key = `${midis.join('.')}|${condition}|${seed}`;
	if (analysisCache.has(key)) return analysisCache.get(key);
	const frames = analyseSignal(renderChord(midis, { wavDir, seed }), condition);
	analysisCache.set(key, frames);
	return frames;
}

function pct(n, d) {
	return d === 0 ? 'n/a' : `${((100 * n) / d).toFixed(1)}%`;
}

function median(xs) {
	if (!xs.length) return null;
	const s = [...xs].sort((a, b) => a - b);
	return s[Math.floor(s.length / 2)];
}

function p90(xs) {
	if (!xs.length) return null;
	const s = [...xs].sort((a, b) => a - b);
	return s[Math.min(s.length - 1, Math.floor(s.length * 0.9))];
}

const OUT = [];
function say(line = '') {
	OUT.push(line);
	console.log(line);
}

const CONDS = [
	'clean',
	'phone',
	'phone+snr20',
	'phone+snr10',
	'phone+room12',
	'phone+room6',
	'phone+room0',
	'phone+room6+snr20',
	'phone+room6+snr15',
	'phone+room6+snr10',
	'phone+room0+snr10',
	'phoneHard+room6+snr15',
	'phone+schroeder30+snr15'
];

const results = { config: { Q, MAX_N, HOP, ANALYSIS_FS, latencyFloorMs: Math.round((LONGEST_KERNEL / ANALYSIS_FS) * 1000) } };

say(`# detector config: Q=${Q} maxWindow=${MAX_N} (${results.config.latencyFloorMs} ms) hop=${HOP} (${((HOP / ANALYSIS_FS) * 1000).toFixed(1)} ms) analysisFs=${ANALYSIS_FS}`);
say();

// ------------------------------------------------- E0: threshold sweep surface
// Reported in full so no threshold is silently tuned to flatter the result.
say('## E0 threshold sweep (all 12 roots; TA = true accept on maj7/7/m7/m7b5/dim7;');
say('##    FA = false accept over CONFUSIONS_TUNE, the one-chroma-apart confusions)');
say();

const TA_QUALITIES = ['maj7', '7', 'm7', 'm7b5', 'dim7'];

/**
 * Confusions the OPERATING POINT is tuned against: one chroma substituted, or
 * one chroma present/absent. These are the ones a threshold can actually win.
 */
const CONFUSIONS_TUNE = [
	['m7', 'm7b5'],
	['m7b5', 'm7'],
	['maj7', '7'],
	['7', 'maj7'],
	['m7', '7'],
	['7', 'm7'],
	['maj', 'maj7'],
	['maj7', 'maj'],
	['min', 'm7'],
	['m7', 'min'],
	['dim', 'dim7'],
	['dim7', 'dim']
];

/**
 * Everything reported in E2, including the fifth-omission pairs. Those are NOT
 * in the tuning objective: the perfect fifth is the root's own 3rd partial, so
 * its presence is not a threshold question, and letting the optimiser chase it
 * only trades away true accepts it could otherwise keep.
 */
const CONFUSIONS = [
	['m7', 'm7b5'],
	['m7b5', 'm7'],
	['maj7', '7'],
	['7', 'maj7'],
	['m7', '7'],
	['7', 'm7'],
	['maj', 'maj7'],
	['maj7', 'maj'],
	['min', 'm7'],
	['m7', 'min'],
	['dim', 'dim7'],
	['dim7', 'dim'],
	// Omitting the perfect fifth: the fifth IS the root's 3rd partial, so this
	// probes whether a missing fifth can be detected at all.
	['shell-7', '7'],
	['7', 'shell-7'],
	['shell-m7', 'm7'],
	['m7', 'shell-m7'],
	['shell-maj7', 'maj7'],
	['maj7', 'shell-maj7']
];

function evalPoint(params, conds) {
	const out = {};
	for (const cond of conds) {
		let ta = 0,
			taN = 0,
			fa = 0,
			faN = 0;
		const lats = [];
		for (const root of ROOTS) {
			for (const q of TA_QUALITIES) {
				const f = framesFor(voicing(root, q), cond);
				const v = verify(f, chromaSet(root, q), params);
				taN++;
				if (v.accepted) {
					ta++;
					lats.push(v.latencyMs);
				}
			}
			for (const [played, target] of CONFUSIONS_TUNE) {
				const f = framesFor(voicing(root, played), cond);
				const v = verify(f, chromaSet(root, target), params);
				faN++;
				if (v.accepted) fa++;
			}
		}
		out[cond] = { ta, taN, fa, faN, medLat: median(lats), p90Lat: p90(lats) };
	}
	return out;
}

const SWEEP_CONDS = ['clean', 'phone+room6+snr15'];
const sweep = [];
for (const stability of [2, 3]) {
	for (const smooth of [3, 5]) {
		for (const windowSec of [0.8, 1.2]) {
			for (const tPresent of [0.1, 0.2]) {
				for (const margin of [0.15, 0.2, 0.25, 0.3]) {
					for (const tExtra of [0.25, 0.35, 0.5, 1.0]) {
						const params = { tPresent, tExtra, margin, stability, smooth, windowSec };
						const r = evalPoint(params, SWEEP_CONDS);
						sweep.push({ params, r });
					}
				}
			}
		}
	}
}
say('| stab | smooth | window s | tPresent | tExtra | margin | clean TA | clean FA | degraded TA | degraded FA |');
say('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const s of sweep) {
	const c = s.r.clean;
	const d = s.r[SWEEP_CONDS[1]];
	say(
		`| ${s.params.stability} | ${s.params.smooth} | ${s.params.windowSec} | ${s.params.tPresent} | ${s.params.tExtra} | ${s.params.margin} | ${pct(c.ta, c.taN)} | ${pct(c.fa, c.faN)} | ${pct(d.ta, d.taN)} | ${pct(d.fa, d.faN)} |`
	);
}
results.sweep = sweep.map((s) => ({
	...s.params,
	cleanTA: s.r.clean.ta / s.r.clean.taN,
	cleanFA: s.r.clean.fa / s.r.clean.faN,
	degTA: s.r[SWEEP_CONDS[1]].ta / s.r[SWEEP_CONDS[1]].taN,
	degFA: s.r[SWEEP_CONDS[1]].fa / s.r[SWEEP_CONDS[1]].faN
}));
say();

// Operating point: maximise mean true accept minus 5x mean false accept. The 5x
// is a stated value judgement, not a fitted constant: a false accept teaches
// wrong theory, a false reject only annoys.
const scoreOf = (s) => {
	const ta = (s.r.clean.ta / s.r.clean.taN + s.r[SWEEP_CONDS[1]].ta / s.r[SWEEP_CONDS[1]].taN) / 2;
	const fa = (s.r.clean.fa / s.r.clean.faN + s.r[SWEEP_CONDS[1]].fa / s.r[SWEEP_CONDS[1]].faN) / 2;
	return ta - 5 * fa;
};
const ranked = [...sweep].sort((a, b) => scoreOf(b) - scoreOf(a));
say('## Top 8 operating points by (meanTA - 5 x meanFA):');
for (const s of ranked.slice(0, 8)) {
	say(
		`- ${JSON.stringify(s.params)} score=${scoreOf(s).toFixed(3)} cleanTA=${pct(s.r.clean.ta, s.r.clean.taN)} cleanFA=${pct(s.r.clean.fa, s.r.clean.faN)} degTA=${pct(s.r[SWEEP_CONDS[1]].ta, s.r[SWEEP_CONDS[1]].taN)} degFA=${pct(s.r[SWEEP_CONDS[1]].fa, s.r[SWEEP_CONDS[1]].faN)}`
	);
}
const OP = ranked[0].params;
say(`## Operating point chosen: ${JSON.stringify(OP)}`);
results.operatingPoint = OP;
say();

// ------------------------------------------------------- E1: true accept table
say('## E1 true-accept rate per quality (12 roots each), operating point');
say();
say(`| quality | ${CONDS.join(' | ')} |`);
say(`| --- | ${CONDS.map(() => '---').join(' | ')} |`);
results.trueAccept = {};
for (const q of Object.keys(QUALITIES)) {
	const cells = [];
	results.trueAccept[q] = {};
	for (const cond of CONDS) {
		let ok = 0;
		const lats = [];
		for (const root of ROOTS) {
			const v = verify(framesFor(voicing(root, q), cond), chromaSet(root, q), OP);
			if (v.accepted) {
				ok++;
				lats.push(v.latencyMs);
			}
		}
		cells.push(`${pct(ok, 12)}`);
		results.trueAccept[q][cond] = { rate: ok / 12, medLat: median(lats) };
	}
	say(`| ${q} | ${cells.join(' | ')} |`);
}
say();

// ---------------------------------------------------- E2: false-accept probing
say('## E2 false-accept rate per confusion pair (played -> target, 12 roots each)');
say('##    Every cell must read 0.0%. Anything above 0 teaches wrong theory.');
say();
say(`| played -> target | delta | ${CONDS.join(' | ')} |`);
say(`| --- | --- | ${CONDS.map(() => '---').join(' | ')} |`);
results.falseAccept = {};
for (const [played, target] of CONFUSIONS) {
	const pSet = new Set(QUALITIES[played]);
	const tSet = new Set(QUALITIES[target]);
	const delta = [
		...[...tSet].filter((s) => !pSet.has(s)).map((s) => `missing ${s}st`),
		...[...pSet].filter((s) => !tSet.has(s)).map((s) => `extra ${s}st`)
	].join(', ');
	const cells = [];
	results.falseAccept[`${played}->${target}`] = {};
	for (const cond of CONDS) {
		let fa = 0;
		for (const root of ROOTS) {
			const v = verify(framesFor(voicing(root, played), cond), chromaSet(root, target), OP);
			if (v.accepted) fa++;
		}
		cells.push(pct(fa, 12));
		results.falseAccept[`${played}->${target}`][cond] = fa / 12;
	}
	say(`| ${played} -> ${target} | ${delta} | ${cells.join(' | ')} |`);
}
say();

// Full 13x13 cross matrix at the operating point, degraded condition, all roots.
say('## E2b full cross matrix, condition phone+room6+snr15: accepts per 12 roots');
say('##    diagonal = true accept, off-diagonal = false accept');
say();
const QK = Object.keys(QUALITIES);
say(`| played \\ target | ${QK.join(' | ')} |`);
say(`| --- | ${QK.map(() => '---').join(' | ')} |`);
results.crossMatrix = {};
let offDiagAccepts = 0;
let offDiagTotal = 0;
for (const played of QK) {
	const row = [];
	results.crossMatrix[played] = {};
	for (const target of QK) {
		let n = 0;
		for (const root of ROOTS) {
			if (verify(framesFor(voicing(root, played), 'phone+room6+snr15'), chromaSet(root, target), OP).accepted) n++;
		}
		row.push(String(n));
		results.crossMatrix[played][target] = n;
		if (played !== target) {
			offDiagAccepts += n;
			offDiagTotal += 12;
		}
	}
	say(`| ${played} | ${row.join(' | ')} |`);
}
say();
say(`Off-diagonal (same-root wrong-quality) false accepts: ${offDiagAccepts}/${offDiagTotal} = ${pct(offDiagAccepts, offDiagTotal)}`);
results.offDiagonal = { accepts: offDiagAccepts, total: offDiagTotal };
say();

// Cross-root false accepts: play the right quality on the WRONG root.
say('## E2c wrong-root false accepts (played quality q on root r, target q on every other root)');
let wrongRootFA = 0;
let wrongRootN = 0;
results.wrongRoot = { perQuality: {} };
for (const q of TA_QUALITIES) {
	let fa = 0;
	let n = 0;
	for (const root of ROOTS) {
		for (const other of ROOTS) {
			if (other === root) continue;
			n++;
			if (verify(framesFor(voicing(root, q), 'phone+room6+snr15'), chromaSet(other, q), OP).accepted) fa++;
		}
	}
	// A quality whose chroma set is invariant under some transposition (dim7
	// under minor thirds, aug under major thirds) MUST accept those roots.
	let unavoidable = 0;
	for (const root of ROOTS)
		for (const other of ROOTS) {
			if (other === root) continue;
			const a = [...chromaSet(root, q)].sort((x, y) => x - y).join(',');
			const b = [...chromaSet(other, q)].sort((x, y) => x - y).join(',');
			if (a === b) unavoidable++;
		}
	say(`- ${q}: ${fa}/${n} = ${pct(fa, n)}  (of which ${unavoidable} are transposition-invariant chroma sets, unavoidable)`);
	results.wrongRoot.perQuality[q] = { accepts: fa, total: n, unavoidable };
	wrongRootFA += fa;
	wrongRootN += n;
}
say(`Wrong-root false accepts, all qualities: ${wrongRootFA}/${wrongRootN} = ${pct(wrongRootFA, wrongRootN)}`);
results.wrongRoot.accepts = wrongRootFA;
results.wrongRoot.total = wrongRootN;
say();

// ------------------------------------------------------------- E3: latency
say('## E3 latency from note onset to confident verdict (accepted cases only)');
say();
say('| condition | median ms | p90 ms | n |');
say('| --- | --- | --- | --- |');
results.latency = {};
for (const cond of CONDS) {
	const lats = [];
	for (const root of ROOTS)
		for (const q of TA_QUALITIES) {
			const v = verify(framesFor(voicing(root, q), cond), chromaSet(root, q), OP);
			if (v.accepted) lats.push(v.latencyMs);
		}
	say(`| ${cond} | ${median(lats)} | ${p90(lats)} | ${lats.length} |`);
	results.latency[cond] = { median: median(lats), p90: p90(lats), n: lats.length };
}
say();
say(`Hard floor from the analysis window itself: ${results.config.latencyFloorMs} ms (longest constant-Q kernel) + ${OP.stability - 1} hops of stability = ${results.config.latencyFloorMs + (OP.stability - 1) * Math.round((HOP / ANALYSIS_FS) * 1000)} ms.`);
say();

// ------------------------------------------------- E4: octave (in)sensitivity
say('## E4 octave sensitivity: same chroma set played in four octaves, one target');
say('##    High accept everywhere = chroma is octave-blind (expected, by construction)');
say();
const OCTAVES = [36, 48, 60, 72, 79];
say(`| quality | ${OCTAVES.map((m) => `root midi ${m}`).join(' | ')} |`);
say(`| --- | ${OCTAVES.map(() => '---').join(' | ')} |`);
results.octave = {};
for (const q of ['maj7', '7', 'm7', 'm7b5']) {
	const row = [];
	results.octave[q] = {};
	for (const base of OCTAVES) {
		let ok = 0;
		for (const root of [0, 3, 5, 7, 10]) {
			const v = verify(framesFor(voicing(root, q, base), 'phone+room6+snr15'), chromaSet(root, q), OP);
			if (v.accepted) ok++;
		}
		row.push(pct(ok, 5));
		results.octave[q][base] = ok / 5;
	}
	say(`| ${q} | ${row.join(' | ')} |`);
}
say();

// ------------------------------------------------------ E5: bass estimation
say('## E5 bass-note estimation (what the inversion drill needs)');
say('##    matchInversion.ts requires the played BASS chroma to equal a target bass chroma.');
say();
say('| condition | bass chroma correct | bass octave+chroma correct | n |');
say('| --- | --- | --- | --- |');
results.bass = {};
const INV_QUALITIES = ['maj7', '7', 'm7', 'm7b5'];
for (const cond of ['clean', 'phone', 'phone+room6', 'phone+room6+snr15']) {
	let pcOk = 0,
		midiOk = 0,
		n = 0;
	for (const q of INV_QUALITIES) {
		for (const root of [0, 2, 5, 7, 9, 10]) {
			const iv = QUALITIES[q];
			for (let inv = 0; inv < iv.length; inv++) {
				// Rotate the voicing so interval index `inv` is the lowest note.
				const midis = iv.map((s, i) => 48 + root + s + (i < inv ? 12 : 0));
				const lowest = Math.min(...midis);
				const frames = framesFor(midis, cond, 23);
				const v = verify(frames, chromaSet(root, q), OP);
				const frame = frames[v.accepted ? v.verdictFrame : Math.floor(frames.length / 3)];
				n++;
				if (frame.bassChroma === lowest % 12) pcOk++;
				if (frame.bassMidi === lowest) midiOk++;
			}
		}
	}
	say(`| ${cond} | ${pct(pcOk, n)} | ${pct(midiOk, n)} | ${n} |`);
	results.bass[cond] = { pcRate: pcOk / n, midiRate: midiOk / n, n };
}
say();

// Bass errors broken down by octave, since the missing-fundamental failure is
// specifically an octave-up error.
say('## E5b bass error breakdown, condition phone+room6+snr15');
const bassErr = { exact: 0, octaveUp: 0, octaveDown: 0, otherPc: 0, none: 0 };
for (const q of INV_QUALITIES) {
	for (const root of ROOTS) {
		const iv = QUALITIES[q];
		for (let inv = 0; inv < iv.length; inv++) {
			const midis = iv.map((s, i) => 48 + root + s + (i < inv ? 12 : 0));
			const lowest = Math.min(...midis);
			const frames = framesFor(midis, 'phone+room6+snr15', 23);
			const v = verify(frames, chromaSet(root, q), OP);
			const frame = frames[v.accepted ? v.verdictFrame : Math.floor(frames.length / 3)];
			if (frame.bassMidi === undefined) bassErr.none++;
			else if (frame.bassMidi === lowest) bassErr.exact++;
			else if (frame.bassMidi === lowest + 12) bassErr.octaveUp++;
			else if (frame.bassMidi === lowest - 12) bassErr.octaveDown++;
			else bassErr.otherPc++;
		}
	}
}
const bassTotal = Object.values(bassErr).reduce((a, b) => a + b, 0);
for (const [k, v] of Object.entries(bassErr)) say(`- ${k}: ${v}/${bassTotal} = ${pct(v, bassTotal)}`);
results.bassErrors = { ...bassErr, total: bassTotal };
say();

// ---------------------------------------- E5c: end-to-end inversion grading
say('## E5c inversion drill end-to-end: played inversion i vs target inversion j.');
say('##    Accept requires BOTH the chroma set and the required bass chroma, exactly');
say('##    as matchInversion.ts grades. Diagonal = true accept, off-diagonal = false');
say('##    accept (credit for the wrong inversion).');
say();
function invVoicing(root, q, inv) {
	const iv = QUALITIES[q];
	return iv.map((sm, i) => 48 + root + sm + (i < inv ? 12 : 0));
}
results.inversion = {};
for (const cond of ['clean', 'phone+room6+snr15']) {
	let diagOk = 0;
	let diagN = 0;
	let offFa = 0;
	let offN = 0;
	for (const q of INV_QUALITIES) {
		for (const root of ROOTS) {
			const iv = QUALITIES[q];
			for (let played = 0; played < iv.length; played++) {
				const frames = framesFor(invVoicing(root, q, played), cond, 23);
				const v = verify(frames, chromaSet(root, q), OP);
				const frame = v.accepted ? frames[v.verdictFrame] : null;
				for (let target = 0; target < iv.length; target++) {
					const targetBass = (root + iv[target]) % 12;
					const accept = Boolean(v.accepted && frame && frame.bassChroma === targetBass);
					if (played === target) {
						diagN++;
						if (accept) diagOk++;
					} else {
						offN++;
						if (accept) offFa++;
					}
				}
			}
		}
	}
	say(
		`- ${cond}: correct inversion accepted ${pct(diagOk, diagN)} (${diagOk}/${diagN}); wrong inversion falsely accepted ${pct(offFa, offN)} (${offFa}/${offN})`
	);
	results.inversion[cond] = { trueAccept: diagOk / diagN, falseAccept: offFa / offN, diagN, offN };
}
say();

// ---------------------------------------------------------- E6: dim7 symmetry
say('## E6 dim7 symmetry: Cdim7 played, targets Cdim7 / Ebdim7 / Gbdim7 / Adim7');
say('##    All four share one chroma set, so all four must accept. Confirms the');
say('##    collision the app ALREADY has in matchChord.ts. Not a mic regression.');
say();
const dimPlayed = voicing(0, 'dim7');
for (const cond of ['clean', 'phone+room6+snr15']) {
	const f = framesFor(dimPlayed, cond);
	const row = [0, 3, 6, 9].map((r) => `${PC[r]}dim7=${verify(f, chromaSet(r, 'dim7'), OP).accepted ? 'ACCEPT' : 'reject'}`);
	say(`- ${cond}: ${row.join('  ')}`);
	results.dim7 = results.dim7 || {};
	results.dim7[cond] = row;
}
say(`- chroma sets identical: ${[0, 3, 6, 9].map((r) => `${PC[r]}dim7={${[...chromaSet(r, 'dim7')].sort((a, b) => a - b).join(',')}}`).join(' ')}`);
say();

// -------------------------------------------------- E7: sustain / pedal bleed
say('## E7 sustain and pedal bleed: previous chord still ringing when the next lands');
say('##    Fm7 struck at t=0, target chord struck at t=1.0s, analysis anchored to');
say('##    the SECOND onset. Bleed gains simulate a released key (fast decay) vs a');
say('##    held sustain pedal (no decay).');
say();
say('| bleed level | target accepted (should be high) | old chord still accepted (false accept) | n |');
say('| --- | --- | --- | --- |');
results.bleed = {};
for (const [label, bleedGain] of [
	['none', 0],
	['-12 dB', 0.25],
	['-6 dB', 0.5],
	['0 dB (pedal down)', 1.0]
]) {
	let tgtOk = 0,
		oldFa = 0,
		n = 0;
	for (const root of ROOTS) {
		for (const q of ['m7', 'maj7', '7']) {
			const prevRoot = (root + 5) % 12;
			const prev = voicing(prevRoot, 'm7');
			const cur = voicing(root, q);
			const prevSig = renderChord(prev, { wavDir, seed: 31, durationSec: 3.6 });
			const curSig = renderChord(cur, { wavDir, seed: 32, durationSec: 3.6, startSec: 1.0 });
			const mixed = CONDITIONS['phone+room6+snr15'](decimate4(mix(curSig, prevSig, bleedGain)));
			// Anchor the analysis window at the second onset.
			const sliced = mixed.slice(Math.round(1.0 * ANALYSIS_FS));
			const frames = analyze(sliced, { decimated: true });
			n++;
			if (verify(frames, chromaSet(root, q), OP).accepted) tgtOk++;
			if (verify(frames, chromaSet(prevRoot, 'm7'), OP).accepted) oldFa++;
		}
	}
	say(`| ${label} | ${pct(tgtOk, n)} | ${pct(oldFa, n)} | ${n} |`);
	results.bleed[label] = { targetRate: tgtOk / n, oldFalseAccept: oldFa / n, n };
}
say();

// ---------------------------------------------- E8: the app's own audio output
say("## E8 the app's own speaker output heard by the mic");
say('##    The app plays the answer chord (audio.ts). Three scenarios.');
say();
results.appAudio = {};
{
	// (a) app plays the target, user plays NOTHING.
	let a = 0;
	for (const root of ROOTS)
		for (const q of ['maj7', 'm7', '7']) {
			const app = renderChord(voicing(root, q), { wavDir, seed: 44, gain: 0.35 });
			const frames = analyseSignal(app, 'phone+room6+snr15');
			if (verify(frames, chromaSet(root, q), OP).accepted) a++;
		}
	say(`(a) app plays target, user silent -> accepted ${a}/36 = ${pct(a, 36)}  [the app grades itself]`);
	results.appAudio.selfGrade = a / 36;

	// (b) app plays the target, user plays a WRONG chord at full level.
	let b = 0;
	for (const root of ROOTS)
		for (const [wrong, target] of [
			['m7', 'm7b5'],
			['maj7', '7'],
			['m7', '7']
		]) {
			const app = renderChord(voicing(root, target), { wavDir, seed: 45, gain: 0.35 });
			const user = renderChord(voicing(root, wrong), { wavDir, seed: 46, gain: 0.55 });
			const frames = analyseSignal(mix(user, app), 'phone+room6+snr15');
			if (verify(frames, chromaSet(root, target), OP).accepted) b++;
		}
	say(`(b) app plays target + user plays a one-chroma-off chord -> target accepted ${b}/36 = ${pct(b, 36)}  [wrong answer graded correct]`);
	results.appAudio.wrongMaskedByApp = b / 36;

	// (c) app audio at -20 dB relative to the played piano, user plays correctly.
	let c = 0;
	for (const root of ROOTS)
		for (const q of ['maj7', 'm7', '7']) {
			const app = renderChord(voicing((root + 7) % 12, q), { wavDir, seed: 47, gain: 0.055 });
			const user = renderChord(voicing(root, q), { wavDir, seed: 48, gain: 0.55 });
			const frames = analyseSignal(mix(user, app), 'phone+room6+snr15');
			if (verify(frames, chromaSet(root, q), OP).accepted) c++;
		}
	say(`(c) quiet unrelated app audio (-20 dB) + correct piano -> still accepted ${c}/36 = ${pct(c, 36)}  [tolerance to leakage]`);
	results.appAudio.quietLeakTolerance = c / 36;
}
say();

// -------------------------------------------------- E9: scale drill (sequence)
say('## E9 single notes in sequence (what the scale drill would need)');
say('##    Notes struck one at a time at 2 notes/sec, C major over one octave.');
say('##    Reported: how many of the 8 struck notes are the top chroma at some frame.');
{
	const seq = [60, 62, 64, 65, 67, 69, 71, 72];
	const dur = 0.5;
	let sig = new Float32Array(Math.round((seq.length * dur + 2.6) * 44100));
	seq.forEach((m, i) => {
		const one = renderChord([m], { wavDir, seed: 60 + i, durationSec: seq.length * dur + 2.6, startSec: i * dur });
		for (let j = 0; j < one.length; j++) sig[j] += one[j];
	});
	for (const cond of ['clean', 'phone+room6+snr15']) {
		const frames = analyseSignal(sig, cond, { untilSec: seq.length * dur + 1.0 });
		let hit = 0;
		seq.forEach((m, i) => {
			const t0 = i * dur;
			const t1 = t0 + dur;
			const inWindow = frames.filter((f) => f.tSec >= t0 && f.tSec <= t1 + 0.45);
			const ok = inWindow.some((f) => {
				let best = -1,
					bestV = 0;
				for (let c = 0; c < 12; c++)
					if (f.chroma[c] > bestV) {
						bestV = f.chroma[c];
						best = c;
					}
				return best === m % 12;
			});
			if (ok) hit++;
		});
		say(`- ${cond}: ${hit}/8 struck notes became the top chroma inside their own window`);
		results.scaleSeq = results.scaleSeq || {};
		results.scaleSeq[cond] = hit / 8;
	}
}
say();

writeFileSync(new URL('./results.json', import.meta.url), JSON.stringify(results, null, '\t'));
writeFileSync(new URL('./results.txt', import.meta.url), `${OUT.join('\n')}\n`);
say(`# analyses run: ${analysisCache.size} cached + uncached confound renders`);
