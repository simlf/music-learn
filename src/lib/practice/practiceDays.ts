/**
 * Device-local set of practice days, and the daily streak derived from it
 * (B8, local-first streak).
 *
 * WHY THIS EXISTS: the streak used to be computed exclusively by the server
 * (`fetchStreak`) against a tailnet-only API that also needs a manually
 * pasted bearer token. Off Tailscale, or before that token is entered, the
 * fetch fails and the streak renders as nothing at all: the app's only
 * loss-aversion signal is invisible exactly where practice happens (a phone).
 * So the DEVICE now owns the streak, and the server is a merge/backup that
 * can only ever raise the visible number (practice done on another device),
 * never lower it.
 *
 * The day set is deliberately separate from `practiceLog.ts`'s bounded
 * 200-entry answer log: that log is a RECENT-answers window (a single long
 * session can push older days out of it), which is exactly the wrong shape
 * for a streak that must remember months of calendar days. This module keeps
 * only day strings, so a year of practice costs ~4KB.
 *
 * Storage shape follows the established `music-learn:*` localStorage
 * convention (recentLookups.ts, practiceLog.ts): defensive parsing, corrupt
 * data resets to empty, write failures degrade to a no-op (availability over
 * durability).
 */

export const PRACTICE_DAYS_KEY = 'music-learn:practice-days';

/**
 * Bounded history: a bit over a year of days. Enough for any streak this app
 * will ever display, and it keeps storage from growing without limit. Oldest
 * days drop first, which can only ever truncate a streak longer than
 * MAX_PRACTICE_DAYS.
 */
const MAX_PRACTICE_DAYS = 400;

/** Zero-padded local calendar date, the `localDateString` convention used app-wide. */
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isDayString(value: unknown): value is string {
	return typeof value === 'string' && DAY_PATTERN.test(value);
}

/**
 * Reads the recorded practice days: sorted ascending, deduplicated, and
 * filtered to well-formed YYYY-MM-DD strings. Corrupt or missing storage
 * reads as [] rather than throwing.
 */
export function readPracticeDays(): string[] {
	try {
		const raw = localStorage.getItem(PRACTICE_DAYS_KEY);
		if (raw === null) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return [...new Set(parsed.filter(isDayString))].sort();
	} catch {
		return [];
	}
}

/**
 * Records `date` (a `localDateString`-shaped YYYY-MM-DD string) as a day on
 * which this device practiced. Idempotent: recording the same day again is a
 * no-op, so it is safe (and expected) to call this on EVERY graded answer.
 * A malformed date is ignored rather than poisoning the set.
 */
export function recordPracticeDay(date: string): void {
	if (!isDayString(date)) return;
	const days = readPracticeDays();
	if (days.includes(date)) return;
	const next = [...days, date].sort();
	const bounded =
		next.length > MAX_PRACTICE_DAYS ? next.slice(next.length - MAX_PRACTICE_DAYS) : next;
	try {
		localStorage.setItem(PRACTICE_DAYS_KEY, JSON.stringify(bounded));
	} catch {
		// Quota exceeded or storage disabled: the practice loop keeps working
		// without the streak advancing, rather than throwing mid-answer.
	}
}

/**
 * The calendar day immediately before `date` (YYYY-MM-DD). Parses and formats
 * through UTC fields only so the arithmetic itself never drifts with the
 * host's timezone. The labels being subtracted already came from the user's
 * LOCAL clock (`localDateString`), so the result stays a local calendar day.
 * Mirrors server/src/streak.ts's `previousDate` exactly, deliberately: the
 * two implementations must agree on day boundaries.
 */
export function previousDay(date: string): string {
	const [year, month, day] = date.split('-').map(Number);
	const parsed = new Date(Date.UTC(year, month - 1, day));
	parsed.setUTCDate(parsed.getUTCDate() - 1);
	const y = parsed.getUTCFullYear();
	const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
	const d = String(parsed.getUTCDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/**
 * Pure streak math over a set of practice days, matching
 * server/src/streak.ts's `computeStreak` semantics exactly, INCLUDING its
 * one-day grace: if today has not been practiced yet but yesterday was, the
 * streak still counts through yesterday, so the day's first visit invites
 * practice without having already reset the count. A gap of more than one day
 * resets to 0.
 *
 * Keeping the grace identical on both sides is what lets the local and server
 * numbers be compared with a plain max() without one of them looking wrong.
 */
export function computeStreakFromDays(days: Iterable<string>, today: string): number {
	const practiced = new Set(days);

	let anchor: string;
	if (practiced.has(today)) {
		anchor = today;
	} else {
		const yesterday = previousDay(today);
		if (!practiced.has(yesterday)) return 0;
		anchor = yesterday;
	}

	let streak = 0;
	let cursor = anchor;
	while (practiced.has(cursor)) {
		streak += 1;
		cursor = previousDay(cursor);
	}
	return streak;
}

/**
 * This device's current streak, read straight from localStorage: no token, no
 * network, no await. Cheap enough (one JSON parse of at most 400 short
 * strings) to call on every navigation.
 */
export function localStreak(today: string): number {
	return computeStreakFromDays(readPracticeDays(), today);
}

/** True when this device recorded practice on `today`. */
export function practicedOn(today: string): boolean {
	return readPracticeDays().includes(today);
}
