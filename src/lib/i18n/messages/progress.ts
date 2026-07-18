import type { LocaleDict } from './index';

/**
 * Progress domain dictionary (I18N-02, Phase 20 Plan 08): the /progress page
 * (page title, all four fetch-state cards, the streak hero card's static
 * copy, Practice Settings incl. the SOUND/STUDY MODE toggles), the
 * AccuracyTable column headers, and PracticeItemRow's KIND-cell category
 * word (CHORD/SCALE/INTERVAL). Also covers StreakBadge's compact "{N} DAY
 * STREAK" chip (rendered both on this page's hero and in the masthead).
 *
 * IMMUNITY (never keyed here): streak counts, accuracy percentages, attempt
 * counts, chord/scale symbols (e.g. `Cm7`), and interval shorthand stay raw
 * numbers/notation in both locales. Tier names/blurbs (`tiers.ts` data) and
 * the tier unlock aria-labels' numeric id stay untouched/English - `tiers.ts`
 * is a shared data file outside every Phase 20 plan's file_modified scope
 * (established by 20-04); only the surrounding "TIER"/"TIERS 5 AND 6"
 * chrome words are keyed here. `progress.settings.tierPrefix` keeps the
 * "NIVEAU" wording used by 20-04's drills.ts for the same concept.
 * `progress.table.kind.*` mirrors 20-02's recall.map.kind.* precedent of
 * translating the chord/scale/interval CATEGORY word (not the symbol
 * itself).
 */
export const progress: LocaleDict = {
	en: {
		'progress.page.title': 'Progress',

		// Token-missing state.
		'progress.token.heading': 'Enter your access key',
		'progress.token.ariaLabel': 'Access key',
		'progress.token.save': 'Save',

		// Loading state.
		'progress.loading.label': 'FETCHING THE LEDGER...',

		// Empty state.
		'progress.empty.heading': 'Nothing on the ledger yet.',
		'progress.empty.body':
			'Play a few drills and your stats start showing up here. Weakest spots first, always.',
		'progress.empty.cta': 'Start a Drill',

		// Error state.
		'progress.error.body':
			"Couldn't reach the ledger. The server's not answering right now. Check your connection and try again.",
		'progress.error.cta': 'Try Again',

		// Streak hero card.
		'progress.streak.cta': 'Practice Now',

		// Weakest Spots card.
		'progress.weakest.heading': 'Weakest Spots',
		'progress.weakest.body': 'The chords and scales tripping you up most. Give these extra reps.',
		'progress.weakest.cta': 'Drill these',

		// All Stats section.
		'progress.stats.heading': 'All Stats',

		// AccuracyTable column headers.
		'progress.table.header.symbol': 'SYMBOL',
		'progress.table.header.kind': 'KIND',
		'progress.table.header.attempts': 'ATTEMPTS',
		'progress.table.header.accuracy': 'ACCURACY',

		// PracticeItemRow KIND-cell category word.
		'progress.table.kind.chord': 'CHORD',
		'progress.table.kind.scale': 'SCALE',
		'progress.table.kind.interval': 'INTERVAL',

		// Practice Settings card.
		'progress.settings.heading': 'Practice Settings',
		'progress.settings.tierPrefix': 'TIER',
		'progress.settings.tierBlurb':
			'Unlocking early is fine. The drill mixes in scaffolding for new chord types.',
		'progress.settings.setTierAria': 'Set tier {N}',
		'progress.settings.tiersComingLater': 'TIERS 5 AND 6: COMING LATER',

		'progress.settings.sound.label': 'SOUND',
		'progress.settings.sound.on': 'SOUND ON',
		'progress.settings.sound.off': 'SOUND OFF',
		'progress.settings.sound.aria': 'Toggle sound',

		'progress.settings.studyMode.label': 'STUDY MODE',
		'progress.settings.studyMode.on': 'STUDY MODE ON',
		'progress.settings.studyMode.off': 'STUDY MODE OFF',
		'progress.settings.studyMode.aria': 'Toggle study mode',

		// StreakBadge compact chip (masthead + hero card context).
		'progress.streakBadge.compactCount': '{N} DAY STREAK'
	},
	fr: {
		'progress.page.title': 'Progrès',

		'progress.token.heading': "Entre ta clé d'accès",
		'progress.token.ariaLabel': "Clé d'accès",
		'progress.token.save': 'Enregistrer',

		'progress.loading.label': 'CHARGEMENT DU REGISTRE...',

		'progress.empty.heading': 'Rien au registre pour le moment.',
		'progress.empty.body':
			"Fais quelques exercices et tes statistiques s'affichent ici. Les points faibles d'abord, toujours.",
		'progress.empty.cta': 'Lancer un exercice',

		'progress.error.body':
			"Impossible de joindre le registre. Le serveur ne répond pas pour le moment. Vérifie ta connexion et réessaie.",
		'progress.error.cta': 'Réessayer',

		'progress.streak.cta': 'Pratiquer maintenant',

		'progress.weakest.heading': 'Points faibles',
		'progress.weakest.body':
			'Les accords et les gammes qui te posent le plus de souci. Fais-en quelques reprises de plus.',
		'progress.weakest.cta': 'Exercer ceux-ci',

		'progress.stats.heading': 'Toutes les statistiques',

		'progress.table.header.symbol': 'SYMBOLE',
		'progress.table.header.kind': 'TYPE',
		'progress.table.header.attempts': 'ESSAIS',
		'progress.table.header.accuracy': 'PRÉCISION',

		'progress.table.kind.chord': 'ACCORD',
		'progress.table.kind.scale': 'GAMME',
		'progress.table.kind.interval': 'INTERVALLE',

		'progress.settings.heading': 'Réglages de pratique',
		'progress.settings.tierPrefix': 'NIVEAU',
		'progress.settings.tierBlurb':
			"Débloquer en avance ne pose aucun souci. L'exercice mêle des repères pour les nouveaux types d'accords.",
		'progress.settings.setTierAria': 'Définir le niveau {N}',
		'progress.settings.tiersComingLater': 'NIVEAUX 5 ET 6 : BIENTÔT DISPONIBLES',

		'progress.settings.sound.label': 'SON',
		'progress.settings.sound.on': 'SON ACTIVÉ',
		'progress.settings.sound.off': 'SON DÉSACTIVÉ',
		'progress.settings.sound.aria': 'Activer ou désactiver le son',

		'progress.settings.studyMode.label': 'MODE ÉTUDE',
		'progress.settings.studyMode.on': 'MODE ÉTUDE ACTIVÉ',
		'progress.settings.studyMode.off': 'MODE ÉTUDE DÉSACTIVÉ',
		'progress.settings.studyMode.aria': "Activer ou désactiver le mode étude",

		'progress.streakBadge.compactCount': '{N} JOURS DE SUITE'
	}
};
