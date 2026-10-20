import type { LessonStep } from './thirdsLesson';

/**
 * Content for chapter 11's concept lesson, guide tones and voice leading
 * (`.planning/design/improvisation.md` section 4.2): `Dm7`, `G7`, `Cmaj7`
 * showing only the 3rd and the 7th of each, on `InteractiveLesson`'s step
 * shell. Each tap is the note the line moves to, so the half step is played,
 * not asserted.
 *
 * Every letter here is the fixed C-major demo that `guideTones.ts` derives
 * (`GUIDE_TONE_BARS`, `GUIDE_TONE_MOTIONS`); `guideToneLesson.test.ts` pins
 * each step's target, lit notes and "Hear it" chord to that engine, so the
 * copy cannot drift from the computation.
 *
 * PRECISION (the neighbouring claim shipped false once, commit 6a13ade): the
 * moving note is the 7th of one chord falling to the 3rd of the NEXT, never
 * "the same note is a 7th and then a 3rd". The held note is the one that
 * changes role: F is the 3rd of Dm7 and the 7th of G7, the same key held.
 * No step mentions a tritone: that belongs to the dominant lesson.
 *
 * `shows` sets the whole board after each tap, because the held note's role
 * (and so its colour) changes from one chord to the next. `hearNotes` plays
 * the chord on the board, not a C-anchored pair. The last step hands over to
 * the editable pattern rendered right under the lesson.
 */
export const GUIDE_TONE_LESSON: LessonStep[] = [
	{
		title: { en: 'Two notes, one chord', fr: 'Deux notes, un accord' },
		body: {
			en: 'Dm7 in two notes: F, its 3rd, says minor, and C, its 7th, says which seventh. Tap **C, the 7th**: it is the note that moves next.',
			fr: "Dm7 en deux notes : F, sa tierce, dit mineur, et C, sa septième, dit quelle septième. Touche **C, la septième** : c'est la note qui va bouger."
		},
		targetChroma: 0,
		role: 'seventh',
		letter: 'C',
		shows: [
			{ letter: 'F', role: 'third' },
			{ letter: 'C', role: 'seventh' }
		],
		hearNotes: ['F', 'C'],
		hearable: true,
		correctLine: {
			en: 'F and C: that is all Dm7 needs.',
			fr: "F et C : c'est tout ce qu'il faut à Dm7."
		},
		wrongHint: {
			en: 'Not C. C is the white key just left of the two black keys.',
			fr: "Ce n'est pas C. C est la touche blanche juste à gauche des deux touches noires."
		}
	},
	{
		title: { en: 'Watch one note move', fr: 'Regarde une note bouger' },
		body: {
			en: 'Next chord, G7. Keep F where it is. Move C down **one half step**, to the very next key below it. Tap where it lands.',
			fr: "Accord suivant, G7. Garde F où il est. Descends C d'**un demi-ton**, sur la touche juste en dessous. Touche l'endroit où il arrive."
		},
		targetChroma: 11,
		role: 'third',
		letter: 'B',
		shows: [
			{ letter: 'F', role: 'seventh' },
			{ letter: 'B', role: 'third' }
		],
		hearNotes: ['F', 'B'],
		hearable: true,
		correctLine: {
			en: 'B, the 3rd of G7. F did not move: it was the 3rd of Dm7, it is the 7th of G7.',
			fr: "B, la tierce de G7. F n'a pas bougé : c'était la tierce de Dm7, c'est la septième de G7."
		},
		wrongHint: {
			en: 'One half step below C is B, the white key just under the top C.',
			fr: "Un demi-ton sous C, c'est B, la touche blanche juste sous le C du haut."
		}
	},
	{
		title: { en: 'Again, the same rule', fr: 'Encore, la même règle' },
		body: {
			en: 'Last chord, Cmaj7. This time B holds, and F, the 7th of G7, falls **one half step**. Tap where it lands.',
			fr: "Dernier accord, Cmaj7. Cette fois B tient, et F, la septième de G7, descend d'**un demi-ton**. Touche l'endroit où il arrive."
		},
		targetChroma: 4,
		role: 'third',
		letter: 'E',
		shows: [
			{ letter: 'E', role: 'third' },
			{ letter: 'B', role: 'seventh' }
		],
		hearNotes: ['E', 'B'],
		hearable: true,
		correctLine: {
			en: 'E, the 3rd of Cmaj7. B held: the 3rd of G7 is the 7th of Cmaj7.',
			fr: 'E, la tierce de Cmaj7. B a tenu : la tierce de G7 est la septième de Cmaj7.'
		},
		wrongHint: {
			en: 'One half step below F is E, the white key just left of F, with no black key between them.',
			fr: "Un demi-ton sous F, c'est E, la touche blanche juste à gauche de F, sans touche noire entre les deux."
		}
	},
	{
		title: { en: 'Two lines, not two notes', fr: 'Deux lignes, pas deux notes' },
		body: {
			en: 'At every change one note holds and the other falls a half step. Your ear follows that fall as a line resolving, and that is why two notes sound like music. Just below, hear the two lines as a pattern you can edit.',
			fr: "À chaque changement, une note tient et l'autre descend d'un demi-ton. L'oreille suit cette chute comme une ligne qui se résout : voilà pourquoi deux notes sonnent comme de la musique. Juste en dessous, écoute les deux lignes dans un motif que tu peux modifier."
		},
		targetChroma: null,
		role: null,
		letter: null,
		hearable: false,
		correctLine: null,
		wrongHint: null
	}
];
