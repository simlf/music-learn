---
phase: 38-midi-connection-progressive-enhancement
plan: 01
subsystem: midi
tags: [webmidi, web-midi-api, feature-detection, prerender-safe, svelte5]

requires: []
provides:
  - "webmidi 3.1.16 exact-pinned runtime dependency"
  - "src/lib/midi/webmidi.ts: the sole app boundary onto the webmidi package (feature detection, guard-first enable, error mapping, non-accumulating port-event subscription, activeInput seam)"
affects: [38-02, 38-03, 38-04, 39-play-to-answer]

tech-stack:
  added: ["webmidi@3.1.16 (exact pin, dependencies)"]
  patterns:
    - "Browser-API boundary module: every navigator/window/package reference lives inside a function body, package reached via lazy dynamic import, so adapter-static's strict prerender never executes it (mirrors src/lib/audio/micInput.ts)"
    - "Discriminated-union result type ({ ok: true, ... } | { ok: false, reason }) for a guard-first async browser-permission call"
    - "Module-scope tracked listener pair, removed-then-re-registered on every watch call, to make duplicate hot-plug handler accumulation structurally impossible"

key-files:
  created:
    - src/lib/midi/webmidi.ts
    - src/lib/midi/webmidi.test.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "midiUnsupportedReason() uses the same two-rung guard ladder as micUnavailableReason() (no-window, then feature-check) since Web MIDI needs no secure-context/constructor check beyond that"
  - "enableMidi() always passes { sysex: false } explicitly rather than relying on a library default, mitigating T-38-01 (elevation-of-privilege via an unneeded broader capability)"
  - "enableMidi() returns only the app's own flat MidiInputInfo DTO (id/name/manufacturer); raw webmidi port objects are reachable solely through the explicit activeInput(id) seam, mitigating T-38-04"
  - "watchPorts() tracks its own registered handler pair at module scope and removes the previous pair before registering a new one, mitigating T-38-03 (no polling anywhere; only webmidi's own port events)"

patterns-established:
  - "webmidi package import boundary: src/lib/midi/webmidi.ts is the only file that names the webmidi package at the value-import level (verified by grep); a top-of-file `import type { Input } from 'webmidi'` is the sole type-only exception, erased at build"

requirements-completed: [MIDI-01, MIDI-04]

coverage:
  - id: D1
    description: "webmidi 3.1.16 is an exact-pinned runtime dependency (no caret/tilde) and the production adapter-static prerender still succeeds for every route"
    requirement: MIDI-01
    verification:
      - kind: unit
        ref: "npm ls webmidi --depth=0 (resolves webmidi@3.1.16)"
        status: pass
      - kind: other
        ref: "npm run build (adapter-static strict prerender of every route)"
        status: pass
    human_judgment: false
  - id: D2
    description: "midiUnsupportedReason()/isMidiSupported() feature-detect Web MIDI without touching a browser API at module scope, returning 'unsupported' when navigator.requestMIDIAccess is absent"
    requirement: MIDI-04
    verification:
      - kind: unit
        ref: "src/lib/midi/webmidi.test.ts#midiUnsupportedReason / isMidiSupported"
        status: pass
    human_judgment: false
  - id: D3
    description: "enableMidi() requests only { sysex: false } (never system-exclusive), maps rejections to a named MidiConnectFailure reason without ever throwing, and returns the app's own flat MidiInputInfo DTO"
    requirement: MIDI-01
    verification:
      - kind: unit
        ref: "src/lib/midi/webmidi.test.ts#enableMidi"
        status: pass
      - kind: unit
        ref: "src/lib/midi/webmidi.test.ts#mapEnableError"
        status: pass
    human_judgment: false
  - id: D4
    description: "watchPorts() registers exactly one connected/disconnected listener pair, removes any prior pair before re-registering (no accumulation), and its disposer removes both"
    requirement: MIDI-01
    verification:
      - kind: unit
        ref: "src/lib/midi/webmidi.test.ts#watchPorts"
        status: pass
      - kind: other
        ref: "grep -n -E 'setInterval|setTimeout|requestAnimationFrame' src/lib/midi/webmidi.ts | grep -vE ':[[:space:]]*(\\*|//)' | wc -l -> 0"
        status: pass
    human_judgment: false
  - id: D5
    description: "activeInput(id) returns null before any successful enableMidi() and the matching raw Input after one succeeds, documented as the Phase 39 note-listener seam"
    requirement: MIDI-01
    verification:
      - kind: unit
        ref: "src/lib/midi/webmidi.test.ts#activeInput"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-08-04
