import type { LocaleDict } from './index';

/**
 * Masthead chrome: the 8 nav labels, the brand, and the EN|FR toggle's own
 * accessible-name strings (I18N-01). The brand key is intentionally
 * IDENTICAL in en and fr - "MUSIC LEARN" is a proper noun and never
 * translates (locked in 20-UI-SPEC.md).
 *
 * `nav.due.aria` (B7) carries TWO placeholders: {LABEL} takes the tab's own
 * translated label and {N} the due-card count, so the badged tab's accessible
 * name reads "Practice, 3 due" / "Pratiquer, 3 à revoir" without hardcoding
 * the word Practice in a second place.
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
		'nav.practice': 'Practice',
		'nav.learn': 'Learn',
		brand: 'MUSIC LEARN',
		'locale.aria.group': 'Language',
		'locale.aria.en': 'EN, English',
		'locale.aria.fr': 'FR, Français',
		'pwa.update.message': 'Update available.',
		'pwa.update.action': 'Reload',
		'pwa.update.dismiss': 'Dismiss',
		'chrome.sheet.close': 'Close',
		'nav.more': 'More',
		'nav.progressions': 'Progressions',
		'nav.voicings': 'Voicings',
		'nav.due.aria': '{LABEL}, {N} due'
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
		'nav.practice': 'Pratiquer',
		'nav.learn': 'Apprendre',
		brand: 'MUSIC LEARN',
		'locale.aria.group': 'Langue',
		'locale.aria.en': 'EN, anglais',
		'locale.aria.fr': 'FR, français',
		'pwa.update.message': 'Mise à jour disponible.',
		'pwa.update.action': 'Recharger',
		'pwa.update.dismiss': 'Ignorer',
		'chrome.sheet.close': 'Fermer',
		'nav.more': 'Plus',
		'nav.progressions': 'Progressions',
		'nav.voicings': 'Voicings',
		'nav.due.aria': '{LABEL}, {N} à revoir'
	}
} satisfies LocaleDict;
