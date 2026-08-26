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

/**
 * The floor a ONE-octave board holds instead of `MIN_WHITE_KEY_PX`
 * (260730-q3f). Derived, not picked: PianoKeyboard renders a black key at 60%
 * of a white key's width, and WCAG 2.1 SC 2.5.5's absolute minimum target size
 * is 24px, so a white key may shrink to 24 / 0.6 = 40px before the black keys
 * become illegal.
 *
 * Why a one-octave board is allowed the lower floor at all: it no longer wraps
 * to two rows (`shouldStackRows` returns false for it - the split would leave a
 * lone C on row 2), so the only ways to honour a 44px floor inside a narrower
 * container are to scroll the board sideways (hiding the top C) or to let it
 * inflate an ancestor grid track and push the whole card off-screen. Both were
 * live, reported bugs. Fitting the container instead keeps every key visible on
 * every phone class this app targets: 40.5px keys at a 360px viewport, 44.25px
 * at 390px.
 */
export const MIN_ONE_OCTAVE_WHITE_KEY_PX = 40;

/** White keys in an `octaves`-wide C-to-C span: 7 per octave plus the trailing C. */
export function whiteKeyCountForOctaves(octaves: 1 | 2): number {
	return octaves * 7 + 1;
}

/** Octave of the board's leftmost C (matches the audio voicing's octave 4). */
export const BASE_OCTAVE = 4;

/**
 * The octave a white key belongs to, by its board index: a new octave starts
 * every 7 white keys, so the trailing C of an `octaves`-wide span (index
 * `7 * octaves`) already belongs to the NEXT octave. The one definition of
 * this arithmetic; PianoKeyboard renders keys with it and
 * `renderableOctaves` derives the board's octave range from it, so the two
 * cannot drift.
 */
export function octaveForWhiteIndex(index: number): number {
	return BASE_OCTAVE + Math.floor(index / 7);
}

/** Every octave an `octaves`-wide board puts on screen, lowest first (the trailing C's own octave included). */
export function octavesForBoard(octaves: 1 | 2): number[] {
	const highest = octaveForWhiteIndex(whiteKeyCountForOctaves(octaves) - 1);
	const range: number[] = [];
	for (let octave = BASE_OCTAVE; octave <= highest; octave += 1) range.push(octave);
	return range;
}

/** The octave spans the board chooses between for its width (see `octavesForWidth`). */
export const BOARD_OCTAVE_SPANS: readonly (1 | 2)[] = [1, 2];

/**
 * Every octave the board can EVER render, across both spans it chooses
 * between for its width. A caller decorating keys (ghost markers, bass hints)
 * does not know which span the board picked - that is measured inside
 * PianoKeyboard - so it addresses the union: an entry for an octave that is
 * not on screen matches no key and simply draws nothing.
 */
