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

	it('tiers 1 to 4 need zero engine work: every quality sits in QUALITY_SUFFIXES', () => {
		for (const id of [1, 2, 3, 4] as const) {
			for (const quality of tierById(id).qualities) {
				expect(QUALITY_SUFFIXES).toContain(quality);
			}
			expect(tierById(id).available).toBe(true);
		}
	});

	it('tiers 5 and 6 are defined but locked as coming later (engine matrix is 12x8 today)', () => {
		expect(tierById(5).available).toBe(false);
		expect(tierById(5).qualities).toEqual(['6', 'm6', 'sus4', '7sus4']);
		expect(tierById(6).available).toBe(false);
		expect(tierById(6).qualities).toEqual(['9', 'maj9', 'm9', '7b9', '7#5', '13']);
	});

	it('availableTierIds returns only tiers 1 through 4', () => {
		expect(availableTierIds()).toEqual([1, 2, 3, 4]);
	});

	it('every tier 1-4 item is recognized by spellChord', () => {
		for (const id of [1, 2, 3, 4] as const) {
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
			5: 'Sixth chords and sus chords. Coming later.',
			6: '9ths, altered dominants, and more color tones. Coming later.'
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

	it('skips unavailable tiers even if asked for', () => {
		expect(itemsForTiers([5, 6])).toHaveLength(0);
	});
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
