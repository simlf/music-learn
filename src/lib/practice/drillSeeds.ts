/**
 * One-shot handoff from the Progress page's "Drill these" button to the
 * drills page (R6 proposal 2): Progress writes the weakest-item symbols
 * here, navigates to /drills, and the drills page consumes (reads + clears)
 * them to seed the session. localStorage rather than a query string keeps
 * the prerendered /drills route clean and survives the navigation on every
 * device. Standard defensive music-learn:* storage module.
 */

export const DRILL_SEEDS_KEY = 'music-learn:drill-seeds';

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
