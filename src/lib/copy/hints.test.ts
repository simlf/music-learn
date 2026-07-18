import { afterEach, describe, expect, it } from 'vitest';
import {
	errorHints,
	errorHintsFr,
	suggestionHints,
	suggestionHintsFr,
	pickHint,
	pickSuggestionHint
} from './hints';
import { setLocale } from '$lib/i18n/locale.svelte';

afterEach(() => {
	setLocale('en');
});

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

describe('errorHintsFr (I18N-02)', () => {
	it('matches errorHints in length', () => {
		expect(errorHintsFr).toHaveLength(errorHints.length);
	});

	it('contains no em dash character in any entry', () => {
		for (const entry of errorHintsFr) {
			expect(entry).not.toContain('—');
		}
	});

	it('preserves the embedded chord-symbol examples verbatim', () => {
		expect(errorHintsFr.some((entry) => entry.includes('Cm7'))).toBe(true);
		expect(errorHintsFr.some((entry) => entry.includes('F♯ø7'))).toBe(true);
	});
});

describe('suggestionHintsFr (I18N-02)', () => {
	it('matches suggestionHints in length', () => {
		expect(suggestionHintsFr).toHaveLength(suggestionHints.length);
	});

	it('contains no em dash character in any entry', () => {
		for (const entry of suggestionHintsFr) {
			expect(entry).not.toContain('—');
		}
	});

	it('every entry contains the {SYMBOL} placeholder token', () => {
		for (const entry of suggestionHintsFr) {
			expect(entry).toContain('{SYMBOL}');
		}
	});
});

describe('pickHint locale awareness (I18N-02)', () => {
	it('returns an English pool member under the en locale', () => {
		setLocale('en');
		expect(errorHints).toContain(pickHint());
	});

	it('returns a French pool member under the fr locale', () => {
		setLocale('fr');
		expect(errorHintsFr).toContain(pickHint());
	});
});

describe('pickSuggestionHint locale awareness (I18N-02)', () => {
	it('returns an English pool member under the en locale', () => {
		setLocale('en');
		expect(suggestionHints).toContain(pickSuggestionHint());
	});

	it('returns a French pool member under the fr locale', () => {
		setLocale('fr');
		expect(suggestionHintsFr).toContain(pickSuggestionHint());
	});
});
