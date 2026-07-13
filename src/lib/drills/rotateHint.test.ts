import { beforeEach, describe, expect, it } from 'vitest';
import { dismissRotateHint, isRotateHintDismissed } from './rotateHint';

describe('rotateHint', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('returns false when the flag has never been set', () => {
		expect(isRotateHintDismissed()).toBe(false);
	});

	it('returns true after dismissRotateHint has been called', () => {
		dismissRotateHint();
		expect(isRotateHintDismissed()).toBe(true);
	});

	it('returns false (never throws) when localStorage access throws', () => {
		const originalGetItem = Storage.prototype.getItem;
		Storage.prototype.getItem = () => {
			throw new Error('localStorage disabled');
		};

		try {
			expect(isRotateHintDismissed()).toBe(false);
		} finally {
			Storage.prototype.getItem = originalGetItem;
		}
	});

	it('dismissRotateHint is a silent no-op when localStorage is unavailable', () => {
		const originalSetItem = Storage.prototype.setItem;
		Storage.prototype.setItem = () => {
			throw new Error('quota exceeded');
		};

		try {
			expect(() => dismissRotateHint()).not.toThrow();
		} finally {
			Storage.prototype.setItem = originalSetItem;
		}
	});
});
