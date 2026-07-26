---
phase: 28-learn-hub-theory-scales-explore-interval-reference
plan: 01
subsystem: ui
tags: [svelte, sveltekit, theory, dry-extraction]

# Dependency graph
requires: []
provides:
  - "src/lib/components/TheoryLessons.svelte — the six shape-first theory lessons as a reusable, route-agnostic component"
  - "/theory as a thin wrapper rendering TheoryLessons"
affects: [28-04-learn-hub-page, 30-nav-cutover]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DRY page-body extraction: move a route's stateful lesson body verbatim into a $lib/components/*.svelte fragment component (no own <main>/<header>/footer), then render it from the thin route wrapper"

key-files:
  created: [src/lib/components/TheoryLessons.svelte]
  modified: [src/routes/theory/+page.svelte]

key-decisions:
  - "TheoryLessons.svelte renders as a bare fragment (seven sections + snippet), owning zero page chrome, so the wrapper's existing gap-8 flex container reproduces byte-identical spacing"
  - "All imports, data constants (SEVENTH_SHAPES/ANCHOR_CHORDS/SOLFEGE_MAP), state, hearResolution(), and onDestroy cleanup moved verbatim into the component; /theory keeps only Button + t + the TheoryLessons import"

patterns-established:
  - "Pattern 1: Lesson-body extraction for hub reuse - a route's interactive lesson content lives in a component under $lib/components/, the route stays a thin shell (header/footer/CTA only)"

requirements-completed: [LEARN-01]

coverage:
  - id: D1
    description: "TheoryLessons.svelte is the single source of the lesson body; /theory renders it as a thin wrapper with byte-identical behavior"
    requirement: "LEARN-01"
    verification:
      - kind: unit
        ref: "tests/theory.e2e.test.ts (16 tests: title/sections, seventh-quality picker swap, anchor picker swap, dominant Hear it / Hear G7 resolve, diminished captions, solfege map, masthead nav link, no em dashes)"
        status: pass
      - kind: unit
        ref: "src/routes/theoryInteractiveLesson.test.ts (5 tests)"
        status: pass
      - kind: other
        ref: "npm run check (svelte-check, 1381 files, 0 errors / 0 warnings)"
        status: pass
      - kind: unit
        ref: "npm test full suite (116 files, 1595 tests)"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-25
status: complete
---

# Phase 28 Plan 01: Extract TheoryLessons Component Summary

**Extracted the six shape-first /theory lessons out of the route into a reusable `TheoryLessons.svelte` component; `/theory` is now a thin wrapper, byte-identical to before, and ready for the Learn hub (Plan 04) to reuse the same component.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-25T03:42:00+02:00
- **Completed:** 2026-07-25T03:44:55+02:00
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `src/lib/components/TheoryLessons.svelte`: the seven lesson sections (interactive-lesson, symbol, sevenths, anchor, dominant, diminished, solfege), the `SEVENTH_SHAPES`/`ANCHOR_CHORDS`/`SOLFEGE_MAP` data constants, the seventh/anchor picker state, `hearResolution()`, the `mnemonicFor` hook snippet, and `onDestroy` timer cleanup — moved verbatim, no logic changes.
- Reduced `src/routes/theory/+page.svelte` to a thin wrapper: page shell, header (h1 "Theory" + subtitle), `<TheoryLessons />`, and the unchanged `/drills` footer button.
- Confirmed REG-01: `tests/theory.e2e.test.ts` (16 tests) and `theoryInteractiveLesson.test.ts` (5 tests) pass with zero test edits; `npm run check` is clean (0 errors/warnings across 1381 files); full suite (116 files / 1595 tests) stays green.

## Task Commits

1. **Task 1: Create TheoryLessons.svelte from the theory lesson body** - `e07f3a3` (feat)
2. **Task 2: Rewire /theory as a thin wrapper around TheoryLessons** - `7dca666` (refactor)

_Note: no TDD tasks in this plan; both are straightforward extraction/rewire commits._

## Files Created/Modified
- `src/lib/components/TheoryLessons.svelte` - The extracted, route-agnostic lesson body (all seven sections + lesson state/logic).
- `src/routes/theory/+page.svelte` - Thin wrapper: page shell + header + `<TheoryLessons />` + footer CTA.

## Decisions Made
- Component renders as a bare fragment (no `<main>`/`<header>`/wrapper `<div>`), so it drops cleanly into the route's existing `flex flex-col gap-8` container with unchanged section spacing — matches the plan's explicit instruction.
- Kept every `data-testid`, class string, and `t()` key exactly as spelled in the original route so the theory e2e suite resolves unedited.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `TheoryLessons.svelte` is ready for Plan 04 (Learn hub) to import and render alongside `ScaleExplorer` and the `IntervalView` reference block.
- `/theory` is unaffected in behavior; no nav or redirect changes were made (out of scope, deferred to Phase 30).

---
*Phase: 28-learn-hub-theory-scales-explore-interval-reference*
*Completed: 2026-07-25*

## Self-Check: PASSED

- FOUND: src/lib/components/TheoryLessons.svelte
- FOUND: src/routes/theory/+page.svelte
- FOUND: e07f3a3 (Task 1 commit)
- FOUND: 7dca666 (Task 2 commit)
