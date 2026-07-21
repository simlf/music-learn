import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hasVoicingMet, markVoicingMet } from './voicingMet';

const STORAGE_KEY = 'music-learn:voicing-met';

describe('voicingMet localStorage persistence (SK-019)', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('markVoicingMet then hasVoicingMet reports true for the marked symbol', () => {
		markVoicingMet('Cm7');

		expect(hasVoicingMet('Cm7')).toBe(true);
	});

	it('hasVoicingMet is false for an unmet symbol', () => {
		markVoicingMet('Cm7');

		expect(hasVoicingMet('Dm7')).toBe(false);
	});

	it('hasVoicingMet is false when the store is empty', () => {
		expect(hasVoicingMet('Cm7')).toBe(false);
	});

	it('degrades to false on non-JSON garbage without throwing', () => {
		localStorage.setItem(STORAGE_KEY, 'not json {{{');

		expect(() => hasVoicingMet('Cm7')).not.toThrow();
		expect(hasVoicingMet('Cm7')).toBe(false);
	});

	it('degrades to false when the stored JSON is not an array', () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: 'an array' }));

		expect(hasVoicingMet('Cm7')).toBe(false);
	});

	it('marking multiple symbols keeps each independently queryable', () => {
		markVoicingMet('Cm7');
		markVoicingMet('F7');

		expect(hasVoicingMet('Cm7')).toBe(true);
		expect(hasVoicingMet('F7')).toBe(true);
		expect(hasVoicingMet('Bbmaj7')).toBe(false);
	});

	it('markVoicingMet is a silent no-op when localStorage.setItem throws (quota/disabled)', () => {
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('quota exceeded');
		});

		expect(() => markVoicingMet('Cm7')).not.toThrow();
	});
});
