import type { LocaleDict } from './index';

/**
 * Book domain dictionary: the method-book chapter template (Concept / At the
 * piano / In the repertoire / Practice checklist, `Chapter.svelte`) and the
 * chapters built on it: chapter 11 (guide tones, the first Part I unit on
 * the template), then chapters 15 and 16.
 *
 * IMMUNITY: chord symbols, note letters, roman numerals, key letters, tune
 * titles and years stay raw values, never routed through t(). `{name}`
 * placeholders are filled by the component with those immune values.
 */
export const book = {
	en: {
		// Chapter chrome
		'book.part.1': 'Part I · Reading the chart',
		'book.part.2': 'Part II · The left hand',
		'book.chapter.label': 'Chapter',
		'book.chapter.back': 'Back to Learn',
		'book.block.concept': 'Concept',
		'book.block.piano': 'At the piano',
		'book.block.repertoire': 'In the repertoire',
		'book.block.checklist': 'Practice checklist',
		'book.grading.checked': 'Checked: the app grades every step',
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

		// Chapter 11: guide tones and voice leading
		'book.ch11.title': 'Guide tones and voice leading',
		'book.ch11.idea':
			'In a ii V I, the 7th of each chord falls a half step to the 3rd of the next while the other note holds. That is why two notes sound like music.',
		'book.ch11.concept.body':
			'The shell is two notes, the 3rd and the 7th, because those two carry the chord: the 3rd says major or minor, the 7th says which seventh. They are also the two that move. Play a ii V I with nothing else and, at each change, one of them holds while the other steps down a half step. Tap your way through it first.',
		'book.ch11.lesson.subtitle': 'ii V I in C, the 3rd and the 7th only. Tap each note the line moves to.',
		'book.ch11.concept.linesIntro':
			'The same ii V I as a pattern, one line of code per voice: the top line, the bottom line, then the roots. Pick a key and press Play. Then open the pattern, delete the roots line, and hear that the two guide tones still say ii V I.',
		'book.ch11.lines.keyLabel': 'Key',
		'book.ch11.lines.upper': 'Top line:',
		'book.ch11.lines.lower': 'Bottom line:',
		'book.ch11.lines.play': 'Play the lines',
		'book.ch11.lines.stop': 'Stop',
		'book.ch11.lines.edit': 'Edit the pattern',
		'book.ch11.lines.reset': 'Reset',
		'book.ch11.lines.editIntro':
			'Each note(...) line is one voice. Delete a line or change a note, then play it again.',
		'book.ch11.lines.soundOff':
			'Sound is off, so this pattern has nothing to play. Turn it back on in Progress, under Practice Settings.',
		'book.ch11.lines.unavailable':
			"Live code isn't available right now. Open this once with an internet connection so your device can keep it for offline use.",
		'book.ch11.lines.visualUnavailable':
			"The pattern is playing, but its pianoroll can't be shown right now. Open this once with an internet connection so your device can keep it for offline use.",
		'book.ch11.lines.errorPrefix': 'That pattern has a problem:',
		'book.ch11.piano.intro':
			"A ii V I in all 12 keys, around the cycle of fourths, with the 3rd and the 7th only: no root. Start each key with either note at the bottom. From the V on, keep the note that holds on its key and move the other one down. Right notes played with a jump are a retry.",
		'book.ch11.keyLabel': 'Key',
		'book.ch11.prompt.first': 'The 3rd and the 7th only, no root. Either one at the bottom.',
		'book.ch11.prompt.next': 'The 3rd and the 7th only, carrying on the line: one note holds, the other steps down.',
		'book.ch11.motion': 'Keep {held}. Move {from} down to {to}.',
		'book.ch11.button.check': 'Check',
		'book.ch11.button.hear': 'Hear it',
		'book.ch11.button.show': 'Show me',
		'book.ch11.button.clear': 'Clear',
		'book.ch11.button.again': 'Start again',
		'book.ch11.retry.missing': 'Missing: {letters}.',
		'book.ch11.retry.extra': 'Not a guide tone here: {letters}.',
		'book.ch11.retry.jump':
			'Right notes, but the hand jumped. Keep {held} on the key it was on and move {from} down a half step.',
		'book.ch11.shown.first': 'Shown with the 3rd at the bottom. Play it, then Check.',
		'book.ch11.shown.next': 'Shown moving on from the pair you just played. Play it, then Check.',
		'book.ch11.right': 'Right: {symbol}.',
		'book.ch11.keyDone': '{key} done. Next key: {next}.',
		'book.ch11.done.clean': 'All 12 keys, every one clean. The checklist line is ticked.',
		'book.ch11.done.retry':
			'All 12 keys. Still to play clean, with no retry and no Show me: {keys}. Tap a key to run it again.',
		'book.ch11.check.cycle': 'ii V I guide tones in all 12 keys, every key clean: no retry, no jump, no Show me.',
		'book.ch11.check.noRoots': 'In the pattern, delete the roots line and hear the two guide tones still say ii V I.',
		'book.ch11.check.sing': 'At your piano, play the guide tones of ii V I in C and sing the note that falls.',
		'book.ch11.check.comp': 'Comp bars 9 to 12 of Blue Bossa with the guide tones only while the loop plays them.',
		'book.ch11.tune.blueBossa.bars': 'Bars 9 to 12',
		'book.ch11.tune.blueBossa.note':
			'The tune leaves C minor for a ii V I in D♭. D♭, the 7th of E♭m7, falls to C, the 3rd of A♭7. Then G♭, the 7th of A♭7, falls to F, the 3rd of D♭maj7. Each time the other note holds.',
		'book.ch11.tune.satinDoll.bars': 'Bars 1 to 4, two chords a bar',
		'book.ch11.tune.satinDoll.note':
			'Two ii Vs, each played twice, the second a whole step higher. Inside each, the 7th of the first chord falls a half step to the 3rd of the second, and the 3rd of the first holds as the 7th of the second.',

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
			'Five roots, each a fourth above the last: the cycle you just practised, in A♭. Bars 2 to 4 are its ii V I.',

		// Chapter 16: the circle of fifths
		'book.ch16.title': 'The circle of fifths',
		'book.ch16.idea':
			'Twelve keys in one ring, a fifth apart: step down it and you are playing the roots of a ii V I.',
		'book.ch16.concept.body':
			'Put the 12 keys in a ring so each one sits a fifth from its neighbours. Clockwise, each step goes up a fifth and the key signature gains a sharp or loses a flat. Counterclockwise, each step goes down a fifth and it gains a flat or loses a sharp. Every V7 wants to resolve down a fifth, to its I, so jazz harmony mostly travels counterclockwise.',
		'book.ch16.concept.caption': 'Tap a key to hear it. Its V sits one step clockwise, its ii two steps.',
		'book.ch16.concept.readout':
			'{key}: down a fifth is {down}, up a fifth is {up}. Its ii V I has the roots {ii}, {v}, {key}: two steps down the ring.',
		'book.ch16.concept.why':
			'Knowing the ring by heart turns two jobs into counting: what comes next in a chain of dominants, and how far a tune moves when you play it in another key.',
		'book.ch16.concept.ringLabel': 'The circle of fifths',
		'book.ch16.piano.intro':
			'Name the next stop, or play it on the keyboard. Each round is three steps; four rounds take you round the whole ring and back to where you started. Then go the other way, and try how far apart two keys are.',
		'book.ch16.modeLabel': 'Question',
		'book.ch16.mode.next': 'Next stop',
		'book.ch16.mode.distance': 'How far apart',
		'book.ch16.directionLabel': 'Direction',
		'book.ch16.direction.down': 'Down a fifth',
		'book.ch16.direction.up': 'Up a fifth',
		'book.ch16.startLabel': 'Start',
		'book.ch16.banner': 'Round {round} of {rounds}',
		'book.ch16.bar.start': 'start',
		'book.ch16.bar.down': '↓ 5th',
		'book.ch16.bar.up': '↑ 5th',
		'book.ch16.prompt.down': 'Down a fifth from {from} is?',
		'book.ch16.prompt.up': 'Up a fifth from {from} is?',
		'book.ch16.answerHint': 'Tap a name, or play it on the keyboard',
		'book.ch16.retry.down': 'Not {answer}. Hear {from} as a V: where does {from}7 resolve?',
		'book.ch16.retry.up': 'Not {answer}. Up a fifth is the 5th note of the {from} major scale.',
		'book.ch16.right': 'Right: {stop}.',
		'book.ch16.roundDone.down': '{stops}: three fifths down. The next round starts on {next}.',
		'book.ch16.roundDone.up': '{stops}: three fifths up. The next round starts on {next}.',
		'book.ch16.lapDone.clean':
			'Round the whole ring and back to {start}, every stop right the first time. The checklist line is ticked.',
		'book.ch16.lapDone.retry':
			'Round the whole ring and back to {start}. Go again for a lap with every stop right the first time.',
		'book.ch16.button.again': 'Go round again',
		'book.ch16.button.nextRound': 'Next round',
		'book.ch16.button.check': 'Check',
		'book.ch16.button.nextPair': 'Next pair',
		'book.ch16.distance.intro':
			'Two keys, the shorter way round the ring: how many fifths apart, and which way? Each fifth down adds a flat to the key signature or takes away a sharp; each fifth up does the opposite.',
		'book.ch16.distance.question': 'From {from} to {to}',
		'book.ch16.distance.countLabel': 'Fifths',
		'book.ch16.distance.wayLabel': 'Which way',
		'book.ch16.distance.down': 'Down',
		'book.ch16.distance.up': 'Up',
		'book.ch16.distance.pick': 'Pick a count and a direction, then Check.',
		'book.ch16.distance.retry.count': 'Right direction, wrong count. Walk it again, one fifth at a time.',
		'book.ch16.distance.retry.way': 'Right count, wrong direction. Which way round gets there?',
		'book.ch16.distance.retry.both': 'Not this one. Walk it from {from}, one fifth at a time.',
		'book.ch16.distance.right.down': 'Right: {steps} fifths down, {path}.',
		'book.ch16.distance.right.up': 'Right: {steps} fifths up, {path}.',
		'book.ch16.distance.streakDone': 'Five in a row, right the first time. The checklist line is ticked.',
		'book.ch16.check.lapDown': 'A whole lap down by fifths, every stop right the first time.',
		'book.ch16.check.lapUp': 'A whole lap up by fifths, every stop right the first time.',
		'book.ch16.check.distance': 'Five key distances in a row, right the first time.',
		'book.ch16.check.outLoud': 'Away from the app, say the ring down from C, all 12 keys, without stopping.',
		'book.ch16.check.hear': 'Play over Fly Me to the Moon and hear the roots fall by fifths through bars 1 to 7.',
		'book.ch16.tune.flyMe.bars': 'Bars 1 to 8',
		'book.ch16.tune.flyMe.note':
			'Seven roots, A D G C F B E, each a fifth below the last: the ring walked inside one key. The one step from F to B is a diminished fifth, which is what keeps the chain in C.',
		'book.ch16.tune.rhythm.bars': 'The bridge, two bars each',
		'book.ch16.tune.rhythm.note':
			'Four dominants in a row, each resolving down a fifth into the next, until F7 lands home on B♭. The rhythm changes bridge is the next-stop drill with a 7 on every stop.'
	},
	fr: {
		// Chapter chrome
		'book.part.1': 'Partie I · Lire la grille',
		'book.part.2': 'Partie II · La main gauche',
		'book.chapter.label': 'Chapitre',
		'book.chapter.back': 'Retour à Apprendre',
		'book.block.concept': 'Concept',
		'book.block.piano': 'Au piano',
		'book.block.repertoire': 'Dans le répertoire',
		'book.block.checklist': 'Liste de travail',
		'book.grading.checked': "Vérifié : l'app corrige chaque étape",
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

		// Chapter 11: guide tones and voice leading
		'book.ch11.title': 'Tons de guidage et conduite des voix',
		'book.ch11.idea':
			"Dans un ii V I, la septième de chaque accord descend d'un demi-ton vers la tierce du suivant pendant que l'autre note tient. Voilà pourquoi deux notes sonnent comme de la musique.",
		'book.ch11.concept.body':
			"Le shell, ce sont deux notes, la tierce et la septième, parce que ces deux-là portent l'accord : la tierce dit majeur ou mineur, la septième dit quelle septième. Ce sont aussi les deux qui bougent. Joue un ii V I avec rien d'autre et, à chaque changement, l'une tient pendant que l'autre descend d'un demi-ton. Fais-le d'abord du bout des doigts.",
		'book.ch11.lesson.subtitle':
			"ii V I en do, la tierce et la septième seulement. Touche chaque note vers laquelle la ligne se déplace.",
		'book.ch11.concept.linesIntro':
			"Le même ii V I sous forme de motif, une ligne de code par voix : la ligne du haut, la ligne du bas, puis les fondamentales. Choisis un ton et appuie sur Jouer. Ouvre ensuite le motif, supprime la ligne des fondamentales, et écoute : les deux tons de guidage disent encore ii V I.",
		'book.ch11.lines.keyLabel': 'Ton',
		'book.ch11.lines.upper': 'Ligne du haut :',
		'book.ch11.lines.lower': 'Ligne du bas :',
		'book.ch11.lines.play': 'Jouer les lignes',
		'book.ch11.lines.stop': 'Arrêter',
		'book.ch11.lines.edit': 'Modifier le motif',
		'book.ch11.lines.reset': 'Réinitialiser',
		'book.ch11.lines.editIntro':
			'Chaque ligne note(...) est une voix. Supprime une ligne ou change une note, puis rejoue-le.',
		'book.ch11.lines.soundOff':
			"Le son est coupé, ce motif n'a donc rien à jouer. Réactive-le dans Progrès, dans les réglages de pratique.",
		'book.ch11.lines.unavailable':
			"Le live code n'est pas disponible pour l'instant. Ouvre cette page une fois avec une connexion internet pour que ton appareil puisse le garder hors ligne.",
		'book.ch11.lines.visualUnavailable':
			"Le motif joue, mais son affichage pianoroll ne peut pas s'afficher pour l'instant. Ouvre cette page une fois avec une connexion internet pour que ton appareil puisse le garder hors ligne.",
		'book.ch11.lines.errorPrefix': 'Ce motif a un problème :',
		'book.ch11.piano.intro':
			"Un ii V I dans les 12 tonalités, autour du cycle des quartes, avec la tierce et la septième seulement : sans fondamentale. Commence chaque tonalité avec l'une ou l'autre en bas. À partir du V, garde sur sa touche la note qui tient et descends l'autre. Les bonnes notes jouées avec un saut comptent comme un nouvel essai.",
		'book.ch11.keyLabel': 'Ton',
		'book.ch11.prompt.first': "La tierce et la septième seulement, sans fondamentale. L'une ou l'autre en bas.",
		'book.ch11.prompt.next':
			"La tierce et la septième seulement, en continuant la ligne : une note tient, l'autre descend.",
		'book.ch11.motion': 'Garde {held}. Descends {from} vers {to}.',
		'book.ch11.button.check': 'Vérifier',
		'book.ch11.button.hear': "L'entendre",
		'book.ch11.button.show': 'Montre-moi',
		'book.ch11.button.clear': 'Effacer',
		'book.ch11.button.again': 'Recommencer',
		'book.ch11.retry.missing': 'Il manque : {letters}.',
		'book.ch11.retry.extra': "Pas un ton de guidage ici : {letters}.",
		'book.ch11.retry.jump':
			"Les bonnes notes, mais la main a sauté. Garde {held} sur sa touche et descends {from} d'un demi-ton.",
		'book.ch11.shown.first': 'Montré avec la tierce en bas. Joue-le, puis Vérifier.',
		'book.ch11.shown.next': 'Montré dans la suite de la paire que tu viens de jouer. Joue-le, puis Vérifier.',
		'book.ch11.right': 'Juste : {symbol}.',
		'book.ch11.keyDone': '{key} fini. Tonalité suivante : {next}.',
		'book.ch11.done.clean': 'Les 12 tonalités, toutes sans faute. La ligne de la liste est cochée.',
		'book.ch11.done.retry':
			'Les 12 tonalités. Reste à jouer sans faute, sans nouvel essai ni Montre-moi : {keys}. Touche une tonalité pour la refaire.',
		'book.ch11.check.cycle':
			'Les tons de guidage du ii V I dans les 12 tonalités, chacune sans faute : ni nouvel essai, ni saut, ni Montre-moi.',
		'book.ch11.check.noRoots':
			'Dans le motif, supprime la ligne des fondamentales et écoute les deux tons de guidage dire encore ii V I.',
		'book.ch11.check.sing':
			'Sur ton piano, joue les tons de guidage du ii V I en do et chante la note qui descend.',
		'book.ch11.check.comp':
			"Accompagne les mesures 9 à 12 de Blue Bossa avec les seuls tons de guidage pendant que la boucle les joue.",
		'book.ch11.tune.blueBossa.bars': 'Mesures 9 à 12',
		'book.ch11.tune.blueBossa.note':
			"Le morceau quitte do mineur pour un ii V I en ré♭. D♭, la septième de E♭m7, descend vers C, la tierce de A♭7. Puis G♭, la septième de A♭7, descend vers F, la tierce de D♭maj7. Chaque fois, l'autre note tient.",
		'book.ch11.tune.satinDoll.bars': 'Mesures 1 à 4, deux accords par mesure',
		'book.ch11.tune.satinDoll.note':
			"Deux ii V, chacun joué deux fois, le second un ton plus haut. Dans chacun, la septième du premier accord descend d'un demi-ton vers la tierce du second, et la tierce du premier tient comme septième du second.",

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
			"Cinq fondamentales, chacune une quarte au-dessus de la précédente : le cycle que tu viens de travailler, en la♭. Les mesures 2 à 4 sont son ii V I.",

		// Chapter 16: the circle of fifths
		'book.ch16.title': 'Le cycle des quintes',
		'book.ch16.idea':
			"Les douze tonalités sur un cercle, à une quinte l'une de l'autre : descends-le et tu joues les fondamentales d'un ii V I.",
		'book.ch16.concept.body':
			"Place les 12 tonalités sur un cercle, chacune à une quinte de ses voisines. Dans le sens des aiguilles d'une montre, chaque pas monte d'une quinte et l'armure gagne un dièse ou perd un bémol. Dans l'autre sens, chaque pas descend d'une quinte et elle gagne un bémol ou perd un dièse. Tout V7 veut se résoudre une quinte plus bas, sur son I : l'harmonie jazz tourne surtout dans le sens inverse des aiguilles.",
		'book.ch16.concept.caption':
			"Touche une tonalité pour l'entendre. Son V est un pas plus loin dans le sens des aiguilles, son ii deux pas.",
		'book.ch16.concept.readout':
			'{key} : une quinte plus bas, {down} ; une quinte plus haut, {up}. Son ii V I a pour fondamentales {ii}, {v}, {key} : deux pas vers le bas du cercle.',
		'book.ch16.concept.why':
			"Connaître le cercle par cœur ramène deux tâches à un simple comptage : ce qui vient après dans une chaîne de dominantes, et de combien un morceau se déplace quand tu le joues dans une autre tonalité.",
		'book.ch16.concept.ringLabel': 'Le cycle des quintes',
		'book.ch16.piano.intro':
			"Nomme l'étape suivante, ou joue-la au clavier. Chaque tour fait trois pas ; quatre tours font tout le cercle et te ramènent au départ. Ensuite, va dans l'autre sens, et essaie de dire à quelle distance sont deux tonalités.",
		'book.ch16.modeLabel': 'Question',
		'book.ch16.mode.next': 'Étape suivante',
		'book.ch16.mode.distance': 'Quelle distance',
		'book.ch16.directionLabel': 'Sens',
		'book.ch16.direction.down': 'Une quinte plus bas',
		'book.ch16.direction.up': 'Une quinte plus haut',
		'book.ch16.startLabel': 'Départ',
		'book.ch16.banner': 'Tour {round} sur {rounds}',
		'book.ch16.bar.start': 'départ',
		'book.ch16.bar.down': '↓ quinte',
		'book.ch16.bar.up': '↑ quinte',
		'book.ch16.prompt.down': "Une quinte sous {from}, c'est ?",
		'book.ch16.prompt.up': "Une quinte au-dessus de {from}, c'est ?",
		'book.ch16.answerHint': 'Touche un nom, ou joue-le au clavier',
		'book.ch16.retry.down': 'Pas {answer}. Entends {from} comme un V : où se résout {from}7 ?',
		'book.ch16.retry.up': "Pas {answer}. Une quinte plus haut, c'est la 5e note de la gamme majeure de {from}.",
		'book.ch16.right': 'Juste : {stop}.',
		'book.ch16.roundDone.down': '{stops} : trois quintes vers le bas. Le tour suivant part de {next}.',
		'book.ch16.roundDone.up': '{stops} : trois quintes vers le haut. Le tour suivant part de {next}.',
		'book.ch16.lapDone.clean':
			'Tout le cercle, retour à {start}, chaque étape juste du premier coup. La ligne de la liste est cochée.',
		'book.ch16.lapDone.retry':
			'Tout le cercle, retour à {start}. Refais un tour avec chaque étape juste du premier coup.',
		'book.ch16.button.again': 'Refaire le tour',
		'book.ch16.button.nextRound': 'Tour suivant',
		'book.ch16.button.check': 'Vérifier',
		'book.ch16.button.nextPair': 'Paire suivante',
		'book.ch16.distance.intro':
			"Deux tonalités, par le chemin le plus court sur le cercle : combien de quintes les séparent, et dans quel sens ? Chaque quinte vers le bas ajoute un bémol à l'armure ou retire un dièse ; chaque quinte vers le haut fait l'inverse.",
		'book.ch16.distance.question': 'De {from} à {to}',
		'book.ch16.distance.countLabel': 'Quintes',
		'book.ch16.distance.wayLabel': 'Dans quel sens',
		'book.ch16.distance.down': 'Vers le bas',
		'book.ch16.distance.up': 'Vers le haut',
		'book.ch16.distance.pick': 'Choisis un nombre et un sens, puis Vérifier.',
		'book.ch16.distance.retry.count': 'Bon sens, mauvais nombre. Refais le chemin, une quinte à la fois.',
		'book.ch16.distance.retry.way': 'Bon nombre, mauvais sens. Par où faut-il tourner pour arriver ?',
		'book.ch16.distance.retry.both': 'Pas celle-ci. Pars de {from}, une quinte à la fois.',
		'book.ch16.distance.right.down': 'Juste : {steps} quintes vers le bas, {path}.',
		'book.ch16.distance.right.up': 'Juste : {steps} quintes vers le haut, {path}.',
		'book.ch16.distance.streakDone': 'Cinq de suite, justes du premier coup. La ligne de la liste est cochée.',
		'book.ch16.check.lapDown': 'Un tour complet en descendant par quintes, chaque étape juste du premier coup.',
		'book.ch16.check.lapUp': 'Un tour complet en montant par quintes, chaque étape juste du premier coup.',
		'book.ch16.check.distance': 'Cinq distances entre tonalités de suite, justes du premier coup.',
		'book.ch16.check.outLoud':
			"Loin de l'app, dis le cercle vers le bas depuis do, les 12 tonalités, sans t'arrêter.",
		'book.ch16.check.hear':
			'Improvise sur Fly Me to the Moon et entends les fondamentales descendre par quintes des mesures 1 à 7.',
		'book.ch16.tune.flyMe.bars': 'Mesures 1 à 8',
		'book.ch16.tune.flyMe.note':
			"Sept fondamentales, la, ré, sol, do, fa, si, mi, chacune une quinte sous la précédente : le cercle parcouru à l'intérieur d'une seule tonalité. Le pas de fa à si est une quinte diminuée, et c'est ce qui garde la chaîne en do.",
		'book.ch16.tune.rhythm.bars': 'Le pont, deux mesures chacun',
		'book.ch16.tune.rhythm.note':
			"Quatre dominantes de suite, chacune se résolvant une quinte plus bas sur la suivante, jusqu'à ce que F7 retombe sur si♭. Le pont des rhythm changes, c'est l'exercice de l'étape suivante avec un 7 sur chaque étape."
	}
} satisfies LocaleDict;
