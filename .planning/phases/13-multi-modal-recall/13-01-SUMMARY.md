---
phase: 13-multi-modal-recall
plan: 01
subsystem: srs
tags: [dexie, zod, ts-fsrs, spaced-repetition, rotation-policy]

requires:
  - phase: 11-memorization-engine
    provides: "deck.ts's Mode/CardRecord/CardRecordSchema, scheduler.ts's State/Rating seam, facts.ts's allFacts()/FactKind catalog"
  - phase: 12-build-it-construction
    provides: "'formula-build' mode and its factKind: scale-formula card seam (untouched by this plan)"
provides:
  - "deck.ts's Mode union widened to 4 values: 'formula' | 'formula-build' | 'see-play' | 'hear-name'"
  - "introduceNewCards rewritten to seed a chord-formula fact's teach cluster (formula/see-play/formula-build) together, staggering 'hear-name' behind clusterGraduated"
  - "rotation.ts: teachClusterModes, clusterGraduated, selectReviewCards - pure RECALL-03 policy functions"
affects: [13-02, 13-03, 13-04, 13-05, 13-06]

tech-stack:
  added: []
  patterns:
    - "Pure policy module (rotation.ts) with a type-only import back to deck.ts, avoiding a runtime circular dependency while deck.ts imports its functions at runtime"
    - "introduceNewCards' 'facts touched' counter (not raw record count) bounds the limit parameter, since one fact can now contribute 1, 3, or 4 records"

key-files:
  created:
    - src/lib/srs/rotation.ts
    - src/lib/srs/rotation.test.ts
  modified:
    - src/lib/srs/deck.ts
    - src/lib/srs/deck.test.ts

key-decisions:
  - "introduceNewCards' limit parameter counts FACTS touched, not raw records written, since a chord-formula fact's teach cluster contributes 3 records (or 4 once hear-name unlocks) in a single 'touch'"
  - "rotation.ts imports Mode/CardRecord/FactKind from './deck' as a type-only import (erased at compile time) to avoid a runtime circular dependency, since deck.ts imports rotation.ts's functions at runtime; FactKind had to be re-exported from deck.ts (it was previously imported-only, not re-exported) to satisfy this exact import path"
  - "selectReviewCards buckets on state !== State.New (not state === State.Review specifically) for the 'review' side of the split, matching the plan's literal instruction and staying correct even though this app's FSRS config (enable_short_term:false) means State.Learning is never actually reached in practice"

patterns-established:
  - "Pattern: pure rotation/queue-composition policy modules (rotation.ts, session.ts) stay free of Dexie/Svelte/DOM imports and depend on the storage layer's types only via type-only imports"

requirements-completed: [RECALL-01, RECALL-03]

coverage:
  - id: D1
    description: "deck.ts's Mode union and CardRecordSchema accept 'see-play' and 'hear-name' card records without silently dropping them via safeParse"
    requirement: "RECALL-01"
    verification:
      - kind: unit
        ref: "src/lib/srs/deck.test.ts#CardRecordSchema's widened mode enum accepts 'see-play' and 'hear-name' records without dropping them via safeParse"
        status: pass
    human_judgment: false
  - id: D2
    description: "introduceNewCards seeds a new chord-formula fact's teach cluster (formula + see-play + formula-build) together in one call; interval-size/scale-degree facts still seed only a single 'formula' card"
    requirement: "RECALL-03"
    verification:
      - kind: unit
        ref: "src/lib/srs/deck.test.ts#introduceNewCards seeds distinct factIds across repeated calls, growing the deck incrementally (teach-cluster arithmetic)"
        status: pass
      - kind: unit
        ref: "src/lib/srs/deck.test.ts#non-chord facts unchanged: introduceNewCards(97, now) from empty seeds 96 chord-formula clusters plus exactly ONE single-card interval-size fact"
        status: pass
      - kind: unit
        ref: "src/lib/srs/deck.test.ts#exhaustion: introduceNewCards(1000, now) seeds all 192 facts (96 chord clusters x3 + 96 single-card) and a further call introduces 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "hear-name is never introduced for a chord-formula fact until its teach-cluster cards have ALL reached State.Review; once graduated, exactly one hear-name card is introduced"
    requirement: "RECALL-03"
    verification:
      - kind: unit
        ref: "src/lib/srs/deck.test.ts#hear-name stagger gate: hear-name is only introduced once ALL of a chord-formula fact's teach-cluster cards reach State.Review"
        status: pass
    human_judgment: false
  - id: D4
    description: "rotation.ts's selectReviewCards lets every teach (State.New) card through uncapped per fact, caps Review due cards to maxPerFact ranked weakest-stability-first, always sorts hear-name last, and never zeroes a fact's lone hear-name card"
    requirement: "RECALL-03"
    verification:
      - kind: unit
        ref: "src/lib/srs/rotation.test.ts#selectReviewCards (8 cases: uncapped teach, capped+ranked review, hear-name-last, lone-survivor, per-fact independence, mixed New+Review, empty input)"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-15
