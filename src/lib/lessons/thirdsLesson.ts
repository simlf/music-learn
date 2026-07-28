/**
 * Content and grading for the first shipping interactive lesson: major vs.
 * minor third (LEARN-01). This is the pure data + grading layer only; the
 * component (`InteractiveLesson.svelte`, Wave 2) owns rendering, state
 * machine, and audio calls. No Svelte, audio, or DOM imports here, matching
 * the theory-engine purity convention in `$lib/theory/types.ts`.
 *
 * The `LessonStep` shape is deliberately generic so future lessons (triads,
 * sevenths, and beyond) can be added as additional `LessonStep[]` arrays
 * without changing the component's rendering or grading logic. Only the
 * thirds lesson ships this phase; the extensibility is structural, not yet
 * exercised by a second lesson.
 */

import { Note } from 'tonal';
import type { IntervalRole } from '$lib/theory/types';
import { toAsciiAccidentals } from '$lib/theory/interval';

/**
 * A bilingual copy pair (I18N-02, Phase 20 Plan 06). Every human-language
 * lesson-copy field is one of these instead of a bare string so the
 * component can resolve `field[currentLocale()]` at render time. Structural
 * fields (`targetChroma`, `role`, `letter`, `hearable`) stay bare values -
 * they aren't human language and never localize.
 */
export interface BilingualCopy {
	en: string;
	fr: string;
}

/** One step in a guided interactive lesson. */
export interface LessonStep {
	/** Step heading, plain language, no em dashes, en+fr. */
	title: BilingualCopy;
	/**
	 * Plain-language instruction sentence, en+fr. May contain one
	 * inline-emphasized interval phrase wrapped in the app's `**phrase**`
	 * emphasis convention (rendered verdigris, Body weight 700, by the
	 * component). The `**...**` markers are preserved verbatim in both
	 * languages so the component's marker-parsing logic works unchanged.
	 */
	body: BilingualCopy;
	/**
	 * Target pitch class (0-11, relative to C=0) this step's tap must match.
	 * `null` marks a pure "hear it, then continue" step with no tap to grade.
	 */
	targetChroma: number | null;
	/** Interval role the earned note takes for the keyboard fill. `null` when the step earns no note. */
	role: IntervalRole | null;
	/**
	 * Canonical DISPLAY glyph for the earned note (e.g. 'C', 'E', 'E♭'), used
	 * to populate `earnedNotes`. This is the interval-correct spelling, NOT
	 * necessarily the sharp spelling the keyboard reports for black keys.
	 * `null` when the step earns no note.
	 */
	letter: string | null;
	/** Whether a Hear/Hear again control appears once this step is active or done. */
	hearable: boolean;
	/** Check-line copy shown on a correct tap, en+fr. `null` when the step has no tap to grade correctly. */
	correctLine: BilingualCopy | null;
	/**
	 * Retry copy shown on a wrong tap, en+fr. Each language string contains
	 * the literal placeholder token `{N}`, which the component interpolates
	 * with `semitonesFromC`'s result. `null` when the step has no tap to grade.
	 */
	wrongHint: BilingualCopy | null;
}

/**
 * The locked four-step major-vs-minor-third lesson (LEARN-01). Order is
 * fixed: anchor root, major third, hear it, minor third.
 *
 * The copy teaches NUMBER + QUALITY, never a keyboard recipe: the number
 * counts letter names (C, D, E is three names, so a "third"), the quality
 * counts half steps (four is major, three is minor). Step 4 deliberately
 * keeps the same three letters as step 2 so the reader sees that E♭ is still
 * an E, only nearer: an interval is a DISTANCE between two notes, never a
 * property of the top note. Never write "that black key is a minor third" -
 * it is false for D to F, E to G, A to C, B to D and F♯ to A, and it is the
 * confusion that later breaks ♭♭7 in dim7 and m7b5 versus m6.
 */
