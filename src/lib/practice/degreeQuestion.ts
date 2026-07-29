import { chromaOf } from '$lib/theory/interval';
import { majorScaleNotes } from '$lib/theory/scale';
import type { SpelledNote } from '$lib/theory/types';

/**
 * Pure question generator and graders for the scale-DEGREE practice family.
 *
 * WHY THIS EXISTS. `practiceQueue.familyForCard` used to return null for every
 * `scale-degree` card, and `cardsToQueueItems` drops null-family cards, so all
 * 84 scale-degree facts (44% of the 192-fact catalog) were introduced into the
 * deck by `introduceNewCards` and then never asked on /practice at all. They
 * were gradable only inside RecallSession, several taps deep in Progress. This
 * module is the pure half of giving them a real home on the primary surface.
 *
 * TWO DIRECTIONS, ONE CARD. A scale degree is genuinely bidirectional:
 *
 *   - 'degree-to-note': "Degree 5 of E♭ major?"  -> answer by playing the key.
 *   - 'note-to-degree': "Which degree is G in E♭ major?" -> answer 1..7.
 *
 * Only the first direction existed anywhere in the app (RecallSession asks it
 * as a reveal-then-self-grade prompt). The second is the one that trains the
 * thing that actually makes a chart readable: 1-3-5 is the same shape in every
 * key, while C-E-G is only true in C.
 *
 * Both directions are served by ONE card per fact, with the direction drawn per
 * appearance. This deliberately mirrors the INTERVAL family, which has done
 * exactly this since it shipped (`generateIntervalQuestion` draws
 * identification vs construction over a single `interval-size` card), rather
 * than the chord families, which carry one card per Mode. The reasoning:
 *
 *   - A second direction as a second Mode would widen `deck.Mode` and give
 *     every one of the 84 facts a second card, taking scale material from 84
 *     cards to 168. Against a 12-question daily target that is a large shift in
 *     what a session is made of, for a deck whose chord half is already 384
 *     cards.
 *   - It also keeps the change migration-free by construction. Nothing about
 *     the stored card shape changes at all, so no existing FSRS review state can
 *     be reinterpreted, re-keyed, or reset. (Widening the enum needs no Dexie
 *     version bump either, but "no schema change whatsoever" is a strictly
 *     smaller risk than "a schema change that is believed to be safe".)
 *   - The cost is real and worth stating: FSRS sees one difficulty/stability
 *     pair for both directions, so a user strong one way and weak the other
 *     gets an averaged schedule. That is the same trade the interval family
 *     already makes. If per-direction scheduling ever becomes the thing worth
 *     paying for, the upgrade is a new Mode plus a `teachClusterModes` entry,
 *     and this module's `direction` becomes the router instead of the drawer.
 *
 * Pure module: no DOM, no Svelte, no audio, no Dexie. Every function is total.
 */

/** Which way round a degree question is asked. */
export type DegreeDirection = 'degree-to-note' | 'note-to-degree';

/** Both directions, in draw order (mirrors generateIntervalQuestion's INTERVAL_DIRECTIONS). */
export const DEGREE_DIRECTIONS: readonly DegreeDirection[] = [
	'degree-to-note',
	'note-to-degree'
] as const;

/** How many degrees a major scale has; every question's degree is 1..DEGREE_COUNT. */
export const DEGREE_COUNT = 7;

/** The major scale's own step pattern, in half steps, for the counting hint. */
export const MAJOR_STEP_PATTERN: readonly number[] = [2, 2, 1, 2, 2, 2, 1] as const;

export interface DegreeQuestion {
	kind: 'scale-degree';
	/** Which way round this appearance asks. */
	direction: DegreeDirection;
	/** Scale tonic in display glyphs, e.g. "E♭", exactly as the fact stores it. */
	tonic: string;
	/** The degree under test, 1..7. */
	degree: number;
	/** The seven spelled degrees of `tonic` major, degree 1 first. Empty for an unrecognized tonic. */
	notes: SpelledNote[];
	/** The degree's own spelled note: the ANSWER for degree-to-note, the PROMPT for note-to-degree. */
	note: SpelledNote | null;
	/** Pitch class (0-11) of `note`, the single value both graders compare against. */
	chroma: number | null;
}

export interface GenerateDegreeQuestionOptions {
	/** Scale tonic in display glyphs or ASCII, from the fact. */
	tonic: string;
	/** The degree under test, 1..7, from the fact. */
	degree: number;
	/** Injected randomness for the direction draw (tests pass a constant/seeded rng). */
	rng?: () => number;
}

