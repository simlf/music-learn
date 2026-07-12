import { describe, expect, it } from 'vitest';
import { didYouMean } from './didYouMean';

describe('didYouMean', () => {
	it('normalizes a lowercase root to the canonical supported symbol', () => {
		expect(didYouMean('cm7')).toBe('Cm7');
	});

	it('corrects a single-character quality typo (Cmn7 -> Cm7)', () => {
		expect(didYouMean('Cmn7')).toBe('Cm7');
	});

	it('corrects a missing trailing digit on m7b5 (Cm7b -> Cm7b5)', () => {
		expect(didYouMean('Cm7b')).toBe('Cm7b5');
	});

	it('returns null when no confident candidate exists', () => {
		expect(didYouMean('Zxq9')).toBeNull();
	});

	it('returns null for empty input', () => {
		expect(didYouMean('')).toBeNull();
	});

	it('returns null when whitespace-only input is given', () => {
		expect(didYouMean('   ')).toBeNull();
	});

	it('returns null when the root is not one of the 12 supported roots', () => {
		expect(didYouMean('Hm7')).toBeNull();
	});

	it('never throws on garbage input', () => {
		expect(() => didYouMean('!!!###')).not.toThrow();
		expect(() => didYouMean('123456789012345')).not.toThrow();
	});
});
