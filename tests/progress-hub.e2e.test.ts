import { render, screen, fireEvent, within, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProgressPage from '../src/routes/progress/+page.svelte';
import { readSongFilter } from '$lib/practice/songFilterPref';

/**
 * Phase 29-05 (REG-02): the Progress hub smoke test. Guards the new hub
 * composition built in 29-04 (the Stats|Recall|Songs tab switch, each
 * section's core affordances, the shared song-filter write contract, and the
 * data-review-dock gating), which the existing per-surface suites
 * (progress.e2e, songs.e2e, coverage) do not exercise since they render the
 * standalone /progress, /songs, /recall routes rather than the hub host.
 *
 * Mock scaffolding is copied verbatim from tests/progress.e2e.test.ts (the
 * stats section's own dependencies) plus the empty `$lib/srs/deck` mock
 * shape from src/lib/i18n/coverage.test.ts (so the Recall tab's
 * RecallSession/RecallMap render deterministically without IndexedDB).
 * `readSongFilter` is imported for real (not mocked) so assertion 5 checks
 * the true persisted value.
 */

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

let storedToken = '';
const getApiTokenMock = vi.fn(() => storedToken);
const setApiTokenMock = vi.fn((token: string) => {
	storedToken = token;
});
vi.mock('$lib/api/client', () => ({
	getApiToken: () => getApiTokenMock(),
	setApiToken: (token: string) => setApiTokenMock(token)
}));

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
	playChord: vi.fn(),
	playNote: vi.fn(),
	ensureAudioReady: async () => {},
	playArpeggio: () => {},
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

// Empty deck mock (mirrors src/lib/i18n/coverage.test.ts) so the Recall tab's
// RecallSession/RecallMap render the deterministic "nothing due" state
// without touching real Dexie/IndexedDB.
const introduceNewCardsMock = vi.fn();
const getDueCardsMock = vi.fn();
const getAllCardsMock = vi.fn();
const recordGradeMock = vi.fn();
const getCardMock = vi.fn();
vi.mock('$lib/srs/deck', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/srs/deck')>();
	return {
		...actual,
		introduceNewCards: (...args: unknown[]) => introduceNewCardsMock(...args),
		getDueCards: (...args: unknown[]) => getDueCardsMock(...args),
		getAllCards: (...args: unknown[]) => getAllCardsMock(...args),
		recordGrade: (...args: unknown[]) => recordGradeMock(...args),
		getCard: (...args: unknown[]) => getCardMock(...args)
	};
});

beforeEach(() => {
	localStorage.clear();
	storedToken = '';
	currentTier = 1;
	soundOn = true;
	studyModeOn = false;
	fetchStatsMock.mockReset();
	fetchStatsMock.mockResolvedValue({ items: [], weakest: [] });
	fetchStreakMock.mockReset();
	fetchStreakMock.mockResolvedValue({ streak: 0, practicedToday: false });
	getApiTokenMock.mockClear();
	setApiTokenMock.mockClear();
	setCurrentTierMock.mockClear();
	setSoundEnabledMock.mockClear();
	setStudyModeEnabledMock.mockClear();
	setDrillSeedsMock.mockClear();
	gotoMock.mockClear();

	introduceNewCardsMock.mockReset();
	introduceNewCardsMock.mockResolvedValue(0);
	getDueCardsMock.mockReset();
	getDueCardsMock.mockResolvedValue([]);
	getAllCardsMock.mockReset();
	getAllCardsMock.mockResolvedValue([]);
	recordGradeMock.mockReset();
	getCardMock.mockReset();
	getCardMock.mockResolvedValue(undefined);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('Progress hub tab switch', () => {
	it('renders three tabs with Stats pressed and Recall/Songs unpressed by default', () => {
		render(ProgressPage);

		const tabs = within(screen.getByRole('group', { name: /progress hub sections/i }));
		const statsTab = tabs.getByRole('button', { name: /stats/i });
		const recallTab = tabs.getByRole('button', { name: /recall/i });
		const songsTab = tabs.getByRole('button', { name: /songs/i });

		expect(statsTab).toHaveAttribute('aria-pressed', 'true');
		expect(recallTab).toHaveAttribute('aria-pressed', 'false');
		expect(songsTab).toHaveAttribute('aria-pressed', 'false');
	});
});

describe('Stats is the default section', () => {
	it('renders progress-token-entry and practice-settings with no tab click', () => {
		storedToken = '';
		render(ProgressPage);

		expect(screen.getByTestId('progress-token-entry')).toBeInTheDocument();
		expect(screen.getByTestId('practice-settings')).toBeInTheDocument();
	});
});

describe('Switching to Recall', () => {
	it('shows Review pressed and a Map button; clicking Map reveals the recall map grid', async () => {
		render(ProgressPage);

		const tabs = within(screen.getByRole('group', { name: /progress hub sections/i }));
		await fireEvent.click(tabs.getByRole('button', { name: /recall/i }));

		const modeToggle = within(screen.getByTestId('mode-toggle'));
		const reviewButton = modeToggle.getByRole('button', { name: 'Review' });
		const mapButton = modeToggle.getByRole('button', { name: 'Map' });
		expect(reviewButton).toHaveAttribute('aria-pressed', 'true');
		expect(mapButton).toBeInTheDocument();

		await fireEvent.click(mapButton);
		await waitFor(() => expect(screen.getByTestId('recall-map-grid')).toBeInTheDocument());
	});
});

describe('Switching to Songs', () => {
	it('shows the song-filter toggle bar and all 7 preset cards', async () => {
		render(ProgressPage);

		const tabs = within(screen.getByRole('group', { name: /progress hub sections/i }));
		await fireEvent.click(tabs.getByRole('button', { name: /songs/i }));

		expect(screen.getByTestId('song-filter-toggle-bar')).toBeInTheDocument();
		expect(screen.getAllByTestId('preset-card')).toHaveLength(7);
	});
});

describe('Song-filter write contract (PROG-01)', () => {
	it('writes the shared music-learn:song-filter preference when the toggle is clicked in Songs', async () => {
		render(ProgressPage);

		const tabs = within(screen.getByRole('group', { name: /progress hub sections/i }));
		await fireEvent.click(tabs.getByRole('button', { name: /songs/i }));

		expect(readSongFilter()).toBe(false);

		const bar = within(screen.getByTestId('song-filter-toggle-bar'));
		const toggle = bar.getByRole('button');
		await fireEvent.click(toggle);

		expect(readSongFilter()).toBe(true);
	});
});

describe('Review-dock gating (CRITICAL coupling)', () => {
	it('data-review-dock is present only while on Recall in Review mode', async () => {
		const { container } = render(ProgressPage);

		expect(container.querySelector('main')?.hasAttribute('data-review-dock')).toBe(false);

		const tabs = within(screen.getByRole('group', { name: /progress hub sections/i }));
		await fireEvent.click(tabs.getByRole('button', { name: /recall/i }));
		expect(container.querySelector('main')?.hasAttribute('data-review-dock')).toBe(true);

		const modeToggle = within(screen.getByTestId('mode-toggle'));
		await fireEvent.click(modeToggle.getByRole('button', { name: 'Map' }));
		expect(container.querySelector('main')?.hasAttribute('data-review-dock')).toBe(false);

		await fireEvent.click(tabs.getByRole('button', { name: /songs/i }));
		expect(container.querySelector('main')?.hasAttribute('data-review-dock')).toBe(false);
	});
});
