import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PracticePage from './practice/+page.svelte';
import { newCard, Rating } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';
import { DAILY_TARGET, answeredToday, recordDailyAnswer } from '$lib/practice/dailySession';
import { LEVEL_KEY } from '$lib/practice/levelState';

/**
 * B1: the bounded daily session. `/practice` used to compose the ENTIRE due
 * set into one round (roughly 39 items on a fresh install day one) with no
 * stated length and no early exit. These tests hold the bound in place:
 *
 * - a large due set yields a finishable round with the remainder shown, not
 *   hidden ("12 TODAY · 8 WAITING");
 * - the round asks exactly the day's question budget and never grows past it,
 *   whatever the answers are;
 * - a day resumed part-way picks up where it left off instead of restarting;
 * - a day whose target is met offers extra practice as an explicit opt-in.
 *
 * Harness mirrors tests/practice-hub.e2e.test.ts: deck/introBudget/telemetry/
 * audio mocked, practiceQueue's synthetic builders stubbed to [] so the round
 * is carded-only and its size is exactly the due-card count.
 */

const introduceNewCardsMock = vi.fn();
const getDueCardsMock = vi.fn();
const getAllCardsMock = vi.fn();
const recordGradeMock = vi.fn();
const getCardMock = vi.fn();

vi.mock('$lib/srs/deck', () => ({
	introduceNewCards: (...args: unknown[]) => introduceNewCardsMock(...args),
	getDueCards: (...args: unknown[]) => getDueCardsMock(...args),
	getAllCards: (...args: unknown[]) => getAllCardsMock(...args),
	recordGrade: (...args: unknown[]) => recordGradeMock(...args),
	getCard: (...args: unknown[]) => getCardMock(...args)
}));

vi.mock('$lib/practice/practiceQueue', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/practice/practiceQueue')>();
	return {
		...actual,
		syntheticVoicingItems: () => [],
		syntheticProgressionItems: () => [],
		syntheticInversionItems: () => [],
		syntheticChordScaleItems: () => []
	};
});

const remainingIntroBudgetMock = vi.fn();
const consumeIntroBudgetMock = vi.fn();
vi.mock('$lib/srs/introBudget', () => ({
	remainingIntroBudget: (...args: unknown[]) => remainingIntroBudgetMock(...args),
	consumeIntroBudget: (...args: unknown[]) => consumeIntroBudgetMock(...args)
}));

vi.mock('$lib/practice/answerTelemetry', () => ({
	recordPracticeAnswer: () => {}
}));

vi.mock('$lib/audio/audio', () => ({
	playChord: () => {},
	playNote: () => {},
	ensureAudioReady: async () => undefined,
	soundEnabled: () => false,
	studyModeEnabled: () => false,
	playArpeggio: () => {}
}));

const NOW = new Date('2026-07-25T12:00:00Z');

/** 20 distinct chord-formula facts from the real catalog (ROOTS x QUALITY_SUFFIXES). */
const TWENTY_SYMBOLS = [
	'C',
	'Cm',
	'Cdim',
	'Cmaj7',
	'Cm7',
	'C7',
	'Cm7b5',
	'Cdim7',
	'D',
	'Dm',
	'Dmaj7',
	'Dm7',
	'D7',
	'E',
	'Em',
	'Emaj7',
	'Em7',
	'E7',
	'F',
	'Fm'
];

function makeChordCard(symbol: string): CardRecord {
	return {
		...newCard(NOW),
		factId: `chord-formula:${symbol}`,
		factKind: 'chord-formula',
		mode: 'formula',
		lastRating: null,
		masteryDayCount: 0
	};
}

/** Answers whichever name-it question is on screen by taking the first offered choice, then Next. */
async function answerCurrentQuestion(): Promise<void> {
	const choices = screen.getAllByRole('button', { name: /^Answer: / });
	await fireEvent.click(choices[0]);
	await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
}

/**
 * Answers questions until the end card appears, returning how many questions
 * the round actually asked. The generous guard proves termination rather than
 * masking a runaway round: a round that grew would blow past it and fail on
 * the count assertion.
 */
async function playRoundToEnd(guard = 60): Promise<number> {
	let questions = 0;
	while (questions < guard && screen.queryByTestId('session-end-card') === null) {
		await answerCurrentQuestion();
		questions += 1;
	}
	return questions;
}

async function startRound(): Promise<void> {
	await screen.findByTestId('practice-pre-start');
	await fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));
}

beforeEach(() => {
	localStorage.clear();
	introduceNewCardsMock.mockReset();
	getDueCardsMock.mockReset();
	getAllCardsMock.mockReset().mockResolvedValue([]);
	recordGradeMock.mockReset();
	recordGradeMock.mockImplementation(async (card: CardRecord, rating: Rating) => ({
		...card,
		lastRating: rating
	}));
	getCardMock.mockReset().mockResolvedValue(undefined);
	remainingIntroBudgetMock.mockReset().mockReturnValue(0);
	consumeIntroBudgetMock.mockReset();
});

afterEach(() => {
	vi.restoreAllMocks();
	localStorage.clear();
});