export const THIRDS_LESSON: LessonStep[] = [
	{
		title: { en: 'The bottom note', fr: 'La note du bas' },
		body: {
			en: 'Every third starts from a home note. Tap C to set your anchor.',
			fr: "Chaque tierce part d'une note de base. Touche C pour poser ton ancrage."
		},
		targetChroma: 0,
		role: 'root',
		letter: 'C',
		hearable: true,
		correctLine: null,
		wrongHint: {
			en: "That's not C. Find the white key just left of the group of two black keys.",
			fr: "Ce n'est pas C. Trouve la touche blanche juste à gauche du groupe de deux touches noires."
		}
	},
	{
		title: {
			en: 'Why a third is four half steps',
			fr: 'Pourquoi une tierce fait quatre demi-tons'
		},
		body: {
			en: 'Letter names first: C, D, E. Three names, so the distance is a **third**. Now half steps: C♯, D, D♯, E. Four of them. The name counts letters, the quality counts half steps, and that never changes. Tap E.',
			fr: "D'abord les noms de notes : C, D, E. Trois noms, donc la distance est une **tierce**. Maintenant les demi-tons : C♯, D, D♯, E. Quatre. Le nom compte les lettres, la qualité compte les demi-tons, et ça ne change jamais. Touche E."
		},
		targetChroma: 4,
		role: 'third',
		letter: 'E',
		hearable: true,
		correctLine: { en: "That's it. Nicely found.", fr: 'Voilà. Bien trouvé.' },
		wrongHint: {
			en: 'A major third is 4 half steps. That one was {N}. Try again.',
			fr: 'Une tierce majeure fait 4 demi-tons. Celle-là en fait {N}. Réessaie.'
		}
	},
	{
		title: { en: 'Hear the bright one', fr: 'Écoute la lumineuse' },
		body: {
			en: 'C and E together, four half steps apart. That distance is a **major third**: open, bright, the happy sound.',
			fr: "C et E ensemble, à quatre demi-tons d'écart. Cette distance est une **tierce majeure** : ouverte, lumineuse, le son joyeux."
		},
		targetChroma: null,
		role: null,
		letter: null,
		hearable: true,
		correctLine: null,
		wrongHint: null
	},
	{
		title: {
			en: 'The same third, one half step smaller',
			fr: 'La même tierce, un demi-ton plus petite'
		},
		body: {
			en: 'Move the top note down one half step, to E♭. Still the letters C, D, E, so still a **third**. But three half steps instead of four, and that is what makes it minor. Tap it.',
			fr: "Descends la note du haut d'un demi-ton, jusqu'à E♭. Toujours les lettres C, D, E, donc toujours une **tierce**. Mais trois demi-tons au lieu de quatre, et c'est ça qui la rend mineure. Touche-la."
		},
		targetChroma: 3,
		role: 'third',
		letter: 'E♭',
		hearable: true,
		correctLine: {
			en: "That's it. Same letters, smaller distance.",
			fr: 'Voilà. Mêmes lettres, distance plus petite.'
		},
		wrongHint: {
			en: 'A minor third is 3 half steps. That one was {N}. Try again.',
			fr: 'Une tierce mineure fait 3 demi-tons. Celle-là en fait {N}. Réessaie.'
		}
	}
];

/**
 * The C major and C minor triads whose middle notes ARE the major and minor
 * thirds this lesson taught. The LEARN-03 handoff seeds these into /drills
 * via the existing `setDrillSeeds`/`consumeDrillSeeds` one-shot mechanism.
 */
export const THIRDS_LESSON_DRILL_SEEDS: string[] = ['C', 'Cm'];

/**
 * Returns the pitch class of `tappedLetter` measured up from C (C=0),
 * 0-11. Drives the "That one was {N}" wrong-tap count-hint copy, whose unit
 * word is always "half steps" (never "keys" or "semitones"): the lesson is
 * the app's first, so it sets the vocabulary every later surface reuses.
 * Total: returns -1 for an unparseable letter rather than throwing, so
 * callers can treat it as no meaningful distance.
 */
export function semitonesFromC(tappedLetter: string): number {
	const chroma = Note.chroma(toAsciiAccidentals(tappedLetter));
	if (chroma === undefined) return -1;
	return (chroma + 12) % 12;
}

/**
 * Grades a lesson step tap by chroma comparison only, never letter-string
 * equality (locked v2 constraint). Enharmonic-blind: a D♯ tap grades
 * identically to an E♭ tap against `targetChroma: 3`. A step with
 * `targetChroma: null` has no tap to grade and always returns false. Total:
 * an unparseable `tappedLetter` returns false rather than throwing.
 */
export function gradeLessonTap(step: LessonStep, tappedLetter: string): boolean {
	if (step.targetChroma === null) return false;
	const tappedChroma = Note.chroma(toAsciiAccidentals(tappedLetter));
	if (tappedChroma === undefined) return false;
	return tappedChroma === step.targetChroma;
}
