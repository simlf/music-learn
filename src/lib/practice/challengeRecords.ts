/**
 * Personal bests for the /practice challenges (practice/challenges.ts), one
 * per challenge and, for the key climb, one per chord quality, since a climb
 * of triads and a climb of m7b5 chords are not the same race.
 *
 * A record only ever improves. There is no history, no "last time", and no
 * comparison with a worse run: a result below the best is simply not stored,
 * and the end card then shows the best on its own rather than the gap to it.
 * Per-device, like the streak and the day ledger.
 *
 * Storage follows the music-learn:* localStorage convention: defensive parse,
 * corrupt data resets to empty, write failures degrade to a no-op.
 */

export const CHALLENGE_RECORDS_KEY = 'music-learn:challenges';

/** Sprint points and duel right answers are higher-is-better; climb times (ms) are lower-is-better. */
export type RecordDirection = 'higher' | 'lower';

type RecordMap = Record<string, number>;

function readAll(): RecordMap {
	try {
		const raw = localStorage.getItem(CHALLENGE_RECORDS_KEY);
		if (raw === null) return {};
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
		const records: RecordMap = {};
		for (const [key, value] of Object.entries(parsed)) {
			if (typeof value === 'number' && Number.isFinite(value) && value >= 0) records[key] = value;
		}
		return records;
	} catch {
		return {};
	}
}

/** The record key for one challenge, or one challenge on one quality ("key-climb:m7"). */
export function recordKey(challenge: string, variant?: string): string {
	return variant === undefined ? challenge : `${challenge}:${variant}`;
}

/** The stored best for `key`, or undefined when there is none yet. */
export function readBest(key: string): number | undefined {
	return readAll()[key];
}

/**
 * Offers a finished run's result. Stores it when it beats the best (or there
 * is none) and says so; otherwise leaves the best untouched. A zero result is
 * never stored for a higher-is-better record, so a first run that scored
 * nothing does not plant a "best 0" for the card to show.
 */
export function submitResult(
	key: string,
	value: number,
	direction: RecordDirection
): { best: number | undefined; newBest: boolean } {
	const records = readAll();
	const previous = records[key];
	const beats =
		Number.isFinite(value) &&
		value >= 0 &&
		(direction === 'higher' ? value > (previous ?? 0) : previous === undefined || value < previous);
	if (!beats) return { best: previous, newBest: false };
	records[key] = value;
	try {
		localStorage.setItem(CHALLENGE_RECORDS_KEY, JSON.stringify(records));
	} catch {
		// Storage disabled or full: the run still celebrates, it just is not kept.
	}
	return { best: value, newBest: true };
}
