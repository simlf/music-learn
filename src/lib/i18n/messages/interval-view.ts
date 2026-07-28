import type { LocaleDict } from './index';

/**
 * Interval-view domain dictionary (IVW-02): the shared IntervalView
 * component's stacked/formula toggle labels and accessible group/aria
 * strings. Deliberately kept as its own domain file (not folded into
 * home.ts) because the component is cross-hub: Lookup uses it now, Learn
 * (Phase 28) reuses the same component later.
 *
 * No chord symbols, note letters, or interval shorthand are keyed here -
 * this domain only owns the toggle chrome, its aria labels, and the
 * non-tertian caption below.
 *
 * NON-TERTIAN CAPTION (music-theory audit Bug D): most symbols are NOT a
 * plain stack of thirds (83 of tonal's 106 chord types), so the stacked view
 * genuinely renders gaps like C13's +P5 (it has no 11th), a sus4's +P4, or a
 * 6th chord's +M2. Those gaps get the dashed-neutral treatment
 * CountingChipRow already established for this case, and this line names what
 * the dashing means rather than letting the row imply every gap is a third.
 * Deliberately makes no claim about WHY the stack breaks (skipped degree vs
 * adjacent degree vs replaced third), since that differs per symbol.
 * No em dashes in this file's copy (periods/colons/commas only).
 */
export const intervalView = {
	en: {
		'interval-view.aria.group': 'Interval view',
		'interval-view.toggle.stacked': 'Stacked',
		'interval-view.toggle.formula': 'Formula',
		'interval-view.aria.stacked': 'Stacked-thirds view',
		'interval-view.aria.formula': 'Formula view',
		'interval-view.tone.root': 'root',
		'interval-view.stacked.nonTertian':
			'The dashed gaps are not thirds. This symbol is not a plain stack of thirds.'
	},
	fr: {
		'interval-view.aria.group': 'Vue des intervalles',
		'interval-view.toggle.stacked': 'Empilé',
		'interval-view.toggle.formula': 'Formule',
		'interval-view.aria.stacked': 'Vue empilée en tierces',
		'interval-view.aria.formula': 'Vue formule',
		'interval-view.tone.root': 'fondamentale',
		'interval-view.stacked.nonTertian':
			"Les écarts en pointillés ne sont pas des tierces. Ce symbole n'est pas un simple empilement de tierces."
	}
} satisfies LocaleDict;
