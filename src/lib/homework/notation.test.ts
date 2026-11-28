import { describe, expect, it } from 'vitest';
import {
	ledgerPositions,
	noteName,
	parseNote,
	parseStaffLine,
	staffPosition,
	stemUp
} from './notation';

describe('parseNote', () => {
	it('reads letter, accidental, octave and duration', () => {
		expect(parseNote('G4h')).toMatchObject({
			letter: 'G',
			accidental: '',
			octave: 4,
			duration: 'h',
			midi: 67
		});
		expect(parseNote('C#5q')).toMatchObject({ letter: 'C', accidental: '#', midi: 73 });
		expect(parseNote('Bb3w')).toMatchObject({ letter: 'B', accidental: 'b', midi: 58 });
	});

	it('anchors middle C at MIDI 60 and A4 at 69', () => {
		expect(parseNote('C4q').midi).toBe(60);
		expect(parseNote('A4q').midi).toBe(69);
		expect(parseNote('F2q').midi).toBe(41);
	});

	it.each(['', 'H4q', 'C4', 'C4x', 'c4q', 'C44q', 'C##4q', '4Cq'])('rejects %j', (bad) => {
		expect(() => parseNote(bad)).toThrow();
	});

	it('does not move the diatonic step for accidentals', () => {
		expect(parseNote('F#4q').step).toBe(parseNote('F4q').step);
	});
});

describe('parseStaffLine', () => {
	it('splits on any whitespace and ignores edges', () => {
		const notes = parseStaffLine('  G4h   A4q\tC5h ');
		expect(notes.map((n) => n.token)).toEqual(['G4h', 'A4q', 'C5h']);
	});

	it('returns nothing for an empty line', () => {
		expect(parseStaffLine('   ')).toEqual([]);
	});
});

describe('staffPosition', () => {
	it('puts E4 on the treble bottom line and F5 on the top line', () => {
		expect(staffPosition(parseNote('E4q'), 'treble')).toBe(0);
		expect(staffPosition(parseNote('G4q'), 'treble')).toBe(2);
		expect(staffPosition(parseNote('B4q'), 'treble')).toBe(4);
		expect(staffPosition(parseNote('F5q'), 'treble')).toBe(8);
	});

	it('puts middle C one ledger line below the treble staff', () => {
		expect(staffPosition(parseNote('C4q'), 'treble')).toBe(-2);
	});

	it('puts G2 on the bass bottom line, F3 on the F-clef line and C4 one ledger above', () => {
		expect(staffPosition(parseNote('G2q'), 'bass')).toBe(0);
		expect(staffPosition(parseNote('F3q'), 'bass')).toBe(6);
		expect(staffPosition(parseNote('A3q'), 'bass')).toBe(8);
		expect(staffPosition(parseNote('C4q'), 'bass')).toBe(10);
	});

	it('puts C3 in the space under the D line and F2 below the staff in bass', () => {
		expect(staffPosition(parseNote('C3q'), 'bass')).toBe(3);
		expect(staffPosition(parseNote('F2q'), 'bass')).toBe(-1);
	});
});

describe('ledgerPositions', () => {
	it('is empty on the staff', () => {
		for (let p = 0; p <= 8; p++) expect(ledgerPositions(p)).toEqual([]);
	});
	it('draws one ledger for middle C and also for the space just below it', () => {
		expect(ledgerPositions(-2)).toEqual([-2]);
		expect(ledgerPositions(-1)).toEqual([]);
	});
	it('stacks ledgers outward, nearest the staff first', () => {
		expect(ledgerPositions(-4)).toEqual([-2, -4]);
		expect(ledgerPositions(-3)).toEqual([-2]);
		expect(ledgerPositions(10)).toEqual([10]);
		expect(ledgerPositions(12)).toEqual([10, 12]);
		expect(ledgerPositions(9)).toEqual([]);
	});
});

describe('stemUp', () => {
	it('points up below the middle line and down from it', () => {
		expect(stemUp(3)).toBe(true);
		expect(stemUp(4)).toBe(false);
		expect(stemUp(-2)).toBe(true);
		expect(stemUp(11)).toBe(false);
	});
});

describe('noteName', () => {
	it('prints letter, accidental and octave', () => {
		expect(noteName(parseNote('Bb3q'))).toBe('Bb3');
		expect(noteName(parseNote('D5h'))).toBe('D5');
	});
});
