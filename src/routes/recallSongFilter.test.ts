import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveSong } from '$lib/practice/songs';

/**
 * Quick task 260720-v9u wiring test for the Recall page: the "From my
 * songs" filter control that used to render here is GONE - Recall now only
 * reads the shared global preference (`music-learn:song-filter`) at init
 * and passes it straight through to RecallSession. The functional filter
 * behavior itself (restriction + empty-active-songs fallback) is covered by
 * recallSession.test.ts's own songFilterOn prop cases, not here.
 *
 * `$lib/srs/deck` is mocked (mirroring recallSession.test.ts's own harness)
 * so RecallSession resolves to a deterministic empty state without touching
 * real Dexie; `deriveCellState` is kept real (importOriginal) since
 * RecallMap calls it directly when Map mode mounts.
 */

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

vi.mock('$lib/audio/audio', () => ({
	playChord: vi.fn(),
	playNote: vi.fn(),
	ensureAudioReady: async () => {},
	soundEnabled: () => false,
	studyModeEnabled: () => false,
	playArpeggio: () => {}
}));

const { default: RecallPage } = await import('./recall/+page.svelte');

function renderPage() {
	return render(RecallPage);
}

/** Seeds one active song containing exactly `symbols` (real songs.ts, real localStorage). */
function seedActiveSong(symbols: string[]) {
	saveSong({
		id: 'song-1',
		name: 'My Tune',
		chordSymbols: symbols,
		createdAt: '2026-07-18T00:00:00.000Z',
		source: 'custom',
		active: true
	});
}

beforeEach(() => {
	localStorage.clear();
	introduceNewCardsMock.mockReset();
	getDueCardsMock.mockReset();
	getAllCardsMock.mockReset();
	recordGradeMock.mockReset();
	getCardMock.mockReset();
	getCardMock.mockResolvedValue(undefined);
	introduceNewCardsMock.mockResolvedValue(0);
	getDueCardsMock.mockResolvedValue([]);
	getAllCardsMock.mockResolvedValue([]);
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe('Recall page reads the persisted global filter (quick task 260720-v9u)', () => {
	it('renders no REVIEW POOL text and no From my songs button on the Review surface', () => {
		renderPage();

		expect(screen.queryByText('REVIEW POOL')).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /From my songs/i })).not.toBeInTheDocument();
	});

	it('still renders no toggle after switching to Map', async () => {
		renderPage();

		await fireEvent.click(screen.getByRole('button', { name: 'Map' }));

		expect(screen.queryByText('REVIEW POOL')).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /From my songs/i })).not.toBeInTheDocument();
	});

	it('with the global pref set true and an active song seeded, renders the Review surface without a toggle', () => {
		localStorage.setItem('music-learn:song-filter', 'true');
		seedActiveSong(['Bbmaj7', 'F7']);

		renderPage();

		expect(screen.getByRole('button', { name: 'Review' })).toHaveAttribute('aria-pressed', 'true');
		expect(screen.queryByRole('button', { name: /From my songs/i })).not.toBeInTheDocument();
	});
});
