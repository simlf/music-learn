---
phase: 25-contextual-learning-from-session-6-sketches-progression-dril
plan: 08
subsystem: ui
tags: [svelte5, i18n, localstorage, metacognition, progress, tdd]

# Dependency graph
requires:
  - phase: 25-04
    provides: "confidenceLog.ts: listConfidence/calibration/dangerCards"
  - phase: 25-06
    provides: "RecallSession confidence dots writing entries into the confidence log"
provides:
  - "Progress page confidence-calibration section: 3-bar accuracy chart, MISCALIBRATED over-confidence flag, confident-but-wrong danger-card list"
  - "'Drill the danger cards' CTA seeding chord-formula danger cards into /drills"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Device-local confidence-log read lives alongside (not gating) the existing network-driven pageState machine on /progress, rendering unconditionally in every pageState and hiding only when the log itself is empty"

key-files:
  created:
    - src/routes/progressCalibration.test.ts
  modified:
    - src/routes/progress/+page.svelte
    - src/lib/i18n/messages/progress.ts

key-decisions:
  - "3-bar calibration chart chosen over the denser 3x2 right/wrong matrix (resolves 020-C's OPEN sketch call): glanceable on a phone, reuses the Print Shop bar aesthetic of the existing 7-day streak strip, states the miscalibration finding directly via the MISCALIBRATED flag"
  - "The calibration section renders independently of the stats-fetch pageState machine (like Practice Settings), gated only on confidenceEntries.length > 0 - it never depends on the backend token/network round-trip since the confidence log is purely local"
  - "Danger-card display label resolves any factKind via factById (chord-formula -> symbol, interval-size -> shorthand, scale-degree -> tonic+degree), but the 'Drill the danger cards' CTA only seeds chord-formula symbols (the only kind /drills' seeding path accepts) and is hidden when there are zero chord-formula danger cards even if other-kind danger cards exist"
  - "Drill mode code ({MODE} in the danger meta line) stays untranslated/raw, matching the existing chord-symbol/interval-shorthand immunity convention in this same i18n file"

patterns-established:
  - "calibration()'s levels array always yields exactly 3 rows regardless of which levels have data, so the view can render 3 bars unconditionally without any per-bar presence check"

requirements-completed: [SK-020B]

coverage:
  - id: D1
    description: "Progress page renders a confidence-calibration section (3-bar chart, correct/total captions) reading listConfidence()/calibration() from the local confidence log, hidden entirely when the log is empty"
    requirement: "SK-020B"
    verification:
      - kind: unit
        ref: "src/routes/progressCalibration.test.ts#Progress confidence calibration (sketch 020-C) > renders the calibration section with three level bars from the confidence log"
        status: pass
      - kind: unit
        ref: "src/routes/progressCalibration.test.ts#Progress confidence calibration (sketch 020-C) > hides the calibration section entirely when the confidence log is empty"
        status: pass
    human_judgment: false
  - id: D2
    description: "A vermilion MISCALIBRATED flag renders when certain-accuracy < somewhat-accuracy and is absent otherwise, paired with a text label (color is never the sole signal)"
    requirement: "SK-020B"
    verification:
      - kind: unit
        ref: "src/routes/progressCalibration.test.ts#Progress confidence calibration (sketch 020-C) > shows the MISCALIBRATED flag when certain-accuracy is below somewhat-accuracy"
        status: pass
      - kind: unit
        ref: "src/routes/progressCalibration.test.ts#Progress confidence calibration (sketch 020-C) > does not show the MISCALIBRATED flag when certain-accuracy is at or above somewhat-accuracy"
        status: pass
    human_judgment: false
  - id: D3
    description: "Danger-cards list shows confident-but-wrong cards (serif symbol + mono meta line) and a 'Drill the danger cards' CTA seeds their chord symbols via setDrillSeeds then navigates to /drills"
    requirement: "SK-020B"
    verification:
      - kind: unit
        ref: "src/routes/progressCalibration.test.ts#Progress confidence calibration (sketch 020-C) > lists the confident-but-wrong danger cards and the drill CTA seeds their symbols + navigates to /drills"
        status: pass
    human_judgment: false
  - id: D4
    description: "New progress.calibration.* i18n keys exist in both en and fr; i18n coverage/immunity tests pass; npm run check clean"
    requirement: "SK-020B"
    verification:
      - kind: unit
        ref: "src/lib/i18n/coverage.test.ts"
        status: pass
      - kind: other
        ref: "npm run check"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-07-21
