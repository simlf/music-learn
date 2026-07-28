import { describe, it, expect } from 'vitest';
import { newCard, previewGrades, gradeCard, Rating, State } from './scheduler';
import type { Card } from './scheduler';

/**
 * Fixed instant so the day-scale intervals below are reproducible. Any fixed
 * ISO instant works; this one matches the phase's context-gathering date.
 *
 * Fuzz (enable_fuzz:true since T13) does not make these values random: ts-fsrs
 * seeds its fuzz PRNG from the card's own review time, reps, difficulty and
 * stability, so a fixed card at a fixed instant always yields the same
 * interval. What fuzz changes is that two DIFFERENT cards (or the same card at
 * a different instant) land on different days, which is the point. Where an
 * assertion below would be pinning a fuzz draw rather than a property of the
 * schedule, it asserts the fuzz WINDOW instead.
 */
const now0 = new Date('2026-07-15T00:00:00.000Z');

describe('scheduler', () => {
	it('newCard returns a New card due now', () => {
		const card = newCard(now0);
		expect(card.state).toBe(State.New);
		expect(card.due).toEqual(now0);
	});

	it('previewGrades returns exactly 4 entries in fixed order with the documented day intervals', () => {
		const card = newCard(now0);
		const previews = previewGrades(card, now0);
		expect(previews).toHaveLength(4);
		expect(previews.map((p) => p.rating)).toEqual([
			Rating.Again,
			Rating.Hard,
			Rating.Good,
			Rating.Easy
		]);
		expect(previews.map((p) => p.days)).toEqual([1, 2, 3, 8]);
	});

	it('previewGrades never mutates the input card', () => {
		const card = newCard(now0);
		const stateBefore = card.state;
		const dueBefore = card.due;
		previewGrades(card, now0);
		expect(card.state).toBe(stateBefore);
		expect(card.due).toEqual(dueBefore);
	});

	it('gradeCard Again on a New card schedules 1 day and graduates straight to Review', () => {
		const result = gradeCard(newCard(now0), Rating.Again, now0);
		expect(result.card.scheduled_days).toBe(1);
		expect(result.card.state).toBe(State.Review);
	});

	it('gradeCard Hard on a New card schedules 2 days', () => {
		const result = gradeCard(newCard(now0), Rating.Hard, now0);
		expect(result.card.scheduled_days).toBe(2);
	});

	it('gradeCard Good on a New card schedules 3 days', () => {
		const result = gradeCard(newCard(now0), Rating.Good, now0);
		expect(result.card.scheduled_days).toBe(3);
	});

	it('gradeCard Easy on a New card schedules 8 days', () => {
		const result = gradeCard(newCard(now0), Rating.Easy, now0);
		expect(result.card.scheduled_days).toBe(8);
	});

	/**
	 * This used to pin the chain to exactly [3, 14, 57, 196, 586]. With fuzz on
	 * (T13) the chain is still fully deterministic for a given card and instant,
	 * but the numbers past the second review compound their own fuzz - each
	 * step's stability is computed from the previous step's FUZZED elapsed days -
	 * so a single-step fuzz window is not a valid bound on step five, and exact
	 * values here would be pinning an implementation detail of the fuzz draw
	 * rather than a property of the schedule.
	 *
	 * The property the original test was really protecting is the GROWTH: five
	 * reviews take a card from days to years, with each interval several times
	 * the last. That is asserted directly, plus an order-of-magnitude bound so a
	 * genuine regression (a chain that flattens, or one that explodes past the
	 * maximum interval) still fails.
	 */
	it('a repeated Good chain from a New card grows from days to years, several-fold per review', () => {
		let card: Card = newCard(now0);
		let now = now0;
		const scheduledDaysSequence: number[] = [];

		for (let i = 0; i < 5; i++) {
			const result = gradeCard(card, Rating.Good, now);
			scheduledDaysSequence.push(result.card.scheduled_days);
			card = result.card;
			now = card.due;
		}

		expect(scheduledDaysSequence).toHaveLength(5);
		// The first return is the unfuzzable hard+1 clamp (see scheduler.ts).
		expect(scheduledDaysSequence[0]).toBe(3);
		for (let i = 1; i < scheduledDaysSequence.length; i++) {
			expect(scheduledDaysSequence[i]).toBeGreaterThan(scheduledDaysSequence[i - 1] * 2);
		}
		// Fifth review lands in the "over a year, under two" band the unfuzzed
		// schedule also produced; fuzz shifts it, it must not reshape it.
		expect(scheduledDaysSequence[4]).toBeGreaterThan(400);
		expect(scheduledDaysSequence[4]).toBeLessThan(900);
	});

	it('a lapse (Good then Again) contracts stability hard and stays in Review, never Relearning', () => {
		const goodResult = gradeCard(newCard(now0), Rating.Good, now0);
		expect(goodResult.card.stability).toBeCloseTo(2.3065, 3);
		expect(goodResult.card.state).toBe(State.Review);

		const lapseResult = gradeCard(goodResult.card, Rating.Again, goodResult.card.due);
		expect(lapseResult.card.stability).toBeCloseTo(0.63685, 4);
		expect(lapseResult.card.lapses).toBe(1);
		expect(lapseResult.card.state).toBe(State.Review);
	});
});

