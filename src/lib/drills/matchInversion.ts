import { matchChord } from './matchChord';
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
