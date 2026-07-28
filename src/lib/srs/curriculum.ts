import { allFacts, chordFormulaFactId, factById, intervalSizeFactId, type Fact } from '$lib/srs/facts';
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
 * The pseudo-tier every fact that no available tier's chords require sorts
 * into: the five unneeded interval atoms and all 84 scale-degree facts. Only
 * reachable once the whole ladder is unlocked.
 */
const BEYOND_LADDER = (LAST_TIER + 1) as TierId;

interface CurriculumEntry {
	fact: Fact;
	/** Lowest tier at which this fact becomes teachable, or BEYOND_LADDER. */
	tier: TierId;
}

/**
 * The full curriculum, built once at module load. Stage per tier: the tier's
 * interval ATOMS first, then the tier's chord facts, so a prerequisite is
 * always introduced in the same pass as (or an earlier pass than) the chords
 * that need it. Then, past the ladder, the interval atoms no tier's chords
 * require, and finally the scale-degree facts.
 *
 * WHY SCALE DEGREES ARE LAST, despite being atoms too. `practiceQueue
 * .familyForCard` returns null for `scale-degree`, and `cardsToQueueItems`
 * drops null-family cards, so all 84 scale-degree facts are seeded into the
 * deck and then never appear on /practice at all. They are only reviewable on
 * /progress > Recall. Promoting them ahead of the chord vocabulary would be
 * pedagogically righter and practically worse: it would spend the 10-facts-
 * per-day budget on cards the primary daily surface silently discards. They
 * therefore keep exactly the catalog position they have today (last), and
 * moving them up to sit beside the interval atoms is BLOCKED ON
 * `familyForCard` gaining a scale family. That is a one-line move here once
 * it does.
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

	for (const tier of LADDER) {
		for (const atom of intervalAtomsForTier(tier)) push(intervalSizeFactId(atom), tier);
		for (const symbol of chordOrderForTier(tier)) push(chordFormulaFactId(symbol), tier);
	}

	for (const atom of DRILL_INTERVALS) push(intervalSizeFactId(atom), BEYOND_LADDER);
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
 * - Facts belonging to tiers at or below `maxTier` are teachable.
 * - Facts past the ladder (the five unneeded interval atoms, then every
 *   scale-degree fact) open only once the whole ladder is unlocked, so a
 *   beginner is never handed 84 /practice-invisible scale-degree facts
 *   instead of the chord vocabulary they are still working through.
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
