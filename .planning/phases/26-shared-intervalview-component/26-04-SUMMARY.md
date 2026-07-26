---
phase: 26-shared-intervalview-component
plan: 04
subsystem: ui
tags: [svelte, svelte5-runes, i18n, interval-theory, lookup]

requires:
  - phase: 26-03
    provides: "IntervalView.svelte: shared component rendering stacked-thirds (default) or formula view behind a segmented toggle"
provides:
  - "Lookup page (/) renders every resolved chord through the shared IntervalView (stacked-thirds default, formula toggle) instead of a page-local inline formula row"
  - "REG-01/REG-02 regression gate proven: full vitest suite (1541/1541) + svelte-check (0 errors/warnings) green after the swap"
affects: [28-learn-hub]

tech-stack:
  added: []
  patterns:
    - "Lookup page is now a pure consumer of IntervalView: no page-local formula-row markup/CSS remains, matching the phase's cross-hub reuse goal"

key-files:
  created: []
  modified:
    - src/routes/+page.svelte
    - src/routes/lookupWhyPanel.test.ts
    - tests/lookup.e2e.test.ts

key-decisions:
  - "tests/lookup.e2e.test.ts (not in the plan's files_modified scope) also queried the old always-present interval-formula testid in 2 assertions; fixed as a Rule 1 auto-fix (toggle to Formula view first) rather than skipped, since REG-02 requires the full suite green"
  - "IntervalView's toggle Button carries an aria-label ('Formula view'/'Stacked-thirds view') distinct from its visible text ('Formula'/'Stacked'); e2e toggle clicks target the aria-label, the accessible name testing-library resolves"

requirements-completed: [IVW-01, IVW-02, IVW-03]

coverage:
  - id: D1
    description: "Looking up a chord on / renders IntervalView: stacked-thirds shows by default, with a working toggle to the formula view"
    requirement: "IVW-01"
    verification:
      - kind: e2e
        ref: "tests/lookup.e2e.test.ts#lookup page dual naming and interval formula > typing Cm7 and stamping renders the interval-formula chip labels and dual-named notes"
        status: pass
    human_judgment: false
  - id: D2
    description: "Formula view reproduces the pre-swap tap-a-tone-to-inspect behavior exactly (playNote + InspectRegister fill) via onInspectTone={inspectFormulaEntry}"
    requirement: "IVW-02"
    verification:
      - kind: e2e
        ref: "tests/lookup.e2e.test.ts#lookup page interval register (Track C) > tapping a formula column does the same as tapping its key (en default)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Everything else on the Lookup page (ChordGlyph, keyboard, InspectRegister, SongHook, WhyTheseNotes, alias line, buttons, disambiguation prompt, recent-lookups) is unchanged"
    verification:
      - kind: e2e
        ref: "src/routes/lookupWhyPanel.test.ts (all tests) + tests/lookup.e2e.test.ts (all tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Full test suite + svelte-check stay green; lookupWhyPanel assertions target the always-present interval-view wrapper"
    verification:
      - kind: unit
        ref: "npm test (1541/1541 passing)"
        status: pass
      - kind: other
        ref: "npm run check (0 errors, 0 warnings, 1367 files)"
        status: pass
    human_judgment: false

duration: 13min
completed: 2026-07-24
status: complete
---

# Phase 26 Plan 04: Lookup Page IntervalView Integration Summary

**Replaced the Lookup page's inline formula row with `<IntervalView chord={result} onInspectTone={inspectFormulaEntry} />`, so every looked-up chord now shows stacked-thirds by default with a working toggle to the byte-identical formula view, while proving the full 1541-test suite and svelte-check stay green (REG-01/REG-02).**

## Performance

