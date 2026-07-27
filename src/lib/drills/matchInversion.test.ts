import { describe, expect, it } from 'vitest';
import { matchInversion } from './matchInversion';
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
