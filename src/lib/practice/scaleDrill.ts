/**
 * Pure logic for the "play the scale ascending" drill (sketch 004, winner A:
 * degree ladder). Models tapping a scale's seven degrees bottom to top: a
 * correct tap on the expected next degree advances the step, anything else
 * (wrong letter, or the right letter out of order) is flagged wrong and does
 * not advance. No DOM, no audio, no Svelte: ScalePractice.svelte owns
 * rendering and sound, this module owns the state machine.
 */

export interface ScaleDrillState {
	/** The seven degree letters in ascending order, degree 1 first. */
	letters: string[];
	/** Index of the next expected degree; equals letters.length when done. */
	step: number;
	/** True once all seven degrees have been tapped in order. */
	done: boolean;
	/** The most recently mis-tapped letter, for a flash cue; cleared on the next correct tap. */
	wrongLetter: string | null;
}

export interface GradeResult {
	/** Whether the tap matched the expected next degree. */
	correct: boolean;
	/** The new state to store; always a fresh object, never mutated in place. */
	state: ScaleDrillState;
}

/** Fresh drill state for a scale's seven degree letters, ready for the first tap. */
export function createScaleDrillState(letters: string[]): ScaleDrillState {
	return { letters: [...letters], step: 0, done: false, wrongLetter: null };
}

/** The letter the drill currently expects next, or null once done. */
export function expectedLetter(state: ScaleDrillState): string | null {
	if (state.done) return null;
	return state.letters[state.step] ?? null;
}

/**
 * Grades one tap against the current state. A correct tap is exactly the
 * expected next letter (out-of-order taps of an otherwise-valid letter are
 * still wrong): advances the step, clears any flagged wrong letter, and
 * flips to done after the seventh degree. A wrong tap leaves step untouched
 * and records the tapped letter so the UI can flash it. Taps after done are
 * inert.
 */
export function gradeTap(state: ScaleDrillState, tappedLetter: string): GradeResult {
	if (state.done) {
		return { correct: false, state };
	}

	if (tappedLetter === expectedLetter(state)) {
		const step = state.step + 1;
		const done = step >= state.letters.length;
		return {
			correct: true,
			state: { ...state, step, done, wrongLetter: null }
		};
	}

	return {
		correct: false,
		state: { ...state, wrongLetter: tappedLetter }
	};
}
