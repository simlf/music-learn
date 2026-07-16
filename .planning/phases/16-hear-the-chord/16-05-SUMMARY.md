---
phase: 16-hear-the-chord
plan: 05
subsystem: ui
tags: [svelte, tone.js, audio, vitest, build-session, reveal]

# Dependency graph
requires:
  - phase: 16-01
    provides: playChord/ensureAudioReady/soundEnabled audio primitives in $lib/audio/audio
  - phase: 16-02
    provides: PianoKeyboard pulseToken retrigger (off/on setTimeout idiom, shared .pulse-once keyframe)
  - phase: 16-03
    provides: ChordGlyph stamped/pulseToken props (same retrigger idiom)
provides:
  - triggerReveal() firing exactly once at the sessionState -> 'complete' transition (block auto-play + pulse bump)
  - hearAgain() ghost-button replay handler reading soundEnabled() live at click time
  - ChordGlyph inserted into the BuildSession complete block (chords only), stamped + pulseToken-driven
  - complete-block PianoKeyboard now carries pulseToken
affects: [16-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fire-once reveal trigger called inline at a state-transition site, never from a reactive $effect"
    - "Visual pulse bump lives outside the soundEnabled() gate so a sound-off reveal never dead-ends"

key-files:
  created: []
  modified:
    - src/lib/components/BuildSession.svelte
    - src/lib/components/buildSession.test.ts

key-decisions:
  - "triggerReveal()/hearAgain() both derive letters from construction.earnedNotes.map(n => n.letter) and gate ONLY the playChord call on soundEnabled(); revealPulseToken always increments"
  - "No stamp-settle delay logic was added in BuildSession itself - the existing app.css combined-animation selector (.chord-glyph--stamped.pulse-once) already sequences the glyph's entrance and pulse, and the complete-block PianoKeyboard never receives wrongLetters so its keys never get --stamped in the first place (no collision to guard against)"
  - "Study mode / playArpeggio wiring deliberately excluded from this plan per its own scope note - reserved for Plan 16-06"

patterns-established:
  - "Reveal-transition auto-play/pulse trigger pattern: call inline in the same branch that flips sessionState, mirroring the existing recordConstructionOutcome fire-once precedent"

requirements-completed: [HEAR-01, HEAR-02]

coverage:
  - id: D1
    description: "Chord auto-plays exactly once via playChord when a construction session reaches complete (sound on), using the earned-note letters"
    requirement: "HEAR-01"
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#completing Cm7 with sound on calls playChord exactly once with the earned-note letters, at reveal"
        status: pass
    human_judgment: false
  - id: D2
    description: "ChordGlyph renders in the complete block for chord targets, stamped in, above the heading; no glyph for scale targets"
    requirement: "HEAR-01"
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#renders build-complete-target containing the ChordGlyph for a completed chord reveal"
        status: pass
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#a completed G-major SCALE reveal renders NO build-complete-target (glyph is chords-only) while still reaching build-complete"
        status: pass
    human_judgment: false
  - id: D3
    description: "Ghost 'Hear again' button is first in the complete-block action row, never disabled, replays the chord and re-pulses on click"
    requirement: "HEAR-01"
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#a ghost \"Hear again\" button renders in the complete block, is never disabled, and replays playChord with the same letters on click"
        status: pass
    human_judgment: false
  - id: D4
    description: "With sound off, the reveal still runs the visual pulse (no playChord call, no error, no dead-end) and Hear again stays enabled and silent"
    requirement: "HEAR-02"
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#with sound off, completing Cm7 does NOT call playChord, yet build-complete renders and Hear again is present and enabled (sound-off pulse path, no dead-end)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The pulse/auto-play visual timing (glyph + keys pulsing once, sequenced after stamp-in on first reveal) reads correctly in the real browser, not just via unit assertions on the pulseToken prop"
    human_judgment: true
    rationale: "CSS keyframe timing/sequencing and audio-visual sync are visual/perceptual qualities that unit tests (jsdom, no real animation timing) cannot verify - needs a human to watch a real Build completion."

# Metrics
duration: 12min
completed: 2026-07-16
status: complete
---

# Phase 16 Plan 05: Reveal Wiring Summary

**Wired the BUILD reveal's fire-once chord auto-play, synced glyph/key pulse, and a live-reading "Hear again" replay into BuildSession's `complete` block.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-16T22:36:00Z
- **Completed:** 2026-07-16T22:48:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `triggerReveal()` fires exactly once at the `sessionState = 'complete'` transition (inline in the `feedbackTimer` callback, never a reactive `$effect`): plays the earned chord/scale via `playChord` when sound is on, and always bumps `revealPulseToken` so the lit keys and (for chords) the `ChordGlyph` pulse once in time
- `ChordGlyph` inserted above the heading in the complete block, gated `{#if kind === 'chords'}`, carrying `stamped` and `pulseToken={revealPulseToken}`
- The complete-block `PianoKeyboard` now receives `pulseToken={revealPulseToken}`
- `hearAgain()` ghost `Button` is the first control in the action row, reads `soundEnabled()` live at click time, and is never disabled - re-pulsing on every tap regardless of sound state
- `buildSession.test.ts` gained a full `$lib/audio/audio` mock (also eliminating the pre-existing unhandled-rejection noise from real `tone` imports during complete-state tests) and a new `describe` block proving playChord-once-on-reveal, the chords-only glyph gate, sound-off no-dead-end pulse, and Hear-again replay

## Task Commits

Each task was committed atomically:

1. **Task 1: Insert ChordGlyph + fire-once auto-play/pulse + Hear again into the complete block** - `f720796` (feat)
2. **Task 2: Test the reveal auto-play, pulse, sound-off path, and Hear again** - `39b1a74` (test)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/lib/components/BuildSession.svelte` - added `revealPulseToken` state, `triggerReveal()`/`hearAgain()` handlers, the complete-block `ChordGlyph` insertion, `pulseToken` wiring on the complete-block `PianoKeyboard`, and the `Hear again` ghost button
- `src/lib/components/buildSession.test.ts` - added a full `$lib/audio/audio` mock and a new "BuildSession reveal, HEAR-01/02" describe block (5 tests)

## Decisions Made
- `triggerReveal()`/`hearAgain()` share the exact same shape: derive letters from `construction.earnedNotes`, gate only the `playChord` call on `soundEnabled()`, always bump `revealPulseToken` - matching D-07/D-10/D-11's "pulse lives outside the sound gate" requirement precisely.
- No additional stamp-settle delay logic was needed in `BuildSession.svelte` itself: the shared `app.css` combined-animation selector (`.chord-glyph--stamped.pulse-once`, shipped in Plan 16-01/02/03) already sequences the glyph's `stamp-in` entrance and its `pulse-once` beat, and the complete-block `PianoKeyboard` never receives a `wrongLetters` prop, so its keys never carry `--stamped` in the first place - there is no entrance animation on the keys to collide with, only the plain 200ms pulse.
- Study mode / `playArpeggio` wiring was deliberately left out, per this plan's own scope note reserving that for Plan 16-06 (the study-mode arpeggio roll layers on top of this fire-once wiring, not replacing it).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The one pre-existing wrinkle (real `tone` import producing unhandled-rejection noise in `buildSession.test.ts`'s complete-state tests, since audio wasn't mocked before this plan) was explicitly anticipated and resolved by Task 2's new `vi.mock('$lib/audio/audio', ...)`, confirmed by a clean `npx vitest run` with zero errors after Task 2 landed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 16-06 (study-mode arpeggio roll) can build directly on `triggerReveal()`/`hearAgain()`, branching on `studyModeEnabled()` to swap the block `playChord` for a staggered `playArpeggio` roll with `pendingLetters` wiring - the fire-once transition site and the `revealPulseToken` bump are already in place and untouched by that future branch.
- D5 (visual/perceptual timing of the pulse-after-stamp-in sequencing) is flagged for human UAT at end-of-phase per this project's `human_verify_mode: end-of-phase` config setting - no blocker, just deferred verification.

---
*Phase: 16-hear-the-chord*
*Completed: 2026-07-16*

## Self-Check: PASSED
