/**
 * Daily practice-streak computation over raw answer events (D-02, PROG-03).
 *
 * Pure and framework-free, mirroring stats.ts: takes the raw AnswerRow[]
 * substrate and derives the current streak from the distinct set of
 * client_date values (a "practice day" is any day with >= 1 graded answer).
 * The day boundary is whatever local calendar date the caller passes in as
 * `today` (the browser's local date, per client.ts's localDateString) -
 * this module never touches the server's own timezone.
 */

import type { AnswerRow } from './db.js';

export interface StreakResult {
	streak: number;
	practicedToday: boolean;
}

/**
 * Returns the calendar day immediately before `dateStr` (YYYY-MM-DD), as a
 * YYYY-MM-DD string. Parses/formats using UTC fields only so the date math
 * itself never drifts with the host process's timezone - the calendar
 * labels being subtracted already came from the caller's local date.
 */
function previousDate(dateStr: string): string {
	const [year, month, day] = dateStr.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	date.setUTCDate(date.getUTCDate() - 1);
	const y = date.getUTCFullYear();
	const m = String(date.getUTCMonth() + 1).padStart(2, '0');
	const d = String(date.getUTCDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/**
 * Computes the current streak and whether today has already been practiced.
 *
 * Dedupes rows down to a Set of distinct client_date strings first (a day
 * with many graded answers still counts once). If today is practiced, the
 * streak is counted starting at today. Otherwise, if yesterday was
 * practiced, the streak still counts through yesterday (grace: the nudge
 * copy can invite practicing today without the streak having reset yet). If
 * neither today nor yesterday was practiced, the streak is 0 - any gap of
 * more than one day resets it.
 */
export function computeStreak(rows: AnswerRow[], today: string): StreakResult {
	const practicedDates = new Set(rows.map((row) => row.client_date));
	const practicedToday = practicedDates.has(today);

	let anchor: string;
	if (practicedToday) {
		anchor = today;
	} else {
		const yesterday = previousDate(today);
		if (!practicedDates.has(yesterday)) {
			return { streak: 0, practicedToday };
		}
		anchor = yesterday;
	}

	let streak = 0;
	let cursor = anchor;
	while (practicedDates.has(cursor)) {
		streak += 1;
		cursor = previousDate(cursor);
	}

	return { streak, practicedToday };
}
