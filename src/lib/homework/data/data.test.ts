import { describe, expect, it } from 'vitest';
import { parseRhythm } from '../rhythmParse';
import { parseStaffLine, staffPosition } from '../notation';
import { READING_EXERCISES } from './readingData';
import { RHYTHM_EXERCISES } from './rhythmData';

/**
 * The transcribed exercises are data a human typed from a scan, so these tests
 * are the safety net: every exercise must parse, every bar must add up, and
 * the shape of each one must match what the printed book says.
 */

describe('reading data', () => {
	it('has unique (page, number) pairs', () => {
		const keys = READING_EXERCISES.map((e) => `${e.page}:${e.number}`);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it.each(READING_EXERCISES.map((e) => [`p${e.page} #${e.number}`, e] as const))(
		'%s parses, has notes, and stays on a readable staff',
		(_name, e) => {
			expect(e.staves.length).toBeGreaterThan(0);
			for (const line of e.staves) {
				const notes = parseStaffLine(line);
				expect(notes.length).toBeGreaterThan(0);
				for (const n of notes) {
					const pos = staffPosition(n, e.clef);
					// Within three ledger lines either side keeps every glyph inside the SVG.
					expect(pos).toBeGreaterThanOrEqual(-6);
					expect(pos).toBeLessThanOrEqual(12);
				}
			}
		}
	);

	it('page 5 uses only the four treble landmarks: C4 G4 C5 G5', () => {
		for (const e of READING_EXERCISES.filter((x) => x.page === 5)) {
			const names = e.staves.flatMap((l) => parseStaffLine(l)).map((n) => n.token.slice(0, 2));
			expect(new Set(names)).toEqual(new Set(['C4', 'G4', 'C5', 'G5']));
		}
	});

	it('page 18 uses only the four bass landmarks: F2 C3 F3 C4', () => {
		for (const e of READING_EXERCISES.filter((x) => x.page === 18)) {
			expect(e.clef).toBe('bass');
			const names = e.staves.flatMap((l) => parseStaffLine(l)).map((n) => n.token.slice(0, 2));
			expect(new Set(names)).toEqual(new Set(['F2', 'C3', 'F3', 'C4']));
		}
	});

	it('exercise 1 matches the printed note counts and half-note values', () => {
		const e = READING_EXERCISES.find((x) => x.page === 5 && x.number === 1)!;
		expect(e.staves.map((l) => parseStaffLine(l).length)).toEqual([14, 15]);
		expect(e.staves.flatMap((l) => parseStaffLine(l)).every((n) => n.duration === 'h')).toBe(true);
	});

	it('exercise 2 is all quarter notes, 14 per line', () => {
		const e = READING_EXERCISES.find((x) => x.page === 5 && x.number === 2)!;
		expect(e.staves.map((l) => parseStaffLine(l).length)).toEqual([14, 14]);
		expect(e.staves.flatMap((l) => parseStaffLine(l)).every((n) => n.duration === 'q')).toBe(true);
	});

	it('exercise 1 opens G4 C5 C4 and ends C5, as printed', () => {
		const e = READING_EXERCISES.find((x) => x.page === 5 && x.number === 1)!;
		expect(e.staves[0].startsWith('G4h C5h C4h G4h G5h')).toBe(true);
		expect(e.staves[1].endsWith('G5h C5h')).toBe(true);
	});
});

describe('rhythm data', () => {
	it('numbers the exercises 1 to 24 once each, four pages of six', () => {
		expect(RHYTHM_EXERCISES.map((e) => e.number)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
		for (const e of RHYTHM_EXERCISES) expect(e.page).toBe(Math.ceil(e.number / 6));
	});

	it.each(RHYTHM_EXERCISES.map((e) => [`#${e.number}`, e] as const))(
		'%s parses and every bar adds up to its time signature',
		(_name, e) => {
			const parsed = parseRhythm(e.timeSignature, e.measures);
			expect(parsed.measures.length).toBe(e.measures.length);
			expect(parsed.onsets.length).toBeGreaterThan(0);
		}
	);

	it.each([
		[1, 10, 20],
		[2, 7, 28],
		[3, 9, 27],
		[4, 10, 10],
		[5, 7, 14],
		[12, 9, 9],
		[17, 11, 13]
	])('exercise %i has %i bars and %i taps', (number, bars, taps) => {
		const e = RHYTHM_EXERCISES.find((x) => x.number === number)!;
		const parsed = parseRhythm(e.timeSignature, e.measures);
		expect(parsed.measures.length).toBe(bars);
		expect(parsed.onsets.length).toBe(taps);
	});

	it('a tied exercise has fewer taps than notes: tie continuations are not struck', () => {
		const e = RHYTHM_EXERCISES.find((x) => x.number === 19)!;
		const parsed = parseRhythm(e.timeSignature, e.measures);
		expect(parsed.notes.length - parsed.onsets.length).toBe(5);
	});

	it('the review exercises really do change time signature', () => {
		for (const n of [21, 22, 23, 24]) {
			const e = RHYTHM_EXERCISES.find((x) => x.number === n)!;
			const parsed = parseRhythm(e.timeSignature, e.measures);
			expect(new Set(parsed.measures.map((m) => m.timeSignature)).size).toBeGreaterThan(1);
		}
	});
});
