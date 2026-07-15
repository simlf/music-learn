import { describe, expect, it } from 'vitest';
import {
	createScaleKeyboardDrillState,
	expectedTarget,
	gradeScaleTap,
	placeAscendingScaleKeys
} from './scaleKeyboardDrill';
import { majorScaleNotes } from '$lib/theory/scale';

describe('scale keyboard drill sequence (chroma-graded, ascending then descending)', () => {
	it('starts at position 0, not done, with 15 targets', () => {
		const state = createScaleKeyboardDrillState(majorScaleNotes('C'));

		expect(state.position).toBe(0);
		expect(state.done).toBe(false);
		expect(state.targets.length).toBe(15);
	});

	it('expectedTarget of a fresh C-major state is degree 1, chroma 0, ascending', () => {
		const state = createScaleKeyboardDrillState(majorScaleNotes('C'));

		expect(expectedTarget(state)).toEqual({ chroma: 0, degree: 1, direction: 'ascending' });
	});

	it('ascending walk: taps C D E F G A B C each advance position 0 to 8', () => {
		let state = createScaleKeyboardDrillState(majorScaleNotes('C'));

		for (const letter of ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C']) {
			const result = gradeScaleTap(state, letter);
			expect(result.correct).toBe(true);
			state = result.state;
		}

		expect(state.position).toBe(8);
		expect(expectedTarget(state)).toEqual({ chroma: 11, degree: 7, direction: 'descending' });
	});

	it('descending walk: continuing with B A G F E D C advances position 8 to 15 and completes', () => {
		let state = createScaleKeyboardDrillState(majorScaleNotes('C'));

		for (const letter of ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C']) {
			state = gradeScaleTap(state, letter).state;
		}

		for (const letter of ['B', 'A', 'G', 'F', 'E', 'D', 'C']) {
			const result = gradeScaleTap(state, letter);
			expect(result.correct).toBe(true);
			state = result.state;
		}

		expect(state.position).toBe(15);
		expect(state.done).toBe(true);
		expect(expectedTarget(state)).toBeNull();
	});

	it('wrong pitch class does not advance', () => {
		const state = createScaleKeyboardDrillState(majorScaleNotes('C'));

		const result = gradeScaleTap(state, 'E');

		expect(result.correct).toBe(false);
		expect(result.state.position).toBe(0);
	});

	it('enharmonic acceptance by chroma: F♯ major degree 7 (E♯, chroma 5) accepts tapped F', () => {
		let state = createScaleKeyboardDrillState(majorScaleNotes('F♯'));

		// Walk degrees 1..6 ascending to reach degree 7 as the expected target.
		for (const letter of ['F♯', 'G♯', 'A♯', 'B', 'C♯', 'D♯']) {
			state = gradeScaleTap(state, letter).state;
		}

		expect(expectedTarget(state)).toEqual({ chroma: 5, degree: 7, direction: 'ascending' });

		const result = gradeScaleTap(state, 'F');
		expect(result.correct).toBe(true);
	});

	it('enharmonic acceptance by chroma: D♭ major degree 4 (G♭, chroma 6) accepts tapped F♯', () => {
		let state = createScaleKeyboardDrillState(majorScaleNotes('D♭'));

		// Walk degrees 1..3 ascending to reach degree 4 as the expected target.
		for (const letter of ['D♭', 'E♭', 'F']) {
			state = gradeScaleTap(state, letter).state;
		}

		expect(expectedTarget(state)).toEqual({ chroma: 6, degree: 4, direction: 'ascending' });

		const result = gradeScaleTap(state, 'F♯');
		expect(result.correct).toBe(true);
	});

	it('octave-agnostic: degree 8 expects the same chroma as degree 1', () => {
		const state = createScaleKeyboardDrillState(majorScaleNotes('C'));
		const degree1 = state.targets[0];
		const degree8 = state.targets[7];

		expect(degree8.chroma).toBe(degree1.chroma);
		expect(degree1.chroma).toBe(0);
	});

	it('inert after done: gradeScaleTap on a done state returns correct false and the same state', () => {
		let state = createScaleKeyboardDrillState(majorScaleNotes('C'));
		for (const letter of ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C', 'B', 'A', 'G', 'F', 'E', 'D', 'C']) {
			state = gradeScaleTap(state, letter).state;
		}
		expect(state.done).toBe(true);

		const result = gradeScaleTap(state, 'C');
		expect(result.correct).toBe(false);
		expect(result.state).toEqual(state);
	});

	it('unparseable input does not throw and does not advance', () => {
		const state = createScaleKeyboardDrillState(majorScaleNotes('C'));

		const result = gradeScaleTap(state, 'H');

		expect(result.correct).toBe(false);
		expect(result.state.position).toBe(0);
	});

	it('createScaleKeyboardDrillState returns an inert empty state for non-7-note input', () => {
		const state = createScaleKeyboardDrillState(majorScaleNotes('C').slice(0, 5));

		expect(state.targets).toEqual([]);
		expect(state.position).toBe(0);
		expect(expectedTarget(state)).toBeNull();
	});

	it('createScaleKeyboardDrillState fails safe (empty targets) rather than defaulting an unparseable letter to chroma 0', () => {
		const notes = majorScaleNotes('C');
		const malformed = notes.map((note, index) =>
			index === 3 ? { ...note, letter: 'H' } : note
		);

		const state = createScaleKeyboardDrillState(malformed);

		expect(state.targets).toEqual([]);
		expect(expectedTarget(state)).toBeNull();
	});
});

describe('placeAscendingScaleKeys (ascending key placement on a fixed 2-octave board)', () => {
	it('C major: 8 placements, degree 1 at white keyIndex 0, degree 8 distinct at white keyIndex 7', () => {
		const placements = placeAscendingScaleKeys(majorScaleNotes('C'));

		expect(placements.length).toBe(8);
		expect(placements[0]).toMatchObject({ kind: 'white', keyIndex: 0, role: 'root' });
		expect(placements[7]).toMatchObject({ kind: 'white', keyIndex: 7, role: 'root' });
	});

	it('G major: tonic at white keyIndex 4, degree 7 (F♯) is black, octave distinct at white keyIndex 11', () => {
		const placements = placeAscendingScaleKeys(majorScaleNotes('G'));

		expect(placements[0]).toMatchObject({ kind: 'white', keyIndex: 4, role: 'root' });
		expect(placements[6]).toMatchObject({ kind: 'black' });
		expect(placements[7]).toMatchObject({ kind: 'white', keyIndex: 11, role: 'root' });
		expect(placements[7].keyIndex).not.toBe(placements[0].keyIndex);
	});

	it('F♯ major: tonic is black (leftmost highlighted), degree 7 (E♯) is white F key, octave is black and distinct', () => {
		const placements = placeAscendingScaleKeys(majorScaleNotes('F♯'));

		expect(placements[0]).toMatchObject({ kind: 'black' });
		expect(placements[6]).toMatchObject({ kind: 'white', keyIndex: 10 });
		expect(placements[7]).toMatchObject({ kind: 'black' });
		expect(placements[7]).not.toEqual(placements[0]);
	});

	it('returns [] for non-7-note input', () => {
		expect(placeAscendingScaleKeys(majorScaleNotes('C').slice(0, 5))).toEqual([]);
	});

	it('fails safe (returns []) rather than desyncing degree numbering when a letter is unparseable', () => {
		const notes = majorScaleNotes('C');
		const malformed = notes.map((note, index) => (index === 3 ? { ...note, letter: 'H' } : note));

		expect(placeAscendingScaleKeys(malformed)).toEqual([]);
	});
});
