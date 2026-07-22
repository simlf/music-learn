import { render, screen, within, fireEvent, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RecallSession from './RecallSession.svelte';
import { gradeCard, newCard, previewGrades, Rating, State } from '$lib/srs/scheduler';
import { formatDayInterval } from '$lib/srs/session';
import type { CardRecord } from '$lib/srs/deck';
import { majorScaleNotes } from '$lib/theory/scale';
import { transposeFrom } from '$lib/theory/interval';
import { normalizeSymbolForMatch } from '$lib/practice/songProvenance';
import { listConfidence } from '$lib/practice/confidenceLog';
import { setLocale } from '$lib/i18n/locale.svelte';

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
 *
 * Plan 24-01 (Sketch 014-A action dock): the formula/see-play/hear-name
 * primary advance actions (Show Answer/grade buttons, Check/Next, Continue)
 * now render TWICE in jsdom - once inside the phone-only
 * `recall-action-dock` and once in the desktop in-flow slot - since jsdom
 * never evaluates the component's media queries (mirrors Phase 23's
 * masthead/bottom-tab-bar dual-render precedent). `dockButton`/`queryDockButton`
 * scope every such query to the dock, the one unambiguous location that
 * always contains exactly the current mode's actions (or nothing, for
 * formula-build). BuildSession's own "Next" button (Mode C completion) is
 * NOT inside this dock and is queried unscoped as before.
 */

function dockButton(name: string | RegExp): HTMLElement {
	return within(screen.getByTestId('recall-action-dock')).getByRole('button', { name });
}

function queryDockButton(name: string | RegExp): HTMLElement | null {
	return within(screen.getByTestId('recall-action-dock')).queryByRole('button', { name });
}

function dockTestId(testId: string): HTMLElement {
	return within(screen.getByTestId('recall-action-dock')).getByTestId(testId);
}

function renderRecallSession(
	props: {
		onViewMap?: () => void;
		songFilterOn?: boolean;
		provenanceIndex?: Map<string, string[]>;
	} = {}
): {
	unmount: () => void;
} {
	const page = render(RecallSession, { props });
	return { unmount: () => page.unmount() };
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

// 260722-0ex: daily intro-budget gate. Mocked so pre-existing tests (which
// never seed real localStorage budget state) reliably exercise the same
// introduceNewCards call path as before this plan - remainingIntroBudget
// always reports budget available unless a test overrides it, and
// consumeIntroBudget is a pure spy (never touches real localStorage).
const remainingIntroBudgetMock = vi.fn();
const consumeIntroBudgetMock = vi.fn();
vi.mock('$lib/srs/introBudget', () => ({
	remainingIntroBudget: (...args: unknown[]) => remainingIntroBudgetMock(...args),
	consumeIntroBudget: (...args: unknown[]) => consumeIntroBudgetMock(...args)
}));

// 260722-0ex: recall telemetry (BACKLOG-2's recall half).
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
	remainingIntroBudgetMock.mockReset();
	remainingIntroBudgetMock.mockReturnValue(10);
	consumeIntroBudgetMock.mockReset();
	recordPracticeAnswerMock.mockReset();
	playChordMock.mockReset();
	playNoteMock.mockReset();
	ensureAudioReadyMock.mockReset();
	ensureAudioReadyMock.mockResolvedValue(undefined);
});

afterEach(() => {
	setLocale('en');
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

		await fireEvent.click(dockButton('Show Answer'));

		expect(screen.getByText("Here's the formula:")).toBeInTheDocument();
		// Fixed FSRS day-scale intervals for a brand-new card (D-02): the four
		// tags are all visible the instant the reveal renders, never computed
		// lazily on click.
		expect(dockTestId('recall-grade-again')).toHaveTextContent('1d');
		expect(dockTestId('recall-grade-hard')).toHaveTextContent('2d');
		expect(dockTestId('recall-grade-good')).toHaveTextContent('3d');
		expect(dockTestId('recall-grade-easy')).toHaveTextContent('8d');

		await fireEvent.click(dockTestId('recall-grade-good'));

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

		await fireEvent.click(dockButton('Show Answer'));

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

		await fireEvent.click(dockButton('Show Answer'));

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

		await fireEvent.click(dockButton('Show Answer'));
		await fireEvent.click(dockTestId('recall-grade-good'));

		await waitFor(() => screen.getByTestId('recall-error'));
		expect(screen.getByText(/Couldn't open the practice ledger\./)).toBeInTheDocument();
	});

	it('double-tapping a grade button while recordGrade is in flight only grades/advances once (adversarial-review in-flight guard fix)', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		let resolveGrade: ((updated: CardRecord) => void) | undefined;
		recordGradeMock.mockImplementationOnce(
			(c: CardRecord, rating: Rating) =>
				new Promise<CardRecord>((resolve) => {
					resolveGrade = () => resolve({ ...c, lastRating: rating });
				})
		);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		await fireEvent.click(dockButton('Show Answer'));

		// Two rapid taps on the same grade button while the first recordGrade
		// call is still pending (unresolved) - the second tap must be a no-op,
		// whether blocked by the `grading` in-flight guard or the grade
		// buttons' `disabled={grading}` reflecting it.
		await fireEvent.click(dockTestId('recall-grade-good'));
		await fireEvent.click(dockTestId('recall-grade-good'));

		expect(recordGradeMock).toHaveBeenCalledTimes(1);

		resolveGrade?.(card);
		await waitFor(() => screen.getByTestId('recall-complete'));

		expect(recordGradeMock).toHaveBeenCalledTimes(1);
		expect(recordPracticeAnswerMock).toHaveBeenCalledTimes(1);
		expect(screen.getByTestId('recall-reviewed-count')).toHaveTextContent('1 REVIEWED TODAY');
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

		await fireEvent.click(dockButton('Show Answer'));

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
		await fireEvent.click(dockButton('Show Answer'));
		await fireEvent.click(dockTestId('recall-grade-again'));
		await waitFor(() => dockButton('Show Answer'));
		expect(updatedCard).toBeDefined();

		await fireEvent.click(dockButton('Show Answer'));

		const expectedPreviews = previewGrades(updatedCard!, new Date());
		const expectedEasy = formatDayInterval(
			expectedPreviews.find((entry) => entry.rating === Rating.Easy)!.days
		);

		// The brand-new-card fixed Easy preview is 8d; a real post-Again-grade
		// Review-state card previews Easy at a different value (4d given this
		// app's FSRS config), so this only matches the real graded record.
		expect(expectedEasy).not.toBe('8d');
		expect(dockTestId('recall-grade-easy')).toHaveTextContent(expectedEasy);
	});

	it('re-enqueues an Again grade without decrementing the register, then completes after grading the rest', async () => {
		const cardA = makeCard('chord-formula:Cm7', 'chord-formula');
		const cardB = makeCard('interval-size:m3', 'interval-size');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([cardA, cardB]);
		getAllCardsMock.mockResolvedValue([cardA, cardB]);

		// interleaveQueue (260722-0ex, BACKLOG-12) reorders the selected cards
		// via Math.random; pin it near 1 so the Fisher-Yates shuffle preserves
		// insertion order, keeping this fixture's queue position deterministic.
		const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.999);
		try {
			renderRecallSession();
			await waitFor(() => screen.getByTestId('recall-prompt'));
			expect(screen.getByTestId('recall-register')).toHaveTextContent('2 LEFT TODAY');
			expect(screen.getByText("What's the formula?")).toBeInTheDocument();

			await fireEvent.click(dockButton('Show Answer'));
			await fireEvent.click(dockTestId('recall-grade-again'));

			expect(recordGradeMock).toHaveBeenCalledWith(cardA, Rating.Again, expect.any(Date));
			await waitFor(() => expect(screen.getByText("What's the interval?")).toBeInTheDocument());
			expect(screen.getByTestId('recall-register')).toHaveTextContent('2 LEFT TODAY');

			await fireEvent.click(dockButton('Show Answer'));
			await fireEvent.click(dockTestId('recall-grade-good'));

			expect(recordGradeMock).toHaveBeenCalledWith(cardB, Rating.Good, expect.any(Date));
			await waitFor(() => expect(screen.getByText("What's the formula?")).toBeInTheDocument());
			expect(screen.getByTestId('recall-register')).toHaveTextContent('1 LEFT TODAY');

			await fireEvent.click(dockButton('Show Answer'));
			await fireEvent.click(dockTestId('recall-grade-easy'));

			await waitFor(() => screen.getByTestId('recall-complete'));
			expect(screen.getByTestId('recall-reviewed-count')).toHaveTextContent('3 REVIEWED TODAY');
		} finally {
			randomSpy.mockRestore();
		}
	});
});

