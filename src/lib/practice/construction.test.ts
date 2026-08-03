import { describe, expect, it } from 'vitest';
import { Note } from 'tonal';
import {
	boardTopMidiForOctaves,
	createChordConstruction,
	createScaleConstruction,
	expectedStep,
	gradeConstructionMicStep,
	gradeConstructionTap,
	isNotableSpelling,
	CONSTRUCTION_BASE_OCTAVE,
	type ConstructionState
} from './construction';
import { toAsciiAccidentals } from '$lib/theory/interval';
import { ROOTS, QUALITY_SUFFIXES } from '$lib/theory/randomChord';
import { MAJOR_SCALE_ROOTS } from '$lib/theory/scale';

/**
 * The "build it" construction engine (Phase 12 D-01..D-05): given a chord
 * symbol or scale tonic, an ascending octave-strict tap-by-tap target
 * sequence, graded by MIDI/chroma only (never letter-string equality).
 * Covers a single worked example (Cm7) in depth, the Cdim7 double-flat
 * enharmonic-grading proof, every terminal/error edge case, and a full
 * 96-chord + 12-scale reachability sweep proving every real catalog target
 * fits the fixed 2-octave C4-C6 board.
 */

/**
 * Octave that makes `letter` (display glyphs allowed) resolve to exactly
 * `midi` via Note.midi. A pure midi-to-octave formula (floor(midi/12)-1)
 * does not round-trip for multi-accidental letters that the
 * ascending-voicing algorithm places by bumping an extra octave (e.g. a
 * target's own C♭♭ sitting a full octave above where that naive formula
 * would place it) - this searches the practical keyboard span for the
 * concrete octave that actually reproduces the target's own MIDI when
 * tapped with the given letter.
 */
function octaveForTap(letter: string, midi: number): number {
	const pitchClass = toAsciiAccidentals(letter);
	for (let octave = 0; octave <= 9; octave += 1) {
		if (Note.midi(`${pitchClass}${octave}`) === midi) {
			return octave;
		}
	}
	throw new Error(`no octave found for ${letter} at midi ${midi}`);
}

/**
 * Walks a construction state to completion by tapping every step's own
 * expected letter/octave in order. Asserts each tap is graded 'correct' along
 * the way, so a broken walk fails fast at the offending step rather than
 * silently stalling.
 */
function walkAllCorrect(state: ConstructionState): ConstructionState {
	let current = state;
	while (!current.done) {
		const step = expectedStep(current);
		if (!step) break;
		const result = gradeConstructionTap(
			current,
			step.letter,
			octaveForTap(step.letter, step.midi)
		);
		expect(result.outcome).toBe('correct');
		current = result.state;
	}
	return current;
}

describe('createChordConstruction', () => {
	it('Cm7 stacks m3, M3, m3 with role/degree/letter tags, root pre-placed', () => {
		const state = createChordConstruction('Cm7');

		expect(state.kind).toBe('chord');
		expect(state.label).toBe('Cm7');
		expect(state.steps.length).toBe(3);

		expect(state.steps[0]).toMatchObject({ role: 'third', letter: 'E♭', degree: 2 });
		expect(state.steps[0].interval.short).toBe('m3');

		expect(state.steps[1]).toMatchObject({ role: 'fifth', letter: 'G', degree: 3 });
		expect(state.steps[1].interval.short).toBe('M3');

		expect(state.steps[2]).toMatchObject({ role: 'seventh', letter: 'B♭', degree: 4 });
		expect(state.steps[2].interval.short).toBe('m3');

		expect(state.earnedNotes).toEqual([expect.objectContaining({ letter: 'C', role: 'root' })]);
		expect(state.position).toBe(0);
		expect(state.done).toBe(false);
		expect(state.wrongTapCount).toBe(0);
	});

	it('Cdim7 keeps its own double-flat seventh (B♭♭), never re-derived as A', () => {
		const state = createChordConstruction('Cdim7');
		const seventhStep = state.steps.find((step) => step.role === 'seventh');

		expect(seventhStep?.letter).toBe('B♭♭');
		expect(isNotableSpelling(seventhStep?.letter ?? '')).toBe(true);
	});
});

describe('createScaleConstruction', () => {
	it('C major has 7 steps, closing the octave with a forced-root half step from B', () => {
		const state = createScaleConstruction('C');

		expect(state.kind).toBe('scale');
		expect(state.label).toBe('C');
		expect(state.steps.length).toBe(7);

		const octaveClose = state.steps[6];
		expect(octaveClose.interval.short).toBe('m2');
		expect(octaveClose.role).toBe('root');
		expect(octaveClose.letter).toBe('C');
		expect(octaveClose.degree).toBe(8);
	});
});

