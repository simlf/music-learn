import { render, screen, fireEvent, within, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newCard } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';
import { setSongPlaythrough } from '$lib/practice/songPlaythrough';
import {
	DAILY_SESSION_KEY,
	DAILY_TARGET,
	emptyDay,
	localDay
} from '$lib/practice/dailySession';

/**
 * Phase 40 (PLAY-01/02/03) + proposal 3's fix, generalized: a song
 * play-through must never be diluted or sliced by the daily target, must
 * keep repeats intact, and must never crash on a symbol outside the
 * practice catalog. Harness mirrors practiceSeedHandoff.test.ts's own
 * (deck/introBudget/telemetry/audio mocked; synthetic builders stubbed to
 * [] so any composed-half leakage into a play-through round is visible).
 */

const introduceNewCardsMock = vi.fn();
const getDueCardsMock = vi.fn();
const getAllCardsMock = vi.fn();
const recordGradeMock = vi.fn();

vi.mock('$lib/srs/deck', () => ({
	introduceNewCards: (...args: unknown[]) => introduceNewCardsMock(...args),
	getDueCards: (...args: unknown[]) => getDueCardsMock(...args),
	getAllCards: (...args: unknown[]) => getAllCardsMock(...args),
	recordGrade: (...args: unknown[]) => recordGradeMock(...args)
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
	playChord: vi.fn(),
	playNote: vi.fn(),
	ensureAudioReady: async () => {},
	soundEnabled: () => false,
	studyModeEnabled: () => false,
	playArpeggio: () => {}
}));

const NOW = new Date('2026-09-05T12:00:00Z');

/** An unrelated, never-due card: keeps the deck non-empty on the fallthrough path. */
function makeUnrelatedCard(): CardRecord {
	return {
		...newCard(NOW),
		factId: 'interval-size:m2',
		factKind: 'interval-size',
		mode: 'formula',
		lastRating: null,
		masteryDayCount: 0
	};
}

/** A due card for an arbitrary fact, standing in for a full FSRS pool a play-through must never touch. */
function makeDueCard(factId: string, factKind: CardRecord['factKind'], mode: CardRecord['mode']): CardRecord {
	return {
		...newCard(NOW),
		factId,
		factKind,
		mode,
		due: new Date(NOW.getTime() - 60_000),
		lastRating: null,
		masteryDayCount: 0
	};
}

function spendTodaysTarget(): void {
	const today = { ...emptyDay(localDay()), answered: DAILY_TARGET, correct: DAILY_TARGET };
	localStorage.setItem(DAILY_SESSION_KEY, JSON.stringify({ today }));
}

async function pressKeys(keyNames: string[]): Promise<void> {
	for (const key of keyNames) {
		await fireEvent.click(screen.getAllByRole('button', { name: key })[0]);
	}
	await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
	await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
}

async function answerCorrectCm7(): Promise<void> {
	await pressKeys(['C key', 'D♯ key', 'G key', 'A♯ key']);
}

async function answerCorrectF7(): Promise<void> {
	await pressKeys(['F key', 'A key', 'C key', 'D♯ key']);
}

beforeEach(() => {
	localStorage.clear();
	introduceNewCardsMock.mockReset();
	getDueCardsMock.mockReset().mockResolvedValue([]);
	getAllCardsMock.mockReset().mockResolvedValue([makeUnrelatedCard()]);
	recordGradeMock.mockReset();
	recordGradeMock.mockImplementation(async (card: CardRecord, rating: number) => ({
		...card,
		lastRating: rating,
		gradeCount: ((card as CardRecord & { gradeCount?: number }).gradeCount ?? 0) + 1
	}));
	remainingIntroBudgetMock.mockReset().mockReturnValue(0);
	consumeIntroBudgetMock.mockReset();
	recordPracticeAnswerMock.mockReset();
});

afterEach(() => {
	vi.restoreAllMocks();
	localStorage.clear();
});