/**
 * Daily new-card intro budget + due-backlog gate (260722-0ex, BACKLOG-1):
 * load() now calls getDueCards() BEFORE introduceNewCards, gates on the
 * >20 pre-due backlog, and consults/consumes remainingIntroBudget /
 * consumeIntroBudget for the remaining case. introBudget is fully mocked
 * (module-level vi.mock above) so these tests never touch real localStorage.
 */
describe('RecallSession daily intro budget + backlog gate (260722-0ex, BACKLOG-1)', () => {
	it('with more than 20 pre-due cards, introduceNewCards is never called (backlog gate)', async () => {
		const manyDueCards = Array.from({ length: 21 }, (_, i) =>
			makeCard(`interval-size:fake-${i}`, 'interval-size')
		);
		getDueCardsMock.mockResolvedValue(manyDueCards);
		getAllCardsMock.mockResolvedValue(manyDueCards);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-register'));

		expect(introduceNewCardsMock).not.toHaveBeenCalled();
		expect(remainingIntroBudgetMock).not.toHaveBeenCalled();
		expect(consumeIntroBudgetMock).not.toHaveBeenCalled();
		expect(screen.getByTestId('recall-register')).toHaveTextContent('21 LEFT TODAY');
	});

	it('with exactly 20 pre-due cards (at, not over, the gate), the budget path still runs (introduceNewCards is called)', async () => {
		const twentyDueCards = Array.from({ length: 20 }, (_, i) =>
			makeCard(`interval-size:fake-${i}`, 'interval-size')
		);
		getDueCardsMock.mockResolvedValue(twentyDueCards);
		getAllCardsMock.mockResolvedValue(twentyDueCards);
		introduceNewCardsMock.mockResolvedValue(0);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-register'));

		expect(introduceNewCardsMock).toHaveBeenCalledTimes(1);
	});

	it('with <= 20 pre-due cards and remaining budget, introduceNewCards is called with the remaining value and consumeIntroBudget is called with the returned fact count', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula');
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);
		remainingIntroBudgetMock.mockReturnValue(4);
		introduceNewCardsMock.mockResolvedValue(3);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		expect(introduceNewCardsMock).toHaveBeenCalledWith(4);
		expect(consumeIntroBudgetMock).toHaveBeenCalledWith(3, expect.any(Date));
	});

	it('when introduceNewCards introduces 0 facts, consumeIntroBudget is never called', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula');
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);
		remainingIntroBudgetMock.mockReturnValue(5);
		introduceNewCardsMock.mockResolvedValue(0);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		expect(introduceNewCardsMock).toHaveBeenCalledWith(5);
		expect(consumeIntroBudgetMock).not.toHaveBeenCalled();
	});

	it('when remainingIntroBudget reports 0, introduceNewCards is never called (budget exhausted for today)', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula');
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);
		remainingIntroBudgetMock.mockReturnValue(0);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		expect(introduceNewCardsMock).not.toHaveBeenCalled();
		expect(consumeIntroBudgetMock).not.toHaveBeenCalled();
	});

	it('re-fetches due cards after introduction, so a freshly-introduced New card enters the session', async () => {
		const preExisting = makeCard('interval-size:m3', 'interval-size');
		const freshlyIntroduced = makeCard('chord-formula:Cm7', 'chord-formula');
		remainingIntroBudgetMock.mockReturnValue(10);
		introduceNewCardsMock.mockResolvedValue(1);
		getDueCardsMock
			.mockResolvedValueOnce([preExisting])
			.mockResolvedValue([preExisting, freshlyIntroduced]);
		getAllCardsMock.mockResolvedValue([preExisting, freshlyIntroduced]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-register'));

		expect(getDueCardsMock).toHaveBeenCalledTimes(2);
		expect(consumeIntroBudgetMock).toHaveBeenCalledWith(1, expect.any(Date));
		expect(screen.getByTestId('recall-register')).toHaveTextContent('2 LEFT TODAY');
	});
});

/**
 * Confidence dots (sketch 020-B, Plan 25-06): the optional in-flow ? ~ !
 * picker on the formula-mode reveal-then-grade card. Asserts against the
 * REAL confidenceLog module (real localStorage, cleared per test) rather
 * than a mock, matching this file's existing convention of exercising real
 * non-deck/audio modules directly.
 */
