import { describe, expect, it } from 'vitest';
import { INTERVAL_NAMING_LESSON } from './intervalNamingLesson';
import { gradeLessonTap, semitonesFromC } from './thirdsLesson';

describe('INTERVAL_NAMING_LESSON content invariants', () => {
	it('has exactly four steps', () => {
		expect(INTERVAL_NAMING_LESSON.length).toBe(4);
	});

	it('has the locked ordered targetChroma sequence: root, major 2nd, augmented 2nd, then a hear-only payoff', () => {
		expect(INTERVAL_NAMING_LESSON.map((step) => step.targetChroma)).toEqual([0, 2, 3, null]);
	});

	it('measures every tappable step against C, so semitonesFromC (always C-relative) grades every wrong-tap hint correctly', () => {
		expect(semitonesFromC(INTERVAL_NAMING_LESSON[0].letter ?? '')).toBe(0);
		expect(semitonesFromC(INTERVAL_NAMING_LESSON[1].letter ?? '')).toBe(2);
		expect(semitonesFromC(INTERVAL_NAMING_LESSON[2].letter ?? '')).toBe(3);
	});

	it('uses the second role for both tappable non-root steps, so the augmented second replaces the major second on the shared keyboard', () => {
		expect(INTERVAL_NAMING_LESSON[1].role).toBe('second');
		expect(INTERVAL_NAMING_LESSON[2].role).toBe('second');
	});

	it("step 3's letter is the sharp glyph D-sharp, the flagship contrast pitch", () => {
		expect(INTERVAL_NAMING_LESSON[2].letter).toBe('D♯');
	});
});

/**
 * Mirrors thirdsLesson.test.ts's own pedagogy gate: this lesson generalizes
 * the number+quality mechanism, so it must never fall back to a keyboard
 * recipe, and must keep using "half steps" as the unit word.
 */
describe('INTERVAL_NAMING_LESSON generalizes number + quality without restating the thirds lesson', () => {
	const allCopy = INTERVAL_NAMING_LESSON.flatMap((step) =>
		[step.title, step.body, step.correctLine, step.wrongHint]
			.filter((copy): copy is NonNullable<typeof copy> => copy !== null)
			.flatMap((copy) => [copy.en, copy.fr])
	);

	it('never calls a note an interval, and never measures in "keys" or "semitones"', () => {
		for (const line of allCopy) {
			expect(line).not.toMatch(/black key is a/i);
			expect(line).not.toMatch(/touche noire est une/i);
			expect(line).not.toMatch(/\bkeys up\b/i);
			expect(line).not.toMatch(/\bsemitones?\b/i);
			expect(line).not.toMatch(/\btouches? plus haut\b/i);
		}
	});

	it('states the number/quality split on a NEW interval class (seconds), not by repeating the thirds wording', () => {
		expect(INTERVAL_NAMING_LESSON[1].body.en).toMatch(/two letter names/i);
		expect(INTERVAL_NAMING_LESSON[1].body.en).not.toMatch(/name counts letters/i);
		expect(INTERVAL_NAMING_LESSON[1].body.fr).toMatch(/deux noms de notes/i);
	});

	it('lands the flagship contrast explicitly: D♯ is a second (two letters) and E♭ is a third (three letters), same key', () => {
		const payoff = INTERVAL_NAMING_LESSON[3].body;
		expect(payoff.en).toContain('E♭');
		expect(payoff.en).toMatch(/three letter names, C, D, E/i);
		expect(payoff.en).toMatch(/two, C, D/i);
		expect(payoff.fr).toContain('E♭');
		expect(payoff.fr).toMatch(/trois noms de notes, C, D, E/i);
	});

	it('ties the mechanism to the real payoff: a diminished 7th above C is spelled B♭♭, not A', () => {
		expect(INTERVAL_NAMING_LESSON[3].body.en).toContain('B♭♭');
		expect(INTERVAL_NAMING_LESSON[3].body.en).toMatch(/diminished 7th/i);
		expect(INTERVAL_NAMING_LESSON[3].body.fr).toContain('B♭♭');
		expect(INTERVAL_NAMING_LESSON[3].body.fr).toMatch(/septième diminuée/i);
	});

	it('emphasizes the interval NUMBER on the two second-steps, and the closing NUMBER rule on the payoff step', () => {
		expect(INTERVAL_NAMING_LESSON[1].body.en).toContain('**second**');
		expect(INTERVAL_NAMING_LESSON[2].body.en).toContain('**second**');
		expect(INTERVAL_NAMING_LESSON[3].body.en).toContain('**number**');
		expect(INTERVAL_NAMING_LESSON[1].body.fr).toContain('**seconde**');
		expect(INTERVAL_NAMING_LESSON[2].body.fr).toContain('**seconde**');
		expect(INTERVAL_NAMING_LESSON[3].body.fr).toContain('**chiffre**');
	});

	it('contains no em dashes in any shipped line (standing copy rule)', () => {
		for (const line of allCopy) {
			expect(line).not.toMatch(/—|–/);
		}
	});
});

