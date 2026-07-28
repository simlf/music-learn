import { render, screen, waitFor, cleanup, within } from '@testing-library/svelte';
import { createRawSnippet, flushSync } from 'svelte';
import { readable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '../src/lib/i18n/locale.svelte';
import { PRACTICE_DAYS_KEY } from '../src/lib/practice/practiceDays';
import { _resetDueCount } from '../src/lib/srs/dueBadge.svelte';

/**
 * Root-layout chrome: the Practice tab's due-count badge (B7) and the
 * local-first streak chip (B8).
 *
 * Both are about the app being honest on a phone. The streak used to be
 * server-computed behind a manually pasted bearer token on a tailnet host, so
 * off Tailscale the chip rendered nothing at all; it now comes from this
 * device's own practice-day set and the server can only ever RAISE it. The due
 * badge answers "is there anything waiting for me" without opening Practice
 * first.
 *
 * $app/stores is mocked exactly as tests/masthead.e2e.test.ts does (the real
 * page store needs the client router). getDueCards is mocked so the count is
 * deterministic without an IndexedDB fixture.
 */

vi.mock('$app/stores', () => ({
	page: readable({ url: new URL('http://localhost/') })
}));

const getDueCardsMock = vi.fn();
vi.mock('$lib/srs/deck', () => ({
	getDueCards: (...args: unknown[]) => getDueCardsMock(...args)
}));

const { default: RootLayout } = await import('../src/routes/+layout.svelte');

function renderLayout() {
	const emptyChildren = createRawSnippet(() => ({ render: () => '<div></div>' }));
	return render(RootLayout, { params: {}, data: {}, children: emptyChildren });
}

/** Freezes "today" so the local streak math is deterministic. */
const TODAY = new Date(2026, 6, 14); // 2026-07-14, local time

function seedPracticeDays(days: string[]) {
	localStorage.setItem(PRACTICE_DAYS_KEY, JSON.stringify(days));
}

function dueCards(count: number) {
	return Array.from({ length: count }, (_unused, index) => ({ factId: `fact-${index}` }));
}

beforeEach(() => {
	localStorage.clear();
	vi.useFakeTimers();
	vi.setSystemTime(TODAY);
	getDueCardsMock.mockReset();
	getDueCardsMock.mockResolvedValue([]);
	flushSync(() => _resetDueCount());
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.unstubAllGlobals();
	setLocale('en');
	flushSync(() => _resetDueCount());
});

describe('local-first streak chip (B8)', () => {
	it('shows the streak with no token and without touching the network', async () => {
		const fetchSpy = vi.fn();
		vi.stubGlobal('fetch', fetchSpy);
		seedPracticeDays(['2026-07-12', '2026-07-13', '2026-07-14']);

		renderLayout();

		expect(screen.getByTestId('streak-badge')).toHaveTextContent('3 DAY STREAK');
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('counts the one-day grace day, matching the server semantics', () => {
		seedPracticeDays(['2026-07-12', '2026-07-13']);

		renderLayout();

		expect(screen.getByTestId('streak-badge')).toHaveTextContent('2 DAY STREAK');
	});

	it('renders no chip at all for a device with no practice yet', () => {
		renderLayout();

		expect(screen.queryByTestId('streak-badge')).not.toBeInTheDocument();
	});

	it('renders no chip once a streak has lapsed, with no loss-framing copy in the chrome', () => {
		seedPracticeDays(['2026-06-01', '2026-06-02', '2026-06-03']);

		renderLayout();

		expect(screen.queryByTestId('streak-badge')).not.toBeInTheDocument();
	});

	it('raises the displayed streak to the server value when another device practiced more', async () => {
		localStorage.setItem('music-learn:api-token', 'secret');
		seedPracticeDays(['2026-07-14']);
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify({ streak: 9, practicedToday: true })))
		);

		renderLayout();

		expect(screen.getByTestId('streak-badge')).toHaveTextContent('1 DAY STREAK');
		await vi.waitFor(() =>
			expect(screen.getByTestId('streak-badge')).toHaveTextContent('9 DAY STREAK')
		);
	});

	it('never lets a reachable server shrink the streak below what this device knows', async () => {
		localStorage.setItem('music-learn:api-token', 'secret');
		seedPracticeDays(['2026-07-11', '2026-07-12', '2026-07-13', '2026-07-14']);
		const fetchSpy = vi.fn(
			async () => new Response(JSON.stringify({ streak: 1, practicedToday: true }))
		);
		vi.stubGlobal('fetch', fetchSpy);

		renderLayout();

		await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled());
		expect(screen.getByTestId('streak-badge')).toHaveTextContent('4 DAY STREAK');
	});

	it('keeps showing the local streak when the streak fetch fails (off tailnet)', async () => {
		localStorage.setItem('music-learn:api-token', 'secret');
		seedPracticeDays(['2026-07-13', '2026-07-14']);
		const fetchSpy = vi.fn(async () => {
			throw new Error('network unreachable');
		});
		vi.stubGlobal('fetch', fetchSpy);

		renderLayout();

		await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled());
		expect(screen.getByTestId('streak-badge')).toHaveTextContent('2 DAY STREAK');
	});
});

