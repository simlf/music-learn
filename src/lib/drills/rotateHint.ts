/**
 * Rotate-hint localStorage persistence. Tracks whether the user has ever
 * dismissed (or implicitly acknowledged, by rotating to landscape) the
 * drills page's one-time hint suggesting landscape orientation for the
 * full two-octave keyboard (D-05).
 *
 * Scope is intentionally device-local: this reads/writes the browser's
 * localStorage only, mirroring $lib/lookup/recentLookups.ts's shape.
 * Cross-device sync of the dismissed flag is out of scope for v1.
 */

const STORAGE_KEY = 'music-learn:rotate-hint-dismissed';

/**
 * Whether the rotate hint has ever been dismissed on this device. Returns
 * false when the flag is absent, missing, or when localStorage access
 * throws (private-browsing quota, disabled storage) - a hand-edited or
 * inaccessible store never throws; it just re-shows the hint once more.
 */
export function isRotateHintDismissed(): boolean {
	try {
		return localStorage.getItem(STORAGE_KEY) === 'true';
	} catch {
		return false;
	}
}

/**
 * Persists the dismissed flag so the hint never shows again on this
 * device. Storage failures (disabled/quota-exceeded localStorage) degrade
 * to a silent no-op rather than throwing (availability over durability,
 * matching recentLookups.ts's addRecentLookup).
 */
export function dismissRotateHint(): void {
	try {
		localStorage.setItem(STORAGE_KEY, 'true');
	} catch {
		// Quota exceeded or storage disabled: no-op. The hint may reappear
		// on a later session, which is an acceptable degrade for a purely
		// cosmetic one-time hint.
	}
}
