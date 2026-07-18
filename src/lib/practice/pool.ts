/**
 * The weighted question pool (R3-learning.md section 3): each draw picks a
 * bucket first (60% active-song chords, 25% current-tier, 15% review when a
 * song is active; 0/80/20 with no song), then an item within the bucket.
 *
 *   SONG   need-weighted by (1 - accuracy) with Laplace smoothing, capped at
 *          35% share per item. Above-tier song chords bypass the tier gate
 *          through the scaffolding ladder (scaffold.ts), with at most 2
 *          unfamiliar qualities in scaffolding at once.
 *   TIER   uniform over all unlocked (available) tiers.
 *   REVIEW recent misses + server weakest shortlist, plus lower-tier items
 *          unseen for staleDays (maintenance so retired tiers do not decay).
 *
 * Interleaving constraint: never 3 consecutive questions of the same quality
 * when an alternative exists (max 2 same-quality in a row).
 *
 * Pure module: the rng is injectable so tests are deterministic without
 * Math.random draw-order mocks (the fragility R1 flags in the drills e2e).
 */

import type { StatItem } from '$lib/api/progress';
import type { LoggedAnswer } from './practiceLog';
import { activeScaffoldQualities, stageFor, type ScaffoldStage, type ScaffoldState } from './scaffold';
import { itemsForTiers, splitSymbol, tierById, type TierId } from './tiers';

export type Rng = () => number;

export type Bucket = 'song' | 'tier' | 'review';

export interface PoolConfig {
	/** Bucket weights with an active song (R3: 0.60 / 0.25 / 0.15). */
	songWeight: number;
	tierWeight: number;
	reviewWeight: number;
	/** Bucket weights with no active song (R3: 0.80 / 0.20). */
	noSongTierWeight: number;
	noSongReviewWeight: number;
	/** Cap on one item's share inside the song bucket (R3: 0.35). */
	maxItemShare: number;
	/** At most this many unfamiliar qualities in scaffolding at once (R3: 2). */
	maxScaffoldingQualities: number;
	/** Never exceed this many same-quality questions in a row (R3: 2). */
	maxSameQualityRun: number;
	/** Lower-tier items unseen this many days become review candidates (R3: 7). */
	staleDays: number;
}

export const DEFAULT_POOL_CONFIG: PoolConfig = {
	songWeight: 0.6,
	tierWeight: 0.25,
	reviewWeight: 0.15,
	noSongTierWeight: 0.8,
	noSongReviewWeight: 0.2,
	maxItemShare: 0.35,
	maxScaffoldingQualities: 2,
	maxSameQualityRun: 2,
	staleDays: 7
};

export interface PoolContext {
	/** Deduped union of active-song chord symbols (songs.ts contract). */
	songSymbols: string[];
	currentTier: TierId;
	unlockedTiers: TierId[];
	/** Server-derived per-item aggregates (fetchStats); null when unavailable. */
	stats: StatItem[] | null;
	/** Server weakest shortlist (fetchStats). */
	weakest: StatItem[];
	/** Local recent misses, newest first (practiceLog). */
	recentMisses: string[];
	/** Scaffold states keyed by symbol (scaffold.ts). */
	scaffolds: Record<string, ScaffoldState>;
	/** Qualities of recent draws, most recent LAST (interleaving constraint input). */
	lastQualities: string[];
	/** Local practice log (staleness detection for lower-tier maintenance). */
	log: LoggedAnswer[];
	/** Local calendar date YYYY-MM-DD. */
	today: string;
}

export interface PoolDraw {
	symbol: string;
	bucket: Bucket;
	/** Non-null when the symbol is an above-tier song chord still on the scaffolding ladder. */
	scaffoldStage: ScaffoldStage | null;
}

/** Weight boost for misses/weakest over stale maintenance items in the review bucket. */
const REVIEW_PRIORITY_WEIGHT = 4;

function weightedDraw<T>(items: T[], weights: number[], rng: Rng): T {
	const total = weights.reduce((sum, weight) => sum + weight, 0);
	let roll = rng() * total;
	for (let i = 0; i < items.length; i++) {
		roll -= weights[i];
		if (roll < 0) return items[i];
	}
	return items[items.length - 1];
}

/**
 * Normalizes weights to shares, clamping any share above `cap` and
 * redistributing the excess proportionally (iteratively, since redistribution
 * can push another item over the cap). Falls back to uniform shares when the
 * cap is infeasible (fewer than ceil(1/cap) items).
 */
