import { Rating, State } from '$lib/srs/scheduler';
import type { CardRecord, Mode, FactKind } from '$lib/srs/deck';
import { factById } from '$lib/srs/facts';
import { seventhChordSymbols, voicingStageForChord, type VoicingStage } from './shellVoicing';
import { PROGRESSION_TEMPLATES, PROGRESSION_KEYS, buildProgression } from './progressions';
import { inversionCountFor } from './inversions';

/**
 * The pure, DOM-free HYBRID queue composer (27-CONTEXT "Queue model =
 * HYBRID"): turns FSRS due-cards (the six carded families - name-it,
 * play-it, ear-it, build-it, interval, degree) plus synthetic, non-persisted voicing/progression
 * items into one interleaved practice queue. No Svelte, no DOM, no direct
 * Dexie/localStorage access - CardRecord/Mode/FactKind are type-only
 * imports from srs/deck and srs/facts (single-source, no re-implementation
 * of the real FSRS engine).
 *
 * Host call order (documented per the plan's action block):
 *   1. getDueCards() / getAllCards()          (host, Dexie read)
 *   2. selectReviewCards(due)                 (srs/rotation, weakness+cap)
 *   3. interleaveQueue(selected, rng)         (srs/rotation, FSRS ordering)
 *   4. cardsToQueueItems(orderedCards)        (this module)
 *   5. syntheticVoicingItems(symbolCards)     (this module)
 *   6. syntheticProgressionItems(count, rng)  (this module)
 *   7. composePracticeQueue(carded, synthetic, rng) (this module - FINAL
 *      cross-family weave only; carded items arrive already FSRS-ordered,
 *      this module never re-sorts them by anything but the variety weave,
 *      preserving PRAC-03).
 *   8. sliceRound(composed, target)            (this module - the bounded
 *      daily session's cut, order-preserving, reporting what it left)
 *
 * Grading/advance loop:
 *   9. advanceHybridQueue(queue, outcome, options) on every answer - mirrors
 *      srs/session.ts's advanceQueue Rating.Again re-enqueue contract for
 *      carded items; synthetic items are always consumed. `options` chooses
 *      between the legacy tail re-enqueue (default) and the delayed
 *      in-session retry a bounded round wants.
 *
 * Song filter (PRAC-04, WR-02): the carded half is restricted upstream of
 * this module, by the host's own applySongFilter over the raw due
 * CardRecord[] (before selectReviewCards/cardsToQueueItems even run); only
 * the synthetic voicing half is filtered inside this module, via
 * filterVoicingsBySong, before composePracticeQueue is called. This module
 * never reads the song filter preference itself (host-owned, per
 * 27-CONTEXT's "read the global pref once via readSongFilter()").
 */

/**
 * The nine practice-hub drill families (27-CONTEXT domain boundary;
 * 'inversion' added by Phase 35, INV-03 - synthetic, not carded; 'play-it'
 * and 'ear-it' added by T13, see familyForCard; 'degree' added by W1, which is
 * what finally made the catalog's 84 scale-degree facts reachable here).
 */
export type PracticeFamily =
	| 'name-it'
	| 'play-it'
	| 'ear-it'
	| 'build-it'
	| 'interval'
	| 'degree'
	| 'voicing'
	| 'progression'
	| 'inversion';

/** The six FSRS-backed families this module maps from a CardRecord. */
export type CardedFamily = 'name-it' | 'play-it' | 'ear-it' | 'build-it' | 'interval' | 'degree';

/**
 * The "scaffold-heavy" families (Phase 36's QUEUE-01 term, 36-CONTEXT):
 * progression and inversion both lean on a prior family's foundation
 * (spelling/voicing) rather than being answerable cold, and voicing (PRAC-06)
 * leans on the chord's own recognition having been internalized first - all
 * three are a bad first item for a low-mastery session. Their complement, the
 * "simpler" families, is name-it/play-it/ear-it/build-it/interval/degree.
 * Single source of truth: reused by composePracticeQueue's first-pick guard
 * below AND by the host/tests - never re-listed as a duplicated string
 * literal elsewhere.
 */
export const SCAFFOLD_HEAVY: ReadonlySet<PracticeFamily> = new Set([
	'progression',
	'inversion',
	'voicing'
]);

