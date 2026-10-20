import { spellChord } from '$lib/theory/chord';
import { randomChord, ROOTS, QUALITY_SUFFIXES } from '$lib/theory/randomChord';
import { matchChord } from './matchChord';
import { generateIntervalQuestion, type IntervalQuestion } from './generateIntervalQuestion';

/** A chord drill prompt: either "build this chord" or "name this chord". */
export interface ChordQuestion {
	kind: 'chord';
	/** Which direction of chord fluency this question drills. */
	direction: 'construction' | 'identification';
	/** The correct chord symbol for this question. */
	symbol: string;
	/** Present only for identification questions: 4 shuffled options including `symbol`. */
	choices?: string[];
}

/**
 * A single drill prompt, discriminated on `kind` (Track C union): chord
 * questions keep their exact pre-union draw order and behavior; interval
 * questions come from generateIntervalQuestion.ts.
 */
export type DrillQuestion = ChordQuestion | IntervalQuestion;

/** The drills page deck selector: chord-only, interval-only, or an even mix. */
export type DrillMode = 'chords' | 'intervals' | 'mix';

const QUESTION_TYPES = ['construction', 'identification'] as const;

/**
 * Picks a question direction with a 50/50 random choice (D-06), matching
 * randomChord's Math.random() draw style so both modules stay pure and total.
 */
export function pickQuestionType(): 'construction' | 'identification' {
	return QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)];
}

/** Derives a chord symbol's target chroma set, the same way matchChord derives it. */
function chromaSetFor(symbol: string): Set<number> {
	const target = spellChord(symbol);
	// matchChord(played=[]) returns `missing` = every target chroma, which is
	// exactly the target chroma set - reuses matchChord rather than
	// re-deriving chroma extraction locally.
	return new Set(matchChord([], target).missing);
}

function sameChromaSet(a: Set<number>, b: Set<number>): boolean {
	return a.size === b.size && [...a].every((chroma) => b.has(chroma));
}

/**
 * Draws `count` plausible, parseable distractors for a multiple-choice
 * identification question (D-05, D-06).
 *
 * Shared-root rule (Sketch 002 session): all options share the correct
 * answer's ROOT, differing only in quality (Gm7 vs G7 vs Gmaj7 vs Gm7b5).
 * The identification keyboard reveals the root, so mixed-root options would
 * let the user pick by matching the visible root without ever identifying
 * the quality - which is the app's core skill. Same-root distractors force a
 * genuine quality read. Two different qualities on one root never share a
 * chroma set, so the enharmonic-identity guard is moot here but kept for
 * safety.
 *
 * Note-count rule: same-root candidates are ordered by how close their note
 * count is to the answer's (same count first, then the nearest), shuffled
 * within each distance. Otherwise a lit three-key triad among four-note
 * options is answered by counting keys (or hearing the density, in the ear
 * mode) without reading any quality. A triad therefore gets the other
 * triads, a seventh chord three other four-note qualities, and a five-note
 * chord with no five-note sibling falls back to four-note ones.
 *
 * Same-root candidates are drawn from the proven QUALITY_SUFFIXES matrix
 * (13 alternatives per root), so `count` = 3 is always satisfiable. A
 * cross-root fallback only fires in the theoretical case of too few parseable
 * same-root qualities, keeping the function total.
 */
export function pickDistractors(correctSymbol: string, count = 3): string[] {
	const correctChroma = chromaSetFor(correctSymbol);
	// Longest-match: a bare "F" prefix must not shadow the two-char "F#"/"Bb"
	// roots (ROOTS lists "F" before "F#"), or a sharp/flat chord's distractors
	// would silently switch to the natural root.
	const correctRoot = ROOTS.filter((root) => correctSymbol.startsWith(root)).sort(
		(a, b) => b.length - a.length
	)[0];
	const correctQuality =
		correctRoot !== undefined ? correctSymbol.slice(correctRoot.length) : undefined;

	const sameRoot: string[] = [];
	const crossRoot: string[] = [];
	if (correctRoot !== undefined) {
		for (const quality of QUALITY_SUFFIXES) {
			if (quality === correctQuality) continue;
			sameRoot.push(`${correctRoot}${quality}`);
		}
	}
	// Fallback pool only used if same-root cannot supply `count` (never with
	// the current 8-quality matrix, but keeps this total for smaller matrices).
	for (const root of ROOTS) {
		if (root === correctRoot) continue;
		for (const quality of QUALITY_SUFFIXES) {
			crossRoot.push(`${root}${quality}`);
		}
	}

	const orderedCandidates = [
		...byNoteCountDistance(sameRoot, correctChroma.size),
		...shuffle(crossRoot)
	];

	// `orderedCandidates` is the finite sameRoot + crossRoot matrix, so this loop
	// is already bounded by the array length and needs no iteration cap. The
	// former MAX_DISTRACTOR_ATTEMPTS = 200 was not just redundant, it was a
	// latent bug: the matrix is ROOTS x QUALITY_SUFFIXES, currently 12 x 8 = 104
	// candidates, so growing the quality vocabulary past ~16 qualities would make
	// the cap trip before `count` distractors were gathered and silently return a
	// short list, turning a 4-option question into a 3-option one.
	const chosen: string[] = [];
	for (const candidate of orderedCandidates) {
		if (chosen.length >= count) break;
		if (candidate === correctSymbol) continue;
		if (chosen.includes(candidate)) continue;
		const chord = spellChord(candidate);
		if (!chord.recognized) continue;
		if (sameChromaSet(chromaSetFor(candidate), correctChroma)) continue;
		chosen.push(candidate);
	}

	return chosen;
}

