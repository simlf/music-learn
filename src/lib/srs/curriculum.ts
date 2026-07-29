import {
	allFacts,
	chordFormulaFactId,
	factById,
	intervalSizeFactId,
	scaleDegreeFactId,
	type Fact
} from '$lib/srs/facts';
import { DRILL_INTERVALS, intervalBetween, intervalFromShort } from '$lib/theory/interval';
import { spellChord } from '$lib/theory/chord';
import {
	availableTierIds,
	itemsForTier,
	splitSymbol,
	tierById,
	type TierId
} from '$lib/practice/tiers';

/**
 * The order new facts are TAUGHT in, as opposed to srs/facts.ts's catalog
 * order, which is the order they are DISPLAYED in.
 *
 * WHY THIS EXISTS. `introduceNewCards` used to walk `allFacts()` directly,
 * and the catalog is built as [96 chord-formula, 12 interval-size, 84
 * scale-degree] with the chord block ordered root-outer / quality-inner. With
 * a 10-facts-per-day budget (introBudget.MAX_NEW_CARDS_PER_DAY) that made a
 * brand-new user's first day "C, Cm, Cdim, Cmaj7, Cm7, C7, Cm7b5, Cdim7, Db,
 * Dbm": every chord quality the app knows, including half-diminished and
 * diminished seventh, plus D-flat, on day one. It also put all 96 chord
 * spellings ahead of the FIRST interval fact (around day 11), even though
 * knowing that a minor 7th is a minor 7th is what makes "Cm7 is C E♭ G B♭"
 * comprehensible rather than a string to memorize. Prerequisites were queued
 * behind the material that depends on them.
 *
 * THE SHAPE OF THE FIX. Two separate ideas, deliberately kept separate:
 *
 * 1. `curriculumOrder()` is a total permutation of `allFacts()` - the same
 *    192 facts, nothing added, nothing dropped, in a pedagogical order. It
 *    needs no state and no storage and is the piece worth keeping if the tier
 *    ladder is ever replaced by a richer unit spine (see
 *    .planning/design/guided-path.md, whose `src/lib/path/introOrder.ts`
 *    wants exactly this signature and exactly this permutation property).
 *
 * 2. `introductionOrder(maxTier, introduced)` applies the TIER GATE on top:
 *    the ceiling on how far down that order a user at `maxTier` may currently
 *    be taught. This is the part that dies with tiers.ts if the ladder is
 *    ever replaced.
 *
 * Pure module: no DOM, no Svelte, no Dexie, no localStorage. The tier comes
 * in as an argument; `srs/deck.ts` is the seam that reads it from
 * practice/levelState.ts.
 */

/**
 * Roots a sight-reading pianist already reads without thinking. Introducing a
 * new chord FORMULA and a new root SPELLING in the same fact means two new
 * things at once, so within one quality the naturals come first and the five
 * accidental roots follow. (tiers.ts's own tier 1 makes the same call by
 * restricting itself to `WHITE_KEY_ROOTS`; this extends it to every tier.)
 */
const NATURAL_ROOTS = new Set(['C', 'D', 'E', 'F', 'G', 'A', 'B']);

/**
 * Semitone count -> the one DRILL_INTERVALS short of that size. The drill
 * pool holds a single spelling per distance (it has 'A4' but no 'd5', 'M6'
 * but no 'd7'), so a chord's diminished fifth and the drilled augmented
 * fourth resolve to the SAME atom: on a keyboard they are the same distance,
 * which is what the interval drill actually asks for. Without this mapping,
 * every diminished and half-diminished chord would report a prerequisite the
 * app has no fact for.
 */
const DRILL_INTERVAL_BY_SEMITONES: ReadonlyMap<number, string> = new Map(
	DRILL_INTERVALS.map((short) => [intervalFromShort(short).semitones, short])
);

/**
 * The interval atoms a chord symbol is built from, as drill-pool shorts, in
 * DRILL_INTERVALS order. Derived from `spellChord` + `intervalBetween`, the
 * same pair `chordPresentation.formulaFor` uses to render the interval
 * scaffold a beginner sees above the keyboard, so "the intervals this chord
 * is made of" has exactly one definition in the app. The root itself (0
 * semitones) is not an interval to learn and is skipped. Total: an
 * unrecognized symbol yields [].
 */
