import { Note } from 'tonal';
import { toAsciiAccidentals } from '$lib/theory/interval';
import { whiteLettersForOctaves, blackKeysForOctaves } from '$lib/components/keyboardLayout';
import type { IntervalRole, SpelledNote } from '$lib/theory/types';

/**
 * Pure logic for the scale keyboard drill: a 15-target ascending-then-
 * descending sequence graded by pitch class (chroma), plus the ascending
 * key-placement helper that positions each degree on a fixed 2-octave
 * C-to-C board with the tonic as the leftmost highlighted key and the
 * octave (degree 8) as a distinct higher key.
 *
 * Replaces scaleDrill.ts's letter-equality gradeTap (a defect under
 * SCALE-04, the app-wide grade-by-chroma constraint) with the same
 * octave-agnostic chroma comparison gradeIntervalTap already established
 * for interval construction. No DOM, no audio, no Svelte: purely a state
 * machine and a geometry helper, matching every other module under
 * src/lib/theory and src/lib/practice.
 */

export type ScaleDirection = 'ascending' | 'descending';

/** One expected tap in the 15-target sequence. */
export interface ScaleTarget {
	/** Pitch class (0-11) this target accepts, octave-agnostic. */
	chroma: number;
	/** Scale degree (1-8) this target represents; degree 8 is the octave. */
	degree: number;
	/** Which leg of the drill this target belongs to. */
	direction: ScaleDirection;
}

export interface ScaleKeyboardDrillState {
	/** The full 15-target ascending-then-descending sequence. */
	targets: ScaleTarget[];
	/** Index of the next expected target; equals targets.length when done. */
	position: number;
	/** True once all 15 targets have been tapped in order. */
	done: boolean;
}

export interface GradeResult {
	/** Whether the tap's chroma matched the expected target's chroma. */
	correct: boolean;
	/** The new state to store; a fresh object on advance, the same object otherwise. */
	state: ScaleKeyboardDrillState;
}

/** One ascending-degree key placement on the fixed 2-octave board. */
export interface ScaleKeyPlacement {
	/** Scale degree (1-8); degree 8 is the octave. */
	degree: number;
	/** Degree-class role for interval coloring; degree 8 is forced to 'root'. */
	role: IntervalRole;
	/** Display-glyph letter, e.g. "F♯". */
	letter: string;
	/** French solfège syllable. */
	solfege: string;
	/** Pitch class (0-11) of the placed key. */
	chroma: number;
	/** Which key array this placement indexes into. */
	kind: 'white' | 'black';
	/** Index into whiteLettersForOctaves/blackKeysForOctaves's returned arrays. */
	keyIndex: number;
	/** Playback octave (4-based), matching the board's ascending register. */
	octave: number;
}

/** Fixed board span the scale keyboard drill always renders (Success Criterion 1). */
export const SCALE_DRILL_OCTAVES = 2;

/**
 * Pitch class (0-11) for a display-glyph letter, or undefined if unparseable.
 * `Note.chroma` returns `NaN` (not `undefined`) for input it can't resolve to
 * a pitch class, so this normalizes that into `undefined` to honor this
 * function's own return type - without this, every `=== undefined` guard
 * downstream (grading, degree-numbering fail-safes) would silently never
 * fire for genuinely unparseable input.
 */
function chromaFor(letter: string): number | undefined {
	const chroma = Note.chroma(toAsciiAccidentals(letter));
	return Number.isNaN(chroma) ? undefined : chroma;
}

/**
 * Builds the 15-target ascending-then-descending sequence from 7 spelled
 * scale degrees: degrees 1..8 ascending (degree 8 is the octave, sharing
 * degree 1's chroma), then degrees 7..1 descending. Total: input that isn't
 * exactly 7 notes, or contains a note whose letter doesn't resolve to a
 * pitch class, yields an inert empty state rather than throwing or silently
 * defaulting the unparseable degree to chroma 0 (C) - a bad chroma would
 * otherwise grade an unrelated tap as correct for that degree.
 */
export function createScaleKeyboardDrillState(notes: SpelledNote[]): ScaleKeyboardDrillState {
	if (notes.length !== 7) {
		return { targets: [], position: 0, done: false };
	}

	const chromas = notes.map((note) => chromaFor(note.letter));
	if (chromas.some((chroma) => chroma === undefined)) {
		return { targets: [], position: 0, done: false };
	}
	const resolvedChromas = chromas as number[];

	const ascending: ScaleTarget[] = notes.map((_, index) => ({
		chroma: resolvedChromas[index],
		degree: index + 1,
		direction: 'ascending' as const
	}));
	ascending.push({ chroma: resolvedChromas[0], degree: 8, direction: 'ascending' });

	const descending: ScaleTarget[] = [];
	for (let degree = 7; degree >= 1; degree -= 1) {
		descending.push({ chroma: resolvedChromas[degree - 1], degree, direction: 'descending' });
	}

	return { targets: [...ascending, ...descending], position: 0, done: false };
}

