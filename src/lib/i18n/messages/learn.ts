import type { LocaleDict } from './index';

/**
 * Learn domain dictionary (I18N-02, Phase 28 Plan 03): the `/learn` hub page
 * (theory + scale explore + interval reference sections), the Scale practice
 * affordance on `/practice`, and the extracted TheoryLessons/ScaleExplorer
 * components when rendered outside their original routes.
 *
 * IMMUNITY: (same as theory.ts and scales.ts) chord symbols, interval
 * shorthand, solfège syllables, scale degree numbers - all stay as raw values,
 * never routed through t().
 */
export const learn = {
	en: {
		// /learn page
		'learn.page.title': 'Learn',
		'learn.page.subtitle':
			"Read the theory, explore the major scale, and see how any chord's intervals stack.",

		// Section eyebrow labels
		'learn.section.theory.label': 'Theory',
		'learn.section.explore.label': 'Scale Explore',
		'learn.section.explore.heading': 'Explore the major scale',
		'learn.section.interval.label': 'Interval Reference',
		'learn.section.interval.heading': 'How every seventh chord stacks',
		'learn.section.interval.intro':
			'Five qualities, one repeating pattern of thirds. Compare the gaps below.',

		// Interval reference quality labels (match /theory SEVENTH_SHAPES captions)
		'learn.interval.maj7': 'MAJ7',
		'learn.interval.dom7': 'DOM7',
		'learn.interval.m7': 'M7',
		'learn.interval.m7b5': 'M7♭5',
		'learn.interval.dim7': 'DIM7',

		// Comping loop (the play-along companion). IMMUNITY: the roman-numeral
		// form shapes ("ii V I"), the 12 key letters, the chord symbols and the
		// BPM figure are all immune display values, assembled in
		// CompingLoop.svelte from the progression engine, never routed through
		// t(). Only the surrounding words are keyed here.
		'learn.comping.label': 'PLAY ALONG',
		'learn.comping.heading': 'Comping loop',
		'learn.comping.intro':
			'The app comps the changes on repeat and you improvise over them. Nothing here is graded, scored, or added to your practice queue. There is no right answer. It is a loop to play over.',
		'learn.comping.formLabel': 'FORM',
		'learn.comping.keyLabel': 'KEY',
		'learn.comping.tempoLabel': 'TEMPO',
		'learn.comping.tempoUnit': 'BPM',
		'learn.comping.tempoDown': 'Slower',
		'learn.comping.tempoUp': 'Faster',
		'learn.comping.holdLabel': 'HOLD',
		'learn.comping.holdBar': 'Loop this bar',
		'learn.comping.holdNote': 'Holding this bar. It repeats instead of moving through the form.',
		'learn.comping.scaleLabel': 'SCALE',
		'learn.comping.scaleChip': 'Show the scale',
		// {BAR} is the bar number and {SCALE} the scale name, both assembled in
		// CompingLoop.svelte: the number is a figure and the name comes from the
		// shared improvise.scale.name.* dictionary.
		'learn.comping.scaleLine': 'Bar {BAR}: {SCALE}',
		'learn.comping.scaleCaption':
			'The hatched keys are the whole scale playable over this bar. The keys the loop is holding keep their interval colour. A vermilion bar means the note rubs against the chord if it is held. Nothing here is graded.',
		'learn.comping.start': 'Start the loop',
		'learn.comping.starting': 'Starting',
		'learn.comping.stop': 'Stop',
		'learn.comping.voicingCaption':
			'The loop plays the root low, then the guide tones above it: the 3rd, which says major or minor, and the 7th, which says which seventh. Everything above them is yours.',
		'learn.comping.voicingCaption-flat5':
			'On this bar the ♭5 stays in too. On a ♭5 symbol the fifth is the chord identity, not filler.',
		'learn.comping.keyboardCaption': 'The lit keys are what the loop plays on this bar.',
		'learn.comping.soundOff':
			'Sound is off, so the loop has nothing to play. Turn it back on in Progress, under Practice Settings.',
		'learn.comping.studyNote':
			'Study mode is on, so each bar rolls one note at a time instead of landing as a block.',

		// Footer CTA
		'learn.footer.practiceButton': 'Go to Practice',

		// Scale practice disclosure on /practice
		'learn.scale-practice.toggle': 'Scale practice',
		'learn.scale-practice.close': 'Hide scale practice',
		'learn.scale-practice.heading': 'Practice a major scale',
		'learn.scale-practice.body': 'Pick a tonic, then play its scale ascending and back down.'
	},
	fr: {
		// (Same structure, French translations)
		'learn.page.title': 'Apprendre',
		'learn.page.subtitle':
			"Lis la théorie, explore la gamme majeure et vois comment les intervalles de n'importe quel accord s'empilent.",
		'learn.section.theory.label': 'Théorie',
		'learn.section.explore.label': 'Explorer la gamme',
		'learn.section.explore.heading': 'Explorer la gamme majeure',
		'learn.section.interval.label': 'Référence des intervalles',
		'learn.section.interval.heading': "Comment s'empilent tous les accords de septième",
		'learn.section.interval.intro':
			'Cinq qualités, un motif répétitif de tierces. Compare les écarts ci-dessous.',
		'learn.interval.maj7': 'MAJ7',
		'learn.interval.dom7': 'DOM7',
		'learn.interval.m7': 'M7',
		'learn.interval.m7b5': 'M7♭5',
		'learn.interval.dim7': 'DIM7',
		'learn.comping.label': 'JOUER DESSUS',
		'learn.comping.heading': "Boucle d'accompagnement",
		'learn.comping.intro':
			"L'app joue la grille en boucle et tu improvises dessus. Rien n'est noté ici, rien n'est compté, rien ne rejoint ta file de pratique. Il n'y a pas de bonne réponse. C'est une boucle sur laquelle jouer.",
		'learn.comping.formLabel': 'FORME',
		'learn.comping.keyLabel': 'TON',
		'learn.comping.tempoLabel': 'TEMPO',
		'learn.comping.tempoUnit': 'BPM',
		'learn.comping.tempoDown': 'Plus lent',
		'learn.comping.tempoUp': 'Plus vite',
		'learn.comping.holdLabel': 'BOUCLE',
		'learn.comping.holdBar': 'Boucler cette mesure',
		'learn.comping.holdNote':
			"Cette mesure est bouclée. Elle se répète au lieu d'avancer dans la grille.",
		'learn.comping.scaleLabel': 'GAMME',
		'learn.comping.scaleChip': 'Afficher la gamme',
		'learn.comping.scaleLine': 'Mesure {BAR} : {SCALE}',
		'learn.comping.scaleCaption':
			"Les touches hachurées sont toute la gamme jouable sur cette mesure. Celles que la boucle tient gardent leur couleur d'intervalle. Une barre vermillon signale une note qui frotte contre l'accord si elle est tenue. Rien n'est noté ici.",
		'learn.comping.start': 'Lancer la boucle',
		'learn.comping.starting': 'Démarrage',
		'learn.comping.stop': 'Arrêter',
		'learn.comping.voicingCaption':
			"La boucle joue la fondamentale en bas, puis les tons de guidage au-dessus : la tierce, qui dit majeur ou mineur, et la septième, qui dit quelle septième c'est. Tout ce qui est au-dessus est à toi.",
		'learn.comping.voicingCaption-flat5':
			"Sur cette mesure la ♭5 reste aussi. Sur un symbole en ♭5, la quinte fait l'identité de l'accord, ce n'est pas du remplissage.",
		'learn.comping.keyboardCaption': 'Les touches allumées sont ce que la boucle joue sur cette mesure.',
		'learn.comping.soundOff':
			'Le son est coupé, la boucle n\'a donc rien à jouer. Réactive-le dans Progrès, dans les réglages de pratique.',
		'learn.comping.studyNote':
			"Le mode étude est activé : chaque mesure est arpégée note par note au lieu d'être plaquée.",

		'learn.footer.practiceButton': 'Direction la pratique',
		'learn.scale-practice.toggle': 'Pratique de gamme',
		'learn.scale-practice.close': 'Masquer la pratique de gamme',
		'learn.scale-practice.heading': 'Pratiquer une gamme majeure',
		'learn.scale-practice.body':
			'Choisis une tonique, puis joue sa gamme en montant puis en descendant.'
	}
} satisfies LocaleDict;
