import { describe, it, expect } from 'vitest';
import { teachClusterModes, clusterGraduated, selectReviewCards, interleaveQueue } from './rotation';
import { State } from '$lib/srs/scheduler';
import type { CardRecord, Mode } from './deck';

/** A deterministic seeded PRNG (mulberry32) so interleaveQueue's shuffle is reproducible across test runs. */
function seededRng(seed: number): () => number {
	let state = seed;
	return () => {
		state |= 0;
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

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

	describe('interleaveQueue', () => {
		it('is a permutation of the input: every card appears exactly once in the output', () => {
			const input = [
				makeCardRecord({ factId: 'chord-formula:Cm7', mode: 'formula', state: State.Review, stability: 1 }),
				makeCardRecord({ factId: 'chord-formula:Dm7', mode: 'formula', state: State.Review, stability: 2 }),
				makeCardRecord({ factId: 'chord-formula:Em7', mode: 'formula', state: State.Review, stability: 3 }),
				makeCardRecord({ factId: 'interval-size:m3', mode: 'formula', state: State.Review, stability: 4 })
			];
			const output = interleaveQueue(input, seededRng(1));
			expect(output).toHaveLength(input.length);
			expect(new Set(output)).toEqual(new Set(input));
		});

		it('never places two consecutive cards of the same fact, except within a State.New teach cluster', () => {
			const cluster = ['formula', 'see-play', 'formula-build'].map((mode) =>
				makeCardRecord({ factId: 'chord-formula:Cm7', mode: mode as Mode, state: State.New })
			);
			const others = [
				makeCardRecord({ factId: 'chord-formula:Dm7', mode: 'formula', state: State.Review, stability: 1 }),
				makeCardRecord({ factId: 'chord-formula:Em7', mode: 'formula', state: State.Review, stability: 2 }),
				makeCardRecord({ factId: 'interval-size:m3', mode: 'formula', state: State.Review, stability: 3 })
			];
			const input = [...cluster, ...others];
			const output = interleaveQueue(input, seededRng(2));

			for (let i = 1; i < output.length; i++) {
				const prev = output[i - 1];
				const curr = output[i];
				if (prev.factId === curr.factId) {
					// The only legal adjacency: both are State.New cards of the
					// same fact (a teach cluster staying contiguous).
					expect(prev.state).toBe(State.New);
					expect(curr.state).toBe(State.New);
				}
			}
		});

		it('a State.New fact\'s teach-cluster cards stay contiguous in the output', () => {
			const cluster = ['formula', 'see-play', 'formula-build'].map((mode) =>
				makeCardRecord({ factId: 'chord-formula:Cm7', mode: mode as Mode, state: State.New })
			);
			const others = [
				makeCardRecord({ factId: 'chord-formula:Dm7', mode: 'formula', state: State.Review, stability: 1 }),
				makeCardRecord({ factId: 'interval-size:m3', mode: 'formula', state: State.Review, stability: 2 })
			];
			const input = [...cluster, ...others];
			const output = interleaveQueue(input, seededRng(3));

			const clusterIndices = output
				.map((card, i) => (card.factId === 'chord-formula:Cm7' ? i : -1))
				.filter((i) => i !== -1);
			expect(clusterIndices).toHaveLength(3);
			// Contiguous: consecutive indices, no gap.
			expect(clusterIndices[1] - clusterIndices[0]).toBe(1);
			expect(clusterIndices[2] - clusterIndices[1]).toBe(1);
		});

		it('never places 3 consecutive cards sharing the same chord root, across distinct facts of that root', () => {
			// 4 distinct facts, all rooted on C, each its own single-card unit
			// (non-New, so no teach-cluster exemption applies) - the only way to
			// avoid a 3-in-a-row same-root run is genuine inter-unit spacing.
			const input = [
				makeCardRecord({ factId: 'chord-formula:C', mode: 'formula', state: State.Review, stability: 1 }),
				makeCardRecord({ factId: 'chord-formula:Cm', mode: 'formula', state: State.Review, stability: 2 }),
				makeCardRecord({ factId: 'chord-formula:C7', mode: 'formula', state: State.Review, stability: 3 }),
				makeCardRecord({ factId: 'chord-formula:Cmaj7', mode: 'formula', state: State.Review, stability: 4 }),
				makeCardRecord({ factId: 'chord-formula:Dm7', mode: 'formula', state: State.Review, stability: 5 }),
				makeCardRecord({ factId: 'chord-formula:Em7', mode: 'formula', state: State.Review, stability: 6 })
			];

			for (let seed = 0; seed < 20; seed++) {
				const output = interleaveQueue(input, seededRng(seed));
				for (let i = 2; i < output.length; i++) {
					const roots = [output[i - 2], output[i - 1], output[i]].map(
						(card) => /^chord-formula:([A-G][#b]?)/.exec(card.factId)?.[1]
					);
					const allSameRoot = roots[0] !== undefined && roots.every((r) => r === roots[0]);
					expect(allSameRoot).toBe(false);
				}
			}
		});

		it('a degenerate single-fact input (all cards share one factId) returns without looping, still a permutation', () => {
			const input = ['formula', 'see-play', 'formula-build'].map((mode) =>
				makeCardRecord({ factId: 'chord-formula:Cm7', mode: mode as Mode, state: State.New })
			);
			const output = interleaveQueue(input, seededRng(4));
			expect(output).toHaveLength(3);
			expect(new Set(output)).toEqual(new Set(input));
		});

		it('a degenerate single-root input (many distinct facts, all same root, all non-New) still terminates and is a permutation', () => {
			const input = ['C', 'Cm', 'C7', 'Cmaj7', 'Cdim7', 'Cm7'].map((symbol, i) =>
				makeCardRecord({
					factId: `chord-formula:${symbol}`,
					mode: 'formula',
					state: State.Review,
					stability: i + 1
				})
			);
			const output = interleaveQueue(input, seededRng(5));
			expect(output).toHaveLength(input.length);
			expect(new Set(output)).toEqual(new Set(input));
		});

		it('is deterministic under a seeded rng (same input + seed => same output order)', () => {
			const input = [
				makeCardRecord({ factId: 'chord-formula:Cm7', mode: 'formula', state: State.Review, stability: 1 }),
				makeCardRecord({ factId: 'chord-formula:Dm7', mode: 'formula', state: State.Review, stability: 2 }),
				makeCardRecord({ factId: 'interval-size:m3', mode: 'formula', state: State.Review, stability: 3 })
			];
			const first = interleaveQueue(input, seededRng(7));
			const second = interleaveQueue(input, seededRng(7));
			expect(first.map((c) => c.factId)).toEqual(second.map((c) => c.factId));
		});

		it('a single-card input returns that card unchanged', () => {
			const input = [makeCardRecord({ factId: 'chord-formula:Cm7' })];
			expect(interleaveQueue(input, seededRng(8))).toEqual(input);
		});

		it('an empty input returns []', () => {
			expect(interleaveQueue([], seededRng(9))).toEqual([]);
		});

		it('non-chord facts (interval-size/scale-degree) impose no root constraint and interleave freely', () => {
			const input = [
				makeCardRecord({ factId: 'interval-size:m3', mode: 'formula', state: State.Review, stability: 1 }),
				makeCardRecord({ factId: 'interval-size:M3', mode: 'formula', state: State.Review, stability: 2 }),
				makeCardRecord({ factId: 'scale-degree:G:3', mode: 'formula', state: State.Review, stability: 3 }),
				makeCardRecord({ factId: 'scale-degree:C:2', mode: 'formula', state: State.Review, stability: 4 })
			];
			const output = interleaveQueue(input, seededRng(10));
			expect(output).toHaveLength(4);
			expect(new Set(output)).toEqual(new Set(input));
		});
	});
});
