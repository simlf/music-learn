import { render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PracticePage from './practice/+page.svelte';
import { newCard, Rating } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';

/**
 * T13 item 4, at the host level: the due-backlog gate that decides whether
 * `/practice` may introduce new facts on this mount.
 *
 * It used to compare a CARD count against 20 while the budget it gates is a
 * FACT budget of 10 a day. A chord fact seeds a 3-mode teach cluster, so one
 * day's own introduction is about 30 cards: every single day a cohort came back,
 * the gate saw 30 > 20 and locked new material out, and from roughly day 4
 * intake self-throttled into a stop-start pattern with no cause the user could
 * see. These tests drive the gate through the real page.
 *
 * Mock architecture mirrors tests/practice-hub.e2e.test.ts. Note that
 * practiceQueue is only PARTIALLY mocked (synthetic builders stubbed, everything
 * else spread from the real module), so the gate's own backlogFactCount and
 * threshold are the real ones under test.
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

vi.mock('$lib/practice/answerTelemetry', () => ({ recordPracticeAnswer: vi.fn() }));

vi.mock('$lib/audio/audio', () => ({
	playChord: vi.fn(),
	playNote: vi.fn(),
	ensureAudioReady: vi.fn(),
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

/** The exact card shape one day's introduction produces: `count` chord facts, each with its 3-mode teach cluster. */
function oneDayOfIntake(count: number): CardRecord[] {
	const symbols = [
		'Cm7',
		'Dm7',
		'Em7',
		'Fmaj7',
		'G7',
		'Am7',
		'Bm7b5',
		'Cmaj7',
		'D7',
		'Emaj7',
		'F7',
		'Gm7'
	];
	const cards: CardRecord[] = [];
	for (const symbol of symbols.slice(0, count)) {
		for (const mode of ['formula', 'see-play', 'formula-build'] as CardRecord['mode'][]) {
			cards.push(makeCard(`chord-formula:${symbol}`, 'chord-formula', mode));
		}
	}
	return cards;
}

beforeEach(() => {
	localStorage.clear();
	introduceNewCardsMock.mockReset().mockResolvedValue(0);
	getDueCardsMock.mockReset();
	getAllCardsMock.mockReset().mockResolvedValue([]);
	recordGradeMock.mockReset();
	recordGradeMock.mockImplementation(async (card: CardRecord, rating: Rating) => ({
		...card,
		lastRating: rating
	}));
	getCardMock.mockReset().mockResolvedValue(undefined);
	// A full day's budget is available: whether new facts get introduced is then
	// entirely the gate's decision, which is what these tests measure.
	remainingIntroBudgetMock.mockReset().mockReturnValue(10);
	consumeIntroBudgetMock.mockReset();
});

afterEach(() => {
	vi.restoreAllMocks();
	localStorage.clear();
});

describe('the due-backlog gate counts facts, not cards', () => {
	it("does NOT block new facts when the backlog is one day's own intake (10 facts / 30 cards)", async () => {
		const day = oneDayOfIntake(10);
		expect(day).toHaveLength(30);
		getDueCardsMock.mockResolvedValue(day);

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');

		// 30 cards would have tripped the old card-count gate; 10 facts does not
		// trip the fact-count gate, so the day's remaining budget is still spent.
		expect(introduceNewCardsMock).toHaveBeenCalledWith(10, expect.any(Date));
	});

	it('still blocks new facts on a genuine multi-day backlog (30 distinct facts)', async () => {
		const backlog: CardRecord[] = [];
		for (let i = 0; i < 30; i++) {
			backlog.push(makeCard(`interval-size:m${i}`, 'interval-size', 'formula'));
		}
		getDueCardsMock.mockResolvedValue(backlog);

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');

		expect(introduceNewCardsMock).not.toHaveBeenCalled();
	});

	it('passes exactly at the two-day boundary and blocks just past it', async () => {
		getDueCardsMock.mockResolvedValue(
			Array.from({ length: 20 }, (_, i) =>
				makeCard(`interval-size:at${i}`, 'interval-size', 'formula')
			)
		);
		render(PracticePage);
		await screen.findByTestId('practice-pre-start');
		expect(introduceNewCardsMock).toHaveBeenCalled();

		introduceNewCardsMock.mockClear();
		getDueCardsMock.mockResolvedValue(
			Array.from({ length: 21 }, (_, i) =>
				makeCard(`interval-size:over${i}`, 'interval-size', 'formula')
			)
		);
		render(PracticePage);
		await vi.waitFor(() => expect(screen.getAllByTestId('practice-pre-start').length).toBe(2));
		expect(introduceNewCardsMock).not.toHaveBeenCalled();
	});

	/**
	 * The gate counts only facts a practice surface can actually ask, so a pile of
	 * cards no amount of practice can clear could never freeze intake permanently.
	 *
	 * This used to be demonstrated with the 84 scale-degree facts, which the deck
	 * introduced and familyForCard then dropped. They are now askable by their own
	 * family, so they are real work and legitimately count (see the next test).
	 * scale-formula is the honest example now: that kind is deliberately absent
	 * from CATALOG, so no such card is ever created and the exclusion is defence in
	 * depth rather than a live leak.
	 */
	it('is not frozen by cards no surface can ask', async () => {
		const unaskable: CardRecord[] = [];
		for (const tonic of ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']) {
			unaskable.push(makeCard(`scale-formula:${tonic}`, 'scale-formula', 'formula-build'));
		}
		getDueCardsMock.mockResolvedValue([
			...unaskable,
			makeCard('chord-formula:Cm7', 'chord-formula', 'formula')
		]);

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');

		expect(introduceNewCardsMock).toHaveBeenCalledWith(10, expect.any(Date));
	});

	/**
	 * The flip side of making scale degrees reachable: they are now real practice
	 * work, so a genuine backlog of them SHOULD hold new material back, exactly as
	 * a backlog of chord or interval facts does. That is the gate working, not the
	 * zombie bug returning, because these cards are clearable now that a surface
	 * asks them.
	 */
	it('is held back by a real backlog of scale-degree facts, which are now askable', async () => {
		const degrees: CardRecord[] = [];
		for (let i = 0; i < 21; i++) {
			degrees.push(makeCard(`scale-degree:C:${i}`, 'scale-degree', 'formula'));
		}
		getDueCardsMock.mockResolvedValue(degrees);

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');

		expect(introduceNewCardsMock).not.toHaveBeenCalled();
	});
});
