import { describe, expect, it } from 'vitest';
import { spellChord } from './chord';

/**
 * THEORY-01 / THEORY-03 reference chord chart.
 *
 * Full matrix: 12 roots x 8 v1 qualities (major/minor/dim triads, maj7, m7,
 * dom7, m7b5/ø7, dim7/°7). Every cell is the enharmonically-correct spelling,
 * one letter per scale degree (verified against tonal's Chord.get output,
 * cross-checked against standard jazz theory - e.g. diminished-seventh chords
 * legitimately require double-flats/double-sharps to keep one letter per
 * degree, such as Cdim7 -> C Eb Gb Bbb).
 *
 * Root spelling choice: standard jazz enharmonic set that avoids
 * double-accidental roots (C Db D Eb E F F# G Ab A Bb B) - this is the
 * conventional "circle of fifths, flats-side-heavy" jazz root set.
 */
const REFERENCE_CHORD_MATRIX: { root: string; quality: string; symbol: string; notes: string[] }[] = [
	{ root: 'C', quality: 'maj', symbol: 'C', notes: ['C', 'E', 'G'] },
	{ root: 'C', quality: 'min', symbol: 'Cm', notes: ['C', 'E♭', 'G'] },
	{ root: 'C', quality: 'dim', symbol: 'Cdim', notes: ['C', 'E♭', 'G♭'] },
	{ root: 'C', quality: 'maj7', symbol: 'Cmaj7', notes: ['C', 'E', 'G', 'B'] },
	{ root: 'C', quality: 'm7', symbol: 'Cm7', notes: ['C', 'E♭', 'G', 'B♭'] },
	{ root: 'C', quality: 'dom7', symbol: 'C7', notes: ['C', 'E', 'G', 'B♭'] },
	{ root: 'C', quality: 'm7b5', symbol: 'Cm7b5', notes: ['C', 'E♭', 'G♭', 'B♭'] },
	{ root: 'C', quality: 'dim7', symbol: 'Cdim7', notes: ['C', 'E♭', 'G♭', 'B♭♭'] },
	{ root: 'D♭', quality: 'maj', symbol: 'Db', notes: ['D♭', 'F', 'A♭'] },
	{ root: 'D♭', quality: 'min', symbol: 'Dbm', notes: ['D♭', 'F♭', 'A♭'] },
	{ root: 'D♭', quality: 'dim', symbol: 'Dbdim', notes: ['D♭', 'F♭', 'A♭♭'] },
	{ root: 'D♭', quality: 'maj7', symbol: 'Dbmaj7', notes: ['D♭', 'F', 'A♭', 'C'] },
	{ root: 'D♭', quality: 'm7', symbol: 'Dbm7', notes: ['D♭', 'F♭', 'A♭', 'C♭'] },
	{ root: 'D♭', quality: 'dom7', symbol: 'Db7', notes: ['D♭', 'F', 'A♭', 'C♭'] },
	{ root: 'D♭', quality: 'm7b5', symbol: 'Dbm7b5', notes: ['D♭', 'F♭', 'A♭♭', 'C♭'] },
	{ root: 'D♭', quality: 'dim7', symbol: 'Dbdim7', notes: ['D♭', 'F♭', 'A♭♭', 'C♭♭'] },
	{ root: 'D', quality: 'maj', symbol: 'D', notes: ['D', 'F♯', 'A'] },
	{ root: 'D', quality: 'min', symbol: 'Dm', notes: ['D', 'F', 'A'] },
	{ root: 'D', quality: 'dim', symbol: 'Ddim', notes: ['D', 'F', 'A♭'] },
	{ root: 'D', quality: 'maj7', symbol: 'Dmaj7', notes: ['D', 'F♯', 'A', 'C♯'] },
	{ root: 'D', quality: 'm7', symbol: 'Dm7', notes: ['D', 'F', 'A', 'C'] },
	{ root: 'D', quality: 'dom7', symbol: 'D7', notes: ['D', 'F♯', 'A', 'C'] },
	{ root: 'D', quality: 'm7b5', symbol: 'Dm7b5', notes: ['D', 'F', 'A♭', 'C'] },
	{ root: 'D', quality: 'dim7', symbol: 'Ddim7', notes: ['D', 'F', 'A♭', 'C♭'] },
	{ root: 'E♭', quality: 'maj', symbol: 'Eb', notes: ['E♭', 'G', 'B♭'] },
	{ root: 'E♭', quality: 'min', symbol: 'Ebm', notes: ['E♭', 'G♭', 'B♭'] },
	{ root: 'E♭', quality: 'dim', symbol: 'Ebdim', notes: ['E♭', 'G♭', 'B♭♭'] },
	{ root: 'E♭', quality: 'maj7', symbol: 'Ebmaj7', notes: ['E♭', 'G', 'B♭', 'D'] },
	{ root: 'E♭', quality: 'm7', symbol: 'Ebm7', notes: ['E♭', 'G♭', 'B♭', 'D♭'] },
	{ root: 'E♭', quality: 'dom7', symbol: 'Eb7', notes: ['E♭', 'G', 'B♭', 'D♭'] },
	{ root: 'E♭', quality: 'm7b5', symbol: 'Ebm7b5', notes: ['E♭', 'G♭', 'B♭♭', 'D♭'] },
	{ root: 'E♭', quality: 'dim7', symbol: 'Ebdim7', notes: ['E♭', 'G♭', 'B♭♭', 'D♭♭'] },
	{ root: 'E', quality: 'maj', symbol: 'E', notes: ['E', 'G♯', 'B'] },
	{ root: 'E', quality: 'min', symbol: 'Em', notes: ['E', 'G', 'B'] },
	{ root: 'E', quality: 'dim', symbol: 'Edim', notes: ['E', 'G', 'B♭'] },
	{ root: 'E', quality: 'maj7', symbol: 'Emaj7', notes: ['E', 'G♯', 'B', 'D♯'] },
	{ root: 'E', quality: 'm7', symbol: 'Em7', notes: ['E', 'G', 'B', 'D'] },
	{ root: 'E', quality: 'dom7', symbol: 'E7', notes: ['E', 'G♯', 'B', 'D'] },
	{ root: 'E', quality: 'm7b5', symbol: 'Em7b5', notes: ['E', 'G', 'B♭', 'D'] },
	{ root: 'E', quality: 'dim7', symbol: 'Edim7', notes: ['E', 'G', 'B♭', 'D♭'] },
	{ root: 'F', quality: 'maj', symbol: 'F', notes: ['F', 'A', 'C'] },
	{ root: 'F', quality: 'min', symbol: 'Fm', notes: ['F', 'A♭', 'C'] },
	{ root: 'F', quality: 'dim', symbol: 'Fdim', notes: ['F', 'A♭', 'C♭'] },
	{ root: 'F', quality: 'maj7', symbol: 'Fmaj7', notes: ['F', 'A', 'C', 'E'] },
	{ root: 'F', quality: 'm7', symbol: 'Fm7', notes: ['F', 'A♭', 'C', 'E♭'] },
	{ root: 'F', quality: 'dom7', symbol: 'F7', notes: ['F', 'A', 'C', 'E♭'] },
	{ root: 'F', quality: 'm7b5', symbol: 'Fm7b5', notes: ['F', 'A♭', 'C♭', 'E♭'] },
	{ root: 'F', quality: 'dim7', symbol: 'Fdim7', notes: ['F', 'A♭', 'C♭', 'E♭♭'] },
	{ root: 'F♯', quality: 'maj', symbol: 'F#', notes: ['F♯', 'A♯', 'C♯'] },
	{ root: 'F♯', quality: 'min', symbol: 'F#m', notes: ['F♯', 'A', 'C♯'] },
	{ root: 'F♯', quality: 'dim', symbol: 'F#dim', notes: ['F♯', 'A', 'C'] },
	{ root: 'F♯', quality: 'maj7', symbol: 'F#maj7', notes: ['F♯', 'A♯', 'C♯', 'E♯'] },
	{ root: 'F♯', quality: 'm7', symbol: 'F#m7', notes: ['F♯', 'A', 'C♯', 'E'] },
	{ root: 'F♯', quality: 'dom7', symbol: 'F#7', notes: ['F♯', 'A♯', 'C♯', 'E'] },
	{ root: 'F♯', quality: 'm7b5', symbol: 'F#m7b5', notes: ['F♯', 'A', 'C', 'E'] },
	{ root: 'F♯', quality: 'dim7', symbol: 'F#dim7', notes: ['F♯', 'A', 'C', 'E♭'] },
	{ root: 'G', quality: 'maj', symbol: 'G', notes: ['G', 'B', 'D'] },
	{ root: 'G', quality: 'min', symbol: 'Gm', notes: ['G', 'B♭', 'D'] },
	{ root: 'G', quality: 'dim', symbol: 'Gdim', notes: ['G', 'B♭', 'D♭'] },
	{ root: 'G', quality: 'maj7', symbol: 'Gmaj7', notes: ['G', 'B', 'D', 'F♯'] },
	{ root: 'G', quality: 'm7', symbol: 'Gm7', notes: ['G', 'B♭', 'D', 'F'] },
	{ root: 'G', quality: 'dom7', symbol: 'G7', notes: ['G', 'B', 'D', 'F'] },
	{ root: 'G', quality: 'm7b5', symbol: 'Gm7b5', notes: ['G', 'B♭', 'D♭', 'F'] },
	{ root: 'G', quality: 'dim7', symbol: 'Gdim7', notes: ['G', 'B♭', 'D♭', 'F♭'] },
	{ root: 'A♭', quality: 'maj', symbol: 'Ab', notes: ['A♭', 'C', 'E♭'] },
	{ root: 'A♭', quality: 'min', symbol: 'Abm', notes: ['A♭', 'C♭', 'E♭'] },
	{ root: 'A♭', quality: 'dim', symbol: 'Abdim', notes: ['A♭', 'C♭', 'E♭♭'] },
	{ root: 'A♭', quality: 'maj7', symbol: 'Abmaj7', notes: ['A♭', 'C', 'E♭', 'G'] },
	{ root: 'A♭', quality: 'm7', symbol: 'Abm7', notes: ['A♭', 'C♭', 'E♭', 'G♭'] },
	{ root: 'A♭', quality: 'dom7', symbol: 'Ab7', notes: ['A♭', 'C', 'E♭', 'G♭'] },
	{ root: 'A♭', quality: 'm7b5', symbol: 'Abm7b5', notes: ['A♭', 'C♭', 'E♭♭', 'G♭'] },
	{ root: 'A♭', quality: 'dim7', symbol: 'Abdim7', notes: ['A♭', 'C♭', 'E♭♭', 'G♭♭'] },
	{ root: 'A', quality: 'maj', symbol: 'A', notes: ['A', 'C♯', 'E'] },
	{ root: 'A', quality: 'min', symbol: 'Am', notes: ['A', 'C', 'E'] },
	{ root: 'A', quality: 'dim', symbol: 'Adim', notes: ['A', 'C', 'E♭'] },
	{ root: 'A', quality: 'maj7', symbol: 'Amaj7', notes: ['A', 'C♯', 'E', 'G♯'] },
	{ root: 'A', quality: 'm7', symbol: 'Am7', notes: ['A', 'C', 'E', 'G'] },
	{ root: 'A', quality: 'dom7', symbol: 'A7', notes: ['A', 'C♯', 'E', 'G'] },
	{ root: 'A', quality: 'm7b5', symbol: 'Am7b5', notes: ['A', 'C', 'E♭', 'G'] },
	{ root: 'A', quality: 'dim7', symbol: 'Adim7', notes: ['A', 'C', 'E♭', 'G♭'] },
	{ root: 'B♭', quality: 'maj', symbol: 'Bb', notes: ['B♭', 'D', 'F'] },
	{ root: 'B♭', quality: 'min', symbol: 'Bbm', notes: ['B♭', 'D♭', 'F'] },
	{ root: 'B♭', quality: 'dim', symbol: 'Bbdim', notes: ['B♭', 'D♭', 'F♭'] },
	{ root: 'B♭', quality: 'maj7', symbol: 'Bbmaj7', notes: ['B♭', 'D', 'F', 'A'] },
	{ root: 'B♭', quality: 'm7', symbol: 'Bbm7', notes: ['B♭', 'D♭', 'F', 'A♭'] },
	{ root: 'B♭', quality: 'dom7', symbol: 'Bb7', notes: ['B♭', 'D', 'F', 'A♭'] },
	{ root: 'B♭', quality: 'm7b5', symbol: 'Bbm7b5', notes: ['B♭', 'D♭', 'F♭', 'A♭'] },
	{ root: 'B♭', quality: 'dim7', symbol: 'Bbdim7', notes: ['B♭', 'D♭', 'F♭', 'A♭♭'] },
	{ root: 'B', quality: 'maj', symbol: 'B', notes: ['B', 'D♯', 'F♯'] },
	{ root: 'B', quality: 'min', symbol: 'Bm', notes: ['B', 'D', 'F♯'] },
	{ root: 'B', quality: 'dim', symbol: 'Bdim', notes: ['B', 'D', 'F'] },
	{ root: 'B', quality: 'maj7', symbol: 'Bmaj7', notes: ['B', 'D♯', 'F♯', 'A♯'] },
	{ root: 'B', quality: 'm7', symbol: 'Bm7', notes: ['B', 'D', 'F♯', 'A'] },
	{ root: 'B', quality: 'dom7', symbol: 'B7', notes: ['B', 'D♯', 'F♯', 'A'] },
	{ root: 'B', quality: 'm7b5', symbol: 'Bm7b5', notes: ['B', 'D', 'F', 'A'] },
	{ root: 'B', quality: 'dim7', symbol: 'Bdim7', notes: ['B', 'D', 'F', 'A♭'] }
];

describe('reference chord matrix (THEORY-01, THEORY-03)', () => {
	it('covers all 12 roots x 8 qualities (96 cells)', () => {
		expect(REFERENCE_CHORD_MATRIX).toHaveLength(96);
	});

	for (const cell of REFERENCE_CHORD_MATRIX) {
		it(`spells ${cell.symbol} (${cell.root} ${cell.quality}) as ${cell.notes.join(' ')}`, () => {
			const result = spellChord(cell.symbol);
			expect(result.notes.map((n) => n.letter)).toEqual(cell.notes);
		});
	}

	it('F♯m7 spells with C♯, never D♭ (THEORY-03 enharmonic anchor case)', () => {
		const result = spellChord('F#m7');
		const letters = result.notes.map((n) => n.letter);
		expect(letters).toContain('C♯');
		expect(letters).not.toContain('D♭');
	});
});
