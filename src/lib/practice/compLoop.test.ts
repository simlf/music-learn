import { describe, expect, it } from 'vitest';
import { Note } from 'tonal';
import { buildCompBars, compVoicing, romanShape, templateMode } from './compLoop';
import { PROGRESSION_KEYS, PROGRESSION_TEMPLATES, buildProgression } from './progressions';
import { spellChord } from '$lib/theory/chord';
import { hasFlatFifth, shellNotes } from './shellVoicing';

/**
 * The comping loop's form and voicing, tested as pure functions. Two musical
 * promises are locked here:
 *
 * 1. The loop reuses the ONE progression engine. Its bars are exactly
 *    buildProgression's bars, never a second hand-rolled table.
 * 2. The comp is a real left-hand shell: the root in the bass, the guide tones
 *    above it, nothing in between, and strictly ascending. Pitch expectations
 *    are checked against tonal's own midi numbers rather than restated by
 *    hand.
 */

function midi(pitch: string): number {
	const value = Note.midi(pitch);
	expect(value, `tonal should know the pitch ${pitch}`).not.toBeNull();
	return value as number;
}

describe('buildCompBars: the bars are the progression engine’s bars', () => {
	it('builds the major ii-V-I in C as Dm7, G7, Cmaj7 with its roman numerals', () => {
		const bars = buildCompBars('major-ii-V-I', 'C');

		expect(bars.map((bar) => bar.symbol)).toEqual(['Dm7', 'G7', 'Cmaj7']);
		expect(bars.map((bar) => bar.roman)).toEqual(['ii', 'V', 'I']);
		expect(bars.map((bar) => bar.index)).toEqual([0, 1, 2]);
		expect(bars.map((bar) => bar.root)).toEqual(['D', 'G', 'C']);
		expect(bars.map((bar) => bar.quality)).toEqual(['m7', '7', 'maj7']);
	});

	it('builds the 4-bar turnaround as four bars, so the form length is the template’s', () => {
		expect(buildCompBars('major-turnaround-I-vi-ii-V', 'F')).toHaveLength(4);
		expect(buildCompBars('major-ii-V-I', 'F')).toHaveLength(3);
	});

	it('agrees with buildProgression symbol for symbol across every template and key', () => {
		for (const template of PROGRESSION_TEMPLATES) {
			for (const key of PROGRESSION_KEYS) {
				const engine = buildProgression(template.id, key).map((bar) => bar.symbol);
				const loop = buildCompBars(template.id, key).map((bar) => bar.symbol);
				expect(loop, `${template.id} in ${key}`).toEqual(engine);
			}
		}
	});

	it('returns no bars for an unknown template or an unknown key (total)', () => {
		expect(buildCompBars('not-a-template', 'C')).toEqual([]);
		expect(buildCompBars('major-ii-V-I', 'H')).toEqual([]);
		expect(buildCompBars('', '')).toEqual([]);
	});
});

describe('compVoicing: root in the bass, guide tones above, nothing else', () => {
	it('voices Dm7 as the root low plus its 3rd and 7th, and never the 5th', () => {
		const voicing = compVoicing('Dm7');

		expect(voicing).not.toBeNull();
		expect(voicing?.root).toBe('D');
		expect(voicing?.notes.map((note) => note.letter)).toEqual(['D', 'F', 'C']);
		expect(voicing?.notes.map((note) => note.role)).toEqual(['root', 'third', 'seventh']);
		expect(voicing?.pitches).toEqual(['D3', 'F4', 'C5']);
		// The plain fifth of Dm7 (A) is filler and is deliberately absent.
		expect(voicing?.notes.some((note) => note.letter === 'A')).toBe(false);
	});

	it('voices G7 and Cmaj7 with the bass a register below the guide tones', () => {
		expect(compVoicing('G7')?.pitches).toEqual(['G3', 'B4', 'F5']);
		expect(compVoicing('Cmaj7')?.pitches).toEqual(['C3', 'E4', 'B4']);
	});

	it('keeps the ♭5 in the comp on a ♭5 symbol, because there the fifth IS the chord', () => {
		const voicing = compVoicing('Dm7b5');

		expect(voicing?.notes.map((note) => note.letter)).toEqual(['D', 'F', 'A♭', 'C']);
		expect(voicing?.notes.map((note) => note.role)).toEqual([
			'root',
			'third',
			'fifth',
			'seventh'
		]);
		expect(voicing?.pitches).toEqual(['D3', 'F4', 'Ab4', 'C5']);
	});

	it('takes its guide tones from shellVoicing.shellNotes, never a second definition', () => {
		for (const symbol of ['Cmaj7', 'C7', 'Cm7', 'Cm7b5', 'Cdim7', 'F♯m7', 'B♭7']) {
			const chord = spellChord(symbol);
			const expected = shellNotes(chord).map((note) => note.letter);
			const voiced = compVoicing(symbol)?.notes.slice(1).map((note) => note.letter);
			expect(voiced, symbol).toEqual(expected);
			// And the ♭5 exception is inherited rather than re-decided here.
			expect(voiced?.length, symbol).toBe(hasFlatFifth(chord) ? 3 : 2);
		}
	});

	it('returns null for an unrecognized or empty symbol rather than a malformed voicing (total)', () => {
		expect(compVoicing('Xyz9')).toBeNull();
		expect(compVoicing('')).toBeNull();
	});
});

describe('every bar of every form is playable and strictly ascending', () => {
	it('puts the root lowest and each note above the last, in all 12 keys of all 3 forms', () => {
		let barsChecked = 0;

		for (const template of PROGRESSION_TEMPLATES) {
			for (const key of PROGRESSION_KEYS) {
				const bars = buildCompBars(template.id, key);
				expect(bars.length, `${template.id} in ${key}`).toBeGreaterThan(0);

				for (const bar of bars) {
					const label = `${template.id} in ${key}, bar ${bar.index} (${bar.symbol})`;
					const pitches = bar.pitches.map(midi);

					// Strictly ascending: no unison, no crossed voice.
					for (let i = 1; i < pitches.length; i++) {
						expect(pitches[i], label).toBeGreaterThan(pitches[i - 1]);
					}

					// The bass is the chord's own root, and it is the lowest note.
					expect(Note.pitchClass(bar.pitches[0]), label).toBe(
						Note.pitchClass(bar.root.replace(/♯/g, '#').replace(/♭/g, 'b'))
					);
					expect(bar.pitches[0], label).toMatch(/3$/);

					// One display note per sounding pitch, so the keyboard shows
					// exactly what the ear hears.
					expect(bar.notes.length, label).toBe(bar.pitches.length);
					expect(bar.notes[0].role, label).toBe('root');

					// The comp leaves the improvising register free: nothing above C6.
					expect(pitches[pitches.length - 1], label).toBeLessThan(midi('C6'));
					barsChecked += 1;
				}
			}
		}

		// 12 keys x (3 + 4 + 3) bars.
		expect(barsChecked).toBe(120);
	});
});

describe('form labels', () => {
	it('reads each template’s roman shape off the template itself', () => {
		expect(romanShape('major-ii-V-I')).toBe('ii V I');
		expect(romanShape('major-turnaround-I-vi-ii-V')).toBe('I vi ii V');
		expect(romanShape('minor-ii-V-i')).toBe('iiø V i');
		expect(romanShape('nope')).toBe('');
	});

	it('reports each template’s mode, defaulting to major for an unknown id', () => {
		expect(templateMode('major-ii-V-I')).toBe('major');
		expect(templateMode('minor-ii-V-i')).toBe('minor');
		expect(templateMode('nope')).toBe('major');
	});
});