describe('Practice tab due-count badge (B7)', () => {
	it('shows the due count on the Practice tab in both nav surfaces', async () => {
		getDueCardsMock.mockResolvedValue(dueCards(3));

		renderLayout();

		await waitFor(() => expect(screen.getByTestId('due-badge-tab')).toHaveTextContent('3'));
		expect(screen.getByTestId('due-badge-masthead')).toHaveTextContent('3');
	});

	it('reads the count through the existing scheduler gateway exactly once per session', async () => {
		getDueCardsMock.mockResolvedValue(dueCards(2));

		renderLayout();

		await waitFor(() => expect(screen.getByTestId('due-badge-tab')).toBeInTheDocument());
		expect(getDueCardsMock).toHaveBeenCalledTimes(1);
	});

	it('renders no badge at all when nothing is due (never a "0" that nags)', async () => {
		getDueCardsMock.mockResolvedValue([]);

		renderLayout();

		await waitFor(() => expect(getDueCardsMock).toHaveBeenCalled());
		expect(screen.queryByTestId('due-badge-tab')).not.toBeInTheDocument();
		expect(screen.queryByTestId('due-badge-masthead')).not.toBeInTheDocument();
	});

	it('badges only the Practice tab, never Lookup, Learn, or Progress', async () => {
		getDueCardsMock.mockResolvedValue(dueCards(5));

		renderLayout();

		await waitFor(() => expect(screen.getByTestId('due-badge-tab')).toBeInTheDocument());

		const bar = within(screen.getByTestId('bottom-tab-bar'));
		expect(bar.getAllByTestId('due-badge-tab')).toHaveLength(1);
		expect(bar.getByRole('link', { name: 'Lookup' })).toHaveAttribute('aria-label', 'Lookup');
		expect(bar.getByRole('link', { name: 'Learn' })).toHaveAttribute('aria-label', 'Learn');
		expect(bar.getByRole('link', { name: 'Progress' })).toHaveAttribute('aria-label', 'Progress');
	});

	it('folds the count into the tab accessible name, since the visible pill is decorative', async () => {
		getDueCardsMock.mockResolvedValue(dueCards(3));

		renderLayout();

		const bar = within(screen.getByTestId('bottom-tab-bar'));
		await waitFor(() =>
			expect(bar.getByRole('link', { name: 'Practice, 3 due' })).toHaveAttribute(
				'href',
				'/practice'
			)
		);
		expect(screen.getByTestId('due-badge-tab')).toHaveAttribute('aria-hidden', 'true');
		expect(screen.getByTestId('due-badge-masthead')).toHaveAttribute('aria-hidden', 'true');
	});

	it('keeps the plain accessible name when there is no badge', async () => {
		renderLayout();

		await waitFor(() => expect(getDueCardsMock).toHaveBeenCalled());
		const bar = within(screen.getByTestId('bottom-tab-bar'));
		expect(bar.getByRole('link', { name: 'Practice' })).toHaveAttribute('aria-label', 'Practice');
		const masthead = within(screen.getByTestId('masthead'));
		expect(masthead.getByRole('link', { name: 'Practice' })).not.toHaveAttribute('aria-label');
	});

	it('translates the badged accessible name under fr (I18N-02 parity)', async () => {
		getDueCardsMock.mockResolvedValue(dueCards(4));

		renderLayout();
		await waitFor(() => expect(screen.getByTestId('due-badge-tab')).toBeInTheDocument());
		flushSync(() => setLocale('fr'));

		const bar = within(screen.getByTestId('bottom-tab-bar'));
		expect(bar.getByRole('link', { name: 'Pratiquer, 4 à revoir' })).toHaveAttribute(
			'href',
			'/practice'
		);
	});

	it('caps a very large backlog at 99+ so the tab slot cannot stretch', async () => {
		getDueCardsMock.mockResolvedValue(dueCards(140));

		renderLayout();

		await waitFor(() => expect(screen.getByTestId('due-badge-tab')).toHaveTextContent('99+'));
	});

	it('rescans on visibilitychange, the one cheap moment the count can be stale', async () => {
		getDueCardsMock.mockResolvedValue([]);

		renderLayout();
		await waitFor(() => expect(getDueCardsMock).toHaveBeenCalledTimes(1));

		getDueCardsMock.mockResolvedValue(dueCards(2));
		document.dispatchEvent(new Event('visibilitychange'));

		await waitFor(() => expect(screen.getByTestId('due-badge-tab')).toHaveTextContent('2'));
		expect(getDueCardsMock).toHaveBeenCalledTimes(2);
	});

	it('picks up a streak started after mount when the app comes back to the foreground', async () => {
		renderLayout();
		expect(screen.queryByTestId('streak-badge')).not.toBeInTheDocument();

		seedPracticeDays(['2026-07-14']);
		document.dispatchEvent(new Event('visibilitychange'));

		await waitFor(() =>
			expect(screen.getByTestId('streak-badge')).toHaveTextContent('1 DAY STREAK')
		);
	});

	it('survives a rejected deck read with no badge and no thrown error', async () => {
		getDueCardsMock.mockRejectedValue(new Error('indexedDB API missing'));

		renderLayout();

		await waitFor(() => expect(getDueCardsMock).toHaveBeenCalled());
		expect(screen.queryByTestId('due-badge-tab')).not.toBeInTheDocument();
		expect(screen.getByTestId('bottom-tab-bar')).toBeInTheDocument();
	});
});
