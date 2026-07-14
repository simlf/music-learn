import { describe, expect, it } from 'vitest';
import { createScaleDrillState, gradeTap, expectedLetter } from './scaleDrill';

const C_MAJOR = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

describe('scale drill state (sketch 004, ascending tap)', () => {
	it('starts at step 0, not done, expecting the first degree', () => {
		const state = createScaleDrillState(C_MAJOR);

		expect(state.step).toBe(0);
		expect(state.done).toBe(false);
		expect(state.wrongLetter).toBeNull();
		expect(expectedLetter(state)).toBe('C');
	});

	it('tapping degrees in order advances one step at a time and completes after all seven', () => {
		let state = createScaleDrillState(C_MAJOR);

		for (const letter of C_MAJOR) {
			const result = gradeTap(state, letter);
			expect(result.correct).toBe(true);
			state = result.state;
		}

		expect(state.step).toBe(7);
		expect(state.done).toBe(true);
	});

	it('reports each intermediate step correctly as taps land in order', () => {
		let state = createScaleDrillState(C_MAJOR);

		state = gradeTap(state, 'C').state;
		expect(state.step).toBe(1);
		expect(state.done).toBe(false);
		expect(expectedLetter(state)).toBe('D');

		state = gradeTap(state, 'D').state;
		expect(state.step).toBe(2);
		expect(expectedLetter(state)).toBe('E');
	});

	it('a wrong tap does not advance the step and flags the wrong letter', () => {
		const state = createScaleDrillState(C_MAJOR);

		const result = gradeTap(state, 'G');

		expect(result.correct).toBe(false);
		expect(result.state.step).toBe(0);
		expect(result.state.wrongLetter).toBe('G');
	});

	it('an out-of-order tap (skipping ahead) is wrong even though the letter is in the scale', () => {
		let state = createScaleDrillState(C_MAJOR);
		state = gradeTap(state, 'C').state; // step 1, expecting D

		const result = gradeTap(state, 'E'); // skips D

		expect(result.correct).toBe(false);
		expect(result.state.step).toBe(1);
		expect(result.state.wrongLetter).toBe('E');
	});

	it('a correct tap clears any previously flagged wrong letter', () => {
		let state = createScaleDrillState(C_MAJOR);
		state = gradeTap(state, 'X').state;
		expect(state.wrongLetter).toBe('X');

		state = gradeTap(state, 'C').state;
		expect(state.wrongLetter).toBeNull();
	});

	it('once done, further taps are inert (no crash, stays done)', () => {
		let state = createScaleDrillState(C_MAJOR);
		for (const letter of C_MAJOR) {
			state = gradeTap(state, letter).state;
		}
		expect(state.done).toBe(true);

		const result = gradeTap(state, 'C');
		expect(result.correct).toBe(false);
		expect(result.state.done).toBe(true);
		expect(result.state.step).toBe(7);
	});

	it('expectedLetter returns null once the drill is done', () => {
		let state = createScaleDrillState(C_MAJOR);
		for (const letter of C_MAJOR) {
			state = gradeTap(state, letter).state;
		}

		expect(expectedLetter(state)).toBeNull();
	});
});
