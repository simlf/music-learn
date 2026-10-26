import { Rating, State } from '$lib/srs/scheduler';
import type { CardRecord, Mode, FactKind } from '$lib/srs/deck';
import { factById } from '$lib/srs/facts';
import { seventhChordSymbols, voicingStageForChord, type VoicingStage } from './shellVoicing';
import { PROGRESSION_TEMPLATES, PROGRESSION_KEYS, buildProgression } from './progressions';
import { inversionCountFor } from './inversions';
import { isChordScaleQuestionAnswerable, generateChordScaleQuestion } from './chordScaleQuestion';

/**
 * The pure, DOM-free HYBRID queue composer (27-CONTEXT "Queue model =
 * HYBRID"): turns FSRS due-cards (the six carded families - name-it,
 * play-it, ear-it, build-it, interval, degree) plus synthetic, non-persisted voicing/progression
 * items into one interleaved practice queue. No Svelte, no DOM, no direct
 * Dexie/localStorage access - CardRecord/Mode/FactKind are type-only
 * imports from srs/deck and srs/facts (single-source, no re-implementation
 * of the real FSRS engine).
 *
 * Host call order (practice/dailyRound.ts runs steps 2-7 for /practice):
 *   1. getDueCards() / getAllCards()          (host, Dexie read)
 *   2. selectReviewCards(due)                 (srs/rotation, weakness+cap)
 *   3. interleaveQueue(selected, rng)         (srs/rotation, FSRS ordering)
 *   4. cardsToQueueItems(orderedCards)        (this module)
 *   5. syntheticVoicingItems(symbolCards)     (this module), then, after the
 *      eligibility filters, sampleVoicingItems(items,
 *      SYNTHETIC_VOICING_COUNT, rng) (this module - the candidate draw)
 *   6. syntheticProgressionItems/syntheticInversionItems/
 *      syntheticChordScaleItems                (this module - candidates)
 *   7. planRound(carded, synthetic, target, rng) (this module - WHICH items
 *      the bounded round asks, then the order: composePracticeQueue's
 *      cross-family weave over the carded picks, which arrive already
 *      FSRS-ordered and are never re-sorted by anything but that weave,
 *      preserving PRAC-03; the applied picks spread through it)
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
 * The ten practice-hub drill families (27-CONTEXT domain boundary;
 * 'inversion' added by Phase 35, INV-03 - synthetic, not carded; 'play-it'
 * and 'ear-it' added by T13, see familyForCard; 'degree' added by W1, which is
 * what finally made the catalog's 84 scale-degree facts reachable here;
 * 'chord-scale' added by ml-modes-practice - synthetic, not carded, same
 * shape as voicing/inversion: no FactKind, no Dexie schema, staged by the
 * drilled chord's own card via the due-symbol gate at the host).
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
	| 'inversion'
	| 'chord-scale';

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

/** A synthetic (non-persisted) chord-scale queue item: one chord symbol (ml-modes-practice). */
export interface ChordScaleQueueItem {
	id: string;
	family: 'chord-scale';
	symbol: string;
}

/** The discriminated union every composed queue slot is one of. */
export type HybridQueueItem =
	| CardedQueueItem
	| VoicingQueueItem
	| ProgressionQueueItem
	| InversionQueueItem
	| ChordScaleQueueItem;

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

/**
 * How many voicing candidates one round draws, the counterpart of the other
 * synthetic families' candidate counts (dailyRound.ts's
 * SYNTHETIC_PROGRESSION_COUNT and friends). What actually reaches the round is
 * capped by planRound's applied reserve (appliedSlotsFor); this count keeps
 * the candidate pool small. It lives here so sampleVoicingItems' composition
 * regression test and dailyRound.ts can never disagree about it (the
 * RETRY_MIN_GAP/RETRY_MAX_GAP precedent for host-consumed constants).
 */
export const SYNTHETIC_VOICING_COUNT = 2;

