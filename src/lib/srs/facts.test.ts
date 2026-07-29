import { describe, expect, it } from 'vitest';
import {
	allFacts,
	chordFormulaFactId,
	factById,
	intervalSizeFactId,
	scaleDegreeFactId,
	scaleFormulaFactId
} from './facts';
import { ROOTS, QUALITY_SUFFIXES } from '$lib/theory/randomChord';
import { DRILL_INTERVALS } from '$lib/theory/interval';
import { MAJOR_SCALE_ROOTS, majorScaleNotes } from '$lib/theory/scale';
import { spellChord } from '$lib/theory/chord';

/**
 * RED spec for the Phase 11 fact catalog (11-02, MEM-01). Encodes every case
 * from the plan's behavior block: the catalog is generated FROM the existing
 * theory engine (ROOTS x QUALITY_SUFFIXES, DRILL_INTERVALS, MAJOR_SCALE_ROOTS
 * x majorScaleNotes), never hand-authored (D-06), with stable unique factIds
 * (D-05) and a total factById lookup.
 */
describe('allFacts', () => {
	it('returns exactly 192 facts', () => {
		expect(allFacts().length).toBe(192);
	});

	it('has exactly 96 chord-formula, 12 interval-size, and 84 scale-degree facts', () => {
		const facts = allFacts();
		expect(facts.filter((f) => f.factKind === 'chord-formula').length).toBe(96);
		expect(facts.filter((f) => f.factKind === 'interval-size').length).toBe(12);
		expect(facts.filter((f) => f.factKind === 'scale-degree').length).toBe(84);
	});

	it('has 96 = ROOTS.length x QUALITY_SUFFIXES.length and 84 = MAJOR_SCALE_ROOTS.length x 7', () => {
		expect(ROOTS.length * QUALITY_SUFFIXES.length).toBe(96);
		expect(MAJOR_SCALE_ROOTS.length * 7).toBe(84);
		expect(DRILL_INTERVALS.length).toBe(12);
	});

	it('every factId is unique across the full catalog', () => {
		const facts = allFacts();
		const ids = new Set(facts.map((f) => f.factId));
		expect(ids.size).toBe(192);
	});

	it('every chord-formula fact symbol is recognized by spellChord', () => {
		const chordFacts = allFacts().filter((f) => f.factKind === 'chord-formula');
		expect(chordFacts.length).toBeGreaterThan(0);
		for (const fact of chordFacts) {
			if (fact.factKind !== 'chord-formula') continue;
			expect(spellChord(fact.symbol).recognized).toBe(true);
		}
	});

	it("includes a chord-formula fact 'chord-formula:Cm7' with symbol 'Cm7'", () => {
		const fact = factById('chord-formula:Cm7');
		expect(fact).toBeDefined();
		expect(fact?.factKind).toBe('chord-formula');
		if (fact?.factKind === 'chord-formula') {
			expect(fact.symbol).toBe('Cm7');
		}
	});

	it("includes a chord-formula fact 'chord-formula:F#m7' with symbol 'F#m7' (ASCII spelling)", () => {
		const fact = factById('chord-formula:F#m7');
		expect(fact).toBeDefined();
		expect(fact?.factKind).toBe('chord-formula');
		if (fact?.factKind === 'chord-formula') {
			expect(fact.symbol).toBe('F#m7');
		}
	});

	it("includes an interval-size fact 'interval-size:m3' with short 'm3'", () => {
		const fact = factById('interval-size:m3');
		expect(fact).toBeDefined();
		expect(fact?.factKind).toBe('interval-size');
		if (fact?.factKind === 'interval-size') {
			expect(fact.short).toBe('m3');
		}
	});

	it('every interval-size fact short is one of DRILL_INTERVALS', () => {
		const intervalFacts = allFacts().filter((f) => f.factKind === 'interval-size');
		expect(intervalFacts.length).toBe(DRILL_INTERVALS.length);
		for (const fact of intervalFacts) {
			if (fact.factKind !== 'interval-size') continue;
			expect(DRILL_INTERVALS).toContain(fact.short);
		}
	});

	it("includes a scale-degree fact 'scale-degree:G:3' with tonic 'G' and degree 3", () => {
		const fact = factById('scale-degree:G:3');
		expect(fact).toBeDefined();
		expect(fact?.factKind).toBe('scale-degree');
		if (fact?.factKind === 'scale-degree') {
			expect(fact.tonic).toBe('G');
			expect(fact.degree).toBe(3);
		}
	});

	it('every scale-degree fact resolves to a defined note within 1..7', () => {
		const scaleFacts = allFacts().filter((f) => f.factKind === 'scale-degree');
		expect(scaleFacts.length).toBeGreaterThan(0);
		for (const fact of scaleFacts) {
			if (fact.factKind !== 'scale-degree') continue;
			expect(fact.degree).toBeGreaterThanOrEqual(1);
			expect(fact.degree).toBeLessThanOrEqual(7);
			const notes = majorScaleNotes(fact.tonic);
			expect(notes[fact.degree - 1]).toBeDefined();
		}
	});

	it('factById round-trips a sample fact from each kind', () => {
		const facts = allFacts();
		const chordSample = facts.find((f) => f.factKind === 'chord-formula');
		const intervalSample = facts.find((f) => f.factKind === 'interval-size');
		const scaleSample = facts.find((f) => f.factKind === 'scale-degree');

		expect(chordSample).toBeDefined();
		expect(intervalSample).toBeDefined();
		expect(scaleSample).toBeDefined();

		expect(factById(chordSample!.factId)).toEqual(chordSample);
		expect(factById(intervalSample!.factId)).toEqual(intervalSample);
		expect(factById(scaleSample!.factId)).toEqual(scaleSample);
	});

	it('factById returns undefined for an unknown factId, never throws', () => {
		expect(() => factById('nonsense:not-a-real-fact')).not.toThrow();
		expect(factById('nonsense:not-a-real-fact')).toBeUndefined();
	});

	it('keeps its kind-grouped IDENTITY order: chord block, then interval block, then scale-degree block', () => {
		// This is the DISPLAY order (RecallMap renders it, shellVoicing
		// enumerates it) and it is deliberately NOT the teaching order, which
		// lives in srs/curriculum.ts. Pinned so a future curriculum change
		// cannot quietly reshuffle the recall map's rows.
		const facts = allFacts();
		expect(facts[0].factId).toBe('chord-formula:C');
		expect(facts[95].factId).toBe('chord-formula:Bdim7');
		expect(facts[96].factId).toBe('interval-size:m2');
		expect(facts[107].factId).toBe('interval-size:P8');
		expect(facts[108].factId).toBe('scale-degree:C:1');
		expect(facts[191].factId).toBe('scale-degree:B:7');
		expect(facts.slice(0, 96).every((f) => f.factKind === 'chord-formula')).toBe(true);
		expect(facts.slice(96, 108).every((f) => f.factKind === 'interval-size')).toBe(true);
		expect(facts.slice(108).every((f) => f.factKind === 'scale-degree')).toBe(true);
	});
});