/**
 * The optional signal composePracticeQueue accepts as its 4th argument
 * (QUEUE-01). `lowMastery: true` tells the composer the host has detected a
 * cold/low-mastery session (see isLowMasterySession below) and the FIRST
 * emitted item should avoid a scaffold-heavy family when a simpler one is
 * available. Absent or `false` is today's warm/default behavior -
 * byte-identical output (REG-01).
 */
export interface ComposeOptions {
	lowMastery?: boolean;
}

/**
 * Pure signal helper (QUEUE-01): given the CardRecord[] a host has already
 * fetched for the session (Dexie read stays entirely the host's
 * responsibility - this function never reads Dexie or the FSRS engine
 * itself), returns whether the session counts as "low-mastery" (cold) for
 * composePracticeQueue's options.lowMastery.
 *
 * "Mature" reuses shellVoicing.ts's voicingStageForChord notion: a card has
 * reached State.Review. A session is low-mastery when it has at least one
 * card AND mature cards are a strict minority (`matureCount * 2 <
 * cards.length` - integer comparison, no float threshold, so the boundary
 * is exact: 1-of-3 is low-mastery, 2-of-3 is not). An empty array returns
 * false - no basis to call a session "cold" defaults to warm, the
 * REG-01-safe choice.
 */
export function isLowMasterySession(cards: CardRecord[]): boolean {
	if (cards.length === 0) return false;
	const matureCount = cards.filter((card) => card.state === State.Review).length;
	return matureCount * 2 < cards.length;
}

/** A queue item backed by a real FSRS CardRecord - the host commits its grade via srs/deck.recordGrade. */
export interface CardedQueueItem {
	id: string;
	family: CardedFamily;
	factId: string;
	mode: Mode;
	factKind: FactKind;
	/** The chord symbol, populated for chord-formula (name-it/build-it) items only. */
	symbol?: string;
	/** The interval short code, populated for interval-size (interval) items only. */
	short?: string;
	/** The scale tonic in display glyphs, populated for scale-degree (degree) items only. */
	tonic?: string;
	/** The scale degree 1..7, populated for scale-degree (degree) items only. */
	degree?: number;
	card: CardRecord;
}

/** A synthetic (non-persisted) voicing queue item, staged by the chord's own card maturity. */
export interface VoicingQueueItem {
	id: string;
	family: 'voicing';
	symbol: string;
	stage: VoicingStage;
}

/** A synthetic (non-persisted) progression queue item: one template+key pair. */
export interface ProgressionQueueItem {
	id: string;
	family: 'progression';
	templateId: string;
	key: string;
}

/** A synthetic (non-persisted) inversion queue item: one symbol+inversionIndex pair (Phase 35, INV-03). */
export interface InversionQueueItem {
	id: string;
	family: 'inversion';
	symbol: string;
	inversionIndex: number;
}

/** The discriminated union every composed queue slot is one of. */
export type HybridQueueItem = CardedQueueItem | VoicingQueueItem | ProgressionQueueItem | InversionQueueItem;

/**
 * Maps a CardRecord to its practice family: ONE family per chord-formula
 * MODE, plus 'interval' for interval-size and 'degree' for scale-degree
 * regardless of mode, plus null for scale-formula (a factId shape the catalog
 * deliberately does not hold, so no card of that kind can be asked here).
 *
 * W1 (the scale-degree blackout): this returned null for `scale-degree` too,
 * and cardsToQueueItems drops null-family cards, so all 84 scale-degree
 * facts - 44% of the 192-fact catalog - were introduced into the deck by
 * introduceNewCards and then never appeared on /practice at all. They were
 * gradable only inside RecallSession, which is several taps deep in Progress
 * and rarely visited, so for a user who lives on /practice they were
 * permanently-due dead weight: cards accruing lapses against material the
 * primary surface would never ask. `composed.length === 0` could even render
 * "Nothing due today" while that work sat unreachable.
 *
 * Returning 'degree' here is the single line that fixes it. Everything
 * downstream follows automatically, including backlogFactCount below (those
 * facts now count as real, clearable backlog because they finally are) and
 * srs/curriculum.ts, which no longer has to park them at the tail of the
 * teaching order to avoid spending the daily budget on invisible cards.
 *
 * T13 (mode collapse): this used to fold formula, see-play and hear-name into
 * a single 'name-it' family, and the host rendered every one of them as the
 * same 4-choice identification question. So three modes that the deck seeds
 * separately, schedules separately, and believes it is training separately
 * produced BYTE-IDENTICAL items - on day one, ~20 multiple-choice questions
 * over 10 symbols, each symbol asked twice with the same four chips. Two of
 * the three skills the deck thinks it trains were never practiced at all.
 *
 * The mapping is now one family per mode, so a family is again what its name
 * says: one kind of question.
 *   - 'name-it'  <- 'formula'    : see the notes, name the chord (choices)
 *   - 'play-it'  <- 'see-play'   : see the symbol, play the notes (keyboard)
 *   - 'ear-it'   <- 'hear-name'  : hear the chord, name it (choices)
 *   - 'build-it' <- 'formula-build': the step-by-step construction flow
 *
 * The scale-degree fact kind takes the opposite shape on purpose: ONE family
 * over ONE card, with the question DIRECTION drawn per appearance
 * (practice/degreeQuestion.ts). That is the interval family's proven pattern,
 * not this mode-collapse defect: the deck seeds a single mode for a
 * scale-degree fact, so there are no separately-scheduled modes here to
 * flatten. See degreeQuestion.ts for the full trade against a second Mode.
 *
 * This is a RENDER-ROUTING change only. Nothing here touches how a card is
 * scheduled: the host still commits the same Rating for the same (factId,
 * mode) card through the same recordGrade call (REG-01).
 *
 * It also makes composePracticeQueue's variety weave honest again: three
 * separate FIFOs of ~10 items each now rotate against build-it/interval/
 * voicing, where before one 20-item 'name-it' FIFO dominated the
 * "most items remaining" preference.
 */
