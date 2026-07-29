import { describe, expect, it } from 'vitest';
import { spellChord } from './chord';
import { aliasLine } from '$lib/lookup/chordPresentation';
import { ROOTS } from './randomChord';

/**
 * Printed-notation coverage. These are the spellings a real fake book uses,
 * as opposed to the canonical forms the drill catalog generates. Every symbol
 * here was UNRECOGNIZED before the chart-vocabulary sweep, with no
 * did-you-mean fallback (didYouMean only draws from the 8 QUALITY_SUFFIXES).
 */
describe('printed chart notation parses', () => {
	// [printed form, the canonical symbol it must agree with]
	const equivalences: [string, string][] = [
		['C7(b9)', 'C7b9'],
		['Cm7(b5)', 'Cm7b5'],
		['C7(#11)', 'C7#11'],
		['C7(b5)', 'C7b5'],
		['C7(#9)', 'C7#9'],
		['C7(b13)', 'C7b13'],
		['C(add9)', 'Cadd9'],
		['C7(alt)', 'C7alt'],
		['Cm(maj7)', 'CmMaj7'],
		['Cmi(maj7)', 'CmMaj7'],
		['Cmin(maj7)', 'CmMaj7'],
		['Cmmaj7', 'CmMaj7'],
		['C-M7', 'CmMaj7'],
		['CmΔ7', 'CmMaj7'],
		['C∆', 'Cmaj7'],
		['C∆7', 'Cmaj7'],
		['CΔ7', 'Cmaj7']
	];

	it.each(equivalences)('%s parses and spells the same notes as %s', (printed, canonical) => {
		const got = spellChord(printed);
		const want = spellChord(canonical);
		expect(want.recognized, `${canonical} control must parse`).toBe(true);
		expect(got.recognized, `${printed} must parse`).toBe(true);
		expect(got.notes.map((n) => n.letter)).toEqual(want.notes.map((n) => n.letter));
	});

	it('works on flat and sharp roots too, not just C', () => {
		for (const root of ['Bb', 'F#', 'Eb', 'Ab']) {
			for (const [printed, canonical] of [
				['7(b9)', '7b9'],
				['m7(b5)', 'm7b5'],
				['m(maj7)', 'mMaj7']
			] as const) {
				const got = spellChord(`${root}${printed}`);
				const want = spellChord(`${root}${canonical}`);
				expect(got.recognized, `${root}${printed}`).toBe(true);
				expect(got.notes.map((n) => n.letter)).toEqual(want.notes.map((n) => n.letter));
			}
		}
	});

	it('is a no-op for symbols that already parsed', () => {
		for (const root of ROOTS) {
			for (const quality of ['', 'm', 'maj7', 'm7', '7', 'm7b5', 'dim7', '6', '69', 'sus4']) {
				const symbol = `${root}${quality}`;
				const chord = spellChord(symbol);
				if (!chord.recognized) continue;
				expect(chord.symbol, `${symbol} round-trips`).toBe(symbol);
			}
		}
	});
});

/**
 * The alias line states equations, so every form it prints must itself parse
 * back to the same chord. Two families broke that contract.
 */
describe('aliasLine never offers a symbol the app cannot read back', () => {
	it('drops slash-bearing aliases on a slash chord, keeps them at root position', () => {
		// "C" + "6/9" + "/E" reads as a nested inversion, and does not parse.
		expect(spellChord('C6/9/E').recognized).toBe(false);
		expect(aliasLine(spellChord('C69/E'))).not.toContain('6/9/E');
		// Root position still shows it, because there it does parse.
		expect(spellChord('C6/9').recognized).toBe(true);
		expect(aliasLine(spellChord('C69'))).toContain('C6/9');
	});

	it('drops an alias that would be swallowed by the root accidental slot', () => {
		// "C" + "b9sus" reads back as C FLAT 9sus: a different chord, different root.
		const line = aliasLine(spellChord('C7b9sus'));
		expect(line).not.toContain('Cb9sus');
	});

	it('every form in every alias line parses back to the same notes', () => {
		const symbols = ['C69', 'C69/E', 'CmMaj7', 'CmMaj7/G', 'C7b9sus', 'Cmaj7/G', 'C/E', 'Bbm7b5'];
		for (const symbol of symbols) {
			const chord = spellChord(symbol);
			if (!chord.recognized) continue;
			const want = chord.notes.map((n) => n.letter).join(' ');
			for (const form of aliasLine(chord).split(' = ')) {
				const round = spellChord(form);
				expect(round.recognized, `${form} (from ${symbol}) must parse`).toBe(true);
				expect(round.notes.map((n) => n.letter).join(' '), `${form} from ${symbol}`).toBe(want);
			}
		}
	});
});
