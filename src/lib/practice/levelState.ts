/**
 * Tier progression: which rung of the tiers.ts ladder the deck is currently
 * allowed to introduce new chord facts from.
 *
 * The current tier lives in localStorage ("music-learn:level", the
 * established music-learn:* pattern). `srs/deck.ts`'s introduceNewCards reads
 * it through `advanceTierOnMastery` on every introduction pass, so the tier
 * picker in Practice Settings is a live control over what the deck teaches
 * next rather than a stored preference nothing consumes.
 *
 * UNLOCK IS DECK-DERIVED AND OFFLINE-FIRST. An earlier `checkUnlock` computed
 * eligibility from server-side `/stats` aggregates plus a rolling local answer
 * log. It was never wired to anything, and it could not have worked as
 * written: with `stats: null` (no bearer token, or the tailnet host
 * unreachable, which is the normal case on a phone) every per-quality check
 * failed and `eligible` was permanently false. A gate that cannot open
 * offline is not a gate, so it is gone, along with UNLOCK_CRITERIA and the
 * "Not yet" snooze that only existed to silence a suggestion prompt this
 * project deliberately does not show.
 *
 * What replaces it is the mastery criterion the app already has and already
 * visualises in the recall map: `CardRecord.masteryDayCount >= 2`, correct
 * recall on two distinct local calendar days (srs/deck.ts's IMP-01
 * successive-relearning gate). It needs no network, it is monotonic, and it
 * is the same number the user can already see. A tier whose chords have
 * cleared it (TIER_MASTERY_PERCENT percent of them) opens the next tier
 * silently, with no prompt and no nag.
 */

import { chordFormulaFactId } from '$lib/srs/facts';
// Type-only import: erased at compile time. deck.ts imports this module's
// functions at runtime, so a runtime import of './deck' here would create a
// circular dependency. This keeps the seam one-directional at runtime while
// still sharing deck.ts's CardRecord shape for type-checking (the same
// convention srs/rotation.ts already uses).
import type { CardRecord } from '$lib/srs/deck';
import { availableTierIds, itemsForTier, tierById, type TierId } from './tiers';

export const LEVEL_KEY = 'music-learn:level';

/**
 * Distinct local days of correct recall that count as mastery of one fact.
 * Deliberately not a second definition: this is the exact threshold
 * `srs/deck.ts:deriveCellState` uses to report a card as 'mastered', named
 * here so the tier gate and the recall map can never drift apart.
 */
export const MASTERY_DAY_COUNT = 2;

export interface LevelState {
	/** Highest tier the deck may introduce new chord facts from. */
	currentTier: TierId;
	/**
	 * Ascending list of every tier ever reached, whether earned or set by
	 * hand. Only ever grows: it is the record of what the user has already
	 * been offered, which is what lets a deliberate move back DOWN the ladder
	 * stick instead of being undone by the next mastery check.
	 */
	unlockedTiers: TierId[];
}

const DEFAULT_STATE: LevelState = { currentTier: 1, unlockedTiers: [1] };

function isValidState(value: unknown): value is LevelState {
	if (typeof value !== 'object' || value === null) return false;
	const state = value as Record<string, unknown>;
	const available = availableTierIds() as number[];
	if (typeof state.currentTier !== 'number' || !available.includes(state.currentTier)) {
		return false;
	}
	if (
		!Array.isArray(state.unlockedTiers) ||
		!state.unlockedTiers.every((tier) => typeof tier === 'number' && available.includes(tier))
	) {
		return false;
	}
	return true;
}

/** Reads the level state; corrupt or out-of-range data resets to the tier 1 default. */
export function getLevelState(): LevelState {
	try {
		const raw = localStorage.getItem(LEVEL_KEY);
		if (raw === null) return { ...DEFAULT_STATE };
		const parsed: unknown = JSON.parse(raw);
		if (!isValidState(parsed)) return { ...DEFAULT_STATE };
		return parsed;
	} catch {
		return { ...DEFAULT_STATE };
	}
}

function writeState(state: LevelState): void {
	try {
		localStorage.setItem(LEVEL_KEY, JSON.stringify(state));
	} catch {
		// Storage disabled or full: gating still works from the in-memory
		// default; persistence degrades to a no-op.
	}
}

/**
 * Manual tier override (always available in Practice Settings): sets the
 * current tier and records every tier up to it as reached. Locked tiers
 * (5, 6) are ignored.
 *
 * `unlockedTiers` is ADDITIVE and never shrinks, unlike the earlier version
 * that rewrote it as exactly 1..tier. Moving the current tier back DOWN is a
 * legitimate "stop feeding me sevenths for a while" request, and the union
 * semantics are what make it stick: `advanceTierOnMastery` only ever grants a
 * tier that has never been reached, so it cannot immediately undo the move.
 */