/**
 * Draws up to `count` voicing items from `items` via the injected rng: the
 * shuffle-take half of the enumerate-shuffle-take idiom the other synthetic
 * families already use. Progression/inversion/chord-scale draw inside their
 * builders; voicing cannot, because its eligibility filters (the host's
 * review-maturity gate and the song filter) apply AFTER syntheticVoicingItems
 * builds the per-symbol items, so the draw has to come last or the cap would
 * be spent on items the filters then discard.
 *
 * WHY A CAP EXISTS AT ALL (the stuck-progression defect this closes):
 * syntheticVoicingItems builds one item per due seventh-chord symbol, which
 * is unbounded. At tier 3+ a normal day holds 10-40 due seventh symbols, and
 * composePracticeQueue's most-items-remaining preference then hands the
 * voicing family two of every three slots of a DAILY_TARGET-bounded round
 * (8 of 12). A voicing completion deliberately commits no FSRS grade
 * (T-27-05-01), so the cards that made those symbols due stay due, the same
 * symbols re-qualify the next day, the due-fact backlog never falls back
 * under DUE_BACKLOG_GATE_FACTS, and new-material introduction starves while
 * the round replays the same chords' voicings. Capping the DRAW (never the
 * eligibility, the grading contract, or the gate) restores the round's
 * scheduler throughput; simulated over an always-correct daily user, tier
 * 3-to-4 fell from 103 to 38 days and the worst same-chord repeat fell from
 * 34 to 3 appearances in 60 days.
 */
