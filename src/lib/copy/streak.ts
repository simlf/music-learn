/**
 * Rotating streak-encouragement copy (PROG-03), mirroring $lib/copy/hints's
 * rotation-pool + anti-repeat picker pattern. Each pool keeps its own
 * lastIndex so the three streak rotations never cross-contaminate (same
 * convention as hints.ts's independent lastIndex/lastSuggestionIndex).
 *
 * Every activePracticedToday/activeNudge line carries a {N} placeholder the
 * caller substitutes with the streak count (mirroring {SYMBOL} in
 * suggestionHints). zeroStreak never mentions a count and never scolds:
 * a lapsed streak reads identically to a first-ever visit, per Phase 1
 * D-02's never-scolding rule.
 */

/** Streak is active and today has already been practiced. */
export const activePracticedToday: string[] = [
	'{N} days running. Bravo.',
	'{N} in a row. Et voilà.',
	'{N} days strong. Keep the presses warm.'
];

/** Streak is active but today has not been practiced yet: a gentle nudge, never guilt. */
export const activeNudge: string[] = [
	'{N} days and counting. Play something today to keep it alive.',
	'{N} in a row so far. A few minutes today keeps it going.',
	"{N} days strong. Don't let today be the gap."
];

/** Streak is at zero, whether a first-ever visit or a lapsed streak: identical copy either way. */
export const zeroStreak: string[] = [
	'No streak yet. Every run starts with day one.',
	'Fresh page. Play a few chords to start the count.',
	'Day one is free. Go stamp something.'
];

export type StreakLineKind = 'activePracticedToday' | 'activeNudge' | 'zeroStreak';

const pools: Record<StreakLineKind, string[]> = {
	activePracticedToday,
	activeNudge,
	zeroStreak
};

const lastIndices: Record<StreakLineKind, number> = {
	activePracticedToday: -1,
	activeNudge: -1,
	zeroStreak: -1
};

/**
 * Picks a line from the given pool, avoiding an immediate repeat of the
 * previous pick for that same pool (mirroring pickHint's anti-repeat
 * while-loop exactly). Returns the raw line WITH its {N} placeholder still
 * in place, if any; the caller substitutes the count.
 */
export function pickStreakLine(kind: StreakLineKind): string {
	const pool = pools[kind];
	if (pool.length === 1) {
		lastIndices[kind] = 0;
		return pool[0];
	}

	let index = Math.floor(Math.random() * pool.length);
	while (index === lastIndices[kind]) {
		index = Math.floor(Math.random() * pool.length);
	}
	lastIndices[kind] = index;
	return pool[index];
}