describe('RecallSession confidence dots (sketch 020-B: optional, never gates, logs on grade)', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('logs confidence "certain" and correct:true when grading Good after picking the ! dot', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		await fireEvent.click(screen.getByTestId('recall-confidence-certain'));
		await fireEvent.click(dockButton('Show Answer'));
		await fireEvent.click(dockTestId('recall-grade-good'));

		expect(listConfidence()).toEqual([
			expect.objectContaining({
				factId: 'chord-formula:Cm7',
				mode: 'formula',
				confidence: 'certain',
				correct: true
			})
		]);
	});

	it('logs correct:true when grading Hard: FSRS Hard is a PASSING grade, never a confident-but-wrong entry (WR-06)', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		await fireEvent.click(screen.getByTestId('recall-confidence-certain'));
		await fireEvent.click(dockButton('Show Answer'));
		await fireEvent.click(dockTestId('recall-grade-hard'));

		expect(listConfidence()).toEqual([
			expect.objectContaining({
				factId: 'chord-formula:Cm7',
				confidence: 'certain',
				correct: true
			})
		]);
	});

	it('logs confidence "unrated" when grading Again (wrong) without picking any dot', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		await fireEvent.click(dockButton('Show Answer'));
		await fireEvent.click(dockTestId('recall-grade-again'));

		expect(listConfidence()).toEqual([
			expect.objectContaining({
				factId: 'chord-formula:Cm7',
				mode: 'formula',
				confidence: 'unrated',
				correct: false
			})
		]);
	});

	it('never gates Reveal or grading: the dots disappear once revealed, and Reveal/grade both work whether or not a dot was picked', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		// Dots render pre-reveal, outside the action dock.
		expect(screen.getByTestId('recall-confidence-dots')).toBeInTheDocument();
		expect(
			within(screen.getByTestId('recall-action-dock')).queryByTestId('recall-confidence-dots')
		).toBeNull();

		// Tapping the picked dot again clears it back to unrated (toggle-off).
		const certainDot = screen.getByTestId('recall-confidence-certain');
		await fireEvent.click(certainDot);
		expect(certainDot).toHaveAttribute('aria-pressed', 'true');
		await fireEvent.click(certainDot);
		expect(certainDot).toHaveAttribute('aria-pressed', 'false');

		// Reveal works with no dot picked, and the dot row is gone post-reveal.
		await fireEvent.click(dockButton('Show Answer'));
		expect(screen.queryByTestId('recall-confidence-dots')).toBeNull();

		await fireEvent.click(dockTestId('recall-grade-good'));
		expect(listConfidence()).toEqual([expect.objectContaining({ confidence: 'unrated', correct: true })]);
	});

	it('resets the confidence pick between cards: a pick on card A never leaks onto card B', async () => {
		const cardA = makeCard('chord-formula:Cm7', 'chord-formula');
		const cardB = makeCard('interval-size:m3', 'interval-size');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([cardA, cardB]);
		getAllCardsMock.mockResolvedValue([cardA, cardB]);

		// interleaveQueue (260722-0ex, BACKLOG-12) reorders the selected cards
		// via Math.random; pin it near 1 so the Fisher-Yates shuffle preserves
		// insertion order, keeping this fixture's queue position deterministic.
		const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.999);
		try {
			renderRecallSession();
			await waitFor(() => screen.getByTestId('recall-prompt'));

			await fireEvent.click(screen.getByTestId('recall-confidence-certain'));
			await fireEvent.click(dockButton('Show Answer'));
			await fireEvent.click(dockTestId('recall-grade-good'));

			await waitFor(() => expect(screen.getByText("What's the interval?")).toBeInTheDocument());
			expect(screen.getByTestId('recall-confidence-certain')).toHaveAttribute('aria-pressed', 'false');

			await fireEvent.click(dockButton('Show Answer'));
			await fireEvent.click(dockTestId('recall-grade-good'));

			expect(listConfidence()).toEqual([
				expect.objectContaining({ factId: 'chord-formula:Cm7', confidence: 'certain' }),
				expect.objectContaining({ factId: 'interval-size:m3', confidence: 'unrated' })
			]);
		} finally {
			randomSpy.mockRestore();
		}
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
		expect(dockButton('Check')).toBeDisabled();

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		expect(dockButton('Check')).toBeEnabled();
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

		await fireEvent.click(dockButton('Check'));

		expect(recordGradeMock).toHaveBeenCalledWith(card, Rating.Good, expect.any(Date));
		// No transform-on-wrong feedback: the legend only ever renders on a miss.
		expect(screen.queryByTestId('recall-mode-a-legend')).not.toBeInTheDocument();
		const feedback = screen.getByTestId('recall-mode-a-feedback').textContent?.trim();
		expect(CORRECT_VARIANTS).toContain(feedback);

		await fireEvent.click(dockButton('Next'));

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

		await fireEvent.click(dockButton('Check'));

		expect(recordGradeMock).toHaveBeenCalledWith(card, Rating.Again, expect.any(Date));
		expect(screen.getByTestId('recall-mode-a-legend')).toBeInTheDocument();
		expect(screen.getByText('The chord')).toBeInTheDocument();
		expect(screen.getByText('Your extra note')).toBeInTheDocument();
		expect(screen.getAllByText('extra note').length).toBeGreaterThan(0);
		const feedback = screen.getByTestId('recall-mode-a-feedback').textContent ?? '';
		expect(WRONG_VARIANTS.some((variant) => feedback.includes(variant))).toBe(true);

		await fireEvent.click(dockButton('Next'));

		// Re-enqueued (Rating.Again): the session is still 1 LEFT TODAY and the
		// see-play prompt shows again, fully reset (Check disabled again).
		await waitFor(() => expect(dockButton('Check')).toBeDisabled());
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

	it('a wrong choice records Rating.Again, shows RevealInsight, and waits for Continue instead of auto-advancing (BACKLOG-7)', async () => {
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

		// Choices are all disabled the instant an answer is committed.
		for (const button of getChoiceButtons()) {
			expect(button).toBeDisabled();
		}

		// No auto-advance timer is ever scheduled for a wrong answer
		// (260722-0ex, BACKLOG-7) - the Continue button surfaces immediately,
		// and even well past the OLD 650ms auto-advance window, the card has
		// NOT advanced.
		expect(dockButton('Continue')).toBeInTheDocument();
		await new Promise((resolve) => setTimeout(resolve, 700));
		expect(screen.getByTestId('recall-hear-name-feedback')).toBeInTheDocument();
		expect(screen.getByTestId('recall-register')).toHaveTextContent('1 LEFT TODAY');

		await fireEvent.click(dockButton('Continue'));

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

	it('never gates session completion: a session whose ONLY due card is hear-name still completes normally, a prior wrong answer (Continue-confirmed) re-queuing it (never blocking) rather than getting stuck', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'hear-name');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		// Answer wrong first: the queue's own re-enqueue-on-Again contract
		// (D-10, identical for every mode) requeues the card rather than
		// completing - this is normal FSRS retry behavior, not a gate. Mode
		// B's "never gates" guarantee is that a wrong answer always reaches a
		// way forward (Continue, per BACKLOG-7 - no manual action ever
		// permanently locks the session out).
		const wrongChoice = getChoiceButtons().find(
			(button) => button.textContent?.trim() !== 'Cm7'
		);
		await fireEvent.click(wrongChoice!);
		expect(recordGradeMock).toHaveBeenCalledWith(card, Rating.Again, expect.any(Date));

		await fireEvent.click(dockButton('Continue'));

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
 * Mode B post-answer hint-ladder wiring (Plan 04, HINT-01/HINT-02): the
 * ladder must never mount before an answer is committed (D-03), and opening
 * it must cancel the 650ms auto-advance and surface an explicit Continue
 * button that advances with the SAME rating the timer would have used
 * (D-04: hint depth never changes the recorded grade).
 */
describe('RecallSession Mode B post-answer hints (HINT-01/HINT-02: ladder gated on answer, timer cancel + Continue)', () => {
	function getChoiceButtons(): HTMLElement[] {
		return screen.getAllByRole('button', { name: /^Answer: / });
	}

	it('mounts no hint-cta before an answer is committed (never spoils the ear test)', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'hear-name');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		expect(screen.queryByTestId('hint-cta')).not.toBeInTheDocument();
	});

	it('mounts hint-cta once an answer is committed', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'hear-name');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: Cm7' }));

		expect(screen.getByTestId('hint-cta')).toBeInTheDocument();
	});

	it('opening a hint post-answer cancels the auto-advance and shows Continue; Continue then advances with the committed rating (correct choice completes the session)', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'hear-name');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: Cm7' }));
		expect(recordGradeMock).toHaveBeenCalledTimes(1);

		await fireEvent.click(screen.getByRole('button', { name: 'Need a hint?' }));
		expect(dockButton('Continue')).toBeInTheDocument();

		// Wait well past the 650ms auto-advance window: the card must NOT have
		// advanced (the choice grid's feedback is still on screen, still the
		// same card), proving the timer was actually cancelled.
		await new Promise((resolve) => setTimeout(resolve, 700));
		expect(screen.getByTestId('recall-hear-name-feedback')).toBeInTheDocument();
		expect(screen.queryByTestId('recall-complete')).not.toBeInTheDocument();

		// Opening the hint never fired a second grade write (D-04).
		expect(recordGradeMock).toHaveBeenCalledTimes(1);

		await fireEvent.click(dockButton('Continue'));

		await waitFor(() => screen.getByTestId('recall-complete'));
		expect(screen.getByTestId('recall-reviewed-count')).toHaveTextContent('1 REVIEWED TODAY');
		// Continue never re-grades (D-04): still exactly the one choice-time write.
		expect(recordGradeMock).toHaveBeenCalledTimes(1);
	});

	it('opening a hint on a wrong choice, then Continue, re-enqueues the card (never gates) with the same Again rating the timer would have used', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'hear-name');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		const wrongChoice = getChoiceButtons().find(
			(button) => button.textContent?.trim() !== 'Cm7'
		);
		await fireEvent.click(wrongChoice!);
		expect(recordGradeMock).toHaveBeenCalledWith(card, Rating.Again, expect.any(Date));
		expect(recordGradeMock).toHaveBeenCalledTimes(1);

		await fireEvent.click(screen.getByRole('button', { name: 'Need a hint?' }));
		await fireEvent.click(dockButton('Continue'));

		await waitFor(() => expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument());
		expect(screen.getByTestId('recall-register')).toHaveTextContent('1 LEFT TODAY');
		expect(screen.queryByTestId('recall-complete')).not.toBeInTheDocument();
		// Re-enqueue never re-grades (D-04): still exactly the one choice-time write.
		expect(recordGradeMock).toHaveBeenCalledTimes(1);
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

		// interleaveQueue (260722-0ex, BACKLOG-12) reorders the selected cards
		// via Math.random; pin it near 1 so the Fisher-Yates shuffle preserves
		// insertion order, keeping this fixture's queue position deterministic.
		const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.999);
		try {
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
		} finally {
			randomSpy.mockRestore();
		}
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

	it(
		'a wrong-heavy Mode C completion (BuildSession grades Again) re-enqueues the card instead of dropping it (260722-0ex, BACKLOG-6)',
		async () => {
			const card = makeCard('chord-formula:Cm7', 'chord-formula', 'formula-build');
			introduceNewCardsMock.mockResolvedValue(0);
			getDueCardsMock.mockResolvedValue([card]);
			getAllCardsMock.mockResolvedValue([card]);

			renderRecallSession();
			await waitFor(() => screen.getByTestId('recall-mode-chip'));
			expect(screen.getByTestId('recall-register')).toHaveTextContent('1 LEFT TODAY');

			// Cm7 has 3 steps, so the Again threshold is 2*3=6 wrong taps.
			for (let i = 0; i < 6; i++) {
				await fireEvent.click(screen.getAllByRole('button', { name: 'D key' })[0]);
				await new Promise((resolve) => setTimeout(resolve, 700));
			}
			await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
			await new Promise((resolve) => setTimeout(resolve, 700));
			await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
			await new Promise((resolve) => setTimeout(resolve, 700));
			await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
			await new Promise((resolve) => setTimeout(resolve, 700));

			expect(screen.getByTestId('build-complete')).toBeInTheDocument();
			await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

			// Re-enqueued (Rating.Again, D-10): the register never drops to 0 and
			// the session is NOT complete - the same formula-build card is back.
			await waitFor(() =>
				expect(screen.getByTestId('recall-mode-chip')).toHaveTextContent('FORMULA → BUILD')
			);
			expect(screen.getByTestId('recall-register')).toHaveTextContent('1 LEFT TODAY');
			expect(screen.queryByTestId('recall-complete')).not.toBeInTheDocument();

			// Adversarial-review fix (cardEpoch): a re-enqueued sole item keeps
			// the SAME factId|mode key (advanceQueue's Again path on a one-item
			// queue returns the same head object), so without cardEpoch the
			// embedded BuildSession would never remount and would stay frozen on
			// its OWN 'complete' screen forever. Assert the fresh building state
			// is actually shown, not the stale completion screen.
			expect(screen.queryByTestId('build-complete')).not.toBeInTheDocument();
			expect(screen.getByTestId('build-active')).toBeInTheDocument();
			expect(screen.getByTestId('build-register')).toHaveTextContent('STEP 1 OF 3');

			// A second Next tap must NOT be immediately available (the fresh
			// BuildSession instance is back in its 'building' state, not
			// 'complete') - if the component were still stuck, this button
			// would still be present and clicking it would inflate
			// reviewedCount again.
			expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
		},
		10000
	);
});

