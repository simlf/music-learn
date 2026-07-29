import { ROOTS, QUALITY_SUFFIXES } from '$lib/theory/randomChord';
import { DRILL_INTERVALS } from '$lib/theory/interval';
import { MAJOR_SCALE_ROOTS } from '$lib/theory/scale';
import { spellChord } from '$lib/theory/chord';

/**
 * The pure fact catalog for the Phase 11 memorization engine (MEM-01):
 * every theory fact the deck (11-03) can seed a card for, and every row the
 * recall map (11-06) enumerates. Generated entirely FROM the existing theory
 * engine's own proven fact spaces (D-06) so the deck always mirrors it:
 *
 * - chord-formula: the 12-root x 8-quality reference matrix
 *   (randomChord.ts's ROOTS/QUALITY_SUFFIXES, proven recognized by
 *   reference-chords.test.ts).
 * - interval-size: the 12-entry drill interval pool (interval.ts's
 *   DRILL_INTERVALS).
 * - scale-degree: the 12 major-scale tonics x 7 degrees
 *   (scale.ts's MAJOR_SCALE_ROOTS).
 *
 * Facts are thin identity references only (symbol / short / tonic+degree),
 * never denormalized note/interval data - consumers re-derive prompt/reveal
 * content via spellChord/intervalFromShort/transposeFrom/majorScaleNotes, the
 * same functions Drills and Scales already use (single source of truth).
 *
 * Pure module: no DOM, no Svelte, no Dexie imports.
 */

export type FactKind = 'chord-formula' | 'interval-size' | 'scale-degree' | 'scale-formula';

export interface ChordFormulaFact {
	factId: string;
	factKind: 'chord-formula';
	symbol: string;
}

export interface IntervalSizeFact {
	factId: string;
	factKind: 'interval-size';
	short: string;
}

export interface ScaleDegreeFact {
	factId: string;
	factKind: 'scale-degree';
	tonic: string;
	degree: number;
}

export type Fact = ChordFormulaFact | IntervalSizeFact | ScaleDegreeFact;

/** Number of degrees in a major scale; every scale-degree fact's degree is 1..SCALE_DEGREE_COUNT. */
const SCALE_DEGREE_COUNT = 7;

function buildChordFormulaFacts(): ChordFormulaFact[] {
	const facts: ChordFormulaFact[] = [];
	for (const root of ROOTS) {
		for (const suffix of QUALITY_SUFFIXES) {
			const symbol = `${root}${suffix}`;
			// Defensive check: the whole ROOTS x QUALITY_SUFFIXES matrix is
			// proven recognized by reference-chords.test.ts, but only include
			// a fact if spellChord actually recognizes it.
			if (!spellChord(symbol).recognized) continue;
			facts.push({
				factId: `chord-formula:${symbol}`,
				factKind: 'chord-formula',
				symbol
			});
		}
	}
	return facts;
}

function buildIntervalSizeFacts(): IntervalSizeFact[] {
	return DRILL_INTERVALS.map((short) => ({
		factId: `interval-size:${short}`,
		factKind: 'interval-size',
		short
	}));
}

function buildScaleDegreeFacts(): ScaleDegreeFact[] {
	const facts: ScaleDegreeFact[] = [];
	for (const tonic of MAJOR_SCALE_ROOTS) {
		for (let degree = 1; degree <= SCALE_DEGREE_COUNT; degree++) {
			facts.push({
				factId: scaleDegreeFactId(tonic, degree),
				factKind: 'scale-degree',
				tonic,
				degree
			});
		}
	}
	return facts;
}

/**
 * The full 192-entry catalog, built once at module load (pure and cheap).
 * Deterministic order: all chord-formula facts, then all interval-size
 * facts, then all scale-degree facts.
 *
 * This is the catalog's IDENTITY order, not a teaching order. It is what
 * RecallMap renders (one grouped block per fact kind) and what
 * shellVoicing.seventhChordSymbols enumerates, and a long tail of tests pins
 * it. The order new facts are TAUGHT in lives in srs/curriculum.ts instead:
 * conflating display order with introduction order is exactly what let the
 * "all 96 chord spellings before the first interval atom" defect hide in
 * plain sight.
 */
const CATALOG: Fact[] = [
	...buildChordFormulaFacts(),
	...buildIntervalSizeFacts(),
	...buildScaleDegreeFacts()
];

/** Map-backed lookup for factById, built once alongside the catalog. */
const CATALOG_BY_ID = new Map<string, Fact>(CATALOG.map((fact) => [fact.factId, fact]));

/** The full fact catalog, in deterministic order (chord-formula, interval-size, scale-degree). */
export function allFacts(): Fact[] {
	return CATALOG;
}

/** Total lookup by factId: undefined (never throws) if no fact has that id. */
export function factById(factId: string): Fact | undefined {
	return CATALOG_BY_ID.get(factId);
}

/**
 * The catalog's own chord-formula factId shape, exported so no consumer has
 * to re-spell the `chord-formula:` prefix by hand (srs/curriculum.ts's tier
 * ordering and practice/levelState.ts's tier-mastery check both need to go
 * from a tiers.ts chord SYMBOL to its factId). Mirrors
 * buildChordFormulaFacts's own construction exactly.
 */
export function chordFormulaFactId(symbol: string): string {
	return `chord-formula:${symbol}`;
}

/** The catalog's own interval-size factId shape, for the same reason as chordFormulaFactId. */
export function intervalSizeFactId(short: string): string {
	return `interval-size:${short}`;
}

/**
 * The catalog's own scale-degree factId shape, for the same reason as
 * chordFormulaFactId/intervalSizeFactId (srs/curriculum.ts's promoted-tonic
 * staging needs to build these ids the same way buildScaleDegreeFacts does,
 * without re-spelling the `scale-degree:` prefix by hand).
 */
export function scaleDegreeFactId(tonic: string, degree: number): string {
	return `scale-degree:${tonic}:${degree}`;
}

/**
 * Phase 12's scale-level factId shape (D-09): a buildable major-scale target,
 * e.g. 'scale-formula:C'. Deliberately NOT a Fact union member and NOT added
 * to CATALOG/allFacts(): introduceNewCards iterates allFacts() unconditionally
 * and RecallSession/RecallMap have no render branch for a scale-formula shape
 * (see this plan's prohibitions). Tonic is preserved verbatim, matching
 * scale-degree's own factId tonic convention.
 */
export function scaleFormulaFactId(tonic: string): string {
	return `scale-formula:${tonic}`;
}
