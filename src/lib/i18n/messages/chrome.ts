import type { LocaleDict } from './index';

/**
 * Masthead chrome: the four hub nav labels, the brand, and the EN|FR toggle's
 * own accessible-name strings (I18N-01). The brand key is intentionally
 * IDENTICAL in en and fr - "MUSIC LEARN" is a proper noun and never
 * translates (locked in 20-UI-SPEC.md).
 *
 * The nav set is exactly the four hubs the masthead and bottom tab bar render
 * (`NAV_LINKS` in `+layout.svelte`): Lookup, Practice, Learn, Progress. The
 * pre-consolidation ten-link nav labels (`nav.drills`, `nav.more`,
 * `nav.build`, `nav.recall`, `nav.scales`, `nav.songs`, `nav.theory`,
 * `nav.progressions`, `nav.voicings`) and `chrome.sheet.close` (the deleted
 * BottomSheet) were removed once those routes became 308 redirects; the
 * `unusedKeys.test.ts` gate now keeps the set honest.
 *
 * `nav.due.aria` (B7) carries TWO placeholders: {LABEL} takes the tab's own
 * translated label and {N} the due-card count, so the badged tab's accessible
 * name reads "Practice, 3 due" / "Pratiquer, 3 à revoir" without hardcoding
 * the word Practice in a second place.
 */
export const chrome = {
	en: {
		'nav.lookup': 'Lookup',
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
		'nav.due.aria': '{LABEL}, {N} due'
	},
	fr: {
		'nav.lookup': 'Rechercher',
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
		'nav.due.aria': '{LABEL}, {N} à revoir'
	}
} satisfies LocaleDict;
