import { describe, expect, it } from 'vitest';
import type { StatItem } from '$lib/api/progress';
import {
	DEFAULT_POOL_CONFIG,
	drawFromPool,
	drawFromSymbols,
	scaffoldStageForSymbol,
	type PoolContext
} from './pool';
import { itemsForTiers } from './tiers';
import type { ScaffoldState } from './scaffold';

/** Deterministic seeded RNG so distribution assertions never flake (mulberry32). */
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function chordStat(item: string, attempts: number, accuracy: number): StatItem {
	return { item, kind: 'chord', attempts, accuracy, needsPractice: accuracy < 0.7 };
}

function baseContext(overrides: Partial<PoolContext> = {}): PoolContext {
	return {
		songSymbols: [],
		currentTier: 3,
		unlockedTiers: [1, 2, 3],
		stats: [],
		weakest: [],
		recentMisses: [],
		scaffolds: {},
		lastQualities: [],
		log: [],
		today: '2026-07-14',
		...overrides
	};
}

function drawMany(ctx: PoolContext, count: number, seed = 42) {
	const rng = mulberry32(seed);
	const draws = [];
	for (let i = 0; i < count; i++) {
		draws.push(drawFromPool(ctx, DEFAULT_POOL_CONFIG, rng));
	}
	return draws;
}

describe('bucket mix distribution (60/25/15 with an active song)', () => {
	it('approximates the R3 weights over many draws', () => {
		const ctx = baseContext({
			// In-tier song chords: no scaffolding in play.
			songSymbols: ['Cm7', 'F7', 'Bbmaj7', 'G7'],
			recentMisses: ['Dm7', 'Am7'],
			weakest: [chordStat('Em7', 6, 0.3)]
		});
		const draws = drawMany(ctx, 3000);
		const share = (bucket: string) =>
			draws.filter((draw) => draw.bucket === bucket).length / draws.length;

		expect(share('song')).toBeGreaterThan(0.55);
		expect(share('song')).toBeLessThan(0.65);
		expect(share('tier')).toBeGreaterThan(0.2);
		expect(share('tier')).toBeLessThan(0.3);
		expect(share('review')).toBeGreaterThan(0.1);
		expect(share('review')).toBeLessThan(0.2);
	});

	it('song draws come only from the song symbols', () => {
		const ctx = baseContext({ songSymbols: ['Cm7', 'F7'] });
		const songDraws = drawMany(ctx, 500).filter((draw) => draw.bucket === 'song');
		expect(songDraws.length).toBeGreaterThan(0);
		for (const draw of songDraws) {
			expect(['Cm7', 'F7']).toContain(draw.symbol);
		}
	});
});

describe('bucket mix without an active song (0/80/20)', () => {
	it('never draws the song bucket and splits roughly 80/20', () => {
		const ctx = baseContext({
			recentMisses: ['Dm7'],
			weakest: [chordStat('Em7', 6, 0.3)]
		});
		const draws = drawMany(ctx, 3000);
		expect(draws.every((draw) => draw.bucket !== 'song')).toBe(true);
		const tierShare = draws.filter((draw) => draw.bucket === 'tier').length / draws.length;
		expect(tierShare).toBeGreaterThan(0.75);
		expect(tierShare).toBeLessThan(0.85);
	});

	it('renormalizes to tier-only when the review bucket is empty too', () => {
		const ctx = baseContext({ currentTier: 1, unlockedTiers: [1] });
		const draws = drawMany(ctx, 300);
		expect(draws.every((draw) => draw.bucket === 'tier')).toBe(true);
	});
});

describe('tier bucket', () => {
	it('draws only items from unlocked tiers', () => {
		const ctx = baseContext({ currentTier: 1, unlockedTiers: [1] });
		const allowed = new Set(itemsForTiers([1]));
		for (const draw of drawMany(ctx, 300)) {
			if (draw.bucket === 'tier') expect(allowed.has(draw.symbol)).toBe(true);
		}
	});
});

