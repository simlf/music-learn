import { describe, expect, it } from 'vitest';
import {
	chordOrderForTier,
	curriculumOrder,
	curriculumTierOf,
	intervalAtomsForSymbol,
	intervalAtomsForTier,
	introductionOrder
} from './curriculum';
import { allFacts, chordFormulaFactId, intervalSizeFactId } from './facts';
import { DRILL_INTERVALS } from '$lib/theory/interval';
import { itemsForTier, availableTierIds } from '$lib/practice/tiers';

/**
 * The introduction order is a CONTRACT, not an accident. The catalog order it
 * replaced handed a brand-new user "C, Cm, Cdim, Cmaj7, Cm7, C7, Cm7b5,
 * Cdim7, Db, Dbm" on day one (every quality the app knows, including
 * half-diminished and diminished seventh, plus D-flat) and put all 96 chord
 * spellings ahead of the first interval atom. The pins below exist so that
 * can never silently come back.
 */

const chordIds = (symbols: string[]): string[] => symbols.map(chordFormulaFactId);
const ids = (facts: { factId: string }[]): string[] => facts.map((fact) => fact.factId);

describe('intervalAtomsForSymbol (the prerequisite relation, derived not hand-written)', () => {
	it('a major triad needs M3 and P5', () => {
		expect(intervalAtomsForSymbol('C')).toEqual(['M3', 'P5']);
	});

	it('a minor triad needs m3 and P5', () => {
		expect(intervalAtomsForSymbol('C')).toEqual(['M3', 'P5']);
		expect(intervalAtomsForSymbol('Cm')).toEqual(['m3', 'P5']);
	});

	it("a diminished triad's d5 resolves to the drill pool's A4 (same distance, one atom)", () => {
		// DRILL_INTERVALS holds A4 but no d5, so the tritone has exactly one
		// drillable atom. Without the semitone mapping, every dim/m7b5 chord
		// would name a prerequisite the app has no fact for.
		expect(intervalAtomsForSymbol('Cdim')).toEqual(['m3', 'A4']);
		expect(DRILL_INTERVALS).not.toContain('d5');
	});

	it("dim7's d7 resolves to the drill pool's M6 for the same reason", () => {
		expect(intervalAtomsForSymbol('Cdim7')).toEqual(['m3', 'A4', 'M6']);
		expect(DRILL_INTERVALS).not.toContain('d7');
	});

	it('the three sevenths need their seventh plus their triad intervals', () => {
		expect(intervalAtomsForSymbol('Cmaj7')).toEqual(['M3', 'P5', 'M7']);
		expect(intervalAtomsForSymbol('Cm7')).toEqual(['m3', 'P5', 'm7']);
		expect(intervalAtomsForSymbol('C7')).toEqual(['M3', 'P5', 'm7']);
		expect(intervalAtomsForSymbol('Cm7b5')).toEqual(['m3', 'A4', 'm7']);
	});

	it('is enharmonically stable across roots: F#m7 needs the same atoms as Cm7', () => {
		expect(intervalAtomsForSymbol('F#m7')).toEqual(intervalAtomsForSymbol('Cm7'));
		expect(intervalAtomsForSymbol('Bbdim7')).toEqual(intervalAtomsForSymbol('Cdim7'));
	});

	it('never names the root itself as an interval to learn', () => {
		for (const symbol of ['C', 'Cm', 'Cdim7', 'Bbmaj7']) {
			expect(intervalAtomsForSymbol(symbol)).not.toContain('R');
		}
	});

	it('is total: an unrecognized symbol yields no atoms rather than throwing', () => {
		expect(() => intervalAtomsForSymbol('H9sus')).not.toThrow();
		expect(intervalAtomsForSymbol('H9sus')).toEqual([]);
	});
});

describe('intervalAtomsForTier', () => {
	it('tier 1 (major/minor triads) needs exactly m3, M3, P5', () => {
		expect(intervalAtomsForTier(1)).toEqual(['m3', 'M3', 'P5']);
	});

	it('tier 2 adds the tritone for diminished triads', () => {
		expect(intervalAtomsForTier(2)).toEqual(['m3', 'M3', 'A4', 'P5']);
	});

	it('tier 3 adds both sevenths', () => {
		expect(intervalAtomsForTier(3)).toEqual(['m3', 'M3', 'P5', 'm7', 'M7']);
	});

	it("tier 4 adds M6 (dim7's diminished seventh)", () => {
		expect(intervalAtomsForTier(4)).toEqual(['m3', 'A4', 'M6', 'm7']);
	});

	it('a locked tier needs nothing (itemsForTier is empty for it)', () => {
		expect(intervalAtomsForTier(5)).toEqual([]);
		expect(intervalAtomsForTier(6)).toEqual([]);
	});

	it('the whole available ladder needs 7 of the 12 drilled intervals; the other 5 appear in no tier chord', () => {
		const needed = new Set(availableTierIds().flatMap((tier) => intervalAtomsForTier(tier)));
		expect([...needed].sort()).toEqual(['A4', 'M3', 'M6', 'M7', 'P5', 'm3', 'm7'].sort());
		const unneeded = DRILL_INTERVALS.filter((short) => !needed.has(short));
		expect(unneeded).toEqual(['m2', 'M2', 'P4', 'm6', 'P8']);
	});
});

