import { render, screen, fireEvent, cleanup, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDockRegistry, DOCK_CONTEXT_KEY } from '$lib/keyboard/dockContext.svelte';
import KeyboardDock from '$lib/components/KeyboardDock.svelte';

/**
 * Dock-registration test for Drills (Phase 15, Plan 05). Drills used to
 * render FOUR separate inline `<PianoKeyboard>` sites (construction
 * input/reveal, identification, interval identification, interval
 * construction) plus a fifth identification-reveal keyboard inside the
 * feedback block. All five collapse into ONE mode-aware `dockedKeyboard`
 * snippet registered with the shared dock on mount and cleared on unmount
 * (mirrors lookupDock.test.ts/theoryDock.test.ts/scaleKeyboardDrill.test.ts's
 * own context-injection harness: `KeyboardDock` doubles as the host that
 * renders the page's captured snippet).
 */

// The drills page fire-and-forgets every graded answer to the backend
// (PROG-01) via the tolerant practice-telemetry wrapper, and fetches stats
// on mount for the practice pool (D-02). Mocked so this suite never touches
// real fetch/localStorage.
const flushQueueMock = vi.fn();
const fetchStatsMock = vi.fn((..._args: unknown[]) => Promise.resolve({ items: [], weakest: [] }));
vi.mock('$lib/api/progress', () => ({
	flushQueue: (...args: unknown[]) => flushQueueMock(...args),
	fetchStats: (...args: unknown[]) => fetchStatsMock(...args),
	localDateString: () => '2026-07-15'
}));

vi.mock('$lib/practice/answerTelemetry', () => ({
	recordPracticeAnswer: vi.fn()
}));

