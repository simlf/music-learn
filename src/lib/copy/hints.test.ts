import { describe, expect, it } from 'vitest';
import { suggestionHints, pickSuggestionHint } from './hints';

describe('suggestionHints', () => {
	it('has exactly 3 variants', () => {
		expect(suggestionHints).toHaveLength(3);
	});

	it('contains no em dash character in any entry', () => {
		for (const entry of suggestionHints) {
			expect(entry).not.toContain('—');
		}
	});

	it('every entry contains the {SYMBOL} placeholder token', () => {
		for (const entry of suggestionHints) {
			expect(entry).toContain('{SYMBOL}');
		}
	});
});

describe('pickSuggestionHint', () => {
	it('returns a member of suggestionHints', () => {
		const picked = pickSuggestionHint();
		expect(suggestionHints).toContain(picked);
	});

	it('does not immediately repeat across a short run', () => {
		const picks = Array.from({ length: 10 }, () => pickSuggestionHint());
		for (let i = 1; i < picks.length; i++) {
			expect(picks[i]).not.toBe(picks[i - 1]);
		}
	});
});
