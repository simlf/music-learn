import { render, screen, fireEvent, within, cleanup } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { readable } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '$lib/i18n/locale.svelte';

/**
 * Route/nav test for Phase 25 Plan 07 (SK-019): proves the /voicings route
 * renders the drill and that +layout lists /voicings in BOTH the desktop
 * masthead and the phone More sheet, alongside the /progressions entry
 * added by 25-05. Mirrors progressionsPage.test.ts's dynamic-import-after-
 * mocks convention plus its RootLayout render setup.
 */

vi.mock('$app/stores', () => ({
	page: readable({ url: new URL('http://localhost/voicings') })
}));

vi.mock('$lib/api/client', () => ({
	getApiToken: () => '',
	setApiToken: vi.fn()
}));

vi.mock('$lib/api/progress', () => ({
	fetchStreak: vi.fn(() => Promise.resolve({ streak: 0, practicedToday: false })),
	localDateString: () => '2026-07-21'
}));

const getAllCardsMock = vi.fn();
vi.mock('$lib/srs/deck', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/srs/deck')>();
	return {
		...actual,
		getAllCards: (...args: unknown[]) => getAllCardsMock(...args)
	};
});

const { default: VoicingsPage } = await import('./voicings/+page.svelte');
const { default: RootLayout } = await import('./+layout.svelte');

afterEach(() => {
	cleanup();
	setLocale('en');
	vi.restoreAllMocks();
});

describe('/voicings route', () => {
	it('renders the shell voicing drill', () => {
		getAllCardsMock.mockResolvedValue([]);

		render(VoicingsPage);

		expect(screen.getByTestId('shell-voicing-drill')).toBeInTheDocument();
	});
});

describe('+layout: /voicings reachability', () => {
	it('lists /voicings in the desktop masthead and the phone More sheet, alongside /progressions', async () => {
		const emptyChildren = createRawSnippet(() => ({ render: () => '<div></div>' }));
		render(RootLayout, { params: {}, data: {}, children: emptyChildren });

		const masthead = within(screen.getByTestId('masthead'));
		expect(masthead.getByRole('link', { name: 'Voicings' })).toHaveAttribute('href', '/voicings');
		expect(masthead.getByRole('link', { name: 'Progressions' })).toHaveAttribute(
			'href',
			'/progressions'
		);

		await fireEvent.click(screen.getByRole('button', { name: 'More' }));
		const moreSheet = within(screen.getByTestId('more-sheet'));
		expect(moreSheet.getByRole('link', { name: 'Voicings' })).toHaveAttribute('href', '/voicings');
		expect(moreSheet.getByRole('link', { name: 'Progressions' })).toHaveAttribute(
			'href',
			'/progressions'
		);
	});
});
