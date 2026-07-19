import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
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

describe('masthead responsive nav (09-06)', () => {
	it('exposes Lookup, Drills, and Progress links on every viewport', () => {
		const emptyChildren = createRawSnippet(() => ({
			render: () => '<div></div>'
		}));

		render(RootLayout, { params: {}, data: {}, children: emptyChildren });

		expect(screen.getByRole('link', { name: 'Lookup' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Drills' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Progress' })).toBeInTheDocument();
	});

	it('exposes the Songs and Theory links and drops Showcase from the nav (v2 contract)', () => {
		const emptyChildren = createRawSnippet(() => ({
			render: () => '<div></div>'
		}));

		render(RootLayout, { params: {}, data: {}, children: emptyChildren });

		expect(screen.getByRole('link', { name: 'Songs' })).toHaveAttribute('href', '/songs');
		expect(screen.getByRole('link', { name: 'Theory' })).toHaveAttribute('href', '/theory');
		expect(screen.queryByRole('link', { name: 'Showcase' })).not.toBeInTheDocument();
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

		expect(screen.getByRole('link', { name: 'Drills' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Theory' })).toBeInTheDocument();
		expect(screen.getByText('MUSIC LEARN')).toBeInTheDocument();
	});

	it('flips the nav to French live when the FR segment is clicked, keeping the brand unchanged', async () => {
		const emptyChildren = createRawSnippet(() => ({
			render: () => '<div></div>'
		}));

		render(RootLayout, { params: {}, data: {}, children: emptyChildren });

		const frSegment = screen.getByRole('button', { name: /français/i });
		await fireEvent.click(frSegment);

		expect(screen.getByRole('link', { name: 'Exercices' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Théorie' })).toBeInTheDocument();
		expect(screen.getByText('MUSIC LEARN')).toBeInTheDocument();
	});
});
