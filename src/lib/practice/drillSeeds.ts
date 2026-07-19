/**
 * One-shot handoffs into the drills page's seed queue. Two independent
 * channels exist so their origins never collide:
 * - The drill-seeds channel (R6 proposal 2): Progress's "Drill these"
 *   button writes the weakest-item symbols here for a weak-list redrill.
 * - The lesson-seeds channel (Phase 19 LEARN-03): InteractiveLesson's
 *   "Try this in a drill" handoff writes its lesson symbols here.
 * Both write to localStorage rather than a query string, keeping the
 * prerendered /drills route clean and surviving the navigation on every
 * device. Standard defensive music-learn:* storage module; each channel
 * is read + cleared (one-shot) independently so a lesson handoff and a
 * weak-list handoff can never overwrite each other.
 */

export const DRILL_SEEDS_KEY = 'music-learn:drill-seeds';
export const LESSON_SEEDS_KEY = 'music-learn:lesson-seeds';

export function setDrillSeeds(symbols: string[]): void {
	try {
		localStorage.setItem(DRILL_SEEDS_KEY, JSON.stringify(symbols));
	} catch {
		// Storage unavailable: the button degrades to plain navigation.
	}
}

/** Reads the pending seeds and clears them (one-shot). */
export function consumeDrillSeeds(): string[] {
	try {
		const raw = localStorage.getItem(DRILL_SEEDS_KEY);
		localStorage.removeItem(DRILL_SEEDS_KEY);
		if (raw === null) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((entry): entry is string => typeof entry === 'string');
	} catch {
		return [];
	}
}

export function setLessonSeeds(symbols: string[]): void {
	try {
		localStorage.setItem(LESSON_SEEDS_KEY, JSON.stringify(symbols));
	} catch {
		// Storage unavailable: the handoff degrades to plain navigation.
	}
}

/** Reads the pending lesson seeds and clears them (one-shot). */
export function consumeLessonSeeds(): string[] {
	try {
		const raw = localStorage.getItem(LESSON_SEEDS_KEY);
		localStorage.removeItem(LESSON_SEEDS_KEY);
		if (raw === null) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((entry): entry is string => typeof entry === 'string');
	} catch {
		return [];
	}
}
