/**
 * Content for unit 4 of the curriculum spine (guided-path.md): interval =
 * number + quality, generalized beyond thirds. A pedagogy audit called this
 * "the highest-value single addition" to the app, because the number+quality
 * split is what makes every later enharmonic decision comprehensible
 * (♭♭7 in a dim7, m7♭5 versus m6, every altered-chord spelling).
 *
 * `claude/t5-curriculum-core` already rewrote `thirdsLesson.ts` to teach this
 * mechanism for the narrow case of thirds ("Letter names first: C, D, E.
 * Three names, so the distance is a third. Now half steps..."). This module
 * EXTENDS that, it does not restate it: step 3 here explicitly recalls the
 * thirds lesson's own C-to-E♭ result rather than re-deriving it, then uses a
 * second interval (C to D, then C to D♯) to show the same split at work with
 * a different number, landing on the flagship contrast: D♯ and E♭ are the
 * same key, but D♯ is only two letters from C (a second) while E♭ is three
 * (a third), and that is why the two are named differently despite sounding
 * identical.
 *
 * Same `LessonStep[]` shape as thirdsLesson.ts (rendered by the same
 * `InteractiveLesson.svelte`, now generalized to accept a `steps` prop), and
 * the same purity rules: no Svelte, audio, or DOM imports here.
 */

import type { LessonStep } from './thirdsLesson';

/**
 * Four steps: anchor, a plain second (establishes the letter-counting method
 * on new ground), the augmented second (one half step sharper, same two
 * letters), then the payoff contrast with the already-taught minor third.
 * Deliberately shorter than the thirds lesson: the MECHANISM was already
 * taught there, so this only needs to prove it generalizes and land the
 * enharmonic payoff, before handing off to the spelling drill that actually
 * exercises it across intervals ("Keep it short" per the owning brief).
 */
export const INTERVAL_NAMING_LESSON: LessonStep[] = [
	{
		title: { en: 'The bottom note, again', fr: 'La note du bas, encore' },
		body: {
			en: 'Every interval works this same way, not just thirds. Tap C to set the anchor.',
			fr: "Chaque intervalle fonctionne de la même façon, pas seulement les tierces. Touche C pour poser l'ancrage."
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
		title: { en: 'Two letters, so a second', fr: 'Deux lettres, donc une seconde' },
		body: {
			en: 'C, D: two letter names, so this distance is called a **second**, whatever the accidental turns out to be. Tap D.',
			fr: "C, D : deux noms de notes, donc cette distance s'appelle une **seconde**, quelle que soit l'altération. Touche D."
		},
		targetChroma: 2,
		role: 'second',
		letter: 'D',
		hearable: true,
		correctLine: { en: "That's it. Two letters, a second.", fr: 'Voilà. Deux lettres, une seconde.' },
		wrongHint: {
			en: 'A major second is 2 half steps. That one was {N}. Try again.',
			fr: 'Une seconde majeure fait 2 demi-tons. Celle-là en fait {N}. Réessaie.'
		}
	},
	{
		title: {
			en: 'One more half step, one word changes',
			fr: 'Un demi-ton de plus, un seul mot change'
		},
		body: {
			en: 'Move up one more half step, to D♯. Still just two letters, C and D, so still a **second**. Two half steps was major, three makes it augmented. Tap it.',
			fr: "Monte encore d'un demi-ton, jusqu'à D♯. Toujours deux lettres, C et D, donc toujours une **seconde**. Deux demi-tons, c'était majeur, trois, ça devient augmenté. Touche-la."
		},
		targetChroma: 3,
		role: 'second',
		letter: 'D♯',
		hearable: true,
		correctLine: {
			en: 'That’s it. Same two letters, one half step sharper.',
			fr: 'Voilà. Mêmes deux lettres, un demi-ton plus haut.'
		},
		wrongHint: {
			en: 'An augmented second is 3 half steps. That one was {N}. Try again.',
			fr: 'Une seconde augmentée fait 3 demi-tons. Celle-là en fait {N}. Réessaie.'
		}
	},
	{
		title: { en: 'Same key, different name', fr: 'Même touche, nom différent' },
		body: {
			en: 'That D♯ key is the exact same key as E♭, the minor third you already found above C. E♭ has three letter names, C, D, E, so it is a third. D♯ has two, C, D, so it is a second. The letters decide the **number**, never the key. That is also why a diminished 7th above C is spelled B♭♭ and not A: same key, but the seventh needs the letter B.',
			fr: "Cette touche D♯ est exactement la même touche que E♭, la tierce mineure que tu as déjà trouvée au-dessus de C. E♭ a trois noms de notes, C, D, E, donc c'est une tierce. D♯ en a deux, C, D, donc c'est une seconde. Ce sont les lettres qui décident du **chiffre**, jamais la touche. C'est aussi pour ça qu'une septième diminuée au-dessus de C s'écrit B♭♭ et non A : même touche, mais la septième a besoin de la lettre B."
		},
		targetChroma: null,
		role: null,
		letter: null,
		hearable: true,
		correctLine: null,
		wrongHint: null
	}
];
