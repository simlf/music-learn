import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PracticePage from './practice/+page.svelte';
import { newCard, Rating } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';
import { DRILL_SEEDS_KEY } from '$lib/practice/drillSeeds';

/**
 * B4: the missed chips on the end card are actions, not decoration.
 *
 * Finishing a round and looking straight at the chord you just blew is the
 * highest-intent moment in the app, and the chips were inert <span>s while
 * /progress already had a working "Drill all N". Each chip is now a drill and
 * there is one CTA for the whole set, both routed through the SAME one-shot
 * drill-seed handoff Lookup and the Progress hub use.
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

vi.mock('$lib/practice/practiceQueue', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/practice/practiceQueue')>();
	return {
		...actual,
		syntheticVoicingItems: () => [],
		syntheticProgressionItems: () => [],
		syntheticInversionItems: () => []
	};
});

vi.mock('$lib/srs/introBudget', () => ({
	remainingIntroBudget: () => 0,
	consumeIntroBudget: () => {}
}));

vi.mock('$lib/practice/answerTelemetry', () => ({
	recordPracticeAnswer: () => {}
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

async function startRound(): Promise<void> {
	await screen.findByTestId('practice-pre-start');
	await fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));
}

/** Picks any answer choice other than `correctLabel`, which grades the question wrong. */
async function answerWrong(correctLabel: string): Promise<void> {
	const choices = screen.getAllByRole('button', { name: /^Answer: / });
	const wrong = choices.find(
		(button) => button.getAttribute('aria-label') !== `Answer: ${correctLabel}`
	);
	expect(wrong).toBeDefined();
	await fireEvent.click(wrong!);
	await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
}

async function answerRight(correctLabel: string): Promise<void> {
	await fireEvent.click(screen.getByRole('button', { name: `Answer: ${correctLabel}` }));
	await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
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
});

afterEach(() => {
	vi.restoreAllMocks();
	localStorage.clear();
});

describe('B4: a missed chord chip drills that chord', () => {
	beforeEach(() => {
		getDueCardsMock.mockResolvedValue([
			makeCard('chord-formula:Dm7', 'chord-formula', 'formula')
		]);
	});

	/** Misses Dm7, then clears it, which ends the round with Dm7 on the ledger. */
	async function roundWithOneMiss(): Promise<void> {
		render(PracticePage);
		await startRound();
		await answerWrong('Dm7');
		await answerRight('Dm7');
		await screen.findByTestId('session-end-card');
	}

	it('renders the chip as a labelled control instead of inert text', async () => {
		await roundWithOneMiss();

		const misses = screen.getByTestId('practice-end-card-misses');
		const chip = within(misses).getByRole('button', { name: 'Drill Dm7 again' });
		expect(chip).toHaveTextContent('Dm7');
	});

	it('tapping the chip writes the existing one-shot seed handoff and re-enters practice on that chord', async () => {
		await roundWithOneMiss();

		await fireEvent.click(screen.getByRole('button', { name: 'Drill Dm7 again' }));
		await screen.findByTestId('practice-chord-drill');

		// The seeded chord leads the fresh round, and it is asked as a play-it
		// question: the end card has just revealed the answer, so re-asking
		// "which of these four names is it?" would test nothing.
		expect(screen.getByTestId('practice-chord-drill')).toHaveAttribute('data-mode', 'see-play');
		expect(screen.getByTestId('chord-drill-play-prompt')).toHaveTextContent('Dm7');
		// One-shot: the handoff channel is drained, never left to leak into a
		// later session.
		expect(localStorage.getItem(DRILL_SEEDS_KEY)).toBeNull();
	});

	it('offers a single-miss CTA in the singular', async () => {
		await roundWithOneMiss();
		expect(screen.getByRole('button', { name: 'Fix this one' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /^Fix these/ })).not.toBeInTheDocument();
	});
});

describe('B4: the CTA covers the whole missed set', () => {
	it('counts the misses and drills all of them', async () => {
		getDueCardsMock.mockResolvedValue([
			makeCard('chord-formula:Dm7', 'chord-formula', 'formula'),
			makeCard('chord-formula:G7', 'chord-formula', 'formula')
		]);

		render(PracticePage);
		await startRound();

		/**
		 * Answers with a choice that is neither of the two due symbols, so the
		 * question is wrong whichever of them is currently shown: both end up on
		 * the missed ledger without the test needing to know the draw order.
		 * Repeats until the round's question budget closes it.
		 */
		for (let i = 0; i < 20 && screen.queryByTestId('session-end-card') === null; i++) {
			const choices = screen.getAllByRole('button', { name: /^Answer: / });
			const neither = choices.find((button) => {
				const label = button.getAttribute('aria-label');
				return label !== 'Answer: Dm7' && label !== 'Answer: G7';
			});
			expect(neither).toBeDefined();
			await fireEvent.click(neither!);
			await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		}
		await screen.findByTestId('session-end-card');

		expect(screen.getByTestId('practice-end-card-misses')).toHaveTextContent('Dm7');
		expect(screen.getByTestId('practice-end-card-misses')).toHaveTextContent('G7');

		await fireEvent.click(screen.getByRole('button', { name: 'Fix these 2' }));
		await screen.findByTestId('practice-chord-drill');
		expect(localStorage.getItem(DRILL_SEEDS_KEY)).toBeNull();
	});
});

describe('B4: a miss that cannot seed a drill stays inert', () => {
	it('leaves an interval miss as plain text and offers no CTA for it', async () => {
		// 0.1 forces the interval drill's identification direction (the same
		// pin tests/practice-hub.e2e.test.ts uses).
		vi.spyOn(Math, 'random').mockReturnValue(0.1);
		getDueCardsMock.mockResolvedValue([
			makeCard('interval-size:m3', 'interval-size', 'formula')
		]);

		render(PracticePage);
		await startRound();
		await answerWrong('m3');
		await answerRight('m3');
		await screen.findByTestId('session-end-card');

		const misses = screen.getByTestId('practice-end-card-misses');
		expect(misses).toHaveTextContent('m3');
		expect(within(misses).queryByRole('button')).toBeNull();
		expect(screen.queryByRole('button', { name: /^Fix (this one|these)/ })).not.toBeInTheDocument();
	});
});
