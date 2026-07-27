import { describe, expect, it } from 'vitest';
import { State } from '$lib/srs/scheduler';
import type { CardRecord, Mode } from '$lib/srs/deck';
import {
	composePracticeQueue,
	SCAFFOLD_HEAVY,
	filterVoicingsBySong,
	filterInversionsBySong,
	type CardedQueueItem,
	type VoicingQueueItem,
	type ProgressionQueueItem,
	type InversionQueueItem,
	type HybridQueueItem
} from './practiceQueue';

/**
 * REG-01 v2.3 milestone capstone (Phase 37, Plan 01). This is deliberately
 * narrow: it proves ONLY that the six practice families (name-it, build-it,
 * interval, voicing, progression, inversion) coexist in one
 * composePracticeQueue call with interleaving, the single-type-due gate, the
 * synthetic-half song filter, and cold-session ordering all intact
 * together. No existing pure-composer test composes all six families in one
 * queue; that is the reason this file exists. It points to
 * .planning/phases/37-no-regression-gate/37-COVERAGE-MATRIX.md for the full
 * behavior/surface to test-file map, and to
 * src/routes/practiceInversionsReg.test.ts for the host-level six-family REG
 * proof (grade-commit split, telemetry silence) that this file deliberately
 * does not repeat: everything here stays at the pure-composer level, arrays
 * of queue items only, no Svelte render.
 */

/** A deterministic seeded PRNG (mulberry32), mirroring practiceQueue.test.ts's own convention. */
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

const now0 = new Date('2026-07-27T00:00:00.000Z');

/** Minimal CardRecord builder, mirroring practiceQueue.test.ts's own makeCardRecord shape. */
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

/** Test-only fixture builder for a CardedQueueItem, mirroring cardsToQueueItems' own id/shape. */
function makeCarded(
	family: 'name-it' | 'build-it' | 'interval',
	symbolOrShort: string,
	overrides: Partial<CardedQueueItem> = {}
): CardedQueueItem {
	const isInterval = family === 'interval';
	const factId = isInterval ? `interval-size:${symbolOrShort}` : `chord-formula:${symbolOrShort}`;
	const mode: Mode = family === 'build-it' ? 'formula-build' : 'formula';
	return {
		id: `fsrs:${factId}:${mode}`,
		family,
		factId,
		mode,
		factKind: isInterval ? 'interval-size' : 'chord-formula',
		symbol: isInterval ? undefined : symbolOrShort,
		short: isInterval ? symbolOrShort : undefined,
		card: makeCardRecord({ factId, factKind: isInterval ? 'interval-size' : 'chord-formula', mode }),
		...overrides
	};
}

/** Test-only fixture builder for a VoicingQueueItem. */
function makeVoicing(symbol: string): VoicingQueueItem {
	return { id: `voicing:${symbol}`, family: 'voicing', symbol, stage: 'meet' };
}

/** Test-only fixture builder for a ProgressionQueueItem. */
function makeProgression(templateId: string, key: string): ProgressionQueueItem {
	return { id: `prog:${templateId}:${key}`, family: 'progression', templateId, key };
}

/** Test-only fixture builder for an InversionQueueItem. */
function makeInversion(symbol: string, inversionIndex: number): InversionQueueItem {
	return { id: `inversion:${symbol}:${inversionIndex}`, family: 'inversion', symbol, inversionIndex };
}

/** True iff `queue` contains 3+ consecutive items from the same family. */
function hasThreeInARow(queue: HybridQueueItem[]): boolean {
	let run = 1;
	for (let i = 1; i < queue.length; i++) {
		if (queue[i].family === queue[i - 1].family) {
			run += 1;
			if (run >= 3) return true;
		} else {
			run = 1;
		}
	}
	return false;
}

/** Builds one carded item per carded family (name-it, build-it, interval), several of each, for a six-family fixture. */
function allSixCardedItems(): CardedQueueItem[] {
	return [
		makeCarded('name-it', 'Cm7'),
		makeCarded('name-it', 'Dm7'),
		makeCarded('build-it', 'Em7'),
		makeCarded('build-it', 'Fm7'),
		makeCarded('interval', 'M3'),
		makeCarded('interval', 'P5')
	];
}

/** Builds one synthetic item per synthetic family (voicing, progression, inversion), several of each, for a six-family fixture. */
function allSixSyntheticItems(): HybridQueueItem[] {
	return [
		makeVoicing('Cmaj7'),
		makeVoicing('Dmaj7'),
		makeProgression('major-ii-V-I', 'C'),
		makeProgression('major-ii-V-I', 'D'),
		makeInversion('Gm7', 0),
		makeInversion('Gm7', 1)
	];
}

