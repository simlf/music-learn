---
phase: 16-hear-the-chord
plan: 02
subsystem: ui-component
tags: [svelte, css-animation, piano-keyboard]

# Dependency graph
requires:
  - phase: 16-hear-the-chord
    plan: "01"
    provides: "pulse-once shared CSS keyframe + extended reduced-motion block in app.css"
provides:
  - "PianoKeyboard pulseToken prop: re-triggerable one-shot pulse-once on role-lit keys"
  - "PianoKeyboard pendingLetters prop: --pending dim state for the study-mode arpeggio roll"
affects: [16-05, 16-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Off-then-on flip via a 0ms restart timer + 200ms cleanup timer forces a CSS class removed-then-re-added cycle so a keyframe animation genuinely restarts on each new prop value, instead of staying statically applied"
    - "New class-composition helpers (pulseClass/pendingClass) follow the file's existing stampedClass/selectedClass guard idiom exactly"

key-files:
  created:
    - src/lib/components/pianoKeyboardPulse.test.ts
  modified:
    - src/lib/components/PianoKeyboard.svelte

key-decisions:
  - "pulseToken retrigger uses a $state 'pulsing' flag + setTimeout(0)/setTimeout(200) pair (not a {#key pulseToken} remount) so pulseToken bumps never destroy/recreate sibling keys mid-arpeggio-roll, which would break pendingLetters' opacity cross-fade transition once BuildSession combines both signals on the same element in a later plan"
  - "pulseClass/pendingClass ignore letter for pulseClass's own logic but keep the (letter, role) signature to match every other per-key class helper's call-site convention (key.letter / key.sharpLetter)"

requirements-completed: [HEAR-01, HEAR-02]

coverage:
  - id: D1
    description: "Omitting pulseToken applies no .pulse-once to any key (byte-identical baseline)"
    requirement: HEAR-01
    verification:
      - kind: unit
        ref: "src/lib/components/pianoKeyboardPulse.test.ts#PianoKeyboard pulse (pulseToken) > rendering with notes and no pulseToken applies no .pulse-once to any key"
        status: pass
    human_judgment: false
  - id: D2
    description: "Bumping pulseToken to a number applies .pulse-once to every role-lit key, never to non-role keys"
    requirement: HEAR-01
    verification:
      - kind: unit
        ref: "src/lib/components/pianoKeyboardPulse.test.ts#PianoKeyboard pulse (pulseToken) > after pulseToken is set to a number, every role-lit key carries .pulse-once; keys with no role never do"
        status: pass
    human_judgment: false
  - id: D3
    description: "Re-bumping pulseToken to a new value while mounted re-applies .pulse-once (genuine retrigger, not a static class)"
    requirement: HEAR-01
    verification:
      - kind: unit
        ref: "src/lib/components/pianoKeyboardPulse.test.ts#PianoKeyboard pulse (pulseToken) > re-bumping pulseToken to a new value while mounted re-applies .pulse-once"
        status: pass
    human_judgment: false
  - id: D4
    description: "pendingLetters dims only an already-role-lit key matching the letter; a letter with no role gets no --pending even if listed; a wrong-marked key never gets --pending"
    requirement: HEAR-02
    verification:
      - kind: unit
        ref: "src/lib/components/pianoKeyboardPulse.test.ts#PianoKeyboard pending (pendingLetters) > pendingLetters dims only an already-role-lit key matching the letter"
        status: pass
      - kind: unit
        ref: "src/lib/components/pianoKeyboardPulse.test.ts#PianoKeyboard pending (pendingLetters) > a letter with no role in notes gets no --pending even when listed in pendingLetters"
        status: pass
      - kind: unit
        ref: "src/lib/components/pianoKeyboardPulse.test.ts#PianoKeyboard pending (pendingLetters) > wrong/selected keys are unaffected: a wrong-marked key never gets --pending even when its letter is listed"
        status: pass
    human_judgment: false
  - id: D5
    description: "No regression to display/interactive/construct/inspect renders"
    verification:
      - kind: unit
        ref: "src/lib/components/pianoKeyboardConstruct.test.ts and pianoKeyboardInspect.test.ts (23 tests, all pass unchanged)"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-16
status: complete
---

# Phase 16 Plan 02: PianoKeyboard Pulse + Pending Props Summary

**Added `pulseToken?: number` and `pendingLetters?: Set<string>` to `PianoKeyboard.svelte`: a re-triggerable one-shot `.pulse-once` on role-lit keys (driven by an off-then-on state flip, not a DOM remount) and a `--pending` dim state for the study-mode arpeggio roll, both additive and byte-identical when omitted.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-16T22:10:00Z
- **Completed:** 2026-07-16T22:22:00Z
- **Tasks:** 1 completed
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- `pulseToken?: number` prop: bumping it to any new number applies the shared `.pulse-once` keyframe (from Plan 16-01's `app.css`) to every role-lit key. Implemented via a local `pulsing` `$state` flag toggled off-then-on by an `$effect` keyed on `pulseToken` — a 0ms `setTimeout` creates the DOM-commit boundary between the "off" write and the "on" write (so the class is genuinely removed then re-added, restarting the CSS animation), and a 200ms cleanup timer clears the flag once the animation cycle finishes. Any prior timer is cleared before scheduling a new one (T-16-03 mitigation).
- `pendingLetters?: Set<string>` prop: dims an already-role-lit key via the new `.piano-keyboard__key--pending { opacity: 0.28; }` rule, guarded like `selectedClass` but inverted (`role && pendingLetters?.has(letter)`), so a letter with no role never gets `--pending` even if listed, and a wrong-marked key never gets `--pending` either.
- `pulseClass(letter, role)` and `pendingClass(letter, role)` helpers added alongside the existing `stampedClass`/`selectedClass`/`wrongClass`/`pressedClass`/`flashWrongClass` composition functions, following the same guard idiom, and concatenated into both the white-key and black-key per-key class lists at the same call sites.
- Extended `.piano-keyboard__key`'s shared `transition` list to include `opacity 120ms ease-out`, giving the pending-to-lit cross-fade its smooth transition (the reduced-motion override for this and `.pulse-once` already lives in `app.css` from Plan 16-01 — no component-local duplicate added).
- New dedicated test file `pianoKeyboardPulse.test.ts` (6 tests): baseline (no pulse), first bump, genuine retrigger on a second bump (using `vi.useFakeTimers()`/`vi.advanceTimersByTimeAsync`, mirroring `audio.test.ts`'s `playArpeggio` test pattern), and three `pendingLetters` tests covering the role-gated dim, no-role exclusion, and wrong-key exclusion.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add pulseToken + pendingLetters to PianoKeyboard** - `fce20f3` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/lib/components/pianoKeyboardPulse.test.ts` - New test file: pulse retrigger (3 tests) + pending dim state (3 tests).
- `src/lib/components/PianoKeyboard.svelte` - Added `pulseToken`/`pendingLetters` props, `pulseClass`/`pendingClass` helpers, `.piano-keyboard__key--pending` CSS rule, extended the shared key transition list with `opacity`.

## Decisions Made

- Chose the `$state` flag + timer-flip retrigger mechanism over wrapping the keyed `{#each}` blocks in `{#key pulseToken}`. The `{#key}` remount approach would have been simpler to implement and test, but it would destroy and recreate every key element (white and black) on every `pulseToken` bump — including the ones still mid-`--pending` cross-fade during a future arpeggio roll (Plan 16-05/06 bumps `pulseToken` once per note while other keys remain pending). Recreating those elements would snap their opacity instantly instead of transitioning, breaking the UI-SPEC's "opacity animates 0.28 → 1 over 120ms ease-out" contract. The timer-flip keeps all key elements stable across pulses, so `pendingLetters`' transition and `pulseToken`'s pulse can coexist correctly once combined by a later plan.
- Followed the plan's per-key helper call convention (`(letter, role)`) for `pulseClass` even though its own logic doesn't need `letter`, so its call sites read identically to `stampedClass`/`pressedClass`/`flashWrongClass`.

## Deviations from Plan

None - plan executed exactly as written. The `$state`/timer-based retrigger (vs. the alternative `{#key}` approach the plan explicitly left to executor's discretion) was chosen for compatibility with the later study-mode roll plans, as explained above.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`pulseToken` and `pendingLetters` are ready for Plan 16-03 (`ChordGlyph.svelte`'s matching `stamped`/`pulseToken` props) and Plans 16-05/16-06 (`BuildSession.svelte` reveal wiring: firing `pulseToken` bumps on `sessionState === 'complete'` and "Hear again", and driving `pendingLetters` during the study-mode roll). No blockers.

---
*Phase: 16-hear-the-chord*
*Completed: 2026-07-16*

## Self-Check: PASSED

- FOUND: src/lib/components/PianoKeyboard.svelte
- FOUND: src/lib/components/pianoKeyboardPulse.test.ts
- FOUND commit: fce20f3