describe('gradeConstructionTap: ascending walk-through', () => {
	it('walking Cm7 exactly advances position 0->1->2->3, grows earnedNotes to 4, and completes with wrongTapCount 0', () => {
		const initial = createChordConstruction('Cm7');
		const final = walkAllCorrect(initial);

		expect(final.position).toBe(3);
		expect(final.earnedNotes.length).toBe(4);
		expect(final.earnedNotes.map((note) => note.letter)).toEqual(['C', 'E♭', 'G', 'B♭']);
		expect(final.wrongTapCount).toBe(0);
		expect(final.done).toBe(true);
	});

	it('enharmonic MIDI-only match: a physical A key satisfies a Cdim7 B♭♭ target by MIDI equality, but earnedNotes still records B♭♭', () => {
		let state = createChordConstruction('Cdim7');

		// Walk the first two steps (third, fifth) with their own exact letters
		// to reach the seventh step (the double-flat target).
		for (let i = 0; i < 2; i += 1) {
			const step = expectedStep(state);
			if (!step) throw new Error('expected a step');
			const result = gradeConstructionTap(state, step.letter, octaveForTap(step.letter, step.midi));
			expect(result.outcome).toBe('correct');
			state = result.state;
		}

		const seventhStep = expectedStep(state);
		if (!seventhStep) throw new Error('expected the seventh step');
		expect(seventhStep.letter).toBe('B♭♭');

		const result = gradeConstructionTap(state, 'A', octaveForTap('A', seventhStep.midi));

		expect(result.outcome).toBe('correct');
		expect(result.state.done).toBe(true);
		expect(result.state.earnedNotes[result.state.earnedNotes.length - 1].letter).toBe('B♭♭');
	});
});

describe('gradeConstructionTap: wrong-pitch-class and wrong-octave grading', () => {
	it('wrong-pitch-class: tapping F against an expected E♭ reports the true signed semitone distance, does not advance, increments wrongTapCount, and never mutates the input state', () => {
		const initial = createChordConstruction('Cm7');
		const step = expectedStep(initial);
		if (!step) throw new Error('expected a step');
		const snapshotPosition = initial.position;
		const snapshotWrongTapCount = initial.wrongTapCount;

		const result = gradeConstructionTap(initial, 'F', octaveForTap(step.letter, step.midi));

		expect(result.outcome).toBe('wrong-pitch-class');
		expect(result.semitones).toBe(2);
		expect(result.direction).toBe('high');
		expect(result.state.position).toBe(0);
		expect(result.state.wrongTapCount).toBe(1);

		// The original (input) state object must be unchanged, never mutated in place.
		expect(initial.position).toBe(snapshotPosition);
		expect(initial.wrongTapCount).toBe(snapshotWrongTapCount);
	});

	it('wrong-octave: tapping the correct letter one octave too high is a distinct outcome from wrong-pitch-class, and reports the "high" direction', () => {
		const initial = createChordConstruction('Cm7');
		const step = expectedStep(initial);
		if (!step) throw new Error('expected a step');

		const result = gradeConstructionTap(
			initial,
			step.letter,
			octaveForTap(step.letter, step.midi) + 1
		);

		expect(result.outcome).toBe('wrong-octave');
		expect(result.semitones).toBeUndefined();
		expect(result.direction).toBe('high');
		expect(result.state.position).toBe(0);
		expect(result.state.wrongTapCount).toBe(1);
	});

	it('wrong-octave: tapping the correct letter one octave too low reports the "low" direction', () => {
		const initial = createChordConstruction('Cm7');
		const step = expectedStep(initial);
		if (!step) throw new Error('expected a step');

		const result = gradeConstructionTap(
			initial,
			step.letter,
			octaveForTap(step.letter, step.midi) - 1
		);

		expect(result.outcome).toBe('wrong-octave');
		expect(result.direction).toBe('low');
		expect(result.state.wrongTapCount).toBe(1);
	});

	it('wrongTapCount accumulates across misses but only a correct tap advances position', () => {
		const initial = createChordConstruction('Cm7');
		const step = expectedStep(initial);
		if (!step) throw new Error('expected a step');

		const octave = octaveForTap(step.letter, step.midi);
		const miss1 = gradeConstructionTap(initial, 'F', octave);
		const miss2 = gradeConstructionTap(miss1.state, 'F', octave);
		const hit = gradeConstructionTap(miss2.state, step.letter, octave);

		expect(miss1.state.wrongTapCount).toBe(1);
		expect(miss2.state.wrongTapCount).toBe(2);
		expect(hit.outcome).toBe('correct');
		expect(hit.state.wrongTapCount).toBe(2);
		expect(hit.state.position).toBe(1);
		expect(hit.state.earnedNotes.length).toBe(2);
	});
});

