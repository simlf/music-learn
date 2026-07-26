import type { LocaleDict } from './index';

/**
 * Interval-view domain dictionary (IVW-02): the shared IntervalView
 * component's stacked/formula toggle labels and accessible group/aria
 * strings. Deliberately kept as its own domain file (not folded into
 * home.ts) because the component is cross-hub: Lookup uses it now, Learn
 * (Phase 28) reuses the same component later.
 *
 * No chord symbols, note letters, or interval shorthand are keyed here -
 * this domain only owns the toggle chrome and its aria labels.
 */
export const intervalView = {
	en: {
		'interval-view.aria.group': 'Interval view',
		'interval-view.toggle.stacked': 'Stacked',
		'interval-view.toggle.formula': 'Formula',
		'interval-view.aria.stacked': 'Stacked-thirds view',
		'interval-view.aria.formula': 'Formula view',
		'interval-view.tone.root': 'root'
	},
	fr: {
		'interval-view.aria.group': 'Vue des intervalles',
		'interval-view.toggle.stacked': 'Empilé',
		'interval-view.toggle.formula': 'Formule',
		'interval-view.aria.stacked': 'Vue empilée en tierces',
		'interval-view.aria.formula': 'Vue formule',
		'interval-view.tone.root': 'fondamentale'
	}
} satisfies LocaleDict;
