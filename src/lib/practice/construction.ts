import { Note } from 'tonal';
import { spellChord } from '$lib/theory/chord';
import { majorScaleNotes } from '$lib/theory/scale';
import { intervalBetween, toAsciiAccidentals } from '$lib/theory/interval';
import { toAscendingPitches } from '$lib/audio/voicing';
import type { IntervalInfo } from '$lib/theory/interval';
import type { IntervalRole, SpelledNote } from '$lib/theory/types';

/**
 * The "build it" construction engine (Phase 12 D-01..D-05): one pure,
 * DOM-free state machine shared by both chords (stack thirds) and scales
 * (step whole/half), used by BuildSession (12-04/05) to drive the whole
 * construction flow. Given a root-first, own-spelled note sequence (from
 * spellChord/majorScaleNotes - never a re-derived "simplest enharmonic"),
 * derives the ascending-octave MIDI target for each subsequent note
 * (toAscendingPitches, matching the audio engine's own voicing) and grades
 * taps by MIDI/chroma only, never letter-string equality.
 *
 * No DOM, no Svelte, no Dexie, no scheduler/Rating imports: this module
 * stays pure and SRS-unaware, matching src/lib/theory's and
 * src/lib/practice's established purity convention.
 */

export type ConstructionKind = 'chord' | 'scale';

/** One step in the construction sequence: the note earned at this step and how to get there from the previous one. */
export interface ConstructionStep {
	/** 1-indexed position within `steps` (steps[0].index === 1). */
	index: number;
	/** Total number of steps in this construction. */
	total: number;
	/** Scale-degree-style position counting the pre-placed root as 1 (steps[k].degree === k + 2). */
	degree: number;
	/** Display-glyph letter, the target's OWN spelling (never re-derived), e.g. "B♭♭". */
	letter: string;
	/** French solfège syllable for `letter`. */
	solfege: string;
	/** Degree-class role for interval coloring. */
	role: IntervalRole;
	/** Expected MIDI note number at this step, per the ascending-voicing placement. */
	midi: number;
	/** The CONSECUTIVE interval from the previous note to this one (never root-relative). */
	interval: IntervalInfo;
}

export interface ConstructionState {
	kind: ConstructionKind;
	/** The chord's own glyph symbol (e.g. "Cm7") or the plain scale tonic (e.g. "F♯"). */
	label: string;
	steps: ConstructionStep[];
	/** Index of the next expected step; equals steps.length when done. */
	position: number;
	/** Notes earned so far, root-first, always in the target's own spelling. */
	earnedNotes: SpelledNote[];
	/** Count of taps that did not advance position (wrong-pitch-class or wrong-octave). */
	wrongTapCount: number;
	done: boolean;
}

export interface ConstructionTapResult {
	outcome: 'correct' | 'wrong-pitch-class' | 'wrong-octave';
	/** The caller's next state to hold onto, whether or not the tap advanced. Always present. */
	state: ConstructionState;
	/** Signed semitone distance between the tap and the target. Present only on 'wrong-pitch-class'. */
	semitones?: number;
	/** Whether the tap was above or below the target. Present only on 'wrong-pitch-class'. */
	direction?: 'high' | 'low';
}

/** Matches toAscendingPitches' own starting octave and every other keyboard surface's BASE_OCTAVE. */
export const CONSTRUCTION_BASE_OCTAVE = 4;

/** An inert, already-done, empty state: the total-function fallback for unrecognized input. */
function emptyState(kind: ConstructionKind, label: string): ConstructionState {
	return { kind, label, steps: [], position: 0, earnedNotes: [], wrongTapCount: 0, done: true };
}

/**
 * Shared builder for both constructors: given an ordered, root-first,
 * own-spelled `fullNotes` array, computes the ascending-octave MIDI
 * placement (toAscendingPitches, the same algorithm the audio engine
 * already uses) and derives one ConstructionStep per note after the root,
 * with its CONSECUTIVE interval from the previous note (never root-relative).
 * Total: any unresolvable MIDI (a letter Note.midi can't parse) falls
 * through to the inert empty state rather than producing a step with a
 * bogus midi value.
 */
function buildConstruction(
	kind: ConstructionKind,
	label: string,
	fullNotes: SpelledNote[]
): ConstructionState {
	const pitches = toAscendingPitches(fullNotes.map((note) => note.letter));
	const midis = pitches.map((pitch) => Note.midi(pitch));
	if (midis.some((midi) => midi === null)) {
		return emptyState(kind, label);
	}
	const resolvedMidis = midis as number[];

	const steps: ConstructionStep[] = [];
	for (let i = 1; i < fullNotes.length; i += 1) {
		const interval = intervalBetween(fullNotes[i - 1].letter, fullNotes[i].letter);
		steps.push({
			index: i,
			total: fullNotes.length - 1,
			degree: i + 1,
			letter: fullNotes[i].letter,
			solfege: fullNotes[i].solfege,
			role: fullNotes[i].role,
			midi: resolvedMidis[i],
			interval
		});
	}

	return {
		kind,
		label,
		steps,
		position: 0,
		earnedNotes: [fullNotes[0]],
		wrongTapCount: 0,
		done: steps.length === 0
	};
}

