import { describe, it, expect } from 'vitest';
import {
	shellNotes,
	rootlessNotes,
	fullStackNotes,
	optionalMarkers,
	voicingStageForChord,
	seventhChordSymbols
} from './shellVoicing';
import { spellChord } from '$lib/theory/chord';
import { newCard, State } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';

/**
 * Contract-pinning suite for the sketch-019 "shell voicings, staged by card
 * state" drill engine (SK-019). Written FIRST against not-yet-existing
 * exports from $lib/practice/shellVoicing (RED) - see Task 2 for the GREEN
 * implementation.
 *
 * Fixed instant for CardRecord fixtures (mirrors deck.test.ts's now0/
 * recallSession.test.ts's NOW convention). Only the `state` field matters
 * for the staging assertions below; every other field comes from the real
 * newCard() so fixtures stay structurally valid CardRecords.
 */
const now0 = new Date('2026-07-20T00:00:00.000Z');

function makeCard(state: State): CardRecord {
	return {
		...newCard(now0),
		factId: 'chord-formula:Cm7',
		factKind: 'chord-formula',
		mode: 'formula',
		lastRating: null,
		masteryDayCount: 0,
		state
	};
}

describe('shellVoicing', () => {
	describe('shellNotes', () => {
		it('returns the third + seventh only, in ascending role order, for Cm7 (2 entries)', () => {
			const notes = shellNotes(spellChord('Cm7'));
			expect(notes).toHaveLength(2);
			expect(notes.map((n) => n.role)).toEqual(['third', 'seventh']);
			expect(notes.map((n) => n.letter)).toEqual(['E♭', 'B♭']);
		});

		it('is total: a plain triad with no seventh returns only the guide tones available, without throwing', () => {
			expect(() => shellNotes(spellChord('C'))).not.toThrow();
			const notes = shellNotes(spellChord('C'));
			expect(notes.map((n) => n.role)).toEqual(['third']);
			expect(notes.map((n) => n.letter)).toEqual(['E']);
		});
	});

	describe('rootlessNotes', () => {
		it('drops the root, keeping third + fifth + seventh for Cmaj7 (3 entries)', () => {
			const notes = rootlessNotes(spellChord('Cmaj7'));
			expect(notes).toHaveLength(3);
			expect(notes.map((n) => n.role)).toEqual(['third', 'fifth', 'seventh']);
			expect(notes.map((n) => n.letter)).toEqual(['E', 'G', 'B']);
		});
	});

	describe('fullStackNotes', () => {
		it('returns all four role notes root/third/fifth/seventh in order for Cm7', () => {
			const notes = fullStackNotes(spellChord('Cm7'));
			expect(notes).toHaveLength(4);
			expect(notes.map((n) => n.role)).toEqual(['root', 'third', 'fifth', 'seventh']);
			expect(notes.map((n) => n.letter)).toEqual(['C', 'E♭', 'G', 'B♭']);
		});
	});

	describe('optionalMarkers', () => {
		it('marks the root R and the fifth 5 for Cm7 (2 entries)', () => {
			const markers = optionalMarkers(spellChord('Cm7'));
			expect(markers).toEqual([
				{ letter: 'C', marker: 'R' },
				{ letter: 'G', marker: '5' }
			]);
		});
	});

	describe('voicingStageForChord', () => {
		it("returns 'meet' for an empty card set", () => {
			expect(voicingStageForChord([])).toBe('meet');
		});

		it("returns 'meet' when every card is State.New", () => {
			expect(voicingStageForChord([makeCard(State.New), makeCard(State.New)])).toBe('meet');
		});

		it("returns 'drill' when any card is State.Review", () => {
			expect(voicingStageForChord([makeCard(State.New), makeCard(State.Review)])).toBe('drill');
		});

		it("returns 'drill' even amid a mix of Learning and Review", () => {
			expect(voicingStageForChord([makeCard(State.Learning), makeCard(State.Review)])).toBe(
				'drill'
			);
		});

		it("returns 'subtract' when a card has advanced past New (e.g. Learning) but none is Review yet", () => {
			expect(voicingStageForChord([makeCard(State.Learning)])).toBe('subtract');
			expect(voicingStageForChord([makeCard(State.New), makeCard(State.Learning)])).toBe(
				'subtract'
			);
		});
	});

	describe('seventhChordSymbols', () => {
		it('returns only chord-formula symbols spellChord recognizes as having a seventh', () => {
			const symbols = seventhChordSymbols();
			expect(symbols.length).toBeGreaterThan(0);
			for (const symbol of symbols) {
				const chord = spellChord(symbol);
				expect(chord.recognized).toBe(true);
				expect(chord.notes.some((n) => n.role === 'seventh')).toBe(true);
			}
		});

		it('excludes plain triads (e.g. C, Cm, Cdim never appear)', () => {
			const symbols = new Set(seventhChordSymbols());
			expect(symbols.has('C')).toBe(false);
			expect(symbols.has('Cm')).toBe(false);
			expect(symbols.has('Cdim')).toBe(false);
		});

		it('includes representative seventh-family symbols', () => {
			const symbols = new Set(seventhChordSymbols());
			expect(symbols.has('Cmaj7')).toBe(true);
			expect(symbols.has('Cm7')).toBe(true);
			expect(symbols.has('C7')).toBe(true);
			expect(symbols.has('Cm7b5')).toBe(true);
			expect(symbols.has('Cdim7')).toBe(true);
		});
	});
});
