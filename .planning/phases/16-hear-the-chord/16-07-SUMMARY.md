---
phase: 16-hear-the-chord
plan: 07
subsystem: audio
tags: [tone, audio, voicing, testing, vitest]

# Dependency graph
requires:
  - phase: 16-01
    provides: playArpeggio audio primitive, toAscendingPitches/toPitch voicing helpers
  - phase: 16-06
    provides: BuildSession study-mode roll consuming playArpeggio (the caller this gap-closure keeps compatible)
provides:
  - "playArpeggio(notes, { staggerMs, startDelayMs? }) voiced via toAscendingPitches — rolled pitches now equal the pitches playChord/the keyboard would strike for the same letters (closes gap 2 / WR-02 at the audio layer)"
  - "startDelayMs option on playArpeggio: offsets every attack by the same amount ((startDelayMs ?? 0) + index * staggerMs), giving the caller the knob needed to sync a delayed visual roll (audio half of gap 1 / WR-01)"
affects: [16-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Arpeggio voicing computed up-front via a single toAscendingPitches(notes) call, then iterated by index — mirrors playChord's voicing call so both primitives share one source of truth for pitch assignment"

key-files:
  created: []
  modified:
    - src/lib/audio/audio.ts
    - src/lib/audio/audio.test.ts

key-decisions:
  - "Removed the now-unused toPitch import from audio.ts (playArpeggio no longer calls it) rather than leaving a dead import — toPitch itself is untouched and still exported from voicing.ts for its other callers (RecallSession.svelte, ScaleKeyboardDrill.svelte, drills/+page.svelte)"
  - "startDelayMs is optional and defaults to 0 via `opts.startDelayMs ?? 0`, so every existing call site (BuildSession's Plan 16-06 wiring, all pre-existing tests) keeps its original t=0 synchronous first-note behavior with zero changes required at this plan"

requirements-completed: [HEAR-02]

coverage:
  - id: D1
    description: "playArpeggio voices every note via toAscendingPitches (ascending root position), so a scale rolls monotonically upward and each rolled pitch equals the pitch its lit key represents — no more mid-scale audible descent from the old flat octave-4 voicing"
    requirement: "HEAR-02"
    verification:
      - kind: unit
        ref: "src/lib/audio/audio.test.ts#playArpeggio > rolls a scale ascending, matching the block-strike voicing"
        status: pass
    human_judgment: false
  - id: D2
    description: "playArpeggio accepts an optional startDelayMs that offsets every note attack by the same amount, with omission preserving the original synchronous-at-t=0 default"
    requirement: "HEAR-02"
    verification:
      - kind: unit
        ref: "src/lib/audio/audio.test.ts#playArpeggio > startDelayMs offsets every attack so nothing sounds at t=0"
        status: pass
      - kind: unit
        ref: "src/lib/audio/audio.test.ts#playArpeggio > sounds the first note synchronously, then later notes at their staggered ticks in order"
        status: pass
    human_judgment: false
  - id: D3
    description: "Sound-off and empty-note-list early-returns unchanged; chord-tone case (root-position triads) still voices identically to before since ascending voicing coincides with flat octave-4 for those intervals"
    requirement: "HEAR-02"
    verification:
      - kind: unit
        ref: "src/lib/audio/audio.test.ts#playArpeggio > never attacks when sound is off"
        status: pass
      - kind: unit
        ref: "src/lib/audio/audio.test.ts#playArpeggio > does nothing for an empty note list"
        status: pass

# Metrics
duration: 12min
completed: 2026-07-17
status: complete
---

# Phase 16 Plan 07: Ascending-voiced playArpeggio with startDelayMs Summary

**playArpeggio rewired onto toAscendingPitches for root-position ascending voicing, plus an optional startDelayMs offset for every attack — the audio-layer half of gaps 1 and 2.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-17T00:00:00Z (approx, worktree session start)
- **Completed:** 2026-07-17T00:14:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `playArpeggio` now computes voicing once via `toAscendingPitches(notes)` (the same helper `playChord` and the on-screen keyboard use) instead of flattening every note to octave 4 with `toPitch`, so a scale roll ascends monotonically and every rolled pitch matches the pitch its lit key represents.
- `playArpeggio` accepts an optional `startDelayMs` that offsets every scheduled attack by `(startDelayMs ?? 0) + index * staggerMs`; omitting it keeps the original t=0-synchronous-first-note contract intact for existing callers.
- Doc comment above `playArpeggio` rewritten to describe only the corrected (ascending, delay-capable) behavior — no lingering claim of flat octave-4 voicing.
- Two new unit tests added: one proves the rolled pitch sequence for a scale deep-equals `toAscendingPitches(...)` output; one proves `startDelayMs` suppresses any attack at t=0 and shifts every subsequent attack by the same amount.

## Task Commits

Each task was committed atomically:

1. **Task 1: Voice playArpeggio ascending and add the startDelayMs offset** - `a394991` (feat)
2. **Task 2: Prove ascending scale voicing and the startDelayMs offset in audio.test.ts** - `7c25a89` (test)

**Plan metadata:** pending final docs commit (see below; orchestrator/executor completes this after STATE.md/ROADMAP.md updates are out of this agent's scope per plan instructions)

## Files Created/Modified
- `src/lib/audio/audio.ts` - `playArpeggio` widened to `{ staggerMs; startDelayMs? }`, voiced via `toAscendingPitches`, schedule shifted by `startDelayMs ?? 0`; unused `toPitch` import dropped; doc comment rewritten.
- `src/lib/audio/audio.test.ts` - added `toAscendingPitches` import and two new `playArpeggio` tests (ascending scale voicing, startDelayMs offset); existing three `playArpeggio` tests (ordering, sound-off, empty-list) unchanged and green.

## Decisions Made
- Dropped the now-dead `toPitch` import from `audio.ts` since `playArpeggio` was its only caller in that file; `toPitch` itself is untouched in `voicing.ts` and remains used by `RecallSession.svelte`, `ScaleKeyboardDrill.svelte`, and `drills/+page.svelte`.
- Used `mockTone.synths` length (not `synth()`) to assert "nothing sounds at t=0" in the `startDelayMs` test, since with a 260ms start delay no `setTimeout` fires at t=0 and the lazy Tone/PolySynth construction (which only happens inside the first fired attack) has not occurred yet — calling `synth()` at that point would read `undefined`. This mirrors the existing "never attacks when sound is off" / "empty note list" tests' own `mockTone.synths` assertion pattern.

## Deviations from Plan

None - plan executed exactly as written. The only adjustment (dropping the unused `toPitch` import and picking `mockTone.synths` over `synth()` for the pre-delay assertion) was a direct, in-scope consequence of implementing the plan's own `<action>`/`<behavior>` spec correctly, not a deviation from it.

## Issues Encountered
- The worktree had no `node_modules` installed (fresh worktree checkout); ran `npm install` before the first test invocation. Not a deviation from the plan's code changes, just environment setup required to run the specified verification commands.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `playArpeggio`'s new `startDelayMs` option is ready for plan 16-08 (wave 2) to wire through `BuildSession`'s reveal timers, aligning the audio roll with the delayed visual roll (gap 1 / WR-01, visual half).
- No blockers. `voicing.test.ts` (11 tests) confirmed still green as a guard that `voicing.ts` itself was untouched.

---
*Phase: 16-hear-the-chord*
*Completed: 2026-07-17*

## Self-Check: PASSED

- FOUND: src/lib/audio/audio.ts
- FOUND: src/lib/audio/audio.test.ts
- FOUND: .planning/phases/16-hear-the-chord/16-07-SUMMARY.md
- FOUND commit: a394991
- FOUND commit: 7c25a89
