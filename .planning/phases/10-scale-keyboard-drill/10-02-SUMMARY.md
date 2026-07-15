---
phase: 10-scale-keyboard-drill
plan: 02
subsystem: ui
tags: [svelte, scale-drill, piano-keyboard, chroma-grading]

# Dependency graph
requires:
  - "src/lib/practice/scaleKeyboardDrill.ts: createScaleKeyboardDrillState/expectedTarget/gradeScaleTap/placeAscendingScaleKeys (plan 10-01)"
provides:
  - "src/lib/components/ScaleKeyboardDrill.svelte: tonic-anchored 2-octave scale keyboard drill component"
  - "src/routes/scales/+page.svelte Practice branch renders ScaleKeyboardDrill"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Component renders its own keyboard from keyboardLayout's pure whiteLettersForOctaves/blackKeysForOctaves geometry rather than delegating fills to PianoKeyboard, so the returning octave can land on a key distinct from the tonic"
    - "Any tapped key with matching chroma grades correct (gradeScaleTap, octave-agnostic); the canonical ascending placement (placements[degree-1]) is always what fills/sounds, so audio+visuals stay deterministic regardless of which board instance was tapped"

key-files:
  created:
    - src/lib/components/ScaleKeyboardDrill.svelte
    - src/lib/components/scaleKeyboardDrill.test.ts
  modified:
    - src/routes/scales/+page.svelte
  deleted:
    - src/lib/components/ScalePractice.svelte
    - src/lib/components/scalePractice.test.ts
    - src/lib/practice/scaleDrill.ts
    - src/lib/practice/scaleDrill.test.ts

key-decisions:
  - "The drill renders its own 2-octave keyboard (whiteLettersForOctaves/blackKeysForOctaves) instead of importing PianoKeyboard, per the plan's recorded design decision: PianoKeyboard's assignNotesToKeys can collapse the returning octave onto the tonic key when the 7th degree is a black key, and its wrongLetters prop paints a persistent cross mark rather than a momentary flash."
  - "A wrong tap's flash key is whichever key was physically tapped; the fill/audio on a correct tap always target the canonical ascending placement (placements[target.degree-1]), which also correctly covers the descending leg since descending degrees 1-7 reuse the same physical keys as their ascending counterparts."

requirements-completed: [SCALE-04, SCALE-05]

coverage:
  - id: D1
    description: "Practice tab renders a 2-octave keyboard, tonic leftmost, filling degrees left-to-right ending on a distinct octave key"
    requirement: "SCALE-04"
    verification:
      - kind: unit
        ref: "src/lib/components/scaleKeyboardDrill.test.ts#fills all 8 ascending degrees with role colors and ends on a key distinct from the tonic"
        status: pass
      - kind: unit
        ref: "src/lib/components/scaleKeyboardDrill.test.ts#tapping the tonic first fills the leftmost key and plays it; no key left of it is filled"
        status: pass
    human_judgment: true
  - id: D2
    description: "Correct tap fills with interval-role color + NoteLabel and plays the note; wrong pitch class flashes gray ~320ms with no text/cross, does not advance"
    requirement: "SCALE-04"
    verification:
      - kind: unit
        ref: "src/lib/components/scaleKeyboardDrill.test.ts#a wrong pitch-class tap flashes gray, does not advance or play, and clears after ~320ms"
        status: pass
    human_judgment: true
  - id: D3
    description: "Register reads DEGREE n OF 8 . ASCENDING/DESCENDING driven by expectedTarget; completion swaps in the Voila card with Run it again"
    requirement: "SCALE-04"
    verification:
      - kind: unit
        ref: "src/lib/components/scaleKeyboardDrill.test.ts#advances the register through the ascending leg then flips to descending 7 down to 1"
        status: pass
      - kind: unit
        ref: "src/lib/components/scaleKeyboardDrill.test.ts#completing all 15 taps shows the completion card and Run it again resets to degree 1 ascending"
        status: pass
    human_judgment: true
  - id: D4
    description: "Degree-ladder Practice surface is gone: ScalePractice.svelte and scaleDrill.ts deleted, no keyboard-vs-ladder toggle"
    requirement: "SCALE-05"
    verification:
      - kind: unit
        ref: "grep -rln \"ScalePractice|practice/scaleDrill\" src returns nothing; grep -rl \"drill-ladder|data-testid=\\\"rung\\\"\" src returns nothing"
        status: pass
    human_judgment: false
  - id: D5
    description: "Explore surface, shared tonic row, and mode toggle in /scales are unchanged"
    requirement: "SCALE-05"
    verification:
      - kind: unit
        ref: "git diff of scales/+page.svelte touches only the import line, one doc comment, and the {:else} Practice branch"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-07-15
status: complete
---

# Phase 10 Plan 02: ScaleKeyboardDrill Component Summary

