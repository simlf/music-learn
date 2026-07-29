import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newCard } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';
import { normalizeSymbolForMatch } from '$lib/practice/songProvenance';

/**
 * Y1 consolidation: the shared due-card load pipeline (gate + introduce +
 * re-fetch) and the shared song-filter restriction, both extracted from the
 * two byte-faithful copies `/practice` and `RecallSession` used to keep in
 * sync by hand. These tests relocate (not re-derive) the backlog-gate
 * coverage that used to live in recallSession.test.ts's own "daily intro
 * budget + backlog gate" / "backlog gate counts FACTS, not cards" describe
 * blocks - RecallSession no longer calls introduceNewCards at all
 * post-consolidation (it reads getDueCards directly, see recallSession.test.ts),
 * so that behavior now lives here, against the one remaining caller
 * (`/practice`, via `loadDueWithIntroduction`).
 */

const getDueCardsMock = vi.fn();
const introduceNewCardsMock = vi.fn();
vi.mock('$lib/srs/deck', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/srs/deck')>();
	return {
		...actual,
		getDueCards: (...args: unknown[]) => getDueCardsMock(...args),
		introduceNewCards: (...args: unknown[]) => introduceNewCardsMock(...args)
	};
});

const remainingIntroBudgetMock = vi.fn();
const consumeIntroBudgetMock = vi.fn();
vi.mock('$lib/srs/introBudget', () => ({
	remainingIntroBudget: (...args: unknown[]) => remainingIntroBudgetMock(...args),
	consumeIntroBudget: (...args: unknown[]) => consumeIntroBudgetMock(...args)
}));

const { loadDueWithIntroduction, applySongFilter } = await import('./reviewLoad');

const NOW = new Date('2026-07-15T12:00:00Z');

function makeCard(factId: string, factKind: CardRecord['factKind']): CardRecord {
	return { ...newCard(NOW), factId, factKind, mode: 'formula', lastRating: null, masteryDayCount: 0 };
}

beforeEach(() => {
	getDueCardsMock.mockReset();
	introduceNewCardsMock.mockReset();
	introduceNewCardsMock.mockResolvedValue(0);
	remainingIntroBudgetMock.mockReset();
	remainingIntroBudgetMock.mockReturnValue(10);
	consumeIntroBudgetMock.mockReset();
});

