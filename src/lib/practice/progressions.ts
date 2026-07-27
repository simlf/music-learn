import { spellChord } from '$lib/theory/chord';
import { transposeFrom } from '$lib/theory/interval';
import { MAJOR_SCALE_ROOTS } from '$lib/theory/scale';

/**
 * Pure progression engine for the sketch-017 "earn-the-symbol" lead-sheet
 * drill (SK-017, LOCKED synthesis: lead-sheet grid container +
 * derive-then-play two-step). Given a fixed roman-numeral template and a
 * tonic, produces per-bar correct chord symbols, harmonic-function labels,
 * and same-key multiple-choice distractors.
 *
 * Bar symbols are always derived by transposing the key tonic through a
 * per-degree interval (interval.ts's transposeFrom - never a hand-rolled
 * symbol string), then validated with spellChord so an unrecognized symbol
 * never reaches the UI (T-25-01-01). Pure module: no DOM, no Svelte, no
 * copy strings - functionLabel is an enum value the component maps to i18n.
 */

/** Harmonic function of a progression bar, mapped to i18n copy by the caller. */
export type RomanFunction = 'tonic' | 'subdominant' | 'dominant';

/** One bar of a built progression: its roman numeral, resolved symbol, function, scale degree, and quality suffix. */
export interface ProgressionBar {
	index: number;
	roman: string;
	symbol: string;
	functionLabel: RomanFunction;
	degree: number;
	/** The engine's own fixed quality suffix (maj7 / m7 / 7 / m7b5), NOT tonal's canonical re-spelling. */
	quality: string;
}

/** One degree slot in a progression template, before being keyed to a tonic. */
interface ProgressionDegree {
	roman: string;
	degree: number;
	quality: string;
	functionLabel: RomanFunction;
}

/** A fixed roman-numeral progression shape (e.g. ii-V-I), independent of key. */
export interface ProgressionTemplate {
	id: string;
	mode: 'major' | 'minor';
	degrees: ProgressionDegree[];
}

/**
 * Quality-first interval shorthand (interval.ts's transposeFrom convention)
 * from the key tonic to each major-scale degree.
 */
const MAJOR_DEGREE_INTERVALS: Record<number, string> = {
	1: 'R',
	2: 'M2',
	3: 'M3',
	4: 'P4',
	5: 'P5',
	6: 'M6',
	7: 'M7'
};

/**
 * Natural-minor degree intervals, used for minor-mode templates so iiø/V7/i
 * land on the correct minor tonic (the roman-numeral quality itself - e.g.
 * V's dominant 7 rather than natural minor's diatonic m7 - comes from the
 * template's own quality field, not from this interval table).
 */
const MINOR_DEGREE_INTERVALS: Record<number, string> = {
	1: 'R',
	2: 'M2',
	3: 'm3',
	4: 'P4',
	5: 'P5',
	6: 'm6',
	7: 'm7'
};

/** Diatonic seventh-chord quality suffix per major-scale degree (I maj7, ii m7, ... vii m7b5). */
const MAJOR_DIATONIC_QUALITIES: Record<number, string> = {
	1: 'maj7',
	2: 'm7',
	3: 'm7',
	4: 'maj7',
	5: '7',
	6: 'm7',
	7: 'm7b5'
};

/**
 * Diatonic seventh-chord quality suffix per natural-minor degree, with the
 * jazz convention this drill's own minor template already uses: a DOMINANT V7
 * (harmonic-minor borrowing) rather than natural minor's diatonic v m7, and
 * the tonic as i m7 (matching the minor-ii-V-i template's own 'm7' tonic).
 * Degrees pair with MINOR_DEGREE_INTERVALS (i m7, iiø m7b5, bIII maj7, iv m7,
 * V 7, bVI maj7, bVII 7).
 */
const MINOR_DIATONIC_QUALITIES: Record<number, string> = {
	1: 'm7',
	2: 'm7b5',
	3: 'maj7',
	4: 'm7',
	5: '7',
	6: 'maj7',
	7: '7'
};

