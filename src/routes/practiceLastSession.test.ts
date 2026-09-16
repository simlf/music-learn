import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PracticePage from './practice/+page.svelte';
import { newCard } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';
import { DAILY_SESSION_KEY, emptyDay, type DaySummary } from '$lib/practice/dailySession';

/**
 * B5: the last session is visible at the moment the user decides whether to
 * start. The Practice hub showed nothing about it at all; the only history
 * lived two taps deep in Progress, which is the wrong place for a re-entry
 * cue.
 *
 * The line names only misses that are actually in the round about to be
 * played, so it makes a promise the session keeps, and it stays a cue rather
 * than a report card: a session that scored nothing shows no score line.
 */

const introduceNewCardsMock = vi.fn();
const getDueCardsMock = vi.fn();
const getAllCardsMock = vi.fn();

vi.mock('$lib/srs/deck', () => ({
	introduceNewCards: (...args: unknown[]) => introduceNewCardsMock(...args),
	getDueCards: (...args: unknown[]) => getDueCardsMock(...args),
	getAllCards: (...args: unknown[]) => getAllCardsMock(...args),
	recordGrade: async (card: CardRecord) => card,
	getCard: async () => undefined
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

vi.mock('$lib/srs/introBudget', () => ({
	remainingIntroBudget: () => 0,
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
	fetchStreak: async () => {
		throw new Error('offline');
	},
	localDateString: () => '2026-07-28',
	recordAnswer: () => {}
}));

const NOW = new Date('2026-07-25T12:00:00Z');

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

/** Local calendar date `daysAgo` days before today, in the store's own YYYY-MM-DD shape. */
function dayOffset(daysAgo: number): string {
	const now = new Date();
	const shifted = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
	const month = String(shifted.getMonth() + 1).padStart(2, '0');
	const day = String(shifted.getDate()).padStart(2, '0');
	return `${shifted.getFullYear()}-${month}-${day}`;
}

/** Seeds a finished previous-day ledger directly, as if that day had been practised. */
function seedPreviousDay(previous: Partial<DaySummary> & { date: string }): void {
	const record: DaySummary = { ...emptyDay(previous.date), ...previous };
	localStorage.setItem(DAILY_SESSION_KEY, JSON.stringify({ previous: record }));
}

beforeEach(() => {
	localStorage.clear();
	introduceNewCardsMock.mockReset();
	getDueCardsMock.mockReset().mockResolvedValue([makeChordCard('Dm7'), makeChordCard('G7')]);
	getAllCardsMock.mockReset().mockResolvedValue([]);
});

afterEach(() => {
	vi.restoreAllMocks();
	localStorage.clear();
});

describe('B5: yesterday on the pre-start card', () => {
	it('reports yesterday score and best run before the session starts', async () => {
		seedPreviousDay({ date: dayOffset(1), answered: 12, correct: 10, bestStreak: 7 });

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');

		const cue = screen.getByTestId('practice-last-session');
		expect(cue).toHaveTextContent('Yesterday: 10 right, best run 7.');
	});

	it('names the misses that are actually in the round about to be played', async () => {
		seedPreviousDay({
			date: dayOffset(1),
			answered: 12,
			correct: 9,
			bestStreak: 4,
			missed: ['Dm7', 'G7']
		});

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');

		const cue = screen.getByTestId('practice-last-session');
		expect(cue).toHaveTextContent('Coming back today: Dm7, G7.');
	});

	it('omits a miss that today is not going to ask about', async () => {
		seedPreviousDay({
			date: dayOffset(1),
			answered: 12,
			correct: 9,
			bestStreak: 4,
			missed: ['Dm7', 'Abm7b5']
		});

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');

		const cue = screen.getByTestId('practice-last-session');
		expect(cue).toHaveTextContent('Coming back today: Dm7.');
		expect(cue).not.toHaveTextContent('Abm7b5');
	});

	it('drops the "yesterday" claim when the last session was not yesterday', async () => {
		seedPreviousDay({ date: dayOffset(5), answered: 12, correct: 11, bestStreak: 6 });

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');

		const cue = screen.getByTestId('practice-last-session');
		expect(cue).toHaveTextContent('Last run: 11 right, best run 6.');
		expect(cue).not.toHaveTextContent('Yesterday');
	});

	it('shows nothing at all on a first-ever visit', async () => {
		render(PracticePage);
		await screen.findByTestId('practice-pre-start');
		expect(screen.queryByTestId('practice-last-session')).not.toBeInTheDocument();
	});

	it('suppresses the score line for a session that scored nothing (a cue, not a report card)', async () => {
		seedPreviousDay({
			date: dayOffset(1),
			answered: 3,
			correct: 0,
			bestStreak: 0,
			missed: ['Dm7']
		});

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');

		const cue = screen.getByTestId('practice-last-session');
		expect(cue).not.toHaveTextContent('right');
		expect(cue).not.toHaveTextContent('0');
		// The useful half of the cue still shows.
		expect(cue).toHaveTextContent('Coming back today: Dm7.');
	});

	it('is a pre-start cue only: it does not follow the user into the round', async () => {
		seedPreviousDay({ date: dayOffset(1), answered: 12, correct: 10, bestStreak: 7 });

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');
		await fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));

		expect(screen.queryByTestId('practice-last-session')).not.toBeInTheDocument();
	});
});
