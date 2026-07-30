import { describe, expect, it } from 'vitest';
import {
	chordOrderForTier,
	curriculumOrder,
	curriculumTierOf,
	intervalAtomsForSymbol,
	intervalAtomsForTier,
	introductionOrder
} from './curriculum';
import { allFacts, chordFormulaFactId, intervalSizeFactId, scaleDegreeFactId } from './facts';
import { DRILL_INTERVALS } from '$lib/theory/interval';
import { itemsForTier, availableTierIds, splitSymbol } from '$lib/practice/tiers';
import { MAJOR_SCALE_ROOTS } from '$lib/theory/scale';
import { ROOTS, TIER_5_6_QUALITY_SUFFIXES, V1_QUALITY_SUFFIXES } from '$lib/theory/randomChord';

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

	it("tier 5 adds P4 (sus4/7sus4's fourth); its 6/m6 sixth and sus4/7sus4's fifth+seventh are already needed by earlier tiers", () => {
		expect(intervalAtomsForTier(5)).toEqual(['m3', 'M3', 'P4', 'P5', 'M6', 'm7']);
	});

	it("tier 6 adds m2 (7b9's flat ninth) and m6 (7#5's sharp five, semitone-equivalent to a minor 6th)", () => {
		expect(intervalAtomsForTier(6)).toEqual(['m2', 'M3', 'P5', 'm6', 'm7']);
	});

	it('the whole ladder (n1-tier-unlock: all 6 tiers available) needs 10 of the 12 drilled intervals; only M2 and P8 appear in no tier chord', () => {
		const needed = new Set(availableTierIds().flatMap((tier) => intervalAtomsForTier(tier)));
		expect([...needed].sort()).toEqual(
			['A4', 'M3', 'M6', 'M7', 'P4', 'P5', 'm2', 'm3', 'm6', 'm7'].sort()
		);
		const unneeded = DRILL_INTERVALS.filter((short) => !needed.has(short));
		expect(unneeded).toEqual(['M2', 'P8']);
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

	it('tier 5 (unlocked, n1-tier-unlock) is a 48-item permutation of its own qualities x roots', () => {
		const order = chordOrderForTier(5);
		expect(order).toHaveLength(48);
		expect([...order].sort()).toEqual([...itemsForTier(5)].sort());
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

	it('promotes C/G/F scale-degree facts right after tier 1s triads (PR #54s first step)', () => {
		// familyForCard gaining a 'degree' family (PR #51) removed the reason
		// #38 kept every scale-degree fact at the tail. This pins the position
		// #54 gave C/G/F: right after the first triads, not at index 108.
		const order = curriculumOrder();
		const firstScaleDegree = order.findIndex((fact) => fact.factKind === 'scale-degree');
		expect(firstScaleDegree).toBe(17);
		expect(order[17].factId).toBe('scale-degree:C:1');
	});

	it('finishes the promotion (PR #54/this-task history): no scale-degree fact is left at the catalogs tail', () => {
		// #54 deliberately left the other 9 tonics' 63 facts at the tail as
		// unfinished business; that promotion finished staging every
		// scale-degree fact within tiers 1-3 before this task began. This task
		// (n1-tier-unlock) then extended the LADDER itself with tiers 5/6, so
		// the true tail is no longer scale-degree OR the old 5-atom orphan set:
		// tier 5/6's own 72 new chord facts land after all 84 scale-degree
		// facts, and only M2 + P8 (the two atoms genuinely unneeded by any of
		// the 6 tiers' chords) sort after THAT, as the very last 2 entries.
		const order = curriculumOrder();
		const scaleDegreeCount = order.filter((fact) => fact.factKind === 'scale-degree').length;
		expect(scaleDegreeCount).toBe(84);

		const lastScaleDegreeIndex = order.findLastIndex((fact) => fact.factKind === 'scale-degree');
		const firstTier5ChordIndex = order.findIndex(
			(fact) => fact.factKind === 'chord-formula' && fact.symbol.endsWith('6')
		);
		expect(lastScaleDegreeIndex).toBeLessThan(firstTier5ChordIndex);

		const last2 = order.slice(-2);
		expect(last2.map((fact) => fact.factId)).toEqual(['interval-size:M2', 'interval-size:P8']);
	});

	it('stages exactly the 12 MAJOR_SCALE_ROOTS tonics, no tonic missing or duplicated', () => {
		// A typo in REMAINING_SCALE_TONICS would either drop a tonic's 7 facts
		// to the (now-unused) tail loop, or duplicate one at another tonic's
		// expense. Both are silent without this check: buildCurriculum's `seen`
		// guard means a duplicate entry is simply ignored, not an error.
		for (const tonic of MAJOR_SCALE_ROOTS) {
			for (const degree of [1, 2, 3, 4, 5, 6, 7]) {
				expect(curriculumTierOf(scaleDegreeFactId(tonic, degree))).not.toBeNull();
			}
		}
	});

	it('leaves the catalog order itself untouched (display order is a separate concern)', () => {
		// facts.ts appends the tier 5/6 quality block after the original 96
		// chord facts (see its "CHORD-FORMULA BUILD ORDER" docstring), so the
		// original block boundary (facts[95]) is untouched; only the
		// interval-size/scale-degree block START indices moved later (96->168,
		// 108->180) because more chord content now precedes them.
		const catalog = allFacts();
		expect(catalog[0].factId).toBe('chord-formula:C');
		expect(catalog[95].factId).toBe('chord-formula:Bdim7');
		expect(catalog[168].factId).toBe('interval-size:m2');
		expect(catalog[180].factId).toBe('scale-degree:C:1');
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

	it("places tier 5/6's own new atoms (P4, m2, m6) at the tier that first needs them (n1-tier-unlock)", () => {
		expect(curriculumTierOf('interval-size:P4')).toBe(5);
		expect(curriculumTierOf('interval-size:m2')).toBe(6);
		expect(curriculumTierOf('interval-size:m6')).toBe(6);
	});

	it('places the two atoms no tier chord needs (M2, P8) past the whole 6-tier ladder', () => {
		expect(curriculumTierOf('interval-size:M2')).toBe(7);
		expect(curriculumTierOf('interval-size:P8')).toBe(7);
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

	it('places the 9 remaining tonics 1/3/5 at tier 2, this tasks finished promotion', () => {
		// Tier 1's roots are WHITE_KEY_ROOTS only, so D/E/A/B (natural, but not
		// among PROMOTED_SCALE_TONICS) wait for tier 2 same as the accidental
		// roots (D♭/E♭/F♯/A♭/B♭), even though D/E/A/B's OWN triads already
		// exist at tier 1: tier 1's degree-fact pool is deliberately kept at
		// exactly what #54 shipped (see TRIAD_DEGREE_TIER's docstring).
		expect(curriculumTierOf('scale-degree:D:1')).toBe(2);
		expect(curriculumTierOf('scale-degree:B♭:3')).toBe(2);
		expect(curriculumTierOf('scale-degree:F♯:5')).toBe(2);
	});

	it('places every tonics 7/2/4/6 at tier 3, including the 9 this task finishes', () => {
		expect(curriculumTierOf('scale-degree:D:7')).toBe(3);
		expect(curriculumTierOf('scale-degree:B♭:2')).toBe(3);
		expect(curriculumTierOf('scale-degree:B:7')).toBe(3);
		expect(curriculumTierOf('scale-degree:F♯:6')).toBe(3);
	});

	it('leaves nothing scale-degree past the ladder anymore', () => {
		for (const fact of allFacts()) {
			if (fact.factKind !== 'scale-degree') continue;
			expect(curriculumTierOf(fact.factId)).toBeLessThanOrEqual(3);
		}
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
		// Before PR #38: the 20th fact was 'chord-formula:Eb', with the first
		// scale-degree fact roughly ten days away. #54 fixed that: as soon as a
		// fresh user's first 14 triads are taught, the very next facts are the
		// scale those triads come from, numbered.
		//
		// This task (finishing the promotion for the other 9 tonics) leaves
		// this exact list UNCHANGED, deliberately: C/G/F stay the first tonics
		// taught (tier 1, untouched - see TRIAD_DEGREE_TIER's docstring), and
		// the 9 newly-finished tonics land at tier 2 and tier 3, both past
		// position 20. Before/after this task are byte-identical here; the
		// visible change is further down the order (tier 2 now carries a
		// 27-fact scale-degree stage that did not exist before, and tier 3's
		// stage grows from 12 facts to 48 - see curriculum.ts's buildCurriculum
		// docstring for the full accounting).
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
	it('gates strictly by tier: each rung adds its own atoms, chords, and scale-degree facts', () => {
		// Tier 1: unchanged by this task (9 = C/G/F x 1/3/5).
		expect(introductionOrder(1)).toHaveLength(3 + 14 + 9);
		// Tier 2: the other 9 tonics x 1/3/5.
		expect(introductionOrder(2)).toHaveLength(3 + 14 + 9 + 1 + 22 + 27);
		// Tier 3: all 12 tonics x 7/2/4/6.
		expect(introductionOrder(3)).toHaveLength(3 + 14 + 9 + 1 + 22 + 27 + 2 + 36 + 48);
		// Tier 4 (n1-tier-unlock: no longer the top of the ladder, so this is
		// STRICTLY LESS than allFacts().length now - the 24 tier-4 chords plus
		// their one new atom (M6), nothing more). This is the exact proof that
		// an unmastered-tier-4 user's introduction order is unaffected by the
		// catalog growing underneath them: every one of these 187 facts is
		// identical, in identical order, to what tiers 1-4 always produced.
		expect(introductionOrder(4)).toHaveLength(3 + 14 + 9 + 1 + 22 + 27 + 2 + 36 + 48 + 1 + 24);
		expect(introductionOrder(4)).toHaveLength(187);
		expect(introductionOrder(4).length).toBeLessThan(allFacts().length);

		// Tier 5 (n1-tier-unlock): its one new atom (P4) plus its 48 chords.
		expect(introductionOrder(5)).toHaveLength(187 + 1 + 48);
		// Tier 6 (n1-tier-unlock, the new top of the ladder): its two new atoms
		// (m2, m6) plus its 24 chords, plus - since tier 6 is now the actual
		// ceiling - the 2 atoms (M2, P8) no tier's chords need at all.
		expect(introductionOrder(6)).toHaveLength(236 + 2 + 24 + 2);
		expect(introductionOrder(6)).toHaveLength(allFacts().length);
	});

	it('a lower tier order is always a prefix of a higher one (no reshuffling on unlock)', () => {
		for (const [lower, higher] of [
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[5, 6]
		] as const) {
			const low = ids(introductionOrder(lower));
			const high = ids(introductionOrder(higher));
			expect(high.slice(0, low.length)).toEqual(low);
		}
	});

	it('withholds the 9 finished tonics 1/3/5 until tier 2, and their 7/2/4/6 until tier 3', () => {
		expect(ids(introductionOrder(1))).not.toContain('scale-degree:D:1');
		expect(ids(introductionOrder(2))).toContain('scale-degree:D:1');

		expect(ids(introductionOrder(1))).not.toContain('scale-degree:D:7');
		expect(ids(introductionOrder(2))).not.toContain('scale-degree:D:7');
		expect(ids(introductionOrder(3))).toContain('scale-degree:D:7');
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

	it('withholds each newly-unlocked atom until the tier that needs it (n1-tier-unlock)', () => {
		expect(ids(introductionOrder(4))).not.toContain('interval-size:P4');
		expect(ids(introductionOrder(5))).toContain('interval-size:P4');

		expect(ids(introductionOrder(5))).not.toContain('interval-size:m2');
		expect(ids(introductionOrder(6))).toContain('interval-size:m2');
	});

	it('withholds M2 and P8 (needed by no tier chord at all) until the whole ladder is mastered', () => {
		expect(ids(introductionOrder(5))).not.toContain('interval-size:M2');
		expect(ids(introductionOrder(6))).toContain('interval-size:M2');
		expect(ids(introductionOrder(5))).not.toContain('interval-size:P8');
		expect(ids(introductionOrder(6))).toContain('interval-size:P8');
	});

	it('defaults to the bottom of the ladder rather than the whole catalog', () => {
		expect(ids(introductionOrder())).toEqual(ids(introductionOrder(1)));
	});

	it('introductionOrder(4) never emits a tier 5/6 quality: unlocked (available) is not the same as reachable (mastery-gated)', () => {
		const tier56 = new Set(TIER_5_6_QUALITY_SUFFIXES);
		for (const fact of introductionOrder(4)) {
			if (fact.factKind !== 'chord-formula') continue;
			const split = splitSymbol(fact.symbol);
			expect(split).not.toBeNull();
			expect(tier56.has(split!.quality)).toBe(false);
		}
	});

	it('introductionOrder(5) emits tier 5 qualities but withholds tier 6 ones until tier 6', () => {
		expect(ids(introductionOrder(5))).toContain(chordFormulaFactId('C6'));
		expect(ids(introductionOrder(5))).not.toContain(chordFormulaFactId('C7b9'));
		expect(ids(introductionOrder(6))).toContain(chordFormulaFactId('C7b9'));
	});
});

describe('introductionOrder: prerequisite catch-up for a returning user', () => {
	// A PRE-EXISTING deck (n1-tier-unlock migration safety): a real returning
	// user's deck can only ever hold cards for facts that existed before this
	// task, i.e. the original 96 chord-formula facts (V1_QUALITY_SUFFIXES x
	// ROOTS). Built from that fixed 96-symbol space, never from the
	// now-larger allFacts()/QUALITY_SUFFIXES, so this fixture keeps
	// representing "the owner's real deck" even as the catalog grows further.
	const v1ChordIds = new Set(
		ROOTS.flatMap((root) => V1_QUALITY_SUFFIXES.map((quality) => chordFormulaFactId(`${root}${quality}`)))
	);

	it('hands a user who already has every ORIGINAL (v1) chord fact the atoms those chords need, whatever tier says', () => {
		// The owner's real deck: all 96 chord spellings introduced before the
		// first interval fact (that IS the defect). A prerequisite of something
		// already taught is overdue, not premature, so the tier gate must not
		// withhold it.
		const order = ids(introductionOrder(1, v1ChordIds));
		for (const atom of ['m3', 'M3', 'A4', 'P5', 'M6', 'm7', 'M7']) {
			expect(order).toContain(intervalSizeFactId(atom));
		}
	});

	it('MIGRATION SAFETY (n1-tier-unlock): a pre-existing 96-chord deck catches up on EXACTLY the same 4 atoms as before this task, never P4/m2/m6', () => {
		// A deck that predates tier 5/6 has zero sus4/7b9/7#5-family cards, so
		// it can never trigger catch-up for the atoms those NEW qualities alone
		// need (P4, m2, m6) - this is the precise "zero behavior change for
		// pre-existing data" proof for the catch-up path.
		const gated = new Set(ids(introductionOrder(1)));
		const extra = ids(introductionOrder(1, v1ChordIds)).filter((factId) => !gated.has(factId));
		expect(extra).toEqual([
			'interval-size:A4',
			'interval-size:m7',
			'interval-size:M7',
			'interval-size:M6'
		]);
	});

	it('a deck that ALSO already has tier 5/6 chords (e.g. after this task ships) catches up on their atoms too (P4, m2, m6)', () => {
		const allChordIds = new Set(
			allFacts()
				.filter((fact) => fact.factKind === 'chord-formula')
				.map((fact) => fact.factId)
		);
		const gated = new Set(ids(introductionOrder(1)));
		const extra = ids(introductionOrder(1, allChordIds)).filter((factId) => !gated.has(factId));
		expect(new Set(extra)).toEqual(
			new Set(
				['A4', 'm7', 'M7', 'M6', 'P4', 'm2', 'm6'].map((atom) => intervalSizeFactId(atom))
			)
		);
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