/** The target the drill currently expects next, or null once done or past the end. */
export function expectedTarget(state: ScaleKeyboardDrillState): ScaleTarget | null {
	return state.targets[state.position] ?? null;
}

/**
 * Grades one tap by chroma equality only, octave-agnostic like
 * gradeIntervalTap: never letter-string comparison. Unparseable input grades
 * false rather than throwing. A match advances position (flipping done once
 * every target has landed); a mismatch, an unparseable tap, or a tap after
 * done leaves the state reference unchanged.
 */
export function gradeScaleTap(state: ScaleKeyboardDrillState, tappedLetter: string): GradeResult {
	if (state.done) {
		return { correct: false, state };
	}

	const target = expectedTarget(state);
	if (target === null) {
		return { correct: false, state };
	}

	const tappedChroma = chromaFor(tappedLetter);
	if (tappedChroma === undefined || tappedChroma !== target.chroma) {
		return { correct: false, state };
	}

	const position = state.position + 1;
	const done = position >= state.targets.length;
	return { correct: true, state: { targets: state.targets, position, done } };
}

/** One entry in the unified left-to-right ascending key ordering used for placement. */
interface OrderedKey {
	slot: number;
	kind: 'white' | 'black';
	keyIndex: number;
	chroma: number;
	octave: number;
}

/**
 * Builds a single left-to-right ordered key list for the fixed 2-octave
 * board: white key i gets slot i*2, black key afterWhiteIndex a gets slot
 * a*2+1, interleaving white and black in true ascending pitch order. This
 * unified ordinal (not assignNotesToKeys' separate white/black cursor) is
 * what lets a single cursor walk find the returning octave as a distinct
 * key rather than collapsing it onto the tonic.
 */
function buildOrderedKeys(): OrderedKey[] {
	const whiteLetters = whiteLettersForOctaves(SCALE_DRILL_OCTAVES);
	const blackKeys = blackKeysForOctaves(SCALE_DRILL_OCTAVES);

	const whites: OrderedKey[] = whiteLetters.map((letter, index) => ({
		slot: index * 2,
		kind: 'white' as const,
		keyIndex: index,
		chroma: chromaFor(letter) ?? 0,
		octave: 4 + Math.floor(index / 7)
	}));

	const blacks: OrderedKey[] = blackKeys.map(({ afterWhiteIndex, sharpLetter }, index) => ({
		slot: afterWhiteIndex * 2 + 1,
		kind: 'black' as const,
		keyIndex: index,
		chroma: chromaFor(sharpLetter) ?? 0,
		octave: 4 + Math.floor(afterWhiteIndex / 7)
	}));

	return [...whites, ...blacks].sort((a, b) => a.slot - b.slot);
}

/**
 * Places the 8 ascending scale degrees (1..8, degree 8 being the tonic's
 * octave) onto the fixed 2-octave board: a single cursor walks the unified
 * ascending key ordering, picking the first key at or after the cursor
 * whose chroma matches each degree, then moves strictly past it. This
 * guarantees the octave (degree 8) lands on a distinct, later key from the
 * tonic even when the 7th degree is a black key right before it (the
 * assignNotesToKeys collision this module deliberately avoids by not
 * importing it). Total: input that isn't exactly 7 notes, or contains a
 * note whose letter doesn't resolve to a pitch class, returns []. Each
 * placement's `degree` is derived from its position in the fixed 8-note
 * ascending sequence (never from `placements.length`), so a skipped note
 * (e.g. no matching key found on the board) can never desync every
 * subsequent placement's degree number.
 */
export function placeAscendingScaleKeys(notes: SpelledNote[]): ScaleKeyPlacement[] {
	if (notes.length !== 7) {
		return [];
	}

	const chromas = notes.map((note) => chromaFor(note.letter));
	if (chromas.some((chroma) => chroma === undefined)) {
		return [];
	}

	const ascendingNotes: SpelledNote[] = [
		...notes,
		{ letter: notes[0].letter, solfege: notes[0].solfege, role: 'root' }
	];

	const orderedKeys = buildOrderedKeys();
	let cursor = 0;
	const placements: ScaleKeyPlacement[] = [];

	ascendingNotes.forEach((note, index) => {
		const chroma = chromaFor(note.letter);
		if (chroma === undefined) return;

		let foundIndex = -1;
		for (let i = cursor; i < orderedKeys.length; i += 1) {
			if (orderedKeys[i].chroma === chroma) {
				foundIndex = i;
				break;
			}
		}
		if (foundIndex === -1) return;

		const key = orderedKeys[foundIndex];
		placements.push({
			degree: index + 1,
			role: note.role,
			letter: note.letter,
			solfege: note.solfege,
			chroma,
			kind: key.kind,
			keyIndex: key.keyIndex,
			octave: key.octave
		});
		cursor = foundIndex + 1;
	});

	return placements;
}
