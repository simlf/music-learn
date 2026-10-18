import { describe, expect, it } from 'vitest';
import { lowestPlayedChroma, matchInversion } from './matchInversion';
import { spellChord } from '$lib/theory/chord';

describe('matchInversion', () => {
	it('right notes, right bass: correct, chordCorrect, and bassCorrect all true', () => {
		const target = spellChord('Cm7');
		const played = new Set([0, 3, 7, 10]); // C, Eb, G, Bb
		const bassChroma = 7; // G (fifth in the bass, 2nd inversion)
		const result = matchInversion(played, bassChroma, target, bassChroma);

		expect(result).toEqual({ correct: true, chordCorrect: true, bassCorrect: true, missing: [], extra: [] });
	});

	it('right notes, wrong bass: correct false, chordCorrect true, bassCorrect false', () => {
		const target = spellChord('Cm7');
		const played = new Set([0, 3, 7, 10]);
		const result = matchInversion(played, 0, target, 7); // played bass = C (root) but 2nd inversion wants G

		expect(result.correct).toBe(false);
		expect(result.chordCorrect).toBe(true);
		expect(result.bassCorrect).toBe(false);
	});

	it('wrong notes: correct false, chordCorrect false, missing/extra populated from matchChord verbatim', () => {
		const target = spellChord('Cm7');
		const played = new Set([0, 3, 7]); // missing Bb (10)
		const result = matchInversion(played, 7, target, 7);

		expect(result.correct).toBe(false);
		expect(result.chordCorrect).toBe(false);
		expect(result.missing).toContain(10);
		expect(result.extra).toEqual([]);
	});

	it('playedBassChroma undefined: bassCorrect false, correct false', () => {
		const target = spellChord('Cm7');
		const played = new Set([0, 3, 7, 10]);
		const result = matchInversion(played, undefined, target, 7);

		expect(result.chordCorrect).toBe(true);
		expect(result.bassCorrect).toBe(false);
		expect(result.correct).toBe(false);
	});

	it('an empty played set against an ungradeable target is never correct (false-accept regression)', () => {
		// matchInversion([], undefined, spellChord('m7'), -1) used to report
		// chordCorrect: true, inheriting matchChord's empty-set false accept.
		for (const symbol of ['m7', 'ø', 'dim7', 'Xyz']) {
			const target = spellChord(symbol);
			const result = matchInversion([], undefined, target, -1);
			expect(result.chordCorrect, symbol).toBe(false);
			expect(result.correct, symbol).toBe(false);

			// Even when the "bass" happens to compare equal to the sentinel.
			const withBass = matchInversion([], -1, target, -1);
			expect(withBass.bassCorrect, symbol).toBe(true);
			expect(withBass.chordCorrect, symbol).toBe(false);
			expect(withBass.correct, symbol).toBe(false);
		}
	});

	it('an empty played set is never correct against a real inversion target', () => {
		const target = spellChord('Cm7');
		expect(matchInversion([], 7, target, 7).chordCorrect).toBe(false);
		expect(matchInversion([], 7, target, 7).correct).toBe(false);
	});

	it('is enharmonic-blind: the bass entered via its sharp-spelling chroma still grades identical to the flat-spelling target chroma', () => {
		// Db7 target bass, chroma 1 (Db or C#): feed the sharp-equivalent chroma.
		const target = spellChord('Db7');
		const played = new Set([1, 5, 8, 11]);
		const bassChroma = 1; // C# / Db, same chroma either way
		const result = matchInversion(played, bassChroma, target, bassChroma);

		expect(result.correct).toBe(true);
		expect(result.bassCorrect).toBe(true);
	});
});

describe('lowestPlayedChroma', () => {
	it('picks the lowest sounding letter by octave, not the lowest chroma', () => {
		const octaves = new Map([
			['A', 4],
			['C', 5],
			['D', 5]
		]);
		expect(lowestPlayedChroma(['C', 'D', 'A'], octaves, 4)).toBe(9);
	});

	it('assumes the fallback octave for a letter with no recorded press', () => {
		expect(lowestPlayedChroma(['F', 'D'], new Map([['F', 5]]), 4)).toBe(2);
	});

	it('is undefined for nothing played or an unresolvable letter', () => {
		expect(lowestPlayedChroma([], new Map(), 4)).toBeUndefined();
		expect(lowestPlayedChroma(['D', 'Q'], new Map(), 4)).toBeUndefined();
	});
});
