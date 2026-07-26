---
phase: 28-learn-hub-theory-scales-explore-interval-reference
plan: 02
subsystem: ui
tags: [svelte, svelte5, dry-extraction, scales, theory]

# Dependency graph
requires:
  - phase: 28-learn-hub-theory-scales-explore-interval-reference (plan 01)
    provides: TheoryLessons.svelte extraction precedent (bare-fragment component pattern)
provides:
  - ScaleExplorer.svelte, a prop-gated (exploreOnly) reusable component holding the scales tonic picker, scale-title card, and Explore/Practice branch
  - /scales rewired as a thin wrapper around ScaleExplorer with zero behavior change
affects: [28-04 (Learn hub composition), 30 (route consolidation)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prop-gated component reuse: exploreOnly boolean gates the mode-toggle + Practice branch off, defaulting to false so the byte-identical/full-featured render stays the default (mirrors 28-01's TheoryLessons bare-fragment precedent)"

key-files:
  created:
    - src/lib/components/ScaleExplorer.svelte
  modified:
    - src/routes/scales/+page.svelte

key-decisions:
  - "ScaleExplorer owns tonic/mode/inspectPayload state internally; /scales keeps only its page shell (main, h1, subtitle)"
  - "exploreOnly=false path renders byte-identical markup to the pre-extraction /scales body (verified: tests/scales.e2e.test.ts passes with zero edits)"

patterns-established:
  - "Second DRY-extraction seam (after 28-01's TheoryLessons) for the Learn hub: /learn (Plan 04) will render <ScaleExplorer exploreOnly /> for its Scale Explore section"

requirements-completed: [LEARN-01]

coverage:
  - id: D1
    description: "ScaleExplorer.svelte extracted from /scales body with an exploreOnly prop gating the mode toggle and Practice/ScaleKeyboardDrill branch"
    requirement: "LEARN-01"
    verification:
      - kind: unit
        ref: "tests/scales.e2e.test.ts (10 tests, unedited)"
        status: pass
    human_judgment: false
  - id: D2
    description: "/scales rewired as a thin wrapper rendering <ScaleExplorer /> with default props; page shell (main/h1/subtitle) unchanged, behavior byte-identical"
    requirement: "LEARN-01"
    verification:
      - kind: unit
        ref: "tests/scales.e2e.test.ts (10 tests, unedited)"
        status: pass
      - kind: unit
        ref: "full suite: npx vitest run (116 files, 1595 tests, all pass)"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-25
status: complete
---

# Phase 28 Plan 02: Extract ScaleExplorer Component Summary

**Extracted the /scales body into a reusable, prop-gated `ScaleExplorer.svelte` (exploreOnly boolean), then rewired `/scales` as a thin page-shell wrapper around it — zero behavior change, zero test edits.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-25T03:47:39+02:00 (Phase 28 Plan 01 handoff)
- **Completed:** 2026-07-25T03:51:29+02:00
- **Tasks:** 2 completed
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- New `src/lib/components/ScaleExplorer.svelte`: owns `tonic`, `mode`, `inspectPayload` state and the `notes` derived value; renders the tonic-row picker and the bordered scale-title card exactly as `/scales` did, with an `exploreOnly` prop (default `false`) that gates the Explore|Practice mode-toggle group and the `ScaleKeyboardDrill` branch off entirely — when `exploreOnly` is true it renders only the `ScaleDegreeStrip` + `InspectRegister` (ready for the Learn hub's Explore-only section in Plan 04).
- `/scales` reduced to a thin wrapper: `<script>` keeps only `t` + the `ScaleExplorer` import; template keeps the page shell (`<main>`, h1 title, subtitle) and renders `<ScaleExplorer />` with default props for the full Explore+Practice experience.
- REG-01 verified: `tests/scales.e2e.test.ts` passes with zero edits (10/10 tests) — 12-tonic picker, degree-strip re-spelling, inspect flow, French locale (Explorer/Pratiquer toggle, scale-title, idle inspect line) all unchanged.
- Full regression sweep: `npm run check` (0 errors, 0 warnings, 1382 files) and `npx vitest run` (116 files, 1595 tests) both green.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ScaleExplorer.svelte with a prop-gated Practice branch** - `a3798b7` (feat)
2. **Task 2: Rewire /scales as a thin wrapper around ScaleExplorer** - `5e9dfb6` (refactor)

**Plan metadata:** (pending — this SUMMARY's own commit)

## Files Created/Modified
- `src/lib/components/ScaleExplorer.svelte` - New reusable scales-body component; owns tonic/mode/inspect state, prop-gated Practice branch via `exploreOnly`
- `src/routes/scales/+page.svelte` - Reduced to a thin wrapper: page shell only, renders `<ScaleExplorer />` with default props

## Decisions Made
- No architectural deviations. Extraction followed the plan's line-level guidance exactly: markup, classes, `data-testid`s, `t()` keys, and `aria-*` attributes copied verbatim into the new component; the `exploreOnly=false` branch is byte-identical to the pre-extraction route body.
- Confirmed the extraction is a straight lift with no logic changes needed — `pickTonic`/`handleInspect`/`notes` moved as-is.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `ScaleExplorer.svelte` with its `exploreOnly` prop is ready for Plan 04 (`/learn` hub) to render `<ScaleExplorer exploreOnly />` for the Scale Explore section, alongside Plan 01's `TheoryLessons.svelte`.
- No blockers. `/scales` behavior fully unchanged; full test suite and svelte-check clean.

---
*Phase: 28-learn-hub-theory-scales-explore-interval-reference*
*Completed: 2026-07-25*

## Self-Check: PASSED

- FOUND: src/lib/components/ScaleExplorer.svelte
- FOUND: src/routes/scales/+page.svelte
- FOUND: a3798b7
- FOUND: 5e9dfb6
