import type { LocaleDict } from './index';

/**
 * Drills domain dictionary (I18N-02, Phase 20 Plan 04): every literal the
 * drills page, IntervalScaffold, and LevelPicker render - mode row, score
 * register, rotate hint, question-source tags (including the Phase 19
 * FROM YOUR LESSON -> DE TA LEÇON handoff tag), the From-my-songs filter's
 * poolLabel/note props, construction/identification/interval prompts,
 * scaffold/hint copy, feedback prose, the confirm/wrong variant pools, the
 * end-of-round card, the unlock-suggestion card, and the beginner on-ramp
 * (LevelPicker) captions.
 *
 * IMMUNITY (never keyed here, per 20-UI-SPEC "Chord Glyph & Symbol
 * Immunity"): chord symbols, the serif ChordGlyph, interval shorthand
 * (R/m3/P5/m7), solfège syllables (Do/Ré/Mi), and IntervalInfo.longFr (the
 * always-on French interval long-name secondary label this surface already
 * showed before this phase, independent of the EN|FR toggle) stay untouched
 * and are never routed through t(). Tier names/blurbs (tiers.ts data) are
 * rendered through `progress.tier.{id}.name`/`.blurb` (owned by
 * progress.ts, added as a Phase 20 addendum) rather than a drills.ts key -
 * LevelPicker.svelte imports `t()` and looks those keys up directly.
 */
