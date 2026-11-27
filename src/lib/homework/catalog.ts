import { READING_EXERCISES, type ReadingExercise } from './data/readingData';
import { RHYTHM_EXERCISES, type RhythmExercise } from './data/rhythmData';

/** The two homework kinds. `reading` is note reading, `rhythm` is tap-the-rhythm. */
export type HomeworkKind = 'reading' | 'rhythm';

export const HOMEWORK_KINDS: readonly HomeworkKind[] = ['reading', 'rhythm'];

export type HomeworkExercise =
	| ({ kind: 'reading' } & ReadingExercise)
	| ({ kind: 'rhythm' } & RhythmExercise);

function all(kind: HomeworkKind): HomeworkExercise[] {
	return kind === 'reading'
		? READING_EXERCISES.map((e) => ({ kind: 'reading' as const, ...e }))
		: RHYTHM_EXERCISES.map((e) => ({ kind: 'rhythm' as const, ...e }));
}

/** Looks up one exercise by printed page and exercise number, or null when it is not in the catalog. */
export function findExercise(
	kind: HomeworkKind,
	page: number,
	number: number
): HomeworkExercise | null {
	return all(kind).find((e) => e.page === page && e.number === number) ?? null;
}

/** Printed pages that have at least one exercise, ascending. */
export function pagesFor(kind: HomeworkKind): number[] {
	return [...new Set(all(kind).map((e) => e.page))].sort((a, b) => a - b);
}

/** Exercise numbers available on a printed page, ascending. */
export function exercisesOnPage(kind: HomeworkKind, page: number): number[] {
	return all(kind)
		.filter((e) => e.page === page)
		.map((e) => e.number)
		.sort((a, b) => a - b);
}

/** Stable key for storing a result against one exercise. */
export function exerciseKey(kind: HomeworkKind, page: number, number: number): string {
	return `${kind}:${page}:${number}`;
}

/**
 * Parses what the user typed into the page / exercise boxes. Accepts only
 * whole numbers of at least 1 (so "5", " 5 ", "05" pass; "", "5.5", "-1",
 * "abc" and "0" do not). Returns null for anything else.
 */
export function parseCount(raw: string): number | null {
	const t = raw.trim();
	if (!/^\d{1,4}$/.test(t)) return null;
	const n = Number(t);
	return n >= 1 ? n : null;
}

export type LookupResult =
	| { ok: true; exercise: HomeworkExercise }
	| {
			ok: false;
			reason: 'bad-input' | 'no-page' | 'no-exercise';
			/** For `no-exercise`: the numbers that do exist on that page. */
			available?: number[];
	  };

/** Resolves typed page / exercise text to an exercise, or says exactly why not. */
export function lookupExercise(kind: HomeworkKind, pageRaw: string, numberRaw: string): LookupResult {
	const page = parseCount(pageRaw);
	const number = parseCount(numberRaw);
	if (page === null || number === null) return { ok: false, reason: 'bad-input' };
	if (!pagesFor(kind).includes(page)) return { ok: false, reason: 'no-page' };
	const exercise = findExercise(kind, page, number);
	if (!exercise) return { ok: false, reason: 'no-exercise', available: exercisesOnPage(kind, page) };
	return { ok: true, exercise };
}
