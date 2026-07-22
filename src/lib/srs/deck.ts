import Dexie, { type Table } from 'dexie';
import { z } from 'zod';
import { newCard, gradeCard, Rating, State } from '$lib/srs/scheduler';
import type { Rating as RatingType } from '$lib/srs/scheduler';
import { allFacts } from '$lib/srs/facts';
import type { FactKind, Fact } from '$lib/srs/facts';
export type { FactKind };
import { teachClusterModes, clusterGraduated } from '$lib/srs/rotation';

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

/**
 * Phase 11's recall mode (D-07), Phase 12's construction mode (D-09), and
 * Phase 13's two multi-modal recall additions (RECALL-01, D-01/D-02):
 * 'see-play' (mode A: see the symbol, play the notes) and 'hear-name'
 * (mode B: hear the chord, pick the symbol by ear). Mode D ('notes-symbol')
 * is deferred per D-05 and deliberately excluded from this union.
 */
export type Mode = 'formula' | 'formula-build' | 'see-play' | 'hear-name';

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
	/**
	 * IMP-01 (successive-relearning mastery criterion): the count of DISTINCT
	 * local calendar days on which this card received a correct (Good/Easy)
	 * grade. Incremented by at most 1 per calendar day, only on a correct
	 * grade, and never decremented. deriveCellState gates 'mastered' on this
	 * reaching 2, since a single correct grade in one sitting does not
	 * establish durable retrieval (Rawson and Dunlosky).
	 */
	masteryDayCount: number;
}

/**
 * D-09's enforcement point. `.coerce.date()` accepts either a real Date or
 * an ISO string and always returns a genuine Date instance, so any record
 * whose date fields degraded to strings anywhere upstream is silently
 * repaired here rather than silently miscompared later.
 */
