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

describe('THIRDS_LESSON bilingual copy completeness (I18N-02)', () => {
	it('every step has non-empty en and fr title and body', () => {
		for (const step of THIRDS_LESSON) {
			expect(step.title.en.length).toBeGreaterThan(0);
			expect(step.title.fr.length).toBeGreaterThan(0);
			expect(step.body.en.length).toBeGreaterThan(0);
			expect(step.body.fr.length).toBeGreaterThan(0);
		}
	});

	it('every non-null correctLine has non-empty en and fr', () => {
		for (const step of THIRDS_LESSON) {
			if (step.correctLine === null) continue;
			expect(step.correctLine.en.length).toBeGreaterThan(0);
			expect(step.correctLine.fr.length).toBeGreaterThan(0);
		}
	});

	it('every non-null wrongHint has non-empty en and fr, preserving the {N} placeholder in both languages when present in en', () => {
		for (const step of THIRDS_LESSON) {
			if (step.wrongHint === null) continue;
			expect(step.wrongHint.en.length).toBeGreaterThan(0);
			expect(step.wrongHint.fr.length).toBeGreaterThan(0);
			if (step.wrongHint.en.includes('{N}')) {
				expect(step.wrongHint.fr).toContain('{N}');
			}
		}
	});

	it('every fr body containing emphasis in en also contains a **-delimited emphasis span in fr', () => {
		for (const step of THIRDS_LESSON) {
			const enHasEmphasis = /\*\*(.+?)\*\*/.test(step.body.en);
			const frHasEmphasis = /\*\*(.+?)\*\*/.test(step.body.fr);
			expect(frHasEmphasis).toBe(enHasEmphasis);
		}
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
