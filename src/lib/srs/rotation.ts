import { State } from '$lib/srs/scheduler';
// Type-only import: erased at compile time. deck.ts imports this module's
// functions at runtime, so a runtime import here (`import ... from './deck'`)
// would create a circular dependency; the `type` keyword keeps this seam
// one-directional at runtime while still sharing deck.ts's Mode/CardRecord/
// FactKind shapes for type-checking.
import type { Mode, CardRecord, FactKind } from './deck';

/**
 * RECALL-03's pure rotation policy (D-06/D-07): teach-cluster composition,
 * the stagger gate that decides when a fact's ear-naming card unlocks, and
 * review-time weakest-path selection. No Dexie/Svelte/DOM imports - every
 * function here operates on CardRecord[] the caller already read, mirroring
 * session.ts's own purity convention so this module stays independently
 * unit-testable and reusable by any future queue-composition surface.
 */

/**
 * The set of modes taught together, back-to-back, when a fact is first
 * introduced (D-06 "rotate per-fact when teaching"). A chord-formula fact's
 * teach cluster is 'formula' (see the symbol) + 'see-play' (mode A: play the
 * notes) + 'formula-build' (mode C: Phase 12's construction, reused as a
 * recall mode). Every other fact kind (interval-size, scale-degree) keeps
 * Phase 11's original single-card seeding - only 'formula' is ever taught for
 * them, so they never enter this plan's teach-cluster/stagger machinery.
 */
export function teachClusterModes(factKind: FactKind): Mode[] {
	if (factKind === 'chord-formula') {
		return ['formula', 'see-play', 'formula-build'];
	}
	return ['formula'];
}

/**
 * True once EVERY mode in `clusterModes` has a matching card in
 * `cardsForFact` that has reached `State.Review` (D-06's stagger gate: the
 * cluster's modes graduate together; 'hear-name' - CONTEXT's mode B,
 * demoted/lowest-priority - unlocks only after). False if any cluster mode
 * is missing a card entirely, or has one that has not yet graduated past
 * State.New/Learning. Vacuously true for an empty `clusterModes` array,
 * matching interval-size/scale-degree facts' trivial single-mode case once
 * their one 'formula' card has graduated (not itself gating anything further
 * in this plan, but keeping the predicate total rather than a special case).
 */
export function clusterGraduated(cardsForFact: CardRecord[], clusterModes: Mode[]): boolean {
	return clusterModes.every((mode) =>
		cardsForFact.some((card) => card.mode === mode && card.state === State.Review)
	);
}

/** Ascending-by-stability comparator with 'hear-name' always sorted last (D-07). */
function compareReviewCards(a: CardRecord, b: CardRecord): number {
	const aIsHearName = a.mode === 'hear-name';
	const bIsHearName = b.mode === 'hear-name';
	if (aIsHearName !== bIsHearName) {
		return aIsHearName ? 1 : -1;
	}
	return a.stability - b.stability;
}

/**
 * RECALL-03's review-time selection (D-07 "weakest-path targeting" + "ear-
 * naming always lowest priority and never blocks"): every State.New (teach)
 * card for a fact passes through uncapped - a fact being taught should never
 * lose one of its cluster cards to a cap. Already-taught (non-New, i.e.
 * State.Review or State.Learning) due cards for the same fact are capped to
 * `maxPerFact`, ranked weakest-stability-first with 'hear-name' always sorted
 * to the end regardless of its own stability - so hear-name is the first
 * mode dropped by the cap, but a fact whose ONLY due non-New card is
 * 'hear-name' still gets it back (a lone survivor is never zeroed out).
 * Capping is independent per fact: one fact exceeding its cap never affects
 * another fact's own due cards.
 */
export function selectReviewCards(dueCards: CardRecord[], maxPerFact = 2): CardRecord[] {
	const byFact = new Map<string, CardRecord[]>();
	for (const card of dueCards) {
		const existing = byFact.get(card.factId);
		if (existing) {
			existing.push(card);
		} else {
			byFact.set(card.factId, [card]);
		}
	}

	const selected: CardRecord[] = [];
	for (const cardsForFact of byFact.values()) {
		const teachCards = cardsForFact.filter((card) => card.state === State.New);
		const reviewCards = cardsForFact
			.filter((card) => card.state !== State.New)
			.sort(compareReviewCards)
			.slice(0, maxPerFact);
		selected.push(...teachCards, ...reviewCards);
	}
	return selected;
}

/**
 * A chord-formula factId's root (matching '/^chord-formula:([A-G][#b]?)/' -
 * factIds use ASCII roots per the 11-02 decision), or null for any other
 * factKind (interval-size/scale-degree/scale-formula never impose a root
 * constraint on interleaveQueue below).
 */
