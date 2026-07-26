---
phase: 29-progress-hub-stats-streak-review-map-songs
plan: 05
subsystem: testing
tags: [vitest, testing-library-svelte, progress-hub, regression-gate]

# Dependency graph
requires:
  - phase: 29-04
    provides: The Progress hub host at /progress/+page.svelte (Stats|Recall|Songs tab switch, data-review-dock gating)
provides:
  - tests/progress-hub.e2e.test.ts, the standing REG-02 smoke/regression gate for the Progress hub composition
affects: [31 (no-regression gate + test remap, per v2.2 roadmap)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hub-level e2e test mirrors the mock scaffolding of the section it composes (progress.e2e.test.ts's stats mocks) plus the empty $lib/srs/deck mock (coverage.test.ts's pattern) so a hub rendering multiple extracted sections stays deterministic without IndexedDB"

key-files:
  created:
    - tests/progress-hub.e2e.test.ts
  modified: []

key-decisions:
  - "Song-filter write assertion reads the real readSongFilter() (the single-key `music-learn:song-filter` contract), not a nonexistent visual indicator, per the plan's explicit correction of an earlier draft"
  - "data-review-dock assertion walks the full lifecycle (absent on Stats -> present on Recall+Review -> absent on Recall+Map -> absent on Songs) in one test, since the coupling is the plan's CRITICAL regression target"

requirements-completed: [PROG-01]

coverage:
  - id: D1
    description: "tests/progress-hub.e2e.test.ts: Progress hub smoke test covering tab switch (Stats default, pressed/unpressed states), each section's core affordances (token-entry/practice-settings on Stats, mode-toggle/recall-map-grid on Recall, song-filter-toggle-bar/7 preset-cards on Songs), the readSongFilter() write contract, and data-review-dock gating"
    requirement: "PROG-01"
    verification:
      - kind: unit
        ref: "tests/progress-hub.e2e.test.ts (6 tests, all pass)"
        status: pass
      - kind: unit
        ref: "npm test (full suite): 119 files, 1611 tests, all pass"
        status: pass
      - kind: other
        ref: "npx svelte-check: 0 errors, 0 warnings (1392 files)"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-25
status: complete
---

# Phase 29 Plan 05: Progress Hub Smoke Test Summary

**Added tests/progress-hub.e2e.test.ts: a 6-test smoke/regression gate proving the Progress hub's three-tab switch, each section's mount-time affordances, the shared song-filter write via the real readSongFilter() contract, and the data-review-dock gating that must never leak onto Stats or Songs.**

## Performance

- **Duration:** 12 min
- **Tasks:** 1 completed
- **Files modified:** 1 (created)

## Accomplishments

- Created `tests/progress-hub.e2e.test.ts`, rendering the real `ProgressPage` hub host with mock scaffolding copied verbatim from `tests/progress.e2e.test.ts` (stats/API/audio/level/drill-seed/navigation mocks) plus an empty `$lib/srs/deck` mock (mirroring `coverage.test.ts`) so the Recall tab's `RecallSession`/`RecallMap` render deterministically without IndexedDB.
- Tab-switch test: asserts all three tabs render inside `role="group" name=/progress hub sections/i`, with Stats `aria-pressed=true` and Recall/Songs `aria-pressed=false` on first render.
- Stats-default test: `progress-token-entry` and `practice-settings` present with zero tab clicks.
- Recall test: clicking the Recall tab shows the nested `mode-toggle` group with Review pressed and a Map button; clicking Map reveals `recall-map-grid`.
- Songs test: clicking the Songs tab shows `song-filter-toggle-bar` and exactly 7 `preset-card` elements.
- Song-filter write test: clicks the real `<button>` inside `song-filter-toggle-bar` and asserts the true `readSongFilter()` (imported unmocked, reading the real `music-learn:song-filter` localStorage key) flips from `false` to `true` — the actual single-key contract Practice/Recall read, not a nonexistent visual indicator.
- Review-dock gating test: asserts `container.querySelector('main')` has no `data-review-dock` attribute on default Stats, gains it after switching to Recall (default Review mode), loses it after clicking Map within Recall, and stays absent after switching to Songs.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the Progress hub smoke test** - `4539824` (test)

**Plan metadata:** (this commit)

## Files Created/Modified

- `tests/progress-hub.e2e.test.ts` - New: the Progress hub's standing smoke/regression test (6 tests).

## Decisions Made

- Followed the plan's explicit correction: asserted the real `readSongFilter()` return value directly rather than a `recall-filtered-indicator` testid, since no such element exists in the codebase.
- Combined all four review-dock lifecycle states (Stats absent, Recall+Review present, Recall+Map absent, Songs absent) into one test for the CRITICAL coupling, since they are one continuous user flow through the same render instance.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- REG-02 is closed for PROG-01: the hub's tab navigation, section composition, song-filter write contract, and dock-gating coupling now have a standing automated regression gate.
- Full vitest suite (119 files, 1611 tests) and `svelte-check` (0 errors/0 warnings, 1392 files) both green with the new test in place.
- Phase 29 (Progress Hub) is now fully executed across all 5 plans; ready for Phase 30 (four-hub nav cutover + redirect shims).

---
*Phase: 29-progress-hub-stats-streak-review-map-songs*
*Completed: 2026-07-25*

## Self-Check: PASSED

- FOUND: tests/progress-hub.e2e.test.ts
- FOUND: 4539824 (Task 1 commit)
