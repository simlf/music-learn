import { describe, expect, it } from 'vitest';
import { letterToSolfege } from './solfege';

describe('letterToSolfege', () => {
	it.each([
		['C', 'Do'],
		['D', 'Ré'],
		['E', 'Mi'],
		['F', 'Fa'],
		['G', 'Sol'],
		['A', 'La'],
		['B', 'Si']
	])('maps %s to %s', (letter, expected) => {
		expect(letterToSolfege(letter)).toBe(expected);
	});

	it('is degree-based: accidentals do not change the syllable', () => {
		expect(letterToSolfege('C♯')).toBe('Do');
		expect(letterToSolfege('C♭')).toBe('Do');
		expect(letterToSolfege('B♭')).toBe('Si');
		expect(letterToSolfege('F♯')).toBe('Fa');
	});
});
