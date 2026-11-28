/**
 * Local record of homework attempts: per exercise, the attempt count, the best
 * score and the last one. Device-local localStorage, like the practice-day
 * set: no account, no network. Every access is wrapped because storage can be
 * blocked, full or hold junk from an older build, and a homework result must
 * never be able to break the drill that produced it.
 */

export interface ExerciseRecord {
	attempts: number;
	/** Best score so far, 0 to 100. */
	best: number;
	/** The most recent score, 0 to 100. */
	last: number;
	/** ISO timestamp of the last attempt. */
	at: string;
}

const STORAGE_KEY = 'music-learn:homework-log';

type Log = Record<string, ExerciseRecord>;

function isRecord(v: unknown): v is ExerciseRecord {
	if (typeof v !== 'object' || v === null) return false;
	const r = v as Record<string, unknown>;
	return (
		typeof r.attempts === 'number' &&
		typeof r.best === 'number' &&
		typeof r.last === 'number' &&
		typeof r.at === 'string'
	);
}

function readLog(): Log {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
		const out: Log = {};
		for (const [key, value] of Object.entries(parsed)) if (isRecord(value)) out[key] = value;
		return out;
	} catch {
		return {};
	}
}

export function getRecord(key: string): ExerciseRecord | null {
	return readLog()[key] ?? null;
}

/** Records an attempt and returns the updated record. Scores are clamped to 0..100. */
export function recordAttempt(key: string, score: number, at: Date = new Date()): ExerciseRecord {
	const log = readLog();
	const s = Math.max(0, Math.min(100, Math.round(Number.isFinite(score) ? score : 0)));
	const prev = log[key];
	const next: ExerciseRecord = {
		attempts: (prev?.attempts ?? 0) + 1,
		best: Math.max(prev?.best ?? 0, s),
		last: s,
		at: at.toISOString()
	};
	log[key] = next;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
	} catch {
		// Storage unavailable: the on-screen result still shows, it just is not remembered.
	}
	return next;
}
