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
export const scales: LocaleDict = {
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
		'scales.drill.prompt': 'Play {TONIC} major ascending, then descending.',
		'scales.drill.register': 'DEGREE {N} OF 8 · {DIR}',
		'scales.drill.ascending': 'ascending',
		'scales.drill.descending': 'descending',
		'scales.drill.complete': 'Voila. {TONIC} major, up and down, clean.',
		'scales.drill.runAgain': 'Run it again',

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

		'scales.drill.prompt': 'Joue la gamme de {TONIC} majeur en montant, puis en descendant.',
		'scales.drill.register': 'DEGRÉ {N} SUR 8 · {DIR}',
		'scales.drill.ascending': 'montant',
		'scales.drill.descending': 'descendant',
		'scales.drill.complete': 'Voilà. Gamme de {TONIC} majeur, montée puis descente, nickel.',
		'scales.drill.runAgain': 'Recommencer',

		'scales.inspect.idle': "Touche une note pour l'inspecter."
	}
};
