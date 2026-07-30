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

/**
 * n1-tier-unlock extension: the 6 tier 5/6 quality suffixes unlocked
 * alongside this matrix (6, m6, sus4, 7sus4, 7b9, 7#5), same 12 roots, same
 * hand-verified-against-tonal discipline as REFERENCE_CHORD_MATRIX above.
 * Notable ugly spellings, double-checked against standard interval math
 * (never accepted on tonal's say-so alone):
 *
 *   Db7b9  -> ...C♭ E♭♭     (the ♭9 of D♭ is E♭, flattened again to E♭♭)
 *   Ab7b9  -> ...G♭ B♭♭     (the ♭9 of A♭ is B♭, flattened again to B♭♭)
 *   F#7#5  -> F♯ A♯ C♯♯ E   (the ♯5 of F♯ is C♯, sharpened again to C♯♯)
 *   B7#5   -> B D♯ F♯♯ A    (the ♯5 of B is F♯, sharpened again to F♯♯)
 */
const TIER_5_6_REFERENCE_MATRIX: {
	root: string;
	quality: string;
	symbol: string;
	notes: string[];
}[] = [
	{ root: 'C', quality: 'six', symbol: 'C6', notes: ['C', 'E', 'G', 'A'] },
	{ root: 'D♭', quality: 'six', symbol: 'Db6', notes: ['D♭', 'F', 'A♭', 'B♭'] },
	{ root: 'D', quality: 'six', symbol: 'D6', notes: ['D', 'F♯', 'A', 'B'] },
	{ root: 'E♭', quality: 'six', symbol: 'Eb6', notes: ['E♭', 'G', 'B♭', 'C'] },
	{ root: 'E', quality: 'six', symbol: 'E6', notes: ['E', 'G♯', 'B', 'C♯'] },
	{ root: 'F', quality: 'six', symbol: 'F6', notes: ['F', 'A', 'C', 'D'] },
	{ root: 'F♯', quality: 'six', symbol: 'F#6', notes: ['F♯', 'A♯', 'C♯', 'D♯'] },
	{ root: 'G', quality: 'six', symbol: 'G6', notes: ['G', 'B', 'D', 'E'] },
	{ root: 'A♭', quality: 'six', symbol: 'Ab6', notes: ['A♭', 'C', 'E♭', 'F'] },
	{ root: 'A', quality: 'six', symbol: 'A6', notes: ['A', 'C♯', 'E', 'F♯'] },
	{ root: 'B♭', quality: 'six', symbol: 'Bb6', notes: ['B♭', 'D', 'F', 'G'] },
	{ root: 'B', quality: 'six', symbol: 'B6', notes: ['B', 'D♯', 'F♯', 'G♯'] },
	{ root: 'C', quality: 'min6', symbol: 'Cm6', notes: ['C', 'E♭', 'G', 'A'] },
	{ root: 'D♭', quality: 'min6', symbol: 'Dbm6', notes: ['D♭', 'F♭', 'A♭', 'B♭'] },
	{ root: 'D', quality: 'min6', symbol: 'Dm6', notes: ['D', 'F', 'A', 'B'] },
	{ root: 'E♭', quality: 'min6', symbol: 'Ebm6', notes: ['E♭', 'G♭', 'B♭', 'C'] },
	{ root: 'E', quality: 'min6', symbol: 'Em6', notes: ['E', 'G', 'B', 'C♯'] },
	{ root: 'F', quality: 'min6', symbol: 'Fm6', notes: ['F', 'A♭', 'C', 'D'] },
	{ root: 'F♯', quality: 'min6', symbol: 'F#m6', notes: ['F♯', 'A', 'C♯', 'D♯'] },
	{ root: 'G', quality: 'min6', symbol: 'Gm6', notes: ['G', 'B♭', 'D', 'E'] },
	{ root: 'A♭', quality: 'min6', symbol: 'Abm6', notes: ['A♭', 'C♭', 'E♭', 'F'] },
	{ root: 'A', quality: 'min6', symbol: 'Am6', notes: ['A', 'C', 'E', 'F♯'] },
	{ root: 'B♭', quality: 'min6', symbol: 'Bbm6', notes: ['B♭', 'D♭', 'F', 'G'] },
	{ root: 'B', quality: 'min6', symbol: 'Bm6', notes: ['B', 'D', 'F♯', 'G♯'] },
	{ root: 'C', quality: 'sus4', symbol: 'Csus4', notes: ['C', 'F', 'G'] },
	{ root: 'D♭', quality: 'sus4', symbol: 'Dbsus4', notes: ['D♭', 'G♭', 'A♭'] },
	{ root: 'D', quality: 'sus4', symbol: 'Dsus4', notes: ['D', 'G', 'A'] },
	{ root: 'E♭', quality: 'sus4', symbol: 'Ebsus4', notes: ['E♭', 'A♭', 'B♭'] },
	{ root: 'E', quality: 'sus4', symbol: 'Esus4', notes: ['E', 'A', 'B'] },
	{ root: 'F', quality: 'sus4', symbol: 'Fsus4', notes: ['F', 'B♭', 'C'] },
	{ root: 'F♯', quality: 'sus4', symbol: 'F#sus4', notes: ['F♯', 'B', 'C♯'] },
	{ root: 'G', quality: 'sus4', symbol: 'Gsus4', notes: ['G', 'C', 'D'] },
	{ root: 'A♭', quality: 'sus4', symbol: 'Absus4', notes: ['A♭', 'D♭', 'E♭'] },
	{ root: 'A', quality: 'sus4', symbol: 'Asus4', notes: ['A', 'D', 'E'] },
	{ root: 'B♭', quality: 'sus4', symbol: 'Bbsus4', notes: ['B♭', 'E♭', 'F'] },
	{ root: 'B', quality: 'sus4', symbol: 'Bsus4', notes: ['B', 'E', 'F♯'] },
	{ root: 'C', quality: 'dom7sus4', symbol: 'C7sus4', notes: ['C', 'F', 'G', 'B♭'] },
	{ root: 'D♭', quality: 'dom7sus4', symbol: 'Db7sus4', notes: ['D♭', 'G♭', 'A♭', 'C♭'] },
	{ root: 'D', quality: 'dom7sus4', symbol: 'D7sus4', notes: ['D', 'G', 'A', 'C'] },
	{ root: 'E♭', quality: 'dom7sus4', symbol: 'Eb7sus4', notes: ['E♭', 'A♭', 'B♭', 'D♭'] },
	{ root: 'E', quality: 'dom7sus4', symbol: 'E7sus4', notes: ['E', 'A', 'B', 'D'] },
	{ root: 'F', quality: 'dom7sus4', symbol: 'F7sus4', notes: ['F', 'B♭', 'C', 'E♭'] },
	{ root: 'F♯', quality: 'dom7sus4', symbol: 'F#7sus4', notes: ['F♯', 'B', 'C♯', 'E'] },
	{ root: 'G', quality: 'dom7sus4', symbol: 'G7sus4', notes: ['G', 'C', 'D', 'F'] },
	{ root: 'A♭', quality: 'dom7sus4', symbol: 'Ab7sus4', notes: ['A♭', 'D♭', 'E♭', 'G♭'] },
	{ root: 'A', quality: 'dom7sus4', symbol: 'A7sus4', notes: ['A', 'D', 'E', 'G'] },
	{ root: 'B♭', quality: 'dom7sus4', symbol: 'Bb7sus4', notes: ['B♭', 'E♭', 'F', 'A♭'] },
	{ root: 'B', quality: 'dom7sus4', symbol: 'B7sus4', notes: ['B', 'E', 'F♯', 'A'] },
	{ root: 'C', quality: 'dom7b9', symbol: 'C7b9', notes: ['C', 'E', 'G', 'B♭', 'D♭'] },
	{ root: 'D♭', quality: 'dom7b9', symbol: 'Db7b9', notes: ['D♭', 'F', 'A♭', 'C♭', 'E♭♭'] },
	{ root: 'D', quality: 'dom7b9', symbol: 'D7b9', notes: ['D', 'F♯', 'A', 'C', 'E♭'] },
	{ root: 'E♭', quality: 'dom7b9', symbol: 'Eb7b9', notes: ['E♭', 'G', 'B♭', 'D♭', 'F♭'] },
	{ root: 'E', quality: 'dom7b9', symbol: 'E7b9', notes: ['E', 'G♯', 'B', 'D', 'F'] },
	{ root: 'F', quality: 'dom7b9', symbol: 'F7b9', notes: ['F', 'A', 'C', 'E♭', 'G♭'] },
	{ root: 'F♯', quality: 'dom7b9', symbol: 'F#7b9', notes: ['F♯', 'A♯', 'C♯', 'E', 'G'] },
	{ root: 'G', quality: 'dom7b9', symbol: 'G7b9', notes: ['G', 'B', 'D', 'F', 'A♭'] },
	{ root: 'A♭', quality: 'dom7b9', symbol: 'Ab7b9', notes: ['A♭', 'C', 'E♭', 'G♭', 'B♭♭'] },
	{ root: 'A', quality: 'dom7b9', symbol: 'A7b9', notes: ['A', 'C♯', 'E', 'G', 'B♭'] },
	{ root: 'B♭', quality: 'dom7b9', symbol: 'Bb7b9', notes: ['B♭', 'D', 'F', 'A♭', 'C♭'] },
	{ root: 'B', quality: 'dom7b9', symbol: 'B7b9', notes: ['B', 'D♯', 'F♯', 'A', 'C'] },
	{ root: 'C', quality: 'dom7#5', symbol: 'C7#5', notes: ['C', 'E', 'G♯', 'B♭'] },
	{ root: 'D♭', quality: 'dom7#5', symbol: 'Db7#5', notes: ['D♭', 'F', 'A', 'C♭'] },
	{ root: 'D', quality: 'dom7#5', symbol: 'D7#5', notes: ['D', 'F♯', 'A♯', 'C'] },
	{ root: 'E♭', quality: 'dom7#5', symbol: 'Eb7#5', notes: ['E♭', 'G', 'B', 'D♭'] },
	{ root: 'E', quality: 'dom7#5', symbol: 'E7#5', notes: ['E', 'G♯', 'B♯', 'D'] },
	{ root: 'F', quality: 'dom7#5', symbol: 'F7#5', notes: ['F', 'A', 'C♯', 'E♭'] },
	{ root: 'F♯', quality: 'dom7#5', symbol: 'F#7#5', notes: ['F♯', 'A♯', 'C♯♯', 'E'] },
	{ root: 'G', quality: 'dom7#5', symbol: 'G7#5', notes: ['G', 'B', 'D♯', 'F'] },
	{ root: 'A♭', quality: 'dom7#5', symbol: 'Ab7#5', notes: ['A♭', 'C', 'E', 'G♭'] },
	{ root: 'A', quality: 'dom7#5', symbol: 'A7#5', notes: ['A', 'C♯', 'E♯', 'G'] },
	{ root: 'B♭', quality: 'dom7#5', symbol: 'Bb7#5', notes: ['B♭', 'D', 'F♯', 'A♭'] },
	{ root: 'B', quality: 'dom7#5', symbol: 'B7#5', notes: ['B', 'D♯', 'F♯♯', 'A'] }
];