describe('need-weighted song draw with 35% per-item cap', () => {
	it('caps a very weak chord near 35% of song draws instead of letting it monopolize', () => {
		const ctx = baseContext({
			songSymbols: ['Cm7', 'F7', 'G7', 'Bbmaj7'],
			stats: [
				chordStat('Cm7', 50, 0.0),
				chordStat('F7', 50, 1.0),
				chordStat('G7', 50, 1.0),
				chordStat('Bbmaj7', 50, 1.0)
			]
		});
		const songDraws = drawMany(ctx, 4000).filter((draw) => draw.bucket === 'song');
		const weakShare =
			songDraws.filter((draw) => draw.symbol === 'Cm7').length / songDraws.length;
		expect(weakShare).toBeGreaterThan(0.28);
		expect(weakShare).toBeLessThan(0.42);
	});

	it('unseen song chords are treated as 0.5 need (Laplace smoothing), drawing more than practiced ones', () => {
		const ctx = baseContext({
			songSymbols: ['Cm7', 'F7', 'G7', 'Bbmaj7'],
			// Cm7 unseen (need 0.5); the rest sit at 80% accuracy (need ~0.21).
			stats: [chordStat('F7', 50, 0.8), chordStat('G7', 50, 0.8), chordStat('Bbmaj7', 50, 0.8)]
		});
		const songDraws = drawMany(ctx, 4000).filter((draw) => draw.bucket === 'song');
		const share = (symbol: string) =>
			songDraws.filter((draw) => draw.symbol === symbol).length / songDraws.length;
		const unseenShare = share('Cm7');
		expect(unseenShare).toBeGreaterThan(0.3);
		for (const practiced of ['F7', 'G7', 'Bbmaj7']) {
			expect(unseenShare).toBeGreaterThan(share(practiced));
		}
	});
});

