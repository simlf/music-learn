import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PracticePage from './practice/+page.svelte';
import { newCard, Rating } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';
import {
	DAILY_TARGET,
	isDoneToday,
	localDay,
	recordDailyAnswer
} from '$lib/practice/dailySession';
import { PRACTICE_DAYS_KEY } from '$lib/practice/practiceDays';

/**
 * B2: an honest, closable end card. Before this the card said "ROUND
 * COMPLETE", a fraction, a best run and the misses, and never said the one
 * thing that ends a session: you are done for today. "Done" was only
 * discoverable by draining the whole due set, tapping "Run it again" and
 * reading the nothing-due empty state.
 *
 * Covered here: the persisted done flag, the three end-card shapes (target met
 * with extra available / deck genuinely clear / a day the ledger cannot call
 * done), and that the card never nags.
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
		syntheticInversionItems: () => []
	};
});

const remainingIntroBudgetMock = vi.fn();
vi.mock('$lib/srs/introBudget', () => ({
	remainingIntroBudget: (...args: unknown[]) => remainingIntroBudgetMock(...args),
	consumeIntroBudget: () => {}
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

vi.mock('$lib/api/progress', () => ({
	localDateString: () => localDay(new Date()),
	recordAnswer: () => {}
}));

/** Local calendar date `daysAgo` days before today, in practiceDays' YYYY-MM-DD shape. */
function dayOffset(daysAgo: number): string {
	const now = new Date();
	return localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo));
}

/** Seeds the device practice-day set the streak is derived from (owned by practiceDays.ts). */
function seedPracticeDays(days: string[]): void {
	localStorage.setItem(PRACTICE_DAYS_KEY, JSON.stringify(days));
}

const NOW = new Date('2026-07-25T12:00:00Z');

const SYMBOLS = [
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

async function answerCurrentQuestion(): Promise<void> {
	const choices = screen.getAllByRole('button', { name: /^Answer: / });
	await fireEvent.click(choices[0]);
	await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
}

/** Answers a known single-card round CORRECTLY, so the queue actually empties. */
async function answerCorrectly(symbol: string): Promise<void> {
	await fireEvent.click(screen.getByRole('button', { name: `Answer: ${symbol}` }));
	await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
}

async function playRoundToEnd(guard = 60): Promise<void> {
	let questions = 0;
	while (questions < guard && screen.queryByTestId('session-end-card') === null) {
		await answerCurrentQuestion();
		questions += 1;
	}
	await screen.findByTestId('session-end-card');
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
});

afterEach(() => {
	vi.restoreAllMocks();
	localStorage.clear();
});

describe('B2: target met with more work available', () => {
	beforeEach(() => {
		getDueCardsMock.mockResolvedValue(SYMBOLS.map(makeChordCard));
	});

	it('says the day is done, then offers the remainder as an option', async () => {
		render(PracticePage);
		await startRound();
		await playRoundToEnd();

		const card = screen.getByTestId('session-end-card');
		expect(card).toHaveTextContent("That's today's practice done.");
		expect(screen.getByTestId('practice-end-card-remainder')).toHaveTextContent(
			'are ready if you want them'
		);
		expect(screen.getByRole('button', { name: 'Keep going' })).toBeInTheDocument();
	});

	it('persists the done flag, so the state survives leaving the page', async () => {
		render(PracticePage);
		await startRound();
		await playRoundToEnd();
		expect(isDoneToday()).toBe(true);

		cleanup();
		render(PracticePage);
		await screen.findByTestId('practice-pre-start');
		expect(screen.getByTestId('practice-due-register')).toHaveTextContent(
			"TODAY'S PRACTICE IS DONE"
		);
	});

	it('Keep going opens another bounded round rather than an unbounded one', async () => {
		render(PracticePage);
		await startRound();
		await playRoundToEnd();

		await fireEvent.click(screen.getByRole('button', { name: 'Keep going' }));
		await screen.findByTestId('practice-register');
		expect(screen.getByTestId('practice-register')).toHaveTextContent(`${DAILY_TARGET} LEFT`);
	});

	it('never replaces the honest total with a nagging one: no "Run it again" dead end', async () => {
		render(PracticePage);
		await startRound();
		await playRoundToEnd();
		expect(screen.queryByRole('button', { name: 'Run it again' })).not.toBeInTheDocument();
	});
});

