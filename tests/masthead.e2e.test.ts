import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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
 * (Phase 23 1A) - Lookup/Practice/Learn/Progress and the LocaleToggle exist
 * twice in the DOM. Every query below that would otherwise be ambiguous is
 * scoped via `within(getByTestId('masthead'))` to resolve the desktop copy.
 *
 * Phase 30 (HUB-01): nav cutover from 10 flat links to 4 hubs; the phone
 * "More" bottom sheet is removed entirely.
 */

describe('masthead responsive nav (30-01, HUB-01)', () => {
	it('exposes Lookup, Practice, Learn, and Progress links', () => {
		const emptyChildren = createRawSnippet(() => ({
			render: () => '<div></div>'
		}));

		render(RootLayout, { params: {}, data: {}, children: emptyChildren });
		const masthead = within(screen.getByTestId('masthead'));

		expect(masthead.getByRole('link', { name: 'Lookup' })).toBeInTheDocument();
		expect(masthead.getByRole('link', { name: 'Practice' })).toBeInTheDocument();
		expect(masthead.getByRole('link', { name: 'Learn' })).toBeInTheDocument();
		expect(masthead.getByRole('link', { name: 'Progress' })).toBeInTheDocument();
	});

	it('resolves the 4 hub hrefs on the desktop masthead in order', () => {
		const emptyChildren = createRawSnippet(() => ({
			render: () => '<div></div>'
		}));

		render(RootLayout, { params: {}, data: {}, children: emptyChildren });
		const masthead = within(screen.getByTestId('masthead'));

		expect(masthead.getByRole('link', { name: 'Lookup' })).toHaveAttribute('href', '/');
		expect(masthead.getByRole('link', { name: 'Practice' })).toHaveAttribute('href', '/practice');
		expect(masthead.getByRole('link', { name: 'Learn' })).toHaveAttribute('href', '/learn');
		expect(masthead.getByRole('link', { name: 'Progress' })).toHaveAttribute('href', '/progress');
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

		expect(masthead.getByRole('link', { name: 'Practice' })).toBeInTheDocument();
		expect(masthead.getByRole('link', { name: 'Learn' })).toBeInTheDocument();
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

		expect(masthead.getByRole('link', { name: 'Pratiquer' })).toBeInTheDocument();
		expect(masthead.getByRole('link', { name: 'Apprendre' })).toBeInTheDocument();
		expect(screen.getByText('MUSIC LEARN')).toBeInTheDocument();
	});
});

