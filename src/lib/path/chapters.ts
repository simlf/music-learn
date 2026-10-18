import type { MessageKey } from '$lib/i18n/locale.svelte';
import { SONG_PRESETS } from '$lib/practice/presets';
import type { ShellForm } from '$lib/practice/shellCycle';

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
 * Units 1 to 14 keep their ids and become Part I when the guided path is
 * built; new chapters are numbered from 15. Pure data: the components own
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
function presetBars(presetId: string, romans: string[]): TuneBar[] {
	const preset = SONG_PRESETS.find((candidate) => candidate.presetId === presetId);
	if (!preset) return [];
	return romans.map((roman, index) => ({ symbol: preset.chordSymbols[index], roman }));
}

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

/** Every chapter, in book order. Chapters 16 to 26 are follow-ups (method-book.md). */
export const CHAPTERS: readonly ChapterDef[] = [SHELLS_CHAPTER];

/** Total: an unknown id returns undefined. */
export function chapterById(id: string): ChapterDef | undefined {
	return CHAPTERS.find((chapter) => chapter.id === id);
}