export function intervalAtomsForSymbol(symbol: string): string[] {
	const chord = spellChord(symbol);
	if (!chord.recognized) return [];
	const found = new Set<string>();
	for (const note of chord.notes) {
		const info = intervalBetween(chord.root, note.letter);
		if (info.semitones <= 0) continue;
		const atom = DRILL_INTERVAL_BY_SEMITONES.get(info.semitones);
		if (atom !== undefined) found.add(atom);
	}
	return DRILL_INTERVALS.filter((short) => found.has(short));
}

/**
 * Every interval atom the chords of ONE tier are built from, in
 * DRILL_INTERVALS order (ascending size). Locked tiers contribute nothing,
 * since `itemsForTier` already returns [] for them.
 *
 * Tiers 1 to 4 need 7 of the 12 drilled intervals: m3/M3/P5 (triads), A4
 * (the tritone in dim and m7b5), m7/M7 (the sevenths), M6 (dim7's
 * diminished seventh). The other five (m2, M2, P4, m6, P8) appear in no
 * available tier's chords, which is exactly why they sort after the ladder
 * rather than being hand-ranked.
 */
export function intervalAtomsForTier(id: TierId): string[] {
	const needed = new Set<string>();
	for (const symbol of itemsForTier(id)) {
		for (const atom of intervalAtomsForSymbol(symbol)) needed.add(atom);
	}
	return DRILL_INTERVALS.filter((short) => needed.has(short));
}

/**
 * One tier's chord symbols, reordered QUALITY-OUTER / ROOT-INNER (the
 * opposite of `itemsForTier`'s own root-outer / quality-inner order):
 * qualities in the order the tier declares them, and within a quality the
 * natural roots before the accidental ones, each in the tier's declared root
 * order.
 *
 * WHY THIS DIRECTION. The unit of learning is the formula, not the key. One
 * quality carried across twelve roots is a single schema transposed twelve
 * times, which is precisely the "see the symbol, know the notes" reflex this
 * app exists to build. Root-outer instead teaches eight unrelated formulas in
 * one key before the user has transposed a single one, and it is what
 * produced the "all eight qualities of C on day one" defect.
 *
 * Built by re-sorting `itemsForTier(id)` rather than re-walking
 * roots x qualities, so this can never emit a symbol the tier does not
 * actually claim (locked tiers included).
 */
export function chordOrderForTier(id: TierId): string[] {
	const tier = tierById(id);
	const qualityRank = new Map(tier.qualities.map((quality, index) => [quality, index]));
	const rootRank = new Map(tier.roots.map((root, index) => [root, index]));

	return [...itemsForTier(id)].sort((a, b) => {
		const left = splitSymbol(a);
		const right = splitSymbol(b);
		// splitSymbol only returns null for a root outside ROOTS, which
		// itemsForTier cannot produce. Kept total rather than asserting.
		if (left === null || right === null) return a.localeCompare(b);

		const qualityDelta =
			(qualityRank.get(left.quality) ?? tier.qualities.length) -
			(qualityRank.get(right.quality) ?? tier.qualities.length);
		if (qualityDelta !== 0) return qualityDelta;

		const naturalDelta =
			(NATURAL_ROOTS.has(left.root) ? 0 : 1) - (NATURAL_ROOTS.has(right.root) ? 0 : 1);
		if (naturalDelta !== 0) return naturalDelta;

		return (
			(rootRank.get(left.root) ?? tier.roots.length) - (rootRank.get(right.root) ?? tier.roots.length)
		);
	});
}

/** Available tier ids ascending, resolved once (tiers.ts is pure data, so this never changes at runtime). */
const LADDER: readonly TierId[] = availableTierIds();

/** The highest tier a user can currently climb to (tiers 5 and 6 stay locked). */
const LAST_TIER: TierId = LADDER[LADDER.length - 1];

