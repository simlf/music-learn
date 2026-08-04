import type { LocaleDict } from './index';

/**
 * Drills domain dictionary (I18N-02, Phase 20 Plan 04): the literals the
 * surviving drill surfaces render - the score register and end-of-round card
 * on the Practice hub, the identification/interval prompts and feedback prose
 * in PracticeChordDrill/PracticeIntervalDrill, the interval hint ladder, the
 * IntervalScaffold caption, and the CountingChipRow gap legend.
 *
 * This file used to be roughly two thirds dead weight. The mode row, rotate
 * hint, question-source tags, construction prompts, confirm/wrong variant
 * pools, the unlock-suggestion card (`drills.unlock.*`), the beginner on-ramp
 * captions (`drills.level.*`, for the deleted LevelPicker.svelte) and the
 * phone compact strip (`drills.strip.*`, for the deleted BottomSheet.svelte)
 * all outlived their surfaces and were removed. `unusedKeys.test.ts` is the
 * gate that stops that from silently accumulating again.
 *
 * IMMUNITY (never keyed here, per 20-UI-SPEC "Chord Glyph & Symbol
 * Immunity"): chord symbols, the serif ChordGlyph, interval shorthand
 * (R/m3/P5/m7), solfège syllables (Do/Ré/Mi), and IntervalInfo.longFr (the
 * always-on French interval long-name secondary label this surface already
 * showed before this phase, independent of the EN|FR toggle) stay untouched
 * and are never routed through t().
 */
