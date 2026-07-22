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
export const home = {
	en: {
		'home.title': 'Chord lookup',
		'home.input.placeholder': 'Type a chord: Cm7, F♯ø7, B♭maj7...',
		'home.insert.sharp': 'Insert sharp',
		'home.insert.flat': 'Insert flat',
		'home.action.stamp': 'Stamp',
		'home.action.hear-it': 'Hear it',
		'home.action.drill-it': 'Drill it',
		'home.empty.title': 'No chord yet',
		'home.empty.body': 'Type a symbol like Cm7 and press Stamp to see its notes in ink and color.',
		'home.recent.heading': 'Recent lookups',
		'home.recent.chip-aria': 'Look up {symbol} again',
		'home.inspect.idle': 'Tap a key to inspect it.',
		'home.inspect.semitones.singular': 'semitone',
		'home.inspect.semitones.plural': 'semitones',
		'home.why.toggle': 'Why these notes?',
		'home.why.third-step': 'is a minor third: 3 semitones above the root, giving the natural note, not the sharp.',
		'home.why.third-step-major':
			'is a major third: 4 semitones above the root, giving the sharp note.',
		'home.why.key-signature':
			'builds the chord from the root using its own interval formula. The scale/key signature does not impose accidentals here.',
		'home.why.duo-heading': 'Do not mix up:',
		'home.why.duo-minor-label': 'minor — low third',
		'home.why.duo-major-label': 'major — high third',
		'home.why.duo-closing': 'The key of the scale never changes the notes of the symbol.',
		'home.why.escape-hatch-prefix': 'See',
		'home.disambig.heading-prefix': '"',
		'home.disambig.heading-suffix': '" is ambiguous',
		'home.disambig.body': 'Casing matters in chord symbols:',
		'home.disambig.chip-minor-prefix': '',
		'home.disambig.chip-minor-suffix': '— minor',
		'home.disambig.chip-major-prefix': '',
		'home.disambig.chip-major-suffix': '— major',
		'home.slash.explain':
			'The slash means {BASS} is the lowest note: play {CHORD} with {BASS} at the bottom.'
	},
	fr: {
		'home.title': "Recherche d'accord",
		'home.input.placeholder': 'Tapez un accord : Cm7, F♯ø7, B♭maj7...',
		'home.insert.sharp': 'Insérer un dièse',
		'home.insert.flat': 'Insérer un bémol',
		'home.action.stamp': 'Tamponner',
		'home.action.hear-it': 'Écouter',
		'home.action.drill-it': "S'entraîner",
		'home.empty.title': "Pas encore d'accord",
		'home.empty.body':
			"Tapez un symbole comme Cm7 et appuyez sur Tamponner pour voir ses notes en encre et en couleur.",
		'home.recent.heading': 'Recherches récentes',
		'home.recent.chip-aria': 'Rechercher {symbol} à nouveau',
		'home.inspect.idle': "Touche une note pour l'inspecter.",
		'home.inspect.semitones.singular': 'demi-ton',
		'home.inspect.semitones.plural': 'demi-tons',
		'home.why.toggle': 'Pourquoi ces notes ?',
		'home.why.third-step':
			'= tierce mineure : 3 demi-tons au-dessus de la fondamentale, la note naturelle, pas le dièse.',
		'home.why.third-step-major':
			'= tierce majeure : 4 demi-tons au-dessus de la fondamentale, la note diésée.',
		'home.why.key-signature':
			"construit l'accord depuis la fondamentale avec sa propre formule d'intervalles. La gamme (la clé) n'impose rien ici.",
		'home.why.duo-heading': 'Ne pas confondre :',
		'home.why.duo-minor-label': 'mineur — tierce basse',
		'home.why.duo-major-label': 'majeur — tierce haute',
		'home.why.duo-closing': "La clé de la gamme ne change pas les notes du symbole.",
		'home.why.escape-hatch-prefix': 'Voir',
		'home.disambig.heading-prefix': '«',
		'home.disambig.heading-suffix': '» est ambigu',
		'home.disambig.body': 'La casse compte dans les symboles d’accords :',
		'home.disambig.chip-minor-prefix': '',
		'home.disambig.chip-minor-suffix': '— mineur',
		'home.disambig.chip-major-prefix': '',
		'home.disambig.chip-major-suffix': '— majeur',
		'home.slash.explain':
			'La barre oblique indique que {BASS} est la note la plus basse : jouez {CHORD} en plaçant {BASS} en bas.'
	}
} satisfies LocaleDict;
