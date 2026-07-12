import { describe, expect, it } from 'vitest';
import { spellChord } from './chord';

describe('spellChord', () => {
	it('spells Cm7 as the four notes C, E♭, G, B♭', () => {
		expect(spellChord('Cm7')).toEqual(['C', 'E♭', 'G', 'B♭']);
	});

	it('spells C as the triad C, E, G (no 7th)', () => {
		expect(spellChord('C')).toEqual(['C', 'E', 'G']);
	});
});
