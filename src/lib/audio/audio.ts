/* TRACK-A-STUB: architect deletes at merge. Track B2 needs only the sound
 * toggle slice of the Track A audio contract (ARCHITECTURE-CONTRACTS.md
 * "Audio"): setSoundEnabled / soundEnabled, persisted to localStorage
 * "music-learn:sound", default true. Track A's real module owns the whole
 * engine (ensureAudioReady, playNote/playChord, sampler swap); this stub
 * implements the exact toggle semantics against the same storage key so the
 * Progress-page toggle keeps working unchanged after the swap.
 */

const SOUND_KEY = 'music-learn:sound';

/** Persists the sound toggle; when false all play* functions are no-ops (contract). */
export function setSoundEnabled(enabled: boolean): void {
	try {
		localStorage.setItem(SOUND_KEY, JSON.stringify(enabled));
	} catch {
		// Storage unavailable: the toggle degrades to session-only default.
	}
}

/** Reads the sound toggle. Default true (contract). */
export function soundEnabled(): boolean {
	try {
		const raw = localStorage.getItem(SOUND_KEY);
		if (raw === null) return true;
		return JSON.parse(raw) === true;
	} catch {
		return true;
	}
}
