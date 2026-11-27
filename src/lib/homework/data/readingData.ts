import type { Clef } from '../notation';

/**
 * Handpicked, hand-transcribed note-reading exercises from Georges Dandelot,
 * "Manuel pratique pour l'etude des cles de Sol, Fa et Ut" (Editions Max
 * Eschig, 1928). Only the pitches and note values are kept as data; the scan
 * itself is not shipped (the book is still under copyright in most places).
 *
 * `page` is the PRINTED page number, the one the teacher says out loud, not
 * the PDF's page index (PDF index = printed page + 2 for this scan).
 *
 * DATA FORMAT (the contract an automatic extractor can fill later):
 *  - `staves`: one string per printed staff line, notes separated by spaces.
 *  - note token: letter A-G, optional accidental (# or b), octave digit
 *    (scientific pitch, C4 = middle C), then a duration letter (w, h, q).
 *  - `clef`: treble or bass (exercises printed in other clefs are not here).
 */
export interface ReadingExercise {
	book: 'manuel-pratique';
	page: number;
	number: number;
	clef: Clef;
	/** Short English description shown above the staff. */
	hint: string;
	staves: string[];
}

const h = (notes: string) =>
	notes
		.trim()
		.split(/\s+/)
		.map((n) => `${n}h`)
		.join(' ');
const q = (notes: string) =>
	notes
		.trim()
		.split(/\s+/)
		.map((n) => `${n}q`)
		.join(' ');

export const READING_EXERCISES: ReadingExercise[] = [
	{
		book: 'manuel-pratique',
		page: 5,
		number: 1,
		clef: 'treble',
		hint: 'Landmark notes only: C4, G4, C5, G5, in half notes.',
		staves: [
			h('G4 C5 C4 G4 G5 C5 G4 G5 C4 C5 G4 C4 G5 G4'),
			h('C5 C4 G4 G5 C5 G4 C4 G4 C5 G5 C5 C4 G4 G5 C5')
		]
	},
	{
		book: 'manuel-pratique',
		page: 5,
		number: 2,
		clef: 'treble',
		hint: 'The same four landmark notes, in quarter notes.',
		staves: [
			q('C4 G4 C4 C5 C4 G5 G4 G5 C5 C4 C5 G4 G5 C5'),
			q('G5 G4 G5 C4 C5 G5 C4 G4 G5 G4 C5 C4 G5 C4')
		]
	},
	{
		book: 'manuel-pratique',
		page: 6,
		number: 3,
		clef: 'treble',
		hint: 'Landmarks plus their neighbours (half notes are landmarks, quarters their neighbours).',
		staves: [
			'G4h A4q G4h C5h D5q C5h G4h F4q G4h C5h B4q C5h G5h F5q G5h C5h D5q C5h',
			'C4h D4q C4h C5h B4q C5h G4h A4q C5h D5q G5h F5q C5h B4q C4h D4q G4h F4q C5h'
		]
	},
	{
		book: 'manuel-pratique',
		page: 6,
		number: 4,
		clef: 'treble',
		hint: 'Landmarks are no longer marked. Read every note at a steady speed.',
		staves: [
			q('C5 B4 G5 A5 B4 C5 C4 B3 D4 C4 A4 G4 D5 C5 A5 G5 B4'),
			q('C5 F4 G4 B3 C4 G4 A4 F5 G5 D4 C4 B4 C5 A5 G5 B3 C4')
		]
	},
	{
		book: 'manuel-pratique',
		page: 18,
		number: 1,
		clef: 'bass',
		hint: 'Bass clef landmarks: F2, C3, F3, C4, in half notes.',
		staves: [
			h('F3 C4 C3 F3 F2 C3 F3 F2 C4 C3 C4 F2 F3 C3'),
			h('F3 C4 C3 F2 F3 F2 C4 C3 F3 C4 F2 C3 F2 C4 F3')
		]
	},
	{
		book: 'manuel-pratique',
		page: 18,
		number: 2,
		clef: 'bass',
		hint: 'The same four bass landmarks, in quarter notes.',
		staves: [
			q('F3 F2 C3 C4 F3 C4 C3 F3 F2 F3 C3 C4 F3 C3 F2 C3 F3 C4'),
			q('F2 C4 F2 F3 F2 C3 C4 F3 C4 C3 C4 F2 C3 C4 F3 F2 F3')
		]
	}
];
