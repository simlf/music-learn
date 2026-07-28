import { render, screen, fireEvent, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PracticePage from './practice/+page.svelte';
import { newCard, Rating } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';

/**
 * T13 item 1 (mode collapse), at the host level.
 *
 * `/practice` used to route every chord-formula card that was not
 * 'formula-build' to PracticeChordDrill with no mode at all, so a chord's
 * teach cluster (formula + see-play, with hear-name unlocking later) produced
 * the SAME 4-choice identification question two and three times over. On a
 * fresh install that meant roughly 20 identical-shaped questions over 10
 * symbols on day one, and two of the three skills the deck believes it trains
 * were never practiced at all. The distinct modes did render, but only inside
 * RecallSession, several taps deep in Progress.
 *
 * This suite covers what the host now does with those cards: three modes ->
 * three families -> three question surfaces -> three cue labels, with the FSRS
 * grade commit per item completely unchanged (one recordGrade per answered
 * item, using that item's own card).
 *
 * Mock architecture mirrors tests/practice-hub.e2e.test.ts verbatim: deck and
 * introBudget are mocked (deterministic due sets, no real Dexie), telemetry and
 * audio are mocked, and practiceQueue's SYNTHETIC builders are stubbed to []
 * so a due chord card cannot also pull in a voicing/progression/inversion item
 * - the scope here is carded routing only.
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
const consumeIntroBudgetMock = vi.fn();
vi.mock('$lib/srs/introBudget', () => ({
	remainingIntroBudget: (...args: unknown[]) => remainingIntroBudgetMock(...args),
	consumeIntroBudget: (...args: unknown[]) => consumeIntroBudgetMock(...args)
}));

const recordPracticeAnswerMock = vi.fn();
vi.mock('$lib/practice/answerTelemetry', () => ({
	recordPracticeAnswer: (...args: unknown[]) => recordPracticeAnswerMock(...args)
}));

const playChordMock = vi.fn();
const playNoteMock = vi.fn();
const ensureAudioReadyMock = vi.fn();
vi.mock('$lib/audio/audio', () => ({
	playChord: (...args: unknown[]) => playChordMock(...args),
	playNote: (...args: unknown[]) => playNoteMock(...args),
	ensureAudioReady: (...args: unknown[]) => ensureAudioReadyMock(...args),
	soundEnabled: () => false,
	studyModeEnabled: () => false,
	playArpeggio: () => {}
}));

const NOW = new Date('2026-07-29T12:00:00Z');

function makeCard(
	factId: string,
	factKind: CardRecord['factKind'],
	mode: CardRecord['mode']
): CardRecord {
	return {
		...newCard(NOW),
		factId,
		factKind,
		mode,
		lastRating: null,
		masteryDayCount: 0
	};
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
	recordPracticeAnswerMock.mockReset();
	playChordMock.mockReset();
	playNoteMock.mockReset();
	ensureAudioReadyMock.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
	vi.restoreAllMocks();
	localStorage.clear();
});

/** Starts a round over exactly `cards`, landing on the first question. */
async function startRound(cards: CardRecord[]): Promise<void> {
	getDueCardsMock.mockResolvedValue(cards);
	render(PracticePage);
	await screen.findByTestId('practice-pre-start');
	await fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));
}

describe('a see-play card asks the user to PLAY the chord', () => {
	it('shows the symbol with a playable keyboard, no choice grid, and its own cue label', async () => {
		await startRound([makeCard('chord-formula:Cm7', 'chord-formula', 'see-play')]);

		expect(screen.getByTestId('question-source-tag')).toHaveTextContent('PLAY IT');
		const drill = screen.getByTestId('practice-chord-drill');
		expect(drill).toHaveAttribute('data-mode', 'see-play');
		expect(screen.getByTestId('chord-drill-play-prompt')).toBeInTheDocument();
		expect(screen.queryByTestId('choice-grid')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Check' })).toBeInTheDocument();
	});

	it('commits exactly one Rating.Good for the see-play card when the notes are right', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'see-play');
		await startRound([card]);

		for (const label of ['C key', 'D♯ key', 'G key', 'A♯ key']) {
			await fireEvent.click(screen.getAllByRole('button', { name: label })[0]);
		}
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(recordGradeMock).toHaveBeenCalledTimes(1);
		expect(recordGradeMock.mock.calls[0][0]).toMatchObject({
			factId: 'chord-formula:Cm7',
			mode: 'see-play'
		});
		expect(recordGradeMock.mock.calls[0][1]).toBe(Rating.Good);
	});

	it('commits Rating.Again for a wrong played set, exactly as any other carded miss', async () => {
		await startRound([makeCard('chord-formula:Cm7', 'chord-formula', 'see-play')]);

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(recordGradeMock).toHaveBeenCalledTimes(1);
		expect(recordGradeMock.mock.calls[0][1]).toBe(Rating.Again);
	});
});

