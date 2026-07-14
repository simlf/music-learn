/**
 * Hybrid level gating (R3-learning.md section 2). The current tier lives in
 * localStorage ("music-learn:level", the established music-learn:* pattern);
 * unlock ELIGIBILITY is computed from server-derived fetchStats aggregates
 * plus the local rolling practice log. The client never re-derives lifetime
 * accuracy from raw answer events (D-02): per-item attempts/accuracy come in
 * as StatItem aggregates the server already computed.
 *
 * The rolling 30-answer window and distinct-practice-days signals are NOT
 * expressible from /stats (lifetime aggregates only) and the production
 * server is frozen tonight, so those two inputs come from the client-side
 * practice log until a GET /unlock endpoint ships (R3 recommends one).
 */

import type { StatItem } from '$lib/api/progress';
import type { LoggedAnswer } from './practiceLog';
import { availableTierIds, itemsForTier, splitSymbol, tierById, type TierId } from './tiers';

export const LEVEL_KEY = 'music-learn:level';

/** The exact R3 section 2 unlock numbers, in one tunable object. */
export const UNLOCK_CRITERIA = {
	rollingWindow: 30,
	rollingAccuracyMin: 0.85,
	minLifetimeAttempts: 40,
	perQualityMinAttempts: 8,
	perQualityAccuracyMin: 0.75,
	minDistinctDays: 2,
	snoozePracticeDays: 3
} as const;

export type UnlockCriteria = typeof UNLOCK_CRITERIA;

export interface LevelState {
	/** Highest tier the user drills by default. */
	currentTier: TierId;
	/** Ascending list; manual override rewrites it as 1..currentTier. */
	unlockedTiers: TierId[];
	/** Set when "Not yet" was tapped: silence the suggestion for 3 practice days. */
	snooze?: { tier: TierId; snoozedOn: string };
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
 * Manual tier override (always available in settings): sets the current
 * tier and unlocks every tier up to it. Re-locking to a lower tier shrinks
 * the unlocked set. Locked tiers (5, 6) are ignored.
 */
export function setCurrentTier(tier: TierId): LevelState {
	const current = getLevelState();
	if (!tierById(tier)?.available) return current;
	const unlocked = availableTierIds().filter((id) => id <= tier);
	const next: LevelState = { ...current, currentTier: tier, unlockedTiers: unlocked };
	writeState(next);
	return next;
}

/** Records a "Not yet" tap: the suggestion for `tier` sleeps for 3 practice days. */
export function snoozeSuggestion(tier: TierId, today: string): LevelState {
	const next: LevelState = { ...getLevelState(), snooze: { tier, snoozedOn: today } };
	writeState(next);
	return next;
}

/**
 * Pure snooze check: true while fewer than snoozePracticeDays practice days
 * have passed since the snooze was recorded for THIS tier. Callers supply
 * practiceDaysSince(state.snooze.snoozedOn) from the practice log.
 */
export function isSnoozed(
	state: LevelState,
	tier: TierId,
	practiceDaysSinceSnooze: number,
	criteria: UnlockCriteria = UNLOCK_CRITERIA
): boolean {
	if (!state.snooze || state.snooze.tier !== tier) return false;
	return practiceDaysSinceSnooze < criteria.snoozePracticeDays;
}

export interface QualityCheck {
	quality: string;
	attempts: number;
	accuracy: number;
	passing: boolean;
}

export interface UnlockCheck {
	/** The tier whose mastery was evaluated (the current tier). */
	tier: TierId;
	/** The tier an eligible unlock would open, or null when the next tier is locked. */
	nextTier: TierId | null;
	eligible: boolean;
	rollingAccuracy: number;
	rollingCount: number;
	lifetimeAttempts: number;
	distinctDays: number;
	perQuality: QualityCheck[];
}

/**
 * Evaluates every R3 unlock criterion for the given tier. Pure function:
 * stats come from fetchStats (server-derived aggregates, D-02), the log from
 * the local practice record. `stats: null` (offline/tokenless) is never
 * eligible, so gating degrades gracefully behind auth (R1 warning).
 */
export function checkUnlock(opts: {
	tier: TierId;
	stats: StatItem[] | null;
	log: LoggedAnswer[];
	criteria?: UnlockCriteria;
}): UnlockCheck {
	const criteria = opts.criteria ?? UNLOCK_CRITERIA;
	const tierDef = tierById(opts.tier);
	const tierItems = new Set(itemsForTier(opts.tier));

	const nextId = (opts.tier + 1) as TierId;
	const nextTier = opts.tier < 6 && tierById(nextId)?.available ? nextId : null;

	const tierStats = (opts.stats ?? []).filter(
		(stat) => stat.kind === 'chord' && tierItems.has(stat.item)
	);
	const lifetimeAttempts = tierStats.reduce((sum, stat) => sum + stat.attempts, 0);

	const perQuality: QualityCheck[] = tierDef.qualities.map((quality) => {
		const qualityStats = tierStats.filter((stat) => splitSymbol(stat.item)?.quality === quality);
		const attempts = qualityStats.reduce((sum, stat) => sum + stat.attempts, 0);
		const accuracy =
			attempts === 0
				? 0
				: qualityStats.reduce((sum, stat) => sum + stat.accuracy * stat.attempts, 0) / attempts;
		return {
			quality,
			attempts,
			accuracy,
			passing: attempts >= criteria.perQualityMinAttempts && accuracy >= criteria.perQualityAccuracyMin
		};
	});

	// Rolling window: tier-scoped, cold answers only (assisted excluded, R3).
	const coldTierAnswers = opts.log.filter(
		(entry) => !entry.assisted && tierItems.has(entry.item)
	);
	const window = coldTierAnswers.slice(-criteria.rollingWindow);
	const rollingCount = window.length;
	const rollingAccuracy =
		rollingCount === 0 ? 0 : window.filter((entry) => entry.correct).length / rollingCount;

	const distinctDays = new Set(coldTierAnswers.map((entry) => entry.date)).size;

	const eligible =
		nextTier !== null &&
		rollingCount >= criteria.rollingWindow &&
		rollingAccuracy >= criteria.rollingAccuracyMin &&
		lifetimeAttempts >= criteria.minLifetimeAttempts &&
		perQuality.every((entry) => entry.passing) &&
		distinctDays >= criteria.minDistinctDays;

	return {
		tier: opts.tier,
		nextTier,
		eligible,
		rollingAccuracy,
		rollingCount,
		lifetimeAttempts,
		distinctDays,
		perQuality
	};
}
