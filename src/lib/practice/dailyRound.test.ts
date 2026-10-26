import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newCard, State } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';

/**
 * dailyRound.ts's own contracts, with the deck mocked: which applied
 * (synthetic) candidates a round may draw, and how seeds are kept out of the
 * plan. The planner itself is covered by practiceQueue.test.ts, and the whole
 * pipeline over weeks by dailyRound.sim.test.ts.
 */

const getAllCardsMock = vi.fn();
vi.mock('$lib/srs/deck', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/srs/deck')>();
	return { ...actual, getAllCards: (...args: unknown[]) => getAllCardsMock(...args) };
});

const { buildSyntheticItems, composeDailyRound } = await import('./dailyRound');

const NOW = new Date('2026-10-26T12:00:00Z');

function card(symbol: string, mode: CardRecord['mode'], state: State): CardRecord {
	return {
		...newCard(NOW),
		factId: `chord-formula:${symbol}`,
		factKind: 'chord-formula',
		mode,
		state,
		lastRating: null,
		masteryDayCount: 0
	};
}

function rng(): () => number {
	let state = 11;
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 2 ** 32;
	};
}

const OFF = { songFilterOn: false, provenanceIndex: new Map<string, string[]>() };

beforeEach(() => {
	getAllCardsMock.mockReset();
});

describe('buildSyntheticItems: which applied items a round may draw', () => {
	it('draws nothing for a chord met today: its cards are all still New (PRAC-06, extended)', async () => {
		const due = [card('Cm7', 'formula', State.New), card('Dm7', 'see-play', State.New)];
		getAllCardsMock.mockResolvedValue(due);

		const items = await buildSyntheticItems(due, { ...OFF, rng: rng() });

		expect(items.filter((item) => item.family !== 'progression')).toEqual([]);
	});

	it('draws inversion, chord-scale and voicing items only on chords with a matured card', async () => {
		const due = [card('Cm7', 'formula', State.Review), card('Dm7', 'formula', State.New)];
		getAllCardsMock.mockResolvedValue(due);

		const items = await buildSyntheticItems(due, { ...OFF, rng: rng() });
		const symbols = new Set(
			items.flatMap((item) => (item.family === 'progression' ? [] : [item.symbol]))
		);

		expect(symbols).toEqual(new Set(['Cm7']));
		expect(items.some((item) => item.family === 'inversion')).toBe(true);
		expect(items.some((item) => item.family === 'chord-scale')).toBe(true);
	});

	it('draws no progression until the deck has taught every quality its template uses', async () => {
		const triads = [card('C', 'formula', State.Review), card('Am', 'formula', State.Review)];
		getAllCardsMock.mockResolvedValue(triads);
		expect(
			(await buildSyntheticItems(triads, { ...OFF, rng: rng() })).some(
				(item) => item.family === 'progression'
			)
		).toBe(false);

		const sevenths = [
			card('Dm7', 'formula', State.Review),
			card('G7', 'formula', State.Review),
			card('Cmaj7', 'formula', State.Review)
		];
		getAllCardsMock.mockResolvedValue(sevenths);
		const items = await buildSyntheticItems(sevenths, { ...OFF, rng: rng() });
		const progressions = items.filter((item) => item.family === 'progression');
		expect(progressions.length).toBeGreaterThan(0);
		// m7b5 is untaught, so the minor ii-V-i is never drawn.
		expect(progressions.every((item) => item.templateId !== 'minor-ii-V-i')).toBe(true);
	});

	it('draws nothing at all when no chord card is due (PRAC-05 single-type-due gate)', async () => {
		const due: CardRecord[] = [
			{ ...card('C', 'formula', State.Review), factId: 'interval-size:m3', factKind: 'interval-size' }
		];
		getAllCardsMock.mockResolvedValue(due);
		expect(await buildSyntheticItems(due, { ...OFF, rng: rng() })).toEqual([]);
	});
});

describe('composeDailyRound', () => {
	it('drops a seeded fact from the plan, counting only its cards the seed does not ask as waiting', async () => {
		const due = [
			card('Cm7', 'formula', State.New),
			card('Cm7', 'see-play', State.New),
			card('Cm7', 'formula-build', State.New),
			card('Dm7', 'formula', State.New)
		];
		getAllCardsMock.mockResolvedValue(due);
		const seed = {
			id: 'fsrs:chord-formula:Cm7:see-play',
			family: 'play-it' as const,
			factId: 'chord-formula:Cm7',
			mode: 'see-play' as const,
			factKind: 'chord-formula' as const,
			symbol: 'Cm7',
			card: due[1]
		};

		const result = await composeDailyRound(due, {
			...OFF,
			target: 12,
			seededItems: [seed],
			rng: rng()
		});

		expect(result.empty).toBe(false);
		expect(result.round.every((item) => !('factId' in item) || item.factId !== seed.factId)).toBe(true);
		// Cm7's formula and formula-build cards stay due; its see-play card is the seed itself.
		expect(result.waiting).toBe(2);
	});

	it('reports an empty round when nothing practiceable is due', async () => {
		getAllCardsMock.mockResolvedValue([]);
		const result = await composeDailyRound([], { ...OFF, target: 12, seededItems: [], rng: rng() });
		expect(result).toEqual({ round: [], waiting: 0, empty: true });
	});
});