describe('a hear-name card asks the user to NAME what they hear', () => {
	it('offers a Play control with no keyboard, plus the choice grid and its own cue label', async () => {
		await startRound([makeCard('chord-formula:Cm7', 'chord-formula', 'hear-name')]);

		expect(screen.getByTestId('question-source-tag')).toHaveTextContent('BY EAR');
		expect(screen.getByTestId('practice-chord-drill')).toHaveAttribute('data-mode', 'hear-name');
		expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
		expect(screen.getByTestId('choice-grid')).toBeInTheDocument();
		// The ear test is not answerable by reading the keys.
		expect(document.querySelector('.piano-keyboard')).not.toBeInTheDocument();
	});

	it('commits exactly one grade for the hear-name card', async () => {
		await startRound([makeCard('chord-formula:Cm7', 'chord-formula', 'hear-name')]);

		await fireEvent.click(screen.getByRole('button', { name: 'Play' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Answer: Cm7' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(recordGradeMock).toHaveBeenCalledTimes(1);
		expect(recordGradeMock.mock.calls[0][0]).toMatchObject({
			factId: 'chord-formula:Cm7',
			mode: 'hear-name'
		});
		expect(recordGradeMock.mock.calls[0][1]).toBe(Rating.Good);
	});
});

describe('one chord, three modes, three DIFFERENT questions in one round', () => {
	it('walks a teach cluster and never asks the same question twice', async () => {
		// The exact shape a newly introduced chord fact seeds, plus its later
		// hear-name card: before T13 this round was three multiple-choice
		// questions about Cm7 in a row (two of them byte-identical) and the
		// third the build flow.
		await startRound([
			makeCard('chord-formula:Cm7', 'chord-formula', 'formula'),
			makeCard('chord-formula:Cm7', 'chord-formula', 'see-play'),
			makeCard('chord-formula:Cm7', 'chord-formula', 'hear-name')
		]);

		const cues: string[] = [];
		const modes: string[] = [];

		for (let i = 0; i < 3; i++) {
			cues.push(screen.getByTestId('question-source-tag').textContent?.trim() ?? '');
			const drill = screen.getByTestId('practice-chord-drill');
			const mode = drill.getAttribute('data-mode') ?? '';
			modes.push(mode);

			if (mode === 'see-play') {
				for (const label of ['C key', 'D♯ key', 'G key', 'A♯ key']) {
					await fireEvent.click(screen.getAllByRole('button', { name: label })[0]);
				}
				await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
			} else {
				await fireEvent.click(screen.getByRole('button', { name: 'Answer: Cm7' }));
			}
			await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		}

		expect(new Set(modes)).toEqual(new Set(['formula', 'see-play', 'hear-name']));
		expect(new Set(cues)).toEqual(new Set(['NAME IT', 'PLAY IT', 'BY EAR']));

		// One grade per card, each against its own (factId, mode) identity.
		expect(recordGradeMock).toHaveBeenCalledTimes(3);
		expect(new Set(recordGradeMock.mock.calls.map((call) => call[0].mode))).toEqual(
			new Set(['formula', 'see-play', 'hear-name'])
		);

		expect(screen.getByTestId('session-end-card')).toHaveTextContent('ROUND COMPLETE');
	});

	it('reports all three modes to answer telemetry as chord answers (REG-01: unchanged contract)', async () => {
		await startRound([
			makeCard('chord-formula:Cm7', 'chord-formula', 'formula'),
			makeCard('chord-formula:Cm7', 'chord-formula', 'hear-name')
		]);

		for (let i = 0; i < 2; i++) {
			await fireEvent.click(screen.getByRole('button', { name: 'Answer: Cm7' }));
			await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		}

		expect(recordPracticeAnswerMock).toHaveBeenCalledTimes(2);
		for (const [event] of recordPracticeAnswerMock.mock.calls) {
			expect(event).toMatchObject({ item: 'Cm7', kind: 'chord', correct: true });
		}
	});
});

describe('the hint ladder reaches the busiest drill surface', () => {
	it('offers an opt-in ladder on a see-play item inside a real round', async () => {
		await startRound([makeCard('chord-formula:Cm7', 'chord-formula', 'see-play')]);

		const cta = screen.getByTestId('hint-cta');
		expect(cta).toHaveTextContent('Need a hint?');
		expect(screen.queryAllByTestId('hint-layer')).toHaveLength(0);

		await fireEvent.click(within(cta).getByRole('button'));
		expect(screen.queryAllByTestId('hint-layer')).toHaveLength(1);
		// A hint is free: nothing has been graded yet.
		expect(recordGradeMock).not.toHaveBeenCalled();
	});
});
