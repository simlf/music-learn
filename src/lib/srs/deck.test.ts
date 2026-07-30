// Vitest's configured jsdom test environment (see vite.config.ts) has no
// native IndexedDB. This polyfill must be the very first import in any test
// file that touches deck.ts (before './deck' itself, and before Dexie's own
// module-load-time behavior runs), so Dexie has a working `indexedDB` global
// for the test process only.
import 'fake-indexeddb/auto';

import { describe, it, expect, beforeEach } from 'vitest';
import {
	getAllCards,
	getDueCards,
	introduceNewCards,
	recordGrade,
	deriveCellState,
	getCard,
	NEW_CARDS_PER_SESSION,
	_database
} from './deck';
import { Rating, State } from '$lib/srs/scheduler';
import type { CardRecord } from './deck';
import { allFacts, chordFormulaFactId, intervalSizeFactId } from '$lib/srs/facts';
import { introductionOrder } from '$lib/srs/curriculum';
import { LEVEL_KEY } from '$lib/practice/levelState';
import { ROOTS, V1_QUALITY_SUFFIXES } from '$lib/theory/randomChord';

/**
 * Fixed instant so due-date comparisons below are exact and reproducible
 * (mirrors scheduler.test.ts's now0 convention).
 */
const now0 = new Date('2026-07-15T00:00:00.000Z');

/**
 * Test-only escape hatch: deck.ts exports its lazily-created Dexie database
 * accessor as `_database` (underscore-prefixed, not part of the plan's public
 * artifact surface) purely so this suite can perform a raw, bypassing-the-
 * normal-write-path corruption for the Date-rehydration regression below.
 * No other module in the app may import this; every real consumer goes
 * through deck.ts's typed exports (getAllCards/getDueCards/etc.).
 */
async function clearDeck() {
	await _database().cards.clear();
	// introduceNewCards now resolves its tier through
	// levelState.advanceTierOnMastery, which persists an earned tier to
	// localStorage. Clearing it keeps each case starting from a genuinely
	// fresh tier 1 rather than inheriting the previous case's evidence.
	localStorage.removeItem(LEVEL_KEY);
}

/**
 * The three interval atoms tier 1 teaches before its first chord (m3, M3,
 * P5), pre-seeded as already-known so a case can assert chord teach-cluster
 * arithmetic without the interval atoms sitting in front of it. Written at
 * State.Review with a single 'formula' card, which is a complete
 * interval-size fact (its teach cluster is ['formula'] only), so these are
 * neither new-fact nor retrofit candidates.
 */
async function seedTier1IntervalAtoms(): Promise<void> {
	await _database().cards.bulkPut(
		['m3', 'M3', 'P5'].map((short) =>
			makeCardRecord({
				factId: intervalSizeFactId(short),
				factKind: 'interval-size',
				mode: 'formula',
				state: State.Review
			})
		)
	);
}