// Practice-engine modules (Track B): the pool draw is mocked to pin the
// question SYMBOL deterministically, mirroring tests/drills.e2e.test.ts.
interface PoolDrawStub {
	symbol: string;
	bucket: string;
	scaffoldStage: string | null;
}
const drawFromPoolMock = vi.fn(
	(..._args: unknown[]): PoolDrawStub => ({ symbol: 'Cm7', bucket: 'tier', scaffoldStage: null })
);
const scaffoldStageForSymbolMock = vi.fn((..._args: unknown[]): string | null => null);
vi.mock('$lib/practice/pool', () => ({
	drawFromPool: (...args: unknown[]) => drawFromPoolMock(...args),
	scaffoldStageForSymbol: (...args: unknown[]) => scaffoldStageForSymbolMock(...args)
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

vi.mock('$lib/practice/songs', () => ({
	activeSongChordSymbols: (): string[] => []
}));

vi.mock('$lib/practice/scaffold', () => ({
	readScaffolds: () => ({}),
	writeScaffold: vi.fn(),
	recordScaffoldAnswer: (state: unknown) => state
}));

vi.mock('$lib/practice/drillSeeds', () => ({
	consumeDrillSeeds: (): string[] => []
}));

vi.mock('$lib/drills/rotateHint', () => ({
	isRotateHintDismissed: () => true,
	dismissRotateHint: vi.fn()
}));

const playChordMock = vi.fn();
const playNoteMock = vi.fn();
const ensureAudioReadyMock = vi.fn(async () => {});
vi.mock('$lib/audio/audio', () => ({
	playChord: (...args: unknown[]) => playChordMock(...args),
	playNote: (...args: unknown[]) => playNoteMock(...args),
	ensureAudioReady: () => ensureAudioReadyMock()
}));

const { default: DrillsPage } = await import('./drills/+page.svelte');

function renderPageWithDock() {
	const registry = createDockRegistry();
	const context = new Map([[DOCK_CONTEXT_KEY, registry]]);
	const page = render(DrillsPage, { context });
	return { registry, page, context };
}

function renderPageAndDock() {
	const { registry, page, context } = renderPageWithDock();
	const dock = render(KeyboardDock, { context });
	return { registry, page, dock };
}

/** Pins the question draw exactly like tests/drills.e2e.test.ts's forceConstructionCm7. */
function forceConstructionCm7() {
	vi.spyOn(Math, 'random').mockReturnValue(0); // family -> chord, direction -> 'construction'
}

function forceDraws(draws: number[]) {
	let call = 0;
	vi.spyOn(Math, 'random').mockImplementation(() => {
		const value = draws[Math.min(call, draws.length - 1)];
		call++;
		return value;
	});
}

/** family -> chord (0), direction -> 'identification' (0.99). */
function forceIdentificationCm7() {
	forceDraws([0, 0.99]);
}

beforeEach(() => {
	forceConstructionCm7();
	playChordMock.mockClear();
	playNoteMock.mockClear();
	ensureAudioReadyMock.mockClear();
	fetchStatsMock.mockClear();
	flushQueueMock.mockClear();
	drawFromPoolMock.mockClear();
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe('Drills docked keyboard (KBD-01/KBD-03)', () => {
	it('registers a single dock config on mount whose keyboard is a snippet function', () => {
		const { registry } = renderPageWithDock();

		expect(registry.current).not.toBeNull();
		expect(registry.current?.keyboard).toBeTypeOf('function');
	});

	it('renders no PianoKeyboard in the page document flow itself (it lives only in the dock snippet)', () => {
		renderPageWithDock();

		expect(screen.queryByRole('img', { name: /piano keyboard/i })).not.toBeInTheDocument();
	});

	it('construction (unanswered): the docked keyboard is interactive - tapping sounds via mocked playNote and toggles selection', async () => {
		renderPageAndDock();

		const cKey = screen.getAllByRole('button', { name: 'C key' })[0];
		await fireEvent.pointerDown(cKey);
		expect(playNoteMock).toHaveBeenCalledWith('C4');

		await fireEvent.click(cKey);
		expect(cKey).toHaveAttribute('aria-pressed', 'true');
	});

	it('after a wrong construction answer, the SAME docked keyboard shows target.notes with wrongLetters and becomes inspectable', async () => {
		renderPageAndDock();

		// Wrong set: missing the 7th, extra 6th (A) - Cm7 is C, E♭, G, B♭.
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'A key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		// Exactly one keyboard exists on the page (the input keyboard
		// transformed in place) - no separate correct-answer keyboard.
		const keyboards = screen.getAllByRole('img', { name: /piano keyboard/i });
		expect(keyboards).toHaveLength(1);
		const keyboard = keyboards[0];

		const wrongKeys = keyboard.querySelectorAll('.piano-keyboard__key--wrong');
		expect(wrongKeys.length).toBeGreaterThan(0);
		const highlighted = keyboard.querySelectorAll(
			'.piano-keyboard__key--root, .piano-keyboard__key--third, .piano-keyboard__key--fifth, .piano-keyboard__key--seventh'
		);
		expect(highlighted).toHaveLength(4);
	});

	it('identification: the docked keyboard is inspectable, and the post-answer reveal is the same docked element (no separate feedback-block keyboard)', async () => {
		forceIdentificationCm7();
		renderPageAndDock();

		expect(screen.getByText('Name this chord.')).toBeInTheDocument();
		const keyboardsBefore = screen.getAllByRole('img', { name: /piano keyboard/i });
		expect(keyboardsBefore).toHaveLength(1);

		const choices = screen.getAllByRole('button', { name: /^Answer: / });
		const wrongChoice = choices.find(
			(button) => button.getAttribute('aria-label') !== 'Answer: Cm7'
		);
		expect(wrongChoice).toBeDefined();
		await fireEvent.click(wrongChoice!);

		const keyboardsAfter = screen.getAllByRole('img', { name: /piano keyboard/i });
		expect(keyboardsAfter).toHaveLength(1);

		const feedback = screen.getByTestId('drill-feedback');
		expect(within(feedback).getByText('Here is the shape:')).toBeInTheDocument();

		// The single docked keyboard now carries the reveal's interval badges.
		expect(keyboardsAfter[0].querySelector('.piano-keyboard__ivbadge')).toBeInTheDocument();
	});

	it('clears its registration on unmount', () => {
		const { registry, page } = renderPageWithDock();

		expect(registry.current).not.toBeNull();
		page.unmount();

		expect(registry.current).toBeNull();
	});
});
