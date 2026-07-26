/**
 * In-memory, session-lifetime cache for the Progress hub's Stats tab
 * (29-REVIEW WR-01). The Progress hub mounts exactly one section at a time
 * ({#if activeTab === 'stats'}...), so switching Stats -> Recall -> Stats
 * destroys and recreates ProgressStats.svelte on every return trip. Without
 * this cache, that remount re-triggers `onMount`'s unconditional `load()`,
 * paying two real network round-trips (fetchStats + fetchStreak) and a
 * loading-skeleton flash on every tab bounce, even though the app's whole
 * point in extracting the hub was to make Stats/Recall/Songs switches feel
 * instant.
 *
 * Deliberately a plain in-memory module singleton, NOT persisted to
 * localStorage: it should live only as long as the page/app session does
 * (a fresh full load of /progress should always fetch fresh data), and it
 * should never survive across different bearer tokens - so every read/write
 * is keyed by the current API token and a token change is treated as a
 * cache miss.
 */

import type { StatItem, StreakResult } from '$lib/api/progress';

export interface CachedStats {
	items: StatItem[];
	weakest: StatItem[];
}

/** Streak payload normalized to always carry a `last7` array (never undefined), matching ProgressStats' own state shape. */
export interface CachedStreak {
	streak: number;
	practicedToday: boolean;
	last7: NonNullable<StreakResult['last7']>;
}

interface CacheEntry {
	token: string;
	stats: CachedStats | null;
	streak: CachedStreak | null;
}

let cache: CacheEntry = { token: '', stats: null, streak: null };

/** Returns the cached stats payload for `token`, or null on a miss (empty cache or a different token than what's cached). */
export function getCachedStats(token: string): CachedStats | null {
	return cache.token === token ? cache.stats : null;
}

/** Returns the cached streak payload for `token`, or null on a miss. */
export function getCachedStreak(token: string): CachedStreak | null {
	return cache.token === token ? cache.streak : null;
}

/** Stores a fresh stats payload, keyed to `token`. A different token than what's currently cached discards the old streak cache too (it belonged to a different session/device-token). */
export function setCachedStats(token: string, stats: CachedStats): void {
	cache = { token, stats, streak: cache.token === token ? cache.streak : null };
}

/** Stores a fresh streak payload, keyed to `token`. See setCachedStats for the token-mismatch invalidation rule. */
export function setCachedStreak(token: string, streak: CachedStreak): void {
	cache = { token, stats: cache.token === token ? cache.stats : null, streak };
}

/** Test-only reset: clears the module singleton so each test's `render()` simulates a genuinely fresh app session rather than inheriting a previous test's cached network response. */
export function resetStatsCache(): void {
	cache = { token: '', stats: null, streak: null };
}
