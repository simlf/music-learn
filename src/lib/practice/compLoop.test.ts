import { describe, expect, it } from 'vitest';
import { Note } from 'tonal';
import {
	buildCompBars,
	compBarScale,
	compScaleGhosts,
	compVoicing,
	romanShape,
	templateMode
} from './compLoop';
import { PROGRESSION_KEYS, PROGRESSION_TEMPLATES, buildProgression } from './progressions';
import { spellChord } from '$lib/theory/chord';
import { improvGuideFor } from '$lib/theory/chordScale';
import { toAsciiAccidentals as toAscii } from '$lib/theory/interval';
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

/**
 * The per-bar chord-scale overlay (design doc 4.3.2 / 5.2). Two promises:
 *
 * 1. The loop never invents a second answer. Every bar's scale is exactly
 *    `improvGuideFor(spellChord(symbol)).scales[0]`, i.e. what the Lookup
 *    improvisation board shows for that same symbol.
 * 2. Every bar the loop can play has one, so turning the overlay on can never
 *    leave the player staring at a bar with no reading.
 */
describe('compBarScale: the loop reads its own bars through the chord-scale engine', () => {
	it('agrees note for note with the improvisation guide’s default scale', () => {
		for (const symbol of ['Dm7', 'G7', 'Cmaj7', 'Bm7b5', 'A♭7']) {
			const guide = improvGuideFor(spellChord(symbol));
			expect(guide, symbol).not.toBeNull();
			expect(compBarScale(symbol), symbol).toEqual(guide?.scales[0]);
		}
	});

	it('reads G7 as G mixolydian, with the 11 flagged careful against the 3rd', () => {
		const scale = compBarScale('G7');

		expect(scale?.id).toBe('mixolydian');
		expect(scale?.tonic).toBe('G');
		expect(scale?.notes.map((note) => note.letter)).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F']);
		// The chord tones the loop is already holding.
		expect(scale?.notes.filter((note) => note.kind === 'chord-tone').map((n) => n.letter)).toEqual([
			'G',
			'B',
			'D',
			'F'
		]);

		const careful = scale?.notes.filter((note) => note.kind === 'careful') ?? [];
		expect(careful.map((note) => note.letter)).toEqual(['C']);
		expect(careful[0].label).toBe('11');
		// C sits one half step above B, the major 3rd: the classic avoid note.
		expect(careful[0].clashesWith).toBe('B');
		expect(careful[0].clashesWithLabel).toBe('M3');
	});

	it('reads Dm7 as D dorian, which has no careful note at all', () => {
		const scale = compBarScale('Dm7');

		expect(scale?.id).toBe('dorian');
		expect(scale?.notes.map((note) => note.letter)).toEqual(['D', 'E', 'F', 'G', 'A', 'B', 'C']);
		expect(scale?.notes.every((note) => note.kind !== 'careful')).toBe(true);
	});

	it('gives every one of the loop’s 120 bars a scale rooted on that bar’s own root', () => {
		let barsChecked = 0;
		for (const template of PROGRESSION_TEMPLATES) {
			for (const key of PROGRESSION_KEYS) {
				for (const bar of buildCompBars(template.id, key)) {
					const label = `${template.id} in ${key} bar ${bar.index + 1} (${bar.symbol})`;
					const scale = compBarScale(bar.symbol);
					expect(scale, label).not.toBeNull();
					// The scale starts on the chord's own root: that IS the mapping.
					expect(scale?.tonic, label).toBe(bar.root);
					// Every note the loop strikes is a chord tone of the reading, so
					// the overlay never hatches a key the left hand is holding.
					for (const played of bar.notes) {
						const inScale = scale?.notes.find((note) => note.letter === played.letter);
						expect(inScale?.kind, `${label}: ${played.letter}`).toBe('chord-tone');
					}
					barsChecked += 1;
				}
			}
		}
		expect(barsChecked).toBe(120);
	});

	it('returns null rather than a wrong reading when the guide has no honest answer', () => {
		// Diminished: the guide deliberately offers no scale (design doc 5.2).
		expect(compBarScale('Cdim7')).toBeNull();
		// Augmented and minor/major seventh are out of the reference’s scope.
		expect(compBarScale('Caug')).toBeNull();
		expect(compBarScale('CmMaj7')).toBeNull();
		// Unrecognized input never throws.
		expect(compBarScale('H7')).toBeNull();
		expect(compBarScale('')).toBeNull();
	});
});

