---
phase: 19-interactive-theory
plan: 04
subsystem: ui
tags: [svelte, theory-page, integration-test, testing-library]

requires:
  - phase: 19-interactive-theory
    provides: "InteractiveLesson.svelte: self-contained, no-props guided thirds lesson component from Plan 19-03"
provides:
  - "InteractiveLesson wired onto /theory as the first section, above all existing static reference lessons"
  - "theoryInteractiveLesson.test.ts: integration test proving placement, coexistence, and real component mounting"
affects: [theory-page-integration, LEARN-01-delivery]

tech-stack:
  added: []
  patterns:
    - "Shared Print Shop section wrapper (border-ink bg-paper-bright flex flex-col gap-4 border-2 px-4 py-6) reused verbatim for the interactive lesson's outer chrome, with no duplicate heading since InteractiveLesson renders its own heading/lead internally"

key-files:
  created:
    - src/routes/theoryInteractiveLesson.test.ts
  modified:
    - src/routes/theory/+page.svelte

key-decisions:
  - "The new section-interactive-lesson wrapper carries ONLY the shared card chrome (border/background/padding), no heading or lead text of its own, since InteractiveLesson.svelte already renders 'Play it, don't just read it' internally per Plan 19-03 - avoids a duplicate heading."
  - "Test mocks $lib/audio/audio (playChord/playNote/ensureAudioReady/soundEnabled) at the routes-test level, mirroring drillsSongFilter.test.ts's harness pattern, since both the page's own hearResolution and InteractiveLesson's Hear-it/tap-echo controls call into the audio engine."

patterns-established: []

requirements-completed: [LEARN-01]

coverage:
  - id: D1
    description: "InteractiveLesson renders as the first section on /theory (data-testid=section-interactive-lesson), placed before section-symbol, using the identical Print Shop section wrapper as every other section"
    requirement: "LEARN-01"
    verification:
      - kind: unit
        ref: "src/routes/theoryInteractiveLesson.test.ts#renders the interactive lesson section / places the interactive lesson section before section-symbol in document order"
        status: pass
    human_judgment: false
  - id: D2
    description: "All five existing static lesson sections and the page header remain present and unchanged below the interactive lesson (coexistence, not rip-and-replace)"
    requirement: "LEARN-01"
    verification:
      - kind: unit
        ref: "src/routes/theoryInteractiveLesson.test.ts#keeps the existing static sections rendered (coexistence, not rip-and-replace)"
      - kind: automated
        ref: "grep -n \"section-symbol|section-sevenths\" src/routes/theory/+page.svelte (both testids present, unchanged)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The real InteractiveLesson component mounts (not an empty wrapper) - step 1 title 'The bottom note' visible on page load"
    requirement: "LEARN-01"
    verification:
      - kind: unit
        ref: "src/routes/theoryInteractiveLesson.test.ts#mounts the real InteractiveLesson component (step 1 title visible)"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-07-18
status: complete
---

# Phase 19 Plan 04: Wire InteractiveLesson onto /theory Summary

**Surfaced the guided thirds lesson as the first, primary interactive section on /theory (LEARN-01), placed above all six existing static reference lessons which remain fully intact and reachable below it.**

## Performance

- **Duration:** 10 min
- **Tasks:** 2 completed
- **Files modified:** 2 (1 new, 1 modified)

## Accomplishments

- `src/routes/theory/+page.svelte`: imported `InteractiveLesson` and inserted it inside a new `data-testid="section-interactive-lesson"` section immediately after the page header and before the pre-existing `section-symbol` section. The wrapper reuses the identical Print Shop section chrome (`border-ink bg-paper-bright flex flex-col gap-4 border-2 px-4 py-6`) as every other section, with no duplicate heading (the component renders its own).
- All five existing static lesson sections (`section-symbol`, `section-sevenths`, `section-anchor`, `section-dominant`, `section-diminished`, `section-solfege`) and the page header remain in their original order, byte-unchanged below the new section.
- `src/routes/theoryInteractiveLesson.test.ts` (new): 4-test integration suite proving the section exists, appears first in document order (before `section-symbol`), the static sections still render, and the real `InteractiveLesson` component mounted (step 1 title "The bottom note" visible).
- Zero new type errors (`npm run check`: 1301 files, 0 errors/0 warnings); full project suite green (78 files, 1086 tests).

## Task Commits

Each task was committed atomically:

1. **Task 1: Insert InteractiveLesson as the first section on /theory** - `7d099d3` (feat)
2. **Task 2: Integration test for /theory placement and coexistence** - `e50d5b1` (test)

## Files Created/Modified

- `src/routes/theory/+page.svelte` - Added `InteractiveLesson` import and a new `section-interactive-lesson` wrapper section placed before `section-symbol`; no other lines changed.
- `src/routes/theoryInteractiveLesson.test.ts` - New. Mocks `$lib/audio/audio`, renders the real `/theory` `+page.svelte`, and asserts placement/coexistence/mounting.

## Decisions Made

- **No duplicate heading in the wrapper section:** since `InteractiveLesson.svelte` already renders its own "Play it, don't just read it" heading and lead paragraph internally (per Plan 19-03's design), the new `section-interactive-lesson` wrapper is pure card chrome only, matching the plan's explicit instruction.
- **Audio mock shape mirrors the existing routes-test harness:** `theoryInteractiveLesson.test.ts` mocks `playChord`/`playNote`/`ensureAudioReady`/`soundEnabled` exactly as `drillsSongFilter.test.ts` does, since both the page's pre-existing `hearResolution` handler and `InteractiveLesson`'s own audio calls resolve through the same `$lib/audio/audio` module.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- LEARN-01 is now fully delivered end to end: `InteractiveLesson` (Plan 19-03) is live and reachable as the first thing a visitor to `/theory` sees, with the full static reference-lesson library still available below it.
- This was the final wiring plan in Phase 19 (Interactive Theory, wave 3, depends only on 19-03). No further plans are queued in this phase.
- No blockers.

---
*Phase: 19-interactive-theory*
*Completed: 2026-07-18*

## Self-Check: PASSED

- FOUND: src/routes/theory/+page.svelte
- FOUND: src/routes/theoryInteractiveLesson.test.ts
- FOUND: 7d099d3 (Task 1 commit)
- FOUND: e50d5b1 (Task 2 commit)
