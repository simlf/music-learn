import { afterEach, describe, expect, it, vi } from 'vitest';
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

/**
 * Both anti-repeat steps used to be an unbounded `while` that re-rolled
 * Math.random() until it differed from the last pick. That is a rejection loop
 * whose termination depends on a randomness source this module does not own: a
 * constant Math.random - the normal shape of a deterministic test - spins it
 * forever. The twin loop in copy/streak.ts proved this is not theoretical, and
 * proved the failure mode is deceptive too: because a spun vi spy also records
 * every call, the hang arrived as a heap exhaustion that killed three unrelated
 * test files' workers rather than as an honest timeout here. Both are one
 * deterministic modular hop now.
 *
 * These tests assert TERMINATION first (they simply cannot finish otherwise) and
 * the preserved no-immediate-repeat guarantee second.
 */
describe('rotation pickers terminate under a pinned Math.random', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('pickHint terminates with a CONSTANT Math.random, and still never repeats', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.1);
		const first = pickHint();
		const second = pickHint();
		const third = pickHint();
		expect(errorHints).toContain(second);
		expect(second).not.toBe(first);
		expect(third).not.toBe(second);
	});

	it('pickSuggestionHint terminates with a CONSTANT Math.random, and still never repeats', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.1);
		const first = pickSuggestionHint();
		const second = pickSuggestionHint();
		const third = pickSuggestionHint();
		expect(suggestionHints).toContain(second);
		expect(second).not.toBe(first);
		expect(third).not.toBe(second);
	});

	/**
	 * The degenerate draw the modular hop has to survive: a pinned value that
	 * maps to the LAST index of the pool, where `index + 1` has to wrap rather
	 * than run off the end and hand back undefined. Asserted over a run of picks
	 * rather than on the first two, so it does not depend on the module-level
	 * lastIndex this file's earlier tests leave behind.
	 */
	it('wraps to index 0 when the pinned draw lands on the last pool index', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.999);
		const last = errorHints[errorHints.length - 1];
		const picks = Array.from({ length: 4 }, () => pickHint());
		expect(new Set(picks)).toEqual(new Set([last, errorHints[0]]));
		for (let i = 1; i < picks.length; i++) {
			expect(picks[i]).not.toBe(picks[i - 1]);
		}
	});
});
