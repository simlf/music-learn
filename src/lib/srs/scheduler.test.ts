import { describe, it, expect } from 'vitest';
import { newCard, previewGrades, gradeCard, Rating, State } from './scheduler';
import type { Card } from './scheduler';

/**
 * Fixed instant so the day-scale intervals below are exact and reproducible
 * (enable_fuzz:false, D-02). Any fixed ISO instant works; this one matches
 * the phase's context-gathering date.
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

	it('a repeated Good chain from a New card grows 3 -> 14 -> 57 -> 196 -> 586 scheduled days', () => {
		let card: Card = newCard(now0);
		let now = now0;
		const scheduledDaysSequence: number[] = [];

		for (let i = 0; i < 5; i++) {
			const result = gradeCard(card, Rating.Good, now);
			scheduledDaysSequence.push(result.card.scheduled_days);
			card = result.card;
			now = card.due;
		}

		expect(scheduledDaysSequence).toEqual([3, 14, 57, 196, 586]);
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
