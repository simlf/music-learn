import { describe, it, expect } from 'vitest';
import { Chord, ChordType, Interval, Note } from 'tonal';
import {
	shellNotes,
	rootlessNotes,
	fullStackNotes,
	hasDrillableShell,
	hasFlatFifth,
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

	/**
	 * BUG PIN (music-theory audit, Bug E): fullStackNotes filtered to
	 * root/third/fifth/seventh, so any tone outside those four roles silently
	 * vanished from the chord's own "full stack" - the voicing card captioned
	 * "WHAT YOU KNOW". Verified by executing the real function:
	 *
	 *   fullStackNotes(spellChord('C6'))   before  [C, E, G]      (A gone)
	 *   fullStackNotes(spellChord('C69'))  before  [C, E, G]      (A, D gone)
	 *   fullStackNotes(spellChord('C13'))  before  [C, E, G, B♭]  (D, A gone)
	 *
	 * Latent today (seventhChordSymbols gates the pool to the 12x5 seventh
	 * matrix) but it blocks the queued chart-vocabulary expansion to
	 * 6 / m6 / sus4 / add9 / 9 / 13 / m(maj7).
	 */
	describe('fullStackNotes: keeps every tone the chord spells (music-theory audit Bug E)', () => {
		it('C6 keeps its 6th, C69 keeps 6th + 9th, C13 keeps 9th + 13th', () => {
			expect(fullStackNotes(spellChord('C6')).map((n) => n.letter)).toEqual(['C', 'E', 'G', 'A']);
			expect(fullStackNotes(spellChord('C69')).map((n) => n.letter)).toEqual([
				'C',
				'E',
				'G',
				'A',
				'D'
			]);
			expect(fullStackNotes(spellChord('C13')).map((n) => n.letter)).toEqual([
				'C',
				'E',
				'G',
				'B♭',
				'D',
				'A'
			]);
			expect(fullStackNotes(spellChord('Csus4')).map((n) => n.letter)).toEqual(['C', 'F', 'G']);
			expect(fullStackNotes(spellChord('Cadd9')).map((n) => n.letter)).toEqual([
				'C',
				'E',
				'G',
				'D'
			]);
		});

		it('is the chord’s whole note set for every chord type tonal knows, never a subset', () => {
			let checked = 0;
			for (const type of ChordType.all()) {
				const chord = spellChord('C' + (type.aliases[0] ?? ''));
				if (!chord.recognized) continue;
				checked++;
				expect(fullStackNotes(chord).map((n) => n.letter), chord.symbol).toEqual(
					chord.notes.map((n) => n.letter)
				);
			}
			expect(checked).toBeGreaterThan(100);
		});

		it('does not alias the chord’s own note array: mutating the result cannot corrupt the chord', () => {
			const chord = spellChord('Cm7');
			const stack = fullStackNotes(chord);
			stack.pop();
			expect(chord.notes).toHaveLength(4);
		});

		it('the seventh matrix is byte-identical: root/third/fifth/seventh, exactly as before', () => {
			for (const symbol of seventhChordSymbols()) {
				const chord = spellChord(symbol);
				expect(fullStackNotes(chord).map((n) => n.role), symbol).toEqual([
					'root',
					'third',
					'fifth',
					'seventh'
				]);
			}
		});
	});

	/**
	 * BUG PIN (music-theory audit, Bug E, second half): a chord whose shell has
	 * fewer than two notes has no answerable "play the guide tones" question.
	 *
	 *   shellNotes(spellChord('C6'))         [E♭-style single tone: [E]]
	 *   shellNotes(spellChord('Csus4'))      []
	 *   optionalMarkers(spellChord('Csus4')) [C:R, G:5]  -> everything optional
	 *
	 * With an empty target matchChord rejects every play, so the learner is
	 * stuck in a retry loop with nothing required.
	 */
	describe('hasDrillableShell (music-theory audit Bug E)', () => {
		it('is false for the chords whose shell falls short, with the audit’s exact shells', () => {
			expect(shellNotes(spellChord('C6')).map((n) => n.letter)).toEqual(['E']);
			expect(shellNotes(spellChord('Csus4'))).toEqual([]);
			expect(hasDrillableShell(spellChord('C6'))).toBe(false);
			expect(hasDrillableShell(spellChord('C69'))).toBe(false);
			expect(hasDrillableShell(spellChord('Cm6'))).toBe(false);
			expect(hasDrillableShell(spellChord('Csus4'))).toBe(false);
			expect(hasDrillableShell(spellChord('Cadd9'))).toBe(false);
			expect(hasDrillableShell(spellChord('C'))).toBe(false);
		});

		it('is true for every symbol the drill actually draws today', () => {
			const symbols = seventhChordSymbols();
			expect(symbols.length).toBeGreaterThan(0);
			for (const symbol of symbols) {
				expect(hasDrillableShell(spellChord(symbol)), symbol).toBe(true);
			}
		});

		it('is true for the seventh-bearing qualities the queued expansion adds', () => {
			for (const symbol of ['C9', 'C13', 'Cm13', 'CmMaj7', 'C7#11', 'C7b9']) {
				expect(hasDrillableShell(spellChord(symbol)), symbol).toBe(true);
			}
		});

		it('is total: an unrecognized chord is simply not drillable, never throws', () => {
			expect(() => hasDrillableShell(spellChord('nonsense'))).not.toThrow();
			expect(hasDrillableShell(spellChord('nonsense'))).toBe(false);
		});

		it('extends 6a13ade rather than reverting it: a ♭5 chord is drillable on its 3-note shell, and its ♭5 is never ghosted', () => {
			for (const root of ['C', 'F#', 'Bb']) {
				for (const family of ['m7b5', 'dim7']) {
					const chord = spellChord(root + family);
					expect(shellNotes(chord).map((n) => n.role), root + family).toEqual([
						'third',
						'fifth',
						'seventh'
					]);
					expect(hasDrillableShell(chord), root + family).toBe(true);
					expect(optionalMarkers(chord).map((m) => m.marker), root + family).toEqual(['R']);
				}
			}
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

/**
 * BUG PIN (pedagogy audit, shell-voicing rationale). The subtract stage
 * rendered ONE rationale for all five seventh families:
 *
 *   en 'Drop what the symbol already tells you: root is named, fifth adds no
 *       color; keep the 3rd + 7th tritone.'
 *   fr "... la quinte n'ajoute pas de couleur. Garde le triton tierce et
 *       septième."
 *
 * Both halves were false for 3 of the 5 families:
 *
 *   (a) the 3rd-to-7th interval is a tritone ONLY in dom7 and dim7. In maj7,
 *       m7 and m7b5 it is a PERFECT FIFTH. Calling every shell a tritone
 *       destroys the very insight the dominant lesson is built on.
 *   (b) on m7b5 and dim7 the ♭5 is the chord's identity, not colorless filler,
 *       and shellNotes' 3rd+7th-only set made the shell of Cm7b5 chroma
 *       identical to the shell of Cm7.
 *
 * These tests are the per-quality lock on both facts. Interval truth comes
 * from tonal directly, never from the app's own interval module.
 */
describe('shell rationale: per-quality musical facts (pedagogy audit bug pin)', () => {
	/** randomChord.ts's 12 catalog roots. */
	const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
	/** The five seventh families this drill draws from (seventhChordSymbols). */
	const SEVENTHS = ['maj7', 'm7', '7', 'm7b5', 'dim7'];
	/** The only two families whose 3rd-to-7th span is a tritone. */
	const TRITONE_FAMILIES = new Set(['7', 'dim7']);
	/** The only two families whose fifth is diminished. */
	const FLAT5_FAMILIES = new Set(['m7b5', 'dim7']);

	function chromaOf(notes: { letter: string }[]): number[] {
		return notes.map((note) => Note.chroma(note.letter.replace(/♯/g, '#').replace(/♭/g, 'b'))!);
	}

	it('the 3rd-to-7th interval is a tritone ONLY in dom7 and dim7: a perfect fifth in maj7, m7 and m7b5', () => {
		for (const root of ROOTS) {
			for (const family of SEVENTHS) {
				const notes = Chord.get(root + family).notes;
				const span = Interval.get(Interval.distance(notes[1], notes[3]));
				const where = `${root}${family}`;
				if (TRITONE_FAMILIES.has(family)) {
					expect(span.semitones, where).toBe(6);
				} else {
					expect(span.semitones, where).toBe(7);
					expect(span.name, where).toBe('5P');
				}
			}
		}
	});

	it('hasFlatFifth is true for exactly m7b5 + dim7, on all 12 roots, and alias spellings agree', () => {
		for (const root of ROOTS) {
			for (const family of SEVENTHS) {
				const symbol = root + family;
				expect(hasFlatFifth(spellChord(symbol)), symbol).toBe(FLAT5_FAMILIES.has(family));
			}
		}
		// The ø / ° alias spellings resolve to the same answer (interval-derived,
		// never a "b5" substring match on the symbol).
		expect(hasFlatFifth(spellChord('Cø7'))).toBe(true);
		expect(hasFlatFifth(spellChord('C°7'))).toBe(true);
		// Total: no fifth role, or an unrecognized chord, is simply not ♭5.
		expect(hasFlatFifth(spellChord('nonsense'))).toBe(false);
	});

	it('the ♭5 families keep the fifth in the shell; the others stay 3rd + 7th', () => {
		for (const root of ROOTS) {
			for (const family of SEVENTHS) {
				const symbol = root + family;
				const roles = shellNotes(spellChord(symbol)).map((note) => note.role);
				expect(roles, symbol).toEqual(
					FLAT5_FAMILIES.has(family)
						? ['third', 'fifth', 'seventh']
						: ['third', 'seventh']
				);
			}
		}
		expect(shellNotes(spellChord('Cm7b5')).map((n) => n.letter)).toEqual(['E♭', 'G♭', 'B♭']);
		expect(shellNotes(spellChord('Cdim7')).map((n) => n.letter)).toEqual(['E♭', 'G♭', 'B♭♭']);
	});

	it('the m7b5 shell is no longer chroma-identical to the m7 shell on any root', () => {
		for (const root of ROOTS) {
			const half = chromaOf(shellNotes(spellChord(`${root}m7b5`)));
			const minor = chromaOf(shellNotes(spellChord(`${root}m7`)));
			expect(half, root).not.toEqual(minor);
			// The ♭5 is exactly what distinguishes them.
			const fifthChroma = chromaOf([spellChord(`${root}m7b5`).notes[2]]);
			expect(half, root).toContain(fifthChroma[0]);
			expect(minor, root).not.toContain(fifthChroma[0]);
		}
	});

	it('a ♭5 chord ghost-hatches the root ONLY: the ♭5 is never marked droppable', () => {
		for (const root of ROOTS) {
			for (const family of FLAT5_FAMILIES) {
				const symbol = root + family;
				const markers = optionalMarkers(spellChord(symbol));
				expect(markers.map((m) => m.marker), symbol).toEqual(['R']);
			}
			// Regression: the perfect-fifth families still ghost root + fifth.
			for (const family of ['maj7', 'm7', '7']) {
				const symbol = root + family;
				expect(optionalMarkers(spellChord(symbol)).map((m) => m.marker), symbol).toEqual([
					'R',
					'5'
				]);
			}
		}
	});

	it('nothing required is ever also optional: the ghost set and the shell set never intersect', () => {
		for (const root of ROOTS) {
			for (const family of SEVENTHS) {
				const symbol = root + family;
				const chord = spellChord(symbol);
				const shell = new Set(chromaOf(shellNotes(chord)));
				for (const chroma of chromaOf(optionalMarkers(chord))) {
					expect(shell.has(chroma), `${symbol} ghost ${chroma}`).toBe(false);
				}
			}
		}
	});

	it('the perfect-fifth families are untouched: Cmaj7/Ebmaj7/G7 shells are byte-identical to before', () => {
		expect(shellNotes(spellChord('Cmaj7')).map((n) => n.letter)).toEqual(['E', 'B']);
		expect(shellNotes(spellChord('Ebmaj7')).map((n) => n.letter)).toEqual(['G', 'D']);
		expect(shellNotes(spellChord('G7')).map((n) => n.letter)).toEqual(['B', 'F']);
		expect(shellNotes(spellChord('Cm7')).map((n) => n.letter)).toEqual(['E♭', 'B♭']);
	});
});
