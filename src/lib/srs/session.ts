import { Rating } from '$lib/srs/scheduler';

/**
 * Pure in-memory session-queue math and day-interval label formatting for
 * the reveal-then-grade review session (11-05 RecallSession UI consumes
 * this module). No Dexie, Svelte, or DOM imports here.
 *
 * The only dependency on the SRS scheduler seam (11-01) is the Rating
 * enum this module branches on for the Anki-style "re-enqueue Again cards
 * within the session" behavior (CONTEXT.md D-10) — this module has no
 * dependency on $lib/srs/deck or $lib/srs/facts, so it operates on any
 * {factId, mode}-shaped queue item regardless of storage layer.
 */

/** One item in the in-memory session queue: identifies a (fact, mode) card. */
export interface QueueItem {
	factId: string;
	mode: string;
}

/** A defensive copy of the given due cards, in the same order. */
export function buildQueue(dueCards: QueueItem[]): QueueItem[] {
	return [...dueCards];
}

/**
 * Removes the front item of the queue. Re-enqueues it at the back only
 * when `rating === Rating.Again` (D-10: the "N LEFT TODAY" register never
 * decrements below its pre-re-enqueue value on an Again grade). Every
 * other grade removes the item without re-enqueueing.
 *
 * Never mutates the input queue array; always returns a new array.
 */
export function advanceQueue(queue: QueueItem[], rating: Rating): QueueItem[] {
	if (queue.length === 0) {
		return queue;
	}

	const [current, ...rest] = queue;
	return rating === Rating.Again ? [...rest, current] : rest;
}

/** True once the queue has no items left to grade. */
export function isSessionComplete(queue: QueueItem[]): boolean {
	return queue.length === 0;
}

/** The "N LEFT TODAY" register count. */
export function sessionRemaining(queue: QueueItem[]): number {
	return queue.length;
}

/**
 * Formats a scheduled-days number into the UI-SPEC's exact grade-button
 * interval tag, per the three-band rounding rule:
 *   days < 14      -> "{round(days)}d"
 *   14 <= days < 60 -> "{round(days/7)}w"
 *   days >= 60      -> "{round(days/30)}mo"
 */
export function formatDayInterval(days: number): string {
	if (days < 14) {
		return `${Math.round(days)}d`;
	}
	if (days < 60) {
		return `${Math.round(days / 7)}w`;
	}
	return `${Math.round(days / 30)}mo`;
}
