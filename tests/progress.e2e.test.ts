import { render, screen, fireEvent, within, waitFor } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { readable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProgressPage from '../src/routes/progress/+page.svelte';
import { setLocale } from '$lib/i18n/locale.svelte';

// +layout.svelte reads the `$page` store from $app/stores to mark the active
// nav link, same mock shape as tests/drills.e2e.test.ts.
vi.mock('$app/stores', () => ({
	page: readable({ url: new URL('http://localhost/') })
}));

const fetchStatsMock = vi.fn();
const fetchStreakMock = vi.fn();
vi.mock('$lib/api/progress', () => ({
	fetchStats: (...args: unknown[]) => fetchStatsMock(...args),
	fetchStreak: (...args: unknown[]) => fetchStreakMock(...args),
	localDateString: () => '2026-07-13'
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

// Practice settings (Track B): stateful level mock so the tier override flow
// updates the display, plus the audio contract's sound toggle and the
// Drill-these seeding handoff.
let currentTier = 1;
const setCurrentTierMock = vi.fn((tier: number) => {
	currentTier = tier;
	return { currentTier, unlockedTiers: [1, 2, 3, 4].filter((id) => id <= tier) };
});
vi.mock('$lib/practice/levelState', () => ({
	getLevelState: () => ({
		currentTier,
		unlockedTiers: [1, 2, 3, 4].filter((id) => id <= currentTier)
	}),
	setCurrentTier: (tier: number) => setCurrentTierMock(tier)
}));

let soundOn = true;
const setSoundEnabledMock = vi.fn((enabled: boolean) => {
	soundOn = enabled;
});
let studyModeOn = false;
const setStudyModeEnabledMock = vi.fn((enabled: boolean) => {
	studyModeOn = enabled;
});
vi.mock('$lib/audio/audio', () => ({
	soundEnabled: () => soundOn,
	setSoundEnabled: (enabled: boolean) => setSoundEnabledMock(enabled),
	studyModeEnabled: () => studyModeOn,
	setStudyModeEnabled: (enabled: boolean) => setStudyModeEnabledMock(enabled)
}));

const setDrillSeedsMock = vi.fn();
vi.mock('$lib/practice/drillSeeds', () => ({
	setDrillSeeds: (...args: unknown[]) => setDrillSeedsMock(...args)
}));

const gotoMock = vi.fn((..._args: unknown[]) => Promise.resolve());
vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => gotoMock(...args)
}));

const { default: RootLayout } = await import('../src/routes/+layout.svelte');

beforeEach(() => {
	storedToken = '';
	currentTier = 1;
	soundOn = true;
	studyModeOn = false;
	fetchStatsMock.mockReset();
	fetchStreakMock.mockReset();
	fetchStreakMock.mockResolvedValue({ streak: 0, practicedToday: false });
	getApiTokenMock.mockClear();
	setApiTokenMock.mockClear();
	setCurrentTierMock.mockClear();
	setSoundEnabledMock.mockClear();
	setStudyModeEnabledMock.mockClear();
	setDrillSeedsMock.mockClear();
	gotoMock.mockClear();
});

afterEach(() => {
	vi.restoreAllMocks();
	setLocale('en');
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

	it('shows a streak hero numeral and a rotation line containing the count when fetchStreak resolves an active streak', async () => {
		storedToken = 'secret';
		fetchStatsMock.mockResolvedValue({
			items: [{ item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4, needsPractice: true }],
			weakest: [{ item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4, needsPractice: true }]
		});
		fetchStreakMock.mockResolvedValue({ streak: 3, practicedToday: true });

		render(ProgressPage);

		await waitFor(() =>
			expect(within(screen.getByTestId('streak-hero')).getByTestId('streak-badge')).toHaveTextContent(
				'3'
			)
		);

		const hero = screen.getByTestId('streak-hero');
		expect(hero.textContent).toMatch(/3/);
	});

	it('shows the hero numeral 0 in ink and a zeroStreak line when the streak is 0', async () => {
		storedToken = 'secret';
		fetchStatsMock.mockResolvedValue({
			items: [{ item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4, needsPractice: true }],
			weakest: [{ item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4, needsPractice: true }]
		});
		fetchStreakMock.mockResolvedValue({ streak: 0, practicedToday: false });

		render(ProgressPage);

		await waitFor(() => expect(screen.getByTestId('streak-hero')).toBeInTheDocument());

		const hero = screen.getByTestId('streak-hero');
		const badge = within(hero).getByTestId('streak-badge');
		expect(badge).toHaveTextContent('0');
		expect(badge.classList.contains('streak-badge--active')).toBe(false);
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

describe('practice settings section (Track B)', () => {
	it('renders even without a token: settings are device-local', () => {
		storedToken = '';
		render(ProgressPage);

		const settings = screen.getByTestId('practice-settings');
		expect(settings).toBeInTheDocument();
		expect(within(settings).getByTestId('current-tier-line')).toHaveTextContent(
			'TIER 1: WHITE-KEY TRIADS'
		);
	});

	it('offers all 6 tiers with 5 and 6 locked as coming later', () => {
		render(ProgressPage);

		const settings = screen.getByTestId('practice-settings');
		for (const tier of [1, 2, 3, 4]) {
			expect(within(settings).getByRole('button', { name: `Set tier ${tier}` })).toBeEnabled();
		}
		for (const tier of [5, 6]) {
			expect(within(settings).getByRole('button', { name: `Set tier ${tier}` })).toBeDisabled();
		}
		expect(settings).toHaveTextContent('TIERS 5 AND 6: COMING LATER');
	});

	it('manual tier override applies immediately and updates the display', async () => {
		render(ProgressPage);

		await fireEvent.click(screen.getByRole('button', { name: 'Set tier 3' }));

		expect(setCurrentTierMock).toHaveBeenCalledWith(3);
		expect(screen.getByTestId('current-tier-line')).toHaveTextContent(
			'TIER 3: THE BIG THREE SEVENTHS'
		);
	});

	it('the sound toggle reflects the audio contract state and flips it', async () => {
		render(ProgressPage);

		const toggle = screen.getByRole('button', { name: 'Toggle sound' });
		expect(toggle).toHaveTextContent('SOUND ON');

		await fireEvent.click(toggle);

		expect(setSoundEnabledMock).toHaveBeenCalledWith(false);
		expect(toggle).toHaveTextContent('SOUND OFF');
	});
});

describe('French locale (I18N-02)', () => {
	it('renders Practice Settings heading, SOUND/STUDY MODE labels, and an accuracy-table header in French', async () => {
		setLocale('fr');
		storedToken = 'secret';
		fetchStatsMock.mockResolvedValue({
			items: [{ item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4, needsPractice: true }],
			weakest: []
		});

		render(ProgressPage);
		await waitFor(() => expect(screen.getByTestId('accuracy-table')).toBeInTheDocument());

		expect(screen.getByText('Réglages de pratique')).toBeInTheDocument();
		expect(screen.getByText('SON')).toBeInTheDocument();
		expect(screen.getByText('MODE ÉTUDE')).toBeInTheDocument();

		const table = screen.getByTestId('accuracy-table');
		expect(within(table).getByText('SYMBOLE')).toBeInTheDocument();
	});

	it('renders an accuracy percentage and a chord symbol identically in fr and en', async () => {
		storedToken = 'secret';
		fetchStatsMock.mockResolvedValue({
			items: [{ item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4, needsPractice: true }],
			weakest: []
		});

		setLocale('en');
		const { unmount } = render(ProgressPage);
		await waitFor(() => expect(screen.getByTestId('accuracy-table')).toBeInTheDocument());
		const enTable = screen.getByTestId('accuracy-table');
		expect(within(enTable).getByText('Cm7')).toBeInTheDocument();
		expect(within(enTable).getByText('40%')).toBeInTheDocument();
		unmount();

		setLocale('fr');
		render(ProgressPage);
		await waitFor(() => expect(screen.getByTestId('accuracy-table')).toBeInTheDocument());
		const frTable = screen.getByTestId('accuracy-table');
		expect(within(frTable).getByText('Cm7')).toBeInTheDocument();
		expect(within(frTable).getByText('40%')).toBeInTheDocument();
	});
});

describe('Drill these button (weakest spots -> seeded session)', () => {
	it('seeds the drill session with the weakest chord items and navigates to /drills', async () => {
		storedToken = 'secret';
		fetchStatsMock.mockResolvedValue({
			items: [
				{ item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4, needsPractice: true },
				{ item: 'F#m7b5', kind: 'chord', attempts: 4, accuracy: 0.25, needsPractice: true }
			],
			weakest: [
				{ item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4, needsPractice: true },
				{ item: 'F#m7b5', kind: 'chord', attempts: 4, accuracy: 0.25, needsPractice: true }
			]
		});

		render(ProgressPage);
		await waitFor(() => expect(screen.getByTestId('weakest-spots')).toBeInTheDocument());

		const weakestSection = screen.getByTestId('weakest-spots');
		await fireEvent.click(within(weakestSection).getByRole('button', { name: 'Drill these' }));

		expect(setDrillSeedsMock).toHaveBeenCalledWith(['Cm7', 'F#m7b5']);
		expect(gotoMock).toHaveBeenCalledWith('/drills');
	});
});