/**
 * Recall telemetry (260722-0ex, BACKLOG-2's recall half): every recall grade
 * path (handleModeACheck, handleHearNameChoice, handleGrade) fires exactly
 * one recordPracticeAnswer call with a valid AnswerEvent kind. Mode C
 * (handleModeCNext) is explicitly OUT of scope - BuildSession owns its own
 * grade write.
 */
describe('RecallSession recall telemetry (260722-0ex, BACKLOG-2)', () => {
	it('handleGrade (formula mode, chord-formula fact): posts one recordPracticeAnswer with kind chord and the symbol as item', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		await fireEvent.click(dockButton('Show Answer'));
		await fireEvent.click(dockTestId('recall-grade-good'));

		expect(recordPracticeAnswerMock).toHaveBeenCalledTimes(1);
		expect(recordPracticeAnswerMock).toHaveBeenCalledWith(
			expect.objectContaining({ item: 'Cm7', kind: 'chord', correct: true })
		);
	});

	it('handleGrade (formula mode, interval-size fact): posts kind interval with the short name as item', async () => {
		const card = makeCard('interval-size:m3', 'interval-size', 'formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		await fireEvent.click(dockButton('Show Answer'));
		await fireEvent.click(dockTestId('recall-grade-again'));

		expect(recordPracticeAnswerMock).toHaveBeenCalledTimes(1);
		expect(recordPracticeAnswerMock).toHaveBeenCalledWith(
			expect.objectContaining({ item: 'm3', kind: 'interval', correct: false })
		);
	});

	it('handleGrade (formula mode, scale-degree fact): posts kind scale with "{tonic} major" as item; Hard grades correct:true (FSRS Hard is a pass)', async () => {
		const card = makeCard('scale-degree:G:3', 'scale-degree', 'formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		await fireEvent.click(dockButton('Show Answer'));
		await fireEvent.click(dockTestId('recall-grade-hard'));

		expect(recordPracticeAnswerMock).toHaveBeenCalledTimes(1);
		expect(recordPracticeAnswerMock).toHaveBeenCalledWith(
			expect.objectContaining({ item: 'G major', kind: 'scale', correct: true })
		);
	});

	it('handleModeACheck (see-play): a correct Check posts one recordPracticeAnswer with kind chord, correct:true', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'see-play');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
		await fireEvent.click(dockButton('Check'));

		expect(recordPracticeAnswerMock).toHaveBeenCalledTimes(1);
		expect(recordPracticeAnswerMock).toHaveBeenCalledWith(
			expect.objectContaining({ item: 'Cm7', kind: 'chord', correct: true })
		);
	});

	it('handleModeACheck (see-play): a wrong Check posts one recordPracticeAnswer with correct:false', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'see-play');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(dockButton('Check'));

		expect(recordPracticeAnswerMock).toHaveBeenCalledTimes(1);
		expect(recordPracticeAnswerMock).toHaveBeenCalledWith(
			expect.objectContaining({ item: 'Cm7', kind: 'chord', correct: false })
		);
	});

	it('handleHearNameChoice: a correct choice posts one recordPracticeAnswer with correct:true', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'hear-name');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: Cm7' }));

		expect(recordPracticeAnswerMock).toHaveBeenCalledTimes(1);
		expect(recordPracticeAnswerMock).toHaveBeenCalledWith(
			expect.objectContaining({ item: 'Cm7', kind: 'chord', correct: true })
		);
	});

	it('handleHearNameChoice: a wrong choice posts one recordPracticeAnswer with correct:false, fired immediately (not deferred to Continue)', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'hear-name');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		const wrongChoice = screen
			.getAllByRole('button', { name: /^Answer: / })
			.find((button) => button.textContent?.trim() !== 'Cm7');
		await fireEvent.click(wrongChoice!);

		expect(recordPracticeAnswerMock).toHaveBeenCalledTimes(1);
		expect(recordPracticeAnswerMock).toHaveBeenCalledWith(
			expect.objectContaining({ item: 'Cm7', kind: 'chord', correct: false })
		);

		// Confirms it fired at commit time, not gated behind the Continue tap.
		await fireEvent.click(dockButton('Continue'));
		expect(recordPracticeAnswerMock).toHaveBeenCalledTimes(1);
	});

	it('Mode C (formula-build) never posts recall telemetry - BuildSession owns its own grade write', async () => {
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
		expect(recordPracticeAnswerMock).not.toHaveBeenCalled();
	});
});

