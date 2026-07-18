import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveSong } from '$lib/practice/songs';

/**
 * SONG-02 wiring test for the Recall page (Phase 18, Plan 03): the REVIEW
 * POOL filter toggle renders on the Review surface only, defaults off,
 * persists per-surface under `music-learn:recall-song-filter` (independent of
 * Drills' own key), and is absent on the Map surface. `$lib/srs/deck` is
 * mocked (mirroring recallSession.test.ts's own harness) so RecallSession
 * resolves to a deterministic empty state without touching real Dexie;
 * `deriveCellState` is kept real (importOriginal) since RecallMap calls it
 * directly when Map mode mounts.
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

const FILTER_KEY = 'music-learn:recall-song-filter';

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

describe('Recall page REVIEW POOL filter toggle (SONG-02)', () => {
	it('renders labelled REVIEW POOL on the Review surface, defaulting to aria-pressed=false', () => {
		renderPage();

		expect(screen.getByText('REVIEW POOL')).toBeInTheDocument();
		const toggle = screen.getByRole('button', { name: /From my songs/i });
		expect(toggle).toHaveAttribute('aria-pressed', 'false');
	});

	it('persists "true" under music-learn:recall-song-filter on click', async () => {
		renderPage();

		const toggle = screen.getByRole('button', { name: /From my songs/i });
		await fireEvent.click(toggle);

		expect(localStorage.getItem(FILTER_KEY)).toBe('true');
		expect(toggle).toHaveAttribute('aria-pressed', 'true');
	});

	it('is absent on the Map surface', async () => {
		renderPage();

		expect(screen.getByText('REVIEW POOL')).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Map' }));

		expect(screen.queryByText('REVIEW POOL')).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /From my songs/i })).not.toBeInTheDocument();
	});

	it('defaults to the filter-off explanatory note when the filter has never been toggled on', () => {
		renderPage();

		expect(screen.getByTestId('song-filter-note')).toHaveTextContent(
			'Filter off: full chord library. Chords from your songs still carry their mark.'
		);
	});

	it('with no active songs, turning the filter on shows the fallback note rather than the filter-on note', async () => {
		renderPage();

		const toggle = screen.getByRole('button', { name: /From my songs/i });
		await fireEvent.click(toggle);

		expect(toggle).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByTestId('song-filter-note')).toHaveTextContent(
			'No active songs yet, so showing the full library instead.'
		);
	});

	it('with active-song chords, turning the filter on shows the filter-on note with the song chord count', async () => {
		seedActiveSong(['Bbmaj7', 'F7']);
		renderPage();

		const toggle = screen.getByRole('button', { name: /From my songs/i });
		await fireEvent.click(toggle);

		expect(screen.getByTestId('song-filter-note')).toHaveTextContent(
			'Filter on: practicing the 2 chords from your active songs only.'
		);
	});
});
