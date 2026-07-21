/**
 * voicingMet: the sketch-019 "compare intro shown once" store (SK-019).
 * ShellVoicingDrill's meet stage (a NEW chord's root-vs-shell compare card)
 * is scaffolding meant to fade after the learner has seen it once per chord
 * (the 005 fading-scaffold rule extended to voicing pedagogy) - this module
 * persists which chord symbols have already had their compare intro shown,
 * independent of the chord's own FSRS card maturity (a card can still be
 * State.New while its compare intro has already been met).
 *
 * Mirrors songFilterPref.ts / confidenceLog.ts's total, degrade-to-safe
 * localStorage pattern under the `music-learn:*` key convention: every
 * storage access is wrapped so a thrown, disabled, or malformed store never
 * crashes the page - hasVoicingMet degrades to false rather than throwing,
 * and markVoicingMet's write failures (quota/disabled storage) are a silent
 * no-op (availability over durability).
 */

const STORAGE_KEY = 'music-learn:voicing-met';

/** Reads the persisted met-set. Any missing/non-JSON/non-array/malformed store degrades to an empty set. */
function readMetSet(): Set<string> {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw === null) return new Set();

		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return new Set();

		return new Set(parsed.filter((entry): entry is string => typeof entry === 'string'));
	} catch {
		return new Set();
	}
}

/**
 * Marks a chord symbol's compare intro as shown. Storage failures (quota
 * exceeded or disabled storage) degrade to a silent no-op - the drill still
 * advances its stage in-memory for the rest of this session even if the
 * mark never persists.
 */
export function markVoicingMet(symbol: string): void {
	try {
		const met = readMetSet();
		met.add(symbol);
		localStorage.setItem(STORAGE_KEY, JSON.stringify([...met]));
	} catch {
		// Quota exceeded or storage disabled: keep the drill working without
		// persistence rather than throwing.
	}
}

/** True when the chord's compare intro has already been shown. A corrupt/missing store degrades to false, never throws. */
export function hasVoicingMet(symbol: string): boolean {
	return readMetSet().has(symbol);
}
