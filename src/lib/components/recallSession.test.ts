import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RecallSession from './RecallSession.svelte';
import { newCard, Rating } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';
import { majorScaleNotes } from '$lib/theory/scale';
import { transposeFrom } from '$lib/theory/interval';

/**
 * Component test for RecallSession (11-05): mocks the deck persistence seam
 * (11-03) and the audio engine, but uses the REAL scheduler (newCard) and the
 * REAL fact catalog's factIds so the reveal-content derivation and the
 * grade-button day-interval labels exercise the real theory engine and the
 * real FSRS fixed-interval math (New card: Again=1d, Hard=2d, Good=3d,
 * Easy=8d, per 11-01's scheduler tests).
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

const playChordMock = vi.fn();
const playNoteMock = vi.fn();
vi.mock('$lib/audio/audio', () => ({
	playChord: (...args: unknown[]) => playChordMock(...args),
	playNote: (...args: unknown[]) => playNoteMock(...args)
}));

const NOW = new Date('2026-07-15T12:00:00Z');

function makeCard(factId: string, factKind: CardRecord['factKind']): CardRecord {
	return {
		...newCard(NOW),
		factId,
		factKind,
		mode: 'formula',
		lastRating: null
	};
}

beforeEach(() => {
	introduceNewCardsMock.mockReset();
	getDueCardsMock.mockReset();
	getAllCardsMock.mockReset();
	recordGradeMock.mockReset();
	recordGradeMock.mockImplementation(async (card: CardRecord, rating: Rating) => ({
		...card,
		lastRating: rating
	}));
	playChordMock.mockReset();
	playNoteMock.mockReset();
});

describe('RecallSession (MEM-01/MEM-02: reveal-then-grade review session)', () => {
	it('renders the loading state before the async load resolves', () => {
		introduceNewCardsMock.mockReturnValue(new Promise(() => {}));
		render(RecallSession);
		expect(screen.getByTestId('recall-loading')).toHaveTextContent("COUNTING TODAY'S CARDS...");
	});

	it('renders the empty-no-deck state when the deck has zero cards total', async () => {
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([]);
		getAllCardsMock.mockResolvedValue([]);

		render(RecallSession);
		await waitFor(() => screen.getByTestId('recall-empty-no-deck'));

		expect(screen.getByText('Nothing to recall yet.')).toBeInTheDocument();
		expect(screen.getByText(/Play a few Drills first\./)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Practice Now' })).toHaveAttribute('href', '/drills');
	});

	it('renders the empty-none-due state when cards exist but none are due', async () => {
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([]);
		getAllCardsMock.mockResolvedValue([makeCard('chord-formula:Cm7', 'chord-formula')]);

		render(RecallSession);
		await waitFor(() => screen.getByTestId('recall-empty-none-due'));

		expect(screen.getByText('Nothing due today.')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Practice Now' })).toHaveAttribute('href', '/drills');
	});

	it('renders the error state when a deck call throws, and Try Again re-runs load', async () => {
		introduceNewCardsMock.mockRejectedValueOnce(new Error('boom'));
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([]);
		getAllCardsMock.mockResolvedValue([]);

		render(RecallSession);
		await waitFor(() => screen.getByTestId('recall-error'));
		expect(screen.getByText(/Couldn't open the practice ledger\./)).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

		await waitFor(() => screen.getByTestId('recall-empty-no-deck'));
		expect(introduceNewCardsMock).toHaveBeenCalledTimes(2);
	});

	it('reviews a chord-formula card end to end: reveal template, live grade-button day-interval labels, and completion', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		render(RecallSession);
		await waitFor(() => screen.getByTestId('recall-prompt'));

		expect(screen.getByTestId('recall-register')).toHaveTextContent('1 LEFT TODAY');
		expect(screen.getByText("What's the formula?")).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Show Answer' }));

		expect(screen.getByText("Here's the formula:")).toBeInTheDocument();
		// Fixed FSRS day-scale intervals for a brand-new card (D-02): the four
		// tags are all visible the instant the reveal renders, never computed
		// lazily on click.
		expect(screen.getByTestId('recall-grade-again')).toHaveTextContent('1d');
		expect(screen.getByTestId('recall-grade-hard')).toHaveTextContent('2d');
		expect(screen.getByTestId('recall-grade-good')).toHaveTextContent('3d');
		expect(screen.getByTestId('recall-grade-easy')).toHaveTextContent('8d');

		await fireEvent.click(screen.getByTestId('recall-grade-good'));

		expect(recordGradeMock).toHaveBeenCalledWith(card, Rating.Good, expect.any(Date));
		await waitFor(() => screen.getByTestId('recall-complete'));
		expect(screen.getByText("Voila. That's today's stack.")).toBeInTheDocument();
		expect(screen.getByTestId('recall-reviewed-count')).toHaveTextContent('1 REVIEWED TODAY');
	});

	it('reviews an interval-size card with the correct prompt/reveal template', async () => {
		const card = makeCard('interval-size:m3', 'interval-size');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		render(RecallSession);
		await waitFor(() => screen.getByTestId('recall-prompt'));

		const targetLetter = transposeFrom('C', 'm3');
		expect(screen.getByText(`C to ${targetLetter}`)).toBeInTheDocument();
		expect(screen.getByText("What's the interval?")).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Show Answer' }));

		expect(screen.getByText("Here's the interval:")).toBeInTheDocument();
		expect(screen.getByText('m3')).toBeInTheDocument();
	});

	it('reviews a scale-degree card with the correct prompt/reveal template', async () => {
		const card = makeCard('scale-degree:G:3', 'scale-degree');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		render(RecallSession);
		await waitFor(() => screen.getByTestId('recall-prompt'));

		expect(screen.getByText('Degree 3 of G major')).toBeInTheDocument();
		expect(screen.getByText('Which note?')).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Show Answer' }));

		expect(screen.getByText("Here's the note:")).toBeInTheDocument();
		const degreeNote = majorScaleNotes('G')[2];
		expect(screen.getByText(degreeNote.letter)).toBeInTheDocument();
	});

	it('surfaces the error state when recordGrade throws, instead of leaving the revealed card stuck', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);
		recordGradeMock.mockRejectedValueOnce(new Error('quota exceeded'));

		render(RecallSession);
		await waitFor(() => screen.getByTestId('recall-prompt'));

		await fireEvent.click(screen.getByRole('button', { name: 'Show Answer' }));
		await fireEvent.click(screen.getByTestId('recall-grade-good'));

		await waitFor(() => screen.getByTestId('recall-error'));
		expect(screen.getByText(/Couldn't open the practice ledger\./)).toBeInTheDocument();
	});

	it('re-enqueues an Again grade without decrementing the register, then completes after grading the rest', async () => {
		const cardA = makeCard('chord-formula:Cm7', 'chord-formula');
		const cardB = makeCard('interval-size:m3', 'interval-size');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([cardA, cardB]);
		getAllCardsMock.mockResolvedValue([cardA, cardB]);

		render(RecallSession);
		await waitFor(() => screen.getByTestId('recall-prompt'));
		expect(screen.getByTestId('recall-register')).toHaveTextContent('2 LEFT TODAY');
		expect(screen.getByText("What's the formula?")).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Show Answer' }));
		await fireEvent.click(screen.getByTestId('recall-grade-again'));

		expect(recordGradeMock).toHaveBeenCalledWith(cardA, Rating.Again, expect.any(Date));
		await waitFor(() => expect(screen.getByText("What's the interval?")).toBeInTheDocument());
		expect(screen.getByTestId('recall-register')).toHaveTextContent('2 LEFT TODAY');

		await fireEvent.click(screen.getByRole('button', { name: 'Show Answer' }));
		await fireEvent.click(screen.getByTestId('recall-grade-good'));

		expect(recordGradeMock).toHaveBeenCalledWith(cardB, Rating.Good, expect.any(Date));
		await waitFor(() => expect(screen.getByText("What's the formula?")).toBeInTheDocument());
		expect(screen.getByTestId('recall-register')).toHaveTextContent('1 LEFT TODAY');

		await fireEvent.click(screen.getByRole('button', { name: 'Show Answer' }));
		await fireEvent.click(screen.getByTestId('recall-grade-easy'));

		await waitFor(() => screen.getByTestId('recall-complete'));
		expect(screen.getByTestId('recall-reviewed-count')).toHaveTextContent('3 REVIEWED TODAY');
	});
});
