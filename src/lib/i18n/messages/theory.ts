import type { LocaleDict } from './index';

/**
 * Theory-domain dictionary (I18N-02, Phase 20 Plan 06): the shape lessons in
 * `TheoryLessons.svelte` (rendered on /learn; /theory is now a 308 redirect
 * shim with no page component), the Phase 19 `InteractiveLesson.svelte`
 * do-then-check controls, and `ChordExample.svelte`'s "Hear it" button.
 *
 * `theory.page.subtitle` was deleted with the /theory page component it
 * belonged to: it still promised "Six short lessons" while /learn renders
 * eight blocks under its own subtitle, so it was dead AND wrong. Do not
 * reintroduce a lesson COUNT in any copy here; the block list changes.
 *
 * IMMUNITY (never keyed here): chord symbols (Cmaj7, Cm7b5...), ChordGlyph
 * output, interval shorthand (m3/P5/m7), solfège syllables (Do/Ré/Mi...), and
 * the mnemonic hook lines themselves (mnemonics.ts is owned by 20-09; only
 * this file's OWN "The hook" sidebar label is keyed here).
 */
export const theory = {
	en: {
		'theory.page.title': 'Theory',

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
			'The beginner course on /drills will show you chords like these and ask for the notes. The third you just measured is what decides a triad: four half steps up from the root gives a major triad, three gives a minor one.',
		'theory.lesson.handoff.cta': 'Try this in a drill →',

		// Unit 4 (interval naming, guided-path.md): extends the thirds lesson's
		// own do-then-check InteractiveLesson shell (generalized to accept a
		// `steps` prop) rather than restating it. Only the subtitle and the
		// inline "prove it" block need their own copy; the heading and the four
		// step cards' own copy live in intervalNamingLesson.ts, matching the
		// thirds lesson's precedent of keeping step content out of the message
		// catalog entirely.
		'theory.intervalNaming.subtitle':
			'The same rule as before, for every interval: the number counts letters, the quality counts half steps.',
		'theory.intervalNaming.prove.heading': 'Spell a few',
		'theory.intervalNaming.prove.body':
			'Pick the letter first, then the accidental. The right key with the wrong letter still misses: that mismatch is exactly what this lesson is about.',

		'theory.scale.label': 'The major scale',
		'theory.scale.heading': 'One ruler, every key',
		'theory.scale.body':
			'A major scale is seven notes measured off one fixed ruler: whole, whole, half, whole, whole, whole, half. Move that ruler to any starting note and the letters change, but the gaps between them never do. Pick a tonic and build it, one step at a time.',

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
		'theory.anchor.heading': 'Seven degrees, one fixed order',
		'theory.anchor.body':
			'Stack a seventh on each note of the C major scale and the qualities fall out in a fixed order: maj7, m7, m7, maj7, 7, m7, m7♭5. All white keys here, which is why you learn it in C. That order is identical in every key, so this is seven degrees to learn, not 84 chords. We number them with roman numerals, capital when the chord\'s third is major, small when it is minor. So "ii in B♭" means the second degree of B♭ major, minor 7th: Cm7. That is chart reading.',
		'theory.anchor.caption.i': 'I: first degree, always maj7. Home. This is the tonic.',
		'theory.anchor.caption.ii': 'ii: second degree, always m7. Its job is to set up the V.',
		'theory.anchor.caption.iii': 'iii: third degree, m7. Tonic family: home, one shade darker.',
		'theory.anchor.caption.iv': 'IV: fourth degree, always maj7. A step out the door.',
		'theory.anchor.caption.v7': 'V: fifth degree, always 7. It pulls home. This is the dominant.',
		'theory.anchor.caption.vi': 'vi: sixth degree, m7. Tonic family too, a softer way to sit at home.',
		'theory.anchor.caption.vii': 'viiø7: seventh degree, always m7♭5. Restless, and it leans home.',

		'theory.function.label': 'The three jobs',
		'theory.function.heading': 'What function means',
		'theory.function.body':
			"Function is a chord's job in the key, and there are three jobs. Tonic is home: I, with iii and vi. Subdominant has stepped out the door: ii and IV. Dominant is the pull back: V, and viiø7 with it. That is what a drill means when it reveals FUNCTION: SUBDOMINANT.",
		'theory.function.sentence':
			'ii V I is the jazz sentence: approach, push, arrive. In C that is Dm7, G7, Cmaj7, and the roots fall by fifths, D to G to C. The push in the middle is a tritone resolving, which the next lesson takes apart.',
		'theory.function.hearButton': 'Hear ii V I',

		'theory.guideTones.label': 'Guide tones',
		'theory.guideTones.heading': 'Why two notes sound like music',
		'theory.guideTones.body':
			'The shell is two notes: the 3rd and the 7th. Play a ii V I and the 7th of one chord falls a half step to become the 3rd of the next, while the other note holds still. That fall, not the notes alone, is why two notes read as music.',
		'theory.guideTones.caption.ii':
			'F is the 3rd. It says Dm7 is minor. C is the 7th. Together, that is all Dm7 needs.',
		'theory.guideTones.caption.v':
			"F holds: it was Dm7's 3rd, now it is G7's 7th. C falls one half step to B, G7's 3rd.",
		'theory.guideTones.caption.i':
			"B holds: it was G7's 3rd, now it is Cmaj7's 7th. F falls one half step to E, Cmaj7's 3rd.",
		'theory.guideTones.hearButton': 'Hear it move',
		'theory.guideTones.practiceNote':
			'The shell voicing drill on /practice already grades this, in every key.',

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
			"Le parcours débutant sur /drills te montrera des accords comme ceux-ci et te demandera les notes. La tierce que tu viens de mesurer est ce qui décide d'une triade : quatre demi-tons au-dessus de la fondamentale donnent une triade majeure, trois en donnent une mineure.",
		'theory.lesson.handoff.cta': 'Essayer dans un exercice →',

		'theory.intervalNaming.subtitle':
			'La même règle qu\'avant, pour chaque intervalle : le chiffre compte les lettres, la qualité compte les demi-tons.',
		'theory.intervalNaming.prove.heading': 'Épelle-en quelques-uns',
		'theory.intervalNaming.prove.body':
			"Choisis d'abord la lettre, puis l'altération. La bonne touche avec la mauvaise lettre reste fausse : c'est exactement le piège de cette leçon.",

		'theory.scale.label': 'La gamme majeure',
		'theory.scale.heading': 'Une règle, tous les tons',
		'theory.scale.body':
			"Une gamme majeure, ce sont sept notes mesurées sur une règle fixe : ton, ton, demi-ton, ton, ton, ton, demi-ton. Déplace cette règle sur n'importe quelle note de départ et les lettres changent, mais les écarts entre elles ne changent jamais. Choisis une tonique et construis-la, étape par étape.",

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
		'theory.anchor.heading': 'Sept degrés, un ordre fixe',
		'theory.anchor.body':
			"Empile une septième sur chaque note de la gamme de Do majeur et les qualités sortent dans un ordre fixe : maj7, m7, m7, maj7, 7, m7, m7♭5. Que des touches blanches ici, et c'est pour ça qu'on l'apprend en Do. Cet ordre est identique dans tous les tons : sept degrés à apprendre, pas 84 accords. On les numérote en chiffres romains, majuscule quand la tierce de l'accord est majeure, minuscule quand elle est mineure. Donc « ii en Si♭ » veut dire le deuxième degré de Si♭ majeur, mineur septième : Cm7. Lire une grille, c'est ça.",
		'theory.anchor.caption.i': 'I : premier degré, toujours maj7. La maison. La tonique.',
		'theory.anchor.caption.ii': 'ii : deuxième degré, toujours m7. Son rôle : préparer le V.',
		'theory.anchor.caption.iii':
			'iii : troisième degré, m7. Famille tonique : la maison, une nuance plus sombre.',
		'theory.anchor.caption.iv': 'IV : quatrième degré, toujours maj7. Un pas dehors.',
		'theory.anchor.caption.v7': 'V : cinquième degré, toujours 7. Il tire vers la maison. La dominante.',
		'theory.anchor.caption.vi':
			'vi : sixième degré, m7. Famille tonique aussi, une façon plus douce de rester chez soi.',
		'theory.anchor.caption.vii':
			'viiø7 : septième degré, toujours m7♭5. Instable, et il penche vers la maison.',

		'theory.function.label': 'Les trois rôles',
		'theory.function.heading': 'Ce que veut dire la fonction',
		'theory.function.body':
			"La fonction, c'est le rôle d'un accord dans le ton, et il y en a trois. La tonique est à la maison : I, avec iii et vi. La sous-dominante est sortie : ii et IV. La dominante, c'est ce qui tire vers le retour : V, et viiø7 avec lui. Voilà ce que veut dire FONCTION : SOUS-DOMINANTE quand un exercice l'affiche.",
		'theory.function.sentence':
			"ii V I, c'est la phrase du jazz : on approche, on pousse, on arrive. En Do : Dm7, G7, Cmaj7, et les fondamentales descendent de quinte en quinte, D, G, C. La poussée du milieu est un triton qui se résout, et la leçon suivante le démonte.",
		'theory.function.hearButton': 'Écouter ii V I',

		'theory.guideTones.label': 'Tons de guidage',
		'theory.guideTones.heading': 'Pourquoi deux notes sonnent comme de la musique',
		'theory.guideTones.body':
			"Le shell, ce sont deux notes : la tierce et la septième. Joue un ii V I et la septième d'un accord descend d'un demi-ton pour devenir la tierce du suivant, pendant que l'autre note reste en place. Cette descente, pas les notes seules, est ce qui fait que deux notes sonnent comme de la musique.",
		'theory.guideTones.caption.ii':
			"F, c'est la tierce. Elle dit que Dm7 est mineur. C, c'est la septième. À elles deux, c'est tout ce qu'il faut à Dm7.",
		'theory.guideTones.caption.v':
			"F reste : c'était la tierce de Dm7, c'est maintenant la septième de G7. C descend d'un demi-ton vers B, la tierce de G7.",
		'theory.guideTones.caption.i':
			"B reste : c'était la tierce de G7, c'est maintenant la septième de Cmaj7. F descend d'un demi-ton vers E, la tierce de Cmaj7.",
		'theory.guideTones.hearButton': 'Écouter le mouvement',
		'theory.guideTones.practiceNote':
			"L'exercice de voicing en shell, sur /practice, note déjà ça, dans tous les tons.",

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
} satisfies LocaleDict;