describe('song play-through (Phase 40, PLAY-01/02/03)', () => {
	it('starts a play-through with no pool dilution: a full FSRS due backlog never enters the round', async () => {
		const dueIntervals = [
			makeDueCard('interval-size:m2', 'interval-size', 'formula'),
			makeDueCard('interval-size:M3', 'interval-size', 'formula')
		];
		getDueCardsMock.mockResolvedValue(dueIntervals);
		getAllCardsMock.mockResolvedValue(dueIntervals);
		setSongPlaythrough('Blue Bossa', ['Cm7', 'Fm7', 'Bb7']);
		const { default: PracticePage } = await import('./practice/+page.svelte');

		render(PracticePage);

		const preStart = await screen.findByTestId('practice-pre-start');
		expect(screen.getByTestId('practice-due-register')).toHaveTextContent('PLAYING THROUGH Blue Bossa');
		expect(screen.getByTestId('practice-due-register')).toHaveTextContent('3 CHORDS');

		await fireEvent.click(within(preStart).getByRole('button', { name: 'Start play-through' }));

		// Exactly the song's own 3 chords - never 3 + the 2 due intervals.
		expect(screen.getByTestId('practice-register')).toHaveTextContent('3 LEFT');
		expect(screen.getByTestId('question-source-tag')).toHaveTextContent('PLAY IT');
		expect(screen.getByTestId('chord-drill-play-prompt')).toHaveTextContent('Cm7');
	});

	it('is never sliced by the daily target, even on a fully spent day (proposal 3)', async () => {
		spendTodaysTarget();
		setSongPlaythrough('Blue Bossa', ['Cm7', 'Fm7', 'Bb7', 'Eb', 'Ab', 'Db', 'D', 'Gm7']);
		const { default: PracticePage } = await import('./practice/+page.svelte');

		render(PracticePage);

		const preStart = await screen.findByTestId('practice-pre-start');
		// A spent day would slice a composed round to 0; the play-through's
		// full 8-chord length survives untouched.
		expect(screen.getByTestId('practice-due-register')).toHaveTextContent('8 CHORDS');
		await fireEvent.click(within(preStart).getByRole('button', { name: 'Start play-through' }));
		expect(screen.getByTestId('practice-register')).toHaveTextContent('8 LEFT');
	});

	it('keeps repeats intact and grades each repeat from the state the prior one just persisted', async () => {
		setSongPlaythrough('Song', ['Cm7', 'F7', 'Cm7']);
		const { default: PracticePage } = await import('./practice/+page.svelte');

		render(PracticePage);
		const preStart = await screen.findByTestId('practice-pre-start');
		await fireEvent.click(within(preStart).getByRole('button', { name: 'Start play-through' }));

		expect(screen.getByTestId('practice-register')).toHaveTextContent('3 LEFT');
		expect(screen.getByTestId('chord-drill-play-prompt')).toHaveTextContent('Cm7');
		await answerCorrectCm7();

		expect(screen.getByTestId('chord-drill-play-prompt')).toHaveTextContent('F7');
		await answerCorrectF7();

		expect(screen.getByTestId('chord-drill-play-prompt')).toHaveTextContent('Cm7');
		await answerCorrectCm7();

		expect(recordGradeMock).toHaveBeenCalledTimes(3);
		// The THIRD grade (the repeated Cm7) must be computed from the card the
		// FIRST grade just persisted, not the stale pre-round snapshot every
		// occurrence started from - without the fix this card carries no
		// `gradeCount` at all (the untouched original object).
		const thirdCallCard = recordGradeMock.mock.calls[2][0] as CardRecord & { gradeCount?: number };
		expect(thirdCallCard.gradeCount).toBeGreaterThanOrEqual(1);

		await screen.findByTestId('session-end-card');
		expect(screen.getByTestId('practice-end-card-done')).toHaveTextContent('You played through Song.');
	});

	it('normalizes an alias/enharmonic symbol and counts a genuinely exotic one as skipped (PLAY-03)', async () => {
		setSongPlaythrough('Chart', ['D#m7', 'C9']);
		const { default: PracticePage } = await import('./practice/+page.svelte');

		render(PracticePage);

		const preStart = await screen.findByTestId('practice-pre-start');
		expect(screen.getByTestId('practice-due-register')).toHaveTextContent('1 CHORD');
		expect(screen.getByTestId('practice-due-register')).toHaveTextContent('1 chord skipped');

		await fireEvent.click(within(preStart).getByRole('button', { name: 'Start play-through' }));
		// D#m7 normalizes to the catalog's own Ebm7 spelling (rendered with the glyph accidental).
		expect(screen.getByTestId('chord-drill-play-prompt')).toHaveTextContent('E♭m7');
	});

	it('lands on its own empty state when nothing in the song resolves, rather than crashing', async () => {
		setSongPlaythrough('Modern chart', ['C9', 'Cadd9']);
		const { default: PracticePage } = await import('./practice/+page.svelte');

		render(PracticePage);

		const empty = await screen.findByTestId('practice-empty-playthrough');
		expect(empty).toHaveTextContent('2 skipped');
	});

	it('is one-shot: a later render with no pending request falls through to normal FSRS practice', async () => {
		setSongPlaythrough('Song', ['Cm7']);
		const { default: PracticePage } = await import('./practice/+page.svelte');
		render(PracticePage);
		await screen.findByTestId('practice-pre-start');
		cleanup();

		// No second setSongPlaythrough call: the channel was drained by the render above.
		const { default: PracticePageAgain } = await import('./practice/+page.svelte');
		render(PracticePageAgain);

		await screen.findByTestId('practice-empty-none-due');
	});
});
