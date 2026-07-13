import { describe, expect, it } from 'vitest';
import {
	assignNotesToKeys,
	blackKeysForOctaves,
	octavesForWidth,
	whiteLettersForOctaves
} from './keyboardLayout';
import { spellChord } from '$lib/theory/chord';

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

		// root: C -> low C (white index 0)
		expect(assignment.get(notes[0])).toEqual({ position: 0, kind: 'white', keyIndex: 0 });
		// third: E♭ -> black key at afterWhiteIndex 1 (position 2)
		expect(assignment.get(notes[1])).toEqual({ position: 2, kind: 'black', keyIndex: 1 });
		// fifth: G -> white index 4 (position 4)
		expect(assignment.get(notes[2])).toEqual({ position: 4, kind: 'white', keyIndex: 4 });
		// seventh: B♭ -> black key at afterWhiteIndex 5 (position 6)
		expect(assignment.get(notes[3])).toEqual({ position: 6, kind: 'black', keyIndex: 5 });
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

		expect(assignment.get(root)).toEqual({ position: 6, kind: 'white', keyIndex: 6 });
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
