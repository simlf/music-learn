/**
 * Daily new-card intro budget (BACKLOG-1): caps how many genuinely-new FACTS
 * `deck.introduceNewCards` may seed across every /recall mount in one local
 * calendar day. Without this, opening /recall repeatedly (or a slow FSRS
 * write retried across page loads) can silently introduce far more than the
 * intended daily batch, degrading the spacing schedule's fidelity.
 *
 * Mirrors practiceLog.ts's exact defensive-localStorage idiom (this module
 * is deliberately dependency-light: it does NOT import progress.ts's
 * localDateString, so introBudget.ts has zero runtime dependency on the API
 * client module - just its own inline YYYY-MM-DD formatting, using the same
 * getFullYear/getMonth/getDate local-calendar-day convention as every other
 * date-keyed local store in this app).
 */

export const INTRO_BUDGET_KEY = 'music-learn:intro-budget';

/**
 * Caps genuinely-new facts introduced per local calendar day. Matches
 * NEW_CARDS_PER_SESSION (deck.ts) so a single normal session still fills the
 * whole day's budget in one go; repeated mounts within the same day cannot
 * introduce more than this total.
 */
export const MAX_NEW_CARDS_PER_DAY = 10;

interface BudgetRecord {
	/** Local calendar date YYYY-MM-DD (this module's own inline formatting). */
	date: string;
	/** Facts consumed so far on `date`. */
	count: number;
}

/** Returns `date`'s LOCAL calendar date as YYYY-MM-DD, mirroring progress.ts's localDateString convention without importing it. */
function localDateStringForBudget(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function isBudgetRecord(value: unknown): value is BudgetRecord {
	if (typeof value !== 'object' || value === null) return false;
	const entry = value as Record<string, unknown>;
	return (
		typeof entry.date === 'string' &&
		typeof entry.count === 'number' &&
		Number.isFinite(entry.count) &&
		Number.isInteger(entry.count) &&
		entry.count >= 0
	);
}

/** Defensive read (mirrors practiceLog.readPracticeLog): corrupt/non-JSON/wrong-shape storage returns undefined (treated as a fresh full budget). */
function readBudget(): BudgetRecord | undefined {
	try {
		const raw = localStorage.getItem(INTRO_BUDGET_KEY);
		if (raw === null) return undefined;
		const parsed: unknown = JSON.parse(raw);
		return isBudgetRecord(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}

/** Write failures (quota exceeded, storage disabled) degrade to a no-op rather than throwing (availability over durability, mirrors practiceLog.appendPracticeAnswer). */
function writeBudget(record: BudgetRecord): void {
	try {
		localStorage.setItem(INTRO_BUDGET_KEY, JSON.stringify(record));
	} catch {
		// Quota exceeded or storage disabled: the caller keeps working without
		// persistence rather than throwing.
	}
}

/** Facts already consumed on `now`'s local calendar day; a stored record for a DIFFERENT date (rollover) reads as 0. */
function consumedFor(now: Date): number {
	const record = readBudget();
	if (!record || record.date !== localDateStringForBudget(now)) return 0;
	return record.count;
}

/** Facts still available to introduce today, never negative, capped at MAX_NEW_CARDS_PER_DAY. */
export function remainingIntroBudget(now: Date = new Date()): number {
	return Math.max(0, MAX_NEW_CARDS_PER_DAY - consumedFor(now));
}

/** Records `n` more facts consumed against today's budget (rolling over from a stale stored date first). Never throws. */
export function consumeIntroBudget(n: number, now: Date = new Date()): void {
	const today = localDateStringForBudget(now);
	const consumed = consumedFor(now);
	writeBudget({ date: today, count: consumed + Math.max(0, n) });
}
