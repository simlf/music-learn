import { getAllCards, type CardRecord } from '$lib/srs/deck';
import { selectReviewCards, interleaveQueue } from '$lib/srs/rotation';
import { State } from '$lib/srs/scheduler';
import { factById } from '$lib/srs/facts';
import { symbolHasProvenance } from './songProvenance';
import { splitSymbol } from './tiers';
import {
	cardsToQueueItems,
	syntheticVoicingItems,
	sampleVoicingItems,
	SYNTHETIC_VOICING_COUNT,
	syntheticProgressionItems,
	syntheticInversionItems,
	syntheticChordScaleItems,
	isLowMasterySession,
	planRound,
	progressionTemplateTaught,
	type HybridQueueItem,
	type CardedQueueItem,
	type VoicingQueueItem,
	type InversionQueueItem,
	type ChordScaleQueueItem
} from './practiceQueue';

/**
 * The /practice round's composition, from the (song-filtered) due cards to
 * the planned round: everything `load()` used to do inline between fetching
 * the due set and handing the queue to the session glue. It lives here so the
 * multi-day practice simulation (dailyRound.sim.test.ts) replays the exact
 * code the page runs instead of a hand-kept copy of it, the same reason
 * reviewLoad.ts exists.
 *
 * Seeds stay the host's: it builds them (they need the one-shot channels),
 * passes them in so their facts and symbols are kept out of the plan, and
 * prepends them to the returned round.
 */

/**
 * How many candidates each of progression/inversion/chord-scale offers the
 * planner per round. These are no longer what reaches the round: the
 * planner's applied reserve (practiceQueue.appliedSlotsFor) is the cap, and
 * these counts only decide how much choice it has. Kept small all the same,
 * so a round never builds work it cannot ask. Voicing's candidates are
 * capped by practiceQueue's SYNTHETIC_VOICING_COUNT for the same reason.
 *
 * Progressions are the heaviest single item in the mix (a 4-bar
 * earn-the-symbol grid); inversions are one carded symbol per item; a
 * chord-scale item is one tap. Two of each was the per-round count when the
 * composer still cut the round by prefix, and stays the candidate count.
 */
export const SYNTHETIC_PROGRESSION_COUNT = 2;
export const SYNTHETIC_INVERSION_COUNT = 6;
export const SYNTHETIC_CHORD_SCALE_COUNT = 6;

export interface DailyRoundOptions {
	/** Questions the round may ask, seeds excluded (the host widens its budget for those separately). */
	target: number;
	/** The host's seeded items: they lead the round outside the plan, so the plan must not ask their facts or symbols again. */
	seededItems: CardedQueueItem[];
	songFilterOn: boolean;
	provenanceIndex: Map<string, string[]>;
	rng?: () => number;
}

export interface DailyRound {
	/** The planned round, seeds NOT included. */
	round: HybridQueueItem[];
	/** Due carded items the round leaves for later, including seeded facts' other due cards. */
	waiting: number;
	/** True when nothing practiceable was due at all (no carded and no synthetic item). */
	empty: boolean;
}

/** True once a chord's own cards include one that has reached State.Review. */
function hasMatured(cards: CardRecord[] | undefined): boolean {
	return cards?.some((card) => card.state === State.Review) ?? false;
}

/**
 * Builds the synthetic (applied) candidates for a round from the cards the
 * carded half selected.
 *
 * PRAC-05 single-type-due gate: synthetics are gated on the FSRS due signal,
 * not injected unconditionally. The due chord-formula symbols are read from
 * `selectedCards` (the actual carded half) - an interval-only due set yields
 * an empty set here, so every synthetic family stays empty and the session
 * surfaces intervals only.
 *
 * PRAC-06, extended: a chord is eligible for a voicing, inversion or
 * chord-scale item only once its OWN cards include one that reached
 * State.Review. A chord's cards are due the day it is introduced, so gating on
 * due-ness alone let a brand-new chord's applied item appear the very day the
 * chord was first seen. Voicing always had this gate; inversion and
 * chord-scale get it now that the planner reserves them a slot in every round
 * rather than leaving them to the rare quiet day that reached them.
 * voicingStageForChord's own meet/subtract/drill pedagogy is unchanged - only
 * whether the chord is a candidate at all.
 *
 * Progressions carry no single symbol: they are gated on the deck having
 * taught every chord quality the template uses (progressionTemplateTaught).
 */
