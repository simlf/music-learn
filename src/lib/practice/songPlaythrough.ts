import type { CardRecord, Mode } from '$lib/srs/deck';
import { factById } from '$lib/srs/facts';
import { newCard } from '$lib/srs/scheduler';
import { resolveDrillableSymbol } from './songProvenance';
import type { CardedQueueItem } from './practiceQueue';

/**
 * The song play-through one-shot handoff (PLAY-01): a THIRD localStorage
 * channel into /practice, alongside drillSeeds.ts's two (drill-seeds,
 * lesson-seeds). Deliberately separate rather than reusing either: this
 * channel keeps REPEATS and SHEET ORDER (real tunes repeat their ii-V-Is,
 * PLAY-02's explicit exception to the rest of the app's dedupe-by-factId
 * rule) and must never be diluted or cut by the daily target (PLAY-02) -
 * both the opposite of drillSeeds's dedup-by-factId, pool-blended contract.
 * See practice/+page.svelte's load()/loadPlaythrough() for the consuming
 * side, which skips FSRS due-loading and composePracticeQueue entirely when
 * this channel holds a pending request.
 */

export const SONG_PLAYTHROUGH_KEY = 'music-learn:song-playthrough';

export interface SongPlaythroughSeed {
	songName: string;
	symbols: string[];
}

/** Writes the one-shot play-through request. Storage failures degrade to a no-op (the button then just navigates). */
export function setSongPlaythrough(songName: string, symbols: string[]): void {
	try {
		localStorage.setItem(SONG_PLAYTHROUGH_KEY, JSON.stringify({ songName, symbols }));
	} catch {
		// Storage unavailable: the button degrades to plain navigation.
	}
}

/** Reads and clears the pending play-through request (one-shot). Malformed or empty storage returns null rather than throwing. */
export function consumeSongPlaythrough(): SongPlaythroughSeed | null {
	try {
		const raw = localStorage.getItem(SONG_PLAYTHROUGH_KEY);
		localStorage.removeItem(SONG_PLAYTHROUGH_KEY);
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

/**
 * Every seed writer in the app hands off to 'see-play' (drillSeeds.ts's own
 * doc comment): the honest question for a chord the user is looking straight
 * at, whether that is a Lookup result or, here, a line on the stand.
 */
const PLAYTHROUGH_MODE: Mode = 'see-play';

export interface PlaythroughBuild {
	items: CardedQueueItem[];
	/** Symbols resolveDrillableSymbol could not match to any catalog fact (PLAY-03) - counted rather than crashing the run. */
	skipped: number;
}

/**
 * Builds the play-through queue: FIFO, repeats intact (PLAY-01/02). One
 * CardRecord per DISTINCT resolved factId, shared by every occurrence in the
 * queue (from `existingCardsByKey`, keyed the same way
 * practice/+page.svelte's own buildSeededItems keys its lookup, or a fresh
 * `newCard` the first time this fact is asked in this mode) - a repeat is a
 * SECOND question about the SAME card, not a second card, and
 * practice/+page.svelte's completeCarded propagates every grade to every
 * queue item sharing that (factId, mode) identity so a later repeat always
 * grades from the state the prior one just persisted, never a stale
 * pre-round snapshot.
 */
export function buildPlaythroughItems(
	symbols: readonly string[],
	existingCardsByKey: ReadonlyMap<string, CardRecord>
): PlaythroughBuild {
	const now = new Date();
	const cardByFactId = new Map<string, CardRecord>();
	const items: CardedQueueItem[] = [];
	let skipped = 0;

	symbols.forEach((rawSymbol, index) => {
		const resolved = resolveDrillableSymbol(rawSymbol);
		const fact = resolved === undefined ? undefined : factById(`chord-formula:${resolved}`);
		if (resolved === undefined || fact === undefined || fact.factKind !== 'chord-formula') {
			skipped += 1;
			return;
		}
		const factId = fact.factId;

		let card = cardByFactId.get(factId);
		if (card === undefined) {
			card =
				existingCardsByKey.get(`${factId}:${PLAYTHROUGH_MODE}`) ??
				({
					...newCard(now),
					factId,
					factKind: 'chord-formula',
					mode: PLAYTHROUGH_MODE,
					lastRating: null,
					masteryDayCount: 0
				} satisfies CardRecord);
			cardByFactId.set(factId, card);
		}

		items.push({
			id: `song-playthrough:${factId}:${index}`,
			family: 'play-it',
			factId,
			mode: PLAYTHROUGH_MODE,
			factKind: 'chord-formula',
			symbol: resolved,
			short: undefined,
			card
		});
	});

	return { items, skipped };
}
