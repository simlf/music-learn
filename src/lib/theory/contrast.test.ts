import { describe, expect, it } from 'vitest';
import { contrastLine } from './contrast';

describe('contrastLine: same-root near-miss pairs (the drill distractor space)', () => {
	it.each([
		// The single most-confused boundary: minor vs dominant third.
		['Cm7', 'C7', 'Cm7 has E♭, C7 has E.'],
		// maj7 vs 7: the half-step vs whole-step seventh.
		['Cmaj7', 'C7', 'Cmaj7 has B, C7 has B♭.'],
		// half-diminished vs plain m7: the lowered fifth.
		['F#m7b5', 'F#m7', 'F♯m7b5 has C, F♯m7 has C♯.'],
		// triad vs seventh: one side simply lacks the note.
		['C7', 'C', 'C7 has B♭, C does not.'],
		// reversed: the user picked the bigger chord.
		['C', 'C7', 'C7 has B♭, C does not.'],
		// major vs minor triad.
		['C', 'Cm', 'C has E, Cm has E♭.'],
		// m7b5 vs dim7: the seventh differs by the double flat.
		['Cm7b5', 'Cdim7', 'Cm7b5 has B♭, Cdim7 has B♭♭.'],
		// two differing notes per side, joined with "and".
		['Cm7', 'Cdim7', 'Cm7 has G and B♭, Cdim7 has G♭ and B♭♭.']
	])('%s vs %s', (correct, given, expected) => {
		expect(contrastLine(correct, given)).toBe(expected);
	});
});

describe('contrastLine: different-root pairs contrast the roots', () => {
	it('names both roots with solfege for the French reader', () => {
		expect(contrastLine('Cm7', 'Dm7')).toBe('Cm7 is built on C (Do), Dm7 on D (Ré).');
	});

	it('keeps accidental glyphs on the root letters', () => {
		expect(contrastLine('F#m7', 'Am7')).toBe('F♯m7 is built on F♯ (Fa), Am7 on A (La).');
	});

	it('handles flat roots from the jazz root set', () => {
		expect(contrastLine('Bbmaj7', 'Cmaj7')).toBe('B♭maj7 is built on B♭ (Si), Cmaj7 on C (Do).');
	});
});

describe('contrastLine: returns null when no clean one-liner exists', () => {
	it('null when the symbols are equal', () => {
		expect(contrastLine('Cm7', 'Cm7')).toBeNull();
	});

	it('null when the symbols are enharmonically the same chord', () => {
		expect(contrastLine('C#m7', 'Dbm7')).toBeNull();
	});

	it('null when either symbol is unrecognized', () => {
		expect(contrastLine('Xx9', 'C7')).toBeNull();
		expect(contrastLine('C7', 'Xx9')).toBeNull();
		expect(contrastLine('', 'C7')).toBeNull();
	});

	it('null when the diff is too wide for one line (3+ notes per side)', () => {
		// Cmaj7 (C E G B) vs Cdim7 (C E♭ G♭ B♭♭): three differing notes each side.
		expect(contrastLine('Cmaj7', 'Cdim7')).toBeNull();
	});
});

describe('contrastLine: output hygiene', () => {
	const samples = [
		contrastLine('Cm7', 'C7'),
		contrastLine('F#m7b5', 'F#m7'),
		contrastLine('Cm7', 'Dm7'),
		contrastLine('Bbmaj7', 'Bb7')
	];

	it('never contains em dashes (D-05)', () => {
		for (const line of samples) {
			expect(line).not.toBeNull();
			expect(line as string).not.toMatch(/—|–/);
		}
	});

	it('always reads as a single line ending in a period', () => {
		for (const line of samples) {
			expect(line as string).not.toContain('\n');
			expect(line as string).toMatch(/\.$/);
		}
	});

	it('displays chord symbols with glyph accidental roots, keeping quality suffixes ASCII', () => {
		// The b in "m7b5" is a quality spelling, not an accidental to glyph.
		expect(contrastLine('Bbm7b5', 'Bbm7')).toBe('B♭m7b5 has F♭, B♭m7 has F.');
	});
});