export async function buildSyntheticItems(
	selectedCards: CardRecord[],
	options: Pick<DailyRoundOptions, 'songFilterOn' | 'provenanceIndex' | 'rng'>
): Promise<HybridQueueItem[]> {
	const rng = options.rng ?? Math.random;
	const songFiltered = options.songFilterOn && options.provenanceIndex.size > 0;

	const dueChordSymbols = new Set<string>();
	for (const card of selectedCards) {
		if (card.factKind !== 'chord-formula') continue;
		const fact = factById(card.factId);
		if (fact !== undefined && fact.factKind === 'chord-formula') {
			dueChordSymbols.add(fact.symbol);
		}
	}
	if (dueChordSymbols.size === 0) return [];

	const allCards = await getAllCards();
	const cardsBySymbol = new Map<string, CardRecord[]>();
	const taughtQualities = new Set<string>();
	for (const card of allCards) {
		if (card.factKind !== 'chord-formula') continue;
		const fact = factById(card.factId);
		if (fact === undefined || fact.factKind !== 'chord-formula') continue;
		const quality = splitSymbol(fact.symbol)?.quality;
		if (quality !== undefined) taughtQualities.add(quality);
		if (!dueChordSymbols.has(fact.symbol)) continue;
		const list = cardsBySymbol.get(fact.symbol);
		if (list) {
			list.push(card);
		} else {
			cardsBySymbol.set(fact.symbol, [card]);
		}
	}

	let maturedSymbols = [...dueChordSymbols].filter((symbol) => hasMatured(cardsBySymbol.get(symbol)));
	// Every symbol-carrying family (voicing, inversion, chord-scale) is
	// song-filterable through this one list; progressions, which carry no
	// single song chord to test, are omitted entirely under the filter rather
	// than guessed at (PRAC-04).
	if (songFiltered) {
		maturedSymbols = maturedSymbols.filter((symbol) =>
			symbolHasProvenance(symbol, options.provenanceIndex)
		);
	}
	const matured = new Set(maturedSymbols);

	let voicingItems: VoicingQueueItem[] = syntheticVoicingItems(cardsBySymbol).filter((item) =>
		matured.has(item.symbol)
	);
	// Voicing's builder is per-symbol and therefore unbounded (one item per due
	// seventh chord); the draw down to a small candidate count happens last,
	// after the eligibility filters, or it would be spent on items the filters
	// then discard - see sampleVoicingItems' docstring.
	voicingItems = sampleVoicingItems(voicingItems, SYNTHETIC_VOICING_COUNT, rng);

	const progressionItems: HybridQueueItem[] = songFiltered
		? []
		: syntheticProgressionItems(SYNTHETIC_PROGRESSION_COUNT, rng, (templateId) =>
				progressionTemplateTaught(templateId, taughtQualities)
			);

	const inversionItems: InversionQueueItem[] = syntheticInversionItems(
		maturedSymbols,
		SYNTHETIC_INVERSION_COUNT,
		rng
	);
	const chordScaleItems: ChordScaleQueueItem[] = syntheticChordScaleItems(
		maturedSymbols,
		SYNTHETIC_CHORD_SCALE_COUNT,
		rng
	);

	return [...voicingItems, ...progressionItems, ...inversionItems, ...chordScaleItems];
}

/**
 * Composes one round from the due cards: weakest-path selection and FSRS
 * interleave (srs/rotation), the carded queue items, the synthetic
 * candidates, then practiceQueue.planRound for what the round asks and in
 * which order.
 *
 * Seeded facts are dropped from the carded half before planning, so the
 * chord is drilled once, at the front, not twice. The dedup key is the
 * factId, not the item id: the seed deliberately asks a different MODE of the
 * same fact (see-play), so an id-keyed dedup would let the same chord be
 * asked twice in one round. A card dropped that way is still FSRS-due UNLESS
 * the seed asks that exact card (same fact, same mode): the seed replaces it
 * and grades it, so only the drops the seed does not itself ask are counted
 * into `waiting` - the rest would otherwise vanish from both the round and
 * the register. Seeded symbols are also excluded from the applied half, so a
 * requested chord is not asked again as an inversion or a voicing in the
 * same round.
 *
 * QUEUE-01: the session is cold/low-mastery when the carded half entering
 * the plan is mostly New/Learning (isLowMasterySession over the carded items,
 * not the raw cards, so a card cardsToQueueItems drops never skews it); the
 * plan then keeps a scaffold-heavy item out of the very first slot.
 */
export async function composeDailyRound(
	due: CardRecord[],
	options: DailyRoundOptions
): Promise<DailyRound> {
	const rng = options.rng ?? Math.random;
	const selectedCards = selectReviewCards(due);
	const orderedCards = interleaveQueue(selectedCards, rng);
	const cardedItems = cardsToQueueItems(orderedCards);
	const syntheticItems = await buildSyntheticItems(selectedCards, options);

	if (cardedItems.length === 0 && syntheticItems.length === 0) {
		return { round: [], waiting: 0, empty: true };
	}

	const lowMastery = isLowMasterySession(cardedItems.map((item) => item.card));

	const seedFactIds = new Set(options.seededItems.map((item) => item.factId));
	const seedItemIds = new Set(options.seededItems.map((item) => item.id));
	const seedSymbols = new Set(
		options.seededItems.flatMap((item) => (item.symbol === undefined ? [] : [item.symbol]))
	);
	const dedupedCarded = cardedItems.filter((item) => !seedFactIds.has(item.factId));
	const droppedStillDue = cardedItems.filter(
		(item) => seedFactIds.has(item.factId) && !seedItemIds.has(item.id)
	).length;

	const plan = planRound(dedupedCarded, syntheticItems, options.target, rng, {
		lowMastery,
		excludeSymbols: seedSymbols
	});
	return { round: plan.round, waiting: plan.waiting + droppedStillDue, empty: false };
}
