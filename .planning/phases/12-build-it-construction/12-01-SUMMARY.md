---
phase: 12-build-it-construction
plan: 01
subsystem: theory-engine, srs
tags: [tonal, zod, dexie, vitest, tdd]

# Dependency graph
requires:
  - phase: 11-memorization-engine
    provides: deck.ts (Dexie/Zod CardRecord persistence, recordGrade, getAllCards, introduceNewCards), facts.ts (Fact catalog, factById), Mode/FactKind types
provides:
  - phraseStep(short, opts) in interval.ts: plain-English phrasing for a consecutive-note interval, with an asScaleStep override for seconds (whole/half step)
  - scaleFormulaFactId(tonic) in facts.ts: a scale-level factId shape kept outside the Fact union/CATALOG/allFacts()
  - Mode widened to 'formula' | 'formula-build' in deck.ts, with CardRecordSchema's mode/factKind enums widened to match
  - getCard(factId, mode) in deck.ts: total single-record (factId, mode) lookup, undefined when absent
affects: [12-04-build-session, 12-05-build-session, 12-06-fsrs-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive-only union/enum widening: extend a type union and its paired Zod enum together, verified by an explicit round-trip test proving the schema (not just TypeScript) accepts the new value"
    - "Deliberately-excluded seam: a new factId shape (scaleFormulaFactId) added to the module without joining the shared discriminated union/catalog, with a regression-pinned test proving the catalog size and composition are unchanged"

key-files:
  created: []
  modified:
    - src/lib/theory/interval.ts
    - src/lib/theory/interval.test.ts
    - src/lib/srs/facts.ts
    - src/lib/srs/facts.test.ts
    - src/lib/srs/deck.ts
    - src/lib/srs/deck.test.ts

key-decisions:
  - "phraseStep delegates entirely to intervalFromShort(short).long except when asScaleStep is true AND degree === 2, matching D-03 exactly (seconds-only override, every other degree untouched)"
  - "scaleFormulaFactId and the widened FactKind/Mode types are additive-only: the Fact union, CATALOG, allFacts(), and factById() are byte-unchanged, so introduceNewCards/RecallSession/RecallMap remain unaware of scale-formula facts, per this plan's prohibitions"
  - "getCard is implemented as a filter over getAllCards() (not a raw Dexie compound-key get) so it inherits the same Zod-validation/Date-coercion read boundary as every other deck.ts read path, at the cost of an O(n) scan over the full card set (n stays small: max 192 facts x 2 modes)"

patterns-established:
  - "Regression-pin tests that assert byte-compatibility of an existing shared resource (allFacts().length === 192, introduceNewCards never emits 'formula-build') alongside new-feature tests, so a future refactor of the same module gets an immediate signal if it silently expands scope"

requirements-completed: [BUILD-03, BUILD-04]

coverage:
  - id: D1
    description: "phraseStep(short, opts) phrases a consecutive interval in plain English, with asScaleStep overriding only seconds to whole/half step"
    requirement: BUILD-03
    verification:
      - kind: unit
        ref: "src/lib/theory/interval.test.ts#phraseStep (Phase 12 D-03: consecutive-interval phrasing)"
        status: pass
    human_judgment: false
  - id: D2
    description: "deck.ts's Mode widened to include 'formula-build', with CardRecordSchema's mode/factKind enums widened to match, and getCard(factId, mode) added as a total single-record lookup"
    requirement: BUILD-04
    verification:
      - kind: unit
        ref: "src/lib/srs/deck.test.ts#formula-build mode seam (Phase 12 D-09)"
        status: pass
    human_judgment: false
  - id: D3
    description: "facts.ts exposes scaleFormulaFactId(tonic) without adding a scale-formula Fact variant to the union or allFacts()/CATALOG, keeping introduceNewCards/RecallSession/RecallMap unmodified and unaware of it"
    requirement: BUILD-04
    verification:
      - kind: unit
        ref: "src/lib/srs/facts.test.ts#scaleFormulaFactId (Phase 12 D-09 seam)"
        status: pass
      - kind: unit
        ref: "src/lib/srs/facts.test.ts#every full-suite regression pin (allFacts().length === 192, factKind never 'scale-formula')"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-15
status: complete
---

# Phase 12 Plan 01: Theory + SRS Seams for Build-it Construction Summary

**Added `phraseStep` (consecutive-interval English phrasing with a scale-step whole/half override) to interval.ts, and widened deck.ts's `Mode`/schema plus added `getCard`, while adding `scaleFormulaFactId` to facts.ts without touching the shared 192-fact catalog.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-15T14:04:47Z
- **Completed:** 2026-07-15T14:08:15Z
- **Tasks:** 2 (TDD: RED then GREEN)
- **Files modified:** 6

## Accomplishments
- `interval.ts` gains `phraseStep(short, opts?)`: plain-English phrasing for a consecutive-note interval ("m3" -> "minor 3rd"), with `asScaleStep: true` overriding ONLY seconds to "whole step"/"half step" (D-03); total on unparseable input (returns "").
- `deck.ts`'s `Mode` type widened to `'formula' | 'formula-build'`, `CardRecordSchema`'s `mode`/`factKind` Zod enums widened to match (proven by an explicit schema round-trip test, not just a TypeScript-level check), and a new `getCard(factId, mode)` total single-record lookup added as the non-bulk counterpart to `introduceNewCards`.
- `facts.ts`'s `FactKind` widened with `'scale-formula'` and a new `scaleFormulaFactId(tonic)` helper added, while the `Fact` discriminated union, `CATALOG`, `allFacts()`, and `factById()` remain byte-unchanged (regression-pinned by tests asserting `allFacts().length === 192` and no fact carries `factKind === 'scale-formula'`).
- Zero regressions: the full 832-test suite and `svelte-check` both pass; `RecallSession.svelte`/`RecallMap.svelte` show no diff.

## Task Commits

Each task was committed atomically (TDD RED/GREEN cycle, per the plan's `type: tdd` frontmatter):

1. **Task 1: RED — failing tests for phraseStep, the scale-formula factId seam, and the formula-build mode seam** - `b483a86` (test)
2. **Task 2: GREEN — implement phraseStep, scaleFormulaFactId, and the formula-build mode seam** - `0b135f9` (feat)

_No REFACTOR commit was needed: the GREEN implementation matched the plan's action block directly, with only one auto-fixed type error along the way (documented below)._

## Files Created/Modified
- `src/lib/theory/interval.ts` - Added `phraseStep(short, opts?)`, delegating to `intervalFromShort(short).long` with a seconds-only `asScaleStep` override
- `src/lib/theory/interval.test.ts` - Added `phraseStep` describe block covering every behavior-block case
- `src/lib/srs/facts.ts` - Widened `FactKind` with `'scale-formula'`; added `scaleFormulaFactId(tonic)`; `Fact` union/`CATALOG`/`allFacts()`/`factById()` untouched
- `src/lib/srs/facts.test.ts` - Added `scaleFormulaFactId` describe block plus two catalog regression pins
- `src/lib/srs/deck.ts` - Widened `Mode` and `CardRecordSchema`'s `mode`/`factKind` enums; added `getCard(factId, mode)`
- `src/lib/srs/deck.test.ts` - Added a `formula-build mode seam` describe block: schema round-trip, `getCard` (miss/hit/mode-scoped-miss), and an `introduceNewCards` regression pin

## Decisions Made
- `phraseStep`'s seconds-only override is implemented as a guard (`opts?.asScaleStep && info.degree === 2`) reading the already-computed `IntervalInfo.quality`/`degree`, rather than re-parsing the short string, so it inherits `intervalFromShort`'s existing totality (empty-string on junk input) for free.
- `getCard` is implemented as `getAllCards().find(...)` rather than a raw Dexie `[factId, mode]` compound-key `.get()`, so every read goes through the same Zod-validation/Date-coercion boundary as `getDueCards`/`getAllCards` (consistent with deck.ts's module doc: "every record read from Dexie is Zod-parsed here before any comparison...touches it"). Cost: O(n) scan, acceptable at this catalog's scale (max ~384 records: 192 facts x 2 modes).
- `scaleFormulaFactId` was added as a plain standalone function (not a `ScaleFormulaFact` interface/union member), exactly matching the plan's prohibition: it must never flow through `allFacts()`/`CATALOG` since `introduceNewCards` iterates `allFacts()` unconditionally and `RecallSession`/`RecallMap` have no render branch for a scale-formula shape.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed a TS type-narrowing error in the facts.ts regression-pin test**
- **Found during:** Task 2 (GREEN implementation), running `npm run check` per the task's acceptance criteria
- **Issue:** The regression-pin test `allFacts().every((f) => f.factKind !== 'scale-formula')` failed `svelte-check` with "This comparison appears to be unintentional because the types '\"chord-formula\" | \"interval-size\" | \"scale-degree\"' and '\"scale-formula\"' have no overlap" — correct behavior from TypeScript, since the `Fact` union's `factKind` is statically known to exclude `'scale-formula'` (that is the entire point of the regression pin), so a direct literal comparison is flagged as always-true at the type level.
- **Fix:** Cast `f.factKind` to `string` for this one comparison, with a comment explaining the cast exists to keep the check as a runtime regression guard against a FUTURE catalog change, not a type-level tautology.
- **Files modified:** `src/lib/srs/facts.test.ts`
- **Verification:** `npm run check` reports 0 errors; `npx vitest run src/lib/srs/facts.test.ts` still passes all 16 tests including this pin.
- **Committed in:** `0b135f9` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug/type-error)
**Impact on plan:** Necessary to satisfy the plan's own acceptance criteria (`npm run check` reports no new type errors). No scope creep; the test's runtime assertion is unchanged, only its type-level expression.

## Issues Encountered
None beyond the auto-fixed type error above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `phraseStep`, `scaleFormulaFactId`, and `getCard` are all in place and unit-tested for Phase 12's later plans (12-04/05 BuildSession step phrasing, 12-06 FSRS wiring) to build on directly, per this plan's `<artifacts_this_phase_produces>` contract.
- The Phase 11 catalog/consumer surface (`allFacts()`, `factById()`, `introduceNewCards`, `RecallSession.svelte`, `RecallMap.svelte`) is proven byte-unchanged; no blockers for parallel/downstream Phase 12 plans that read from `facts.ts`/`deck.ts`.
- No architectural decisions deferred; all three artifacts match the plan's `must_haves` exactly.

---
*Phase: 12-build-it-construction*
*Completed: 2026-07-15*

## Self-Check: PASSED

All created/modified files exist on disk; both task commits (`b483a86`, `0b135f9`) confirmed present in `git log --oneline --all`.
