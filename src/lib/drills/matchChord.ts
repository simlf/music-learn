import { chromaOf } from '$lib/theory/interval';
import type { ChordResult } from '$lib/theory/types';

/** Result of grading a played note set against a target chord. */
export interface MatchResult {
	/**
	 * True only when the played chroma set exactly equals a NON-EMPTY target
	 * chroma set. An ungradeable target (no notes, or a note whose letter has
	 * no pitch class) is never correct, however little was played.
	 */
	correct: boolean;
	/** Target chroma (0-11) that were not present in the played set. */
	missing: number[];
	/** Played chroma (0-11) that are not part of the target chord. */
	extra: number[];
}

/**
 * Source-agnostic pitch-class-set matcher (D-01/D-02/D-03). Grades a played
 * note set against a target chord by exact chroma (0-11) set equality:
 * octave, inversion, note order, and duplicate notes are all ignored, and
 * enharmonic spellings compare equal because comparison happens at the
 * chroma level, not the spelled-letter level (D-01, D-02). This is the
 * identical matcher the on-screen keyboard (this phase) and Phase 4 MIDI
 * input both feed, so the click UI and MIDI adapter share one grading rule
 * (D-03, INPUT-03 foundation).
 *
 * Pure set arithmetic over bounded numbers (0-11): total, never throws for
 * any input including an empty played set or an unrecognized target's empty
 * notes array.
 *
 * A target note whose letter does not resolve to a pitch class makes the whole
 * target UNGRADEABLE (`correct: false`), never a smaller set that a partial
 * play could satisfy: chroma resolution goes through the shared `chromaOf`,
 * which turns `Note.chroma`'s `NaN` into `undefined` so the check is explicit
 * instead of relying on `NaN`'s never-equal accident.
 */
export function matchChord(played: Set<number> | number[], target: ChordResult): MatchResult {
	const playedChroma = new Set(played);

	const targetChroma = new Set<number>();
	let targetUnspellable = false;
	for (const note of target.notes) {
		const chroma = chromaOf(note.letter);
		if (chroma === undefined) {
			targetUnspellable = true;
			continue;
		}
		targetChroma.add(chroma);
	}

	const missing = [...targetChroma].filter((chroma) => !playedChroma.has(chroma));
	const extra = [...playedChroma].filter((chroma) => !targetChroma.has(chroma));

	// An EMPTY target chroma set is never satisfiable. Without this, an empty
	// played set trivially satisfied it (nothing missing, nothing extra) and
	// graded CORRECT - a false accept, the worst bug class in this app since
	// the user cannot tell they were taught nothing. Independent of the
	// spellChord guard that stopped producing empty-note "recognized" chords:
	// this is the grader refusing to score an ungradeable target at all.
	const gradeable = targetChroma.size > 0 && !targetUnspellable;

	return {
		correct: gradeable && missing.length === 0 && extra.length === 0,
		missing,
		extra
	};
}
