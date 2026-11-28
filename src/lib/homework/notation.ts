/**
 * Note-reading notation maths for the homework section: a tiny token format
 * ("G4h" = G in octave 4, half note) and the staff geometry derived from it.
 *
 * The token format is the data contract for transcribed exercises
 * (`data/readingData.ts`), kept deliberately plain so that an automatic PDF
 * reader can emit it later. Pitch maths is deliberately NOT routed through
 * tonal: the exercises hold naturals and the one thing that matters here is
 * the diatonic staff position, which is simple integer arithmetic.
 */

export type Clef = 'treble' | 'bass';
export type NoteDuration = 'w' | 'h' | 'q';
export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export type Accidental = '' | '#' | 'b';

export const LETTERS: readonly Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const SEMITONES: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export interface StaffNote {
	/** The token this note was parsed from, e.g. "G4h". */
	token: string;
	letter: Letter;
	accidental: Accidental;
	octave: number;
	duration: NoteDuration;
	/** MIDI note number (C4 = 60). */
	midi: number;
	/** Diatonic step index: octave * 7 + letter index (C0 = 0). Accidentals do not move it. */
	step: number;
}

const TOKEN = /^([A-G])([#b]?)(\d)([whq])$/;

/** Parses one note token, throwing on anything malformed so bad data fails loudly in tests. */
export function parseNote(token: string): StaffNote {
	const m = TOKEN.exec(token);
	if (!m) throw new Error(`Bad note token: "${token}"`);
	const letter = m[1] as Letter;
	const accidental = m[2] as Accidental;
	const octave = Number(m[3]);
	const duration = m[4] as NoteDuration;
	const shift = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
	return {
		token,
		letter,
		accidental,
		octave,
		duration,
		midi: 12 * (octave + 1) + SEMITONES[letter] + shift,
		step: octave * 7 + LETTERS.indexOf(letter)
	};
}

/** Parses one engraved line ("G4h A4q ...") into notes. */
export function parseStaffLine(line: string): StaffNote[] {
	return line
		.trim()
		.split(/\s+/)
		.filter((t) => t.length > 0)
		.map(parseNote);
}

/** Diatonic step of each clef's bottom staff line: E4 for treble, G2 for bass. */
const CLEF_BOTTOM_STEP: Record<Clef, number> = { treble: 4 * 7 + 2, bass: 2 * 7 + 4 };

/**
 * Staff position of a note: 0 is the bottom line, 1 the first space, 8 the
 * top line. Negative below the staff and above 8 over it. Every even value is
 * a line, every odd one a space.
 */
export function staffPosition(note: Pick<StaffNote, 'step'>, clef: Clef): number {
	return note.step - CLEF_BOTTOM_STEP[clef];
}

/** Staff positions (even numbers) that need a ledger line to reach this note, nearest the staff first. */
export function ledgerPositions(position: number): number[] {
	const out: number[] = [];
	if (position <= -2) for (let p = -2; p >= position; p -= 2) out.push(p);
	if (position >= 10) for (let p = 10; p <= position; p += 2) out.push(p);
	return out;
}

/** Stems point up for notes below the middle line, down from the middle line up (standard engraving). */
export function stemUp(position: number): boolean {
	return position < 4;
}

/** Display name such as "G4" (ASCII accidentals never occur in the v1 data but are carried through). */
export function noteName(note: Pick<StaffNote, 'letter' | 'accidental' | 'octave'>): string {
	return `${note.letter}${note.accidental}${note.octave}`;
}