export const drills = {
	en: {
		// Score register.
		'drills.score.right': 'RIGHT',
		'drills.score.streak': 'STREAK',

		// Identification prompts.
		'drills.prompt.nameChord': 'Name this chord.',
		'drills.prompt.nameInterval': 'Name this interval.',
		'drills.aria.answerPrefix': 'Answer:',

		// Interval construction prompt.
		'drills.prompt.tapPrefix': 'Tap a',
		'drills.prompt.tapAboveInfix': 'above',

		// Feedback (shape/interval reveal legend).
		'drills.feedback.legendChord': 'The chord',
		'drills.feedback.legendExtra': 'Your extra note',
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
		// half-step-count confusion, and this surface never showed a count at
		// all. Stated as counts rather than a sentence so it needs no
		// singular/plural agreement in either language ("m2 is 1 half steps" is
		// the trap). {A}/{B} are interval shorthand (immune); {N}/{M} are their
		// half-step counts. The unit word is always "half steps", never "keys"
		// or "semitones" (standing project rule, set by the thirds lesson).
		'drills.feedback.semitoneContrast': 'Half steps: {A} = {N}, {B} = {M}.',

		// The interval drill's own escalating hint ladder (T13). Framing labels
		// ("Need a hint?", the tier prefix) are reused from the recall domain
		// rather than re-keyed; only these interval-specific rungs are new.
		// Lowercase tier titles match recall.hint.tier.* ("the family").
		'drills.hint.interval.tier.name': 'the name',
		'drills.hint.interval.tier.count': 'the count',
		'drills.hint.interval.tier.song': 'a tune you know',
		'drills.hint.interval.reveal.count': 'Show the half-step count',
		'drills.hint.interval.reveal.song': 'Name a tune you know',
		// {SHORT} is interval shorthand (immune); {LONG} is its long name, which
		// already follows the reader's locale.
		'drills.hint.interval.nameBody': '{SHORT} is a {LONG}.',
		'drills.hint.interval.countBodyUp': 'Half steps up from {ROOT}: {N}.',
		'drills.hint.interval.countBodyBetween': 'Half steps between the two notes: {N}.',
		'drills.hint.interval.closing': "That's everything about this one.",

		'drills.button.next': 'Next',

		// End-of-round card.
		'drills.end.roundComplete': 'ROUND COMPLETE',
		'drills.end.bestRunPrefix': 'BEST RUN:',
		'drills.end.bestRunSuffix': 'IN A ROW',
		'drills.end.worthAnotherLook': 'Worth another look:',
		'drills.end.cleanSheet': 'Clean sheet. The press ran true, mon ami.',

		// IntervalScaffold (sketch 005) caption.
		'drills.scaffold.caption': 'This chord is',

		// CountingChipRow legend (SHAPE-01, Phase 32): the +m3/+M3/3/4 shorthand
		// stays immune (never routed through t()); only the unit word itself is
		// translated. Was "semitones" (surviving pre-unit-word-rule wording,
		// fixed here to match the project's standing "half steps" vocabulary).
		'drills.chip.semitones': 'half steps',
		'drills.chip.legendAria': 'Gap legend',

		// CountingChipRow neutral non-third gap legend row (WR-02, Phase 32
		// Plan 02 gap closure): explains the neutral gap-chip state that
		// renders for non-tertian drill-pool qualities (sus/6/9/13), whose
		// gaps are not m3/M3. The +P4/+M2-style shorthand stays immune.
		'drills.chip.otherGap': 'other gaps show their own interval',

		// Unit 4's spell-the-interval drill (SpellIntervalDrill.svelte). Answers
		// a letter + accidental rather than a tapped key or a name, so the
		// grading can validate the letter separately from the pitch (never a
		// whole-answer string comparison). {PICKED}/{EXPECTED} are letters and
		// {GIVEN_SHORT}/{CORRECT_SHORT} are interval shorthand: all four immune.
		'drills.spell.promptPrefix': 'Spell the',
		'drills.spell.promptInfix': 'above',
		'drills.spell.letterLabel': 'Letter',
		'drills.spell.accidentalLabel': 'Accidental',
		'drills.spell.accidentalNatural': 'Natural',
		'drills.spell.check': 'Check',
		'drills.spell.letterTrap':
			'You wrote {PICKED}, which spells {GIVEN_SHORT}. This one needs the letter {EXPECTED}, for {CORRECT_SHORT}.',
		'drills.spell.halfStepContrast': 'Half steps: {A} = {N}, {B} = {M}.',
		'drills.spell.roundComplete':
			'All six spelled. Come back here whenever a chart throws an odd spelling at you.'
	},
	fr: {
		'drills.score.right': 'BONNES',
		'drills.score.streak': 'SÉRIE',

		'drills.prompt.nameChord': 'Nomme cet accord.',
		'drills.prompt.nameInterval': 'Nomme cet intervalle.',
		'drills.aria.answerPrefix': 'Réponse :',

		'drills.prompt.tapPrefix': 'Appuie sur un',
		'drills.prompt.tapAboveInfix': 'au-dessus de',

		'drills.feedback.legendChord': "L'accord",
		'drills.feedback.legendExtra': 'Ta note en trop',
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

		'drills.button.next': 'Suivant',

		'drills.end.roundComplete': 'MANCHE TERMINÉE',
		'drills.end.bestRunPrefix': 'MEILLEURE SÉRIE :',
		'drills.end.bestRunSuffix': 'DE SUITE',
		'drills.end.worthAnotherLook': 'À revoir de plus près :',
		'drills.end.cleanSheet': 'Sans faute. La presse a tourné rond, mon ami.',

		'drills.scaffold.caption': 'Cet accord est',

		'drills.chip.semitones': 'demi-tons',
		'drills.chip.legendAria': 'Légende des écarts',

		'drills.chip.otherGap': 'les autres écarts affichent leur propre intervalle',

		'drills.spell.promptPrefix': 'Écris la',
		'drills.spell.promptInfix': 'au-dessus de',
		'drills.spell.letterLabel': 'Lettre',
		'drills.spell.accidentalLabel': 'Altération',
		'drills.spell.accidentalNatural': 'Bécarre',
		'drills.spell.check': 'Vérifier',
		'drills.spell.letterTrap':
			'Tu as écrit {PICKED}, ça épelle {GIVEN_SHORT}. Il fallait la lettre {EXPECTED}, pour {CORRECT_SHORT}.',
		'drills.spell.halfStepContrast': 'Demi-tons : {A} = {N}, {B} = {M}.',
		'drills.spell.roundComplete':
			"Les six sont épelés. Reviens ici dès qu'une grille t'envoie une orthographe bizarre."
	}
} satisfies LocaleDict;
