---
phase: 30-four-hub-nav-cutover-redirect-shims
plan: 03
subsystem: ui
tags: [sveltekit, navigation, drill-handoff, testing-library]

requires:
  - phase: 30-four-hub-nav-cutover-redirect-shims (plan 01)
    provides: 4-hub navLinks (Lookup/Practice/Learn/Progress) on masthead and phone tab bar
  - phase: 30-four-hub-nav-cutover-redirect-shims (plan 02)
    provides: consumeDrillSeeds() wiring in /practice's load(), so seeded handoffs resolve into a queue
provides:
  - Every Progress drill handoff (danger cards, weakest "Drill these", empty CTA, streak CTA, per-symbol) navigates to /practice
  - Lookup "Drill it" handoff navigates to /practice
  - No Progress or Lookup source references the retired /drills route
affects: [31-no-regression-gate-test-remap]

tech-stack:
  added: []
  patterns:
    - "Handoff pattern unchanged: setDrillSeeds(...) then void goto('/practice') — only the navigation target moved, seed-write side untouched"

key-files:
  created: []
  modified:
    - src/lib/components/ProgressStats.svelte
    - src/routes/+page.svelte
    - tests/progress.e2e.test.ts
    - src/routes/progressCalibration.test.ts
    - src/routes/lookupDrillIt.test.ts

key-decisions:
  - "All five ProgressStats.svelte handoffs (drillDangerCards, empty-state CTA href, streak CTA href, per-symbol onDrill, drillThese) repointed to /practice with setDrillSeeds(...) calls left byte-identical"
  - "Lookup's drillIt() repointed to /practice; setDrillSeeds([result.symbol]) unchanged"
  - "Rule 1 auto-fix: tests/progress.e2e.test.ts's masthead nav-link test failed because the 4-hub nav (shipped in 30-01) now renders a 'Progress' link in both the desktop masthead and the phone bottom tab bar in jsdom (no media-query differentiation) — scoped the query to within(getByTestId('masthead')), matching the established Phase 23-04 pattern for masthead-scoped assertions"

patterns-established: []

requirements-completed: [HUB-03]

coverage:
  - id: D1
    description: "ProgressStats.svelte's 5 drill handoffs (danger cards, weakest Drill these, empty CTA, streak CTA, per-symbol) navigate to /practice with setDrillSeeds intact"
    requirement: "HUB-03"
    verification:
      - kind: unit
        ref: "tests/progress.e2e.test.ts#Drill all N button (weakest spots -> seeded session)"
        status: pass
      - kind: unit
        ref: "src/routes/progressCalibration.test.ts#lists the confident-but-wrong danger cards and the drill CTA seeds their symbols + navigates to /practice"
        status: pass
    human_judgment: false
  - id: D2
    description: "Lookup 'Drill it' handoff navigates to /practice with setDrillSeeds(['Cm7']) intact"
    requirement: "HUB-03"
    verification:
      - kind: unit
        ref: "src/routes/lookupDrillIt.test.ts#Drill it handoff on the Chord Lookup result > seeds the resolved symbol and navigates to /practice"
        status: pass
    human_judgment: false
  - id: D3
    description: "No Progress or Lookup source file references the retired /drills route"
    requirement: "HUB-03"
    verification:
      - kind: other
        ref: "grep -n \"'/drills'\" src/lib/components/ProgressStats.svelte src/routes/+page.svelte tests/progress.e2e.test.ts src/routes/progressCalibration.test.ts src/routes/lookupDrillIt.test.ts (zero matches)"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-25
status: complete
---

# Phase 30 Plan 03: Repoint Progress + Lookup Drill Handoffs Summary

**All 6 Progress/Lookup drill handoffs (5 in ProgressStats.svelte, 1 in Lookup's drillIt) now target /practice instead of the retired /drills route, with setDrillSeeds(...) untouched and the asserting tests updated in the same plan.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-25T12:15:00Z
- **Completed:** 2026-07-25T12:27:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- ProgressStats.svelte: all five drill handoffs (danger-cards goto, weakest "Drill these" goto, empty-state CTA href, streak CTA href, per-symbol onDrill goto) now target `/practice`
- Lookup's `drillIt()` handler now navigates to `/practice`
- Updated the three test files asserting these handoffs (`tests/progress.e2e.test.ts`, `src/routes/progressCalibration.test.ts`, `src/routes/lookupDrillIt.test.ts`) so the suite stays green
- Fixed a pre-existing regression in `tests/progress.e2e.test.ts`'s masthead nav-link test, broken by 30-01's 4-hub nav cutover (unscoped `getByRole` now matched both the masthead and the phone tab bar's "Progress" link)

## Task Commits

1. **Task 1: Repoint Progress + Lookup drill handoffs to /practice** - `4263bf1` (feat)
2. **Task 2: Update Progress + Lookup handoff tests to assert /practice** - `efa6e82` (test)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src/lib/components/ProgressStats.svelte` - 5 handoffs repointed from `/drills` to `/practice`
- `src/routes/+page.svelte` - Lookup `drillIt()` repointed to `/practice`
- `tests/progress.e2e.test.ts` - href/goto assertions updated to `/practice`; masthead Progress-link test scoped to `within(masthead)`
- `src/routes/progressCalibration.test.ts` - danger-card drill goto assertion updated to `/practice`
- `src/routes/lookupDrillIt.test.ts` - Drill it handoff test + describe/it wording updated to `/practice`

## Decisions Made
- All navigation-target changes are hardcoded string literal edits (`/drills` -> `/practice`); no new abstraction introduced, matching the plan's minimal-diff intent.
- The masthead nav-link test fix used the existing `within(getByTestId('masthead'))` scoping convention established in Phase 23-04, rather than inventing a new query pattern.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed masthead Progress-link test broken by prior nav cutover**
- **Found during:** Task 2 verification (`npm test -- tests/progress.e2e.test.ts ...`)
- **Issue:** `tests/progress.e2e.test.ts`'s "progress masthead nav link" test called `screen.getByRole('link', { name: 'Progress' })` unscoped. Since 30-01 shipped the 4-hub nav, both the desktop masthead and the phone bottom tab bar now render a "Progress" link (jsdom renders both regardless of viewport/media query), so the unscoped query threw a multiple-elements-found error. This was a regression from a prior plan in the same phase, not something introduced by this plan's own edits, but it blocked this plan's own verification (`npm test` on this exact file).
- **Fix:** Scoped the query to `within(screen.getByTestId('masthead'))`, matching the precedent set in Phase 23-04 for exactly this dual-render issue.
- **Files modified:** tests/progress.e2e.test.ts
- **Verification:** `npm test -- tests/progress.e2e.test.ts src/routes/progressCalibration.test.ts src/routes/lookupDrillIt.test.ts` — 28/28 pass.
- **Committed in:** efa6e82 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug fix)
**Impact on plan:** Fix was necessary to keep the plan's own verify command green; no scope creep beyond the one test's query scoping.

## Issues Encountered
None beyond the deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All Progress and Lookup drill handoffs now land on `/practice`, consistent with 30-02's seed-consumption wiring.
- `npm run check` clean (1394 files, 0 errors, 0 warnings).
- Remaining Phase 30 plans (04/05) continue the cutover for other handoffs and redirect shims; Phase 31 owns the comprehensive test remap and final no-regression gate.

---
*Phase: 30-four-hub-nav-cutover-redirect-shims*
*Completed: 2026-07-25*

## Self-Check: PASSED

All modified/created files confirmed present on disk; both task commits (`4263bf1`, `efa6e82`) confirmed in git log.
