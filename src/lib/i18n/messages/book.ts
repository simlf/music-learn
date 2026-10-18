import type { LocaleDict } from './index';

/**
 * Book domain dictionary: the method-book chapter template (Concept / At the
 * piano / In the repertoire / Practice checklist, `Chapter.svelte`) and the
 * chapters built on it, starting with chapter 15, shells in every key.
 *
 * IMMUNITY: chord symbols, note letters, roman numerals, key letters, tune
 * titles and years stay raw values, never routed through t(). `{name}`
 * placeholders are filled by the component with those immune values.
 */
export const book = {
	en: {
		// Chapter chrome
		'book.part.2': 'Part II · The left hand',
		'book.chapter.label': 'Chapter',
		'book.chapter.back': 'Back to Learn',
		'book.block.concept': 'Concept',
		'book.block.piano': 'At the piano',
		'book.block.repertoire': 'In the repertoire',
		'book.block.checklist': 'Practice checklist',
		'book.grading.checked': 'Checked: the app grades every chord',
		'book.grading.guided': 'Guided: the app plays and shows it, you judge it',

		// In the repertoire
		'book.repertoire.changesOnly': 'changes only',
		'book.repertoire.playOver': 'Play over it',
		'book.repertoire.drill': 'Drill these chords',

		// Practice checklist
		'book.checklist.byApp': 'The app ticks this',
		'book.checklist.byYou': 'You tick this',
		'book.checklist.note': 'A list, not a score. Ticks stay on this device and nothing counts them.',

		// /learn entry row
		'book.learn.open': 'Open the chapter',

		// Chapter 15: shells in every key
		'book.ch15.title': 'Shells in every key',
		'book.ch15.idea':
			'Root at the bottom, then the 3rd and the 7th in either order: pick the order that keeps your hand still.',
		'book.ch15.concept.body':
			'Three notes are enough for the left hand to say a chord. The root names it, the 3rd says major or minor, the 7th says which seventh. Put the root at the bottom and the other two above it, the 3rd under the 7th or the 7th under the 3rd. From one chord to the next, swap the order: the top two notes barely move. One holds, the other steps down.',
		'book.ch15.concept.caption': 'The ii V I of Autumn Leaves, in B♭. Tap a chord to hear it.',
		'book.ch15.concept.flat5':
			'On a ♭5 chord, the iiø of a minor key, the same three notes still work. You may add the ♭5 too, if you want its darker sound heard: it is allowed, not required.',
		'book.ch15.position.thirdLow': '3rd under 7th',
		'book.ch15.position.seventhLow': '7th under 3rd',
		'book.ch15.piano.intro':
			"A ii V I in all 12 keys, around the cycle of fourths: each key's I is the next key's V. Play every chord with the root lowest. Then the same in minor.",
		'book.ch15.formLabel': 'Form',
		'book.ch15.keyLabel': 'Key',
		'book.ch15.prompt': 'Root at the bottom, then the 3rd and the 7th.',
		'book.ch15.prompt.flat5': 'Root at the bottom, then the 3rd and the 7th. You may add the ♭5 if you like.',
		'book.ch15.motion': 'Keep {held}. Move {from} down to {to}.',
		'book.ch15.button.check': 'Check',
		'book.ch15.button.hear': 'Hear it',
		'book.ch15.button.show': 'Show me',
		'book.ch15.button.clear': 'Clear',
		'book.ch15.button.again': 'Start again',
		'book.ch15.retry.missing': 'Missing: {letters}.',
		'book.ch15.retry.extra': 'Not in this shell: {letters}.',
		'book.ch15.retry.bass': 'Right notes. Now put the root, {root}, at the bottom.',
		'book.ch15.shown': 'Shown with the {position}. Play it, then Check.',
		'book.ch15.right': 'Right: {symbol}.',
		'book.ch15.keyDone': '{key} done. Next key: {next}.',
		'book.ch15.done.clean': 'All 12 keys, every one clean. The checklist line is ticked.',
		'book.ch15.done.retry':
			'All 12 keys. Still to play clean, with no retry and no Show me: {keys}. Tap a key to run it again.',
		'book.ch15.check.major': 'ii V I shells in all 12 keys, every key clean: no retry, no Show me.',
		'book.ch15.check.minor': 'iiø V i shells in all 12 keys, every key clean.',
		'book.ch15.check.eyesOff': 'On your piano, the major cycle from memory, naming each chord out loud.',
		'book.ch15.check.stillHand':
			'Swap the order from chord to chord so the top two notes only hold or step down, never jump.',
		'book.ch15.check.comp': 'Comp the first eight bars of Autumn Leaves with shells while the loop plays them.',
		'book.ch15.tune.autumn.bars': 'Bars 1 to 8',
		'book.ch15.tune.autumn.note':
			'Both kinds of ii V in one A section. Bars 1 to 3 are a ii V I in B♭, bars 5 to 7 the minor iiø V i in G minor. Same shells, two keys.',
		'book.ch15.tune.attya.bars': 'Bars 1 to 5',
		'book.ch15.tune.attya.note':
			'Five roots, each a fourth above the last: the cycle you just practised, in A♭. Bars 2 to 4 are its ii V I.'
	},
	fr: {
		// Chapter chrome
		'book.part.2': 'Partie II · La main gauche',
		'book.chapter.label': 'Chapitre',
		'book.chapter.back': 'Retour à Apprendre',
		'book.block.concept': 'Concept',
		'book.block.piano': 'Au piano',
		'book.block.repertoire': 'Dans le répertoire',
		'book.block.checklist': 'Liste de travail',
		'book.grading.checked': "Vérifié : l'app corrige chaque accord",
		'book.grading.guided': "Guidé : l'app le joue et le montre, tu juges",

		// In the repertoire
		'book.repertoire.changesOnly': 'grille seulement',
		'book.repertoire.playOver': 'Improviser dessus',
		'book.repertoire.drill': 'Travailler ces accords',

		// Practice checklist
		'book.checklist.byApp': "L'app coche cette ligne",
		'book.checklist.byYou': 'À toi de cocher',
		'book.checklist.note':
			'Une liste, pas une note. Les coches restent sur cet appareil et rien ne les compte.',

		// /learn entry row
		'book.learn.open': 'Ouvrir le chapitre',

		// Chapter 15: shells in every key
		'book.ch15.title': 'Les shells dans toutes les tonalités',
		'book.ch15.idea':
			"La fondamentale en bas, puis la tierce et la septième dans l'ordre que tu veux : choisis celui qui garde ta main immobile.",
		'book.ch15.concept.body':
			"Trois notes suffisent à la main gauche pour dire un accord. La fondamentale le nomme, la tierce dit majeur ou mineur, la septième dit quelle septième. Mets la fondamentale en bas et les deux autres au-dessus, la tierce sous la septième ou la septième sous la tierce. D'un accord au suivant, inverse l'ordre : les deux notes du haut bougent à peine. L'une tient, l'autre descend d'un pas.",
		'book.ch15.concept.caption': "Le ii V I d'Autumn Leaves, en si♭. Touche un accord pour l'entendre.",
		'book.ch15.concept.flat5':
			"Sur un accord ♭5, le iiø d'une tonalité mineure, les trois mêmes notes suffisent. Tu peux aussi ajouter la ♭5 pour faire entendre sa couleur plus sombre : elle est permise, pas exigée.",
		'book.ch15.position.thirdLow': 'tierce sous la septième',
		'book.ch15.position.seventhLow': 'septième sous la tierce',
		'book.ch15.piano.intro':
			"Un ii V I dans les 12 tonalités, autour du cycle des quartes : le I de chaque tonalité est le V de la suivante. Joue chaque accord avec la fondamentale en bas. Puis la même chose en mineur.",
		'book.ch15.formLabel': 'Forme',
		'book.ch15.keyLabel': 'Ton',
		'book.ch15.prompt': 'La fondamentale en bas, puis la tierce et la septième.',
		'book.ch15.prompt.flat5': 'La fondamentale en bas, puis la tierce et la septième. Tu peux ajouter la ♭5 si tu veux.',
		'book.ch15.motion': 'Garde {held}. Descends {from} vers {to}.',
		'book.ch15.button.check': 'Vérifier',
		'book.ch15.button.hear': "L'entendre",
		'book.ch15.button.show': 'Montre-moi',
		'book.ch15.button.clear': 'Effacer',
		'book.ch15.button.again': 'Recommencer',
		'book.ch15.retry.missing': 'Il manque : {letters}.',
		'book.ch15.retry.extra': 'Pas dans ce shell : {letters}.',
		'book.ch15.retry.bass': 'Les bonnes notes. Mets maintenant la fondamentale, {root}, en bas.',
		'book.ch15.shown': 'Montré avec la {position}. Joue-le, puis Vérifier.',
		'book.ch15.right': 'Juste : {symbol}.',
		'book.ch15.keyDone': '{key} fini. Tonalité suivante : {next}.',
		'book.ch15.done.clean': 'Les 12 tonalités, toutes sans faute. La ligne de la liste est cochée.',
		'book.ch15.done.retry':
			'Les 12 tonalités. Reste à jouer sans faute, sans nouvel essai ni Montre-moi : {keys}. Touche une tonalité pour la refaire.',
		'book.ch15.check.major':
			'Les shells du ii V I dans les 12 tonalités, chacune sans faute : ni nouvel essai, ni Montre-moi.',
		'book.ch15.check.minor': 'Les shells du iiø V i dans les 12 tonalités, chacune sans faute.',
		'book.ch15.check.eyesOff': 'Sur ton piano, le cycle majeur de mémoire, en disant chaque accord à voix haute.',
		'book.ch15.check.stillHand':
			"Inverse l'ordre d'un accord à l'autre pour que les deux notes du haut tiennent ou descendent d'un pas, sans jamais sauter.",
		'book.ch15.check.comp':
			"Accompagne les huit premières mesures d'Autumn Leaves en shells pendant que la boucle les joue.",
		'book.ch15.tune.autumn.bars': 'Mesures 1 à 8',
		'book.ch15.tune.autumn.note':
			"Les deux sortes de ii V dans une seule section A. Les mesures 1 à 3 sont un ii V I en si♭, les mesures 5 à 7 le iiø V i mineur en sol mineur. Les mêmes shells, deux tonalités.",
		'book.ch15.tune.attya.bars': 'Mesures 1 à 5',
		'book.ch15.tune.attya.note':
			"Cinq fondamentales, chacune une quarte au-dessus de la précédente : le cycle que tu viens de travailler, en la♭. Les mesures 2 à 4 sont son ii V I."
	}
} satisfies LocaleDict;