describe('B2: the whole due queue genuinely empty', () => {
	beforeEach(() => {
		getDueCardsMock.mockResolvedValue([makeChordCard('Cm7')]);
	});

	it('says the deck is clear and offers no continuation at all', async () => {
		render(PracticePage);
		await startRound();
		await answerCorrectly('Cm7');

		const card = screen.getByTestId('session-end-card');
		expect(card).toHaveTextContent("That's today's practice done.");
		expect(screen.getByTestId('practice-end-card-remainder')).toHaveTextContent(
			'Nothing else is waiting today.'
		);
		expect(screen.queryByRole('button', { name: 'Keep going' })).not.toBeInTheDocument();
	});

	it('counts a short day as done even though the target was never reached (never scolds)', async () => {
		render(PracticePage);
		await startRound();
		await answerCorrectly('Cm7');

		expect(isDoneToday()).toBe(true);
		const card = screen.getByTestId('session-end-card');
		// No "3 of 12" shortfall framing anywhere on the card.
		expect(card).not.toHaveTextContent(`of ${DAILY_TARGET}`);
		expect(card).not.toHaveTextContent('still waiting');
	});
});

describe('B2: a round the day ledger cannot call done', () => {
	it('reports the round and claims nothing about the day', async () => {
		// A day already at the target, re-entered as an extra round, with the
		// ledger then wiped mid-round: the card must not claim "done" on
		// evidence it no longer has.
		getDueCardsMock.mockResolvedValue(SYMBOLS.map(makeChordCard));
		for (let i = 0; i < DAILY_TARGET; i++) recordDailyAnswer({ correct: true });

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');
		await fireEvent.click(screen.getByRole('button', { name: 'Keep going' }));
		await screen.findByTestId('practice-register');

		// Simulate storage that stops recording (quota exceeded / blocked).
		const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('quota');
		});
		localStorage.clear();
		try {
			await playRoundToEnd();
		} finally {
			setItem.mockRestore();
		}

		expect(screen.getByTestId('practice-end-card-done')).toHaveTextContent('still waiting');
		expect(screen.getByTestId('session-end-card')).not.toHaveTextContent(
			"That's today's practice done."
		);
		expect(screen.queryByTestId('practice-end-card-remainder')).not.toBeInTheDocument();
	});
});

describe('B2: the streak lands on the card when it is earned', () => {
	beforeEach(() => {
		getDueCardsMock.mockResolvedValue([makeChordCard('Cm7')]);
	});

	it('shows the run the device actually recorded, with no token and no network', async () => {
		seedPracticeDays([dayOffset(2), dayOffset(1), dayOffset(0)]);

		render(PracticePage);
		await startRound();
		await answerCorrectly('Cm7');

		const line = await screen.findByTestId('practice-end-card-day-streak');
		expect(line.textContent).toContain('3');
	});

	/**
	 * These three used to assert what happens when today's own practice has NOT
	 * been credited to the practice-day set: a run through yesterday read as 2, an
	 * empty set read as 0 and hid the line, and a lapsed run also hid it.
	 *
	 * That state is no longer reachable from a completed round. T13 item 5 records
	 * the day inside the host's own `finishItem`, the one choke point every graded
	 * answer of every family passes through, because the day used to be written
	 * only inside api/progress.recordAnswer - which the three SYNTHETIC families
	 * never reach, since they deliberately post no server telemetry. A
	 * synthetic-only round was real practice the streak never saw.
	 *
	 * So a graded answer now always credits today, and the streak on the end card
	 * always includes the session that just produced it. (In production the CARDED
	 * path already did this through real answerTelemetry -> recordAnswer; these
	 * tests mock that module out, which is why they could previously observe a
	 * state the app itself never showed.)
	 */
	it('credits today, so an in-progress run is extended rather than reported short', async () => {
		seedPracticeDays([dayOffset(2), dayOffset(1)]);

		render(PracticePage);
		await startRound();
		await answerCorrectly('Cm7');

		const line = await screen.findByTestId('practice-end-card-day-streak');
		expect(line.textContent).toContain('3');
	});

	it('earns a one-day run from nothing: the round itself starts the streak', async () => {
		seedPracticeDays([]);

		render(PracticePage);
		await startRound();
		await answerCorrectly('Cm7');

		const line = await screen.findByTestId('practice-end-card-day-streak');
		expect(line.textContent).toContain('1');
	});

	it('restarts at one after a lapse rather than reporting the gap', async () => {
		seedPracticeDays([dayOffset(9), dayOffset(8), dayOffset(7)]);

		render(PracticePage);
		await startRound();
		await answerCorrectly('Cm7');

		const line = await screen.findByTestId('practice-end-card-day-streak');
		expect(line.textContent).toContain('1');
		// The old, lapsed run is not resurrected.
		expect(line.textContent).not.toContain('3');
	});
});