describe('loadDueWithIntroduction', () => {
	it('with more than 20 pre-due facts, introduceNewCards is never called (backlog gate)', async () => {
		const manyDueCards = Array.from({ length: 21 }, (_, i) =>
			makeCard(`interval-size:fake-${i}`, 'interval-size')
		);
		getDueCardsMock.mockResolvedValue(manyDueCards);

		const due = await loadDueWithIntroduction(NOW);

		expect(introduceNewCardsMock).not.toHaveBeenCalled();
		expect(remainingIntroBudgetMock).not.toHaveBeenCalled();
		expect(consumeIntroBudgetMock).not.toHaveBeenCalled();
		expect(due).toEqual(manyDueCards);
	});

	it('with exactly 20 pre-due facts (at, not over, the gate), the budget path still runs', async () => {
		const twentyDueCards = Array.from({ length: 20 }, (_, i) =>
			makeCard(`interval-size:fake-${i}`, 'interval-size')
		);
		getDueCardsMock.mockResolvedValue(twentyDueCards);

		await loadDueWithIntroduction(NOW);

		expect(introduceNewCardsMock).toHaveBeenCalledTimes(1);
	});

	it('calls introduceNewCards with the remaining budget and consumes exactly what it reports introduced', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula');
		getDueCardsMock.mockResolvedValue([card]);
		remainingIntroBudgetMock.mockReturnValue(4);
		introduceNewCardsMock.mockResolvedValue(3);

		await loadDueWithIntroduction(NOW);

		expect(introduceNewCardsMock).toHaveBeenCalledWith(4, NOW);
		expect(consumeIntroBudgetMock).toHaveBeenCalledWith(3, NOW);
	});

	it('when introduceNewCards introduces 0 facts, consumeIntroBudget is never called', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula');
		getDueCardsMock.mockResolvedValue([card]);
		remainingIntroBudgetMock.mockReturnValue(5);
		introduceNewCardsMock.mockResolvedValue(0);

		await loadDueWithIntroduction(NOW);

		expect(consumeIntroBudgetMock).not.toHaveBeenCalled();
	});

	it('when remainingIntroBudget reports 0, introduceNewCards is never called', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula');
		getDueCardsMock.mockResolvedValue([card]);
		remainingIntroBudgetMock.mockReturnValue(0);

		await loadDueWithIntroduction(NOW);

		expect(introduceNewCardsMock).not.toHaveBeenCalled();
		expect(consumeIntroBudgetMock).not.toHaveBeenCalled();
	});

	it('re-fetches due cards after introduction, so a freshly-introduced card is included', async () => {
		const preExisting = makeCard('interval-size:m3', 'interval-size');
		const freshlyIntroduced = makeCard('chord-formula:Cm7', 'chord-formula');
		remainingIntroBudgetMock.mockReturnValue(10);
		introduceNewCardsMock.mockResolvedValue(1);
		getDueCardsMock
			.mockResolvedValueOnce([preExisting])
			.mockResolvedValue([preExisting, freshlyIntroduced]);

		const due = await loadDueWithIntroduction(NOW);

		expect(getDueCardsMock).toHaveBeenCalledTimes(2);
		expect(consumeIntroBudgetMock).toHaveBeenCalledWith(1, NOW);
		expect(due).toEqual([preExisting, freshlyIntroduced]);
	});

	/** Builds `perFact` due cards for each of `factCount` distinct facts, mirroring practiceQueue.test.ts's own fixture shape. */
	function dueCardsFor(factCount: number, perFact: number): CardRecord[] {
		const cards: CardRecord[] = [];
		const modes: CardRecord['mode'][] = ['formula', 'see-play', 'formula-build'];
		for (let f = 0; f < factCount; f++) {
			for (let m = 0; m < perFact; m++) {
				cards.push({
					...makeCard(`chord-formula:Fake${f}`, 'chord-formula'),
					mode: modes[m % modes.length]
				});
			}
		}
		return cards;
	}

	it('counts backlog in FACTS, not cards: a day-one teach cohort (10 facts x 3 cluster cards) does NOT trip the gate', async () => {
		const cohort = dueCardsFor(10, 3);
		expect(cohort).toHaveLength(30);
		getDueCardsMock.mockResolvedValue(cohort);

		await loadDueWithIntroduction(NOW);

		expect(introduceNewCardsMock).toHaveBeenCalledTimes(1);
	});

	it('21 facts spread over 63 cards DOES trip the gate', async () => {
		const over = dueCardsFor(21, 3);
		getDueCardsMock.mockResolvedValue(over);

		await loadDueWithIntroduction(NOW);

		expect(introduceNewCardsMock).not.toHaveBeenCalled();
	});
});

describe('applySongFilter', () => {
	it('passes every card through unchanged when the filter is off', () => {
		const due = [makeCard('chord-formula:Cm7', 'chord-formula')];
		const provenanceIndex = new Map([[normalizeSymbolForMatch('Cm7'), ['Song A']]]);
		expect(applySongFilter(due, false, provenanceIndex)).toEqual(due);
	});

	it('passes every card through unchanged when the provenance index is empty, even with the filter on', () => {
		const due = [makeCard('chord-formula:Cm7', 'chord-formula')];
		expect(applySongFilter(due, true, new Map())).toEqual(due);
		expect(applySongFilter(due, true, undefined)).toEqual(due);
	});

	it('keeps only chord-formula cards with provenance when the filter is on', () => {
		const songChord = makeCard('chord-formula:Cm7', 'chord-formula');
		const nonSongChord = makeCard('chord-formula:Fmaj7', 'chord-formula');
		const nonChord = makeCard('interval-size:m3', 'interval-size');
		const provenanceIndex = new Map([[normalizeSymbolForMatch('Cm7'), ['Song A']]]);

		const result = applySongFilter([songChord, nonSongChord, nonChord], true, provenanceIndex);

		expect(result).toEqual([songChord]);
	});
});