export const drills = {
	en: {
		'drills.page.title': 'Drills',

		// Mode row (Track C deck selector).
		'drills.aria.modeGroup': 'Drill mode',
		'drills.mode.chords': 'Chords',
		'drills.mode.intervals': 'Intervals',
		'drills.mode.mix': 'Mix',

		// Score register.
		'drills.score.of': 'OF',
		'drills.score.right': 'RIGHT',
		'drills.score.streak': 'STREAK',

		// Rotate hint (D-05).
		'drills.hint.rotate': 'Turn the phone sideways for the full two-octave board.',
		'drills.hint.gotIt': 'Got it',

		// Question-source tags (warmup/retry/seeded/seeded_lesson).
		'drills.source.warmup': 'BACK FOR ANOTHER GO',
		'drills.source.retry': 'ONE MORE TIME',
		'drills.source.weakList': 'FROM YOUR WEAK LIST',
		'drills.source.lesson': 'FROM YOUR LESSON',

		// From-my-songs filter (SONG-02) props passed to SongFilterToggle.
		'drills.filter.poolLabel': 'PRACTICE POOL',
		'drills.filter.noteFallback': 'No active songs yet, so showing the full library instead.',
		'drills.filter.noteOnPrefix': 'Filter on: practicing the',
		'drills.filter.noteOnSuffix': 'chords from your active songs only.',
		'drills.filter.noteOff':
			'Filter off: full chord library. Chords from your songs still carry their mark.',

		// Construction prompt + scaffolding.
		'drills.prompt.clickNotesFor': 'Click the notes for',
		'drills.scaffold.newChord': 'NEW CHORD. FORMULA FIRST.',
		'drills.scaffold.readThenPlay': 'Read it, then play it. This one counts as assisted.',
		'drills.hint.showFormula': 'Show formula',
		'drills.button.check': 'Check',
		'drills.button.clear': 'Clear',

		// Identification prompts.
		'drills.prompt.nameChord': 'Name this chord.',
		'drills.prompt.nameInterval': 'Name this interval.',
		'drills.aria.answerPrefix': 'Answer:',

		// Interval construction prompt.
		'drills.prompt.tapPrefix': 'Tap a',
		'drills.prompt.tapAboveInfix': 'above',

		// Feedback.
		'drills.feedback.hereIsShape': 'Here is the shape:',
		'drills.feedback.legendChord': 'The chord',
		'drills.feedback.legendExtra': 'Your extra note',
		'drills.feedback.hereIsInterval': 'Here is the interval:',
		'drills.feedback.youTapped': 'You tapped',
		'drills.button.next': 'Next',
		'drills.button.replayChord': 'Hear it again',

		// Right/wrong confirmation variant pools.
		'drills.confirm.0': 'Nailed it.',
		'drills.confirm.1': 'Et voilà.',
		'drills.confirm.2': 'Bang on.',
		'drills.confirm.3': 'Spot on, mon ami.',
		'drills.wrong.0': 'Not quite.',
		'drills.wrong.1': 'Close, but no cigar.',
		'drills.wrong.2': 'Not this time.',

		// End-of-round card.
		'drills.end.roundComplete': 'ROUND COMPLETE',
		'drills.end.bestRunPrefix': 'BEST RUN:',
		'drills.end.bestRunSuffix': 'IN A ROW',
		'drills.end.worthAnotherLook': 'Worth another look:',
		'drills.aria.redrillPrefix': 'Redrill',
		'drills.end.cleanSheet': 'Clean sheet. The press ran true, mon ami.',
		'drills.end.runAgain': 'Run it again',

		// Unlock-suggestion card.
		'drills.unlock.tierPrefix': 'TIER',
		'drills.unlock.tierSuffix': 'LOOKS READY',
		'drills.unlock.prefix': 'Your last',
		'drills.unlock.answersAre': 'answers are',
		'drills.unlock.correctAcross': '% correct across',
		'drills.unlock.daysUnlock': 'days. Unlock',
		'drills.unlock.colon': ':',
		'drills.unlock.questionMark': '?',
		'drills.unlock.button.prefix': 'Unlock Tier',
		'drills.common.notYet': 'Not yet',

		// LevelPicker (beginner on-ramp, sketch 007).
		'drills.level.ariaCourse': 'Your course',
		'drills.level.tier': 'Tier',
		'drills.level.changeLevel': 'Change level',
		'drills.level.close': 'Close',
		'drills.level.switchToTierPrefix': 'Switch to tier',
		'drills.level.nextUp': 'Next up',

		// IntervalScaffold (sketch 005) caption.
		'drills.scaffold.caption': 'This chord is',

		// Phone compact strip (Phase 23 1B): open/close the sheet holding the
		// full LevelPicker + mode tabs + SongFilterToggle + rotate hint.
		'drills.strip.ariaOpen': 'Open level and mode settings',
		'drills.strip.ariaClose': 'Close level and mode settings'
	},
	fr: {
		'drills.page.title': 'Exercices',

		'drills.aria.modeGroup': "Mode d'exercice",
		'drills.mode.chords': 'Accords',
		'drills.mode.intervals': 'Intervalles',
		'drills.mode.mix': 'Mixte',

		'drills.score.of': 'SUR',
		'drills.score.right': 'BONNES',
		'drills.score.streak': 'SÉRIE',

		'drills.hint.rotate': 'Tourne le téléphone pour voir tout le clavier de deux octaves.',
		'drills.hint.gotIt': 'Compris',

		'drills.source.warmup': 'ON REMET ÇA',
		'drills.source.retry': 'ENCORE UNE FOIS',
		'drills.source.weakList': 'DE TA LISTE FAIBLE',
		'drills.source.lesson': 'DE TA LEÇON',

		'drills.filter.poolLabel': 'BASSIN DE PRATIQUE',
		'drills.filter.noteFallback':
			'Aucun morceau actif pour le moment, la bibliothèque complète est donc affichée à la place.',
		'drills.filter.noteOnPrefix': 'Filtre activé : pratique des',
		'drills.filter.noteOnSuffix': 'accords de tes morceaux actifs uniquement.',
		'drills.filter.noteOff':
			"Filtre désactivé : bibliothèque d'accords complète. Les accords de tes morceaux gardent leur repère.",

		'drills.prompt.clickNotesFor': 'Clique sur les notes de',
		'drills.scaffold.newChord': "NOUVEL ACCORD. FORMULE D'ABORD.",
		'drills.scaffold.readThenPlay': 'Lis-la, puis joue-la. Celle-ci compte comme assistée.',
		'drills.hint.showFormula': 'Afficher la formule',
		'drills.button.check': 'Vérifier',
		'drills.button.clear': 'Effacer',

		'drills.prompt.nameChord': 'Nomme cet accord.',
		'drills.prompt.nameInterval': 'Nomme cet intervalle.',
		'drills.aria.answerPrefix': 'Réponse :',

		'drills.prompt.tapPrefix': 'Appuie sur un',
		'drills.prompt.tapAboveInfix': 'au-dessus de',

		'drills.feedback.hereIsShape': 'Voici la forme :',
		'drills.feedback.legendChord': "L'accord",
		'drills.feedback.legendExtra': 'Ta note en trop',
		'drills.feedback.hereIsInterval': "Voici l'intervalle :",
		'drills.feedback.youTapped': 'Tu as joué',
		'drills.button.next': 'Suivant',
		'drills.button.replayChord': 'Réécouter',

		'drills.confirm.0': 'Dans le mille.',
		'drills.confirm.1': 'Et voilà.',
		'drills.confirm.2': 'En plein dans le mille.',
		'drills.confirm.3': 'Exactement, mon ami.',
		'drills.wrong.0': 'Pas tout à fait.',
		'drills.wrong.1': 'Presque, mais pas cette fois.',
		'drills.wrong.2': 'Pas cette fois.',

		'drills.end.roundComplete': 'MANCHE TERMINÉE',
		'drills.end.bestRunPrefix': 'MEILLEURE SÉRIE :',
		'drills.end.bestRunSuffix': 'DE SUITE',
		'drills.end.worthAnotherLook': 'À revoir de plus près :',
		'drills.aria.redrillPrefix': 'Rejouer',
		'drills.end.cleanSheet': 'Sans faute. La presse a tourné rond, mon ami.',
		'drills.end.runAgain': 'Recommencer',

		'drills.unlock.tierPrefix': 'NIVEAU',
		'drills.unlock.tierSuffix': 'SEMBLE PRÊT',
		'drills.unlock.prefix': 'Tes',
		'drills.unlock.answersAre': 'dernières réponses sont correctes à',
		'drills.unlock.correctAcross': ' % de réussite sur',
		'drills.unlock.daysUnlock': 'jours. Débloque',
		'drills.unlock.colon': ' :',
		'drills.unlock.questionMark': ' ?',
		'drills.unlock.button.prefix': 'Débloquer le niveau',
		'drills.common.notYet': 'Pas encore',

		'drills.level.ariaCourse': 'Ton parcours',
		'drills.level.tier': 'Niveau',
		'drills.level.changeLevel': 'Changer de niveau',
		'drills.level.close': 'Fermer',
		'drills.level.switchToTierPrefix': 'Passer au niveau',
		'drills.level.nextUp': 'À suivre',

		'drills.scaffold.caption': 'Cet accord est',

		'drills.strip.ariaOpen': 'Ouvrir les réglages de niveau et de mode',
		'drills.strip.ariaClose': 'Fermer les réglages de niveau et de mode'
	}
} satisfies LocaleDict;
