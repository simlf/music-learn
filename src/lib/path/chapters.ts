import type { MessageKey } from '$lib/i18n/locale.svelte';
import { SONG_PRESETS } from '$lib/practice/presets';
import type { ShellForm } from '$lib/practice/shellCycle';
import type { CycleDirection } from '$lib/practice/circleOfFifths';

/**
 * The method-book chapters (`.planning/design/method-book.md`): the guided
 * path's units given one page shape, four blocks in a fixed order.
 *
 *   1. Concept: one idea in one sentence, a short paragraph, one picture.
 *   2. At the piano: one exercise embedded on the page, marked CHECKED (the
 *      app grades every step) or GUIDED (it plays and shows, you judge).
 *   3. In the repertoire: real tunes where the move lives, as bar strips.
 *   4. Practice checklist: three to five lines, some ticked by the exercise,
 *      the rest by the player, kept per device (`pathState.ts`).
 *
 * Units 1 to 14 keep their ids and become Part I, one by one, as each is
 * put on the template (chapter 11, guide tones, is the first); new chapters
 * are numbered from 15. Pure data: the components own
 * every render and every storage call. Concept and exercise are components
 * per chapter (`/learn/[chapter]` maps the id to them); repertoire and
 * checklist are data, so the template renders them for every chapter alike.
 *
 * COPYRIGHT RULE for `repertoire`: chord changes, titles and bar analysis are
 * facts and fine for any tune. A melody may only ever be added for a US
 * public-domain composition (published 1929 or earlier), from the original
 * edition. Every tune below is later than that, so it is `changes-only` and
 * carries no melody field at all.
 */

export type ExerciseGrading = 'checked' | 'guided';

/** One bar of a lead-sheet strip: the chord (ASCII, the form spellChord echoes) and its roman numeral in the passage's key. */
export interface TuneBar {
	symbol: string;
	roman: string;
}

export interface TuneExcerpt {
	id: string;
	/** Immune display value, never translated. */
	title: string;
	composer: string;
	year: number;
	rights: 'changes-only';
	barsKey: MessageKey;
	noteKey: MessageKey;
	bars: TuneBar[];
}

export interface ChecklistItem {
	id: string;
	labelKey: MessageKey;
	/** 'app': ticked by the chapter's exercise, read-only to the player. 'you': a self-check box. */
	by: 'app' | 'you';
}

export interface ChapterDef {
	id: string;
	number: number;
	partKey: MessageKey;
	titleKey: MessageKey;
	ideaKey: MessageKey;
	grading: ExerciseGrading;
	repertoire: TuneExcerpt[];
	checklist: ChecklistItem[];
}

/** The checklist line each shell-cycle form ticks when all 12 of its keys are clean. */
export const SHELL_CYCLE_CHECK: Record<ShellForm, string> = {
	major: 'major-cycle',
	minor: 'minor-cycle'
};

/**
 * A song preset's opening bars, one per roman numeral, read from the preset
 * itself so a chapter and the Songs tab can never disagree about the changes.
 */
function presetBars(presetId: string, romans: string[], from = 0): TuneBar[] {
	const preset = SONG_PRESETS.find((candidate) => candidate.presetId === presetId);
	if (!preset) return [];
	return romans.map((roman, index) => ({ symbol: preset.chordSymbols[from + index], roman }));
}

/**
 * Chapter 11's guide-tone cycle line. A self-check, never ticked by the
 * cycle drill: the unit's proof stays the voicing drill
 * (`improvisation.md` 3.4), so the drill grades each pair but proves nothing.
 */
export const GUIDE_TONE_CYCLE_CHECK = 'guide-cycle';

export const GUIDE_TONES_CHAPTER: ChapterDef = {
	id: 'guide-tones',
	number: 11,
	partKey: 'book.part.1',
	titleKey: 'book.ch11.title',
	ideaKey: 'book.ch11.idea',
	grading: 'checked',
	repertoire: [
		{
			id: 'blue-bossa',
			title: 'Blue Bossa',
			composer: 'Kenny Dorham',
			year: 1963,
			rights: 'changes-only',
			barsKey: 'book.ch11.tune.blueBossa.bars',
			noteKey: 'book.ch11.tune.blueBossa.note',
			bars: presetBars('blue-bossa-cm', ['ii', 'V', 'I', 'I'], 8)
		},
		{
			id: 'satin-doll',
			title: 'Satin Doll',
			composer: 'Duke Ellington, Billy Strayhorn',
			year: 1953,
			rights: 'changes-only',
			barsKey: 'book.ch11.tune.satinDoll.bars',
			noteKey: 'book.ch11.tune.satinDoll.note',
			bars: [
				{ symbol: 'Dm7', roman: 'ii' },
				{ symbol: 'G7', roman: 'V' },
				{ symbol: 'Dm7', roman: 'ii' },
				{ symbol: 'G7', roman: 'V' },
				{ symbol: 'Em7', roman: 'iii' },
				{ symbol: 'A7', roman: 'V/ii' },
				{ symbol: 'Em7', roman: 'iii' },
				{ symbol: 'A7', roman: 'V/ii' }
			]
		}
	],
	checklist: [
		{ id: GUIDE_TONE_CYCLE_CHECK, labelKey: 'book.ch11.check.cycle', by: 'you' },
		{ id: 'no-roots', labelKey: 'book.ch11.check.noRoots', by: 'you' },
		{ id: 'sing-the-line', labelKey: 'book.ch11.check.sing', by: 'you' },
		{ id: 'comp-blue-bossa', labelKey: 'book.ch11.check.comp', by: 'you' }
	]
};

