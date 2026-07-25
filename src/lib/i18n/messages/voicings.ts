import type { LocaleDict } from './index';

/**
 * Voicings domain (Phase 25 Plan 07, sketch-019 synthesis, SK-019): every
 * literal the /voicings staged shell-voicing drill renders - the page
 * title/subtitle, the 1 Meet / 2 Subtract / 3 Drill step-indicator chips,
 * the compare-intro "what you know"/"what players use" vcard labels and
 * captions plus its "Got it" advance, the subtraction-stage teach-panel
 * body, the Root/Shell/Rootless voicing-selector chip labels, the
 * play/Check/Next controls, and the wrong-retry/correct-confirm feedback
 * lines.
 *
 * IMMUNITY (never keyed here, per the project's Chord Glyph & Symbol
 * Immunity rule): chord symbols, interval shorthand (R/3/5/7), and the
 * serif ChordGlyph stay untouched and are never routed through t(). "Shell"
 * (the jazz-pedagogy term for the 3rd+7th guide-tone voicing) is kept
 * identical in en/fr, mirroring chrome.ts's nav.progressions precedent for a
 * technical jazz term without an established French equivalent.
 *
 * French register-slot abbreviation (013 fit rule): the voicing-selector
 * chips are a fixed-width mono strip, so ROOT/ROOTLESS abbreviate to
 * FOND./SANS FOND. (mirrors the documented FONDAMENTALE-vs-ROOT case) and
 * the step-indicator chips abbreviate 1 MEET/3 DRILL to 1 VOIR/3 EXO so all
 * three still fit their chip width under fr. No em dashes anywhere in this
 * file's copy (periods/colons only).
 */
export const voicings = {
	en: {
		'voicings.page.title': 'Shell Voicings',
		'voicings.page.subtitle':
			'Left-hand guide tones, staged to how well you know each chord.',

		'voicings.step.meet': '1 MEET',
		'voicings.step.subtract': '2 SUBTRACT',
		'voicings.step.drill': '3 DRILL',
		'voicings.aria.stepGroup': 'Voicing stage',

		'voicings.compare.knowLabel': 'WHAT YOU KNOW',
		'voicings.compare.knowCaption': 'The full stack. Root, third, fifth, seventh.',
		'voicings.compare.useLabel': 'WHAT PLAYERS USE',
		'voicings.compare.useCaption': 'The shell. Just the third and seventh.',
		'voicings.button.gotIt': 'Got it',

		'voicings.subtract.teach':
			'Drop what the symbol already tells you: root is named, fifth adds no color; keep the 3rd + 7th tritone.',

		'voicings.selector.root': 'ROOT',
		'voicings.selector.shell': 'SHELL',
		'voicings.selector.rootless': 'ROOTLESS',
		'voicings.aria.selectorGroup': 'Voicing style',

		'voicings.prompt.playShell': 'Play the shell: just the guide tones.',
		'voicings.prompt.playFull': 'Play the full voicing: root, third, fifth, seventh.',
		'voicings.prompt.playRootless': 'Play it rootless: no root, just third, fifth, seventh.',

		'voicings.button.check': 'Check',
		'voicings.button.next': 'Next',

		'voicings.retry.wrong': 'Not quite. Try again.',
		'voicings.correct.confirm': 'Guide tones locked in.'
	},
	fr: {
		'voicings.page.title': 'Shell Voicings',
		'voicings.page.subtitle':
			'Les tons de guidage de la main gauche, dosés selon ta maîtrise de chaque accord.',

		'voicings.step.meet': '1 VOIR',
		'voicings.step.subtract': '2 RETIRER',
		'voicings.step.drill': '3 EXO',
		'voicings.aria.stepGroup': 'Étape du voicing',

		'voicings.compare.knowLabel': 'CE QUE TU SAIS',
		'voicings.compare.knowCaption': 'La pile complète. Fondamentale, tierce, quinte, septième.',
		'voicings.compare.useLabel': 'CE QUE LES MUSICIENS JOUENT',
		'voicings.compare.useCaption': 'Le shell. Juste la tierce et la septième.',
		'voicings.button.gotIt': 'Compris',

		'voicings.subtract.teach':
			"Laisse tomber ce que le symbole te dit déjà : la fondamentale est nommée, la quinte n'ajoute pas de couleur. Garde le triton tierce et septième.",

		'voicings.selector.root': 'FOND.',
		'voicings.selector.shell': 'SHELL',
		'voicings.selector.rootless': 'SANS FOND.',
		'voicings.aria.selectorGroup': 'Style de voicing',

		'voicings.prompt.playShell': 'Joue le shell : juste les tons de guidage.',
		'voicings.prompt.playFull': 'Joue le voicing complet : fondamentale, tierce, quinte, septième.',
		'voicings.prompt.playRootless':
			'Joue-le sans fondamentale : juste tierce, quinte, septième.',

		'voicings.button.check': 'Vérifier',
		'voicings.button.next': 'Suivant',

		'voicings.retry.wrong': 'Pas tout à fait. Réessaie.',
		'voicings.correct.confirm': 'Tons de guidage en place.'
	}
} satisfies LocaleDict;