function cappedShares(weights: number[], cap: number): number[] {
	const count = weights.length;
	if (count * cap < 1) return weights.map(() => 1 / count);
	const shares = new Array<number>(count).fill(0);
	const capped = new Array<boolean>(count).fill(false);
	for (let pass = 0; pass < count; pass++) {
		const freeMass = 1 - shares.filter((_, i) => capped[i]).reduce((sum, share) => sum + share, 0);
		const freeWeight = weights.reduce((sum, weight, i) => (capped[i] ? sum : sum + weight), 0);
		if (freeWeight <= 0) break;
		let overflowed = false;
		for (let i = 0; i < count; i++) {
			if (capped[i]) continue;
			shares[i] = (weights[i] / freeWeight) * freeMass;
			if (shares[i] > cap) {
				shares[i] = cap;
				capped[i] = true;
				overflowed = true;
			}
		}
		if (!overflowed) break;
		// Re-run with the newly capped items fixed.
		for (let i = 0; i < count; i++) {
			if (!capped[i]) shares[i] = 0;
		}
	}
	return shares;
}

/** Smoothed need: (1 - accuracy) with Laplace smoothing so unseen items sit at 0.5. */
function needFor(symbol: string, stats: StatItem[] | null): number {
	const stat = stats?.find((entry) => entry.kind === 'chord' && entry.item === symbol);
	const attempts = stat?.attempts ?? 0;
	const accuracy = stat?.accuracy ?? 0;
	const smoothedAccuracy = (accuracy * attempts + 1) / (attempts + 2);
	return 1 - smoothedAccuracy;
}

function availableUnlocked(ctx: PoolContext): TierId[] {
	return ctx.unlockedTiers.filter((id) => tierById(id)?.available);
}

/**
 * The scaffolding stage the NEXT question for `symbol` enters at, or null
 * when the symbol is a normal item (inside the unlocked tiers, or already
 * graduated from the ladder).
 */
export function scaffoldStageForSymbol(ctx: PoolContext, symbol: string): ScaffoldStage | null {
	const unlockedItems = new Set(itemsForTiers(availableUnlocked(ctx)));
	if (unlockedItems.has(symbol)) return null;
	const stage = stageFor(ctx.scaffolds[symbol]);
	return stage === 'graduated' ? null : stage;
}

/**
 * Filters same-quality candidates out when the last maxSameQualityRun draws
 * already share that quality, unless doing so would empty the list (the
 * constraint never deadlocks a single-quality pool).
 */
function applyInterleaving<T>(
	candidates: T[],
	weights: number[],
	qualityOf: (candidate: T) => string | null,
	ctx: PoolContext,
	config: PoolConfig
): { candidates: T[]; weights: number[] } {
	const run = ctx.lastQualities.slice(-config.maxSameQualityRun);
	if (run.length < config.maxSameQualityRun) return { candidates, weights };
	const [first, ...rest] = run;
	if (!rest.every((quality) => quality === first)) return { candidates, weights };
	const kept = candidates
		.map((candidate, i) => ({ candidate, weight: weights[i] }))
		.filter(({ candidate }) => qualityOf(candidate) !== first);
	if (kept.length === 0) return { candidates, weights };
	return {
		candidates: kept.map(({ candidate }) => candidate),
		weights: kept.map(({ weight }) => weight)
	};
}

/**
 * R3's "at most maxScaffoldingQualities unfamiliar qualities in scaffolding at
 * once" pacing gate, shared by songCandidates() (drawFromPool's own 60% song
 * bucket) and drawFromSymbols' restricted "From my songs" draw (MD-01) - both
 * candidate sources must respect the same simultaneous-new-quality cap, or a
 * restricted draw could bypass the invariant the unrestricted path enforces.
 * A normal item (no active scaffold stage), an already-unlocked quality, or a
 * quality already counted among the in-flight ones always passes through
 * unfiltered; only a BRAND NEW unfamiliar quality is throttled once the cap
 * is reached.
 */
export function limitScaffoldingQualities(
	symbols: string[],
	ctx: PoolContext,
	config: PoolConfig = DEFAULT_POOL_CONFIG
): string[] {
	const unlocked = availableUnlocked(ctx);
	const unlockedQualities = new Set(unlocked.flatMap((id) => tierById(id).qualities));
	const inFlight = activeScaffoldQualities(ctx.scaffolds);
	return symbols.filter((symbol) => {
		if (scaffoldStageForSymbol(ctx, symbol) === null) return true; // normal item
		const quality = splitSymbol(symbol)?.quality;
		if (quality === undefined) return true; // unclassifiable root: let it through
		if (unlockedQualities.has(quality)) return true; // familiar quality: per-symbol ladder only
		if (inFlight.includes(quality)) return true; // already one of the in-flight qualities
		return inFlight.length < config.maxScaffoldingQualities;
	});
}

function songCandidates(ctx: PoolContext, config: PoolConfig): string[] {
	return limitScaffoldingQualities(ctx.songSymbols, ctx, config);
}

