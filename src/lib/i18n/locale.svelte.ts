import { browser } from '$app/environment';
import { messages } from './messages/index';

/**
 * The app's reactive i18n layer (I18N-01/02 foundation).
 *
 * This is a `.svelte.ts` module (not plain `.ts`) so the module-level
 * `$state` below is genuinely reactive - reading `t()` inside any component
 * template establishes a dependency on `current`, which is exactly what
 * makes the whole UI flip live when the toggle is clicked, with no manual
 * subscription. Mirrors `audio.ts`'s localStorage-backed module pattern and
 * the `music-learn:*` storage-key convention.
 */
export type Locale = 'en' | 'fr';

/**
 * The full key union of the merged catalog (WR-03): derived from
 * `messages.en`'s literal-keyed shape (every domain dict is declared with
 * `satisfies LocaleDict` rather than `: LocaleDict`, which is what keeps its
 * keys as literal string types instead of widening to `Record<string,
 * string>`). A typo'd `t('nav.drils')` call site is now a compile-time
 * `npm run check` error instead of a silent raw-key leak at runtime.
 *
 * A handful of call sites build a key from runtime data via a template
 * literal (e.g. `t(\`progress.tier.${id}.name\`)`); those keep compiling via
 * a documented `as MessageKey` cast at each such site, rather than widening
 * this type back to `string`.
 */
export type MessageKey = keyof typeof messages.en;

const STORAGE_KEY = 'music-learn:locale';

/** Default is 'en' so the adapter-static prerender is deterministic. */
let current = $state<Locale>('en');

function isLocale(value: unknown): value is Locale {
	return value === 'en' || value === 'fr';
}

/** The currently active locale. Reading this inside a template/derived is reactive. */
export function currentLocale(): Locale {
	return current;
}

/**
 * Sets the active locale and persists the choice to localStorage under the
 * `music-learn:locale` key, browser-guarded and wrapped in try/catch
 * (private-mode/quota failures degrade to an in-memory-only toggle, T-20-03).
 */
export function setLocale(value: Locale): void {
	current = value;
	if (!browser) return;
	document.documentElement.lang = value;
	try {
		localStorage.setItem(STORAGE_KEY, value);
	} catch {
		// Storage disabled or full: keep the in-memory toggle working.
	}
}

/**
 * Browser-only hydration: reads any persisted locale and applies it. Safe to
 * call more than once (re-reading and re-applying the same stored value is a
 * no-op). Any stored value other than the exact literals 'en'/'fr' is
 * ignored, falling back to the deterministic 'en' default (T-20-01). No-op
 * on the server, so SSR/prerender output always renders English.
 */
export function initLocale(): void {
	if (!browser) return;
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (isLocale(stored)) {
			current = stored;
			document.documentElement.lang = stored;
		}
	} catch {
		// Storage disabled or unreadable: stay on the in-memory 'en' default.
	}
}

/**
 * Reactive translation lookup: current-locale value, falling back to the
 * English value, then the raw key itself (so a missing translation degrades
 * to a visible key rather than blank text). Static author-authored strings
 * only - always rendered via Svelte's auto-escaped `{t(...)}` interpolation,
 * never `{@html}` (T-20-02).
 */
export function t(key: MessageKey): string {
	const lang = current;
	return messages[lang][key] ?? messages.en[key] ?? key;
}
