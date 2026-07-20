import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveSong } from '$lib/practice/songs';
import { setLocale } from '$lib/i18n/locale.svelte';

/**
 * SONG-01 wiring test for Drills (Phase 18, Plan 02), updated by quick task
 * 260720-v9u: the SongMark renders on a song chord prompt regardless of
 * filter state, and Drills now READS the shared global "From my songs"
 * preference (`music-learn:song-filter`, set from /songs) rather than
 * rendering its own toggle - the pref genuinely restricts the draw (with the
 * locked no-active-songs fallback). `$lib/practice/songs` is left UNMOCKED
 * so songProvenance's real `listSongs()`/`activeSongChordSymbols()` read the
 * real (jsdom) localStorage seeded below via `saveSong`.
 */

const flushQueueMock = vi.fn();
const fetchStatsMock = vi.fn((..._args: unknown[]) => Promise.resolve({ items: [], weakest: [] }));
vi.mock('$lib/api/progress', () => ({
	flushQueue: (...args: unknown[]) => flushQueueMock(...args),
	fetchStats: (...args: unknown[]) => fetchStatsMock(...args),
	localDateString: () => '2026-07-18'
}));

vi.mock('$lib/practice/answerTelemetry', () => ({
	recordPracticeAnswer: vi.fn()
}));

interface PoolDrawStub {
	symbol: string;
	bucket: string;
	scaffoldStage: string | null;
}
const drawFromPoolMock = vi.fn(
	(..._args: unknown[]): PoolDrawStub => ({ symbol: 'F7', bucket: 'tier', scaffoldStage: null })
);
const drawFromSymbolsMock = vi.fn((symbols: string[], ..._rest: unknown[]): string | null =>
	symbols.length > 0 ? symbols[0] : null
);
const scaffoldStageForSymbolMock = vi.fn((..._args: unknown[]): string | null => null);
/** Identity pass-through: these tests exercise no scaffolding, so nothing is ever throttled. */
const limitScaffoldingQualitiesMock = vi.fn((symbols: string[], ..._rest: unknown[]): string[] => symbols);
vi.mock('$lib/practice/pool', () => ({
	drawFromPool: (...args: unknown[]) => drawFromPoolMock(...args),
	drawFromSymbols: (...args: [string[], ...unknown[]]) => drawFromSymbolsMock(...args),
	scaffoldStageForSymbol: (...args: unknown[]) => scaffoldStageForSymbolMock(...args),
	limitScaffoldingQualities: (...args: [string[], ...unknown[]]) =>
		limitScaffoldingQualitiesMock(...args)
}));

vi.mock('$lib/practice/practiceLog', () => ({
	recentMisses: (): string[] => [],
	appendPracticeAnswer: vi.fn(),
	readPracticeLog: () => [],
	practiceDaysSince: () => 99
}));

vi.mock('$lib/practice/levelState', () => ({
	getLevelState: () => ({ currentTier: 1, unlockedTiers: [1] }),
	checkUnlock: () => ({
		tier: 1,
		nextTier: 2,
		eligible: false,
		rollingAccuracy: 0,
		rollingCount: 0,
		lifetimeAttempts: 0,
		distinctDays: 0,
		perQuality: []
	}),
	isSnoozed: () => false,
	setCurrentTier: vi.fn(),
	snoozeSuggestion: vi.fn()
}));

vi.mock('$lib/practice/scaffold', () => ({
	readScaffolds: () => ({}),
	writeScaffold: vi.fn(),
	recordScaffoldAnswer: (state: unknown) => state
}));

const consumeDrillSeedsMock = vi.fn((..._args: unknown[]): string[] => []);
const consumeLessonSeedsMock = vi.fn((..._args: unknown[]): string[] => []);
vi.mock('$lib/practice/drillSeeds', () => ({
	consumeDrillSeeds: (...args: unknown[]) => consumeDrillSeedsMock(...args),
	consumeLessonSeeds: (...args: unknown[]) => consumeLessonSeedsMock(...args)
}));

vi.mock('$lib/drills/rotateHint', () => ({
	isRotateHintDismissed: () => true,
	dismissRotateHint: vi.fn()
}));

vi.mock('$lib/audio/audio', () => ({
	playChord: vi.fn(),
	playNote: vi.fn(),
	ensureAudioReady: async () => {}
}));

const { default: DrillsPage } = await import('./drills/+page.svelte');

const FILTER_KEY = 'music-learn:song-filter';

