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
 * numbers/notation in both locales. The tier unlock aria-labels' numeric id
 * stays untouched/language-neutral. `progress.settings.tierPrefix` keeps the
 * "NIVEAU" wording used by 20-04's drills.ts for the same concept.
 * `progress.table.kind.*` mirrors 20-02's recall.map.kind.* precedent of
 * translating the chord/scale/interval CATEGORY word (not the symbol
 * itself).
 *
 * `progress.tier.{1..6}.name`/`.blurb` (Phase 20 addendum): the 6-tier ladder
 * data in `tiers.ts` stays an English-only pure data module (IDs, roots,
 * qualities, `available` are engine facts, not copy - `tiers.test.ts` asserts
 * the `name`/`blurb` string literals directly, so they must stay untouched
 * there). These keys are the locale-aware presentation strings every
 * consumer (LevelPicker.svelte on /drills, the Practice Settings card on
 * /progress) renders through instead of the raw `tier.name`/`tier.blurb`
 * fields, keyed by the tier's stable numeric id.
 */
export const progress = {
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
		'progress.weakest.drillOne': 'Drill',
		'progress.weakest.drillOneAria': 'Drill {ITEM}',

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
		'progress.streakBadge.compactCount': '{N} DAY STREAK',

		// Tier ladder name/blurb (Phase 20 addendum, rendered on /drills'
		// LevelPicker and /progress' Practice Settings card). Mirrors the
		// English literals in tiers.ts's TierDef.name/blurb exactly.
		'progress.tier.1.name': 'White-key triads',
		'progress.tier.1.blurb':
			'Just the white-key major and minor chords: C D E F G A B. No sharps or flats yet. Start here.',
		'progress.tier.2.name': 'All-key triads',
		'progress.tier.2.blurb': 'All twelve roots now: major, minor, and diminished triads.',
		'progress.tier.3.name': 'The big three sevenths',
		'progress.tier.3.blurb':
			'The seventh chords that show up everywhere: maj7, m7, and dominant 7.',
		'progress.tier.4.name': 'Minor ii-V colors',
		'progress.tier.4.blurb':
			'Half-diminished and diminished seventh chords, the color of a minor ii-V-i.',
		'progress.tier.5.name': 'Sixths and sus',
		'progress.tier.5.blurb': 'Sixth chords and sus chords. Coming later.',
		'progress.tier.6.name': 'Extensions and alterations',
		'progress.tier.6.blurb': '9ths, altered dominants, and more color tones. Coming later.'
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
		'progress.weakest.drillOne': 'Exercer',
		'progress.weakest.drillOneAria': 'Exercer {ITEM}',

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

		'progress.streakBadge.compactCount': '{N} JOURS DE SUITE',

		'progress.tier.1.name': 'Triades aux touches blanches',
		'progress.tier.1.blurb':
			'Seulement les accords majeurs et mineurs des touches blanches : C D E F G A B. Pas encore de dièses ni de bémols. Commence ici.',
		'progress.tier.2.name': 'Triades sur toutes les touches',
		'progress.tier.2.blurb':
			'Les douze fondamentales maintenant : accords majeurs, mineurs et diminués.',
		'progress.tier.3.name': 'Les trois grandes septièmes',
		'progress.tier.3.blurb':
			"Les accords de septième qu'on croise partout : maj7, m7 et la septième de dominante.",
		'progress.tier.4.name': 'Les couleurs du ii-V mineur',
		'progress.tier.4.blurb':
			"Les accords demi-diminués et diminués de septième, la couleur d'un ii-V-i mineur.",
		'progress.tier.5.name': 'Sixtes et sus',
		'progress.tier.5.blurb': 'Les accords de sixte et les accords sus. Bientôt disponible.',
		'progress.tier.6.name': 'Extensions et altérations',
		'progress.tier.6.blurb':
			"Neuvièmes, dominantes altérées et d'autres couleurs harmoniques. Bientôt disponible."
	}
} satisfies LocaleDict;
