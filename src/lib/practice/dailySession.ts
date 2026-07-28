/**
 * The bounded daily practice session: how many questions one day owes, what
 * happened on that day, and what happened on the day before.
 *
 * Why this module exists: `/practice` used to compose the ENTIRE due set into
 * one unbounded round with no stated length, no early exit, and a reward
 * (the end card) gated behind finishing all of it. On a fresh install day one
 * is roughly 39 items. A user with 90 seconds cannot finish that, and
 * everything they did earn (score, best run, misses) lived in in-memory
 * `$state` that navigating away destroyed. So the session gets a bound
 * (DAILY_TARGET) and the day gets a small persisted ledger:
 *
 *   - the round can be resumed honestly ("5 of 12 done today, 7 to go")
 *     instead of restarting at zero,
 *   - "you are done for today" becomes a real, closable statement rather
 *     than something only discoverable by draining the whole queue,
 *   - yesterday's one line can be shown at the moment the user decides
 *     whether to start (the re-entry cue).
 *
 * FSRS is untouched by everything here. This module never reads or writes a
 * card: bounding the SESSION must not change how a card is SCHEDULED, so a
 * card graded inside a bounded round is scheduled exactly as before and the
 * items a bounded round did not reach simply stay due.
 *
 * Storage follows the house `music-learn:*` idiom verbatim (introBudget.ts /
 * practiceLog.ts): its own inline local-calendar YYYY-MM-DD formatting (never
 * toISOString, which is UTC and shifts the day near midnight), defensive
 * parsing that treats corrupt data as absent, and writes that degrade to a
 * no-op rather than throwing (availability over durability).
 *
 * NOT a streak source of truth. This ledger answers "what did I do today and
 * on my last practice day"; the daily streak stays owned by the progress
 * layer and the end card reads it from there, tolerantly.
 */

export const DAILY_SESSION_KEY = 'music-learn:daily-session';

/**
 * Questions one day's practice asks for. 12 is deliberately a number the
 * single user can finish in the 90 seconds the app is actually opened in:
 * enough that a mixed round still hits several families, small enough that
 * the pre-start card shows a finishable figure. It is a QUESTION count, not
 * an item count, so an in-session retry of a missed item spends a slot
 * rather than growing the round.
 */
export const DAILY_TARGET = 12;

/** One local calendar day's practice ledger. */
export interface DaySummary {
	/** Local calendar date, YYYY-MM-DD. */
	date: string;
	/** Questions graded on `date`, across every round of that day. */
	answered: number;
	correct: number;
	/** The live run at the end of the last graded answer (0 after a miss). */
	streak: number;
	bestStreak: number;
	/** Missed item labels, deduped, in first-miss order. A later correct retry keeps the miss listed (honest ledger). */
	missed: string[];
	/** True once the day's target was met, or the whole due queue ran dry. */
	done: boolean;
}

/** Today's ledger plus the most recent PREVIOUS practice day's ledger. */
export interface DailySessionState {
	today?: DaySummary;
	previous?: DaySummary;
}

/** One graded answer, as the practice host reports it. */
export interface DailyAnswer {
	correct: boolean;
	/** The item's display label, recorded only on a miss (the end card's chips, and tomorrow's "coming back today" line). */
	label?: string;
}

