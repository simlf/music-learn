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
	NEW_CARDS_PER_SESSION,
	_database
} from './deck';
import { Rating, State } from '$lib/srs/scheduler';
import type { CardRecord } from './deck';

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

	it('introduceNewCards defaults its limit to NEW_CARDS_PER_SESSION when called with no argument', async () => {
		const count = await introduceNewCards(undefined, now0);
		expect(count).toBe(NEW_CARDS_PER_SESSION);
		expect(await getAllCards()).toHaveLength(NEW_CARDS_PER_SESSION);
	});

	it('introduceNewCards seeds distinct factIds across repeated calls, growing the deck incrementally', async () => {
		const firstCount = await introduceNewCards(5, now0);
		expect(firstCount).toBe(5);

		const afterFirst = await getAllCards();
		expect(afterFirst).toHaveLength(5);
		const firstFactIds = new Set(afterFirst.map((c) => c.factId));
		expect(firstFactIds.size).toBe(5);

		const secondCount = await introduceNewCards(5, now0);
		expect(secondCount).toBe(5);

		const afterSecond = await getAllCards();
		expect(afterSecond).toHaveLength(10);
		const allFactIds = new Set(afterSecond.map((c) => c.factId));
		expect(allFactIds.size).toBe(10);
	});

	it('every newly introduced card is mode formula, state New, due <= now, lastRating null', async () => {
		await introduceNewCards(5, now0);
		const cards = await getAllCards();
		for (const card of cards) {
			expect(card.mode).toBe('formula');
			expect(card.state).toBe(State.New);
			expect(card.due.getTime()).toBeLessThanOrEqual(now0.getTime());
			expect(card.lastRating).toBeNull();
		}
	});

	it('getDueCards(now) after introduceNewCards(5, now) returns exactly those 5 cards', async () => {
		await introduceNewCards(5, now0);
		const introduced = await getAllCards();
		const due = await getDueCards(now0);
		expect(due).toHaveLength(5);
		expect(new Set(due.map((c) => c.factId))).toEqual(new Set(introduced.map((c) => c.factId)));
	});

	it('exhaustion: introduceNewCards(1000, now) seeds all 192 facts and a further call introduces 0', async () => {
		const firstCount = await introduceNewCards(1000, now0);
		expect(firstCount).toBe(192);

		const allCards = await getAllCards();
		expect(allCards).toHaveLength(192);

		const secondCount = await introduceNewCards(1000, now0);
		expect(secondCount).toBe(0);

		const stillAllCards = await getAllCards();
		expect(stillAllCards).toHaveLength(192);
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
		await introduceNewCards(2, now0);
		const [validCard, malformedCard] = await getAllCards();

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