function reviewCandidates(
	ctx: PoolContext,
	config: PoolConfig
): { candidates: string[]; weights: number[] } {
	const priority: string[] = [];
	for (const symbol of ctx.recentMisses) {
		if (!priority.includes(symbol)) priority.push(symbol);
	}
	for (const stat of ctx.weakest) {
		if (stat.kind === 'chord' && !priority.includes(stat.item)) priority.push(stat.item);
	}

	const lowerTiers = availableUnlocked(ctx).filter((id) => id < ctx.currentTier);
	const prioritySet = new Set(priority);
	const todayMs = Date.parse(ctx.today);
	const seenRecently = new Set(
		ctx.log
			.filter((entry) => {
				const entryMs = Date.parse(entry.date);
				return Number.isFinite(entryMs) && (todayMs - entryMs) / 86400000 <= config.staleDays;
			})
			.map((entry) => entry.item)
	);
	const stale = itemsForTiers(lowerTiers).filter(
		(item) => !seenRecently.has(item) && !prioritySet.has(item)
	);

	return {
		candidates: [...priority, ...stale],
		weights: [
			...priority.map(() => REVIEW_PRIORITY_WEIGHT),
			...stale.map(() => 1)
		]
	};
}

/**
 * Draws the next question symbol. Total function: the tier bucket is never
 * empty (there is always at least one unlocked available tier), so a draw
 * always succeeds even with no songs, no stats, and no history.
 */
export function drawFromPool(
	ctx: PoolContext,
	config: PoolConfig = DEFAULT_POOL_CONFIG,
	rng: Rng = Math.random
): PoolDraw {
	const song = songCandidates(ctx, config);
	const tier = itemsForTiers(availableUnlocked(ctx));
	const review = reviewCandidates(ctx, config);

	const hasSong = song.length > 0;
	const allBuckets: { bucket: Bucket; weight: number }[] = [
		{ bucket: 'song', weight: hasSong ? config.songWeight : 0 },
		{ bucket: 'tier', weight: hasSong ? config.tierWeight : config.noSongTierWeight },
		{
			bucket: 'review',
			weight:
				review.candidates.length === 0
					? 0
					: hasSong
						? config.reviewWeight
						: config.noSongReviewWeight
		}
	];
	const buckets = allBuckets.filter((entry) => entry.weight > 0);

	const chosen = weightedDraw(
		buckets.map((entry) => entry.bucket),
		buckets.map((entry) => entry.weight),
		rng
	);

	const qualityOf = (symbol: string) => splitSymbol(symbol)?.quality ?? null;
	let symbol: string;
	if (chosen === 'song') {
		const needs = song.map((candidate) => needFor(candidate, ctx.stats));
		const shares = cappedShares(needs, config.maxItemShare);
		const filtered = applyInterleaving(song, shares, qualityOf, ctx, config);
		symbol = weightedDraw(filtered.candidates, filtered.weights, rng);
	} else if (chosen === 'review') {
		const filtered = applyInterleaving(
			review.candidates,
			review.weights,
			qualityOf,
			ctx,
			config
		);
		symbol = weightedDraw(filtered.candidates, filtered.weights, rng);
	} else {
		const filtered = applyInterleaving(
			tier,
			tier.map(() => 1),
			qualityOf,
			ctx,
			config
		);
		symbol = weightedDraw(filtered.candidates, filtered.weights, rng);
	}

	return { symbol, bucket: chosen, scaffoldStage: scaffoldStageForSymbol(ctx, symbol) };
}

/**
 * SONG-02 restricted draw: draws ONLY from `symbols` (the caller's candidate
 * set, e.g. the active-song chords when the "From my songs" filter is ON),
 * reusing the pool's own need-weighting, per-item cap, and interleaving
 * machinery so a restricted draw still favors weak chords and still respects
 * the max-same-quality-run constraint. Returns `null` for an empty candidate
 * set so the caller can fall back to the full library (drawFromPool).
 *
 * Additive-only: does not modify drawFromPool or any existing export, so the
 * proven 0/60/25/15 bucket weighting is unaffected.
 */
export function drawFromSymbols(
	symbols: string[],
	ctx: PoolContext,
	config: PoolConfig = DEFAULT_POOL_CONFIG,
	rng: Rng = Math.random
): string | null {
	if (symbols.length === 0) return null;

	const qualityOf = (symbol: string) => splitSymbol(symbol)?.quality ?? null;
	const needs = symbols.map((candidate) => needFor(candidate, ctx.stats));
	const shares = cappedShares(needs, config.maxItemShare);
	const filtered = applyInterleaving(symbols, shares, qualityOf, ctx, config);
	return weightedDraw(filtered.candidates, filtered.weights, rng);
}
