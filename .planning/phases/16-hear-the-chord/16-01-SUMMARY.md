---
phase: 16-hear-the-chord
plan: 01
subsystem: audio
tags: [tone, audio-engine, localStorage, css-animation, svelte]

# Dependency graph
requires:
  - phase: 09-deploy-to-the-piano
    provides: audio.ts's playNote/playChord sound-gate + localStorage-boolean toggle conventions
provides:
  - "playArpeggio(notes, { staggerMs }) staggered single-note playback primitive"
  - "studyModeEnabled()/setStudyModeEnabled() persisted-boolean pair (default false)"
  - "pulse-once shared CSS keyframe + first-reveal combined stamp-then-pulse rule"
  - "extended reduced-motion block covering .pulse-once and .piano-keyboard__key--pending"
affects: [16-02, 16-03, 16-05, 16-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "New audio.ts play* exports open with the same soundEnabled()/empty-array early-return guard as playChord"
    - "Second localStorage-boolean pair (studyMode) mirrors the sound toggle's lazy-cache + try/catch read/write shape, but inverted default (=== 'true' vs !== 'false')"
    - "Shared CSS keyframes live in app.css, not component-scoped, so multiple components (PianoKeyboard, ChordGlyph) reuse one definition"

key-files:
  created: []
  modified:
    - src/lib/audio/audio.ts
    - src/lib/audio/audio.test.ts
    - src/app.css

key-decisions:
  - "playArpeggio voices notes via toPitch(note, 4) (octave 4 base), matching toAscendingPitches' octave-4 starting point used by playChord/the reveal keyboard"
  - "studyMode has no releaseAll() side effect on toggle, since it is a playback-shape flag read at call time, not an audio-output toggle"
  - "pulse-once and stamp-in are sequenced (not concurrent) via a combined selector rule with a 240ms animation-delay on pulse-once, since two animations targeting transform on the same element would collide"

requirements-completed: [HEAR-01, HEAR-02]

coverage:
  - id: D1
    description: "playArpeggio sounds each note staggered by index*staggerMs, early-returns silently when sound is off or notes is empty"
    requirement: HEAR-01
    verification:
      - kind: unit
        ref: "src/lib/audio/audio.test.ts#playArpeggio > sounds the first note synchronously, then later notes at their staggered ticks in order"
        status: pass
      - kind: unit
        ref: "src/lib/audio/audio.test.ts#playArpeggio > never attacks when sound is off"
        status: pass
      - kind: unit
        ref: "src/lib/audio/audio.test.ts#playArpeggio > does nothing for an empty note list"
        status: pass
    human_judgment: false
  - id: D2
    description: "studyModeEnabled()/setStudyModeEnabled() persist a boolean under music-learn:study-mode, defaulting to false"
    requirement: HEAR-02
    verification:
      - kind: unit
        ref: "src/lib/audio/audio.test.ts#study mode toggle > defaults to disabled with no stored value"
        status: pass
      - kind: unit
        ref: "src/lib/audio/audio.test.ts#study mode toggle > persists the toggle to localStorage under music-learn:study-mode"
        status: pass
      - kind: unit
        ref: "src/lib/audio/audio.test.ts#study mode toggle > reads a persisted true back on a fresh session"
        status: pass
      - kind: unit
        ref: "src/lib/audio/audio.test.ts#study mode toggle > treats a non-boolean garbage value as the disabled default"
        status: pass
    human_judgment: false
  - id: D3
    description: "pulse-once keyframe, .pulse-once class, first-reveal combined stamp-then-pulse rule, and extended reduced-motion block exist in app.css"
    verification:
      - kind: other
        ref: "grep -q '@keyframes pulse-once' src/app.css && grep -q 'animation: pulse-once 200ms ease-out' src/app.css && grep -q 'chord-glyph--stamped.pulse-once' src/app.css && grep -q 'piano-keyboard__key--pending' src/app.css && test \"$(grep -c 'prefers-reduced-motion: reduce' src/app.css)\" = \"1\""
        status: pass
    human_judgment: false

duration: 9min
completed: 2026-07-16
status: complete
---

# Phase 16 Plan 01: Audio + Animation Foundation Summary

**Added a staggered `playArpeggio` audio primitive, a `studyModeEnabled`/`setStudyModeEnabled` persisted-boolean toggle, and a shared `pulse-once` CSS keyframe (sequenced with `stamp-in`) that the rest of Phase 16 builds its reveal auto-play/pulse behavior on.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-16T19:55:48Z
- **Completed:** 2026-07-16T20:00:48Z
- **Tasks:** 2 completed
- **Files modified:** 3

## Accomplishments
- `playArpeggio(notes, { staggerMs })` schedules staggered single-note attacks via `setTimeout`, reusing `playChord`'s exact sound-gate + empty-array guard, and voices at octave 4 to match the reveal keyboard.
- `studyModeEnabled()`/`setStudyModeEnabled()` add a second localStorage-backed boolean pair (`music-learn:study-mode`), default `false`, with no `releaseAll()` side effect since it's a playback-shape flag, not an audio toggle.
- `_resetForTests()` extended to clear the new `studyMode` module cache alongside `enabled`.
- `pulse-once` `@keyframes` + `.pulse-once` class added to `app.css`, plus the first-reveal combined rule (`.piano-keyboard__key--stamped.pulse-once`, `.chord-glyph--stamped.pulse-once`) sequencing `stamp-in` (0-240ms) then `pulse-once` (240ms delay) so the two never collide.
- The single existing `@media (prefers-reduced-motion: reduce)` block extended (not duplicated) to suppress `.pulse-once` and give `.piano-keyboard__key--pending` an instant `transition: none` swap.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add playArpeggio + studyMode persistence to audio.ts** - `d9af833` (feat)
2. **Task 2: Add the pulse-once keyframe and reduced-motion extension to app.css** - `36d67f1` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/lib/audio/audio.ts` - Added `playArpeggio`, `studyModeEnabled`, `setStudyModeEnabled`; extended `_resetForTests`.
- `src/lib/audio/audio.test.ts` - Added `playArpeggio` and `study mode toggle` describe blocks (7 new tests).
- `src/app.css` - Added `pulse-once` keyframe, `.pulse-once` class, first-reveal combined rule, extended reduced-motion block.

## Decisions Made
- `playArpeggio` uses `toPitch(note, 4)` (letter + octave 4) rather than bare `toAsciiPitchClass`, since the latter alone doesn't attach an octave and the reveal keyboard's voicing starts at octave 4 (matching `toAscendingPitches`' starting point in `playChord`).
- Study-mode toggle has no `releaseAll()` side effect on set, unlike `setSoundEnabled(false)` — it's a playback-shape preference read live at call time, not an audio-output kill switch.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`playArpeggio`, `studyModeEnabled`/`setStudyModeEnabled`, and the `pulse-once` keyframe (with its reduced-motion suppression) are ready for Plans 02/03 (presentational components: `ChordGlyph`, `PianoKeyboard` pulse/pending props) and Plans 05/06 (`BuildSession` reveal wiring, `/progress` study-mode toggle UI). No blockers.

---
*Phase: 16-hear-the-chord*
*Completed: 2026-07-16*

## Self-Check: PASSED

- FOUND: src/lib/audio/audio.ts
- FOUND: src/lib/audio/audio.test.ts
- FOUND: src/app.css
- FOUND commit: d9af833
- FOUND commit: 36d67f1
