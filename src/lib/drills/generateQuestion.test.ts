import { describe, expect, it, vi } from 'vitest';
import {
	generateQuestion,
	pickDistractors,
	pickQuestionFamily,
	pickQuestionType
} from './generateQuestion';
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

	// Shared-root rule (Sketch 002 session): all four "Name this chord" options
	// share the correct answer's root, differing only in quality. The keyboard
	// reveals the root, so mixed-root options let the user deduce the answer
	// without identifying the quality - which is the whole skill. Same root
	// forces a real quality read.
	// Longest-match so a bare "F" prefix does not shadow "F#"/"Bb".
	function rootOf(symbol: string): string {
		const matches = ROOTS.filter((r) => symbol.startsWith(r)).sort((a, b) => b.length - a.length);
		if (matches.length === 0) throw new Error(`no root in ${symbol}`);
		return matches[0];
	}

	it('every distractor shares the correct answer root, differing only in quality', () => {
		for (const correct of ['Cm7', 'F#maj7', 'Bb7', 'G', 'Abm7b5', 'Ddim7']) {
			const root = rootOf(correct);
			const correctQuality = correct.slice(root.length);
			const distractors = pickDistractors(correct);
			expect(distractors).toHaveLength(3);
			for (const d of distractors) {
				expect(rootOf(d)).toBe(root);
				expect(d.slice(root.length)).not.toBe(correctQuality);
			}
			// and they remain distinct qualities from each other
			expect(new Set(distractors.map((d) => d.slice(root.length))).size).toBe(distractors.length);
		}
	});

	it('handles two-character roots (sharps/flats) without leaking a different root', () => {
		const distractors = pickDistractors('F#m7');
		for (const d of distractors) {
			expect(d.startsWith('F#')).toBe(true);
		}
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

// DrillQuestion is a discriminated union on `kind: 'chord' | 'interval'`
// (Track C): the chord path keeps its exact draw order and behavior, with the
// old top-level kind renamed to `direction`. These assertions were updated
// deliberately for the union shape at the integration merge.
describe('generateQuestion (chord path, no options)', () => {
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
			if (question.kind !== 'chord') throw new Error('optionless calls must stay chord-only');
			const matches = ROOTS.some((root) =>
				QUALITY_SUFFIXES.some((quality) => `${root}${quality}` === question.symbol)
			);
			expect(matches).toBe(true);
		}
	});
});

// Track B's pool seam, adapted at the integration merge: the option that
// forces the chord direction is now named `direction` (the union claimed
// `kind` for the chord/interval discriminant).
describe('generateQuestion practice-pool seam (Track B)', () => {
	it('uses the provided symbol instead of drawing from randomChord', () => {
		const question = generateQuestion({ symbol: 'F#m7b5', direction: 'construction' });
		expect(question.kind).toBe('chord');
		if (question.kind !== 'chord') throw new Error('unreachable');
		expect(question.symbol).toBe('F#m7b5');
		expect(question.direction).toBe('construction');
		expect(question.choices).toBeUndefined();
	});

	it('builds identification choices around a provided symbol', () => {
		const question = generateQuestion({ symbol: 'Cm7', direction: 'identification' });
		expect(question.kind).toBe('chord');
		if (question.kind !== 'chord') throw new Error('unreachable');
		expect(question.symbol).toBe('Cm7');
		expect(question.choices).toHaveLength(4);
		expect(question.choices).toContain('Cm7');
	});

	it('a provided symbol with a random direction still yields a valid chord question', () => {
		const question = generateQuestion({ symbol: 'Bbmaj7' });
		expect(question.kind).toBe('chord');
		if (question.kind !== 'chord') throw new Error('unreachable');
		expect(question.symbol).toBe('Bbmaj7');
		expect(['construction', 'identification']).toContain(question.direction);
		if (question.direction === 'identification') {
			expect(question.choices).toContain('Bbmaj7');
		}
	});

	it('a provided symbol always forces a chord question, even in interval-leaning modes', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.99);
		expect(generateQuestion({ symbol: 'Cm7', mode: 'mix' }).kind).toBe('chord');
		expect(generateQuestion({ symbol: 'Cm7', mode: 'intervals' }).kind).toBe('chord');
		vi.restoreAllMocks();
	});
});

describe('generateQuestion modes (CHORDS / INTERVALS / MIX, Track C)', () => {
	it("mode 'chords' never yields an interval question", () => {
		for (let i = 0; i < 20; i++) {
			expect(generateQuestion({ mode: 'chords' }).kind).toBe('chord');
		}
	});

	it("mode 'intervals' always yields an interval question", () => {
		for (let i = 0; i < 20; i++) {
			expect(generateQuestion({ mode: 'intervals' }).kind).toBe('interval');
		}
	});

	it("mode 'mix' draws the family first: a low draw yields chord, a high draw yields interval", () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.1);
		expect(generateQuestion({ mode: 'mix' }).kind).toBe('chord');
		vi.restoreAllMocks();

		vi.spyOn(Math, 'random').mockReturnValue(0.9);
		expect(generateQuestion({ mode: 'mix' }).kind).toBe('interval');
		vi.restoreAllMocks();
	});
});

describe('pickQuestionFamily', () => {
	it('chord-only and interval-only modes consume no randomness', () => {
		const spy = vi.spyOn(Math, 'random');
		expect(pickQuestionFamily('chords')).toBe('chord');
		expect(pickQuestionFamily('intervals')).toBe('interval');
		expect(spy).not.toHaveBeenCalled();
		vi.restoreAllMocks();
	});

	it('mix spends exactly one 50/50 draw', () => {
		const spy = vi.spyOn(Math, 'random').mockReturnValue(0.2);
		expect(pickQuestionFamily('mix')).toBe('chord');
		expect(spy).toHaveBeenCalledTimes(1);
		vi.restoreAllMocks();

		vi.spyOn(Math, 'random').mockReturnValue(0.8);
		expect(pickQuestionFamily('mix')).toBe('interval');
		vi.restoreAllMocks();
	});
});