export function familyForCard(card: CardRecord): CardedFamily | null {
	if (card.factKind === 'chord-formula') {
		switch (card.mode) {
			case 'formula-build':
				return 'build-it';
			case 'see-play':
				return 'play-it';
			case 'hear-name':
				return 'ear-it';
			default:
				return 'name-it';
		}
	}
	if (card.factKind === 'interval-size') {
		return 'interval';
	}
	if (card.factKind === 'scale-degree') {
		return 'degree';
	}
	return null;
}

/**
 * The due-backlog gate's threshold, in FACTS.
 *
 * T13 fixed a UNITS bug at the host's call site: the gate compared a CARD count
 * against 20, but the budget it gates (introBudget's MAX_NEW_CARDS_PER_DAY) is a
 * FACT budget of 10 a day, and a chord fact seeds a teach cluster of 3 cards. So
 * one day's own introduction is about 30 cards, and every single day a cohort
 * came back the gate saw 30 > 20 and locked new material out. From roughly day 4
 * intake self-throttled into a stop-start pattern with no visible cause.
 *
 * 20 is kept, but it is now 2 x MAX_NEW_CARDS_PER_DAY in the SAME unit as the
 * budget, which makes it a real rule instead of a coincidence: one unpracticed
 * day of intake is 10 facts and passes, two days is 20 and still passes (`>`,
 * not `>=`), three days is 30 and is a genuine backlog worth clearing before
 * growing the deck further.
 *
 * Deliberately a literal rather than an import of MAX_NEW_CARDS_PER_DAY: every
 * host test mocks `$lib/srs/introBudget` down to two functions, so importing the
 * constant here would silently resolve to undefined inside those tests and turn
 * the comparison into `> NaN` (a gate that never fires, invisibly). The
 * relationship is protected by an assertion in practiceQueue.test.ts against the
 * real constant instead, which cannot be mocked away.
 */
export const DUE_BACKLOG_GATE_FACTS = 20;

/**
 * How many distinct FACTS have a due card this practice surface can actually
 * ask: the gate's own measure of "backlog".
 *
 * The familyForCard filter is the rule, not defensive decoration: a card this
 * surface cannot ask is not a backlog the user can clear, so it must not gate.
 * Counting unaskable cards would let a growing pile of them permanently freeze
 * new intake, a worse version of the very bug the gate was written to fix.
 *
 * That filter used to drop all 84 scale-degree facts, which was the whole
 * reason it existed. W1 gave those facts a real family, so they now count here
 * automatically, with no change at this call site and none needed - they are
 * genuine, clearable backlog today. The filter stays because the rule stays:
 * the moment any future fact kind is seeded before its question surface exists,
 * it must not be able to freeze intake either.
 */
export function backlogFactCount(due: CardRecord[]): number {
	const facts = new Set<string>();
	for (const card of due) {
		if (familyForCard(card) === null) continue;
		facts.add(card.factId);
	}
	return facts.size;
}

