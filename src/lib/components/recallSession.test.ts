import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RecallSession from './RecallSession.svelte';
import { gradeCard, newCard, previewGrades, Rating, State } from '$lib/srs/scheduler';
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
 *
 * Mode A ('see-play'), Mode B ('hear-name'), and the `formula`-mode reveal
 * keyboards render inline in each mode's own block, so a plain component
 * render puts the keyboard content in the same `document.body` that `screen`
 * queries. Mode C ('formula-build') embeds a BuildSession whose constructable
 * keyboard also renders in flow.
 */

function renderRecallSession(props: { onViewMap?: () => void } = {}) {
	return render(RecallSession, { props });
}

const introduceNewCardsMock = vi.fn();
const getDueCardsMock = vi.fn();
const getAllCardsMock = vi.fn();
const recordGradeMock = vi.fn();
// BuildSession itself calls getCard internally when embedded (Mode C, 13-05) -
// the module-wide $lib/srs/deck mock must supply it or the embedded instance
// throws.
const getCardMock = vi.fn();

vi.mock('$lib/srs/deck', () => ({
	introduceNewCards: (...args: unknown[]) => introduceNewCardsMock(...args),
	getDueCards: (...args: unknown[]) => getDueCardsMock(...args),
	getAllCards: (...args: unknown[]) => getAllCardsMock(...args),
	recordGrade: (...args: unknown[]) => recordGradeMock(...args),
	getCard: (...args: unknown[]) => getCardMock(...args)
}));

