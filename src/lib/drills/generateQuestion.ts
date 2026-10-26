import { spellChord } from '$lib/theory/chord';
import {
	randomChord,
	ROOTS,
	QUALITY_SUFFIXES,
	V1_QUALITY_SUFFIXES
} from '$lib/theory/randomChord';
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
 * Draws `count` distractors that do NOT all share the answer's root (C5,
 * ml-practice-variety): one same-root quality (pickDistractors' nearest note
 * count) plus chords on OTHER roots that share the most notes with the answer,
 * same note count first. For C that is Cm, Cdim or Csus4 beside Am, Em or
 * Edim. The cross-root chords come from the core eight qualities
 * (V1_QUALITY_SUFFIXES) and never need a double accidental, so the grid never
 * offers a D♭dim (D♭ F♭ A𝄫) to tell apart from a C.
 *
 * pickDistractors' shared-root rule exists because a mixed-root grid lets the
 * visible root answer the question, and a grid of four unrelated roots would.
 * These cross-root chords are not unrelated: each shares two or more notes
 * with the answer, so the lit keys fit several of the choices and the user
 * has to read which note is the root as well as the quality. That is the
 * other half of reading a chord off the page, and the half a same-root grid
 * gives away for free, which is why every NAME IT question offered the same
 * four chips {X, Xm, Xdim, Xsus4} for root X. Same totality and
 * enharmonic-identity guards as pickDistractors.
 */
export function pickMixedRootDistractors(correctSymbol: string, count = 3): string[] {
	const correctChroma = chromaSetFor(correctSymbol);
	const sameRoot = pickDistractors(correctSymbol, Math.min(1, count));
	const correctRoot = rootOf(correctSymbol);

	const groups = new Map<string, string[]>();
	for (const root of ROOTS) {
		if (root === correctRoot) continue;
		for (const quality of V1_QUALITY_SUFFIXES) {
			const candidate = `${root}${quality}`;
			const spelled = spellChord(candidate);
			if (!spelled.recognized || spelled.notes.some((note) => isDoubleAccidental(note.letter))) continue;
			const chroma = chromaSetFor(candidate);
			if (sameChromaSet(chroma, correctChroma)) continue;
			const shared = [...chroma].filter((pc) => correctChroma.has(pc)).length;
			if (shared < 2) continue;
			const key = `${-shared}:${Math.abs(chroma.size - correctChroma.size)}`;
			groups.set(key, [...(groups.get(key) ?? []), candidate]);
		}
	}
	// Sort the groups by note-count distance first (a lit three-key triad must
	// not be answerable by counting keys), then by most shared notes.
	const ordered = [...groups.keys()]
		.sort((a, b) => {
			const [sharedA, distanceA] = a.split(':').map(Number);
			const [sharedB, distanceB] = b.split(':').map(Number);
			return distanceA - distanceB || sharedA - sharedB;
		})
		.flatMap((key) => shuffle(groups.get(key)!));

	const chosen = [...sameRoot];
	for (const candidate of [...ordered, ...pickDistractors(correctSymbol, count)]) {
		if (chosen.length >= count) break;
		if (candidate === correctSymbol || chosen.includes(candidate)) continue;
		chosen.push(candidate);
	}
	return chosen;
}

/** True for a spelled letter carrying two accidentals (B𝄫, F𝄪, or a doubled glyph). */
function isDoubleAccidental(letter: string): boolean {
	return /𝄫|𝄪|♭♭|♯♯/.test(letter);
}

/** The longest ROOTS entry `symbol` starts with ("F#m" is F#, not F), or undefined. */
function rootOf(symbol: string): string | undefined {
	return ROOTS.filter((root) => symbol.startsWith(root)).sort((a, b) => b.length - a.length)[0];
}

/**
 * The NAME IT question's template for one appearance (C5). The 'formula' card
 * is one fact - see the chord, know it - and these are three ways of asking
 * it, so the template rotates instead of the same four chips every time:
 *
 *   - 'name-same-root': the notes are lit, name the chord from four same-root
 *     qualities (the original question, pickDistractors);
 *   - 'name-mixed-root': the notes are lit, name the chord from one same-root
 *     quality and two note-sharing chords on other roots
 *     (pickMixedRootDistractors);
 *   - 'pick-notes': the SYMBOL is shown, pick its notes from four spellings
 *     (the answer and three same-root qualities). This is the app's core
 *     value asked directly - see a chord symbol, know what to play - and it
 *     needs no keyboard at all, so it is as answerable one-handed on a phone
 *     as the choice grids are.
 *
 * Every template grades the same card with the same Rating; only the
 * question changes.
 */
export type NameItVariant = 'name-same-root' | 'name-mixed-root' | 'pick-notes';

const NAME_IT_VARIANTS: readonly NameItVariant[] = ['name-same-root', 'name-mixed-root', 'pick-notes'];

/**
 * The template for a 'formula' card's next appearance, rotated by the card's
 * own review count: a card's first appearance is the original question, and
 * every later one (a day's review, or a miss's in-session retry, since a
 * graded card's reps has moved on) asks it the next way round. Deterministic
 * on purpose, so the rotation is a guarantee rather than a coin flip and a
 * test can pin which question a card gets.
 */
export function nameItVariantFor(reps: number): NameItVariant {
	const index = Math.max(0, Math.floor(reps)) % NAME_IT_VARIANTS.length;
	return NAME_IT_VARIANTS[index];
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
	/**
	 * Which distractor draw an identification question uses: 'same-root'
	 * (default, pickDistractors) or 'mixed-root' (pickMixedRootDistractors).
	 */
	distractors?: 'same-root' | 'mixed-root';
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

	const distractors =
		options.distractors === 'mixed-root' ? pickMixedRootDistractors(symbol) : pickDistractors(symbol);
	const choices = shuffle([symbol, ...distractors]);
	return { kind: 'chord', direction, symbol, choices };
}
