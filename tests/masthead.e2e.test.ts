import { render, screen, fireEvent, cleanup, within } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { readable } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '../src/lib/i18n/locale.svelte';

// +layout.svelte reads the `$page` store from $app/stores to mark the active
// nav link. That store is populated by the real SvelteKit client router at
// runtime, which isn't present when rendering +layout.svelte standalone here
// - so it's mocked with a minimal readable stub exposing just the `url`
// shape the masthead's active-link check reads (`$page.url.pathname`). Kept
// in its own file (not tests/drills.e2e.test.ts) to avoid file contention
// per 09-06's plan.
vi.mock('$app/stores', () => ({
	page: readable({ url: new URL('http://localhost/') })
}));

const { default: RootLayout } = await import('../src/routes/+layout.svelte');

/**
 * jsdom does not evaluate media queries, so +layout.svelte's desktop
 * masthead nav AND the phone-only bottom-tab-bar render simultaneously
 * (Phase 23 1A) - Lookup/Drills/Recall/Songs and the LocaleToggle exist
 * twice in the DOM. Every query below that would otherwise be ambiguous is
 * scoped via `within(getByTestId('masthead'))` to resolve the desktop copy.
 */

describe('masthead responsive nav (09-06)', () => {
	it('exposes Lookup, Drills, and Progress links on every viewport', () => {
		const emptyChildren = createRawSnippet(() => ({
			render: () => '<div></div>'
		}));

		render(RootLayout, { params: {}, data: {}, children: emptyChildren });
		const masthead = within(screen.getByTestId('masthead'));

		expect(masthead.getByRole('link', { name: 'Lookup' })).toBeInTheDocument();
		expect(masthead.getByRole('link', { name: 'Drills' })).toBeInTheDocument();
		expect(masthead.getByRole('link', { name: 'Progress' })).toBeInTheDocument();
	});

	it('exposes the Songs and Theory links and drops Showcase from the nav (v2 contract)', () => {
		const emptyChildren = createRawSnippet(() => ({
			render: () => '<div></div>'
		}));

		render(RootLayout, { params: {}, data: {}, children: emptyChildren });
		const masthead = within(screen.getByTestId('masthead'));

		expect(masthead.getByRole('link', { name: 'Songs' })).toHaveAttribute('href', '/songs');
		expect(masthead.getByRole('link', { name: 'Theory' })).toHaveAttribute('href', '/theory');
		expect(masthead.queryByRole('link', { name: 'Showcase' })).not.toBeInTheDocument();
	});
});

describe('EN|FR toggle live-flips the nav (I18N-01/02)', () => {
	afterEach(() => {
		cleanup();
		setLocale('en');
	});

	it('defaults to English nav labels with the brand unchanged', () => {
		const emptyChildren = createRawSnippet(() => ({
			render: () => '<div></div>'
		}));

		render(RootLayout, { params: {}, data: {}, children: emptyChildren });
		const masthead = within(screen.getByTestId('masthead'));

		expect(masthead.getByRole('link', { name: 'Drills' })).toBeInTheDocument();
		expect(masthead.getByRole('link', { name: 'Theory' })).toBeInTheDocument();
		expect(screen.getByText('MUSIC LEARN')).toBeInTheDocument();
	});

	it('flips the nav to French live when the FR segment is clicked, keeping the brand unchanged', async () => {
		const emptyChildren = createRawSnippet(() => ({
			render: () => '<div></div>'
		}));

		render(RootLayout, { params: {}, data: {}, children: emptyChildren });
		const masthead = within(screen.getByTestId('masthead'));

		const frSegment = masthead.getByRole('button', { name: /français/i });
		await fireEvent.click(frSegment);

		expect(masthead.getByRole('link', { name: 'Exercices' })).toBeInTheDocument();
		expect(masthead.getByRole('link', { name: 'Théorie' })).toBeInTheDocument();
		expect(screen.getByText('MUSIC LEARN')).toBeInTheDocument();
	});
});

describe('bottom tab bar + More sheet (23-04, UX-1A)', () => {
	afterEach(() => {
		cleanup();
		setLocale('en');
	});

	it('renders Lookup/Drills/Recall/Songs links plus a More button', () => {
		const emptyChildren = createRawSnippet(() => ({
			render: () => '<div></div>'
		}));

		render(RootLayout, { params: {}, data: {}, children: emptyChildren });
		const bar = within(screen.getByTestId('bottom-tab-bar'));

		expect(bar.getByRole('link', { name: 'Lookup' })).toHaveAttribute('href', '/');
		expect(bar.getByRole('link', { name: 'Drills' })).toHaveAttribute('href', '/drills');
		expect(bar.getByRole('link', { name: 'Recall' })).toHaveAttribute('href', '/recall');
		expect(bar.getByRole('link', { name: 'Songs' })).toHaveAttribute('href', '/songs');
		expect(bar.getByRole('button', { name: 'More' })).toBeInTheDocument();
	});

	it('marks the active tab with the ink-fill/paper-text treatment, never vermilion', () => {
		const emptyChildren = createRawSnippet(() => ({
			render: () => '<div></div>'
		}));

		// $app/stores is mocked above to http://localhost/ - Lookup ("/") is active.
		render(RootLayout, { params: {}, data: {}, children: emptyChildren });
		const bar = within(screen.getByTestId('bottom-tab-bar'));

		expect(bar.getByRole('link', { name: 'Lookup' }).className).toContain(
			'bottom-tab-bar__item--active'
		);
		expect(bar.getByRole('link', { name: 'Drills' }).className).not.toContain(
			'bottom-tab-bar__item--active'
		);
		expect(bar.getByRole('button', { name: 'More' }).className).not.toContain(
			'bottom-tab-bar__item--active'
		);
	});

	it('opens the More sheet with Build/Scales/Theory/Progress links plus a LocaleToggle', async () => {
		const emptyChildren = createRawSnippet(() => ({
			render: () => '<div></div>'
		}));

		render(RootLayout, { params: {}, data: {}, children: emptyChildren });
		const bar = within(screen.getByTestId('bottom-tab-bar'));

		expect(screen.queryByTestId('bottom-sheet')).not.toBeInTheDocument();

		await fireEvent.click(bar.getByRole('button', { name: 'More' }));

		const sheet = within(screen.getByTestId('bottom-sheet'));
		expect(sheet.getByRole('link', { name: 'Build' })).toHaveAttribute('href', '/build');
		expect(sheet.getByRole('link', { name: 'Scales' })).toHaveAttribute('href', '/scales');
		expect(sheet.getByRole('link', { name: 'Theory' })).toHaveAttribute('href', '/theory');
		expect(sheet.getByRole('link', { name: 'Progress' })).toHaveAttribute('href', '/progress');
		expect(sheet.getByRole('button', { name: 'EN, English' })).toBeInTheDocument();
		expect(sheet.getByRole('button', { name: 'FR, Français' })).toBeInTheDocument();
	});

	it('closes the More sheet after tapping a nav link inside it', async () => {
		const emptyChildren = createRawSnippet(() => ({
			render: () => '<div></div>'
		}));

		render(RootLayout, { params: {}, data: {}, children: emptyChildren });
		const bar = within(screen.getByTestId('bottom-tab-bar'));
		await fireEvent.click(bar.getByRole('button', { name: 'More' }));

		const sheet = within(screen.getByTestId('bottom-sheet'));
		await fireEvent.click(sheet.getByRole('link', { name: 'Build' }));

		expect(screen.queryByTestId('bottom-sheet')).not.toBeInTheDocument();
	});
});
