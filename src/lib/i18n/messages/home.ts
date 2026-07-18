import type { LocaleDict } from './index';

/**
 * Home (Lookup) domain dictionary (I18N-02): the app's landing page, the
 * shared inspect register's idle line + semitone word, and the recent-lookup
 * chip row's accessible group heading.
 *
 * Chord symbols, the STARTER_CHORDS examples embedded in copy, the
 * {symbol}-style placeholder tokens, note letters, and interval shorthand
 * are NEVER keyed here - they render verbatim from the theory engine
 * regardless of locale (20-UI-SPEC "Chord Glyph & Symbol Immunity").
 */
export const home: LocaleDict = {
	en: {
		'home.title': 'Chord lookup',
		'home.input.placeholder': 'Type a chord: Cm7, F♯ø7, B♭maj7...',
		'home.insert.sharp': 'Insert sharp',
		'home.insert.flat': 'Insert flat',
		'home.action.stamp': 'Stamp',
		'home.action.hear-it': 'Hear it',
		'home.empty.title': 'No chord yet',
		'home.empty.body': 'Type a symbol like Cm7 and press Stamp to see its notes in ink and color.',
		'home.recent.heading': 'Recent lookups',
		'home.recent.chip-aria': 'Look up {symbol} again',
		'home.inspect.idle': 'Tap a key to inspect it.',
		'home.inspect.semitones.singular': 'semitone',
		'home.inspect.semitones.plural': 'semitones'
	},
	fr: {
		'home.title': "Recherche d'accord",
		'home.input.placeholder': 'Tapez un accord : Cm7, F♯ø7, B♭maj7...',
		'home.insert.sharp': 'Insérer un dièse',
		'home.insert.flat': 'Insérer un bémol',
		'home.action.stamp': 'Tamponner',
		'home.action.hear-it': 'Écouter',
		'home.empty.title': "Pas encore d'accord",
		'home.empty.body':
			"Tapez un symbole comme Cm7 et appuyez sur Tamponner pour voir ses notes en encre et en couleur.",
		'home.recent.heading': 'Recherches récentes',
		'home.recent.chip-aria': 'Rechercher {symbol} à nouveau',
		'home.inspect.idle': "Touche une note pour l'inspecter.",
		'home.inspect.semitones.singular': 'demi-ton',
		'home.inspect.semitones.plural': 'demi-tons'
	}
};
