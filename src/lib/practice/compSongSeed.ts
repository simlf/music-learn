/**
 * One-shot handoff from song management into the comping loop (proposal 2's
 * "Play over it", `.planning/design/improvisation.md` 4.3.2/5.2): a
 * companion channel to drillSeeds.ts and songPlaythrough.ts, kept separate
 * because it feeds a different surface - /learn's CompingLoop, an ungraded
 * INSTRUMENT, never the FSRS-backed /practice queue - with a different shape
 * (an ordered symbol list plus the song's display name, no FactKind, no
 * CardRecord).
 */

const COMP_SONG_SEED_KEY = 'music-learn:comp-song-seed';

export interface CompSongSeed {
	songName: string;
	symbols: string[];
}

/** Writes the one-shot "play over it" request. Storage failures degrade to a no-op (the button then just navigates). */
export function setCompSongSeed(songName: string, symbols: string[]): void {
	try {
		localStorage.setItem(COMP_SONG_SEED_KEY, JSON.stringify({ songName, symbols }));
	} catch {
		// Storage unavailable: the button degrades to plain navigation.
	}
}

/** Reads and clears the pending request (one-shot). Malformed or empty storage returns null rather than throwing. */
export function consumeCompSongSeed(): CompSongSeed | null {
	try {
		const raw = localStorage.getItem(COMP_SONG_SEED_KEY);
		localStorage.removeItem(COMP_SONG_SEED_KEY);
		if (raw === null) return null;
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null) return null;
		const { songName, symbols } = parsed as Record<string, unknown>;
		if (typeof songName !== 'string') return null;
		if (!Array.isArray(symbols)) return null;
		const cleaned = symbols.filter((symbol): symbol is string => typeof symbol === 'string');
		if (cleaned.length === 0) return null;
		return { songName, symbols: cleaned };
	} catch {
		return null;
	}
}
