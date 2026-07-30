import { render, screen, fireEvent, within, waitFor } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { readable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProgressPage from '../src/routes/progress/+page.svelte';
import { setLocale } from '$lib/i18n/locale.svelte';
import { resetStatsCache } from '$lib/practice/statsCache';
import { PRACTICE_DAYS_KEY } from '$lib/practice/practiceDays';

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
	// 29-REVIEW WR-01: ProgressStats now caches the last successful
	// fetchStats/fetchStreak payload at module scope (keyed by API token) so
	// a Stats -> Recall -> Stats tab bounce renders instantly instead of
	// refetching. Reset it here so each `it` still simulates a genuinely
	// fresh /progress session rather than inheriting a previous test's
	// mocked network response (the caching behavior itself is covered by a
	// dedicated describe block below).
	resetStatsCache();
	// The hero streak is now local-first (max of this device's practice-day
	// set and the server value), so the day set has to be cleared between
	// cases or a seeded streak leaks into the next one.
	localStorage.removeItem(PRACTICE_DAYS_KEY);
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

	it('local-first streak: the hero shows THIS DEVICE count when fetchStreak fails (tailnet unreachable)', async () => {
		storedToken = 'secret';
		// localDateString is mocked to 2026-07-13 above, so these three days
		// are today, yesterday, and the day before.
		localStorage.setItem(
			PRACTICE_DAYS_KEY,
			JSON.stringify(['2026-07-11', '2026-07-12', '2026-07-13'])
		);
		fetchStatsMock.mockResolvedValue({
			items: [{ item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4, needsPractice: true }],
			weakest: [{ item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4, needsPractice: true }]
		});
		fetchStreakMock.mockRejectedValue(new Error('offline'));

		render(ProgressPage);

		await waitFor(() =>
			expect(
				within(screen.getByTestId('streak-hero')).getByTestId('streak-badge')
			).toHaveTextContent('3')
		);
	});

	it('local-first streak: the server can only RAISE the hero numeral, never lower it', async () => {
		storedToken = 'secret';
		localStorage.setItem(PRACTICE_DAYS_KEY, JSON.stringify(['2026-07-12', '2026-07-13']));
		fetchStatsMock.mockResolvedValue({
			items: [{ item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4, needsPractice: true }],
			weakest: [{ item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4, needsPractice: true }]
		});
		// A server that is BEHIND this device (practice happened offline) must
		// not drag the number down to 1.
		fetchStreakMock.mockResolvedValue({ streak: 1, practicedToday: true });

		render(ProgressPage);

		await waitFor(() =>
			expect(
				within(screen.getByTestId('streak-hero')).getByTestId('streak-badge')
			).toHaveTextContent('2')
		);

		// And a server AHEAD of this device (practice on another device) raises it.
		resetStatsCache();
		fetchStreakMock.mockResolvedValue({ streak: 9, practicedToday: true });
		render(ProgressPage);
		await waitFor(() =>
			expect(
				within(screen.getAllByTestId('streak-hero')[1]).getByTestId('streak-badge')
			).toHaveTextContent('9')
		);
	});
});

