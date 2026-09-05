import { beforeEach, describe, expect, it } from 'vitest';
import type { CardRecord } from '$lib/srs/deck';
import { newCard, Rating } from '$lib/srs/scheduler';
import {
	SONG_PLAYTHROUGH_KEY,
	buildPlaythroughItems,
	consumeSongPlaythrough,
	setSongPlaythrough
} from './songPlaythrough';

beforeEach(() => {
	localStorage.clear();
});

describe('song play-through one-shot handoff (PLAY-01)', () => {
	it('round-trips a request and clears it on consume', () => {
		setSongPlaythrough('Blue Bossa', ['Cm7', 'Fm7']);
		expect(consumeSongPlaythrough()).toEqual({ songName: 'Blue Bossa', symbols: ['Cm7', 'Fm7'] });
		expect(consumeSongPlaythrough()).toBeNull();
	});

	it('returns null when nothing was set', () => {
		expect(consumeSongPlaythrough()).toBeNull();
	});

	it('resets corrupt data to null without throwing', () => {
		localStorage.setItem(SONG_PLAYTHROUGH_KEY, '{nope');
		expect(() => consumeSongPlaythrough()).not.toThrow();
		expect(consumeSongPlaythrough()).toBeNull();
	});

	it('rejects a payload missing a symbols array', () => {
		localStorage.setItem(SONG_PLAYTHROUGH_KEY, JSON.stringify({ songName: 'X' }));
		expect(consumeSongPlaythrough()).toBeNull();
	});

	it('rejects an empty symbol list', () => {
		localStorage.setItem(
			SONG_PLAYTHROUGH_KEY,
			JSON.stringify({ songName: 'X', symbols: [] })
		);
		expect(consumeSongPlaythrough()).toBeNull();
	});

	it('filters non-string entries out of symbols', () => {
		localStorage.setItem(
			SONG_PLAYTHROUGH_KEY,
			JSON.stringify({ songName: 'X', symbols: ['Cm7', 42, null] })
		);
		expect(consumeSongPlaythrough()).toEqual({ songName: 'X', symbols: ['Cm7'] });
	});
});

describe('buildPlaythroughItems (PLAY-01/02/03)', () => {
	const NOW = new Date('2026-09-05T12:00:00Z');

	function dueCard(factId: string, mode: CardRecord['mode']): CardRecord {
		return {
			...newCard(NOW),
			factId,
			factKind: 'chord-formula',
			mode,
			lastRating: Rating.Good,
			masteryDayCount: 1
		};
	}

	it('builds one item per symbol, FIFO, in sheet order', () => {
		const { items, skipped } = buildPlaythroughItems(['Cm7', 'Fm7', 'Bb7'], new Map());

		expect(items.map((item) => item.symbol)).toEqual(['Cm7', 'Fm7', 'Bb7']);
		expect(skipped).toBe(0);
	});

	it('keeps repeats intact - real tunes repeat their ii-V-Is (PLAY-02)', () => {
		const { items } = buildPlaythroughItems(['Cm7', 'F7', 'Cm7', 'F7'], new Map());

		expect(items.map((item) => item.symbol)).toEqual(['Cm7', 'F7', 'Cm7', 'F7']);
		// Distinct queue slots, not one item asked twice by identity.
		expect(new Set(items.map((item) => item.id)).size).toBe(4);
	});

	it('every item asks see-play, the honest question for a chord read off the chart', () => {
		const { items } = buildPlaythroughItems(['Cm7'], new Map());
		expect(items[0].family).toBe('play-it');
		expect(items[0].mode).toBe('see-play');
	});

	it('shares the SAME CardRecord object across every repeat of one symbol', () => {
		const { items } = buildPlaythroughItems(['Cm7', 'F7', 'Cm7'], new Map());
		expect(items[0].card).toBe(items[2].card);
		expect(items[0].card).not.toBe(items[1].card);
	});

	it('reuses an existing card by (factId, see-play) identity instead of minting a fresh one', () => {
		const existing = dueCard('chord-formula:Cm7', 'see-play');
		const { items } = buildPlaythroughItems(['Cm7'], new Map([['chord-formula:Cm7:see-play', existing]]));

		expect(items[0].card).toBe(existing);
	});

	it('ignores an existing card under a DIFFERENT mode for the same fact', () => {
		const formulaCard = dueCard('chord-formula:Cm7', 'formula');
		const { items } = buildPlaythroughItems(['Cm7'], new Map([['chord-formula:Cm7:formula', formulaCard]]));

		expect(items[0].card).not.toBe(formulaCard);
		expect(items[0].card.mode).toBe('see-play');
	});

	it('remaps a normalizeable symbol to its catalog spelling (PLAY-03)', () => {
		const { items, skipped } = buildPlaythroughItems(['D#m7'], new Map());
		expect(items[0].symbol).toBe('Ebm7');
		expect(items[0].factId).toBe('chord-formula:Ebm7');
		expect(skipped).toBe(0);
	});

	it('counts a genuinely non-catalog symbol as skipped rather than crashing (PLAY-03)', () => {
		const { items, skipped } = buildPlaythroughItems(['Cm7', 'C9', 'F7'], new Map());

		expect(items.map((item) => item.symbol)).toEqual(['Cm7', 'F7']);
		expect(skipped).toBe(1);
	});

	it('counts garbage input as skipped without throwing', () => {
		expect(() => buildPlaythroughItems(['NotAChord'], new Map())).not.toThrow();
		const { items, skipped } = buildPlaythroughItems(['NotAChord'], new Map());
		expect(items).toEqual([]);
		expect(skipped).toBe(1);
	});

	it('returns an empty build for an empty symbol list', () => {
		const { items, skipped } = buildPlaythroughItems([], new Map());
		expect(items).toEqual([]);
		expect(skipped).toBe(0);
	});
});
