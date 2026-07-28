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
 * enable_fuzz:true (T13, the revisit this comment used to promise): without
 * fuzz, every card graded the same way on the same day comes back on ONE day,
 * so a daily cohort of new cards stays a lump forever - avalanche days next to
 * empty days. Fuzz randomizes each interval within the FSRS fuzz window, so a
 * cohort fans out instead of marching in step. It is seeded from the card's own
 * review time, reps, difficulty and stability (ts-fsrs's DefaultInitSeedStrategy),
 * so a given card at a given instant is still deterministic - fuzz adds spread
 * across cards, not run-to-run flakiness.
 *
 * What fuzz does and does NOT reach, measured against ts-fsrs 5.4.1 rather than
 * assumed, because it is easy to over-claim here:
 *   - Below 2.5 days, apply_fuzz returns the interval untouched. So New+Again
 *     (1d) and New+Hard (2d) are exactly as before.
 *   - New+Good stays exactly 3 days too, and NOT because of the floor: the
 *     LongTermScheduler derives Good from `max(good, hard + 1)`, and the raw
 *     Good interval for a New card (~2d) is under the floor, so the 3 is the
 *     clamp, not a fuzzable number. The first return of a day-one cohort is
 *     therefore still a single day; spreading THAT needs an intake lever (the
 *     daily intro budget and the due-backlog gate), not a scheduler flag.
 *   - From the second review on, fuzz bites properly: the 14-day Good becomes a
 *     12-16 day window, and windows widen from there. That is where a cohort
 *     actually separates, and it compounds every review after it.
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
		enable_fuzz: true
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
