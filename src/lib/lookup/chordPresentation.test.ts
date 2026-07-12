import { describe, expect, it } from 'vitest';
import { spellChord } from '$lib/theory/chord';
import { formulaFor, aliasLine } from './chordPresentation';

describe('formulaFor', () => {
	it('returns R, m3, P5, m7 labels in order for Cm7 with correct letters and solfege', () => {
		const entries = formulaFor(spellChord('Cm7'));
		expect(entries.map((e) => e.label)).toEqual(['R', 'm3', 'P5', 'm7']);

		const root = entries[0];
		expect(root.role).toBe('root');
		expect(root.letter).toBe('C');
		expect(root.solfege).toBe('Do');
	});

	it('returns R, m3, P5, m7 labels with letters D, F, A, C for Dm7', () => {
		const entries = formulaFor(spellChord('Dm7'));
		expect(entries.map((e) => e.label)).toEqual(['R', 'm3', 'P5', 'm7']);
		expect(entries.map((e) => e.letter)).toEqual(['D', 'F', 'A', 'C']);
	});
});

describe('aliasLine', () => {
	it('joins the resolved symbol and aliases with " = ", the typed/resolved symbol first, duplicates removed', () => {
		const line = aliasLine(spellChord('C-7'));
		expect(line).toContain('Cm7');
		expect(line).toContain('C-7');
		// tonal echoes back the alias form the user typed as `symbol`; the
		// resolved-symbol-first invariant means whatever `chord.symbol` holds
		// (here "C-7", since tonal doesn't renormalize to a canonical spelling)
		// appears first, with no duplicate entries.
		expect(line.split(' = ')[0]).toBe('C-7');
		expect(line.split(' = ')).toHaveLength(new Set(line.split(' = ')).size);
	});

	it('returns just the symbol with no trailing " = " when there are no aliases', () => {
		const chord = spellChord('Cm7');
		const line = aliasLine({ ...chord, aliases: [] });
		expect(line).toBe(chord.symbol);
		expect(line.endsWith(' = ')).toBe(false);
	});
});
