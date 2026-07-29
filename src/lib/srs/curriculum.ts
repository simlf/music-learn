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
 * that no earlier stage promoted, sorts into: today, only the five unneeded
 * interval atoms (m2, M2, P4, m6, P8 - see intervalAtomsForTier's docstring).
 * Every scale-degree fact is now staged within tiers 1-3 (see
 * PROMOTED_SCALE_TONICS / REMAINING_SCALE_TONICS below), so none fall here
 * in practice; the scale-degree safety net in buildCurriculum guards a
 * future catalog addition rather than today's 84 facts. Only reachable once
 * the whole ladder is unlocked.
 */
const BEYOND_LADDER = (LAST_TIER + 1) as TierId;

interface CurriculumEntry {
	fact: Fact;
	/** Lowest tier at which this fact becomes teachable, or BEYOND_LADDER. */
	tier: TierId;
}

/**
 * The three tonics PR #54 promoted first: the simplest key signatures (0, 1
 * sharp, 1 flat), matching .planning/design/guided-path.md's own choice of
 * tonics for its unit 3 sketch ("8 of the 21 scale-degree facts for tonics
 * C, G, F"). #54 deliberately curated rather than promoting all 12 at once
 * (that would have front-loaded a third of the whole catalog ahead of the
 * app's core chord-symbol-fluency value) and named the other 9 tonics as
 * unfinished business, not a permanent exclusion. Kept as its own constant,
 * unchanged, because these 9 facts stay at tier 1 (see TRIAD_DEGREE_TIER
 * below): growing tier 1's day-1/day-2 pool is the one place the "couple of
 * days of chord vocabulary" budget #54 protected is actually spent, and
 * every other natural-root tonic (D, E, A, B) ALSO gets its first triad at
 * tier 1, so promoting them there too would have quadrupled that cost
 * instead of finishing the job within it.
 */
const PROMOTED_SCALE_TONICS: readonly string[] = ['C', 'G', 'F'];

/**
 * The remaining 9 tonics (this task: finishing PR #54's deferred promotion),
 * in the SAME key-signature-simplicity order #54 used to pick C/G/F: 2
 * accidentals before 3, 3 before 4, and so on, sharps before the enharmonic
 * flat at each step (matching MAJOR_SCALE_ROOTS' own sharp-before-flat
 * convention, e.g. D♭ sorts with the 5-accidental group but F♯, the other
 * 5-accidental spelling this catalog knows, is left for its own 6-accidental
 * slot since the catalog has no G♭ entry to pair it with).
 *
 * WHY TIER 2, NOT TIER 1. Tier 1's roots are WHITE_KEY_ROOTS only (tiers.ts),
 * so these 9 tonics' OWN triads are not available until tier 2 (`All-key
 * triads`) - the same "stage a degree at the tier that makes it meaningful"
 * principle #54 used for C/G/F, extended to the tonics #54 left at the tail.
 * Landing them at tier 2 rather than tier 1 also keeps tier 1's own pool at
 * exactly what #54 shipped (9 degree facts, not 21): a fast learner who
 * masters tier 1's 14 triads quickly must never find scale-degree facts
 * still queued ahead of tier 2's brand-new chords.
 */
const REMAINING_SCALE_TONICS: readonly string[] = [
	'D',
	'B♭',
	'A',
	'E♭',
	'E',
	'A♭',
	'B',
	'D♭',
	'F♯'
];

/**
 * All 12 major-scale tonics this catalog knows, PROMOTED_SCALE_TONICS first
 * (so the C/G/F ordering #54 already pinned in curriculumOrder /
 * introductionOrder is untouched), then REMAINING_SCALE_TONICS. Used only by
 * the tier-3 degree pass below: by tier 3, every tonic's triad has already
 * been staged (at tier 1 or tier 2), so degree 7 (what a seventh chord adds)
 * and the scale-completing 2/4/6 become meaningful for all 12 at once, the
 * same uniform milestone #54 used for C/G/F alone.
 */
const ALL_SCALE_TONICS: readonly string[] = [...PROMOTED_SCALE_TONICS, ...REMAINING_SCALE_TONICS];

/**
 * Degrees 1, 3, 5: what a TRIAD is built from, staged alongside the tier
 * where a tonic's OWN triad first becomes available (tier 1 for
 * PROMOTED_SCALE_TONICS' natural roots, tier 2 for REMAINING_SCALE_TONICS -
 * see TRIAD_DEGREE_TIER / TRIAD_DEGREE_TIER_REMAINING below). Degree 1 is
 * trivially the tonic, but still worth anchoring first: "third" and "fifth"
 * only mean something relative to a root already named. 3 and 5 are the two
 * degrees a major or minor triad actually leans on.
 */
const TRIAD_DEGREES: readonly number[] = [1, 3, 5];

/**
 * Degree 7 (what a SEVENTH chord adds on top of a triad) plus 2, 4, 6 (the
 * three degrees no chord this app drills ever needs - there is no sus4,
 * add9, m6, or 13 fact in the catalog, and the qualities that would need
 * them are tiers 5-6, permanently `available: false`). Staged alongside
 * tier 3 (the first sevenths, for every root at once): 7 completes the
 * chord-tone story degree-by-degree, and 2/4/6 ride along in the same pass
 * to finish ALL_SCALE_TONICS' full diatonic literacy in one place rather
 * than three, since no later available tier gives 2/4/6 a "just taught
 * this" moment to wait for. Full literacy (all 7 degrees, not just the
 * chord-tone four) is what a later roman-numeral/diatonic-harmony feature
 * needs: "ii in B flat" is degree 2, not a chord tone of anything drilled
 * today.
 */
const SCALE_COMPLETING_DEGREES: readonly number[] = [7, 2, 4, 6];

/**
 * The tier whose freshly-taught chords make PROMOTED_SCALE_TONICS' 1/3/5
 * meaningful: tier 1 teaches the first triads, and all three of C/G/F are
 * natural roots, already in tier 1's WHITE_KEY_ROOTS.
 */
const TRIAD_DEGREE_TIER: TierId = 1;

/**
 * The tier whose freshly-taught chords make REMAINING_SCALE_TONICS' 1/3/5
 * meaningful (this task): tier 2 (`All-key triads`) is where the roster
 * grows from WHITE_KEY_ROOTS to all twelve, so this is the first tier at
 * which D♭/E♭/F♯/A♭/B♭ have a triad at all, and the first tier at which
 * D/E/A/B have anything NEW to pair a degree fact with (their triads were
 * already taught at tier 1, alongside C/G/F's).
 */
const TRIAD_DEGREE_TIER_REMAINING: TierId = 2;

/**
 * The tier whose freshly-taught chords make SCALE_COMPLETING_DEGREES
 * meaningful for every tonic at once: tier 3 teaches the first sevenths,
 * uniformly across all twelve roots (unlike triads, no earlier tier
 * introduces a seventh for anyone), so ALL_SCALE_TONICS' 7/2/4/6 lands here
 * in a single pass rather than needing its own split by root.
 */
const SEVENTH_DEGREE_TIER: TierId = 3;

/**
 * The full curriculum, built once at module load. Stage per tier: the tier's
 * interval ATOMS first, then the tier's chord facts, so a prerequisite is
 * always introduced in the same pass as (or an earlier pass than) the chords
 * that need it. Three tiers additionally stage a batch of scale-degree facts
 * (see below): tier 1 and tier 2 each stage a tonic group's 1/3/5, tier 3
 * stages every tonic's 7/2/4/6. Past the ladder, only the interval atoms no
 * tier's chords require remain (the safety-net scale-degree loop below is
 * now a no-op for today's 84 facts, kept for future catalog growth).
 *
 * WHY SCALE DEGREES WERE LAST, ONCE (PR #38's original call, superseded).
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
 * blocker is gone. PR #54 promoted C/G/F (PROMOTED_SCALE_TONICS) as a first,
 * curated step and named the other 9 tonics unfinished business rather than
 * a permanent exclusion.
 *
 * FINISHING THE PROMOTION (this task): every scale-degree fact is now staged
 * within the ladder, none left at the catalog's tail. Scale degrees are a
 * real prerequisite for diatonic harmony and roman numerals (both taught
 * elsewhere in the app), but the app's stated core value is chord-symbol
 * fluency, not scale theory, so #54's discipline - tie each batch to the
 * chord milestone that makes it meaningful, never dump the whole 84-fact
 * space at once - is extended rather than abandoned:
 *
 * - PROMOTED_SCALE_TONICS (C, G, F) keeps its exact #54 shape: 1/3/5 at
 *   tier 1, 7/2/4/6 at tier 3. Untouched, so tier 1's pool stays the 9 facts
 *   #54 shipped - see TRIAD_DEGREE_TIER's docstring for why growing it was
 *   rejected.
 * - REMAINING_SCALE_TONICS (the other 9, this task) gets 1/3/5 at tier 2,
 *   the tier at which their own triads first exist (tier 1's roots are
 *   WHITE_KEY_ROOTS only), and 7/2/4/6 at tier 3 alongside
 *   PROMOTED_SCALE_TONICS' own second batch, since sevenths arrive for every
 *   root at tier 3 with no earlier partial availability to split on.
 * - Net effect: tier 1 unchanged (9 degree facts), tier 2 gains a new
 *   27-fact stage (9 tonics x 1/3/5), tier 3's existing stage grows from 12
 *   facts (C/G/F x 7/2/4/6) to 48 (all 12 tonics x 7/2/4/6). Nothing is
 *   dumped in one block, and the tier most sensitive to displacement (tier
 *   1, a brand-new user's first days) carries none of the new material.
 *
 * A note on cost. `introduceNewCards` counts FACTS against the 10-per-day
 * budget, not raw records, so a scale-degree fact (one `formula` card) costs
 * the budget exactly as much as a chord fact (a 3-card teach cluster) -
 * promoting more of them is comparatively cheap in REVIEW load even where it
 * is not cheap in budget-slot count, which is what makes finishing tiers 2
 * and 3's batches an acceptable trade rather than the "two weeks of scale
 * theory" #54 explicitly ruled out for tier 1.
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
	 * Stages one tonic group's scale-degree facts, degree-outer / tonic-inner:
	 * the DEGREE is the transposable schema ("the fifth" means the same thing,
	 * relative to its own tonic, in every key), mirroring chordOrderForTier's
	 * own quality-outer / root-inner choice for exactly the same reason.
	 */
	const pushScaleDegrees = (
		degrees: readonly number[],
		tonics: readonly string[],
		tier: TierId
	): void => {
		for (const degree of degrees) {
			for (const tonic of tonics) {
				push(scaleDegreeFactId(tonic, degree), tier);
			}
		}
	};

	for (const tier of LADDER) {
		for (const atom of intervalAtomsForTier(tier)) push(intervalSizeFactId(atom), tier);
		for (const symbol of chordOrderForTier(tier)) push(chordFormulaFactId(symbol), tier);

		if (tier === TRIAD_DEGREE_TIER) pushScaleDegrees(TRIAD_DEGREES, PROMOTED_SCALE_TONICS, tier);
		if (tier === TRIAD_DEGREE_TIER_REMAINING) {
			pushScaleDegrees(TRIAD_DEGREES, REMAINING_SCALE_TONICS, tier);
		}
		if (tier === SEVENTH_DEGREE_TIER) {
			pushScaleDegrees(SCALE_COMPLETING_DEGREES, ALL_SCALE_TONICS, tier);
		}
	}

	for (const atom of DRILL_INTERVALS) push(intervalSizeFactId(atom), BEYOND_LADDER);
	// Safety net, not a live path today: every scale-degree fact is staged
	// above (tier 1, 2, or 3), so this finds nothing left to push. Kept so a
	// future catalog addition (a 13th tonic, say) lands at the tail instead
	// of silently becoming un-teachable.
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
 *   includes every scale-degree fact (buildCurriculum): a tier-1 user meets
 *   C/G/F's 1st/3rd/5th degrees alongside their first triads, a tier-2 user
 *   additionally meets the other 9 tonics' 1st/3rd/5th degrees alongside
 *   THEIR first triads, and a tier-3 user meets every tonic's 7th (plus the
 *   scale-completing 2nd/4th/6th) alongside the first sevenths - each batch
 *   arriving at the tier that makes it meaningful, same as any other fact at
 *   that tier.
 * - Facts past the ladder (only the five unneeded interval atoms remain
 *   there today) open only once the whole ladder is unlocked, so a beginner
 *   is never handed dozens of scale-degree facts instead of the chord
 *   vocabulary they are still working through.
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
