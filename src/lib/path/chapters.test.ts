import { describe, expect, it } from 'vitest';
import { spellChord } from '$lib/theory/chord';
import { chromaOf } from '$lib/theory/interval';
import { shellCycleBars, SHELL_FORMS } from '$lib/practice/shellCycle';
import { CYCLE_DIRECTIONS, isSameStop, nextInCycle } from '$lib/practice/circleOfFifths';
import {
	CHAPTERS,
	CIRCLE_CHAPTER,
	CIRCLE_DISTANCE_CHECK,
	CIRCLE_LAP_CHECK,
	SHELLS_CHAPTER,
	SHELL_CYCLE_CHECK,
	chapterById
} from './chapters';

const rootOf = (symbol: string) => chromaOf(spellChord(symbol).root);
const sameChord = (a: string, b: string) => {
	const chromas = (symbol: string) =>
		spellChord(symbol)
			.notes.map((note) => chromaOf(note.letter))
			.sort();
	return JSON.stringify(chromas(a)) === JSON.stringify(chromas(b));
};

describe('CHAPTERS', () => {
	it('numbers new chapters from 15, with unique ids', () => {
		expect(CHAPTERS.map((chapter) => chapter.number)).toEqual([15, 16]);
		expect(new Set(CHAPTERS.map((chapter) => chapter.id)).size).toBe(CHAPTERS.length);
		expect(chapterById('shells-in-every-key')).toBe(SHELLS_CHAPTER);
		expect(chapterById('circle-of-fifths')).toBe(CIRCLE_CHAPTER);
		expect(chapterById('nope')).toBeUndefined();
	});

	it('gives every chapter three to five checklist lines with unique ids', () => {
		for (const chapter of CHAPTERS) {
			expect(chapter.checklist.length).toBeGreaterThanOrEqual(3);
			expect(chapter.checklist.length).toBeLessThanOrEqual(5);
			expect(new Set(chapter.checklist.map((item) => item.id)).size).toBe(chapter.checklist.length);
		}
	});

	it('only uses recognized chords in repertoire strips, and no tune carries a melody', () => {
		for (const chapter of CHAPTERS) {
			for (const tune of chapter.repertoire) {
				expect(tune.bars.length).toBeGreaterThan(0);
				for (const bar of tune.bars) expect(spellChord(bar.symbol).recognized, bar.symbol).toBe(true);
				// Copyright rule: a tune published after 1929 is changes only, never a melody.
				if (tune.year > 1929) expect(tune.rights).toBe('changes-only');
				expect(Object.keys(tune)).not.toContain('melody');
			}
		}
	});
});

describe('chapter 15', () => {
	it('ticks one app line per shell-cycle form', () => {
		const appLines = SHELLS_CHAPTER.checklist.filter((item) => item.by === 'app').map((item) => item.id);
		expect(appLines.sort()).toEqual(SHELL_FORMS.map((form) => SHELL_CYCLE_CHECK[form]).sort());
	});

	it("Autumn Leaves' analysis matches the engine: a ii V I in B♭, then a iiø V i in G minor", () => {
		const [autumn] = SHELLS_CHAPTER.repertoire;
		const symbols = autumn.bars.map((bar) => bar.symbol);
		expect(symbols).toEqual(['Cm7', 'F7', 'Bbmaj7', 'Ebmaj7', 'Am7b5', 'D7', 'Gm', 'Gm']);
		shellCycleBars('major', 'B♭').forEach((bar, i) => {
			expect(sameChord(symbols[i], bar.symbol)).toBe(true);
			expect(autumn.bars[i].roman).toBe(bar.roman);
		});
		const minor = shellCycleBars('minor', 'G');
		expect(sameChord(symbols[4], minor[0].symbol)).toBe(true);
		expect(sameChord(symbols[5], minor[1].symbol)).toBe(true);
		expect(rootOf(symbols[6])).toBe(rootOf(minor[2].symbol));
		expect(autumn.bars.slice(4, 7).map((bar) => bar.roman)).toEqual(minor.map((bar) => bar.roman));
	});

	it("All the Things You Are's five roots each rise a fourth, and bars 2 to 4 are A♭'s ii V I", () => {
		const attya = SHELLS_CHAPTER.repertoire[1];
		const roots = attya.bars.map((bar) => rootOf(bar.symbol)!);
		for (let i = 1; i < roots.length; i++) expect((roots[i] - roots[i - 1] + 12) % 12).toBe(5);
		shellCycleBars('major', 'A♭').forEach((bar, i) => {
			expect(sameChord(attya.bars[i + 1].symbol, bar.symbol)).toBe(true);
		});
	});
});

describe('chapter 16', () => {
	it('ticks one app line per lap direction, plus the distance streak', () => {
		const appLines = CIRCLE_CHAPTER.checklist.filter((item) => item.by === 'app').map((item) => item.id);
		expect(appLines.sort()).toEqual(
			[...CYCLE_DIRECTIONS.map((direction) => CIRCLE_LAP_CHECK[direction]), CIRCLE_DISTANCE_CHECK].sort()
		);
	});

	it("Fly Me to the Moon's bars 1 to 7 walk down the circle, with one diminished fifth to stay in C", () => {
		const [flyMe] = CIRCLE_CHAPTER.repertoire;
		const roots = flyMe.bars.map((bar) => spellChord(bar.symbol).root);
		expect(roots.slice(0, 7)).toEqual(['A', 'D', 'G', 'C', 'F', 'B', 'E']);
		for (let i = 1; i < 7; i++) {
			const fall = (chromaOf(roots[i])! - chromaOf(roots[i - 1])! + 12) % 12;
			// Down a perfect fifth is +5 semitones; F to B, the diatonic one, is a tritone.
			expect(fall).toBe(roots[i - 1] === 'F' ? 6 : 5);
		}
		expect(flyMe.bars[2].roman).toBe('V');
		expect(flyMe.bars[3].roman).toBe('I');
	});

	it("I Got Rhythm's bridge is four dominants, each the next stop down the circle", () => {
		const rhythm = CIRCLE_CHAPTER.repertoire[1];
		const roots = rhythm.bars.map((bar) => spellChord(bar.symbol).root);
		for (const bar of rhythm.bars) expect(spellChord(bar.symbol).symbol.endsWith('7')).toBe(true);
		for (let i = 1; i < roots.length; i++) expect(isSameStop(roots[i], nextInCycle(roots[i - 1], 'down')!)).toBe(true);
		// F7 is the V of B♭, where the last A section lands.
		expect(isSameStop(nextInCycle(roots[roots.length - 1], 'down')!, 'B♭')).toBe(true);
	});
});
