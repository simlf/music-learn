import { render, screen, cleanup, fireEvent, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spellChord } from '$lib/theory/chord';

/**
 * DPOL-03 wiring test for the /drills answer reveal: an on-demand "hear it
 * again" replay control for chord questions (both directions, right or
 * wrong), reusing the exact same full-chord playChord call recordGrade
 * already auto-plays once. Never rendered for interval questions. Mirrors
 * drillsSongFilter.test.ts's mock scaffold (including the playChord mock).
 */

const flushQueueMock = vi.fn();
const fetchStatsMock = vi.fn((..._args: unknown[]) => Promise.resolve({ items: [], weakest: [] }));
vi.mock('$lib/api/progress', () => ({
	flushQueue: (...args: unknown[]) => flushQueueMock(...args),
	fetchStats: (...args: unknown[]) => fetchStatsMock(...args),
	localDateString: () => '2026-07-19'
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

const playChordMock = vi.fn();
vi.mock('$lib/audio/audio', () => ({
	playChord: (...args: unknown[]) => playChordMock(...args),
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
	drawFromPoolMock.mockImplementation(() => ({ symbol: 'F7', bucket: 'tier', scaffoldStage: null }));
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
	playChordMock.mockClear();
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

const REPLAY_LABEL = 'Hear it again';
const F7_NOTE_LETTERS = spellChord('F7').notes.map((note) => note.letter);

/**
 * The interactive (pre-reveal) keyboard always labels black keys with their
 * sharp spelling (key.sharpLetter), regardless of the chord's own flat/sharp
 * spelling (PianoKeyboard.svelte's activateBlackKey/keyAriaLabel). Maps a
 * spelled flat letter to the clickable sharp-labelled key; naturals and
 * already-sharp letters pass through unchanged.
 */
const FLAT_TO_SHARP: Record<string, string> = {
	'D♭': 'C♯',
	'E♭': 'D♯',
	'G♭': 'F♯',
	'A♭': 'G♯',
	'B♭': 'A♯'
};
function clickableKeyLetter(letter: string): string {
	return FLAT_TO_SHARP[letter] ?? letter;
}

describe('Chord reveal replay (DPOL-03)', () => {
	it('renders the replay control after a correct chord identification answer and replays the full chord on click', async () => {
		forceIdentification();
		renderPage();

		expect(screen.getByText('Name this chord.')).toBeInTheDocument();
		const choiceGrid = screen.getByTestId('choice-grid');
		await fireEvent.click(within(choiceGrid).getByRole('button', { name: 'Answer: F7' }));

		expect(screen.getByTestId('drill-feedback')).toBeInTheDocument();
		playChordMock.mockClear(); // clear recordGrade's own auto-play call

		const replayButton = screen.getByRole('button', { name: REPLAY_LABEL });
		await fireEvent.click(replayButton);

		expect(playChordMock).toHaveBeenCalledWith(F7_NOTE_LETTERS);
	});

	it('also renders the replay control after a WRONG chord identification answer', async () => {
		forceIdentification();
		renderPage();

		const choiceGrid = screen.getByTestId('choice-grid');
		const buttons = within(choiceGrid).getAllByRole('button');
		const wrongChoice = buttons.find((button) => !button.textContent?.includes('F7'));
		expect(wrongChoice).toBeDefined();

		await fireEvent.click(wrongChoice!);

		expect(screen.getByTestId('drill-feedback')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: REPLAY_LABEL })).toBeInTheDocument();
	});

	it('renders the replay control after a chord CONSTRUCTION answer too', async () => {
		forceConstruction();
		renderPage();

		expect(screen.getByText(/Click the notes for/)).toBeInTheDocument();

		for (const letter of F7_NOTE_LETTERS) {
			const keys = screen.getAllByRole('button', {
				name: new RegExp(`^${clickableKeyLetter(letter)} key$`)
			});
			await fireEvent.click(keys[0]);
		}
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(screen.getByTestId('drill-feedback')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: REPLAY_LABEL })).toBeInTheDocument();
	});

	it('is absent for an interval question, even after it is answered', async () => {
		forceConstruction();
		renderPage();

		await fireEvent.click(screen.getByRole('button', { name: 'Intervals' }));
		const choiceGrid = screen.getByTestId('interval-choice-grid');
		const [firstChoice] = within(choiceGrid).getAllByRole('button');
		await fireEvent.click(firstChoice);

		expect(screen.getByTestId('drill-feedback')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: REPLAY_LABEL })).not.toBeInTheDocument();
	});
});