describe('compScaleGhosts: what the overlay draws on top of the comp', () => {
	function ghostsFor(symbol: string, octaves: readonly number[] = [4]) {
		const scale = compBarScale(symbol);
		expect(scale, `the guide should offer a scale over ${symbol}`).not.toBeNull();
		return compScaleGhosts(scale!, octaves);
	}

	it('draws the whole scale in each requested octave', () => {
		const scale = compBarScale('G7')!;
		const ghosts = compScaleGhosts(scale, [4, 5]);

		// G mixolydian entire, twice: the keyboard, not this function, decides
		// which of those keys is already carrying an interval fill.
		expect(ghosts.filter((ghost) => ghost.octave === 4).map((ghost) => ghost.letter)).toEqual(
			scale.notes.map((note) => note.letter)
		);
		expect(ghosts.filter((ghost) => ghost.octave === 5).map((ghost) => ghost.letter)).toEqual(
			scale.notes.map((note) => note.letter)
		);
		expect(ghosts).toHaveLength(scale.notes.length * 2);
	});

	it('draws the fifth the comp never strikes, on every chord family the loop uses', () => {
		expect(ghostsFor('Dm7').map((ghost) => ghost.letter)).toContain('A');
		expect(ghostsFor('G7').map((ghost) => ghost.letter)).toContain('D');
		expect(ghostsFor('Cmaj7').map((ghost) => ghost.letter)).toContain('G');
	});

	it('leaves no scale note undrawn, across all three forms in every key', () => {
		for (const template of PROGRESSION_TEMPLATES) {
			for (const key of PROGRESSION_KEYS) {
				for (const bar of buildCompBars(template.id, key)) {
					const scale = compBarScale(bar.symbol);
					expect(scale, `${bar.symbol} should read as a scale`).not.toBeNull();
					const drawn = new Set(
						compScaleGhosts(scale!, [4, 5]).map(
							(ghost) => `${Note.chroma(toAscii(ghost.letter))}:${ghost.octave}`
						)
					);

					for (const note of scale!.notes) {
						for (const octave of [4, 5]) {
							expect(
								drawn.has(`${Note.chroma(toAscii(note.letter))}:${octave}`),
								`${bar.symbol} in ${key}: ${note.letter}${octave} is in the scale, so it must be drawn`
							).toBe(true);
						}
					}
				}
			}
		}
	});

	it('carries each note’s label as its marker and flags only the careful one', () => {
		expect(ghostsFor('G7').map((ghost) => [ghost.letter, ghost.marker, ghost.tone])).toEqual([
			['G', 'R', 'plain'],
			['A', '9', 'plain'],
			['B', 'M3', 'plain'],
			['C', '11', 'careful'],
			['D', 'P5', 'plain'],
			['E', '13', 'plain'],
			['F', 'm7', 'plain']
		]);
	});

	it('draws no vermilion bar on a scale with nothing to be careful about', () => {
		const ghosts = ghostsFor('Dm7');

		expect(ghosts.every((ghost) => ghost.tone === 'plain')).toBe(true);
		expect(ghosts.map((ghost) => ghost.letter)).toEqual(['D', 'E', 'F', 'G', 'A', 'B', 'C']);
	});

	it('returns nothing for no octaves (total)', () => {
		expect(compScaleGhosts(compBarScale('G7')!, [])).toEqual([]);
	});
});
