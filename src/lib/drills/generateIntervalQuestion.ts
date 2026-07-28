import {
	chromaOf,
	DRILL_INTERVALS,
	intervalFromShort,
	simplestIntervalFromRoot,
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

export interface GenerateIntervalQuestionOptions {
	/**
	 * Session-sourced interval item (a missed interval's delayed retry or an
	 * end-card redrill seed): forces the interval, skipping its random draw.
	 * The root and direction still draw normally.
	 */
	short?: string;
}

/**
 * Generates one interval question. Draws, in order: (1) root index over
 * ROOTS, (2) interval index over DRILL_INTERVALS (skipped when `short` is
 * forced), (3) direction index, then (4+) distractor shuffle draws for
 * identification questions.
 *
 * An octave-spanning interval (P8) is always issued as IDENTIFICATION, never
 * construction, whatever the direction draw says. The construction tap seam
 * reports a pitch class only (`PianoKeyboard`'s `onToggle` passes a letter, and
 * both C keys on a two-octave board report "C"), so an octave answer is
 * indistinguishable from re-tapping the highlighted root - the question cannot
 * be graded honestly and used to accept the unison. Identification drills the
 * same fact with no such ambiguity. The direction draw is still consumed so the
 * random-draw script stays positionally identical for every other interval.
 */
export function generateIntervalQuestion(
	options: GenerateIntervalQuestionOptions = {}
): IntervalQuestion {
	const rootAscii = ROOTS[Math.floor(Math.random() * ROOTS.length)];
	const short =
		options.short ?? DRILL_INTERVALS[Math.floor(Math.random() * DRILL_INTERVALS.length)];
	const drawnDirection =
		INTERVAL_DIRECTIONS[Math.floor(Math.random() * INTERVAL_DIRECTIONS.length)];

	// transposeFrom(root, 'R') round-trips the root through the interval
	// module's glyph restore, so "F#" comes out as the display form "F♯".
	const root = transposeFrom(rootAscii, 'R');
	const interval = intervalFromShort(short);
	const direction = interval.semitones >= 12 ? 'identification' : drawnDirection;

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

/** Where the root sounds and where the tap landed, for grading an octave-spanning interval. */
export interface IntervalTapRegister {
	/** Octave the question root occupies. */
	root: number;
	/** Octave of the key the user tapped. */
	tapped: number;
}

/**
 * Grades a construction tap.
 *
 * SIMPLE intervals (under 12 semitones) grade by chroma arithmetic,
 * octave-agnostic like matchChord: `(tapped - root + 12) % 12 === semitones`.
 * Enharmonic answers are accepted, and any octave duplicate of the right pitch
 * class is accepted (REG-01) - `register` is ignored for these.
 *
 * OCTAVE-SPANNING intervals (12 semitones or more) cannot be graded that way:
 * `12 % 12 === 0`, so the modular comparison accepted the root's OWN pitch
 * class, and tapping the very key that is already highlighted as the root
 * answered "tap a P8 above C" correctly. These require absolute pitch, so they
 * are graded on letter+octave distance and need `register`. Without it the tap
 * is unverifiable and grades FALSE rather than accepting a unison: a caller
 * that cannot say which octave was tapped cannot prove an octave was played.
 * (`generateIntervalQuestion` therefore never issues an octave-spanning
 * CONSTRUCTION question - see its own note.)
 *
 * Total: unparseable letters grade false rather than throwing.
 */
export function gradeIntervalTap(
	root: string,
	tappedLetter: string,
	semitones: number,
	register?: IntervalTapRegister
): boolean {
	const rootChroma = chromaOf(root);
	const tappedChroma = chromaOf(tappedLetter);
	if (rootChroma === undefined || tappedChroma === undefined) return false;

	if (semitones >= 12) {
		if (register === undefined) return false;
		const rootPitch = register.root * 12 + rootChroma;
		const tappedPitch = register.tapped * 12 + tappedChroma;
		return tappedPitch - rootPitch === semitones;
	}

	return (tappedChroma - rootChroma + 12) % 12 === semitones % 12;
}

/** What a wrong construction tap actually was, for the feedback line. */
export interface TappedIntervalReadout {
	/** The tapped key's letter, spelled with the simpler enharmonic from the root. */
	letter: string;
	/** The tapped key's interval from the root. */
	info: IntervalInfo;
}

/**
 * Names the tapped key relative to the question root, reading the tapped PITCH
 * (any enharmonic respelling) rather than the one spelling the keyboard
 * happened to report, so the readout always names the simplest interval from
 * the root: a D♯-key tap over C reads "m3" as E♭, not A2, and a plain D-key tap
 * over D♭ reads "m2" as E♭♭, not "A1 / fondamentale augmentée".
 *
 * That last part is why this cannot special-case black keys only, as it used to
 * via a 5-entry sharp-to-flat table: white-key taps then skipped the
 * enharmonic-preference scoring entirely and printed qualities that are not in
 * DRILL_INTERVALS at all (A1, A2, A5, A6, d8), telling the user an augmented
 * unison exists in a drill whose whole vocabulary is m2..P8.
 */
export function describeTappedInterval(root: string, tappedLetter: string): TappedIntervalReadout {
	const info = simplestIntervalFromRoot(root, tappedLetter);
	const letter = info.short === '' ? tappedLetter : transposeFrom(root, info.short) || tappedLetter;
	return { letter, info };
}