describe('bottom tab bar (30-01, HUB-01: 4 hubs, no More button)', () => {
	afterEach(() => {
		cleanup();
		setLocale('en');
	});

	it('renders Lookup/Practice/Learn/Progress links and no More button', () => {
		const emptyChildren = createRawSnippet(() => ({
			render: () => '<div></div>'
		}));

		render(RootLayout, { params: {}, data: {}, children: emptyChildren });
		const bar = within(screen.getByTestId('bottom-tab-bar'));

		expect(bar.getByRole('link', { name: 'Lookup' })).toHaveAttribute('href', '/');
		expect(bar.getByRole('link', { name: 'Practice' })).toHaveAttribute('href', '/practice');
		expect(bar.getByRole('link', { name: 'Learn' })).toHaveAttribute('href', '/learn');
		expect(bar.getByRole('link', { name: 'Progress' })).toHaveAttribute('href', '/progress');
		expect(bar.queryByRole('button', { name: 'More' })).not.toBeInTheDocument();
	});

	it('resolves each of the 4 tabs by accessible name even though the visible micro-label may be clipped (24-02, sketch 015-B)', () => {
		// This is the load-bearing accessibility regression test: each tab's
		// accessible name comes from an explicit aria-label (Task 1), not from
		// the 9px .bottom-tab-bar__label text node, which may ellipsis-truncate
		// in French. Resolving these queries at all proves the aria-label
		// wiring survives label truncation.
		const emptyChildren = createRawSnippet(() => ({
			render: () => '<div></div>'
		}));

		render(RootLayout, { params: {}, data: {}, children: emptyChildren });
		const bar = within(screen.getByTestId('bottom-tab-bar'));

		expect(bar.getByRole('link', { name: 'Lookup' })).toHaveAttribute('aria-label', 'Lookup');
		expect(bar.getByRole('link', { name: 'Practice' })).toHaveAttribute('aria-label', 'Practice');
		expect(bar.getByRole('link', { name: 'Learn' })).toHaveAttribute('aria-label', 'Learn');
		expect(bar.getByRole('link', { name: 'Progress' })).toHaveAttribute('aria-label', 'Progress');
	});

	it('resolves the FR accessible names live after the locale flip (24-02, I18N-01/02)', async () => {
		const emptyChildren = createRawSnippet(() => ({
			render: () => '<div></div>'
		}));

		render(RootLayout, { params: {}, data: {}, children: emptyChildren });
		const masthead = within(screen.getByTestId('masthead'));
		const frSegment = masthead.getByRole('button', { name: /français/i });
		await fireEvent.click(frSegment);

		const bar = within(screen.getByTestId('bottom-tab-bar'));
		expect(bar.getByRole('link', { name: 'Rechercher' })).toHaveAttribute('href', '/');
		expect(bar.getByRole('link', { name: 'Pratiquer' })).toHaveAttribute('href', '/practice');
		expect(bar.getByRole('link', { name: 'Apprendre' })).toHaveAttribute('href', '/learn');
		expect(bar.getByRole('link', { name: 'Progrès' })).toHaveAttribute('href', '/progress');
		expect(bar.queryByRole('button', { name: 'Plus' })).not.toBeInTheDocument();
	});

	it('renders each tab item as an icon plus a 9px micro-label (24-02, sketch 015-B)', () => {
		const emptyChildren = createRawSnippet(() => ({
			render: () => '<div></div>'
		}));

		render(RootLayout, { params: {}, data: {}, children: emptyChildren });
		const bar = within(screen.getByTestId('bottom-tab-bar'));

		const lookupTab = bar.getByRole('link', { name: 'Lookup' });
		const icon = lookupTab.querySelector('.bottom-tab-bar__icon svg');
		const label = lookupTab.querySelector('.bottom-tab-bar__label');

		expect(icon).toBeTruthy();
		expect(icon).toHaveAttribute('aria-hidden', 'true');
		expect(label).toBeTruthy();
		expect(label?.textContent).toBe('Lookup');

		const practiceTab = bar.getByRole('link', { name: 'Practice' });
		expect(practiceTab.querySelector('.bottom-tab-bar__icon svg')).toBeTruthy();
		expect(practiceTab.querySelector('.bottom-tab-bar__label')?.textContent).toBe('Practice');
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
		expect(bar.getByRole('link', { name: 'Practice' }).className).not.toContain(
			'bottom-tab-bar__item--active'
		);
	});
});

describe('bottom tab bar is actually hidden on desktop (CR-01, 23-REVIEW)', () => {
	/**
	 * jsdom never evaluates CSS/media queries, so no amount of
	 * render()+assert-computed-style here can catch a regression of CR-01
	 * (Svelte's unlayered scoped `<style>` beating Tailwind's layered
	 * `sm:hidden` utility). Instead this statically asserts the source of
	 * +layout.svelte's own scoped stylesheet contains an unlayered
	 * `@media (min-width: 640px) { .bottom-tab-bar { display: none; } }`
	 * rule - the actual mechanism that hides the bar on desktop, independent
	 * of the `sm:hidden` utility class which cannot be relied on alone (see
	 * CR-01's root cause: Tailwind v4 utilities live inside `@layer
	 * utilities`, which always loses to unlayered component styles).
	 */
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const layoutPath = join(__dirname, '..', 'src', 'routes', '+layout.svelte');
	const source = readFileSync(layoutPath, 'utf8');

	it('declares an unconditional display:flex base rule for .bottom-tab-bar', () => {
		expect(source).toMatch(/\.bottom-tab-bar\s*\{\s*display:\s*flex;\s*\}/);
	});

	it('declares an unlayered @media (min-width: 640px) rule that turns .bottom-tab-bar off', () => {
		const desktopHideRule =
			/@media\s*\(min-width:\s*640px\)\s*\{\s*\.bottom-tab-bar\s*\{\s*display:\s*none;\s*\}\s*\}/;
		expect(source).toMatch(desktopHideRule);
	});

	it('does not wrap the desktop-hide rule in an @layer block (which Tailwind utilities would lose to)', () => {
		expect(source).not.toMatch(/@layer[^{]*\{[^}]*\.bottom-tab-bar/);
	});
});
