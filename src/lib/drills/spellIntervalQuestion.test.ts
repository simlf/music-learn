import { describe, expect, it, vi, afterEach } from 'vitest';
import { DRILL_INTERVALS } from '$lib/theory/interval';
import {
	SPELLING_DRILL_INTERVALS,
	generateSpellingQuestion,
	gradeSpelling,
	splitSpelling
} from './spellIntervalQuestion';

describe('SPELLING_DRILL_INTERVALS', () => {
	it('is the three enharmonic pairs (A2/m3, A4/d5, d7/M6), six entries', () => {
		expect([...SPELLING_DRILL_INTERVALS].sort()).toEqual(
			['A2', 'A4', 'M6', 'd5', 'd7', 'm3'].sort()
		);
	});

	it('never enters the FSRS catalog pool: the newly-introduced evil twins (A2, d5, d7) are absent from DRILL_INTERVALS', () => {
		// This is the isolation the whole module exists to guarantee: DRILL_INTERVALS
		// feeds buildIntervalSizeFacts() in srs/facts.ts, so if any of these three
		// leaked in there, this drill would have silently grown the FSRS catalog.
		expect(DRILL_INTERVALS).not.toContain('A2');
		expect(DRILL_INTERVALS).not.toContain('d5');
		expect(DRILL_INTERVALS).not.toContain('d7');
	});

	it('its cardable siblings (m3, A4, M6) ARE in DRILL_INTERVALS, so each pool entry has a real cardable enharmonic partner', () => {
		expect(DRILL_INTERVALS).toContain('m3');
		expect(DRILL_INTERVALS).toContain('A4');
		expect(DRILL_INTERVALS).toContain('M6');
	});
});

describe('splitSpelling', () => {
	it.each([
		['D♯', 'D', '♯'],
		['E♭', 'E', '♭'],
		['B♭♭', 'B', '♭♭'],
		['C', 'C', ''],
		['F♯♯', 'F', '♯♯']
	])('splits %s into letter %s and accidental %s', (spelled, letter, accidental) => {
		expect(splitSpelling(spelled)).toEqual({ letter, accidental });
	});
});

describe('generateSpellingQuestion', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('draws root then interval, matching generateIntervalQuestion’s positional shape', () => {
		vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0);
		const question = generateSpellingQuestion();

		expect(question.root).toBe('C');
		expect(question.interval.short).toBe(SPELLING_DRILL_INTERVALS[0]);
	});

	it('a forced `short` skips the interval draw but the root still draws normally', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0);
		const question = generateSpellingQuestion({ short: 'd7' });

		expect(question.root).toBe('C');
		expect(question.interval.short).toBe('d7');
	});

	it('computes the canonical enharmonic spellings correctly for the flagship contrast pair', () => {
		const a2 = generateSpellingQuestion({ short: 'A2' });
		const m3 = generateSpellingQuestion({ short: 'm3' });
		// Both draws still draw a random root; force it deterministic via a spy
		// for the actual assertion below instead of relying on these draws.
		void a2;
		void m3;

		vi.spyOn(Math, 'random').mockReturnValue(0); // root index 0 -> C
		const overA2 = generateSpellingQuestion({ short: 'A2' });
		expect(overA2.expectedSpelling).toBe('D♯');
		expect(overA2.expectedLetter).toBe('D');
		expect(overA2.expectedAccidental).toBe('♯');

		const overM3 = generateSpellingQuestion({ short: 'm3' });
		expect(overM3.expectedSpelling).toBe('E♭');
		expect(overM3.expectedLetter).toBe('E');
		expect(overM3.expectedAccidental).toBe('♭');
	});

	it('the Cdim7 payoff pair: d7 above C spells B♭♭ (double flat), M6 above C spells the plain A', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0);
		const d7 = generateSpellingQuestion({ short: 'd7' });
		expect(d7.expectedSpelling).toBe('B♭♭');
		expect(d7.expectedLetter).toBe('B');
		expect(d7.expectedAccidental).toBe('♭♭');

		const m6 = generateSpellingQuestion({ short: 'M6' });
		expect(m6.expectedSpelling).toBe('A');
		expect(m6.expectedLetter).toBe('A');
		expect(m6.expectedAccidental).toBe('');
	});

	it('every pool entry resolves to a real, non-empty spelling from every root (total sweep)', () => {
		for (const short of SPELLING_DRILL_INTERVALS) {
			const question = generateSpellingQuestion({ short });
			expect(question.expectedSpelling.length).toBeGreaterThan(0);
			expect(question.interval.semitones).toBeGreaterThanOrEqual(0);
		}
	});
});

