import type { LocaleDict } from './index';

/**
 * Masthead chrome: the 8 nav labels, the brand, and the EN|FR toggle's own
 * accessible-name strings (I18N-01). The brand key is intentionally
 * IDENTICAL in en and fr - "MUSIC LEARN" is a proper noun and never
 * translates (locked in 20-UI-SPEC.md).
 */
export const chrome = {
	en: {
		'nav.lookup': 'Lookup',
		'nav.drills': 'Drills',
		'nav.build': 'Build',
		'nav.recall': 'Recall',
		'nav.scales': 'Scales',
		'nav.songs': 'Songs',
		'nav.theory': 'Theory',
		'nav.progress': 'Progress',
		brand: 'MUSIC LEARN',
		'locale.aria.group': 'Language',
		'locale.aria.en': 'EN, English',
		'locale.aria.fr': 'FR, Français',
		'pwa.update.message': 'Update available.',
		'pwa.update.action': 'Reload',
		'pwa.update.dismiss': 'Dismiss',
		'chrome.sheet.close': 'Close',
		'nav.more': 'More'
	},
	fr: {
		'nav.lookup': 'Rechercher',
		'nav.drills': 'Exercices',
		'nav.build': 'Construire',
		'nav.recall': 'Révision',
		'nav.scales': 'Gammes',
		'nav.songs': 'Morceaux',
		'nav.theory': 'Théorie',
		'nav.progress': 'Progrès',
		brand: 'MUSIC LEARN',
		'locale.aria.group': 'Langue',
		'locale.aria.en': 'EN, anglais',
		'locale.aria.fr': 'FR, français',
		'pwa.update.message': 'Mise à jour disponible.',
		'pwa.update.action': 'Recharger',
		'pwa.update.dismiss': 'Ignorer',
		'chrome.sheet.close': 'Fermer',
		'nav.more': 'Plus'
	}
} satisfies LocaleDict;
