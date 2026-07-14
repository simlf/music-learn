import { describe, expect, it } from 'vitest';
import {
	DRILL_INTERVALS,
	intervalBetween,
	intervalFromRoot,
	intervalFromShort,
	toAsciiAccidentals,
	transposeFrom
} from './interval';

describe('toAsciiAccidentals', () => {
	it('converts sharp and flat glyphs to ASCII', () => {
		expect(toAsciiAccidentals('F♯')).toBe('F#');
		expect(toAsciiAccidentals('B♭')).toBe('Bb');
	});

	it('converts doubled accidentals', () => {
		expect(toAsciiAccidentals('B♭♭')).toBe('Bbb');
		expect(toAsciiAccidentals('F♯♯')).toBe('F##');
	});

	it('leaves plain letters and ASCII accidentals untouched', () => {
		expect(toAsciiAccidentals('C')).toBe('C');
		expect(toAsciiAccidentals('Eb')).toBe('Eb');
		expect(toAsciiAccidentals('F#')).toBe('F#');
	});
});

describe('intervalBetween naming', () => {
	it('names the minor third with quality-first shorthand and gender-correct French', () => {
		const info = intervalBetween('C', 'E♭');
		expect(info.short).toBe('m3');
		expect(info.long).toBe('minor 3rd');
		expect(info.longFr).toBe('tierce mineure');
		expect(info.degree).toBe(3);
		expect(info.quality).toBe('m');
		expect(info.semitones).toBe(3);
		expect(info.role).toBe('third');
		expect(info.tonalName).toBe('3m');
	});

	it('names the perfect fifth as quinte juste', () => {
		const info = intervalBetween('C', 'G');
		expect(info.short).toBe('P5');
		expect(info.long).toBe('perfect 5th');
		expect(info.longFr).toBe('quinte juste');
		expect(info.role).toBe('fifth');
	});

	it('names the augmented fourth as quarte augmentée (feminine agreement)', () => {
		const info = intervalBetween('C', 'F♯');
		expect(info.short).toBe('A4');
		expect(info.longFr).toBe('quarte augmentée');
		expect(info.semitones).toBe(6);
		expect(info.role).toBe('fourth');
	});

	it('names the diminished fifth as quinte diminuée (feminine agreement)', () => {
		const info = intervalBetween('C', 'G♭');
		expect(info.short).toBe('d5');
		expect(info.longFr).toBe('quinte diminuée');
		expect(info.semitones).toBe(6);
		expect(info.role).toBe('fifth');
	});

	it('names the perfect fourth as quarte juste', () => {
		expect(intervalBetween('C', 'F').longFr).toBe('quarte juste');
	});

	it('names the major sixth as sixte majeure', () => {
		const info = intervalBetween('C', 'A');
		expect(info.short).toBe('M6');
		expect(info.longFr).toBe('sixte majeure');
		expect(info.role).toBe('sixth');
	});

	it('names the major second as seconde majeure with role second', () => {
		const info = intervalBetween('C', 'D');
		expect(info.short).toBe('M2');
		expect(info.longFr).toBe('seconde majeure');
		expect(info.role).toBe('second');
	});

	it('names the diminished seventh (double-flat spelling) as septième diminuée', () => {
		const info = intervalBetween('C', 'B♭♭');
		expect(info.short).toBe('d7');
		expect(info.longFr).toBe('septième diminuée');
		expect(info.semitones).toBe(9);
		expect(info.role).toBe('seventh');
	});

	it('labels the unison as R (root), matching the formula readout convention', () => {
		const info = intervalBetween('C', 'C');
		expect(info.short).toBe('R');
		expect(info.long).toBe('root');
		expect(info.longFr).toBe('fondamentale');
		expect(info.semitones).toBe(0);
		expect(info.role).toBe('root');
	});

	it('accepts ASCII accidental inputs too', () => {
		expect(intervalBetween('Eb', 'Gb').short).toBe('m3');
		expect(intervalBetween('F#', 'C#').short).toBe('P5');
	});

	it('is total: unparseable input returns a recognizable empty IntervalInfo, never throws', () => {
		const info = intervalBetween('Zx', 'Q');
		expect(info.short).toBe('');
		expect(info.degree).toBe(0);
		expect(info.semitones).toBe(-1);
		expect(info.role).toBe('root');
	});
});

