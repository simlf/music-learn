/**
 * Micro-session model (R3 mechanic 4, R6 proposals 1 and 4): a 10-question
 * round with a warm-up head (first 3-5 questions seeded from recent misses
 * and the server weakest shortlist), delayed retry of in-session misses (a
 * missed item reappears 2 to 4 questions later, a real retrieval event
 * rather than an immediate short-term-memory echo), and an end-card summary.
 *
 * Pure module with an injectable rng (retry gap): the page owns the reactive
 * state, this module owns every transition. All functions return new session
 * objects; nothing mutates.
 */

export interface SessionConfig {
	length: number;
	warmupMax: number;
	retryMinGap: number;
	retryMaxGap: number;
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
	length: 10,
	warmupMax: 5,
	retryMinGap: 2,
	retryMaxGap: 4
};

export type QuestionSource = 'seeded' | 'retry' | 'warmup' | 'pool';

export interface SessionAnswer {
	symbol: string;
	kind: 'construction' | 'identification';
	correct: boolean;
	/** Formula shown or hint taken: excluded from unlock accuracy. */
	assisted: boolean;
	/** Question shown to graded, milliseconds. */
	durationMs: number;
	source: QuestionSource;
}

export interface Session {
	length: number;
	warmupMax: number;
	retryMinGap: number;
	retryMaxGap: number;
	/** Answers recorded so far; the next question's 0-based index. */
	asked: number;
	results: SessionAnswer[];
	warmupQueue: string[];
	/** Drill-these seeds: served before anything except due retries. */
	seedQueue: string[];
	retryQueue: { symbol: string; dueIndex: number }[];
	correct: number;
	streak: number;
	bestStreak: number;
}

export interface NextQuestionPlan {
	/** null means: draw from the weighted pool. */
	symbol: string | null;
	source: QuestionSource;
}

function dedupe(symbols: string[]): string[] {
	return [...new Set(symbols)];
}

/**
 * Starts a session. `seeds` (the Drill-these flow) take over the whole
 * session head and suppress the warm-up; otherwise `warmupCandidates`
 * (recent misses first, weakest merged in later) fill up to warmupMax slots.
 */
export function createSession(
	opts: { seeds?: string[]; warmupCandidates?: string[]; length?: number },
	config: SessionConfig = DEFAULT_SESSION_CONFIG
): Session {
	const seeds = dedupe(opts.seeds ?? []);
	return {
		length: opts.length ?? config.length,
		warmupMax: config.warmupMax,
		retryMinGap: config.retryMinGap,
		retryMaxGap: config.retryMaxGap,
		asked: 0,
		results: [],
		warmupQueue: seeds.length > 0 ? [] : dedupe(opts.warmupCandidates ?? []).slice(0, config.warmupMax),
		seedQueue: seeds,
		retryQueue: [],
		correct: 0,
		streak: 0,
		bestStreak: 0
	};
}

/**
 * Tops the warm-up queue up to warmupMax with newly-arrived candidates (the
 * fetchStats weakest shortlist lands async after the session already
 * started). No-op once the warm-up window has passed or for seeded sessions.
 */
export function mergeWarmupCandidates(session: Session, symbols: string[]): Session {
	if (session.seedQueue.length > 0 || session.asked >= session.warmupMax) return session;
	const answered = new Set(session.results.map((result) => result.symbol));
	const queue = [...session.warmupQueue];
	for (const symbol of symbols) {
		if (queue.length >= session.warmupMax) break;
		if (queue.includes(symbol) || answered.has(symbol)) continue;
		queue.push(symbol);
	}
	return { ...session, warmupQueue: queue };
}

/**
 * Picks the next question's source, consuming the relevant queue:
 * due retry > seeded > warm-up (inside the first warmupMax questions) >
 * pool (symbol null: the caller draws from the weighted pool).
 */
export function nextQuestion(session: Session): { plan: NextQuestionPlan; session: Session } {
	const dueIndex = session.retryQueue.findIndex((entry) => entry.dueIndex <= session.asked);
	if (dueIndex !== -1) {
		const entry = session.retryQueue[dueIndex];
		const retryQueue = session.retryQueue.filter((_, i) => i !== dueIndex);
		return {
			plan: { symbol: entry.symbol, source: 'retry' },
			session: { ...session, retryQueue }
		};
	}
	if (session.seedQueue.length > 0) {
		const [symbol, ...seedQueue] = session.seedQueue;
		return { plan: { symbol, source: 'seeded' }, session: { ...session, seedQueue } };
	}
	if (session.warmupQueue.length > 0 && session.asked < session.warmupMax) {
		const [symbol, ...warmupQueue] = session.warmupQueue;
		return { plan: { symbol, source: 'warmup' }, session: { ...session, warmupQueue } };
	}
	return { plan: { symbol: null, source: 'pool' }, session };
}

/**
 * Records one graded answer. A miss schedules a delayed retry 2 to 4
 * questions later (rng-drawn gap), clamped to the session's final question
 * or dropped when nothing fits; a symbol never queues twice.
 */
export function recordSessionAnswer(
	session: Session,
	answer: SessionAnswer,
	rng: () => number = Math.random
): Session {
	const questionIndex = session.asked;
	const streak = answer.correct ? session.streak + 1 : 0;
	const next: Session = {
		...session,
		asked: session.asked + 1,
		results: [...session.results, answer],
		correct: session.correct + (answer.correct ? 1 : 0),
		streak,
		bestStreak: Math.max(session.bestStreak, streak)
	};

	if (!answer.correct && !next.retryQueue.some((entry) => entry.symbol === answer.symbol)) {
		const gapSpan = session.retryMaxGap - session.retryMinGap + 1;
		const gap = session.retryMinGap + Math.floor(rng() * gapSpan);
		const lastIndex = session.length - 1;
		const dueIndex = Math.min(questionIndex + gap, lastIndex);
		if (dueIndex > questionIndex) {
			next.retryQueue = [...next.retryQueue, { symbol: answer.symbol, dueIndex }];
		}
	}

	return next;
}

export function isComplete(session: Session): boolean {
	return session.asked >= session.length;
}

export interface SessionSummary {
	total: number;
	correct: number;
	bestStreak: number;
	/** Deduped, in first-miss order. A later correct retry keeps the miss listed (honest ledger). */
	missedSymbols: string[];
}

export function summarize(session: Session): SessionSummary {
	return {
		total: session.asked,
		correct: session.correct,
		bestStreak: session.bestStreak,
		missedSymbols: dedupe(
			session.results.filter((result) => !result.correct).map((result) => result.symbol)
		)
	};
}
