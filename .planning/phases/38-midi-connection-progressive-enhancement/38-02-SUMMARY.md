---
phase: 38-midi-connection-progressive-enhancement
plan: 02
subsystem: midi
tags: [webmidi, web-midi-api, svelte5, reactive-state, feature-detection]

requires:
  - phase: 38-midi-connection-progressive-enhancement (plan 01)
    provides: "src/lib/midi/webmidi.ts: enableMidi(), watchPorts(), midiUnsupportedReason(), MidiEnableResult, MidiPortEvent, MidiInputInfo"
provides:
  - "src/lib/midi/midi.svelte.ts: the session-wide reactive MidiConnectionState machine (8-variant union), the two pure transition functions, the reactive getter/setter, connectedDeviceId(), a feature-detect-only initMidi(), and the one gesture-gated connectMidi() entry point"
affects: [38-03, 38-04, 39-play-to-answer]

tech-stack:
  added: []
  patterns:
    - "Fourth instance of the `.svelte.ts` module-level `$state` idiom (after swUpdate.svelte.ts, locale.svelte.ts, dueBadge.svelte.ts): pure exported reducer/predicate functions kept separate from the module's own $state + getter/setter trio"
    - "Once-per-page-load init guard (module-scope boolean) mirroring swUpdate.svelte.ts's `reloaded` flag, extended here with a second guard that a remount never drops a live connection/in-flight attempt"
    - "intent-counter re-entrancy guard for an awaited browser-permission call, applied verbatim from MicCheckPanel.svelte, now guarding a module-level connect function rather than a component"

key-files:
  created:
    - src/lib/midi/midi.svelte.ts
    - src/lib/midi/midi.test.ts
  modified: []

key-decisions:
  - "nextMidiState()'s first guard returns the identical current-state reference when kind is 'unsupported', asserted by toBe (reference equality) in tests, making MIDI-04 a mechanical guarantee in the state machine rather than a view-layer convention"
  - "disconnected is only reachable from a connected current state; a stray disconnect event on idle/no-device returns the current state unchanged, keeping 'never saw a device' and 'was connected, now is not' distinguishable per the ROADMAP's success criteria"
  - "watchPorts() is subscribed exactly once per app session via a module-scope watching boolean, set only after a successful enableMidi(), so a disconnect-then-reconnect needs no second connectMidi() call and no page reload"
  - "connectMidi()'s intent counter discards a stale enableMidi() result (mirrors MicCheckPanel.svelte's intent guard verbatim) so a slow permission-dialog resolution long after a second call, or after the user moved on, never overwrites newer state"

patterns-established:
  - "The complete Phase 39 note-stream seam is connectedDeviceId() (this module) plus activeInput(id) (plan 38-01's webmidi.ts) - Phase 39 resolves the raw Input from these two calls and attaches its own note listeners without either module gaining note-level code"

requirements-completed: [MIDI-01, MIDI-04]

coverage:
  - id: D1
    description: "MidiConnectionState is an 8-variant discriminated union (unsupported/idle/enabling/connected/no-device/disconnected/denied/error) distinguishing device-detected, device-disconnected, never-saw-a-device, and browser-unsupported as separate readable states"
    requirement: MIDI-01
    verification:
      - kind: unit
        ref: "src/lib/midi/midi.test.ts#nextMidiState (all 8 kind values exercised by name)"
        status: pass
    human_judgment: false
  - id: D2
    description: "nextMidiState() is the single reducer translating a MidiPortEvent into the next state: unsupported is terminal by reference equality, output ports are ignored, disconnected only fires from a connected current state"
    requirement: MIDI-04
    verification:
      - kind: unit
        ref: "src/lib/midi/midi.test.ts#nextMidiState (unsupported reference-equality + output-port-ignored + no-device/idle-unchanged-on-stray-disconnect cases)"
        status: pass
    human_judgment: false
  - id: D3
    description: "initMidi() feature-detects only and never calls enableMidi(), is safe to call twice, and never drops an already-connected/enabling state on a remount"
    requirement: MIDI-01
    verification:
      - kind: unit
        ref: "src/lib/midi/midi.test.ts#initMidi (all four cases: unsupported jsdom, supported-stub idle, no-op second call, connected-state preserved)"
        status: pass
    human_judgment: false
  - id: D4
    description: "connectMidi() is the sole function that may request MIDI access: it is unsupported-terminal, re-entrancy-guarded (enabling/connected no-op), discards a stale result via an intent counter, passes visibly through an 'enabling' state, and subscribes to watchPorts exactly once per session"
    requirement: MIDI-01
    verification:
      - kind: unit
        ref: "src/lib/midi/midi.test.ts#connectMidi (unsupported/connected/no-device/denied/enabling-pending/double-call-guard cases)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Hot-plug in both directions (disconnect then re-plug) is proven at unit level through the single watchPorts handler, with no reload and no second user tap needed to return to connected"
    requirement: MIDI-01
    verification:
      - kind: unit
        ref: "src/lib/midi/midi.test.ts#connectMidi (drives the state through the watchPorts handler: connected -> disconnected -> connected)"
        status: pass
    human_judgment: false
  - id: D6
    description: "No polling anywhere in the module (no setInterval/setTimeout/requestAnimationFrame) and connectedDeviceId() correctly derives the connected device's id for Phase 39's note-stream seam"
    requirement: MIDI-01
    verification:
      - kind: unit
        ref: "src/lib/midi/midi.test.ts#connectedDeviceId"
        status: pass
      - kind: other
        ref: "grep -n -E 'setInterval|setTimeout|requestAnimationFrame' src/lib/midi/midi.svelte.ts | grep -vE ':[[:space:]]*(\\*|//)' | wc -l -> 0"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-08-04
