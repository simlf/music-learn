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
		'progressions.page.title': 'Progressions',
		'progressions.page.subtitle': 'Earn each chord symbol by naming it, then playing it.',

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

		'progressions.function.kicker': 'FUNCTION:',
		'progressions.function.tonic': 'TONIC',
		'progressions.function.subdominant': 'SUBDOMINANT',
		'progressions.function.dominant': 'DOMINANT',

		'progressions.completion.title': 'PROGRESSION COMPLETE',
		'progressions.completion.body': 'Every symbol earned. Run it again with a fresh progression.'
	},
	fr: {
		'progressions.page.title': 'Progressions',
		'progressions.page.subtitle': 'Gagne chaque symbole en le nommant, puis en le jouant.',

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

		'progressions.function.kicker': 'FONCTION :',
		'progressions.function.tonic': 'TONIQUE',
		'progressions.function.subdominant': 'SOUS-DOMINANTE',
		'progressions.function.dominant': 'DOMINANTE',

		'progressions.completion.title': 'PROGRESSION TERMINÉE',
		'progressions.completion.body': 'Tous les symboles sont gagnés. Relance-en une autre.'
	}
} satisfies LocaleDict;