/**
 * Builds one degree question for a (tonic, degree) fact.
 *
 * Draws exactly ONE random value, the direction index, so a test can pin the
 * direction with a constant rng and the draw script stays positionally stable.
 *
 * DEGREE 1 IS ALWAYS ASKED 'degree-to-note'. "Which degree is E♭ in E♭ major?"
 * is answerable without knowing anything about the scale (the prompt note IS
 * the key name), so asking it teaches nothing and hands out a free point.
 * Mirrors generateIntervalQuestion's own precedent for P8, which is always
 * issued as identification because construction cannot grade it honestly. The
 * direction draw is still consumed for those facts so the script stays aligned.
 *
 * Total: an unrecognized tonic or an out-of-range degree yields a question with
 * `note`/`chroma` null, which both graders reject rather than throwing. Not
 * reachable from the catalog (facts.test.ts pins all 84 scale-degree facts as
 * resolving to a defined note within 1..7), but kept total rather than partial,
 * matching this codebase's convention throughout theory/ and practice/.
 */
export function generateDegreeQuestion(options: GenerateDegreeQuestionOptions): DegreeQuestion {
	const { tonic, degree } = options;
	const rng = options.rng ?? Math.random;

	const drawnDirection = DEGREE_DIRECTIONS[Math.floor(rng() * DEGREE_DIRECTIONS.length)];

	const notes = majorScaleNotes(tonic);
	const inRange = Number.isInteger(degree) && degree >= 1 && degree <= DEGREE_COUNT;
	const note = inRange ? (notes[degree - 1] ?? null) : null;
	const chroma = note === null ? null : (chromaOf(note.letter) ?? null);

	const direction: DegreeDirection = degree === 1 ? 'degree-to-note' : drawnDirection;

	return { kind: 'scale-degree', direction, tonic, degree, notes, note, chroma };
}

/** True when the question resolved to a real, gradable target. False only for a malformed fact. */
export function isDegreeQuestionAnswerable(question: DegreeQuestion): boolean {
	return question.chroma !== null && question.notes.length === DEGREE_COUNT;
}

/**
 * Grades a 'degree-to-note' keyboard tap by PITCH CLASS, never by letter
 * string (the app-wide grade-by-chroma invariant, same rule as
 * gradeIntervalTap and gradeScaleTap). So a tap on the G♭/F♯ key answers a
 * G♭ degree correctly whichever spelling the keyboard reports, and any
 * same-pitch-class duplicate key elsewhere on the board is accepted.
 *
 * Total: an unparseable tap, or a question with no resolved target, grades
 * false rather than throwing.
 */
export function gradeDegreeNoteTap(question: DegreeQuestion, tappedLetter: string): boolean {
	if (question.chroma === null) return false;
	const tapped = chromaOf(tappedLetter);
	if (tapped === undefined) return false;
	return tapped === question.chroma;
}

/**
 * Grades a 'note-to-degree' pick.
 *
 * Compares the PITCH CLASS the picked degree spells against the target's pitch
 * class, rather than comparing the two degree NUMBERS. For a major scale the
 * two are equivalent (no two degrees share a pitch class), so this costs
 * nothing today; it is written this way because the standing invariant is
 * grade-by-chroma, and a number compare would silently become the wrong rule
 * the moment a mode/scale with an enharmonic collision is ever added.
 *
 * Total: a pick outside 1..7, an unparseable spelling, or a question with no
 * resolved target grades false.
 */
export function gradeDegreePick(question: DegreeQuestion, pickedDegree: number): boolean {
	if (question.chroma === null) return false;
	const picked = question.notes[pickedDegree - 1];
	if (picked === undefined) return false;
	const pickedChroma = chromaOf(picked.letter);
	if (pickedChroma === undefined) return false;
	return pickedChroma === question.chroma;
}

/**
 * Which degree of the question's scale a tapped pitch class actually is, or
 * null when that pitch class is not in the scale at all. Drives the
 * wrong-answer readout ("you played A, that is degree 6" vs "you played A♭,
 * that note is not in C major"), which is the whole content of a degree
 * confusion. Chroma-based for the same reason the graders are.
 */
export function degreeForTappedLetter(question: DegreeQuestion, tappedLetter: string): number | null {
	const tapped = chromaOf(tappedLetter);
	if (tapped === undefined) return null;
	for (let index = 0; index < question.notes.length; index += 1) {
		if (chromaOf(question.notes[index].letter) === tapped) return index + 1;
	}
	return null;
}

/**
 * The spelling this scale gives a tapped pitch class, or the tapped letter
 * itself when the pitch class is outside the scale. Keeps the wrong-answer
 * readout in the key's own vocabulary: a D♯-key tap in E♭ major reads "E♭",
 * not "D♯", the same enharmonic courtesy describeTappedInterval extends to the
 * interval drill.
 */
export function spellTappedLetter(question: DegreeQuestion, tappedLetter: string): string {
	const degree = degreeForTappedLetter(question, tappedLetter);
	if (degree === null) return tappedLetter;
	return question.notes[degree - 1].letter;
}
