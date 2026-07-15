import Dexie, { type Table } from 'dexie';
import { z } from 'zod';
import { newCard, gradeCard, Rating, State } from '$lib/srs/scheduler';
import type { Rating as RatingType } from '$lib/srs/scheduler';
import { allFacts } from '$lib/srs/facts';
import type { FactKind } from '$lib/srs/facts';

/**
 * The Dexie/IndexedDB persistence layer for FSRS cards (MEM-01/MEM-03/MEM-04):
 * the single gateway between the pure scheduler (11-01), the fact catalog
 * (11-02), and every UI surface (11-05 RecallSession, 11-06 RecallMap).
 *
 * D-09 (the critical trap): `Card.due`/`Card.last_review` are Date objects
 * that silently become strings through IndexedDB/JSON round-trips, breaking
 * date comparisons with no throw. CardRecordSchema's `.coerce.date()` fields
 * are the single read boundary that repairs this: every record read from
 * Dexie is Zod-parsed here before any comparison or scheduler call touches
 * it. No other module in the app may import 'dexie' or 'zod' for card
 * storage; every consumer goes through this module's exports (mirrors
 * scheduler.ts's single-seam encapsulation of ts-fsrs).
 */

/** Phase 11's sole mode value (D-07). Phase 12/13 extend this union later. */
export type Mode = 'formula';

/** The gradual-introduction batch size (documented discretion, not a literal CONTEXT.md requirement). */
export const NEW_CARDS_PER_SESSION = 10;

/** The exact four-state MEM-04 recall-map cell vocabulary (D-11). */
export type CellState = 'not-yet-seen' | 'due' | 'weak' | 'mastered';

/**
 * The raw FSRS Card fields plus stable identity (factId/factKind/mode) and
 * an app-level `lastRating` addition: ts-fsrs's Card has no "most recent
 * rating" field, but MEM-04's "weak" cell state needs to know whether the
 * most recent grade was Again (D-11's "recent lapse"). Set on every
 * recordGrade call; stays null for a never-graded New card.
 */
export interface CardRecord {
	factId: string;
	factKind: FactKind;
	mode: Mode;
	due: Date;
	stability: number;
	difficulty: number;
	elapsed_days: number;
	scheduled_days: number;
	learning_steps: number;
	reps: number;
	lapses: number;
	state: State;
	last_review?: Date;
	lastRating: RatingType | null;
}

/**
 * D-09's enforcement point. `.coerce.date()` accepts either a real Date or
 * an ISO string and always returns a genuine Date instance, so any record
 * whose date fields degraded to strings anywhere upstream is silently
 * repaired here rather than silently miscompared later.
 */
const CardRecordSchema = z.object({
	factId: z.string(),
	factKind: z.enum(['chord-formula', 'interval-size', 'scale-degree']),
	mode: z.enum(['formula']),
	due: z.coerce.date(),
	stability: z.number(),
	difficulty: z.number(),
	elapsed_days: z.number(),
	scheduled_days: z.number(),
	learning_steps: z.number(),
	reps: z.number(),
	lapses: z.number(),
	state: z.number().int().min(0).max(3),
	last_review: z.coerce.date().optional(),
	lastRating: z.number().int().min(1).max(4).nullable()
});

class RecallDatabase extends Dexie {
	cards!: Table<CardRecord, [string, Mode]>;

	constructor() {
		super('music-learn-recall');
		this.version(1).stores({
			cards: '[factId+mode], factId, mode, due'
		});
	}
}

let instance: RecallDatabase | undefined;

/**
 * Lazily-created module-level Dexie instance (mirrors audio.ts's lazy-init
 * style): importing deck.ts alone never touches IndexedDB.
 *
 * Exported (underscore-prefixed, not part of this plan's public artifact
 * surface) solely so deck.test.ts can perform a raw, bypassing-the-typed-
 * write-path corruption for the D-09 Date-rehydration regression test. No
 * other module may import this; every real consumer goes through the typed
 * exports below.
 */
export function _database(): RecallDatabase {
	if (!instance) {
		instance = new RecallDatabase();
	}
	return instance;
}

/**
 * Reads every stored card, Zod-validated (D-09 Date coercion). A record that
 * fails validation entirely is skipped via safeParse rather than throwing
 * and failing the whole read.
 */
export async function getAllCards(): Promise<CardRecord[]> {
	const raw = await _database().cards.toArray();
	const cards: CardRecord[] = [];
	for (const record of raw) {
		const parsed = CardRecordSchema.safeParse(record);
		if (parsed.success) {
			cards.push(parsed.data);
		}
	}
	return cards;
}

/** getAllCards() filtered to due <= now. Safe: due is already a real Date by this point. */
export async function getDueCards(now: Date = new Date()): Promise<CardRecord[]> {
	const all = await getAllCards();
	return all.filter((card) => card.due <= now);
}

/**
 * Creates up to `limit` New cards (mode 'formula') for facts.ts entries with
 * no existing card, returns the count introduced. Never seeds all 192 facts
 * at once (gradual introduction, documented discretion) — the deck starts
 * genuinely empty and grows incrementally, matching the UI-SPEC's empty-state
 * copy and the recall map's "not yet seen" cell.
 */
export async function introduceNewCards(
	limit: number = NEW_CARDS_PER_SESSION,
	now: Date = new Date()
): Promise<number> {
	const existing = await getAllCards();
	const existingKeys = new Set(existing.map((card) => `${card.factId}|${card.mode}`));

	const mode: Mode = 'formula';
	const candidates = allFacts().filter((fact) => !existingKeys.has(`${fact.factId}|${mode}`));
	const toIntroduce = candidates.slice(0, limit);

	if (toIntroduce.length === 0) {
		return 0;
	}

	const records: CardRecord[] = toIntroduce.map((fact) => ({
		...newCard(now),
		factId: fact.factId,
		factKind: fact.factKind,
		mode,
		lastRating: null
	}));

	await _database().cards.bulkPut(records);
	return records.length;
}

/** Commits a grade via the scheduler, persists the result, and returns the updated CardRecord. */
export async function recordGrade(
	card: CardRecord,
	rating: RatingType,
	now: Date = new Date()
): Promise<CardRecord> {
	const { card: updatedFsrsFields } = gradeCard(card, rating, now);
	// Spread order matters: `card` first for factId/factKind/mode, then the
	// fresh FSRS fields, then lastRating last so it always wins.
	const updated: CardRecord = { ...card, ...updatedFsrsFields, lastRating: rating };
	await _database().cards.put(updated);
	return updated;
}

/** Derives the MEM-04 recall-map cell state for a card (or its absence). */
export function deriveCellState(card: CardRecord | undefined, now: Date = new Date()): CellState {
	if (!card) {
		return 'not-yet-seen';
	}
	// due takes priority over every other state: a previously-mastered card
	// that comes due again shows as due, not mastered.
	if (card.due <= now) {
		return 'due';
	}
	if (card.lastRating === Rating.Again) {
		return 'weak';
	}
	if (card.state === State.Review) {
		return 'mastered';
	}
	// Not-yet-due New/Learning card without a lastRating; shouldn't occur in
	// practice since New cards are created with due=now, but keeps the
	// function total.
	return 'due';
}
