import type { LocaleDict } from './index';

/**
 * Progressions domain (Phase 25 Plan 05, sketch-017 synthesis, SK-017): every
 * literal the /progressions earn-the-symbol lead-sheet drill renders - the
 * KEY banner's mode word, the BAR progress label, the two-step register
 * (STEP 1: NAME THE.../STEP 2: PLAY IT), the name-step instruction, the
 * gentle wrong-name/wrong-play retry lines, the Check/Again CTAs, the
 * function-reveal kicker + the three harmonic-function display words, and
 * the completion-card copy.
 *
 * IMMUNITY (never keyed here, per the project's Chord Glyph & Symbol
 * Immunity rule): chord symbols (e.g. "Dm7"), roman numerals (e.g. "ii",
 * "V", "I"), and the key letter itself (e.g. "B♭") stay untouched and are
 * never routed through t() - only the surrounding mode/function WORDS are
 * keyed. No em dashes anywhere in this file's copy (periods/colons/middots
 * only).
 */
export const progressions = {
	en: {
		'progressions.key.banner.label': 'KEY:',
		'progressions.key.major': 'MAJOR',
		'progressions.key.minor': 'MINOR',
		'progressions.bar.progress.label': 'BAR',

		'progressions.register.step1Prefix': 'STEP 1: NAME THE',
		'progressions.register.step2': 'STEP 2: PLAY IT',

		'progressions.name.instruction': 'Tap the chord that matches the roman numeral.',
		'progressions.aria.nameChoice': 'Name choice:',

		'progressions.retry.wrongName': 'Not quite. Try again.',
		'progressions.retry.wrongPlay': 'Not quite. Play it again.',

		'progressions.button.check': 'Check',
		'progressions.button.again': 'Again',
		'progressions.button.next': 'Next',

		'progressions.function.kicker': 'FUNCTION:',
		'progressions.function.tonic': 'TONIC',
		'progressions.function.subdominant': 'SUBDOMINANT',
		'progressions.function.dominant': 'DOMINANT',

		'progressions.completion.title': 'PROGRESSION COMPLETE',
		'progressions.completion.body': 'Every symbol earned. Run it again with a fresh progression.',

		'progressions.keyboard.beginnerCaption': 'Keyboard reduced to one octave (beginner level).',

		// Escalating hint ladder (SCAF-01, Phase 34 Plan 02). IMMUNITY: the
		// roman numeral, the key letter, and the chord's root letter are
		// interleaved as immune display values in ProgressionDrill's markup -
		// never routed through t() here.
		'progressions.hint.reveal.start': 'Show a hint ▾',
		'progressions.hint.reveal.count': 'Show the quality and count',
		'progressions.hint.reveal.ghost': 'Show me',

		'progressions.hint.tier.prefix': 'HINT',
		'progressions.hint.tier.degree': 'THE DEGREE',
		'progressions.hint.tier.count': 'THE QUALITY AND COUNT',
		'progressions.hint.tier.ghost': 'SHOW ME',

		'progressions.hint.degree.lead': 'The',
		'progressions.hint.degree.builtOn': 'is built on the',
		'progressions.hint.degree.noteOf': 'note of',
		'progressions.hint.degree.rootLabel': 'Root:',

		'progressions.hint.count.lead': 'On the',
		'progressions.hint.count.mid': 'the chord is',
		'progressions.hint.count.closing': 'Stack it by counting:',

		'progressions.hint.mode.major': 'major',
		'progressions.hint.mode.minor': 'minor',

		'progressions.hint.quality.maj7': 'major 7',
		'progressions.hint.quality.m7': 'minor 7',
		'progressions.hint.quality.dom7': 'dominant',
		'progressions.hint.quality.m7b5': 'half-diminished',

		'progressions.hint.ghost.body': 'The dashed keys show where to play. Play them, then check.',

		'progressions.hint.closing': 'The symbol stays hidden. You still earn it.',

		// Common-tone bridge step (Phase 41): the ungraded, unscheduled third
		// step between bar N's play and bar N+1's name. Recognize
		// (multiple-choice chip) then, once past the 'meet' stage, Play (a
		// two-note keyboard answer). IMMUNITY: the played note letters
		// themselves are never keyed here, only the surrounding words.
		'progressions.register.bridge': 'BRIDGE: FIND THE COMMON TONE',
		'progressions.bridge.instruction.recognize': 'Which note carries into the next chord?',
		'progressions.bridge.instruction.play': 'Play the held note and the falling note.',
		'progressions.bridge.aria.chip': 'Bridge note choice:',
		'progressions.bridge.retry.recognize': 'Not quite. Try again.',
		'progressions.bridge.retry.play': 'Not quite. Play it again.'
	},
	fr: {
		'progressions.key.banner.label': 'TON :',
		'progressions.key.major': 'MAJEUR',
		'progressions.key.minor': 'MINEUR',
		'progressions.bar.progress.label': 'MESURE',

		'progressions.register.step1Prefix': 'ÉTAPE 1 : NOMME LE',
		'progressions.register.step2': 'ÉTAPE 2 : JOUE-LE',

		'progressions.name.instruction': "Touche l'accord qui correspond au chiffre romain.",
		'progressions.aria.nameChoice': 'Choix du nom :',

		'progressions.retry.wrongName': 'Pas tout à fait. Réessaie.',
		'progressions.retry.wrongPlay': 'Pas tout à fait. Rejoue-le.',

		'progressions.button.check': 'Vérifier',
		'progressions.button.again': 'Encore',
		'progressions.button.next': 'Suivant',

		'progressions.function.kicker': 'FONCTION :',
		'progressions.function.tonic': 'TONIQUE',
		'progressions.function.subdominant': 'SOUS-DOMINANTE',
		'progressions.function.dominant': 'DOMINANTE',

		'progressions.completion.title': 'PROGRESSION TERMINÉE',
		'progressions.completion.body': 'Tous les symboles sont gagnés. Relance-en une autre.',

		'progressions.keyboard.beginnerCaption': 'Clavier réduit à une octave (niveau débutant).',

		'progressions.hint.reveal.start': 'Afficher un indice ▾',
		'progressions.hint.reveal.count': 'Montrer la qualité et le compte',
		'progressions.hint.reveal.ghost': 'Montre-moi',

		'progressions.hint.tier.prefix': 'INDICE',
		'progressions.hint.tier.degree': 'LE DEGRÉ',
		'progressions.hint.tier.count': 'LA QUALITÉ ET LE COMPTE',
		'progressions.hint.tier.ghost': 'MONTRE-MOI',

		'progressions.hint.degree.lead': 'Le',
		'progressions.hint.degree.builtOn': 'se construit sur la',
		'progressions.hint.degree.noteOf': 'note de',
		'progressions.hint.degree.rootLabel': 'Fondamentale :',

		'progressions.hint.count.lead': 'Sur le',
		'progressions.hint.count.mid': "l'accord est",
		'progressions.hint.count.closing': 'Empile en comptant :',

		'progressions.hint.mode.major': 'majeur',
		'progressions.hint.mode.minor': 'mineur',

		'progressions.hint.quality.maj7': 'majeur 7',
		'progressions.hint.quality.m7': 'mineur 7',
		'progressions.hint.quality.dom7': 'de dominante',
		'progressions.hint.quality.m7b5': 'demi-diminué',

		'progressions.hint.ghost.body': 'Les touches en pointillé indiquent où jouer. Joue-les, puis vérifie.',

		'progressions.hint.closing': 'Le symbole reste caché. Tu le gagnes toujours.',

		'progressions.register.bridge': 'PONT : TROUVE LA NOTE COMMUNE',
		'progressions.bridge.instruction.recognize': 'Quelle note se prolonge dans le prochain accord ?',
		'progressions.bridge.instruction.play': 'Joue la note tenue et la note qui descend.',
		'progressions.bridge.aria.chip': 'Choix de note du pont :',
		'progressions.bridge.retry.recognize': 'Pas tout à fait. Réessaie.',
		'progressions.bridge.retry.play': 'Pas tout à fait. Rejoue-le.'
	}
} satisfies LocaleDict;
