/**
 * Whether the Lookup input should grab focus (B6).
 *
 * WHY: the installed PWA's cold launch used to land on Lookup, whose input
 * autofocused on mount, so opening the app on a phone popped the soft keyboard
 * over the page before the user had asked for anything. The launch target
 * moved to /practice (manifest `start_url`), but Lookup is still reachable as
 * a cold entry (a shortcut, a bookmark, a shared link), and the keyboard must
 * not spring open there either.
 *
 * The signal is SvelteKit's navigation type: `'enter'` is the initial load of
 * the document, anything else ('link', 'goto', 'popstate', 'form') is a
 * deliberate in-app move to Lookup mid-session, where typing immediately IS
 * what the piano-side user wants. So focus follows intent rather than being
 * removed outright.
 */

/** SvelteKit's `AfterNavigate.type` values, kept local so this stays a pure module. */
export type EntryNavigationType = 'enter' | 'form' | 'link' | 'goto' | 'popstate';

export function shouldAutofocusLookup(type: EntryNavigationType | string): boolean {
	return type !== 'enter';
}
