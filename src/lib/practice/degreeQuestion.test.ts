import { describe, expect, it } from 'vitest';
import {
	DEGREE_COUNT,
	DEGREE_DIRECTIONS,
	degreeForTappedLetter,
	generateDegreeQuestion,
	gradeDegreeNoteTap,
	gradeDegreePick,
	isDegreeQuestionAnswerable,
	spellTappedLetter
} from './degreeQuestion';
import { allFacts } from '$lib/srs/facts';
import { MAJOR_SCALE_ROOTS } from '$lib/theory/scale';
import { chromaOf } from '$lib/theory/interval';

/**
 * The pure half of the scale-degree practice family: the generator's draw
 * contract, both graders' chroma discipline, and total coverage of every one of
 * the catalog's 84 scale-degree facts.
 */

/** Pins the direction draw: 0 picks DEGREE_DIRECTIONS[0], 0.99 picks the last. */
const RNG_FIRST = () => 0;
const RNG_LAST = () => 0.99;

describe('generateDegreeQuestion', () => {
	it('resolves the degree to its spelled note, in the key’s own spelling', () => {
		const question = generateDegreeQuestion({ tonic: 'E♭', degree: 3, rng: RNG_FIRST });
		expect(question.kind).toBe('scale-degree');
		expect(question.tonic).toBe('E♭');
		expect(question.degree).toBe(3);
		expect(question.note?.letter).toBe('G');
		expect(question.notes).toHaveLength(DEGREE_COUNT);
		expect(question.chroma).toBe(chromaOf('G'));
	});

	it('keeps the enharmonically correct spelling a real key needs (F♯ major’s 7th is E♯)', () => {
		const question = generateDegreeQuestion({ tonic: 'F♯', degree: 7, rng: RNG_FIRST });
		expect(question.note?.letter).toBe('E♯');
	});

	it('draws the direction from the injected rng', () => {
		expect(generateDegreeQuestion({ tonic: 'C', degree: 5, rng: RNG_FIRST }).direction).toBe(
			DEGREE_DIRECTIONS[0]
		);
		expect(generateDegreeQuestion({ tonic: 'C', degree: 5, rng: RNG_LAST }).direction).toBe(
			DEGREE_DIRECTIONS[DEGREE_DIRECTIONS.length - 1]
		);
	});

	it('never asks note-to-degree for degree 1: the prompt note would be the key name itself', () => {
		for (const tonic of MAJOR_SCALE_ROOTS) {
			expect(generateDegreeQuestion({ tonic, degree: 1, rng: RNG_LAST }).direction).toBe(
				'degree-to-note'
			);
		}
	});

	it('still consumes the direction draw for degree 1, so the draw script stays positionally stable', () => {
		let draws = 0;
		const countingRng = () => {
			draws += 1;
			return 0.99;
		};
		generateDegreeQuestion({ tonic: 'C', degree: 1, rng: countingRng });
		expect(draws).toBe(1);
		generateDegreeQuestion({ tonic: 'C', degree: 4, rng: countingRng });
		expect(draws).toBe(2);
	});

	it('is total: an unknown tonic or an out-of-range degree yields an unanswerable question, never a throw', () => {
		for (const bad of [
			{ tonic: 'H', degree: 3 },
			{ tonic: 'C', degree: 0 },
			{ tonic: 'C', degree: 8 },
			{ tonic: 'C', degree: 2.5 },
			{ tonic: '', degree: 3 }
		]) {
			const question = generateDegreeQuestion({ ...bad, rng: RNG_FIRST });
			expect(isDegreeQuestionAnswerable(question)).toBe(false);
			expect(gradeDegreeNoteTap(question, 'C')).toBe(false);
			expect(gradeDegreePick(question, 1)).toBe(false);
		}
	});

	it('every one of the catalog’s 84 scale-degree facts produces an answerable question', () => {
		const scaleFacts = allFacts().filter((fact) => fact.factKind === 'scale-degree');
		expect(scaleFacts).toHaveLength(84);
		for (const fact of scaleFacts) {
			if (fact.factKind !== 'scale-degree') continue;
			for (const rng of [RNG_FIRST, RNG_LAST]) {
				const question = generateDegreeQuestion({
					tonic: fact.tonic,
					degree: fact.degree,
					rng
				});
				expect(isDegreeQuestionAnswerable(question), fact.factId).toBe(true);
				// The generated answer must be gradable by its own spelling.
				expect(gradeDegreeNoteTap(question, question.note?.letter ?? ''), fact.factId).toBe(true);
				expect(gradeDegreePick(question, fact.degree), fact.factId).toBe(true);
			}
		}
	});
});

