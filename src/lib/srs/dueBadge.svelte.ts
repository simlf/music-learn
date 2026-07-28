/**
 * Reactive "cards due now" count for the Practice tab badge (B7).
 *
 * A `.svelte.ts` module (not plain `.ts`) so the module-level `$state` below
 * is genuinely reactive, mirroring `locale.svelte.ts` and
 * `swUpdate.svelte.ts`.
 *
 * The count comes from the ONE existing scheduler gateway, `$lib/srs/deck`'s
 * `getDueCards` - no second scheduler, no duplicated due-date query.
 *
 * Cost discipline: `getDueCards` reads the whole card table through Dexie, and
 * the root layout mounts on every route, so the scan is cached in memory for
 * the app session (`primeDueCount` scans at most once) and only re-run on an
 * explicit `refreshDueCount()` - which the layout wires to `visibilitychange`,
 * the moment the count can have gone stale while the app sat in the
 * background.
 */

import { browser } from '$app/environment';
import { getDueCards } from '$lib/srs/deck';
import { setAppBadgeCount } from '$lib/pwa/appBadge';

let count = $state(0);
let scanned = false;

/** Cards due right now. Reactive: read it inside a template or a `$derived`. */
export function dueCount(): number {
	return count;
}

/**
 * Formats the badge label. Caps at "99+" so a long absence can never widen a
 * 9px tab slot enough to break the bottom bar's layout. Digits only, so it
 * needs no translation.
 */
export function formatDueBadge(value: number): string {
	return value > 99 ? '99+' : String(value);
}

async function scan(): Promise<void> {
	try {
		const due = await getDueCards();
		count = Array.isArray(due) ? due.length : 0;
	} catch {
		// No IndexedDB (private mode, SSR-ish environments, a rejected Dexie
		// open): no badge rather than a broken layout.
		count = 0;
	}
	setAppBadgeCount(count);
}

/**
 * Scans once per app session. Safe to call from the root layout's `onMount`:
 * repeat calls after the first are no-ops, so a client-side navigation never
 * pays for another table scan.
 */
export function primeDueCount(): Promise<void> {
	if (!browser || scanned) return Promise.resolve();
	scanned = true;
	return scan();
}

/** Forces a fresh scan (used on `visibilitychange`, when the count may have gone stale). */
export function refreshDueCount(): Promise<void> {
	if (!browser) return Promise.resolve();
	scanned = true;
	return scan();
}

/** Test-only reset of the session cache, mirroring `resetStatsCache`'s purpose. */
export function _resetDueCount(): void {
	count = 0;
	scanned = false;
}
