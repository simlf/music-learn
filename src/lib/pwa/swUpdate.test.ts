import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';
import {
	SKIP_WAITING_MESSAGE,
	computeUpdateReady,
	setUpdateAvailable,
	updateAvailable
} from './swUpdate.svelte';

/**
 * Pure update-state logic + message contract (Plan 22-03, PWA-03). The
 * browser-only wiring (registerUpdateWatcher/applyUpdate) talks to
 * navigator.serviceWorker and is exercised by human/manual verification
 * (see 22-03-PLAN.md verification section), not jsdom.
 */
describe('computeUpdateReady', () => {
	it('is true only when a waiting worker AND an active controller both exist', () => {
		expect(computeUpdateReady({ hasWaiting: true, hasController: true })).toBe(true);
	});

	it('is false when hasWaiting is true but hasController is false (first-ever install)', () => {
		expect(computeUpdateReady({ hasWaiting: true, hasController: false })).toBe(false);
	});

	it('is false when hasWaiting is false, regardless of hasController', () => {
		expect(computeUpdateReady({ hasWaiting: false, hasController: true })).toBe(false);
		expect(computeUpdateReady({ hasWaiting: false, hasController: false })).toBe(false);
	});
});

describe('SKIP_WAITING_MESSAGE', () => {
	it('is the exact message contract src/service-worker.ts handles', () => {
		expect(SKIP_WAITING_MESSAGE).toEqual({ type: 'SKIP_WAITING' });
	});
});

describe('updateAvailable / setUpdateAvailable', () => {
	it('round-trips true then false through the reactive module state', () => {
		flushSync(() => setUpdateAvailable(true));
		expect(updateAvailable()).toBe(true);

		flushSync(() => setUpdateAvailable(false));
		expect(updateAvailable()).toBe(false);
	});
});
