import { describe, expect, it } from 'vitest';
import { Note } from 'tonal';
import { toAsciiPitchClass, toAscendingPitches, toCompPitches, toPitch } from './voicing';

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

describe('toCompPitches', () => {
	it('drops the root an octave under the guide tones (Dm7 comps D3-F4-C5)', () => {
		expect(toCompPitches('D', ['F', 'C'])).toEqual(['D3', 'F4', 'C5']);
	});

	it('leaves the register above the guide tones empty for the player', () => {
		const pitches = toCompPitches('C', ['E', 'B']);
		expect(pitches).toEqual(['C3', 'E4', 'B4']);
		expect(Note.midi(pitches[pitches.length - 1]) as number).toBeLessThan(
			Note.midi('C5') as number
		);
	});

	it('handles glyph accidentals in both the bass and the guide tones', () => {
		expect(toCompPitches('E♭', ['G', 'D♭'])).toEqual(['Eb3', 'G4', 'Db5']);
		expect(toCompPitches('F♯', ['A', 'E'])).toEqual(['F#3', 'A4', 'E5']);
	});

	it('keeps three guide tones ascending for a ♭5 chord (Dm7♭5 comps D3-F4-Ab4-C5)', () => {
		expect(toCompPitches('D', ['F', 'A♭', 'C'])).toEqual(['D3', 'F4', 'Ab4', 'C5']);
	});

	it('stays strictly ascending for a bass that sounds high inside its octave (B♯3 sounds C4)', () => {
		// B#3 SOUNDS midi 60, the same as C4, so a naive "upper notes always
		// start at octave 4" rule would voice a unison or a crossed voice. The
		// floor is the bass's own sounding midi, so C moves up to C5.
		const pitches = toCompPitches('B♯', ['C', 'E']);
		const midis = pitches.map((pitch) => Note.midi(pitch) as number);
		expect(midis[0]).toBe(60);
		for (let i = 1; i < midis.length; i++) {
			expect(midis[i]).toBeGreaterThan(midis[i - 1]);
		}
	});

	it('falls back to a plain root-position voicing when there is no root (total)', () => {
		expect(toCompPitches('', ['E', 'B'])).toEqual(['E4', 'B4']);
	});

	it('voices the bass alone when there are no guide tones', () => {
		expect(toCompPitches('C', [])).toEqual(['C3']);
	});
});

describe('toPitch', () => {
	it('joins a display-glyph letter with an octave number as an ASCII pitch', () => {
		expect(toPitch('C', 4)).toBe('C4');
		expect(toPitch('F♯', 5)).toBe('F#5');
		expect(toPitch('B♭', 3)).toBe('Bb3');
	});
});