**Built the tonic-anchored 2-octave keyboard drill component (grading by chroma via plan 10-01's logic module), wired it into /scales Practice, and deleted the retired letter-equality degree-ladder surface.**

## Performance

- **Duration:** 20 min
- **Tasks:** 2 (component + test build, then wire + retire)
- **Files modified:** 6 (2 created, 1 modified, 4 deleted, plus 1 test file)

## Accomplishments

- `ScaleKeyboardDrill.svelte`: renders its own 2-octave keyboard from `keyboardLayout`'s pure geometry (`whiteLettersForOctaves`/`blackKeysForOctaves`), grading every tap via `gradeScaleTap` (chroma-only). A correct tap always fills and sounds the *canonical* ascending placement (`placements[target.degree - 1]`) regardless of which key instance was physically tapped, which naturally also covers the descending leg since degrees 1-7 reuse the same keys on the way back down.
- Position register (`DEGREE {n} OF 8 · {DIRECTION}`), wrong-tap gray flash (~320ms, no text/cross, CSS-ordered to override an already-filled key), and a completion card (`Voila. {tonic} major, up and down, clean.` + `Run it again`) all verified under test.
- Enharmonic acceptance proven end-to-end through the component: F♯ major's degree 7 (E♯) grades correct on the white F key and its `NoteLabel` shows "E♯", not "F".
- `/scales`' Practice branch now renders `ScaleKeyboardDrill`; the Explore branch (`ScaleDegreeStrip` + `InspectRegister`), shared tonic row, and Explore/Practice toggle are byte-unchanged apart from the one import line and one doc comment.
- Retired `ScalePractice.svelte`, `scalePractice.test.ts`, `scaleDrill.ts`, and `scaleDrill.test.ts`: no letter-string equality scale grading remains anywhere in `src`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build ScaleKeyboardDrill.svelte + component test** - `4210e3a` (feat)
2. **Task 2a: Delete the four retired ladder files** - `edd55f1` (feat, deletions only — see Deviations)
3. **Task 2b: Wire ScaleKeyboardDrill into /scales + reword stray comment** - `51b6e24` (feat)

**Plan metadata:** (this commit) `docs: complete plan`

## Files Created/Modified

- `src/lib/components/ScaleKeyboardDrill.svelte` - New component: 2-octave interactive keyboard, chroma grading, register, wrong-flash, completion card
- `src/lib/components/scaleKeyboardDrill.test.ts` - 8 Vitest cases: mount state, tonic fill, full ascending fill + distinct octave, register advance/flip, wrong-flash-then-clear, completion + reset, prop-change reset, F♯ major enharmonic acceptance
- `src/routes/scales/+page.svelte` - Practice branch now renders `ScaleKeyboardDrill`; import swapped; one doc comment reworded (Explore branch, tonic row, and mode toggle untouched)
- `src/lib/components/ScalePractice.svelte`, `src/lib/components/scalePractice.test.ts`, `src/lib/practice/scaleDrill.ts`, `src/lib/practice/scaleDrill.test.ts` - Deleted (retired letter-equality ladder surface)

## Decisions Made

- The drill renders its own keyboard rather than importing `PianoKeyboard`, per the plan's recorded rationale (distinct-octave-key placement and a momentary flash, not `PianoKeyboard`'s persistent cross-mark wrong feedback).
- Grading accepts any tapped key whose chroma matches the expected target (octave-agnostic), but fill/audio always target the canonical ascending placement, keeping the visual/aural sequence deterministic regardless of which board instance (of a possibly-repeated pitch class) the user actually taps.

## Deviations from Plan

**1. [Process] Task 2's file staging split across two commits instead of one.**
- **Found during:** Task 2 commit
- **Issue:** `git rm` had already staged the four deletions; a subsequent `git add` that listed the (now-nonexistent) deleted files alongside the two modified files failed the whole invocation silently continuing to `git commit`, so only the four deletions landed in the first commit. The `+page.svelte` wiring and a doc-comment reword were still unstaged afterward.
- **Fix:** Staged and committed the two modified files (`ScaleKeyboardDrill.svelte`, `scales/+page.svelte`) in a second commit (`51b6e24`) immediately after, verified via `git status --short` returning clean and `git diff` showing exactly the expected scoped diff.
- **Files affected:** none beyond the intended Task 2 file list; no functional change, purely a commit-boundary correction.
- **Commit:** `51b6e24`

**2. [Rule 1 - Bug] Reworded a doc comment that literally named the retired `ScalePractice` component.**
- **Found during:** Task 2 verification (the plan's own prohibition-check grep)
- **Issue:** `ScaleKeyboardDrill.svelte`'s top doc comment referenced "the retired degree-ladder ScalePractice" by name, which the plan's `grep -rln "ScalePractice|practice/scaleDrill" src` prohibition check would flag as a dangling reference even though it was just descriptive prose, not an import or functional dependency.
- **Fix:** Reworded to "the retired degree-ladder Practice surface" (no literal component name), and reworded `scales/+page.svelte`'s doc comment similarly.
- **Files modified:** `src/lib/components/ScaleKeyboardDrill.svelte`, `src/routes/scales/+page.svelte`
- **Commit:** `51b6e24`

## Issues Encountered

None beyond the two items above. `npx vitest run` (749 tests, 56 files) and `npm run check` (svelte-check/tsc, 1178 files, 0 errors) both pass clean after every commit.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- SCALE-04 and SCALE-05 are both fully implemented and verified; the `/scales` Practice tab is the tonic-anchored keyboard drill with no keyboard-vs-ladder toggle, and the Explore surface is untouched.
- No blockers for subsequent phases (Phase 11 Memorization Engine is independent of this phase's UI work).
- Human verification of the visual/interaction polish (touch targets, horizontal scroll under ~660px, gray flash timing feel) is still recommended per the plan's `<human-check>` block, but was not exercised in this automated pass beyond the equivalent unit-test coverage.

---
*Phase: 10-scale-keyboard-drill*
*Completed: 2026-07-15*

## Self-Check: PASSED
