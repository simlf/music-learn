---
phase: 13-multi-modal-recall
plan: 06
subsystem: srs
tags: [svelte5, dexie, ts-fsrs, rotation-policy, vitest, testing-library]

# Dependency graph
requires:
  - phase: 13-multi-modal-recall (13-01)
    provides: rotation.ts's pure selectReviewCards/teachClusterModes/clusterGraduated (RECALL-03 policy)
  - phase: 13-multi-modal-recall (13-05)
    provides: RecallSession's embedded Mode C (formula-build) surface and its full mode-chip set
provides:
  - RecallSession.load() now composes cardsByKey/queue from selectReviewCards(due) instead of raw getDueCards() output
  - Integration proof that teach-uncapped/review-capped/hear-name-deprioritized rotation governs a real session's visible queue
  - A single full mixed-mode session test proving RECALL-01/02/03 work together end to end
affects: [phase 14+ (any future recall-queue or rotation-policy change), verify-work UAT for v2.0 milestone close]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Queue-composition seam: load() filters raw getDueCards() through a pure rotation function (selectReviewCards) before building cardsByKey/queue, keeping the Dexie read and the rotation policy decoupled."
    - "Component-test fixture overrides: a small local makeCardWithState(factId, factKind, mode, overrides) helper builds CardRecord fixtures with explicit state/stability/difficulty, distinct from the pre-existing makeCard() helper (which hardcodes State.New via newCard(NOW))."

key-files:
  created: []
  modified:
    - src/lib/components/RecallSession.svelte
    - src/lib/components/recallSession.test.ts

key-decisions:
  - "Used a distinctly named local variable `selectedCards` (not `selected`) for load()'s selectReviewCards(due) result, per the plan's explicit prohibition against shadowing Mode A's existing `selected` Set<string> state."
  - "Review-state test fixtures needed an explicit `difficulty` override (not just `stability`) - ts-fsrs's previewGrades throws FSRSValidationError on difficulty:0 (the New-card default) combined with a non-zero stability for a State.Review card. Set difficulty:5 as a plausible mid-range value on every State.Review fixture in the new tests."

requirements-completed: [RECALL-03, RECALL-01]

coverage:
  - id: D1
    description: "RecallSession.load() composes its queue via selectReviewCards(due) instead of the raw getDueCards() result"
    requirement: "RECALL-03"
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#teach cluster (all State.New, same fact): all 3 cluster cards queue together uncapped, each reachable in sequence"
        status: pass
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#review cards (State.Review, one fact, different stabilities): caps to 2 per encounter and deprioritizes hear-name below its raw stability rank"
        status: pass
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#a fact whose ONLY due card is hear-name still gets included (register reads 1, not 0) and completes normally"
        status: pass
    human_judgment: false
  - id: D2
    description: "A full mixed-mode session (one card per mode, across different facts) completes via each mode's own advance mechanism, proving RECALL-01/02/03 work together"
    requirement: "RECALL-01"
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#a full mixed-mode session (one card per mode, different facts) completes via every mode's own advance mechanism (RECALL-01/02/03 together)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A live session on the actual IndexedDB deck demonstrates the teach-then-review arc: a freshly introduced chord's cluster cards appear together, and a later-due fact caps to 2 mode-cards with the weaker one prioritized"
    verification: []
    human_judgment: true
    rationale: "Requires observing real multi-day IndexedDB state (a freshly introduced chord's cards graduating to State.Review over simulated days) - not reproducible by a single component-test render; the plan's own <verify> block designates this a human-check step."

# Metrics
duration: 25min
completed: 2026-07-15
status: complete
---

# Phase 13 Plan 06: Wire selectReviewCards Rotation into RecallSession Summary

