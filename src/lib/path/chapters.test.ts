import { describe, expect, it } from 'vitest';
import { spellChord } from '$lib/theory/chord';
import { chromaOf } from '$lib/theory/interval';
import { shellCycleBars, SHELL_FORMS } from '$lib/practice/shellCycle';
import { CYCLE_DIRECTIONS, isSameStop, nextInCycle } from '$lib/practice/circleOfFifths';
import { guideToneMotion, toGuideToneBar } from '$lib/lessons/guideTones';
import { guideToneCycleBars } from '$lib/practice/guideToneCycle';
import {
	CHAPTERS,
	CIRCLE_CHAPTER,
	CIRCLE_DISTANCE_CHECK,
	CIRCLE_LAP_CHECK,
	GUIDE_TONE_CYCLE_CHECK,
	GUIDE_TONES_CHAPTER,
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
	it('keeps Part I units at their unit number, numbers new chapters from 15, with unique ids', () => {
		expect(CHAPTERS.map((chapter) => chapter.number)).toEqual([11, 15, 16]);
		expect(CHAPTERS.map((chapter) => chapter.partKey)).toEqual(['book.part.1', 'book.part.2', 'book.part.2']);
		expect(new Set(CHAPTERS.map((chapter) => chapter.id)).size).toBe(CHAPTERS.length);
		expect(chapterById('guide-tones')).toBe(GUIDE_TONES_CHAPTER);
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

describe('chapter 11', () => {
	/** The guide-tone motion between two chord symbols, from the same engine the lesson and the drill use. */
	const motionBetween = (from: string, to: string) =>
		guideToneMotion(
			toGuideToneBar({ index: 0, roman: '', symbol: from, quality: '' } as never),
			toGuideToneBar({ index: 1, roman: '', symbol: to, quality: '' } as never)
		)!;

	it('has no app-ticked line: the cycle line is a self-check, since the proof stays the voicing drill', () => {
		expect(GUIDE_TONES_CHAPTER.checklist.filter((item) => item.by === 'app')).toEqual([]);
		expect(GUIDE_TONES_CHAPTER.checklist.find((item) => item.id === GUIDE_TONE_CYCLE_CHECK)?.by).toBe('you');
	});

	it("Blue Bossa's bars 9 to 12 are D♭'s ii V I, and each 7th falls a half step as the note says", () => {
		const [blueBossa] = GUIDE_TONES_CHAPTER.repertoire;
		const symbols = blueBossa.bars.map((bar) => bar.symbol);
		expect(symbols).toEqual(['Ebm7', 'Ab7', 'Dbmaj7', 'Dbmaj7']);
		guideToneCycleBars('D♭').forEach((bar, i) => {
			expect(sameChord(symbols[i], bar.symbol)).toBe(true);
			expect(blueBossa.bars[i].roman).toBe(bar.roman);
		});
		expect(motionBetween('Ebm7', 'Ab7')).toMatchObject({ fallingFrom: 'D♭', fallingTo: 'C', heldLetter: 'G♭', fallingSemitones: 1 });
		expect(motionBetween('Ab7', 'Dbmaj7')).toMatchObject({ fallingFrom: 'G♭', fallingTo: 'F', heldLetter: 'C', fallingSemitones: 1 });
	});

	it("Satin Doll's two ii Vs each move the ii's 7th a half step to the V's 3rd, the second a whole step higher", () => {
		const satin = GUIDE_TONES_CHAPTER.repertoire[1];
		const symbols = satin.bars.map((bar) => bar.symbol);
		expect(symbols).toEqual(['Dm7', 'G7', 'Dm7', 'G7', 'Em7', 'A7', 'Em7', 'A7']);
		for (let i = 0; i < symbols.length; i += 2) {
			expect(motionBetween(symbols[i], symbols[i + 1]).fallingSemitones).toBe(1);
		}
		expect((rootOf('Em7')! - rootOf('Dm7')! + 12) % 12).toBe(2);
	});
});
