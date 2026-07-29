import type { LocaleDict } from './index';

/**
 * Voicings domain (Phase 25 Plan 07, sketch-019 synthesis, SK-019; Phase 33
 * Plan 01, sketch-022 variant A, VOICE-01): every literal the /voicings
 * staged shell-voicing drill renders - the page title/subtitle, the 1 Meet /
 * 2 Subtract / 3 Drill step-indicator chips, the compare-intro "what you
 * know"/"what players use" vcard labels and captions plus its "Got it"
 * advance, the subtraction-stage teach-panel body, the drill-stage
 * add-root/remove-bass nudges and the current-voicing by-product label, the
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
 * QUALITY-AWARE RATIONALE (pedagogy audit fix): the subtract-stage teach
 * line, the compare "what players use" caption, and the play-the-shell prompt
 * each ship a `-flat5` sibling, selected by shellVoicing.hasFlatFifth(). The
 * single generic version they replaced said "keep the 3rd + 7th tritone" and
 * "fifth adds no color", and both halves were false for 3 of the 5 seventh
 * families: the 3rd-to-7th interval is a tritone only in dom7 and dim7 (it is
 * a PERFECT FIFTH in maj7, m7 and m7b5, verified with tonal), and on m7b5 /
 * dim7 the ♭5 is the chord's whole identity, not filler. Scoping the tritone
 * back to the dominants keeps this panel consistent with copy/mnemonics.ts
 * and with theory.ts's dominant lesson, which are both built on the tritone
 * being what makes a V7 a V7.
 *
 * French register-slot abbreviation (013 fit rule): the step-indicator
 * chips abbreviate 1 MEET/3 DRILL to 1 VOIR/3 EXO so all three still fit
 * their chip width under fr. The drill-stage nudges (variant A) render in a
 * wrapping row rather than a fixed-width strip, so the full fr nudge labels
 * fit without abbreviation. No em dashes anywhere in this file's copy
 * (periods/colons/commas only).
 */
export const voicings = {
	en: {
		'voicings.step.meet': '1 MEET',
		'voicings.step.subtract': '2 SUBTRACT',
		'voicings.step.drill': '3 DRILL',
		'voicings.aria.stepGroup': 'Voicing stage',

		'voicings.compare.knowLabel': 'WHAT YOU KNOW',
		'voicings.compare.knowCaption': 'The full stack. Root, third, fifth, seventh.',
		'voicings.compare.useLabel': 'WHAT PLAYERS USE',
		'voicings.compare.useCaption': 'The shell. Just the third and seventh.',
		'voicings.compare.useCaption-flat5': 'The shell. Third, ♭5, and seventh.',
		'voicings.button.gotIt': 'Got it',

		'voicings.subtract.teach':
			'Drop what the symbol already tells you. The root is named right there, and a plain 5th adds no color. Keep the two guide tones: the 3rd says major or minor, the 7th says which seventh.',
		'voicings.subtract.teach-flat5':
			'Drop the root: the symbol already names it. The ♭5 stays. On a ♭5 symbol the fifth is the chord identity, not filler, so the shell keeps the 3rd, the ♭5 and the 7th.',

		'voicings.nudge.addRoot': 'Add the root',
		'voicings.nudge.removeBass': 'Remove the bass',
		'voicings.aria.nudgeGroup': 'Voicing controls',
		'voicings.current.label': 'Current voicing:',
		'voicings.voicing.shell': 'Shell',
		'voicings.voicing.full': 'Full',
		'voicings.voicing.rootless': 'Rootless',

		'voicings.prompt.playShell': 'Play the shell: just the guide tones.',
		'voicings.prompt.playShell-flat5': 'Play the shell: the guide tones plus the ♭5.',
		'voicings.prompt.playFull': 'Play the full voicing: root, third, fifth, seventh.',
		'voicings.prompt.playRootless': 'Play it rootless: no root, just third, fifth, seventh.',

		'voicings.button.check': 'Check',
		'voicings.button.next': 'Next',

		'voicings.retry.wrong': 'Not quite. Try again.',
		'voicings.correct.confirm': 'Guide tones locked in.',

		'voicings.shell.unavailable':
			'No shell to drill on this symbol: a shell keeps the third and the seventh, and this one does not spell both.'
	},
	fr: {
		'voicings.step.meet': '1 VOIR',
		'voicings.step.subtract': '2 RETIRER',
		'voicings.step.drill': '3 EXO',
		'voicings.aria.stepGroup': 'Étape du voicing',

		'voicings.compare.knowLabel': 'CE QUE TU SAIS',
		'voicings.compare.knowCaption': 'La pile complète. Fondamentale, tierce, quinte, septième.',
		'voicings.compare.useLabel': 'CE QUE LES MUSICIENS JOUENT',
		'voicings.compare.useCaption': 'Le shell. Juste la tierce et la septième.',
		'voicings.compare.useCaption-flat5': 'Le shell. Tierce, ♭5 et septième.',
		'voicings.button.gotIt': 'Compris',

		'voicings.subtract.teach':
			"Laisse tomber ce que le symbole te dit déjà. La fondamentale est nommée juste là, et une quinte juste n'ajoute pas de couleur. Garde les deux tons de guidage : la tierce dit majeur ou mineur, la septième dit quelle septième c'est.",
		'voicings.subtract.teach-flat5':
			"Laisse tomber la fondamentale : le symbole la nomme déjà. Mais la ♭5 reste. Sur un symbole en ♭5, la quinte fait l'identité de l'accord, ce n'est pas du remplissage : le shell garde la tierce, la ♭5 et la septième.",

		'voicings.nudge.addRoot': 'Poser la fondamentale',
		'voicings.nudge.removeBass': 'Retirer la basse',
		'voicings.aria.nudgeGroup': 'Contrôles du voicing',
		'voicings.current.label': 'Voicing actuel :',
		'voicings.voicing.shell': 'Shell',
		'voicings.voicing.full': 'Complet',
		'voicings.voicing.rootless': 'Sans fondamentale',

		'voicings.prompt.playShell': 'Joue le shell : juste les tons de guidage.',
		'voicings.prompt.playShell-flat5': 'Joue le shell : les tons de guidage plus la ♭5.',
		'voicings.prompt.playFull': 'Joue le voicing complet : fondamentale, tierce, quinte, septième.',
		'voicings.prompt.playRootless':
			'Joue-le sans fondamentale : juste tierce, quinte, septième.',

		'voicings.button.check': 'Vérifier',
		'voicings.button.next': 'Suivant',

		'voicings.retry.wrong': 'Pas tout à fait. Réessaie.',
		'voicings.correct.confirm': 'Tons de guidage en place.',

		'voicings.shell.unavailable':
			"Pas de shell à travailler sur ce symbole : un shell garde la tierce et la septième, et celui-ci n'a pas les deux."
	}
} satisfies LocaleDict;
