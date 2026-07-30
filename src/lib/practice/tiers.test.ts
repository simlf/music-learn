import { describe, expect, it } from 'vitest';
import { ROOTS, QUALITY_SUFFIXES } from '$lib/theory/randomChord';
import { spellChord } from '$lib/theory/chord';
import {
	TIERS,
	tierById,
	itemsForTier,
	itemsForTiers,
	splitSymbol,
	availableTierIds
} from './tiers';

describe('the 6-tier table (R3)', () => {
	it('defines exactly 6 tiers with ids 1 through 6 in order', () => {
		expect(TIERS.map((tier) => tier.id)).toEqual([1, 2, 3, 4, 5, 6]);
	});

	it('tier 1 is white-key major and minor triads only (14 items)', () => {
		const tier = tierById(1);
		expect(tier.roots).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
		expect(tier.qualities).toEqual(['', 'm']);
		expect(itemsForTier(1)).toHaveLength(14);
	});

	it('tier 2 is all-key triads plus dim (36 items)', () => {
		const tier = tierById(2);
		expect(tier.roots).toEqual(ROOTS);
		expect(tier.qualities).toEqual(['', 'm', 'dim']);
		expect(itemsForTier(2)).toHaveLength(36);
	});

	it('tier 3 is the big three sevenths: maj7, m7, 7 (36 items)', () => {
		const tier = tierById(3);
		expect(tier.qualities).toEqual(['maj7', 'm7', '7']);
		expect(itemsForTier(3)).toHaveLength(36);
	});

	it('tier 4 is the minor ii-V colors: m7b5, dim7 (24 items)', () => {
		const tier = tierById(4);
		expect(tier.qualities).toEqual(['m7b5', 'dim7']);
		expect(itemsForTier(4)).toHaveLength(24);
	});

	it('every defined tier needs zero further engine work: every quality sits in QUALITY_SUFFIXES', () => {
		for (const id of [1, 2, 3, 4, 5, 6] as const) {
			for (const quality of tierById(id).qualities) {
				expect(QUALITY_SUFFIXES).toContain(quality);
			}
			expect(tierById(id).available).toBe(true);
		}
	});

	it('tier 5 is sixths and sus, unlocked (n1-tier-unlock): 6, m6, sus4, 7sus4 (48 items)', () => {
		expect(tierById(5).available).toBe(true);
		expect(tierById(5).qualities).toEqual(['6', 'm6', 'sus4', '7sus4']);
		expect(itemsForTier(5)).toHaveLength(48);
	});

	it('tier 6 is altered-dominant extensions, unlocked (n1-tier-unlock): only 7b9 and 7#5 (24 items)', () => {
		// 9, maj9, m9 and 13 were drafted for tier 6 but held back: their extra
		// 9th/13th tone overflows the construction drill's fixed 2-octave
		// keyboard for at least one root (verified by executing the engine;
		// see randomChord.ts's TIER_5_6_QUALITY_SUFFIXES docstring), and that
		// drill has no guard against an unreachable target.
		expect(tierById(6).available).toBe(true);
		expect(tierById(6).qualities).toEqual(['7b9', '7#5']);
		expect(itemsForTier(6)).toHaveLength(24);
	});

	it('availableTierIds returns all 6 tiers (n1-tier-unlock: mastery gates who reaches a tier, not this flag)', () => {
		expect(availableTierIds()).toEqual([1, 2, 3, 4, 5, 6]);
	});

	it('every tier 1-6 item is recognized by spellChord', () => {
		for (const id of [1, 2, 3, 4, 5, 6] as const) {
			for (const symbol of itemsForTier(id)) {
				expect(spellChord(symbol).recognized).toBe(true);
			}
		}
	});
});

describe('tier blurbs (beginner on-ramp, sketch 007)', () => {
	it('gives every tier a one-line plain-language blurb with no em dashes', () => {
		const expected: Record<number, string> = {
			1: 'Just the white-key major and minor chords: C D E F G A B. No sharps or flats yet. Start here.',
			2: 'All twelve roots now: major, minor, and diminished triads.',
			3: 'The seventh chords that show up everywhere: maj7, m7, and dominant 7.',
			4: 'Half-diminished and diminished seventh chords, the color of a minor ii-V-i.',
			5: 'Sixth chords and sus chords.',
			6: 'Altered dominant colors: the flat nine and the sharp five.'
		};
		for (const tier of TIERS) {
			expect(tier.blurb).toBe(expected[tier.id]);
			expect(tier.blurb).not.toContain('—');
			expect(tier.blurb).not.toContain('–');
		}
	});
});

describe('itemsForTiers', () => {
	it('unions items across tiers, deduping the tier 1 / tier 2 overlap', () => {
		const items = itemsForTiers([1, 2]);
		// Tier 2 (36) fully contains tier 1's 14 white-key triads.
		expect(items).toHaveLength(36);
		expect(new Set(items).size).toBe(items.length);
	});

	it('unions tier 5 and 6 (both unlocked, n1-tier-unlock): 48 + 24, no overlap with each other', () => {
		const items = itemsForTiers([5, 6]);
		expect(items).toHaveLength(48 + 24);
		expect(new Set(items).size).toBe(items.length);
	});

	// itemsForTier's own `!tier.available` branch (locked tiers contribute
	// nothing) has no live tier to exercise it against as of n1-tier-unlock:
	// every id in TierId (1-6) is now available. Kept as dead-code-safe
	// defensive logic (matching curriculum.ts's own "safety net for future
	// catalog growth" convention) rather than removed, in case a 7th tier is
	// ever drafted `available: false` before its engine work lands.
});

describe('splitSymbol', () => {
	it('splits a symbol into root and quality, preferring the longest root match', () => {
		expect(splitSymbol('F#m7')).toEqual({ root: 'F#', quality: 'm7' });
		expect(splitSymbol('F7')).toEqual({ root: 'F', quality: '7' });
		expect(splitSymbol('Bbmaj7')).toEqual({ root: 'Bb', quality: 'maj7' });
		expect(splitSymbol('C')).toEqual({ root: 'C', quality: '' });
	});

	it('returns null for a symbol outside the known root set', () => {
		expect(splitSymbol('H7')).toBeNull();
	});
});