/**
 * T13 item 3: fuzz is on. These tests document exactly what that buys and what
 * it does not, measured against ts-fsrs 5.4.1 rather than assumed - the "spread
 * the same-day due pile" claim is easy to over-state, and the day-one cohort in
 * particular is NOT spread by this flag.
 */
describe('scheduler fuzz window', () => {
	/** 60 distinct review instants, one per second, standing in for one day's cohort of cards graded a few seconds apart. */
	function cohortInstants(count = 60): Date[] {
		const base = Date.UTC(2026, 6, 15, 9, 0, 0);
		return Array.from({ length: count }, (_, i) => new Date(base + i * 1000));
	}

	function firstGoodDays(instants: Date[]): number[] {
		return instants.map((now) => gradeCard(newCard(now), Rating.Good, now).card.scheduled_days);
	}

	it('is deterministic for a given card at a given instant (no run-to-run flakiness)', () => {
		const a = gradeCard(newCard(now0), Rating.Good, now0).card.scheduled_days;
		const b = gradeCard(newCard(now0), Rating.Good, now0).card.scheduled_days;
		expect(a).toBe(b);
	});

	it('leaves the sub-2.5-day intervals untouched: New+Again is always 1 day, New+Hard always 2', () => {
		for (const now of cohortInstants(20)) {
			expect(gradeCard(newCard(now), Rating.Again, now).card.scheduled_days).toBe(1);
			expect(gradeCard(newCard(now), Rating.Hard, now).card.scheduled_days).toBe(2);
		}
	});

	/**
	 * The honest limitation, pinned so nobody re-litigates it from the docblock
	 * alone: a whole day's cohort of NEW cards graded Good still returns on ONE
	 * day. ts-fsrs's long-term scheduler derives Good from max(good, hard + 1),
	 * and the raw Good interval for a New card is below the 2.5-day fuzz floor,
	 * so the 3 is a clamp and there is nothing for fuzz to move. Spreading the
	 * first return needs an intake lever (the daily intro budget, the
	 * due-backlog gate), not a scheduler flag.
	 */
	it('does NOT spread the first return of a new-card cohort: New+Good is exactly 3 days for every instant', () => {
		expect(new Set(firstGoodDays(cohortInstants()))).toEqual(new Set([3]));
	});

	it('DOES spread the second review: one cohort fans out across the 12-16 day window', () => {
		const secondReviewDays = cohortInstants().map((now) => {
			const first = gradeCard(newCard(now), Rating.Good, now).card;
			return gradeCard(first, Rating.Good, first.due).card.scheduled_days;
		});

		// More than one distinct day: the lump is genuinely broken up.
		expect(new Set(secondReviewDays).size).toBeGreaterThan(1);
		// And every value stays inside FSRS's own fuzz window for a 14-day interval.
		for (const days of secondReviewDays) {
			expect(days).toBeGreaterThanOrEqual(12);
			expect(days).toBeLessThanOrEqual(16);
		}
	});

	it('spreads New+Easy too, since its 8-day interval is above the fuzz floor', () => {
		const easyDays = cohortInstants().map(
			(now) => gradeCard(newCard(now), Rating.Easy, now).card.scheduled_days
		);
		expect(new Set(easyDays).size).toBeGreaterThan(1);
		for (const days of easyDays) {
			expect(days).toBeGreaterThanOrEqual(6);
			expect(days).toBeLessThanOrEqual(10);
		}
	});
});
