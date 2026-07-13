import { describe, expect, it } from 'vitest';
import { matchChord } from './matchChord';
import { spellChord } from '$lib/theory/chord';

describe('matchChord', () => {
	it('grades correct when the played chroma set equals the target chroma set (Cm7)', () => {
		const target = spellChord('Cm7');
		// C, E♭, G, B♭ -> chroma 0, 3, 7, 10
		const played = new Set([0, 3, 7, 10]);
		const result = matchChord(played, target);
		expect(result).toEqual({ correct: true, missing: [], extra: [] });
	});

	it('is order-agnostic and octave/duplicate-agnostic (same chroma, any order, with a duplicate)', () => {
		const target = spellChord('Cm7');
		const played = [10, 3, 0, 7, 7]; // duplicate 7, shuffled order
		const result = matchChord(played, target);
		expect(result.correct).toBe(true);
		expect(result.missing).toEqual([]);
		expect(result.extra).toEqual([]);
	});

	it('is enharmonic-agnostic: a played C♯ (chroma 1) matches a target spelled with D♭ (also chroma 1)', () => {
		// Db7 spells as D♭, F, A♭, C♭ (chroma 1, 5, 8, 11). Feed the same chroma
		// set via their enharmonic equivalents to prove matching is chroma-only.
		const target = spellChord('Db7');
		const played = new Set([1, 5, 8, 11]); // C#, F, Ab, B (chroma equivalents of Db, F, Ab, Cb)
		const result = matchChord(played, target);
		expect(result.correct).toBe(true);
	});

	it('reports an extra note when the played set adds a chroma not in the target (Cm7 + A)', () => {
		const target = spellChord('Cm7');
		const played = new Set([0, 3, 7, 10, 9]); // add A (chroma 9)
		const result = matchChord(played, target);
		expect(result.correct).toBe(false);
		expect(result.extra).toContain(9);
		expect(result.missing).toEqual([]);
	});

	it('reports a missing note when the played set omits a target chroma (Cm7 without B♭)', () => {
		const target = spellChord('Cm7');
		const played = new Set([0, 3, 7]); // omit B♭ (chroma 10)
		const result = matchChord(played, target);
		expect(result.correct).toBe(false);
		expect(result.missing).toContain(10);
		expect(result.extra).toEqual([]);
	});

	it('grades incorrect with all target chroma missing when the played set is empty', () => {
		const target = spellChord('Cm7');
		const result = matchChord(new Set(), target);
		expect(result.correct).toBe(false);
		expect(result.missing.sort()).toEqual([0, 3, 7, 10].sort());
		expect(result.extra).toEqual([]);
	});

	it('never throws for an empty played set against any recognized target', () => {
		const target = spellChord('F#m7b5');
		expect(() => matchChord(new Set(), target)).not.toThrow();
	});
});