describe('tier 5/6 reference chord matrix (n1-tier-unlock)', () => {
	it('covers all 12 roots x 6 newly-unlocked qualities (72 cells)', () => {
		expect(TIER_5_6_REFERENCE_MATRIX).toHaveLength(72);
	});

	for (const cell of TIER_5_6_REFERENCE_MATRIX) {
		it(`spells ${cell.symbol} (${cell.root} ${cell.quality}) as ${cell.notes.join(' ')}`, () => {
			const result = spellChord(cell.symbol);
			expect(result.notes.map((n) => n.letter)).toEqual(cell.notes);
		});
	}

	it('double-accidental spellings check out against plain interval math, not tonal alone', () => {
		// b9 = a minor 2nd above the root, always: D♭'s own 2nd is E♭, so its
		// b9 is E♭ flattened again.
		expect(spellChord('Db7b9').notes.map((n) => n.letter)).toContain('E♭♭');
		expect(spellChord('Ab7b9').notes.map((n) => n.letter)).toContain('B♭♭');
		// #5 = an augmented 5th above the root, always: F♯'s own 5th is C♯, so
		// its #5 is C♯ sharpened again.
		expect(spellChord('F#7#5').notes.map((n) => n.letter)).toContain('C♯♯');
		expect(spellChord('B7#5').notes.map((n) => n.letter)).toContain('F♯♯');
	});
});
