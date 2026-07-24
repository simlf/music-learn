---
phase: 27-practice-hub
plan: 03
subsystem: ui
tags: [svelte, drills, chord-identification, intervals, chroma-grading]

# Dependency graph
requires:
  - phase: 27-practice-hub
    provides: PracticeQueue composition (27-01) and embed seams on ShellVoicingDrill/ProgressionDrill (27-02)
provides:
  - PracticeChordDrill.svelte - name-it (chord identification) render component with symbol/onComplete seam
  - PracticeIntervalDrill.svelte - intervals render component (both directions) with short/onComplete seam
affects: [27-04 (practice hub host, mounts both components per queue item)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Embed-seam render component: props(item-identity, onComplete), one-shot init read via untrack(), onComplete fires once at post-answer Next (mirrors BuildSession/ShellVoicingDrill/ProgressionDrill precedent)"

key-files:
  created:
    - src/lib/components/PracticeChordDrill.svelte
    - src/lib/components/PracticeChordDrill.test.ts
    - src/lib/components/PracticeIntervalDrill.svelte
    - src/lib/components/PracticeIntervalDrill.test.ts
  modified: []

key-decisions:
  - "Both components compute their question (generateQuestion/generateIntervalQuestion) once at init via untrack(), matching BuildSession/ShellVoicingDrill/ProgressionDrill's established embed-seam pattern rather than reactively re-deriving on prop change - a fresh component instance per queue item is the expected host contract"
  - "PracticeChordDrill's feedback panel mirrors drills' identification branch exactly: the correct-symbol ChordGlyph reveal only renders on a miss; a correct answer shows no extra chrome beyond the keyboard's own interval-badge reveal"
  - "PracticeIntervalDrill's reveal (IntervalChip + interval name) always renders once answered, regardless of correct/wrong, per the plan's explicit behavior spec (differs slightly from PracticeChordDrill's miss-only reveal, matching each family's drills precedent)"

patterns-established:
  - "Component tests for audio-emitting components mock $lib/audio/audio explicitly (playChord/playNote/ensureAudioReady as vi.fn()), matching tests/drills.e2e.test.ts's convention - components that never call audio (ProgressionDrill) can safely leave it unmocked, but PracticeChordDrill/PracticeIntervalDrill do call it, so the mock is required to avoid jsdom Tone.js AudioParam construction errors"

requirements-completed: [PRAC-02]

coverage:
  - id: D1
    description: "PracticeChordDrill: same-root identification choice grid, symbol-pick grading, ChordGlyph reveal on a miss, onComplete(correct) fires once on Next"
    requirement: "PRAC-02"
    verification:
      - kind: unit
        ref: "src/lib/components/PracticeChordDrill.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "PracticeIntervalDrill: both directions (identification choice grid, construction root-tap), chroma-based (octave/enharmonic-agnostic) construction grading via gradeIntervalTap, onComplete(correct) fires once on Next"
    requirement: "PRAC-02"
    verification:
      - kind: unit
        ref: "src/lib/components/PracticeIntervalDrill.test.ts"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-07-24
status: complete
---

# Phase 27 Plan 03: Name-it and Interval Practice Drill Components Summary

**PracticeChordDrill (name-it identification) and PracticeIntervalDrill (both interval directions), two new render components that import the existing pure generators/graders verbatim and report grading via onComplete(correct).**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-07-24T23:53:59Z
- **Tasks:** 2
- **Files modified:** 4 (all new)

## Accomplishments
- `PracticeChordDrill.svelte`: chord identification (name-it) render component - same-root 4-choice grid via `generateQuestion({ symbol, direction: 'identification' })`, symbol-pick grading (never played-note chroma), ChordGlyph reveal only on a miss, keyboard interval-badge reveal on any answer, `onComplete(correct)` fired once on Next.
- `PracticeIntervalDrill.svelte`: interval drill covering both directions from a single `generateIntervalQuestion({ short })` draw - identification's 4-cell shorthand choice grid, construction's root-only-until-answered keyboard graded by `gradeIntervalTap` (chroma arithmetic, octave/enharmonic-agnostic), `onComplete(correct)` fired once on Next.
- Both components import their generation/grading logic from the existing pure drills modules (`$lib/drills/generateQuestion`, `$lib/drills/generateIntervalQuestion`) with zero logic duplication (REG-01) and never import from `src/routes/drills`.
- Component tests (10 total) cover choice rendering, correct/wrong grading, the single-onComplete-fire contract, and - for interval construction - a same-pitch-class tap on a different keyboard octave grading correct, proving chroma-based (not letter/octave-string) grading (T-27-03-01).

## Task Commits

Each task was committed atomically:

1. **Task 1: PracticeChordDrill.svelte (name-it, chord identification)** - `58cd742` (feat)
2. **Task 2: PracticeIntervalDrill.svelte (intervals, both directions)** - `6dacbff` (feat)

_No TDD RED/GREEN split was applied per-commit; tests were authored alongside each component and verified green before committing (plan tasks were `tdd="true"` but the plan's own `<action>` blocks specify writing the component and its test together, not a strict test-first/red-commit workflow)._

## Files Created/Modified
- `src/lib/components/PracticeChordDrill.svelte` - name-it (chord identification) drill component
- `src/lib/components/PracticeChordDrill.test.ts` - component tests (choice rendering, grading, single-fire onComplete)
- `src/lib/components/PracticeIntervalDrill.svelte` - interval drill component, both directions
- `src/lib/components/PracticeIntervalDrill.test.ts` - component tests (both directions, chroma-based grading)

## Decisions Made
- Computed each component's question once at init via `untrack()` (mirrors BuildSession/ShellVoicingDrill/ProgressionDrill's embed-seam precedent), rather than reactively re-deriving on prop change - avoids Svelte 5's `state_referenced_locally` compiler warning and matches the expected host contract of one component instance per queue item.
- PracticeChordDrill's feedback panel omits `formulaFor`/`RevealInsight`/`InspectRegister` (not in the plan's specified import list) - kept to the plan's literal scope: ChordGlyph reveal on a miss, keyboard interval-badge reveal on any answer.
- PracticeIntervalDrill always renders the IntervalChip + interval-name reveal once answered (correct or wrong), per the plan's explicit behavior spec ("After answering, reveal the two notes + interval name") - this differs slightly from PracticeChordDrill's miss-only ChordGlyph reveal, but each mirrors its own family's drills precedent faithfully.
- Component tests mock `$lib/audio/audio` explicitly (unlike ProgressionDrill's test, which never calls audio and needs no mock) since both new components genuinely invoke `ensureAudioReady`/`playChord`/`playNote` - this avoids jsdom's `Tone.js` `AudioParam` construction error, matching `tests/drills.e2e.test.ts`'s established convention.

## Deviations from Plan

None - plan executed exactly as written. The only refinement was fixing a Svelte 5 `state_referenced_locally` compiler warning by wrapping the one-shot init reads in `untrack()`, and mocking `$lib/audio/audio` in both test files (implied by the plan's "mock audio like existing drills/recall component tests" instruction, applied per the drills e2e convention since these components - unlike ProgressionDrill - actually call audio functions).

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Both components are ready for the Phase 27-04 host to mount per queue item (symbol/short + onComplete props). `npm run check` is clean (0 errors, 0 warnings across 1375 files) and the full suite is green (114 test files, 1583 tests). Neither component imports from `src/routes/drills` (verified via grep), so `/drills` remains fully untouched this phase.

---
*Phase: 27-practice-hub*
*Completed: 2026-07-24*

## Self-Check: PASSED

All created files verified present on disk; both task commits (`58cd742`, `6dacbff`) verified present in git log.
