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
	/** Whether the tap was above or below the target. Present on both 'wrong-pitch-class' and 'wrong-octave' (never on 'correct'). */
	direction?: 'high' | 'low';
}

/** Matches toAscendingPitches' own starting octave and every other keyboard surface's BASE_OCTAVE. */
export const CONSTRUCTION_BASE_OCTAVE = 4;

/**
 * The highest MIDI note number a board spanning `octaves` C-to-C octaves (
 * starting at `CONSTRUCTION_BASE_OCTAVE`) can physically show:
 * `boardTopMidiForOctaves(1)` is the octave-5 C (72), `boardTopMidiForOctaves(2)`
 * is the octave-6 C (84) - matching `PianoKeyboard`'s own
 * `octaveForWhiteIndex` (`BASE_OCTAVE + floor(index / 7)`) exactly, since a
 * C-to-C span's top key is always the next octave's C. Exported so the
 * octave-count-to-MIDI mapping lives in this pure module rather than being
 * re-derived in `BuildSession.svelte`. Total: a `Note.midi` resolution
 * failure (should be unreachable for a literal "C{n}" pitch string) falls
 * back to the same formula computed directly, so this can never poison
 * grading with `NaN`.
 */
export function boardTopMidiForOctaves(octaves: 1 | 2): number {
	const octave = CONSTRUCTION_BASE_OCTAVE + octaves;
	return Note.midi(`C${octave}`) ?? (octave + 1) * 12;
}

/**
 * Folds `midi` down by whole octaves until it sits at or below
 * `boardTopMidi`. A no-op when `midi` is already at or below the ceiling
 * (covers both "the target is already on the board" and "no board-top was
 * supplied" via the caller's own guard). Guards an arithmetic overshoot of
 * more than one octave too, even though nothing in this app's own catalog
 * produces one (the highest chord/scale target is B major's B5 at MIDI 83,
 * one octave above the one-octave board's 72 ceiling).
 */
