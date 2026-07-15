import { describe, it, expect } from 'vitest';
import { teachClusterModes, clusterGraduated, selectReviewCards } from './rotation';
import { State } from '$lib/srs/scheduler';
import type { CardRecord, Mode } from './deck';

/**
 * Fixed instant, mirroring deck.test.ts's own now0 convention (unused for
 * comparisons here since rotation.ts is pure and never reads a clock itself,
 * but kept as the fixture's due default for readability).
 */
const now0 = new Date('2026-07-15T00:00:00.000Z');

/**
 * Minimal CardRecord builder, mirroring deck.test.ts's own makeCardRecord
 * shape: only the fields teachClusterModes/clusterGraduated/selectReviewCards
 * actually read (factId/factKind/mode/due/stability/state) need real values.
 */
function makeCardRecord(overrides: Partial<CardRecord> = {}): CardRecord {
	return {
		factId: 'chord-formula:Cm7',
		factKind: 'chord-formula',
		mode: 'formula',
		due: now0,
		stability: 1,
		difficulty: 1,
		elapsed_days: 0,
		scheduled_days: 0,
		learning_steps: 0,
		reps: 0,
		lapses: 0,
		state: State.New,
		last_review: undefined,
		lastRating: null,
		masteryDayCount: 0,
		...overrides
	};
}

describe('rotation', () => {
	describe('teachClusterModes', () => {
		it("returns ['formula', 'see-play', 'formula-build'] for 'chord-formula'", () => {
			expect(teachClusterModes('chord-formula')).toEqual(['formula', 'see-play', 'formula-build']);
		});

		it("returns ['formula'] for 'interval-size'", () => {
			expect(teachClusterModes('interval-size')).toEqual(['formula']);
		});

		it("returns ['formula'] for 'scale-degree'", () => {
			expect(teachClusterModes('scale-degree')).toEqual(['formula']);
		});
	});

	describe('clusterGraduated', () => {
		it('true when every cluster mode has a matching State.Review card', () => {
			const clusterModes: Mode[] = ['formula', 'see-play', 'formula-build'];
			const cards = clusterModes.map((mode) => makeCardRecord({ mode, state: State.Review }));
			expect(clusterGraduated(cards, clusterModes)).toBe(true);
		});

		it('false when a cluster mode is missing entirely', () => {
			const clusterModes: Mode[] = ['formula', 'see-play', 'formula-build'];
			const cards = [
				makeCardRecord({ mode: 'formula', state: State.Review }),
				makeCardRecord({ mode: 'see-play', state: State.Review })
			];
			expect(clusterGraduated(cards, clusterModes)).toBe(false);
		});

		it('false when a cluster mode is present but not yet State.Review', () => {
			const clusterModes: Mode[] = ['formula', 'see-play', 'formula-build'];
			const cards = [
				makeCardRecord({ mode: 'formula', state: State.Review }),
				makeCardRecord({ mode: 'see-play', state: State.Review }),
				makeCardRecord({ mode: 'formula-build', state: State.New })
			];
			expect(clusterGraduated(cards, clusterModes)).toBe(false);
		});

		it('true for an empty clusterModes array (vacuous truth, matching a graded single-mode fact)', () => {
			expect(clusterGraduated([], [])).toBe(true);
		});
	});

	describe('selectReviewCards', () => {
		it('lets every State.New (teach) card through uncapped per fact', () => {
			const teachCards = [
				makeCardRecord({ factId: 'f1', mode: 'formula', state: State.New }),
				makeCardRecord({ factId: 'f1', mode: 'see-play', state: State.New }),
				makeCardRecord({ factId: 'f1', mode: 'formula-build', state: State.New })
			];
			expect(selectReviewCards(teachCards)).toHaveLength(3);
		});

		it("caps a fact's all-Review due cards to maxPerFact, ranked weakest-stability-first", () => {
			const reviewCards = [
				makeCardRecord({ factId: 'f1', mode: 'formula', state: State.Review, stability: 10 }),
				makeCardRecord({ factId: 'f1', mode: 'see-play', state: State.Review, stability: 2 }),
				makeCardRecord({ factId: 'f1', mode: 'formula-build', state: State.Review, stability: 5 })
			];
			const result = selectReviewCards(reviewCards, 2);
			expect(result).toHaveLength(2);
			expect(result.map((c) => c.mode)).toEqual(['see-play', 'formula-build']);
		});

		it("sorts a 'hear-name' card to the end regardless of its own (possibly lowest) stability", () => {
			const reviewCards = [
				makeCardRecord({ factId: 'f1', mode: 'hear-name', state: State.Review, stability: 0.1 }),
				makeCardRecord({ factId: 'f1', mode: 'formula', state: State.Review, stability: 10 }),
				makeCardRecord({ factId: 'f1', mode: 'see-play', state: State.Review, stability: 5 })
			];
			const result = selectReviewCards(reviewCards, 2);
			expect(result.map((c) => c.mode)).toEqual(['see-play', 'formula']);
		});

		it("still returns a fact's only due Review card even when it is 'hear-name' (never zeroes a fact out alone)", () => {
			const reviewCards = [
				makeCardRecord({ factId: 'f1', mode: 'hear-name', state: State.Review, stability: 1 })
			];
			const result = selectReviewCards(reviewCards, 2);
			expect(result).toHaveLength(1);
			expect(result[0].mode).toBe('hear-name');
		});

		it("caps each fact's Review cards independently: fact A's cap does not affect fact B's own due cards", () => {
			const dueCards = [
				makeCardRecord({ factId: 'A', mode: 'formula', state: State.Review, stability: 1 }),
				makeCardRecord({ factId: 'A', mode: 'see-play', state: State.Review, stability: 2 }),
				makeCardRecord({ factId: 'A', mode: 'formula-build', state: State.Review, stability: 3 }),
				makeCardRecord({ factId: 'B', mode: 'formula', state: State.Review, stability: 1 })
			];
			const result = selectReviewCards(dueCards, 2);
			expect(result.filter((c) => c.factId === 'A')).toHaveLength(2);
			expect(result.filter((c) => c.factId === 'B')).toHaveLength(1);
		});

		it('mixed New+Review cards for the same fact: New cards pass through uncapped and independently of the Review cap/count', () => {
			const dueCards = [
				makeCardRecord({ factId: 'f1', mode: 'formula', state: State.New }),
				makeCardRecord({ factId: 'f1', mode: 'see-play', state: State.Review, stability: 1 }),
				makeCardRecord({ factId: 'f1', mode: 'formula-build', state: State.Review, stability: 2 }),
				makeCardRecord({ factId: 'f1', mode: 'hear-name', state: State.Review, stability: 0.1 })
			];
			const result = selectReviewCards(dueCards, 2);
			expect(result).toHaveLength(3);
			expect(result.some((c) => c.mode === 'formula' && c.state === State.New)).toBe(true);
			expect(result.some((c) => c.mode === 'hear-name')).toBe(false);
		});

		it('returns [] for an empty dueCards array', () => {
			expect(selectReviewCards([])).toEqual([]);
		});
	});
});
