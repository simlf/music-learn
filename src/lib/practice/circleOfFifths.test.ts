import { describe, expect, it } from 'vitest';
import { chromaOf } from '$lib/theory/interval';
import { MAJOR_SCALE_ROOTS } from '$lib/theory/scale';
import { SHELL_CYCLE_KEYS } from './shellCycle';
import {
	DISTANCE_STEPS,
	FIFTHS_CYCLE,
	HOPS_PER_ROUND,
	ROUNDS_PER_LAP,
	cycleRound,
	distanceQuestion,
	fifthsBetween,
	isSameStop,
	nextInCycle,
	nextStopChoices,
	stepsFrom
} from './circleOfFifths';

const chroma = (letter: string) => chromaOf(letter)!;

/** A deterministic stand-in for Math.random cycling through `values`. */
function sequence(...values: number[]): () => number {
	let i = 0;
	return () => values[i++ % values.length];
}

describe('FIFTHS_CYCLE', () => {
	it('is the app cycle-of-fourths list, not a second one', () => {
		expect(FIFTHS_CYCLE).toBe(SHELL_CYCLE_KEYS.major);
	});

	it('covers all 12 pitch classes, each a fifth below the last', () => {
		expect(new Set(FIFTHS_CYCLE.map(chroma)).size).toBe(12);
		for (let i = 0; i < FIFTHS_CYCLE.length; i++) {
			const next = FIFTHS_CYCLE[(i + 1) % FIFTHS_CYCLE.length];
			// Down a fifth = up a fourth = +5 semitones.
			expect((chroma(next) - chroma(FIFTHS_CYCLE[i]) + 12) % 12).toBe(5);
		}
	});

	it('is why MAJOR_SCALE_ROOTS is not reused: that list is chromatic', () => {
		for (let i = 1; i < MAJOR_SCALE_ROOTS.length; i++) {
			expect((chroma(MAJOR_SCALE_ROOTS[i]) - chroma(MAJOR_SCALE_ROOTS[i - 1]) + 12) % 12).toBe(1);
		}
	});

	it('walks the whole cycle in whole rounds', () => {
		expect(HOPS_PER_ROUND * ROUNDS_PER_LAP).toBe(12);
	});
});

describe('nextInCycle', () => {
	it('goes down a fifth: the ii V I direction', () => {
		expect(nextInCycle('C', 'down')).toBe('F');
		expect(nextInCycle('F', 'down')).toBe('B♭');
		expect(nextInCycle('D♭', 'down')).toBe('G♭');
		expect(nextInCycle('G', 'down')).toBe('C');
	});

	it('goes up a fifth on the sharp side, spelling the seam F♯', () => {
		expect(nextInCycle('C', 'up')).toBe('G');
		expect(nextInCycle('E', 'up')).toBe('B');
		expect(nextInCycle('B', 'up')).toBe('F♯');
		expect(nextInCycle('F♯', 'up')).toBe('D♭');
		expect(nextInCycle('F', 'up')).toBe('C');
	});

	it('takes any enharmonic or ASCII spelling of the root', () => {
		expect(nextInCycle('F#', 'down')).toBe('B');
		expect(nextInCycle('Gb', 'down')).toBe('B');
		expect(nextInCycle('C♯', 'down')).toBe('G♭');
		expect(nextInCycle('Cb', 'up')).toBe('F♯');
	});

	it('is total: an unrecognized root yields undefined, never a throw', () => {
		expect(nextInCycle('Q', 'down')).toBeUndefined();
		expect(nextInCycle('', 'up')).toBeUndefined();
	});

	it('is undone by the other direction, for every key', () => {
		for (const key of FIFTHS_CYCLE) {
			expect(isSameStop(nextInCycle(nextInCycle(key, 'down')!, 'up')!, key)).toBe(true);
		}
	});
});

describe('stepsFrom', () => {
	it('counts several fifths at once, wrapping round the circle', () => {
		expect(stepsFrom('C', 3, 'down')).toBe('E♭');
		expect(stepsFrom('C', 12, 'down')).toBe('C');
		expect(stepsFrom('C', 6, 'up')).toBe('F♯');
		expect(stepsFrom('C', 6, 'down')).toBe('G♭');
		expect(stepsFrom('C', 0, 'down')).toBe('C');
	});

	it('refuses a non-integer step count and an unknown root', () => {
		expect(stepsFrom('C', 1.5, 'down')).toBeUndefined();
		expect(stepsFrom('X', 1, 'down')).toBeUndefined();
	});
});