export function sampleVoicingItems(
	items: VoicingQueueItem[],
	count: number,
	rng: () => number = Math.random
): VoicingQueueItem[] {
	return shuffleWithRng(items, rng).slice(0, Math.max(0, Math.floor(count)));
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
 *
 * `templateEligible`, when given, restricts the draw to the templates it
 * accepts (the host passes "every chord quality this template uses is one the
 * deck has already taught", see progressionTemplateTaught). Omitted, every
 * template is drawable, exactly as before.
 */
export function syntheticProgressionItems(
	count: number,
	rng: () => number = Math.random,
	templateEligible: (templateId: string) => boolean = () => true
): ProgressionQueueItem[] {
	const allPairs: { templateId: string; key: string }[] = [];
	for (const template of PROGRESSION_TEMPLATES) {
		if (!templateEligible(template.id)) continue;
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
 * True when every chord quality `templateId` uses (maj7, m7, 7, m7b5) is in
 * `taughtQualities`, the qualities the deck has introduced on at least one
 * root. Every progression template is built from seventh chords, so without
 * this a reserved applied slot would hand a tier-1 user, who has met only
 * white-key triads, a minor ii-V-i to name and play. Quality rather than
 * exact symbol on purpose: a quality learned on one root is the schema the
 * app transposes, and the progression grid's name-then-play steps are that
 * transposition. An unknown template id is never taught.
 */
export function progressionTemplateTaught(
	templateId: string,
	taughtQualities: ReadonlySet<string>
): boolean {
	const template = PROGRESSION_TEMPLATES.find((candidate) => candidate.id === templateId);
	if (template === undefined) return false;
	return template.degrees.every((degree) => taughtQualities.has(degree.quality));
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
 * Draws up to `count` distinct chord-scale items from `candidateSymbols`, via
 * the injected rng, mirroring syntheticInversionItems' enumerate-shuffle-take
 * idiom. A symbol `improvGuideFor` has no honest scale answer for
 * (isChordScaleQuestionAnswerable false: diminished, augmented, unrecognized)
 * contributes no item. An empty `candidateSymbols` yields [] (PRAC-05's
 * single-type-due gate: no chord-scale items drawn when none are due).
 */
export function syntheticChordScaleItems(
	candidateSymbols: string[],
	count: number,
	rng: () => number = Math.random
): ChordScaleQueueItem[] {
	const drillable = candidateSymbols.filter((symbol) =>
		isChordScaleQuestionAnswerable(generateChordScaleQuestion(symbol))
	);
	const shuffled = shuffleWithRng(drillable, rng);
	return shuffled.slice(0, count).map((symbol) => ({
		id: `chord-scale:${symbol}`,
		family: 'chord-scale',
		symbol
	}));
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
 * Cuts a composed queue down to at most `target` items. /practice used this
 * as its bounded round until planRound replaced it (see APPLIED_SLOT_EVERY
 * for why a prefix cut starved the applied families); kept as the plain,
 * order-preserving cut for callers that want exactly that. Pure and order-preserving: the round is the composed queue's own
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
 * One reserved APPLIED slot per this many questions: 3 of a 12-question round.
 *
 * WHY SLOTS ARE RESERVED (ml-practice-variety, C2). The round used to be the
 * composed queue's own prefix (sliceRound), and composePracticeQueue's weave
 * always spends the family with the most items left first, so the 2-item
 * synthetic families sat at the tail of a 30-to-45-item composed queue and
 * the 12-question cut removed them on almost every day: simulated over 60
 * days of one round a day they were 3% of questions, and 0% for a deck that
 * already holds every chord. Four shipped exercise families (progression,
 * voicing, inversion, chord-scale) were unreachable in a normal round. The
 * planner below picks what the round holds BEFORE ordering it, so the applied
 * families get their slots whatever the backlog looks like.
 *
 * Every applied item spends a question without writing an FSRS grade, which
 * is why the reserve is a small fixed share rather than "as many as exist"
 * (sampleVoicingItems' docstring records what an uncapped synthetic draw did
 * to the scheduler): this reserve IS the per-round cap on synthetic items
 * now, and the builders' own counts only decide how many candidates the
 * planner may choose between.
 */
export const APPLIED_SLOT_EVERY = 4;

/** The applied (synthetic) reserve for a round of `target` questions: 3 of 12, 1 of 5, 0 below 4. */
export function appliedSlotsFor(target: number): number {
	return Math.floor(Math.max(0, target) / APPLIED_SLOT_EVERY);
}

/**
 * The most items one carded family may take in a round of `target` questions
 * while another family still has something to offer: 4 of 12 (C4: the
 * most-remaining weave used to hand the round's biggest due family about 43%
 * of every round, 9 of 12 PLAY IT on a bad day). Only a soft cap: when no
 * other family can fill the round, the planner relaxes it rather than ask
 * fewer questions.
 */
export function familyCapFor(target: number): number {
	return Math.max(2, Math.ceil(Math.max(0, target) / 3));
}

/**
 * The order a chord fact's teach-cluster modes are asked in, ONE per round
 * (C1). The deck still seeds the whole cluster at once (introduceNewCards is
 * unchanged), but asking all three in one round is what made a 12-question
 * day one cover only 4 chords, in a BUILD B, BUILD C, PLAY B, PLAY C lockstep,
 * with NAME IT answered seconds after the notes were on screen. A New card
 * the round does not ask stays due, so the cluster spreads itself across
 * days: build it first (the scaffolded construction, the teaching mode),
 * play it next (recall the notes from the symbol), name it after (recognise
 * the notes), and the staggered ear card last, exactly as before.
 */
const TEACH_MODE_ORDER: readonly Mode[] = ['formula-build', 'see-play', 'formula', 'hear-name'];

/** One fact's due cards in the order the planner would ask them: owed reviews weakest-first (hear-name last, D-07), then New cards in TEACH_MODE_ORDER. */
function factCandidates(items: CardedQueueItem[]): CardedQueueItem[] {
	const reviews = items
		.filter((item) => item.card.state !== State.New)
		.sort((a, b) => {
			const aEar = a.mode === 'hear-name';
			const bEar = b.mode === 'hear-name';
			if (aEar !== bEar) return aEar ? 1 : -1;
			return a.card.stability - b.card.stability;
		});
	const teach = items
		.filter((item) => item.card.state === State.New)
		.sort((a, b) => TEACH_MODE_ORDER.indexOf(a.mode) - TEACH_MODE_ORDER.indexOf(b.mode));
	return [...reviews, ...teach];
}

/** planRound's options: composePracticeQueue's own, plus the symbols a round must not ask again. */
export interface PlanOptions extends ComposeOptions {
	/**
	 * Symbols already asked elsewhere in this round (the host's seeded items,
	 * which lead the queue outside the plan): no applied item may reuse one.
	 */
	excludeSymbols?: ReadonlySet<string>;
}

/**
 * Plans one bounded round: WHICH items it asks (at most `target`), then the
 * order. Replaces composePracticeQueue + sliceRound at the /practice host,
 * whose prefix cut decided the round's content by accident of the weave.
 *
 * Selection, in priority order, each pass filling only what is still free:
 *   1. the applied reserve, appliedSlotsFor(target) items drawn round-robin
 *      across the synthetic families (one of each before a second of any).
 *      Applied items are drawn from due chords, so each one takes its
 *      chord's symbol for the round and that fact's cards wait; the reserve
 *      only takes as many due facts as the round can spare and still fill its
 *      carded slots with others (on a three-chord deck it takes none);
 *   2. carded reviews, ONE card per fact (factCandidates picks which), in the
 *      FSRS-ordered arrival order, skipping facts whose symbol is already in
 *      the round, each family held to familyCapFor(target);
 *   3. more carded facts with the family cap relaxed;
 *   4. more applied items on symbols not yet in the round;
 *   5. only when the round still has room (a deck too small to fill it with
 *      distinct subjects): applied items on a symbol a carded item already
 *      asks (one each, up to the reserve), then a second card of an
 *      already-asked fact in a different family. These are the only
 *      same-round repeats a plan makes; a miss's delayed retry is the other,
 *      and that one is deliberate.
 *
 * Order: the carded picks go through composePracticeQueue (its variety weave,
 * the no-3-in-a-row and same-symbol guards, and the QUEUE-01 cold-session
 * first-pick guard all apply unchanged), then the applied picks are spread
 * through the round instead of trailing it, keeping the last two slots
 * carded: a miss's retry spends a question, so a round that ends on its
 * budget drops its tail, and the tail must not always be the applied items
 * the reserve exists to deliver. An applied item never leads a round that has
 * a carded item to lead with.
 *
 * `waiting` counts the CARDED items the round leaves due, the cards a
 * further round would still owe. Unchosen applied items are not counted:
 * they carry no schedule, are rebuilt every round, and are not owed work.
 */
export function planRound(
	cardedItems: CardedQueueItem[],
	syntheticItems: HybridQueueItem[],
	target: number,
	rng: () => number = Math.random,
	options: PlanOptions = {}
): RoundSlice {
	const bounded = Number.isFinite(target) ? Math.max(0, Math.floor(target)) : 0;
	if (bounded === 0) return { round: [], waiting: cardedItems.length };

	const excluded = options.excludeSymbols ?? new Set<string>();
	const used = new Set<string>(excluded);

	const byFact = new Map<string, CardedQueueItem[]>();
	for (const item of cardedItems) {
		const list = byFact.get(item.factId);
		if (list) {
			list.push(item);
		} else {
			byFact.set(item.factId, [item]);
		}
	}
	const facts = [...byFact.entries()].map(([factId, items]) => ({
		factId,
		candidates: factCandidates(items)
	}));

	const appliedByFamily = new Map<PracticeFamily, HybridQueueItem[]>();
	for (const item of syntheticItems) {
		const symbol = itemSymbol(item);
		if (symbol !== undefined && excluded.has(symbol)) continue;
		const list = appliedByFamily.get(item.family);
		if (list) {
			list.push(item);
		} else {
			appliedByFamily.set(item.family, [item]);
		}
	}
	const appliedFamilyOrder = shuffleWithRng([...appliedByFamily.keys()], rng);

	const chosenCarded: CardedQueueItem[] = [];
	const chosenIds = new Set<string>();
	const askedFacts = new Map<string, PracticeFamily[]>();
	const familyCount = new Map<PracticeFamily, number>();
	const applied: HybridQueueItem[] = [];
	const total = (): number => chosenCarded.length + applied.length;

	const choose = (item: CardedQueueItem): void => {
		chosenCarded.push(item);
		chosenIds.add(item.id);
		askedFacts.set(item.factId, [...(askedFacts.get(item.factId) ?? []), item.family]);
		familyCount.set(item.family, (familyCount.get(item.family) ?? 0) + 1);
		if (item.symbol !== undefined) used.add(item.symbol);
	};

	const takeCarded = (limit: number, cap: number): void => {
		for (const fact of facts) {
			if (total() >= limit) return;
			if (askedFacts.has(fact.factId)) continue;
			const symbol = fact.candidates[0].symbol;
			if (symbol !== undefined && used.has(symbol)) continue;
			const pick = fact.candidates.find((item) => (familyCount.get(item.family) ?? 0) < cap);
			if (pick !== undefined) choose(pick);
		}
	};

	const cardedSymbols = new Set(
		facts.flatMap((fact) => (fact.candidates[0].symbol === undefined ? [] : [fact.candidates[0].symbol]))
	);
	const appliedSymbols = new Set<string>();
	/**
	 * How many due carded facts the applied reserve may take the symbol of
	 * (that fact's cards then wait for a later round): only as many as the
	 * round can spare while still filling its carded slots with other facts.
	 * On a big due set that is every applied slot; on a deck with three due
	 * chords it is none, and the FSRS reviews keep the round.
	 */
	let claimable = Math.max(0, facts.length - (bounded - appliedSlotsFor(bounded)));

	/**
	 * 'reserve': the applied slots, claiming carded symbols only within
	 * `claimable`. 'fill': any symbol not yet in the round. 'reuse': a symbol a
	 * carded item already asks, once (one applied item per symbol at most).
	 */
	const takeApplied = (quota: number, pass: 'reserve' | 'fill' | 'reuse'): void => {
		let progressed = true;
		while (progressed && applied.length < quota && total() < bounded) {
			progressed = false;
			for (const family of appliedFamilyOrder) {
				if (applied.length >= quota || total() >= bounded) return;
				const list = appliedByFamily.get(family) ?? [];
				const index = list.findIndex((item) => {
					const symbol = itemSymbol(item);
					if (symbol === undefined) return true;
					if (pass === 'reuse') return !appliedSymbols.has(symbol);
					if (used.has(symbol)) return false;
					return pass === 'fill' || !cardedSymbols.has(symbol) || claimable > 0;
				});
				if (index === -1) continue;
				const [item] = list.splice(index, 1);
				applied.push(item);
				const symbol = itemSymbol(item);
				if (symbol !== undefined) {
					if (pass === 'reserve' && cardedSymbols.has(symbol)) claimable -= 1;
					used.add(symbol);
					appliedSymbols.add(symbol);
				}
				progressed = true;
			}
		}
	};

	takeApplied(appliedSlotsFor(bounded), 'reserve');
	takeCarded(bounded, familyCapFor(bounded));
	takeCarded(bounded, Number.POSITIVE_INFINITY);
	takeApplied(bounded, 'fill');
	takeApplied(appliedSlotsFor(bounded), 'reuse');
	for (const fact of facts) {
		if (total() >= bounded) break;
		const askedFamilies = askedFacts.get(fact.factId);
		if (askedFamilies === undefined) continue;
		const pick = fact.candidates.find(
			(item) => !chosenIds.has(item.id) && !askedFamilies.includes(item.family)
		);
		if (pick !== undefined) choose(pick);
	}

	const waiting = cardedItems.length - chosenCarded.length;
	if (chosenCarded.length === 0) {
		return { round: composePracticeQueue([], applied, rng, options), waiting };
	}

	const woven = composePracticeQueue(chosenCarded, [], rng, options);
	const size = woven.length + applied.length;
	const appliedAt = new Set<number>();
	// Spread over the round minus its last two slots, never at slot 0.
	const span = Math.max(1, size - 2);
	let previous = 0;
	applied.forEach((_, i) => {
		const latest = size - (applied.length - i);
		const slot = Math.min(latest, Math.max(previous + 1, Math.floor(((i + 1) * span) / (applied.length + 1))));
		appliedAt.add(slot);
		previous = slot;
	});

	const round: HybridQueueItem[] = [];
	let nextCarded = 0;
	let nextApplied = 0;
	for (let slot = 0; slot < size; slot++) {
		if (appliedAt.has(slot)) {
			round.push(applied[nextApplied++]);
		} else {
			round.push(woven[nextCarded++]);
		}
	}
	return { round, waiting };
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

/** Keeps only chord-scale items whose symbol satisfies `predicate` (PRAC-04's synthetic-half restriction, mirrors filterVoicingsBySong/filterInversionsBySong). */
export function filterChordScaleBySong(
	items: ChordScaleQueueItem[],
	predicate: (symbol: string) => boolean
): ChordScaleQueueItem[] {
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