describe('progress page empty state', () => {
	it('renders progress-empty with the exact copy and a Start a Drill link to /practice', async () => {
		storedToken = 'secret';
		fetchStatsMock.mockResolvedValue({ items: [], weakest: [] });

		render(ProgressPage);

		await waitFor(() => expect(screen.getByTestId('progress-empty')).toBeInTheDocument());
		expect(screen.getByText('Nothing on the ledger yet.')).toBeInTheDocument();

		const link = screen.getByRole('link', { name: 'Start a Drill' });
		expect(link).toHaveAttribute('href', '/practice');
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

describe('Stats caching across remounts (29-REVIEW WR-01)', () => {
	it('renders the cached stats/streak immediately on a second mount (no loading skeleton), while still refreshing from the network in the background', async () => {
		storedToken = 'secret';
		fetchStatsMock.mockResolvedValue({
			items: [{ item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4, needsPractice: true }],
			weakest: [{ item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4, needsPractice: true }]
		});
		fetchStreakMock.mockResolvedValue({ streak: 3, practicedToday: true });

		const first = render(ProgressPage);
		await waitFor(() => expect(screen.getByTestId('streak-hero')).toBeInTheDocument());
		expect(fetchStatsMock).toHaveBeenCalledTimes(1);
		first.unmount();

		// Second mount (simulates returning to the Stats tab after visiting
		// Recall/Songs): the cache should render populated content on the
		// very first render pass, with no 'progress-loading' skeleton frame,
		// even though a background refresh is still in flight.
		render(ProgressPage);
		expect(screen.queryByTestId('progress-loading')).not.toBeInTheDocument();
		expect(screen.getByTestId('streak-hero')).toBeInTheDocument();
		expect(screen.getByTestId('weakest-spots')).toBeInTheDocument();

		await waitFor(() => expect(fetchStatsMock).toHaveBeenCalledTimes(2));
		await waitFor(() => expect(fetchStreakMock).toHaveBeenCalledTimes(2));
	});

	it('does not cache across a different API token (a token change always refetches)', async () => {
		storedToken = 'secret';
		fetchStatsMock.mockResolvedValue({
			items: [{ item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4, needsPractice: true }],
			weakest: []
		});
		fetchStreakMock.mockResolvedValue({ streak: 1, practicedToday: true });

		const first = render(ProgressPage);
		await waitFor(() => expect(screen.getByTestId('streak-hero')).toBeInTheDocument());
		first.unmount();

		storedToken = 'a-different-token';
		fetchStatsMock.mockResolvedValue({ items: [], weakest: [] });
		fetchStreakMock.mockResolvedValue({ streak: 0, practicedToday: false });

		render(ProgressPage);
		expect(screen.getByTestId('progress-loading')).toBeInTheDocument();
		await waitFor(() => expect(screen.getByTestId('progress-empty')).toBeInTheDocument());
	});
});

describe('progress masthead nav link', () => {
	it('the masthead exposes a Progress link routing to /progress', () => {
		const emptyChildren = createRawSnippet(() => ({
			render: () => '<div></div>'
		}));

		render(RootLayout, { params: {}, data: {}, children: emptyChildren });

		// Scoped to the masthead (Phase 30-04 nav cutover): the phone bottom
		// tab bar now also renders a "Progress" link since it shares the same
		// 4-hub navLinks source, so an unscoped query matches twice in jsdom
		// (which renders both desktop and phone markup with no media query).
		const masthead = within(screen.getByTestId('masthead'));
		const link = masthead.getByRole('link', { name: 'Progress' });
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

	it('offers all 6 tiers, every one enabled (n1-tier-unlock: mastery gates who reaches a tier, not this switch)', () => {
		render(ProgressPage);

		const settings = screen.getByTestId('practice-settings');
		for (const tier of [1, 2, 3, 4, 5, 6]) {
			expect(within(settings).getByRole('button', { name: `Set tier ${tier}` })).toBeEnabled();
		}
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

describe('Drill all N button (weakest spots -> seeded session)', () => {
	it('reads "Drill all 2" for two weak chords, seeds the drill session with the weakest chord items, and navigates to /practice', async () => {
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
		await fireEvent.click(within(weakestSection).getByRole('button', { name: 'Drill all 2' }));

		expect(setDrillSeedsMock).toHaveBeenCalledWith(['Cm7', 'F#m7b5']);
		expect(gotoMock).toHaveBeenCalledWith('/practice');
	});

	it('the per-row DRILL button seeds only that one symbol and navigates to /practice', async () => {
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
		await fireEvent.click(within(weakestSection).getByRole('button', { name: 'Drill Cm7' }));

		expect(setDrillSeedsMock).toHaveBeenCalledWith(['Cm7']);
		expect(gotoMock).toHaveBeenCalledWith('/practice');
	});
});

describe('7-day streak strip (UX-1C)', () => {
	it('renders no strip when fetchStreak resolves without a last7 field', async () => {
		storedToken = 'secret';
		fetchStatsMock.mockResolvedValue({
			items: [{ item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4, needsPractice: true }],
			weakest: []
		});
		fetchStreakMock.mockResolvedValue({ streak: 3, practicedToday: true });

		render(ProgressPage);
		await waitFor(() => expect(screen.getByTestId('streak-hero')).toBeInTheDocument());

		expect(screen.queryByTestId('streak-last7')).not.toBeInTheDocument();
	});

	it('renders 7 streak-day squares when fetchStreak resolves a last7 array', async () => {
		storedToken = 'secret';
		fetchStatsMock.mockResolvedValue({
			items: [{ item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4, needsPractice: true }],
			weakest: []
		});
		fetchStreakMock.mockResolvedValue({
			streak: 3,
			practicedToday: true,
			last7: [
				{ date: '2026-07-07', practiced: false },
				{ date: '2026-07-08', practiced: false },
				{ date: '2026-07-09', practiced: true },
				{ date: '2026-07-10', practiced: false },
				{ date: '2026-07-11', practiced: true },
				{ date: '2026-07-12', practiced: true },
				{ date: '2026-07-13', practiced: true }
			]
		});

		render(ProgressPage);
		await waitFor(() => expect(screen.getByTestId('streak-last7')).toBeInTheDocument());

		const strip = screen.getByTestId('streak-last7');
		expect(within(strip).getAllByTestId('streak-day')).toHaveLength(7);
	});

	it('formats the aria-label date for the active locale instead of the raw ISO string (WR-04, 23-REVIEW)', async () => {
		storedToken = 'secret';
		fetchStatsMock.mockResolvedValue({
			items: [{ item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4, needsPractice: true }],
			weakest: []
		});
		fetchStreakMock.mockResolvedValue({
			streak: 1,
			practicedToday: true,
			last7: [
				{ date: '2026-07-07', practiced: false },
				{ date: '2026-07-08', practiced: false },
				{ date: '2026-07-09', practiced: true },
				{ date: '2026-07-10', practiced: false },
				{ date: '2026-07-11', practiced: true },
				{ date: '2026-07-12', practiced: true },
				{ date: '2026-07-13', practiced: true }
			]
		});

		render(ProgressPage);
		await waitFor(() => expect(screen.getByTestId('streak-last7')).toBeInTheDocument());

		const strip = screen.getByTestId('streak-last7');
		const days = within(strip).getAllByTestId('streak-day');
		const firstDayLabel = days[0].getAttribute('aria-label') ?? '';

		expect(firstDayLabel).not.toContain('2026-07-07');
		expect(firstDayLabel).toContain('July 7');
	});

	it('formats the aria-label date in French when the FR locale is active', async () => {
		setLocale('fr');
		storedToken = 'secret';
		fetchStatsMock.mockResolvedValue({
			items: [{ item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4, needsPractice: true }],
			weakest: []
		});
		fetchStreakMock.mockResolvedValue({
			streak: 1,
			practicedToday: true,
			last7: [
				{ date: '2026-07-07', practiced: false },
				{ date: '2026-07-08', practiced: false },
				{ date: '2026-07-09', practiced: true },
				{ date: '2026-07-10', practiced: false },
				{ date: '2026-07-11', practiced: true },
				{ date: '2026-07-12', practiced: true },
				{ date: '2026-07-13', practiced: true }
			]
		});

		render(ProgressPage);
		await waitFor(() => expect(screen.getByTestId('streak-last7')).toBeInTheDocument());

		const strip = screen.getByTestId('streak-last7');
		const days = within(strip).getAllByTestId('streak-day');
		const firstDayLabel = days[0].getAttribute('aria-label') ?? '';

		expect(firstDayLabel).not.toContain('2026-07-07');
		expect(firstDayLabel).toContain('juillet');

		setLocale('en');
	});
});