describe('isSameStop', () => {
	it('grades by pitch class', () => {
		expect(isSameStop('G♭', 'F♯')).toBe(true);
		expect(isSameStop('A#', 'B♭')).toBe(true);
		expect(isSameStop('B', 'B♭')).toBe(false);
	});

	it('never grades an unrecognized letter right', () => {
		expect(isSameStop('Q', 'C')).toBe(false);
		expect(isSameStop('Q', 'Q')).toBe(false);
	});
});

describe('cycleRound', () => {
	it('chains three hops by default: C, F, B♭, E♭', () => {
		expect(cycleRound('C', 'down')).toEqual(['C', 'F', 'B♭', 'E♭']);
		expect(cycleRound('C', 'up')).toEqual(['C', 'G', 'D', 'A']);
	});

	it('chains from where the last round stopped, back to the start after a lap', () => {
		let start = 'C';
		const seen: string[] = [];
		for (let round = 0; round < ROUNDS_PER_LAP; round++) {
			const stops = cycleRound(start, 'down');
			seen.push(...stops.slice(0, -1));
			start = stops[stops.length - 1];
		}
		expect(start).toBe('C');
		expect(seen).toEqual([...FIFTHS_CYCLE]);
	});

	it('respells the start for the direction', () => {
		expect(cycleRound('G♭', 'up', 1)).toEqual(['F♯', 'D♭']);
	});

	it('is total', () => {
		expect(cycleRound('nope', 'down')).toEqual([]);
		expect(cycleRound('C', 'down', -1)).toEqual([]);
	});
});

describe('nextStopChoices', () => {
	it('offers the right answer and three distinct near misses', () => {
		const choices = nextStopChoices('C', 'down', () => 0.5);
		expect([...choices].sort()).toEqual(['B♭', 'D', 'F', 'G'].sort());
	});

	it('mirrors the near misses going up', () => {
		const choices = nextStopChoices('C', 'up', () => 0.5);
		expect([...choices].sort()).toEqual(['B♭', 'D', 'F', 'G'].sort());
		expect(choices).toContain(nextInCycle('C', 'up'));
	});

	it('gives four distinct pitch classes, the right one included, from every key both ways', () => {
		for (const key of FIFTHS_CYCLE) {
			for (const direction of ['down', 'up'] as const) {
				const choices = nextStopChoices(key, direction, sequence(0.1, 0.9, 0.4));
				expect(new Set(choices.map(chroma)).size).toBe(4);
				expect(choices.some((choice) => isSameStop(choice, nextInCycle(key, direction)!))).toBe(true);
			}
		}
	});

	it('is total', () => {
		expect(nextStopChoices('?', 'down')).toEqual([]);
	});
});

describe('fifthsBetween', () => {
	it('counts the shorter way round and names the direction', () => {
		expect(fifthsBetween('C', 'E♭')).toEqual({ steps: 3, direction: 'down' });
		expect(fifthsBetween('C', 'A')).toEqual({ steps: 3, direction: 'up' });
		expect(fifthsBetween('E', 'C')).toEqual({ steps: 4, direction: 'down' });
		expect(fifthsBetween('D', 'C')).toEqual({ steps: 2, direction: 'down' });
	});

	it('has no direction for the same key or the tritone', () => {
		expect(fifthsBetween('C', 'C')).toEqual({ steps: 0, direction: null });
		expect(fifthsBetween('C', 'F♯')).toEqual({ steps: 6, direction: null });
		expect(fifthsBetween('C', 'Gb')).toEqual({ steps: 6, direction: null });
	});

	it('is total', () => {
		expect(fifthsBetween('C', 'Z')).toBeUndefined();
		expect(fifthsBetween('Z', 'C')).toBeUndefined();
	});
});

describe('distanceQuestion', () => {
	it('always asks a non-adjacent, non-tritone distance that fifthsBetween agrees with', () => {
		const values = [0, 0.13, 0.27, 0.41, 0.55, 0.69, 0.83, 0.97, 0.999];
		for (const a of values) {
			for (const b of values) {
				const question = distanceQuestion(sequence(a, b, (a + b) / 2));
				expect(DISTANCE_STEPS).toContain(question.steps);
				expect(fifthsBetween(question.from, question.to)).toEqual({
					steps: question.steps,
					direction: question.direction
				});
				expect(question.path).toHaveLength(question.steps + 1);
				expect(question.path[0]).toBe(question.from);
				expect(question.path[question.path.length - 1]).toBe(question.to);
			}
		}
	});
});
