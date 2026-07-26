---
phase: 27-practice-hub
plan: 01
subsystem: practice-engine
tags: [queue-composition, fsrs, hybrid-queue, tdd, srs]

# Dependency graph
requires:
  - phase: 11-13 (memorization + multi-modal recall)
    provides: srs/deck.ts (CardRecord/Mode/FactKind), srs/facts.ts (factById), srs/rotation.ts (selectReviewCards/interleaveQueue), srs/session.ts (advanceQueue contract)
  - phase: 25 (contextual learning)
    provides: practice/shellVoicing.ts (seventhChordSymbols/voicingStageForChord), practice/progressions.ts (PROGRESSION_TEMPLATES/PROGRESSION_KEYS/buildProgression)
provides:
  - "Pure practiceQueue.ts module: HybridQueueItem union + familyForCard + cardsToQueueItems + syntheticVoicingItems + syntheticProgressionItems + composePracticeQueue + advanceHybridQueue + filterCardedBySong + filterVoicingsBySong + familiesInQueue + hybridSessionRemaining + isHybridSessionComplete"
  - "REG-02 queue-level test coverage (interleaving, single-type-due gate, song-filter steering, FSRS-ordering pass-through) written ahead of Phase 31"
affects: [27-practice-hub (later plans wiring /practice host), 30-nav-cutover, 31-no-regression-gate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Greedy family-variety weave (composePracticeQueue) modeled directly on srs/rotation.ts's interleaveQueue: shuffle-then-greedy with an always-terminate relaxation, re-expressed over PracticeFamily instead of chord root."
    - "Hybrid queue item union (CardedQueueItem | VoicingQueueItem | ProgressionQueueItem) keeps FSRS-backed and synthetic (non-persisted) items in one discriminated type without adding a new FSRS card kind."

key-files:
  created:
    - src/lib/practice/practiceQueue.ts
    - src/lib/practice/practiceQueue.test.ts
  modified: []

key-decisions:
  - "composePracticeQueue groups items into one FIFO queue per family and greedily emits, preferring the family with the most remaining items among those that would not extend a same-family run to 3 — mirrors interleaveQueue's 'spend the scarcest breaks last' preference, re-expressed over family instead of chord root."
  - "Single-family input short-circuits to identity pass-through (byFamily.size <= 1 returns the concatenated input unchanged) rather than running the weave loop, guaranteeing PRAC-05's single-type-due gate by construction."
  - "symbol/short are derived via factById(factId), never by string-slicing the factId, per the plan's explicit prohibition."

patterns-established:
  - "Any future queue-composition surface needing family-variety weaving over a non-CardRecord item type can reuse composePracticeQueue's local weave loop as the reference implementation (documented module comment explains the host call order end-to-end)."

requirements-completed: [PRAC-02, PRAC-03, PRAC-04, PRAC-05]

coverage:
  - id: D1
    description: "familyForCard classifies chord-formula (formula-build -> build-it, other modes -> name-it), interval-size -> interval, and excludes scale-degree/scale-formula (null) — scales practice stays out of Phase 27's queue"
    requirement: "PRAC-02"
    verification:
      - kind: unit
        ref: "src/lib/practice/practiceQueue.test.ts#familyForCard"
        status: pass
    human_judgment: false
  - id: D2
    description: "cardsToQueueItems preserves FSRS-ordered input order, drops excluded families, and derives symbol/short via factById (never string-slicing the factId)"
    requirement: "PRAC-03"
    verification:
      - kind: unit
        ref: "src/lib/practice/practiceQueue.test.ts#cardsToQueueItems"
        status: pass
    human_judgment: false
  - id: D3
    description: "syntheticVoicingItems/syntheticProgressionItems build non-persisted queue items from the existing pure generators (shellVoicing.ts, progressions.ts), staged by real card maturity"
    verification:
      - kind: unit
        ref: "src/lib/practice/practiceQueue.test.ts#syntheticVoicingItems"
        status: pass
      - kind: unit
        ref: "src/lib/practice/practiceQueue.test.ts#syntheticProgressionItems"
        status: pass
    human_judgment: false
  - id: D4
    description: "composePracticeQueue produces a faithful permutation with no single family running 3-in-a-row for a 2+-family input, and passes a single-family input through unchanged (PRAC-05 single-type-due gate)"
    requirement: "PRAC-05"
    verification:
      - kind: unit
        ref: "src/lib/practice/practiceQueue.test.ts#composePracticeQueue"
        status: pass
    human_judgment: false
  - id: D5
    description: "advanceHybridQueue mirrors srs/session.ts's Again-re-enqueue contract for carded items; synthetic items always consumed"
    verification:
      - kind: unit
        ref: "src/lib/practice/practiceQueue.test.ts#advanceHybridQueue"
        status: pass
    human_judgment: false
  - id: D6
    description: "filterCardedBySong/filterVoicingsBySong restrict both queue halves by the song-provenance predicate"
    requirement: "PRAC-04"
    verification:
      - kind: unit
        ref: "src/lib/practice/practiceQueue.test.ts#filterCardedBySong"
        status: pass
      - kind: unit
        ref: "src/lib/practice/practiceQueue.test.ts#filterVoicingsBySong"
        status: pass
    human_judgment: false

# Metrics
duration: 5min
completed: 2026-07-25
status: complete
---

# Phase 27 Plan 01: Practice Queue Composer Summary

**Pure HYBRID queue-composer module (`practiceQueue.ts`) that weaves FSRS-carded items (name-it/build-it/interval) with synthetic voicing/progression items into one interleaved practice queue, with full unit coverage for interleaving, the single-type-due gate, song-filter steering, and FSRS-order preservation.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-25T01:21:33Z
- **Completed:** 2026-07-25T01:26:43Z
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments
- `familyForCard`/`cardsToQueueItems` map FSRS `CardRecord`s to the queue's discriminated `HybridQueueItem` union, excluding scale-degree/scale-formula facts (scales practice is Phase 28) and deriving `symbol`/`short` via `factById` rather than string-slicing.
- `syntheticVoicingItems`/`syntheticProgressionItems` build non-persisted queue items directly from the existing pure generators (`shellVoicing.ts`, `progressions.ts`) — no new FSRS card kind, no persisted-schema change.
- `composePracticeQueue` weaves carded + synthetic items into one queue: a faithful permutation, within-family order preserved, no family running 3-in-a-row for 2+ families, and an unchanged identity pass-through for a single family (PRAC-05's single-type-due gate).
- `advanceHybridQueue`, `filterCardedBySong`, `filterVoicingsBySong`, `familiesInQueue`, `hybridSessionRemaining`, `isHybridSessionComplete` round out the module's public surface the `/practice` host will consume in a later plan.
- 27 unit tests (`practiceQueue.test.ts`) prove every `<behavior>` clause in the plan, following a strict RED→GREEN TDD cycle per task.

## Task Commits

Each task was executed as a RED→GREEN TDD pair:

1. **Task 1: types + card-to-item mapping + synthetic-item builders**
   - `62b947f` test(27-01): add failing tests for practiceQueue types + mapping (Task 1 RED)
   - `a81bd66` feat(27-01): implement practiceQueue types + card-to-item mapping (Task 1 GREEN)
2. **Task 2: compose + advance + song-filter + single-type-due helpers**
   - `31c528a` test(27-01): add failing tests for compose/advance/song-filter helpers (Task 2 RED)
   - `f6e8c16` feat(27-01): implement compose/advance/song-filter helpers (Task 2 GREEN)

**Plan metadata:** (this commit)

## TDD Gate Compliance

Both tasks followed the mandatory RED→GREEN sequence:
- Task 1: `62b947f` (test) confirmed failing (module didn't exist, import-resolution error) before `a81bd66` (feat) made it pass.
- Task 2: `31c528a` (test) confirmed failing (11 of 27 tests failed with `TypeError: <fn> is not a function`) before `f6e8c16` (feat) made all 27 pass.

No REFACTOR commit was needed for either task.

## Files Created/Modified
- `src/lib/practice/practiceQueue.ts` - Pure queue-composer module: `HybridQueueItem` union, `familyForCard`, `cardsToQueueItems`, `syntheticVoicingItems`, `syntheticProgressionItems`, `composePracticeQueue`, `advanceHybridQueue`, `filterCardedBySong`, `filterVoicingsBySong`, `familiesInQueue`, `hybridSessionRemaining`, `isHybridSessionComplete`. Documents the full host call order (Dexie read → `selectReviewCards`/`interleaveQueue` → this module's mapping/weave → `advanceHybridQueue` on grade) in a module-level comment.
- `src/lib/practice/practiceQueue.test.ts` - 27 unit tests (Vitest) covering every `<behavior>` clause across both tasks, using a seeded mulberry32 PRNG (mirroring `srs/rotation.test.ts`'s convention) for deterministic ordering assertions.

## Decisions Made
- `composePracticeQueue`'s weave groups items into one FIFO queue per family, shuffles the family iteration order once (tie-break baseline via the injected rng), then greedily emits — preferring the family with the most remaining items among those that would not extend a same-family run to 3, mirroring `srs/rotation.ts`'s "spend the scarcest breaks last" preference re-expressed over `PracticeFamily` instead of chord root.
- Single-family input short-circuits (`byFamily.size <= 1` returns the concatenated input unchanged) rather than entering the weave loop at all, so PRAC-05's single-type-due gate holds by construction, not by a lucky greedy outcome.
- `symbol`/`short` are derived exclusively via `factById(factId)`, per the plan's explicit "never by string-slicing the factId" instruction.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' `<behavior>`, `<action>`, `<verify>`, and `<done>` blocks were implemented and verified as specified.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `practiceQueue.ts`'s full public surface (types + mapping + synthetic builders + compose/advance/filter/session helpers) is ready for the next plan in this phase to wire into the `/practice` host (`src/routes/practice/+page.svelte`), per 27-CONTEXT's "thin host delegates item selection to this module" decision.
- No blockers. The threat-model mitigations (T-27-01-01 termination, T-27-01-02 scale exclusion) are both covered by dedicated unit tests (`composePracticeQueue`'s skewed-seed no-3-in-a-row/single-family tests; `familyForCard`'s scale-degree/scale-formula null tests).

---
*Phase: 27-practice-hub*
*Completed: 2026-07-25*

## Self-Check: PASSED

- FOUND: src/lib/practice/practiceQueue.ts
- FOUND: src/lib/practice/practiceQueue.test.ts
- FOUND: .planning/phases/27-practice-hub/27-01-SUMMARY.md
- FOUND commit: 62b947f
- FOUND commit: a81bd66
- FOUND commit: 31c528a
- FOUND commit: f6e8c16
