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