/**
 * The pseudo-tier every fact that no available tier's chords require, and
 * that no earlier stage promoted, sorts into: the five unneeded interval
 * atoms and the 63 scale-degree facts for the 9 tonics NOT promoted (see
 * PROMOTED_SCALE_TONICS below). Only reachable once the whole ladder is
 * unlocked.
 */
const BEYOND_LADDER = (LAST_TIER + 1) as TierId;

interface CurriculumEntry {
	fact: Fact;
	/** Lowest tier at which this fact becomes teachable, or BEYOND_LADDER. */
	tier: TierId;
}

/**
 * The three tonics whose scale-degree facts are promoted ahead of the rest
 * of the 84-fact scale-degree space (PROMOTION, this task). C, G, F: the
 * simplest key signatures (0, 1 sharp, 1 flat), mirroring NATURAL_ROOTS'
 * own natural-before-accidental convention above and matching
 * .planning/design/guided-path.md's own choice of tonics for its unit 3
 * sketch ("8 of the 21 scale-degree facts for tonics C, G, F"). Curated
 * rather than exhaustive: promoting all 12 tonics' 84 facts ahead of the
 * chord ladder would front-load a third of the whole catalog before the
 * app's core chord-symbol-fluency value, which is exactly the failure mode
 * this task exists to avoid repeating in the other direction. Three tonics
 * is enough to prove "the same shape in every key" (the actual point of
 * teaching degrees at all) without displacing more than a couple of days
 * of new chord vocabulary.
 */
const PROMOTED_SCALE_TONICS: readonly string[] = ['C', 'G', 'F'];

/**
 * Degrees 1, 3, 5: what a TRIAD is built from, staged alongside tier 1 (the
 * first chords the user ever meets). Degree 1 is trivially the tonic, but
 * still worth anchoring first: "third" and "fifth" only mean something
 * relative to a root already named. 3 and 5 are the two degrees a major or
 * minor triad actually leans on.
 */
const TRIAD_DEGREES: readonly number[] = [1, 3, 5];

/**
 * Degree 7 (what a SEVENTH chord adds on top of a triad) plus 2, 4, 6 (the
 * three degrees no chord this app drills ever needs - there is no sus4,
 * add9, m6, or 13 fact in the catalog, and the qualities that would need
 * them are tiers 5-6, permanently `available: false`). Staged alongside
 * tier 3 (the first sevenths): 7 completes the chord-tone story degree-by-
 * degree, and 2/4/6 ride along in the same pass to finish the promoted
 * tonics' full diatonic literacy in one place rather than three, since no
 * later available tier gives 2/4/6 a "just taught this" moment to wait for.
 * Full literacy (all 7 degrees, not just the chord-tone four) is what a
 * later roman-numeral/diatonic-harmony feature needs: "ii in B flat" is
 * degree 2, not a chord tone of anything drilled today.
 */
const SCALE_COMPLETING_DEGREES: readonly number[] = [7, 2, 4, 6];

/**
 * The tier whose freshly-taught chords make TRIAD_DEGREES meaningful (tier
 * 1 teaches the first triads) and the tier whose freshly-taught chords make
 * SCALE_COMPLETING_DEGREES's leading member meaningful (tier 3 teaches the
 * first sevenths). Named constants rather than bare literals in the loop
 * below, so the coupling reads as intentional rather than a magic number.
 */
const TRIAD_DEGREE_TIER: TierId = 1;
const SEVENTH_DEGREE_TIER: TierId = 3;

