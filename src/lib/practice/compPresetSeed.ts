import { PROGRESSION_KEYS, PROGRESSION_TEMPLATES } from './progressions';

/**
 * One-shot handoff from a lesson into the comping loop pre-set to the form
 * and key it just taught (`.planning/design/improvisation.md` 4.3.1:
 * chapter 11's lesson lands on a ii V I in C). The sibling of
 * `compSongSeed.ts`, kept separate because it carries a template and a key
 * from `progressions.ts` rather than a song's own chords: the loop stays in
 * its FORM / KEY mode, only pre-set. Never graded, never persisted past the
 * one mount that reads it.
 */

const COMP_PRESET_SEED_KEY = 'music-learn:comp-preset-seed';

export interface CompPresetSeed {
	templateId: string;
	key: string;
}

/** Writes the one-shot preset. Storage failures degrade to a no-op (the link then just navigates). */
export function setCompPresetSeed(templateId: string, key: string): void {
	try {
		localStorage.setItem(COMP_PRESET_SEED_KEY, JSON.stringify({ templateId, key }));
	} catch {
		// Storage unavailable: the link degrades to plain navigation.
	}
}

/** Reads and clears the pending preset (one-shot). Anything not a known template and key returns null rather than throwing. */
export function consumeCompPresetSeed(): CompPresetSeed | null {
	try {
		const raw = localStorage.getItem(COMP_PRESET_SEED_KEY);
		localStorage.removeItem(COMP_PRESET_SEED_KEY);
		if (raw === null) return null;
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null) return null;
		const { templateId, key } = parsed as Record<string, unknown>;
		if (!PROGRESSION_TEMPLATES.some((template) => template.id === templateId)) return null;
		if (typeof key !== 'string' || !PROGRESSION_KEYS.includes(key)) return null;
		return { templateId: templateId as string, key };
	} catch {
		return null;
	}
}