export function setCurrentTier(tier: TierId): LevelState {
	const current = getLevelState();
	if (!tierById(tier)?.available) return current;
	const reached = new Set<TierId>(current.unlockedTiers);
	for (const id of availableTierIds()) {
		if (id <= tier) reached.add(id);
	}
	const next: LevelState = {
		...current,
		currentTier: tier,
		unlockedTiers: [...reached].sort((a, b) => a - b)
	};
	writeState(next);
	return next;
}

/**
 * The share of a tier's chords that must be mastered before the next tier
 * opens (ml-practice-variety, C3).
 *
 * This was every chord, and "every" let the single slowest chord of a tier
 * hold back all new material: a one-round-a-day user sat on tier 1's
 * fourteen triads and tier 2's triads for eight weeks before meeting a
 * seventh chord. Four in five keeps the gate meaning "you know this tier"
 * while the stragglers keep coming back through FSRS like any other due
 * card, alongside the next tier's material instead of in front of it.
 */
export const TIER_MASTERY_PERCENT = 80;

/**
 * True once at least TIER_MASTERY_PERCENT percent of the chord symbols in
 * `tier` have a card, in any mode, that cleared the MASTERY_DAY_COUNT gate.
 * Pure: the caller supplies the cards it already read (introduceNewCards
 * always has them in hand), so this never touches Dexie or the network.
 *
 * Any mode, not just 'formula': /practice now asks a chord's teach cluster
 * one mode per round, build it first and name it last (practiceQueue's
 * TEACH_MODE_ORDER), so the 'formula' card is the last of the cluster to be
 * asked at all. Correct recall on two distinct days of building or playing a
 * chord is the same successive-relearning evidence as naming it, and gating
 * on 'formula' alone would hold the tier back by the length of the cluster.
 * `masteryDayCount` rather than `deriveCellState(...) === 'mastered'` because
 * the cell state is deliberately transient (a mastered card that comes due
 * again reports 'due'), which would make the gate flicker from day to day;
 * the underlying day count only ever goes up.
 *
 * A locked tier has no items and is never mastered, which is what keeps
 * tiers 5 and 6 shut.
 */
export function tierMastered(
	tier: TierId,
	cards: CardRecord[],
	threshold: number = MASTERY_DAY_COUNT
): boolean {
	const { mastered, total } = tierMasteryCount(tier, cards, threshold);
	if (total === 0) return false;
	return mastered * 100 >= total * TIER_MASTERY_PERCENT;
}

/**
 * How many of `tier`'s chord symbols are mastered (any mode, same rule as
 * tierMastered, which reads it) out of how many the tier holds. Exposed so the
 * practice page's tier path draws its progress bar from the very count the
 * gate opens on, rather than a second definition that could drift from it.
 */
export function tierMasteryCount(
	tier: TierId,
	cards: CardRecord[],
	threshold: number = MASTERY_DAY_COUNT
): { mastered: number; total: number } {
	const symbols = itemsForTier(tier);
	const masteredIds = new Set(
		cards.filter((card) => card.masteryDayCount >= threshold).map((card) => card.factId)
	);
	const mastered = symbols.filter((symbol) => masteredIds.has(chordFormulaFactId(symbol))).length;
	return { mastered, total: symbols.length };
}

/**
 * Pure tier progression: the tier a user at `state.currentTier` has earned,
 * given `cards`. Climbs while the current tier is mastered and the next
 * available tier has never been reached before. Never descends.
 *
 * The "never reached before" condition is what respects a deliberate manual
 * move back down the ladder: re-locking to tier 1 after having been at tier 2
 * leaves `unlockedTiers` holding 2, so mastery of tier 1 does not re-grant it.
 * Climbing further is then a manual step, which is the honest reading of "the
 * user told me to stay here".
 */
export function earnedTier(state: LevelState, cards: CardRecord[]): TierId {
	const ladder = availableTierIds();
	const ceiling = state.unlockedTiers.reduce<number>(
		(highest, tier) => Math.max(highest, tier),
		state.currentTier
	);
	let tier = state.currentTier;
	for (;;) {
		const next = ladder.find((id) => id > tier);
		if (next === undefined || next <= ceiling) return tier;
		if (!tierMastered(tier, cards)) return tier;
		tier = next;
	}
}

/**
 * Reads the stored level, advances it past every tier the deck proves
 * mastered, persists any change, and returns the effective state.
 *
 * Called by `srs/deck.ts:introduceNewCards` at the start of every
 * introduction pass, which is the one hook both /practice and /progress >
 * Recall share. Silent here: the reward for mastering a tier is that new
 * material starts arriving, never a "ready to level up?" prompt that asks
 * permission. The /practice tier path (practice/tierPath.ts) notices the new
 * tier the next time it renders and shows one unlock moment for it, after the
 * fact; the /progress tier line reflects it the next time it is opened.
 */
export function advanceTierOnMastery(cards: CardRecord[]): LevelState {
	const current = getLevelState();
	const tier = earnedTier(current, cards);
	if (tier === current.currentTier) return current;
	return setCurrentTier(tier);
}