status: complete
---

# Phase 38 Plan 01: WebMidi Boundary Module Summary

**Exact-pinned webmidi 3.1.16 dependency plus a prerender-safe browser-API boundary module (feature detection, sysex-free guard-first enable, error mapping, non-accumulating port-event subscription, and the activeInput Phase 39 seam)**

## Performance

- **Duration:** 15 min
- **Started:** 2026-08-04T19:44:54Z
- **Completed:** 2026-08-04T19:54:39Z
- **Tasks:** 2 completed
- **Files modified:** 4 (package.json, package-lock.json, src/lib/midi/webmidi.ts, src/lib/midi/webmidi.test.ts)

## Accomplishments
- Installed `webmidi@3.1.16` as an exact-pinned runtime dependency, matching this repo's existing exact-pin convention for `dexie`/`tone`/`ts-fsrs`/`zod`
- Built `src/lib/midi/webmidi.ts`, the single boundary between this app and the `webmidi` package, structured directly on `src/lib/audio/micInput.ts`'s proven shape
- Covered the full behavior block (feature detection, error mapping, guard-first enable with the exact `{ sysex: false }` options assertion, port-event forwarding, listener non-accumulation, `activeInput`) with 20 passing Vitest cases against a mocked `webmidi` package

## Task Commits

Each task was committed atomically:

1. **Task 1: Install webmidi 3.1.16 as an exact-pinned dependency** - `eb41a12` (feat)
2. **Task 2: Build the webmidi boundary module and its unit test** - `f8eb0ad` (feat)

_Note: Task 2 was executed test-and-implementation-together in a single commit (task-level `tdd="true"`, not a plan-level TDD gate requiring separate RED/GREEN commits); both the full behavior block and the implementation were authored before verification, then committed once green._

## Files Created/Modified
- `package.json` / `package-lock.json` - added `webmidi: "3.1.16"` under `dependencies` (exact pin)
- `src/lib/midi/webmidi.ts` - feature detection (`midiUnsupportedReason`/`isMidiSupported`), pure error mapping (`mapEnableError`), guard-first `enableMidi()`, non-accumulating `watchPorts()`, and the `activeInput()` Phase 39 seam
- `src/lib/midi/webmidi.test.ts` - full Vitest coverage of the above against a `vi.mock('webmidi', ...)` fake namespace

## Decisions Made
- `midiUnsupportedReason()` mirrors `micUnavailableReason()`'s guard-ladder shape exactly (two rungs: no-window, then feature-check), since Web MIDI needs no secure-context/constructor check beyond that
- `enableMidi()` always passes `{ sysex: false }` explicitly (never relying on a library default) as the automated proof of T-38-01's mitigation
- `enableMidi()`'s result exposes only the app's own flat `MidiInputInfo` DTO; raw webmidi port objects are reachable solely via `activeInput(id)`, per T-38-04
- `watchPorts()` tracks its own registered handler pair at module scope, removing the previous pair before every new registration, per T-38-03 (no hot-plug handler accumulation)
- Each test in `webmidi.test.ts` dynamically re-imports `./webmidi` after `vi.resetModules()` in a global `beforeEach`, so the module's own scoped state (`webMidiNamespace`, the registered listener pair) never leaks across test cases

## Deviations from Plan

None - plan executed exactly as written. One verification-command note: the plan's literal acceptance-criteria grep (`grep -rln "from 'webmidi'" src/ | sort` expected to list both `webmidi.test.ts` and `webmidi.ts`) in practice lists only `webmidi.ts`, because the test file mocks the package via `vi.mock('webmidi', () => ...)` rather than a static `import ... from 'webmidi'` statement, so it never contains the literal substring `from 'webmidi'`. The underlying invariant the criterion protects - no file besides this module's own pair touches the `webmidi` package - holds and is in fact proven more strictly (zero other files reference the package name at all, including by string literal in the test).

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
`src/lib/midi/webmidi.ts` is ready to be consumed by plan 38-02's `midi.svelte.ts` reactive state module: `enableMidi()` for the gesture-gated connect flow, `watchPorts()` as the single device-event source, and `activeInput(id)` as the documented Phase 39 note-listener seam. No blockers.

---
*Phase: 38-midi-connection-progressive-enhancement*
*Completed: 2026-08-04*

## Self-Check: PASSED

All created files and commit hashes verified present on disk / in git history.
