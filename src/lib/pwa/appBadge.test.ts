import { afterEach, describe, expect, it, vi } from 'vitest';
import { appBadgeSupported, setAppBadgeCount } from './appBadge';

/**
 * B7: the Badging API exists only on some installed Chromium apps. Everything
 * here is about NOT throwing: jsdom's navigator has neither method, which is
 * the unsupported baseline the first test asserts.
 */

afterEach(() => {
	vi.unstubAllGlobals();
	Reflect.deleteProperty(navigator, 'setAppBadge');
	Reflect.deleteProperty(navigator, 'clearAppBadge');
});

function stubBadging(
	setAppBadge: (count?: number) => Promise<void> | void,
	clearAppBadge: () => Promise<void> | void
) {
	Object.defineProperty(navigator, 'setAppBadge', { value: setAppBadge, configurable: true });
	Object.defineProperty(navigator, 'clearAppBadge', { value: clearAppBadge, configurable: true });
}

describe('appBadgeSupported', () => {
	it('is false in a browser without the Badging API (jsdom, Safari, iOS)', () => {
		expect(appBadgeSupported()).toBe(false);
	});

	it('is true once navigator.setAppBadge exists', () => {
		stubBadging(
			() => Promise.resolve(),
			() => Promise.resolve()
		);
		expect(appBadgeSupported()).toBe(true);
	});
});

describe('setAppBadgeCount', () => {
	it('never throws when the API is absent', () => {
		expect(() => setAppBadgeCount(4)).not.toThrow();
		expect(() => setAppBadgeCount(0)).not.toThrow();
	});

	it('sets a numeric badge for a positive count', () => {
		const set = vi.fn(() => Promise.resolve());
		const clear = vi.fn(() => Promise.resolve());
		stubBadging(set, clear);

		setAppBadgeCount(7);

		expect(set).toHaveBeenCalledWith(7);
		expect(clear).not.toHaveBeenCalled();
	});

	it('clears the badge at zero rather than showing a "0" dot', () => {
		const set = vi.fn(() => Promise.resolve());
		const clear = vi.fn(() => Promise.resolve());
		stubBadging(set, clear);

		setAppBadgeCount(0);

		expect(clear).toHaveBeenCalledTimes(1);
		expect(set).not.toHaveBeenCalled();
	});

	it('swallows a synchronous throw from the platform', () => {
		stubBadging(
			() => {
				throw new Error('not allowed');
			},
			() => Promise.resolve()
		);

		expect(() => setAppBadgeCount(3)).not.toThrow();
	});

	it('swallows a rejected badge promise (no unhandled rejection)', async () => {
		stubBadging(
			() => Promise.reject(new Error('permission denied')),
			() => Promise.resolve()
		);

		expect(() => setAppBadgeCount(3)).not.toThrow();
		await Promise.resolve();
	});

	it('tolerates a void-returning implementation', () => {
		const set = vi.fn(() => undefined);
		stubBadging(set, () => undefined);

		expect(() => setAppBadgeCount(2)).not.toThrow();
		expect(set).toHaveBeenCalledWith(2);
	});
});