describe('practiceQueueCapstone: all six families composed together (REG-01)', () => {
	describe('interleaving, faithful permutation, and within-family order', () => {
		it('is a faithful permutation of all six families, never runs one family 3-in-a-row, and preserves each family relative order across seeds', () => {
			const carded = allSixCardedItems();
			const synthetic = allSixSyntheticItems();
			const inputIds = [...carded, ...synthetic].map((item) => item.id).sort();

			for (const seed of [1, 2, 3, 4, 5]) {
				const composed = composePracticeQueue(carded, synthetic, seededRng(seed));

				// Faithful permutation: nothing dropped or duplicated.
				expect(composed.map((item) => item.id).sort()).toEqual(inputIds);

				// No family runs three-in-a-row across all six families at once.
				expect(hasThreeInARow(composed)).toBe(false);

				// Within-family relative order preserved for every one of the six families.
				for (const family of ['name-it', 'build-it', 'interval', 'voicing', 'progression', 'inversion'] as const) {
					const expectedOrder = [...carded, ...synthetic]
						.filter((item) => item.family === family)
						.map((item) => item.id);
					const actualOrder = composed.filter((item) => item.family === family).map((item) => item.id);
					expect(actualOrder).toEqual(expectedOrder);
				}
			}
		});
	});

	describe('single-type-due gate holds for each of the six families in isolation', () => {
		it.each([
			['name-it', [makeCarded('name-it', 'Cm7'), makeCarded('name-it', 'Dm7')] as HybridQueueItem[]],
			['build-it', [makeCarded('build-it', 'Em7'), makeCarded('build-it', 'Fm7')] as HybridQueueItem[]],
			['interval', [makeCarded('interval', 'M3'), makeCarded('interval', 'P5')] as HybridQueueItem[]],
			['voicing', [makeVoicing('Cmaj7'), makeVoicing('Dmaj7')] as HybridQueueItem[]],
			[
				'progression',
				[makeProgression('major-ii-V-I', 'C'), makeProgression('major-ii-V-I', 'D')] as HybridQueueItem[]
			],
			['inversion', [makeInversion('Gm7', 0), makeInversion('Gm7', 1)] as HybridQueueItem[]]
		])('passes %s items through unchanged when every other family is empty', (_family, items) => {
			const cardedOnly = items.filter((item): item is CardedQueueItem =>
				item.family === 'name-it' || item.family === 'build-it' || item.family === 'interval'
			);
			const syntheticOnly = items.filter((item) => !cardedOnly.includes(item as CardedQueueItem));
			const composed = composePracticeQueue(cardedOnly, syntheticOnly, seededRng(9));
			expect(composed).toEqual(items);
		});
	});

	describe('synthetic-half song filter (voicing + inversion) restricts the composed queue', () => {
		// The carded-half song restriction (applySongFilter over the raw due
		// CardRecord[], upstream of this module) and the progression-omission
		// policy under a song filter are host-owned and proven at the host
		// boundary by src/routes/practiceInversionsReg.test.ts (describe "REG-01:
		// song filter (PRAC-04) steers the carded half, voicing, AND inversion
		// identically"). This capstone exercises only the synthetic-half filters
		// this module actually exposes: filterVoicingsBySong and
		// filterInversionsBySong.
		it('yields a composed queue with no voicing or inversion item whose symbol fails the predicate', () => {
			const carded = allSixCardedItems();
			const voicings: VoicingQueueItem[] = [makeVoicing('Cmaj7'), makeVoicing('Dmaj7'), makeVoicing('Emaj7')];
			const inversions: InversionQueueItem[] = [
				makeInversion('Gm7', 0),
				makeInversion('Am7', 0),
				makeInversion('Gm7', 1)
			];
			const progressions: ProgressionQueueItem[] = [
				makeProgression('major-ii-V-I', 'C'),
				makeProgression('major-ii-V-I', 'D')
			];

			const allowedSymbol = 'Gm7';
			const filteredVoicings = filterVoicingsBySong(voicings, (symbol) => symbol === allowedSymbol);
			const filteredInversions = filterInversionsBySong(inversions, (symbol) => symbol === allowedSymbol);

			// Voicings: none of Cmaj7/Dmaj7/Emaj7 equal Gm7, so all are filtered out.
			expect(filteredVoicings).toEqual([]);
			// Inversions: only the two Gm7 entries survive; Am7 does not.
			expect(filteredInversions.map((item) => item.symbol)).toEqual(['Gm7', 'Gm7']);

			const synthetic: HybridQueueItem[] = [...filteredVoicings, ...progressions, ...filteredInversions];
			const composed = composePracticeQueue(carded, synthetic, seededRng(4));

			const survivingVoicingSymbols = composed
				.filter((item): item is VoicingQueueItem => item.family === 'voicing')
				.map((item) => item.symbol);
			const survivingInversionSymbols = composed
				.filter((item): item is InversionQueueItem => item.family === 'inversion')
				.map((item) => item.symbol);

			expect(survivingVoicingSymbols).toEqual([]);
			expect(new Set(survivingInversionSymbols)).toEqual(new Set(['Gm7']));
		});
	});

	describe('cold-session ordering with all six families present', () => {
		it('never leads with a scaffold-heavy family (progression or inversion) under { lowMastery: true } across seeds, and stays a faithful permutation with no 3-in-a-row', () => {
			const carded = allSixCardedItems();
			const synthetic = allSixSyntheticItems();
			const inputIds = [...carded, ...synthetic].map((item) => item.id).sort();

			for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
				const composed = composePracticeQueue(carded, synthetic, seededRng(seed), { lowMastery: true });

				expect(SCAFFOLD_HEAVY.has(composed[0].family)).toBe(false);
				expect(composed.map((item) => item.id).sort()).toEqual(inputIds);
				expect(hasThreeInARow(composed)).toBe(false);
			}
		});
	});
});
