/**
 * The tier ladder drawn as a path on /practice (ml-practice-game): six stops,
 * the current one carrying a progress bar toward the next, and a one-time
 * unlock moment when a new tier opens.
 *
 * The path only ever shows what was gained. Every stop is a plain name, never
 * a padlock: an `ahead` tier reads as "coming up", and the Practice Settings
 * tier picker can still open any of them by hand. The bar fills from the same
 * mastered-chord count the gate opens on (levelState.tierMasteryCount), and a
 * mastered chord never becomes un-mastered (`masteryDayCount` only grows), so
 * the bar never drains and a skipped week costs it nothing.
 *
 * Pure apart from `takeUnlockMoment`'s one localStorage key, which follows the
 * music-learn:* convention: defensive parse, corrupt data resets, write
 * failures degrade to a no-op.
 */

import type { CardRecord } from '$lib/srs/deck';
import { TIER_MASTERY_PERCENT, tierMasteryCount, type LevelState } from './levelState';
import { availableTierIds, type TierId } from './tiers';

export type PathStopState = 'reached' | 'current' | 'ahead';

export interface PathStop {
	id: TierId;
	state: PathStopState;
}

export interface TierPath {
	stops: PathStop[];
	/** Chords of the current tier mastered so far. */
	mastered: number;
	/** How many mastered chords open the next tier (TIER_MASTERY_PERCENT of the tier, rounded up). */
	needed: number;
	/** 0 to 100, the bar's fill. Clamped, so a tier past its gate reads full rather than overflowing. */
	percent: number;
	/** True when the current tier is the last rung, so there is nothing further to fill toward. */
	top: boolean;
}

/**
 * Builds the path from the stored level and the deck. A tier is `reached` when
 * the user has been offered it before (at or below the current tier, or listed
 * in `unlockedTiers` after a deliberate move back down), `current` for the
 * tier new material comes from, and `ahead` otherwise.
 */
export function tierPath(level: LevelState, cards: CardRecord[]): TierPath {
	const ladder = availableTierIds();
	const reached = new Set<TierId>(level.unlockedTiers);
	const stops = ladder.map((id): PathStop => {
		if (id === level.currentTier) return { id, state: 'current' };
		if (id < level.currentTier || reached.has(id)) return { id, state: 'reached' };
		return { id, state: 'ahead' };
	});
	const { mastered, total } = tierMasteryCount(level.currentTier, cards);
	const needed = Math.max(1, Math.ceil((total * TIER_MASTERY_PERCENT) / 100));
	const percent = Math.min(100, Math.round((mastered * 100) / needed));
	const top = ladder[ladder.length - 1] === level.currentTier;
	return { stops, mastered, needed, percent, top };
}

export const TIER_SEEN_KEY = 'music-learn:tier-seen';

function readSeen(): number | null {
	try {
		const raw = localStorage.getItem(TIER_SEEN_KEY);
		if (raw === null) return null;
		const parsed: unknown = JSON.parse(raw);
		return typeof parsed === 'number' && Number.isInteger(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

function writeSeen(tier: TierId): void {
	try {
		localStorage.setItem(TIER_SEEN_KEY, JSON.stringify(tier));
	} catch {
		// Storage disabled or full: the moment may show again next visit, which
		// is the harmless direction to fail in.
	}
}

/**
 * The unlock moment: returns `currentTier` exactly once, the first time the
 * path renders with a tier higher than any it has shown before, and null
 * otherwise. A first visit records the tier without celebrating (there is no
 * "new" to mark yet), and moving down and back up the ladder by hand never
 * celebrates a tier twice: the key holds the highest tier ever shown.
 */
export function takeUnlockMoment(currentTier: TierId): TierId | null {
	const seen = readSeen();
	if (seen !== null && currentTier <= seen) return null;
	writeSeen(currentTier);
	return seen === null ? null : currentTier;
}