status: complete
---

# Phase 38 Plan 02: Session-Wide MIDI Connection State Machine Summary

**Reactive `.svelte.ts` module holding an 8-variant MidiConnectionState machine, two pure transition functions, a feature-detect-only `initMidi()`, and a gesture-gated `connectMidi()` that subscribes to plan 38-01's port events exactly once per app session**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-04T21:57:50+02:00
- **Completed:** 2026-08-04T22:09:28+02:00
- **Tasks:** 2 completed
- **Files modified:** 2 (src/lib/midi/midi.svelte.ts, src/lib/midi/midi.test.ts)

## Accomplishments
- Built `src/lib/midi/midi.svelte.ts`, the session-wide reactive MIDI connection state machine, following `swUpdate.svelte.ts`'s proven `.svelte.ts` pure-function-plus-`$state`-trio shape
- `nextMidiState()` mechanically guarantees MIDI-04 (unsupported is terminal, checked by reference equality) and keeps `no-device` distinguishable from `disconnected`
- `connectMidi()` is the single gesture-gated entry point to MIDI access, reusing `MicCheckPanel.svelte`'s `intent`-counter guard and subscribing to `watchPorts()` exactly once per app session, proven with a two-way hot-plug unit test (connected to disconnected to connected, no reload, no second tap)
- 50 passing Vitest cases across both plan 38-01's `webmidi.test.ts` and this plan's `midi.test.ts`, including the no-auto-prompt proof, the in-flight `enabling` pass-through via a deferred promise, and the double-call re-entrancy guard

## Task Commits

Each task was committed atomically:

1. **Task 1: State union and the two pure transition functions** - `6b3bef0` (feat)
2. **Task 2: Reactive state, feature-detect init, and the gesture-gated connect** - `7f53c9a` (feat)

_Note: both tasks are task-level `tdd="true"` (write the full behavior block, then implement, then commit once green) - not a plan-level TDD gate requiring separate RED/GREEN commits, matching plan 38-01's precedent._

## Files Created/Modified
- `src/lib/midi/midi.svelte.ts` - `MidiConnectionState` union, `stateFromEnable()`/`nextMidiState()` pure functions, `midiState()`/`setMidiState()`/`connectedDeviceId()` reactive trio, `initMidi()`, `connectMidi()`
- `src/lib/midi/midi.test.ts` - 50 Vitest cases: pure-function unit tests (Task 1) plus mocked-boundary reactive tests using the `vi.mock('./webmidi', importOriginal)` spread pattern and a per-test `vi.resetModules()` + dynamic re-import, mirroring plan 38-01's `webmidi.test.ts`

## Decisions Made
- `nextMidiState()`'s unsupported-terminal guard returns the identical `current` reference (not a copy), asserted with `toBe` in tests - a mechanical, not merely conventional, guarantee that no injected/replayed port event can produce MIDI chrome on a browser without Web MIDI
- `watchPorts()` is subscribed exactly once per app session (a module-scope `watching` boolean set only on the first successful `enableMidi()`), so the subscription outlives the component that triggered `connectMidi()` and a later disconnect/reconnect needs no new call
- `connectMidi()`'s `intent` counter is `MicCheckPanel.svelte`'s guard applied verbatim to a module-level function: a slow `enableMidi()` promise resolving after a second `connectMidi()` call (or after the user moved on) is discarded rather than overwriting newer state
- Each test in `midi.test.ts`'s Task 2 describe blocks dynamically re-imports `./midi.svelte` after a `vi.resetModules()` `beforeEach`, giving every test a fully fresh module instance (state, `initialized`, `intent`, `watching` all reset), following `webmidi.test.ts`'s established isolation pattern rather than relying on an explicit teardown of the shared reactive state

## Deviations from Plan

None - plan executed exactly as written. One verification-command note: the plan's literal acceptance-criteria grep (`grep -c "from '\$app/environment'" src/lib/midi/midi.svelte.ts` expected to return `1`) returns `0` under this environment's grep (macOS BSD grep, non-`-E` mode) because of a known BSD-grep quirk where a literal `$` positioned mid-pattern in basic regular expression mode fails to match even when not intended as an anchor (confirmed with a minimal `printf 'a$b\n' | grep -c 'a$b'` reproduction, which also returns `0`). The underlying invariant - the module imports `browser` from `$app/environment` exactly once - holds and was verified with `grep -cF "from '\$app/environment'" src/lib/midi/midi.svelte.ts` (fixed-string mode) and independently with `perl`, both returning `1`. This mirrors 38-01-SUMMARY.md's own documented grep-command note.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
`src/lib/midi/midi.svelte.ts` is ready for plan 38-03's `MidiStatus.svelte` component: `midiState()` for the reactive display, `connectMidi()` as the Connect button's click handler, `initMidi()` to be called once from the root layout's `onMount` alongside `initLocale()`/`registerUpdateWatcher()`. `connectedDeviceId()` plus plan 38-01's `activeInput()` are the documented, unblocked seam for Phase 39's note-stream work. No blockers.

---
*Phase: 38-midi-connection-progressive-enhancement*
*Completed: 2026-08-04*

## Self-Check: PASSED

All created files (`src/lib/midi/midi.svelte.ts`, `src/lib/midi/midi.test.ts`, this SUMMARY.md) and commit hashes (`6b3bef0`, `7f53c9a`, `1b919b9`) verified present on disk / in git history.