**RecallSession.load() now composes its queue through rotation.ts's selectReviewCards, closing the loop between the pure RECALL-03 policy and the live multi-modal session - proven by 4 new integration tests plus a full mixed-mode (formula/see-play/hear-name/formula-build) session reaching completion via every mode's own advance mechanism.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-15T19:20:00+02:00
- **Completed:** 2026-07-15T19:45:10+02:00
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- `RecallSession.svelte`'s `load()` now builds `cardsByKey`/`queue` from `selectReviewCards(due)` rather than the raw `getDueCards()` result, using a non-shadowing `selectedCards` local.
- Added a "teach cluster uncapped" integration test: 3 `State.New` cards sharing one factId (formula/see-play/formula-build) all queue together, and the session reaches all 3 in sequence, ending at 3 reviewed.
- Added a "review capped + weakest-first" integration test: 3 `State.Review` cards for one factId with differing stabilities (including the lowest-stability card being `hear-name`) cap to 2, with `hear-name` excluded despite its raw stability rank, and the session completes at exactly 2 reviewed - never encountering the hear-name card.
- Added a "hear-name never the sole gate" test: a fact whose only due card is `hear-name` still shows in the register (1, not 0) and completes normally via Mode B's auto-advance.
- Added a full mixed-mode session test spanning 4 different factIds (one card per mode, all `State.New` so none cap each other), driving completion through each mode's own interaction: reveal+grade buttons (formula), Check+Next (see-play), choice-tap+timer-advance (hear-name), embedded BuildSession completion+Next (formula-build) - ending at `pageState === 'complete'` with `reviewedCount === 4`.
- Verified zero regressions: full `npx vitest run` (937 tests, 66 files) and `npm run check` (0 errors, 0 warnings) both pass.

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire selectReviewCards into load(), and prove the full teach/review rotation end to end** - `277c1d3` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `src/lib/components/RecallSession.svelte` - `load()` now imports `selectReviewCards` from `$lib/srs/rotation` and applies it to `due` (once `due.length > 0`) before building `cardsByKey`/`queue`, via a new `selectedCards` local.
- `src/lib/components/recallSession.test.ts` - Added a new describe block ("RecallSession queue composition via selectReviewCards") with a local `makeCardWithState` fixture helper and 4 integration tests covering teach-uncapped, review-capped-weakest-first, hear-name-never-sole-gate, and the full mixed-mode session.

## Decisions Made
- `selectedCards` (not `selected`) chosen deliberately per the plan's explicit prohibition against shadowing Mode A's `selected` Set<string> state variable.
- Review-state test fixtures required a `difficulty: 5` override alongside `stability` overrides: ts-fsrs's `previewGrades` (called reactively for `currentCard`) throws `FSRSValidationError: Invalid memory state { difficulty: 0, stability: 10 }` when a `State.Review` card carries the New-card default `difficulty: 0` from `newCard(NOW)`. This is a test-fixture-only concern (production cards always get a real `difficulty` from an actual `gradeCard` call); no production code was touched to work around it.
- Mixed-mode test used 4 real catalog chord/interval facts chosen so each mode's own established interaction pattern from 13-03/13-04/13-05 could be reused verbatim: `interval-size:m3` (formula), `chord-formula:Dm7` (see-play, natural-letter notes D/F/A/C avoid accidental-name friction), `chord-formula:G7` (hear-name), `chord-formula:Cm7` (formula-build, reusing the exact tap sequence already proven in 13-05's own Mode C tests).

## Deviations from Plan

None - plan executed exactly as written. The `difficulty` override noted above is a test-fixture detail required to make the new Review-state fixtures FSRS-valid; it is not a deviation from the plan's specified behavior, prohibitions, or artifacts.

## Issues Encountered
- Initial review-state test fixtures (built via the new `makeCardWithState` helper with only `state`/`stability` overrides) triggered an uncaught `FSRSValidationError` from `previewGrades` inside `RecallSession`'s reactive `previews` derived, because `newCard(NOW)`'s default `difficulty: 0` is invalid for a `State.Review` card once combined with a non-default `stability`. Resolved by adding `difficulty: 5` to every `State.Review` fixture override in the new tests; re-ran the targeted test file (26/26 passed) and the full suite (937/937 passed) to confirm.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 13 (Multi-modal Recall) is now complete: RECALL-01 (see-play + formula-build recall modes), RECALL-02 (hear-name mode), and RECALL-03 (teach/review rotation policy) are all wired into the live `RecallSession` and proven together by this plan's mixed-mode integration test.
- This is also the final plan of the v2.0 "Learning Upgrade" milestone - no further phases are queued in v2.0's roadmap. Ready for `/gsd-complete-milestone` or a fresh `/gsd-new-milestone` cycle.
- No blockers. The one deferred verification (D3, the multi-day live-IndexedDB rotation check) is explicitly marked `human_judgment: true` in this summary's coverage block and should be picked up by a UAT pass rather than blocking phase closure.

---
*Phase: 13-multi-modal-recall*
*Completed: 2026-07-15*

## Self-Check: PASSED

- FOUND: src/lib/components/RecallSession.svelte
- FOUND: src/lib/components/recallSession.test.ts
- FOUND: .planning/phases/13-multi-modal-recall/13-06-SUMMARY.md
- FOUND: 277c1d3 (Task 1 commit)
