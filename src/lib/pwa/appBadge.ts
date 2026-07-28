/**
 * Feature-detected wrapper around the Badging API (B7).
 *
 * `navigator.setAppBadge` exists only on installed apps in some Chromium
 * builds (Android/desktop Chrome); it is absent on Safari/iOS and can reject
 * even where it exists (permission/platform quirks). Everything here is
 * wrapped so an unsupported or failing badge call can never throw into the
 * caller: a missing home-screen dot is invisible, a thrown error in the root
 * layout is not.
 */

/** The optional Badging API surface, kept local so the app compiles without lib.dom's newer typings. */
interface BadgingNavigator {
	setAppBadge?: (count?: number) => Promise<void> | void;
	clearAppBadge?: () => Promise<void> | void;
}

/** True when this browser exposes the Badging API at all. */
export function appBadgeSupported(): boolean {
	if (typeof navigator === 'undefined') return false;
	const badging = navigator as Navigator & BadgingNavigator;
	return typeof badging.setAppBadge === 'function';
}

/**
 * Mirrors `count` onto the installed app icon: a numeric badge when there is
 * something due, no badge at all when there is not (never a "0" dot, which
 * would nag about nothing). Always synchronous and silent from the caller's
 * point of view; both the sync throw and the async rejection paths are
 * swallowed.
 */
export function setAppBadgeCount(count: number): void {
	if (typeof navigator === 'undefined') return;
	const badging = navigator as Navigator & BadgingNavigator;
	try {
		const result = count > 0 ? badging.setAppBadge?.(count) : badging.clearAppBadge?.();
		void Promise.resolve(result).catch(() => {});
	} catch {
		// Unsupported or refused: the badge is a nicety, never a requirement.
	}
}
