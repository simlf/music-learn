import { browser } from '$app/environment';

/**
 * Reactive SW-update state (Plan 22-03, PWA-03). A `.svelte.ts` module (not
 * plain `.ts`) so the module-level `$state` below is genuinely reactive,
 * mirroring `locale.svelte.ts`'s pattern.
 *
 * SvelteKit already auto-registers `src/service-worker.ts` in production;
 * this module never registers a service worker itself, it only watches the
 * existing registration for a waiting worker and drives the update prompt.
 */

/**
 * The exact message contract `src/service-worker.ts`'s `message` listener
 * handles (Plan 22-01). Posting anything else would be a no-op.
 */
export const SKIP_WAITING_MESSAGE = { type: 'SKIP_WAITING' } as const;

/**
 * A waiting worker only means "update ready to prompt" when a controller
 * already exists (i.e. this is an existing install being updated, not the
 * very first install/activation) - otherwise every fresh visitor would see
 * an "update available" prompt on their first load, which is wrong (T-22-07
 * adjacent: never trap OR falsely prompt).
 */
export function computeUpdateReady({
	hasWaiting,
	hasController
}: {
	hasWaiting: boolean;
	hasController: boolean;
}): boolean {
	return hasWaiting && hasController;
}

let ready = $state(false);

/** Whether an update is ready to be applied. Reactive: read inside a template/derived. */
export function updateAvailable(): boolean {
	return ready;
}

/** Sets whether the update prompt should be shown. */
export function setUpdateAvailable(value: boolean): void {
	ready = value;
}

// Guards `controllerchange` so it triggers at most one `location.reload()`
// per page load (T-22-06: never a reload loop).
let reloaded = false;

/**
 * Starts watching the SW registration for a waiting worker. Browser-only
 * and safe to call once from the root layout's `onMount` (alongside
 * `initLocale()`); no-ops on the server or when Web MIDI's sibling API,
 * Web Service Workers, isn't supported.
 */
export function registerUpdateWatcher(): void {
	if (!browser || !('serviceWorker' in navigator)) return;

	navigator.serviceWorker.ready.then((registration) => {
		if (registration.waiting && navigator.serviceWorker.controller) {
			setUpdateAvailable(true);
		}

		registration.addEventListener('updatefound', () => {
			const installing = registration.installing;
			if (!installing) return;
			installing.addEventListener('statechange', () => {
				if (installing.state === 'installed' && navigator.serviceWorker.controller) {
					setUpdateAvailable(true);
				}
			});
		});
	});

	navigator.serviceWorker.addEventListener('controllerchange', () => {
		if (reloaded) return;
		reloaded = true;
		location.reload();
	});
}

/**
 * Tells the waiting worker to activate. Only ever called on explicit user
 * confirmation (Reload click in UpdatePrompt.svelte) - never automatically,
 * and never reloads directly itself; the reload happens via the
 * `controllerchange` listener registered in `registerUpdateWatcher`.
 */
export function applyUpdate(): void {
	if (!browser || !('serviceWorker' in navigator)) return;

	navigator.serviceWorker.getRegistration().then((registration) => {
		registration?.waiting?.postMessage(SKIP_WAITING_MESSAGE);
	});
}