/** Stable queue-item id for a carded (FSRS) item: `fsrs:{factId}:{mode}`. */
function cardedItemId(factId: string, mode: Mode): string {
	return `fsrs:${factId}:${mode}`;
}

/**
 * Maps already-FSRS-ordered cards to CardedQueueItems, preserving input
 * order and dropping any card whose family is excluded (familyForCard
 * returns null). Derives `symbol`/`short`/`tonic`+`degree` via
 * factById(factId) - never by string-slicing the factId - so a chord-formula
 * card gets its `symbol`, an interval-size card gets its `short`, and a
 * scale-degree card gets its `tonic` and `degree`.
 */
export function cardsToQueueItems(orderedCards: CardRecord[]): CardedQueueItem[] {
	const items: CardedQueueItem[] = [];
	for (const card of orderedCards) {
		const family = familyForCard(card);
		if (family === null) continue;

		const fact = factById(card.factId);
		const symbol = fact !== undefined && fact.factKind === 'chord-formula' ? fact.symbol : undefined;
		const short = fact !== undefined && fact.factKind === 'interval-size' ? fact.short : undefined;
		const isScaleDegree = fact !== undefined && fact.factKind === 'scale-degree';
		const tonic = isScaleDegree ? fact.tonic : undefined;
		const degree = isScaleDegree ? fact.degree : undefined;

		items.push({
			id: cardedItemId(card.factId, card.mode),
			family,
			factId: card.factId,
			mode: card.mode,
			factKind: card.factKind,
			symbol,
			short,
			tonic,
			degree,
			card
		});
	}
	return items;
}

/**
 * Builds one VoicingQueueItem per seventh-chord symbol (shellVoicing.ts's
 * seventhChordSymbols()), staged via voicingStageForChord over the
 * caller-supplied CardRecord[] for that symbol (`symbolCards.get(symbol) ??
 * []` when the symbol has no cards yet). Pure: never reads Dexie itself -
 * the caller owns fetching cards per symbol via srs/deck.ts.
 */
export function syntheticVoicingItems(symbolCards: Map<string, CardRecord[]>): VoicingQueueItem[] {
	return seventhChordSymbols().map((symbol) => ({
		id: `voicing:${symbol}`,
		family: 'voicing',
		symbol,
		stage: voicingStageForChord(symbolCards.get(symbol) ?? [])
	}));
}

