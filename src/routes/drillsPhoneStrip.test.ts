import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '$lib/i18n/locale.svelte';

/**
 * Phone-mode tests for the Phase 23 1B compact strip + BottomSheet.
 * Copies the mock scaffold from drillsSongFilter.test.ts so DrillsPage renders
 * in isolation, then stubs window.matchMedia so the
 * `(max-width: 639.98px)` query reports matches:true, forcing the phone
 * branch (isPhone=true) instead of the desktop default that jsdom otherwise
 * resolves to. The sheet held a SongFilterToggle bar before quick task
 * 260720-v9u removed Drills' own filter control; the sheet now holds only
 * the LevelPicker and mode tabs.
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

function renderPage() {
	return render(DrillsPage);
}

/** family -> chord (0), direction -> 'construction' (well under 0.5). */
function forceConstruction() {
	vi.spyOn(Math, 'random').mockReturnValue(0);
}

/**
 * Minimal MediaQueryList stub: reports `matches` per the query string passed
 * in and supports the addEventListener/removeEventListener pair the page
 * component actually calls (both the phone-breakpoint listener added in
 * Task 2 and the pre-existing landscape-orientation listener).
 */
function stubMatchMediaPhone() {
	const listeners = new Map<string, Set<(event: MediaQueryListEvent) => void>>();
	window.matchMedia = vi.fn().mockImplementation((query: string) => {
		const matches = query === '(max-width: 639.98px)';
		return {
			matches,
			media: query,
			onchange: null,
			addEventListener: (type: string, listener: (event: MediaQueryListEvent) => void) => {
				if (!listeners.has(query)) listeners.set(query, new Set());
				listeners.get(query)!.add(listener);
			},
			removeEventListener: (type: string, listener: (event: MediaQueryListEvent) => void) => {
				listeners.get(query)?.delete(listener);
			},
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn()
		} as unknown as MediaQueryList;
	});
}

const originalMatchMedia = window.matchMedia;

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
	stubMatchMediaPhone();
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	setLocale('en');
	window.matchMedia = originalMatchMedia;
});

describe('Drills phone compact strip (Phase 23 1B, Task 3)', () => {
	it('shows the compact strip with tier/mode summary and compact score, and hides the desktop controls', () => {
		forceConstruction();

		renderPage();

		const strip = screen.getByTestId('drill-strip');
		expect(strip).toHaveTextContent('Tier 1');
		expect(strip).toHaveTextContent('Mix');
		expect(strip).toHaveTextContent('▾');

		const score = screen.getByTestId('drill-strip-score');
		expect(score.textContent).toMatch(/\//);
		expect(score.textContent).toMatch(/✓/);

		// The full LevelPicker card / mode row / SongFilterToggle bar are NOT
		// rendered outside the (closed) sheet.
		expect(screen.queryByTestId('level-picker')).not.toBeInTheDocument();
		expect(screen.queryByTestId('drill-mode-row')).not.toBeInTheDocument();
		expect(screen.queryByTestId('song-filter-toggle-bar')).not.toBeInTheDocument();
		expect(screen.queryByTestId('score-register')).not.toBeInTheDocument();
	});

	it('opens the sheet on strip tap with LevelPicker and mode tabs', async () => {
		forceConstruction();

		renderPage();

		const stripToggle = screen.getByRole('button', { name: 'Open level and mode settings' });
		expect(stripToggle).toHaveAttribute('aria-expanded', 'false');
		expect(screen.queryByTestId('bottom-sheet')).not.toBeInTheDocument();

		await fireEvent.click(stripToggle);

		expect(stripToggle).toHaveAttribute('aria-expanded', 'true');
		const sheet = screen.getByTestId('bottom-sheet');
		expect(sheet).toBeInTheDocument();
		expect(screen.getByTestId('level-picker')).toBeInTheDocument();
		expect(screen.getByTestId('drill-mode-row')).toBeInTheDocument();
		expect(screen.queryByTestId('song-filter-toggle-bar')).not.toBeInTheDocument();
	});

	it('closes the sheet via the Close control and returns aria-expanded to false', async () => {
		forceConstruction();

		renderPage();

		const stripToggle = screen.getByRole('button', { name: 'Open level and mode settings' });
		await fireEvent.click(stripToggle);
		expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();

		const closeButton = screen.getByTestId('bottom-sheet-close');
		await fireEvent.click(closeButton);

		expect(screen.queryByTestId('bottom-sheet')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Open level and mode settings' })).toHaveAttribute(
			'aria-expanded',
			'false'
		);
	});

	it('closes the sheet via the backdrop', async () => {
		forceConstruction();

		renderPage();

		const stripToggle = screen.getByRole('button', { name: 'Open level and mode settings' });
		await fireEvent.click(stripToggle);
		expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();

		const backdrop = screen.getByTestId('bottom-sheet-backdrop');
		await fireEvent.click(backdrop);

		expect(screen.queryByTestId('bottom-sheet')).not.toBeInTheDocument();
	});

	it('renders the French aria-label on the strip open button under fr, with the ChordGlyph immune to translation', () => {
		forceConstruction();
		setLocale('fr');

		renderPage();

		const stripToggle = screen.getByRole('button', {
			name: 'Ouvrir les réglages de niveau et de mode'
		});
		expect(stripToggle).toBeInTheDocument();

		// ChordGlyph immunity: F7's root/quality spans still render verbatim.
		expect(screen.getAllByText('F').length).toBeGreaterThan(0);
	});
});
