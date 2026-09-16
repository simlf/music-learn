import { describe, expect, it } from 'vitest';
import {
	chordScaleSymbols,
	generateChordScaleQuestion,
	gradeChordScaleTap,
	isChordScaleQuestionAnswerable
} from './chordScaleQuestion';
import { allFacts } from '$lib/srs/facts';

/**
 * The pure half of the CHORD-SCALE practice family: the generator's total
 * coverage over the catalog's chord-formula facts, and the grader's chroma
 * discipline (correct/close/wrong via verdictForLetter).
 */

describe('generateChordScaleQuestion / isChordScaleQuestionAnswerable', () => {
	it('resolves a minor seventh chord to dorian, the family default', () => {
		const question = generateChordScaleQuestion('Dm7');
		expect(question.kind).toBe('chord-scale');
		expect(isChordScaleQuestionAnswerable(question)).toBe(true);
		expect(question.scale?.id).toBe('dorian');
		expect(question.scale?.notes).toHaveLength(7);
	});

	it('resolves a dominant seventh chord to mixolydian', () => {
		const question = generateChordScaleQuestion('G7');
		expect(question.scale?.id).toBe('mixolydian');
	});

	it('resolves a major seventh chord to ionian', () => {
		const question = generateChordScaleQuestion('Cmaj7');
		expect(question.scale?.id).toBe('ionian');
	});

	it('resolves a half-diminished chord to locrian', () => {
		const question = generateChordScaleQuestion('F♯ø7');
		expect(question.scale?.id).toBe('locrian');
	});

	it('is total: an unrecognized symbol yields an unanswerable question, never a throw', () => {
		const question = generateChordScaleQuestion('zzz');
		expect(isChordScaleQuestionAnswerable(question)).toBe(false);
		expect(gradeChordScaleTap(question, 'C')).toBe('wrong');
	});

	it('is total: a family with no honest scale answer (diminished) yields an unanswerable question', () => {
		const question = generateChordScaleQuestion('Cdim7');
		expect(question.guide?.family).toBe('diminished');
		expect(isChordScaleQuestionAnswerable(question)).toBe(false);
	});
});

describe('gradeChordScaleTap (chroma via verdictForLetter, never letter strings)', () => {
	it('grades a genuinely outside note correct: F♯ over Dm7 (D dorian has no F♯)', () => {
		const question = generateChordScaleQuestion('Dm7');
		expect(gradeChordScaleTap(question, 'F♯')).toBe('correct');
	});

	it('accepts an enharmonic spelling of the same outside pitch class', () => {
		const question = generateChordScaleQuestion('Dm7');
		// D dorian omits G♯/A♭ (chroma 8): both spellings must grade identically.
		expect(gradeChordScaleTap(question, 'G♯')).toBe('correct');
		expect(gradeChordScaleTap(question, 'A♭')).toBe('correct');
	});

	it('grades the classic careful note close: F over Cmaj7 (a half step above the 3rd)', () => {
		const question = generateChordScaleQuestion('Cmaj7');
		expect(gradeChordScaleTap(question, 'F')).toBe('close');
	});

	it('grades a chord tone wrong: C (the root) over Cmaj7', () => {
		const question = generateChordScaleQuestion('Cmaj7');
		expect(gradeChordScaleTap(question, 'C')).toBe('wrong');
	});

	it('grades a plain in-scale color tone wrong: D (the 9) over Cmaj7', () => {
		const question = generateChordScaleQuestion('Cmaj7');
		expect(gradeChordScaleTap(question, 'D')).toBe('wrong');
	});

	it('grades an unparseable tap wrong rather than throwing', () => {
		const question = generateChordScaleQuestion('Dm7');
		expect(gradeChordScaleTap(question, 'zzz')).toBe('wrong');
		expect(gradeChordScaleTap(question, '')).toBe('wrong');
	});
});

describe('chordScaleSymbols', () => {
	it('lists only catalog chord-formula symbols the guide can actually drill', () => {
		const symbols = chordScaleSymbols();
		expect(symbols.length).toBeGreaterThan(0);
		for (const symbol of symbols) {
			const question = generateChordScaleQuestion(symbol);
			expect(isChordScaleQuestionAnswerable(question), symbol).toBe(true);
		}
	});

	it('excludes every catalog symbol the guide declines (diminished/augmented/no honest answer)', () => {
		const symbols = new Set(chordScaleSymbols());
		const chordFacts = allFacts().filter((fact) => fact.factKind === 'chord-formula');
		for (const fact of chordFacts) {
			if (fact.factKind !== 'chord-formula') continue;
			const question = generateChordScaleQuestion(fact.symbol);
			expect(symbols.has(fact.symbol), fact.symbol).toBe(isChordScaleQuestionAnswerable(question));
		}
	});
});
