import { describe, expect, it } from 'vitest';
import { spellChord } from './chord';

const SOLFEGE_SYLLABLES = ['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si'];

describe('spellChord', () => {
	it('spells Cm7 as the four notes C, E♭, G, B♭', () => {
		const result = spellChord('Cm7');
		expect(result.notes.map((n) => n.letter)).toEqual(['C', 'E♭', 'G', 'B♭']);
	});

	it('spells C as the triad C, E, G (no 7th)', () => {
		const result = spellChord('C');
		expect(result.notes.map((n) => n.letter)).toEqual(['C', 'E', 'G']);
	});

	describe('THEORY-02: jazz notation aliases resolve to the same chord', () => {
		it('Cm7, C-7, and Cmin7 produce identical spelled notes', () => {
			const a = spellChord('Cm7');
			const b = spellChord('C-7');
			const c = spellChord('Cmin7');
			expect(a.notes).toEqual(b.notes);
			expect(a.notes).toEqual(c.notes);
		});

		it('Cø7 and Cm7♭5 produce identical spelled notes', () => {
			const a = spellChord('Cø7');
			const b = spellChord('Cm7♭5');
			expect(a.notes).toEqual(b.notes);
		});

		it('C°7 and Cdim7 produce identical spelled notes', () => {
			const a = spellChord('C°7');
			const b = spellChord('Cdim7');
			expect(a.notes).toEqual(b.notes);
		});
	});

	describe('accidental input normalization (ASCII and glyph forms)', () => {
		it('F#ø7 and F♯ø7 resolve to the same chord', () => {
			const ascii = spellChord('F#ø7');
			const glyph = spellChord('F♯ø7');
			expect(ascii.notes).toEqual(glyph.notes);
			expect(ascii.recognized).toBe(true);
		});

		it('Bb7 and B♭7 resolve to the same chord', () => {
			const ascii = spellChord('Bb7');
			const glyph = spellChord('B♭7');
			expect(ascii.notes).toEqual(glyph.notes);
		});
	});

	describe('THEORY-03: enharmonically correct spelling, one letter per degree', () => {
		it('F♯m7 includes C♯ and never D♭', () => {
			const result = spellChord('F#m7');
			const letters = result.notes.map((n) => n.letter);
			expect(letters).toContain('C♯');
			expect(letters).not.toContain('D♭');
		});

		it('E♭maj7 uses flats consistent with the E♭ scale (G, B♭, D)', () => {
			const result = spellChord('Ebmaj7');
			expect(result.notes.map((n) => n.letter)).toEqual(['E♭', 'G', 'B♭', 'D']);
		});
	});

	describe('THEORY-04: every note has a letter and a French solfège label', () => {
		it('every note in Cm7 has a nonempty letter and a valid solfege syllable', () => {
			const result = spellChord('Cm7');
			for (const note of result.notes) {
				expect(note.letter.length).toBeGreaterThan(0);
				expect(SOLFEGE_SYLLABLES).toContain(note.solfege);
			}
		});

		it('every note in F♯m7 has a valid solfege syllable', () => {
			const result = spellChord('F#m7');
			for (const note of result.notes) {
				expect(SOLFEGE_SYLLABLES).toContain(note.solfege);
			}
		});
	});

	describe('interval role tagging', () => {
		it('Cmaj7 tags root/third/fifth/seventh in order', () => {
			const result = spellChord('Cmaj7');
			expect(result.notes.map((n) => n.role)).toEqual(['root', 'third', 'fifth', 'seventh']);
		});

		it('a triad (C) tags root/third/fifth with no seventh', () => {
			const result = spellChord('C');
			expect(result.notes.map((n) => n.role)).toEqual(['root', 'third', 'fifth']);
		});

		it('Csus4 tags its suspended tone as fourth, not root', () => {
			const result = spellChord('Csus4');
			expect(result.notes.map((n) => n.role)).toEqual(['root', 'fourth', 'fifth']);
		});

		it('C6 tags its sixth as sixth', () => {
			const result = spellChord('C6');
			expect(result.notes.map((n) => n.role)).toEqual(['root', 'third', 'fifth', 'sixth']);
		});

		it('C9 maps the compound ninth down to second (degree-class rule)', () => {
			const result = spellChord('C9');
			expect(result.notes.map((n) => n.role)).toEqual([
				'root',
				'third',
				'fifth',
				'seventh',
				'second'
			]);
		});

		it('C13 maps the thirteenth down to sixth', () => {
			const result = spellChord('C13');
			expect(result.notes.map((n) => n.role)).toContain('sixth');
		});
	});

	describe('unrecognized input', () => {
		it('returns recognized: false and an empty notes array for garbage input', () => {
			const result = spellChord('notachord');
			expect(result.recognized).toBe(false);
			expect(result.notes).toEqual([]);
		});
	});

	describe('slash chords (inversions)', () => {
		it('C/E spells root-position with E as bass', () => {
			const result = spellChord('C/E');
			expect(result.recognized).toBe(true);
			expect(result.bass).toBe('E');
			expect(result.notes.map((n) => n.letter)).toEqual(['C', 'E', 'G']);
			expect(result.notes.map((n) => n.role)).toEqual(['root', 'third', 'fifth']);
		});

		it('Cmaj7/G spells root-position with G as bass', () => {
			const result = spellChord('Cmaj7/G');
			expect(result.recognized).toBe(true);
			expect(result.bass).toBe('G');
			expect(result.notes.map((n) => n.letter)).toEqual(['C', 'E', 'G', 'B']);
			expect(result.notes.map((n) => n.role)).toEqual(['root', 'third', 'fifth', 'seventh']);
		});

		it('G7/F spells root-position with F as bass', () => {
			const result = spellChord('G7/F');
			expect(result.recognized).toBe(true);
			expect(result.bass).toBe('F');
			expect(result.notes.map((n) => n.letter)).toEqual(['G', 'B', 'D', 'F']);
			expect(result.notes.map((n) => n.role)).toEqual(['root', 'third', 'fifth', 'seventh']);
		});

		it('Am7/G spells root-position with G as bass', () => {
			const result = spellChord('Am7/G');
			expect(result.recognized).toBe(true);
			expect(result.bass).toBe('G');
			expect(result.notes.map((n) => n.letter)).toEqual(['A', 'C', 'E', 'G']);
			expect(result.notes.map((n) => n.role)).toEqual(['root', 'third', 'fifth', 'seventh']);
		});

		it('C/D (non-chord-tone bass) is rejected as unrecognized', () => {
			const result = spellChord('C/D');
			expect(result.recognized).toBe(false);
			expect(result.notes).toEqual([]);
			expect(result.bass).toBeUndefined();
		});

		it('Cm7 (no regression) has bass undefined', () => {
			const result = spellChord('Cm7');
			expect(result.bass).toBeUndefined();
		});
	});

	describe('ChordResult shape', () => {
		it('includes input, symbol, root, quality, recognized, and aliases fields', () => {
			const result = spellChord('Cm7');
			expect(result.input).toBe('Cm7');
			expect(result.root).toBe('C');
			expect(result.recognized).toBe(true);
			expect(result.aliases.length).toBeGreaterThan(0);
			expect(typeof result.quality).toBe('string');
			expect(typeof result.symbol).toBe('string');
		});
	});
});