status: complete
---

# Phase 13 Plan 01: Deck Mode Union Widening + Rotation Policy Module Summary

**Widened deck.ts's Mode union to 4 values with a teach-cluster + hear-name-stagger rewrite of introduceNewCards, plus a new pure rotation.ts implementing RECALL-03's weakest-stability review selection.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-15T16:43:33Z
- **Completed:** 2026-07-15T16:51:28Z
- **Tasks:** 2 (RED, GREEN)
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- `deck.ts`'s `Mode` union widened to `'formula' | 'formula-build' | 'see-play' | 'hear-name'` and `CardRecordSchema`'s enum widened to match, with zero regressions to Phase 11/12's existing read/write paths.
- `introduceNewCards` rewritten: a brand-new chord-formula fact's teach cluster (`formula`, `see-play`, `formula-build`) is now seeded together in one call; interval-size/scale-degree facts still get a single `formula` card, byte-identical to Phase 11. Once all three cluster cards for a chord-formula fact reach `State.Review`, a later call introduces exactly one `hear-name` card for that fact (D-06's stagger gate).
- New `src/lib/srs/rotation.ts`: `teachClusterModes(factKind)`, `clusterGraduated(cardsForFact, clusterModes)`, and `selectReviewCards(dueCards, maxPerFact = 2)` - pure, zero Dexie/Svelte/DOM imports, ready for Plan 13-06 to wire into RecallSession's queue composition.

## Task Commits

Each task was committed atomically:

