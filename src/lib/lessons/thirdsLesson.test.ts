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

/**
 * The pedagogy gate for the app's FIRST lesson (T5 R1). The old copy taught a
 * keyboard recipe ("a major third is 4 keys up", "that black key IS a minor
 * third"), which encodes two falsehoods: that an interval is a property of a
 * note rather than a distance between two, and that the unit of measurement
 * has anything to do with which keys are black. These assertions lock the
 * number + quality framing that replaced it.
 */
describe('THIRDS_LESSON teaches number + quality, not a keyboard recipe (T5 R1)', () => {
	const allCopy = THIRDS_LESSON.flatMap((step) =>
		[step.title, step.body, step.correctLine, step.wrongHint]
			.filter((copy): copy is NonNullable<typeof copy> => copy !== null)
			.flatMap((copy) => [copy.en, copy.fr])
	);

	it('never calls a NOTE an interval (no "is a minor third" predicated on a key)', () => {
		for (const line of allCopy) {
			expect(line).not.toMatch(/black key is a/i);
			expect(line).not.toMatch(/touche noire est une/i);
		}
	});

	it('measures every distance in half steps, never in "keys" or "semitones"', () => {
		for (const line of allCopy) {
			expect(line).not.toMatch(/\bkeys up\b/i);
			expect(line).not.toMatch(/\bsemitones?\b/i);
			expect(line).not.toMatch(/\btouches? plus haut\b/i);
		}
		// The unit word itself is present where a count appears.
		expect(THIRDS_LESSON[1].body.en).toContain('half steps');
		expect(THIRDS_LESSON[1].body.fr).toContain('demi-tons');
		expect(THIRDS_LESSON[3].body.en).toContain('half step');
		expect(THIRDS_LESSON[3].body.fr).toContain('demi-ton');
	});

	it('explains the number/quality split explicitly on the major-third step', () => {
		expect(THIRDS_LESSON[1].body.en).toMatch(/name counts letters/i);
		expect(THIRDS_LESSON[1].body.en).toMatch(/quality counts half steps/i);
		expect(THIRDS_LESSON[1].body.fr).toMatch(/compte les lettres/i);
		expect(THIRDS_LESSON[1].body.fr).toMatch(/compte les demi-tons/i);
	});

	it('emphasizes the interval NUMBER on both third steps, so E♭ is still a third', () => {
		// The `**...**` span is what the component paints verdigris: on step 2
		// and step 4 it must be the interval word, and step 4's letters must be
		// named as unchanged (C, D, E) so the reader sees E♭ is still an E.
		expect(THIRDS_LESSON[1].body.en).toContain('**third**');
		expect(THIRDS_LESSON[3].body.en).toContain('**third**');
		expect(THIRDS_LESSON[1].body.fr).toContain('**tierce**');
		expect(THIRDS_LESSON[3].body.fr).toContain('**tierce**');
		expect(THIRDS_LESSON[3].body.en).toMatch(/C, D, E/);
		expect(THIRDS_LESSON[3].body.fr).toMatch(/C, D, E/);
	});

	it('names the QUALITY (major / minor) only on the hear step and the wrong-tap hints', () => {
		expect(THIRDS_LESSON[2].body.en).toContain('**major third**');
		expect(THIRDS_LESSON[2].body.fr).toContain('**tierce majeure**');
		expect(THIRDS_LESSON[1].wrongHint?.en).toContain('A major third is 4 half steps');
		expect(THIRDS_LESSON[3].wrongHint?.en).toContain('A minor third is 3 half steps');
		expect(THIRDS_LESSON[1].wrongHint?.fr).toContain('4 demi-tons');
		expect(THIRDS_LESSON[3].wrongHint?.fr).toContain('3 demi-tons');
	});

	it('contains no em dashes in any shipped line (standing copy rule)', () => {
		for (const line of allCopy) {
			expect(line).not.toMatch(/—|–/);
		}
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

describe('semitonesFromC honors its -1 contract for unparseable input', () => {
	// Regression: tonal's Note.chroma returns NaN, not undefined, for an
	// unparseable letter. The old `=== undefined` guard never fired, so this
	// returned NaN and the wrong-tap hint rendered "That one was NaN half steps".
	// Note: a bare '♭' is NOT in this list. It normalizes to 'b', which tonal
	// legitimately parses as B natural (chroma 11), so it is parseable input
	// rather than a guard case.
	it.each(['Q', '', 'H♯', 'xyz', '8'])('returns -1 for %o', (bad) => {
		const result = semitonesFromC(bad);
		expect(Number.isNaN(result), `${bad} must not yield NaN`).toBe(false);
		expect(result).toBe(-1);
	});

	it('still measures real letters, including exotic spellings', () => {
		expect(semitonesFromC('C')).toBe(0);
		expect(semitonesFromC('E♭')).toBe(3);
		expect(semitonesFromC('E')).toBe(4);
		expect(semitonesFromC('B♯')).toBe(0);
		expect(semitonesFromC('C♭')).toBe(11);
		expect(semitonesFromC('B♭♭')).toBe(9);
	});

	it('gradeLessonTap rejects unparseable input rather than relying on NaN comparison', () => {
		const majorThirdStep = THIRDS_LESSON[1];
		expect(majorThirdStep.targetChroma).toBe(4);
		expect(gradeLessonTap(majorThirdStep, 'Q')).toBe(false);
		expect(gradeLessonTap(majorThirdStep, 'E')).toBe(true);
		// Enharmonic-blind by design: F♭ is chroma 4, same as E.
		expect(gradeLessonTap(majorThirdStep, 'F♭')).toBe(true);
	});
});
