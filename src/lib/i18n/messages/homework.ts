import type { LocaleDict } from './index';

/**
 * Homework domain dictionary: the /homework page where the teacher's book
 * exercises (note reading, rhythm) are opened by page and exercise number,
 * and the two drills behind it.
 *
 * IMMUNITY: note letters, octave numbers, tempo numbers and printed page and
 * exercise numbers stay raw values, never routed through t(). `{name}`
 * placeholders are filled by the component with those immune values.
 */
export const homework = {
	en: {
		'homework.practiceLink': "Your teacher's homework",
		'homework.page.title': 'Homework',
		'homework.page.intro':
			"Type the page and exercise number from your teacher's book and it opens here: notes to read, or a rhythm to tap with a metronome.",
		'homework.pending':
			'The exercises here are transcribed by hand from the books and are still waiting to be checked against them. If something looks different from your book, trust the book.',
		'homework.kind.label': 'Book',
		'homework.kind.reading': 'Note reading',
		'homework.kind.rhythm': 'Rhythm',
		'homework.book.reading': 'Dandelot, Manuel pratique (Eschig, 1928)',
		'homework.book.rhythm': 'Dandelot, Etude du rythme, cahier 1 (Leduc)',
		'homework.field.page': 'Page',
		'homework.field.exercise': 'Exercise',
		'homework.open': 'Open',
		'homework.error.badInput': 'Type the page and the exercise as whole numbers, like 5 and 2.',
		'homework.error.noPage': 'That page is not in the app yet. Pages available: {PAGES}.',
		'homework.error.noExercise':
			'Page {PAGE} has no such exercise here. Exercises available on that page: {EXERCISES}.',
		'homework.catalog.label': 'Available now',
		'homework.catalog.page': 'Page {PAGE}',
		'homework.exercise.title': 'Page {PAGE}, exercise {N}',
		'homework.record': 'Best {BEST}%, attempts: {N}',
		'homework.result.label': 'Result',
		'homework.result.passed': 'Passed',
		'homework.result.notYet': 'Not yet',

		// Metronome
		'homework.metronome.tempo': 'Tempo',
		'homework.metronome.unit': 'BPM',
		'homework.metronome.slower': 'Slower',
		'homework.metronome.faster': 'Faster',
		'homework.metronome.slider': 'Tempo in beats per minute',
		'homework.metronome.countIn': 'Count-in',
		'homework.metronome.countIn.none': 'None',
		'homework.metronome.countIn.one': '1 bar',
		'homework.metronome.countIn.two': '2 bars',

		// Rhythm drill
		'homework.rhythm.start': 'Play along',
		'homework.rhythm.again': 'Play along again',
		'homework.rhythm.clickOnly': 'Click only',
		'homework.rhythm.stop': 'Stop',
		'homework.rhythm.stopClick': 'Stop the click',
		'homework.rhythm.tap': 'Tap',
		'homework.rhythm.tapHint': 'Space bar, or tap here',
		'homework.rhythm.tapAria': 'Tap the rhythm',
		'homework.rhythm.perfect': 'Spot on: {N}',
		'homework.rhythm.good': 'Close enough: {N}',
		'homework.rhythm.missed': 'Missed: {N}',
		'homework.rhythm.extra': 'Extra taps: {N}',
		'homework.rhythm.rushing': 'You are rushing: {MS} ms early on average.',
		'homework.rhythm.dragging': 'You are dragging: {MS} ms late on average.',
		'homework.rhythm.steady': 'Your taps sit right on the beat.',
		'homework.rhythm.window': 'A tap counts within {MS} ms of the written note.',
		'homework.rhythm.trySlower': 'Try {BPM} BPM',

		// Reading drill
		'homework.reading.progress': 'Note {N} of {TOTAL}',
		'homework.reading.answerLabel': 'Name the ringed note',
		'homework.reading.midiConnected': 'MIDI piano connected ({DEVICE}): play the note.',
		'homework.reading.midiUnsupported': 'This browser has no MIDI. Use the note buttons or the A to G keys.',
		'homework.reading.midiHint':
			'Answer with the note buttons or the A to G keys, or play it on a MIDI piano.',
		'homework.reading.midiConnect': 'Connect MIDI',
		'homework.reading.correct': 'Yes, {NOTE}.',
		'homework.reading.wrong': 'Not {GIVEN}: that note is {NOTE}.',
		'homework.reading.wrongOctave':
			'Right letter, wrong octave: you played {GIVEN}, the note is {NOTE}.',
		'homework.reading.correctOf': '{CORRECT} of {TOTAL} correct',
		'homework.reading.speed': 'About {S} s per note.',
		'homework.reading.mistakes': 'To look at again',
		'homework.reading.mistakeRow': 'Note {N}: {NOTE}, you answered {GIVEN}',
		'homework.reading.again': 'Read it again'
	},
	fr: {
		'homework.practiceLink': 'Les devoirs de ton prof',
		'homework.page.title': 'Devoirs',
		'homework.page.intro':
			'Tape la page et le numéro de l’exercice du livre de ton prof : il s’ouvre ici, des notes à lire ou un rythme à frapper avec un métronome.',
		'homework.pending':
			'Les exercices ici sont recopiés à la main depuis les livres et attendent encore d’être vérifiés avec eux. Si quelque chose diffère de ton livre, fais confiance au livre.',
		'homework.kind.label': 'Livre',
		'homework.kind.reading': 'Lecture de notes',
		'homework.kind.rhythm': 'Rythme',
		'homework.book.reading': 'Dandelot, Manuel pratique (Eschig, 1928)',
		'homework.book.rhythm': 'Dandelot, Étude du rythme, cahier 1 (Leduc)',
		'homework.field.page': 'Page',
		'homework.field.exercise': 'Exercice',
		'homework.open': 'Ouvrir',
		'homework.error.badInput':
			'Tape la page et l’exercice en nombres entiers, par exemple 5 et 2.',
		'homework.error.noPage': 'Cette page n’est pas encore dans l’appli. Pages disponibles : {PAGES}.',
		'homework.error.noExercise':
			'La page {PAGE} n’a pas cet exercice ici. Exercices disponibles sur cette page : {EXERCISES}.',
		'homework.catalog.label': 'Disponible maintenant',
		'homework.catalog.page': 'Page {PAGE}',
		'homework.exercise.title': 'Page {PAGE}, exercice {N}',
		'homework.record': 'Meilleur score {BEST} %, essais : {N}',
		'homework.result.label': 'Résultat',
		'homework.result.passed': 'Réussi',
		'homework.result.notYet': 'Pas encore',

		'homework.metronome.tempo': 'Tempo',
		'homework.metronome.unit': 'BPM',
		'homework.metronome.slower': 'Plus lent',
		'homework.metronome.faster': 'Plus vite',
		'homework.metronome.slider': 'Tempo en battements par minute',
		'homework.metronome.countIn': 'Décompte',
		'homework.metronome.countIn.none': 'Aucun',
		'homework.metronome.countIn.one': '1 mesure',
		'homework.metronome.countIn.two': '2 mesures',

		'homework.rhythm.start': 'Jouer avec le clic',
		'homework.rhythm.again': 'Rejouer avec le clic',
		'homework.rhythm.clickOnly': 'Clic seul',
		'homework.rhythm.stop': 'Arrêter',
		'homework.rhythm.stopClick': 'Arrêter le clic',
		'homework.rhythm.tap': 'Frapper',
		'homework.rhythm.tapHint': 'Barre d’espace, ou touche ici',
		'homework.rhythm.tapAria': 'Frapper le rythme',
		'homework.rhythm.perfect': 'Pile : {N}',
		'homework.rhythm.good': 'Assez proche : {N}',
		'homework.rhythm.missed': 'Manquées : {N}',
		'homework.rhythm.extra': 'Frappes en trop : {N}',
		'homework.rhythm.rushing': 'Tu presses : {MS} ms trop tôt en moyenne.',
		'homework.rhythm.dragging': 'Tu traînes : {MS} ms trop tard en moyenne.',
		'homework.rhythm.steady': 'Tes frappes tombent bien sur le temps.',
		'homework.rhythm.window': 'Une frappe compte à {MS} ms près de la note écrite.',
		'homework.rhythm.trySlower': 'Essaie {BPM} BPM',

		'homework.reading.progress': 'Note {N} sur {TOTAL}',
		'homework.reading.answerLabel': 'Nomme la note entourée',
		'homework.reading.midiConnected': 'Piano MIDI connecté ({DEVICE}) : joue la note.',
		'homework.reading.midiUnsupported':
			'Ce navigateur n’a pas de MIDI. Utilise les boutons de notes ou les touches A à G.',
		'homework.reading.midiHint':
			'Réponds avec les boutons de notes ou les touches A à G, ou joue-la sur un piano MIDI.',
		'homework.reading.midiConnect': 'Connecter le MIDI',
		'homework.reading.correct': 'Oui, {NOTE}.',
		'homework.reading.wrong': 'Pas {GIVEN} : cette note est {NOTE}.',
		'homework.reading.wrongOctave':
			'Bonne note, mauvaise octave : tu as joué {GIVEN}, la note est {NOTE}.',
		'homework.reading.correctOf': '{CORRECT} sur {TOTAL} justes',
		'homework.reading.speed': 'Environ {S} s par note.',
		'homework.reading.mistakes': 'À revoir',
		'homework.reading.mistakeRow': 'Note {N} : {NOTE}, tu as répondu {GIVEN}',
		'homework.reading.again': 'Relire'
	}
} satisfies LocaleDict;
