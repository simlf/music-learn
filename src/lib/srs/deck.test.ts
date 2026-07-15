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
import { allFacts } from '$lib/srs/facts';

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
}

describe('deck', () => {
	beforeEach(async () => {
		await clearDeck();
	});

	it('getAllCards() on a fresh (never-written) database returns []', async () => {
		expect(await getAllCards()).toEqual([]);
	});

	it('introduceNewCards defaults its limit to NEW_CARDS_PER_SESSION facts, each seeding a chord-formula teach cluster (3 cards/fact)', async () => {
		const count = await introduceNewCards(undefined, now0);
		expect(count).toBe(NEW_CARDS_PER_SESSION * 3);
		const cards = await getAllCards();
		expect(cards).toHaveLength(NEW_CARDS_PER_SESSION * 3);
		expect(new Set(cards.map((c) => c.factId)).size).toBe(NEW_CARDS_PER_SESSION);
	});

	it('introduceNewCards seeds distinct factIds across repeated calls, growing the deck incrementally (teach-cluster arithmetic)', async () => {
		const firstCount = await introduceNewCards(5, now0);
		expect(firstCount).toBe(5 * 3);

		const afterFirst = await getAllCards();
		expect(afterFirst).toHaveLength(15);
		const firstFactIds = new Set(afterFirst.map((c) => c.factId));
		expect(firstFactIds.size).toBe(5);

		const secondCount = await introduceNewCards(5, now0);
		expect(secondCount).toBe(5 * 3);

		const afterSecond = await getAllCards();
		expect(afterSecond).toHaveLength(30);
		const allFactIds = new Set(afterSecond.map((c) => c.factId));
		expect(allFactIds.size).toBe(10);
	});

	it("every card introduced via introduceNewCards(5) belongs to a chord-formula fact's teach cluster (formula/see-play/formula-build), state New, due <= now, lastRating null", async () => {
		await introduceNewCards(5, now0);
		const cards = await getAllCards();
		expect(new Set(cards.map((c) => c.mode))).toEqual(new Set(['formula', 'see-play', 'formula-build']));
		for (const card of cards) {
			expect(card.factKind).toBe('chord-formula');
			expect(card.state).toBe(State.New);
			expect(card.due.getTime()).toBeLessThanOrEqual(now0.getTime());
			expect(card.lastRating).toBeNull();
		}

		const modesByFact = new Map<string, Set<string>>();
		for (const card of cards) {
			if (!modesByFact.has(card.factId)) modesByFact.set(card.factId, new Set());
			modesByFact.get(card.factId)!.add(card.mode);
		}
		expect(modesByFact.size).toBe(5);
		for (const modes of modesByFact.values()) {
			expect(modes).toEqual(new Set(['formula', 'see-play', 'formula-build']));
		}
	});

	it('getDueCards(now) after introduceNewCards(5, now) returns exactly those 15 cluster cards', async () => {
		await introduceNewCards(5, now0);
		const introduced = await getAllCards();
		const due = await getDueCards(now0);
		expect(due).toHaveLength(15);
		expect(new Set(due.map((c) => `${c.factId}|${c.mode}`))).toEqual(
			new Set(introduced.map((c) => `${c.factId}|${c.mode}`))
		);
	});

	it('non-chord facts unchanged: introduceNewCards(97, now) from empty seeds 96 chord-formula clusters plus exactly ONE single-card interval-size fact', async () => {
		const count = await introduceNewCards(97, now0);
		expect(count).toBe(96 * 3 + 1);

		const cards = await getAllCards();
		expect(new Set(cards.map((c) => c.factId)).size).toBe(97);

		const nonChordCards = cards.filter((c) => c.factKind !== 'chord-formula');
		expect(nonChordCards).toHaveLength(1);
		expect(nonChordCards[0].factKind).toBe('interval-size');
		expect(nonChordCards[0].mode).toBe('formula');
	});

	it('exhaustion: introduceNewCards(1000, now) seeds all 192 facts (96 chord clusters x3 + 96 single-card) and a further call introduces 0', async () => {
		const firstCount = await introduceNewCards(1000, now0);
		expect(firstCount).toBe(96 * 3 + 12 + 84);
		expect(firstCount).toBe(384);

		const allCards = await getAllCards();
		expect(allCards).toHaveLength(384);
		expect(new Set(allCards.map((c) => c.factId)).size).toBe(192);

		const secondCount = await introduceNewCards(1000, now0);
		expect(secondCount).toBe(0);

		const stillAllCards = await getAllCards();
		expect(stillAllCards).toHaveLength(384);
	});

	it('WR-02: pre-existing legacy formula-only chord facts (pre-13-01 seeding) are retrofitted via a separately-budgeted pass and never starve genuinely new fact introduction', async () => {
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
		const newFactIds = [...cardsByFact.keys()].filter((id) => !legacyFactIds.has(id));
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

		// 3 new facts x 3 cards + 3 retrofitted legacy facts x 2 new cards each.
		expect(count).toBe(3 * 3 + 3 * 2);
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
		const firstIntroduced = await introduceNewCards(1, now0);
		expect(firstIntroduced).toBe(3);

		const clusterCards = await getAllCards();
		expect(clusterCards).toHaveLength(3);
		const targetFactId = clusterCards[0].factId;
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

	it("deriveCellState === 'mastered' when card.due > now, state === Review, lastRating !== Again", () => {
		const masteredCard: CardRecord = makeCardRecord({
			due: new Date(now0.getTime() + 24 * 60 * 60 * 1000),
			state: State.Review,
			lastRating: Rating.Good
		});
		expect(deriveCellState(masteredCard, now0)).toBe('mastered');
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

	it('regression pin (updated for 13-01 teach-cluster): introduceNewCards(1000, now) produces formula-build ONLY for chord-formula facts, never for interval-size/scale-degree facts', async () => {
		await introduceNewCards(1000, now0);
		const cards = await getAllCards();
		expect(cards.length).toBe(384);

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
		...overrides
	};
}
