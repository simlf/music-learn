import { chromaOf } from '$lib/theory/interval';
import { SHELL_CYCLE_KEYS } from './shellCycle';

/**
 * Pure engine for chapter 16, the circle of fifths
 * (`.planning/design/method-book.md`): the 12 keys as a cycle you can walk,
 * so "what comes next" and "how far apart" become questions with one answer.
 *
 * DOWN a fifth (the same as up a fourth) is the direction a ii-V-I's roots
 * move and the direction jazz harmony mostly travels, so it is the default.
 * UP a fifth is the sharp side of the circle diagram: C, G, D, A, E, B, F♯.
 *
 * The cycle is `SHELL_CYCLE_KEYS.major`, the app's one cycle-of-fourths key
 * list (chapter 15 walks it), read rather than redefined. `MAJOR_SCALE_ROOTS`
 * is NOT reusable here: it is in chromatic order (C, D♭, D, E♭...), not
 * fifths order.
 *
 * Every answer is graded by pitch class (`chromaOf`), so F♯ and G♭ are the
 * same stop. Display spelling follows the circle diagram: the flat side going
 * down (G♭ after D♭), the sharp side going up (F♯ after B).
 *
 * Pure module: no DOM, no Svelte, no audio, no storage. Total functions: bad
 * input yields `undefined` or an empty result, never a throw.
 */

export type CycleDirection = 'down' | 'up';

export const CYCLE_DIRECTIONS: readonly CycleDirection[] = ['down', 'up'];

/** The 12 keys in falling-fifths order from C, the order every function here walks. */
export const FIFTHS_CYCLE: readonly string[] = SHELL_CYCLE_KEYS.major;

/** The one pitch class the circle diagram spells two ways: F♯ on the sharp side, G♭ on the flat side. */
const SEAM_CHROMA = 6;

/** Hops in one round of "predict the next stop": four bars on the strip, the start plus three answers. */
export const HOPS_PER_ROUND = 3;

/** Rounds in one lap: 4 rounds of 3 hops walk all 12 keys and land back on the start. */
export const ROUNDS_PER_LAP = FIFTHS_CYCLE.length / HOPS_PER_ROUND;

/** Index of `root` in FIFTHS_CYCLE by pitch class, or undefined for an unrecognized root. */
function cycleIndex(root: string): number | undefined {
	const chroma = chromaOf(root);
	if (chroma === undefined) return undefined;
	const index = FIFTHS_CYCLE.findIndex((key) => chromaOf(key) === chroma);
	return index === -1 ? undefined : index;
}

/** The cycle key at `index` (any integer, wrapped), spelled for `direction`. */
function keyAt(index: number, direction: CycleDirection): string {
	const length = FIFTHS_CYCLE.length;
	const key = FIFTHS_CYCLE[((index % length) + length) % length];
	return direction === 'up' && chromaOf(key) === SEAM_CHROMA ? 'F♯' : key;
}

/** The key `steps` fifths from `root` in `direction` (0 returns the root respelled). Undefined for an unrecognized root. */
export function stepsFrom(root: string, steps: number, direction: CycleDirection): string | undefined {
	const index = cycleIndex(root);
	if (index === undefined || !Number.isInteger(steps)) return undefined;
	return keyAt(direction === 'down' ? index + steps : index - steps, direction);
}

/** The next stop one fifth from `root` in `direction`. Undefined for an unrecognized root. */
export function nextInCycle(root: string, direction: CycleDirection): string | undefined {
	return stepsFrom(root, 1, direction);
}

/** True when `answer` is the same pitch class as `expected`. An unrecognized letter is never right. */
export function isSameStop(answer: string, expected: string): boolean {
	const played = chromaOf(answer);
	return played !== undefined && played === chromaOf(expected);
}

/**
 * The stops of one round: `start` (respelled for the direction), then `hops`
 * more, each a fifth from the last. Empty for an unrecognized start.
 */
export function cycleRound(start: string, direction: CycleDirection, hops = HOPS_PER_ROUND): string[] {
	if (cycleIndex(start) === undefined || !Number.isInteger(hops) || hops < 0) return [];
	const stops: string[] = [];
	for (let step = 0; step <= hops; step++) {
		const stop = stepsFrom(start, step, direction);
		if (stop !== undefined) stops.push(stop);
	}
	return stops;
}

/**
 * Four name chips for "what is the next stop": the right answer, the
 * neighbour in the other direction (the classic up/down mix-up), the stop
 * two fifths on (a skipped step), and the stop two fifths back. All four are
 * distinct pitch classes. `random` shuffles them; the default is Math.random.
 * Empty for an unrecognized root.
 */
export function nextStopChoices(
	root: string,
	direction: CycleDirection,
	random: () => number = Math.random
): string[] {
	const index = cycleIndex(root);
	if (index === undefined) return [];
	const sign = direction === 'down' ? 1 : -1;
	const choices = [1, -1, 2, -2].map((offset) => keyAt(index + offset * sign, direction));
	return shuffle(choices, random);
}

function shuffle<T>(items: T[], random: () => number): T[] {
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.min(i, Math.floor(random() * (i + 1)));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

/**
 * How far apart two keys are on the circle: the shorter way round, as a count
 * of fifths and the direction from `from` to `to`. `direction` is null when
 * the keys are the same (0) or a tritone apart (6, the same distance both
 * ways). Undefined for an unrecognized key.
 */
export function fifthsBetween(
	from: string,
	to: string
): { steps: number; direction: CycleDirection | null } | undefined {
	const a = cycleIndex(from);
	const b = cycleIndex(to);
	if (a === undefined || b === undefined) return undefined;
	const length = FIFTHS_CYCLE.length;
	const down = (((b - a) % length) + length) % length;
	if (down === 0) return { steps: 0, direction: null };
	if (down === length / 2) return { steps: down, direction: null };
	return down < length / 2 ? { steps: down, direction: 'down' } : { steps: length - down, direction: 'up' };
}

/** The counts the "how far apart" mode asks about: not neighbours (1), not the two-way tritone (6). */
export const DISTANCE_STEPS: readonly number[] = [2, 3, 4, 5];

export interface DistanceQuestion {
	from: string;
	to: string;
	steps: number;
	direction: CycleDirection;
	/** Every stop from `from` to `to`, both included, the shorter way round. */
	path: string[];
}

/**
 * A "how many fifths apart, and which way" question: two keys 2 to 5 fifths
 * apart, so there is always one shorter way round. `random` picks the start,
 * the count and the direction; the default is Math.random.
 */
export function distanceQuestion(random: () => number = Math.random): DistanceQuestion {
	const pick = <T>(items: readonly T[]): T => items[Math.min(items.length - 1, Math.floor(random() * items.length))];
	const direction = pick(CYCLE_DIRECTIONS);
	const from = keyAt(FIFTHS_CYCLE.indexOf(pick(FIFTHS_CYCLE)), direction);
	const steps = pick(DISTANCE_STEPS);
	const path = cycleRound(from, direction, steps);
	return { from, to: path[path.length - 1], steps, direction, path };
}
