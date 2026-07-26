---
phase: 26-shared-intervalview-component
plan: 01
subsystem: theory
tags: [chord-presentation, interval-theory, tdd, pure-module]

# Dependency graph
requires: []
provides:
  - "stackedThirdsFor(chord): StackedThirds — pure stacked-thirds derivation reusing formulaFor for tones and intervalBetween for gaps"
  - "StackedGap / StackedThirds exported interfaces"
affects: [26-02, 26-03, 28-learn-hub]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Derivation-then-render split: pure module computes (chordPresentation.ts), component only renders (mirrors formulaFor/WhyTheseNotes convention)"

key-files:
  created: []
  modified:
    - src/lib/lookup/chordPresentation.ts
    - src/lib/lookup/chordPresentation.test.ts

key-decisions:
  - "stackedThirdsFor.tones is formulaFor(chord) verbatim (no recompute) — single source of truth for tone labels/roles/letters/solfege"
  - "gaps derived via intervalBetween on consecutive chord.notes pairs, the same interval-naming path WhyTheseNotes already uses — no second interval engine introduced"

patterns-established:
  - "Pure derivation functions live beside formulaFor in chordPresentation.ts and are proven by unit tests before any component consumes them (TDD RED/GREEN gate)"

requirements-completed: [IVW-01, IVW-03]

coverage:
  - id: D1
    description: "stackedThirdsFor(chord) derives gaps (interval between adjacent tones) and reuses formulaFor's tones verbatim, covering every v1 chord quality (m7/maj7/dom7/m7b5/dim7/triad/extended)"
    requirement: "IVW-01"
    verification:
      - kind: unit
        ref: "src/lib/lookup/chordPresentation.test.ts#stackedThirdsFor"
        status: pass
    human_judgment: false
  - id: D2
    description: "Accidental carry-through: stackedThirdsFor inherits solfège spelling (e.g. Mi♭, Si♭) from formulaFor for altered chord tones"
    requirement: "IVW-03"
    verification:
      - kind: unit
        ref: "src/lib/lookup/chordPresentation.test.ts#stackedThirdsFor > carries the E♭ third solfege \"Mi♭\" and B♭ seventh solfege \"Si♭\" through for Cm7 (IVW-03)"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-24
status: complete
---

# Phase 26 Plan 01: Stacked-Thirds Derivation Summary

**Pure `stackedThirdsFor(chord)` function added beside `formulaFor` in chordPresentation.ts, proven by 12 new unit tests covering every v1 chord quality and IVW-03 accidental carry-through.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-24T18:02:10Z
- **Completed:** 2026-07-24T18:06:16Z
- **Tasks:** 2 (RED, GREEN)
- **Files modified:** 2

## Accomplishments
- `stackedThirdsFor(chord: ChordResult): StackedThirds` exported from `chordPresentation.ts`, with `StackedGap`/`StackedThirds` interfaces
- `tones` field is `formulaFor(chord)`'s output verbatim — proven by `toEqual(formulaFor(...))` assertion, locking the "one naming path" contract
- `gaps` field walks consecutive `chord.notes` pairs through the shared `intervalBetween`, matching `WhyTheseNotes`' existing interval-naming path (grep-confirmed, no second interval engine)
- New `describe('stackedThirdsFor')` test block: one fixture per quality (Cm7, Cmaj7, C7, Cm7b5, Cdim7, Cm triad, Cmaj9 extended), the `gaps.length === tones.length - 1` invariant across all fixtures, IVW-03 accidental carry-through (E♭→"Mi♭", B♭→"Si♭"), `longFr` tooltip text, totality (unrecognized chord → empty arrays, never throws), and no-em-dash hygiene

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing unit tests for stackedThirdsFor (RED)** - `2ea8ca8` (test)
2. **Task 2: Implement stackedThirdsFor (GREEN)** - `1708e35` (feat)

_TDD cycle: RED confirmed all 12 new assertions failed with `stackedThirdsFor is not a function` before implementation; GREEN confirmed all 33 tests (12 new + 21 pre-existing) pass after implementation. No refactor commit needed — implementation was clean on first pass._

## Files Created/Modified
- `src/lib/lookup/chordPresentation.ts` - Added `StackedGap`, `StackedThirds` interfaces and `stackedThirdsFor(chord)` function directly after `formulaFor`
- `src/lib/lookup/chordPresentation.test.ts` - Added `describe('stackedThirdsFor')` test block with 12 new test cases

## Decisions Made
- `tones = formulaFor(chord)` verbatim, no recomputation of labels/roles/letters/solfège — keeps a single naming source for root-relative tone identity
- `gaps` computed via `intervalBetween(chord.notes[i].letter, chord.notes[i+1].letter)`, the identical function `WhyTheseNotes` already calls for consecutive-note interval naming — reuses one interval-naming path rather than introducing a parallel one
- Test assertions for the extended-chord case (Cmaj9) derive expected gap labels dynamically from `intervalBetween` on the chord's own consecutive letters rather than hardcoding exotic values, per the plan's explicit instruction (avoids brittleness to any future extended-chord voicing detail)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Both tasks completed on the first implementation pass; no auto-fixes, blockers, or architectural questions arose.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `stackedThirdsFor` is ready for Plan 03's component work (thin render layer over this proven derivation) and for Phase 28's reuse (Learn hub interval reference), per the plan's stated purpose.
- Full project test suite (108 files / 1532 tests) passes; `npm run check` reports 0 errors — no regressions introduced.
- No blockers for Plan 02/03/04 of Phase 26.

---
*Phase: 26-shared-intervalview-component*
*Completed: 2026-07-24*

## Self-Check: PASSED

- FOUND: src/lib/lookup/chordPresentation.ts
- FOUND: src/lib/lookup/chordPresentation.test.ts
- FOUND: .planning/phases/26-shared-intervalview-component/26-01-SUMMARY.md
- FOUND: commit 2ea8ca8 (test)
- FOUND: commit 1708e35 (feat)