describe('deck', () => {
	beforeEach(async () => {
		await clearDeck();
	});

	it('getAllCards() on a fresh (never-written) database returns []', async () => {
		expect(await getAllCards()).toEqual([]);
	});

	it("introduceNewCards defaults its limit to NEW_CARDS_PER_SESSION facts: a fresh user's day one is 3 interval atoms then the 7 white-key major triads", async () => {
		const count = await introduceNewCards(undefined, now0);
		expect(count).toBe(NEW_CARDS_PER_SESSION);

		const cards = await getAllCards();
		// 3 interval-size facts x 1 card + 7 chord-formula facts x 3 cluster
		// cards. The old catalog order made this 10 chord clusters (30 cards)
		// covering every quality of C plus D-flat on day one.
		expect(cards).toHaveLength(3 * 1 + 7 * 3);
		expect(new Set(cards.map((c) => c.factId)).size).toBe(NEW_CARDS_PER_SESSION);
		expect(
			[...new Set(cards.map((c) => c.factId))].sort((a, b) => a.localeCompare(b))
		).toEqual(
			[
				...['m3', 'M3', 'P5'].map(intervalSizeFactId),
				...['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(chordFormulaFactId)
			].sort((a, b) => a.localeCompare(b))
		);
	});

	it('introduceNewCards follows the curriculum order across repeated calls, growing the deck incrementally', async () => {
		const expectedOrder = introductionOrder(1).map((fact) => fact.factId);

		const firstCount = await introduceNewCards(5, now0);
		expect(firstCount).toBe(5);

		const afterFirst = await getAllCards();
		// 3 interval atoms (1 card each) + 2 chord clusters (3 cards each).
		expect(afterFirst).toHaveLength(3 + 6);
		// getAllCards reads back in Dexie's compound-key order, not insertion
		// order, so the assertion is on the SET of facts the curriculum's first
		// 5 positions name (curriculum.test.ts pins the order itself).
		expect(new Set(afterFirst.map((c) => c.factId))).toEqual(new Set(expectedOrder.slice(0, 5)));

		const secondCount = await introduceNewCards(5, now0);
		expect(secondCount).toBe(5);

		const afterSecond = await getAllCards();
		expect(afterSecond).toHaveLength(3 + 7 * 3);
		expect(new Set(afterSecond.map((c) => c.factId)).size).toBe(10);
		// The second call picks up exactly where the first stopped: no
		// reshuffling, no repeats.
		expect(
			expectedOrder.slice(0, 10).every((factId) => afterSecond.some((c) => c.factId === factId))
		).toBe(true);
	});

	it('every introduced card is state New, due <= now, lastRating null: chord facts get the 3-mode teach cluster, interval facts exactly one formula card', async () => {
		await introduceNewCards(5, now0);
		const cards = await getAllCards();

		for (const card of cards) {
			expect(card.state).toBe(State.New);
			expect(card.due.getTime()).toBeLessThanOrEqual(now0.getTime());
			expect(card.lastRating).toBeNull();
		}

		const modesByFact = new Map<string, Set<string>>();
		const kindByFact = new Map<string, string>();
		for (const card of cards) {
			if (!modesByFact.has(card.factId)) modesByFact.set(card.factId, new Set());
			modesByFact.get(card.factId)!.add(card.mode);
			kindByFact.set(card.factId, card.factKind);
		}
		expect(modesByFact.size).toBe(5);
		for (const [factId, modes] of modesByFact) {
			if (kindByFact.get(factId) === 'chord-formula') {
				expect(modes).toEqual(new Set(['formula', 'see-play', 'formula-build']));
			} else {
				expect(modes).toEqual(new Set(['formula']));
			}
		}
	});

	it('getDueCards(now) after introduceNewCards(5, now) returns exactly the 9 cards those 5 facts seeded', async () => {
		await introduceNewCards(5, now0);
		const introduced = await getAllCards();
		const due = await getDueCards(now0);
		expect(due).toHaveLength(3 + 6);
		expect(new Set(due.map((c) => `${c.factId}|${c.mode}`))).toEqual(
			new Set(introduced.map((c) => `${c.factId}|${c.mode}`))
		);
	});

	it('interval atoms come FIRST, not last: the very first fact a fresh deck introduces is an interval-size fact', async () => {
		// The defect this pins: with the old catalog walk, all 96 chord
		// spellings were introduced before the first interval fact (around day
		// 11 at 10 facts/day), so the prerequisites arrived after the material
		// that needs them.
		const count = await introduceNewCards(1, now0);
		expect(count).toBe(1);
		const cards = await getAllCards();
		expect(cards).toHaveLength(1);
		expect(cards[0].factKind).toBe('interval-size');
		expect(cards[0].factId).toBe(intervalSizeFactId('m3'));
		expect(cards[0].mode).toBe('formula');
	});

	it('the tier gate bounds introduction: a fresh tier 1 deck stops at 26 facts (3 atoms + 14 triads + 9 promoted C/G/F degree facts), and a further call introduces 0', async () => {
		// Running out of new material at a tier is the gate working: nothing new
		// arrives while the user still has a tier to master.
		// levelState.advanceTierOnMastery opens the next rung on evidence.
		const firstCount = await introduceNewCards(1000, now0);
		expect(firstCount).toBe(3 + 14 + 9);

		const allCards = await getAllCards();
		// Interval/scale-degree facts seed a single 'formula' card each; chord
		// facts seed a 3-card teach cluster.
		expect(allCards).toHaveLength(3 * 1 + 14 * 3 + 9 * 1);
		expect(new Set(allCards.map((c) => c.factId)).size).toBe(26);
		const scaleDegreeCards = allCards.filter((c) => c.factKind === 'scale-degree');
		expect(scaleDegreeCards).toHaveLength(9);
		expect(scaleDegreeCards.every((c) => c.mode === 'formula')).toBe(true);

		expect(await introduceNewCards(1000, now0)).toBe(0);
	});

	it("maxTier 4 is no longer the top of the ladder (n1-tier-unlock): it seeds exactly the original 187 tier-1..4 facts, not the whole (now larger) catalog", async () => {
		// MIGRATION SAFETY: 187 and 379 are the exact facts/records tier 1-4
		// always produced (7 interval atoms x1 card + 96 chord facts x3-card
		// teach cluster + 84 scale-degree facts x1 card = 7+288+84 = 379). Tiers
		// 5/6 existing now changes NOTHING about this: they simply are not part
		// of what maxTier=4 reaches.
		const firstCount = await introduceNewCards(1000, now0, 4);
		expect(firstCount).toBe(187);

		const allCards = await getAllCards();
		expect(allCards).toHaveLength(379);
		expect(new Set(allCards.map((c) => c.factId)).size).toBe(187);

		const secondCount = await introduceNewCards(1000, now0, 4);
		expect(secondCount).toBe(0);

		const stillAllCards = await getAllCards();
		expect(stillAllCards).toHaveLength(379);
	});

	it('exhaustion at the NEW top of the ladder: introduceNewCards(1000, now, 6) seeds all 264 facts and a further call introduces 0', async () => {
		const firstCount = await introduceNewCards(1000, now0, 6);
		expect(firstCount).toBe(264);

		const allCards = await getAllCards();
		// 12 interval atoms x1 + 168 chord facts x3-card cluster + 84 scale-degree x1.
		expect(allCards).toHaveLength(12 + 168 * 3 + 84);
		expect(new Set(allCards.map((c) => c.factId)).size).toBe(264);

		const secondCount = await introduceNewCards(1000, now0, 6);
		expect(secondCount).toBe(0);

		const stillAllCards = await getAllCards();
		expect(stillAllCards).toHaveLength(12 + 168 * 3 + 84);
	});

	it('an explicit maxTier never writes the stored level: the tier read/write is skipped entirely', async () => {
		await introduceNewCards(1000, now0, 4);
		expect(localStorage.getItem(LEVEL_KEY)).toBeNull();
	});

	it('WR-02: pre-existing legacy formula-only chord facts (pre-13-01 seeding) are retrofitted via a separately-budgeted pass and never starve genuinely new fact introduction', async () => {
		// The three tier-1 interval atoms are pre-seeded as already-known so
		// this case's assertions are about CHORD teach clusters rather than the
		// atoms that now precede them in the curriculum order.
		await seedTier1IntervalAtoms();

		// Mirror a returning Phase-11 user's deck: the first 5 chord-formula
		// facts (catalog order) already have exactly one card each -
		// 'formula' only, no 'see-play'/'formula-build' - the pre-13-01 shape.
		const legacyFacts = allFacts()
			.filter((fact) => fact.factKind === 'chord-formula')
			.slice(0, 5);
		const legacyCards = legacyFacts.map((fact) =>
			makeCardRecord({
				factId: fact.factId,
				factKind: 'chord-formula',
				mode: 'formula',
				state: State.Review
			})
		);
		await _database().cards.bulkPut(legacyCards);

		const count = await introduceNewCards(3, now0);
		const allCards = await getAllCards();

		const legacyFactIds = new Set(legacyFacts.map((fact) => fact.factId));
		const cardsByFact = new Map<string, CardRecord[]>();
		for (const card of allCards) {
			const forFact = cardsByFact.get(card.factId) ?? [];
			forFact.push(card);
			cardsByFact.set(card.factId, forFact);
		}

		// Genuinely new facts: exactly `limit` (3) brand-new chord-formula
		// facts got their full 3-card teach cluster, none of them among the
		// 5 legacy facts - the retrofit-eligible legacy facts never counted
		// against this budget, so new-fact introduction was NOT starved.
		const preSeededIds = new Set(['m3', 'M3', 'P5'].map(intervalSizeFactId));
		const newFactIds = [...cardsByFact.keys()].filter(
			(id) => !legacyFactIds.has(id) && !preSeededIds.has(id)
		);
		expect(newFactIds).toHaveLength(3);
		for (const id of newFactIds) {
			expect(new Set(cardsByFact.get(id)!.map((c) => c.mode))).toEqual(
				new Set(['formula', 'see-play', 'formula-build'])
			);
		}

		// Retrofit pass: bounded by the SAME `limit` (3), independently of the
		// new-fact budget above - only 3 of the 5 legacy facts get backfilled
		// with 'see-play'/'formula-build' in this call, the other 2 are left
		// untouched (still formula-only) for a later call to pick up.
		const retrofittedLegacyIds = [...legacyFactIds].filter(
			(id) => cardsByFact.get(id)!.length === 3
		);
		const untouchedLegacyIds = [...legacyFactIds].filter(
			(id) => cardsByFact.get(id)!.length === 1
		);
		expect(retrofittedLegacyIds).toHaveLength(3);
		expect(untouchedLegacyIds).toHaveLength(2);
		for (const id of retrofittedLegacyIds) {
			expect(new Set(cardsByFact.get(id)!.map((c) => c.mode))).toEqual(
				new Set(['formula', 'see-play', 'formula-build'])
			);
		}

		// 3 genuinely new facts + 3 retrofitted legacy facts = 6 facts touched
		// (the fact count, not the raw record count of 3*3 + 3*2 = 15).
		expect(count).toBe(3 + 3);
	});

	it('MIGRATION: reordering introduction never touches an existing card\'s scheduling fields, and new material still arrives in the new order', async () => {
		// The owner has real FSRS review state on two devices. Reordering
		// INTRODUCTION can only ever affect facts that have no card yet, but
		// that has to be proven rather than asserted: this case seeds a deck
		// shaped like a real returning user (some facts deep in State.Review
		// with genuine stability/difficulty/reps/lapses, some untouched),
		// snapshots every scheduling field, runs a full introduction pass, and
		// checks the snapshot survived byte for byte.
		const reviewed: CardRecord[] = [
			makeCardRecord({
				factId: chordFormulaFactId('C'),
				mode: 'formula',
				state: State.Review,
				stability: 37.418,
				difficulty: 6.2231,
				elapsed_days: 31,
				scheduled_days: 42,
				reps: 14,
				lapses: 2,
				due: new Date('2026-08-26T09:15:00.000Z'),
				last_review: new Date('2026-07-15T09:15:00.000Z'),
				lastRating: Rating.Good,
				masteryDayCount: 5
			}),
			makeCardRecord({
				factId: chordFormulaFactId('C'),
				mode: 'see-play',
				state: State.Review,
				stability: 4.0091,
				difficulty: 8.9902,
				elapsed_days: 3,
				scheduled_days: 4,
				reps: 9,
				lapses: 4,
				due: new Date('2026-07-19T20:00:00.000Z'),
				last_review: new Date('2026-07-15T20:00:00.000Z'),
				lastRating: Rating.Again,
				masteryDayCount: 1
			}),
			makeCardRecord({
				factId: chordFormulaFactId('Cm7b5'),
				mode: 'formula',
				state: State.Review,
				stability: 12.5,
				difficulty: 7.75,
				elapsed_days: 10,
				scheduled_days: 13,
				reps: 6,
				lapses: 1,
				due: new Date('2026-07-28T07:30:00.000Z'),
				last_review: new Date('2026-07-15T07:30:00.000Z'),
				lastRating: Rating.Hard,
				masteryDayCount: 2
			}),
			makeCardRecord({
				factId: 'scale-formula:C',
				factKind: 'scale-formula',
				mode: 'formula-build',
				state: State.Review,
				stability: 2.25,
				difficulty: 5.5,
				reps: 3,
				lapses: 0,
				due: new Date('2026-07-17T12:00:00.000Z'),
				last_review: new Date('2026-07-15T12:00:00.000Z'),
				lastRating: Rating.Good,
				masteryDayCount: 2
			})
		];
		await _database().cards.bulkPut(reviewed);

		const key = (card: CardRecord) => `${card.factId}|${card.mode}`;
		const before = new Map((await getAllCards()).map((card) => [key(card), { ...card }]));
		expect(before.size).toBe(4);

		const introduced = await introduceNewCards(1000, now0);
		expect(introduced).toBeGreaterThan(0);

		const after = new Map((await getAllCards()).map((card) => [key(card), card]));

		// Nothing pre-existing was dropped, and every scheduling field on it is
		// bit-identical: no re-scheduling, no reset, no lost history.
		for (const [id, original] of before) {
			const current = after.get(id);
			expect(current).toBeDefined();
			expect(current!.state).toBe(original.state);
			expect(current!.stability).toBe(original.stability);
			expect(current!.difficulty).toBe(original.difficulty);
			expect(current!.elapsed_days).toBe(original.elapsed_days);
			expect(current!.scheduled_days).toBe(original.scheduled_days);
			expect(current!.learning_steps).toBe(original.learning_steps);
			expect(current!.reps).toBe(original.reps);
			expect(current!.lapses).toBe(original.lapses);
			expect(current!.due.getTime()).toBe(original.due.getTime());
			expect(current!.last_review?.getTime()).toBe(original.last_review?.getTime());
			expect(current!.lastRating).toBe(original.lastRating);
			expect(current!.masteryDayCount).toBe(original.masteryDayCount);
			expect(current!.factKind).toBe(original.factKind);
		}

		// New material arrived in the NEW order: the three tier-1 interval
		// atoms, which the old catalog walk would not have reached for another
		// ten days.
		for (const short of ['m3', 'M3', 'P5']) {
			expect(after.has(`${intervalSizeFactId(short)}|formula`)).toBe(true);
		}

		// The Cm7b5 card the user already has stays exactly as it is: the tier
		// gate withholds unintroduced tier-4 chords, it never removes or
		// re-teaches one already in the deck.
		expect(after.has(`${chordFormulaFactId('Cm7b5')}|formula`)).toBe(true);
		expect(after.has(`${chordFormulaFactId('Cdim7')}|formula`)).toBe(false);
	});

	it("MIGRATION (n1-tier-unlock: extended to a deck that PREDATES the new qualities): a returning user's already-taught chords pull their interval prerequisites forward, whatever the stored tier says", async () => {
		// The owner's real deck: all 96 ORIGINAL chord spellings introduced
		// (that IS the defect) and not one interval fact. A deck that predates
		// this task can only ever hold the original 96 (V1_QUALITY_SUFFIXES x
		// ROOTS) chord facts, never a tier 5/6 one, so this fixture is built
		// from that fixed set rather than the now-larger allFacts() - the
		// precise "zero behavior change for pre-existing data" scenario. A
		// prerequisite of something already taught is overdue, not premature,
		// so the tier gate must not withhold it. Without this, a stored tier of
		// 1 would hand them only m3/M3/P5 and withhold A4/m7/M7/M6 forever.
		const chordSymbols = ROOTS.flatMap((root) =>
			V1_QUALITY_SUFFIXES.map((quality) => chordFormulaFactId(`${root}${quality}`))
		);
		await _database().cards.bulkPut(
			chordSymbols.map((factId) =>
				makeCardRecord({ factId, factKind: 'chord-formula', mode: 'formula', state: State.Review })
			)
		);

		await introduceNewCards(1000, now0);
		const cards = await getAllCards();
		const intervalFactIds = new Set(
			cards.filter((c) => c.factKind === 'interval-size').map((c) => c.factId)
		);
		expect(intervalFactIds).toEqual(
			new Set(['m3', 'M3', 'A4', 'P5', 'M6', 'm7', 'M7'].map(intervalSizeFactId))
		);
		// The 9 promoted C/G/F degree-1/3/5 facts ARE tier-1 material in their
		// own right (this task), so they arrive same as any other tier-1 fact -
		// no chord-formula catch-up needed for them. The 12 tier-3 promoted
		// facts (degree 7, 2, 4, 6) and the remaining 63-fact tail still stay
		// behind tiers this returning user's masteryDayCount (0, in this
		// fixture) has not actually cleared.
		const scaleDegreeFactIds = new Set(
			cards.filter((c) => c.factKind === 'scale-degree').map((c) => c.factId)
		);
		expect(scaleDegreeFactIds).toEqual(
			new Set([
				'scale-degree:C:1',
				'scale-degree:G:1',
				'scale-degree:F:1',
				'scale-degree:C:3',
				'scale-degree:G:3',
				'scale-degree:F:3',
				'scale-degree:C:5',
				'scale-degree:G:5',
				'scale-degree:F:5'
			])
		);
	});

	it('MIGRATION generalization: a deck that ALSO already has tier 5/6 chords pulls their prerequisites (P4, m2, m6) forward too', async () => {
		// Not a real scenario for today's owner (whose deck predates tier 5/6),
		// but proves catchUpAtoms generalizes to the new qualities via the same
		// unmodified mechanism, rather than needing new special-casing.
		const chordSymbols = allFacts()
			.filter((fact) => fact.factKind === 'chord-formula')
			.map((fact) => fact.factId);
		await _database().cards.bulkPut(
			chordSymbols.map((factId) =>
				makeCardRecord({ factId, factKind: 'chord-formula', mode: 'formula', state: State.Review })
			)
		);

		await introduceNewCards(1000, now0);
		const cards = await getAllCards();
		const intervalFactIds = new Set(
			cards.filter((c) => c.factKind === 'interval-size').map((c) => c.factId)
		);
		expect(intervalFactIds).toEqual(
			new Set(
				['m3', 'M3', 'A4', 'P5', 'M6', 'm7', 'M7', 'P4', 'm2', 'm6'].map(intervalSizeFactId)
			)
		);
	});

	it("CardRecordSchema's widened mode enum accepts 'see-play' and 'hear-name' records without dropping them via safeParse", async () => {
		const seePlayCard = makeCardRecord({
			factId: 'chord-formula:Cm7',
			factKind: 'chord-formula',
			mode: 'see-play'
		});
		const hearNameCard = makeCardRecord({
			factId: 'chord-formula:Cm7',
			factKind: 'chord-formula',
			mode: 'hear-name'
		});
		await recordGrade(seePlayCard, Rating.Good, now0);
		await recordGrade(hearNameCard, Rating.Good, now0);

		const cards = await getAllCards();
		expect(cards.find((c) => c.mode === 'see-play')).toBeDefined();
		expect(cards.find((c) => c.mode === 'hear-name')).toBeDefined();
	});

	it('hear-name stagger gate: hear-name is only introduced once ALL of a chord-formula fact\'s teach-cluster cards reach State.Review', async () => {
		// Pre-seed the three tier-1 interval atoms so the next genuinely-new
		// fact is a chord (interval facts have no hear-name mode at all).
		await seedTier1IntervalAtoms();

		const firstIntroduced = await introduceNewCards(1, now0);
		expect(firstIntroduced).toBe(1);

		const clusterCards = (await getAllCards()).filter((c) => c.factKind === 'chord-formula');
		expect(clusterCards).toHaveLength(3);
		const targetFactId = clusterCards[0].factId;
		expect(targetFactId).toBe(chordFormulaFactId('C'));
		expect(clusterCards.every((c) => c.factId === targetFactId)).toBe(true);

		const formulaCard = clusterCards.find((c) => c.mode === 'formula')!;
		const seePlayCard = clusterCards.find((c) => c.mode === 'see-play')!;
		const buildCard = clusterCards.find((c) => c.mode === 'formula-build')!;

		// Grade only 2 of the 3 cluster cards to Review.
		await recordGrade(formulaCard, Rating.Good, now0);
		await recordGrade(seePlayCard, Rating.Good, now0);

		await introduceNewCards(1000, now0);
		const afterTwoGraded = await getAllCards();
		const hearNameAfterTwo = afterTwoGraded.filter(
			(c) => c.factId === targetFactId && c.mode === 'hear-name'
		);
		expect(hearNameAfterTwo).toHaveLength(0);

		// Grade the third cluster card too: all 3 now State.Review.
		await recordGrade(buildCard, Rating.Good, now0);

		await introduceNewCards(1000, now0);
		const afterThreeGraded = await getAllCards();
		const hearNameAfterThree = afterThreeGraded.filter(
			(c) => c.factId === targetFactId && c.mode === 'hear-name'
		);
		expect(hearNameAfterThree).toHaveLength(1);
		expect(hearNameAfterThree[0].state).toBe(State.New);
		expect(hearNameAfterThree[0].due.getTime()).toBeLessThanOrEqual(now0.getTime());
	});

	it('recordGrade: a first correct grade (Good) on a never-mastery-counted card sets masteryDayCount to 1', async () => {
		const card = makeCardRecord({ masteryDayCount: 0, last_review: undefined });
		const graded = await recordGrade(card, Rating.Good, now0);
		expect(graded.masteryDayCount).toBe(1);
	});

	it('recordGrade: a second correct grade on the SAME local calendar day leaves masteryDayCount unchanged', async () => {
		const card = makeCardRecord({ masteryDayCount: 0, last_review: undefined });
		const first = await recordGrade(card, Rating.Good, now0);
		expect(first.masteryDayCount).toBe(1);

		const laterSameDay = new Date(now0.getTime() + 60 * 60 * 1000); // +1h, same local day
		const second = await recordGrade(first, Rating.Easy, laterSameDay);
		expect(second.masteryDayCount).toBe(1);
	});

	it('recordGrade: a correct grade on a LATER distinct local calendar day raises masteryDayCount to 2', async () => {
		const card = makeCardRecord({ masteryDayCount: 0, last_review: undefined });
		const first = await recordGrade(card, Rating.Good, now0);
		expect(first.masteryDayCount).toBe(1);

		const nextDay = new Date(now0.getTime() + 24 * 60 * 60 * 1000);
		const second = await recordGrade(first, Rating.Good, nextDay);
		expect(second.masteryDayCount).toBe(2);
	});

	it('recordGrade: a Rating.Again grade never increments masteryDayCount, even on a distinct day', async () => {
		const card = makeCardRecord({ masteryDayCount: 0, last_review: undefined });
		const nextDay = new Date(now0.getTime() + 24 * 60 * 60 * 1000);
		const graded = await recordGrade(card, Rating.Again, nextDay);
		expect(graded.masteryDayCount).toBe(0);
	});

	it('recordGrade: a Rating.Hard grade never increments masteryDayCount', async () => {
		const card = makeCardRecord({ masteryDayCount: 1, last_review: now0 });
		const nextDay = new Date(now0.getTime() + 24 * 60 * 60 * 1000);
		const graded = await recordGrade(card, Rating.Hard, nextDay);
		expect(graded.masteryDayCount).toBe(1);
	});

	it('CardRecordSchema: a legacy persisted record with no masteryDayCount field loads via getAllCards and defaults to 0', async () => {
		const legacyRecord = makeCardRecord({
			factId: 'chord-formula:Dm7',
			mode: 'formula'
		}) as unknown as Record<string, unknown>;
		delete legacyRecord.masteryDayCount;
		await _database().cards.put(legacyRecord as unknown as CardRecord);

		const cards = await getAllCards();
		const found = cards.find((c) => c.factId === 'chord-formula:Dm7' && c.mode === 'formula');
		expect(found).toBeDefined();
		expect(found?.masteryDayCount).toBe(0);
	});

	it('recordGrade persists an updated CardRecord matching the graded result', async () => {
		await introduceNewCards(1, now0);
		const [card] = await getAllCards();

		const updated = await recordGrade(card, Rating.Good, now0);
		expect(updated.scheduled_days).toBe(3);
		expect(updated.lastRating).toBe(Rating.Good);

		const persisted = await getAllCards();
		const persistedCard = persisted.find(
			(c) => c.factId === card.factId && c.mode === card.mode
		);
		expect(persistedCard).toBeDefined();
		expect(persistedCard?.scheduled_days).toBe(updated.scheduled_days);
		expect(persistedCard?.stability).toBe(updated.stability);
		expect(persistedCard?.due).toBeInstanceOf(Date);
		expect(persistedCard?.due.getTime()).toBe(updated.due.getTime());
	});

	it('Date-rehydration regression: string-corrupted due/last_review fields still read back as real Date instances (D-09)', async () => {
		await introduceNewCards(1, now0);
		const [card] = await getAllCards();
		const graded = await recordGrade(card, Rating.Good, now0);

		// Bypass the normal typed write path entirely: reach into the raw
		// Dexie table and overwrite the stored record's due/last_review
		// fields with their own ISO string forms, simulating a record whose
		// date fields arrived as strings (whatever the future storage-shape
		// drift cause might be).
		const rawKey: [string, typeof graded.mode] = [graded.factId, graded.mode];
		await _database().cards.update(rawKey, {
			due: graded.due.toISOString() as unknown as Date,
			last_review: graded.last_review
				? (graded.last_review.toISOString() as unknown as Date)
				: undefined
		});

		const oneDayLater = new Date(graded.due.getTime() + 24 * 60 * 60 * 1000);

		const allCards = await getAllCards();
		const rehydrated = allCards.find((c) => c.factId === graded.factId && c.mode === graded.mode);
		expect(rehydrated).toBeDefined();
		expect(rehydrated?.due).toBeInstanceOf(Date);
		expect(rehydrated!.due.getTime()).toBe(graded.due.getTime());
		expect(rehydrated!.due.getTime()).toBeLessThanOrEqual(oneDayLater.getTime());

		const dueCards = await getDueCards(oneDayLater);
		const stillDue = dueCards.find((c) => c.factId === graded.factId && c.mode === graded.mode);
		expect(stillDue).toBeDefined();
		expect(stillDue?.due).toBeInstanceOf(Date);
	});

	it('a record with a genuinely malformed due field is skipped, not thrown, while other valid records still read', async () => {
		// Built directly via makeCardRecord/recordGrade (not introduceNewCards)
		// so this case stays decoupled from the teach-cluster record-count
		// arithmetic asserted elsewhere: it only needs exactly 2 distinct
		// records, one of which gets corrupted.
		const validCard = makeCardRecord({ factId: 'chord-formula:Cm7', mode: 'formula' });
		const malformedCard = makeCardRecord({ factId: 'chord-formula:Dm7', mode: 'formula' });
		await recordGrade(validCard, Rating.Good, now0);
		await recordGrade(malformedCard, Rating.Good, now0);

		await _database().cards.update([malformedCard.factId, malformedCard.mode], {
			due: 'not-a-date' as unknown as Date
		});

		const cards = await getAllCards();
		expect(cards).toHaveLength(1);
		expect(cards[0].factId).toBe(validCard.factId);
	});

	it('deriveCellState(undefined, now) === not-yet-seen', () => {
		expect(deriveCellState(undefined, now0)).toBe('not-yet-seen');
	});

	it("deriveCellState === 'due' when card.due <= now, regardless of lastRating or state", () => {
		const dueCard: CardRecord = makeCardRecord({
			due: now0,
			state: State.Review,
			lastRating: Rating.Again
		});
		expect(deriveCellState(dueCard, now0)).toBe('due');

		const dueCard2: CardRecord = makeCardRecord({
			due: new Date(now0.getTime() - 1000),
			state: State.New,
			lastRating: null
		});
		expect(deriveCellState(dueCard2, now0)).toBe('due');
	});

	it("deriveCellState === 'weak' when card.due > now and lastRating === Again", () => {
		const weakCard: CardRecord = makeCardRecord({
			due: new Date(now0.getTime() + 24 * 60 * 60 * 1000),
			state: State.Review,
			lastRating: Rating.Again
		});
		expect(deriveCellState(weakCard, now0)).toBe('weak');
	});

	it("deriveCellState === 'mastered' when card.due > now, state === Review, lastRating !== Again, AND masteryDayCount >= 2 (successive-relearning gate)", () => {
		const masteredCard: CardRecord = makeCardRecord({
			due: new Date(now0.getTime() + 24 * 60 * 60 * 1000),
			state: State.Review,
			lastRating: Rating.Good,
			masteryDayCount: 2
		});
		expect(deriveCellState(masteredCard, now0)).toBe('mastered');
	});

	it("deriveCellState === 'weak', NOT 'mastered', when card.due > now, state === Review, lastRating !== Again, but masteryDayCount < 2 (a single successful grade is not yet durable mastery)", () => {
		const singleGradeCard: CardRecord = makeCardRecord({
			due: new Date(now0.getTime() + 24 * 60 * 60 * 1000),
			state: State.Review,
			lastRating: Rating.Good,
			masteryDayCount: 1
		});
		expect(deriveCellState(singleGradeCard, now0)).toBe('weak');

		const neverCountedCard: CardRecord = makeCardRecord({
			due: new Date(now0.getTime() + 24 * 60 * 60 * 1000),
			state: State.Review,
			lastRating: Rating.Good,
			masteryDayCount: 0
		});
		expect(deriveCellState(neverCountedCard, now0)).toBe('weak');
	});
});

describe('formula-build mode seam (Phase 12 D-09)', () => {
	beforeEach(async () => {
		await clearDeck();
	});

	it('a CardRecord with mode formula-build and factKind scale-formula round-trips through recordGrade -> getAllCards without being dropped by CardRecordSchema', async () => {
		const card = makeCardRecord({
			factId: 'scale-formula:C',
			factKind: 'scale-formula',
			mode: 'formula-build'
		});
		await recordGrade(card, Rating.Good, now0);

		const cards = await getAllCards();
		const persisted = cards.find((c) => c.factId === 'scale-formula:C' && c.mode === 'formula-build');
		expect(persisted).toBeDefined();
		expect(persisted?.factKind).toBe('scale-formula');
		expect(persisted?.mode).toBe('formula-build');
	});

	it('getCard(factId, mode) returns undefined when no record has been persisted for that pair', async () => {
		expect(await getCard('chord-formula:Cm7', 'formula-build')).toBeUndefined();
	});

	it('getCard(factId, mode) returns the exact persisted record after recordGrade wrote it, mode-scoped', async () => {
		const buildCard = makeCardRecord({
			factId: 'chord-formula:Cm7',
			factKind: 'chord-formula',
			mode: 'formula-build'
		});
		const graded = await recordGrade(buildCard, Rating.Good, now0);

		const found = await getCard('chord-formula:Cm7', 'formula-build');
		expect(found).toBeDefined();
		expect(found?.factId).toBe(graded.factId);
		expect(found?.mode).toBe('formula-build');
		expect(found?.scheduled_days).toBe(graded.scheduled_days);

		// A different mode of the same factId must NOT satisfy getCard.
		const miss = await getCard('chord-formula:Cm7', 'formula');
		expect(miss).toBeUndefined();
	});

	it('regression pin (updated for 13-01 teach-cluster, and for n1-tier-unlock: maxTier 4 is no longer the whole catalog): introduceNewCards(1000, now, 4) produces formula-build ONLY for chord-formula facts, never for interval-size/scale-degree facts', async () => {
		await introduceNewCards(1000, now0, 4);
		const cards = await getAllCards();
		expect(cards.length).toBe(379);

		const nonChordCards = cards.filter((c) => c.factKind !== 'chord-formula');
		expect(nonChordCards.every((c) => c.mode === 'formula')).toBe(true);

		const chordCards = cards.filter((c) => c.factKind === 'chord-formula');
		expect(chordCards.every((c) => ['formula', 'see-play', 'formula-build'].includes(c.mode))).toBe(
			true
		);
		expect(chordCards.filter((c) => c.mode === 'formula-build')).toHaveLength(96);
	});
});

/** Minimal CardRecord builder for deriveCellState's pure-function tests (no Dexie round-trip needed). */
function makeCardRecord(overrides: Partial<CardRecord>): CardRecord {
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
