import { matchChord } from './matchChord';
import { chromaOf } from '$lib/theory/interval';
import type { ChordResult } from '$lib/theory/types';

/** Result of grading a played note set + bass against a target chord + required bass. */
export interface InversionMatchResult {
	/** True only when both the chord (chroma set) and the required bass are correct. */
	correct: boolean;
	/** matchChord(played, target).correct, reused verbatim. */
	chordCorrect: boolean;
	/** True when the played bass chroma equals the target bass chroma. */
	bassCorrect: boolean;
	/** Target chroma (0-11) that were not present in the played set, from matchChord unchanged. */
	missing: number[];
	/** Played chroma (0-11) that are not part of the target chord, from matchChord unchanged. */
	extra: number[];
}

/**
 * Grades a played note set + bass against a target chord + required bass
 * (INV-01). Composes `matchChord` for the chroma-set comparison (does not
 * re-derive chroma-set arithmetic) and adds a required-bass chroma check on
 * top, both compared at the chroma level, never as spelled letters
 * (enharmonic-blind, D-01/D-02).
 *
 * Gives the copywriting contract's two distinct retry lines a clean boolean
 * to branch on: `chordCorrect && !bassCorrect` -> "right notes, wrong bass";
 * `!chordCorrect` -> the generic wrong-notes line.
 *
 * Total: an undefined `playedBassChroma` (nothing pressed / bass
 * undetermined) yields `bassCorrect: false`, never throws.
 *
 * Inherits matchChord's ungradeable-target rule: a target with no notes can
 * never yield `chordCorrect` (and therefore never `correct`), so an empty play
 * against an empty target is graded wrong instead of trivially right.
 */
export function matchInversion(
	played: Set<number> | number[],
	playedBassChroma: number | undefined,
	target: ChordResult,
	bassChroma: number
): InversionMatchResult {
	const chordResult = matchChord(played, target);
	const bassCorrect = playedBassChroma === bassChroma;

	return {
		correct: chordResult.correct && bassCorrect,
		chordCorrect: chordResult.correct,
		bassCorrect,
		missing: chordResult.missing,
		extra: chordResult.extra
	};
}

/**
 * The chroma of whichever played letter sits at the lowest absolute pitch
 * (octave*12 + chroma), reading each letter's octave from `octaveByLetter`
 * (the keyboard's last press of that letter) and defaulting to
 * `fallbackOctave` for a letter toggled without a registered press.
 * Undefined when nothing is played, or when any played letter does not
 * resolve to a pitch class (the bass is then genuinely undetermined, so it
 * must not grade correct - `chromaOf` makes that check fire instead of
 * letting a NaN score silently win or lose the comparison).
 */
export function lowestPlayedChroma(
	letters: Iterable<string>,
	octaveByLetter: ReadonlyMap<string, number>,
	fallbackOctave: number
): number | undefined {
	let lowestScore: number | undefined;
	let lowestChroma: number | undefined;
	for (const letter of letters) {
		const octave = octaveByLetter.get(letter) ?? fallbackOctave;
		const chroma = chromaOf(letter);
		if (chroma === undefined) return undefined;
		const score = octave * 12 + chroma;
		if (lowestScore === undefined || score < lowestScore) {
			lowestScore = score;
			lowestChroma = chroma;
		}
	}
	return lowestChroma;
}
