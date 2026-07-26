import type { LocaleDict } from './index';

/**
 * Progress hub domain dictionary (PROG-01, Phase 29 Plan 01): the new
 * top-level chrome for the `/progress` hub only (three tab labels + the
 * tab-group aria-label). The absorbed sections keep their existing
 * `progress.*` / `recall.*` / `songs.*` copy untouched - this domain covers
 * only the brand-new hub chrome, matching the "only pages move" boundary.
 */
export const progressHub = {
	en: {
		'progress-hub.tab.stats': 'Stats',
		'progress-hub.tab.recall': 'Recall',
		'progress-hub.tab.songs': 'Songs',
		'progress-hub.aria.tabs': 'Progress hub sections'
	},
	fr: {
		'progress-hub.tab.stats': 'Statistiques',
		'progress-hub.tab.recall': 'Révision',
		'progress-hub.tab.songs': 'Morceaux',
		'progress-hub.aria.tabs': 'Sections de la progression'
	}
} satisfies LocaleDict;
