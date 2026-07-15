---
phase: 12-build-it-construction
plan: 04
subsystem: ui
tags: [svelte, piano-keyboard, construction, tdd]

# Dependency graph
requires:
  - phase: 12-build-it-construction (plan 01)
    provides: phraseStep(short, opts) in interval.ts
  - phase: 12-build-it-construction (plan 02)
    provides: PianoKeyboard.svelte's constructable/onConstructTap/flashWrongKey gated mode
  - phase: 12-build-it-construction (plan 03)
    provides: "construction.ts: createChordConstruction/createScaleConstruction/expectedStep/gradeConstructionTap"
provides:
  - "BuildSession.svelte: picker (kind toggle + root/quality chord chips or tonic scale chips) and the full construction step loop"
  - "src/routes/build/+page.svelte: the /build page shell (h1, intro line, bordered card)"
  - "Masthead nav entry: Build, between Drills and Recall"
affects: [12-05-build-session-completion, 12-06-fsrs-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Decoupled render-state pair: `construction` (live-advancing, drives the keyboard fill + formula strip immediately) vs `promptState` (paced, drives the register/step/WHY copy) so a correct tap's confirmation is actually readable for the full 650ms before the next prompt appears - D-07's pacing without delaying the visual keyboard/strip fill"
    - "Zero-friction picker restart, mirroring /scales' pickTonic pattern: pickRoot/pickQuality immediately (re)start the construction session the moment BOTH inputs are set, regardless of pick order"

key-files:
  created:
    - src/lib/components/BuildSession.svelte
    - src/lib/components/buildSession.test.ts
    - src/routes/build/+page.svelte
  modified:
    - src/routes/+layout.svelte

key-decisions:
  - "The chord root chip's ChordGlyph display label is looked up by index (ROOT_CHIPS.find matching pickedRoot's ASCII value), reusing the same ROOTS/MAJOR_SCALE_ROOTS zip established for the chip row itself, rather than re-deriving the glyph from spellChord a second time"
  - "The register/step/WHY block always renders from `promptState`, not `construction`: on a correct tap, `construction` advances immediately (visible keyboard fill + formula-strip growth) but `promptState` (and therefore the on-screen prompt) only catches up once the 650ms feedback timer clears, so the OLD step's prompt stays visible alongside the confirmation headline for the full pace"
  - "lastTappedLetter is tracked as separate state from flashKey: flashKey clears at 320ms (the key's visual flash) but the wrong-octave restatement text names the tapped letter for the full 650ms feedback window, so it cannot be sourced from flashKey once that has already cleared"

patterns-established:
  - "Two-tier tap-outcome timers (320ms flash / 650ms feedback), both cleared and restarted on every tap and cleared again in onDestroy, mirroring ScaleKeyboardDrill's wrongTimer convention extended to a second timer"

requirements-completed: [BUILD-01, BUILD-02, BUILD-03]

coverage:
  - id: D1
    description: "The /build picker: kind toggle (Chords/Scales), 12 root x 8 quality chord chips (zipped from ROOTS/MAJOR_SCALE_ROOTS, friendly quality names), and a 12-tonic scale chip row. Picking a full target (root+quality, or a tonic) starts the construction session immediately with zero separate Start click; switching kind resets the picker with no cross-kind carryover."
    requirement: BUILD-01
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#BuildSession picker (BUILD-01/02, Task 1)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The full construction step loop for both chords and scales: STEP {n} OF {total} register, target identity (ChordGlyph / '{tonic} major'), next-interval-only step line + WHY line via phraseStep, the forced-2-octave constructable PianoKeyboard wired through gradeConstructionTap, the running formula strip (earned-note chips + a single '?' placeholder), and the final-step transition to sessionState 'complete'."
    requirement: BUILD-02
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#BuildSession construction step loop (BUILD-01/02/03, Task 2)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Both wrong-tap diagnostic branches: wrong-pitch-class shows the semitone-distance/direction diagnostic plus an interval-only restatement (never the target letter), and wrong-octave shows the fixed 'Right note, wrong octave.' headline plus a restatement naming only the already-confirmed tapped letter. Both flash the tapped key for 320ms via flashWrongKey."
    requirement: BUILD-03
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#a wrong-pitch-class tap shows the diagnostic + interval-only restatement"
        status: pass
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#a wrong-octave tap (right pitch class, wrong octave) shows the fixed headline"
        status: pass
    human_judgment: false
  - id: D4
    description: "Manual browser verification of the full loop's real pacing/scroll/visual polish (D-07's ~650ms feel, the horizontal-scroll keyboard auto-scrolling the root into view, the rotating confirmation headlines, and the Chords/Scales phrasing difference), per the plan's own human-check step."
    verification: []
    human_judgment: true
    rationale: "jsdom's automated test suite proves the state machine, copy templates, and DOM structure precisely (16 passing tests), but cannot observe real browser pacing feel, scrollIntoView behavior, or visual/touch polish - the plan's verify block itself specifies a human-check for this reason."

# Metrics
duration: 8min
completed: 2026-07-15
status: complete
---

# Phase 12 Plan 04: BuildSession Core + /build Route + Nav Summary

**BuildSession.svelte's picker and full tap-grade-feedback-advance construction loop for both chords and scales, wired to the /build route with a masthead nav entry between Drills and Recall.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-15T14:38:36Z
- **Completed:** 2026-07-15T14:46:44Z
- **Tasks:** 2 (both TDD: RED then GREEN)
- **Files modified:** 4

## Accomplishments
- `BuildSession.svelte`'s picker: a Chords/Scales kind toggle, a 12-root x 8-quality chord chip grid (zipped from `ROOTS`/`MAJOR_SCALE_ROOTS` by index, 8 friendly quality names), and a 12-tonic scale chip row. Picking a full target starts the construction session immediately - zero separate Start click, matching D-07 and every other drill surface's zero-friction convention.
- The full construction step loop drives both chords and scales through the same template: `STEP {n} OF {total}`, the target identity (`ChordGlyph` for chords, a `{tonic} major` heading for scales), the next-interval-only step line and WHY line (phrased via `phraseStep`, scale-aware for whole/half steps), and a forced-2-octave `constructable` `PianoKeyboard` wired through `gradeConstructionTap`.
- Both wrong-tap diagnostic branches render their exact required copy: wrong-pitch-class shows `"{n} half step{s} too {high|low}."` plus an interval-only restatement that never names the target letter (D-08's desirable-difficulty rule); wrong-octave shows the fixed `"Right note, wrong octave."` headline plus a restatement naming only the already-tapped letter.
- The running formula strip grows one `IntervalChip` + letter tag per earned note, with exactly one dashed `?` placeholder for the next unearned target and never more - the full remaining step count is never inferable from the strip.
- D-07's ~650ms pacing is implemented via a decoupled `construction`/`promptState` pair: the keyboard fill and formula-strip growth happen immediately on a correct tap, but the on-screen step/WHY prompt (`promptState`) only advances once the 650ms feedback timer clears, so the confirmation headline is actually readable before the next step appears. The final step's correct tap follows the same pace before transitioning `sessionState` to `'complete'`.
- `/build` renders the page shell (`<h1>Build It</h1>`, the intro line, a bordered card containing `BuildSession`), and the masthead nav gains a `Build` entry between `Drills` and `Recall`.
- Zero regressions: the full 873-test suite and `svelte-check` (1282 files) both pass.

## Task Commits

Each task was committed atomically (TDD RED/GREEN cycle per task, per the plan's per-task `tdd="true"` frontmatter):

1. **Task 1: Picker (kind toggle + Root/Quality or tonic chips), route, and nav entry**
   - RED: `6394099` (test)
   - GREEN: `d007e41` (feat)
2. **Task 2: The construction step loop - register/target/step/WHY, keyboard wiring, both feedback branches, formula strip, and pacing**
   - RED: `188adf6` (test)
   - GREEN: `77aa6e4` (feat)

_No separate REFACTOR commits were needed: both GREEN commits matched the plan's prescribed shape with nothing left to clean up._

## Files Created/Modified
- `src/lib/components/BuildSession.svelte` - New: owns `sessionState`/`kind`/picked*/`construction`/`promptState` and renders both the picker and the full step loop
- `src/lib/components/buildSession.test.ts` - New: 16-case Vitest suite covering the picker (Task 1) and the full step loop (Task 2)
- `src/routes/build/+page.svelte` - New: the `/build` page shell
- `src/routes/+layout.svelte` - Modified: `navLinks` gains `{ href: '/build', label: 'Build' }` between Drills and Recall

## Decisions Made
- `promptState` is a second, deliberately-lagging copy of the construction state used only to drive the register/step/WHY text, decoupled from `construction` (which drives the keyboard/formula-strip and always reflects the latest graded tap immediately). This is what makes the ~650ms pacing readable: the OLD step's prompt stays on screen next to the confirmation headline for the full pace window rather than jumping to the next step's text the instant the tap lands.
- `lastTappedLetter` is tracked separately from `flashKey` because the two clear on different schedules (320ms vs. 650ms) - the wrong-octave restatement needs the tapped letter to remain readable for the full feedback window, well past when the key's visual flash has already reverted.
- The chord root chip's glyph label for `ChordGlyph` is looked up from the same `ROOT_CHIPS` zip built for the picker itself (`ROOT_CHIPS.find(chip => chip.ascii === pickedRoot)`), avoiding a second glyph derivation path.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' acceptance criteria were met; the only test-authoring correction was fixing an initial test assumption (scale total steps is 7, not 8 - a scale target has 7 degrees plus the octave close as the root-first note, yielding `fullNotes.length - 1 = 7` steps, matching construction.ts's own documented shape) and using a scoped `within(formula-strip)` query where a tapped note's letter also appears inside the keyboard's own `NoteLabel`. Both were test-file corrections made before the GREEN commit landed, not deviations from the plan's specified behavior.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `BuildSession.svelte` is ready for 12-05 to extend: the `'complete'` session state currently renders only the plan's specified minimal placeholder (`Building {label}... done.`), which 12-05 replaces with the full completion summary (rule statement, finalized formula strip, finalized display-mode keyboard, CTA row) and the count-up hint toggle.
- No FSRS/deck imports exist yet in this plan's files, matching the prohibition - 12-06 owns wiring `recordGrade` for the `formula-build` mode.
- No blockers. The gated-prop contract with `PianoKeyboard` (12-02) and the pure `construction.ts` engine (12-03) both integrate cleanly with zero adjustments needed on either side.

---
*Phase: 12-build-it-construction*
*Completed: 2026-07-15*

## Self-Check: PASSED

- FOUND: src/lib/components/BuildSession.svelte
- FOUND: src/lib/components/buildSession.test.ts
- FOUND: src/routes/build/+page.svelte
- FOUND: .planning/phases/12-build-it-construction/12-04-SUMMARY.md
- FOUND commit: 6394099 (test(12-04): add failing tests for BuildSession picker)
- FOUND commit: d007e41 (feat(12-04): implement BuildSession picker, /build route, and nav entry)
- FOUND commit: 188adf6 (test(12-04): add failing tests for the construction step loop)
- FOUND commit: 77aa6e4 (feat(12-04): implement the construction step loop in BuildSession)
