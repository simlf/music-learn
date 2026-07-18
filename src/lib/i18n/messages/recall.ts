import type { LocaleDict } from './index';

/**
 * Recall domain dictionary (I18N-02/I18N-03, Phase 20 Plan 02): grade
 * labels, the mode-signal chip, RecallSession's prompt/reveal/feedback
 * prose, RecallMap's column/legend/kind-filter labels, and the recall
 * page's title/subtitle/mode-toggle/pool-filter copy.
 *
 * IMMUNITY (never keyed here, per 20-UI-SPEC "Chord Glyph & Symbol
 * Immunity"): chord symbols, the serif ChordGlyph, interval shorthand
 * (R/m3/P5/m7), solfège syllables (Do/Ré/Mi), and the numeric
 * day-interval sub-label (e.g. "1d") stay identical in both locales and
 * are never routed through t().
 */
export const recall = {
	en: {
		// Grade buttons (locked FR strings, 20-UI-SPEC "Grading buttons").
		'recall.grade.again': 'Again',
		'recall.grade.hard': 'Hard',
		'recall.grade.good': 'Good',
		'recall.grade.easy': 'Easy',

		// Mode-signal chip (locked FR strings, 20-UI-SPEC "Mode-signal chip").
		'recall.mode.formula': 'SYMBOL → FORMULA',
		'recall.mode.formula-build': 'FORMULA → BUILD',
		'recall.mode.see-play': 'SYMBOL → PLAY',
		'recall.mode.hear-name': 'SOUND → NAME',

		// Loading/register copy.
		'recall.state.loading': "COUNTING TODAY'S CARDS...",
		'recall.register.left-today': 'LEFT TODAY',
		'recall.register.reviewed-today': 'REVIEWED TODAY',

		// Empty/error/complete/unrenderable states.
		'recall.empty.no-deck.heading': 'Nothing to recall yet.',
		'recall.empty.no-deck.body':
			'Play a few Drills first. Recall cards show up here as you meet new chords, intervals, and scale degrees.',
		'recall.empty.none-due.heading': 'Nothing due today.',
		'recall.empty.none-due.body':
			'Every card\'s tucked in for later. Come back tomorrow, or warm up with free practice.',
		'recall.empty.filtered.heading': 'No song chords due today.',
		'recall.empty.filtered.singular': 'other card is waiting. Turn the filter off to see them.',
		'recall.empty.filtered.plural': 'other cards are waiting. Turn the filter off to see them.',
		'recall.error.body':
			"Couldn't open the practice ledger. Reload the page, mon ami. If it keeps happening, your browser's storage might be full or blocked.",
		'recall.complete.heading': "Voila. That's today's stack.",
		'recall.unrenderable.message': "Couldn't show this card.",

		// CTAs.
		'recall.cta.practice-now': 'Practice Now',
		'recall.cta.try-again': 'Try Again',
		'recall.cta.view-map': 'View Recall Map',
		'recall.cta.skip': 'Skip',
		'recall.cta.show-answer': 'Show Answer',
		'recall.cta.check': 'Check',
		'recall.cta.clear': 'Clear',
		'recall.cta.next': 'Next',
		'recall.cta.play': 'Play',
		'recall.cta.play-again': 'Play again',
		'recall.cta.continue': 'Continue',

		// Hint ladder (HINT-01, Phase 17): the "Need a hint?" control, the
		// escalating show-labels, the per-tier titles, and the closing line.
		// IMMUNITY: chord symbols, interval shorthand (R/m3/P5), and solfège
		// inside a revealed layer are never keyed here.
		'recall.hint.need-hint': 'Need a hint?',
		'recall.hint.tier-prefix': 'Hint',
		'recall.hint.tier.family': 'the family',
		'recall.hint.tier.formula': 'the formula',
		'recall.hint.tier.keyboard': 'on the keys',
		'recall.hint.tier.spelling': 'full spelling',
		'recall.hint.show.formula': 'Show the formula',
		'recall.hint.show.keyboard': 'Show it on the keyboard',
		'recall.hint.show.spelling': 'Show the full spelling',
		'recall.hint.closing': "That's the whole chord.",

		// Prompts (formula/interval/scale-degree/see-play/hear-name).
		'recall.prompt.formula-question': "What's the formula?",
		'recall.prompt.interval-question': "What's the interval?",
		'recall.prompt.note-question': 'Which note?',
		'recall.prompt.c-to': 'to',
		'recall.prompt.degree-prefix': 'Degree',
		'recall.prompt.degree-of': 'of',
		'recall.prompt.degree-major': 'major',
		'recall.prompt.see-play': 'Play it on the keyboard.',
		'recall.prompt.hear-name': 'Listen. Name the chord.',

		// Reveal headings.
		'recall.reveal.formula': "Here's the formula:",
		'recall.reveal.interval': "Here's the interval:",
		'recall.reveal.note': "Here's the note:",

		// Mode A wrong-answer legend.
		'recall.legend.chord': 'The chord',
		'recall.legend.extra-note': 'Your extra note',

		// Correct/wrong feedback variant pools.
		'recall.feedback.correct.0': 'Nailed it.',
		'recall.feedback.correct.1': 'Et voilà.',
		'recall.feedback.correct.2': 'Bang on.',
		'recall.feedback.correct.3': 'Spot on, mon ami.',
		'recall.feedback.wrong.0': 'Not quite.',
		'recall.feedback.wrong.1': 'Close, but no cigar.',
		'recall.feedback.wrong.2': 'Not this time.',

		// Mode B (hear-name) accessible-name prefix.
		'recall.aria.answer-prefix': 'Answer:',

		// RecallMap: column headers (locked FR strings, 20-UI-SPEC "Recall Map mode-column headers").
		'recall.map.col.formula': 'Formula',
		'recall.map.col.build': 'Build',
		'recall.map.col.play': 'Play',
		'recall.map.col.name': 'Name',
		// RecallMap: kind-filter tabs.
		'recall.map.kind.all': 'All',
		'recall.map.kind.chords': 'Chords',
		'recall.map.kind.intervals': 'Intervals',
		'recall.map.kind.scales': 'Scales',
		// RecallMap: cell-state legend.
		'recall.map.legend.not-yet-seen': 'Not yet seen',
		'recall.map.legend.due': 'Due',
		'recall.map.legend.weak': 'Weak',
		'recall.map.legend.mastered': 'Mastered',
		'recall.map.aria.kind-filter': 'Fact kind filter',

		// Recall page (title, subtitle, Review/Map toggle, pool filter note).
		'recall.page.title': 'Recall',
		'recall.page.subtitle': "The stack that's earning its keep. Every fact, every way you've met it.",
		'recall.page.aria.mode-toggle': 'Recall mode',
		'recall.page.mode.review': 'Review',
		'recall.page.mode.map': 'Map',
		'recall.page.pool-label': 'REVIEW POOL',
		'recall.page.note.fallback': 'No active songs yet, so showing the full library instead.',
		'recall.page.note.on-prefix': 'Filter on: practicing the',
		'recall.page.note.on-suffix': 'chords from your active songs only.',
		'recall.page.note.off':
			'Filter off: full chord library. Chords from your songs still carry their mark.'
	},
	fr: {
		'recall.grade.again': 'À revoir',
		'recall.grade.hard': 'Difficile',
		'recall.grade.good': 'Correct',
		'recall.grade.easy': 'Facile',

		'recall.mode.formula': 'SYMBOLE → FORMULE',
		'recall.mode.formula-build': 'FORMULE → CONSTRUIRE',
		'recall.mode.see-play': 'SYMBOLE → JOUER',
		'recall.mode.hear-name': 'SON → NOMMER',

		'recall.state.loading': 'COMPTAGE DES CARTES DU JOUR...',
		'recall.register.left-today': "RESTANTES AUJOURD'HUI",
		'recall.register.reviewed-today': "REVUES AUJOURD'HUI",

		'recall.empty.no-deck.heading': 'Rien à réviser pour le moment.',
		'recall.empty.no-deck.body':
			"Fais d'abord quelques exercices. Les cartes de révision apparaissent ici à mesure que tu rencontres de nouveaux accords, intervalles et degrés de gamme.",
		'recall.empty.none-due.heading': "Rien à revoir aujourd'hui.",
		'recall.empty.none-due.body':
			"Chaque carte est bordée pour plus tard. Reviens demain, ou échauffe-toi en pratique libre.",
		'recall.empty.filtered.heading': "Aucun accord de morceau à revoir aujourd'hui.",
		'recall.empty.filtered.singular': 'autre carte attend. Désactive le filtre pour la voir.',
		'recall.empty.filtered.plural': 'autres cartes attendent. Désactive le filtre pour les voir.',
		'recall.error.body':
			"Impossible d'ouvrir le registre de pratique. Recharge la page, mon ami. Si ça continue, le stockage de ton navigateur est peut-être plein ou bloqué.",
		'recall.complete.heading': "Voila. C'est la pile du jour.",
		'recall.unrenderable.message': 'Impossible d\'afficher cette carte.',

		'recall.cta.practice-now': 'Pratiquer maintenant',
		'recall.cta.try-again': 'Réessayer',
		'recall.cta.view-map': 'Voir la carte de révision',
		'recall.cta.skip': 'Passer',
		'recall.cta.show-answer': 'Voir la réponse',
		'recall.cta.check': 'Vérifier',
		'recall.cta.clear': 'Effacer',
		'recall.cta.next': 'Suivant',
		'recall.cta.play': 'Écouter',
		'recall.cta.play-again': 'Réécouter',
		'recall.cta.continue': 'Continuer',

		'recall.hint.need-hint': "Besoin d'un indice ?",
		'recall.hint.tier-prefix': 'Indice',
		'recall.hint.tier.family': 'la famille',
		'recall.hint.tier.formula': 'la formule',
		'recall.hint.tier.keyboard': 'sur les touches',
		'recall.hint.tier.spelling': 'toutes les notes',
		'recall.hint.show.formula': 'Montrer la formule',
		'recall.hint.show.keyboard': 'Montrer sur le clavier',
		'recall.hint.show.spelling': 'Montrer toutes les notes',
		'recall.hint.closing': "Voilà tout l'accord.",

		'recall.prompt.formula-question': 'Quelle est la formule ?',
		'recall.prompt.interval-question': "Quel est l'intervalle ?",
		'recall.prompt.note-question': 'Quelle note ?',
		'recall.prompt.c-to': 'à',
		'recall.prompt.degree-prefix': 'Degré',
		'recall.prompt.degree-of': 'de',
		'recall.prompt.degree-major': 'majeur',
		'recall.prompt.see-play': 'Joue-le sur le clavier.',
		'recall.prompt.hear-name': "Écoute. Nomme l'accord.",

		'recall.reveal.formula': 'Voici la formule :',
		'recall.reveal.interval': "Voici l'intervalle :",
		'recall.reveal.note': 'Voici la note :',

		'recall.legend.chord': "L'accord",
		'recall.legend.extra-note': 'Ta note en trop',

		'recall.feedback.correct.0': 'Dans le mille.',
		'recall.feedback.correct.1': 'Et voilà.',
		'recall.feedback.correct.2': 'En plein dans le mille.',
		'recall.feedback.correct.3': 'Exactement, mon ami.',
		'recall.feedback.wrong.0': 'Pas tout à fait.',
		'recall.feedback.wrong.1': 'Presque, mais pas cette fois.',
		'recall.feedback.wrong.2': 'Pas cette fois.',

		'recall.aria.answer-prefix': 'Réponse :',

		'recall.map.col.formula': 'Formule',
		'recall.map.col.build': 'Construire',
		'recall.map.col.play': 'Jouer',
		'recall.map.col.name': 'Nommer',
		'recall.map.kind.all': 'Tout',
		'recall.map.kind.chords': 'Accords',
		'recall.map.kind.intervals': 'Intervalles',
		'recall.map.kind.scales': 'Gammes',
		'recall.map.legend.not-yet-seen': 'Pas encore vu',
		'recall.map.legend.due': 'À réviser',
		'recall.map.legend.weak': 'Faible',
		'recall.map.legend.mastered': 'Maîtrisé',
		'recall.map.aria.kind-filter': 'Filtre par type de fait',

		'recall.page.title': 'Révision',
		'recall.page.subtitle': 'La pile qui fait ses preuves. Chaque fait, sous toutes ses formes.',
		'recall.page.aria.mode-toggle': 'Mode de révision',
		'recall.page.mode.review': 'Réviser',
		'recall.page.mode.map': 'Carte',
		'recall.page.pool-label': 'BASSIN DE RÉVISION',
		'recall.page.note.fallback':
			'Aucun morceau actif pour le moment, la bibliothèque complète est donc affichée à la place.',
		'recall.page.note.on-prefix': 'Filtre activé : pratique des',
		'recall.page.note.on-suffix': 'accords de tes morceaux actifs uniquement.',
		'recall.page.note.off':
			"Filtre désactivé : bibliothèque d'accords complète. Les accords de tes morceaux gardent leur repère."
	}
} satisfies LocaleDict;
