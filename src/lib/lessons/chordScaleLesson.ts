import type { LessonStep } from './thirdsLesson';

/**
 * Content for the CHORD-SCALE lesson (design doc `.planning/design/
 * improvisation.md` §5.4/§4.1, `ml-modes-practice` scout report): "the scale
 * that fits a chord is the major scale of the key it came from, started on
 * the chord's own root" — shown, not asserted, via `InteractiveLesson`'s
 * generic step shell. No new grading: `gradeLessonTap`/`semitonesFromC` from
 * `thirdsLesson.ts` are already total over any `LessonStep[]`, this module
 * only supplies the data.
 *
 * SHIPPED HARDCODED TO C (per the scout report's own fallback): guided-path
 * Phase 2 (parameterizing a lesson's root/key) is not built, and
 * `InteractiveLesson` itself is hardcoded to sound a C-rooted chord for
 * every "Hear it" (see its own doc comment) — it cannot honestly represent a
 * SECOND chord's own root. So this lesson never claims to sound Dm7 or G7;
 * it stays anchored on C major throughout and teaches the "different
 * starting point" idea by tapping G and D as scale-degrees of C, then NAMING
 * what that same seven-letter set is called when a G7 or Dm7 chord (the ii-V
 * the guide-tone lesson already introduced) puts its own root there. This is
 * new content, distinct from `ChordScaleConcept.svelte`'s already-shipped
 * chord-tone-vs-scale-tone lesson (same demo chord, different question).
 */
export const CHORD_SCALE_LESSON: LessonStep[] = [
	{
		title: { en: 'The same seven letters', fr: 'Les mêmes sept lettres' },
		body: {
			en: 'C major is seven letters: C, D, E, F, G, A, B. Tap C to set your anchor.',
			fr: 'Do majeur, ce sont sept lettres : C, D, E, F, G, A, B. Touche C pour poser ton ancrage.'
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
		title: { en: 'Start the count from G instead', fr: 'Compte à partir de G' },
		body: {
			en: 'Same seven letters, counted from G: G, A, B, C, D, E, F. Nothing new was added. Over a G7 chord, this exact set has a name: **G mixolydian**. Tap G.',
			fr: "Mêmes sept lettres, comptées à partir de G : G, A, B, C, D, E, F. Rien de nouveau n'a été ajouté. Sur un accord G7, cet ensemble exact porte un nom : **sol mixolydien**. Touche G."
		},
		targetChroma: 7,
		role: 'fifth',
		letter: 'G',
		hearable: true,
		correctLine: {
			en: 'That is it. Same seven letters, just started from G.',
			fr: "Voilà. Mêmes sept lettres, juste comptées à partir de G."
		},
		wrongHint: {
			en: 'G is four white keys to the right of C. Try again.',
			fr: 'G est quatre touches blanches à droite de C. Réessaie.'
		}
	},
	{
		title: { en: 'Start the count from D instead', fr: 'Compte à partir de D' },
		body: {
			en: 'Same seven letters again, counted from D: D, E, F, G, A, B, C. Over a Dm7 chord, the same ii chord from the guide-tone lesson, this exact set is called **D dorian**. Tap D.',
			fr: "Encore les mêmes sept lettres, comptées à partir de D : D, E, F, G, A, B, C. Sur un accord Dm7, le même accord ii de la leçon des notes-guides, cet ensemble exact s'appelle **ré dorien**. Touche D."
		},
		targetChroma: 2,
		role: 'second',
		letter: 'D',
		hearable: true,
		correctLine: {
			en: 'That is it. Still the same seven letters, just started from D.',
			fr: "Voilà. Toujours les mêmes sept lettres, juste comptées à partir de D."
		},
		wrongHint: {
			en: 'D is the very next white key after C. Try again.',
			fr: 'D est la toute première touche blanche après C. Réessaie.'
		}
	},
	{
		title: { en: 'One set of letters, several names', fr: 'Un seul ensemble de lettres, plusieurs noms' },
		body: {
			en: 'Ionian, mixolydian, dorian: every one of those names only says where in C major the counting started. The notes were never new, and neither is the sound you already know how to find.',
			fr: "Ionien, mixolydien, dorien : chacun de ces noms dit seulement où, dans do majeur, le comptage a commencé. Les notes n'ont jamais changé, et le son non plus, tu sais déjà le trouver."
		},
		targetChroma: null,
		role: null,
		letter: null,
		hearable: true,
		correctLine: null,
		wrongHint: null
	}
];

/**
 * The Dm7/G7 chords named in the lesson (the same ii-V the guide-tone lesson
 * already teaches): handed to /practice via the existing lesson-seeds
 * handoff, so the lesson's own examples are the first thing practiced.
 */
export const CHORD_SCALE_LESSON_DRILL_SEEDS: string[] = ['Dm7', 'G7'];
