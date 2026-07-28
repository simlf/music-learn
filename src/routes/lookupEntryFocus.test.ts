import { render, screen, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shouldAutofocusLookup } from '$lib/lookup/entryFocus';

/**
 * B6 (land in practice, not in a text box): Lookup's input must not grab focus
 * on a COLD entry, because on a phone that pops the soft keyboard over the page
 * before the user has asked to type. It must still focus when the user
 * deliberately navigates to Lookup mid-session from the tab bar.
 *
 * The gate is SvelteKit's navigation type, so this file mocks $app/navigation
 * with a drivable afterNavigate: the registered callback is captured and then
 * invoked with the navigation shape SvelteKit would pass.
 */

type AfterNavigateCallback = (navigation: { type: string }) => void;

let registered: AfterNavigateCallback[] = [];

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	afterNavigate: (callback: AfterNavigateCallback) => {
		registered.push(callback);
	}
}));

vi.mock('$lib/audio/audio', () => ({
	playChord: vi.fn(),
	playNote: vi.fn(),
	ensureAudioReady: async () => {}
}));

const { default: Page } = await import('./+page.svelte');

beforeEach(() => {
	localStorage.clear();
	registered = [];
});

afterEach(() => {
	cleanup();
});

describe('shouldAutofocusLookup', () => {
	it('refuses focus for a cold entry (navigation type "enter")', () => {
		expect(shouldAutofocusLookup('enter')).toBe(false);
	});

	it('allows focus for every in-app navigation type', () => {
		expect(shouldAutofocusLookup('link')).toBe(true);
		expect(shouldAutofocusLookup('goto')).toBe(true);
		expect(shouldAutofocusLookup('popstate')).toBe(true);
		expect(shouldAutofocusLookup('form')).toBe(true);
	});
});

describe('Lookup input focus follows entry intent (B6)', () => {
	it('registers exactly one afterNavigate callback on mount', () => {
		render(Page);
		expect(registered).toHaveLength(1);
	});

	it('leaves the input unfocused when the page was a cold entry', () => {
		render(Page);
		const input = screen.getByRole('textbox');

		registered[0]({ type: 'enter' });

		expect(document.activeElement).not.toBe(input);
	});

	it('focuses the input when the user navigated to Lookup mid-session', () => {
		render(Page);
		const input = screen.getByRole('textbox');

		registered[0]({ type: 'link' });

		expect(document.activeElement).toBe(input);
	});
});
