import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RecallSession from './RecallSession.svelte';
import { gradeCard, newCard, previewGrades, Rating } from '$lib/srs/scheduler';
import { formatDayInterval } from '$lib/srs/session';
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

function makeCard(
	factId: string,
	factKind: CardRecord['factKind'],
	mode: CardRecord['mode'] = 'formula'
): CardRecord {
	return {
		...newCard(NOW),
		factId,
		factKind,
		mode,
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
		expect(screen.getByTestId('recall-mode-chip')).toHaveTextContent('SYMBOL → FORMULA');
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

	it('announces reveal->grade transitions via an aria-live region (WR-03)', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		render(RecallSession);
		await waitFor(() => screen.getByTestId('recall-prompt'));

		const prompt = screen.getByTestId('recall-prompt');
		const liveRegion = prompt.closest('[aria-live="polite"]');
		expect(liveRegion).not.toBeNull();

		await fireEvent.click(screen.getByRole('button', { name: 'Show Answer' }));

		// The revealed answer content renders inside the same live region, so
		// its appearance is announced too.
		expect(screen.getByTestId('recall-reveal').closest('[aria-live="polite"]')).toBe(liveRegion);
	});

	it("reactively reflects a graded card's real FSRS state on its next reveal, not the stale pre-grade record (WR-01 regression)", async () => {
		// A single-card queue is the scenario that actually exercises WR-01:
		// `advanceQueue`'s Again branch on a one-item queue returns a new
		// array but the SAME queue-item object reference (nothing else to
		// reorder around), so Svelte's `currentItem` derived produces a
		// value that is reference-equal to its prior output. If
		// `cardsByKey`'s .set() mutation isn't itself reactively tracked
		// (WR-01), the memoized `currentCard`/`previews` deriveds never
		// re-run on this second reveal, and the grade buttons would keep
		// showing the stale brand-new-card preview instead of the just
		// graded record. A multi-card queue would mask this (per the
		// review's own note) because the queue-item reference DOES change
		// every other step, forcing a re-read regardless of whether the Map
		// mutation itself is tracked.
		const card = makeCard('chord-formula:Cm7', 'chord-formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		let updatedCard: CardRecord | undefined;
		recordGradeMock.mockImplementation(async (c: CardRecord, rating: Rating, now: Date) => {
			const { card: fsrsFields } = gradeCard(c, rating, now);
			updatedCard = { ...c, ...fsrsFields, lastRating: rating };
			return updatedCard;
		});

		render(RecallSession);
		await waitFor(() => screen.getByTestId('recall-prompt'));

		// Grade Again: real FSRS fields change (New -> Review, per D-02); the
		// only card in the queue is re-enqueued behind itself and shows again.
		await fireEvent.click(screen.getByRole('button', { name: 'Show Answer' }));
		await fireEvent.click(screen.getByTestId('recall-grade-again'));
		await waitFor(() => screen.getByRole('button', { name: 'Show Answer' }));
		expect(updatedCard).toBeDefined();

		await fireEvent.click(screen.getByRole('button', { name: 'Show Answer' }));

		const expectedPreviews = previewGrades(updatedCard!, new Date());
		const expectedEasy = formatDayInterval(
			expectedPreviews.find((entry) => entry.rating === Rating.Easy)!.days
		);

		// The brand-new-card fixed Easy preview is 8d; a real post-Again-grade
		// Review-state card previews Easy at a different value (4d given this
		// app's FSRS config), so this only matches the real graded record.
		expect(expectedEasy).not.toBe('8d');
		expect(screen.getByTestId('recall-grade-easy')).toHaveTextContent(expectedEasy);
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

/**
 * Mode A ('see-play') component tests (13-03): the recognition->production
 * surface (RECALL-01, D-03). Uses the REAL matchChord/spellChord against a
 * real catalog factId ('chord-formula:Cm7'), matching this file's existing
 * convention of exercising real theory-engine derivations against a mocked
 * deck/audio seam only - no matchChord mock is introduced.
 */
describe('RecallSession Mode A (see-play: see symbol, play notes, chroma-graded)', () => {
	// Verbatim copies of RecallSession's own module-scope confirmation/wrong
	// variant pools (not exported), so the tests can assert the rendered
	// feedback text is drawn from the correct rotation without depending on
	// which exact variant Math.random happens to pick.
	const CORRECT_VARIANTS = ['Nailed it.', 'Et voilà.', 'Bang on.', 'Spot on, mon ami.'];
	const WRONG_VARIANTS = ['Not quite.', 'Close, but no cigar.', 'Not this time.'];

	it('renders the see-play prompt (mode chip, chord glyph, keyboard prompt) with Check disabled until a key is played', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'see-play');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		render(RecallSession);
		await waitFor(() => screen.getByTestId('recall-prompt'));

		expect(screen.getByTestId('recall-mode-chip')).toHaveTextContent('SYMBOL → PLAY');
		expect(screen.getByText('Play it on the keyboard.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled();

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		expect(screen.getByRole('button', { name: 'Check' })).toBeEnabled();
	});

	it('a correct Check leaves the keyboard untransformed, shows a CORRECT_VARIANTS confirmation, records Rating.Good, and Next completes the session', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'see-play');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		render(RecallSession);
		await waitFor(() => screen.getByTestId('recall-prompt'));

		// Cm7's exact chroma set: C (root), D♯/E♭ (third), G (fifth), A♯/B♭ (seventh).
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);

		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(recordGradeMock).toHaveBeenCalledWith(card, Rating.Good, expect.any(Date));
		// No transform-on-wrong feedback: the legend only ever renders on a miss.
		expect(screen.queryByTestId('recall-mode-a-legend')).not.toBeInTheDocument();
		const feedback = screen.getByTestId('recall-mode-a-feedback').textContent?.trim();
		expect(CORRECT_VARIANTS).toContain(feedback);

		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		await waitFor(() => screen.getByTestId('recall-complete'));
		expect(screen.getByTestId('recall-reviewed-count')).toHaveTextContent('1 REVIEWED TODAY');
	});

	it('a wrong Check transforms the keyboard (interval colors + gray extra-note fill), shows a legend and WRONG_VARIANTS headline, records Rating.Again, and Next re-enqueues the card', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'see-play');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		render(RecallSession);
		await waitFor(() => screen.getByTestId('recall-prompt'));

		// Missing the seventh (A♯/B♭), plus an extra note (D) not in the chord.
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'D key' })[0]);

		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(recordGradeMock).toHaveBeenCalledWith(card, Rating.Again, expect.any(Date));
		expect(screen.getByTestId('recall-mode-a-legend')).toBeInTheDocument();
		expect(screen.getByText('The chord')).toBeInTheDocument();
		expect(screen.getByText('Your extra note')).toBeInTheDocument();
		expect(screen.getAllByText('extra note').length).toBeGreaterThan(0);
		const feedback = screen.getByTestId('recall-mode-a-feedback').textContent ?? '';
		expect(WRONG_VARIANTS.some((variant) => feedback.includes(variant))).toBe(true);

		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		// Re-enqueued (Rating.Again): the session is still 1 LEFT TODAY and the
		// see-play prompt shows again, fully reset (Check disabled again).
		await waitFor(() => expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled());
		expect(screen.getByTestId('recall-register')).toHaveTextContent('1 LEFT TODAY');
		expect(screen.getByText('Play it on the keyboard.')).toBeInTheDocument();
	});
});
