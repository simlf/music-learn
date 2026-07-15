import { describe, expect, it } from 'vitest';
import { Note } from 'tonal';
import {
	createChordConstruction,
	createScaleConstruction,
	expectedStep,
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

	it('wrong-octave: tapping the correct letter one octave too high is a distinct outcome from wrong-pitch-class', () => {
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
		expect(result.direction).toBeUndefined();
		expect(result.state.position).toBe(0);
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
	it('every chord (ROOTS x QUALITY_SUFFIXES, 96 targets) and every scale (MAJOR_SCALE_ROOTS, 12 targets) is fully constructible and reachable within the fixed 2-octave C4-C6 board', () => {
		const SEVENTH_QUALITIES = new Set(['maj7', 'm7', '7', 'm7b5', 'dim7']);
		let sweptCount = 0;

		for (const root of ROOTS) {
			for (const quality of QUALITY_SUFFIXES) {
				const symbol = `${root}${quality}`;
				const state = createChordConstruction(symbol);
				const expectedStepCount = SEVENTH_QUALITIES.has(quality) ? 3 : 2;

				expect(state.steps.length).toBe(expectedStepCount);
				for (const step of state.steps) {
					expect(step.midi).toBeGreaterThanOrEqual(60);
					expect(step.midi).toBeLessThanOrEqual(84);
				}

				const final = walkAllCorrect(state);
				expect(final.done).toBe(true);
				expect(final.wrongTapCount).toBe(0);
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

		expect(sweptCount).toBe(96 + 12);
	});
});