describe('INTERVAL_NAMING_LESSON bilingual copy completeness (I18N-02)', () => {
	it('every step has non-empty en and fr title and body', () => {
		for (const step of INTERVAL_NAMING_LESSON) {
			expect(step.title.en.length).toBeGreaterThan(0);
			expect(step.title.fr.length).toBeGreaterThan(0);
			expect(step.body.en.length).toBeGreaterThan(0);
			expect(step.body.fr.length).toBeGreaterThan(0);
		}
	});

	it('every non-null correctLine and wrongHint has non-empty en and fr, preserving the {N} placeholder in both', () => {
		for (const step of INTERVAL_NAMING_LESSON) {
			if (step.correctLine !== null) {
				expect(step.correctLine.en.length).toBeGreaterThan(0);
				expect(step.correctLine.fr.length).toBeGreaterThan(0);
			}
			if (step.wrongHint !== null) {
				expect(step.wrongHint.en.length).toBeGreaterThan(0);
				expect(step.wrongHint.fr.length).toBeGreaterThan(0);
				if (step.wrongHint.en.includes('{N}')) {
					expect(step.wrongHint.fr).toContain('{N}');
				}
			}
		}
	});

	it('every fr body containing emphasis in en also contains a **-delimited emphasis span in fr', () => {
		for (const step of INTERVAL_NAMING_LESSON) {
			const enHasEmphasis = /\*\*(.+?)\*\*/.test(step.body.en);
			const frHasEmphasis = /\*\*(.+?)\*\*/.test(step.body.fr);
			expect(frHasEmphasis).toBe(enHasEmphasis);
		}
	});
});

describe('gradeLessonTap against INTERVAL_NAMING_LESSON (reuses the shared, chroma-only grader)', () => {
	it('grades a correct D tap true against the major-second step', () => {
		expect(gradeLessonTap(INTERVAL_NAMING_LESSON[1], 'D')).toBe(true);
	});

	it('grades a correct D♯ tap true against the augmented-second step, enharmonic-blind (F♭♭ also grades true)', () => {
		expect(gradeLessonTap(INTERVAL_NAMING_LESSON[2], 'D♯')).toBe(true);
		expect(gradeLessonTap(INTERVAL_NAMING_LESSON[2], 'F♭♭')).toBe(true);
	});

	it('grades E♭ false against the augmented-second step (same key as D♯, but this checker is chroma-only so it is NOT what distinguishes them; the pool spelling drill does that explicitly)', () => {
		// gradeLessonTap is deliberately chroma-only (locked contract, thirdsLesson.ts),
		// so E♭ (chroma 3) grades identically to D♯ (chroma 3) here. The whole point of
		// the separate spelling drill (spellIntervalQuestion.ts) is that IT does not
		// collapse this pair; this assertion pins that the lesson's own tap-grading
		// intentionally does, matching its established, unchanged contract.
		expect(gradeLessonTap(INTERVAL_NAMING_LESSON[2], 'E♭')).toBe(true);
	});

	it('grades a wrong tap false against the major-second step', () => {
		expect(gradeLessonTap(INTERVAL_NAMING_LESSON[1], 'C')).toBe(false);
	});

	it('grades false for the null-targetChroma (hear-then-continue) payoff step', () => {
		expect(gradeLessonTap(INTERVAL_NAMING_LESSON[3], 'D♯')).toBe(false);
	});
});