function chordRootOf(factId: string): string | null {
	const match = /^chord-formula:([A-G][#b]?)/.exec(factId);
	return match ? match[1] : null;
}

/** One or more cards emitted together, atomically, by interleaveQueue's greedy pass. */
interface RotationUnit {
	cards: CardRecord[];
}

/**
 * Fisher-Yates shuffle driven by the injected rng, mirroring this module's
 * existing shuffle convention (RecallSession.svelte's own private copy).
 */
function shuffleUnits<T>(items: T[], rng: () => number): T[] {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

/**
 * RECALL-03's interleaving policy (BACKLOG-12): reorders a review queue so
 * the same fact is never drilled twice in a row (except while it is being
 * taught - a fact's State.New cards stay contiguous as one atomic unit, D-06)
 * and the same chord root never runs 3-in-a-row, defeating the "answer on
 * autopilot because the last three questions were all C-something" failure
 * mode. A permutation of `cards` - every input card appears exactly once in
 * the output, never dropped or duplicated.
 *
 * Algorithm: group each fact's State.New cards into one contiguous unit
 * (every other card is its own single-card unit), Fisher-Yates shuffle the
 * units for a randomized baseline order, then greedily emit them one at a
 * time. At each step, among the remaining units whose LEADING card's factId
 * differs from the last-emitted card's factId AND whose leading card's root
 * would not extend a same-root run to 3 (tracked over the flattened output
 * so far), the unit belonging to the root with the MOST remaining units is
 * chosen (ties broken by the shuffled order) - this "spend the scarcest
 * breaks last" preference is what keeps a heavily root-skewed queue (e.g.
 * many distinct facts all rooted on C) from exhausting its few
 * different-root units too early and dead-ending into an unavoidable 3-in-
 * a-row later (a plain first-satisfying-candidate walk can do exactly that -
 * caught empirically while implementing this task). If NO remaining unit
 * satisfies both constraints (a genuinely infeasible composition - e.g. a
 * single fact or every remaining unit sharing one root), the constraints
 * relax - the first remaining unit whose factId at least differs is emitted,
 * or failing that the very next remaining unit regardless - so the pass
 * always terminates rather than looping forever (T-0ex-03).
 */
export function interleaveQueue(
	cards: CardRecord[],
	rng: () => number = Math.random
): CardRecord[] {
	if (cards.length <= 1) return [...cards];

	const units: RotationUnit[] = [];
	const newClusterByFact = new Map<string, RotationUnit>();
	for (const card of cards) {
		if (card.state === State.New) {
			const existing = newClusterByFact.get(card.factId);
			if (existing) {
				existing.cards.push(card);
				continue;
			}
			const unit: RotationUnit = { cards: [card] };
			newClusterByFact.set(card.factId, unit);
			units.push(unit);
		} else {
			units.push({ cards: [card] });
		}
	}

	const pool = shuffleUnits(units, rng);
	const output: CardRecord[] = [];
	let lastFactId: string | undefined;
	let trailingRoot: string | null = null;
	let trailingRootRun = 0;

	while (pool.length > 0) {
		const remainingRootCounts = new Map<string, number>();
		for (const unit of pool) {
			const root = chordRootOf(unit.cards[0].factId);
			if (root === null) continue;
			remainingRootCounts.set(root, (remainingRootCounts.get(root) ?? 0) + 1);
		}

		let bestIndex = -1;
		let bestScore = -1;
		for (let i = 0; i < pool.length; i++) {
			const leadCard = pool[i].cards[0];
			if (leadCard.factId === lastFactId) continue;
			const leadRoot = chordRootOf(leadCard.factId);
			// A multi-card unit (a State.New teach cluster) emits ALL its cards
			// atomically and every card in it shares the same factId/root, so
			// picking it extends the trailing root run by the WHOLE unit's card
			// count, not just one - checking only `trailingRootRun >= 2` (as if
			// every unit were single-card) let a same-root teach cluster slip in
			// right after an already-2-long same-root run, producing a run of
			// trailingRootRun + unit.cards.length >= 3 (adversarial-review fix).
			const wouldExtendRootRunTo3 =
				leadRoot !== null &&
				leadRoot === trailingRoot &&
				trailingRootRun + pool[i].cards.length >= 3;
			if (wouldExtendRootRunTo3) continue;
			// A non-chord fact (null root) imposes no root constraint at all, so
			// it must never be treated as systematically lower-priority than a
			// chord fact - scored as a neutral 1 (same as a rare, once-remaining
			// chord root) rather than 0, which would otherwise always push every
			// interval-size/scale-degree card to the back of the queue whenever
			// any chord-formula card is present (caught empirically alongside
			// the same-root fix above).
			const score = leadRoot !== null ? (remainingRootCounts.get(leadRoot) ?? 0) : 1;
			if (score > bestScore) {
				bestScore = score;
				bestIndex = i;
			}
		}

		if (bestIndex === -1) {
			// Relax: no unit satisfies both constraints. Prefer at least
			// distinct-factId adjacency; failing even that (a single-fact
			// input), emit the very next remaining unit so the loop always
			// terminates.
			bestIndex = pool.findIndex((unit) => unit.cards[0].factId !== lastFactId);
			if (bestIndex === -1) bestIndex = 0;
		}

		const [unit] = pool.splice(bestIndex, 1);
		for (const card of unit.cards) {
			output.push(card);
			lastFactId = card.factId;
			const cardRoot = chordRootOf(card.factId);
			if (cardRoot !== null && cardRoot === trailingRoot) {
				trailingRootRun += 1;
			} else {
				trailingRoot = cardRoot;
				trailingRootRun = cardRoot !== null ? 1 : 0;
			}
		}
	}

	return output;
}