/**
 * HintLadder wiring (17-03, HINT-01/HINT-02): the escalating "Need a hint?"
 * ladder mounted on see-play (pre-answer only) and formula-build (whole
 * card, chord targets only). Uses the REAL HintLadder component (not
 * mocked) against real catalog factIds, matching this file's established
 * convention of exercising real derivation logic against a mocked
 * deck/audio seam only.
 */
describe('RecallSession hint ladder wiring (17-03: see-play + formula-build)', () => {
	it('see-play: shows "Need a hint?" pre-answer alongside Check, reveals the family layer on tap, Check remains clickable, a correct Check still records Rating.Good, and the ladder is gone once answered', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'see-play');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		expect(screen.getByTestId('hint-cta')).toBeInTheDocument();
		expect(dockButton('Check')).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Need a hint?' }));

		const familyLayer = screen.getByTestId('hint-layer');
		expect(familyLayer).toHaveAttribute('data-layer', 'family');
		expect(dockButton('Check')).toBeInTheDocument();

		// Cm7's exact chroma set: C (root), D♯/E♭ (third), G (fifth), A♯/B♭ (seventh).
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
		await fireEvent.click(dockButton('Check'));

		expect(recordGradeMock).toHaveBeenCalledWith(card, Rating.Good, expect.any(Date));
		expect(screen.queryByTestId('hint-cta')).not.toBeInTheDocument();
		expect(screen.queryByTestId('hint-layer')).not.toBeInTheDocument();
	});

	it('formula-build: a chord-formula card renders HintLadder above the embedded BuildSession, which still mounts in its building state', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'formula-build');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-mode-chip'));

		expect(screen.getByTestId('hint-cta')).toBeInTheDocument();
		expect(screen.getByTestId('build-session')).toBeInTheDocument();
		expect(screen.getByTestId('build-register')).toHaveTextContent('STEP 1 OF 3');
	});

	it('formula-build: a scale-formula card renders NO hint ladder but still mounts BuildSession', async () => {
		const card = makeCard('scale-formula:G', 'scale-formula', 'formula-build');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-mode-chip'));

		expect(screen.queryByTestId('hint-cta')).not.toBeInTheDocument();
		expect(screen.getByTestId('build-session')).toBeInTheDocument();
	});

	it('per-card reset: after a wrong Check re-enqueues the card (hints were opened), its next presentation shows a fresh "Need a hint?" at depth 0', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'see-play');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		await fireEvent.click(screen.getByRole('button', { name: 'Need a hint?' }));
		expect(screen.getByTestId('hint-layer')).toBeInTheDocument();

		// Miss the seventh, so the Check is wrong and Rating.Again re-enqueues the card.
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await fireEvent.click(dockButton('Check'));

		expect(recordGradeMock).toHaveBeenCalledWith(card, Rating.Again, expect.any(Date));

		await fireEvent.click(dockButton('Next'));

		await waitFor(() => expect(screen.getByText('Play it on the keyboard.')).toBeInTheDocument());
		expect(screen.getByRole('button', { name: 'Need a hint?' })).toBeInTheDocument();
		expect(screen.queryByTestId('hint-layer')).not.toBeInTheDocument();
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

		// interleaveQueue (260722-0ex, BACKLOG-12) reorders the selected cards
		// via Math.random; pin it near 1 so the Fisher-Yates shuffle preserves
		// insertion order, keeping this fixture's queue position deterministic.
		const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.999);
		try {
			renderRecallSession();
			await waitFor(() => screen.getByTestId('recall-unrenderable'));
			expect(screen.getByTestId('recall-register')).toHaveTextContent('2 LEFT TODAY');

			await fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

			await waitFor(() => expect(screen.getByText("What's the formula?")).toBeInTheDocument());
			expect(screen.getByTestId('recall-register')).toHaveTextContent('1 LEFT TODAY');
		} finally {
			randomSpy.mockRestore();
		}
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
		await fireEvent.click(dockButton('Show Answer'));
		await fireEvent.click(dockTestId('recall-grade-good'));

		// Card 2 (see-play): a correct Check, then Next - none of the teach
		// cluster's cards were capped out by the fact-level cap.
		await waitFor(() =>
			expect(screen.getByTestId('recall-mode-chip')).toHaveTextContent('SYMBOL → PLAY')
		);
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
		await fireEvent.click(dockButton('Check'));
		await fireEvent.click(dockButton('Next'));

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

		// interleaveQueue (260722-0ex, BACKLOG-12) reorders the selected cards
		// via Math.random; pin it near 1 so the Fisher-Yates shuffle preserves
		// selectReviewCards' own weakest-first ordering, keeping this fixture's
		// queue position deterministic.
		const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.999);
		try {
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
			await fireEvent.click(dockButton('Check'));
			await fireEvent.click(dockButton('Next'));

			await waitFor(() =>
				expect(screen.getByTestId('recall-mode-chip')).toHaveTextContent('SYMBOL → FORMULA')
			);
			expect(screen.queryByText('Listen. Name the chord.')).not.toBeInTheDocument();
			await fireEvent.click(dockButton('Show Answer'));
			await fireEvent.click(dockTestId('recall-grade-good'));

			// The session completes at 2, having never encountered the hear-name
			// card - the cap held for the whole session, not just its first item.
			await waitFor(() => screen.getByTestId('recall-complete'));
			expect(screen.getByTestId('recall-reviewed-count')).toHaveTextContent('2 REVIEWED TODAY');
		} finally {
			randomSpy.mockRestore();
		}
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

		// interleaveQueue (260722-0ex, BACKLOG-12) reorders the selected cards
		// via Math.random; pin it near 1 so the Fisher-Yates shuffle preserves
		// insertion order, keeping this fixture's queue position deterministic.
		const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.999);
		try {
			renderRecallSession();
			await waitFor(() => screen.getByTestId('recall-register'));
			expect(screen.getByTestId('recall-register')).toHaveTextContent('4 LEFT TODAY');

			// Card 1 (formula, interval-size:m3): reveal + grade buttons.
			expect(screen.getByTestId('recall-mode-chip')).toHaveTextContent('SYMBOL → FORMULA');
			await fireEvent.click(dockButton('Show Answer'));
			await fireEvent.click(dockTestId('recall-grade-good'));

			// Card 2 (see-play, chord-formula:Dm7): Check + Next.
			await waitFor(() =>
				expect(screen.getByTestId('recall-mode-chip')).toHaveTextContent('SYMBOL → PLAY')
			);
			await fireEvent.click(screen.getAllByRole('button', { name: 'D key' })[0]);
			await fireEvent.click(screen.getAllByRole('button', { name: 'F key' })[0]);
			await fireEvent.click(screen.getAllByRole('button', { name: 'A key' })[0]);
			await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
			await fireEvent.click(dockButton('Check'));
			await fireEvent.click(dockButton('Next'));

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
		} finally {
			randomSpy.mockRestore();
		}
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

		await fireEvent.click(dockButton('Show Answer'));
		await fireEvent.click(dockTestId('recall-grade-good'));

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

		// interleaveQueue (260722-0ex, BACKLOG-12) reorders the selected cards
		// via Math.random; pin it near 1 so the Fisher-Yates shuffle preserves
		// insertion order, keeping this fixture's queue position deterministic.
		const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.999);
		try {
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
		} finally {
			randomSpy.mockRestore();
		}
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
		await fireEvent.click(dockButton('Check'));

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

		await fireEvent.click(dockButton('Show Answer'));

		const afterKeyboards = screen.getAllByRole('img', { name: /piano keyboard/i });
		expect(afterKeyboards).toHaveLength(1);
		expect(afterKeyboards[0].querySelectorAll('.piano-keyboard__key--root').length).toBeGreaterThan(
			0
		);
	});
});

