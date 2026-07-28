import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PracticePage from './practice/+page.svelte';
import { newCard, State } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';
import { todaySummary } from '$lib/practice/dailySession';

/**
 * B3: a synthetic item is no longer a free point.
 *
 * `completeSynthetic` used to finish every voicing/progression/inversion item
 * as CORRECT, because those drills only complete after a correct play. The
 * end card's accuracy was therefore dishonest upward by construction, and the
 * more a round leaned on the three synthetic families the less its number
 * meant. Each of the three now reports first-attempt correctness and the host
 * grades on it.
 *
 * What must NOT change: synthetic items still commit no FSRS grade (they carry
 * no card at all, T-27-05-01/T-35-06-02), still record no server telemetry,
 * and a wrong play still retries rather than gating.
 *
 * The round here is a single inversion item: cardsToQueueItems is stubbed to []
 * so the carded half stays out of the way, while the raw due chord card still
 * opens the synthetic gate (PRAC-05).
 */

const introduceNewCardsMock = vi.fn();
const getDueCardsMock = vi.fn();
const getAllCardsMock = vi.fn();
const recordGradeMock = vi.fn();

vi.mock('$lib/srs/deck', () => ({
	introduceNewCards: (...args: unknown[]) => introduceNewCardsMock(...args),
	getDueCards: (...args: unknown[]) => getDueCardsMock(...args),
	getAllCards: (...args: unknown[]) => getAllCardsMock(...args),
	recordGrade: (...args: unknown[]) => recordGradeMock(...args),
	getCard: async () => undefined
}));

const INVERSION_ITEM = {
	id: 'inversion:Dm7:2',
	family: 'inversion' as const,
	symbol: 'Dm7',
	inversionIndex: 2
};

vi.mock('$lib/practice/practiceQueue', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/practice/practiceQueue')>();
	return {
		...actual,
		cardsToQueueItems: () => [],
		syntheticVoicingItems: () => [],
		syntheticProgressionItems: () => [],
		syntheticInversionItems: () => [INVERSION_ITEM]
	};
});

vi.mock('$lib/srs/introBudget', () => ({
	remainingIntroBudget: () => 0,
	consumeIntroBudget: () => {}
}));

const recordPracticeAnswerMock = vi.fn();
vi.mock('$lib/practice/answerTelemetry', () => ({
	recordPracticeAnswer: (...args: unknown[]) => recordPracticeAnswerMock(...args)
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

function makeDm7Card(state: State = State.Review): CardRecord {
	return {
		...newCard(NOW),
		factId: 'chord-formula:Dm7',
		factKind: 'chord-formula',
		mode: 'formula',
		lastRating: null,
		masteryDayCount: 0,
		state
	};
}

/** Presses the letter's key in the given octave slot (pointerdown then click), as InversionDrill's bass detection requires. */
function pressKeyAtOctave(letter: string, octaveIndex: 0 | 1): void {
	const key = screen.getAllByRole('button', { name: `${letter} key` })[octaveIndex];
	fireEvent.pointerDown(key);
	fireEvent.click(key);
}

/** Dm7 2nd inversion: A (fifth) in the bass, then C/D/F above. */
async function playCorrectInversion(): Promise<void> {
	pressKeyAtOctave('A', 0);
	pressKeyAtOctave('C', 1);
	pressKeyAtOctave('D', 1);
	pressKeyAtOctave('F', 1);
	await fireEvent.click(screen.getByTestId('inversion-check'));
}

async function startRound(): Promise<void> {
	await screen.findByTestId('practice-pre-start');
	await fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));
	await screen.findByTestId('inversion-drill');
}

beforeEach(() => {
	localStorage.clear();
	introduceNewCardsMock.mockReset();
	getDueCardsMock.mockReset().mockResolvedValue([makeDm7Card()]);
	getAllCardsMock.mockReset().mockResolvedValue([makeDm7Card()]);
	recordGradeMock.mockReset();
	recordPracticeAnswerMock.mockReset();
});

afterEach(() => {
	vi.restoreAllMocks();
	localStorage.clear();
});

describe('B3: a synthetic item earned clean scores as right', () => {
	it('counts one correct answer and leaves a clean sheet', async () => {
		render(PracticePage);
		await startRound();

		await playCorrectInversion();
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		const card = await screen.findByTestId('session-end-card');
		expect(card).toHaveTextContent('1 / 1');
		expect(screen.queryByTestId('practice-end-card-misses')).not.toBeInTheDocument();
		expect(card).toHaveTextContent('Clean sheet.');
	});
});

describe('B3: a synthetic item that took a retry scores as wrong', () => {
	it('does not hand out a free point, and lists the chord as worth another look', async () => {
		render(PracticePage);
		await startRound();

		// Wrong notes first: this still retries rather than gating.
		pressKeyAtOctave('A', 0);
		pressKeyAtOctave('C', 1);
		await fireEvent.click(screen.getByTestId('inversion-check'));
		expect(screen.getByTestId('inversion-drill')).toBeInTheDocument();

		await playCorrectInversion();
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		const card = await screen.findByTestId('session-end-card');
		expect(card).toHaveTextContent('0 / 1');
		expect(within(card).getByTestId('practice-end-card-misses')).toHaveTextContent('Dm7');
		expect(card).not.toHaveTextContent('Clean sheet.');
	});

	it('records the miss in the day ledger, so the round total means something later too', async () => {
		render(PracticePage);
		await startRound();

		pressKeyAtOctave('A', 0);
		await fireEvent.click(screen.getByTestId('inversion-check'));
		await playCorrectInversion();
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		await screen.findByTestId('session-end-card');

		const day = todaySummary();
		expect(day.answered).toBe(1);
		expect(day.correct).toBe(0);
		expect(day.missed).toEqual(['Dm7']);
	});

	it('still commits no FSRS grade and no server telemetry for the synthetic item (REG-01)', async () => {
		render(PracticePage);
		await startRound();

		pressKeyAtOctave('A', 0);
		await fireEvent.click(screen.getByTestId('inversion-check'));
		await playCorrectInversion();
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		await screen.findByTestId('session-end-card');

		expect(recordGradeMock).not.toHaveBeenCalled();
		expect(recordPracticeAnswerMock).not.toHaveBeenCalled();
	});
});
