import { afterEach, describe, expect, it } from 'vitest';
import { spellChord } from '$lib/theory/chord';
import { formulaFor, aliasLine, formulaSentence } from './chordPresentation';
import { setLocale } from '$lib/i18n/locale.svelte';

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

	it('renders a flat-rooted chord with glyph accidentals only, never the ASCII duplicate', () => {
		const line = aliasLine(spellChord('Bbmaj7'));
		const forms = line.split(' = ');
		expect(forms[0]).toBe('B♭maj7');
		expect(line).not.toContain('Bbmaj7');
		expect(forms).toHaveLength(new Set(forms).size);
		expect(forms.every((form) => form.startsWith('B♭'))).toBe(true);
	});

	it('renders a sharp-rooted chord with glyph accidentals only, never the ASCII duplicate', () => {
		const line = aliasLine(spellChord('F#m7b5'));
		const forms = line.split(' = ');
		expect(line).not.toContain('F#');
		expect(forms).toHaveLength(new Set(forms).size);
		expect(forms.every((form) => form.startsWith('F♯'))).toBe(true);
	});

	it('returns just the symbol with no trailing " = " when there are no aliases', () => {
		const chord = spellChord('Cm7');
		const line = aliasLine({ ...chord, aliases: [] });
		expect(line).toBe(chord.symbol);
		expect(line.endsWith(' = ')).toBe(false);
	});
});

describe('formulaSentence', () => {
	it('generates the canonical dim worked example (two stacked minor thirds)', () => {
		expect(formulaSentence(spellChord('Cdim'))).toBe(
			'From the root, stack a minor 3rd, then a diminished 5th.'
		);
	});

	it('generates the m7b5 worked example (three tones beyond root)', () => {
		expect(formulaSentence(spellChord('Cm7b5'))).toBe(
			'From the root, stack a minor 3rd, then a diminished 5th, then a minor 7th.'
		);
	});

	it('generates the maj7 worked example', () => {
		expect(formulaSentence(spellChord('Cmaj7'))).toBe(
			'From the root, stack a major 3rd, then a perfect 5th, then a major 7th.'
		);
	});

	it('generates from formulaFor entries, not a per-chord hardcoded string: triad yields 2 stacked tones, seventh yields 3', () => {
		const triadSentence = formulaSentence(spellChord('Cm'));
		const seventhSentence = formulaSentence(spellChord('Cm7'));
		expect(triadSentence.split(', then a ')).toHaveLength(2);
		expect(seventhSentence.split(', then a ')).toHaveLength(3);
	});

	it('is total: returns an empty string for an unrecognized chord, never throws', () => {
		expect(formulaSentence(spellChord('nonsense'))).toBe('');
	});

	it('contains no em dashes in any generated sentence', () => {
		for (const symbol of ['Cdim', 'Cm7b5', 'Cmaj7', 'Cm', 'C', 'C7']) {
			expect(formulaSentence(spellChord(symbol))).not.toMatch(/—|–/);
		}
	});
});

describe('formulaSentence: FR locale (Phase 17 copy translated)', () => {
	afterEach(() => {
		setLocale('en');
	});

	it('generates the canonical dim worked example in French', () => {
		setLocale('fr');
		expect(formulaSentence(spellChord('Cdim'))).toBe(
			'À partir de la fondamentale, empile une tierce mineure, puis une quinte diminuée.'
		);
	});

	it('generates the maj7 worked example in French (three tones beyond root)', () => {
		setLocale('fr');
		expect(formulaSentence(spellChord('Cmaj7'))).toBe(
			'À partir de la fondamentale, empile une tierce majeure, puis une quinte juste, puis une septième majeure.'
		);
	});

	it('is total under fr: empty string for an unrecognized chord', () => {
		setLocale('fr');
		expect(formulaSentence(spellChord('nonsense'))).toBe('');
	});

	it('round-trips back to English after setLocale("en")', () => {
		setLocale('fr');
		expect(formulaSentence(spellChord('Cdim'))).toContain('À partir de la fondamentale');
		setLocale('en');
		expect(formulaSentence(spellChord('Cdim'))).toBe(
			'From the root, stack a minor 3rd, then a diminished 5th.'
		);
	});

	it('contains no em dashes in any generated French sentence', () => {
		setLocale('fr');
		for (const symbol of ['Cdim', 'Cm7b5', 'Cmaj7', 'Cm', 'C', 'C7']) {
			expect(formulaSentence(spellChord(symbol))).not.toMatch(/—|–/);
		}
	});
});