describe('gradeDegreeNoteTap (chroma, never letter strings)', () => {
	it('accepts the enharmonic equivalent of the answer: F♯ answers a G♭ degree', () => {
		// Degree 4 of D♭ major is G♭. A keyboard reports black keys as sharps.
		const question = generateDegreeQuestion({ tonic: 'D♭', degree: 4, rng: RNG_FIRST });
		expect(question.note?.letter).toBe('G♭');
		expect(gradeDegreeNoteTap(question, 'F♯')).toBe(true);
		expect(gradeDegreeNoteTap(question, 'G♭')).toBe(true);
	});

	it('accepts an ASCII spelling of the same pitch class', () => {
		const question = generateDegreeQuestion({ tonic: 'B♭', degree: 3, rng: RNG_FIRST });
		expect(question.note?.letter).toBe('D');
		expect(gradeDegreeNoteTap(question, 'D')).toBe(true);
	});

	it('rejects a different pitch class, including the neighbouring degree', () => {
		const question = generateDegreeQuestion({ tonic: 'C', degree: 5, rng: RNG_FIRST });
		expect(gradeDegreeNoteTap(question, 'F')).toBe(false);
		expect(gradeDegreeNoteTap(question, 'A')).toBe(false);
		expect(gradeDegreeNoteTap(question, 'F♯')).toBe(false);
	});

	it('grades an unparseable tap false rather than throwing', () => {
		const question = generateDegreeQuestion({ tonic: 'C', degree: 5, rng: RNG_FIRST });
		expect(gradeDegreeNoteTap(question, 'zzz')).toBe(false);
		expect(gradeDegreeNoteTap(question, '')).toBe(false);
	});
});

describe('gradeDegreePick (chroma-resolved, not a number compare)', () => {
	it('accepts exactly the asked degree and rejects every other', () => {
		const question = generateDegreeQuestion({ tonic: 'A♭', degree: 6, rng: RNG_LAST });
		expect(question.direction).toBe('note-to-degree');
		for (let pick = 1; pick <= DEGREE_COUNT; pick += 1) {
			expect(gradeDegreePick(question, pick), `pick ${pick}`).toBe(pick === 6);
		}
	});

	it('rejects a pick outside 1..7', () => {
		const question = generateDegreeQuestion({ tonic: 'C', degree: 3, rng: RNG_LAST });
		expect(gradeDegreePick(question, 0)).toBe(false);
		expect(gradeDegreePick(question, 8)).toBe(false);
		expect(gradeDegreePick(question, -1)).toBe(false);
	});
});

describe('degreeForTappedLetter / spellTappedLetter (the wrong-answer readout)', () => {
	it('names the degree a tap actually landed on', () => {
		const question = generateDegreeQuestion({ tonic: 'C', degree: 5, rng: RNG_FIRST });
		expect(degreeForTappedLetter(question, 'A')).toBe(6);
		expect(degreeForTappedLetter(question, 'C')).toBe(1);
	});

	it('returns null for a pitch class outside the scale', () => {
		const question = generateDegreeQuestion({ tonic: 'C', degree: 5, rng: RNG_FIRST });
		expect(degreeForTappedLetter(question, 'A♭')).toBeNull();
		expect(degreeForTappedLetter(question, 'zzz')).toBeNull();
	});

	it('re-spells a tap in the key’s own vocabulary: a D♯ key tap in E♭ major reads E♭', () => {
		const question = generateDegreeQuestion({ tonic: 'E♭', degree: 3, rng: RNG_FIRST });
		expect(spellTappedLetter(question, 'D♯')).toBe('E♭');
	});

	it('leaves an out-of-scale tap spelled as tapped', () => {
		const question = generateDegreeQuestion({ tonic: 'C', degree: 5, rng: RNG_FIRST });
		expect(spellTappedLetter(question, 'A♭')).toBe('A♭');
	});
});
