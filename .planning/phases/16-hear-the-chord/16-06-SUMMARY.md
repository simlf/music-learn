---
phase: 16-hear-the-chord
plan: 06
subsystem: ui
tags: [svelte, tone, audio, playback, testing]

# Dependency graph
requires:
  - phase: 16-01
    provides: playArpeggio audio primitive, studyModeEnabled/setStudyModeEnabled localStorage toggle
  - phase: 16-02
    provides: PianoKeyboard pulseToken/pendingLetters props and pendingClass CSS wiring
  - phase: 16-05
    provides: BuildSession triggerReveal/hearAgain/revealPulseToken reveal wiring (plain block auto-play + pulse)
provides:
  - Study-mode arpeggio roll branch in BuildSession.triggerReveal/hearAgain, gated on studyModeEnabled() && soundEnabled()
  - pendingLetters state wiring from BuildSession into the complete-block PianoKeyboard
  - Roll-timer scheduling (per-note pending->lit + final block-strike) with clear-before-reschedule and reset/destroy cleanup
affects: [17-chord-explainer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Playback-shape branch computed LIVE at call time (studyModeEnabled()/soundEnabled() read inline, never snapshotted), mirroring the existing sound-gate convention"
    - "Roll timers collected in an array with a clear-before-reschedule helper, mirroring flashTimer/feedbackTimer's own single-timer discipline"

key-files:
  created: []
  modified:
    - src/lib/components/BuildSession.svelte
    - src/lib/components/buildSession.test.ts

key-decisions:
  - "Study mode REPLACES the plain block auto-play (D-05): triggerReveal/hearAgain branch once at the top, either running startArpeggioRoll or falling through to the Plan 16-05 block-strike path, never both"
  - "Sound OFF always takes the single-pulse path regardless of study toggle (D-07): the branch condition is studyModeEnabled() && soundEnabled(), so a false soundEnabled() short-circuits straight to the non-study branch, which itself gates playChord behind soundEnabled() a second time"
  - "firstNoteDelayMs (260ms initial reveal / 0ms Hear-again replay) is the only difference between the two call sites; both funnel through the same startArpeggioRoll helper"

requirements-completed: [HEAR-02]

coverage:
  - id: D1
    description: "Study ON + sound ON rolls the arpeggio via playArpeggio (root->3rd->5th->7th), dims earned keys as pending until each sounds, then strikes the block chord + pulse - replacing (not adding to) the plain auto-play"
    requirement: "HEAR-02"
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#BuildSession study-mode roll, HEAR-02 > study ON + sound ON rolls the arpeggio via playArpeggio (not an immediate block strike), dimming earned keys as pending until each sounds, then strikes the block chord"
        status: pass
    human_judgment: false
  - id: D2
    description: "Sound OFF collapses to the single visual pulse regardless of study toggle - never a fake silent roll"
    requirement: "HEAR-02"
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#BuildSession study-mode roll, HEAR-02 > study ON + sound OFF collapses to the single visual pulse: neither playArpeggio nor playChord fires, and the reveal is not a dead end"
        status: pass
    human_judgment: false
  - id: D3
    description: "Study OFF + sound ON regresses cleanly to Plan 16-05's plain block playChord path, never calling playArpeggio"
    requirement: "HEAR-02"
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#BuildSession study-mode roll, HEAR-02 > study OFF + sound ON (regression): completing Cm7 still calls the block playChord once and never playArpeggio"
        status: pass
    human_judgment: false
  - id: D4
    description: "Hear again reads studyModeEnabled()/soundEnabled() live at click time, not a snapshot from reveal time - replays the roll while study is on, falls back to the block strike once study flips off mid-session"
    requirement: "HEAR-02"
    verification:
      - kind: unit
        ref: 'src/lib/components/buildSession.test.ts#BuildSession study-mode roll, HEAR-02 > "Hear again" honors LIVE study+sound state, not a snapshot from reveal time: replays the roll while study is on, then falls back to the block strike once study flips off'
        status: pass
    human_judgment: false
  - id: D5
    description: "Roll timers are cleared on unmount so no stray block-strike audio fires against a torn-down instance"
    requirement: "HEAR-02"
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#BuildSession study-mode roll, HEAR-02 > unmounting mid-roll clears the roll timers so no stray block-strike audio fires afterward"
        status: pass
    human_judgment: false
  - id: D6
    description: "Manual visual trace against the UI-SPEC study-mode timing tables (260ms initial-reveal offset, 260ms stagger, 0ms Hear-again offset)"
    human_judgment: true
    rationale: "The unit tests assert audio-call timing/ordering and pending-class presence via jsdom, but the actual pending->lit 120ms cross-fade visual feel and pulse-once flex are CSS/animation concerns not exercised by jsdom - a human should confirm the on-screen roll reads correctly."

duration: 12min
completed: 2026-07-16
status: complete
---

# Phase 16 Plan 06: Study-Mode Arpeggio Roll Summary

**Study-mode reveal branch in BuildSession that rolls the arpeggio (root, 3rd, 5th, 7th) via playArpeggio with per-key pending-to-lit dimming, then strikes the block chord + full pulse, replacing the plain block auto-play when study mode and sound are both on**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-16T22:44:00Z
- **Completed:** 2026-07-16T23:00:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `BuildSession.svelte`'s `triggerReveal()`/`hearAgain()` now branch on `studyModeEnabled() && soundEnabled()`, computed live at call time: the study path runs a new `startArpeggioRoll()` helper (seed `pendingLetters`, fire `playArpeggio` with a 260ms stagger, schedule per-note pending-clear timers, then a final block-strike timer that clears `pendingLetters`, calls `playChord`, and bumps `revealPulseToken`); the non-study path is byte-identical to Plan 16-05's block-strike-only behavior.
- `pendingLetters` `$state<Set<string>>` wired to the complete-block `PianoKeyboard` (`pendingLetters={pendingLetters}`), driving the pre-existing `--pending` dim state from Plan 16-02 during the roll and staying empty (no visual change) on every non-study reveal.
- Roll-timer collection (`rollTimers`) with a `clearRollTimers()` helper, invoked before every fresh roll (clear-before-reschedule, so a mid-roll "Hear again" restarts cleanly) and from both `resetSessionUiState()` (Build Another / kind switch / fresh pick) and `onDestroy` (component teardown), mirroring the file's existing `flashTimer`/`feedbackTimer` discipline.
- Extended `buildSession.test.ts` with a 5-test suite covering the roll+strike sequence, the sound-off collapse regardless of study toggle, the study-off regression, Hear-again's live-state branch (not a snapshot), and unmount cleanup.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the study-mode arpeggio roll branch to the reveal** - `e333ad0` (feat)
2. **Task 2: Test the study-mode roll, block-strike, and sound-off collapse** - `5d88589` (test)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/lib/components/BuildSession.svelte` - Added `playArpeggio`/`studyModeEnabled` imports, `pendingLetters` state, `rollTimers`/`clearRollTimers()`, `startArpeggioRoll()`, study-mode branching in `triggerReveal()`/`hearAgain()`, cleanup wiring in `resetSessionUiState()`/`onDestroy()`, and `pendingLetters={pendingLetters}` on the complete-block `PianoKeyboard`.
- `src/lib/components/buildSession.test.ts` - Added the "BuildSession study-mode roll, HEAR-02" describe block (5 tests): roll+strike sequence with pending-class assertions, sound-off collapse, study-off regression, Hear-again live-state branch, unmount cleanup.

## Decisions Made
- Study mode REPLACES the plain block auto-play (D-05): a single top-level `if (studyModeEnabled() && soundEnabled())` branch in both `triggerReveal`/`hearAgain` either runs the roll or falls through to the existing block-strike path — never both, so there is no risk of a double `playChord` call.
- Sound OFF always collapses to the single visual pulse regardless of study toggle (D-07): the branch condition itself excludes the roll whenever `soundEnabled()` is false, and the fallback path's own `if (soundEnabled())` guard (unchanged from Plan 16-05) then also skips `playChord` — `revealPulseToken` still bumps unconditionally so the reveal never dead-ends.
- `firstNoteDelayMs` (260ms on initial reveal, 0ms on "Hear again" replay per the UI-SPEC timing tables) is the only parameter difference between the two call sites; both funnel through one shared `startArpeggioRoll()` helper rather than duplicating the timer-scheduling logic.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- HEAR-02 (study half) complete: study ON rolls the arpeggio with per-key lighting then strikes the block + full pulse; study mode replaces plain auto-play; sound OFF always collapses to the single visual pulse; roll timers always cleaned up; non-study reveals stay byte-identical to Plan 16-05.
- Phase 16 (Hear the Chord, HEAR-01/HEAR-02) is now fully implemented across its 6 plans (auto-play + pulse, study-mode toggle, arpeggio primitive, per-key pending state, Hear-again control, and this plan's study-mode roll wiring).
- No blockers for Phase 17 (Chord Explainer), which does not depend on this plan's internals beyond the shared `audio.ts`/`PianoKeyboard.svelte` surfaces already stable since Plans 16-01/16-02.

---
*Phase: 16-hear-the-chord*
*Completed: 2026-07-16*

## Self-Check: PASSED

- FOUND: src/lib/components/BuildSession.svelte
- FOUND: src/lib/components/buildSession.test.ts
- FOUND: .planning/phases/16-hear-the-chord/16-06-SUMMARY.md
- FOUND commit: e333ad0 (Task 1)
- FOUND commit: 5d88589 (Task 2)
- FOUND commit: f001ce0 (SUMMARY)
- FOUND commit: cd58a23 (final metadata)
