import type { LocaleDict } from './index';

/**
 * Build-domain dictionary (I18N-02, Plan 20-03): every literal BuildSession
 * (the constructable picker + step/WHY/reveal loop) and the /build page
 * render. Interval long-names themselves are NOT duplicated here - chord
 * steps read `IntervalInfo.longFr` straight from `theory/interval.ts` at
 * render time; only the SURROUNDING English words (prefixes, connectors,
 * role nouns, unit words) are keyed. Scale steps are always consecutive
 * major/minor seconds (whole/half steps), which have no existing French seed
 * in interval.ts, so `build.interval.wholeStep`/`.halfStep` introduce that
 * vocabulary here (Build's own domain, not a re-derivation of the
 * degree/quality noun-and-adjective machinery already in interval.ts).
 */
export const build: LocaleDict = {
	en: {
		'build.kind.chords': 'Chords',
		'build.kind.scales': 'Scales',
		'build.aria.kindGroup': 'Build kind',

		'build.caption.root': 'Root',
		'build.caption.quality': 'Quality',
		'build.caption.tonic': 'Tonic',

		'build.word.major': 'major',

		'build.quality.minor': 'minor',
		'build.quality.diminished': 'diminished',
		'build.quality.major7': 'major 7th',
		'build.quality.minor7': 'minor 7th',
		'build.quality.dominant7': 'dominant 7th',
		'build.quality.halfDiminished': 'half-diminished',
		'build.quality.diminished7': 'diminished 7th',

		'build.step.step': 'STEP',
		'build.step.of': 'OF',
		'build.step.chordsPrefix': 'Stack a',
		'build.step.chordsInfix': 'up from',
		'build.step.scalesPrefix': 'Take a',
		'build.step.scalesInfix': 'up from',

		'build.interval.wholeStep': 'whole step',
		'build.interval.halfStep': 'half step',

		'build.why.chordsPrefix': "That's the",
		'build.why.chordsInfix': 'of',
		'build.why.scalesPrefix': "That's degree",
		'build.why.scalesInfix': 'of',

		'build.role.root': 'root',
		'build.role.second': 'second',
		'build.role.third': 'third',
		'build.role.fourth': 'fourth',
		'build.role.fifth': 'fifth',
		'build.role.sixth': 'sixth',
		'build.role.seventh': 'seventh',

		'build.button.showCountUp': 'Show the count-up hint',
		'build.countUp.suffix': 'Count it out.',

		'build.unit.halfStep': 'half step',
		'build.unit.halfSteps': 'half steps',
		'build.diagnostic.too': 'too',
		'build.direction.high': 'high',
		'build.direction.low': 'low',

		'build.restatement.needChordsPrefix': 'You need a',
		'build.restatement.needScalesPrefix': 'You need a',
		'build.restatement.stackingPrefix': "You're stacking upward: try the next",
		'build.restatement.down': 'down',
		'build.restatement.up': 'up',

		'build.feedback.wrongOctave': 'Right note, wrong octave.',

		'build.enharmonic.a': "This key's usually called",
		'build.enharmonic.b': 'but',
		'build.enharmonic.c': 'spells it',
		'build.enharmonic.dChords': 'so the chord',
		'build.enharmonic.dScales': 'so the scale',
		'build.enharmonic.e': 'reads as a clean stack of',

		'build.rule.then': 'then',
		'build.unit.wholeBare': 'whole',
		'build.unit.halfBare': 'half',

		'build.complete.headingChordsPrefix': 'Voila. You built',
		'build.complete.headingScalesPrefix': 'Voila.',
		'build.complete.headingScalesSuffix': 'built from scratch.',

		'build.status.saved': 'SAVED TO RECALL · FORMULA-BUILD MODE',

		'build.button.hearAgain': 'Hear again',
		'build.button.buildAnother': 'Build Another',
		'build.button.recallNow': 'Recall It Now',
		'build.button.next': 'Next',

		'build.confirm.0': 'Nailed it.',
		'build.confirm.1': 'Et voilà.',
		'build.confirm.2': 'Bang on.',
		'build.confirm.3': 'Spot on, mon ami.',
		'build.wrong.0': 'Not quite.',
		'build.wrong.1': 'Close, but no cigar.',
		'build.wrong.2': 'Not this time.',

		'build.page.title': 'Build It',
		'build.page.subtitle': "Earn every note. Stack the interval, don't just read it."
	},
	fr: {
		'build.kind.chords': 'Accords',
		'build.kind.scales': 'Gammes',
		'build.aria.kindGroup': 'Type de construction',

		'build.caption.root': 'Fondamentale',
		'build.caption.quality': 'Qualité',
		'build.caption.tonic': 'Tonique',

		'build.word.major': 'majeur',

		'build.quality.minor': 'mineur',
		'build.quality.diminished': 'diminué',
		'build.quality.major7': 'majeur 7',
		'build.quality.minor7': 'mineur 7',
		'build.quality.dominant7': 'dominante 7',
		'build.quality.halfDiminished': 'demi-diminué',
		'build.quality.diminished7': 'diminué 7',

		'build.step.step': 'ÉTAPE',
		'build.step.of': 'SUR',
		'build.step.chordsPrefix': 'Empile une',
		'build.step.chordsInfix': 'au-dessus de',
		'build.step.scalesPrefix': "Monte d'un",
		'build.step.scalesInfix': 'depuis',

		'build.interval.wholeStep': 'ton entier',
		'build.interval.halfStep': 'demi-ton',

		'build.why.chordsPrefix': "C'est la",
		'build.why.chordsInfix': 'de',
		'build.why.scalesPrefix': "C'est le degré",
		'build.why.scalesInfix': 'de',

		'build.role.root': 'fondamentale',
		'build.role.second': 'seconde',
		'build.role.third': 'tierce',
		'build.role.fourth': 'quarte',
		'build.role.fifth': 'quinte',
		'build.role.sixth': 'sixte',
		'build.role.seventh': 'septième',

		'build.button.showCountUp': "Afficher l'indice de comptage",
		'build.countUp.suffix': 'Compte à voix haute.',

		'build.unit.halfStep': 'demi-ton',
		'build.unit.halfSteps': 'demi-tons',
		'build.diagnostic.too': 'trop',
		'build.direction.high': 'haut',
		'build.direction.low': 'bas',

		'build.restatement.needChordsPrefix': 'Il te faut une',
		'build.restatement.needScalesPrefix': 'Il te faut un',
		'build.restatement.stackingPrefix': 'Tu empiles vers le haut : essaie la prochaine',
		'build.restatement.down': 'en dessous',
		'build.restatement.up': 'au-dessus',

		'build.feedback.wrongOctave': 'Bonne note, mauvaise octave.',

		'build.enharmonic.a': "Cette touche s'appelle généralement",
		'build.enharmonic.b': 'mais',
		'build.enharmonic.c': "l'écrit",
		'build.enharmonic.dChords': "donc l'accord",
		'build.enharmonic.dScales': 'donc la gamme',
		'build.enharmonic.e': 'se lit comme un empilement net de',

		'build.rule.then': 'puis',
		'build.unit.wholeBare': 'ton',
		'build.unit.halfBare': 'demi-ton',

		'build.complete.headingChordsPrefix': 'Voilà. Tu as construit',
		'build.complete.headingScalesPrefix': 'Voilà.',
		'build.complete.headingScalesSuffix': 'construite du début à la fin.',

		'build.status.saved': 'ENREGISTRÉ DANS RÉVISION · MODE FORMULE-CONSTRUCTION',

		'build.button.hearAgain': 'Réécouter',
		'build.button.buildAnother': 'Construire un autre',
		'build.button.recallNow': 'Réviser maintenant',
		'build.button.next': 'Suivant',

		'build.confirm.0': 'Dans le mille.',
		'build.confirm.1': 'Et voilà.',
		'build.confirm.2': 'En plein dedans.',
		'build.confirm.3': 'Exactement, mon ami.',
		'build.wrong.0': 'Pas tout à fait.',
		'build.wrong.1': 'Presque, mais pas cette fois.',
		'build.wrong.2': 'Pas cette fois-ci.',

		'build.page.title': 'Construire',
		'build.page.subtitle': "Gagne chaque note. Empile l'intervalle, ne te contente pas de le lire."
	}
};
