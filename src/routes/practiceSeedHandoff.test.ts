import { render, screen, fireEvent, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newCard } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';
import { setDrillSeeds, setLessonSeeds } from '$lib/practice/drillSeeds';
import {
	DAILY_SESSION_KEY,
	DAILY_TARGET,
	emptyDay,
	localDay
} from '$lib/practice/dailySession';

/**
 * REG-01 regression coverage for the /practice seed handoff (30-02): a
 * pending drill-seed (Progress "Drill these" / danger-cards / per-symbol, or
 * Lookup "Drill it") must still surface exactly the seeded chord symbol as a
 * prioritized play-it question, and the session must start even when
 * nothing is FSRS-due. Mirrors the mock harness from
 * tests/practice-hub.e2e.test.ts (deck/introBudget/telemetry/audio mocked;
 * practiceQueue's synthetic builders stubbed to `[]` so this stays focused
 * on the carded/seed half).
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
		syntheticInversionItems: () => [],
		syntheticChordScaleItems: () => []
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

const NOW = new Date('2026-07-25T12:00:00Z');

/** An unrelated, never-due card: keeps the deck non-empty (`empty-none-due`, not `empty-no-deck`). */
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

/** A due card for an arbitrary fact, so a round has a composed half to slice. */
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

beforeEach(() => {
	localStorage.clear();
	introduceNewCardsMock.mockReset();
	getDueCardsMock.mockReset().mockResolvedValue([]);
	getAllCardsMock.mockReset().mockResolvedValue([makeUnrelatedCard()]);
	recordGradeMock.mockReset();
	recordGradeMock.mockImplementation(async (card: CardRecord, rating: number) => ({
		...card,
		lastRating: rating
	}));
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

describe('practice seed handoff (REG-01)', () => {
	it('a pending drill seed starts a session even with nothing due, and drills the seeded chord first as a play-it question', async () => {
		setDrillSeeds(['Cm7']);
		const { default: PracticePage } = await import('./practice/+page.svelte');

		render(PracticePage);

		const preStart = await screen.findByTestId('practice-pre-start');
		expect(within(preStart).getByRole('button', { name: 'Start practice' })).toBeInTheDocument();
		expect(screen.queryByTestId('practice-empty-none-due')).not.toBeInTheDocument();

		await fireEvent.click(within(preStart).getByRole('button', { name: 'Start practice' }));

		// The seed hands off to PLAYING the chord, not to picking its name out
		// of four choices: every surface that writes a seed has just shown the
		// user the answer.
		expect(screen.getByTestId('question-source-tag')).toHaveTextContent('PLAY IT');
		expect(screen.getByTestId('practice-chord-drill')).toHaveAttribute('data-mode', 'see-play');
		expect(screen.getByTestId('chord-drill-play-prompt')).toHaveTextContent('Cm7');
		expect(screen.queryByTestId('choice-grid')).not.toBeInTheDocument();
	});

	/**
	 * The day's question budget is fully spent: nothing composed may be added.
	 * Written straight to the ledger rather than played, so the setup states
	 * the precondition instead of simulating twelve answers.
	 */
	function spendTodaysTarget(): void {
		const today = { ...emptyDay(localDay()), answered: DAILY_TARGET, correct: DAILY_TARGET };
		localStorage.setItem(DAILY_SESSION_KEY, JSON.stringify({ today }));
	}

	/**
	 * The defect this guards: a seed is the user ASKING for one specific chord
	 * ("Drill it" from Lookup), and the channel is one-shot. When the daily
	 * slice cut the seed into `waiting`, the pre-start card said "TODAY'S
	 * PRACTICE IS DONE" and "Keep going" re-ran load() against an
	 * already-drained channel: the requested chord was not deferred, it was
	 * destroyed. Seeds are now held out of the daily cut entirely.
	 */
	it('a seed still runs on a day whose target is already spent', async () => {
		spendTodaysTarget();
		setDrillSeeds(['Cm7']);
		const { default: PracticePage } = await import('./practice/+page.svelte');

		render(PracticePage);

		const preStart = await screen.findByTestId('practice-pre-start');
		// Not the done branch: the day owes nothing, but the USER asked for this.
		expect(within(preStart).getByRole('button', { name: 'Start practice' })).toBeInTheDocument();
		expect(screen.getByTestId('practice-due-register')).toHaveTextContent('1 TO GO');

		await fireEvent.click(within(preStart).getByRole('button', { name: 'Start practice' }));

		expect(screen.getByTestId('chord-drill-play-prompt')).toHaveTextContent('Cm7');
		// The round is exactly the seed - a spent day still composes nothing.
		expect(screen.getByTestId('practice-register')).toHaveTextContent('1');
	});

	/**
	 * The seed asks a different MODE of the same fact (see-play), so a dedup
	 * keyed on the item id (`fsrs:{factId}:{mode}`) no longer matches a due
	 * `formula` card for the same chord, and the round would ask Cm7 twice
	 * back to back. Dedup keys on the factId for exactly that reason.
	 */
	it('drops a due card for a seeded fact even when its mode differs from the seed', async () => {
		const dueFormula = makeDueCard('chord-formula:Cm7', 'chord-formula', 'formula');
		getDueCardsMock.mockResolvedValue([dueFormula]);
		getAllCardsMock.mockResolvedValue([makeUnrelatedCard(), dueFormula]);
		setDrillSeeds(['Cm7']);
		const { default: PracticePage } = await import('./practice/+page.svelte');

		render(PracticePage);

		const preStart = await screen.findByTestId('practice-pre-start');
		// The deduped-out formula card is still FSRS-due and this round never
		// asks it, so it is reported as waiting rather than dropped silently.
		expect(screen.getByTestId('practice-due-register')).toHaveTextContent('1 TODAY · 1 WAITING');

		await fireEvent.click(within(preStart).getByRole('button', { name: 'Start practice' }));

		// Exactly one question: the seeded see-play item, not a see-play item
		// followed by a name-it item for the same symbol.
		expect(screen.getByTestId('practice-register')).toHaveTextContent('1 LEFT');
		expect(screen.getByTestId('question-source-tag')).toHaveTextContent('PLAY IT');
		expect(screen.getByTestId('chord-drill-play-prompt')).toHaveTextContent('Cm7');
	});

	/**
	 * Seeds bypass the daily cut and widen the round's budget, so on a partly
	 * spent day the round holds more than the day still owes. Folding that
	 * surplus into "TO GO" made the line contradict its own fraction (5 + 9
	 * against a target of 12); the requested work gets its own clause instead.
	 */
	it('names the requested work separately on a partly spent day so the fraction stays true', async () => {
		const today = { ...emptyDay(localDay()), answered: 5, correct: 5 };
		localStorage.setItem(DAILY_SESSION_KEY, JSON.stringify({ today }));
		const dueIntervals = [
			makeDueCard('interval-size:m2', 'interval-size', 'formula'),
			makeDueCard('interval-size:M3', 'interval-size', 'formula')
		];
		getDueCardsMock.mockResolvedValue(dueIntervals);
		getAllCardsMock.mockResolvedValue(dueIntervals);
		setDrillSeeds(['Cm7']);
		const { default: PracticePage } = await import('./practice/+page.svelte');

		render(PracticePage);

		await screen.findByTestId('practice-pre-start');
		expect(screen.getByTestId('practice-due-register')).toHaveTextContent(
			'5 OF 12 DONE TODAY · 2 TO GO · 1 ON REQUEST'
		);
	});

	/**
	 * Both handoff channels are one-shot and both are drained on every mount,
	 * so honouring only the winner DESTROYS the loser's chord - the same
	 * failure the daily-slice fix exists to prevent. Reachable for real: finish
	 * a lesson (writes lesson seeds), detour through Lookup and tap "Drill it"
	 * (writes drill seeds), then open /practice.
	 */
	it('honours both seed channels when both are pending, lesson first', async () => {
		setLessonSeeds(['Dm7']);
		setDrillSeeds(['Cm7']);
		const { default: PracticePage } = await import('./practice/+page.svelte');

		render(PracticePage);

		const preStart = await screen.findByTestId('practice-pre-start');
		expect(screen.getByTestId('practice-due-register')).toHaveTextContent('2 CARDS DUE TODAY');

		await fireEvent.click(within(preStart).getByRole('button', { name: 'Start practice' }));

		expect(screen.getByTestId('chord-drill-play-prompt')).toHaveTextContent('Dm7');
		expect(screen.getByTestId('practice-register')).toHaveTextContent('2 LEFT');
	});

	it('keeps one question when both channels ask for the same chord', async () => {
		setLessonSeeds(['Cm7']);
		setDrillSeeds(['Cm7']);
		const { default: PracticePage } = await import('./practice/+page.svelte');

		render(PracticePage);

		const preStart = await screen.findByTestId('practice-pre-start');
		await fireEvent.click(within(preStart).getByRole('button', { name: 'Start practice' }));

		expect(screen.getByTestId('practice-register')).toHaveTextContent('1 LEFT');
	});

	/**
	 * A spent day with a pending seed lands on the resume line, which used to
	 * carry no waiting clause - so the cards the slice held back went
	 * unmentioned, though the register's contract is that the remainder is
	 * shown rather than hidden.
	 */
	it('still names the held-back remainder on a spent day with a pending seed', async () => {
		spendTodaysTarget();
		const dueIntervals = [
			makeDueCard('interval-size:m2', 'interval-size', 'formula'),
			makeDueCard('interval-size:M3', 'interval-size', 'formula')
		];
		getDueCardsMock.mockResolvedValue(dueIntervals);
		getAllCardsMock.mockResolvedValue(dueIntervals);
		setDrillSeeds(['Cm7']);
		const { default: PracticePage } = await import('./practice/+page.svelte');

		render(PracticePage);

		await screen.findByTestId('practice-pre-start');
		expect(screen.getByTestId('practice-due-register')).toHaveTextContent(
			'12 OF 12 DONE TODAY · 1 TO GO · 2 WAITING'
		);
	});

	/**
	 * The factId dedup drops a due composed card because the seed asks the
	 * SAME fact in another mode - but the dropped card is a distinct card that
	 * the round never asks and the seed never grades. Counting it out of
	 * `waiting` too let the register (and the end card's all-clear line) claim
	 * nothing was left while a due card had been silently skipped.
	 */
	it('counts a due card deduped out by a seed as waiting, not as gone', async () => {
		spendTodaysTarget();
		const dueFormula = makeDueCard('chord-formula:Cm7', 'chord-formula', 'formula');
		getDueCardsMock.mockResolvedValue([dueFormula]);
		getAllCardsMock.mockResolvedValue([makeUnrelatedCard(), dueFormula]);
		setDrillSeeds(['Cm7']);
		const { default: PracticePage } = await import('./practice/+page.svelte');

		render(PracticePage);

		await screen.findByTestId('practice-pre-start');
		expect(screen.getByTestId('practice-due-register')).toHaveTextContent(
			'12 OF 12 DONE TODAY · 1 TO GO · 1 WAITING'
		);
	});

	/**
	 * The counterpart of the test above: when the deduped-out card is the
	 * SAME mode the seed asks, the seed does not skip it, it IS it. Counting
	 * it as held back printed a phantom remainder and kept the day from ever
	 * latching as done.
	 */
	it('does not count the seed\'s own due card as waiting', async () => {
		const dueSeePlay = makeDueCard('chord-formula:Cm7', 'chord-formula', 'see-play');
		getDueCardsMock.mockResolvedValue([dueSeePlay]);
		getAllCardsMock.mockResolvedValue([makeUnrelatedCard(), dueSeePlay]);
		setDrillSeeds(['Cm7']);
		const { default: PracticePage } = await import('./practice/+page.svelte');

		render(PracticePage);

		const preStart = await screen.findByTestId('practice-pre-start');
		expect(screen.getByTestId('practice-due-register')).toHaveTextContent('1 CARD DUE TODAY');
		expect(screen.getByTestId('practice-due-register')).not.toHaveTextContent('WAITING');

		await fireEvent.click(within(preStart).getByRole('button', { name: 'Start practice' }));
		for (const key of ['C key', 'D\u266F key', 'G key', 'A\u266F key']) {
			await fireEvent.click(screen.getAllByRole('button', { name: key })[0]);
		}
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
		expect(screen.getByTestId('chord-drill-correct')).toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		// The card the seed replaced was answered, so nothing is held back.
		expect(screen.getByTestId('practice-end-card-remainder')).toHaveTextContent(
			'Nothing else is waiting today'
		);
	});

	/**
	 * A spent day budgets nothing composed, so a round that is exactly one seed
	 * used to have exactly one question of budget: missing the seed ended the
	 * round on the miss and swept the delayed retry into `waiting`, against the
	 * documented rule that the retry stays inside the round.
	 */
	it('keeps a missed seed inside its own round for the retry', async () => {
		spendTodaysTarget();
		setDrillSeeds(['Cm7']);
		const { default: PracticePage } = await import('./practice/+page.svelte');

		render(PracticePage);

		const preStart = await screen.findByTestId('practice-pre-start');
		await fireEvent.click(within(preStart).getByRole('button', { name: 'Start practice' }));

		// D is in no spelling of Cm7: one wrong key is a miss.
		await fireEvent.click(screen.getAllByRole('button', { name: 'D key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
		expect(screen.getByTestId('chord-drill-incorrect')).toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(screen.queryByTestId('practice-end-card-done')).not.toBeInTheDocument();
		expect(screen.getByTestId('chord-drill-play-prompt')).toHaveTextContent('Cm7');
	});

	/**
	 * Seeds bypass the daily cut but still bank into the day ledger, so the day
	 * can hold more answers than the target and the resume fraction went above
	 * one ("13 OF 12 DONE TODAY").
	 */
	it('clamps the resume fraction when seeds pushed the day past its target', async () => {
		const today = {
			...emptyDay(localDay()),
			answered: DAILY_TARGET + 1,
			correct: DAILY_TARGET + 1
		};
		localStorage.setItem(DAILY_SESSION_KEY, JSON.stringify({ today }));
		setDrillSeeds(['Cm7']);
		const { default: PracticePage } = await import('./practice/+page.svelte');

		render(PracticePage);

		await screen.findByTestId('practice-pre-start');
		expect(screen.getByTestId('practice-due-register')).toHaveTextContent(
			'12 OF 12 DONE TODAY · 1 TO GO'
		);
	});

	it('consumes the seed one-shot: a later render with no seeds and the same empty deck lands on empty-none-due', async () => {
		// No setDrillSeeds call here - proves the previous render's seed
		// consumption did not leak into this one.
		const { default: PracticePage } = await import('./practice/+page.svelte');

		render(PracticePage);

		await screen.findByTestId('practice-empty-none-due');
	});
});
