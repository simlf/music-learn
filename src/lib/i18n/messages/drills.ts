import type { LocaleDict } from './index';

/**
 * Drills domain dictionary (I18N-02, Phase 20 Plan 04): every literal the
 * drills page, IntervalScaffold, and LevelPicker render - mode row, score
 * register, rotate hint, question-source tags (including the Phase 19
 * FROM YOUR LESSON -> DE TA LEÇON handoff tag),
 * construction/identification/interval prompts, scaffold/hint copy, feedback
 * prose, the confirm/wrong variant pools, the end-of-round card, the
 * unlock-suggestion card, and the beginner on-ramp (LevelPicker) captions.
 * (The From-my-songs filter's poolLabel/note props moved to songs.ts as the
 * single global control, quick task 260720-v9u.)
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

		// Name-it (identification) right/wrong affirmation (UAT F4).
		'drills.feedback.correct': 'Correct',
		'drills.feedback.incorrect': 'Incorrect',

		// Picked-vs-correct comparison on a name-it miss (E1). {picked}/{correct}
		// are raw chord symbols (immune, never translated) substituted client-side.
		// Reused verbatim by the interval drill's identification miss, where the
		// two substitutions are interval shorthand (also immune).
		'drills.feedback.pickedVsCorrect': 'You picked {picked}. It was {correct}.',

		// Interval confusion contrast on a miss (T13). An interval confusion IS a
		// semitone-count confusion, and this surface never showed a count at all.
		// Stated as counts rather than a sentence so it needs no singular/plural
		// agreement in either language ("m2 is 1 semitones" is the trap). {A}/{B}
		// are interval shorthand (immune); {N}/{M} are their semitone counts.
		'drills.feedback.semitoneContrast': 'Semitones: {A} = {N}, {B} = {M}.',

		// The interval drill's own escalating hint ladder (T13). Framing labels
		// ("Need a hint?", the tier prefix) are reused from the recall domain
		// rather than re-keyed; only these interval-specific rungs are new.
		// Lowercase tier titles match recall.hint.tier.* ("the family").
		'drills.hint.interval.tier.name': 'the name',
		'drills.hint.interval.tier.count': 'the count',
		'drills.hint.interval.tier.song': 'a tune you know',
		'drills.hint.interval.reveal.count': 'Show the semitone count',
		'drills.hint.interval.reveal.song': 'Name a tune you know',
		// {SHORT} is interval shorthand (immune); {LONG} is its long name, which
		// already follows the reader's locale.
		'drills.hint.interval.nameBody': '{SHORT} is a {LONG}.',
		'drills.hint.interval.countBodyUp': 'Semitones up from {ROOT}: {N}.',
		'drills.hint.interval.countBodyBetween': 'Semitones between the two notes: {N}.',
		'drills.hint.interval.closing': "That's everything about this one.",

		// Screen-reader label for the per-quality stacked-thirds teaching line
		// (E2); the visible line itself ("m7: m3 · M3 · m3") is built entirely
		// from immune quality/interval shorthand and stays identical in both
		// locales.
		'drills.aria.chordShape': 'Chord shape',

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
		'drills.strip.ariaClose': 'Close level and mode settings',

		// CountingChipRow legend (SHAPE-01, Phase 32): the +m3/+M3/3/4 shorthand
		// stays immune (never routed through t()); only the "semitones" word
		// itself is translated.
		'drills.chip.semitones': 'semitones',
		'drills.chip.legendAria': 'Gap legend',

		// CountingChipRow neutral non-third gap legend row (WR-02, Phase 32
		// Plan 02 gap closure): explains the neutral gap-chip state that
		// renders for non-tertian drill-pool qualities (sus/6/9/13), whose
		// gaps are not m3/M3. The +P4/+M2-style shorthand stays immune.
		'drills.chip.otherGap': 'other gaps show their own interval'
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

		'drills.feedback.correct': 'Bien vu',
		'drills.feedback.incorrect': 'Pas tout à fait',

		'drills.feedback.pickedVsCorrect': "Tu as choisi {picked}. C'était {correct}.",

		'drills.feedback.semitoneContrast': 'Demi-tons : {A} = {N}, {B} = {M}.',

		'drills.hint.interval.tier.name': 'le nom',
		'drills.hint.interval.tier.count': 'le compte',
		'drills.hint.interval.tier.song': 'un air connu',
		'drills.hint.interval.reveal.count': 'Montrer le nombre de demi-tons',
		'drills.hint.interval.reveal.song': 'Donner un air connu',
		'drills.hint.interval.nameBody': "{SHORT}, c'est une {LONG}.",
		'drills.hint.interval.countBodyUp': 'Demi-tons au-dessus de {ROOT} : {N}.',
		'drills.hint.interval.countBodyBetween': 'Demi-tons entre les deux notes : {N}.',
		'drills.hint.interval.closing': "C'est tout ce qu'il y a à savoir dessus.",

		'drills.aria.chordShape': "Forme de l'accord",

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
		'drills.strip.ariaClose': 'Fermer les réglages de niveau et de mode',

		'drills.chip.semitones': 'demi-tons',
		'drills.chip.legendAria': 'Légende des écarts',

		'drills.chip.otherGap': 'les autres écarts affichent leur propre intervalle'
	}
} satisfies LocaleDict;
