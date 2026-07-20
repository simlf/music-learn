import { describe, expect, it } from 'vitest';
import { detectCasingAmbiguity } from './casingAmbiguity';
import { spellChord } from '$lib/theory/chord';

/**
 * TDD RED-then-GREEN suite for the m/maj casing-ambiguity detector (issue #14
 * point 4, sketch 016-B). Mirrors didYouMean.test.ts's flat describe/it style.
 */
describe('detectCasingAmbiguity', () => {
	it('flags a bare lowercase m/M marker read as minor (am7 -> offer both readings)', () => {
		expect(detectCasingAmbiguity('am7')).toEqual({ minorSymbol: 'Am7', majorSymbol: 'Amaj7' });
	});

	it('flags an uppercase M marker read as major (AM7 -> offer both readings)', () => {
		expect(detectCasingAmbiguity('AM7')).toEqual({ minorSymbol: 'Am7', majorSymbol: 'Amaj7' });
	});

	it('does not nag on a clearly-lowercase m after a proper-case root (Cm7 -> null)', () => {
		expect(detectCasingAmbiguity('Cm7')).toBeNull();
	});

	it('does not nag on spelled-out maj (Cmaj7 -> null)', () => {
		expect(detectCasingAmbiguity('Cmaj7')).toBeNull();
	});

	it('does not nag on a correct-case minor (Am7 -> null, still unambiguous)', () => {
		expect(detectCasingAmbiguity('Am7')).toBeNull();
	});

	it('does not flag a half-diminished glyph symbol (F♯ø7 -> null)', () => {
		expect(detectCasingAmbiguity('F♯ø7')).toBeNull();
	});

	it('does not flag a dominant-seventh-only symbol (G7 -> null)', () => {
		expect(detectCasingAmbiguity('G7')).toBeNull();
	});

	it('does not flag empty input (-> null)', () => {
		expect(detectCasingAmbiguity('')).toBeNull();
	});

	it('flags the bare triad case too (am -> offer both triad readings)', () => {
		expect(detectCasingAmbiguity('am')).toEqual({ minorSymbol: 'Am', majorSymbol: 'Amaj' });
	});

	it('resolves the ambiguous pair on a flat/sharp root as well (bbm7 -> B♭m7 / B♭maj7)', () => {
		expect(detectCasingAmbiguity('bbm7')).toEqual({
			minorSymbol: 'B♭m7',
			majorSymbol: 'B♭maj7'
		});
	});

	it('never returns a candidate pair that spellChord fails to recognize, and the two candidates differ in their third (and seventh where applicable)', () => {
		for (const input of ['am7', 'AM7', 'am', 'bbm7']) {
			const result = detectCasingAmbiguity(input);
			expect(result).not.toBeNull();
			if (!result) continue;

			const minorChord = spellChord(result.minorSymbol);
			const majorChord = spellChord(result.majorSymbol);
			expect(minorChord.recognized).toBe(true);
			expect(majorChord.recognized).toBe(true);

			const minorThird = minorChord.notes.find((note) => note.role === 'third');
			const majorThird = majorChord.notes.find((note) => note.role === 'third');
			expect(minorThird?.letter).not.toBe(majorThird?.letter);
		}
	});
});