/**
 * The full curriculum, built once at module load. Stage per tier: the tier's
 * interval ATOMS first, then the tier's chord facts, so a prerequisite is
 * always introduced in the same pass as (or an earlier pass than) the chords
 * that need it. Two tiers additionally stage a batch of PROMOTED_SCALE_TONICS
 * facts (see below). Then, past the ladder, the interval atoms no tier's
 * chords require, and finally every remaining scale-degree fact.
 *
 * WHY SCALE DEGREES WERE LAST (PR #38's original call, no longer true).
 * `practiceQueue.familyForCard` used to return null for `scale-degree`, and
 * `cardsToQueueItems` dropped null-family cards, so all 84 scale-degree
 * facts were seeded into the deck and then never appeared on /practice at
 * all - reviewable only on /progress > Recall. Promoting them ahead of the
 * chord vocabulary would have been pedagogically righter and practically
 * worse: spending the 10-facts-per-day budget on cards the primary daily
 * surface silently discarded. #38 therefore left all 84 at the catalog's
 * tail and named the exact blocker: `familyForCard` gaining a scale family.
 *
 * PR #51 gave scale-degree facts a real `degree` family with its own /practice
 * surface (both directions: degree-to-note and note-to-degree), so that
 * blocker is gone - every scale-degree fact seeded below is now genuine,
 * clearable practice work, not silent deck bloat.
 *
 * WHY ONLY C/G/F, AND WHY STAGED IN TWO PLACES RATHER THAN MOVED TO THE
 * FRONT WHOLESALE. Scale degrees are a real prerequisite for diatonic
 * harmony and roman numerals (both taught elsewhere in the app: harmonising
 * a scale produces the same seven qualities in the same order in every key,
 * and "ii in B flat" means degree 2 of B flat major), but the app's stated
 * core value is chord-symbol fluency, not scale theory. Moving all 84 facts
 * to the front would spend roughly two weeks of the 10-facts-per-day budget
 * on scale degrees before a second chord quality ever arrives. Instead:
 *
 * - A curated 3-tonic subset (PROMOTED_SCALE_TONICS) proves "the same shape
 *   in every key" - the actual point of numbering degrees at all - without
 *   displacing more than a couple of days of new chord vocabulary.
 * - That subset arrives in two stages, each tied to the chord milestone that
 *   makes it meaningful rather than dumped in one 21-fact block: degrees
 *   1/3/5 land beside the first triads (tier 1), degree 7 (plus the
 *   scale-completing 2/4/6) lands beside the first sevenths (tier 3).
 * - The remaining 63 facts (the other 9 tonics) keep the catalog's tail
 *   position, exactly as #38 left the whole set - `push`'s `seen` guard
 *   means the tail loop below needs no change to know which facts are "the
 *   rest": the 21 already staged are silently skipped there.
 *
 * A note on cost. `introduceNewCards` counts FACTS against the 10-per-day
 * budget, not raw records, so a scale-degree fact (one `formula` card) costs
 * the budget exactly as much as a chord fact (a 3-card teach cluster) -
 * neither promotion nor deferral changes that arithmetic. What promoting
 * scale-degree facts DOES change is the mix of what a promoted day teaches:
 * every scale-degree fact swapped in for a chord fact is one FACT of budget
 * spent on a single new review card instead of three, so the curated
 * promotion above adds real teaching material (21 facts total, split 9/12
 * across two days' worth of budget) without proportionally growing the
 * day's total review load the way an equivalent 21 new chords would.
 */
const CURRICULUM: readonly CurriculumEntry[] = buildCurriculum();

function buildCurriculum(): CurriculumEntry[] {
	const entries: CurriculumEntry[] = [];
	const seen = new Set<string>();

	const push = (factId: string, tier: TierId): void => {
		if (seen.has(factId)) return;
		const fact = factById(factId);
		// Total by construction: a factId this module builds but the catalog
		// does not hold (a locked tier's quality, say) is skipped rather than
		// throwing, matching facts.ts's own totality convention.
		if (fact === undefined) return;
		seen.add(factId);
		entries.push({ fact, tier });
	};

	/**
	 * Stages one batch of PROMOTED_SCALE_TONICS' scale-degree facts,
	 * degree-outer / tonic-inner: the DEGREE is the transposable schema
	 * ("the fifth" means the same thing, relative to its own tonic, in every
	 * key), mirroring chordOrderForTier's own quality-outer / root-inner
	 * choice for exactly the same reason.
	 */
	const pushScaleDegrees = (degrees: readonly number[], tier: TierId): void => {
		for (const degree of degrees) {
			for (const tonic of PROMOTED_SCALE_TONICS) {
				push(scaleDegreeFactId(tonic, degree), tier);
			}
		}
	};

	for (const tier of LADDER) {
		for (const atom of intervalAtomsForTier(tier)) push(intervalSizeFactId(atom), tier);
		for (const symbol of chordOrderForTier(tier)) push(chordFormulaFactId(symbol), tier);

		if (tier === TRIAD_DEGREE_TIER) pushScaleDegrees(TRIAD_DEGREES, tier);
		if (tier === SEVENTH_DEGREE_TIER) pushScaleDegrees(SCALE_COMPLETING_DEGREES, tier);
	}

	for (const atom of DRILL_INTERVALS) push(intervalSizeFactId(atom), BEYOND_LADDER);
	// The remaining 63 scale-degree facts (the 9 tonics NOT staged above), in
	// catalog order. No change needed to know which facts are "the rest":
	// `push`'s `seen` guard already skips the 21 PROMOTED_SCALE_TONICS facts
	// staged inside the ladder loop above.
	for (const fact of allFacts()) {
		if (fact.factKind === 'scale-degree') push(fact.factId, BEYOND_LADDER);
	}

	// Anything the catalog holds that no stage above claimed (there is
	// nothing today, but a future catalog addition must never silently become
	// un-teachable) lands at the very end rather than disappearing.
	for (const fact of allFacts()) push(fact.factId, BEYOND_LADDER);

	return entries;
}