/**
 * Builds the ascending, octave-strict construction sequence for a chord
 * symbol: the chord's own spelling (spellChord), stacking one interval per
 * step (root pre-placed). Total: an unrecognized symbol returns an inert,
 * already-done empty state.
 */
export function createChordConstruction(symbol: string): ConstructionState {
	const chord = spellChord(symbol);
	if (!chord.recognized) {
		return emptyState('chord', symbol);
	}
	// Rebuild the glyph symbol on the glyph root (chord.symbol is tonal's ASCII
	// echo), matching chordPresentation.ts's aliasLine / RecallMap's
	// chordLabel idiom exactly.
	const label = chord.root + chord.symbol.slice(chord.root.length);
	return buildConstruction('chord', label, chord.notes);
}

/**
 * Builds the ascending, octave-strict construction sequence for a major
 * scale tonic: majorScaleNotes' own spelling, stepping whole/half, closing
 * on a distinct octave note (role forced to 'root', matching
 * placeAscendingScaleKeys' precedent). Total: a tonic majorScaleNotes can't
 * spell returns an inert, already-done empty state.
 */
export function createScaleConstruction(tonic: string): ConstructionState {
	const notes = majorScaleNotes(tonic);
	if (notes.length !== 7) {
		return emptyState('scale', tonic);
	}
	const fullNotes: SpelledNote[] = [
		...notes,
		{ letter: notes[0].letter, solfege: notes[0].solfege, role: 'root' }
	];
	return buildConstruction('scale', tonic, fullNotes);
}

/** The step the construction currently expects next, or undefined once done or past the end. */
export function expectedStep(state: ConstructionState): ConstructionStep | undefined {
	return state.steps[state.position];
}

/**
 * Grades one tap by MIDI/chroma only, never letter-string equality. An
 * already-done state (or a defensive undefined expectedStep) is inert:
 * returns the SAME state reference echoed back with a fixed
 * wrong-pitch-class/0-semitones/high-direction result, so the caller never
 * advances further and this function never throws. Every other branch
 * returns a fresh state object (never mutates the input in place): 'correct'
 * advances position and grows earnedNotes in the target's own spelling;
 * 'wrong-octave' (same chroma, wrong MIDI) and 'wrong-pitch-class' (different
 * chroma) both leave position/earnedNotes unchanged and increment
 * wrongTapCount by exactly one.
 */
export function gradeConstructionTap(
	state: ConstructionState,
	letter: string,
	octave: number
): ConstructionTapResult {
	if (state.done) {
		return { outcome: 'wrong-pitch-class', state, semitones: 0, direction: 'high' };
	}

	const target = expectedStep(state);
	if (!target) {
		return { outcome: 'wrong-pitch-class', state, semitones: 0, direction: 'high' };
	}

	const tappedMidi = Note.midi(`${toAsciiAccidentals(letter)}${octave}`);
	if (tappedMidi === null) {
		return { outcome: 'wrong-pitch-class', state, semitones: 0, direction: 'high' };
	}

	if (tappedMidi === target.midi) {
		const position = state.position + 1;
		const earnedNotes: SpelledNote[] = [
			...state.earnedNotes,
			{ letter: target.letter, solfege: target.solfege, role: target.role }
		];
		const advancedState: ConstructionState = {
			...state,
			position,
			earnedNotes,
			done: position >= state.steps.length
		};
		return { outcome: 'correct', state: advancedState };
	}

	const tappedChroma = Note.chroma(toAsciiAccidentals(letter));
	const targetChroma = Note.chroma(toAsciiAccidentals(target.letter));
	if (tappedChroma === targetChroma) {
		return {
			outcome: 'wrong-octave',
			state: { ...state, wrongTapCount: state.wrongTapCount + 1 }
		};
	}

	const semitones = Math.abs(tappedMidi - target.midi);
	const direction = tappedMidi > target.midi ? 'high' : 'low';
	return {
		outcome: 'wrong-pitch-class',
		state: { ...state, wrongTapCount: state.wrongTapCount + 1 },
		semitones,
		direction
	};
}

/**
 * Whether a display-glyph letter is a "notable" spelling worth calling out:
 * double accidentals (B♭♭, F♯♯), or one of the four natural-adjacent
 * single-accidental exceptions (C♭, F♭, E♯, B♯) that read as an unexpected
 * white-key spelling.
 */
export function isNotableSpelling(letter: string): boolean {
	if (letter.includes('♭♭') || letter.includes('♯♯')) return true;
	return letter === 'C♭' || letter === 'F♭' || letter === 'E♯' || letter === 'B♯';
}
