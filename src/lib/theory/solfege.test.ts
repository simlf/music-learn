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

	it('carries the accidental glyph through to the syllable', () => {
		expect(letterToSolfege('E♭')).toBe('Mi♭');
		expect(letterToSolfege('F♯')).toBe('Fa♯');
		expect(letterToSolfege('C♯')).toBe('Do♯');
		expect(letterToSolfege('C♭')).toBe('Do♭');
		expect(letterToSolfege('B♭')).toBe('Si♭');
	});

	it('normalizes ASCII accidentals (#/b) to display glyphs (♯/♭)', () => {
		expect(letterToSolfege('Eb')).toBe('Mi♭');
		expect(letterToSolfege('F#')).toBe('Fa♯');
		expect(letterToSolfege('Bb')).toBe('Si♭');
	});

	it('handles double accidentals when the note model supplies them', () => {
		expect(letterToSolfege('F♯♯')).toBe('Fa♯♯');
		expect(letterToSolfege('Fx')).toBe('Fa♯♯');
		expect(letterToSolfege('B♭♭')).toBe('Si♭♭');
		expect(letterToSolfege('Bbb')).toBe('Si♭♭');
	});

	it('returns an empty string for an unknown letter', () => {
		expect(letterToSolfege('H')).toBe('');
		expect(letterToSolfege('')).toBe('');
	});
});
