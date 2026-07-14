import { describe, expect, it } from 'vitest';
import { MAJOR_SCALE_ROOTS, majorScaleNotes } from './scale';

describe('MAJOR_SCALE_ROOTS', () => {
	it('offers the proven 12-root jazz set in display glyphs', () => {
		expect(MAJOR_SCALE_ROOTS).toEqual([
			'C',
			'D♭',
			'D',
			'E♭',
			'E',
			'F',
			'F♯',
			'G',
			'A♭',
			'A',
			'B♭',
			'B'
		]);
	});
});

describe('majorScaleNotes', () => {
	it('spells C major with one role per degree class', () => {
		const notes = majorScaleNotes('C');
		expect(notes.map((n) => n.letter)).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
		expect(notes.map((n) => n.role)).toEqual([
			'root',
			'second',
			'third',
			'fourth',
			'fifth',
			'sixth',
			'seventh'
		]);
	});

	it('populates French solfège for every degree', () => {
		const notes = majorScaleNotes('C');
		expect(notes.map((n) => n.solfege)).toEqual(['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si']);
	});

	it('spells flat-side scales with display glyphs (D♭ major)', () => {
		const notes = majorScaleNotes('D♭');
		expect(notes.map((n) => n.letter)).toEqual(['D♭', 'E♭', 'F', 'G♭', 'A♭', 'B♭', 'C']);
	});

	it('accepts ASCII roots too (F# major, including its E♯ seventh)', () => {
		const notes = majorScaleNotes('F#');
		expect(notes.map((n) => n.letter)).toEqual(['F♯', 'G♯', 'A♯', 'B', 'C♯', 'D♯', 'E♯']);
	});

	it('is total: an unknown root returns an empty array, never throws', () => {
		expect(majorScaleNotes('Zx')).toEqual([]);
	});
});
