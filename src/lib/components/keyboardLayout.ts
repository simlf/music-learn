import { chromaOf } from '$lib/theory/interval';
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
	/**
	 * Physical left-to-right slot on the rendered board, in the DOUBLED space
	 * built by `whiteSlot`/`blackSlot`: strictly increasing with pitch, and
	 * shared by white and black keys without ever colliding. Ordering only -
	 * `kind` + `keyIndex` are the key's identity.
	 */
	position: number;
	kind: 'white' | 'black';
	keyIndex: number;
}

/**
 * White and black key slots in ONE shared, correctly-ordered integer space:
 * white key i takes slot i*2, and the black key after white i takes slot
 * i*2+1, which sits between white i and white i+1 exactly as the physical key
 * does. (Same scheme as `buildOrderedKeys` in
 * $lib/practice/scaleKeyboardDrill.)
 *
 * Doubling is what makes the space valid. `position` used to be the raw white
 * `index` for white keys and `afterWhiteIndex + 1` for black keys, which are
 * NOT disjoint: black C♯ (physically between C and D) and white D both scored
 * 1. Distinct keys, equal position - so `assignNotesToKeys`'s ascending cursor
 * (`cursor = chosen.position + 1`) walked a broken order whenever an accidental
 * was involved, and its wrap-around branch then fired spuriously. Verified on
 * a 2-octave board across all 12 major scales plus the octave-up tonic: six
 * roots (D, E, F♯, G, A, B) collapsed the octave-up tonic onto the root's own
 * key AND scrambled the scale across the two octaves (in D major, G/A/B landed
 * at 11/12/13 while D/E/F♯ sat at 1/2/4, then C♯ and D wrapped back to 1).
 */
function whiteSlot(whiteIndex: number): number {
	return whiteIndex * 2;
}

function blackSlot(afterWhiteIndex: number): number {
	return afterWhiteIndex * 2 + 1;
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
 * The fingertip floor for a white key, in CSS px: the conventional 44px (WCAG
 * 2.1 SC 2.5.5, Apple HIG). Exported as the single source of truth for every
 * surface that renders a key board, so the number lives in exactly one place
 * (it was previously the default of `octavesForWidth`'s `minWhiteKeyPx` here
 * AND a private literal in ScaleKeyboardDrill).
 */
export const MIN_WHITE_KEY_PX = 44;

/** White keys in an `octaves`-wide C-to-C span: 7 per octave plus the trailing C. */
export function whiteKeyCountForOctaves(octaves: 1 | 2): number {
	return octaves * 7 + 1;
}

/**
 * The narrowest the rendered board may be while every white key still meets the
 * fingertip floor: 8 keys (352px) at one octave, 15 (660px) at two. A board
 * given less width than this MUST scroll horizontally rather than shrink its
 * keys - see `fitsWithoutScrolling`.
 */
export function minBoardWidthPx(octaves: 1 | 2, minWhiteKeyPx = MIN_WHITE_KEY_PX): number {
	return whiteKeyCountForOctaves(octaves) * minWhiteKeyPx;
}

/**
 * Whether an `octaves`-wide span can be laid out at the fingertip floor inside
 * `availableWidthPx` without scrolling.
 *
 * This is the check the one-octave case never had. `octavesForWidth` tested only
 * the TWO-octave span and returned 1 as an unconditional fallback, so nothing
 * verified that one octave's 8 white keys still need 8 * 44 = 352px. Measured in
 * real Chromium at a 375px viewport (iPhone SE / 8 / 12 mini): ~346.6px of
 * content width, giving 43.80px keys on a 43.32px pitch - under the very floor
 * this module declares. The irony is that the two-octave branch was fine
 * precisely because it WAS guarded; only the unguarded portrait fallback broke.
 */
export function fitsWithoutScrolling(
	octaves: 1 | 2,
	availableWidthPx: number,
	minWhiteKeyPx = MIN_WHITE_KEY_PX
): boolean {
	return availableWidthPx >= minBoardWidthPx(octaves, minWhiteKeyPx);
}

/**
 * Returns how many octaves to SPAN for the available width without dropping
 * below `minWhiteKeyPx` per white key: 2 when a full 15-white-key two-octave
 * span fits, otherwise 1. Never returns 0 - one octave is the hard floor (D-04).
 *
 * One octave is also the floor of the span CHOICE, so when even 8 keys cannot
 * fit (`fitsWithoutScrolling(1, width)` false, i.e. under 352px), the deficit is
 * absorbed by the board's own `minBoardWidthPx` plus horizontal scrolling - the
 * pattern ScaleKeyboardDrill already used, now shared by PianoKeyboard. Two
 * alternatives were rejected: shrinking the keys below the floor is the bug
 * itself, and rendering fewer than 8 white keys would break the C-to-C span that
 * `whiteLettersForOctaves`, `assignNotesToKeys`, the octave-up tonic, and every
 * chord wider than a 6th all depend on. Scrolling is also the only answer that
 * still holds at 320px, where the deficit is ~60px rather than ~6px.
 */
export function octavesForWidth(
	availableWidthPx: number,
	minWhiteKeyPx = MIN_WHITE_KEY_PX
): 1 | 2 {
	return fitsWithoutScrolling(2, availableWidthPx, minWhiteKeyPx) ? 2 : 1;
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

function candidatesForNote(
	note: SpelledNote,
	whiteLetters: string[],
	blackKeys: BlackKeyPattern[],
	minPosition: number
): KeyCandidate[] {
	const candidates: KeyCandidate[] = [];

	whiteLetters.forEach((letter, index) => {
		const position = whiteSlot(index);
		if (letter === note.letter && position >= minPosition) {
			candidates.push({ position, kind: 'white', keyIndex: index });
		}
	});

	blackKeys.forEach(({ afterWhiteIndex, sharpLetter, flatLetter }, blackIndex) => {
		const position = blackSlot(afterWhiteIndex);
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
	const noteChroma = chromaOf(note.letter);
	if (noteChroma === undefined) return candidates;

	whiteLetters.forEach((letter, index) => {
		const position = whiteSlot(index);
		if (position >= minPosition && chromaOf(letter) === noteChroma) {
			candidates.push({ position, kind: 'white', keyIndex: index });
		}
	});

	blackKeys.forEach(({ afterWhiteIndex, sharpLetter }, blackIndex) => {
		const position = blackSlot(afterWhiteIndex);
		if (position >= minPosition && chromaOf(sharpLetter) === noteChroma) {
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