const CardRecordSchema = z.object({
	factId: z.string(),
	factKind: z.enum(['chord-formula', 'interval-size', 'scale-degree', 'scale-formula']),
	mode: z.enum(['formula', 'formula-build', 'see-play', 'hear-name']),
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
	lastRating: z.number().int().min(1).max(4).nullable(),
	// Legacy records written before IMP-01 have no masteryDayCount field at
	// all; defaulting to 0 here (rather than requiring it) is what keeps
	// existing IndexedDB records loading without throwing (D-09 boundary).
	masteryDayCount: z.number().int().min(0).default(0)
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
 * Total single-record lookup by the (factId, mode) compound key, undefined
 * when no such card exists. The single-record, non-bulk counterpart to
 * introduceNewCards: Phase 12's construction session uses this to fetch-or-
 * create exactly one (factId, mode) card, independent of introduceNewCards'
 * bulk/limit semantics.
 */
export async function getCard(factId: string, mode: Mode): Promise<CardRecord | undefined> {
	const all = await getAllCards();
	return all.find((card) => card.factId === factId && card.mode === mode);
}

/**
 * Introduces up to `limit` NEW FACTS' worth of cards (not `limit` raw
 * records - a fact's introduction may write more than one card), returns the
 * total count of FACTS introduced (factsTouched + retrofitsTouched), NOT the
 * number of records written - a chord fact's teach cluster writes 3 records
 * but counts as 1 fact; a retrofit hear-name unlock writes 1 record and
 * counts as 1 fact; a non-chord fact writes 1 record and counts as 1 fact
 * (260722-0ex, BACKLOG-1: this is the count the daily intro-budget module
 * consumes, since the budget caps genuinely-new FACTS per day, not raw FSRS
 * records). Never seeds all 192 facts at once (gradual
 * introduction, documented discretion) — the deck starts genuinely empty and
 * grows incrementally, matching the UI-SPEC's empty-state copy and the
 * recall map's "not yet seen" cell.
 *
 * Phase 13 (RECALL-01/03, D-06) rewrites this from Phase 11/12's single
 * 'formula' card per fact into a teach-cluster + stagger seeding policy:
 * a chord-formula fact's teach cluster (`teachClusterModes`) - 'formula',
 * 'see-play', 'formula-build' - is introduced TOGETHER, in the same call, so
 * a chord fact is always taught across all three of its spine modes at once
 * (interval-size/scale-degree facts' cluster is just `['formula']`, so their
 * seeding stays byte-identical to Phase 11). Once every one of a chord fact's
 * cluster cards has graduated to `State.Review` (`clusterGraduated`), a LATER
 * call introduces exactly one more card for that fact: 'hear-name' - staggered
 * behind the rest so FSRS never receives four brand-new cards for one fact at
 * once (D-06's stagger gate). A fact with nothing new to introduce (cluster
 * already complete and hear-name not yet eligible, or already introduced) is
 * skipped entirely and does not count against `limit`.
 *
 * WR-02 (deliberate, bounded behavior): a fact that already has at least one
 * pre-existing card (a Phase-11/12 returning-user fact whose teach cluster is
 * only partially seeded, or a graduated cluster newly eligible for its
 * 'hear-name' stagger-unlock) is a RETROFIT, not the introduction of a
 * genuinely new fact. Retrofits are collected in a first pass and only
 * written in a SECOND pass, budgeted by their own counter
 * (`retrofitsTouched`, capped at `limit` exactly like `factsTouched`) that
 * never shares or competes with the brand-new-fact budget above. This means
 * a returning user's entire Phase-11 backlog can never silently consume a
 * session's new-fact introduction budget ahead of a genuinely unseen fact -
 * the first pass always walks past already-known facts (without spending
 * `factsTouched`) until it finds `limit` worth of genuinely new ones (or
 * exhausts the catalog), and the retrofit pass runs independently afterward.
 */
export async function introduceNewCards(
	limit: number = NEW_CARDS_PER_SESSION,
	now: Date = new Date()
): Promise<number> {
	const existing = await getAllCards();
	const existingByFact = new Map<string, CardRecord[]>();
	for (const card of existing) {
		const cardsForFact = existingByFact.get(card.factId);
		if (cardsForFact) {
			cardsForFact.push(card);
		} else {
			existingByFact.set(card.factId, [card]);
		}
	}

	const records: CardRecord[] = [];
	let factsTouched = 0;

	interface RetrofitCandidate {
		fact: Fact;
		missingClusterModes: Mode[];
		introducesHearName: boolean;
	}
	const retrofitCandidates: RetrofitCandidate[] = [];

	for (const fact of allFacts()) {
		if (factsTouched >= limit) break;

		const cardsForFact = existingByFact.get(fact.factId) ?? [];
		const cluster = teachClusterModes(fact.factKind);
		const missingClusterModes = cluster.filter(
			(mode) => !cardsForFact.some((card) => card.mode === mode)
		);
		const introducesHearName =
			fact.factKind === 'chord-formula' &&
			!cardsForFact.some((card) => card.mode === 'hear-name') &&
			clusterGraduated(cardsForFact, cluster);

		if (missingClusterModes.length === 0 && !introducesHearName) {
			continue;
		}

		if (cardsForFact.length > 0) {
			// Already-known fact (WR-02): defer to the separately-budgeted
			// retrofit pass below instead of spending the new-fact `limit`.
			retrofitCandidates.push({ fact, missingClusterModes, introducesHearName });
			continue;
		}

		factsTouched += 1;
		const modesToAdd: Mode[] = [...missingClusterModes];
		if (introducesHearName) modesToAdd.push('hear-name');

		for (const mode of modesToAdd) {
			records.push({
				...newCard(now),
				factId: fact.factId,
				factKind: fact.factKind,
				mode,
				lastRating: null,
				masteryDayCount: 0
			});
		}
	}

	let retrofitsTouched = 0;
	for (const { fact, missingClusterModes, introducesHearName } of retrofitCandidates) {
		if (retrofitsTouched >= limit) break;
		retrofitsTouched += 1;

		const modesToAdd: Mode[] = [...missingClusterModes];
		if (introducesHearName) modesToAdd.push('hear-name');

		for (const mode of modesToAdd) {
			records.push({
				...newCard(now),
				factId: fact.factId,
				factKind: fact.factKind,
				mode,
				lastRating: null,
				masteryDayCount: 0
			});
		}
	}

	if (records.length === 0) {
		return 0;
	}

	await _database().cards.bulkPut(records);
	return factsTouched + retrofitsTouched;
}

/** True when `a` and `b` fall on the same LOCAL calendar day (getFullYear/getMonth/getDate, not UTC, matching Phase 08's clientDate convention). */
function isSameLocalDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

/**
 * IMP-01: computes the next masteryDayCount for a grade being committed.
 * Only a correct grade (Good/Easy) can increment it, and only once per
 * distinct local calendar day - a card never mastery-counted (no last_review
 * yet) or last correctly counted on a DIFFERENT local day than `now`
 * increments by 1; a same-day repeat or an incorrect (Again/Hard) grade
 * leaves it unchanged. Reads `card.last_review`, the PRE-grade value, so it
 * always compares against the day of the previous review, not this one.
 */
function nextMasteryDayCount(card: CardRecord, rating: RatingType, now: Date): number {
	const isCorrect = rating === Rating.Good || rating === Rating.Easy;
	if (!isCorrect) {
		return card.masteryDayCount;
	}
	if (!card.last_review || !isSameLocalDay(card.last_review, now)) {
		return card.masteryDayCount + 1;
	}
	return card.masteryDayCount;
}

/** Commits a grade via the scheduler, persists the result, and returns the updated CardRecord. */
export async function recordGrade(
	card: CardRecord,
	rating: RatingType,
	now: Date = new Date()
): Promise<CardRecord> {
	const { card: updatedFsrsFields } = gradeCard(card, rating, now);
	const masteryDayCount = nextMasteryDayCount(card, rating, now);
	// Spread order matters: `card` first for factId/factKind/mode, then the
	// fresh FSRS fields, then lastRating/masteryDayCount last so they always win.
	const updated: CardRecord = {
		...card,
		...updatedFsrsFields,
		lastRating: rating,
		masteryDayCount
	};
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
	// IMP-01 (successive-relearning mastery criterion): State.Review alone is
	// not enough - a card only reports 'mastered' once it has been correctly
	// recalled on at least 2 DISTINCT calendar days. A Review card that
	// hasn't cleared that gate yet is a real retrieval path but not yet
	// durably mastered, so it reports 'weak', not 'mastered'.
	if (card.state === State.Review) {
		return card.masteryDayCount >= 2 ? 'mastered' : 'weak';
	}
	// Not-yet-due New/Learning card without a lastRating: provably unreachable
	// given this app's invariants (New cards are always created with due=now,
	// and every grade on a New card transitions straight to State.Review per
	// this app's FSRS config), but kept so the function stays total rather
	// than partial.
	/* istanbul ignore next */
	return 'due';
}
