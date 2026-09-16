import { describe, expect, it } from 'vitest';
import { CHORD_SCALE_LESSON, CHORD_SCALE_LESSON_DRILL_SEEDS } from './chordScaleLesson';
import { gradeLessonTap } from './thirdsLesson';

/**
 * Content invariants for the CHORD-SCALE lesson (ml-modes-practice §4.1).
 * Grading itself (`gradeLessonTap`/`semitonesFromC`) is generic and already
 * covered by thirdsLesson.test.ts; these tests only lock this lesson's own
 * data (step sequence, bilingual completeness, no em dashes).
 */

describe('CHORD_SCALE_LESSON content invariants', () => {
	it('has exactly four steps', () => {
		expect(CHORD_SCALE_LESSON.length).toBe(4);
	});

	it('has the locked ordered targetChroma sequence: root, fifth (G), second (D), then a hear-only close', () => {
		expect(CHORD_SCALE_LESSON.map((step) => step.targetChroma)).toEqual([0, 7, 2, null]);
	});

	it('anchors every tap step to C major letters only: C, G, D', () => {
		expect(CHORD_SCALE_LESSON.map((step) => step.letter)).toEqual(['C', 'G', 'D', null]);
	});

	it('CHORD_SCALE_LESSON_DRILL_SEEDS is the ii-V pair the lesson names', () => {
		expect(CHORD_SCALE_LESSON_DRILL_SEEDS).toEqual(['Dm7', 'G7']);
	});
});

describe('CHORD_SCALE_LESSON teaches "same letters, different starting point" (ml-modes-practice §4.1)', () => {
	it('names the mode label only after showing the mechanism, never as the question itself', () => {
		// The mode name appears in body copy (the reveal), never in a title
		// alone with no letters shown - mirrors chordScale.ts's own rule that
		// the mode name is a label on the answer, never the lesson.
		expect(CHORD_SCALE_LESSON[1].body.en).toMatch(/mixolydian/i);
		expect(CHORD_SCALE_LESSON[2].body.en).toMatch(/dorian/i);
	});

	it('ties the two named chords to the ii-V-I the guide-tone lesson already introduced', () => {
		expect(CHORD_SCALE_LESSON[1].body.en).toMatch(/G7/);
		expect(CHORD_SCALE_LESSON[2].body.en).toMatch(/Dm7/);
	});

	it('never claims a second chord root is being sounded: every tap target is a C-major letter', () => {
		const chromas = CHORD_SCALE_LESSON.map((step) => step.targetChroma).filter(
			(chroma): chroma is number => chroma !== null
		);
		// 0 (C), 7 (G), 2 (D): all diatonic to C major, never an accidental.
		for (const chroma of chromas) {
			expect([0, 2, 4, 5, 7, 9, 11]).toContain(chroma);
		}
	});
});

describe('CHORD_SCALE_LESSON bilingual copy completeness (I18N-02)', () => {
	it('every step has non-empty en and fr title and body', () => {
		for (const step of CHORD_SCALE_LESSON) {
			expect(step.title.en.length).toBeGreaterThan(0);
			expect(step.title.fr.length).toBeGreaterThan(0);
			expect(step.body.en.length).toBeGreaterThan(0);
			expect(step.body.fr.length).toBeGreaterThan(0);
		}
	});

	it('every non-null correctLine has non-empty en and fr', () => {
		for (const step of CHORD_SCALE_LESSON) {
			if (step.correctLine === null) continue;
			expect(step.correctLine.en.length).toBeGreaterThan(0);
			expect(step.correctLine.fr.length).toBeGreaterThan(0);
		}
	});

	it('every non-null wrongHint has non-empty en and fr', () => {
		for (const step of CHORD_SCALE_LESSON) {
			if (step.wrongHint === null) continue;
			expect(step.wrongHint.en.length).toBeGreaterThan(0);
			expect(step.wrongHint.fr.length).toBeGreaterThan(0);
		}
	});

	it('every fr body containing emphasis in en also contains a **-delimited emphasis span in fr', () => {
		for (const step of CHORD_SCALE_LESSON) {
			const enHasEmphasis = /\*\*(.+?)\*\*/.test(step.body.en);
			const frHasEmphasis = /\*\*(.+?)\*\*/.test(step.body.fr);
			expect(frHasEmphasis).toBe(enHasEmphasis);
		}
	});

	it('contains no em dashes in any shipped line (standing copy rule)', () => {
		const allCopy = CHORD_SCALE_LESSON.flatMap((step) =>
			[step.title, step.body, step.correctLine, step.wrongHint]
				.filter((copy): copy is NonNullable<typeof copy> => copy !== null)
				.flatMap((copy) => [copy.en, copy.fr])
		);
		for (const line of allCopy) {
			expect(line).not.toMatch(/—|–/);
		}
	});
});

describe('gradeLessonTap over CHORD_SCALE_LESSON (reuses the generic, already-tested grader)', () => {
	it('grades the root/fifth/second taps correctly', () => {
		expect(gradeLessonTap(CHORD_SCALE_LESSON[0], 'C')).toBe(true);
		expect(gradeLessonTap(CHORD_SCALE_LESSON[1], 'G')).toBe(true);
		expect(gradeLessonTap(CHORD_SCALE_LESSON[2], 'D')).toBe(true);
	});

	it('grades a wrong tap false', () => {
		expect(gradeLessonTap(CHORD_SCALE_LESSON[1], 'F')).toBe(false);
	});

	it('grades false for the null-targetChroma closing step', () => {
		expect(gradeLessonTap(CHORD_SCALE_LESSON[3], 'C')).toBe(false);
	});
});
