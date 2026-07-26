---
phase: 28-learn-hub-theory-scales-explore-interval-reference
plan: 05
subsystem: ui
tags: [svelte, practice-hub, scale-drill, disclosure, i18n]

# Dependency graph
requires:
  - phase: 28-learn-hub-theory-scales-explore-interval-reference (Plan 03)
    provides: learn.ts i18n domain (learn.scale-practice.* keys, already registered)
  - phase: 27-practice-hub
    provides: the /practice host's pageState machine and hybrid queue (untouched, additive-only)
provides:
  - Additive "Scale practice" disclosure on /practice (collapsed by default, ghost toggle)
  - LEARN-02 reachability: ScaleKeyboardDrill is now reachable via the Practice hub
affects: [30-nav-cutover]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Disclosure block rendered after the pageState {#if}...{/if} chain, before </main>, mirroring the Phase 25 Calibration section's outside-the-machine placement"

key-files:
  created:
    - src/routes/practiceScalePractice.test.ts
  modified:
    - src/routes/practice/+page.svelte

key-decisions:
  - "The disclosure's own scaleExpanded/scaleTonic state never touches pageState, the hybrid queue, or the FSRS grade/advance handlers"
  - "Tonic row uses a distinct data-testid (scale-practice-tonic-row) to avoid colliding with /scales'/ScaleExplorer's tonic-row testid"
  - "Test mocks $lib/srs/deck entirely (empty deck) so load() resolves deterministically to empty-no-deck without needing fake-indexeddb; the disclosure is proven to render regardless of pageState"

patterns-established: []

requirements-completed: [LEARN-02]

coverage:
  - id: D1
    description: "/practice shows a collapsed-by-default 'Scale practice' ghost disclosure (aria-expanded) rendered outside the pageState machine"
    requirement: "LEARN-02"
    verification:
      - kind: unit
        ref: "src/routes/practiceScalePractice.test.ts#/practice: Scale practice disclosure reachability (LEARN-02) > does not render the scale-practice-card on initial render (collapsed by default)"
        status: pass
      - kind: unit
        ref: "src/routes/practiceScalePractice.test.ts#/practice: Scale practice disclosure reachability (LEARN-02) > renders the collapsed \"Scale practice\" ghost toggle with aria-expanded false"
        status: pass
    human_judgment: false
  - id: D2
    description: "Expanding the disclosure reveals a heading, body, 12-tonic picker, and the reused ScaleKeyboardDrill for the chosen tonic (scale-keyboard drill reachable from /practice)"
    requirement: "LEARN-02"
    verification:
      - kind: unit
        ref: "src/routes/practiceScalePractice.test.ts#/practice: Scale practice disclosure reachability (LEARN-02) > expands to reveal the tonic picker and the scale keyboard drill on click"
        status: pass
    human_judgment: false
  - id: D3
    description: "The disclosure never alters the pageState session flow; the single 'Start practice' primary CTA stays the only action-accent (REG-01)"
    verification:
      - kind: unit
        ref: "npx vitest run (full suite, 118 files / 1605 tests, all pre-existing practice/queue/drill suites green unedited)"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-25
status: complete
---

# Phase 28 Plan 05: Additive Scale Practice Disclosure on /practice Summary

**Collapsed-by-default ghost disclosure on /practice that expands to a 12-tonic picker + the reused ScaleKeyboardDrill, rendered entirely outside the pageState machine so it never competes with the single "Start practice" CTA (LEARN-02, REG-01).**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-25T04:07:00Z
- **Completed:** 2026-07-25T04:19:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- The Scales "Practice" drill (`ScaleKeyboardDrill`) is now reachable through the Practice hub via a collapsed, additive disclosure, satisfying LEARN-02.
- The disclosure is byte-isolated from Phase 27's interleaved hybrid queue: its own `scaleExpanded`/`scaleTonic` state never touches `pageState`, the FSRS grade/advance handlers, or the queue composition.
- Added `src/routes/practiceScalePractice.test.ts` proving collapsed-by-default rendering and reveal-on-click of the tonic row + scale keyboard drill.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the additive Scale-practice disclosure to /practice** - `152ba57` (feat)
2. **Task 2: Add the /practice scale-practice reachability test (LEARN-02)** - `5541555` (test)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/routes/practice/+page.svelte` - Added `ScaleKeyboardDrill`/`MAJOR_SCALE_ROOTS`/`majorScaleNotes` imports, `scaleExpanded`/`scaleTonic`/`scaleNotes` state, and the disclosure block placed after the pageState `{#if}...{/if}` chain and before `</main>`.
- `src/routes/practiceScalePractice.test.ts` - New reachability test (LEARN-02): collapsed by default, toggle has `aria-expanded`, expands to reveal `scale-practice-card` + `scale-practice-tonic-row` + `scale-keyboard-drill`.

## Decisions Made
- The tonic row on `/practice` uses `data-testid="scale-practice-tonic-row"` (not the shared `tonic-row` testid `/scales`'/`ScaleExplorer` use), per the plan's explicit instruction to avoid test-id collisions across pages.
- The test mocks `$lib/srs/deck` (`getDueCards`/`getAllCards`/`introduceNewCards`/`recordGrade` all stubbed to an empty deck) rather than pulling in `fake-indexeddb`, since no existing `/practice`-route test file existed to mirror and this is the minimal deterministic path to a stable `pageState` for asserting the disclosure's own behavior, which is independent of `pageState` by construction.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 1's specified verify command referenced non-existent test files**
- **Found during:** Task 1 verification
- **Issue:** The plan's `<verify><automated>` step for Task 1 named `src/routes/practice.e2e.test.ts src/routes/practice-hub.e2e.test.ts src/routes/practice-hub-mix.e2e.test.ts` as existing REG-01 regression suites to re-run. None of these three files exist anywhere in the repo (confirmed via `find`/`grep`) — Phase 27 never shipped a dedicated route-level test file for `/practice` (only component-level tests: `PracticeChordDrill.test.ts`, `PracticeIntervalDrill.test.ts`, `practiceQueue.test.ts`).
- **Fix:** Ran the actual pre-existing tests that exercise the practice-queue/drill logic (`practiceQueue.test.ts`, `PracticeChordDrill.test.ts`, `PracticeIntervalDrill.test.ts`) plus, as the real REG-01 gate, the full project test suite (`npx vitest run`: 118 files / 1605 tests, all green) and `npm run check` (0 errors/warnings). This is a stronger regression check than the three named-but-missing files would have provided.
- **Files modified:** None (verification-only fix).
- **Verification:** `npx vitest run` = 118 passed / 1605 tests; `npm run check` = 0 errors, 0 warnings.
- **Committed in:** N/A (no code change, documented here only).

---

**Total deviations:** 1 auto-fixed (1 blocking - plan referenced test files that don't exist)
**Impact on plan:** No scope creep; the actual regression gate (full suite + type-check) is broader and more reliable than the three missing filenames the plan named.

## Issues Encountered
None beyond the deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- LEARN-02 is complete: the scale-keyboard drill is reachable from `/practice`.
- Phase 28 (Learn Hub) plans 01-05 are now all complete. Ready for Phase 29 (Progress hub) or the Phase 30 nav cutover per the v2.2 roadmap.
- No blockers identified.

---
*Phase: 28-learn-hub-theory-scales-explore-interval-reference*
*Completed: 2026-07-25*

## Self-Check: PASSED

- FOUND: src/routes/practice/+page.svelte
- FOUND: src/routes/practiceScalePractice.test.ts
- FOUND: .planning/phases/28-learn-hub-theory-scales-explore-interval-reference/28-05-SUMMARY.md
- FOUND commit: 152ba57
- FOUND commit: 5541555