describe('chordOrderForTier (quality-outer / root-inner, naturals first)', () => {
	it('tier 1 teaches all seven white-key majors before the first minor', () => {
		expect(chordOrderForTier(1)).toEqual([
			'C',
			'D',
			'E',
			'F',
			'G',
			'A',
			'B',
			'Cm',
			'Dm',
			'Em',
			'Fm',
			'Gm',
			'Am',
			'Bm'
		]);
	});

	it('is a permutation of itemsForTier, never a different set', () => {
		for (const tier of availableTierIds()) {
			expect([...chordOrderForTier(tier)].sort()).toEqual([...itemsForTier(tier)].sort());
		}
	});

	it('within a quality, natural roots come before accidental roots', () => {
		const order = chordOrderForTier(2);
		const majors = order.filter((symbol) => /^[A-G][#b]?$/.test(symbol));
		expect(majors).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Db', 'Eb', 'F#', 'Ab', 'Bb']);
	});

	it('qualities follow the order the tier declares them in', () => {
		const order = chordOrderForTier(3);
		const firstOf = (suffix: string) =>
			order.findIndex((symbol) => symbol.slice(symbol.match(/^[A-G][#b]?/)![0].length) === suffix);
		expect(firstOf('maj7')).toBeLessThan(firstOf('m7'));
		expect(firstOf('m7')).toBeLessThan(firstOf('7'));
	});

	it('a locked tier contributes no chords', () => {
		expect(chordOrderForTier(5)).toEqual([]);
	});
});

describe('curriculumOrder (a total permutation of the catalog)', () => {
	it('holds every catalog fact exactly once, nothing added or dropped', () => {
		const order = curriculumOrder();
		expect(order).toHaveLength(allFacts().length);
		expect(new Set(ids(order)).size).toBe(allFacts().length);
		expect([...ids(order)].sort()).toEqual([...ids(allFacts())].sort());
	});

	it('is deterministic across calls', () => {
		expect(ids(curriculumOrder())).toEqual(ids(curriculumOrder()));
	});

	it('every interval atom precedes every chord fact that is built from it', () => {
		const order = ids(curriculumOrder());
		const positionOf = (factId: string) => order.indexOf(factId);
		for (const fact of allFacts()) {
			if (fact.factKind !== 'chord-formula') continue;
			for (const atom of intervalAtomsForSymbol(fact.symbol)) {
				expect(positionOf(intervalSizeFactId(atom))).toBeLessThan(positionOf(fact.factId));
			}
		}
	});

	it('promotes C/G/F scale-degree facts right after tier 1s triads (this task, PR #38s deferred promotion)', () => {
		// familyForCard gaining a 'degree' family (PR #51) removed the reason
		// #38 kept every scale-degree fact at the tail. This pins the new
		// position: right after the first triads, not at index 108 anymore.
		const order = curriculumOrder();
		const firstScaleDegree = order.findIndex((fact) => fact.factKind === 'scale-degree');
		expect(firstScaleDegree).toBe(17);
		expect(order[17].factId).toBe('scale-degree:C:1');
	});

	it('the remaining 63 scale-degree facts (the 9 tonics NOT promoted) still occupy a genuine tail', () => {
		const order = curriculumOrder();
		const tailStart = order.length - 63;
		expect(tailStart).toBe(129);
		expect(order.slice(tailStart).every((fact) => fact.factKind === 'scale-degree')).toBe(true);
		// D-flat is the tonic right after C in MAJOR_SCALE_ROOTS, and C's own
		// 7 degrees are already fully promoted (staged at tiers 1 and 3), so
		// the tail's first fact is D-flat's, not C's.
		expect(order[tailStart].factId).toBe('scale-degree:D♭:1');
	});

	it('leaves the catalog order itself untouched (display order is a separate concern)', () => {
		const catalog = allFacts();
		expect(catalog[0].factId).toBe('chord-formula:C');
		expect(catalog[96].factId).toBe('interval-size:m2');
		expect(catalog[108].factId).toBe('scale-degree:C:1');
	});
});

describe('curriculumTierOf', () => {
	it('places each chord at the lowest tier that claims it', () => {
		expect(curriculumTierOf('chord-formula:C')).toBe(1);
		expect(curriculumTierOf('chord-formula:Db')).toBe(2);
		expect(curriculumTierOf('chord-formula:Cdim')).toBe(2);
		expect(curriculumTierOf('chord-formula:Cm7')).toBe(3);
		expect(curriculumTierOf('chord-formula:Cdim7')).toBe(4);
	});

	it('places each interval atom at the tier that first needs it', () => {
		expect(curriculumTierOf('interval-size:m3')).toBe(1);
		expect(curriculumTierOf('interval-size:A4')).toBe(2);
		expect(curriculumTierOf('interval-size:M7')).toBe(3);
		expect(curriculumTierOf('interval-size:M6')).toBe(4);
	});

	it('places the atoms no tier chord needs past the ladder', () => {
		expect(curriculumTierOf('interval-size:m2')).toBe(5);
		expect(curriculumTierOf('interval-size:P8')).toBe(5);
	});

	it('places promoted C/G/F scale-degree facts at the tier that makes them meaningful', () => {
		// 1, 3, 5: staged with tier 1 (the first triads).
		expect(curriculumTierOf('scale-degree:C:1')).toBe(1);
		expect(curriculumTierOf('scale-degree:G:3')).toBe(1);
		expect(curriculumTierOf('scale-degree:F:5')).toBe(1);
		// 7, plus the scale-completing 2/4/6: staged with tier 3 (the first sevenths).
		expect(curriculumTierOf('scale-degree:C:7')).toBe(3);
		expect(curriculumTierOf('scale-degree:G:2')).toBe(3);
		expect(curriculumTierOf('scale-degree:F:4')).toBe(3);
		expect(curriculumTierOf('scale-degree:C:6')).toBe(3);
	});

	it('places every non-promoted tonics scale-degree facts past the ladder', () => {
		expect(curriculumTierOf('scale-degree:D:1')).toBe(5);
		expect(curriculumTierOf('scale-degree:B:7')).toBe(5);
	});

	it('is total: an unknown factId returns null', () => {
		expect(curriculumTierOf('scale-formula:C')).toBeNull();
		expect(curriculumTierOf('nonsense')).toBeNull();
	});
});

describe('introductionOrder: the first facts a NEW user meets (the day-1 contract)', () => {
	it('a fresh user at tier 1 meets three interval atoms and the seven white-key majors first', () => {
		// This is the whole point of the change. Before: C, Cm, Cdim, Cmaj7,
		// Cm7, C7, Cm7b5, Cdim7, Db, Dbm on day one, with the first interval
		// atom around day 11.
		expect(ids(introductionOrder(1)).slice(0, 10)).toEqual([
			'interval-size:m3',
			'interval-size:M3',
			'interval-size:P5',
			'chord-formula:C',
			'chord-formula:D',
			'chord-formula:E',
			'chord-formula:F',
			'chord-formula:G',
			'chord-formula:A',
			'chord-formula:B'
		]);
	});

	it('no seventh, no diminished chord, and no accidental root appears in a tier 1 users first day', () => {
		const dayOne = ids(introductionOrder(1)).slice(0, 10);
		expect(dayOne.some((factId) => /7|dim/.test(factId))).toBe(false);
		expect(dayOne.some((factId) => /chord-formula:[A-G][#b]/.test(factId))).toBe(false);
	});

	it('tier 1 is exactly 3 atoms, its 14 triads, and the 9 promoted degree-1/3/5 facts for C/G/F', () => {
		expect(ids(introductionOrder(1))).toEqual([
			...['m3', 'M3', 'P5'].map(intervalSizeFactId),
			...chordIds([
				'C',
				'D',
				'E',
				'F',
				'G',
				'A',
				'B',
				'Cm',
				'Dm',
				'Em',
				'Fm',
				'Gm',
				'Am',
				'Bm'
			]),
			'scale-degree:C:1',
			'scale-degree:G:1',
			'scale-degree:F:1',
			'scale-degree:C:3',
			'scale-degree:G:3',
			'scale-degree:F:3',
			'scale-degree:C:5',
			'scale-degree:G:5',
			'scale-degree:F:5'
		]);
	});

	it('the first 20 facts of the fully unlocked ladder pin the whole early curriculum (THIS TASKs deliverable)', () => {
		// Before this task: the 20th fact was 'chord-formula:Eb', with the first
		// scale-degree fact roughly ten days away. Now, as soon as a fresh
		// user's first 14 triads are taught, the very next facts are the scale
		// those triads come from, numbered - proving "the same shape in every
		// key" while it is still the freshest possible context.
		expect(ids(introductionOrder(4)).slice(0, 20)).toEqual([
			'interval-size:m3',
			'interval-size:M3',
			'interval-size:P5',
			'chord-formula:C',
			'chord-formula:D',
			'chord-formula:E',
			'chord-formula:F',
			'chord-formula:G',
			'chord-formula:A',
			'chord-formula:B',
			'chord-formula:Cm',
			'chord-formula:Dm',
			'chord-formula:Em',
			'chord-formula:Fm',
			'chord-formula:Gm',
			'chord-formula:Am',
			'chord-formula:Bm',
			'scale-degree:C:1',
			'scale-degree:G:1',
			'scale-degree:F:1'
		]);
	});
});

describe('introductionOrder: the tier gate', () => {
	it('gates strictly by tier: each rung adds its own atoms, chords, and (at tiers 1 and 3) promoted scale-degree facts', () => {
		expect(introductionOrder(1)).toHaveLength(3 + 14 + 9);
		expect(introductionOrder(2)).toHaveLength(3 + 14 + 9 + 1 + 22);
		expect(introductionOrder(3)).toHaveLength(3 + 14 + 9 + 1 + 22 + 2 + 36 + 12);
		expect(introductionOrder(4)).toHaveLength(allFacts().length);
	});

	it('a lower tier order is always a prefix of a higher one (no reshuffling on unlock)', () => {
		for (const [lower, higher] of [
			[1, 2],
			[2, 3],
			[3, 4]
		] as const) {
			const low = ids(introductionOrder(lower));
			const high = ids(introductionOrder(higher));
			expect(high.slice(0, low.length)).toEqual(low);
		}
	});

	it('withholds the non-promoted tonics scale-degree facts until the whole ladder is unlocked', () => {
		for (const tier of [1, 2, 3] as const) {
			expect(ids(introductionOrder(tier))).not.toContain('scale-degree:D:1');
		}
		expect(ids(introductionOrder(4))).toContain('scale-degree:D:1');
	});

	it('does NOT withhold the promoted C/G/F scale-degree facts: they open at tiers 1 and 3, same as any other fact at that tier', () => {
		// 1, 3, 5 open at tier 1.
		for (const tier of [1, 2, 3, 4] as const) {
			expect(ids(introductionOrder(tier))).toContain('scale-degree:C:1');
		}
		// 7 (and the scale-completing 2/4/6) don't open until tier 3.
		expect(ids(introductionOrder(1))).not.toContain('scale-degree:C:7');
		expect(ids(introductionOrder(2))).not.toContain('scale-degree:C:7');
		expect(ids(introductionOrder(3))).toContain('scale-degree:C:7');
	});

	it('withholds the five atoms no tier chord needs until the ladder is complete', () => {
		expect(ids(introductionOrder(3))).not.toContain('interval-size:m2');
		expect(ids(introductionOrder(4))).toContain('interval-size:m2');
	});

	it('defaults to the bottom of the ladder rather than the whole catalog', () => {
		expect(ids(introductionOrder())).toEqual(ids(introductionOrder(1)));
	});

	it('never emits a locked tier 5 or 6 quality at any tier', () => {
		for (const fact of introductionOrder(4)) {
			if (fact.factKind !== 'chord-formula') continue;
			expect(fact.symbol).not.toMatch(/(sus4|add9|maj9|m9|m6|13|#5|b9)/);
		}
	});
});

describe('introductionOrder: prerequisite catch-up for a returning user', () => {
	const allChordIds = new Set(
		allFacts()
			.filter((fact) => fact.factKind === 'chord-formula')
			.map((fact) => fact.factId)
	);

	it('hands a user who already has every chord fact the atoms those chords need, whatever tier says', () => {
		// The owner's real deck: all 96 chord spellings introduced before the
		// first interval fact (that IS the defect). A prerequisite of something
		// already taught is overdue, not premature, so the tier gate must not
		// withhold it.
		const order = ids(introductionOrder(1, allChordIds));
		for (const atom of ['m3', 'M3', 'A4', 'P5', 'M6', 'm7', 'M7']) {
			expect(order).toContain(intervalSizeFactId(atom));
		}
	});

	it('catch-up adds atoms only, never chords or scale degrees from a higher tier', () => {
		const gated = new Set(ids(introductionOrder(1)));
		const extra = ids(introductionOrder(1, allChordIds)).filter((factId) => !gated.has(factId));
		expect(extra).toEqual([
			'interval-size:A4',
			'interval-size:m7',
			'interval-size:M7',
			'interval-size:M6'
		]);
	});

	it('changes nothing for a fresh deck (no introduced facts, no catch-up)', () => {
		expect(ids(introductionOrder(1, new Set()))).toEqual(ids(introductionOrder(1)));
	});

	it('an introduced factId the catalog does not hold is ignored, never thrown on', () => {
		expect(() => introductionOrder(1, new Set(['scale-formula:C', 'garbage']))).not.toThrow();
		expect(ids(introductionOrder(1, new Set(['scale-formula:C'])))).toEqual(
			ids(introductionOrder(1))
		);
	});
});
