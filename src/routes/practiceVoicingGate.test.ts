import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PracticePage from './practice/+page.svelte';
import { newCard, State } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';

/**
 * PRAC-06 (Phase 41): a chord's voicing item is eligible for the round only
 * once its OWN recognition cards have left State.New and reached
 * State.Review, gated in /practice's dueChordSymbols/voicingItems filter
 * (+page.svelte ~lines 404-458). Regression coverage for the case
 * practiceInversionsReg.test.ts and practiceColdOrdering.test.ts don't
 * exercise: those fixtures either pre-seed State.Review (positive case only)
 * or leave getAllCards at its default `[]` (gate a no-op either way). This
 * suite drives the SAME due chord through State.New/Learning (must be
 * absent) and State.Review (must appear), with syntheticProgressionItems/
 * syntheticInversionItems stubbed to [] so voicing is the only synthetic in
 * play and its presence is unambiguous from the rendered family cue.
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
	playChord: () => {},
	playNote: () => {},
	ensureAudioReady: async () => undefined,
	soundEnabled: () => false,
	studyModeEnabled: () => false,
	playArpeggio: () => {}
}));

const NOW = new Date('2026-07-25T12:00:00Z');

function makeCard(state: State): CardRecord {
	return {
		...newCard(NOW),
		factId: 'chord-formula:Cm7',
		factKind: 'chord-formula',
		mode: 'formula',
		lastRating: null,
		masteryDayCount: 0,
		state
	};
}

async function completeCardedChord(symbol: string): Promise<void> {
	await fireEvent.click(screen.getByRole('button', { name: `Answer: ${symbol}` }));
	await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
}

/** Detects the current queue item's rendered family branch by its component test id, or undefined if none is mounted. */
function currentFamilyTestId(): string | undefined {
	return ['practice-chord-drill', 'shell-voicing-drill'].find(
		(id) => screen.queryByTestId(id) !== null
	);
}

async function completeShellVoicing(): Promise<void> {
	await waitFor(() => screen.getByTestId('stage-drill'));
	await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
	await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
	await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
	await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
}

beforeEach(() => {
	localStorage.clear();
	introduceNewCardsMock.mockReset();
	getDueCardsMock.mockReset();
	getAllCardsMock.mockReset();
	recordGradeMock.mockReset();
	recordGradeMock.mockImplementation(async (card: CardRecord, rating: unknown) => ({
		...card,
		lastRating: rating
	}));
	getCardMock.mockReset().mockResolvedValue(undefined);
	remainingIntroBudgetMock.mockReset().mockReturnValue(0);
	consumeIntroBudgetMock.mockReset();
	recordPracticeAnswerMock.mockReset();
});

afterEach(() => {
	vi.restoreAllMocks();
	localStorage.clear();
});

describe('PRAC-06: voicing entry gated on recognition maturity (State.Review)', () => {
	it('a due chord still in State.New yields no voicing item: the round ends right after the carded item', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.1);
		const card = makeCard(State.New);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');
		await fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));

		expect(screen.getByTestId('question-source-tag')).not.toHaveTextContent('VOICING');
		await completeCardedChord('Cm7');

		await screen.findByTestId('session-end-card');
		expect(screen.queryByTestId('stage-meet')).not.toBeInTheDocument();
		expect(screen.queryByTestId('stage-subtract')).not.toBeInTheDocument();
		expect(screen.queryByTestId('stage-drill')).not.toBeInTheDocument();
	});

	it('the SAME chord once its recognition card reaches State.Review earns a voicing item in the round', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.1);
		const card = makeCard(State.Review);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');
		await fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));

		// Interleave order between the one carded item and the one voicing
		// item isn't asserted here (that's QUEUE-01's job) - only that the
		// voicing item is REACHABLE at all, unlike the State.New case above.
		let sawVoicing = false;
		for (let i = 0; i < 2 && !screen.queryByTestId('session-end-card'); i++) {
			const family = currentFamilyTestId();
			if (family === 'shell-voicing-drill') {
				sawVoicing = true;
				await completeShellVoicing();
			} else if (family === 'practice-chord-drill') {
				await completeCardedChord('Cm7');
			} else {
				break;
			}
		}

		expect(sawVoicing).toBe(true);
	});
});
