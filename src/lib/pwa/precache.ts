/**
 * Pure helpers for the service worker's precache list and cache naming.
 *
 * This module intentionally imports nothing from `$service-worker` (the
 * virtual module only resolves inside the SW bundle) so it stays runnable
 * under Vitest. `src/service-worker.ts` passes in the `build`/`files`/
 * `prerendered` arrays and `version` string it gets from `$service-worker`.
 */

import { SALAMANDER_BASE_URL } from '$lib/audio/samples';

/**
 * True when the URL corresponds to a self-hosted Salamander piano sample.
 * The ~1.9MB sample set is deliberately excluded from install-time precache
 * and runtime-cached on demand instead (see 22-CONTEXT PWA-01).
 */
export function isSampleAsset(url: string): boolean {
	return url.includes(SALAMANDER_BASE_URL);
}

/**
 * Builds the install-time precache list: every hashed build chunk, every
 * prerendered route, and the small static files (icons, manifest) -- with
 * the sample mp3s filtered out of `files`. De-duplicated in case any entry
 * appears in more than one input array.
 */
export function installPrecacheList(
	build: string[],
	files: string[],
	prerendered: string[]
): string[] {
	const entries = [...build, ...files.filter((f) => !isSampleAsset(f)), ...prerendered];
	return [...new Set(entries)];
}

/** Deterministic, version-keyed cache name for the app-shell cache. */
export function cacheName(version: string): string {
	return `music-learn-cache-${version}`;
}
