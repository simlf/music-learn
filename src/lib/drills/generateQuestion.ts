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

/** Bounded attempt cap so a degenerate matrix state can never spin forever (T-03-02). */
const MAX_DISTRACTOR_ATTEMPTS = 200;

/**
 * Draws `count` plausible, parseable, non-enharmonic-identical distractors
 * for a multiple-choice identification question (D-05, D-06). Candidates are
 * drawn from the same proven ROOTS x QUALITY_SUFFIXES matrix as `randomChord`
 * rather than a redefined space, and are excluded when unparseable, already
 * chosen, or enharmonically identical to the correct answer (same chroma set).
 *
 * Prefers plausible near-misses (same root, different quality; or same
 * quality, different root) before falling back to any other supported
 * symbol, so the 3 options are pedagogically meaningful rather than random
 * noise. Total function: always returns `count` distractors from the finite
 * 96-cell space, bounded by an attempt cap rather than looping unbounded.
 */
export function pickDistractors(correctSymbol: string, count = 3): string[] {
	const correctChroma = chromaSetFor(correctSymbol);
	const correctRoot = ROOTS.find((root) => correctSymbol.startsWith(root));
	const correctQuality =
		correctRoot !== undefined ? correctSymbol.slice(correctRoot.length) : undefined;

	const nearMissCandidates: string[] = [];
	const otherCandidates: string[] = [];
	for (const root of ROOTS) {
		for (const quality of QUALITY_SUFFIXES) {
			const candidate = `${root}${quality}`;
			if (candidate === correctSymbol) continue;
			const isNearMiss = root === correctRoot || quality === correctQuality;
			(isNearMiss ? nearMissCandidates : otherCandidates).push(candidate);
		}
	}

	const orderedCandidates = [...shuffle(nearMissCandidates), ...shuffle(otherCandidates)];

	const chosen: string[] = [];
	let attempts = 0;
	for (const candidate of orderedCandidates) {
		if (chosen.length >= count || attempts >= MAX_DISTRACTOR_ATTEMPTS) break;
		attempts++;
		if (chosen.includes(candidate)) continue;
		const chord = spellChord(candidate);
		if (!chord.recognized) continue;
		if (sameChromaSet(chromaSetFor(candidate), correctChroma)) continue;
		chosen.push(candidate);
	}

	return chosen;
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
 * - `symbol`: the practice engine already drew a chord symbol (the weighted
 *   60/25/15 song/tier/review mix in $lib/practice/pool, or a session-sourced
 *   warm-up/retry/seed item). Skips the random symbol draw and FORCES a
 *   chord question regardless of `mode` (session items are chord symbols).
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
