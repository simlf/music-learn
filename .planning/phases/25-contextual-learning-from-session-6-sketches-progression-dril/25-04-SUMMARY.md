---
phase: 25-contextual-learning-from-session-6-sketches-progression-dril
plan: 04
subsystem: practice
tags: [localstorage, calibration, metacognition, tdd]

# Dependency graph
requires: []
provides:
  - "confidenceLog.ts: capped localStorage persistence for per-review confidence ratings"
  - "calibration() aggregation for the /progress calibration-bar payoff view"
  - "dangerCards() aggregation for the /progress confident-but-wrong list"
affects: [25-06, 25-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "music-learn:* localStorage total-function convention extended to a fourth log (confidence-log) alongside songs.ts/recentLookups.ts/songFilterPref.ts"
    - "Ring-buffer cap (slice(-CAP)) as the bounded-growth pattern for append-only local logs"

key-files:
  created:
    - src/lib/practice/confidenceLog.ts
    - src/lib/practice/confidenceLog.test.ts
  modified: []

key-decisions:
  - "localStorage over Dexie for the confidence log: small single-user record volume, matches the existing lightweight-log convention, avoids a schema-version bump on the critical cards Dexie store"
  - "calibration()'s miscalibrated flag requires both certain and somewhat levels to have at least one sample (divide-by-zero guard), matching the plan's explicit acceptance criterion"

patterns-established:
  - "calibration()/dangerCards() are pure aggregation functions over ConfidenceEntry[] (not coupled to the storage read), so 25-08's /progress view can call them directly against listConfidence() output or test fixtures"

requirements-completed: [SK-020B]

coverage:
  - id: D1
    description: "logConfidence/listConfidence: capped ring-buffer localStorage persistence, corrupt-store degrades to [], per-entry malformed-drop, setItem-throws silent no-op"
    requirement: "SK-020B"
    verification:
      - kind: unit
        ref: "src/lib/practice/confidenceLog.test.ts#confidenceLog localStorage persistence > logConfidence + listConfidence"
        status: pass
    human_judgment: false
  - id: D2
    description: "calibration(entries): per-level accuracy for unsure/somewhat/certain (unrated excluded), miscalibrated flag when certain-accuracy < somewhat-accuracy, divide-by-zero guarded"
    requirement: "SK-020B"
    verification:
      - kind: unit
        ref: "src/lib/practice/confidenceLog.test.ts#confidenceLog localStorage persistence > calibration"
        status: pass
    human_judgment: false
  - id: D3
    description: "dangerCards(entries): certain-and-wrong entries grouped by factId+mode, sorted wrongCount descending"
    requirement: "SK-020B"
    verification:
      - kind: unit
        ref: "src/lib/practice/confidenceLog.test.ts#confidenceLog localStorage persistence > dangerCards"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-07-20
status: complete
---

# Phase 25 Plan 04: Confidence Log + Calibration Summary

**Capped localStorage confidence-review log (music-learn:confidence-log) with pure calibration() and dangerCards() aggregation functions backing sketch 020-B/020-C, built TDD-first with 13 passing tests.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-20T22:41:00Z
- **Completed:** 2026-07-20T22:45:05Z
- **Tasks:** 2 completed
- **Files modified:** 2 (both new)

## Accomplishments
- `logConfidence`/`listConfidence` implement a corruption-tolerant, capped (500-entry) ring-buffer log of per-review confidence ratings under the `music-learn:confidence-log` key, matching the project's existing `music-learn:*` total-function persistence convention (songs.ts, recentLookups.ts, songFilterPref.ts).
- `calibration(entries)` computes per-level accuracy (unsure/somewhat/certain, unrated excluded) and a `miscalibrated` flag (certain-accuracy < somewhat-accuracy, divide-by-zero guarded) for the future /progress calibration-bar view.
- `dangerCards(entries)` groups certain-yet-wrong reviews by factId+mode into a wrongCount-descending list for the future /progress "confident but wrong" card list.
- Full TDD RED→GREEN cycle: 13 tests written first against the not-yet-existing module, confirmed failing at import, then a from-scratch implementation turned the suite green with no test edits.

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — confidence log + calibration test suite** - `a48150d` (test)
2. **Task 2: GREEN — implement the confidence log + calibration aggregation** - `b194ae5` (feat)

**Plan metadata:** (this commit, follows)

_Note: no REFACTOR commit was needed — the GREEN implementation required no cleanup pass._

## Files Created/Modified
- `src/lib/practice/confidenceLog.ts` - Confidence log persistence (logConfidence/listConfidence) + calibration()/dangerCards() aggregation; localStorage-only, cards Dexie store untouched
- `src/lib/practice/confidenceLog.test.ts` - 13-test TDD suite covering cap/ring-buffer, corruption degrade-to-[], setItem-throws no-op, calibration miscalibration/divide-by-zero, dangerCards grouping/sort

## Decisions Made
- localStorage over Dexie: documented in the plan and restated in the module header — small single-user record volume, matches the lightweight-log convention, avoids a Dexie schema-version bump on the critical cards store.
- `calibration()`'s per-level rows are always returned in a fixed `['unsure', 'somewhat', 'certain']` order (not derived from input order), so the future /progress bar chart can render a stable three-bar layout without re-sorting.
- `miscalibrated` requires both compared levels to have >=1 sample; with zero samples in either the flag is `false` rather than misleadingly `true` from a `0/0` comparison.

## Deviations from Plan

None - plan executed exactly as written. Task 1's RED verification and Task 2's acceptance criteria (vitest pass, `npm run check` clean, `music-learn:confidence-log` key present, no dexie/svelte imports, non-JSON garbage returns `[]`) all passed without any auto-fix.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `src/lib/practice/confidenceLog.ts`'s five exports (`Confidence`, `ConfidenceEntry`, `CONFIDENCE_LOG_CAP`, `logConfidence`, `listConfidence`, `calibration`, `dangerCards`) are ready for 25-06 (confidence-dot capture wired into Recall's reveal flow) and 25-08 (calibration bars + danger-card list on /progress).
- No blockers. Full project suite (99 files, 1404 tests) and `npm run check` (0 errors/warnings) both green after this plan.

---
*Phase: 25-contextual-learning-from-session-6-sketches-progression-dril*
*Completed: 2026-07-20*

## Self-Check: PASSED

- FOUND: src/lib/practice/confidenceLog.ts
- FOUND: src/lib/practice/confidenceLog.test.ts
- FOUND: .planning/phases/25-contextual-learning-from-session-6-sketches-progression-dril/25-04-SUMMARY.md
- FOUND commit: a48150d
- FOUND commit: b194ae5
