import { describe, expect, it, vi } from 'vitest';
import { generateQuestion, pickDistractors, pickQuestionType } from './generateQuestion';
import { spellChord } from '$lib/theory/chord';
import { matchChord } from './matchChord';
import { ROOTS, QUALITY_SUFFIXES } from '$lib/theory/randomChord';

/** Derives a chroma set for a symbol the same way matchChord derives target chroma. */
function chromaSetFor(symbol: string): Set<number> {
	const target = spellChord(symbol);
	const result = matchChord([], target);
	// matchChord(played=[]) returns missing = all target chroma, so this is
	// exactly the target chroma set without duplicating matchChord's internals.
	return new Set(result.missing);
}

describe('pickDistractors', () => {
	it('returns exactly 3 symbols for a recognized correct answer', () => {
		const distractors = pickDistractors('Cm7');
		expect(distractors).toHaveLength(3);
	});

	it('every returned distractor is parseable by spellChord', () => {
		const distractors = pickDistractors('Cm7');
		for (const d of distractors) {
			expect(spellChord(d).recognized).toBe(true);
		}
	});

	it('never returns the correct symbol itself or an enharmonically identical distractor', () => {
		const correct = 'Cm7';
		const correctChroma = chromaSetFor(correct);
		const distractors = pickDistractors(correct);
		expect(distractors).not.toContain(correct);
		for (const d of distractors) {
			const dChroma = chromaSetFor(d);
			const isSameSet =
				dChroma.size === correctChroma.size && [...dChroma].every((c) => correctChroma.has(c));
			expect(isSameSet).toBe(false);
		}
	});

	it('returns 3 unique distractors with no duplicate symbols', () => {
		const distractors = pickDistractors('Bbmaj7');
		expect(new Set(distractors).size).toBe(distractors.length);
	});
});

describe('pickQuestionType', () => {
	it('only ever returns "construction" or "identification"', () => {
		for (let i = 0; i < 50; i++) {
			const type = pickQuestionType();
			expect(['construction', 'identification']).toContain(type);
		}
	});
});

describe('generateQuestion', () => {
	it('returns a symbol drawn from the ROOTS x QUALITY_SUFFIXES space', () => {
		const question = generateQuestion();
		expect(spellChord(question.symbol).recognized).toBe(true);
	});

	it('construction questions have no choices', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0); // forces pickQuestionType -> 'construction'
		const question = generateQuestion();
		expect(question.kind).toBe('construction');
		expect(question.choices).toBeUndefined();
		vi.restoreAllMocks();
	});

	it('identification questions have 4 choices including the symbol, plus 3 distractors', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.99); // forces pickQuestionType -> 'identification'
		const question = generateQuestion();
		vi.restoreAllMocks();
		expect(question.kind).toBe('identification');
		expect(question.choices).toBeDefined();
		expect(question.choices).toHaveLength(4);
		expect(question.choices).toContain(question.symbol);
	});

	it('every generated symbol is a member of ROOTS x QUALITY_SUFFIXES', () => {
		for (let i = 0; i < 20; i++) {
			const question = generateQuestion();
			const matches = ROOTS.some((root) =>
				QUALITY_SUFFIXES.some((quality) => `${root}${quality}` === question.symbol)
			);
			expect(matches).toBe(true);
		}
	});
});

describe('generateQuestion practice-pool seam (Track B)', () => {
	it('uses the provided symbol instead of drawing from randomChord', () => {
		const question = generateQuestion({ symbol: 'F#m7b5', kind: 'construction' });
		expect(question.symbol).toBe('F#m7b5');
		expect(question.kind).toBe('construction');
		expect(question.choices).toBeUndefined();
	});

	it('builds identification choices around a provided symbol', () => {
		const question = generateQuestion({ symbol: 'Cm7', kind: 'identification' });
		expect(question.symbol).toBe('Cm7');
		expect(question.choices).toHaveLength(4);
		expect(question.choices).toContain('Cm7');
	});

	it('a provided symbol with a random kind still yields a valid question', () => {
		const question = generateQuestion({ symbol: 'Bbmaj7' });
		expect(question.symbol).toBe('Bbmaj7');
		expect(['construction', 'identification']).toContain(question.kind);
		if (question.kind === 'identification') {
			expect(question.choices).toContain('Bbmaj7');
		}
	});
});
