/**
 * songFilterPref (quick task 260720-v9u): the single global "From my songs"
 * practice-pool preference. Written by /songs (the one control that sets
 * it) and read by Drills and Recall, which no longer own their own toggle.
 *
 * On first read this module OR-migrates the two legacy per-surface keys
 * (`music-learn:recall-song-filter`, `music-learn:drills-song-filter`) into
 * the single `music-learn:song-filter` key and deletes both legacy keys, so
 * a returning user whose old drills OR recall key was ON keeps the filter
 * ON afterward. A fresh install (neither legacy key present) persists
 * nothing on read - only writeSongFilter ever creates the new key in that
 * case.
 *
 * Total/degrade-to-off: every storage access is wrapped so a thrown or
 * disabled localStorage never crashes the page, mirroring the existing
 * pattern in recall/+page.svelte and songs.ts. This module owns only the
 * persisted flag - it never touches the drawFromSymbols/drawFromPool pool
 * seam or any provenance logic.
 */

const NEW_KEY = 'music-learn:song-filter';
const LEGACY_RECALL_KEY = 'music-learn:recall-song-filter';
const LEGACY_DRILLS_KEY = 'music-learn:drills-song-filter';

/**
 * Reads the persisted global filter flag. The new key wins immediately once
 * it exists (legacy keys are never consulted or deleted in that case).
 * Otherwise performs the one-time OR-migration described above. Any storage
 * failure degrades to false.
 */
export function readSongFilter(): boolean {
	try {
		const current = localStorage.getItem(NEW_KEY);
		if (current !== null) return current === 'true';

		const recallValue = localStorage.getItem(LEGACY_RECALL_KEY);
		const drillsValue = localStorage.getItem(LEGACY_DRILLS_KEY);
		if (recallValue === null && drillsValue === null) return false;

		const migrated = recallValue === 'true' || drillsValue === 'true';
		localStorage.setItem(NEW_KEY, String(migrated));
		localStorage.removeItem(LEGACY_RECALL_KEY);
		localStorage.removeItem(LEGACY_DRILLS_KEY);
		return migrated;
	} catch {
		return false;
	}
}

/** Persists the global filter flag. Quota/disabled-storage errors are swallowed (best-effort persistence). */
export function writeSongFilter(on: boolean): void {
	try {
		localStorage.setItem(NEW_KEY, String(on));
	} catch {
		// Best-effort persistence only; the in-memory toggle still works.
	}
}
