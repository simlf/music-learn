import { Note } from 'tonal';
import { toAsciiAccidentals } from '$lib/theory/interval';
import type { ChordResult } from '$lib/theory/types';

/** Result of grading a played note set against a target chord. */
export interface MatchResult {
	/** True only when the played chroma set exactly equals the target chroma set. */
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
 */
export function matchChord(played: Set<number> | number[], target: ChordResult): MatchResult {
	const playedChroma = new Set(played);
	const targetChroma = new Set(target.notes.map((note) => Note.chroma(toAsciiAccidentals(note.letter))));

	const missing = [...targetChroma].filter((chroma) => !playedChroma.has(chroma));
	const extra = [...playedChroma].filter((chroma) => !targetChroma.has(chroma));

	return {
		correct: missing.length === 0 && extra.length === 0,
		missing,
		extra
	};
}