/**
 * Every catalog fact in curriculum order: a total permutation of
 * `allFacts()`, deterministic, tier-agnostic. This is the pedagogical
 * ordering on its own, with no gating applied.
 */
export function curriculumOrder(): Fact[] {
	return CURRICULUM.map((entry) => entry.fact);
}

/** The lowest tier at which `factId` becomes teachable, or null when the catalog has no such fact. */
export function curriculumTierOf(factId: string): TierId | null {
	const entry = CURRICULUM.find((candidate) => candidate.fact.factId === factId);
	return entry ? entry.tier : null;
}

/**
 * The interval atoms required by chord facts the user has ALREADY been
 * introduced to, as factIds. A prerequisite of something already taught is
 * overdue, not premature, so these are never withheld by the tier gate.
 *
 * This is what makes the fix land for a returning user rather than only a
 * fresh one: the owner's deck already holds all 96 chord spellings (that is
 * the defect), so the next introduction pass hands them the 7 interval atoms
 * those chords are built from, whatever tier the picker says.
 */
function catchUpAtoms(introduced: ReadonlySet<string>): Set<string> {
	const atoms = new Set<string>();
	for (const factId of introduced) {
		const fact = factById(factId);
		if (fact === undefined || fact.factKind !== 'chord-formula') continue;
		for (const atom of intervalAtomsForSymbol(fact.symbol)) atoms.add(intervalSizeFactId(atom));
	}
	return atoms;
}

/**
 * `curriculumOrder()` truncated by the tier gate: the facts a user at
 * `maxTier` may currently be taught, in curriculum order.
 *
 * - Facts belonging to tiers at or below `maxTier` are teachable. This now
 *   includes the 21 PROMOTED_SCALE_TONICS facts staged at tiers 1 and 3
 *   (buildCurriculum): a tier-1 user meets C/G/F's 1st/3rd/5th degrees
 *   alongside their first triads, same as any other tier-1 fact.
 * - Facts past the ladder (the five unneeded interval atoms, then the
 *   remaining 63 scale-degree facts for the 9 tonics NOT promoted) open only
 *   once the whole ladder is unlocked, so a beginner is never handed dozens
 *   of scale-degree facts instead of the chord vocabulary they are still
 *   working through.
 * - Interval atoms required by an already-introduced chord fact are always
 *   teachable (see catchUpAtoms).
 *
 * Running out of teachable material at a tier is the gate WORKING, not a
 * dead end: nothing new gets introduced while the user still has a tier to
 * master, and `levelState.advanceTierOnMastery` opens the next one on
 * evidence rather than on a schedule.
 */
export function introductionOrder(
	maxTier: TierId = LADDER[0],
	introduced: ReadonlySet<string> = new Set()
): Fact[] {
	const ceiling: TierId = maxTier >= LAST_TIER ? BEYOND_LADDER : maxTier;
	const catchUp = catchUpAtoms(introduced);
	return CURRICULUM.filter(
		(entry) => entry.tier <= ceiling || catchUp.has(entry.fact.factId)
	).map((entry) => entry.fact);
}
