/**
 * Confidence log: the local-first persistence + aggregation layer behind
 * sketch 020-B (optional inline confidence dots on Recall reveal, never
 * blocking) and its companion payoff surface, sketch 020-C (/progress
 * calibration bars + danger-card list).
 *
 * Design decision (documented discretion): localStorage over Dexie. The log
 * is small (one tiny record per graded review, single user) and matches the
 * established music-learn:* lightweight-log convention (songs.ts,
 * recentLookups.ts, songFilterPref.ts). A ring-buffer cap bounds growth.
 * Dexie is the migration path if volume ever outgrows localStorage, but is
 * deliberately not used here to avoid a version bump on the cards store -
 * this module never touches the critical cards Dexie database.
 *
 * Total functions throughout: malformed or hand-edited storage never
 * throws, it just degrades to an empty list (or drops the one malformed
 * entry); write failures (quota, disabled storage) degrade to a no-op so
 * the review loop keeps working without persistence (availability over
 * durability) - mirrors songs.ts / recentLookups.ts.
 */

const STORAGE_KEY = 'music-learn:confidence-log';

/** Ring-buffer cap: oldest entries are dropped once the log exceeds this size. */
export const CONFIDENCE_LOG_CAP = 500;

/** 'unrated' covers a skipped rating (Reveal was tapped without picking a dot). */
export type Confidence = 'unsure' | 'somewhat' | 'certain' | 'unrated';

export interface ConfidenceEntry {
	factId: string;
	mode: string;
	confidence: Confidence;
	/**
	 * Whether the review PASSED. For FSRS-graded reviews the caller maps
	 * Hard/Good/Easy to true and only Again (a lapse) to false — Hard is a
	 * passing grade (recalled, with effort), so it never counts against
	 * calibration accuracy or the confident-but-wrong danger list.
	 */
	correct: boolean;
	/** ISO 8601. String, not Date: survives JSON round-trips. */
	at: string;
}

const CONFIDENCE_LEVELS: readonly Confidence[] = ['unsure', 'somewhat', 'certain', 'unrated'];

/** Schema guard for one stored entry; anything off-shape is dropped on read. */
function isConfidenceEntry(value: unknown): value is ConfidenceEntry {
	if (typeof value !== 'object' || value === null) return false;
	const record = value as Record<string, unknown>;
	return (
		typeof record.factId === 'string' &&
		typeof record.mode === 'string' &&
		typeof record.confidence === 'string' &&
		(CONFIDENCE_LEVELS as string[]).includes(record.confidence) &&
		typeof record.correct === 'boolean' &&
		typeof record.at === 'string'
	);
}

/**
 * Reads the persisted confidence log. Returns [] when the store is empty,
 * missing, not valid JSON, or not an array; individual malformed entries are
 * dropped so one corrupt record never wipes the rest of the log.
 */
export function listConfidence(): ConfidenceEntry[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw === null) return [];

		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];

		return parsed.filter(isConfidenceEntry);
	} catch {
		return [];
	}
}

/**
 * Appends a review record to the log, keeping only the most recent
 * CONFIDENCE_LOG_CAP entries (oldest dropped first, ring buffer). Storage
 * failures (quota exceeded or disabled storage) degrade to a silent no-op -
 * the review loop keeps working without persistence.
 */
export function logConfidence(entry: ConfidenceEntry): void {
	const next = [...listConfidence(), entry].slice(-CONFIDENCE_LOG_CAP);

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
	} catch {
		// Quota exceeded or storage disabled: keep the loop working without
		// persistence rather than throwing (availability over durability).
	}
}

export interface CalibrationRow {
	level: 'unsure' | 'somewhat' | 'certain';
	total: number;
	correct: number;
	accuracy: number;
}

export interface CalibrationResult {
	levels: CalibrationRow[];
	/** True when certain-accuracy < somewhat-accuracy (guarded against divide-by-zero: false when either level has 0 samples). */
	miscalibrated: boolean;
}

/**
 * Aggregates per-level accuracy for unsure/somewhat/certain (excluding
 * 'unrated' entries), plus a top-level miscalibrated flag: true when
 * certain-accuracy is lower than somewhat-accuracy, which signals
 * overconfidence worth flagging on /progress.
 */
export function calibration(entries: ConfidenceEntry[]): CalibrationResult {
	const levels: CalibrationRow['level'][] = ['unsure', 'somewhat', 'certain'];

	const rows = levels.map((level) => {
		const atLevel = entries.filter((entry) => entry.confidence === level);
		const total = atLevel.length;
		const correct = atLevel.filter((entry) => entry.correct).length;
		const accuracy = total === 0 ? 0 : correct / total;
		return { level, total, correct, accuracy };
	});

	const certainRow = rows.find((row) => row.level === 'certain')!;
	const somewhatRow = rows.find((row) => row.level === 'somewhat')!;
	const miscalibrated =
		certainRow.total > 0 && somewhatRow.total > 0 && certainRow.accuracy < somewhatRow.accuracy;

	return { levels: rows, miscalibrated };
}

export interface DangerCard {
	factId: string;
	mode: string;
	wrongCount: number;
}

/**
 * Groups entries rated 'certain' yet graded wrong by factId+mode, returning
 * the confident-but-wrong cards sorted by wrongCount descending - the
 * /progress "drill the danger cards" list.
 */
export function dangerCards(entries: ConfidenceEntry[]): DangerCard[] {
	const counts = new Map<string, DangerCard>();

	for (const entry of entries) {
		if (entry.confidence !== 'certain' || entry.correct) continue;

		const key = `${entry.factId}|${entry.mode}`;
		const existing = counts.get(key);
		if (existing) {
			existing.wrongCount += 1;
		} else {
			counts.set(key, { factId: entry.factId, mode: entry.mode, wrongCount: 1 });
		}
	}

	return [...counts.values()].sort((a, b) => b.wrongCount - a.wrongCount);
}
