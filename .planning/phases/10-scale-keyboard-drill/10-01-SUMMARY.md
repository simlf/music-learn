---
phase: 10-scale-keyboard-drill
plan: 01
subsystem: theory
tags: [tonal, chroma-grading, scale-drill, tdd]

# Dependency graph
requires: []
provides:
  - "src/lib/practice/scaleKeyboardDrill.ts: pure chroma-graded 15-target ascending/descending scale drill state machine"
  - "placeAscendingScaleKeys: ascending key-placement helper for a fixed 2-octave board with a distinct octave key"
affects: [10-scale-keyboard-drill plan 02 (ScaleKeyboardDrill.svelte component build)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Chroma-only grading (Note.chroma via toAsciiAccidentals), octave-agnostic, mirroring gradeIntervalTap's precedent"
    - "Unified left-to-right key ordinal (white index*2, black afterWhiteIndex*2+1) for single-cursor ascending placement, replacing assignNotesToKeys' collision-prone dual-array cursor for this drill's needs"

key-files:
  created:
    - src/lib/practice/scaleKeyboardDrill.ts
    - src/lib/practice/scaleKeyboardDrill.test.ts
  modified: []

key-decisions:
  - "Grading scope is chroma/pitch-class, octave-agnostic: any visible key whose chroma matches the expected degree is accepted, per the plan's recorded design decision (2-octave board can show a pitch class twice)."
  - "placeAscendingScaleKeys builds its own unified ordered key list rather than reusing assignNotesToKeys, to guarantee the returning octave (degree 8) lands on a distinct key from the tonic even when degree 7 is a black key immediately before it."

patterns-established:
  - "New pure practice modules follow generateIntervalQuestion.ts's total-function style: unparseable input returns false/null/empty rather than throwing."

requirements-completed: [SCALE-04]

coverage:
  - id: D1
    description: "gradeScaleTap grades taps by chroma (Note.chroma), never letter-string equality, octave-agnostic like gradeIntervalTap"
    requirement: "SCALE-04"
    verification:
      - kind: unit
        ref: "src/lib/practice/scaleKeyboardDrill.test.ts#scale keyboard drill sequence (chroma-graded, ascending then descending)"
        status: pass
    human_judgment: false
  - id: D2
    description: "15-target ascending-then-descending sequence (degrees 1-8 up, 7-1 down) with position/done as the sole completion signal"
    requirement: "SCALE-04"
    verification:
      - kind: unit
        ref: "src/lib/practice/scaleKeyboardDrill.test.ts#starts at position 0, not done, with 15 targets"
        status: pass
      - kind: unit
        ref: "src/lib/practice/scaleKeyboardDrill.test.ts#descending walk: continuing with B A G F E D C advances position 8 to 15 and completes"
        status: pass
    human_judgment: false
  - id: D3
    description: "Enharmonic degrees grade correctly by chroma (F♯ major's E♯ accepted as F; D♭ major's G♭ accepted as F♯)"
    requirement: "SCALE-04"
    verification:
      - kind: unit
        ref: "src/lib/practice/scaleKeyboardDrill.test.ts#enharmonic acceptance by chroma: F♯ major degree 7 (E♯, chroma 5) accepts tapped F"
        status: pass
      - kind: unit
        ref: "src/lib/practice/scaleKeyboardDrill.test.ts#enharmonic acceptance by chroma: D♭ major degree 4 (G♭, chroma 6) accepts tapped F♯"
        status: pass
    human_judgment: false
  - id: D4
    description: "placeAscendingScaleKeys places 8 ascending degrees on a fixed 2-octave board with a distinct octave key (not collapsed onto the tonic)"
    requirement: "SCALE-04"
    verification:
      - kind: unit
        ref: "src/lib/practice/scaleKeyboardDrill.test.ts#G major: tonic at white keyIndex 4, degree 7 (F♯) is black, octave distinct at white keyIndex 11"
        status: pass
      - kind: unit
        ref: "src/lib/practice/scaleKeyboardDrill.test.ts#F♯ major: tonic is black (leftmost highlighted), degree 7 (E♯) is white F key, octave is black and distinct"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-07-15
status: complete
---

# Phase 10 Plan 01: Chroma Scale Keyboard Drill Logic Summary

**Pure TDD module replacing scaleDrill.ts's letter-equality grading with a 15-target chroma-graded ascending/descending sequence and a collision-free ascending key-placement helper for the forced 2-octave board.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-07-14T22:00:00Z
- **Completed:** 2026-07-14T22:12:30Z
- **Tasks:** 2 (TDD: RED, GREEN)
- **Files modified:** 2

## Accomplishments
- `createScaleKeyboardDrillState`/`expectedTarget`/`gradeScaleTap`: total, octave-agnostic chroma grading across the full 15-target ascending-then-descending sequence, matching `gradeIntervalTap`'s precedent exactly (no letter-string comparison anywhere in the module).
- Enharmonic correctness proven by test: F♯ major's E♯ (chroma 5) accepted on the F key; D♭ major's G♭ (chroma 6) accepted on the F♯ key.
- `placeAscendingScaleKeys`: a single unified left-to-right key ordinal (interleaving white/black by true pitch order) lets one cursor walk place all 8 ascending degrees, provably landing the octave (degree 8) on a key distinct from the tonic — including the G-major and F♯-major cases where the 7th degree is a black key immediately preceding the octave, the exact collision `assignNotesToKeys` cannot avoid.

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — failing unit tests for the chroma scale-drill sequence and key placement** - `c8d6a06` (test)
2. **Task 2: GREEN — implement the chroma sequence engine and ascending key placement** - `4573ab2` (feat)

**Plan metadata:** (this commit) `docs: complete plan`

_Note: no REFACTOR commit was needed — the GREEN implementation required no cleanup pass._

## Files Created/Modified
- `src/lib/practice/scaleKeyboardDrill.ts` - New pure module: 15-target chroma sequence state machine, octave-agnostic grader, ascending key placement with distinct octave key
- `src/lib/practice/scaleKeyboardDrill.test.ts` - 13 Vitest cases covering sequence state, chroma grading, enharmonic acceptance, and placement geometry (C/G/F♯ major fixtures)

## Decisions Made
- Grading scope is chroma/pitch-class, octave-agnostic (recorded in the plan's own design-decision note): any visible key matching the expected degree's chroma is accepted, since the 2-octave board can present a pitch class more than once outside the canonical fill position.
- `placeAscendingScaleKeys` deliberately does not import or call `assignNotesToKeys`; it builds its own unified ascending key ordinal to avoid that helper's dual white/black cursor collision on the returning octave.

## Deviations from Plan

None — plan executed exactly as written. Note: the Task 1 test file (`src/lib/practice/scaleKeyboardDrill.test.ts`) was found already present as an untracked file at execution start, matching the plan's behavior spec verbatim (all enharmonic fixtures, acceptance criteria, and grep checks verified against it before committing as the RED commit). This was adopted as-is rather than rewritten, since it fully satisfied Task 1's `<behavior>` and `<acceptance_criteria>` blocks and failed for the correct reason (missing module, confirmed via `npx vitest run`).

## Issues Encountered
None. `npx tsc --noEmit` reports one pre-existing, unrelated type error in `src/lib/components/pianoKeyboardInspect.test.ts` (a `*.svelte` module export-shape issue, confirmed present before this plan's changes via `git stash`) — out of scope per the plan's file list, logged here per the executor's scope-boundary rule rather than fixed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `scaleKeyboardDrill.ts` exports exactly the symbols Plan 10-02 needs (`createScaleKeyboardDrillState`, `expectedTarget`, `gradeScaleTap`, `placeAscendingScaleKeys`, `SCALE_DRILL_OCTAVES`) to build `ScaleKeyboardDrill.svelte` and retire `ScalePractice.svelte`/`scaleDrill.ts`.
- No blockers. The distinct-octave-key placement (the tricky part) is proven under test for both a black-key-tonic (F♯) and a black-key-seventh-degree (G) case before any UI is built on top of it.

---
*Phase: 10-scale-keyboard-drill*
*Completed: 2026-07-15*

## Self-Check: PASSED
