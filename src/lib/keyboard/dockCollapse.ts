/**
 * Docked-keyboard collapse-state persistence (KBD-02). Tracks whether the
 * user has collapsed the shared keyboard dock on this device.
 *
 * Scope is intentionally device-local: this reads/writes the browser's
 * localStorage only, mirroring $lib/drills/rotateHint.ts's shape. Defaults
 * to expanded (collapsed=false) - an absent, malformed, or unreadable
 * stored value never throws and always falls back to expanded.
 */

const STORAGE_KEY = 'music-learn:docked-keyboard-collapsed';

/**
 * Whether the docked keyboard is currently collapsed on this device.
 * Returns false (expanded, the default) when the flag is absent, not the
 * literal string 'true', or when localStorage access throws (private
 * browsing quota, disabled storage) - a hand-edited or inaccessible store
 * never throws; it just falls back to expanded.
 */
export function readDockedKeyboardCollapsed(): boolean {
	try {
		return localStorage.getItem(STORAGE_KEY) === 'true';
	} catch {
		return false;
	}
}

/**
 * Persists the dock's collapsed state so it survives reload on this
 * device. Storage failures (disabled/quota-exceeded localStorage) degrade
 * to a silent no-op rather than throwing (availability over durability,
 * matching rotateHint.ts's dismissRotateHint and audio.ts's
 * setSoundEnabled).
 */
export function setDockedKeyboardCollapsed(value: boolean): void {
	try {
		localStorage.setItem(STORAGE_KEY, String(value));
	} catch {
		// Quota exceeded or storage disabled: no-op. The collapsed state may
		// not persist across reload, which is an acceptable degrade.
	}
}