describe('intervalFromRoot enharmonic picking', () => {
	it('reads the F♯/G♭ key over a C root as A4, not d5 (prefers sharp on a pure-quality tie)', () => {
		const info = intervalFromRoot('C', { sharpLetter: 'F♯', flatLetter: 'G♭' });
		expect(info.short).toBe('A4');
	});

	it('reads the F♯/G♭ key over an E♭ root as m3, not A2 (prefers plain qualities over A/d)', () => {
		const info = intervalFromRoot('E♭', { sharpLetter: 'F♯', flatLetter: 'G♭' });
		expect(info.short).toBe('m3');
		expect(info.longFr).toBe('tierce mineure');
	});

	it('reads the A♯/B♭ key over a G root as m3, not A2', () => {
		expect(intervalFromRoot('G', { sharpLetter: 'A♯', flatLetter: 'B♭' }).short).toBe('m3');
	});

	it('reads the F♯/G♭ key over a B root as P5, not d6', () => {
		expect(intervalFromRoot('B', { sharpLetter: 'F♯', flatLetter: 'G♭' }).short).toBe('P5');
	});

	it('resolves a plain string key exactly like intervalBetween', () => {
		expect(intervalFromRoot('C', 'E♭').short).toBe('m3');
	});
});

describe('transposeFrom', () => {
	it('spells the target with display glyphs', () => {
		expect(transposeFrom('C', 'm3')).toBe('E♭');
		expect(transposeFrom('F♯', 'P5')).toBe('C♯');
		expect(transposeFrom('C', 'A4')).toBe('F♯');
	});

	it('accepts an ASCII or glyph root', () => {
		expect(transposeFrom('Db', 'M3')).toBe('F');
		expect(transposeFrom('D♭', 'M3')).toBe('F');
	});

	it('returns the root itself for R', () => {
		expect(transposeFrom('C', 'R')).toBe('C');
		expect(transposeFrom('Bb', 'R')).toBe('B♭');
	});

	it('is total: an unparseable short name returns an empty string', () => {
		expect(transposeFrom('C', 'X9!')).toBe('');
	});
});

describe('intervalFromShort', () => {
	it('builds the full IntervalInfo for a drill pool name', () => {
		const info = intervalFromShort('P8');
		expect(info.semitones).toBe(12);
		expect(info.degree).toBe(8);
		expect(info.long).toBe('perfect octave');
		expect(info.longFr).toBe('octave juste');
		expect(info.role).toBe('root');
	});

	it('round-trips every drill pool entry', () => {
		for (const short of DRILL_INTERVALS) {
			expect(intervalFromShort(short).short).toBe(short);
		}
	});

	it('is total on junk input', () => {
		expect(intervalFromShort('nope').short).toBe('');
	});
});

describe('DRILL_INTERVALS', () => {
	it('is the fixed v1 pool from the R4 contract', () => {
		expect([...DRILL_INTERVALS]).toEqual([
			'm2',
			'M2',
			'm3',
			'M3',
			'P4',
			'A4',
			'P5',
			'm6',
			'M6',
			'm7',
			'M7',
			'P8'
		]);
	});

	it('has no two entries sharing a semitone count (no enharmonic ambiguity in choices)', () => {
		const semis = DRILL_INTERVALS.map((short) => intervalFromShort(short).semitones);
		expect(new Set(semis).size).toBe(semis.length);
	});
});

describe('compound degree mapping (9 to 2, 11 to 4, 13 to 6)', () => {
	it('maps compound short names down to their simple degree class role', () => {
		expect(intervalFromShort('M9').role).toBe('second');
		expect(intervalFromShort('P11').role).toBe('fourth');
		expect(intervalFromShort('M13').role).toBe('sixth');
	});

	it('names the ninth in French as neuvième majeure', () => {
		expect(intervalFromShort('M9').longFr).toBe('neuvième majeure');
	});
});