const playChordMock = vi.fn();
const playNoteMock = vi.fn();
const ensureAudioReadyMock = vi.fn();
vi.mock('$lib/audio/audio', () => ({
	playChord: (...args: unknown[]) => playChordMock(...args),
	playNote: (...args: unknown[]) => playNoteMock(...args),
	ensureAudioReady: (...args: unknown[]) => ensureAudioReadyMock(...args),
	// Embedded BuildSession (Mode C) fires its reveal on completion; keep sound and
	// study mode off so the reveal takes the visual-only path and never adds stray
	// playChord/playArpeggio calls to this file's assertions.
	soundEnabled: () => false,
	studyModeEnabled: () => false,
	playArpeggio: () => {}
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
		lastRating: null,
		masteryDayCount: 0
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
	getCardMock.mockReset();
	getCardMock.mockResolvedValue(undefined);
	playChordMock.mockReset();
	playNoteMock.mockReset();
	ensureAudioReadyMock.mockReset();
	ensureAudioReadyMock.mockResolvedValue(undefined);
});

describe('RecallSession (MEM-01/MEM-02: reveal-then-grade review session)', () => {
	it('renders the loading state before the async load resolves', () => {
		introduceNewCardsMock.mockReturnValue(new Promise(() => {}));
		renderRecallSession();
		expect(screen.getByTestId('recall-loading')).toHaveTextContent("COUNTING TODAY'S CARDS...");
	});

	it('renders the empty-no-deck state when the deck has zero cards total', async () => {
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([]);
		getAllCardsMock.mockResolvedValue([]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-empty-no-deck'));

		expect(screen.getByText('Nothing to recall yet.')).toBeInTheDocument();
		expect(screen.getByText(/Play a few Drills first\./)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Practice Now' })).toHaveAttribute('href', '/drills');
	});

	it('renders the empty-none-due state when cards exist but none are due', async () => {
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([]);
		getAllCardsMock.mockResolvedValue([makeCard('chord-formula:Cm7', 'chord-formula')]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-empty-none-due'));

		expect(screen.getByText('Nothing due today.')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Practice Now' })).toHaveAttribute('href', '/drills');
	});

	it('renders the error state when a deck call throws, and Try Again re-runs load', async () => {
		introduceNewCardsMock.mockRejectedValueOnce(new Error('boom'));
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([]);
		getAllCardsMock.mockResolvedValue([]);

		renderRecallSession();
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

		renderRecallSession();
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

		renderRecallSession();
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

		renderRecallSession();
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

		renderRecallSession();
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

		renderRecallSession();
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

		renderRecallSession();
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

		renderRecallSession();
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

		renderRecallSession();
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

		renderRecallSession();
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

		renderRecallSession();
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

/**
 * Mode B ('hear-name') component tests (13-04): the ear->naming surface
 * (RECALL-02, D-04). Uses the REAL pickDistractors/spellChord against a real
 * catalog factId ('chord-formula:Cm7'), matching this file's established
 * convention of exercising real theory-engine derivations against a mocked
 * deck/audio seam only. Timer handling mirrors buildSession.test.ts's own
 * established real-timer-await convention (`await new Promise((resolve) =>
 * setTimeout(resolve, 700))`) for the 650ms auto-advance.
 */
describe('RecallSession Mode B (hear-name: hear the chord, pick its name, never gates)', () => {
	const CORRECT_VARIANTS = ['Nailed it.', 'Et voilà.', 'Bang on.', 'Spot on, mon ami.'];
	const WRONG_VARIANTS = ['Not quite.', 'Close, but no cigar.', 'Not this time.'];

	function getChoiceButtons(): HTMLElement[] {
		return screen.getAllByRole('button', { name: /^Answer: / });
	}

	it('renders the Play/Play again prompt and a 4-choice grid, all sharing the correct root, with no auto-play on mount', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'hear-name');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		expect(screen.getByTestId('recall-mode-chip')).toHaveTextContent('SOUND → NAME');
		expect(screen.getByText('Listen. Name the chord.')).toBeInTheDocument();
		expect(playChordMock).not.toHaveBeenCalled();

		const playButton = screen.getByRole('button', { name: 'Play' });
		const choices = getChoiceButtons();
		expect(choices).toHaveLength(4);
		const labels = choices.map((button) => button.textContent?.trim());
		expect(labels).toContain('Cm7');
		for (const label of labels) {
			expect(label).toMatch(/^C(?![#♯b♭])/);
		}

		await fireEvent.click(playButton);
		expect(playChordMock).toHaveBeenCalledTimes(1);
		expect(screen.getByRole('button', { name: 'Play again' })).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
		expect(playChordMock).toHaveBeenCalledTimes(2);
	});

	it('a correct choice records Rating.Good and auto-advances (no manual Next button) after ~650ms, completing the session', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'hear-name');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: Cm7' }));

		expect(recordGradeMock).toHaveBeenCalledWith(card, Rating.Good, expect.any(Date));
		const feedback = screen.getByTestId('recall-hear-name-feedback').textContent ?? '';
		expect(CORRECT_VARIANTS.some((variant) => feedback.includes(variant))).toBe(true);
		expect(screen.queryByTestId('reveal-insight')).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();

		await new Promise((resolve) => setTimeout(resolve, 700));

		await waitFor(() => screen.getByTestId('recall-complete'));
		expect(screen.getByTestId('recall-reviewed-count')).toHaveTextContent('1 REVIEWED TODAY');
	});

	it('a wrong choice records Rating.Again, shows RevealInsight, and still auto-advances (re-enqueuing the card, never gating)', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'hear-name');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		const wrongChoice = getChoiceButtons().find(
			(button) => button.textContent?.trim() !== 'Cm7'
		);
		expect(wrongChoice).toBeDefined();

		await fireEvent.click(wrongChoice!);

		expect(recordGradeMock).toHaveBeenCalledWith(card, Rating.Again, expect.any(Date));
		const feedback = screen.getByTestId('recall-hear-name-feedback').textContent ?? '';
		expect(WRONG_VARIANTS.some((variant) => feedback.includes(variant))).toBe(true);
		expect(screen.getByTestId('reveal-insight')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();

		// Choices are all disabled the instant an answer is committed (no
		// lingering to change one's mind while the auto-advance timer runs).
		for (const button of getChoiceButtons()) {
			expect(button).toBeDisabled();
		}

		await new Promise((resolve) => setTimeout(resolve, 700));

		// Re-enqueued (Rating.Again, never gates): still 1 LEFT TODAY, and the
		// hear-name prompt is back, fully reset (a fresh Play label, disabled
		// choices re-enabled, no stale feedback).
		await waitFor(() => expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument());
		expect(screen.getByTestId('recall-register')).toHaveTextContent('1 LEFT TODAY');
		expect(screen.queryByTestId('recall-hear-name-feedback')).not.toBeInTheDocument();
		for (const button of getChoiceButtons()) {
			expect(button).toBeEnabled();
		}
	});

	it('never gates session completion: a session whose ONLY due card is hear-name still completes normally, a prior wrong answer re-queuing it (never blocking) rather than getting stuck', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'hear-name');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		// Answer wrong first: the queue's own re-enqueue-on-Again contract
		// (D-10, identical for every mode) requeues the card rather than
		// completing - this is normal FSRS retry behavior, not a gate. Mode
		// B's "never gates" guarantee is that this wrong answer still
		// auto-advances (no manual action, no lock-out), not that a single
		// wrong tap force-completes the session.
		const wrongChoice = getChoiceButtons().find(
			(button) => button.textContent?.trim() !== 'Cm7'
		);
		await fireEvent.click(wrongChoice!);
		expect(recordGradeMock).toHaveBeenCalledWith(card, Rating.Again, expect.any(Date));

		await new Promise((resolve) => setTimeout(resolve, 700));

		await waitFor(() => expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument());
		expect(screen.getByTestId('recall-register')).toHaveTextContent('1 LEFT TODAY');
		expect(screen.queryByTestId('recall-complete')).not.toBeInTheDocument();

		// Now answer correctly: the same only-due hear-name card completes the
		// session normally, with no extra unlock step required. The card
		// object is the post-first-grade record (its lastRating field now
		// reflects the prior Again write), so assert on its identity
		// (factId/mode) rather than deep-equality against the original.
		await fireEvent.click(screen.getByRole('button', { name: 'Answer: Cm7' }));
		expect(recordGradeMock).toHaveBeenLastCalledWith(
			expect.objectContaining({ factId: 'chord-formula:Cm7', mode: 'hear-name' }),
			Rating.Good,
			expect.any(Date)
		);

		await new Promise((resolve) => setTimeout(resolve, 700));

		await waitFor(() => screen.getByTestId('recall-complete'));
	});
});

/**
 * Mode C ('formula-build') component tests (13-05): the queue-embedded
 * BuildSession surface (RECALL-01). Proves embedTargetFor's inverse factId
 * parse for both a chord-formula and a SCALE-formula factId (Phase 12's
 * accepted scope gap, never resolvable via factById()), and that Next
 * (BuildSession's onComplete) advances RecallSession's own queue.
 */
describe('RecallSession Mode C (formula-build: embeds BuildSession directly, RECALL-01)', () => {
	it('a formula-build queue item for a chord-formula factId mounts BuildSession directly into its building state, with no kind-toggle/picker visible', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'formula-build');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-mode-chip'));

		expect(screen.getByTestId('recall-mode-chip')).toHaveTextContent('FORMULA → BUILD');
		expect(screen.getByTestId('build-session')).toBeInTheDocument();
		expect(screen.queryByTestId('kind-toggle')).not.toBeInTheDocument();
		expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
		expect(screen.getByTestId('build-register')).toHaveTextContent('STEP 1 OF 3');
	});

	it('a formula-build queue item for a SCALE-formula factId also mounts BuildSession correctly (embedTargetFor scale branch, independent of factById)', async () => {
		const card = makeCard('scale-formula:G', 'scale-formula', 'formula-build');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-mode-chip'));

		expect(screen.getByTestId('recall-mode-chip')).toHaveTextContent('FORMULA → BUILD');
		expect(screen.getByTestId('build-session')).toBeInTheDocument();
		expect(screen.queryByTestId('kind-toggle')).not.toBeInTheDocument();
		expect(screen.getByTestId('build-register')).toHaveTextContent('STEP 1 OF 7');
	});

	it('completing the embedded build and tapping Next advances RecallSession\'s own queue to the next item', async () => {
		const cardA = makeCard('chord-formula:Cm7', 'chord-formula', 'formula-build');
		const cardB = makeCard('interval-size:m3', 'interval-size', 'formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([cardA, cardB]);
		getAllCardsMock.mockResolvedValue([cardA, cardB]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-mode-chip'));
		expect(screen.getByTestId('recall-register')).toHaveTextContent('2 LEFT TODAY');

		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));

		expect(screen.getByTestId('build-complete')).toBeInTheDocument();
		expect(screen.queryByTestId('build-fsrs-status')).not.toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		await waitFor(() => expect(screen.getByText("What's the interval?")).toBeInTheDocument());
		expect(screen.getByTestId('recall-register')).toHaveTextContent('1 LEFT TODAY');
	});

	it('completing the LAST queue item via Mode C\'s Next completes the session (recall-complete)', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'formula-build');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-mode-chip'));

		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));

		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		await waitFor(() => screen.getByTestId('recall-complete'));
		expect(screen.getByTestId('recall-reviewed-count')).toHaveTextContent('1 REVIEWED TODAY');
	});
});

