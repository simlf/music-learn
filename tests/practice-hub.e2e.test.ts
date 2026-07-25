import { render, screen, fireEvent, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PracticePage from '../src/routes/practice/+page.svelte';
import { newCard, Rating } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';
import { writeSongFilter } from '$lib/practice/songFilterPref';
import { saveSong } from '$lib/practice/songs';

/**
 * /practice host tests (27-04): the thin host's pre-start landing, the
 * three empty tiers, the single "Start practice" gate (PRAC-01), and the
 * in-session routing/family-cue/FSRS-grade-commit/end-card loop over the
 * three carded families. Mirrors recallSession.test.ts's mock architecture:
 * $lib/srs/deck and $lib/srs/introBudget are mocked (deterministic due-card
 * sets, no real Dexie/IndexedDB), $lib/practice/answerTelemetry and
 * $lib/audio/audio are mocked, but $lib/srs/rotation, $lib/srs/facts, and
 * $lib/practice/practiceQueue all run REAL so the actual FSRS-ordering/
 * queue-composition logic is exercised end-to-end. songFilterPref/
 * songProvenance/songs are also REAL (plain localStorage, safe in jsdom).
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
	// Embedded BuildSession keeps sound/study-mode off so its own reveal takes
	// the visual-only path (mirrors recallSession.test.ts's exact rationale).
	soundEnabled: () => false,
	studyModeEnabled: () => false,
	playArpeggio: () => {}
}));

const NOW = new Date('2026-07-25T12:00:00Z');

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
	getCardMock.mockReset();
	getCardMock.mockResolvedValue(undefined);
	remainingIntroBudgetMock.mockReset().mockReturnValue(0);
	consumeIntroBudgetMock.mockReset();
	recordPracticeAnswerMock.mockReset();
	playChordMock.mockReset();
	playNoteMock.mockReset();
	ensureAudioReadyMock.mockReset();
	ensureAudioReadyMock.mockResolvedValue(undefined);
});

afterEach(() => {
	vi.restoreAllMocks();
	localStorage.clear();
});

describe('pre-start landing (PRAC-01)', () => {
	it('shows the due-count register and exactly one primary CTA, never a mode-picker grid', async () => {
		getDueCardsMock.mockResolvedValue([
			makeCard('interval-size:m2', 'interval-size', 'formula'),
			makeCard('interval-size:M2', 'interval-size', 'formula')
		]);

		render(PracticePage);

		const preStart = await screen.findByTestId('practice-pre-start');
		expect(within(preStart).getByTestId('practice-due-register')).toHaveTextContent(
			'2 CARDS DUE TODAY'
		);
		// PRAC-01 hard gate: exactly one button (Start practice), never a grid
		// of per-family buttons.
		const buttons = within(preStart).getAllByRole('button');
		expect(buttons).toHaveLength(1);
		expect(buttons[0]).toHaveTextContent('Start practice');
	});

	it('tapping Start moves the page into the reviewing state', async () => {
		getDueCardsMock.mockResolvedValue([makeCard('interval-size:m2', 'interval-size', 'formula')]);

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');
		await fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));

		expect(screen.getByTestId('practice-register')).toBeInTheDocument();
		expect(screen.getByTestId('question-source-tag')).toHaveTextContent('INTERVAL');
	});
});

describe('empty tiers', () => {
	it('empty deck: no cards anywhere shows the no-deck copy', async () => {
		getDueCardsMock.mockResolvedValue([]);
		getAllCardsMock.mockResolvedValue([]);

		render(PracticePage);

		const empty = await screen.findByTestId('practice-empty-no-deck');
		expect(empty).toHaveTextContent('Nothing to practice yet.');
	});

	it('nothing due: cards exist but none are due shows the none-due copy', async () => {
		getDueCardsMock.mockResolvedValue([]);
		getAllCardsMock.mockResolvedValue([makeCard('chord-formula:Cm7', 'chord-formula', 'formula')]);

		render(PracticePage);

		const empty = await screen.findByTestId('practice-empty-none-due');
		expect(empty).toHaveTextContent('Nothing due today.');
		expect(empty).toHaveTextContent("Every card's tucked in for later.");
	});

	it('song filter hides all due cards: shows the filtered copy with the hidden count', async () => {
		writeSongFilter(true);
		saveSong({
			id: 'test-song',
			name: 'Test Song',
			chordSymbols: ['G7'],
			createdAt: new Date().toISOString(),
			source: 'custom',
			active: true
		});
		// Cm7 has no provenance in the one active song above (only G7 does),
		// so the filter hides this single due card.
		getDueCardsMock.mockResolvedValue([
			makeCard('chord-formula:Cm7', 'chord-formula', 'see-play')
		]);

		render(PracticePage);

		const empty = await screen.findByTestId('practice-empty-filtered');
		expect(empty).toHaveTextContent('No song chords due today.');
		expect(empty).toHaveTextContent(
			'1 other card is waiting. Turn off the song filter on the Songs page to see it.'
		);
	});
});

describe('carded grade commit (PRAC-03/REG-01/T-27-04-01)', () => {
	it('a correct name-it answer commits Rating.Good via deck.recordGrade for the item\'s own card', async () => {
		const card = makeCard('chord-formula:Dm7', 'chord-formula', 'see-play');
		getDueCardsMock.mockResolvedValue([card]);

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');
		await fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));

		expect(screen.getByTestId('practice-chord-drill')).toBeInTheDocument();
		expect(screen.getByTestId('question-source-tag')).toHaveTextContent('NAME IT');

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: Dm7' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(recordGradeMock).toHaveBeenCalledTimes(1);
		expect(recordGradeMock).toHaveBeenCalledWith(card, Rating.Good);
		expect(recordPracticeAnswerMock).toHaveBeenCalledWith(
			expect.objectContaining({ item: 'Dm7', kind: 'chord', correct: true })
		);
		expect(screen.getByTestId('session-end-card')).toHaveTextContent('ROUND COMPLETE');
	});

	it('a wrong name-it answer commits Rating.Again and re-enqueues the item (D-10); a later correct answer completes the round with the miss listed', async () => {
		const card = makeCard('chord-formula:Dm7', 'chord-formula', 'see-play');
		getDueCardsMock.mockResolvedValue([card]);

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');
		await fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));

		const choices = screen.getAllByRole('button', { name: /^Answer: / });
		const wrong = choices.find((button) => button.getAttribute('aria-label') !== 'Answer: Dm7');
		expect(wrong).toBeDefined();
		await fireEvent.click(wrong!);
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(recordGradeMock).toHaveBeenCalledTimes(1);
		expect(recordGradeMock).toHaveBeenCalledWith(card, Rating.Again);
		// Again re-enqueues the sole item (advanceHybridQueue's D-10 contract):
		// the round is not complete yet, and the same item comes back around.
		expect(screen.queryByTestId('session-end-card')).not.toBeInTheDocument();
		expect(screen.getByTestId('practice-chord-drill')).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: Dm7' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(recordGradeMock).toHaveBeenCalledTimes(2);
		expect(recordGradeMock).toHaveBeenNthCalledWith(2, card, Rating.Good);

		const endCard = screen.getByTestId('session-end-card');
		expect(endCard).toHaveTextContent('ROUND COMPLETE');
		expect(within(endCard).getByTestId('practice-end-card-misses')).toHaveTextContent('Dm7');
	});

	it('an interval item commits its own card and rating', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.1); // forces interval identification direction
		const card = makeCard('interval-size:m3', 'interval-size', 'formula');
		getDueCardsMock.mockResolvedValue([card]);

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');
		await fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));

		expect(screen.getByTestId('practice-interval-drill')).toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: 'Answer: m3' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(recordGradeMock).toHaveBeenCalledTimes(1);
		expect(recordGradeMock).toHaveBeenCalledWith(card, Rating.Good);
	});
});

describe('mixed carded families: routing, family cue, and session drain', () => {
	it('routes name-it/interval/build-it to their own component with a correctly-labeled family cue, and drains to the reused end-card', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.1);

		const buildCard = makeCard('chord-formula:Cm7', 'chord-formula', 'formula-build');
		const nameCard = makeCard('chord-formula:Dm7', 'chord-formula', 'see-play');
		const intervalCard = makeCard('interval-size:m3', 'interval-size', 'formula');
		getDueCardsMock.mockResolvedValue([buildCard, nameCard, intervalCard]);
		getCardMock.mockImplementation(async (factId: string, mode: string) =>
			factId === 'chord-formula:Cm7' && mode === 'formula-build' ? buildCard : undefined
		);

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');
		await fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));

		const seenFamilies = new Set<string>();

		for (let i = 0; i < 3; i++) {
			if (screen.queryByTestId('practice-chord-drill')) {
				seenFamilies.add('name-it');
				expect(screen.getByTestId('question-source-tag')).toHaveTextContent('NAME IT');
				await fireEvent.click(screen.getByRole('button', { name: 'Answer: Dm7' }));
				await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
			} else if (screen.queryByTestId('practice-interval-drill')) {
				seenFamilies.add('interval');
				expect(screen.getByTestId('question-source-tag')).toHaveTextContent('INTERVAL');
				await fireEvent.click(screen.getByRole('button', { name: 'Answer: m3' }));
				await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
			} else if (screen.queryByTestId('build-session')) {
				seenFamilies.add('build-it');
				expect(screen.getByTestId('question-source-tag')).toHaveTextContent('BUILD IT');
				await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
				await new Promise((resolve) => setTimeout(resolve, 700));
				await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
				await new Promise((resolve) => setTimeout(resolve, 700));
				await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
				await new Promise((resolve) => setTimeout(resolve, 700));
				await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
			} else {
				throw new Error('No drill component rendered for the current queue item');
			}
		}

		expect(seenFamilies).toEqual(new Set(['name-it', 'interval', 'build-it']));
		expect(screen.getByTestId('session-end-card')).toHaveTextContent('ROUND COMPLETE');

		// The host committed exactly one grade each for the two carded (non-
		// build) items, using their own CardRecord; BuildSession committed the
		// build-it grade itself (via its own getCard/recordGrade call using the
		// SAME queue-item identity) - the host must never double-commit it.
		expect(recordGradeMock).toHaveBeenCalledWith(nameCard, Rating.Good);
		expect(recordGradeMock).toHaveBeenCalledWith(intervalCard, Rating.Good);
		expect(recordGradeMock).toHaveBeenCalledWith(buildCard, Rating.Easy, expect.any(Date));
		expect(recordGradeMock).toHaveBeenCalledTimes(3);
	});
});