describe('gradeConstructionTap: octave-folding to a board ceiling (boardTopMidi option)', () => {
	it('boardTopMidiForOctaves resolves the top C of a 1- or 2-octave board', () => {
		expect(boardTopMidiForOctaves(1)).toBe(72);
		expect(boardTopMidiForOctaves(2)).toBe(84);
	});

	it('omitting options leaves every result identical to the pre-existing (no-fold) behavior', () => {
		const initial = createChordConstruction('Cm7');
		const step = expectedStep(initial);
		if (!step) throw new Error('expected a step');

		const withoutOptions = gradeConstructionTap(initial, 'F', octaveForTap(step.letter, step.midi));
		const explicitlyUndefined = gradeConstructionTap(
			initial,
			'F',
			octaveForTap(step.letter, step.midi),
			undefined
		);

		expect(withoutOptions).toEqual(explicitlyUndefined);
		expect(withoutOptions.outcome).toBe('wrong-pitch-class');
		expect(withoutOptions.semitones).toBe(2);
		expect(withoutOptions.direction).toBe('high');
	});

	it('a correct exact tap and a correct FOLDED tap both advance the state identically (A major triad third, C♯5 folded to C♯4 on a 1-octave board)', () => {
		const initial = createChordConstruction('A');
		const step = expectedStep(initial);
		if (!step) throw new Error('expected a step');
		expect(step.letter).toBe('C♯');
		expect(step.midi).toBe(73);

		const boardTopMidi = boardTopMidiForOctaves(1);
		expect(boardTopMidi).toBe(72);

		const exactTap = gradeConstructionTap(
			initial,
			step.letter,
			octaveForTap(step.letter, step.midi),
			{ boardTopMidi }
		);
		const foldedTap = gradeConstructionTap(initial, step.letter, 4, { boardTopMidi });

		expect(exactTap.outcome).toBe('correct');
		expect(foldedTap.outcome).toBe('correct');
		// A folded-correct tap produces the SAME state transition as an exact
		// tap: the target's own letter/solfege/role is appended to earnedNotes
		// either way.
		expect(foldedTap.state).toEqual(exactTap.state);
	});

	it('a wrong-pitch-class tap against a folded target reports the distance to the FOLDED midi, not the unreachable exact one', () => {
		const initial = createChordConstruction('A');
		const step = expectedStep(initial);
		if (!step) throw new Error('expected a step');
		expect(step.letter).toBe('C♯');

		const boardTopMidi = boardTopMidiForOctaves(1);
		// D4 (62) against the folded C♯4 target (61): 1 half step, high - never
		// the 11-semitone distance a naive exact-midi (73) comparison would report.
		const result = gradeConstructionTap(initial, 'D', 4, { boardTopMidi });

		expect(result.outcome).toBe('wrong-pitch-class');
		expect(result.semitones).toBe(1);
		expect(result.direction).toBe('high');
	});

	it('a same-chroma tap against a folded target still grades wrong-octave one more octave off: folding narrows the target, it never removes the octave check', () => {
		const initial = createChordConstruction('A');
		const step = expectedStep(initial);
		if (!step) throw new Error('expected a step');
		const boardTopMidi = boardTopMidiForOctaves(1);

		// C♯3 (49): same chroma as the folded C♯4 target (61), still a
		// different octave, so this is wrong-octave, never correct.
		const result = gradeConstructionTap(initial, step.letter, 3, { boardTopMidi });

		expect(result.outcome).toBe('wrong-octave');
		expect(result.direction).toBe('low');
	});

	it("Cm7's third (E♭4, already inside a 1-octave board) is unaffected by folding: an exact tap is still correct, and there is no second E♭ key to fold to", () => {
		const initial = createChordConstruction('Cm7');
		const step = expectedStep(initial);
		if (!step) throw new Error('expected a step');
		expect(step.letter).toBe('E♭');
		expect(step.midi).toBe(63);

		const boardTopMidi = boardTopMidiForOctaves(1);
		const result = gradeConstructionTap(
			initial,
			step.letter,
			octaveForTap(step.letter, step.midi),
			{ boardTopMidi }
		);

		expect(result.outcome).toBe('correct');
	});

	it('the C major scale\'s closing octave-up tonic (C5, exactly ON a 1-octave board) still grades wrong-octave for a low-octave tap: folding must not fire for an already-reachable target', () => {
		let scaleState = createScaleConstruction('C');
		// Walk the first six degrees (every step before the closing octave tonic).
		for (let i = 0; i < 6; i += 1) {
			const liveStep = expectedStep(scaleState);
			if (!liveStep) throw new Error('expected a step');
			const walkResult = gradeConstructionTap(
				scaleState,
				liveStep.letter,
				octaveForTap(liveStep.letter, liveStep.midi)
			);
			expect(walkResult.outcome).toBe('correct');
			scaleState = walkResult.state;
		}

		const closingStep = expectedStep(scaleState);
		if (!closingStep) throw new Error('expected the closing step');
		expect(closingStep.letter).toBe('C');
		expect(closingStep.midi).toBe(72);

		const boardTopMidi = boardTopMidiForOctaves(1);
		expect(boardTopMidi).toBe(72);

		const result = gradeConstructionTap(scaleState, 'C', 4, { boardTopMidi });

		expect(result.outcome).toBe('wrong-octave');
		expect(result.direction).toBe('low');
	});

	it("a target more than one octave above the ceiling folds by whole octaves until it is at or below it (two-octave-overshoot guard, never produced by this app's own catalog)", () => {
		const initial = createChordConstruction('Cm7');
		const step = expectedStep(initial);
		if (!step) throw new Error('expected a step');
		expect(step.letter).toBe('E♭');
		expect(step.midi).toBe(63);

		// An artificially low ceiling forces a TWO-octave fold: 63 -> 51 -> 39.
		const boardTopMidi = 40;
		const foldedTap = gradeConstructionTap(
			initial,
			step.letter,
			octaveForTap(step.letter, 39),
			{ boardTopMidi }
		);

		expect(foldedTap.outcome).toBe('correct');
	});
});