- **Duration:** 13 min
- **Started:** 2026-07-24T20:26:05+02:00
- **Completed:** 2026-07-24T20:39:08+02:00
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `src/routes/+page.svelte`'s inline `data-testid="interval-formula"` block (formula-only, always-visible) is gone, replaced by a single `<IntervalView chord={result} onInspectTone={inspectFormulaEntry} />` inside the same `mt-6`-spaced wrapper
- Every looked-up chord on `/` now renders stacked-thirds by default (root +m3 m3 +M3 P5 +m3 m7 for Cm7) with a segmented toggle to the formula row
- `inspectFormulaEntry`/`handleInspect` untouched; tap-to-inspect (play + `InspectRegister` fill) works identically from both the stacked and formula views since IntervalView's shared tone-column rendering wires `onInspectTone` in both modes
- Dead code removed from `+page.svelte`: the `formulaFor` import, the `IntervalChip` import, and the `.formula-tap` CSS block (all now owned exclusively by `IntervalView.svelte`); the `FormulaEntry` type import stays (used by `inspectFormulaEntry`'s parameter type)
- `src/routes/lookupWhyPanel.test.ts`'s three `within(result).getByTestId('interval-formula')` assertions retargeted to `interval-view` (the always-present outer wrapper), since the default stacked view already renders the resolved chord's note letters
- Full suite (1541/1541) and `npm run check` (0 errors, 0 warnings, 1367 files) green

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace the Lookup formula row with IntervalView** - `5f28803` (feat)
2. **Task 2: Retarget the lookupWhyPanel regression assertions and prove REG-01 green** - `431509d` (test)

## Files Created/Modified
- `src/routes/+page.svelte` - Inline formula block swapped for `<IntervalView>`; dead imports/CSS removed
- `src/routes/lookupWhyPanel.test.ts` - 3 selectors retargeted from `interval-formula` to `interval-view`
- `tests/lookup.e2e.test.ts` - 2 assertions updated to toggle to the Formula view before querying `interval-formula` (not in the plan's own scope; see Deviations)

## Decisions Made
- IntervalView's toggle buttons carry an `aria-label` distinct from their visible text ("Formula view" vs "Formula"); `getByRole('button', { name: ... })` resolves the accessible name (the `aria-label`), not the rendered text, so e2e toggle clicks target the aria-label string
- Kept the DOM-surgery scope to exactly `+page.svelte`'s one block, per plan; the two additional `tests/lookup.e2e.test.ts` fixes are test-only, not app-code changes, so REG-01 ("only `+page.svelte`'s single formula block changed") holds for the app itself

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `tests/lookup.e2e.test.ts` also queried the always-present `interval-formula` testid, outside the plan's own files_modified scope**
- **Found during:** Task 2 (proving the full-suite REG-02 gate)
- **Issue:** The plan stated "this is the only existing test file affected by the swap (verified: no other Lookup test queries the formula row)" but `tests/lookup.e2e.test.ts` has 2 assertions (`typing Cm7 and stamping renders the interval-formula chip labels...` and `interval chips carry the French long name as tooltip...`) that call `screen.getByTestId('interval-formula')` directly after a stamp, with no toggle - these broke once the default view became stacked
- **Fix:** Added `await fireEvent.click(screen.getByRole('button', { name: 'Formula view' }))` before each `getByTestId('interval-formula')` call, reproducing the pre-swap row's content (R/m3/P5/m7 labels) via the toggle rather than rewriting the assertions' intent
- **Files modified:** tests/lookup.e2e.test.ts
- **Verification:** Full suite green (1541/1541); `npm test` and `npm run check` both clean
- **Committed in:** `431509d` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix, out-of-scope test file discovered while proving the REG-02 gate)
**Impact on plan:** Necessary for the plan's own explicit REG-02 success criterion ("Full test suite + svelte-check stay green"). No scope creep into app code - fix is test-only.

## Issues Encountered
None beyond the deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 26's payoff plan is complete: Lookup (`/`) is now a pure consumer of the shared `IntervalView` component with zero page-local formula-row markup remaining
- `IntervalView.svelte` is proven wired end-to-end (render + inspect passthrough + toggle) on a real page, not just in isolation - Phase 28's Learn hub can embed the same component with the same confidence
- Full suite: 1541/1541 passing; `npm run check`: 0 errors, 0 warnings (1367 files)

---
*Phase: 26-shared-intervalview-component*
*Completed: 2026-07-24*

## Self-Check: PASSED

- FOUND: src/routes/+page.svelte
- FOUND: src/routes/lookupWhyPanel.test.ts
- FOUND: tests/lookup.e2e.test.ts
- FOUND: commit 5f28803 (feat)
- FOUND: commit 431509d (test)
