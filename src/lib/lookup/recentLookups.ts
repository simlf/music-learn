/**
 * Recent-lookups localStorage persistence. Tracks the last 5 distinct chord
 * symbols a user has looked up, most-recent-first, so a player working
 * through a real song can re-tap a repeated chord instead of retyping it.
 *
 * Scope is intentionally device-local: this reads/writes the browser's
 * localStorage only. Cross-device sync (so a phone and laptop share the
 * same recent history) is out of scope for v1 and is deferred to Phase 8's
 * backend-persistence work.
 */

const STORAGE_KEY = 'music-learn:recent-lookups';
const MAX_RECENT = 5;

/**
 * Reads the persisted recent-lookups list. Returns an empty array when the
 * store is empty, missing, or contains malformed/corrupt data (a hand-edited
 * or unexpectedly-shaped value never throws; it just resets the feature to
 * "no history yet").
 */
export function getRecentLookups(): string[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw === null) return [];

		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed) || !parsed.every((entry) => typeof entry === 'string')) {
			return [];
		}
		return parsed;
	} catch {
		return [];
	}
}

/**
 * Records a new lookup, moving it to the front of the list if it already
 * exists (dedupe, no duplicates) and capping the list at MAX_RECENT distinct
 * symbols (oldest dropped first). Returns the updated list. Storage failures
 * (disabled/quota-exceeded localStorage) degrade to a no-op write; the
 * returned list still reflects the in-memory update for that call.
 */
export function addRecentLookup(symbol: string): string[] {
	const current = getRecentLookups();
	const next = [symbol, ...current.filter((entry) => entry !== symbol)].slice(0, MAX_RECENT);

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
	} catch {
		// Quota exceeded or storage disabled: keep the loop working without
		// persistence rather than throwing (availability over durability).
	}

	return next;
}
