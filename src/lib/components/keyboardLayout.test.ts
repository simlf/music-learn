import { describe, expect, it } from 'vitest';
import {
	assignNotesToKeys,
	blackKeysForOctaves,
	fitsWithoutScrolling,
	MIN_WHITE_KEY_PX,
	minBoardWidthPx,
	octavesForWidth,
	whiteKeyCountForOctaves,
	whiteLettersForOctaves
} from './keyboardLayout';
import { spellChord } from '$lib/theory/chord';
import { MAJOR_SCALE_ROOTS, majorScaleNotes } from '$lib/theory/scale';
import type { SpelledNote } from '$lib/theory/types';

describe('octavesForWidth', () => {
	it('returns 1 below the two-octave fit width (15 * 44px = 660px)', () => {
		expect(octavesForWidth(390)).toBe(1);
		expect(octavesForWidth(659)).toBe(1);
	});

	it('returns 2 at or above the two-octave fit width', () => {
		expect(octavesForWidth(660)).toBe(2);
		expect(octavesForWidth(1200)).toBe(2);
	});

	it('never returns 0 (1 is the floor)', () => {
		expect(octavesForWidth(0)).toBe(1);
		expect(octavesForWidth(-100)).toBe(1);
	});
});

/**
 * The one-octave span never had its own minimum-width test: `octavesForWidth`
 * checked only `width >= 15 * 44` and returned 1 as an UNCONDITIONAL fallback,
 * so nothing verified that one octave's 8 white keys still need 8 * 44 = 352px.
 * Measured settled (post-animation) in real Chromium before the fix: 320px
 * viewport -> 304px container -> 38.00px keys; 360px -> 344px -> 43.00px. Both
 * under the floor this module declares via `minWhiteKeyPx`. The two-octave
 * branch was fine precisely because it WAS guarded.
 */
describe('the fingertip floor for both spans', () => {
	it('counts 8 white keys for one octave and 15 for two', () => {
		expect(whiteKeyCountForOctaves(1)).toBe(8);
		expect(whiteKeyCountForOctaves(2)).toBe(15);
		expect(whiteKeyCountForOctaves(1)).toBe(whiteLettersForOctaves(1).length);
		expect(whiteKeyCountForOctaves(2)).toBe(whiteLettersForOctaves(2).length);
	});

	it('requires 352px for one octave and 660px for two at the 44px floor', () => {
		expect(MIN_WHITE_KEY_PX).toBe(44);
		expect(minBoardWidthPx(1)).toBe(352);
		expect(minBoardWidthPx(2)).toBe(660);
		expect(minBoardWidthPx(1, 24)).toBe(192);
	});

	it('reports that one octave does NOT fit the widths that measurably broke the floor', () => {
		// Real container widths measured at 320px and 360px viewports.
		expect(fitsWithoutScrolling(1, 304)).toBe(false);
		expect(fitsWithoutScrolling(1, 344)).toBe(false);
		expect(fitsWithoutScrolling(1, 351.9)).toBe(false);
	});

	it('reports that one octave DOES fit from 352px up (375px-class phones always did)', () => {
		expect(fitsWithoutScrolling(1, 352)).toBe(true);
		expect(fitsWithoutScrolling(1, 359)).toBe(true); // 375px viewport
		expect(fitsWithoutScrolling(1, 374)).toBe(true); // 390px viewport
	});

	it('guards the two-octave span with the same test octavesForWidth uses', () => {
		expect(fitsWithoutScrolling(2, 659)).toBe(false);
		expect(fitsWithoutScrolling(2, 660)).toBe(true);
		for (const width of [0, 100, 351, 352, 500, 659, 660, 1200]) {
			expect(octavesForWidth(width), `${width}px`).toBe(fitsWithoutScrolling(2, width) ? 2 : 1);
		}
	});

	it('honors a custom floor in both the span choice and the board minimum', () => {
		// A caller lowering the floor to 24px fits two octaves in 360px.
		expect(octavesForWidth(360, 24)).toBe(2);
		expect(fitsWithoutScrolling(1, 200, 24)).toBe(true);
	});

	it('never lets the board minimum drop below what the declared floor needs', () => {
		// The invariant the old code broke: whatever span is chosen, the board's
		// minimum width is that span's key count times the floor - so a container
		// too narrow for it scrolls instead of shrinking keys below the floor.
		for (const width of [0, 200, 304, 344, 352, 400, 660, 1280]) {
			const octaves = octavesForWidth(width);
			const boardWidth = Math.max(width, minBoardWidthPx(octaves));
			expect(boardWidth / whiteKeyCountForOctaves(octaves), `${width}px`).toBeGreaterThanOrEqual(
				MIN_WHITE_KEY_PX
			);
		}
	});
});