describe('interleaving constraint (max 2 same-quality in a row)', () => {
	it('never draws the same quality 3 times in a row when alternatives exist', () => {
		const rng = mulberry32(7);
		const lastQualities: string[] = [];
		const qualityOf = (symbol: string) => symbol.replace(/^[A-G][b#]?/, '');
		for (let i = 0; i < 500; i++) {
			const ctx = baseContext({ lastQualities: [...lastQualities] });
			const draw = drawFromPool(ctx, DEFAULT_POOL_CONFIG, rng);
			const quality = qualityOf(draw.symbol);
			if (lastQualities.length >= 2) {
				const [a, b] = lastQualities.slice(-2);
				if (a === b) expect(quality).not.toBe(a);
			}
			lastQualities.push(quality);
		}
	});
});

describe('review bucket', () => {
	it('serves recent misses and server weakest items', () => {
		const ctx = baseContext({
			currentTier: 1,
			unlockedTiers: [1],
			recentMisses: ['Dm'],
			weakest: [chordStat('Em', 6, 0.3)]
		});
		// Tier 1 has no lower tiers, so review candidates are exactly misses + weakest.
		const reviewDraws = drawMany(ctx, 2000).filter((draw) => draw.bucket === 'review');
		expect(reviewDraws.length).toBeGreaterThan(0);
		const symbols = new Set(reviewDraws.map((draw) => draw.symbol));
		expect([...symbols].every((symbol) => ['Dm', 'Em'].includes(symbol))).toBe(true);
	});

	it('includes stale lower-tier items not seen within staleDays', () => {
		const ctx = baseContext({
			currentTier: 3,
			unlockedTiers: [1, 2, 3],
			// Everything except C was seen today; C was last seen 10 days ago.
			log: itemsForTiers([1, 2])
				.filter((item) => item !== 'C')
				.map((item) => ({ item, correct: true, assisted: false, date: '2026-07-14' })),
			today: '2026-07-14'
		});
		const reviewDraws = drawMany(ctx, 3000).filter((draw) => draw.bucket === 'review');
		expect(reviewDraws.length).toBeGreaterThan(0);
		expect(reviewDraws.every((draw) => draw.symbol === 'C')).toBe(true);
	});
});

describe('above-tier song chords: scaffolding bypass', () => {
	it('an unseen above-tier song chord draws with scaffoldStage formula-first', () => {
		const ctx = baseContext({
			currentTier: 1,
			unlockedTiers: [1],
			songSymbols: ['F#m7b5']
		});
		const songDraws = drawMany(ctx, 200).filter((draw) => draw.bucket === 'song');
		expect(songDraws.length).toBeGreaterThan(0);
		for (const draw of songDraws) {
			expect(draw.symbol).toBe('F#m7b5');
			expect(draw.scaffoldStage).toBe('formula-first');
		}
	});

	it('a graduated above-tier chord draws with no scaffold stage', () => {
		const scaffolds: Record<string, ScaffoldState> = {
			'F#m7b5': { symbol: 'F#m7b5', exposures: 9, coldCorrectConstructions: 5 }
		};
		const ctx = baseContext({
			currentTier: 1,
			unlockedTiers: [1],
			songSymbols: ['F#m7b5'],
			scaffolds
		});
		const songDraws = drawMany(ctx, 200).filter((draw) => draw.bucket === 'song');
		expect(songDraws.length).toBeGreaterThan(0);
		expect(songDraws.every((draw) => draw.scaffoldStage === null)).toBe(true);
	});

	it('an in-tier song chord never scaffolds', () => {
		const ctx = baseContext({
			currentTier: 3,
			unlockedTiers: [1, 2, 3],
			songSymbols: ['Cm7']
		});
		const songDraws = drawMany(ctx, 200).filter((draw) => draw.bucket === 'song');
		expect(songDraws.every((draw) => draw.scaffoldStage === null)).toBe(true);
	});

	it('blocks a third unfamiliar quality while two are already in scaffolding', () => {
		const scaffolds: Record<string, ScaffoldState> = {
			Cmaj7: { symbol: 'Cmaj7', exposures: 2, coldCorrectConstructions: 0 },
			Dm7: { symbol: 'Dm7', exposures: 1, coldCorrectConstructions: 0 }
		};
		const ctx = baseContext({
			currentTier: 1,
			unlockedTiers: [1],
			songSymbols: ['Cmaj7', 'Dm7', 'G7', 'C'],
			scaffolds
		});
		// maj7 and m7 are in-flight; quality '7' (G7) must wait. C is tier 1, always fine.
		const songDraws = drawMany(ctx, 2000).filter((draw) => draw.bucket === 'song');
		expect(songDraws.length).toBeGreaterThan(0);
		expect(songDraws.every((draw) => draw.symbol !== 'G7')).toBe(true);
		expect(songDraws.some((draw) => draw.symbol === 'Cmaj7')).toBe(true);
		expect(songDraws.some((draw) => draw.symbol === 'C')).toBe(true);
	});

	it('an above-tier symbol with a FAMILIAR quality scaffolds per symbol but does not count against the quality guard', () => {
		const scaffolds: Record<string, ScaffoldState> = {
			Cmaj7: { symbol: 'Cmaj7', exposures: 2, coldCorrectConstructions: 0 },
			Dm7: { symbol: 'Dm7', exposures: 1, coldCorrectConstructions: 0 }
		};
		// Bbm: quality m is tier 1 (familiar), root Bb is outside tier 1 items.
		const ctx = baseContext({
			currentTier: 1,
			unlockedTiers: [1],
			songSymbols: ['Cmaj7', 'Dm7', 'Bbm'],
			scaffolds
		});
		const songDraws = drawMany(ctx, 2000).filter((draw) => draw.bucket === 'song');
		const bbmDraws = songDraws.filter((draw) => draw.symbol === 'Bbm');
		expect(bbmDraws.length).toBeGreaterThan(0);
		expect(bbmDraws.every((draw) => draw.scaffoldStage === 'formula-first')).toBe(true);
	});
});

describe('drawFromSymbols (SONG-02 restricted draw)', () => {
	it('returns null for an empty candidate set', () => {
		const ctx = baseContext();
		expect(drawFromSymbols([], ctx, DEFAULT_POOL_CONFIG, mulberry32(1))).toBeNull();
	});

	it('draws only from the passed symbols across many seeded draws, never a tier/review symbol outside the set', () => {
		const ctx = baseContext({
			currentTier: 3,
			unlockedTiers: [1, 2, 3],
			recentMisses: ['Dm7', 'Am7'],
			weakest: [{ item: 'Em7', kind: 'chord', attempts: 6, accuracy: 0.3, needsPractice: true }]
		});
		const rng = mulberry32(11);
		const allowed = new Set(['Cm7', 'F7', 'Bbmaj7']);
		for (let i = 0; i < 500; i++) {
			const symbol = drawFromSymbols(['Cm7', 'F7', 'Bbmaj7'], ctx, DEFAULT_POOL_CONFIG, rng);
			expect(symbol).not.toBeNull();
			expect(allowed.has(symbol as string)).toBe(true);
		}
	});

	it('favors a higher-need (lower-accuracy) symbol when stats are populated, capped near 35% per item', () => {
		const ctx = baseContext({
			stats: [
				chordStat('Cm7', 50, 0.0),
				chordStat('F7', 50, 1.0),
				chordStat('G7', 50, 1.0),
				chordStat('Bbmaj7', 50, 1.0)
			]
		});
		const rng = mulberry32(21);
		const symbols = ['Cm7', 'F7', 'G7', 'Bbmaj7'];
		const draws: string[] = [];
		for (let i = 0; i < 4000; i++) {
			draws.push(drawFromSymbols(symbols, ctx, DEFAULT_POOL_CONFIG, rng) as string);
		}
		const weakShare = draws.filter((symbol) => symbol === 'Cm7').length / draws.length;
		expect(weakShare).toBeGreaterThan(0.28);
		expect(weakShare).toBeLessThan(0.42);
	});

	it('honors the max-same-quality-run interleaving constraint', () => {
		const rng = mulberry32(33);
		const symbols = ['Cm7', 'Dm7', 'C', 'F'];
		const qualityOf = (symbol: string) => symbol.replace(/^[A-G][b#]?/, '');
		const lastQualities: string[] = [];
		for (let i = 0; i < 300; i++) {
			const ctx = baseContext({ lastQualities: [...lastQualities] });
			const symbol = drawFromSymbols(symbols, ctx, DEFAULT_POOL_CONFIG, rng) as string;
			const quality = qualityOf(symbol);
			if (lastQualities.length >= 2) {
				const [a, b] = lastQualities.slice(-2);
				if (a === b) expect(quality).not.toBe(a);
			}
			lastQualities.push(quality);
		}
	});

	it('is pure and deterministic under an injected rng', () => {
		const ctx = baseContext({ songSymbols: ['Cm7', 'F7', 'Bbmaj7'] });
		const symbols = ['Cm7', 'F7', 'Bbmaj7'];
		const first = drawFromSymbols(symbols, ctx, DEFAULT_POOL_CONFIG, mulberry32(99));
		const second = drawFromSymbols(symbols, ctx, DEFAULT_POOL_CONFIG, mulberry32(99));
		expect(first).toBe(second);
	});
});

describe('scaffoldStageForSymbol helper', () => {
	it('returns the ladder stage for above-tier symbols and null for in-tier or graduated ones', () => {
		const ctx = baseContext({ currentTier: 1, unlockedTiers: [1] });
		expect(scaffoldStageForSymbol(ctx, 'F#m7b5')).toBe('formula-first');
		expect(scaffoldStageForSymbol(ctx, 'C')).toBeNull();
		const graduated = baseContext({
			currentTier: 1,
			unlockedTiers: [1],
			scaffolds: {
				'F#m7b5': { symbol: 'F#m7b5', exposures: 9, coldCorrectConstructions: 5 }
			}
		});
		expect(scaffoldStageForSymbol(graduated, 'F#m7b5')).toBeNull();
	});
});
