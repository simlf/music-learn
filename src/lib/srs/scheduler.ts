import { createEmptyCard, fsrs, generatorParameters, Rating, State } from 'ts-fsrs';
import type { Card, Grade } from 'ts-fsrs';

/**
 * The app's single ts-fsrs seam (mirrors src/lib/audio/audio.ts isolating
 * Tone.js): every other module in this phase imports Rating/State/Card from
 * here, never from 'ts-fsrs' directly (single-seam encapsulation, D-03).
 *
 * enable_short_term:false is the load-bearing config (D-02) — the ts-fsrs
 * default (true) gives sub-day learning steps (New+Good due in ~10 minutes),
 * which breaks a once-a-day recall app. With it off, intervals stay on a
 * day scale (New+Again=1d, Hard=2d, Good=3d, Easy=8d) and a New+Again
 * graduates straight to Review, never Relearning.
 *
 * enable_fuzz:false keeps the scheduled_days math deterministic for tests
 * (revisit later to spread same-day due piles once correctness is proven).
 *
 * Pure module: no DOM, no Svelte, no Dexie. Persistence lives in deck.ts.
 */

export { Rating, State };
export type { Card };

/** One entry per Rating, describing what committing that grade would do. */
export interface GradePreview {
	rating: Rating;
	days: number;
	card: Card;
}

const scheduler = fsrs(
	generatorParameters({
		enable_short_term: false,
		request_retention: 0.9,
		enable_fuzz: false
	})
);

/** Fixed rating order for previewGrades output (matches grade-button layout). */
const PREVIEW_ORDER: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy];

/** A brand-new card, state New, due now. */
export function newCard(now: Date = new Date()): Card {
	return createEmptyCard(now);
}

/**
 * Computes all four rating outcomes without committing (D-04 preview via
 * ts-fsrs's repeat(), never next()). `days` is read directly from ts-fsrs's
 * own `scheduled_days` field on the previewed card, not hand-rolled from
 * due-date subtraction (D-09 avoids the Date-rehydration-shaped footgun).
 */
export function previewGrades(card: Card, now: Date = new Date()): GradePreview[] {
	const recordLog = scheduler.repeat(card, now);
	return PREVIEW_ORDER.map((rating) => ({
		rating,
		days: recordLog[rating].card.scheduled_days,
		card: recordLog[rating].card
	}));
}

/**
 * Commits a rating (D-04 commit path), a thin wrapper over scheduler.next().
 * `rating` is typed as the full Rating enum to match this module's public
 * re-export surface; ts-fsrs's own Grade type (Rating minus Manual) is what
 * next() actually accepts, and Manual is never a meaningful commit here.
 */
export function gradeCard(
	card: Card,
	rating: Rating,
	now: Date = new Date()
): { card: Card; log: unknown } {
	return scheduler.next(card, now, rating as Grade);
}
