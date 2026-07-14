/**
 * Answer-recording client (PROG-01, D-04): fire-and-forget POST of every
 * graded drill answer, backed by a localStorage offline queue so the drill
 * loop keeps working (and nothing is lost) when the backend is unreachable.
 *
 * Mirrors src/lib/lookup/recentLookups.ts's storage shape: defensive
 * JSON-array parsing that resets corrupt data to [], and write failures
 * that silently degrade to a no-op (availability over durability).
 */

import { apiFetch } from './client';

/** The client-side answer event shape. 'interval' answers use the shorthand name as item (Track C). */
export interface AnswerEvent {
	item: string;
	kind: 'chord' | 'scale' | 'interval';
	correct: boolean;
	/** Time to answer in milliseconds (recorded now to feed future spaced repetition; Track B sends it). */
	durationMs?: number;
	/** What the user actually answered on a miss (choice symbol, tapped note, interval name). */
	given?: string;
}

/** The queued/sent payload: the event plus the browser-local calendar date it was graded on. */
interface QueuedAnswerEvent extends AnswerEvent {
	clientDate: string;
}

/** Server-computed per-item accuracy stats (mirrors server/src/stats.ts's StatItem, PROG-02). */
export interface StatItem {
	item: string;
	kind: 'chord' | 'scale' | 'interval';
	attempts: number;
	accuracy: number;
	needsPractice: boolean;
}

/** Server-computed daily streak (mirrors server/src/streak.ts's StreakResult, PROG-03). */
export interface StreakResult {
	streak: number;
	practicedToday: boolean;
}

const QUEUE_KEY = 'music-learn:answer-queue';

/** Caps queue growth so a long-offline stretch can't grow storage unbounded; oldest entries drop first. */
const MAX_QUEUE_LENGTH = 500;

/**
 * Returns `date`'s LOCAL calendar date as YYYY-MM-DD (zero-padded), using
 * getFullYear/getMonth/getDate - NOT toISOString, which is UTC and would
 * shift the day near midnight in the user's timezone (resolves the
 * streak-boundary open question: day boundaries follow the user's local
 * clock).
 */
export function localDateString(date: Date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/** Reads the queue, defensively resetting corrupt/missing/non-array data to []. */
function readQueue(): QueuedAnswerEvent[] {
	try {
		const raw = localStorage.getItem(QUEUE_KEY);
		if (raw === null) return [];
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as QueuedAnswerEvent[]) : [];
	} catch {
		return [];
	}
}

/** Writes the queue; storage failures degrade to a no-op rather than throwing. */
function writeQueue(queue: QueuedAnswerEvent[]): void {
	try {
		localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
	} catch {
		// Quota exceeded or storage disabled: keep the loop working without
		// persistence rather than throwing.
	}
}

/** Appends an event to the queue, dropping the oldest entries first if the cap is exceeded. */
function enqueue(event: QueuedAnswerEvent): void {
	const queue = [...readQueue(), event];
	const bounded =
		queue.length > MAX_QUEUE_LENGTH ? queue.slice(queue.length - MAX_QUEUE_LENGTH) : queue;
	writeQueue(bounded);
}

/**
 * Records a graded drill answer. Queues it locally (so it survives a reload
 * or an unreachable backend) then fires an unawaited flush attempt. Always
 * returns undefined synchronously - the caller (the drill loop) never waits
 * on the network (D-04).
 */
export function recordAnswer(event: AnswerEvent): void {
	const payload: QueuedAnswerEvent = { ...event, clientDate: localDateString() };
	enqueue(payload);
	void flushQueue();
}

/** One warning per session when the deployed server rejects a payload it does not know yet. */
let warnedAboutRejectedEvents = false;

/**
 * Drains the queue oldest-first, POSTing each event to /answers.
 *
 * Two failure classes (Track C server-tolerance contract):
 * - HTTP 400 is a deterministic validation rejection: the deployed
 *   production server may predate kind 'interval' and the durationMs/given
 *   fields, and retrying can never succeed. The event is DROPPED (logged
 *   once per session) and draining continues, so an interval answer can
 *   never wedge the chord answers queued behind it.
 * - Anything else (network failure, 401, 5xx) is treated as transient:
 *   stop and persist everything from that event on, mirroring
 *   recentLookups' availability-over-durability degradation.
 */
export async function flushQueue(): Promise<void> {
	const queue = readQueue();
	const remaining: QueuedAnswerEvent[] = [];
	let stopped = false;

	for (const event of queue) {
		if (stopped) {
			remaining.push(event);
			continue;
		}
		try {
			const response = await apiFetch('/answers', { method: 'POST', body: event });
			if (response.ok) continue;
			if (response.status === 400) {
				if (!warnedAboutRejectedEvents) {
					console.warn(
						'music-learn: the server rejected an answer event (likely an older deployment that does not know this answer kind yet). Dropping it; drills keep working.'
					);
					warnedAboutRejectedEvents = true;
				}
				continue;
			}
			stopped = true;
			remaining.push(event);
		} catch {
			stopped = true;
			remaining.push(event);
		}
	}

	writeQueue(remaining);
}

/**
 * Fetches the server-computed per-item accuracy stats and weakest shortlist
 * (PROG-02, D-02: the client never re-derives accuracy from raw events).
 * Throws on a non-ok response so the Progress page can enter its error state.
 */
export async function fetchStats(): Promise<{ items: StatItem[]; weakest: StatItem[] }> {
	const response = await apiFetch('/stats');
	if (!response.ok) {
		throw new Error('Failed to fetch stats');
	}
	return response.json();
}

/**
 * Fetches the server-computed daily practice streak for the given local
 * calendar date (PROG-03, D-02: the client never re-derives the streak from
 * raw events). Throws on a non-ok response.
 */
export async function fetchStreak(today: string): Promise<StreakResult> {
	const response = await apiFetch(`/streak?today=${encodeURIComponent(today)}`);
	if (!response.ok) {
		throw new Error('Failed to fetch streak');
	}
	return response.json();
}
