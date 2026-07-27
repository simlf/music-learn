import type { LocaleDict } from './index';

/**
 * Inversions domain (Phase 35 Plan 03, INV-01): every keyed WORD the new
 * inversion-drill family (`InversionDrill.svelte`, 35-05) and its Practice-hub
 * host cue (35-06) render - the four inversion names, their abbreviated
 * strip-cell labels, the article-free bass-role words + shared article, the
 * prompt-composition phrase, the Check/Hear-it/Next buttons, the two
 * distinct retry lines (wrong notes vs. right notes/wrong bass), the
 * post-answer reveal line, the escalating 3-rung hint ladder (reveal-control
 * labels, tier tags, rung bodies split around immune interpolated values),
 * and the ladder's closing line.
 *
 * IMMUNITY (never keyed here, per the project's Chord Glyph & Symbol
 * Immunity rule): chord symbols (e.g. "Cm7"), bass note letters (e.g. "C",
 * "E♭"), and role-shorthand markers (R/3/5/7) stay untouched and are never
 * routed through t() - only the surrounding WORDS (inversion names, bass-role
 * nouns, connective phrasing) are keyed. Several rung bodies are therefore
 * split into lead/mid/closing pieces so the consuming component can splice
 * an immune bass letter (or an already-keyed inversion name/bass-role word)
 * between them, mirroring `progressions.hint.degree.lead/.builtOn/.noteOf/
 * .rootLabel`'s split-key precedent.
 *
 * No em dashes anywhere in this file's copy (periods/colons/middots only).
 * The disclosure triangle "▾" on the depth-0 reveal control is not an em
 * dash or connective arrow - it mirrors `progressions.hint.reveal.start`'s
 * existing "Show a hint ▾" verbatim.
 */
export const inversions = {
	en: {
		'inversions.name.0': 'Root position',
		'inversions.name.1': '1st inversion',
		'inversions.name.2': '2nd inversion',
		'inversions.name.3': '3rd inversion',

		'inversions.abbr.0': 'Root',
		'inversions.abbr.1': '1st inv.',
		'inversions.abbr.2': '2nd inv.',
		'inversions.abbr.3': '3rd inv.',

		'inversions.bassRole.root': 'root',
		'inversions.bassRole.third': 'third',
		'inversions.bassRole.fifth': 'fifth',
		'inversions.bassRole.seventh': 'seventh',

		'inversions.bass.article': 'the',

		'inversions.prompt.inBass': 'in the bass',

		'inversions.button.check': 'Check',
		'inversions.button.hearIt': 'Hear it',
		'inversions.button.next': 'Next',

		'inversions.retry.wrongNotes': 'Not quite. Play the right notes.',
		'inversions.retry.wrongBass': 'Right notes, but the bass must be:',

		'inversions.reveal.correct': 'Correct inversion. Same 4 notes, different bass.',

		'inversions.hint.reveal.start': 'Show a hint ▾',
		'inversions.hint.reveal.stack': 'Show the order from the bass',
		'inversions.hint.reveal.ghost': 'Show me',

		'inversions.hint.tier.prefix': 'HINT',
		'inversions.hint.tier.bass': 'THE BASS',
		'inversions.hint.tier.stack': 'THE ORDER FROM THE BASS',
		'inversions.hint.tier.ghost': 'SHOW ME',

		// Rung 1 ("bass"): composed as `${inversionName}. ${hint.bass.mid}
		// ${bassLetter} (${bass.article} ${bassRoleWord}).` - the bass letter
		// is the immune value, spliced raw between the two keyed halves.
		'inversions.hint.bass.mid': 'the bass is',

		// Rung 2 ("stack"): composed as `${hint.stack.lead} ${bassLetter},
		// ${hint.stack.closing}` preceding a bass-rotated CountingChipRow -
		// the bass letter is again spliced raw, never routed through t().
		'inversions.hint.stack.lead': 'Starting from',
		'inversions.hint.stack.closing': 'stack the chord:',

		'inversions.hint.ghost.body':
			'The dashed keys show where to play, the bass is ringed. Play them, then check.',

		'inversions.hint.closing': 'The hint fades as the card matures.'
	},
	fr: {
		'inversions.name.0': 'Fondamentale',
		'inversions.name.1': '1ᵉʳ renversement',
		'inversions.name.2': '2ᵉ renversement',
		'inversions.name.3': '3ᵉ renversement',

		'inversions.abbr.0': 'Fond.',
		'inversions.abbr.1': '1ᵉʳ renv.',
		'inversions.abbr.2': '2ᵉ renv.',
		'inversions.abbr.3': '3ᵉ renv.',

		'inversions.bassRole.root': 'fondamentale',
		'inversions.bassRole.third': 'tierce',
		'inversions.bassRole.fifth': 'quinte',
		'inversions.bassRole.seventh': 'septième',

		'inversions.bass.article': 'la',

		'inversions.prompt.inBass': 'à la basse',

		'inversions.button.check': 'Vérifier',
		'inversions.button.hearIt': 'Entendre',
		'inversions.button.next': 'Suivant',

		'inversions.retry.wrongNotes': 'Pas tout à fait. Rejoue les bonnes notes.',
		'inversions.retry.wrongBass': 'Les notes sont bonnes, mais la basse doit être :',

		'inversions.reveal.correct': 'Renversement correct. Même 4 notes, basse différente.',

		'inversions.hint.reveal.start': 'Afficher un indice ▾',
		'inversions.hint.reveal.stack': "Montrer l'ordre depuis la basse",
		'inversions.hint.reveal.ghost': 'Montre-moi',

		'inversions.hint.tier.prefix': 'INDICE',
		'inversions.hint.tier.bass': 'LA BASSE',
		'inversions.hint.tier.stack': "L'ORDRE DEPUIS LA BASSE",
		'inversions.hint.tier.ghost': 'MONTRE-MOI',

		'inversions.hint.bass.mid': 'la basse est',

		'inversions.hint.stack.lead': 'À partir de',
		'inversions.hint.stack.closing': "empile l'accord :",

		'inversions.hint.ghost.body':
			'Les touches en pointillé indiquent où jouer, la basse est cerclée. Joue-les, puis vérifie.',

		'inversions.hint.closing': "L'indice s'estompe quand la carte mûrit."
	}
} satisfies LocaleDict;
