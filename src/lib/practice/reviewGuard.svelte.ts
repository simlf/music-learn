/**
 * Y1 consolidation: the shared in-flight grade guard. `/practice`'s
 * `completeCarded` and `RecallSession`'s `handleGrade` each kept their own
 * `grading` boolean + try/finally (documented in `/practice` as mirroring
 * "RecallSession.svelte's own `grading` flag"), guarding the same hazard: a
 * double-tap before the first `recordGrade` await resolves must never
 * double-commit an FSRS grade, double-count a score register, or
 * double-advance a queue.
 *
 * A `.svelte.ts` module (not plain `.ts`) so `active` below is genuinely
 * reactive per instance, mirroring `srs/dueBadge.svelte.ts` /
 * `i18n/locale.svelte.ts`'s established pattern - the difference here is a
 * per-call FACTORY (each caller needs its own independent guard, not one
 * shared module-level flag) rather than shared module state.
 */

export interface GradeGuard {
	/** True while a guarded run is in flight. Read this from a template (e.g. `disabled={guard.active}`) for reactive UI. */
	readonly active: boolean;
	/**
	 * Runs `fn` unless a previous run is still in flight, in which case this
	 * is a no-op that resolves to `undefined` without calling `fn` at all -
	 * the exact "double-tap is silently dropped" contract both call sites
	 * relied on. `active` is guaranteed reset (even if `fn` throws) before
	 * this returns.
	 */
	run<T>(fn: () => Promise<T>): Promise<T | undefined>;
}

/** Creates one independent in-flight guard. Call once per component instance, not once per app. */
export function createGradeGuard(): GradeGuard {
	let active = $state(false);
	return {
		get active() {
			return active;
		},
		async run<T>(fn: () => Promise<T>): Promise<T | undefined> {
			if (active) return undefined;
			active = true;
			try {
				return await fn();
			} finally {
				active = false;
			}
		}
	};
}
