/**
 * Y1 consolidation: the shared per-question telemetry clock. `/practice`'s
 * `questionShownAt` and `RecallSession`'s own field of the same name each
 * kept an identical plain (non-reactive) `Date.now()` snapshot-then-diff
 * pattern, stamped when a question becomes current and read at grade time to
 * compute `durationMs` for `recordPracticeAnswer`. Named and shared here so
 * the one idiom has one definition instead of two copies to keep in sync.
 */

/** Stamps "now" as a question's start time. Call when a fresh question becomes current. */
export function startQuestionClock(): number {
	return Date.now();
}

/** Milliseconds elapsed since `startedAt` (a `startQuestionClock()` result). */
export function elapsedSinceQuestionStart(startedAt: number): number {
	return Date.now() - startedAt;
}
