import { render, screen, fireEvent, within, waitFor } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { readable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProgressPage from '../src/routes/progress/+page.svelte';

// +layout.svelte reads the `$page` store from $app/stores to mark the active
// nav link, same mock shape as tests/drills.e2e.test.ts.
vi.mock('$app/stores', () => ({
	page: readable({ url: new URL('http://localhost/') })
}));

const fetchStatsMock = vi.fn();
vi.mock('$lib/api/progress', () => ({
	fetchStats: (...args: unknown[]) => fetchStatsMock(...args)
}));

// Stateful token mock: setApiToken updates what getApiToken subsequently
// returns, so the token-missing -> Save -> re-fetch flow is exercised
// realistically rather than needing a second render.
let storedToken = '';
const getApiTokenMock = vi.fn(() => storedToken);
const setApiTokenMock = vi.fn((token: string) => {
	storedToken = token;
});
vi.mock('$lib/api/client', () => ({
	getApiToken: () => getApiTokenMock(),
	setApiToken: (token: string) => setApiTokenMock(token)
}));

const { default: RootLayout } = await import('../src/routes/+layout.svelte');

beforeEach(() => {
	storedToken = '';
	fetchStatsMock.mockReset();
	getApiTokenMock.mockClear();
	setApiTokenMock.mockClear();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('progress page populated state', () => {
	it('renders weakest-spots and accuracy-table with the seeded rows when fetchStats resolves', async () => {
		storedToken = 'secret';
		fetchStatsMock.mockResolvedValue({
			items: [
				{ item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4, needsPractice: true },
				{ item: 'G7', kind: 'chord', attempts: 5, accuracy: 0.8, needsPractice: false }
			],
			weakest: [{ item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4, needsPractice: true }]
		});

		render(ProgressPage);

		await waitFor(() => expect(screen.getByTestId('weakest-spots')).toBeInTheDocument());

		const weakestSection = screen.getByTestId('weakest-spots');
		expect(within(weakestSection).getByText('Cm7')).toBeInTheDocument();

		const accuracyTable = screen.getByTestId('accuracy-table');
		expect(within(accuracyTable).getByText('Cm7')).toBeInTheDocument();
		expect(within(accuracyTable).getByText('G7')).toBeInTheDocument();
	});
});

describe('progress page empty state', () => {
	it('renders progress-empty with the exact copy and a Start a Drill link to /drills', async () => {
		storedToken = 'secret';
		fetchStatsMock.mockResolvedValue({ items: [], weakest: [] });

		render(ProgressPage);

		await waitFor(() => expect(screen.getByTestId('progress-empty')).toBeInTheDocument());
		expect(screen.getByText('Nothing on the ledger yet.')).toBeInTheDocument();

		const link = screen.getByRole('link', { name: 'Start a Drill' });
		expect(link).toHaveAttribute('href', '/drills');
	});
});

describe('progress page error state', () => {
	it('renders progress-error with the exact copy and a working Try Again retry', async () => {
		storedToken = 'secret';
		fetchStatsMock.mockRejectedValueOnce(new Error('network down'));

		render(ProgressPage);

		await waitFor(() => expect(screen.getByTestId('progress-error')).toBeInTheDocument());
		expect(
			screen.getByText(
				"Couldn't reach the ledger. The server's not answering right now. Check your connection and try again."
			)
		).toBeInTheDocument();

		fetchStatsMock.mockResolvedValue({ items: [], weakest: [] });
		await fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

		await waitFor(() => expect(screen.getByTestId('progress-empty')).toBeInTheDocument());
	});
});

describe('progress page token-missing state', () => {
	it('renders progress-token-entry when no token is stored, without calling fetchStats', () => {
		storedToken = '';

		render(ProgressPage);

		expect(screen.getByTestId('progress-token-entry')).toBeInTheDocument();
		expect(fetchStatsMock).not.toHaveBeenCalled();
	});

	it('calls setApiToken and re-fetches when Save is clicked', async () => {
		storedToken = '';
		fetchStatsMock.mockResolvedValue({ items: [], weakest: [] });

		render(ProgressPage);

		const input = screen.getByLabelText('Access key');
		await fireEvent.input(input, { target: { value: 'new-token' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

		expect(setApiTokenMock).toHaveBeenCalledWith('new-token');
		await waitFor(() => expect(fetchStatsMock).toHaveBeenCalledTimes(1));
		await waitFor(() => expect(screen.getByTestId('progress-empty')).toBeInTheDocument());
	});
});

describe('progress masthead nav link', () => {
	it('the masthead exposes a Progress link routing to /progress', () => {
		const emptyChildren = createRawSnippet(() => ({
			render: () => '<div></div>'
		}));

		render(RootLayout, { params: {}, data: {}, children: emptyChildren });

		const link = screen.getByRole('link', { name: 'Progress' });
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute('href', '/progress');
	});
});
