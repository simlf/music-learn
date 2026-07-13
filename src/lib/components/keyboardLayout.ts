import { Note } from 'tonal';
import type { SpelledNote } from '$lib/theory/types';

/**
 * Pure, DOM-free keyboard layout logic shared by PianoKeyboard.svelte:
 * how many octaves fit a given width, the white/black key letter arrays for
 * that octave count, and the note-to-key assignment (including the
 * one-octave wrap-around case, D-02, and a pitch-class/chroma fallback for
 * exotic spellings tonal produces, e.g. F♭, C♭, E♯, B♯, double-flats -
 * 09-02 defect fix). No matching/grading logic lives here - matchChord.ts
 * stays the source of truth for chord correctness; this module is
 * display-layout only.
 */

/** Black key shape: which white key it sits after, and its two enharmonic spellings. */
export interface BlackKeyPattern {
	afterWhiteIndex: number;
	sharpLetter: string;
	flatLetter: string;
}

/** A key candidate a note could be assigned to, tagged by which key kind it targets. */
export interface KeyCandidate {
	position: number;
	kind: 'white' | 'black';
	keyIndex: number;
}

/** Per-octave white letter pattern (C D E F G A B), repeated per octave with a trailing C. */
const WHITE_LETTER_PATTERN = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/**
 * Per-octave black key pattern: standard C♯/D♭ ... A♯/B♭ offsets. Repeated
 * per octave with `afterWhiteIndex` shifted by 7 each time (7 white keys per
 * octave before the trailing C).
 */
const BLACK_KEY_PATTERN: BlackKeyPattern[] = [
	{ afterWhiteIndex: 0, sharpLetter: 'C♯', flatLetter: 'D♭' },
	{ afterWhiteIndex: 1, sharpLetter: 'D♯', flatLetter: 'E♭' },
	{ afterWhiteIndex: 3, sharpLetter: 'F♯', flatLetter: 'G♭' },
	{ afterWhiteIndex: 4, sharpLetter: 'G♯', flatLetter: 'A♭' },
	{ afterWhiteIndex: 5, sharpLetter: 'A♯', flatLetter: 'B♭' }
];

/**
 * Returns how many octaves fit the available width without dropping below
 * `minWhiteKeyPx` per white key: 2 when a full 15-white-key two-octave span
 * fits (`availableWidthPx >= 15 * minWhiteKeyPx`), otherwise 1. Never returns
 * 0 - one octave is the hard floor (D-04).
 */
export function octavesForWidth(availableWidthPx: number, minWhiteKeyPx = 44): 1 | 2 {
	return availableWidthPx >= 15 * minWhiteKeyPx ? 2 : 1;
}

/**
 * White key letters across `octaves` C-to-C spans (7 letters per octave plus
 * one trailing C). `whiteLettersForOctaves(2)` equals PianoKeyboard's
 * pre-refactor literal exactly.
 */
export function whiteLettersForOctaves(octaves: 1 | 2): string[] {
	const letters: string[] = [];
	for (let octave = 0; octave < octaves; octave += 1) {
		letters.push(...WHITE_LETTER_PATTERN);
	}
	letters.push('C');
	return letters;
}

/**
 * Black key entries across `octaves` C-to-C spans. `blackKeysForOctaves(2)`
 * equals PianoKeyboard's pre-refactor literal exactly.
 */
export function blackKeysForOctaves(octaves: 1 | 2): BlackKeyPattern[] {
	const blackKeys: BlackKeyPattern[] = [];
	for (let octave = 0; octave < octaves; octave += 1) {
		for (const { afterWhiteIndex, sharpLetter, flatLetter } of BLACK_KEY_PATTERN) {
			blackKeys.push({ afterWhiteIndex: afterWhiteIndex + octave * 7, sharpLetter, flatLetter });
		}
	}
	return blackKeys;
}

/**
 * Converts display-glyph accidentals (♯ ♭) to tonal's ASCII form (# b) so
 * `Note.chroma` can parse any spelling tonal produces, including doubled
 * accidentals (e.g. "A♭♭" -> "Abb").
 */
function toAsciiAccidentals(letter: string): string {
	return letter.replace(/♯/g, '#').replace(/♭/g, 'b');
}

