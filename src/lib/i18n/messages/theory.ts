import type { LocaleDict } from './index';

/**
 * Theory-domain dictionary (I18N-02, Phase 20 Plan 06): the /theory static
 * shape lessons (`+page.svelte`), the Phase 19 `InteractiveLesson.svelte`
 * do-then-check controls, and `ChordExample.svelte`'s "Hear it" button.
 *
 * IMMUNITY (never keyed here): chord symbols (Cmaj7, Cm7b5...), ChordGlyph
 * output, interval shorthand (m3/P5/m7), solfège syllables (Do/Ré/Mi...), and
 * the mnemonic hook lines themselves (mnemonics.ts is owned by 20-09; only
 * this file's OWN "The hook" sidebar label is keyed here).
 */
export const theory: LocaleDict = {
	en: {
		'theory.page.title': 'Theory',
		'theory.page.subtitle':
			"The shop's field guide to chord symbols. Six short lessons, every one with real keys under it.",

		'theory.hearIt': 'Hear it',

		'theory.hook.label': 'The hook',

		'theory.lesson.heading': "Play it, don't just read it",
		'theory.lesson.subtitle':
			'Four small steps. Tap what each one asks, hear what you built, and it sticks.',
		'theory.lesson.continue': 'Continue',
		'theory.lesson.done': 'Done',
		'theory.lesson.handoff.tag': 'You just learned this',
		'theory.lesson.handoff.heading': 'Now make it stick',
		'theory.lesson.handoff.body':
			'The beginner course on /drills will show you chords like these and ask for the notes. The third you just found is the middle note of every triad: major third, happy triad; minor third, sad triad.',
		'theory.lesson.handoff.cta': 'Try this in a drill →',

		'theory.symbol.label': 'Reading a chord symbol',
		'theory.symbol.heading': 'Root, then quality',
		'theory.symbol.body':
			'A chord symbol is two instructions. The letter is the root: where the left hand starts. Everything after it is the quality: the shape you stack on top. Cm7 says start on C, stack the minor-seventh shape.',
		'theory.symbol.exampleCaption': 'Start on C (Do), stack the m7 shape.',

		'theory.sevenths.label': 'The seventh shapes',
		'theory.sevenths.heading': 'One triad, one seventh',
		'theory.sevenths.body':
			'Every seventh chord is a triad plus one more third. Two choices name them all: which triad (major, minor, diminished) and which 7th (7, ♭7, or ♭♭7). Tap through the five on C.',
		'theory.sevenths.caption.maj7': 'Major triad + 7. At rest.',
		'theory.sevenths.caption.dom7': 'Major triad + ♭7. Pushes.',
		'theory.sevenths.caption.m7': 'Minor triad + ♭7. Travels.',
		'theory.sevenths.caption.m7b5': 'Diminished triad + ♭7.',
		'theory.sevenths.caption.dim7': 'Diminished triad + ♭♭7.',

		'theory.anchor.label': 'The white-key anchor',
		'theory.anchor.heading': 'One scale, four qualities',
		'theory.anchor.body':
			'Stack a seventh on each note of the C major scale and every chord lands on white keys only: Cmaj7, Dm7, Em7, Fmaj7, G7, Am7, Bm7b5. One hand position teaches four qualities and their day jobs. Tap each one.',
		'theory.anchor.caption.i': 'The I chord. Home.',
		'theory.anchor.caption.ii': 'The ii. On its way.',
		'theory.anchor.caption.iii': 'The iii. Home in disguise.',
		'theory.anchor.caption.iv': 'The IV. A step out the door.',
		'theory.anchor.caption.v7': 'The V7. Pulls home.',
		'theory.anchor.caption.vi': 'The vi. The relative minor.',
		'theory.anchor.caption.vii': 'The viiø7. The restless one.',

		'theory.dominant.label': 'The dominant engine',
		'theory.dominant.heading': 'Why 7 pulls home',
		'theory.dominant.body':
			'Inside G7, the 3 and the ♭7 (B and F) sit a tritone apart: the restless interval. B leans up to C, F leans down to E, and the whole chord tips into C major. That pull is what makes a V7 a V7.',
		'theory.dominant.exampleCaption': 'The tritone lives between B and F.',
		'theory.dominant.hearButton': 'Hear G7 resolve',

		'theory.diminished.label': 'Half versus full',
		'theory.diminished.heading': 'ø7 and °7 untangled',
		'theory.diminished.body':
			'Both grow from the diminished triad. Half diminished, written ø or m7b5, keeps a plain ♭7. Fully diminished, written °7, flattens the 7th again to ♭♭7. The half in the name is about the 7th, nothing else.',
		'theory.diminished.halfCaption': 'Bø7 = Bm7b5. Same chord, two spellings.',
		'theory.diminished.fullCaption': 'B°7. The 7th flattened twice.',

		'theory.solfege.label': 'Do, ré, mi',
		'theory.solfege.heading': 'Both languages',
		'theory.solfege.body':
			'Letters and solfège name the same keys. The syllable follows the letter, not the accidental: C♯ is still Do, B♭ is still Si. Et voilà.',

		'theory.footer.drillsButton': 'Take it to the drills'
	},
	fr: {
		'theory.page.title': 'Théorie',
		'theory.page.subtitle':
			"Le guide de terrain de l'atelier pour les symboles d'accords. Six leçons courtes, chacune avec de vraies touches dessous.",

		'theory.hearIt': 'Écouter',

		'theory.hook.label': "L'astuce",

		'theory.lesson.heading': 'Joue-le, ne fais pas que le lire',
		'theory.lesson.subtitle':
			'Quatre petites étapes. Touche ce que chacune demande, écoute ce que tu as construit, et ça reste.',
		'theory.lesson.continue': 'Continuer',
		'theory.lesson.done': 'Fait',
		'theory.lesson.handoff.tag': "Tu viens d'apprendre ça",
		'theory.lesson.handoff.heading': 'Maintenant, ancre-le',
		'theory.lesson.handoff.body':
			"Le parcours débutant sur /drills te montrera des accords comme ceux-ci et te demandera les notes. La tierce que tu viens de trouver est la note du milieu de chaque triade : tierce majeure, triade joyeuse, tierce mineure, triade triste.",
		'theory.lesson.handoff.cta': 'Essayer dans un exercice →',

		'theory.symbol.label': "Lire un symbole d'accord",
		'theory.symbol.heading': 'Fondamentale, puis qualité',
		'theory.symbol.body':
			"Un symbole d'accord donne deux instructions. La lettre indique la fondamentale : où la main gauche commence. Tout ce qui suit indique la qualité : la forme à empiler par-dessus. Cm7 dit de commencer sur C, puis d'empiler la forme mineure septième.",
		'theory.symbol.exampleCaption': 'Commence sur C (Do), empile la forme m7.',

		'theory.sevenths.label': 'Les formes de septième',
		'theory.sevenths.heading': 'Une triade, une septième',
		'theory.sevenths.body':
			"Chaque accord de septième est une triade plus une tierce de plus. Deux choix suffisent à tous les nommer : quelle triade (majeure, mineure, diminuée) et quelle septième (7, ♭7, ou ♭♭7). Touche les cinq sur C.",
		'theory.sevenths.caption.maj7': 'Triade majeure + 7. Au repos.',
		'theory.sevenths.caption.dom7': 'Triade majeure + ♭7. Ça pousse.',
		'theory.sevenths.caption.m7': 'Triade mineure + ♭7. Ça voyage.',
		'theory.sevenths.caption.m7b5': 'Triade diminuée + ♭7.',
		'theory.sevenths.caption.dim7': 'Triade diminuée + ♭♭7.',

		'theory.anchor.label': "L'ancrage aux touches blanches",
		'theory.anchor.heading': 'Une gamme, quatre qualités',
		'theory.anchor.body':
			"Empile une septième sur chaque note de la gamme de Do majeur et chaque accord tombe uniquement sur des touches blanches : Cmaj7, Dm7, Em7, Fmaj7, G7, Am7, Bm7b5. Une seule position de main enseigne quatre qualités et leur rôle. Touche chacune.",
		'theory.anchor.caption.i': "L'accord I. La maison.",
		'theory.anchor.caption.ii': 'Le ii. En chemin.',
		'theory.anchor.caption.iii': 'Le iii. La maison déguisée.',
		'theory.anchor.caption.iv': 'Le IV. Un pas dehors.',
		'theory.anchor.caption.v7': 'Le V7. Tire vers la maison.',
		'theory.anchor.caption.vi': 'Le vi. Le relatif mineur.',
		'theory.anchor.caption.vii': 'Le viiø7. Celui qui ne tient pas en place.',

		'theory.dominant.label': 'Le moteur dominant',
		'theory.dominant.heading': 'Pourquoi 7 tire vers la maison',
		'theory.dominant.body':
			"Dans G7, la 3 et la ♭7 (B et F) sont séparées d'un triton : l'intervalle instable. B monte vers C, F descend vers E, et tout l'accord bascule vers Do majeur. Cette tension, c'est ce qui fait qu'un V7 est un V7.",
		'theory.dominant.exampleCaption': 'Le triton se cache entre B et F.',
		'theory.dominant.hearButton': 'Écouter G7 se résoudre',

		'theory.diminished.label': 'Demi contre plein',
		'theory.diminished.heading': 'ø7 et °7 démêlés',
		'theory.diminished.body':
			"Les deux naissent de la triade diminuée. Le demi-diminué, noté ø ou m7b5, garde une simple ♭7. Le diminué complet, noté °7, abaisse encore la septième jusqu'à ♭♭7. Le demi dans le nom concerne la septième, rien d'autre.",
		'theory.diminished.halfCaption': 'Bø7 = Bm7b5. Même accord, deux écritures.',
		'theory.diminished.fullCaption': 'B°7. La septième abaissée deux fois.',

		'theory.solfege.label': 'Do, ré, mi',
		'theory.solfege.heading': 'Les deux langues',
		'theory.solfege.body':
			"Les lettres et le solfège nomment les mêmes touches. La syllabe suit la lettre, pas l'altération : C♯ reste Do, B♭ reste Si. Et voilà.",

		'theory.footer.drillsButton': 'Direction les exercices'
	}
};