/** Local calendar date as YYYY-MM-DD, mirroring introBudget.ts's own inline formatting (no dependency on the api client module). */
export function localDay(date: Date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/** The local calendar day before `date`. Uses Date arithmetic (not string math) so month/year/DST boundaries are correct. */
export function previousLocalDay(date: Date = new Date()): string {
	const shifted = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
	return localDay(shifted);
}

/** True when `day` (YYYY-MM-DD) is literally the calendar day before `now`. Lets copy say "Yesterday" only when it IS yesterday. */
export function isYesterday(day: string, now: Date = new Date()): boolean {
	return day === previousLocalDay(now);
}

/** A fresh, empty ledger for `date`. */
export function emptyDay(date: string): DaySummary {
	return { date, answered: 0, correct: 0, streak: 0, bestStreak: 0, missed: [], done: false };
}

/**
 * Folds one graded answer into a day's ledger. Pure: returns a new summary,
 * never mutates. A miss appends its label once (first-miss order preserved);
 * `done` is only ever set by markDoneToday, never inferred here.
 */
export function applyAnswer(day: DaySummary, answer: DailyAnswer): DaySummary {
	const streak = answer.correct ? day.streak + 1 : 0;
	const label = answer.label;
	const missed =
		!answer.correct && label !== undefined && label !== '' && !day.missed.includes(label)
			? [...day.missed, label]
			: day.missed;
	return {
		...day,
		answered: day.answered + 1,
		correct: day.correct + (answer.correct ? 1 : 0),
		streak,
		bestStreak: Math.max(day.bestStreak, streak),
		missed,
		done: day.done
	};
}

/**
 * Applies the calendar rollover to a stored state: a `today` ledger from an
 * EARLIER date becomes `previous` (it is by definition the most recent
 * practice day), and today starts fresh. Pure, so the rollover rule is
 * testable without storage.
 */
export function rollOver(state: DailySessionState, today: string): DailySessionState {
	const stored = state.today;
	if (stored === undefined) return { previous: state.previous };
	if (stored.date === today) return { today: stored, previous: state.previous };
	return { previous: stored };
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isDaySummary(value: unknown): value is DaySummary {
	if (typeof value !== 'object' || value === null) return false;
	const entry = value as Record<string, unknown>;
	const counts = [entry.answered, entry.correct, entry.streak, entry.bestStreak];
	return (
		typeof entry.date === 'string' &&
		counts.every((n) => typeof n === 'number' && Number.isInteger(n) && n >= 0) &&
		isStringArray(entry.missed) &&
		typeof entry.done === 'boolean'
	);
}

function parseState(raw: string | null): DailySessionState {
	if (raw === null) return {};
	try {
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null) return {};
		const entry = parsed as Record<string, unknown>;
		return {
			today: isDaySummary(entry.today) ? entry.today : undefined,
			previous: isDaySummary(entry.previous) ? entry.previous : undefined
		};
	} catch {
		return {};
	}
}

/** Defensive read: corrupt/absent/wrong-shape storage reads as an empty state (a fresh day), never throws. */
function readRaw(): DailySessionState {
	try {
		return parseState(localStorage.getItem(DAILY_SESSION_KEY));
	} catch {
		return {};
	}
}

/** Write failures (quota exceeded, storage disabled) degrade to a no-op rather than throwing. */
function write(state: DailySessionState): void {
	try {
		localStorage.setItem(DAILY_SESSION_KEY, JSON.stringify(state));
	} catch {
		// The session keeps working without persistence rather than throwing.
	}
}

/** The stored state with `now`'s calendar rollover already applied. */
export function readDailySession(now: Date = new Date()): DailySessionState {
	return rollOver(readRaw(), localDay(now));
}

/** Today's ledger, or a fresh empty one when nothing has been graded today yet. */
export function todaySummary(now: Date = new Date()): DaySummary {
	return readDailySession(now).today ?? emptyDay(localDay(now));
}

/**
 * The most recent PREVIOUS practice day's ledger, or undefined when there
 * isn't one worth showing. A stored day with nothing graded on it is treated
 * as absent: an empty line is worse than no line.
 */
export function previousSummary(now: Date = new Date()): DaySummary | undefined {
	const previous = readDailySession(now).previous;
	return previous !== undefined && previous.answered > 0 ? previous : undefined;
}

/** Records one graded answer against today, persisting the rolled state. Returns today's updated ledger. */
export function recordDailyAnswer(answer: DailyAnswer, now: Date = new Date()): DaySummary {
	const state = readDailySession(now);
	const today = applyAnswer(state.today ?? emptyDay(localDay(now)), answer);
	write({ today, previous: state.previous });
	return today;
}

/** Marks today's practice complete (target met, or the due queue ran dry). Idempotent. */
export function markDoneToday(now: Date = new Date()): DaySummary {
	const state = readDailySession(now);
	const today: DaySummary = { ...(state.today ?? emptyDay(localDay(now))), done: true };
	write({ today, previous: state.previous });
	return today;
}

/** Questions graded today. */
export function answeredToday(now: Date = new Date()): number {
	return todaySummary(now).answered;
}

/** True once today's practice has been declared complete. */
export function isDoneToday(now: Date = new Date()): boolean {
	return todaySummary(now).done;
}

/**
 * Questions today still owes: DAILY_TARGET minus what was already graded
 * today, never negative. 0 means the day's target is met, whether or not
 * `done` was flagged (a day the user over-practiced past the target still
 * reads 0 rather than a negative debt).
 */
export function remainingDailyTarget(now: Date = new Date()): number {
	return Math.max(0, DAILY_TARGET - answeredToday(now));
}
