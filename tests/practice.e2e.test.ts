import { render, screen, fireEvent, within } from '@testing-library/svelte';
import { readable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DrillsPage from '../src/routes/drills/+page.svelte';

// Practice-flow page tests (Track B): micro-session counter, end card,
// unlock suggestion at the round boundary, warm-up tags, and scaffolding.
// Same mock architecture as tests/drills.e2e.test.ts: the pool and the
// persistence modules are mocked (deterministic symbols, no localStorage),
// the session module runs REAL.

vi.mock('$app/stores', () => ({
	page: readable({ url: new URL('http://localhost/drills') })
}));

const flushQueueMock = vi.fn();
const fetchStatsMock = vi.fn((..._args: unknown[]) =>
	Promise.resolve({ items: [], weakest: [] })
);
vi.mock('$lib/api/progress', () => ({
	flushQueue: (...args: unknown[]) => flushQueueMock(...args),
	fetchStats: (...args: unknown[]) => fetchStatsMock(...args),
	localDateString: () => '2026-07-14'
}));

const recordPracticeAnswerMock = vi.fn();
vi.mock('$lib/practice/answerTelemetry', () => ({
	recordPracticeAnswer: (...args: unknown[]) => recordPracticeAnswerMock(...args)
}));

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

const recentMissesMock = vi.fn((..._args: unknown[]): string[] => []);
const appendPracticeAnswerMock = vi.fn();
vi.mock('$lib/practice/practiceLog', () => ({
	recentMisses: (...args: unknown[]) => recentMissesMock(...args),
	appendPracticeAnswer: (...args: unknown[]) => appendPracticeAnswerMock(...args),
	readPracticeLog: () => [],
	practiceDaysSince: () => 99
}));

const notEligible = {
	tier: 1,
	nextTier: 2 as const,
	eligible: false,
	rollingAccuracy: 0,
	rollingCount: 0,
	lifetimeAttempts: 0,
	distinctDays: 0,
	perQuality: []
};
const checkUnlockMock = vi.fn((..._args: unknown[]) => notEligible);
const setCurrentTierMock = vi.fn((..._args: unknown[]) => ({
	currentTier: 2,
	unlockedTiers: [1, 2]
}));
const snoozeSuggestionMock = vi.fn((..._args: unknown[]) => ({
	currentTier: 1,
	unlockedTiers: [1]
}));
const isSnoozedMock = vi.fn((..._args: unknown[]) => false);
vi.mock('$lib/practice/levelState', () => ({
	getLevelState: () => ({ currentTier: 1, unlockedTiers: [1] }),
	checkUnlock: (...args: unknown[]) => checkUnlockMock(...args),
	isSnoozed: (...args: unknown[]) => isSnoozedMock(...args),
	setCurrentTier: (...args: unknown[]) => setCurrentTierMock(...args),
	snoozeSuggestion: (...args: unknown[]) => snoozeSuggestionMock(...args)
}));

vi.mock('$lib/practice/songs', () => ({
	activeSongChordSymbols: (): string[] => [],
	listSongs: (): unknown[] => []
}));

const writeScaffoldMock = vi.fn();
vi.mock('$lib/practice/scaffold', () => ({
	readScaffolds: () => ({}),
	writeScaffold: (...args: unknown[]) => writeScaffoldMock(...args),
	recordScaffoldAnswer: (state: unknown) => state
}));

const consumeDrillSeedsMock = vi.fn((..._args: unknown[]): string[] => []);
vi.mock('$lib/practice/drillSeeds', () => ({
	consumeDrillSeeds: (...args: unknown[]) => consumeDrillSeedsMock(...args),
	consumeLessonSeeds: (): string[] => []
}));

vi.mock('$lib/drills/rotateHint', () => ({
	isRotateHintDismissed: () => true,
	dismissRotateHint: vi.fn()
}));

beforeEach(() => {
	vi.spyOn(Math, 'random').mockReturnValue(0.99); // every kind draw -> identification
	recordPracticeAnswerMock.mockClear();
	appendPracticeAnswerMock.mockClear();
	drawFromPoolMock
		.mockReset()
		.mockReturnValue({ symbol: 'Cm7', bucket: 'tier', scaffoldStage: null });
	scaffoldStageForSymbolMock.mockReset().mockReturnValue(null);
	recentMissesMock.mockReset().mockReturnValue([]);
	consumeDrillSeedsMock.mockReset().mockReturnValue([]);
	checkUnlockMock.mockReset().mockReturnValue(notEligible);
	isSnoozedMock.mockReset().mockReturnValue(false);
	setCurrentTierMock.mockClear();
	snoozeSuggestionMock.mockClear();
});

afterEach(() => {
	vi.restoreAllMocks();
});

/**
 * Renders the drills page and switches to the CHORDS deck (Track C
 * integration merge): these scenarios pin chord flows, and the CHORDS mode
 * consumes no MIX family draw, so the constant Math.random keeps steering
 * only pickQuestionType's direction draw exactly as before the mode row
 * existed. Session-sourced first questions (warm-up, seeds) are unaffected
 * by the click: they never re-deal and never consumed a family draw.
 */
async function renderChordsDeck() {
	// Drills' keyboard renders inline in the page's own content flow, so a
	// plain page render puts the keyboard/keys in the document screen queries.
	render(DrillsPage);
	await fireEvent.click(screen.getByRole('button', { name: 'Chords' }));
}

/** Answers the current identification question correctly (Cm7 from the pool mock). */
async function answerCorrect() {
	await fireEvent.click(screen.getByRole('button', { name: 'Answer: Cm7' }));
}

/** Answers the current identification question wrong (any non-Cm7 choice). */
async function answerWrong() {
	const choices = screen.getAllByRole('button', { name: /^Answer: / });
	const wrong = choices.find((button) => button.getAttribute('aria-label') !== 'Answer: Cm7');
	expect(wrong).toBeDefined();
	await fireEvent.click(wrong!);
}

async function clickNext() {
	await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
}

/** Plays a full 10-question round (all correct unless wrongAt indexes given). */
async function playRound(wrongAt: number[] = []) {
	for (let i = 0; i < 10; i++) {
		if (wrongAt.includes(i)) {
			await answerWrong();
		} else {
			await answerCorrect();
		}
		await clickNext();
	}
}

describe('micro-session counter', () => {
	it('the score register reads 1 OF 10 on load and advances after an answer', async () => {
		await renderChordsDeck();
		expect(screen.getByTestId('score-register')).toHaveTextContent('1 OF 10');

		await answerCorrect();
		await clickNext();
		expect(screen.getByTestId('score-register')).toHaveTextContent('2 OF 10');
	});
});

describe('end card at the round boundary', () => {
	it('a clean 10-question round ends on a stamp card with the score and no miss list', async () => {
		await renderChordsDeck();
		await playRound();

		const endCard = screen.getByTestId('session-end-card');
		expect(endCard).toHaveTextContent('ROUND COMPLETE');
		expect(endCard).toHaveTextContent('10 / 10');
		expect(within(endCard).getByTestId('end-card-streak')).toHaveTextContent(
			'BEST RUN: 10 IN A ROW'
		);
		expect(within(endCard).queryByTestId('end-card-misses')).not.toBeInTheDocument();
		// The drill card is replaced, not stacked.
		expect(screen.queryByTestId('drill-card')).not.toBeInTheDocument();
	});

	it('missed items are re-listed and tappable to seed a redrill round', async () => {
		await renderChordsDeck();
		await playRound([0]);

		const endCard = screen.getByTestId('session-end-card');
		const missChip = within(endCard).getByRole('button', { name: 'Redrill Cm7' });
		await fireEvent.click(missChip);

		// A fresh seeded round starts on question 1 with the seeded tag.
		expect(screen.getByTestId('drill-card')).toBeInTheDocument();
		expect(screen.getByTestId('score-register')).toHaveTextContent('1 OF 10');
		expect(screen.getByTestId('question-source-tag')).toHaveTextContent('FROM YOUR WEAK LIST');
	});

	it('Run it again starts a fresh round', async () => {
		await renderChordsDeck();
		await playRound();

		await fireEvent.click(screen.getByRole('button', { name: 'Run it again' }));

		expect(screen.getByTestId('drill-card')).toBeInTheDocument();
		expect(screen.getByTestId('score-register')).toHaveTextContent('1 OF 10');
	});
});

describe('unlock suggestion card (round boundary only, dismissible)', () => {
	const eligible = {
		tier: 1,
		nextTier: 2 as const,
		eligible: true,
		rollingAccuracy: 26 / 30,
		rollingCount: 30,
		lifetimeAttempts: 55,
		distinctDays: 3,
		perQuality: []
	};

	it('never appears mid-round, appears on the end card when eligible', async () => {
		checkUnlockMock.mockReturnValue(eligible);
		await renderChordsDeck();

		await answerCorrect();
		expect(screen.queryByTestId('unlock-card')).not.toBeInTheDocument();
		await clickNext();

		// The remaining 9 questions complete the round.
		for (let i = 0; i < 9; i++) {
			await answerCorrect();
			await clickNext();
		}

		const endCard = screen.getByTestId('session-end-card');
		const unlockCard = within(endCard).getByTestId('unlock-card');
		expect(unlockCard).toHaveTextContent('TIER 2 LOOKS READY');
		expect(unlockCard).toHaveTextContent('87% correct across 3 days');
	});

	it('Unlock Tier 2 applies the manual override and dismisses the card', async () => {
		checkUnlockMock.mockReturnValue(eligible);
		await renderChordsDeck();
		await playRound();

		await fireEvent.click(screen.getByRole('button', { name: 'Unlock Tier 2' }));

		expect(setCurrentTierMock).toHaveBeenCalledWith(2);
		expect(screen.queryByTestId('unlock-card')).not.toBeInTheDocument();
	});

	it('Not yet snoozes the suggestion and dismisses the card', async () => {
		checkUnlockMock.mockReturnValue(eligible);
		await renderChordsDeck();
		await playRound();

		await fireEvent.click(screen.getByRole('button', { name: 'Not yet' }));

		expect(snoozeSuggestionMock).toHaveBeenCalledWith(2, '2026-07-14');
		expect(screen.queryByTestId('unlock-card')).not.toBeInTheDocument();
	});

	it('stays hidden while snoozed even when criteria pass', async () => {
		checkUnlockMock.mockReturnValue(eligible);
		isSnoozedMock.mockReturnValue(true);
		await renderChordsDeck();
		await playRound();

		expect(screen.getByTestId('session-end-card')).toBeInTheDocument();
		expect(screen.queryByTestId('unlock-card')).not.toBeInTheDocument();
	});

	it('stays hidden when not eligible', async () => {
		await renderChordsDeck();
		await playRound();

		expect(screen.queryByTestId('unlock-card')).not.toBeInTheDocument();
	});
});

describe('warm-up queue (recent misses first)', () => {
	it('the first question comes from recent misses with the warm-up tag', async () => {
		recentMissesMock.mockReturnValue(['G7', 'F7']);
		await renderChordsDeck();

		expect(screen.getByTestId('question-source-tag')).toHaveTextContent('BACK FOR ANOTHER GO');
		expect(screen.getByRole('button', { name: 'Answer: G7' })).toBeInTheDocument();
		// The pool was not consulted for a warm-up question.
		expect(drawFromPoolMock).not.toHaveBeenCalled();
	});
});

describe('delayed retry inside the round', () => {
	it('a missed symbol comes back with the retry tag a few questions later', async () => {
		// Distinct pool symbols so the retry is distinguishable from the draw.
		const symbols = ['G7', 'Dm7', 'Em7', 'Fmaj7', 'Am7', 'Bm7b5', 'C', 'Dm', 'Em', 'F'];
		let call = 0;
		drawFromPoolMock.mockImplementation(() => ({
			symbol: symbols[Math.min(call++, symbols.length - 1)],
			bucket: 'tier',
			scaffoldStage: null
		}));
		await renderChordsDeck();

		// Miss question 1 (G7). Math.random 0.99 -> retry gap 4: due at index 4.
		const choices = screen.getAllByRole('button', { name: /^Answer: / });
		const wrong = choices.find((button) => button.getAttribute('aria-label') !== 'Answer: G7');
		expect(wrong).toBeDefined();
		await fireEvent.click(wrong!);
		await clickNext();

		for (let i = 0; i < 3; i++) {
			const tag = screen.queryByTestId('question-source-tag');
			expect(tag).not.toBeInTheDocument();
			const correct = screen
				.getAllByRole('button', { name: /^Answer: / })
				.find((button) => button.getAttribute('aria-label') === `Answer: ${symbols[i + 1]}`);
			expect(correct).toBeDefined();
			await fireEvent.click(correct!);
			await clickNext();
		}

		// Question index 4: the missed G7 returns as a retry.
		expect(screen.getByTestId('question-source-tag')).toHaveTextContent('ONE MORE TIME');
		expect(screen.getByRole('button', { name: 'Answer: G7' })).toBeInTheDocument();
	});
});

describe('scaffolding UI (above-tier song chords)', () => {
	it('formula-first: forced construction with the formula card, graded as assisted', async () => {
		drawFromPoolMock.mockReturnValue({
			symbol: 'F#m7b5',
			bucket: 'song',
			scaffoldStage: 'formula-first'
		});
		scaffoldStageForSymbolMock.mockReturnValue('formula-first');
		await renderChordsDeck();

		// Forced construction despite the 0.99 identification kind draw.
		expect(screen.getByText('Click the notes for F#m7b5.')).toBeInTheDocument();
		const card = screen.getByTestId('scaffold-card');
		expect(card).toHaveTextContent('NEW CHORD. FORMULA FIRST.');
		expect(card).toHaveTextContent('This one counts as assisted.');

		// Grade it (wrong is fine): the log entry is marked assisted.
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(appendPracticeAnswerMock).toHaveBeenCalledWith(
			expect.objectContaining({ item: 'F#m7b5', assisted: true })
		);
		expect(writeScaffoldMock).toHaveBeenCalled();
	});

	it('hinted construction: Show formula reveals the formula and marks the answer assisted', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0); // kind -> construction
		drawFromPoolMock.mockReturnValue({
			symbol: 'F#m7b5',
			bucket: 'song',
			scaffoldStage: 'hinted'
		});
		scaffoldStageForSymbolMock.mockReturnValue('hinted');
		await renderChordsDeck();

		expect(screen.queryByTestId('scaffold-card')).not.toBeInTheDocument();
		const hintButton = screen.getByRole('button', { name: 'Show formula' });
		await fireEvent.click(hintButton);

		expect(screen.getByTestId('hint-formula')).toBeInTheDocument();

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(appendPracticeAnswerMock).toHaveBeenCalledWith(
			expect.objectContaining({ item: 'F#m7b5', assisted: true })
		);
	});

	it('hinted construction answered cold (no hint) stays unassisted', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0);
		drawFromPoolMock.mockReturnValue({
			symbol: 'F#m7b5',
			bucket: 'song',
			scaffoldStage: 'hinted'
		});
		scaffoldStageForSymbolMock.mockReturnValue('hinted');
		await renderChordsDeck();

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(appendPracticeAnswerMock).toHaveBeenCalledWith(
			expect.objectContaining({ item: 'F#m7b5', assisted: false })
		);
	});
});

describe('Drill-these seeds from the Progress page', () => {
	it('consumed seeds lead the session with the seeded tag', async () => {
		consumeDrillSeedsMock.mockReturnValue(['Bm7b5', 'E7']);
		await renderChordsDeck();

		expect(screen.getByTestId('question-source-tag')).toHaveTextContent('FROM YOUR WEAK LIST');
		expect(screen.getByRole('button', { name: 'Answer: Bm7b5' })).toBeInTheDocument();
	});
});
