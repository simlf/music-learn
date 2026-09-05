import { beforeEach, describe, expect, it } from 'vitest';
import { consumeCompSongSeed, setCompSongSeed } from './compSongSeed';

const COMP_SONG_SEED_KEY = 'music-learn:comp-song-seed';

beforeEach(() => {
	localStorage.clear();
});

describe('comp song seed one-shot handoff (proposal 2: Play over it)', () => {
	it('round-trips a request and clears it on consume', () => {
		setCompSongSeed('Autumn Leaves', ['Cm7b5', 'F7', 'Bbm7']);
		expect(consumeCompSongSeed()).toEqual({
			songName: 'Autumn Leaves',
			symbols: ['Cm7b5', 'F7', 'Bbm7']
		});
		expect(consumeCompSongSeed()).toBeNull();
	});

	it('returns null when nothing was set', () => {
		expect(consumeCompSongSeed()).toBeNull();
	});

	it('resets corrupt data to null without throwing', () => {
		localStorage.setItem(COMP_SONG_SEED_KEY, '{nope');
		expect(() => consumeCompSongSeed()).not.toThrow();
		expect(consumeCompSongSeed()).toBeNull();
	});

	it('rejects an empty symbol list', () => {
		localStorage.setItem(COMP_SONG_SEED_KEY, JSON.stringify({ songName: 'X', symbols: [] }));
		expect(consumeCompSongSeed()).toBeNull();
	});

	it('filters non-string entries out of symbols', () => {
		localStorage.setItem(
			COMP_SONG_SEED_KEY,
			JSON.stringify({ songName: 'X', symbols: ['Cm7', 42, null] })
		);
		expect(consumeCompSongSeed()).toEqual({ songName: 'X', symbols: ['Cm7'] });
	});
});
