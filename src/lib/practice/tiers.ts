/**
 * The 6-tier learning ladder (R3-learning.md section 1). Tier gating is a
 * FILTER over the proven ROOTS x QUALITY_SUFFIXES matrix, not a new question
 * engine: tiers 1 to 4 map exactly onto the existing 96-item space. Tiers 5
 * and 6 are defined here so the shape of the ladder is visible in settings,
 * but stay locked (available: false) until the engine matrix grows beyond
 * 12x8.
 *
 * Pure data module: no DOM, no Svelte, no storage (levelState.ts owns
 * persistence).
 */

import { ROOTS } from '$lib/theory/randomChord';

export type TierId = 1 | 2 | 3 | 4 | 5 | 6;

export interface TierDef {
	id: TierId;
	name: string;
	/** Subset of randomChord's ROOTS (ASCII accidentals). */
	roots: string[];
	/** Chord-quality symbol suffixes drilled at this tier. */
	qualities: string[];
	/** False for tiers whose qualities need engine work (new suffixes + reference tests). */
	available: boolean;
	/** One plain, encouraging sentence describing the tier for the beginner on-ramp (sketch 007). No em dashes. */
	blurb: string;
}

const WHITE_KEY_ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

export const TIERS: TierDef[] = [
	{
		id: 1,
		name: 'White-key triads',
		roots: WHITE_KEY_ROOTS,
		qualities: ['', 'm'],
		available: true,
		blurb:
			'Just the white-key major and minor chords: C D E F G A B. No sharps or flats yet. Start here.'
	},
	{
		id: 2,
		name: 'All-key triads',
		roots: [...ROOTS],
		qualities: ['', 'm', 'dim'],
		available: true,
		blurb: 'All twelve roots now: major, minor, and diminished triads.'
	},
	{
		id: 3,
		name: 'The big three sevenths',
		roots: [...ROOTS],
		qualities: ['maj7', 'm7', '7'],
		available: true,
		blurb: 'The seventh chords that show up everywhere: maj7, m7, and dominant 7.'
	},
	{
		id: 4,
		name: 'Minor ii-V colors',
		roots: [...ROOTS],
		qualities: ['m7b5', 'dim7'],
		available: true,
		blurb: 'Half-diminished and diminished seventh chords, the color of a minor ii-V-i.'
	},
	{
		id: 5,
		name: 'Sixths and sus',
		roots: [...ROOTS],
		qualities: ['6', 'm6', 'sus4', '7sus4'],
		available: false,
		blurb: 'Sixth chords and sus chords. Coming later.'
	},
	{
		id: 6,
		name: 'Extensions and alterations',
		roots: [...ROOTS],
		qualities: ['9', 'maj9', 'm9', '7b9', '7#5', '13'],
		available: false,
		blurb: '9ths, altered dominants, and more color tones. Coming later.'
	}
];

/** Looks up a tier by id. Total over TierId, so the non-null assertion is safe. */
export function tierById(id: TierId): TierDef {
	return TIERS.find((tier) => tier.id === id) as TierDef;
}

/** Tier ids drillable today (engine work done), in ascending order. */
export function availableTierIds(): TierId[] {
	return TIERS.filter((tier) => tier.available).map((tier) => tier.id);
}

/** All chord symbols of one tier (empty for locked tiers). */
export function itemsForTier(id: TierId): string[] {
	const tier = tierById(id);
	if (!tier.available) return [];
	const items: string[] = [];
	for (const root of tier.roots) {
		for (const quality of tier.qualities) {
			items.push(`${root}${quality}`);
		}
	}
	return items;
}

/** Deduped union of items across the given tiers (locked tiers contribute nothing). */
export function itemsForTiers(ids: TierId[]): string[] {
	const items = new Set<string>();
	for (const id of ids) {
		for (const item of itemsForTier(id)) {
			items.add(item);
		}
	}
	return [...items];
}

/**
 * Splits a chord symbol into root + quality suffix, preferring the LONGEST
 * matching root so "F#m7" splits as F# + m7 rather than F + #m7. Returns
 * null for symbols whose root is outside the proven ROOTS set.
 */
export function splitSymbol(symbol: string): { root: string; quality: string } | null {
	let match: string | null = null;
	for (const root of ROOTS) {
		if (symbol.startsWith(root) && (match === null || root.length > match.length)) {
			match = root;
		}
	}
	if (match === null) return null;
	return { root: match, quality: symbol.slice(match.length) };
}