1. **Task 1: RED - failing tests for widened Mode/schema, teach-cluster introduceNewCards, and rotation.ts** - `d645f14` (test)
2. **Task 2: GREEN - implement the widened Mode/schema, teach-cluster rewrite, and rotation.ts** - `416d4b9` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/lib/srs/rotation.ts` - New pure module: teachClusterModes, clusterGraduated, selectReviewCards
- `src/lib/srs/rotation.test.ts` - New: full spec for all three rotation.ts exports
- `src/lib/srs/deck.ts` - Mode widened to 4 values; CardRecordSchema enum widened; FactKind re-exported; introduceNewCards rewritten for teach-cluster + stagger seeding
- `src/lib/srs/deck.test.ts` - introduceNewCards assertions updated to teach-cluster arithmetic (5*3=15, 97-fact boundary, 1000-limit exhaustion=384/192); new see-play/hear-name schema round-trip and hear-name stagger gate cases added; one pre-existing malformed-due-field test fixed to no longer assume introduceNewCards(2) yields exactly 2 records

## Decisions Made
- `introduceNewCards`'s `limit` parameter counts facts touched, not raw records written (a fact can now contribute 1, 3, or 4 records in one "touch").
- `rotation.ts` imports `Mode`/`CardRecord`/`FactKind` from `./deck` as a **type-only** import (erased at compile time), preventing a runtime circular dependency since `deck.ts` imports `rotation.ts`'s functions at runtime. This required re-exporting `FactKind` from `deck.ts` (previously imported there but not re-exported).
- `selectReviewCards` splits on `state !== State.New` (not `state === State.Review` specifically) for its "review" bucket, matching the plan's literal spec; this app's FSRS config (`enable_short_term:false`) means `State.Learning` is never actually reached in practice, so the distinction is defensive rather than load-bearing today.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed a pre-existing test that assumed introduceNewCards(2) always writes exactly 2 records**
- **Found during:** Task 2 (GREEN implementation verification)
- **Issue:** `deck.test.ts`'s malformed-due-field regression test called `introduceNewCards(2, now0)` and destructured exactly 2 resulting records to corrupt one. Post-rewrite, `introduceNewCards(2)` now introduces 2 chord-formula FACTS, each contributing 3 records (6 total), breaking the test's `toHaveLength(1)` assertion after corrupting one of six valid records.
- **Fix:** Rewrote the test to build its 2 fixture records directly via `makeCardRecord`/`recordGrade` instead of `introduceNewCards`, decoupling it from the teach-cluster arithmetic it was never meant to test.
- **Files modified:** `src/lib/srs/deck.test.ts`
- **Verification:** `npx vitest run` - full suite (914 tests) passes.
- **Committed in:** `416d4b9` (Task 2 commit)

**2. [Rule 3 - Blocking] Re-exported FactKind from deck.ts**
- **Found during:** Task 2 (`npm run check` verification)
- **Issue:** `rotation.ts`'s plan-specified `import type { Mode, CardRecord, FactKind } from './deck'` failed type-checking: `deck.ts` imported `FactKind` from `facts.ts` internally but never re-exported it, so `svelte-check` reported "Module './deck' declares 'FactKind' locally, but it is not exported."
- **Fix:** Added `export type { FactKind };` alongside `deck.ts`'s existing `import type { FactKind } from '$lib/srs/facts';` line.
- **Files modified:** `src/lib/srs/deck.ts`
- **Verification:** `npm run check` - 0 errors, 0 warnings.
- **Committed in:** `416d4b9` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug fix in a pre-existing test, 1 blocking type-export fix)
**Impact on plan:** Both fixes were necessary consequences of the plan's own intentional behavior change (teach-cluster seeding) and its own explicit import-path instruction; no scope creep.

## Issues Encountered
None beyond the two auto-fixed deviations above.

## TDD Gate Compliance

Gate sequence verified in git log:
1. RED (`test(13-01): ...`) - `d645f14`
2. GREEN (`feat(13-01): ...`) - `416d4b9`

Both gates present in correct order. No REFACTOR commit needed (implementation was clean on first pass).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `deck.ts`'s widened `Mode` and `rotation.ts`'s pure policy functions are ready for Plan 13-02/13-03/13-04's RecallSession mode-branch UI work (dispatching on `currentItem.mode` including `'see-play'`/`'hear-name'`) and Plan 13-06's `selectReviewCards` wiring into RecallSession's queue composition.
- `RecallSession.svelte`, `RecallMap.svelte`, and `BuildSession.svelte` were confirmed untouched (`git diff --stat` shows no changes) - this plan's data/logic seam is fully isolated from every UI surface, as required.
- No blockers for the remaining Phase 13 plans.

---
*Phase: 13-multi-modal-recall*
*Completed: 2026-07-15*

## Self-Check: PASSED

- FOUND: src/lib/srs/rotation.ts
- FOUND: src/lib/srs/rotation.test.ts
- FOUND: src/lib/srs/deck.ts
- FOUND: src/lib/srs/deck.test.ts
- FOUND: commit d645f14 (test: RED)
- FOUND: commit 416d4b9 (feat: GREEN)
