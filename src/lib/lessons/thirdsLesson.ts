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
		title: { en: 'A major third is 4 keys up', fr: 'Une tierce majeure, c’est 4 touches plus haut' },
		body: {
			en: 'Count 4 keys to the right of C, counting the black keys too. That lands on E. Tap it.',
			fr: 'Compte 4 touches à droite de C, en comptant aussi les touches noires. Tu arrives sur E. Touche-la.'
		},
		targetChroma: 4,
		role: 'third',
		letter: 'E',
		hearable: true,
		correctLine: { en: "That's it. Nicely found.", fr: 'Voilà. Bien trouvé.' },
		wrongHint: {
			en: "That's {N} keys up. A major third is 4. Try again.",
			fr: "C'est {N} touches plus haut. Une tierce majeure, c'est 4. Réessaie."
		}
	},
	{
		title: { en: 'Hear the bright one', fr: 'Écoute la lumineuse' },
		body: {
			en: "C and E together. That's a **major third**: open, bright, the happy sound.",
			fr: 'C et E ensemble. C’est une **tierce majeure** : ouverte, lumineuse, le son joyeux.'
		},
		targetChroma: null,
		role: null,
		letter: null,
		hearable: true,
		correctLine: null,
		wrongHint: null
	},
	{
		title: { en: 'Now the sad one: 3 keys up', fr: 'Maintenant la triste : 3 touches plus haut' },
		body: {
			en: 'Move the top note down one key, to just 3 keys above C. That black key is a **minor third**: darker.',
			fr: "Descends la note du haut d'une touche, à seulement 3 touches au-dessus de C. Cette touche noire est une **tierce mineure** : plus sombre."
		},
		targetChroma: 3,
		role: 'third',
		letter: 'E♭',
		hearable: true,
		correctLine: { en: "That's it. Hear the difference?", fr: 'Voilà. Tu entends la différence ?' },
		wrongHint: {
			en: "That's {N} keys up. A minor third is 3. Try again.",
			fr: "C'est {N} touches plus haut. Une tierce mineure, c'est 3. Réessaie."
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
 * 0-11. Drives the "That's {N} keys up" wrong-tap count-hint copy.
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
