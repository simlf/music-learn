import { render, screen, fireEvent, within, cleanup } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { readable } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '$lib/i18n/locale.svelte';

/**
 * Route/nav test for Phase 25 Plan 05 (SK-017): proves the /progressions
 * route renders the drill and that +layout lists /progressions in BOTH the
 * desktop masthead and the phone More sheet. Mirrors theoryInteractiveLesson
 * test's dynamic-import-after-mocks convention plus i18n coverage.test.ts's
 * RootLayout render setup (page store + api mocks for the layout's onMount).
 */

vi.mock('$app/stores', () => ({
	page: readable({ url: new URL('http://localhost/progressions') })
}));

vi.mock('$lib/api/client', () => ({
	getApiToken: () => '',
	setApiToken: vi.fn()
}));

vi.mock('$lib/api/progress', () => ({
	fetchStreak: vi.fn(() => Promise.resolve({ streak: 0, practicedToday: false })),
	localDateString: () => '2026-07-21'
}));

const { default: ProgressionsPage } = await import('./progressions/+page.svelte');
const { default: RootLayout } = await import('./+layout.svelte');

afterEach(() => {
	cleanup();
	setLocale('en');
	vi.restoreAllMocks();
});

describe('/progressions route', () => {
	it('renders the progression drill', () => {
		render(ProgressionsPage);

		expect(screen.getByTestId('progression-drill')).toBeInTheDocument();
	});
});

describe('+layout: /progressions reachability', () => {
	it('lists /progressions in the desktop masthead and the phone More sheet', async () => {
		const emptyChildren = createRawSnippet(() => ({ render: () => '<div></div>' }));
		render(RootLayout, { params: {}, data: {}, children: emptyChildren });

		const masthead = within(screen.getByTestId('masthead'));
		expect(masthead.getByRole('link', { name: 'Progressions' })).toHaveAttribute(
			'href',
			'/progressions'
		);

		await fireEvent.click(screen.getByRole('button', { name: 'More' }));
		const moreSheet = within(screen.getByTestId('more-sheet'));
		expect(moreSheet.getByRole('link', { name: 'Progressions' })).toHaveAttribute(
			'href',
			'/progressions'
		);
	});
});