function renderPage() {
	return render(DrillsPage);
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

/** family -> chord (0), direction -> 'construction' (well under 0.5). */
function forceConstruction() {
	vi.spyOn(Math, 'random').mockReturnValue(0);
}

/** family -> chord (0), direction -> 'identification' (well over 0.5). */
function forceIdentification() {
	let call = 0;
	const draws = [0, 0.99];
	vi.spyOn(Math, 'random').mockImplementation(() => {
		const value = draws[Math.min(call, draws.length - 1)];
		call++;
		return value;
	});
}

beforeEach(() => {
	localStorage.clear();
	drawFromPoolMock.mockClear();
	drawFromSymbolsMock.mockClear();
	scaffoldStageForSymbolMock.mockReset();
	scaffoldStageForSymbolMock.mockImplementation((..._args: unknown[]): string | null => null);
	limitScaffoldingQualitiesMock.mockClear();
	consumeDrillSeedsMock.mockReset();
	consumeDrillSeedsMock.mockImplementation((): string[] => []);
	consumeLessonSeedsMock.mockReset();
	consumeLessonSeedsMock.mockImplementation((): string[] => []);
	fetchStatsMock.mockClear();
	flushQueueMock.mockClear();
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	setLocale('en');
});

describe('SongMark on the Drills prompt (SONG-01)', () => {
	it('shows the SongMark on a construction prompt whose drawn symbol has provenance', () => {
		seedActiveSong(['F7']);
		drawFromPoolMock.mockReturnValue({ symbol: 'F7', bucket: 'tier', scaffoldStage: null });
		forceConstruction();

		renderPage();

		const mark = screen.getByTestId('song-mark');
		expect(mark).toHaveTextContent('My Tune');
	});

	it('shows the SongMark on an identification prompt whose drawn symbol has provenance', () => {
		seedActiveSong(['F7']);
		drawFromPoolMock.mockReturnValue({ symbol: 'F7', bucket: 'tier', scaffoldStage: null });
		forceIdentification();

		renderPage();

		expect(screen.getByText('Name this chord.')).toBeInTheDocument();
		const mark = screen.getByTestId('song-mark');
		expect(mark).toHaveTextContent('My Tune');
	});

	it('shows no SongMark for a drawn symbol with no provenance', () => {
		seedActiveSong(['Cm7']); // Cm7, not F7: the drawn symbol below has no provenance.
		drawFromPoolMock.mockReturnValue({ symbol: 'F7', bucket: 'tier', scaffoldStage: null });
		forceConstruction();

		renderPage();

		expect(screen.queryByTestId('song-mark')).not.toBeInTheDocument();
	});
});

describe('reads the persisted global filter (SONG-02, quick task 260720-v9u)', () => {
	it('with the pref true and one drillable song chord seeded, restricts the draw to drawFromSymbols', () => {
		localStorage.setItem(FILTER_KEY, 'true');
		seedActiveSong(['Bbmaj7']);
		forceConstruction();

		renderPage();

		expect(drawFromSymbolsMock).toHaveBeenCalled();
		const [restrictedSymbols] = drawFromSymbolsMock.mock.calls.at(-1) as [string[]];
		expect(restrictedSymbols).toEqual(['Bbmaj7']);
	});

	it('with the pref unset, draws from the pool and never restricts', () => {
		forceConstruction();

		renderPage();

		expect(drawFromPoolMock).toHaveBeenCalled();
		expect(drawFromSymbolsMock).not.toHaveBeenCalled();
	});

	it('with the pref false, draws from the pool and never restricts', () => {
		localStorage.setItem(FILTER_KEY, 'false');
		forceConstruction();

		renderPage();

		expect(drawFromPoolMock).toHaveBeenCalled();
		expect(drawFromSymbolsMock).not.toHaveBeenCalled();
	});

	it('with the pref true and no drillable song chords, falls back to the pool (no dead-end) and renders a question', () => {
		localStorage.setItem(FILTER_KEY, 'true');
		forceConstruction();

		renderPage();

		expect(drawFromPoolMock).toHaveBeenCalled();
		expect(screen.getByText(/Click the notes for/)).toBeInTheDocument();
	});

	it('renders no From my songs button - Drills reads the pref, it never owns a control', () => {
		forceConstruction();

		renderPage();

		expect(screen.queryByRole('button', { name: /From my songs/i })).not.toBeInTheDocument();
	});
});

describe('Lesson-seeds handoff to Drills (LEARN-03)', () => {
	it('renders FROM YOUR LESSON for a lesson-seeded question, never FROM YOUR WEAK LIST', () => {
		consumeLessonSeedsMock.mockImplementation((): string[] => ['C', 'Cm']);
		forceConstruction();

		renderPage();

		const tag = screen.getByTestId('question-source-tag');
		expect(tag).toHaveTextContent('FROM YOUR LESSON');
		expect(tag).not.toHaveTextContent('FROM YOUR WEAK LIST');
		// Both one-shot channels were consumed at init (one-shot clearing).
		expect(consumeLessonSeedsMock).toHaveBeenCalled();
		expect(consumeDrillSeedsMock).toHaveBeenCalled();
	});

	it('a plain weak-list seed (no lesson seeds present) still renders FROM YOUR WEAK LIST', () => {
		consumeDrillSeedsMock.mockImplementation((): string[] => ['Cmaj7']);
		forceConstruction();

		renderPage();

		expect(screen.getByTestId('question-source-tag')).toHaveTextContent('FROM YOUR WEAK LIST');
	});

	it('lesson seeds take precedence over weak-list seeds when both channels are present', () => {
		consumeLessonSeedsMock.mockImplementation((): string[] => ['C']);
		consumeDrillSeedsMock.mockImplementation((): string[] => ['Cmaj7']);
		forceConstruction();

		renderPage();

		expect(screen.getByTestId('question-source-tag')).toHaveTextContent('FROM YOUR LESSON');
	});
});

describe('Drills renders in French (I18N-02, Phase 20 Plan 04)', () => {
	it('shows the French construction prompt and the DE TA LEÇON tag under fr, with the chord symbol rendering identically to EN', () => {
		consumeLessonSeedsMock.mockImplementation((): string[] => ['Cm7']);
		drawFromPoolMock.mockReturnValue({ symbol: 'Cm7', bucket: 'tier', scaffoldStage: null });
		forceConstruction();
		setLocale('fr');

		renderPage();

		const tag = screen.getByTestId('question-source-tag');
		expect(tag).toHaveTextContent('DE TA LEÇON');
		expect(screen.getByText('Clique sur les notes de Cm7.')).toBeInTheDocument();

		// The chord symbol itself (ChordGlyph's root/quality spans) renders
		// verbatim regardless of locale (I18N-02 immunity boundary).
		expect(screen.getAllByText('C').length).toBeGreaterThan(0);
		expect(screen.getAllByText('m7').length).toBeGreaterThan(0);
	});
});
