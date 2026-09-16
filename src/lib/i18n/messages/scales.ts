import type { LocaleDict } from './index';

/**
 * Scales domain dictionary (I18N-02, Phase 20 Plan 07): every literal the
 * `/scales` page, `ScaleKeyboardDrill` (Practice mode's tonic-anchored
 * 2-octave drill), and `ScaleDegreeStrip` (Explore mode's degree strip)
 * render - page title/subtitle, the tonic-picker's `major`/`majeur` quality
 * suffix (shared by the visible scale title and each tonic button's
 * aria-label), the Explore/Practice mode toggle, the degree strip's group
 * label and per-cell `degree`/`degré` aria suffix, the drill's
 * prompt/register/completion/run-again copy, and the InspectRegister idle
 * placeholder this page passes as a prop.
 *
 * IMMUNITY (never keyed here, per 20-UI-SPEC "Chord Glyph & Symbol
 * Immunity" and this plan's prohibitions): note letters (tonic/root, e.g.
 * `C`, `D♭`), solfège syllables (Do/Ré/Mi), interval shorthand
 * (`IntervalInfo.short`, e.g. `M6`), and scale degree NUMBERS all stay raw
 * values, never routed through t(). `IntervalInfo.longFr` (already read
 * directly by InspectRegister) is untouched here too. `InspectRegister.svelte`
 * itself is owned by Plan 20-09 and is never edited from this file; this
 * page only supplies its `idleText` prop via a translated key.
 */