describe('gradeConstructionMicStep: BuildSession mic mode (Spike 025 Phase 2)', () => {
	it('advances the step and grows earnedNotes exactly like a matching tap - same resulting state, same untouched wrongTapCount', () => {
		const initial = createChordConstruction('Cm7');
		const step = expectedStep(initial);
		if (!step) throw new Error('expected a live step');

		const tapResult = gradeConstructionTap(initial, step.letter, CONSTRUCTION_BASE_OCTAVE);
		const micResult = gradeConstructionMicStep(initial);

		expect(micResult.outcome).toBe('correct');
		expect(micResult.state).toEqual(tapResult.state);
	});

	it('never touches wrongTapCount, even across a whole construction confirmed entirely by mic', () => {
		let state = createChordConstruction('Cm7');
		while (!state.done) {
			const result = gradeConstructionMicStep(state);
			expect(result.outcome).toBe('correct');
			state = result.state;
		}

		expect(state.wrongTapCount).toBe(0);
		expect(state.earnedNotes.map((note) => note.letter)).toEqual(['C', 'E♭', 'G', 'B♭']);
		expect(state.done).toBe(true);
	});

	it('is total: an already-done state is inert and echoes the same state back, mirroring gradeConstructionTap', () => {
		const done = walkAllCorrect(createChordConstruction('Cm7'));

		const result = gradeConstructionMicStep(done);

		expect(result.outcome).toBe('wrong-pitch-class');
		expect(result.semitones).toBe(0);
		expect(result.direction).toBe('high');
		expect(result.state).toBe(done);
	});

	it('unrecognized chord symbols (already-done empty state) are inert too', () => {
		const bad = createChordConstruction('Xyz123');

		const result = gradeConstructionMicStep(bad);

		expect(result.outcome).toBe('wrong-pitch-class');
		expect(result.state).toBe(bad);
	});
});

