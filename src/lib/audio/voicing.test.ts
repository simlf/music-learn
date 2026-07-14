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

	it('voices C♭ spellings by sounding pitch, not chroma (A♭m plays A♭4-C♭5-E♭5)', () => {
		// Cb4 SOUNDS B3 (midi 59) in both tonal and Tone: chroma comparison
		// would leave it in octave 4 and voice the third a major 6th below
		// the root. Letter-based midi puts it at Cb5 (71), ascending.
		expect(toAscendingPitches(['A♭', 'C♭', 'E♭'])).toEqual(['Ab4', 'Cb5', 'Eb5']);
	});

	it('voices B♯ spellings by sounding pitch (A4 above F♯ plays F#4-B#4, a real tritone)', () => {
		// B#4 SOUNDS C5 (midi 72): already above F#4 (66), so no octave bump.
		// The chroma rule would jump it to B#5 and play +18 semitones.
		expect(toAscendingPitches(['F♯', 'B♯'])).toEqual(['F#4', 'B#4']);
	});

	it('voices double flats by sounding pitch (Ddim7 plays D4-F4-Ab4-Cbb5)', () => {
		// Cbb5 sounds Bb4 (midi 70), above Ab4 (68): ascending root position.
		expect(toAscendingPitches(['D', 'F', 'A♭', 'C♭♭'])).toEqual(['D4', 'F4', 'Ab4', 'Cbb5']);
	});
});

describe('toPitch', () => {
	it('joins a display-glyph letter with an octave number as an ASCII pitch', () => {
		expect(toPitch('C', 4)).toBe('C4');
		expect(toPitch('F♯', 5)).toBe('F#5');
		expect(toPitch('B♭', 3)).toBe('Bb3');
	});
});