/** Pitch class (0-11) for a display-glyph letter, or undefined if unparseable. */
function chromaFor(letter: string): number | undefined {
	return Note.chroma(toAsciiAccidentals(letter));
}

function candidatesForNote(
	note: SpelledNote,
	whiteLetters: string[],
	blackKeys: BlackKeyPattern[],
	minPosition: number
): KeyCandidate[] {
	const candidates: KeyCandidate[] = [];

	whiteLetters.forEach((letter, index) => {
		if (letter === note.letter && index >= minPosition) {
			candidates.push({ position: index, kind: 'white', keyIndex: index });
		}
	});

	blackKeys.forEach(({ afterWhiteIndex, sharpLetter, flatLetter }, blackIndex) => {
		const position = afterWhiteIndex + 1;
		if ((note.letter === sharpLetter || note.letter === flatLetter) && position >= minPosition) {
			candidates.push({ position, kind: 'black', keyIndex: blackIndex });
		}
	});

	if (candidates.length > 0) return candidates;

	// Exotic-spelling fallback (pitch-class/chroma match): letter-string
	// matching alone misses spellings like F♭, C♭, E♯, B♯, or double-flats
	// (e.g. A♭♭ in flat-root dim7 chords) - none of these share a letter
	// string with any key's natural or sharp/flat spelling, so they'd
	// otherwise be silently dropped from the highlight map (this has been
	// broken since Phase 1 for every chord using such an enharmonic). Every
	// chroma maps to exactly one key kind in this layout - the 7 natural
	// chromas to white keys, the 5 accidental chromas to black keys - so
	// resolving by chroma is unambiguous.
	const noteChroma = chromaFor(note.letter);
	if (noteChroma === undefined) return candidates;

	whiteLetters.forEach((letter, index) => {
		if (index >= minPosition && chromaFor(letter) === noteChroma) {
			candidates.push({ position: index, kind: 'white', keyIndex: index });
		}
	});

	blackKeys.forEach(({ afterWhiteIndex, sharpLetter }, blackIndex) => {
		const position = afterWhiteIndex + 1;
		if (position >= minPosition && chromaFor(sharpLetter) === noteChroma) {
			candidates.push({ position, kind: 'black', keyIndex: blackIndex });
		}
	});

	return candidates;
}

function lowestByPosition(candidates: KeyCandidate[]): KeyCandidate {
	return candidates.reduce((best, candidate) =>
		candidate.position < best.position ? candidate : best
	);
}

/**
 * Assigns each spelled note to exactly one key, walking the keyboard once
 * from the root's key position upward in ascending pitch order (root < third
 * < fifth < seventh in left-to-right order), exactly as PianoKeyboard's
 * pre-refactor in-component version did.
 *
 * Adds a wrap-around branch (D-02): when a note has zero candidates at or
 * after the ascending cursor (its span-relative position has run past the
 * visible top), it falls back to the lowest-position candidate for that
 * note's letter/pitch class anywhere in the span - still tagged with its
 * interval role via the returned map's key (the SpelledNote itself) - rather
 * than being dropped. The cursor is not advanced past a wrapped note's
 * position, since it no longer reflects true ascending order once wrapped.
 *
 * Pure over a bounded key set: never throws, including for an empty notes
 * array or an unrecognized (empty-notes) chord.
 */
export function assignNotesToKeys(
	notes: SpelledNote[],
	whiteLetters: string[],
	blackKeys: BlackKeyPattern[]
): Map<SpelledNote, KeyCandidate> {
	const assignment = new Map<SpelledNote, KeyCandidate>();
	let cursor = 0;

	for (const note of notes) {
		const candidates = candidatesForNote(note, whiteLetters, blackKeys, cursor);

		if (candidates.length > 0) {
			const chosen = lowestByPosition(candidates);
			assignment.set(note, chosen);
			cursor = chosen.position + 1;
			continue;
		}

		// Wrap-around: nothing left ahead of the cursor within the visible
		// span. Fall back to the lowest-position candidate for this note's
		// letter/pitch class anywhere in the span, preserving its role.
		const wrapCandidates = candidatesForNote(note, whiteLetters, blackKeys, 0);
		if (wrapCandidates.length === 0) continue;
		assignment.set(note, lowestByPosition(wrapCandidates));
	}

	return assignment;
}