export const SHELLS_CHAPTER: ChapterDef = {
	id: 'shells-in-every-key',
	number: 15,
	partKey: 'book.part.2',
	titleKey: 'book.ch15.title',
	ideaKey: 'book.ch15.idea',
	grading: 'checked',
	repertoire: [
		{
			id: 'autumn-leaves',
			title: 'Autumn Leaves',
			composer: 'Joseph Kosma',
			year: 1945,
			rights: 'changes-only',
			barsKey: 'book.ch15.tune.autumn.bars',
			noteKey: 'book.ch15.tune.autumn.note',
			bars: presetBars('autumn-leaves-gm', ['ii', 'V', 'I', 'IV', 'iiø', 'V', 'i', 'i'])
		},
		{
			id: 'all-the-things-you-are',
			title: 'All the Things You Are',
			composer: 'Jerome Kern',
			year: 1939,
			rights: 'changes-only',
			barsKey: 'book.ch15.tune.attya.bars',
			noteKey: 'book.ch15.tune.attya.note',
			bars: [
				{ symbol: 'Fm7', roman: 'vi' },
				{ symbol: 'Bbm7', roman: 'ii' },
				{ symbol: 'Eb7', roman: 'V' },
				{ symbol: 'Abmaj7', roman: 'I' },
				{ symbol: 'Dbmaj7', roman: 'IV' }
			]
		}
	],
	checklist: [
		{ id: SHELL_CYCLE_CHECK.major, labelKey: 'book.ch15.check.major', by: 'app' },
		{ id: SHELL_CYCLE_CHECK.minor, labelKey: 'book.ch15.check.minor', by: 'app' },
		{ id: 'eyes-off', labelKey: 'book.ch15.check.eyesOff', by: 'you' },
		{ id: 'still-hand', labelKey: 'book.ch15.check.stillHand', by: 'you' },
		{ id: 'comp-autumn', labelKey: 'book.ch15.check.comp', by: 'you' }
	]
};

/** The checklist line each circle direction ticks when a whole lap has every stop right the first time. */
export const CIRCLE_LAP_CHECK: Record<CycleDirection, string> = {
	down: 'lap-down',
	up: 'lap-up'
};

/** The checklist line the "how far apart" question ticks after a run of first-try pairs. */
export const CIRCLE_DISTANCE_CHECK = 'distance-streak';

export const CIRCLE_CHAPTER: ChapterDef = {
	id: 'circle-of-fifths',
	number: 16,
	partKey: 'book.part.2',
	titleKey: 'book.ch16.title',
	ideaKey: 'book.ch16.idea',
	grading: 'checked',
	repertoire: [
		{
			id: 'fly-me-to-the-moon',
			title: 'Fly Me to the Moon',
			composer: 'Bart Howard',
			year: 1954,
			rights: 'changes-only',
			barsKey: 'book.ch16.tune.flyMe.bars',
			noteKey: 'book.ch16.tune.flyMe.note',
			bars: presetBars('fly-me-to-the-moon-c', ['vi', 'ii', 'V', 'I', 'IV', 'viiø', 'V/vi', 'vi'])
		},
		{
			id: 'i-got-rhythm',
			title: 'I Got Rhythm',
			composer: 'George Gershwin',
			year: 1930,
			rights: 'changes-only',
			barsKey: 'book.ch16.tune.rhythm.bars',
			noteKey: 'book.ch16.tune.rhythm.note',
			bars: [
				{ symbol: 'D7', roman: 'V/vi' },
				{ symbol: 'G7', roman: 'V/ii' },
				{ symbol: 'C7', roman: 'V/V' },
				{ symbol: 'F7', roman: 'V' }
			]
		}
	],
	checklist: [
		{ id: CIRCLE_LAP_CHECK.down, labelKey: 'book.ch16.check.lapDown', by: 'app' },
		{ id: CIRCLE_LAP_CHECK.up, labelKey: 'book.ch16.check.lapUp', by: 'app' },
		{ id: CIRCLE_DISTANCE_CHECK, labelKey: 'book.ch16.check.distance', by: 'app' },
		{ id: 'out-loud', labelKey: 'book.ch16.check.outLoud', by: 'you' },
		{ id: 'hear-fly-me', labelKey: 'book.ch16.check.hear', by: 'you' }
	]
};

/** Every chapter, in book order. The rest of Part I and chapters 17 to 27 are follow-ups (method-book.md). */
export const CHAPTERS: readonly ChapterDef[] = [GUIDE_TONES_CHAPTER, SHELLS_CHAPTER, CIRCLE_CHAPTER];

/** Total: an unknown id returns undefined. */
export function chapterById(id: string): ChapterDef | undefined {
	return CHAPTERS.find((chapter) => chapter.id === id);
}
