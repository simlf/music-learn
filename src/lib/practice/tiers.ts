/**
 * The 6-tier learning ladder (R3-learning.md section 1). Tier gating is a
 * FILTER over the proven ROOTS x QUALITY_SUFFIXES matrix, not a new question
 * engine: tiers 1 to 4 map exactly onto the original 96-item space.
 *
 * TIERS 5 AND 6 (n1-tier-unlock). Both are now `available: true`, gated
 * entirely by mastery (levelState.ts's `tierMastered`/`earnedTier`): tier 5
 * opens once tier 4's chords are mastered (TIER_MASTERY_PERCENT of them),
 * tier 6 once tier 5's are. A user who has not yet mastered tier 4 sees zero behavior change -
 * `currentTier` simply never advances past 4 for them, `available` here
 * only controls whether the RUNG EXISTS at all, not who can reach it.
 *
 * Tier 6's quality list is deliberately NOT the full "9, maj9, m9, 7b9,
 * 7#5, 13" set once drafted for it: 9, maj9, m9 and 13 were held back after
 * verifying the whole pipeline by executing it (see
 * randomChord.ts's TIER_5_6_QUALITY_SUFFIXES docstring) - their extra
 * 9th/13th tone pushes the construction ("build it") drill's fixed
 * 2-octave keyboard past its top for at least one root, which that drill
 * has no guard against. Only 7b9 and 7#5 (verified safe on every root)
 * ship in tier 6.
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
	/**
	 * False for a tier whose qualities need engine work (new suffixes +
	 * reference tests) before it can exist at all. As of n1-tier-unlock every
	 * defined tier (1-6) is true; WHO can reach a given tier is a separate,
	 * mastery-gated question owned by levelState.ts, not this flag.
	 */
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
		available: true,
		blurb: 'Sixth chords and sus chords.'
	},
	{
		id: 6,
		name: 'Extensions and alterations',
		roots: [...ROOTS],
		qualities: ['7b9', '7#5'],
		available: true,
		blurb: 'Altered dominant colors: the flat nine and the sharp five.'
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