/**
 * Orders `symbols` by |note count - `targetSize`| ascending, shuffling within
 * each distance so the draw stays random among equally close qualities.
 */
function byNoteCountDistance(symbols: string[], targetSize: number): string[] {
	const groups = new Map<number, string[]>();
	for (const symbol of symbols) {
		const distance = Math.abs(chromaSetFor(symbol).size - targetSize);
		groups.set(distance, [...(groups.get(distance) ?? []), symbol]);
	}
	return [...groups.keys()]
		.sort((a, b) => a - b)
		.flatMap((distance) => shuffle(groups.get(distance)!));
}

/** Fisher-Yates shuffle using Math.random(), matching the codebase's existing random style. */
function shuffle<T>(items: T[]): T[] {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

/**
 * Practice-pool seam (Track B) + deck selector (Track C), combined at the
 * integration merge:
 *
 * - `symbol`: the practice engine already drew a chord symbol (a
 *   session-sourced warm-up/retry/seed item, or any other caller-supplied
 *   symbol). Skips the random symbol draw and FORCES a chord question
 *   regardless of `mode` (session items are chord symbols).
 * - `direction`: a scaffold stage forces construction or identification,
 *   skipping the 50/50 direction draw. Also forces a chord question.
 * - `mode`: which family a fresh draw belongs to. 'chords' (default) keeps
 *   the original uniform randomChord behavior; 'intervals' delegates to
 *   generateIntervalQuestion; 'mix' spends one leading 50/50 draw on the
 *   family. Callers that pool-source chord symbols should decide the family
 *   FIRST via `pickQuestionFamily(mode)` and only then draw from the pool.
 */
export interface GenerateQuestionOptions {
	symbol?: string;
	direction?: 'construction' | 'identification';
	mode?: DrillMode;
}

/**
 * One 50/50 family draw for MIX decks; chord-only and interval-only modes
 * consume no randomness. Exported so the drills page can decide the family
 * BEFORE drawing a chord symbol from the practice pool (the pool draw only
 * happens when the family is 'chord').
 */
export function pickQuestionFamily(mode: DrillMode): 'chord' | 'interval' {
	if (mode === 'intervals') return 'interval';
	if (mode === 'mix') return Math.random() >= 0.5 ? 'interval' : 'chord';
	return 'chord';
}

/**
 * Generates one drill question (D-05/D-06). Chord questions use the
 * caller-provided symbol when given (practice pool seam), falling back to
 * the proven randomChord matrix; the direction is a 50/50 draw unless
 * forced; identification questions get 4 shuffled choices (the correct
 * symbol plus 3 plausible, parseable, non-enharmonic-identical
 * distractors). Interval questions delegate to generateIntervalQuestion.
 * With no options the behavior is exactly the original uniform
 * randomChord + 50/50 direction draw.
 */
export function generateQuestion(options: GenerateQuestionOptions = {}): DrillQuestion {
	const forcesChord = options.symbol !== undefined || options.direction !== undefined;
	if (!forcesChord && pickQuestionFamily(options.mode ?? 'chords') === 'interval') {
		return generateIntervalQuestion();
	}

	const symbol = options.symbol ?? randomChord();
	const direction = options.direction ?? pickQuestionType();

	if (direction === 'construction') {
		return { kind: 'chord', direction, symbol };
	}

	const choices = shuffle([symbol, ...pickDistractors(symbol)]);
	return { kind: 'chord', direction, symbol, choices };
}