export const scales = {
	en: {
		'scales.page.title': 'Scales',
		'scales.page.subtitle':
			'Pick a tonic, mon ami. Tap any degree to hear it and read its interval from the root.',

		// Shared quality suffix: the scale title ("{tonic} major") and every
		// tonic button's aria-label ("{root} major") both read this one key so
		// the root letter itself never routes through t() (immune).
		'scales.tonic.qualitySuffix': 'major',

		// Explore/Practice mode toggle.
		'scales.mode.groupLabel': 'Scale mode',
		'scales.mode.explore': 'Explore',
		'scales.mode.practice': 'Practice',

		// Explore degree strip (ScaleDegreeStrip.svelte).
		'scales.degreeStrip.groupLabel': 'Scale degrees',
		'scales.degreeStrip.degreeLabel': 'degree',

		// Practice keyboard drill (ScaleKeyboardDrill.svelte). {TONIC} is
		// substituted at the call site (t() has no interpolation).
		'scales.drill.groupLabel': 'Scale keyboard, {TONIC} major, two octaves',
		'scales.drill.keyLabel': 'key',
		'scales.drill.scaleDegreeLabel': 'scale degree',
		'scales.drill.prompt': 'Play {TONIC} major ascending, then descending.',
		'scales.drill.register': 'DEGREE {N} OF 8 · {DIR}',
		'scales.drill.ascending': 'ascending',
		'scales.drill.descending': 'descending',
		'scales.drill.complete': 'Voila. {TONIC} major, up and down, clean.',
		'scales.drill.runAgain': 'Run it again',

		// Practice hub DEGREE family (PracticeDegreeDrill.svelte), the surface
		// that made the catalog's 84 scale-degree facts answerable on /practice.
		// {TONIC}, {NOTE}, {N}, {M}, {PICKED} and {CORRECT} are substituted at
		// the call site (t() has no interpolation). Note letters and degree
		// NUMBERS are immune and interpolated verbatim, never routed through t().
		'scales.degreeDrill.promptNote': 'Degree {N} of {TONIC} major.',
		'scales.degreeDrill.promptNoteHelp': 'Play it',
		'scales.degreeDrill.promptDegree': 'Which degree is {NOTE} in {TONIC} major?',
		'scales.degreeDrill.degreeRowLabel': 'Scale degree',
		'scales.degreeDrill.degreeChoiceAria': 'Degree {N}',
		'scales.degreeDrill.answerLine': 'Degree {N} of {TONIC} major is {NOTE}.',
		'scales.degreeDrill.tappedInScale': 'You played {NOTE}. That is degree {M}.',
		'scales.degreeDrill.tappedOutside': 'You played {NOTE}. That note is not in {TONIC} major.',
		'scales.degreeDrill.pickedVsCorrect': 'You picked {PICKED}. The answer is {CORRECT}.',
		'scales.degreeDrill.stripLabel': 'THE WHOLE SCALE, NUMBERED',
		// The idea the family exists for, restated on every reveal.
		'scales.degreeDrill.whyNumbers':
			'1 3 5 is the same shape in every key. C E G is only true in C.',
		'scales.degreeDrill.hintTier': 'Counting it',
		'scales.degreeDrill.hintBodyUp':
			'Start on {TONIC} and climb the major scale: 2 2 1 2 2 2 1 half steps. Stop on step {N}.',
		'scales.degreeDrill.hintBodyDown':
			'Start on {TONIC} and climb the major scale: 2 2 1 2 2 2 1 half steps. Count the steps up to {NOTE}.',
		'scales.degreeDrill.hintClosing': 'That is the whole method. It works in every key.',

		// Practice hub CHORD-SCALE family (ChordScaleDrill.svelte, design doc
		// improvisation.md 5.4): given a chord, tap the one key that is NOT in
		// its fitting scale. `scaleName.*` keys are per ChordScaleId (dorian,
		// ionian...) and are read via a template-literal key, so they carry a
		// DYNAMIC_PREFIXES entry in unusedKeys.test.ts. The chord symbol and
		// scale tonic letter stay immune, never routed through t().
		'scales.chordScaleDrill.prompt': 'Tap the one key that does NOT fit this chord.',
		'scales.chordScaleDrill.verdictCorrect': 'That note sits outside the scale. Nicely spotted.',
		'scales.chordScaleDrill.verdictClose':
			"Close. That note IS in the scale, it just rubs on a held beat, it's not the outsider.",
		'scales.chordScaleDrill.verdictWrong': 'That note is part of the chord or its scale.',
		'scales.chordScaleDrill.scaleLabelPrefix': 'The scale that fits:',
		'scales.chordScaleDrill.scaleName.ionian': 'ionian',
		'scales.chordScaleDrill.scaleName.lydian': 'lydian',
		'scales.chordScaleDrill.scaleName.mixolydian': 'mixolydian',
		'scales.chordScaleDrill.scaleName.dorian': 'dorian',
		'scales.chordScaleDrill.scaleName.aeolian': 'aeolian',
		'scales.chordScaleDrill.scaleName.minor-pentatonic': 'minor pentatonic',
		'scales.chordScaleDrill.scaleName.locrian': 'locrian',

		// InspectRegister idleText prop (owned by 20-09; this key only supplies
		// the translated value, InspectRegister.svelte itself is untouched).
		'scales.inspect.idle': 'Tap a key to inspect it.'
	},
	fr: {
		'scales.page.title': 'Gammes',
		'scales.page.subtitle':
			"Choisis une tonique, mon ami. Appuie sur un degré pour l'entendre et lire son intervalle depuis la fondamentale.",

		'scales.tonic.qualitySuffix': 'majeur',

		'scales.mode.groupLabel': 'Mode de gamme',
		'scales.mode.explore': 'Explorer',
		'scales.mode.practice': 'Pratiquer',

		'scales.degreeStrip.groupLabel': 'Degrés de la gamme',
		'scales.degreeStrip.degreeLabel': 'degré',

		'scales.drill.groupLabel': 'Clavier de gamme, {TONIC} majeur, deux octaves',
		'scales.drill.keyLabel': 'touche',
		'scales.drill.scaleDegreeLabel': 'degré de la gamme',
		'scales.drill.prompt': 'Joue la gamme de {TONIC} majeur en montant, puis en descendant.',
		'scales.drill.register': 'DEGRÉ {N} SUR 8 · {DIR}',
		'scales.drill.ascending': 'montant',
		'scales.drill.descending': 'descendant',
		'scales.drill.complete': 'Voilà. Gamme de {TONIC} majeur, montée puis descente, nickel.',
		'scales.drill.runAgain': 'Recommencer',

		'scales.degreeDrill.promptNote': 'Degré {N} de {TONIC} majeur.',
		'scales.degreeDrill.promptNoteHelp': 'Joue-le',
		'scales.degreeDrill.promptDegree': 'Quel degré est {NOTE} dans {TONIC} majeur ?',
		'scales.degreeDrill.degreeRowLabel': 'Degré de la gamme',
		'scales.degreeDrill.degreeChoiceAria': 'Degré {N}',
		'scales.degreeDrill.answerLine': 'Le degré {N} de {TONIC} majeur est {NOTE}.',
		'scales.degreeDrill.tappedInScale': 'Tu as joué {NOTE}. C\'est le degré {M}.',
		'scales.degreeDrill.tappedOutside':
			"Tu as joué {NOTE}. Cette note n'est pas dans {TONIC} majeur.",
		'scales.degreeDrill.pickedVsCorrect': 'Tu as choisi {PICKED}. La réponse est {CORRECT}.',
		'scales.degreeDrill.stripLabel': 'TOUTE LA GAMME, NUMÉROTÉE',
		'scales.degreeDrill.whyNumbers':
			"1 3 5, c'est la même forme dans toutes les tonalités. Do Mi Sol n'est vrai qu'en Do.",
		'scales.degreeDrill.hintTier': 'Compter les degrés',
		'scales.degreeDrill.hintBodyUp':
			'Pars de {TONIC} et monte la gamme majeure : 2 2 1 2 2 2 1 demi-tons. Arrête-toi au degré {N}.',
		'scales.degreeDrill.hintBodyDown':
			'Pars de {TONIC} et monte la gamme majeure : 2 2 1 2 2 2 1 demi-tons. Compte les degrés jusqu\'à {NOTE}.',
		'scales.degreeDrill.hintClosing':
			"C'est toute la méthode. Elle marche dans toutes les tonalités.",

		'scales.chordScaleDrill.prompt': "Touche l'unique note qui NE va PAS avec cet accord.",
		'scales.chordScaleDrill.verdictCorrect': "Cette note est hors de la gamme. Bien vu.",
		'scales.chordScaleDrill.verdictClose':
			"Presque. Cette note EST dans la gamme, elle frotte juste sur un temps tenu, ce n'est pas l'intruse.",
		'scales.chordScaleDrill.verdictWrong': "Cette note fait partie de l'accord ou de sa gamme.",
		'scales.chordScaleDrill.scaleLabelPrefix': 'La gamme qui va avec :',
		'scales.chordScaleDrill.scaleName.ionian': 'ionien',
		'scales.chordScaleDrill.scaleName.lydian': 'lydien',
		'scales.chordScaleDrill.scaleName.mixolydian': 'mixolydien',
		'scales.chordScaleDrill.scaleName.dorian': 'dorien',
		'scales.chordScaleDrill.scaleName.aeolian': 'éolien',
		'scales.chordScaleDrill.scaleName.minor-pentatonic': 'pentatonique mineure',
		'scales.chordScaleDrill.scaleName.locrian': 'locrien',

		'scales.inspect.idle': "Touche une note pour l'inspecter."
	}
} satisfies LocaleDict;
