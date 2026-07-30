import {
	chromaOf,
	intervalBetween,
	intervalFromShort,
	transposeFrom,
	type IntervalInfo
} from '$lib/theory/interval';
import { ROOTS } from '$lib/theory/randomChord';

/**
 * The spell-the-interval drill (unit 4's proof, guided-path.md section 6.1):
 * given a root and an interval's full name, answer with a LETTER and an
 * ACCIDENTAL rather than a tapped key, because a tapped key cannot force
 * letter-name reasoning (a black key answers two different questions at
 * once). This is the "missing half" the pedagogy audit named: the app can
 * already ask the user to NAME an interval (`generateIntervalQuestion`'s
 * identification direction) and to TAP one (its construction direction), but
 * never to SPELL one.
 *
 * Deliberately independent of `generateIntervalQuestion.ts` / `DRILL_INTERVALS`:
 * this pool is NOT part of the FSRS catalog (owner decision, default no
 * carding for this drill - see the unit's PR description) and must never
 * become one by accident. `DRILL_INTERVALS` feeds `buildIntervalSizeFacts()`
 * in `src/lib/srs/facts.ts`, so a shared pool would silently grow the
 * catalog; keeping this pool in its own module with its own generator makes
 * that impossible by construction, not by convention.
 */

/**
 * Three enharmonic pairs, each sharing a piano key but not a letter count:
 * (A2, m3) at 3 half steps, (A4, d5) at 6, (M6, d7) at 9. m3, A4 and M6 are
 * also in `DRILL_INTERVALS` (cardable, already drilled by name/tap); A2, d5
 * and d7 are their "evil twins", never cardable, existing ONLY here so the
 * drill can ask the exact question that makes number-vs-quality legible: the
 * same key, spelled two ways, because it is reached by a different count of
 * letters. Verified against tonal directly (not by reasoning): C+A2 = D♯,
 * C+m3 = E♭, both chroma 3; C+A4 = F♯, C+d5 = G♭, both chroma 6; C+d7 = B♭♭,
 * C+M6 = A, both chroma 9 (the exact "why does Cdim7 have a B♭♭" case this
 * unit's lesson uses as its payoff).
 */
export const SPELLING_DRILL_INTERVALS: readonly string[] = ['A2', 'm3', 'A4', 'd5', 'd7', 'M6'];

/** One spell-the-interval question: a root, the target interval, and its canonical spelling split into its two independently-graded parts. */
export interface SpellingQuestion {
	kind: 'interval-spelling';
	/** Root letter in display glyphs, e.g. "B♭". */
	root: string;
	/** The interval under test, fully named (short/long/longFr/degree/quality/semitones/role). */
	interval: IntervalInfo;
	/** The canonical display-glyph spelling of the target note, e.g. "D♯". */
	expectedSpelling: string;
	/** `expectedSpelling`'s bare letter, e.g. "D". The number-counting half of the answer. */
	expectedLetter: string;
	/** `expectedSpelling`'s accidental suffix, e.g. "♯", "", or "♭♭". The quality half of the answer. */
	expectedAccidental: string;
}

export interface GenerateSpellingQuestionOptions {
	/** Forces the interval, skipping its random draw (tests, deterministic entry). The root still draws normally. */
	short?: string;
}

/** Splits a display-glyph spelling into its bare letter and its accidental suffix. Total: an empty input splits to two empty strings rather than throwing. */
export function splitSpelling(spelled: string): { letter: string; accidental: string } {
	return { letter: spelled.charAt(0), accidental: spelled.slice(1) };
}

/**
 * Generates one spelling question. Draws, in order: (1) root index over
 * ROOTS, (2) interval index over SPELLING_DRILL_INTERVALS (skipped when
 * `short` is forced) - the same positional shape as
 * `generateIntervalQuestion`, so a caller pinning `Math.random` for a
 * deterministic first question can reason about it the same way.
 */
export function generateSpellingQuestion(
	options: GenerateSpellingQuestionOptions = {}
): SpellingQuestion {
	const rootAscii = ROOTS[Math.floor(Math.random() * ROOTS.length)];
	const short =
		options.short ??
		SPELLING_DRILL_INTERVALS[Math.floor(Math.random() * SPELLING_DRILL_INTERVALS.length)];

	// transposeFrom(root, 'R') round-trips through the glyph restore, so "Bb"
	// comes out as the display form "B♭" (mirrors generateIntervalQuestion's
	// own root-normalization comment).
	const root = transposeFrom(rootAscii, 'R');
	const interval = intervalFromShort(short);
	const expectedSpelling = transposeFrom(root, short);
	const { letter, accidental } = splitSpelling(expectedSpelling);

	return {
		kind: 'interval-spelling',
		root,
		interval,
		expectedSpelling,
		expectedLetter: letter,
		expectedAccidental: accidental
	};
}

/** A graded spelling answer: the letter and pitch checks are kept SEPARATE and explicit, never collapsed into one whole-answer string comparison. */
export interface SpellingGrade {
	/** Whether the picked LETTER matches the canonical spelling's letter: the letter-counting half of the answer. */
	letterCorrect: boolean;
	/** Whether the picked letter+accidental resolves to the SAME PITCH CLASS as the target, by chroma. Never a string comparison. */
	pitchCorrect: boolean;
	/** Both checks pass: the spelling is exactly right. */
	correct: boolean;
	/**
	 * What the user's own letter+accidental actually spells, measured from the
	 * question's root, as a full IntervalInfo. Lets the UI state the specific
	 * mistake (e.g. "you spelled a minor 3rd" when the question asked for an
	 * augmented 2nd on the same key) rather than only "wrong".
	 */
	givenInterval: IntervalInfo;
}

/**
 * Grades a spelling answer. `pitchCorrect` is chroma arithmetic (enharmonic-
 * agnostic, like `gradeIntervalTap`); `letterCorrect` is the one place this
 * drill legitimately compares letters, because the letter is exactly what is
 * under test here, not a grading shortcut. Total: an unparseable picked
 * spelling grades `pitchCorrect: false` rather than throwing.
 */
export function gradeSpelling(
	question: SpellingQuestion,
	pickedLetter: string,
	pickedAccidental: string
): SpellingGrade {
	const pickedSpelling = `${pickedLetter}${pickedAccidental}`;
	const letterCorrect = pickedLetter === question.expectedLetter;

	const targetChroma = chromaOf(question.expectedSpelling);
	const pickedChroma = chromaOf(pickedSpelling);
	const pitchCorrect =
		targetChroma !== undefined && pickedChroma !== undefined && targetChroma === pickedChroma;

	const givenInterval = intervalBetween(question.root, pickedSpelling);

	return { letterCorrect, pitchCorrect, correct: letterCorrect && pitchCorrect, givenInterval };
}
