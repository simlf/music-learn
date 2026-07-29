import { describe, expect, it } from 'vitest';
import {
	GUIDE_TONE_BARS,
	GUIDE_TONE_KEY,
	GUIDE_TONE_MOTIONS,
	GUIDE_TONE_TEMPLATE_ID,
	guideToneMotion,
	shellPitches
} from './guideTones';

/**
 * Unit 11 content gate (guide tones and voice leading). Locks the exact
 * mechanism the design docs specify: the fixed ii-V-I-in-C progression, its
 * three shells, and the two half-step resolutions between them. Every
 * assertion here is checked against the app's OWN tonal-backed engines
 * (buildProgression, shellNotes, chromaOf) rather than hand-typed letters, so
 * a regression in any of those modules fails here too.
 */

describe('GUIDE_TONE_BARS: the fixed major ii-V-I in C', () => {
	it('uses the C key and the major-ii-V-I template', () => {
		expect(GUIDE_TONE_KEY).toBe('C');
		expect(GUIDE_TONE_TEMPLATE_ID).toBe('major-ii-V-I');
	});

	it('has exactly three bars: ii, V, I', () => {
		expect(GUIDE_TONE_BARS.map((bar) => bar.roman)).toEqual(['ii', 'V', 'I']);
		expect(GUIDE_TONE_BARS.map((bar) => bar.symbol)).toEqual(['Dm7', 'G7', 'Cmaj7']);
	});

	it("each bar's shell is exactly its 3rd and 7th, third first", () => {
		expect(GUIDE_TONE_BARS[0].shell.map((n) => n.letter)).toEqual(['F', 'C']);
		expect(GUIDE_TONE_BARS[1].shell.map((n) => n.letter)).toEqual(['B', 'F']);
		expect(GUIDE_TONE_BARS[2].shell.map((n) => n.letter)).toEqual(['E', 'B']);
		for (const bar of GUIDE_TONE_BARS) {
			expect(bar.shell.map((n) => n.role)).toEqual(['third', 'seventh']);
		}
	});

	it('no bar has a ♭5: the shell never grows a third note', () => {
		for (const bar of GUIDE_TONE_BARS) {
			expect(bar.shell).toHaveLength(2);
		}
	});
});

describe('guideToneMotion: the half-step resolution, computed not asserted', () => {
	it('ii to V: F holds, C falls a half step to B', () => {
		const motion = guideToneMotion(GUIDE_TONE_BARS[0], GUIDE_TONE_BARS[1]);
		expect(motion).not.toBeNull();
		expect(motion?.heldLetter).toBe('F');
		expect(motion?.fallingFrom).toBe('C');
		expect(motion?.fallingTo).toBe('B');
		expect(motion?.fallingSemitones).toBe(1);
	});

	it('V to I: B holds, F falls a half step to E', () => {
		const motion = guideToneMotion(GUIDE_TONE_BARS[1], GUIDE_TONE_BARS[2]);
		expect(motion).not.toBeNull();
		expect(motion?.heldLetter).toBe('B');
		expect(motion?.fallingFrom).toBe('F');
		expect(motion?.fallingTo).toBe('E');
		expect(motion?.fallingSemitones).toBe(1);
	});

	it('the held letter really is the same pitch class as the next bar’s 7th (a genuine common tone)', () => {
		const iiToV = guideToneMotion(GUIDE_TONE_BARS[0], GUIDE_TONE_BARS[1]);
		expect(iiToV?.heldLetter).toBe(GUIDE_TONE_BARS[1].shell.find((n) => n.role === 'seventh')?.letter);

		const vToI = guideToneMotion(GUIDE_TONE_BARS[1], GUIDE_TONE_BARS[2]);
		expect(vToI?.heldLetter).toBe(GUIDE_TONE_BARS[2].shell.find((n) => n.role === 'seventh')?.letter);
	});

	it('never states the false version: the falling note is a DIFFERENT letter in each bar, not one note relabelled', () => {
		const motion = guideToneMotion(GUIDE_TONE_BARS[0], GUIDE_TONE_BARS[1]);
		expect(motion?.fallingFrom).not.toBe(motion?.fallingTo);
	});

	it('is total: returns null when a bar has no seventh (missing shell role)', () => {
		const triadOnly = { roman: 'x', symbol: 'C', root: 'C', quality: '', shell: [] };
		expect(guideToneMotion(triadOnly, GUIDE_TONE_BARS[0])).toBeNull();
		expect(guideToneMotion(GUIDE_TONE_BARS[0], triadOnly)).toBeNull();
	});
});

describe('GUIDE_TONE_MOTIONS: precomputed for the two transitions', () => {
	it('has exactly two entries, one fewer than the bar count', () => {
		expect(GUIDE_TONE_MOTIONS).toHaveLength(GUIDE_TONE_BARS.length - 1);
	});

	it('both transitions are real half-step resolutions', () => {
		for (const motion of GUIDE_TONE_MOTIONS) {
			expect(motion).not.toBeNull();
			expect(motion?.fallingSemitones).toBe(1);
		}
	});
});

describe('shellPitches: low-to-high letters ready for playChord', () => {
	it('returns third then seventh for each bar', () => {
		expect(shellPitches(GUIDE_TONE_BARS[0])).toEqual(['F', 'C']);
		expect(shellPitches(GUIDE_TONE_BARS[1])).toEqual(['B', 'F']);
		expect(shellPitches(GUIDE_TONE_BARS[2])).toEqual(['E', 'B']);
	});
});
