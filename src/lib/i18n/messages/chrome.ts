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
 *
 * `midi.status.*` (MIDI-01/MIDI-04, Phase 38 Plan 03) is the masthead MIDI
 * chip's copy for `MidiStatus.svelte`'s seven non-unsupported connection
 * states (the eighth, `unsupported`, renders no chip at all, so it needs no
 * string here). `noDevice` ("never saw a device this session") and
 * `disconnected` ("was connected, then unplugged") are deliberately two
 * different strings rather than one, because collapsing them would erase the
 * distinction the underlying state machine (`midi.svelte.ts`) exists to
 * preserve. `connected`'s `{NAME}` placeholder is substituted client-side
 * (like `nav.due.aria` above) with the instrument's own hardware-reported
 * USB descriptor name, which is never translated and never re-keyed per
 * locale: only the surrounding chrome word ("MIDI") is.
 *
 * `midi.aria.*` are the chip's ACCESSIBLE NAMES, which the `midi.status.*`
 * strings cannot serve on their own: every retryable state's visible copy is a
 * STATUS ("MIDI: NO DEVICE", "MIDI: ERROR"), and a button whose whole
 * accessible name is a status tells a screen-reader user nothing about what
 * activating it does (WCAG 2.4.6 / 4.1.2). `midi.aria.retry` is therefore a
 * fragment, appended to the visible label rather than replacing it, so the
 * visible text stays part of the accessible name (WCAG 2.5.3 Label in Name)
 * and the resulting name reads "MIDI: NO DEVICE, retry connecting".
 * `midi.aria.connect` is a full replacement because `idle`'s visible copy is
 * already an action ("CONNECT MIDI"), so nothing needs appending.
 *
 * `midi.status.deniedHelp` is the RECOVERY PATH for the one state the app
 * cannot resolve on the user's behalf. Once MIDI is blocked, the browser
 * auto-rejects every further request without prompting, so "MIDI: BLOCKED" on
 * its own is a dead end: the fix lives in site settings and nothing in the app
 * was saying so. It is a full sentence rather than a chip-sized fragment
 * because it is only ever read as a description or a tooltip, never squeezed
 * into the masthead.
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
		'nav.due.aria': '{LABEL}, {N} due',
		'midi.status.connect': 'CONNECT MIDI',
		'midi.status.enabling': 'MIDI: CONNECTING',
		'midi.status.connected': 'MIDI: {NAME}',
		'midi.status.noDevice': 'MIDI: NO DEVICE',
		'midi.status.disconnected': 'MIDI: DISCONNECTED',
		'midi.status.denied': 'MIDI: BLOCKED',
		'midi.status.error': 'MIDI: ERROR',
		'midi.status.deviceFallback': 'MIDI DEVICE',
		'midi.status.deniedHelp': 'Allow MIDI in your browser site settings, then tap again.',
		'midi.aria.connect': 'Connect MIDI',
		'midi.aria.retry': 'retry connecting'
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
		'nav.due.aria': '{LABEL}, {N} à revoir',
		'midi.status.connect': 'CONNECTER MIDI',
		'midi.status.enabling': 'MIDI : CONNEXION',
		'midi.status.connected': 'MIDI : {NAME}',
		'midi.status.noDevice': 'MIDI : AUCUN APPAREIL',
		'midi.status.disconnected': 'MIDI : DÉCONNECTÉ',
		'midi.status.denied': 'MIDI : BLOQUÉ',
		'midi.status.error': 'MIDI : ERREUR',
		'midi.status.deviceFallback': 'APPAREIL MIDI',
		'midi.status.deniedHelp':
			'Autorisez le MIDI dans les paramètres du site de votre navigateur, puis touchez de nouveau.',
		'midi.aria.connect': 'Connecter MIDI',
		'midi.aria.retry': 'réessayer la connexion'
	}
} satisfies LocaleDict;
