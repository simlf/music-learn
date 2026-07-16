---
phase: 16-hear-the-chord
plan: 04
subsystem: ui
tags: [svelte, localStorage, progress-page]

# Dependency graph
requires:
  - phase: 16-hear-the-chord (Plan 01)
    provides: studyModeEnabled()/setStudyModeEnabled() localStorage-backed toggle in $lib/audio/audio
provides:
  - Global STUDY MODE toggle on /progress Practice Settings card
  - Route test proving default-OFF, toggle-to-ON, and SOUND-regression coverage
affects: [16-05, 16-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Practice Settings card toggle rows: mono uppercase label + ghost Button with ON/OFF text, mt-6 sibling spacing"

key-files:
  created:
    - src/routes/progressStudyToggle.test.ts
  modified:
    - src/routes/progress/+page.svelte

key-decisions:
  - "STUDY MODE toggle is a byte-for-byte structural sibling of the existing SOUND toggle (same ghost Button, same mono label, same mt-6 spacing) per D-04"

patterns-established:
  - "Pattern: toggle blocks in Practice Settings follow {mono label}/{ghost Button ON-OFF text} structure, extend by copying the sibling block verbatim and swapping the state/handler names"

requirements-completed: [HEAR-02]

coverage:
  - id: D1
    description: "STUDY MODE toggle renders on /progress directly below SOUND, defaulting to STUDY MODE OFF"
    requirement: "HEAR-02"
    verification:
      - kind: unit
        ref: "src/routes/progressStudyToggle.test.ts#renders the STUDY MODE label and a \"Toggle study mode\" button defaulting to STUDY MODE OFF"
        status: pass
    human_judgment: false
  - id: D2
    description: "Clicking the toggle flips its text to STUDY MODE ON and persists via setStudyModeEnabled(true)"
    requirement: "HEAR-02"
    verification:
      - kind: unit
        ref: "src/routes/progressStudyToggle.test.ts#clicking the button flips its text to STUDY MODE ON and calls setStudyModeEnabled(true)"
        status: pass
    human_judgment: false
  - id: D3
    description: "SOUND toggle is unaffected by the new sibling row (no regression)"
    verification:
      - kind: unit
        ref: "src/routes/progressStudyToggle.test.ts#the SOUND toggle still renders alongside it (no regression)"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-16
status: complete
---

# Phase 16 Plan 04: STUDY MODE Toggle on /progress Summary

**Added a global STUDY MODE toggle to the /progress Practice Settings card, a verbatim structural sibling of the existing SOUND toggle, gating HEAR-02's future arpeggio-roll playback.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-16T20:19:00Z
- **Completed:** 2026-07-16T20:27:22Z
- **Tasks:** 1 completed
- **Files modified:** 2

## Accomplishments
- `studyMode` `$state` seeded from `studyModeEnabled()` and a `toggleStudyMode()` handler that flips it and calls `setStudyModeEnabled()`, mirroring `sound`/`toggleSound` exactly.
- STUDY MODE toggle block (mono `STUDY MODE` label + ghost `Button` reading `STUDY MODE ON`/`STUDY MODE OFF`) inserted directly below the SOUND block in the Practice Settings card, same `mt-6` spacing.
- Route test (`progressStudyToggle.test.ts`) proving default OFF, toggle-to-ON with the audio call, and SOUND non-regression, rendered in the `token-missing` page state (Practice Settings card renders in every state).

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the STUDY MODE toggle to /progress** - `0fa56ab` (feat)

**Plan metadata:** (this commit, docs)

## Files Created/Modified
- `src/routes/progress/+page.svelte` - Extended `$lib/audio/audio` import, added `studyMode` state + `toggleStudyMode()` handler, added the STUDY MODE toggle markup as a sibling of SOUND.
- `src/routes/progressStudyToggle.test.ts` - Route test mocking `$lib/api/client`, `$lib/api/progress`, and `$lib/audio/audio`; asserts default-OFF render, click-to-ON with `setStudyModeEnabled(true)`, and SOUND toggle non-regression.

## Decisions Made
None beyond the plan - executed as specified, copying the SOUND toggle's exact shape per 16-PATTERNS.md and 16-UI-SPEC.md.

## Deviations from Plan

None - plan executed exactly as written. `studyModeEnabled()`/`setStudyModeEnabled()` already existed in `$lib/audio/audio` from Plan 16-01, so no audio.ts changes were needed here.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
The `studyMode` flag is now toggleable and persisted app-wide. Plans 16-05/16-06 (BuildSession reveal auto-play, pulse, and arpeggio roll) can read `studyModeEnabled()` live at call time to decide between a single block-strike playback and the staggered roll, per the UI-SPEC's Pulse & Auto-Play Interaction Contract.

---
*Phase: 16-hear-the-chord*
*Completed: 2026-07-16*

## Self-Check: PASSED
