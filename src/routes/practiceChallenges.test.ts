import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PracticePage from './practice/+page.svelte';
import { newCard, Rating } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';
import { answeredToday } from '$lib/practice/dailySession';
import { LEVEL_KEY } from '$lib/practice/levelState';
import { TIER_SEEN_KEY } from '$lib/practice/tierPath';
import { challengeOrder } from '$lib/practice/challenges';
import { itemsForTier } from '$lib/practice/tiers';

/**
 * The /practice game layer (ml-practice-game): the tier path on the
 * pre-start card, the challenge cards beside the daily round, and the rule
 * that a challenge never reaches the deck. Harness mirrors
 * practiceDailyBound.test.ts (deck/introBudget/telemetry/audio mocked,
 * synthetic builders stubbed to []).
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

const recordPracticeAnswerMock = vi.fn();
vi.mock('$lib/practice/answerTelemetry', () => ({
	recordPracticeAnswer: (...args: unknown[]) => recordPracticeAnswerMock(...args)
}));

vi.mock('$lib/audio/audio', () => ({
	playChord: () => {},
	playNote: () => {},
	ensureAudioReady: async () => undefined,
	soundEnabled: () => true,
	studyModeEnabled: () => false,
	playArpeggio: () => {}
}));

const NOW = new Date('2026-10-26T12:00:00Z');

function makeChordCard(symbol: string, masteryDayCount = 0): CardRecord {
	return {
		...newCard(NOW),
		factId: `chord-formula:${symbol}`,
		factKind: 'chord-formula',
		mode: 'formula',
		lastRating: null,
		masteryDayCount
	};
}

beforeEach(() => {
	localStorage.clear();
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(NOW);
	introduceNewCardsMock.mockReset();
	getDueCardsMock.mockReset().mockResolvedValue(['C', 'Dm', 'Em'].map((s) => makeChordCard(s)));
	getAllCardsMock.mockReset().mockResolvedValue([]);
	recordGradeMock.mockReset();
	recordGradeMock.mockImplementation(async (card: CardRecord, rating: Rating) => ({
		...card,
		lastRating: rating
	}));
	getCardMock.mockReset().mockResolvedValue(undefined);
	remainingIntroBudgetMock.mockReset().mockReturnValue(0);
	consumeIntroBudgetMock.mockReset();
	recordPracticeAnswerMock.mockReset();
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
	localStorage.clear();
});

describe('the tier path on the pre-start card', () => {
	it('draws every tier as a stop, the current one marked, with the tier line kept', async () => {
		localStorage.setItem(LEVEL_KEY, JSON.stringify({ currentTier: 2, unlockedTiers: [1, 2] }));
		render(PracticePage);
		const path = await screen.findByTestId('tier-path');

		const stops = within(path).getAllByRole('listitem');
		expect(stops.map((stop) => stop.getAttribute('data-state'))).toEqual([
			'reached',
			'current',
			'ahead',
			'ahead',
			'ahead',
			'ahead'
		]);
		expect(screen.getByTestId('practice-tier-line')).toHaveTextContent('TIER 2 · All-key triads');
		// No padlock anywhere: a tier ahead is "coming up", never locked.
		expect(path.textContent).not.toMatch(/🔒|lock/i);
		expect(stops[2]).toHaveAttribute('aria-label', expect.stringContaining('coming up'));
	});

	it('fills the bar from the chords already known toward the next tier', async () => {
		getAllCardsMock.mockResolvedValue(itemsForTier(1).slice(0, 6).map((s) => makeChordCard(s, 2)));
		render(PracticePage);
		await screen.findByTestId('tier-path');

		expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
		expect(screen.getByTestId('tier-path-known')).toHaveTextContent(
			'6 OF 12 CHORDS KNOWN TOWARD THE NEXT TIER'
		);
	});

	it('shows one unlock moment when a new tier has opened, then never again', async () => {
		localStorage.setItem(TIER_SEEN_KEY, '1');
		localStorage.setItem(LEVEL_KEY, JSON.stringify({ currentTier: 2, unlockedTiers: [1, 2] }));
		const first = render(PracticePage);
		expect(await screen.findByTestId('tier-path-unlocked')).toHaveTextContent(
			'New tier open: All-key triads.'
		);
		first.unmount();

		render(PracticePage);
		await screen.findByTestId('tier-path');
		expect(screen.queryByTestId('tier-path-unlocked')).toBeNull();
	});

	it('keeps the unlock moment for a visit that shows the path, not one that lands empty', async () => {
		localStorage.setItem(TIER_SEEN_KEY, '1');
		localStorage.setItem(LEVEL_KEY, JSON.stringify({ currentTier: 2, unlockedTiers: [1, 2] }));
		getDueCardsMock.mockResolvedValueOnce([]);
		getAllCardsMock.mockResolvedValueOnce([makeChordCard('C')]);
		const empty = render(PracticePage);
		await screen.findByTestId('practice-empty-none-due');
		await screen.findByTestId('challenge-cards');
		await vi.waitFor(() => expect(getAllCardsMock).toHaveBeenCalledTimes(2));
		empty.unmount();

		render(PracticePage);
		expect(await screen.findByTestId('tier-path-unlocked')).toHaveTextContent(
			'New tier open: All-key triads.'
		);
	});
});

describe('the challenge cards', () => {
	it("offers every challenge beside the round, today's pick first", async () => {
		render(PracticePage);
		const cards = await screen.findByTestId('challenge-cards');
		const expected = challengeOrder('2026-10-26');

		const articles = within(cards).getAllByRole('article');
		expect(articles.map((article) => article.getAttribute('data-testid'))).toEqual(
			expected.map((id) => `challenge-card-${id}`)
		);
		expect(within(articles[0]).getByTestId('challenge-today-pick')).toBeInTheDocument();
		// Each card says how it is answered: none of them needs a piano.
		expect(cards).toHaveTextContent('TAP TO ANSWER');
		expect(cards).toHaveTextContent('HEADPHONES');
		expect(cards).toHaveTextContent('ON-SCREEN KEYS');
	});

	it('stays reachable with nothing in the deck, so the challenges work on day one', async () => {
		getDueCardsMock.mockResolvedValue([]);
		render(PracticePage);
		await screen.findByTestId('practice-empty-no-deck');
		expect(screen.getByTestId('challenge-cards')).toBeInTheDocument();
	});

	it('hides while a round is being answered', async () => {
		render(PracticePage);
		await screen.findByTestId('practice-pre-start');
		await fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));
		expect(screen.queryByTestId('challenge-cards')).toBeNull();
	});
});

describe('a challenge never reaches the deck', () => {
	it('plays a sprint without an FSRS grade, telemetry or a daily-ledger answer, then returns', async () => {
		render(PracticePage);
		await screen.findByTestId('challenge-cards');
		await fireEvent.click(screen.getByRole('button', { name: 'Play 60-second sprint' }));

		expect(screen.queryByTestId('practice-pre-start')).toBeNull();
		const sprint = screen.getByTestId('sprint-challenge');
		await fireEvent.click(within(sprint).getAllByRole('button', { name: /^Answer: / })[0]);

		expect(recordGradeMock).not.toHaveBeenCalled();
		expect(recordPracticeAnswerMock).not.toHaveBeenCalled();
		expect(answeredToday()).toBe(0);

		await fireEvent.click(screen.getByRole('button', { name: 'Back to practice' }));
		expect(screen.getByTestId('practice-pre-start')).toBeInTheDocument();
		expect(screen.getByTestId('practice-due-register')).toHaveTextContent('3 CARDS DUE TODAY');
	});

	it('opens the ear duel and the key climb from their cards', async () => {
		render(PracticePage);
		await screen.findByTestId('challenge-cards');
		await fireEvent.click(screen.getByRole('button', { name: 'Play Ear duel' }));
		expect(screen.getByTestId('ear-duel-challenge')).toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: 'Back to practice' }));

		await fireEvent.click(screen.getByRole('button', { name: 'Play Key climb' }));
		expect(screen.getByTestId('key-climb-challenge')).toBeInTheDocument();
		expect(recordGradeMock).not.toHaveBeenCalled();
	});
});