status: complete
---

# Phase 25 Plan 08: Confidence Calibration Payoff (Sketch 020-C) Summary

**Progress page ships a 3-bar confidence-vs-correctness chart, a vermilion MISCALIBRATED over-confidence flag, and a confident-but-wrong danger-card list with a one-tap "Drill the danger cards" CTA, all read from 25-04's local confidence log and hidden until data exists.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-21T18:24:00Z
- **Completed:** 2026-07-21T18:34:06Z
- **Tasks:** 2 completed
- **Files modified:** 3 (2 modified, 1 new)

## Accomplishments
- The Progress page now reads `listConfidence()` in `onMount` alongside the existing stats/streak `load()`, deriving `calibration()`/`dangerCards()` (both from 25-04) into a new `data-testid="confidence-calibration"` panel that renders unconditionally in every pageState and disappears entirely when the log is empty.
- A 3-bar accuracy chart (unsure/somewhat/certain) reuses the 7-day streak strip's bordered-block Print Shop aesthetic; each bar's fill height encodes that level's accuracy with a mono `correct/total` caption, always rendering all three bars regardless of which levels have data (`calibration()`'s fixed-order guarantee).
- A vermilion-bordered `MISCALIBRATED` flag (paired with its own text label, never color-only) appears exactly when certain-accuracy is below somewhat-accuracy.
- A danger-cards list renders each confident-but-wrong card as a serif label (resolved via `factById`: chord symbol, interval shorthand, or scale tonic+degree) plus a mono meta line (`certain {N}× wrong · {MODE}`), and a "Drill the danger cards" CTA - shown only when at least one danger card is chord-formula - seeds those chord symbols via `setDrillSeeds` and navigates to `/drills`, mirroring the page's existing `drillThese()` pattern.
- New `progress.calibration.*` i18n keys (heading, body, 3 level labels, MISCALIBRATED word, danger heading/meta/cta) added to both EN and FR, with the `{MODE}` interpolation documented as immune (raw drill mode code, never translated).
- `progressCalibration.test.ts` (5 tests) proves all four required behaviors against the real `confidenceLog` module: three-bar render, MISCALIBRATED gating both directions, danger-card list + CTA seed/navigate, and the empty-log hide-entirely case.

## Task Commits

Each task was committed atomically:

1. **Task 1: Read confidence data + render the calibration section + progress i18n** - `478abc8` (feat)
2. **Task 2: "Drill the danger cards" CTA + calibration test** - `13b13d9` (test)

**Plan metadata:** (this commit, follows)

## Files Created/Modified
- `src/routes/progress/+page.svelte` - New confidence-calibration section (3-bar chart, MISCALIBRATED flag, danger-cards list, drill CTA) + `dangerCardLabel`/`chordDangerSymbols`/`drillDangerCards` helpers + scoped `.calibration-*` CSS
- `src/lib/i18n/messages/progress.ts` - New `progress.calibration.*` keys (EN + FR) plus an immunity-doc addendum for the `{MODE}` interpolation
- `src/routes/progressCalibration.test.ts` - New 5-test regression suite covering the plan's four required behaviors