/**
 * SONG-02 queue-restriction coverage (Phase 18, Plan 03): when the filter is
 * ON, load() restricts getDueCards()'s raw output to chord-formula cards
 * whose symbol has provenance in the passed index, dropping both non-song
 * chords and non-chord facts (interval-size/scale-degree). When the index is
 * empty (no derivable song chords), the queue stays unfiltered so the session
 * never dead-ends.
 */
describe('RecallSession song-filter queue restriction (SONG-02, 18-03)', () => {
	it('with the filter ON and a non-empty provenance index, keeps only the song chord-formula card', async () => {
		const songChordCard = makeCard('chord-formula:Cm7', 'chord-formula', 'formula');
		const nonSongChordCard = makeCard('chord-formula:Gm7', 'chord-formula', 'formula');
		const nonChordCard = makeCard('interval-size:m3', 'interval-size', 'formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([songChordCard, nonSongChordCard, nonChordCard]);
		getAllCardsMock.mockResolvedValue([songChordCard, nonSongChordCard, nonChordCard]);

		const provenanceIndex = new Map([[normalizeSymbolForMatch('Cm7'), ['Autumn Leaves']]]);
		renderRecallSession({ songFilterOn: true, provenanceIndex });

		await waitFor(() => screen.getByTestId('recall-register'));
		expect(screen.getByTestId('recall-register')).toHaveTextContent('1 LEFT TODAY');
		expect(screen.getByText("What's the formula?")).toBeInTheDocument();

		await fireEvent.click(dockButton('Show Answer'));
		await fireEvent.click(dockTestId('recall-grade-good'));

		await waitFor(() => screen.getByTestId('recall-complete'));
		expect(screen.getByTestId('recall-reviewed-count')).toHaveTextContent('1 REVIEWED TODAY');
	});

	it('with the filter ON and an EMPTY provenance index, leaves the full queue unfiltered (fallback, no dead-end)', async () => {
		const songChordCard = makeCard('chord-formula:Cm7', 'chord-formula', 'formula');
		const nonChordCard = makeCard('interval-size:m3', 'interval-size', 'formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([songChordCard, nonChordCard]);
		getAllCardsMock.mockResolvedValue([songChordCard, nonChordCard]);

		renderRecallSession({ songFilterOn: true, provenanceIndex: new Map() });

		await waitFor(() => screen.getByTestId('recall-register'));
		expect(screen.getByTestId('recall-register')).toHaveTextContent('2 LEFT TODAY');
	});

	/**
	 * MD-02 regression: when the song filter hides every real due card, the
	 * page must not fold into the generic "Nothing due today" copy (which is
	 * factually wrong here - real due cards exist, they're just hidden). A
	 * distinct filter-aware message surfaces instead, so a user can't let real
	 * due cards go stale indefinitely without realizing the filter is why.
	 */
	it('with the filter ON hiding every due card while real due cards exist, shows a distinct filter-aware empty message (MD-02)', async () => {
		const nonSongChordCard = makeCard('chord-formula:Gm7', 'chord-formula', 'formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([nonSongChordCard]);
		getAllCardsMock.mockResolvedValue([nonSongChordCard]);

		const provenanceIndex = new Map([[normalizeSymbolForMatch('Cm7'), ['Autumn Leaves']]]);
		renderRecallSession({ songFilterOn: true, provenanceIndex });

		await waitFor(() => screen.getByTestId('recall-empty-filtered-none-due'));
		expect(screen.getByText('No song chords due today.')).toBeInTheDocument();
		expect(screen.getByText(/1 other card is waiting\. Turn the filter off to see them\./)).toBeInTheDocument();
		// Never the generic message, which would be factually wrong here.
		expect(screen.queryByTestId('recall-empty-none-due')).not.toBeInTheDocument();
		expect(screen.queryByText('Nothing due today.')).not.toBeInTheDocument();
	});

	it('with the filter ON hiding multiple due cards, pluralizes the hidden-card count correctly (MD-02)', async () => {
		const gm7 = makeCard('chord-formula:Gm7', 'chord-formula', 'formula');
		const dm7 = makeCard('chord-formula:Dm7', 'chord-formula', 'formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([gm7, dm7]);
		getAllCardsMock.mockResolvedValue([gm7, dm7]);

		const provenanceIndex = new Map([[normalizeSymbolForMatch('Cm7'), ['Autumn Leaves']]]);
		renderRecallSession({ songFilterOn: true, provenanceIndex });

		await waitFor(() => screen.getByTestId('recall-empty-filtered-none-due'));
		expect(screen.getByText(/2 other cards are waiting\. Turn the filter off to see them\./)).toBeInTheDocument();
	});
});

/**
 * SongMark rendering coverage (SONG-01, Phase 18, Plan 03): a song chord's
 * mark shows immediately in formula/see-play/formula-build (the symbol is
 * already visible or the task is building from a known symbol - not a
 * spoiler), but in hear-name the mark must render ONLY after the user
 * answers, since the choice buttons ARE the candidate answers.
 */
describe('RecallSession SongMark rendering (SONG-01, 18-03)', () => {
	const provenanceIndex = new Map([[normalizeSymbolForMatch('Cm7'), ['Autumn Leaves']]]);

	it('formula mode: shows the SongMark immediately for a song chord', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession({ provenanceIndex });
		await waitFor(() => screen.getByTestId('recall-prompt'));

		expect(screen.getByTestId('song-mark')).toHaveTextContent('Autumn Leaves');
	});

	it('see-play mode: shows the SongMark immediately for a song chord', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'see-play');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession({ provenanceIndex });
		await waitFor(() => screen.getByTestId('recall-prompt'));

		expect(screen.getByTestId('song-mark')).toHaveTextContent('Autumn Leaves');
	});

	it('formula-build mode: shows the SongMark immediately for a song chord', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'formula-build');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession({ provenanceIndex });
		await waitFor(() => screen.getByTestId('recall-mode-chip'));

		expect(screen.getByTestId('song-mark')).toHaveTextContent('Autumn Leaves');
	});

	it('a non-song chord shows no SongMark in any mode', async () => {
		const card = makeCard('chord-formula:Gm7', 'chord-formula', 'formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession({ provenanceIndex });
		await waitFor(() => screen.getByTestId('recall-prompt'));

		expect(screen.queryByTestId('song-mark')).not.toBeInTheDocument();
	});

	it('hear-name mode: the SongMark is absent before answering and present only after a choice is selected (spoiler safety)', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'hear-name');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession({ provenanceIndex });
		await waitFor(() => screen.getByTestId('recall-prompt'));

		expect(screen.queryByTestId('song-mark')).not.toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: Cm7' }));

		expect(screen.getByTestId('song-mark')).toHaveTextContent('Autumn Leaves');
	});
});

