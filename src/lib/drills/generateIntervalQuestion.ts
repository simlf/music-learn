import { Note } from 'tonal';
import {
	DRILL_INTERVALS,
	intervalFromRoot,
	intervalFromShort,
	toAsciiAccidentals,
	transposeFrom,
	type IntervalInfo
} from '$lib/theory/interval';
import { letterToSolfege } from '$lib/theory/solfege';
import { ROOTS } from '$lib/theory/randomChord';
import type { SpelledNote } from '$lib/theory/types';

/**
 * Interval recognition drill generator (R4 track). Pure and Math.random
 * driven like generateQuestion.ts. Two v1 directions:
 *
 * - identification: two notes highlighted, "Name this interval", 4 choices.
 * - construction: root highlighted, "Tap a m3 above C", first tap graded.
 */
export interface IntervalQuestion {
	kind: 'interval';
	/** Which direction of interval fluency this question drills. */
	direction: 'identification' | 'construction';
	/** Root letter in display glyphs, e.g. "F♯". */
	root: string;
	/** The interval under test, fully named. */
	interval: IntervalInfo;
	/** Present only for identification questions: 4 shuffled shorthand names including the answer. */
	choices?: string[];
}

const INTERVAL_DIRECTIONS = ['identification', 'construction'] as const;

/** Fisher-Yates shuffle using Math.random(), matching generateQuestion's style. */
function shuffle<T>(items: T[]): T[] {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

/**
 * Draws 3 distractor shorthand names from DRILL_INTERVALS: near-misses first
 * (same degree, other quality; then adjacent degree), mirroring
 * pickDistractors' policy, and never a semitone-identical (enharmonic)
 * equivalent of the answer. Total over the fixed 12-entry pool.
 */
export function pickIntervalDistractors(correctShort: string, count = 3): string[] {
	const correct = intervalFromShort(correctShort);

	const sameDegree: string[] = [];
	const adjacentDegree: string[] = [];
	const others: string[] = [];
	for (const short of DRILL_INTERVALS) {
		if (short === correctShort) continue;
		const candidate = intervalFromShort(short);
		if (candidate.semitones === correct.semitones) continue;
		if (candidate.degree === correct.degree) sameDegree.push(short);
		else if (Math.abs(candidate.degree - correct.degree) === 1) adjacentDegree.push(short);
		else others.push(short);
	}

	// Same degree, other quality is the strongest confusion (m3 vs M3) and is
	// always offered; adjacent degrees fill the rest, then anything else.
	return [...shuffle(sameDegree), ...shuffle(adjacentDegree), ...shuffle(others)].slice(0, count);
}

/**
 * Generates one interval question. Draws, in order: (1) root index over
 * ROOTS, (2) interval index over DRILL_INTERVALS, (3) direction index, then
 * (4+) distractor shuffle draws for identification questions.
 */
export function generateIntervalQuestion(): IntervalQuestion {
	const rootAscii = ROOTS[Math.floor(Math.random() * ROOTS.length)];
	const short = DRILL_INTERVALS[Math.floor(Math.random() * DRILL_INTERVALS.length)];
	const direction = INTERVAL_DIRECTIONS[Math.floor(Math.random() * INTERVAL_DIRECTIONS.length)];

	// transposeFrom(root, 'R') round-trips the root through the interval
	// module's glyph restore, so "F#" comes out as the display form "F♯".
	const root = transposeFrom(rootAscii, 'R');
	const interval = intervalFromShort(short);

	if (direction === 'construction') {
		return { kind: 'interval', direction, root, interval };
	}

	const choices = shuffle([short, ...pickIntervalDistractors(short)]);
	return { kind: 'interval', direction, root, interval, choices };
}

/**
 * The question's two notes as SpelledNotes for the keyboard: the root
 * (role 'root') and the spelled target (its degree-class role). Construction
 * questions show only the first entry until graded.
 */
export function intervalQuestionNotes(question: IntervalQuestion): SpelledNote[] {
	const target = transposeFrom(question.root, question.interval.short);
	return [
		{ letter: question.root, solfege: letterToSolfege(question.root), role: 'root' },
		{ letter: target, solfege: letterToSolfege(target), role: question.interval.role }
	];
}

/**
 * Grades a construction tap by chroma arithmetic, octave-agnostic like
 * matchChord: (tapped - root + 12) % 12 === semitones % 12. Enharmonic
 * answers are accepted by construction. Total: unparseable letters grade
 * false rather than throwing.
 */
export function gradeIntervalTap(root: string, tappedLetter: string, semitones: number): boolean {
	const rootChroma = Note.chroma(toAsciiAccidentals(root));
	const tappedChroma = Note.chroma(toAsciiAccidentals(tappedLetter));
	if (rootChroma === undefined || tappedChroma === undefined) return false;
	return (tappedChroma - rootChroma + 12) % 12 === semitones % 12;
}

/** The keyboard reports black keys by their sharp spelling; this recovers the flat partner. */
const SHARP_TO_FLAT: Record<string, string> = {
	'C♯': 'D♭',
	'D♯': 'E♭',
	'F♯': 'G♭',
	'G♯': 'A♭',
	'A♯': 'B♭'
};

/** What a wrong construction tap actually was, for the feedback line. */
export interface TappedIntervalReadout {
	/** The tapped key's letter, spelled with the simpler enharmonic from the root. */
	letter: string;
	/** The tapped key's interval from the root. */
	info: IntervalInfo;
}

/**
 * Names the tapped key relative to the question root: black keys (reported
 * by sharp letter) pick whichever enharmonic reads simplest from the root,
 * so a D♯-key tap over C reads "m3" as E♭, not A2.
 */
export function describeTappedInterval(root: string, tappedLetter: string): TappedIntervalReadout {
	const flatLetter = SHARP_TO_FLAT[tappedLetter];
	const info = flatLetter
		? intervalFromRoot(root, { sharpLetter: tappedLetter, flatLetter })
		: intervalFromRoot(root, tappedLetter);
	const letter = info.short === '' ? tappedLetter : transposeFrom(root, info.short) || tappedLetter;
	return { letter, info };
}
