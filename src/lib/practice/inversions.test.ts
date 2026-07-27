import { describe, expect, it } from 'vitest';
import {
	INVERSION_BASE_OCTAVE,
	bassNoteFor,
	bassRoleForIndex,
	inversionCountFor,
	inversionVoicing
} from './inversions';
import { spellChord } from '$lib/theory/chord';

describe('inversionCountFor', () => {
	it('returns 3 for a recognized triad', () => {
		expect(inversionCountFor('C')).toBe(3);
	});

	it('returns 4 for a recognized seventh chord', () => {
		expect(inversionCountFor('Cm7')).toBe(4);
	});

	it('returns 0 for an unrecognized symbol', () => {
		expect(inversionCountFor('!!bogus')).toBe(0);
	});
});

describe('bassRoleForIndex', () => {
	it('maps 0-3 to root/third/fifth/seventh', () => {
		expect(bassRoleForIndex(0)).toBe('root');
		expect(bassRoleForIndex(1)).toBe('third');
		expect(bassRoleForIndex(2)).toBe('fifth');
		expect(bassRoleForIndex(3)).toBe('seventh');
	});

	it('returns undefined for out-of-range indices', () => {
		expect(bassRoleForIndex(-1)).toBeUndefined();
		expect(bassRoleForIndex(4)).toBeUndefined();
	});
});

describe('bassNoteFor', () => {
	it('resolves the fifth (G) for Cm7 at index 2', () => {
		const chord = spellChord('Cm7');
		const note = bassNoteFor(chord, 2);
		expect(note?.role).toBe('fifth');
		expect(note?.letter).toBe('G');
	});

	it('is undefined for an out-of-range index (seventh on a triad)', () => {
		const chord = spellChord('C');
		expect(bassNoteFor(chord, 3)).toBeUndefined();
	});

	it('is undefined for an unrecognized chord', () => {
		const chord = spellChord('!!bogus');
		expect(bassNoteFor(chord, 0)).toBeUndefined();
	});
});

describe('inversionVoicing', () => {
	it('Cm7 2nd inversion: bass is the fifth (G) at base octave, ascending wrap into the next octave', () => {
		const chord = spellChord('Cm7');
		const voicing = inversionVoicing(chord, 2);

		expect(voicing).toEqual([
			{ letter: 'G', octave: INVERSION_BASE_OCTAVE, role: 'fifth', marker: '5' },
			{ letter: 'B♭', octave: INVERSION_BASE_OCTAVE, role: 'seventh', marker: '7' },
			{ letter: 'C', octave: INVERSION_BASE_OCTAVE + 1, role: 'root', marker: 'R' },
			{ letter: 'E♭', octave: INVERSION_BASE_OCTAVE + 1, role: 'third', marker: '3' }
		]);
	});

	it('root-position triad (C) is C4, E4, G4 with bass lowest', () => {
		const chord = spellChord('C');
		const voicing = inversionVoicing(chord, 0);

		expect(voicing).toEqual([
			{ letter: 'C', octave: INVERSION_BASE_OCTAVE, role: 'root', marker: 'R' },
			{ letter: 'E', octave: INVERSION_BASE_OCTAVE, role: 'third', marker: '3' },
			{ letter: 'G', octave: INVERSION_BASE_OCTAVE, role: 'fifth', marker: '5' }
		]);
	});

	it('preserves each note role bound to its letter regardless of inversion (1st inversion Cm7, bass = third)', () => {
		const chord = spellChord('Cm7');
		const voicing = inversionVoicing(chord, 1);

		expect(voicing[0]).toMatchObject({ letter: 'E♭', role: 'third', marker: '3' });
		expect(voicing.map((n) => n.role)).toEqual(['third', 'fifth', 'seventh', 'root']);
	});

	it('returns an empty array for an unrecognized symbol', () => {
		const chord = spellChord('!!bogus');
		expect(inversionVoicing(chord, 0)).toEqual([]);
	});

	it('returns an empty array for an out-of-range index (seventh on a triad)', () => {
		const chord = spellChord('C');
		expect(inversionVoicing(chord, 3)).toEqual([]);
	});
});