describe('whiteLettersForOctaves', () => {
	it('has length 8 for one octave (C D E F G A B C)', () => {
		const letters = whiteLettersForOctaves(1);
		expect(letters).toHaveLength(8);
		expect(letters).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C']);
	});

	it('has length 15 for two octaves and equals today\'s literal exactly', () => {
		const letters = whiteLettersForOctaves(2);
		expect(letters).toHaveLength(15);
		expect(letters).toEqual([
			'C',
			'D',
			'E',
			'F',
			'G',
			'A',
			'B',
			'C',
			'D',
			'E',
			'F',
			'G',
			'A',
			'B',
			'C'
		]);
	});
});

describe('blackKeysForOctaves', () => {
	it('has 5 entries for one octave', () => {
		const blackKeys = blackKeysForOctaves(1);
		expect(blackKeys).toHaveLength(5);
		expect(blackKeys).toEqual([
			{ afterWhiteIndex: 0, sharpLetter: 'C♯', flatLetter: 'D♭' },
			{ afterWhiteIndex: 1, sharpLetter: 'D♯', flatLetter: 'E♭' },
			{ afterWhiteIndex: 3, sharpLetter: 'F♯', flatLetter: 'G♭' },
			{ afterWhiteIndex: 4, sharpLetter: 'G♯', flatLetter: 'A♭' },
			{ afterWhiteIndex: 5, sharpLetter: 'A♯', flatLetter: 'B♭' }
		]);
	});

	it('has 10 entries for two octaves and equals today\'s literal exactly', () => {
		const blackKeys = blackKeysForOctaves(2);
		expect(blackKeys).toHaveLength(10);
		expect(blackKeys).toEqual([
			{ afterWhiteIndex: 0, sharpLetter: 'C♯', flatLetter: 'D♭' },
			{ afterWhiteIndex: 1, sharpLetter: 'D♯', flatLetter: 'E♭' },
			{ afterWhiteIndex: 3, sharpLetter: 'F♯', flatLetter: 'G♭' },
			{ afterWhiteIndex: 4, sharpLetter: 'G♯', flatLetter: 'A♭' },
			{ afterWhiteIndex: 5, sharpLetter: 'A♯', flatLetter: 'B♭' },
			{ afterWhiteIndex: 7, sharpLetter: 'C♯', flatLetter: 'D♭' },
			{ afterWhiteIndex: 8, sharpLetter: 'D♯', flatLetter: 'E♭' },
			{ afterWhiteIndex: 10, sharpLetter: 'F♯', flatLetter: 'G♭' },
			{ afterWhiteIndex: 11, sharpLetter: 'G♯', flatLetter: 'A♭' },
			{ afterWhiteIndex: 12, sharpLetter: 'A♯', flatLetter: 'B♭' }
		]);
	});
});

