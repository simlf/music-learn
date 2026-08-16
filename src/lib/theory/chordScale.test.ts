import { describe, expect, it } from 'vitest';
import { spellChord } from './chord';
import { improvGuideFor, type ChordScaleOption, type ImprovGuide } from './chordScale';

/** Convenience: the guide for a symbol, asserted present. */
function guideFor(symbol: string): ImprovGuide {
	const guide = improvGuideFor(spellChord(symbol));
	expect(guide, `expected a guide for ${symbol}`).not.toBeNull();
	return guide!;
}

function scaleById(guide: ImprovGuide, id: string): ChordScaleOption {
	const scale = guide.scales.find((option) => option.id === id);
	expect(scale, `expected scale ${id}`).toBeDefined();
	return scale!;
}

function lettersOf(scale: ChordScaleOption): string[] {
	return scale.notes.map((note) => note.letter);
}

function carefulLetters(scale: ChordScaleOption): string[] {
	return scale.notes.filter((note) => note.kind === 'careful').map((note) => note.letter);
}

describe('improvGuideFor: family and scale choice', () => {
	it('maps a major seventh to ionian (default) plus lydian, tonic = the chord root', () => {
		const guide = guideFor('Cmaj7');
		expect(guide.family).toBe('major');
		expect(guide.scales.map((scale) => scale.id)).toEqual(['ionian', 'lydian']);
		expect(guide.scales[0].tonic).toBe('C');
	});

	it('maps a dominant seventh to mixolydian', () => {
		const guide = guideFor('G7');
		expect(guide.family).toBe('dominant');
		expect(guide.scales.map((scale) => scale.id)).toEqual(['mixolydian']);
		expect(lettersOf(guide.scales[0])).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F']);
	});

	it('maps a minor seventh to dorian first, then aeolian and the minor pentatonic', () => {
		const guide = guideFor('Am7');
		expect(guide.family).toBe('minor');
		expect(guide.scales.map((scale) => scale.id)).toEqual([
			'dorian',
			'aeolian',
			'minor-pentatonic'
		]);
		expect(lettersOf(scaleById(guide, 'dorian'))).toEqual(['A', 'B', 'C', 'D', 'E', 'F♯', 'G']);
		expect(lettersOf(scaleById(guide, 'minor-pentatonic'))).toEqual(['A', 'C', 'D', 'E', 'G']);
	});

	it('maps a half-diminished chord to locrian, with glyph-true spelling on a sharp root', () => {
		const guide = guideFor('F♯ø7');
		expect(guide.family).toBe('half-diminished');
		expect(guide.scales.map((scale) => scale.id)).toEqual(['locrian']);
		expect(lettersOf(guide.scales[0])).toEqual(['F♯', 'G', 'A', 'B', 'C', 'D', 'E']);
	});

	it('answers a diminished seventh with chord tones plus caution: no scale at all', () => {
		const guide = guideFor('Cdim7');
		expect(guide.family).toBe('diminished');
		expect(guide.scales).toEqual([]);
	});

	it('keeps the dominant scale for sus chords', () => {
		expect(guideFor('C7sus4').family).toBe('sus');
		expect(guideFor('Csus4').scales.map((scale) => scale.id)).toEqual(['mixolydian']);
	});

	it('classifies extended symbols with their parent family', () => {
		expect(guideFor('C13').family).toBe('dominant');
		expect(guideFor('Cmaj9').family).toBe('major');
		expect(guideFor('Am9').family).toBe('minor');
	});

	it('has no honest beginner answer for augmented, minor/major seventh, or power chords', () => {
		expect(improvGuideFor(spellChord('Caug'))).toBeNull();
		expect(improvGuideFor(spellChord('CmMaj7'))).toBeNull();
		expect(improvGuideFor(spellChord('C5'))).toBeNull();
	});

	it('is total on junk input', () => {
		expect(improvGuideFor(spellChord('not a chord'))).toBeNull();
		expect(improvGuideFor(spellChord(''))).toBeNull();
	});
});

