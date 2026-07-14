import { describe, expect, it } from 'vitest';
import { toAsciiPitchClass, toAscendingPitches, toPitch } from './voicing';

describe('toAsciiPitchClass', () => {
	it('converts display glyph accidentals to ASCII', () => {
		expect(toAsciiPitchClass('B♭')).toBe('Bb');
		expect(toAsciiPitchClass('F♯')).toBe('F#');
		expect(toAsciiPitchClass('B♭♭')).toBe('Bbb');
	});

	it('passes plain letters and ASCII accidentals through unchanged', () => {
		expect(toAsciiPitchClass('C')).toBe('C');
		expect(toAsciiPitchClass('Eb')).toBe('Eb');
		expect(toAsciiPitchClass('F#')).toBe('F#');
	});
});

describe('toAscendingPitches', () => {
	it('keeps a root-position chord in octave 4 while its chromas ascend', () => {
		expect(toAscendingPitches(['C', 'E', 'G'])).toEqual(['C4', 'E4', 'G4']);
	});

	it('bumps the octave when the chroma stops ascending (G7 voices G4-B4-D5-F5)', () => {
		expect(toAscendingPitches(['G', 'B', 'D', 'F'])).toEqual(['G4', 'B4', 'D5', 'F5']);
	});

	it('handles glyph accidentals (Cm7 voices C4-Eb4-G4-Bb4)', () => {
		expect(toAscendingPitches(['C', 'E♭', 'G', 'B♭'])).toEqual(['C4', 'Eb4', 'G4', 'Bb4']);
	});

	it('wraps multiple times for chords spanning more than an octave upward', () => {
		expect(toAscendingPitches(['B', 'D', 'F'])).toEqual(['B4', 'D5', 'F5']);
	});

	it('returns an empty list for no notes', () => {
		expect(toAscendingPitches([])).toEqual([]);
	});
});

describe('toPitch', () => {
	it('joins a display-glyph letter with an octave number as an ASCII pitch', () => {
		expect(toPitch('C', 4)).toBe('C4');
		expect(toPitch('F♯', 5)).toBe('F#5');
		expect(toPitch('B♭', 3)).toBe('Bb3');
	});
});