describe('assignNotesToKeys', () => {
	it('reproduces today\'s two-octave ascending-walk assignment byte-for-byte (Cm7)', () => {
		const { notes } = spellChord('Cm7');
		const whiteLetters = whiteLettersForOctaves(2);
		const blackKeys = blackKeysForOctaves(2);

		const assignment = assignNotesToKeys(notes, whiteLetters, blackKeys);

		// Every key IDENTITY (kind + keyIndex) below is unchanged from before the
		// doubled-slot fix; only `position` moved, into the shared white/black
		// ordering space (white i -> i*2, black-after-white i -> i*2+1).
		// root: C -> low C (white index 0, slot 0)
		expect(assignment.get(notes[0])).toEqual({ position: 0, kind: 'white', keyIndex: 0 });
		// third: E♭ -> black key at afterWhiteIndex 1 (slot 3, between D and E)
		expect(assignment.get(notes[1])).toEqual({ position: 3, kind: 'black', keyIndex: 1 });
		// fifth: G -> white index 4 (slot 8)
		expect(assignment.get(notes[2])).toEqual({ position: 8, kind: 'white', keyIndex: 4 });
		// seventh: B♭ -> black key at afterWhiteIndex 5 (slot 11, between A and B)
		expect(assignment.get(notes[3])).toEqual({ position: 11, kind: 'black', keyIndex: 4 });
	});

	it('wraps a high-rooted chord (Bm7) into four distinct keys within one octave', () => {
		const { notes } = spellChord('Bm7');
		const whiteLetters = whiteLettersForOctaves(1);
		const blackKeys = blackKeysForOctaves(1);

		const assignment = assignNotesToKeys(notes, whiteLetters, blackKeys);

		expect(assignment.size).toBe(4);

		const positions = new Set(
			[...assignment.values()].map((candidate) => `${candidate.kind}:${candidate.keyIndex}`)
		);
		// Four distinct pitch classes must resolve to four distinct keys.
		expect(positions.size).toBe(4);

		// Every note still keeps its role via the map key (SpelledNote itself).
		const roots = notes.filter((note) => note.role === 'root');
		const thirds = notes.filter((note) => note.role === 'third');
		const fifths = notes.filter((note) => note.role === 'fifth');
		const sevenths = notes.filter((note) => note.role === 'seventh');
		expect(assignment.has(roots[0])).toBe(true);
		expect(assignment.has(thirds[0])).toBe(true);
		expect(assignment.has(fifths[0])).toBe(true);
		expect(assignment.has(sevenths[0])).toBe(true);
	});

	it('wraps the root B to the visible B white key (index 6) in one octave', () => {
		const { notes } = spellChord('Bm7');
		const whiteLetters = whiteLettersForOctaves(1);
		const blackKeys = blackKeysForOctaves(1);

		const assignment = assignNotesToKeys(notes, whiteLetters, blackKeys);
		const root = notes.find((note) => note.role === 'root')!;

		expect(assignment.get(root)).toEqual({ position: 12, kind: 'white', keyIndex: 6 });
	});

	it('never throws for an empty notes array', () => {
		const whiteLetters = whiteLettersForOctaves(1);
		const blackKeys = blackKeysForOctaves(1);

		expect(() => assignNotesToKeys([], whiteLetters, blackKeys)).not.toThrow();
		expect(assignNotesToKeys([], whiteLetters, blackKeys).size).toBe(0);
	});

	it('never throws for an unrecognized (empty-notes) chord', () => {
		const { notes } = spellChord('not-a-chord');
		const whiteLetters = whiteLettersForOctaves(2);
		const blackKeys = blackKeysForOctaves(2);

		expect(() => assignNotesToKeys(notes, whiteLetters, blackKeys)).not.toThrow();
	});
});

/**
 * `position` used to be the raw white `index` for white keys and
 * `afterWhiteIndex + 1` for black keys - two overlapping numberings in one
 * integer space, so black C♯ and white D both scored 1. The ascending cursor
 * (`cursor = chosen.position + 1`) therefore walked a broken order whenever an
 * accidental was involved, and the wrap-around branch fired spuriously.
 *
 * Verified before the fix, on a 2-octave board with each major scale plus its
 * octave-up tonic: six roots (D, E, F♯, G, A, B) collapsed the octave-up tonic
 * onto the root's OWN key, so the display lit one tonic instead of two, AND
 * scrambled the scale across the two octaves - in D major, G/A/B landed at
 * 11/12/13 while D/E/F♯ sat at 1/2/4, then C♯ and D wrapped back to 1.
 */