describe('terminal states: total, never throws', () => {
	it('expectedStep on a done state returns undefined', () => {
		const done = walkAllCorrect(createChordConstruction('Cm7'));

		expect(expectedStep(done)).toBeUndefined();
	});

	it('gradeConstructionTap on an already-done state is inert and echoes the same state back', () => {
		const done = walkAllCorrect(createChordConstruction('Cm7'));

		const result = gradeConstructionTap(done, 'C', CONSTRUCTION_BASE_OCTAVE);

		expect(result.outcome).toBe('wrong-pitch-class');
		expect(result.semitones).toBe(0);
		expect(result.direction).toBe('high');
		expect(result.state).toBe(done);
	});

	it('unrecognized chord symbols and tonics return an inert, already-done empty state', () => {
		const badChord = createChordConstruction('Xyz123');
		expect(badChord.done).toBe(true);
		expect(badChord.steps).toEqual([]);
		expect(badChord.earnedNotes).toEqual([]);

		const badScale = createScaleConstruction('Xyz123');
		expect(badScale.done).toBe(true);
		expect(badScale.steps).toEqual([]);
		expect(badScale.earnedNotes).toEqual([]);
	});
});

describe('isNotableSpelling', () => {
	it('flags double accidentals', () => {
		expect(isNotableSpelling('B♭♭')).toBe(true);
		expect(isNotableSpelling('F♯♯')).toBe(true);
	});

	it('flags the four natural-adjacent single-accidental exceptions', () => {
		expect(isNotableSpelling('C♭')).toBe(true);
		expect(isNotableSpelling('F♭')).toBe(true);
		expect(isNotableSpelling('E♯')).toBe(true);
		expect(isNotableSpelling('B♯')).toBe(true);
	});

	it('does not flag routine spellings', () => {
		expect(isNotableSpelling('C♯')).toBe(false);
		expect(isNotableSpelling('E♭')).toBe(false);
		expect(isNotableSpelling('G')).toBe(false);
		expect(isNotableSpelling('F♯')).toBe(false);
	});
});

describe('full-catalog reachability sweep (BUILD-01/02 success criterion)', () => {
	/**
	 * Notes-past-the-root count for every quality QUALITY_SUFFIXES holds
	 * today (n1-tier-unlock grew this from 8 to 14 - see randomChord.ts).
	 * Triads (2 notes past root: third, fifth) and the five original seventh
	 * families (3: third, fifth, seventh) are unchanged; the 6 newly-unlocked
	 * qualities were individually verified by executing spellChord across all
	 * 12 roots before being added here: 6/m6 add a sixth (3), sus4 swaps the
	 * third for a fourth (2), 7sus4 adds a seventh on top of that (3), 7b9
	 * adds a ninth on top of a full seventh chord (4), 7#5 alters the fifth
	 * without adding a note (3).
	 */
	const STEP_COUNT_BY_QUALITY: Record<string, number> = {
		'': 2,
		m: 2,
		dim: 2,
		maj7: 3,
		m7: 3,
		'7': 3,
		m7b5: 3,
		dim7: 3,
		'6': 3,
		m6: 3,
		sus4: 2,
		'7sus4': 3,
		'7b9': 4,
		'7#5': 3
	};

	it('every chord (ROOTS x QUALITY_SUFFIXES, 168 targets) and every scale (MAJOR_SCALE_ROOTS, 12 targets) is fully constructible and reachable within the fixed 2-octave C4-C6 board', () => {
		expect(Object.keys(STEP_COUNT_BY_QUALITY).sort()).toEqual([...QUALITY_SUFFIXES].sort());
		let sweptCount = 0;

		for (const root of ROOTS) {
			for (const quality of QUALITY_SUFFIXES) {
				const symbol = `${root}${quality}`;
				const state = createChordConstruction(symbol);
				const expectedStepCount = STEP_COUNT_BY_QUALITY[quality];

				expect(state.steps.length, symbol).toBe(expectedStepCount);
				for (const step of state.steps) {
					expect(step.midi, symbol).toBeGreaterThanOrEqual(60);
					expect(step.midi, symbol).toBeLessThanOrEqual(84);
				}

				const final = walkAllCorrect(state);
				expect(final.done, symbol).toBe(true);
				expect(final.wrongTapCount, symbol).toBe(0);
				sweptCount += 1;
			}
		}

		for (const tonic of MAJOR_SCALE_ROOTS) {
			const state = createScaleConstruction(tonic);

			expect(state.steps.length).toBe(7);
			for (const step of state.steps) {
				expect(step.midi).toBeGreaterThanOrEqual(60);
				expect(step.midi).toBeLessThanOrEqual(84);
			}

			const final = walkAllCorrect(state);
			expect(final.done).toBe(true);
			expect(final.wrongTapCount).toBe(0);
			sweptCount += 1;
		}

		expect(sweptCount).toBe(168 + 12);
	});
});