describe('gradeSpelling: the letter check and the pitch check are computed and asserted separately', () => {
	it('grades a fully correct spelling true on both axes', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0);
		const question = generateSpellingQuestion({ short: 'A2' }); // root C, expects D♯
		vi.restoreAllMocks();

		const grade = gradeSpelling(question, 'D', '♯');
		expect(grade.letterCorrect).toBe(true);
		expect(grade.pitchCorrect).toBe(true);
		expect(grade.correct).toBe(true);
	});

	/**
	 * The flagship enharmonic trap the whole drill exists to test (per the
	 * owning brief): C to D♯ (augmented 2nd) versus C to E♭ (minor 3rd). Both
	 * spellings land on the identical piano key (chroma 3), so a drill that
	 * graded pitch alone would accept either answer for either question. This
	 * pins that it does NOT: the pitch matches, but the letter does not, and
	 * `givenInterval` reports exactly what the wrong letter actually spelled.
	 */
	it('C -> D♯ (augmented 2nd) marked E♭: same key, wrong letter, not "correct"', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0);
		const question = generateSpellingQuestion({ short: 'A2' }); // root C, expects D♯
		vi.restoreAllMocks();

		const grade = gradeSpelling(question, 'E', '♭');
		expect(grade.pitchCorrect).toBe(true);
		expect(grade.letterCorrect).toBe(false);
		expect(grade.correct).toBe(false);
		expect(grade.givenInterval.short).toBe('m3');
	});

	it('the mirror image: C -> E♭ (minor 3rd) marked D♯: same key, wrong letter, not "correct"', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0);
		const question = generateSpellingQuestion({ short: 'm3' }); // root C, expects E♭
		vi.restoreAllMocks();

		const grade = gradeSpelling(question, 'D', '♯');
		expect(grade.pitchCorrect).toBe(true);
		expect(grade.letterCorrect).toBe(false);
		expect(grade.correct).toBe(false);
		expect(grade.givenInterval.short).toBe('A2');
	});

	it('right letter, wrong accidental (the number was right, the quality was not)', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0);
		const question = generateSpellingQuestion({ short: 'A2' }); // root C, expects D♯
		vi.restoreAllMocks();

		const grade = gradeSpelling(question, 'D', ''); // D natural: major 2nd
		expect(grade.letterCorrect).toBe(true);
		expect(grade.pitchCorrect).toBe(false);
		expect(grade.correct).toBe(false);
		expect(grade.givenInterval.short).toBe('M2');
	});

	it('both wrong: neither the letter nor the pitch matches', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0);
		const question = generateSpellingQuestion({ short: 'A2' }); // root C, expects D♯
		vi.restoreAllMocks();

		const grade = gradeSpelling(question, 'G', '');
		expect(grade.letterCorrect).toBe(false);
		expect(grade.pitchCorrect).toBe(false);
		expect(grade.correct).toBe(false);
	});

	it('grades a double-accidental target correctly (the Cdim7 B♭♭ case)', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0);
		const question = generateSpellingQuestion({ short: 'd7' }); // root C, expects B♭♭
		vi.restoreAllMocks();

		expect(gradeSpelling(question, 'B', '♭♭').correct).toBe(true);
		// The enharmonic-correct-pitch-wrong-letter reading: A natural is the
		// same key as B♭♭ but is the WRONG letter for a diminished 7th.
		const wrongLetter = gradeSpelling(question, 'A', '');
		expect(wrongLetter.pitchCorrect).toBe(true);
		expect(wrongLetter.letterCorrect).toBe(false);
	});

	it('never throws on an unparseable pick', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0);
		const question = generateSpellingQuestion({ short: 'A2' });
		vi.restoreAllMocks();

		expect(() => gradeSpelling(question, 'Q', '###')).not.toThrow();
		expect(gradeSpelling(question, 'Q', '###').pitchCorrect).toBe(false);
	});
});
