import { afterEach, describe, expect, it } from 'vitest';
import { Chord, ChordType, Interval } from 'tonal';
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
import { intervalBetween, intervalFromShort } from '$lib/theory/interval';

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

/**
 * BUG PIN (music-theory audit, Bug A): formulaFor recomputed every label with
 * intervalBetween(chord.root, note.letter), and intervalBetween runs
 * Interval.distance over PITCH CLASSES, which collapses the octave. Every
 * compound extension was therefore labelled as its simple equivalent:
 *
 *   C9      formula row  R M3 P5 m7 M2   (expected R M3 P5 m7 M9)
 *           sentence     "... then a major 2nd."  (expected "major 9th")
 *   C13                  ... M2 M6        (expected M9 M13)
 *   C7#11                ... A4           (expected A11)
 *   C7b9                 ... m2           (expected m9)
 *
 * Truth comes from tonal's own `Chord.get(sym).intervals` throughout, never
 * from the app's interval module (the module under suspicion), so these
 * assertions are independent of the code they pin.
 */
describe('formulaFor: compound degrees (music-theory audit Bug A)', () => {
	afterEach(() => {
		setLocale('en');
	});

	/** The audit's 22 extended symbols, every one of which disagreed with tonal. */
	const EXTENDED = [
		'C69',
		'C9',
		'Cm9',
		'Cmaj9',
		'C11',
		'Cm11',
		'C13',
		'Cm13',
		'Cmaj13',
		'Cadd9',
		'C7#11',
		'C7b9',
		'C7#9',
		'C7b13',
		'Cmaj7#11',
		'C9sus4',
		'C7alt',
		'Bb13',
		'Eb9',
		'F#9',
		'Ab13',
		'A7#11'
	];

	/** The app's quality-first shorthand for one of tonal's interval names, straight from tonal. */
	function labelFromTonal(interval: string): string {
		const info = Interval.get(interval);
		return info.num === 1 && info.q === 'P' ? 'R' : `${info.q}${info.num}`;
	}

	it.each(EXTENDED)(
		'%s: every formula label carries tonal’s own compound degree',
		(symbol) => {
			const expected = Chord.get(symbol).intervals.map(labelFromTonal);
			expect(formulaFor(spellChord(symbol)).map((e) => e.label)).toEqual(expected);
		}
	);

	it('the audit’s named regressions now read correctly', () => {
		expect(formulaFor(spellChord('C9')).map((e) => e.label)).toEqual([
			'R',
			'M3',
			'P5',
			'm7',
			'M9'
		]);
		expect(formulaFor(spellChord('C13')).map((e) => e.label)).toEqual([
			'R',
			'M3',
			'P5',
			'm7',
			'M9',
			'M13'
		]);
		expect(formulaFor(spellChord('C7#11')).map((e) => e.label)).toContain('A11');
		expect(formulaFor(spellChord('C7b9')).map((e) => e.label)).toContain('m9');
		expect(formulaFor(spellChord('C7#9')).map((e) => e.label)).toContain('A9');
		// The simple-interval labels the audit reported are gone for good.
		for (const symbol of ['C9', 'C13', 'C7#11', 'C7b9', 'C7#9', 'Cadd9']) {
			const labels = formulaFor(spellChord(symbol)).map((e) => e.label);
			expect(labels, symbol).not.toContain('M2');
			expect(labels, symbol).not.toContain('m2');
			expect(labels, symbol).not.toContain('A2');
			expect(labels, symbol).not.toContain('A4');
			expect(labels, symbol).not.toContain('M6');
		}
	});

	it('the seventh/triad families are byte-identical: no compound label appears where none belongs', () => {
		expect(formulaFor(spellChord('Cm7')).map((e) => e.label)).toEqual(['R', 'm3', 'P5', 'm7']);
		expect(formulaFor(spellChord('Cmaj7')).map((e) => e.label)).toEqual(['R', 'M3', 'P5', 'M7']);
		expect(formulaFor(spellChord('C7')).map((e) => e.label)).toEqual(['R', 'M3', 'P5', 'm7']);
		expect(formulaFor(spellChord('Cm7b5')).map((e) => e.label)).toEqual(['R', 'm3', 'd5', 'm7']);
		// Cdim7's seventh is B♭♭, 9 semitones: a DIMINISHED 7th ("7d" in tonal,
		// verified both via Chord.get('Cdim7').intervals and
		// Interval.distance('C','Bbb')), so this family was already correct and
		// stays byte-identical through the fix.
		expect(formulaFor(spellChord('Cdim7')).map((e) => e.label)).toEqual(['R', 'm3', 'd5', 'd7']);
		expect(formulaFor(spellChord('Cm')).map((e) => e.label)).toEqual(['R', 'm3', 'P5']);
		expect(formulaFor(spellChord('Cdim')).map((e) => e.label)).toEqual(['R', 'm3', 'd5']);
	});

	/**
	 * A slash chord is the trap in reading intervals off tonal: Chord.get of the
	 * FULL symbol returns BASS-relative intervals ("5P 7M 8P 10M" for
	 * Cmaj7/G), which would label the root "P8" and the third "M10". The base
	 * symbol (before the final "/") is what restores root-relative degrees.
	 */
	it('a slash chord keeps ROOT-relative labels, never the bass-relative ones', () => {
		expect(Chord.get('Cmaj7/G').intervals).toEqual(['5P', '7M', '8P', '10M']); // the trap
		expect(formulaFor(spellChord('C/E')).map((e) => e.label)).toEqual(['R', 'M3', 'P5']);
		expect(formulaFor(spellChord('Cmaj7/G')).map((e) => e.label)).toEqual([
			'R',
			'M3',
			'P5',
			'M7'
		]);
		expect(formulaFor(spellChord('Abmaj7/Eb')).map((e) => e.label)).toEqual([
			'R',
			'M3',
			'P5',
			'M7'
		]);
		expect(formulaFor(spellChord('D/F#')).map((e) => e.label)).toEqual(['R', 'M3', 'P5']);
	});

	it('role tags (the color key) are untouched: 9 stays a second, 11 a fourth, 13 a sixth', () => {
		expect(formulaFor(spellChord('C9')).map((e) => e.role)).toEqual([
			'root',
			'third',
			'fifth',
			'seventh',
			'second'
		]);
		expect(formulaFor(spellChord('C13')).map((e) => e.role)).toEqual([
			'root',
			'third',
			'fifth',
			'seventh',
			'second',
			'sixth'
		]);
		expect(formulaFor(spellChord('C7#11')).map((e) => e.role)).toContain('fourth');
	});

	/**
	 * Whole-dictionary sweep: every chord type tonal knows, on all 12 catalog
	 * roots. Also guards $lib/theory/interval's ordinal/degree-noun tables
	 * against holes at the compound degrees, since the formula sentence reads
	 * its long names back out of the shorthand this produces (a "9M" must read
	 * "major 9th" / "neuvième majeure", never "" or "9th"-less junk).
	 */
	it('every chord type x all 12 roots agrees with tonal, and every label has a real name in both locales', () => {
		const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
		let checked = 0;
		for (const type of ChordType.all()) {
			for (const root of ROOTS) {
				const symbol = root + (type.aliases[0] ?? '');
				const chord = spellChord(symbol);
				if (!chord.recognized) continue;
				checked++;
				const expected = Chord.get(chord.symbol).intervals.map(labelFromTonal);
				const labels = formulaFor(chord).map((e) => e.label);
				expect(labels, chord.symbol).toEqual(expected);
				for (const label of labels) {
					const info = intervalFromShort(label);
					expect(info.long, `${chord.symbol} ${label} en`).not.toBe('');
					expect(info.longFr, `${chord.symbol} ${label} fr`).not.toBe('');
					// No bare-number fallback leaking out of the ordinal tables.
					expect(info.long, `${chord.symbol} ${label} en`).not.toMatch(/\d+th\b.*\d+th/);
					expect(info.longFr, `${chord.symbol} ${label} fr`).not.toMatch(/^\d/);
				}
			}
		}
		expect(checked).toBeGreaterThan(1000);
	});

	it('is total: an unrecognized chord still yields no entries, never throws', () => {
		expect(() => formulaFor(spellChord('nonsense'))).not.toThrow();
		expect(formulaFor(spellChord('nonsense'))).toEqual([]);
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

/**
 * BUG PIN (music-theory audit, Bug B): a slash chord's aliases dropped the
 * inversion, so the line asserted something false about the chord on screen:
 *
 *   aliasLine(spellChord('C/E'))      "C/E = CM = C^ = C = Cmaj"
 *   aliasLine(spellChord('Cmaj7/G'))  "Cmaj7/G = Cmaj7 = CΔ = Cma7 = ..."
 *   aliasLine(spellChord('Abm7/Cb'))  "A♭m7/Cb = ..."   (ASCII bass)
 *
 * C/E is not C. DECISION: append "/bass" to every alias rather than suppress
 * the line, so CΔ/G stays discoverable (see aliasLine's doc comment).
 */
describe('aliasLine: slash chords (music-theory audit Bug B)', () => {
	/** Every form on the line, split back out of the " = " join. */
	function forms(symbol: string): string[] {
		return aliasLine(spellChord(symbol)).split(' = ');
	}

	it('every alias of a slash chord carries the /bass, so no equation is false', () => {
		expect(aliasLine(spellChord('C/E'))).toBe('C/E = CM/E = C^/E = Cmaj/E');
		// The bare root-position forms the bug produced are gone.
		expect(forms('C/E')).not.toContain('C');
		expect(forms('C/E')).not.toContain('CM');
		expect(forms('C/E')).not.toContain('Cmaj');
	});

	it('Cmaj7/G keeps its genuinely useful aliases, each with the bass', () => {
		const line = aliasLine(spellChord('Cmaj7/G'));
		expect(line).toBe('Cmaj7/G = CΔ/G = Cma7/G = CM7/G = CMaj7/G = C^7/G');
		expect(forms('Cmaj7/G')).not.toContain('Cmaj7');
		expect(forms('Cmaj7/G')).not.toContain('CΔ');
	});

	it('every form on a slash-chord line ends in the same /bass segment', () => {
		for (const symbol of ['C/E', 'Cmaj7/G', 'D/F#', 'Abmaj7/Eb', 'Abm7/Cb', 'G7/F', 'Am7/G']) {
			const chord = spellChord(symbol);
			expect(chord.bass, symbol).toBeDefined();
			for (const form of forms(symbol)) {
				expect(form.endsWith(`/${chord.bass}`), `${symbol} -> ${form}`).toBe(true);
			}
		}
	});

	it('the bass is glyph-converted on every form, never left in ASCII', () => {
		const line = aliasLine(spellChord('Abm7/Cb'));
		expect(line).toBe('A♭m7/C♭ = A♭min7/C♭ = A♭mi7/C♭ = A♭-7/C♭');
		expect(line).not.toContain('Cb');
		expect(line).not.toContain('Ab');
		expect(aliasLine(spellChord('D/F#'))).not.toContain('F#');
		expect(aliasLine(spellChord('D/F#'))).toContain('D/F♯');
	});

	it('the leading form is exactly displaySymbol, and forms stay deduplicated', () => {
		for (const symbol of ['C/E', 'Cmaj7/G', 'Abm7/Cb', 'Cm7', 'Bbmaj7']) {
			const chord = spellChord(symbol);
			const all = forms(symbol);
			expect(all[0], symbol).toBe(displaySymbol(chord));
			expect(all.length, symbol).toBe(new Set(all).size);
		}
	});

	it('root-position chords are byte-identical: no stray trailing slash', () => {
		expect(aliasLine(spellChord('Cm7'))).toBe('Cm7 = Cmin7 = Cmi7 = C-7');
		expect(aliasLine(spellChord('C-7')).split(' = ')[0]).toBe('C-7');
		for (const symbol of ['Cm7', 'Cmaj7', 'C7', 'Bbmaj7', 'F#m7b5']) {
			expect(aliasLine(spellChord(symbol)), symbol).not.toContain('/');
		}
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

/**
 * BUG PIN (music-theory audit, Bug C): the sentence hardcoded "a" in every
 * slot, so a vowel-initial interval name read ungrammatically:
 *
 *   formulaSentence(spellChord('C7#11'))  "... then a augmented 4th."
 *   formulaSentence(spellChord('C7#9'))   "... then a augmented 2nd."
 *
 * (the degrees themselves were Bug A; the article is this one).
 */
describe('formulaSentence: article agreement (music-theory audit Bug C)', () => {
	afterEach(() => {
		setLocale('en');
	});

	it('uses "an" before a vowel-initial interval name', () => {
		expect(formulaSentence(spellChord('C7#11'))).toBe(
			'From the root, stack a major 3rd, then a perfect 5th, then a minor 7th, then an augmented 11th.'
		);
		expect(formulaSentence(spellChord('C7#9'))).toBe(
			'From the root, stack a major 3rd, then a perfect 5th, then a minor 7th, then an augmented 9th.'
		);
		expect(formulaSentence(spellChord('Caug'))).toContain('then an augmented 5th');
	});

	it('never emits "a augmented" / "a octave" for any chord type in the dictionary', () => {
		for (const type of ChordType.all()) {
			const chord = spellChord('C' + (type.aliases[0] ?? ''));
			if (!chord.recognized) continue;
			const sentence = formulaSentence(chord);
			expect(sentence, chord.symbol).not.toMatch(/\ba (?=[aeiou])/i);
		}
	});

	it('keeps "a" before a consonant-initial name: the existing sentences are byte-identical', () => {
		expect(formulaSentence(spellChord('Cdim'))).toBe(
			'From the root, stack a minor 3rd, then a diminished 5th.'
		);
		expect(formulaSentence(spellChord('Cm7b5'))).toBe(
			'From the root, stack a minor 3rd, then a diminished 5th, then a minor 7th.'
		);
		expect(formulaSentence(spellChord('Cmaj7'))).toBe(
			'From the root, stack a major 3rd, then a perfect 5th, then a major 7th.'
		);
	});

	it('agrees in the FIRST slot too, not only the "then" slots', () => {
		// A synthetic single-tone chord whose one non-root interval is
		// vowel-initial: the leading article has to agree as well.
		const chord = spellChord('Cmaj7');
		const augOnly = {
			...chord,
			notes: [chord.notes[0], { letter: 'G♯', solfege: 'Sol♯', role: 'fifth' as const }]
		};
		expect(formulaSentence(augOnly)).toBe('From the root, stack an augmented 5th.');
	});

	/**
	 * French needs no analogous fix: the article is the feminine "une", which
	 * never elides (unlike "de" -> "d'"), and every French degree noun the
	 * interval module ships is feminine. So a vowel-initial name still reads
	 * correctly, and there is no "d'" / "de" in this sentence template at all.
	 */
	it('FR: "une" stays correct before every vowel-initial degree noun, no elision needed', () => {
		setLocale('fr');
		expect(formulaSentence(spellChord('C7#11'))).toBe(
			'À partir de la fondamentale, empile une tierce majeure, puis une quinte juste, puis une septième mineure, puis une onzième augmentée.'
		);
		expect(formulaSentence(spellChord('C7#9'))).toContain('puis une neuvième augmentée');
		expect(formulaSentence(spellChord('C13'))).toContain('puis une treizième majeure');
		for (const type of ChordType.all()) {
			const chord = spellChord('C' + (type.aliases[0] ?? ''));
			if (!chord.recognized) continue;
			const sentence = formulaSentence(chord);
			// No masculine article and no botched elision ever appears.
			expect(sentence, chord.symbol).not.toMatch(/\bun (?!e)/);
			expect(sentence, chord.symbol).not.toMatch(/\bd'/);
			expect(sentence, chord.symbol).toMatch(/^À partir de la fondamentale, empile une /);
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

/**
 * BUG PIN (music-theory audit, Bug D): the stacked-THIRDS readout displayed
 * non-third gaps with no marking, so a perfect fifth read as one of the
 * stacked thirds. Verified:
 *
 *   stackedThirdsFor(spellChord('C13')).gaps    +M3 +m3 +m3 +M3 +P5
 *   stackedThirdsFor(spellChord('C7b13')).gaps  +M3 +d5 +m7
 *   stackedThirdsFor(spellChord('Cadd9')).gaps  +M3 +m3 +P5
 *
 * The audit's proposed cause (tones not ordered by ascending compound degree)
 * is disproved below against tonal directly: the order is already ascending,
 * and the gap VALUES are already correct compound distances. C13's D-to-A
 * really is a perfect fifth because C13 has no 11th. So what is fixed is the
 * presentation: which gaps are thirds is now explicit (`isThird`) and whether
 * the whole stack is tertian at all (`tertian`), following the dashed-neutral
 * convention Phase 32 (WR-02) already established in CountingChipRow.
 */
describe('stackedThirdsFor: non-tertian stacks (music-theory audit Bug D)', () => {
	const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

	it('DISPROVES the ordering theory: tonal already emits ascending degrees for every chord it recognizes', () => {
		let checked = 0;
		const nonAscending: string[] = [];
		for (const type of ChordType.all()) {
			for (const root of ROOTS) {
				const chord = spellChord(root + (type.aliases[0] ?? ''));
				if (!chord.recognized) continue;
				checked++;
				const degrees = Chord.get(chord.symbol).intervals.map((i) => Interval.get(i).num ?? 0);
				for (let i = 1; i < degrees.length; i++) {
					if (degrees[i] < degrees[i - 1]) nonAscending.push(chord.symbol);
				}
			}
		}
		expect(checked).toBeGreaterThan(1000);
		// Strictly out-of-order degrees: none. Re-sorting by compound degree
		// would be a no-op, which is why this bug is fixed as presentation.
		expect(nonAscending).toEqual([]);
		// The only non-STRICTLY-increasing case is a shared degree, 7b9#9's two
		// 9ths, already in the sensible ♭9-before-♯9 order.
		expect(Chord.get('C7b9#9').intervals).toEqual(['1P', '3M', '5P', '7m', '9m', '9A']);
	});

	it('DISPROVES the gap-value theory: every gap already equals the true compound distance', () => {
		let gapsChecked = 0;
		for (const type of ChordType.all()) {
			for (const root of ROOTS) {
				const chord = spellChord(root + (type.aliases[0] ?? ''));
				if (!chord.recognized) continue;
				const intervals = Chord.get(chord.symbol).intervals;
				const gaps = stackedThirdsFor(chord).gaps;
				for (let i = 0; i + 1 < intervals.length; i++) {
					const lo = Interval.get(intervals[i]);
					const hi = Interval.get(intervals[i + 1]);
					const trueSemitones = (hi.semitones ?? 0) - (lo.semitones ?? 0);
					const shown = Interval.get(
						gaps[i].label.replace(/^\+/, '').replace(/^([PMmAd]{1,2})(\d{1,2})$/, '$2$1')
					);
					expect(shown.semitones, `${chord.symbol} gap ${i}`).toBe(trueSemitones);
					gapsChecked++;
				}
			}
		}
		expect(gapsChecked).toBeGreaterThan(3000);
	});

	it('flags exactly the non-third gaps the audit reported', () => {
		expect(stackedThirdsFor(spellChord('C13')).gaps.map((g) => [g.label, g.isThird])).toEqual([
			['+M3', true],
			['+m3', true],
			['+m3', true],
			['+M3', true],
			['+P5', false]
		]);
		expect(stackedThirdsFor(spellChord('C7b13')).gaps.map((g) => [g.label, g.isThird])).toEqual([
			['+M3', true],
			['+d5', false],
			['+m7', false]
		]);
		expect(stackedThirdsFor(spellChord('Cadd9')).gaps.map((g) => [g.label, g.isThird])).toEqual([
			['+M3', true],
			['+m3', true],
			['+P5', false]
		]);
	});

	it('tertian is true only for a real stack of thirds', () => {
		for (const symbol of ['Cm7', 'Cmaj7', 'C7', 'Cm7b5', 'Cdim7', 'Cm', 'C', 'Cdim', 'Cmaj9']) {
			expect(stackedThirdsFor(spellChord(symbol)).tertian, symbol).toBe(true);
		}
		for (const symbol of ['C13', 'C7b13', 'Cadd9', 'Csus4', 'C6', 'C69', 'C7#11', 'C11']) {
			expect(stackedThirdsFor(spellChord(symbol)).tertian, symbol).toBe(false);
		}
	});

	it('tertian and isThird never disagree, on any chord type or rotation', () => {
		for (const type of ChordType.all()) {
			const chord = spellChord('C' + (type.aliases[0] ?? ''));
			if (!chord.recognized) continue;
			for (const startRole of [undefined, 'third', 'fifth', 'seventh'] as const) {
				const stacked = stackedThirdsFor(chord, startRole);
				expect(stacked.tertian, chord.symbol).toBe(stacked.gaps.every((g) => g.isThird));
				// isThird means exactly "a minor or major third", the two shapes the
				// row teaches: nothing else may claim to be a stacked third.
				for (const gap of stacked.gaps) {
					expect(gap.isThird, `${chord.symbol} ${gap.label}`).toBe(
						gap.label === '+m3' || gap.label === '+M3'
					);
				}
			}
		}
	});

	it('an unrecognized chord has no gaps, and an empty gap list is not called a stack of thirds', () => {
		const result = stackedThirdsFor(spellChord('nonsense'));
		expect(result.gaps).toEqual([]);
		// Vacuously tertian is fine (nothing is shown at all), but it must not throw.
		expect(() => result.tertian).not.toThrow();
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