/**
 * I18N-03 tight-surface fit check (20-02): the grade row's
 * `grid-cols-2 sm:grid-cols-4` breakpoint is width-driven, not
 * language-driven (20-UI-SPEC "Grading buttons"), so switching to French
 * must render the locked FR grade labels without altering that
 * responsive class - proving the surface fits French copy at every
 * viewport with no FR-only layout override.
 */
describe('RecallSession French grade-button fit (I18N-03)', () => {
	it('renders the FR grade labels with the sm:grid-cols-4 breakpoint unchanged', async () => {
		setLocale('fr');
		const card = makeCard('chord-formula:Cm7', 'chord-formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		await fireEvent.click(dockButton('Voir la réponse'));

		const dock = within(screen.getByTestId('recall-action-dock'));
		const grid = dock.getByTestId('recall-grade-grid');
		expect(grid.className).toContain('grid-cols-2');
		expect(grid.className).toContain('sm:grid-cols-4');

		expect(dock.getByText('À revoir')).toBeInTheDocument();
		expect(dock.getByText('Difficile')).toBeInTheDocument();
		expect(dock.getByText('Correct')).toBeInTheDocument();
		expect(dock.getByText('Facile')).toBeInTheDocument();
	});
});

/**
 * Phone-only review action dock coverage (Phase 24 Plan 01, Sketch 014-A,
 * issue #14 point 1): proves the dock exists, hosts each mode's primary
 * advance action wired to the SAME pre-existing handlers as before this
 * plan (no new grading/reveal logic), and stays empty for formula-build
 * (Mode C, which owns its own embedded BuildSession actions/keyboard).
 */
describe('RecallSession action dock (Sketch 014-A, issue #14 point 1)', () => {
	it('formula mode: the dock hosts Show Answer before reveal, then the 4 grade buttons after reveal', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		const dock = screen.getByTestId('recall-action-dock');
		expect(within(dock).getByRole('button', { name: 'Show Answer' })).toBeInTheDocument();

		await fireEvent.click(dockButton('Show Answer'));

		expect(within(dock).getByTestId('recall-grade-again')).toBeInTheDocument();
		expect(within(dock).getByTestId('recall-grade-hard')).toBeInTheDocument();
		expect(within(dock).getByTestId('recall-grade-good')).toBeInTheDocument();
		expect(within(dock).getByTestId('recall-grade-easy')).toBeInTheDocument();
	});

	it('formula mode: clicking a docked grade button advances the queue via the real handleGrade (reviewedCount increments, session completes)', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		await fireEvent.click(dockButton('Show Answer'));
		await fireEvent.click(dockTestId('recall-grade-good'));

		// A docked grade click reuses handleGrade verbatim: it records the FSRS
		// rating, advances the queue, and completes the session exactly as the
		// pre-plan in-flow grade button did.
		expect(recordGradeMock).toHaveBeenCalledWith(card, Rating.Good, expect.any(Date));
		await waitFor(() => screen.getByTestId('recall-complete'));
		expect(screen.getByTestId('recall-reviewed-count')).toHaveTextContent('1 REVIEWED TODAY');
	});

	it('see-play mode: the dock hosts Check (unanswered, wired to handleModeACheck) then Next (answered, wired to handleModeANext)', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'see-play');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		const dock = screen.getByTestId('recall-action-dock');
		expect(within(dock).getByRole('button', { name: 'Check' })).toBeDisabled();

		// Cm7's exact chroma set: C (root), D♯/E♭ (third), G (fifth), A♯/B♭ (seventh).
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);

		expect(within(dock).getByRole('button', { name: 'Check' })).toBeEnabled();
		await fireEvent.click(dockButton('Check'));

		expect(recordGradeMock).toHaveBeenCalledWith(card, Rating.Good, expect.any(Date));
		expect(within(dock).getByRole('button', { name: 'Next' })).toBeInTheDocument();
		expect(within(dock).queryByRole('button', { name: 'Check' })).not.toBeInTheDocument();

		await fireEvent.click(dockButton('Next'));

		await waitFor(() => screen.getByTestId('recall-complete'));
		expect(screen.getByTestId('recall-reviewed-count')).toHaveTextContent('1 REVIEWED TODAY');
	});

	it('hear-name mode: the dock is empty until a post-answer hint is opened, then hosts Continue wired to advanceHearName with the committed rating', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'hear-name');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		const dock = screen.getByTestId('recall-action-dock');
		// Nothing docked yet: hear-name's choice grid is the answer surface,
		// not a dock action, and no hint has been opened.
		expect(dock.textContent?.trim()).toBe('');

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: Cm7' }));
		expect(queryDockButton('Continue')).not.toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Need a hint?' }));
		expect(dockButton('Continue')).toBeInTheDocument();

		await fireEvent.click(dockButton('Continue'));

		await waitFor(() => screen.getByTestId('recall-complete'));
		expect(screen.getByTestId('recall-reviewed-count')).toHaveTextContent('1 REVIEWED TODAY');
	});

	it('formula-build mode: the dock renders no action (the embedded BuildSession owns its own actions/keyboard)', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'formula-build');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-mode-chip'));

		const dock = screen.getByTestId('recall-action-dock');
		expect(dock.textContent?.trim()).toBe('');
		expect(screen.getByTestId('build-session')).toBeInTheDocument();
	});

	it('desktop parity: the dock and the desktop in-flow slot are both present in the DOM and share the same handler wiring - the self-contained min-width:640px media query (not a Tailwind sm: utility) decides which one is visible', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'formula');
		introduceNewCardsMock.mockResolvedValue(0);
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);

		renderRecallSession();
		await waitFor(() => screen.getByTestId('recall-prompt'));

		// jsdom never evaluates media queries (mirrors Phase 23's
		// masthead/bottom-tab-bar dual-render precedent), so BOTH placements
		// exist simultaneously here: the dock (phone) and the in-flow slot
		// (desktop). Two "Show Answer" buttons prove the dual-render; clicking
		// either one calls the exact same handleReveal, so both flip to the
		// SAME 4-grade-button state afterward (proving one snippet, no fork).
		const showAnswerButtons = screen.getAllByRole('button', { name: 'Show Answer' });
		expect(showAnswerButtons).toHaveLength(2);

		await fireEvent.click(showAnswerButtons[0]);

		expect(screen.getAllByTestId('recall-grade-good')).toHaveLength(2);
	});
});
