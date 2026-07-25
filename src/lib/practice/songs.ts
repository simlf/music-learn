/**
 * Song persistence: the user's own songs (typed in from sheet music or
 * copied from a preset), stored device-locally in localStorage under the
 * established music-learn:* pattern (recentLookups.ts is the template).
 *
 * Total functions throughout: malformed or hand-edited storage never throws,
 * it just degrades to an empty list; write failures (quota, disabled
 * storage) degrade to a no-op so the page keeps working without persistence
 * (availability over durability).
 *
 * Presets live in presets.ts as code constants and are COPIED into a Song
 * on add, so preset upgrades in later app versions never need a data
 * migration and the user can edit their copy freely.
 */

const STORAGE_KEY = 'music-learn:songs';

export type SongSource = 'preset' | 'custom';

export interface Song {
	/** crypto.randomUUID() for custom songs; presets get a copy with a fresh id when added. */
	id: string;
	/** User-facing name, e.g. "Autumn Leaves (my arrangement)". */
	name: string;
	/**
	 * The ORDERED progression as validated symbols (ASCII accidentals, the
	 * form spellChord echoes). Duplicates allowed and meaningful: frequency
	 * in the tune drives drill weight, and order enables a future
	 * play-through mode.
	 */
	chordSymbols: string[];
	/** ISO 8601. String, not Date: survives JSON round-trips. */
	createdAt: string;
	/** 'preset' if created from a preset card (still fully editable); 'custom' if typed from scratch. */
	source: SongSource;
	/** Active songs feed the drill weighting pool. */
	active: boolean;
	/** Back-reference to the preset it was copied from, e.g. 'autumn-leaves-gm'. Optional. */
	presetId?: string;
}

/**
 * Reads the raw persisted song list, schema-guarded but NOT deduped. Returns
 * [] when the store is empty, missing, or not an array; individual malformed
 * entries are dropped so one corrupt record never wipes the rest of the
 * library. Internal - saveSong/deleteSong read+write through this so a
 * display-only dedup (see listSongs) never gets baked into an unrelated
 * write.
 */
function readStoredSongs(): Song[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw === null) return [];

		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];

		return parsed.filter(isSong);
	} catch {
		return [];
	}
}

/**
 * Reads the persisted song list for display, collapsing duplicate stored
 * records that share the same non-empty presetId (UAT G4: a preset added
 * before the in-memory add-guard existed could already be duplicated in
 * storage, and would otherwise show twice in Progress > Songs forever).
 * Read-path only: never rewrites localStorage, so a pre-existing duplicate
 * stays in storage but is never surfaced twice.
 */
export function listSongs(): Song[] {
	return dedupeByPresetId(readStoredSongs());
}

/**
 * Collapses `songs` so each non-empty presetId contributes exactly one
 * entry, at that presetId's first-occurrence position (list order and
 * relative position of every other song are otherwise untouched). Within a
 * duplicate group, an active song wins over an inactive one; otherwise the
 * first-seen record wins. Songs without a presetId (custom songs) are never
 * touched or reordered.
 */
function dedupeByPresetId(songs: Song[]): Song[] {
	const winnerByPresetId = new Map<string, Song>();
	for (const song of songs) {
		if (song.presetId === undefined || song.presetId === '') continue;
		const existing = winnerByPresetId.get(song.presetId);
		if (existing === undefined || (!existing.active && song.active)) {
			winnerByPresetId.set(song.presetId, song);
		}
	}

	const seenPresetIds = new Set<string>();
	const result: Song[] = [];
	for (const song of songs) {
		if (song.presetId === undefined || song.presetId === '') {
			result.push(song);
			continue;
		}
		if (seenPresetIds.has(song.presetId)) continue;
		seenPresetIds.add(song.presetId);
		result.push(winnerByPresetId.get(song.presetId) ?? song);
	}
	return result;
}

/**
 * Upserts a song by id: an existing song is replaced in place (keeping its
 * list position), a new one is appended. Storage failures degrade to a
 * no-op write.
 *
 * Same-presetId add guard (UAT G4 hardening): if `song` is genuinely new (no
 * existing record shares its id) but its presetId already has a stored
 * record, the add is a no-op rather than appending a second row for the
 * same preset - the storage layer itself can no longer manufacture a fresh
 * duplicate, even if a future call site forgets the in-memory
 * findSongByPresetId guard.
 */
export function saveSong(song: Song): void {
	const songs = readStoredSongs();
	const index = songs.findIndex((existing) => existing.id === song.id);
	if (index !== -1) {
		songs[index] = song;
		writeSongs(songs);
		return;
	}

	if (
		song.presetId !== undefined &&
		song.presetId !== '' &&
		songs.some((existing) => existing.presetId === song.presetId)
	) {
		return;
	}

	songs.push(song);
	writeSongs(songs);
}

/** Removes the song with the given id. Unknown ids are a no-op. */
export function deleteSong(id: string): void {
	const songs = readStoredSongs();
	const remaining = songs.filter((song) => song.id !== id);
	if (remaining.length === songs.length) return;
	writeSongs(remaining);
}

/**
 * The deduped union of chord symbols across all ACTIVE songs, in first-seen
 * order. This is the practice engine's pool input (Track B2 contract): what
 * the user is actually playing right now, one symbol each.
 */
export function activeSongChordSymbols(): string[] {
	const union = new Set<string>();
	for (const song of listSongs()) {
		if (!song.active) continue;
		for (const symbol of song.chordSymbols) {
			union.add(symbol);
		}
	}
	return [...union];
}

/**
 * Finds the first song copied from the given preset, if the user already
 * added it. Total and side-effect-free: an empty list, no match, or a list
 * of custom songs (no presetId at all) all return undefined, never throw.
 */
export function findSongByPresetId(songs: Song[], presetId: string): Song | undefined {
	return songs.find((song) => song.presetId === presetId);
}

/** Schema guard for one stored entry; anything off-shape is dropped on read. */
function isSong(value: unknown): value is Song {
	if (typeof value !== 'object' || value === null) return false;
	const record = value as Record<string, unknown>;
	return (
		typeof record.id === 'string' &&
		typeof record.name === 'string' &&
		Array.isArray(record.chordSymbols) &&
		record.chordSymbols.every((symbol) => typeof symbol === 'string') &&
		typeof record.createdAt === 'string' &&
		(record.source === 'preset' || record.source === 'custom') &&
		typeof record.active === 'boolean' &&
		(record.presetId === undefined || typeof record.presetId === 'string')
	);
}

/** Serializes the full list; quota/disabled-storage failures are swallowed. */
function writeSongs(songs: Song[]): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
	} catch {
		// Keep the page working without persistence rather than throwing.
	}
}