describe('assignNotesToKeys - position is a valid left-to-right ordering (white/black slot collision)', () => {
	const whiteLetters = whiteLettersForOctaves(2);
	const blackKeys = blackKeysForOctaves(2);

	/** A major scale's 7 degrees plus the octave-up tonic, as PianoKeyboard receives it. */
	function scalePlusOctave(root: string): SpelledNote[] {
		const scale = majorScaleNotes(root);
		return [...scale, { letter: scale[0].letter, solfege: scale[0].solfege, role: 'root' }];
	}

	it('gives the octave-up tonic a strictly greater position than the root, for all 12 major roots', () => {
		for (const root of MAJOR_SCALE_ROOTS) {
			const notes = scalePlusOctave(root);
			const assignment = assignNotesToKeys(notes, whiteLetters, blackKeys);

			const rootKey = assignment.get(notes[0]);
			const octaveKey = assignment.get(notes[notes.length - 1]);

			expect(rootKey, root).toBeDefined();
			expect(octaveKey, root).toBeDefined();
			expect(octaveKey!.position, `${root}: octave-up tonic vs root`).toBeGreaterThan(
				rootKey!.position
			);
			// Two distinct KEYS, not just two distinct positions.
			expect(
				`${octaveKey!.kind}:${octaveKey!.keyIndex}`,
				`${root}: octave-up tonic collapsed onto the root's key`
			).not.toBe(`${rootKey!.kind}:${rootKey!.keyIndex}`);
		}
	});

	it('places a full ascending scale plus octave at strictly increasing positions, for all 12 major roots', () => {
		for (const root of MAJOR_SCALE_ROOTS) {
			const notes = scalePlusOctave(root);
			const assignment = assignNotesToKeys(notes, whiteLetters, blackKeys);

			expect(assignment.size, root).toBe(8);

			const positions = notes.map((note) => assignment.get(note)!.position);
			for (let i = 1; i < positions.length; i += 1) {
				expect(
					positions[i],
					`${root}: ${notes[i].letter} at ${positions[i]} must sit above ${notes[i - 1].letter} at ${positions[i - 1]} (${positions.join(',')})`
				).toBeGreaterThan(positions[i - 1]);
			}

			// 8 notes on 8 distinct keys.
			const keys = new Set(
				notes.map((note) => {
					const candidate = assignment.get(note)!;
					return `${candidate.kind}:${candidate.keyIndex}`;
				})
			);
			expect(keys.size, root).toBe(8);
		}
	});

	it('never assigns the same position to a white and a black key', () => {
		const whitePositions = new Set(whiteLetters.map((_, index) => index * 2));
		for (const { afterWhiteIndex } of blackKeys) {
			expect(whitePositions.has(afterWhiteIndex * 2 + 1)).toBe(false);
		}
	});

	it('orders every key on the board strictly by physical left-to-right position', () => {
		// A chord's notes are matched to keys by letter/chroma, so the ordering
		// invariant is checked directly on the slot arithmetic: interleaving
		// white i at i*2 with black-after-white i at i*2+1 must reproduce the
		// physical key order C C♯ D D♯ E F F♯ ...
		const slots: { position: number; label: string }[] = [
			...whiteLetters.map((letter, index) => ({ position: index * 2, label: letter })),
			...blackKeys.map(({ afterWhiteIndex, sharpLetter }) => ({
				position: afterWhiteIndex * 2 + 1,
				label: sharpLetter
			}))
		].sort((a, b) => a.position - b.position);

		expect(slots.slice(0, 13).map((slot) => slot.label)).toEqual([
			'C',
			'C♯',
			'D',
			'D♯',
			'E',
			'F',
			'F♯',
			'G',
			'G♯',
			'A',
			'A♯',
			'B',
			'C'
		]);
		expect(new Set(slots.map((slot) => slot.position)).size).toBe(slots.length);
	});
});

describe('assignNotesToKeys - exotic spellings (chroma/pitch-class fallback, 09-02 defect fix)', () => {
	it('maps F♭ (Dbm third) to the E key, not dropping it', () => {
		const { notes } = spellChord('Dbm');
		const whiteLetters = whiteLettersForOctaves(1);
		const blackKeys = blackKeysForOctaves(1);

		const assignment = assignNotesToKeys(notes, whiteLetters, blackKeys);
		const third = notes.find((note) => note.role === 'third')!;

		expect(third.letter).toBe('F♭');
		expect(assignment.get(third)).toEqual({ position: 4, kind: 'white', keyIndex: 2 });
		expect(whiteLetters[2]).toBe('E');
	});

	it('maps a double-flat (A♭♭, Dbdim fifth) to the G key, not dropping it', () => {
		const { notes } = spellChord('Dbdim');
		const whiteLetters = whiteLettersForOctaves(1);
		const blackKeys = blackKeysForOctaves(1);

		const assignment = assignNotesToKeys(notes, whiteLetters, blackKeys);
		const fifth = notes.find((note) => note.role === 'fifth')!;

		expect(fifth.letter).toBe('A♭♭');
		expect(assignment.get(fifth)).toEqual({ position: 8, kind: 'white', keyIndex: 4 });
		expect(whiteLetters[4]).toBe('G');
	});

	it('maps E♯ (F♯maj7 seventh) to the F key via a one-octave wrap, not dropping it', () => {
		const { notes } = spellChord('F#maj7');
		const whiteLetters = whiteLettersForOctaves(1);
		const blackKeys = blackKeysForOctaves(1);

		const assignment = assignNotesToKeys(notes, whiteLetters, blackKeys);
		const seventh = notes.find((note) => note.role === 'seventh')!;

		expect(seventh.letter).toBe('E♯');
		// All four notes still resolve to four distinct keys within one octave
		// (the wrap-around case, D-02) - the seventh's chroma fallback lands on
		// the F key rather than being silently dropped.
		expect(assignment.size).toBe(4);
		expect(assignment.get(seventh)).toEqual({ position: 6, kind: 'white', keyIndex: 3 });
		expect(whiteLetters[3]).toBe('F');
	});
});