/**
 * Unrenderable-fallback coverage (WR-01): a selected queue item whose
 * (mode, fact) combination resolves to no renderable branch must never
 * leave the card blank/control-less and permanently stalled. Every one of
 * these scenarios is an edge case the current invariants prevent from
 * occurring naturally (a `formula-build` factId always parses, `see-play`/
 * `hear-name` cards are only ever created for `chord-formula` facts), so
 * they're constructed directly via the mocked deck seam rather than through
 * `introduceNewCards`' real behavior.
 */
describe('RecallSession unrenderable fallback (WR-01: no dead-end card)', () => {
	it('a formula-build card whose factId does not parse (embedTargetFor miss) shows the fallback message and Skip advances/completes the session', async () => {
		const card = makeCard('bogus:not-a-real-shape', 'chord-formula', 'formula-build');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-unrenderable'));

		expect(screen.getByTestId('recall-unrenderable')).toHaveTextContent("Couldn't show this card.");
		// No FSRS write happens for an unrenderable card - there's nothing to grade.
		expect(recordGradeMock).not.toHaveBeenCalled();

		await fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

		await waitFor(() => screen.getByTestId('recall-complete'));
		// Nothing was actually reviewed, so the count stays at 0.
		expect(screen.getByTestId('recall-reviewed-count')).toHaveTextContent('0 REVIEWED TODAY');
	});

	it('a see-play card for a non-chord-formula fact (mode/factKind mismatch) shows the fallback message and Skip advances the queue to the next item', async () => {
		const mismatchedCard = makeCard('interval-size:m3', 'interval-size', 'see-play');
		const nextCard = makeCard('chord-formula:Cm7', 'chord-formula', 'formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([mismatchedCard, nextCard]);
		getAllCardsMock.mockResolvedValue([mismatchedCard, nextCard]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-unrenderable'));
		expect(screen.getByTestId('recall-register')).toHaveTextContent('2 LEFT TODAY');

		await fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

		await waitFor(() => expect(screen.getByText("What's the formula?")).toBeInTheDocument());
		expect(screen.getByTestId('recall-register')).toHaveTextContent('1 LEFT TODAY');
	});

	it('a queue item whose fact has been deleted from the catalog (currentFact undefined) shows the outer fallback message and Skip completes the session', async () => {
		const card = makeCard('chord-formula:this-symbol-does-not-exist', 'chord-formula', 'formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-unrenderable'));
		expect(screen.getByTestId('recall-unrenderable')).toHaveTextContent("Couldn't show this card.");

		await fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

		await waitFor(() => screen.getByTestId('recall-complete'));
	});
});

/**
 * Integration coverage for 13-06: load()'s queue composition now filters
 * getDueCards()'s raw output through rotation.ts's REAL (unmocked)
 * selectReviewCards (13-01) before building cardsByKey/queue - this is the
 * plan's entire wiring change, proven end to end here rather than only in
 * rotation.test.ts's own unit coverage. `state`/`stability` overrides use a
 * distinct local helper (not `makeCard`, which hardcodes State.New via
 * newCard(NOW) with no override hook) so review-mode fixtures can be built
 * without reshaping the existing helper's signature.
 */
describe('RecallSession queue composition via selectReviewCards (RECALL-03 rotation policy, 13-06)', () => {
	function makeCardWithState(
		factId: string,
		factKind: CardRecord['factKind'],
		mode: CardRecord['mode'],
		overrides: Partial<CardRecord> = {}
	): CardRecord {
		return {
			...newCard(NOW),
			factId,
			factKind,
			mode,
			lastRating: null,
			masteryDayCount: 0,
			...overrides
		};
	}

	it('teach cluster (all State.New, same fact): all 3 cluster cards queue together uncapped, each reachable in sequence', async () => {
		const formulaCard = makeCardWithState('chord-formula:Cm7', 'chord-formula', 'formula', {
			state: State.New
		});
		const seePlayCard = makeCardWithState('chord-formula:Cm7', 'chord-formula', 'see-play', {
			state: State.New
		});
		const buildCard = makeCardWithState('chord-formula:Cm7', 'chord-formula', 'formula-build', {
			state: State.New
		});
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([formulaCard, seePlayCard, buildCard]);
		getAllCardsMock.mockResolvedValue([formulaCard, seePlayCard, buildCard]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-register'));
		expect(screen.getByTestId('recall-register')).toHaveTextContent('3 LEFT TODAY');
		expect(screen.getByTestId('recall-mode-chip')).toHaveTextContent('SYMBOL → FORMULA');

		// Card 1 (formula): reveal, then grade Good.
		await fireEvent.click(screen.getByRole('button', { name: 'Show Answer' }));
		await fireEvent.click(screen.getByTestId('recall-grade-good'));

		// Card 2 (see-play): a correct Check, then Next - none of the teach
		// cluster's cards were capped out by the fact-level cap.
		await waitFor(() =>
			expect(screen.getByTestId('recall-mode-chip')).toHaveTextContent('SYMBOL → PLAY')
		);
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		// Card 3 (formula-build): the embedded BuildSession runs to completion,
		// then Next.
		await waitFor(() =>
			expect(screen.getByTestId('recall-mode-chip')).toHaveTextContent('FORMULA → BUILD')
		);
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		expect(screen.getByTestId('build-complete')).toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		await waitFor(() => screen.getByTestId('recall-complete'));
		expect(screen.getByTestId('recall-reviewed-count')).toHaveTextContent('3 REVIEWED TODAY');
	});

	it('review cards (State.Review, one fact, different stabilities): caps to 2 per encounter and deprioritizes hear-name below its raw stability rank', async () => {
		const hearNameCard = makeCardWithState('chord-formula:Cm7', 'chord-formula', 'hear-name', {
			state: State.Review,
			stability: 0.1,
			difficulty: 5
		});
		const formulaCard = makeCardWithState('chord-formula:Cm7', 'chord-formula', 'formula', {
			state: State.Review,
			stability: 10,
			difficulty: 5
		});
		const seePlayCard = makeCardWithState('chord-formula:Cm7', 'chord-formula', 'see-play', {
			state: State.Review,
			stability: 5,
			difficulty: 5
		});
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([hearNameCard, formulaCard, seePlayCard]);
		getAllCardsMock.mockResolvedValue([hearNameCard, formulaCard, seePlayCard]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-register'));

		// Capped: only 2 of this fact's 3 due cards are selected.
		expect(screen.getByTestId('recall-register')).toHaveTextContent('2 LEFT TODAY');
		// The weaker non-hear-name card (see-play, stability 5) surfaces first,
		// ahead of the stronger formula card (stability 10) - and hear-name,
		// despite having the LOWEST raw stability of the three, is excluded
		// entirely (D-07's "always lowest priority").
		expect(screen.getByTestId('recall-mode-chip')).toHaveTextContent('SYMBOL → PLAY');
		expect(screen.queryByText('Listen. Name the chord.')).not.toBeInTheDocument();

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		await waitFor(() =>
			expect(screen.getByTestId('recall-mode-chip')).toHaveTextContent('SYMBOL → FORMULA')
		);
		expect(screen.queryByText('Listen. Name the chord.')).not.toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: 'Show Answer' }));
		await fireEvent.click(screen.getByTestId('recall-grade-good'));

		// The session completes at 2, having never encountered the hear-name
		// card - the cap held for the whole session, not just its first item.
		await waitFor(() => screen.getByTestId('recall-complete'));
		expect(screen.getByTestId('recall-reviewed-count')).toHaveTextContent('2 REVIEWED TODAY');
	});

	it('a fact whose ONLY due card is hear-name still gets included (register reads 1, not 0) and completes normally', async () => {
		const card = makeCardWithState('chord-formula:Cm7', 'chord-formula', 'hear-name', {
			state: State.Review,
			stability: 1,
			difficulty: 5
		});
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		expect(screen.getByTestId('recall-register')).toHaveTextContent('1 LEFT TODAY');
		expect(screen.getByTestId('recall-mode-chip')).toHaveTextContent('SOUND → NAME');

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: Cm7' }));
		await new Promise((resolve) => setTimeout(resolve, 700));

		await waitFor(() => screen.getByTestId('recall-complete'));
		expect(screen.getByTestId('recall-reviewed-count')).toHaveTextContent('1 REVIEWED TODAY');
	});

	it("a full mixed-mode session (one card per mode, different facts) completes via every mode's own advance mechanism (RECALL-01/02/03 together)", async () => {
		const formulaCard = makeCardWithState('interval-size:m3', 'interval-size', 'formula', {
			state: State.New
		});
		const seePlayCard = makeCardWithState('chord-formula:Dm7', 'chord-formula', 'see-play', {
			state: State.New
		});
		const hearNameCard = makeCardWithState('chord-formula:G7', 'chord-formula', 'hear-name', {
			state: State.New
		});
		const buildCard = makeCardWithState('chord-formula:Cm7', 'chord-formula', 'formula-build', {
			state: State.New
		});
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([formulaCard, seePlayCard, hearNameCard, buildCard]);
		getAllCardsMock.mockResolvedValue([formulaCard, seePlayCard, hearNameCard, buildCard]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-register'));
		expect(screen.getByTestId('recall-register')).toHaveTextContent('4 LEFT TODAY');

		// Card 1 (formula, interval-size:m3): reveal + grade buttons.
		expect(screen.getByTestId('recall-mode-chip')).toHaveTextContent('SYMBOL → FORMULA');
		await fireEvent.click(screen.getByRole('button', { name: 'Show Answer' }));
		await fireEvent.click(screen.getByTestId('recall-grade-good'));

		// Card 2 (see-play, chord-formula:Dm7): Check + Next.
		await waitFor(() =>
			expect(screen.getByTestId('recall-mode-chip')).toHaveTextContent('SYMBOL → PLAY')
		);
		await fireEvent.click(screen.getAllByRole('button', { name: 'D key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'F key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'A key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		// Card 3 (hear-name, chord-formula:G7): choice-tap + timer-advance
		// (never a manual Next).
		await waitFor(() =>
			expect(screen.getByTestId('recall-mode-chip')).toHaveTextContent('SOUND → NAME')
		);
		await fireEvent.click(screen.getByRole('button', { name: 'Answer: G7' }));
		await new Promise((resolve) => setTimeout(resolve, 700));

		// Card 4 (formula-build, chord-formula:Cm7): the embedded BuildSession's
		// own completion, then Next.
		await waitFor(() =>
			expect(screen.getByTestId('recall-mode-chip')).toHaveTextContent('FORMULA → BUILD')
		);
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		await waitFor(() => screen.getByTestId('recall-complete'));
		expect(screen.getByTestId('recall-reviewed-count')).toHaveTextContent('4 REVIEWED TODAY');
	});
});

/**
 * Inline keyboard coverage (KBD-01/KBD-03): Mode A ('see-play'), Mode B
 * ('hear-name'), and the `formula`-mode reveal keyboard each render inline in
 * their own mode block. Mode C ('formula-build') embeds a BuildSession whose
 * own constructable keyboard renders in flow.
 */
describe('RecallSession inline keyboard (KBD-01/KBD-03)', () => {
	it('renders an inline PianoKeyboard once a chord-formula card is reviewing', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		expect(screen.getByRole('img', { name: /piano keyboard/i })).toBeInTheDocument();
	});

	it('no keyboard remains once the session completes (no stale keyboard outside the reviewing state, T-15-03)', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));
		expect(screen.getByRole('img', { name: /piano keyboard/i })).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Show Answer' }));
		await fireEvent.click(screen.getByTestId('recall-grade-good'));

		await waitFor(() => screen.getByTestId('recall-complete'));
		expect(screen.queryByRole('img', { name: /piano keyboard/i })).not.toBeInTheDocument();
	});

	it("on a formula-build (Mode C) card, the embedded BuildSession's own constructable keyboard renders inline", async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'formula-build');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('build-session'));

		expect(screen.getByRole('img', { name: /piano keyboard/i })).toBeInTheDocument();
	});

	it("advancing past a Mode C card (BuildSession's onComplete) shows the next card; a non-chord formula card renders no keyboard (IN-01)", async () => {
		const cardA = makeCard('chord-formula:Cm7', 'chord-formula', 'formula-build');
		const cardB = makeCard('interval-size:m3', 'interval-size', 'formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([cardA, cardB]);
		getAllCardsMock.mockResolvedValue([cardA, cardB]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('build-session'));
		expect(screen.getByRole('img', { name: /piano keyboard/i })).toBeInTheDocument();

		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));

		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		await waitFor(() => expect(screen.getByText("What's the interval?")).toBeInTheDocument());
		// The next card is a formula-mode interval-size fact, which has no
		// keyboard relationship: RecallSession deliberately renders no keyboard
		// for it (IN-01) rather than show an unrelated empty board.
		expect(screen.queryByRole('img', { name: /piano keyboard/i })).not.toBeInTheDocument();
	});

	it('Mode A (see-play): the inline keyboard is interactive - tapping sounds via mocked playNote and toggles selection', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'see-play');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		const cKey = screen.getAllByRole('button', { name: 'C key' })[0];
		await fireEvent.pointerDown(cKey);
		expect(playNoteMock).toHaveBeenCalledWith('C4');

		await fireEvent.click(cKey);
		expect(cKey).toHaveAttribute('aria-pressed', 'true');
	});

	it('Mode A (see-play): a wrong Check transforms the SAME inline keyboard (one keyboard, target notes + wrongLetters)', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'see-play');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		// Missing the seventh (A♯/B♭), plus an extra note (D) not in the chord.
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'D key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		const keyboards = screen.getAllByRole('img', { name: /piano keyboard/i });
		expect(keyboards).toHaveLength(1);
		const keyboard = keyboards[0];

		const wrongKeys = keyboard.querySelectorAll('.piano-keyboard__key--wrong');
		expect(wrongKeys.length).toBeGreaterThan(0);
		const highlighted = keyboard.querySelectorAll(
			'.piano-keyboard__key--root, .piano-keyboard__key--third, .piano-keyboard__key--fifth, .piano-keyboard__key--seventh'
		);
		expect(highlighted).toHaveLength(4);
	});

	it('Mode B (hear-name): the inline keyboard is a plain inspectable tap-to-hear board', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'hear-name');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		const keyboards = screen.getAllByRole('img', { name: /piano keyboard/i });
		expect(keyboards).toHaveLength(1);
		const key = screen.getAllByRole('button', { name: 'C key' })[0];
		await fireEvent.click(key);
		expect(playNoteMock).toHaveBeenCalled();

		// Never a graded/selection surface - the multiple-choice grid stays in
		// flow, unaffected by tapping the inline board.
		expect(screen.getAllByRole('button', { name: /^Answer: / })).toHaveLength(4);
	});

	it('formula mode: the inline keyboard is inspectable and present before AND after Show Answer (empty pre-reveal, chord notes post-reveal)', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		const beforeKeyboards = screen.getAllByRole('img', { name: /piano keyboard/i });
		expect(beforeKeyboards).toHaveLength(1);
		expect(beforeKeyboards[0].querySelectorAll('.piano-keyboard__key--root')).toHaveLength(0);

		await fireEvent.click(screen.getByRole('button', { name: 'Show Answer' }));

		const afterKeyboards = screen.getAllByRole('img', { name: /piano keyboard/i });
		expect(afterKeyboards).toHaveLength(1);
		expect(afterKeyboards[0].querySelectorAll('.piano-keyboard__key--root').length).toBeGreaterThan(
			0
		);
	});
});
