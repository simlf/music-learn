import { currentLocale } from '$lib/i18n/locale.svelte';

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
 * D-02's never-scolding rule (both true in en AND fr).
 *
 * (I18N-02, Phase 20 Plan 08): parallel Fr pools carry the same {N}
 * placeholder and the same non-scolding zeroStreak tone. pickStreakLine
 * reads currentLocale() to pick the active-locale pool; lastIndices stays a
 * single Record<StreakLineKind, number> (not split per-locale) since a
 * language switch mid-session is a rare edge case and each kind's anti-repeat
 * behavior only needs to stay independent from the *other two* kinds, not
 * from itself across a locale flip.
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

/** Fr parallel of activePracticedToday, same {N} placeholder, same count. */
export const activePracticedTodayFr: string[] = [
	'{N} jours de suite. Bravo.',
	"{N} d'affilée. Et voilà.",
	'{N} jours de suite. Presses encore chaudes.'
];

/** Fr parallel of activeNudge: gentle nudge, never guilt. */
export const activeNudgeFr: string[] = [
	"{N} jours et ça continue. Joue un peu aujourd'hui pour garder la série.",
	"{N} d'affilée pour l'instant. Quelques minutes aujourd'hui suffisent.",
	"{N} jours solides. Ne laisse pas aujourd'hui devenir le trou."
];

/** Fr parallel of zeroStreak: never mentions a count, never scolds. */
export const zeroStreakFr: string[] = [
	'Pas encore de série. Chaque parcours commence au jour un.',
	'Page vierge. Joue quelques accords pour lancer le compteur.',
	'Le jour un est gratuit. Va tamponner quelque chose.'
];

export type StreakLineKind = 'activePracticedToday' | 'activeNudge' | 'zeroStreak';

const poolsByLocale: Record<'en' | 'fr', Record<StreakLineKind, string[]>> = {
	en: {
		activePracticedToday,
		activeNudge,
		zeroStreak
	},
	fr: {
		activePracticedToday: activePracticedTodayFr,
		activeNudge: activeNudgeFr,
		zeroStreak: zeroStreakFr
	}
};

const lastIndices: Record<StreakLineKind, number> = {
	activePracticedToday: -1,
	activeNudge: -1,
	zeroStreak: -1
};

/**
 * Picks a line from the given pool for the CURRENT locale, avoiding an
 * immediate repeat of the previous pick for that same kind. Returns the raw
 * line WITH its {N} placeholder still in place, if any; the caller substitutes
 * the count.
 *
 * The anti-repeat step is ONE deterministic hop, not an unbounded redraw loop.
 * This used to re-roll `Math.random()` in a `while` until it differed from the
 * last pick, which is a rejection loop whose termination depends entirely on a
 * randomness source this module does not own: if `Math.random` ever returns a
 * constant, the loop never exits. That is not theoretical - it is the normal
 * shape of a deterministic test (`vi.spyOn(Math, 'random').mockReturnValue(x)`),
 * and a spun spy also records every call, so the hang surfaced as heap
 * exhaustion rather than an honest timeout. A single modular step keeps the
 * guarantee the loop existed for (with more than one line, the pick is never the
 * previous one) and always terminates.
 */
export function pickStreakLine(kind: StreakLineKind): string {
	const pool = poolsByLocale[currentLocale()][kind];
	if (pool.length === 1) {
		lastIndices[kind] = 0;
		return pool[0];
	}

	let index = Math.floor(Math.random() * pool.length);
	if (index === lastIndices[kind]) {
		index = (index + 1) % pool.length;
	}
	lastIndices[kind] = index;
	return pool[index];
}