function foldToBoard(midi: number, boardTopMidi: number): number {
	if (midi <= boardTopMidi) return midi;
	return midi - 12 * Math.ceil((midi - boardTopMidi) / 12);
}

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
 * Shared "advance one step" transition for a CONFIRMED-correct target,
 * factored out so both a matching keyboard tap (`gradeConstructionTap`
 * below) and a mic-confirmed step (`gradeConstructionMicStep` below) produce
 * an IDENTICAL resulting state - same position/earnedNotes/done shape, same
 * untouched `wrongTapCount` - through one code path rather than two that
 * could quietly drift apart (BuildSession mic mode, Spike 025 Phase 2: "a
 * mic-accepted step must produce the same FSRS outcome as a tap-accepted
 * step").
 */
function advanceOnCorrect(state: ConstructionState, target: ConstructionStep): ConstructionState {
	const position = state.position + 1;
	const earnedNotes: SpelledNote[] = [
		...state.earnedNotes,
		{ letter: target.letter, solfege: target.solfege, role: target.role }
	];
	return {
		...state,
		position,
		earnedNotes,
		done: position >= state.steps.length
	};
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
 *
 * The optional fourth argument, `options.boardTopMidi`, is the highest MIDI
 * the rendered board can physically show (see `boardTopMidiForOctaves`).
 * WHY THIS EXISTS: a one-octave board tops out at MIDI 72 (C5), but an
 * A-rooted major triad needs MIDI 73 (C♯5) and 76 (E5) - so without folding,
 * every construction step whose target sits above the board's top key would
 * be uncompletable (every tap of the right pitch class would grade
 * 'wrong-octave' forever, never 'correct'), not merely hard. When
 * `boardTopMidi` is supplied, the target is folded down by whole octaves
 * (`foldToBoard`) until it is at or below that ceiling, and BOTH the exact
 * target MIDI and the folded MIDI grade 'correct' (via the SAME
 * `advanceOnCorrect`, so earnedNotes still records the target's own
 * spelling/role, identical to an exact-MIDI tap). The 'wrong-octave'
 * diagnostic still fires whenever the target is already reachable on the
 * board (folding is a no-op there) or for the board's own duplicated C, so
 * the "you're stacking upward" lesson survives everywhere it is physically
 * meaningful and is only dropped where the board cannot show the target at
 * all. 'wrong-pitch-class' semitones/direction are measured against the
 * FOLDED target, so the diagnostic reads e.g. "7 half steps too low" rather
 * than a distance to a target the board never rendered. Omitting `options`
 * (every existing caller and every existing test) leaves `reachableMidi`
 * equal to `target.midi`, so every branch below is byte-identical to before
 * this parameter existed.
 */
export function gradeConstructionTap(
	state: ConstructionState,
	letter: string,
	octave: number,
	options?: { boardTopMidi?: number }
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

	const reachableMidi =
		options?.boardTopMidi !== undefined
			? foldToBoard(target.midi, options.boardTopMidi)
			: target.midi;

	if (tappedMidi === target.midi || tappedMidi === reachableMidi) {
		return { outcome: 'correct', state: advanceOnCorrect(state, target) };
	}

	const tappedChroma = Note.chroma(toAsciiAccidentals(letter));
	const targetChroma = Note.chroma(toAsciiAccidentals(target.letter));
	if (tappedChroma === targetChroma) {
		return {
			outcome: 'wrong-octave',
			state: { ...state, wrongTapCount: state.wrongTapCount + 1 },
			direction: tappedMidi > reachableMidi ? 'high' : 'low'
		};
	}

	const semitones = Math.abs(tappedMidi - reachableMidi);
	const direction = tappedMidi > reachableMidi ? 'high' : 'low';
	return {
		outcome: 'wrong-pitch-class',
		state: { ...state, wrongTapCount: state.wrongTapCount + 1 },
		semitones,
		direction
	};
}

/**
 * Confirms the CURRENT expected step from microphone evidence rather than a
 * keyboard tap (BuildSession mic mode, Spike 025 Phase 2). The caller (a
 * `ChromaStabilityTracker` fed the step's own growing chroma target - see
 * `chromaDetector.ts`'s `buildChromaTargetFromNotes`) has already decided
 * the target is confirmed by the time this is called; this function only
 * performs the SAME state transition a matching tap would, via the shared
 * `advanceOnCorrect` - never a second, potentially-drifting implementation
 * of "what does earning a step mean".
 *
 * Deliberately does NOT touch `wrongTapCount`. A continuously-listening
 * detector has no discrete "attempt" boundary the way a keyboard tap does:
 * it cannot honestly tell "hasn't played it yet" apart from "played it
 * wrong", only "not yet confirmed". Inventing a synthetic wrong-attempt
 * signal from a weak or still-forming chord would risk penalizing a
 * correct player for background noise or for building the voicing up one
 * note at a time - a worse corruption of what an FSRS grade means than
 * simply not being able to detect struggle through this input path. Stated
 * plainly rather than hidden: a step, or a whole construction, completed
 * ENTIRELY through the microphone can only ever grade as Good or Easy
 * (`ratingForWrongTaps(0, steps)` in BuildSession.svelte) - identical to a
 * flawless all-taps run, never worse, never silently different.
 *
 * Total, mirroring `gradeConstructionTap`'s own defensive shape: an
 * already-done state, or a missing `expectedStep` (should be unreachable -
 * callers only invoke this when a step is live), echoes back an inert,
 * non-advancing result instead of throwing.
 */
export function gradeConstructionMicStep(state: ConstructionState): ConstructionTapResult {
	if (state.done) {
		return { outcome: 'wrong-pitch-class', state, semitones: 0, direction: 'high' };
	}

	const target = expectedStep(state);
	if (!target) {
		return { outcome: 'wrong-pitch-class', state, semitones: 0, direction: 'high' };
	}

	return { outcome: 'correct', state: advanceOnCorrect(state, target) };
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