/** Fisher-Yates shuffle driven by the injected rng, mirroring srs/rotation.ts's shuffle convention. */
function shuffleWithRng<T>(items: T[], rng: () => number): T[] {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

/**
 * Draws `count` distinct template+key pairs from PROGRESSION_TEMPLATES x
 * PROGRESSION_KEYS via the injected rng, keeping only pairs whose
 * buildProgression is non-empty (T-25-01-01's own guard against a malformed
 * symbol - never surfaced here, just skipped). Never re-derives chord
 * symbols itself; delegates entirely to progressions.ts's proven generator.
 */
export function syntheticProgressionItems(
	count: number,
	rng: () => number = Math.random
): ProgressionQueueItem[] {
	const allPairs: { templateId: string; key: string }[] = [];
	for (const template of PROGRESSION_TEMPLATES) {
		for (const key of PROGRESSION_KEYS) {
			allPairs.push({ templateId: template.id, key });
		}
	}

	const shuffled = shuffleWithRng(allPairs, rng);
	const items: ProgressionQueueItem[] = [];
	for (const pair of shuffled) {
		if (items.length >= count) break;
		if (buildProgression(pair.templateId, pair.key).length === 0) continue;
		items.push({
			id: `prog:${pair.templateId}:${pair.key}`,
			family: 'progression',
			templateId: pair.templateId,
			key: pair.key
		});
	}
	return items;
}

/**
 * Draws up to `count` distinct {symbol, inversionIndex} pairs from every
 * candidate symbol's valid inversion range (0 to inversionCountFor(symbol) -
 * 1, from Plan 35-01's inversions.ts - never re-derived here), via the
 * injected rng, mirroring syntheticProgressionItems' enumerate-shuffle-take
 * idiom. A symbol with inversionCountFor === 0 (unrecognized) contributes no
 * pairs. An empty `candidateSymbols` yields [] (PRAC-05's single-type-due
 * gate: no inversions drawn when none are due).
 */
export function syntheticInversionItems(
	candidateSymbols: string[],
	count: number,
	rng: () => number = Math.random
): InversionQueueItem[] {
	const allPairs: { symbol: string; inversionIndex: number }[] = [];
	for (const symbol of candidateSymbols) {
		const total = inversionCountFor(symbol);
		for (let inversionIndex = 0; inversionIndex < total; inversionIndex++) {
			allPairs.push({ symbol, inversionIndex });
		}
	}

	const shuffled = shuffleWithRng(allPairs, rng);
	const items: InversionQueueItem[] = [];
	for (const pair of shuffled) {
		if (items.length >= count) break;
		items.push({
			id: `inversion:${pair.symbol}:${pair.inversionIndex}`,
			family: 'inversion',
			symbol: pair.symbol,
			inversionIndex: pair.inversionIndex
		});
	}
	return items;
}

/**
 * The `symbol` a HybridQueueItem carries, or undefined for a
 * ProgressionQueueItem (which has no symbol field at all). Narrows on the
 * `family` discriminant rather than a structural check, mirroring
 * isCardedItem's own discriminant-narrowing convention below.
 */
function itemSymbol(item: HybridQueueItem): string | undefined {
	if (item.family === 'progression') return undefined;
	return item.symbol;
}

/**
 * Weaves `cardedItems` and `syntheticItems` into one interleaved queue: a
 * permutation of every input item (none dropped or duplicated), preserving
 * each family's own within-list relative order, and avoiding a single
 * family running 3-in-a-row when 2+ families are present. With a single
 * family present, returns that family's items unchanged (PRAC-05's
 * single-type-due gate: no artificial variety injection, no padding).
 *
 * Algorithm mirrors srs/rotation.ts's interleaveQueue greedy-with-relaxation
 * pattern, re-expressed locally over PracticeFamily instead of chord root:
 * group items into one FIFO queue per family (preserving arrival order),
 * shuffle the family iteration order once via the injected rng (tie-break
 * baseline, matching interleaveQueue's own shuffle-then-greedy convention),
 * then greedily emit one item at a time - among families whose next pick
 * would NOT extend the trailing same-family run to 3, prefer the family
 * with the MOST items remaining (spend the scarcest family's items last, so
 * a heavily family-skewed queue doesn't dead-end into an unavoidable
 * 3-in-a-row later). If no family satisfies that constraint (a genuinely
 * infeasible composition), relax to any family different from the trailing
 * one, or failing that (a single remaining family) whichever family still
 * has items - so the pass always terminates (T-27-01-01) rather than
 * looping forever.
 *
 * Same-symbol anti-adjacency (UAT G2): a chord's teach cluster spans
 * several modes (formula, see-play, ...) that all map to the SAME family
 * (familyForCard) but carry the SAME `symbol` - e.g. two name-it items for
 * "Cm7". The family-run rule above never looks at `symbol`, so those two
 * items could still land front-to-front and read as "the same chord
 * twice." Among the families eligible under the no-3-in-a-row rule, this
 * skips any whose NEXT item shares the immediately-previous placed item's
 * symbol, as long as at least one other eligible family's next item has a
 * different (or no) symbol. When every eligible family's next item shares
 * the trailing symbol (no alternative - e.g. a single symbol genuinely due
 * across every family), the repeat is allowed rather than blocking
 * progress, preserving PRAC-05.
 */
export function composePracticeQueue(
	cardedItems: HybridQueueItem[],
	syntheticItems: HybridQueueItem[],
	rng: () => number = Math.random,
	options: ComposeOptions = {}
): HybridQueueItem[] {
	const all = [...cardedItems, ...syntheticItems];

	const byFamily = new Map<PracticeFamily, HybridQueueItem[]>();
	for (const item of all) {
		const list = byFamily.get(item.family);
		if (list) {
			list.push(item);
		} else {
			byFamily.set(item.family, [item]);
		}
	}

	if (byFamily.size <= 1) return all;

	const familyOrder = shuffleWithRng([...byFamily.keys()], rng);
	const output: HybridQueueItem[] = [];
	let trailingFamily: PracticeFamily | undefined;
	let trailingRun = 0;
	let trailingSymbol: string | undefined;

	while (output.length < all.length) {
		const eligible: PracticeFamily[] = [];
		for (const family of familyOrder) {
			const items = byFamily.get(family);
			if (items === undefined || items.length === 0) continue;
			const wouldExtendRunTo3 = family === trailingFamily && trailingRun >= 2;
			if (wouldExtendRunTo3) continue;
			eligible.push(family);
		}

		// G2: among the eligible families, prefer ones whose next item would
		// NOT repeat the trailing symbol - but only when such an alternative
		// exists; otherwise fall back to every eligible family (allow the
		// repeat, e.g. a single symbol genuinely due).
		const nonRepeating = eligible.filter((family) => {
			const front = byFamily.get(family)?.[0];
			if (front === undefined) return false;
			const frontSymbol = itemSymbol(front);
			return trailingSymbol === undefined || frontSymbol === undefined || frontSymbol !== trailingSymbol;
		});
		const candidateFamilies = nonRepeating.length > 0 ? nonRepeating : eligible;

		// QUEUE-01 first-pick guard: scoped to output.length === 0 (the very
		// first emitted item only) because the cold-session guarantee only
		// constrains the session's opening item - every later pick, and the
		// entire warm/default path, must stay byte-identical (REG-01). When a
		// simpler (non-scaffold-heavy) family is among candidateFamilies,
		// restrict the pick to that subset; when every candidate is
		// scaffold-heavy (no simpler family due yet), fall through to the full
		// candidateFamilies unchanged - a cold session with only
		// progression/inversion due leads with one of them, same as today.
		let pickFrom = candidateFamilies;
		if (options.lowMastery === true && output.length === 0) {
			const simpler = candidateFamilies.filter((family) => !SCAFFOLD_HEAVY.has(family));
			if (simpler.length > 0) {
				pickFrom = simpler;
			}
		}

		let bestFamily: PracticeFamily | undefined;
		let bestScore = -1;
		for (const family of pickFrom) {
			const items = byFamily.get(family);
			if (items === undefined) continue;
			const score = items.length;
			if (score > bestScore) {
				bestScore = score;
				bestFamily = family;
			}
		}

		if (bestFamily === undefined) {
			// Relax: no family satisfies the no-3-in-a-row constraint. Prefer a
			// family different from the trailing one; failing that (a single
			// remaining family), pick whichever family still has items so the
			// loop always terminates.
			bestFamily = familyOrder.find((family) => {
				const items = byFamily.get(family);
				return items !== undefined && items.length > 0 && family !== trailingFamily;
			});
			if (bestFamily === undefined) {
				bestFamily = familyOrder.find((family) => {
					const items = byFamily.get(family);
					return items !== undefined && items.length > 0;
				});
			}
		}

		// Unreachable while output.length < all.length: some family always has
		// remaining items, so bestFamily is always found above.
		/* istanbul ignore next */
		if (bestFamily === undefined) break;

		const items = byFamily.get(bestFamily);
		/* istanbul ignore next */
		if (items === undefined) break;
		const next = items.shift();
		/* istanbul ignore next */
		if (next === undefined) break;
		output.push(next);

		if (bestFamily === trailingFamily) {
			trailingRun += 1;
		} else {
			trailingFamily = bestFamily;
			trailingRun = 1;
		}
		trailingSymbol = itemSymbol(next);
	}

	return output;
}

/**
 * The bounded round's slice of a composed queue: the items THIS round will
 * ask, and how many composed items it deliberately left for later.
 */
export interface RoundSlice {
	round: HybridQueueItem[];
	/** Composed items the round does not include. Surfaced honestly on the pre-start card, never hidden. */
	waiting: number;
}

/**
 * Cuts a composed queue down to at most `target` items (the bounded daily
 * session). Pure and order-preserving: the round is the composed queue's own
 * prefix, so the composer's variety weave, its low-mastery first-pick guard,
 * and the seeded items it leads with all survive the cut intact - this
 * function never re-orders, never re-picks, and never drops an item without
 * counting it in `waiting`.
 *
 * A non-positive or non-finite target yields an empty round with everything
 * waiting (the caller's "today is already done" branch); a target at or above
 * the queue length yields the whole queue with nothing waiting.
 */
export function sliceRound(queue: HybridQueueItem[], target: number): RoundSlice {
	const bounded = Number.isFinite(target) ? Math.max(0, Math.floor(target)) : 0;
	const size = Math.min(bounded, queue.length);
	return { round: queue.slice(0, size), waiting: queue.length - size };
}

/**
 * The in-session retry gap (srs/session.ts's DEFAULT_SESSION_CONFIG values,
 * reused verbatim): a missed item comes back 2 to 4 questions later. Far
 * enough to be a real retrieval event rather than an immediate short-term
 * memory echo, near enough to still be the same sitting.
 */
export const RETRY_MIN_GAP = 2;
export const RETRY_MAX_GAP = 4;

/** How advanceHybridQueue should re-queue a missed (Again-graded) carded item. */
export interface AdvanceOptions {
	/**
	 * Opt in to the DELAYED retry: the missed item is re-inserted this many
	 * questions ahead (up to retryMaxGap, rng-drawn) instead of appended to
	 * the tail. Omitted = the legacy tail re-enqueue, byte-identical to the
	 * pre-existing two-argument contract (REG-01: every existing caller and
	 * test keeps exactly the behavior it asserted).
	 */
	retryMinGap?: number;
	retryMaxGap?: number;
	rng?: () => number;
}

/** The six FSRS-backed families, as a runtime set. Single source for isCardedItem below and for callers that need the same test. */
const CARDED_FAMILIES: ReadonlySet<PracticeFamily> = new Set<PracticeFamily>([
	'name-it',
	'play-it',
	'ear-it',
	'build-it',
	'interval',
	'degree'
]);

/** True for the six FSRS-backed families (a CardedQueueItem), false for synthetic ones. */
function isCardedItem(item: HybridQueueItem): item is CardedQueueItem {
	return CARDED_FAMILIES.has(item.family);
}

/**
 * Removes the front item of `queue`. Mirrors srs/session.ts's advanceQueue
 * D-10 contract: re-enqueues the front item only when it is a
 * CardedQueueItem AND `outcome === Rating.Again`; every synthetic item and
 * every non-Again outcome is consumed without re-enqueue. Never mutates the
 * input array - always returns a new one.
 *
 * Where the re-enqueue LANDS depends on `options`. Without them the item goes
 * to the tail (the original contract). With `retryMinGap`/`retryMaxGap` it is
 * inserted `gap` questions ahead - the delayed in-session retry - which is
 * what a bounded round wants: a tail re-enqueue pushes the retry behind every
 * remaining item (so a round that is capped by question count may never get
 * back to it), while a 2-to-4 gap re-asks it inside the same round, in the
 * window where the correction still means something. A gap longer than the
 * remaining queue appends, so the retry is never dropped.
 */
export function advanceHybridQueue(
	queue: HybridQueueItem[],
	outcome: Rating,
	options: AdvanceOptions = {}
): HybridQueueItem[] {
	if (queue.length === 0) return queue;
	const [current, ...rest] = queue;
	if (!isCardedItem(current) || outcome !== Rating.Again) return rest;

	const minGap = options.retryMinGap;
	if (minGap === undefined) return [...rest, current];

	const boundedMin = Math.max(1, Math.floor(minGap));
	const boundedMax = Math.max(boundedMin, Math.floor(options.retryMaxGap ?? boundedMin));
	const rng = options.rng ?? Math.random;
	const gap = boundedMin + Math.floor(rng() * (boundedMax - boundedMin + 1));
	// gap counts QUESTIONS from now, and the item just left slot 0, so a gap
	// of 2 means "one other question, then this again" = index 1.
	const index = Math.min(gap - 1, rest.length);
	return [...rest.slice(0, index), current, ...rest.slice(index)];
}

/** Keeps only voicing items whose symbol satisfies `predicate` (PRAC-04's synthetic-half restriction). */
export function filterVoicingsBySong(
	items: VoicingQueueItem[],
	predicate: (symbol: string) => boolean
): VoicingQueueItem[] {
	return items.filter((item) => predicate(item.symbol));
}

/** Keeps only inversion items whose symbol satisfies `predicate` (PRAC-04's synthetic-half restriction, mirrors filterVoicingsBySong). */
export function filterInversionsBySong(
	items: InversionQueueItem[],
	predicate: (symbol: string) => boolean
): InversionQueueItem[] {
	return items.filter((item) => predicate(item.symbol));
}

/** The set of practice families present in `queue`. */
export function familiesInQueue(queue: HybridQueueItem[]): Set<PracticeFamily> {
	return new Set(queue.map((item) => item.family));
}

/** True once the queue has no items left to grade/consume. Mirrors srs/session.ts's isSessionComplete. */
export function isHybridSessionComplete(queue: HybridQueueItem[]): boolean {
	return queue.length === 0;
}

/** The "N LEFT" remaining-items count. Mirrors srs/session.ts's sessionRemaining. */
export function hybridSessionRemaining(queue: HybridQueueItem[]): number {
	return queue.length;
}
