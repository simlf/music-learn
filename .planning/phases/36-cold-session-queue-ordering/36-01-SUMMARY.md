---
phase: 36-cold-session-queue-ordering
plan: 01
subsystem: practice
tags: [practice-queue, fsrs, tdd, pure-function]

# Dependency graph
requires:
  - phase: 35-inversions-new-drill-family
    provides: composePracticeQueue's inversion-family weave (INV-03), the module this plan extends
provides:
  - "composePracticeQueue's optional options.lowMastery signal + first-pick guard (QUEUE-01)"
  - "Exported SCAFFOLD_HEAVY set (progression, inversion) as the single scaffold-heavy definition"
  - "Exported isLowMasterySession pure helper (State.Review-minority maturity notion)"
affects: [36-02-host-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "First-pick-only guard scoped via output.length === 0 inside an existing weave loop, so a behavior change constrained to session-opening only stays provably isolated from every later pick"
    - "Exported ReadonlySet constant (SCAFFOLD_HEAVY) as single source of truth shared by composer + tests + future host wiring, avoiding duplicated family-name string literals"

key-files:
  created: []
  modified:
    - src/lib/practice/practiceQueue.ts
    - src/lib/practice/practiceQueue.test.ts

key-decisions:
  - "First-pick guard implemented as a `pickFrom` local computed right before the bestScore selection loop, falling back to the untouched candidateFamilies when options.lowMastery is false/absent OR output.length > 0 OR no simpler family exists among candidateFamilies"
  - "isLowMasterySession's maturity notion (matureCount * 2 < cards.length) reuses shellVoicing.ts's voicingStageForChord State.Review check verbatim, and returns false (warm) for an empty array for REG-01 safety"

patterns-established:
  - "Pattern: scope a new opt-in behavior signal to output.length === 0 (first-pick-only) inside a proven weave loop, rather than threading a new parameter through the whole algorithm - keeps every other pick and the entire warm path byte-identical by construction"

requirements-completed: [QUEUE-01]

coverage:
  - id: D1
    description: "composePracticeQueue accepts optional options.lowMastery (4th arg); when true and a simpler family is present, the first emitted item is never progression/inversion, across seeds 1-8"
    requirement: "QUEUE-01"
    verification:
      - kind: unit
        ref: "src/lib/practice/practiceQueue.test.ts#cold-session first-item ordering (QUEUE-01) > never leads with 'progression' or 'inversion' when a simpler family is present, across seeds"
        status: pass
    human_judgment: false
  - id: D2
    description: "Warm/default path (options absent, or lowMastery: false, or only scaffold-heavy families present) stays byte-identical to the pre-existing composer output, including the frozen 35-04 REG-parity baseline"
    requirement: "REG-01"
    verification:
      - kind: unit
        ref: "src/lib/practice/practiceQueue.test.ts#REG-parity: existing-five ordering unchanged with no inversion items present > produces the frozen baseline order for a fixed rng"
        status: pass
      - kind: unit
        ref: "src/lib/practice/practiceQueue.test.ts#cold-session first-item ordering (QUEUE-01) > is byte-identical to the warm result when only scaffold-heavy families are present"
        status: pass
      - kind: unit
        ref: "src/lib/practice/practiceQueue.test.ts#cold-session first-item ordering (QUEUE-01) > defaults to the warm result when options are omitted (3-arg call)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Single-type-due gate (a single scaffold-heavy family, e.g. inversion-only) passes through unchanged even under the cold signal"
    requirement: "QUEUE-01"
    verification:
      - kind: unit
        ref: "src/lib/practice/practiceQueue.test.ts#cold-session first-item ordering (QUEUE-01) > preserves the single-type-due gate for a scaffold-heavy-only single family under the cold signal"
        status: pass
    human_judgment: false
  - id: D4
    description: "isLowMasterySession(cards): pure boolean over CardRecord[], true iff State.Review cards are a strict minority of a non-empty set; false for an empty array"
    requirement: "QUEUE-01"
    verification:
      - kind: unit
        ref: "src/lib/practice/practiceQueue.test.ts#isLowMasterySession (all 6 cases: empty, all-New, all-Learning, 1-of-3 Review, 2-of-3 Review, 3-of-3 Review)"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-07-27
status: complete
---

# Phase 36 Plan 01: Cold-Session First-Item Guard + Low-Mastery Signal Summary

**composePracticeQueue gains an opt-in `options.lowMastery` first-pick guard (never opens with progression/inversion when a simpler family is due) plus a pure `isLowMasterySession` card-maturity helper, with the warm path and the 35-04 frozen-order baseline byte-identical.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-07-27T02:06Z (approx, session start)
- **Completed:** 2026-07-27T02:26Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `composePracticeQueue` accepts a 4th optional `options: ComposeOptions` argument; when `{ lowMastery: true }` and a simpler family (name-it/build-it/interval/voicing) is present among the current pick's eligible candidates, the very first emitted item is restricted to that simpler subset - guaranteed across 8 tested seeds, still a faithful permutation with no 3-in-a-row.
- Exported `SCAFFOLD_HEAVY` (`Set<'progression' | 'inversion'>`) as the single source of truth for the scaffold-heavy family definition, reused by the guard and by tests.
- Warm/default behavior (options omitted, `lowMastery: false`, or only scaffold-heavy families present) is byte-identical to the pre-existing composer, verified against the untouched 35-04 frozen-order REG-parity test.
- The single-type-due short-circuit (`byFamily.size <= 1`) still wins over the cold guard for a scaffold-heavy-only single family.
- Exported `isLowMasterySession(cards: CardRecord[]): boolean` - a pure helper reusing `shellVoicing.ts`'s `voicingStageForChord` State.Review maturity notion: low-mastery when Review cards are a strict minority of a non-empty set (`matureCount * 2 < cards.length`); `false` for an empty array.

## Task Commits

Each task was committed as a RED test commit followed by a GREEN implementation commit (TDD):

1. **Task 1: Add the low-mastery signal and first-pick guard to composePracticeQueue**
   - `2577326` - `test(36-01): add failing test for cold-session first-item guard` (RED)
   - `2c072fa` - `feat(36-01): add lowMastery first-pick guard to composePracticeQueue` (GREEN)
2. **Task 2: Add the isLowMasterySession pure signal helper**
   - `4941d11` - `test(36-01): add failing test for isLowMasterySession` (RED)
   - `2686b89` - `feat(36-01): add pure isLowMasterySession signal helper` (GREEN)

## Files Created/Modified
- `src/lib/practice/practiceQueue.ts` - Added `ComposeOptions` interface, exported `SCAFFOLD_HEAVY` set, extended `composePracticeQueue`'s signature with a 4th `options` param and the first-pick guard inside the weave loop, added exported `isLowMasterySession` helper (imports `State` value from `$lib/srs/scheduler`).
- `src/lib/practice/practiceQueue.test.ts` - Added the "cold-session first-item ordering (QUEUE-01)" describe block (5 cases: cold guarantee across 8 seeds, scaffold-heavy-only no-op, single-type-due-under-cold, default==warm, order/no-3-in-a-row preservation) and the "isLowMasterySession" describe block (6 cases). The pre-existing "REG-parity ... frozen baseline order" test was left untouched.

## Decisions Made
- First-pick guard placed as a `pickFrom` local computed immediately after `candidateFamilies`, before the `bestScore` selection loop, iterating `pickFrom` instead of `candidateFamilies` - the smallest-surface way to scope the change to exactly the first pick (`output.length === 0`) while leaving every other rule (relax branch, no-3-in-a-row, scarcest-last scoring, anti-adjacency) byte-unchanged.
- `isLowMasterySession` reuses the exact `State.Review` maturity check `voicingStageForChord` already uses, so the app has one shared notion of "mature" rather than two competing definitions.
- Empty-array input to `isLowMasterySession` defaults to `false` (warm) - "no basis to call it cold" is the REG-01-safe default, matching the plan's explicit instruction.

## Deviations from Plan

None - plan executed exactly as written. All `must_haves` truths, artifacts, and key_links from the plan frontmatter are satisfied by the implementation and tests above.

## Issues Encountered
- Initial test-file insertion accidentally left one stray extra closing brace (`});`) after the new describe block, caught immediately by running vitest (oxc parse error) before any commit was made; fixed in the same edit pass, no functional impact.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `ComposeOptions`, `SCAFFOLD_HEAVY`, and `isLowMasterySession` are exported and ready for Plan 02's host wiring (computing `isLowMasterySession` from the host's Dexie-fetched cards and passing `{ lowMastery }` into `composePracticeQueue`).
- Full project test suite (114 files, 1608 tests) is green; `npx tsc --noEmit` shows no new type errors (one pre-existing, unrelated failure in `pianoKeyboardInspect.test.ts` is out of this plan's scope).
- No blockers for Plan 02.

---
*Phase: 36-cold-session-queue-ordering*
*Completed: 2026-07-27*

## Self-Check: PASSED

- FOUND: src/lib/practice/practiceQueue.ts
- FOUND: src/lib/practice/practiceQueue.test.ts
- FOUND commit 2577326 (test: cold-session first-item guard, RED)
- FOUND commit 2c072fa (feat: lowMastery first-pick guard, GREEN)
- FOUND commit 4941d11 (test: isLowMasterySession, RED)
- FOUND commit 2686b89 (feat: isLowMasterySession, GREEN)
- FOUND commit c7e0288 (docs: plan summary)
