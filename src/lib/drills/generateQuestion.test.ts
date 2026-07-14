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

// DrillQuestion is now a discriminated union on `kind: 'chord' | 'interval'`
// (Track C): the chord path keeps its exact draw order and behavior, with the
// old top-level kind renamed to `direction`. These assertions were updated
// deliberately for the union shape.
describe('generateQuestion (chord path, default mode)', () => {
	it('returns a symbol drawn from the ROOTS x QUALITY_SUFFIXES space', () => {
		const question = generateQuestion();
		expect(question.kind).toBe('chord');
		if (question.kind !== 'chord') throw new Error('unreachable');
		expect(spellChord(question.symbol).recognized).toBe(true);
	});

	it('construction questions have no choices', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0); // forces pickQuestionType -> 'construction'
		const question = generateQuestion();
		expect(question.kind).toBe('chord');
		if (question.kind !== 'chord') throw new Error('unreachable');
		expect(question.direction).toBe('construction');
		expect(question.choices).toBeUndefined();
		vi.restoreAllMocks();
	});

	it('identification questions have 4 choices including the symbol, plus 3 distractors', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.99); // forces pickQuestionType -> 'identification'
		const question = generateQuestion();
		vi.restoreAllMocks();
		expect(question.kind).toBe('chord');
		if (question.kind !== 'chord') throw new Error('unreachable');
		expect(question.direction).toBe('identification');
		expect(question.choices).toBeDefined();
		expect(question.choices).toHaveLength(4);
		expect(question.choices).toContain(question.symbol);
	});

	it('every generated symbol is a member of ROOTS x QUALITY_SUFFIXES', () => {
		for (let i = 0; i < 20; i++) {
			const question = generateQuestion();
			if (question.kind !== 'chord') throw new Error('default mode must stay chord-only');
			const matches = ROOTS.some((root) =>
				QUALITY_SUFFIXES.some((quality) => `${root}${quality}` === question.symbol)
			);
			expect(matches).toBe(true);
		}
	});
});

describe('generateQuestion modes (CHORDS / INTERVALS / MIX)', () => {
	it("mode 'chords' never yields an interval question", () => {
		for (let i = 0; i < 20; i++) {
			expect(generateQuestion('chords').kind).toBe('chord');
		}
	});

	it("mode 'intervals' always yields an interval question", () => {
		for (let i = 0; i < 20; i++) {
			const question = generateQuestion('intervals');
			expect(question.kind).toBe('interval');
		}
	});

	it("mode 'mix' draws the family first: a low draw yields chord, a high draw yields interval", () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.1);
		expect(generateQuestion('mix').kind).toBe('chord');
		vi.restoreAllMocks();

		vi.spyOn(Math, 'random').mockReturnValue(0.9);
		expect(generateQuestion('mix').kind).toBe('interval');
		vi.restoreAllMocks();
	});
});
