/**
 * The /practice game layer (ml-practice-game): a few short challenges beside
 * the daily round, rotating which one is "today's pick" each day.
 *
 *   - Sprint: 60 seconds, a chord symbol at a time, tap its notes from four
 *     spellings. A run of right answers raises a combo multiplier.
 *   - Ear duel: ten chords by ear, tap the name from four same-root choices
 *     (the hear-name question, played for a score and an in-round streak).
 *   - Key climb: one chord quality around the circle of fifths, all twelve
 *     keys, played on the on-screen keyboard against your own best time.
 *
 * Every challenge is answerable by tapping on a phone held in one hand: the
 * sprint and the duel are four-chip grids, the climb is the same on-screen
 * keyboard + Check the see-play card uses. No challenge needs a piano or a
 * MIDI device, and the ear duel only needs sound (headphones are fine).
 *
 * CHALLENGES NEVER TOUCH THE DECK. Nothing here or in the challenge
 * components imports srs/deck or writes an FSRS grade: a sprint answer is
 * graded under a clock, and a fast tap is a different signal from the
 * unhurried recall FSRS schedules on, so letting it reach the scheduler would
 * reschedule cards on evidence the scheduler was never calibrated for. The
 * daily round stays the only writer of FSRS state. Challenges also post no
 * answer telemetry (/answers accuracy is the daily round's identification
 * accuracy, which /progress reads to pick weak chords).
 *
 * Pure module: no DOM, no Svelte, no storage, no audio. `random` parameters
 * default to Math.random so a test can pin a draw.
 */

import { pickDistractors } from '$lib/drills/generateQuestion';
import { chromaOf } from '$lib/theory/interval';
import { ROOTS } from '$lib/theory/randomChord';
import { FIFTHS_CYCLE } from './circleOfFifths';
import type { LevelState } from './levelState';
import { TIERS, itemsForTiers, type TierId } from './tiers';

export type ChallengeId = 'sprint' | 'ear-duel' | 'key-climb';

export const CHALLENGE_IDS: readonly ChallengeId[] = ['sprint', 'ear-duel', 'key-climb'];

/** How long a sprint runs. */
export const SPRINT_SECONDS = 60;

/** Chords in one ear duel. */
export const EAR_DUEL_ROUNDS = 10;

/** Points one right sprint answer is worth before its multiplier. */
export const SPRINT_POINTS = 10;

/** Right answers in a row per multiplier step: x1 for the first three, x2 for the next three... */
export const COMBO_STEP = 3;

/** The multiplier stops climbing here, so one long run cannot dwarf every other sprint. */
export const MAX_MULTIPLIER = 4;

/**
 * The multiplier a right answer earns when it is the `streak`-th right answer
 * in a row (1 for the first). A miss resets the in-round streak to zero and so
 * the multiplier back to x1, and that is the whole cost of a miss: no points
 * are taken away.
 */
export function comboMultiplier(streak: number): number {
	if (streak < 1) return 1;
	return Math.min(MAX_MULTIPLIER, 1 + Math.floor((streak - 1) / COMBO_STEP));
}

/** Days since 1970-01-01 for a local 'YYYY-MM-DD' date, the rotation's clock. NaN-safe: bad input reads as day 0. */
export function dayNumber(date: string): number {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
	if (match === null) return 0;
	const days = Math.floor(
		Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000
	);
	return Number.isFinite(days) ? days : 0;
}

/**
 * The challenges in today's order: the first is today's pick, and the pick
 * moves to the next challenge each day. All of them stay playable every day;
 * the rotation only changes which one leads, so a day without play costs
 * nothing and there is nothing to "miss".
 */
export function challengeOrder(date: string): ChallengeId[] {
	const offset = dayNumber(date) % CHALLENGE_IDS.length;
	return [...CHALLENGE_IDS.slice(offset), ...CHALLENGE_IDS.slice(0, offset)];
}

/** Every tier the user has been offered: at or below the current tier, plus any reached before a move back down. */
export function reachedTiers(level: LevelState): TierId[] {
	const reached = new Set<TierId>(level.unlockedTiers);
	for (const tier of TIERS) {
		if (tier.available && tier.id <= level.currentTier) reached.add(tier.id);
	}
	return [...reached].sort((a, b) => a - b);
}

/**
 * The chords a sprint or ear duel draws from: every chord of every reached
 * tier, so a challenge never quizzes material the deck has not opened yet. A
 * tier opening (the unlock moment) is therefore also new material for every
 * challenge.
 */
export function challengePool(level: LevelState): string[] {
	return itemsForTiers(reachedTiers(level));
}

/** The qualities of every reached tier, in ladder order, deduped. */
export function reachedQualities(level: LevelState): string[] {
	const qualities: string[] = [];
	for (const id of reachedTiers(level)) {
		const tier = TIERS.find((candidate) => candidate.id === id);
		for (const quality of tier?.qualities ?? []) {
			if (!qualities.includes(quality)) qualities.push(quality);
		}
	}
	return qualities;
}

/**
 * Today's key climb quality: the reached qualities in turn, one per day, so the
 * climb is a different chord type most days and a newly opened tier's
 * qualities join the rotation at once.
 */
export function keyClimbQuality(date: string, level: LevelState): string {
	const qualities = reachedQualities(level);
	if (qualities.length === 0) return '';
	return qualities[dayNumber(date) % qualities.length];
}

/**
 * The twelve climb stops for `quality`: falling fifths from C (the direction a
 * ii-V-I's roots move, circleOfFifths' default), each root spelled the way the
 * chord catalog spells it (ROOTS: B♭ as "Bb", F♯ as "F#"), so every stop is a
 * catalog chord symbol.
 */
export function keyClimbStops(quality: string): string[] {
	return FIFTHS_CYCLE.map((key) => {
		const chroma = chromaOf(key);
		const root = ROOTS.find((candidate) => chromaOf(candidate) === chroma) ?? key;
		return `${root}${quality}`;
	});
}

export interface ChipQuestion {
	/** The chord being asked. */
	symbol: string;
	/** Four chord symbols, the answer among them, shuffled. */
	choices: string[];
}

/**
 * One four-choice question for the sprint or the ear duel: a chord from
 * `pool` (never `previous` when the pool allows it) and three same-root
 * distractors (pickDistractors, the same draw NAME IT and HEAR IT use, so a
 * triad competes with triads and a seventh chord with sevenths). Undefined
 * only for an empty pool.
 */
export function chipQuestion(
	pool: readonly string[],
	previous?: string,
	random: () => number = Math.random
): ChipQuestion | undefined {
	if (pool.length === 0) return undefined;
	const candidates = pool.length > 1 ? pool.filter((symbol) => symbol !== previous) : [...pool];
	const symbol = candidates[Math.floor(random() * candidates.length) % candidates.length];
	const choices = [symbol, ...pickDistractors(symbol)];
	for (let i = choices.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[choices[i], choices[j]] = [choices[j], choices[i]];
	}
	return { symbol, choices };
}

/** "1:07" for a duration in milliseconds, floored to the second. */
export function formatClock(ms: number): string {
	const totalSeconds = Math.max(0, Math.floor(ms / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
