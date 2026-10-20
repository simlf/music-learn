import { describe, expect, it } from 'vitest';
import { chromaOf } from '$lib/theory/interval';
import { GUIDE_TONE_BARS, GUIDE_TONE_MOTIONS } from './guideTones';
import { GUIDE_TONE_LESSON } from './guideToneLesson';

/**
 * Chapter 11's concept lesson gate: every letter the steps tap, light and
 * sound is the guide-tone engine's own fixed ii V I in C, never hand-typed
 * prose that could drift from it.
 */

const shellOf = (index: number) =>
	GUIDE_TONE_BARS[index].shell.map((note) => ({ letter: note.letter, role: note.role }));
const sorted = <T extends { letter: string }>(notes: T[]) =>
	[...notes].sort((a, b) => a.letter.localeCompare(b.letter));

describe('GUIDE_TONE_LESSON', () => {
	it('is four steps: three taps over ii V I, then a hand-over step with nothing to tap', () => {
		expect(GUIDE_TONE_LESSON).toHaveLength(4);
		expect(GUIDE_TONE_LESSON.slice(0, 3).every((step) => step.targetChroma !== null)).toBe(true);
		expect(GUIDE_TONE_LESSON[3].targetChroma).toBeNull();
		expect(GUIDE_TONE_LESSON[3].hearable).toBe(false);
	});

	it('lights each chord exactly as its engine shell, with each note in its role for that chord', () => {
		GUIDE_TONE_LESSON.slice(0, 3).forEach((step, index) => {
			expect(sorted(step.shows ?? [])).toEqual(sorted(shellOf(index)));
			expect([...(step.hearNotes ?? [])].sort()).toEqual(shellOf(index).map((note) => note.letter).sort());
		});
	});

	it("step 1 taps Dm7's 7th, the note that moves next", () => {
		const step = GUIDE_TONE_LESSON[0];
		const seventh = GUIDE_TONE_BARS[0].shell.find((note) => note.role === 'seventh')!;
		expect(step.letter).toBe(seventh.letter);
		expect(step.targetChroma).toBe(chromaOf(seventh.letter));
		expect(seventh.letter).toBe(GUIDE_TONE_MOTIONS[0]!.fallingFrom);
	});

	it('steps 2 and 3 tap where the falling 7th lands: the next chord 3rd, one half step down', () => {
		[1, 2].forEach((index) => {
			const step = GUIDE_TONE_LESSON[index];
			const motion = GUIDE_TONE_MOTIONS[index - 1]!;
			expect(motion.fallingSemitones).toBe(1);
			expect(step.letter).toBe(motion.fallingTo);
			expect(step.role).toBe('third');
			expect(step.targetChroma).toBe(chromaOf(motion.fallingTo));
		});
	});

	it('names the held note correctly in the copy: the same letter, a 3rd and then the next chord 7th', () => {
		expect(GUIDE_TONE_MOTIONS.map((motion) => motion!.heldLetter)).toEqual(['F', 'B']);
		expect(GUIDE_TONE_LESSON[1].correctLine!.en).toContain('F did not move: it was the 3rd of Dm7, it is the 7th of G7');
		expect(GUIDE_TONE_LESSON[2].correctLine!.en).toContain('the 3rd of G7 is the 7th of Cmaj7');
	});

	it('never claims a tritone, and never says one note is a 7th and then a 3rd', () => {
		for (const step of GUIDE_TONE_LESSON) {
			for (const copy of [step.title, step.body, step.correctLine, step.wrongHint]) {
				if (!copy) continue;
				expect(copy.en.toLowerCase()).not.toContain('tritone');
				expect(copy.fr.toLowerCase()).not.toContain('triton');
				expect(copy.en).not.toMatch(/7th of \w+ and then the 3rd/);
			}
		}
	});
});
