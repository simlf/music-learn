/**
 * Scores taps against a written rhythm. Pure: times in, verdicts out, no DOM,
 * no clock, no audio, so every threshold below is unit-tested directly.
 *
 * All times are milliseconds on one shared timeline. The caller decides what
 * zero means (the first beat of the exercise, after the count-in) and turns
 * the written onsets into expected times with `expectedOnsetTimes`.
 */

export type Verdict = 'perfect' | 'good' | 'missed';

export interface OnsetResult {
	/** Position among the onsets (not the flat note list). */
	onsetIndex: number;
	expectedMs: number;
	/** The tap matched to this onset, or null when it was missed. */
	tapMs: number | null;
	/** tap - expected: negative is early, positive is late. Null when missed. */
	offsetMs: number | null;
	verdict: Verdict;
}

export type Tendency = 'rushing' | 'dragging' | 'steady';

export interface RhythmScore {
	results: OnsetResult[];
	perfect: number;
	good: number;
	missed: number;
	/** Taps that matched no written onset (too early, too late, or doubled). */
	extra: number;
	/** 0 to 100. */
	score: number;
	passed: boolean;
	/** Mean signed offset of the matched taps, ms. Null when nothing matched. */
	meanOffsetMs: number | null;
	/** Standard deviation of the matched offsets, ms: how even the taps were. */
	spreadMs: number | null;
	tendency: Tendency | null;
	/** The tolerances used, so the UI can state them. */
	goodWindowMs: number;
	perfectWindowMs: number;
}

export interface ScoreOptions {
	/** Added to every tap before scoring: compensates a device's input latency. Default 0. */
	latencyOffsetMs?: number;
}

/** Score at or above which an attempt counts as passed. */
export const PASS_SCORE = 75;
/** Credit per verdict; an extra tap costs EXTRA_PENALTY of one onset. */
const CREDIT: Record<Verdict, number> = { perfect: 1, good: 0.6, missed: 0 };
const EXTRA_PENALTY = 0.25;

const GOOD_FRACTION = 0.25;
const GOOD_MIN_MS = 80;
const GOOD_MAX_MS = 200;
const PERFECT_FRACTION = 0.4;
const STEADY_MIN_MS = 15;

/**
 * The window (+/- ms) inside which a tap counts as hitting an onset: a quarter
 * of a beat, but never tighter than 80 ms (below which a human on a touch
 * screen is not reliably scoreable) nor looser than 200 ms (so slow tempi stay
 * honest about timing).
 */
export function goodWindowMs(beatMs: number): number {
	return Math.min(GOOD_MAX_MS, Math.max(GOOD_MIN_MS, beatMs * GOOD_FRACTION));
}

/** The tighter window for a "perfect" tap: 40% of the good window. */
export function perfectWindowMs(beatMs: number): number {
	return goodWindowMs(beatMs) * PERFECT_FRACTION;
}

/** Milliseconds per quarter-note beat. */
export function beatMsFor(bpm: number): number {
	return 60000 / bpm;
}

/** Turns written onset positions (in beats) into expected tap times (ms from the first beat). */
export function expectedOnsetTimes(onsetBeats: number[], bpm: number): number[] {
	const beatMs = beatMsFor(bpm);
	return onsetBeats.map((b) => b * beatMs);
}

/**
 * Matches taps to onsets and scores them.
 *
 * Matching is by closeness, globally: every (onset, tap) pair within the good
 * window is a candidate, candidates are taken nearest-first, and each onset
 * and each tap is used at most once. So a tap always goes to the onset it is
 * closest to, two taps near one onset leave the better one matched and the
 * other counted as extra, and a late tap can never steal the next onset's
 * match from a tap that was nearer to it.
 */
export function scoreRhythm(
	expectedMs: number[],
	tapsMs: number[],
	bpm: number,
	options: ScoreOptions = {}
): RhythmScore {
	const beatMs = beatMsFor(bpm);
	const good = goodWindowMs(beatMs);
	const perfect = perfectWindowMs(beatMs);
	const offset = options.latencyOffsetMs ?? 0;
	const taps = tapsMs.map((t) => t - offset);

	const pairs: { onset: number; tap: number; dist: number }[] = [];
	expectedMs.forEach((e, onset) => {
		taps.forEach((t, tap) => {
			const dist = Math.abs(t - e);
			if (dist <= good) pairs.push({ onset, tap, dist });
		});
	});
	pairs.sort((a, b) => a.dist - b.dist || a.onset - b.onset || a.tap - b.tap);

	const onsetTap = new Map<number, number>();
	const usedTaps = new Set<number>();
	for (const p of pairs) {
		if (onsetTap.has(p.onset) || usedTaps.has(p.tap)) continue;
		onsetTap.set(p.onset, p.tap);
		usedTaps.add(p.tap);
	}

	const results: OnsetResult[] = expectedMs.map((e, onsetIndex) => {
		const tapIndex = onsetTap.get(onsetIndex);
		if (tapIndex === undefined) {
			return { onsetIndex, expectedMs: e, tapMs: null, offsetMs: null, verdict: 'missed' };
		}
		const tapMs = taps[tapIndex];
		const off = tapMs - e;
		return {
			onsetIndex,
			expectedMs: e,
			tapMs,
			offsetMs: off,
			verdict: Math.abs(off) <= perfect ? 'perfect' : 'good'
		};
	});

	const counts = { perfect: 0, good: 0, missed: 0 };
	for (const r of results) counts[r.verdict] += 1;
	const extra = taps.length - usedTaps.size;
	const total = expectedMs.length;
	const raw =
		total === 0
			? 0
			: ((counts.perfect * CREDIT.perfect + counts.good * CREDIT.good - extra * EXTRA_PENALTY) /
					total) *
				100;
	const score = Math.max(0, Math.min(100, Math.round(raw)));

	const offsets = results.map((r) => r.offsetMs).filter((o): o is number => o !== null);
	let meanOffsetMs: number | null = null;
	let spreadMs: number | null = null;
	let tendency: Tendency | null = null;
	if (offsets.length > 0) {
		const mean = offsets.reduce((a, b) => a + b, 0) / offsets.length;
		meanOffsetMs = Math.round(mean);
		spreadMs = Math.round(
			Math.sqrt(offsets.reduce((a, b) => a + (b - mean) ** 2, 0) / offsets.length)
		);
		const steadyBand = Math.max(STEADY_MIN_MS, good * 0.2);
		tendency = mean < -steadyBand ? 'rushing' : mean > steadyBand ? 'dragging' : 'steady';
	}

	return {
		results,
		perfect: counts.perfect,
		good: counts.good,
		missed: counts.missed,
		extra,
		score,
		passed: total > 0 && score >= PASS_SCORE,
		meanOffsetMs,
		spreadMs,
		tendency,
		goodWindowMs: good,
		perfectWindowMs: perfect
	};
}