## Decisions Made
- 3-bar calibration chart over the denser 3x2 matrix (sketch 020-C's OPEN call, resolved per the plan's own frontmatter design decision): glanceable on a phone, reuses the existing streak-strip bar aesthetic, and states the miscalibration finding directly via the flag rather than requiring the viewer to spot it in a grid.
- The calibration section is placed outside the pageState conditional (alongside Practice Settings), gated only on `confidenceEntries.length > 0` - it never depends on the backend stats/streak fetch succeeding, since the confidence log is a purely local artifact independent of the network round-trip.
- `dangerCardLabel` resolves any factKind generically (chord-formula/interval-size/scale-degree) for display, but the CTA's seeding path (`chordDangerSymbols`) only ever includes chord-formula facts, since `/drills`' seeding contract (`setDrillSeeds`) is chord-symbol-only; the CTA is hidden (not disabled) when zero chord-formula danger cards exist even if other-kind danger cards are listed above it.
- The danger meta line's `{MODE}` substitution stays an untranslated raw drill-mode code (`formula`, `see-play`, `hear-name`), matching this file's existing chord-symbol/interval-shorthand immunity convention rather than being keyed per-mode.

## Deviations from Plan

**1. [Task-boundary front-load, no functional impact] The "Drill the danger cards" CTA (planned as Task 2's deliverable) was implemented as part of Task 1's `feat` commit, alongside the rest of the calibration section markup.**
- **Found during:** Task 1 implementation - while writing the danger-cards list markup, the CTA's Button and its `drillDangerCards()` handler were the natural next line in the same template block, and were added inline rather than deferred to a separate Task 2 diff.
- **Impact:** Task 2's `tdd="true"` gate expected a RED (failing) test written against not-yet-existing behavior, then a GREEN implementing commit. Because the CTA already existed when `progressCalibration.test.ts` was written, all 5 tests passed on first run - there was no RED phase for this specific behavior, mirroring the exact same deviation documented in 25-06 (Plan 25-06 Summary, "TDD Gate Compliance").
- **Verification:** All 5 new tests pass; the full existing `progressStudyToggle.test.ts` suite plus the full project suite (102 files, 1422 tests) stayed green; `npm run check` is 0 errors/0 warnings (1352 files).
- **Assessment:** No functional risk - behavior is correctly implemented and fully covered by the regression suite - but this deviates from the plan's RED-then-GREEN gate sequence for Task 2. Documented here per the gate-sequence-validation requirement rather than re-ordering commits after the fact.

---

**Total deviations:** 1 (TDD gate ordering, no functional impact)
**Impact on plan:** None on correctness or scope; purely a commit-sequencing note, consistent with the same pattern already accepted in 25-06.

## TDD Gate Compliance

Task 2 was marked `tdd="true"`. The plan expected RED (failing test commit) then GREEN (implementing feat commit) for the "Drill the danger cards" CTA behavior specifically. In practice the CTA implementation landed in Task 1's `feat(25-08)` commit (`478abc8`) before the test commit `test(25-08)` (`13b13d9`) - GREEN before a dedicated RED for that one behavior. No `test(...)` commit precedes a `feat(...)` commit for this specific slice in the git log, though the other three behaviors (3-bar render, MISCALIBRATED flag both directions, empty-log hide) were genuinely new-to-the-test-file assertions written against already-shipped Task 1 code, which is the plan's own intended Task 1/Task 2 split for those. Functionality and coverage are complete and verified (see Deviations above); flagging here per the gate-sequence-validation requirement.

## Issues Encountered
None - all verification commands (`npx vitest run src/lib/i18n/coverage.test.ts`, `npx vitest run src/routes/progressCalibration.test.ts`, `npm run check`, full project `npx vitest run`) passed cleanly on first attempt.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The confidence-calibration payoff surface (sketch 020-C) is complete: 25-04's `calibration()`/`dangerCards()` and 25-06's Recall confidence-dot capture now have a consuming UI, closing the metacognition loop for SK-020B end to end.
- No blockers. Full project suite (102 files, 1422 tests) and `npm run check` (0 errors/0 warnings, 1352 files) both green after this plan.

---
*Phase: 25-contextual-learning-from-session-6-sketches-progression-dril*
*Completed: 2026-07-21*

## Self-Check: PASSED

- FOUND: src/routes/progress/+page.svelte
- FOUND: src/lib/i18n/messages/progress.ts
- FOUND: src/routes/progressCalibration.test.ts
- FOUND: .planning/phases/25-contextual-learning-from-session-6-sketches-progression-dril/25-08-SUMMARY.md
- FOUND commit: 478abc8
- FOUND commit: 13b13d9