describe('improvGuideFor: careful notes derive from the half-step-above rule', () => {
	it('flags F over Cmaj7 in ionian: the classic avoid note, clashing with the 3rd (E)', () => {
		const ionian = scaleById(guideFor('Cmaj7'), 'ionian');
		expect(carefulLetters(ionian)).toEqual(['F']);
		const f = ionian.notes.find((note) => note.letter === 'F')!;
		expect(f.clashesWith).toBe('E');
		expect(f.label).toBe('11');
	});

	it('flags C over G7 in mixolydian, clashing with the 3rd (B)', () => {
		const mixolydian = scaleById(guideFor('G7'), 'mixolydian');
		expect(carefulLetters(mixolydian)).toEqual(['C']);
		expect(mixolydian.notes.find((note) => note.letter === 'C')!.clashesWith).toBe('B');
	});

	it('finds NO careful note in dorian or the minor pentatonic over Am7: that is why jazz prefers them', () => {
		const guide = guideFor('Am7');
		expect(carefulLetters(scaleById(guide, 'dorian'))).toEqual([]);
		expect(carefulLetters(scaleById(guide, 'minor-pentatonic'))).toEqual([]);
	});

	it('flags the aeolian ♭6 (F over Am7), clashing with the 5th (E)', () => {
		const aeolian = scaleById(guideFor('Am7'), 'aeolian');
		expect(carefulLetters(aeolian)).toEqual(['F']);
		const f = aeolian.notes.find((note) => note.letter === 'F')!;
		expect(f.clashesWith).toBe('E');
		expect(f.label).toBe('♭13');
	});

	it('flags the locrian ♭9 (C over Bm7♭5), clashing with the root (B)', () => {
		const locrian = scaleById(guideFor('Bm7♭5'), 'locrian');
		expect(carefulLetters(locrian)).toEqual(['C']);
		const c = locrian.notes.find((note) => note.letter === 'C')!;
		expect(c.clashesWith).toBe('B');
		expect(c.label).toBe('♭9');
	});

	it('removes the careful note in lydian: the raised 4 no longer sits on the 3rd', () => {
		const lydian = scaleById(guideFor('Cmaj7'), 'lydian');
		expect(carefulLetters(lydian)).toEqual([]);
		expect(lydian.notes.find((note) => note.letter === 'F♯')!.label).toBe('♯11');
	});

	it('flags the natural 9 over a ♭9 dominant: mixolydian survives the filter and tells the truth', () => {
		const guide = guideFor('C7♭9');
		const mixolydian = scaleById(guide, 'mixolydian');
		const d = mixolydian.notes.find((note) => note.letter === 'D')!;
		expect(d.kind).toBe('careful');
		expect(d.clashesWith).toBe('D♭');
	});
});

describe('improvGuideFor: a careful note names WHICH chord tone it rubs', () => {
	it('identifies the victim of F over Cmaj7 as the major 3rd, by letter, shorthand and degree', () => {
		const f = scaleById(guideFor('Cmaj7'), 'ionian').notes.find((note) => note.letter === 'F')!;
		expect(f.clashesWith).toBe('E');
		expect(f.clashesWithLabel).toBe('M3');
		expect(f.clashesWithRole).toBe('third');
	});

	it('identifies the aeolian ♭6 victim as the 5th, not the 3rd (F over Am7)', () => {
		const f = scaleById(guideFor('Am7'), 'aeolian').notes.find((note) => note.letter === 'F')!;
		expect(f.clashesWithLabel).toBe('P5');
		expect(f.clashesWithRole).toBe('fifth');
	});

	it('identifies the locrian ♭9 victim as the root (C over Bm7♭5)', () => {
		const c = scaleById(guideFor('Bm7♭5'), 'locrian').notes.find((note) => note.letter === 'C')!;
		expect(c.clashesWithLabel).toBe('R');
		expect(c.clashesWithRole).toBe('root');
	});

	it('falls back to the plain interval for a victim with no dedicated line (the ♭9 of C7♭9)', () => {
		const d = scaleById(guideFor('C7♭9'), 'mixolydian').notes.find(
			(note) => note.letter === 'D'
		)!;
		expect(d.clashesWith).toBe('D♭');
		expect(d.clashesWithLabel).toBe('m2');
		expect(d.clashesWithRole).toBe('second');
	});

	it('marks the 4-against-a-major-3rd as fine elsewhere, and nothing else', () => {
		const overMaj7 = scaleById(guideFor('Cmaj7'), 'ionian').notes.find(
			(note) => note.letter === 'F'
		)!;
		const overDominant = scaleById(guideFor('C7'), 'mixolydian').notes.find(
			(note) => note.letter === 'F'
		)!;
		expect(overMaj7.fineOn).toBe('dominant-blues');
		expect(overDominant.fineOn).toBe('dominant-blues');

		// A ♭13 rubbing the 5th, and a ♭9 rubbing the root, have no such context.
		expect(
			scaleById(guideFor('Am7'), 'aeolian').notes.find((note) => note.letter === 'F')!.fineOn
		).toBeUndefined();
		expect(
			scaleById(guideFor('Bm7♭5'), 'locrian').notes.find((note) => note.letter === 'C')!.fineOn
		).toBeUndefined();
	});

	it('leaves the clash fields off every note that is not careful', () => {
		for (const note of scaleById(guideFor('Am7'), 'dorian').notes) {
			expect(note.clashesWith).toBeUndefined();
			expect(note.clashesWithLabel).toBeUndefined();
			expect(note.clashesWithRole).toBeUndefined();
			expect(note.fineOn).toBeUndefined();
		}
	});
});