export function renderableOctaves(): number[] {
	const octaves = new Set<number>();
	for (const span of BOARD_OCTAVE_SPANS) {
		for (const octave of octavesForBoard(span)) octaves.add(octave);
	}
	return [...octaves].sort((a, b) => a - b);
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

/**
 * How many white keys belong in the first row when a board wraps to two rows:
 * 7, for both one- and two-octave spans (C through B, before the trailing/
 * next C). White-index 7 is the ONLY seam in `BLACK_KEY_PATTERN` with no
 * black key on either side (there is no `afterWhiteIndex: 6` entry, i.e. no
 * black key between B and C) - so splitting exactly here never orphans a
 * black key from its adjacent white key, no matter which octave count is
 * being split.
 */
export function firstRowWhiteCount(_octaves: 1 | 2): 7 {
	return 7;
}

/**
 * How many white keys the SECOND row holds: the remainder after
 * `firstRowWhiteCount`, i.e. 1 for a one-octave span (just the trailing C) or
 * 8 for a two-octave span (the second octave plus its own trailing C). NOT
 * necessarily >= row 1's count - the one-octave span's row 2 (1 key) is
 * narrower than its row 1 (7 keys), which is exactly what an earlier revision
 * of `shouldStackRows` got wrong (see that function's own comment).
 */
function secondRowWhiteCount(octaves: 1 | 2): number {
	return whiteKeyCountForOctaves(octaves) - firstRowWhiteCount(octaves);
}

/**
 * The narrowest a container can be while BOTH stacked rows independently
 * clear the fingertip floor: the wider row's own white-key count times
 * `minWhiteKeyPx` - i.e. `max(firstRowWhiteCount, secondRowWhiteCount) *
 * minWhiteKeyPx`. For one octave that is row 1 (7 keys, 308px; row 2 is only
 * 1 key/44px). For two octaves that is row 2 (8 keys, 352px; row 1 is 7
 * keys/308px).
 */
function stackedRowFloorPx(octaves: 1 | 2, minWhiteKeyPx = MIN_WHITE_KEY_PX): number {
	return Math.max(firstRowWhiteCount(octaves), secondRowWhiteCount(octaves)) * minWhiteKeyPx;
}

/**
 * Whether an `octaves`-wide span, given `availableWidthPx`, must wrap into two
 * stacked rows instead of rendering one row.
 *
 * NOT simply `!fitsWithoutScrolling(...)` (an earlier revision of this
 * function was, and shipped a real defect - #260729-ert follow-up, caught by
 * a live-browser check, not by unit tests): for a ONE-octave span,
 * `fitsWithoutScrolling(1, ...)` fails below 352px, but row 1 only has 7
 * white keys and clears the fingertip floor at 308px (7 * 44) - so a
 * container between 308px and 352px would have "stacked" into two rows where
 * row 1's own keys were STILL under the floor, achieving nothing (measured
 * live in Chromium at a 304px container: row 1's keys rendered at 43.42px,
 * still short). The same latent gap exists for the two-octave span's row 2
 * (352px floor, the wider row there) at any width between itself and the
 * original 660px trigger.
 *
 * The correct rule: only stack when doing so actually clears the floor for
 * BOTH rows, i.e. the available width must reach `stackedRowFloorPx` (the
 * WIDER row's own minimum width - which row that is differs by octave count,
 * see that function). Below that, stacking cannot help and the pre-existing
 * single-row + horizontal-scroll fallback is the honest answer for that
 * (sub-308px on any real device this app targets) width - matching
 * PianoKeyboard's own "kept as a last resort" comment on its scroll wrapper.
 *
 * A ONE-octave span never stacks at all (user decision, 260730-q3f, overriding
 * the earlier "always wrap rather than scroll" decision for this case only):
 * splitting 8 white keys at the only black-key-free seam (white index 7, see
 * `firstRowWhiteCount`) puts SEVEN keys on row 1 and a single lone C on row 2,
 * which reads as a broken second keyboard rather than a wrapped one. The
 * one-octave span instead fits its container (PianoKeyboard omits the board's
 * px floor for it), so all 8 keys stay visible in one row at ~38-44px each.
 * Two octaves still stack: 15 keys cannot fit a phone at any usable key size,
 * and its split (7 + 8) yields two genuine mini-keyboards.
 */
export function shouldStackRows(
	octaves: 1 | 2,
	availableWidthPx: number,
	minWhiteKeyPx = MIN_WHITE_KEY_PX
): boolean {
	if (octaves === 1) return false;
	if (fitsWithoutScrolling(octaves, availableWidthPx, minWhiteKeyPx)) return false;
	return availableWidthPx >= stackedRowFloorPx(octaves, minWhiteKeyPx);
}

/** One stacked row of a split keyboard: a standalone board layout at index 0. */
export interface KeyboardRow {
	whiteLetters: string[];
	blackKeys: BlackKeyPattern[];
	/** This row's first white key's absolute index on the full (unsplit) board. */
	startWhiteIndex: number;
}

/**
 * Splits an `octaves`-wide board into two stacked rows at the white-index-7
 * seam (see `firstRowWhiteCount`), each row being a valid STANDALONE board
 * layout starting at its own index 0 - not a raw slice of the full board's
 * absolute indices. This matters because `PianoKeyboard.svelte` computes each
 * row's own `leftPct`/`widthPct` percentages from that row's OWN white-letter
 * count, so a row's black keys must be re-indexed to `afterWhiteIndex -
 * startWhiteIndex` (relative to the row's own white keys) rather than kept at
 * their absolute-board index, or the percentage math would place them past
 * the row's own right edge.
 *
 * Row 1: white indices `[0, firstRowWhiteCount)`, i.e. the first 7 letters
 * (C D E F G A B) plus every black key whose `afterWhiteIndex` falls before
 * that boundary (exactly one octave's worth, 5 keys).
 *
 * Row 2: the remainder - for 1 octave, just the trailing C (0 black keys,
 * the degenerate single-trailing-key case); for 2 octaves, the second
 * octave's 7 letters plus the final trailing C (8 letters total) and that
 * octave's own 5 black keys, re-indexed to start at 0.
 */
export function splitBoardIntoRows(octaves: 1 | 2): [KeyboardRow, KeyboardRow] {
	const whiteLetters = whiteLettersForOctaves(octaves);
	const blackKeys = blackKeysForOctaves(octaves);
	const seam = firstRowWhiteCount(octaves);

	const row1: KeyboardRow = {
		whiteLetters: whiteLetters.slice(0, seam),
		blackKeys: blackKeys.filter(({ afterWhiteIndex }) => afterWhiteIndex < seam),
		startWhiteIndex: 0
	};

	const row2: KeyboardRow = {
		whiteLetters: whiteLetters.slice(seam),
		blackKeys: blackKeys
			.filter(({ afterWhiteIndex }) => afterWhiteIndex >= seam)
			.map(({ afterWhiteIndex, sharpLetter, flatLetter }) => ({
				afterWhiteIndex: afterWhiteIndex - seam,
				sharpLetter,
				flatLetter
			})),
		startWhiteIndex: seam
	};

	return [row1, row2];
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
