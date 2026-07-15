import { beforeEach, describe, expect, it } from 'vitest';
import { readDockedKeyboardCollapsed, setDockedKeyboardCollapsed } from './dockCollapse';

describe('dockCollapse', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('returns false (expanded) when the flag has never been set', () => {
		expect(readDockedKeyboardCollapsed()).toBe(false);
	});

	it('returns true when the stored value is exactly "true"', () => {
		localStorage.setItem('music-learn:docked-keyboard-collapsed', 'true');
		expect(readDockedKeyboardCollapsed()).toBe(true);
	});

	it.each(['false', '', 'garbage'])('returns false when the stored value is %j', (stored) => {
		localStorage.setItem('music-learn:docked-keyboard-collapsed', stored);
		expect(readDockedKeyboardCollapsed()).toBe(false);
	});

	it('returns false (never throws) when localStorage.getItem throws', () => {
		const originalGetItem = Storage.prototype.getItem;
		Storage.prototype.getItem = () => {
			throw new Error('localStorage disabled');
		};

		try {
			expect(readDockedKeyboardCollapsed()).toBe(false);
		} finally {
			Storage.prototype.getItem = originalGetItem;
		}
	});

	it('round-trips true through real localStorage', () => {
		setDockedKeyboardCollapsed(true);
		expect(readDockedKeyboardCollapsed()).toBe(true);
	});

	it('round-trips false through real localStorage', () => {
		setDockedKeyboardCollapsed(true);
		setDockedKeyboardCollapsed(false);
		expect(readDockedKeyboardCollapsed()).toBe(false);
	});

	it('setDockedKeyboardCollapsed is a silent no-op when localStorage.setItem throws', () => {
		const originalSetItem = Storage.prototype.setItem;
		Storage.prototype.setItem = () => {
			throw new Error('quota exceeded');
		};

		try {
			expect(() => setDockedKeyboardCollapsed(true)).not.toThrow();
		} finally {
			Storage.prototype.setItem = originalSetItem;
		}
	});
});