describe('B1: a large due set becomes a finishable round with the remainder shown', () => {
	beforeEach(() => {
		getDueCardsMock.mockResolvedValue(TWENTY_SYMBOLS.map(makeChordCard));
	});

	it('splits the pre-start register honestly instead of announcing the whole backlog', async () => {
		render(PracticePage);
		await screen.findByTestId('practice-pre-start');

		const register = screen.getByTestId('practice-due-register');
		expect(register).toHaveTextContent(`${DAILY_TARGET} TODAY`);
		expect(register).toHaveTextContent(`${20 - DAILY_TARGET} WAITING`);
		// The old unbounded line must be gone: the round is NOT the whole due set.
		expect(register).not.toHaveTextContent('20 CARDS DUE TODAY');
	});

	it('opens the in-session register at the round size, not the backlog size', async () => {
		render(PracticePage);
		await startRound();
		expect(screen.getByTestId('practice-register')).toHaveTextContent(`${DAILY_TARGET} LEFT`);
	});

	it('asks exactly the day target and stops, however the answers land', async () => {
		render(PracticePage);
		await startRound();

		const questions = await playRoundToEnd();

		expect(questions).toBe(DAILY_TARGET);
		expect(screen.getByTestId('session-end-card')).toBeInTheDocument();
		// The round cannot grow while the user works: a missed item is re-asked
		// inside the round (a spent slot), never appended as an extra question.
		expect(answeredToday()).toBe(DAILY_TARGET);
	});

	it('never reports more questions left than the round has budget for', async () => {
		render(PracticePage);
		await startRound();

		let previous = Number.POSITIVE_INFINITY;
		while (screen.queryByTestId('session-end-card') === null) {
			const text = screen.getByTestId('practice-register').textContent ?? '';
			const left = Number(/(\d+) LEFT/.exec(text)?.[1] ?? '-1');
			expect(left).toBeGreaterThanOrEqual(0);
			expect(left).toBeLessThanOrEqual(previous);
			previous = left;
			await answerCurrentQuestion();
		}
		expect(previous).toBeLessThanOrEqual(DAILY_TARGET);
	});
});

describe('B1: a small due set is not padded up to the target', () => {
	it('keeps the pre-existing "N CARDS DUE TODAY" line when the round IS the whole due set', async () => {
		getDueCardsMock.mockResolvedValue(TWENTY_SYMBOLS.slice(0, 3).map(makeChordCard));
		render(PracticePage);
		await screen.findByTestId('practice-pre-start');

		const register = screen.getByTestId('practice-due-register');
		expect(register).toHaveTextContent('3 CARDS DUE TODAY');
		expect(register).not.toHaveTextContent('WAITING');
	});
});

describe('the quiet tier line on the pre-start card (ml-practice-variety)', () => {
	it('names the tier the round draws new material from, and nothing more', async () => {
		localStorage.setItem(LEVEL_KEY, JSON.stringify({ currentTier: 2, unlockedTiers: [1, 2] }));
		getDueCardsMock.mockResolvedValue(TWENTY_SYMBOLS.slice(0, 3).map(makeChordCard));
		render(PracticePage);
		await screen.findByTestId('practice-pre-start');

		expect(screen.getByTestId('practice-tier-line')).toHaveTextContent('TIER 2 · All-key triads');
	});

	it('defaults to tier 1 on a fresh device', async () => {
		getDueCardsMock.mockResolvedValue(TWENTY_SYMBOLS.slice(0, 3).map(makeChordCard));
		render(PracticePage);
		await screen.findByTestId('practice-pre-start');

		expect(screen.getByTestId('practice-tier-line')).toHaveTextContent('TIER 1 · White-key triads');
	});
});

describe('B1: a part-spent day resumes instead of restarting', () => {
	it('reads "{done} of {target} done today" and rounds down to what is left', async () => {
		getDueCardsMock.mockResolvedValue(TWENTY_SYMBOLS.map(makeChordCard));
		for (let i = 0; i < 5; i++) recordDailyAnswer({ correct: true });

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');

		const register = screen.getByTestId('practice-due-register');
		expect(register).toHaveTextContent(`5 OF ${DAILY_TARGET} DONE TODAY`);
		expect(register).toHaveTextContent(`${DAILY_TARGET - 5} TO GO`);

		await fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));
		expect(screen.getByTestId('practice-register')).toHaveTextContent(
			`${DAILY_TARGET - 5} LEFT`
		);

		const questions = await playRoundToEnd();
		expect(questions).toBe(DAILY_TARGET - 5);
	});
});

describe('B1: past the target, more practice is an explicit opt-in', () => {
	it('re-entry on a met day says the day is done, shows what waits, and offers Keep going', async () => {
		getDueCardsMock.mockResolvedValue(TWENTY_SYMBOLS.map(makeChordCard));
		for (let i = 0; i < DAILY_TARGET; i++) recordDailyAnswer({ correct: true });

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');

		const register = screen.getByTestId('practice-due-register');
		expect(register).toHaveTextContent("TODAY'S PRACTICE IS DONE");
		expect(register).toHaveTextContent('20 WAITING');
		expect(screen.queryByRole('button', { name: 'Start practice' })).not.toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Keep going' }));
		await screen.findByTestId('practice-register');
		// The extra round is bounded too, at a fresh DAILY_TARGET of its own.
		expect(screen.getByTestId('practice-register')).toHaveTextContent(`${DAILY_TARGET} LEFT`);
	});

	it('a finished round leaves the day marked, so a remount does not start a second full round', async () => {
		getDueCardsMock.mockResolvedValue(TWENTY_SYMBOLS.map(makeChordCard));

		render(PracticePage);
		await startRound();
		await playRoundToEnd();

		cleanup();
		render(PracticePage);
		await screen.findByTestId('practice-pre-start');
		expect(screen.getByTestId('practice-due-register')).toHaveTextContent(
			"TODAY'S PRACTICE IS DONE"
		);
	});
});