describe('factId builders (the catalog own id shapes)', () => {
	it('chordFormulaFactId matches the ids the catalog actually holds', () => {
		expect(chordFormulaFactId('Cm7')).toBe('chord-formula:Cm7');
		expect(factById(chordFormulaFactId('F#m7b5'))).toBeDefined();
		for (const fact of allFacts()) {
			if (fact.factKind !== 'chord-formula') continue;
			expect(chordFormulaFactId(fact.symbol)).toBe(fact.factId);
		}
	});

	it('intervalSizeFactId matches the ids the catalog actually holds', () => {
		expect(intervalSizeFactId('m3')).toBe('interval-size:m3');
		for (const fact of allFacts()) {
			if (fact.factKind !== 'interval-size') continue;
			expect(intervalSizeFactId(fact.short)).toBe(fact.factId);
		}
	});

	it('scaleDegreeFactId matches the ids the catalog actually holds (curriculum.ts promotion staging needs this)', () => {
		expect(scaleDegreeFactId('G', 3)).toBe('scale-degree:G:3');
		for (const fact of allFacts()) {
			if (fact.factKind !== 'scale-degree') continue;
			expect(scaleDegreeFactId(fact.tonic, fact.degree)).toBe(fact.factId);
		}
	});
});

describe('scaleFormulaFactId (Phase 12 D-09 seam)', () => {
	it('builds a scale-formula factId with the tonic preserved verbatim', () => {
		expect(scaleFormulaFactId('C')).toBe('scale-formula:C');
		expect(scaleFormulaFactId('F♯')).toBe('scale-formula:F♯');
	});

	it('regression pin: allFacts().length is still exactly 192 (unchanged catalog size)', () => {
		expect(allFacts().length).toBe(192);
	});

	it('regression pin: no fact in the catalog carries factKind scale-formula', () => {
		// Cast to string: the Fact union's factKind is statically known to
		// exclude 'scale-formula' (that's the whole point of this pin), so TS
		// correctly flags a direct literal comparison as a type error. This is
		// a runtime regression guard against a FUTURE catalog change, not a
		// type-level check.
		expect(allFacts().every((f) => (f.factKind as string) !== 'scale-formula')).toBe(true);
	});
});