describe('improvGuideFor: note tagging', () => {
	it('tags chord tones with the app interval shorthand and colors with tension names (Am7 dorian)', () => {
		const dorian = scaleById(guideFor('Am7'), 'dorian');
		expect(
			dorian.notes.map((note) => [note.letter, note.kind, note.label])
		).toEqual([
			['A', 'chord-tone', 'R'],
			['B', 'color', '9'],
			['C', 'chord-tone', 'm3'],
			['D', 'color', '11'],
			['E', 'chord-tone', 'P5'],
			['F♯', 'color', '13'],
			['G', 'chord-tone', 'm7']
		]);
	});

	it('tags every extension of C13 as a chord tone, by chroma, enharmonics included', () => {
		const mixolydian = scaleById(guideFor('C13'), 'mixolydian');
		const chordTones = mixolydian.notes.filter((note) => note.kind === 'chord-tone');
		expect(chordTones.map((note) => note.letter)).toEqual(['C', 'D', 'E', 'G', 'A', 'B♭']);
	});

	it('labels the missing degree of a triad as its plain degree, not a tension (B over C major)', () => {
		const ionian = scaleById(guideFor('C'), 'ionian');
		const b = ionian.notes.find((note) => note.letter === 'B')!;
		expect(b.kind).toBe('color');
		expect(b.label).toBe('7');
	});

	it('assigns scale-degree roles from the tonic, including the pentatonic subset', () => {
		const pentatonic = scaleById(guideFor('Am7'), 'minor-pentatonic');
		expect(pentatonic.notes.map((note) => note.role)).toEqual([
			'root',
			'third',
			'fourth',
			'fifth',
			'seventh'
		]);
	});

	it('carries solfège for every note', () => {
		const ionian = scaleById(guideFor('Cmaj7'), 'ionian');
		expect(ionian.notes.map((note) => note.solfege)).toEqual([
			'Do',
			'Ré',
			'Mi',
			'Fa',
			'Sol',
			'La',
			'Si'
		]);
	});
});

describe('improvGuideFor: scale-contains-chord filter', () => {
	it('drops aeolian over Cm6: its ♭6 contradicts the chord own 6th', () => {
		const guide = guideFor('Cm6');
		expect(guide.scales.map((scale) => scale.id)).toEqual(['dorian', 'minor-pentatonic']);
	});

	it('keeps only lydian over maj7♯11', () => {
		const guide = guideFor('Cmaj7♯11');
		expect(guide.scales.map((scale) => scale.id)).toEqual(['lydian']);
	});

	it('keeps the pentatonic even when it omits a chord extension (Am9)', () => {
		const guide = guideFor('Am9');
		expect(guide.scales.map((scale) => scale.id)).toContain('minor-pentatonic');
	});
});

describe('improvGuideFor: the blue note', () => {
	it('answers the B♭-over-C-major observation: the ♭7 of a major-family chord', () => {
		expect(guideFor('C').blueNote).toBe('B♭');
		expect(guideFor('Cmaj7').blueNote).toBe('B♭');
	});

	it('spells it enharmonically from the root (F♯ -> E, E♭ -> D♭)', () => {
		expect(guideFor('F♯maj7').blueNote).toBe('E');
		expect(guideFor('E♭maj7').blueNote).toBe('D♭');
	});

	it('offers no blue note where the ♭7 is already the chord sound (dominant) or off-family', () => {
		expect(guideFor('C7').blueNote).toBeUndefined();
		expect(guideFor('Am7').blueNote).toBeUndefined();
	});

	it('reports the chord tone a half step from the ♭7, whichever degree it is', () => {
		// Over Cmaj7 the B♭ contradicts the B the left hand is holding, and over
		// C6 it contradicts the A just as hard; over a plain C triad there is
		// nothing for it to contradict.
		expect(guideFor('Cmaj7').blueNoteRubsWith).toBe('B');
		expect(guideFor('C6').blueNoteRubsWith).toBe('A');
		expect(guideFor('C6/9').blueNoteRubsWith).toBe('A');
		expect(guideFor('C').blueNoteRubsWith).toBeUndefined();
	});
});
