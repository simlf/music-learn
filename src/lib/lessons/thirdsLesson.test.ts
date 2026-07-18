import { describe, expect, it } from 'vitest';
import {
	THIRDS_LESSON,
	THIRDS_LESSON_DRILL_SEEDS,
	gradeLessonTap,
	semitonesFromC
} from './thirdsLesson';

describe('THIRDS_LESSON content invariants', () => {
	it('has exactly four steps', () => {
		expect(THIRDS_LESSON.length).toBe(4);
	});

	it('has the locked ordered targetChroma sequence', () => {
		expect(THIRDS_LESSON.map((step) => step.targetChroma)).toEqual([0, 4, null, 3]);
	});

	it("step 4's letter is the flat glyph E-flat, not D-sharp", () => {
		expect(THIRDS_LESSON[3].letter).toBe('E♭');
	});

	it('THIRDS_LESSON_DRILL_SEEDS is the locked C/Cm pair', () => {
		expect(THIRDS_LESSON_DRILL_SEEDS).toEqual(['C', 'Cm']);
	});
});

describe('gradeLessonTap (chroma-only, enharmonic-blind, total)', () => {
	it('grades a correct tap true against a major-third step', () => {
		expect(gradeLessonTap(THIRDS_LESSON[1], 'E')).toBe(true);
	});

	it('grades a wrong tap false against a major-third step', () => {
		expect(gradeLessonTap(THIRDS_LESSON[1], 'F')).toBe(false);
	});

	it('grades an enharmonic D-sharp tap true against the minor-third step (E-flat)', () => {
		expect(gradeLessonTap(THIRDS_LESSON[3], 'D♯')).toBe(true);
	});

	it('grades E false against the minor-third step', () => {
		expect(gradeLessonTap(THIRDS_LESSON[3], 'E')).toBe(false);
	});

	it('grades false for a null-targetChroma (hear-then-continue) step', () => {
		expect(gradeLessonTap(THIRDS_LESSON[2], 'C')).toBe(false);
	});

	it('grades false (never throws) on an unparseable letter', () => {
		expect(() => gradeLessonTap(THIRDS_LESSON[1], 'not-a-note')).not.toThrow();
		expect(gradeLessonTap(THIRDS_LESSON[1], 'not-a-note')).toBe(false);
	});

	it('is octave-agnostic: letter alone carries no octave to grade against', () => {
		expect(gradeLessonTap(THIRDS_LESSON[1], 'E')).toBe(true);
	});
});

describe('semitonesFromC', () => {
	it("returns 4 for 'E'", () => {
		expect(semitonesFromC('E')).toBe(4);
	});

	it("returns 3 for 'E♭'", () => {
		expect(semitonesFromC('E♭')).toBe(3);
	});

	it("returns 0 for 'C'", () => {
		expect(semitonesFromC('C')).toBe(0);
	});

	it("returns 11 for 'B'", () => {
		expect(semitonesFromC('B')).toBe(11);
	});
});
