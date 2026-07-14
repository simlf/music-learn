/**
 * Local rolling record of graded practice answers. This is the client-owned
 * substrate for the mechanics the server's aggregate /stats endpoint cannot
 * express tonight: the unlock rolling window (last 30 tier answers), distinct
 * practice days, warm-up seeding from recent misses, and practice-day snooze
 * counting.
 *
 * D-02 note: lifetime accuracy still comes exclusively from fetchStats (the
 * client never re-derives it from raw server events). This log is a bounded
 * RECENT window recorded at grade time on this device, mirroring the
 * music-learn:* localStorage pattern (recentLookups.ts): defensive parsing,
 * corrupt data resets to empty, writes degrade to no-ops.
 */

export const PRACTICE_LOG_KEY = 'music-learn:practice-log';

/** Bounded history: plenty for a 30-answer rolling window and warm-up seeding. */
const MAX_LOG_LENGTH = 200;

export interface LoggedAnswer {
	/** Chord symbol as drilled, e.g. "F#m7b5". */
	item: string;
	correct: boolean;
	/** True when the answer was assisted (formula shown or hint taken); excluded from unlock accuracy. */
	assisted: boolean;
	/** Local calendar date YYYY-MM-DD (localDateString convention). */
	date: string;
}

function isLoggedAnswer(value: unknown): value is LoggedAnswer {
	if (typeof value !== 'object' || value === null) return false;
	const entry = value as Record<string, unknown>;
	return (
		typeof entry.item === 'string' &&
		typeof entry.correct === 'boolean' &&
		typeof entry.assisted === 'boolean' &&
		typeof entry.date === 'string'
	);
}

/** Reads the log, filtering malformed entries; corrupt storage resets to []. */
export function readPracticeLog(): LoggedAnswer[] {
	try {
		const raw = localStorage.getItem(PRACTICE_LOG_KEY);
		if (raw === null) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isLoggedAnswer);
	} catch {
		return [];
	}
}

/** Appends one graded answer, oldest entries dropping first past the cap. */
export function appendPracticeAnswer(entry: LoggedAnswer): void {
	const log = [...readPracticeLog(), entry];
	const bounded = log.length > MAX_LOG_LENGTH ? log.slice(log.length - MAX_LOG_LENGTH) : log;
	try {
		localStorage.setItem(PRACTICE_LOG_KEY, JSON.stringify(bounded));
	} catch {
		// Quota exceeded or storage disabled: the loop keeps working without
		// persistence rather than throwing (availability over durability).
	}
}

/**
 * Missed symbols, newest miss first, deduped. A symbol answered correctly
 * AFTER its last miss no longer counts (the gap was closed). Feeds the
 * session warm-up queue (R6 proposal 1).
 */
export function recentMisses(limit: number): string[] {
	const misses: string[] = [];
	const resolved = new Set<string>();
	const log = readPracticeLog();
	for (let i = log.length - 1; i >= 0 && misses.length < limit; i--) {
		const entry = log[i];
		if (entry.correct) {
			resolved.add(entry.item);
		} else if (!resolved.has(entry.item) && !misses.includes(entry.item)) {
			misses.push(entry.item);
		}
	}
	return misses;
}

/** Sorted distinct local dates with at least one logged answer. */
export function distinctPracticeDays(): string[] {
	return [...new Set(readPracticeLog().map((entry) => entry.date))].sort();
}

/**
 * Distinct practice days STRICTLY AFTER the given date (YYYY-MM-DD string
 * comparison, which orders correctly for zero-padded dates). Powers the
 * "snoozed for 3 practice days" unlock-suggestion rule.
 */
export function practiceDaysSince(date: string): number {
	return distinctPracticeDays().filter((day) => day > date).length;
}
