import { afterEach, describe, expect, it } from 'vitest';
import { Chord, Interval } from 'tonal';
import { spellChord } from '$lib/theory/chord';
import {
	formulaFor,
	aliasLine,
	displaySymbol,
	formulaSentence,
	stackedThirdsFor,
	thirdSpellingSentence
} from './chordPresentation';
import { setLocale } from '$lib/i18n/locale.svelte';
import { intervalBetween } from '$lib/theory/interval';

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

describe('displaySymbol', () => {
	it('rebuilds a flat-rooted symbol in glyph form, never the ASCII duplicate', () => {
		expect(displaySymbol(spellChord('Bbmaj7'))).toBe('B♭maj7');
	});

	it('leaves a natural-rooted symbol unchanged', () => {
		expect(displaySymbol(spellChord('Cm7'))).toBe('Cm7');
	});

	it('glyph-converts both the root and the bass of a slash chord', () => {
		const symbol = displaySymbol(spellChord('Abmaj7/Eb'));
		expect(symbol).toBe('A♭maj7/E♭');
		expect(symbol).not.toContain('Ab');
		expect(symbol).not.toContain('Eb');
	});

	it('glyph-converts the bass of a sharp-bass slash chord', () => {
		expect(displaySymbol(spellChord('D/F#'))).toBe('D/F♯');
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

describe('stackedThirdsFor', () => {
	afterEach(() => {
		setLocale('en');
	});

	it('returns gaps +m3/+M3/+m3 and tones identical to formulaFor for Cm7', () => {
		const chord = spellChord('Cm7');
		const result = stackedThirdsFor(chord);
		expect(result.gaps.map((g) => g.label)).toEqual(['+m3', '+M3', '+m3']);
		expect(result.tones).toEqual(formulaFor(chord));
	});

	it('returns gaps +M3/+m3/+M3 for Cmaj7', () => {
		const result = stackedThirdsFor(spellChord('Cmaj7'));
		expect(result.gaps.map((g) => g.label)).toEqual(['+M3', '+m3', '+M3']);
	});

	it('returns gaps +M3/+m3/+m3 for C7 (dominant 7th)', () => {
		const result = stackedThirdsFor(spellChord('C7'));
		expect(result.gaps.map((g) => g.label)).toEqual(['+M3', '+m3', '+m3']);
	});

	it('returns gaps +m3/+m3/+M3 for Cm7b5 (half-diminished)', () => {
		const result = stackedThirdsFor(spellChord('Cm7b5'));
		expect(result.gaps.map((g) => g.label)).toEqual(['+m3', '+m3', '+M3']);
	});

	it('returns gaps +m3/+m3/+m3 for Cdim7 (fully diminished)', () => {
		const result = stackedThirdsFor(spellChord('Cdim7'));
		expect(result.gaps.map((g) => g.label)).toEqual(['+m3', '+m3', '+m3']);
	});

	it('returns 2 gaps (+m3/+M3) for the Cm triad', () => {
		const result = stackedThirdsFor(spellChord('Cm'));
		expect(result.gaps.map((g) => g.label)).toEqual(['+m3', '+M3']);
		expect(result.tones).toHaveLength(3);
	});

	it('derives gaps from intervalBetween on consecutive letters for an extended chord (Cmaj9)', () => {
		const chord = spellChord('Cmaj9');
		const result = stackedThirdsFor(chord);
		expect(result.tones).toHaveLength(5);
		expect(result.gaps).toHaveLength(4);
		const expectedLabels = chord.notes
			.slice(0, -1)
			.map((note, i) => '+' + intervalBetween(note.letter, chord.notes[i + 1].letter).short);
		expect(result.gaps.map((g) => g.label)).toEqual(expectedLabels);
		for (const gap of result.gaps) {
			expect(gap.label.startsWith('+')).toBe(true);
		}
	});

	it('carries the E♭ third solfege "Mi♭" and B♭ seventh solfege "Si♭" through for Cm7 (IVW-03)', () => {
		const result = stackedThirdsFor(spellChord('Cm7'));
		expect(result.tones[1].letter).toBe('E♭');
		expect(result.tones[1].solfege).toBe('Mi♭');
		expect(result.tones[3].letter).toBe('B♭');
		expect(result.tones[3].solfege).toBe('Si♭');
	});

	it('gap longFr matches intervalBetween(...).longFr for consecutive letters', () => {
		const chord = spellChord('Cm7');
		const result = stackedThirdsFor(chord);
		expect(result.gaps[0].longFr).toBe(
			intervalBetween(chord.notes[0].letter, chord.notes[1].letter).longFr
		);
		expect(result.gaps[0].longFr).toBe('tierce mineure');
	});

	it('holds gaps.length === tones.length - 1 for every recognized-chord fixture', () => {
		for (const symbol of ['Cm7', 'Cmaj7', 'C7', 'Cm7b5', 'Cdim7', 'Cm', 'Cmaj9']) {
			const result = stackedThirdsFor(spellChord(symbol));
			expect(result.gaps.length).toBe(result.tones.length - 1);
		}
	});

	it('is total: returns empty tones and gaps for an unrecognized chord, never throws', () => {
		const result = stackedThirdsFor(spellChord('nonsense'));
		expect(result.tones).toEqual([]);
		expect(result.gaps).toEqual([]);
	});

	it('contains no em dashes in any gap label or longFr', () => {
		for (const symbol of ['Cm7', 'Cmaj7', 'C7', 'Cm7b5', 'Cdim7', 'Cm', 'Cmaj9']) {
			const result = stackedThirdsFor(spellChord(symbol));
			for (const gap of result.gaps) {
				expect(gap.label).not.toMatch(/—|–/);
				expect(gap.longFr).not.toMatch(/—|–/);
			}
		}
	});
});

describe('stackedThirdsFor: startRole rotation (Phase 35, INV-02)', () => {
	it('is byte-identical to the unrotated call when startRole is omitted', () => {
		const chord = spellChord('Cm7');
		expect(stackedThirdsFor(chord, undefined)).toEqual(stackedThirdsFor(chord));
	});

	it('rotates Cm7 to lead with the fifth (G), preserving role/letter per tone, only order changes', () => {
		const chord = spellChord('Cm7');
		const result = stackedThirdsFor(chord, 'fifth');
		expect(result.tones.map((t) => t.role)).toEqual(['fifth', 'seventh', 'root', 'third']);
		expect(result.tones.map((t) => t.letter)).toEqual(['G', 'B♭', 'C', 'E♭']);
		// Unrotated tone entries are preserved verbatim per-note, just reordered.
		const unrotated = formulaFor(chord);
		expect(result.tones[0]).toEqual(unrotated.find((t) => t.role === 'fifth'));
		expect(result.tones[2]).toEqual(unrotated.find((t) => t.role === 'root'));
	});

	it('recomputes gaps between the rotated consecutive pairs via intervalBetween, surfacing a genuine non-third gap mid-row', () => {
		const chord = spellChord('Cm7');
		const result = stackedThirdsFor(chord, 'fifth');
		// Rotated order: G -> Bb -> C -> Eb: m3, M2, m3 (a genuine non-third gap
		// (M2) appears in the middle, not just at the wrap edge).
		expect(result.gaps.map((g) => g.label)).toEqual(['+m3', '+M2', '+m3']);
	});

	it('falls back to the unrotated notes when no tone carries the requested role (e.g. seventh on a triad)', () => {
		const chord = spellChord('Cm');
		const result = stackedThirdsFor(chord, 'seventh');
		expect(result).toEqual(stackedThirdsFor(chord));
	});

	it('rotating by the current leading role (root) is a no-op', () => {
		const chord = spellChord('Cm7');
		expect(stackedThirdsFor(chord, 'root')).toEqual(stackedThirdsFor(chord));
	});
});

/**
 * BUG PIN (pedagogy audit, "Why these notes?" panel): the previous copy was
 *
 *   en 'is a minor third: 3 semitones above the root, giving the natural note,
 *       not the sharp.'
 *   en 'is a major third: 4 semitones above the root, giving the sharp note.'
 *   fr '= tierce mineure : ... la note naturelle, pas le dièse.'
 *   fr '= tierce majeure : ... la note diésée.'
 *
 * written for the Am7/Amaj7 worked example (C vs C♯) and then rendered for
 * EVERY recognized chord. The minor claim was true for only 6 of 12 roots
 * (Cm7's third is E♭, a FLAT) and the major claim for only 5 of 12 (Fmaj7's
 * third is A, NATURAL). This suite asserts the replacement sentence is true
 * for all 12 catalog roots across every third-bearing quality.
 *
 * Truth is checked against tonal directly (not via the app's own interval
 * module) so the assertions are independent of the code under test. The
 * copy deliberately spells the letter-name span as the word "three"/"trois"
 * and uses DIGITS only for the semitone count, which lets the digit sweep
 * below prove no wrong number can appear anywhere in the sentence.
 */
describe('thirdSpellingSentence: true for every root (pedagogy audit bug pin)', () => {
	afterEach(() => {
		setLocale('en');
	});

	/** randomChord.ts's 12 catalog roots, the exact space every drill/lookup draws from. */
	const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
	/** Every v1 quality spellChord gives a third-role note. */
	const QUALITIES = ['', 'm', 'dim', 'maj7', 'm7', '7', 'm7b5', 'dim7'];

	/** Everything after the "is a minor 3rd:" / "= tierce mineure :" lead-in. */
	function body(sentence: string): string {
		return sentence.slice(sentence.indexOf(':') + 1);
	}

	/** Ground truth straight from tonal, bypassing $lib/theory/interval entirely. */
	function truthFor(symbol: string) {
		const chord = Chord.get(symbol);
		const third = chord.notes[1];
		const info = Interval.get(Interval.distance(chord.tonic!, third));
		return {
			third,
			letterName: third.charAt(0),
			semitones: info.semitones!,
			degree: info.num!,
			quality: info.q
		};
	}

	it('every root x quality yields a third that really is a third (guards the fixture space itself)', () => {
		for (const root of ROOTS) {
			for (const quality of QUALITIES) {
				const truth = truthFor(root + quality);
				expect(truth.degree, `${root}${quality}`).toBe(3);
			}
		}
	});

	it('EN: names the right quality, the right semitone count, and the right letter name for all 12 roots', () => {
		setLocale('en');
		for (const root of ROOTS) {
			for (const quality of QUALITIES) {
				const symbol = root + quality;
				const chord = spellChord(symbol);
				const truth = truthFor(symbol);
				const sentence = thirdSpellingSentence(chord);
				const where = `${symbol} (third ${truth.third})`;

				// The only digits in the sentence body are the TRUE semitone count.
				// (The lead-in quality name comes from the shared interval module's
				// ordinal diction, "minor 3rd", whose own digit is checked by the
				// exact-quality assertion below rather than by this sweep.)
				const digits = body(sentence).match(/\d+/g) ?? [];
				expect(digits.length, where).toBeGreaterThan(0);
				for (const digit of digits) {
					expect(Number(digit), where).toBe(truth.semitones);
				}

				// The quality word matches tonal's quality, not a hardcoded guess.
				const expectedQuality = truth.quality === 'm' ? 'minor 3rd' : 'major 3rd';
				expect(sentence, where).toContain(`is a ${expectedQuality}:`);

				// The letter-name span is the actual spelled third's letter, and the
				// letter-name count ("three") is spelled as a word, never a digit.
				expect(sentence, where).toContain('spans three letter names');
				expect(sentence, where).toContain(`${chord.root} up to ${truth.letterName}`);
				expect(sentence, where).toContain(`the letter ${truth.letterName}`);

				// The false natural/sharp/flat claims are gone for good: the sentence
				// never asserts WHICH accidental the answer carries in prose.
				expect(sentence.toLowerCase(), where).not.toContain('natural');
				expect(sentence.toLowerCase(), where).not.toContain('sharp');
				expect(sentence.toLowerCase(), where).not.toContain('flat');
			}
		}
	});

	it('FR: same truth, French interval vocabulary, no dièse/bémol/naturelle claim', () => {
		setLocale('fr');
		for (const root of ROOTS) {
			for (const quality of QUALITIES) {
				const symbol = root + quality;
				const chord = spellChord(symbol);
				const truth = truthFor(symbol);
				const sentence = thirdSpellingSentence(chord);
				const where = `${symbol} (third ${truth.third})`;

				const digits = sentence.match(/\d+/g) ?? [];
				expect(digits.length, where).toBeGreaterThan(0);
				for (const digit of digits) {
					expect(Number(digit), where).toBe(truth.semitones);
				}

				const expectedQuality = truth.quality === 'm' ? 'tierce mineure' : 'tierce majeure';
				expect(sentence, where).toContain(`= ${expectedQuality} :`);
				expect(sentence, where).toContain('trois noms de notes');
				expect(sentence, where).toContain(`de ${chord.root} à ${truth.letterName}`);
				expect(sentence, where).toContain(`la lettre ${truth.letterName}`);

				expect(sentence.toLowerCase(), where).not.toContain('dièse');
				expect(sentence.toLowerCase(), where).not.toContain('diésée');
				expect(sentence.toLowerCase(), where).not.toContain('bémol');
				expect(sentence.toLowerCase(), where).not.toContain('naturelle');
			}
		}
	});

	it('the specific regressions the audit named now read correctly', () => {
		setLocale('en');
		// Cm7's third is E♭, a FLAT: the old copy claimed "the natural note, not
		// the sharp".
		expect(thirdSpellingSentence(spellChord('Cm7'))).toBe(
			'is a minor 3rd: 3 semitones above C. A third always spans three letter names, C up to E, ' +
				'so those 3 semitones get spelled with the letter E and whatever accidental that takes.'
		);
		// Fmaj7's third is A, NATURAL: the old copy claimed "the sharp note".
		expect(thirdSpellingSentence(spellChord('Fmaj7'))).toBe(
			'is a major 3rd: 4 semitones above F. A third always spans three letter names, F up to A, ' +
				'so those 4 semitones get spelled with the letter A and whatever accidental that takes.'
		);
		// A double-flat third (G♭m7 -> B♭♭) still names the LETTER B, not B♭.
		expect(thirdSpellingSentence(spellChord('Gbm7'))).toContain('G♭ up to B');
		expect(thirdSpellingSentence(spellChord('Gbm7'))).toContain('the letter B and');
	});

	it('is total: a chord with no third role returns the empty string, never throws', () => {
		setLocale('en');
		expect(thirdSpellingSentence(spellChord('Csus4'))).toBe('');
		expect(thirdSpellingSentence(spellChord('not-a-chord'))).toBe('');
	});

	it('contains no em dashes in either locale (standing copy rule)', () => {
		for (const locale of ['en', 'fr'] as const) {
			setLocale(locale);
			for (const symbol of ['Cm7', 'Fmaj7', 'Bbm7b5', 'F#dim7', 'Ab7']) {
				expect(thirdSpellingSentence(spellChord(symbol))).not.toMatch(/—|–/);
			}
		}
	});
});
