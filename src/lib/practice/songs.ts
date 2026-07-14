/* TRACK-B1-STUB: architect deletes at merge. Minimal read-only slice of the
 * Track B1 songs contract (ARCHITECTURE-CONTRACTS.md "Practice (B provides)")
 * so the practice engine can code against `activeSongChordSymbols()` tonight.
 * B1's real module owns saveSong/deleteSong, presets, and the /songs route;
 * it reads and writes the same "music-learn:songs" localStorage key, so this
 * stub interoperates with real B1 data if both land on one branch.
 */

export type SongSource = 'preset' | 'custom';

export interface Song {
	id: string;
	name: string;
	chordSymbols: string[];
	createdAt: string;
	source: SongSource;
	active: boolean;
	presetId?: string;
}

const SONGS_KEY = 'music-learn:songs';

function isSong(value: unknown): value is Song {
	if (typeof value !== 'object' || value === null) return false;
	const song = value as Record<string, unknown>;
	return (
		typeof song.id === 'string' &&
		typeof song.name === 'string' &&
		Array.isArray(song.chordSymbols) &&
		song.chordSymbols.every((symbol) => typeof symbol === 'string') &&
		typeof song.active === 'boolean'
	);
}

/** Reads the stored songs; corrupt or missing data resets to []. */
export function listSongs(): Song[] {
	try {
		const raw = localStorage.getItem(SONGS_KEY);
		if (raw === null) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isSong);
	} catch {
		return [];
	}
}

/** Deduped union of chord symbols across ACTIVE songs. B2's pool input. */
export function activeSongChordSymbols(): string[] {
	const symbols = new Set<string>();
	for (const song of listSongs()) {
		if (!song.active) continue;
		for (const symbol of song.chordSymbols) {
			symbols.add(symbol);
		}
	}
	return [...symbols];
}