/** The progression templates the drill supports, keyed by id. */
export const PROGRESSION_TEMPLATES: ProgressionTemplate[] = [
	{
		id: 'major-ii-V-I',
		mode: 'major',
		degrees: [
			{ roman: 'ii', degree: 2, quality: 'm7', functionLabel: 'subdominant' },
			{ roman: 'V', degree: 5, quality: '7', functionLabel: 'dominant' },
			{ roman: 'I', degree: 1, quality: 'maj7', functionLabel: 'tonic' }
		]
	},
	{
		id: 'major-turnaround-I-vi-ii-V',
		mode: 'major',
		degrees: [
			{ roman: 'I', degree: 1, quality: 'maj7', functionLabel: 'tonic' },
			{ roman: 'vi', degree: 6, quality: 'm7', functionLabel: 'tonic' },
			{ roman: 'ii', degree: 2, quality: 'm7', functionLabel: 'subdominant' },
			{ roman: 'V', degree: 5, quality: '7', functionLabel: 'dominant' }
		]
	},
	{
		id: 'minor-ii-V-i',
		mode: 'minor',
		degrees: [
			{ roman: 'iiø', degree: 2, quality: 'm7b5', functionLabel: 'subdominant' },
			{ roman: 'V', degree: 5, quality: '7', functionLabel: 'dominant' },
			{ roman: 'i', degree: 1, quality: 'm7', functionLabel: 'tonic' }
		]
	}
];

/** The 12 tonics available to the drill, reusing the vetted major-scale root set. */
export const PROGRESSION_KEYS: readonly string[] = MAJOR_SCALE_ROOTS;

/** Fisher-Yates shuffle using Math.random(), matching generateQuestion.ts's convention. */
function shuffle<T>(items: T[]): T[] {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

/**
 * Builds the ordered bars of `templateId` keyed to `key`. Total: an unknown
 * templateId or key returns [] (T-25-01-01) rather than producing a
 * malformed symbol. Any individual bar whose transposed symbol fails
 * spellChord's recognition is dropped rather than surfaced.
 */
export function buildProgression(templateId: string, key: string): ProgressionBar[] {
	const template = PROGRESSION_TEMPLATES.find((t) => t.id === templateId);
	if (!template || !PROGRESSION_KEYS.includes(key)) return [];

	const degreeIntervals = template.mode === 'minor' ? MINOR_DEGREE_INTERVALS : MAJOR_DEGREE_INTERVALS;
	const bars: ProgressionBar[] = [];

	for (const slot of template.degrees) {
		const root = transposeFrom(key, degreeIntervals[slot.degree]);
		const symbol = `${root}${slot.quality}`;
		if (!spellChord(symbol).recognized) continue;
		bars.push({
			index: bars.length,
			roman: slot.roman,
			symbol,
			functionLabel: slot.functionLabel,
			degree: slot.degree,
			quality: slot.quality
		});
	}

	return bars;
}

/**
 * The diatonic seventh-chord symbols of `key` in `mode`, used as the
 * same-key/same-mode distractor pool. Mode-aware (a minor bar's distractors
 * come from the MINOR key's sevenths, never the parallel major's). Two
 * defensive drops keep the pool inside the app's chord vocabulary:
 * a double-accidental root (e.g. B♭♭, natural minor's bVI of D♭) is
 * theoretically diatonic but outside randomChord.ROOTS' single-accidental
 * vocabulary, and any symbol spellChord fails to recognize is skipped rather
 * than surfaced (matching buildProgression's own guard).
 */
function diatonicSevenths(key: string, mode: 'major' | 'minor'): string[] {
	const intervals = mode === 'minor' ? MINOR_DEGREE_INTERVALS : MAJOR_DEGREE_INTERVALS;
	const qualities = mode === 'minor' ? MINOR_DIATONIC_QUALITIES : MAJOR_DIATONIC_QUALITIES;
	const symbols: string[] = [];
	for (let degree = 1; degree <= 7; degree++) {
		const root = transposeFrom(key, intervals[degree]);
		const symbol = `${root}${qualities[degree]}`;
		if (root.length > 2 || !spellChord(symbol).recognized) continue;
		symbols.push(symbol);
	}
	return symbols;
}

/**
 * Same-key multiple-choice distractors for naming `bar`: the correct symbol
 * plus 3 others drawn from `key`'s diatonic seventh chords IN `mode`,
 * shuffled. Never an out-of-key chord — a minor bar's distractors are minor-
 * key sevenths, never the parallel major's. `mode` defaults to 'major' for
 * the pre-existing call shape.
 */
export function nameChoices(
	bar: ProgressionBar,
	key: string,
	mode: 'major' | 'minor' = 'major'
): string[] {
	const pool = diatonicSevenths(key, mode).filter((symbol) => symbol !== bar.symbol);
	const distractors = shuffle(pool).slice(0, 3);
	return shuffle([bar.symbol, ...distractors]);
}

/** A randomly drawn template + key, with its built bars. */
export function randomProgression(): {
	templateId: string;
	key: string;
	bars: ProgressionBar[];
} {
	const template = PROGRESSION_TEMPLATES[Math.floor(Math.random() * PROGRESSION_TEMPLATES.length)];
	const key = PROGRESSION_KEYS[Math.floor(Math.random() * PROGRESSION_KEYS.length)];
	return { templateId: template.id, key, bars: buildProgression(template.id, key) };
}
