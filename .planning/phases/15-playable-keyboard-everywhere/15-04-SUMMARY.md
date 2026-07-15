---
phase: 15-playable-keyboard-everywhere
plan: 04
subsystem: ui
tags: [svelte5, runes, keyboard-dock, snippets, scale-drill]

requires:
  - phase: "15-01"
    provides: "dockContext.svelte.ts (getDockRegistry registration seam)"
  - phase: "15-02"
    provides: "KeyboardDock.svelte (the fixed dock chrome that renders whichever config is registered)"
provides:
  - "Scales Practice (/scales, Practice mode): the tappable key-strip docks with the shared keyboard, while the degree register/prompt/completion card stay in the page's own scrolling flow (KBD-01, Scope Decision 6)"
affects: ["15-05..15-07 (remaining KBD-01 pages: /drills, /recall)"]

tech-stack:
  added: []
  patterns:
    - "A component can register only a partial slice of its own markup with the dock (the key-strip snippet), while the rest of its output stays in the component's normal render tree - the register()/clear() calls are driven by a dedicated $effect keyed off drill.done, not a single mount-time register() call, since the docked/non-docked split needs to react to in-component state (drill completion), not just mount/unmount lifecycle."

key-files:
  created: []
  modified:
    - src/lib/components/ScaleKeyboardDrill.svelte
    - src/lib/components/scaleKeyboardDrill.test.ts

key-decisions:
  - "ScaleKeyboardDrill's dock registration is driven by an $effect reading drill.done (register when not done, clear(dockToken) when done), rather than a single onMount register() call - Lookup/Theory (Plan 03) register once at mount and never need to un-dock mid-life; Scales' key-strip must actively vacate the dock once the drill completes (T-15-03) and come back on reset(), which a mount-only registration can't express."
  - "keyStrip is the only snippet handed to the dock (no register snippet) - the degree register/prompt/completion card stay inline in the component's own output per Scope Decision 6, matching the plan's explicit split."
  - "Test harness renders ScaleKeyboardDrill and KeyboardDock as two separate render() calls sharing one context Map (mirrors keyboardDock.test.ts/lookupDock.test.ts's own seam); assertions that must distinguish 'in the drill's own output' vs 'in the dock' scope queries to each render result's own .container, since both renders append to the same document.body and screen/baseElement queries would conflate them."

requirements-completed: []

coverage:
  - id: D1
    description: "On mount ScaleKeyboardDrill registers a dock config whose keyboard snippet renders the white/black scale keys, carrying no register snippet (Scope Decision 6)"
    requirement: "KBD-01"
    verification:
      - kind: unit
        ref: "src/lib/components/scaleKeyboardDrill.test.ts#registers a dock config on mount whose keyboard snippet renders the key-strip, and carries no register snippet (Scope Decision 6)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A correct tap on the expected-degree key (now rendered inside the dock) still calls the mocked playNote and advances the register/expectedTarget; grading stays chroma-only and byte-unchanged (SCALE-04)"
    requirement: "KBD-01"
    verification:
      - kind: unit
        ref: "src/lib/components/scaleKeyboardDrill.test.ts#tapping the tonic first fills the leftmost key and plays it; no key left of it is filled"
        status: pass
      - kind: unit
        ref: "src/lib/components/scaleKeyboardDrill.test.ts#fills all 8 ascending degrees with role colors and ends on a key distinct from the tonic"
        status: pass
    human_judgment: false
  - id: D3
    description: "The degree register line and ascending/descending prompt render in the component's own inline output, never inside the dock"
    requirement: "KBD-01"
    verification:
      - kind: unit
        ref: "src/lib/components/scaleKeyboardDrill.test.ts#the degree register and ascending/descending prompt render in the component's own output, not inside the dock"
        status: pass
    human_judgment: false
  - id: D4
    description: "Reaching drill.done clears the dock registration (no stray keys docked on a finished drill); reset() ('Run it again') re-registers the key-strip"
    requirement: "KBD-01"
    verification:
      - kind: unit
        ref: "src/lib/components/scaleKeyboardDrill.test.ts#completing all 15 taps shows the completion card, clears the dock registration, and Run it again re-registers and resets to degree 1 ascending"
        status: pass
    human_judgment: false
  - id: D5
    description: "Unmounting the drill (switching Practice -> Explore) clears the dock registration"
    requirement: "KBD-01"
    verification:
      - kind: unit
        ref: "src/lib/components/scaleKeyboardDrill.test.ts#clears its dock registration on unmount"
        status: pass
    human_judgment: false
  - id: D6
    description: "The Scales page's Explore branch (ScaleDegreeStrip + InspectRegister), tonic row, scale-title register, and mode toggle are byte-identical; the page performs no dock registration of its own (ScaleKeyboardDrill owns it)"
    requirement: "KBD-01"
    verification:
      - kind: e2e
        ref: "tests/scales.e2e.test.ts (11 tests, all green, unchanged)"
        status: pass
      - kind: automated
        ref: "npm run check (0 errors)"
        status: pass
      - kind: automated
        ref: "npm test (full suite, 983 tests)"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-07-15
status: complete
---

# Phase 15 Plan 4: Dock the Scales Practice key-strip Summary

**ScaleKeyboardDrill hands only its tappable key rows to the shared keyboard dock via a `keyStrip` snippet registered/cleared through a `drill.done`-driven effect; the degree register, ascending/descending prompt, and completion card stay in the component's own scrolling flow (Scope Decision 6) - `/scales/+page.svelte` needed no changes.**

## Performance

- **Duration:** 15 min
- **Completed:** 2026-07-15
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments

- `ScaleKeyboardDrill.svelte`'s `.scroll-wrap`/`.keys` key-strip markup (all white/black `.key` divs, `bind:this={containerEl}`, `handleTap`/`handleKeydown`/aria/`data-tonic-key` wiring) relocated verbatim into a `{#snippet keyStrip()}` block. A dedicated `$effect` reading `drill.done` registers `{ token: dockToken, keyboard: keyStrip }` with the dock whenever the drill is in progress, and calls `clear(dockToken)` once `drill.done` becomes true - so a finished drill leaves no stray keys docked (T-15-03). `reset()` (both the "Run it again" button and the tonic/notes-change effect) flips `drill.done` back to false, which re-registers on the next effect run.
- The degree register (`data-testid="scale-keyboard-register"`), the "Play {tonic} major ascending, then descending." prompt, and the `.complete`/"Run it again" completion card all stay rendered inline in `.scale-keyboard-drill`, exactly where they were before - no `register` snippet is ever registered with the dock (Scope Decision 6: the drill's degree register never duplicates into dock chrome).
- `onDestroy` now also calls `dockRegistry.clear(dockToken)` alongside the pre-existing `clearTimeout(wrongTimer)`, so switching the Scales page back to Explore (which unmounts `ScaleKeyboardDrill`) clears the docked strip.
- Confirmed (Task 2) that `src/routes/scales/+page.svelte` needs zero changes: the page never wired its own dock registration (`ScaleKeyboardDrill` owns it entirely), and its Explore branch (`ScaleDegreeStrip` + `InspectRegister`), tonic row, scale-title register, and mode toggle were never touched by this plan.
- `scaleKeyboardDrill.test.ts` now supplies a real `createDockRegistry()` via the `render()` `context` option and renders `KeyboardDock` alongside the drill (mirroring `lookupDock.test.ts`/`theoryDock.test.ts`'s own harness), with four new assertions covering dock registration on mount, the register/prompt rendering in the drill's own output (not the dock), dock clearing on completion/re-registering on reset, and dock clearing on unmount - plus every pre-existing grading/completion/enharmonic assertion re-verified against the relocated (now-docked) key buttons.

## Task Commits

Each task was committed atomically:

1. **Task 1: Relocate ScaleKeyboardDrill's key-strip into the dock** - `5505561` (feat)
2. **Task 2: Confirm Scales page Explore/Practice wrapper still holds** - no code change required; `src/routes/scales/+page.svelte` already satisfies every acceptance criterion unmodified (verified via `npm run check` and the full `npm test` run; no commit produced)

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/lib/components/ScaleKeyboardDrill.svelte` - key-strip extracted into a `{#snippet keyStrip()}`, registered/cleared with the shared dock via a `drill.done`-driven `$effect`, `onDestroy` also clears the dock registration
- `src/lib/components/scaleKeyboardDrill.test.ts` - render harness now supplies a real dock registry via context and renders `KeyboardDock` alongside the drill; added dock-registration/clear/re-register/inline-output assertions

## Decisions Made

- Dock registration is effect-driven (keyed off `drill.done`), not a single mount-time `register()` call, because the key-strip needs to actively leave the dock on completion and return on reset - a lifecycle Lookup/Theory's simpler "register once at mount, clear once at unmount" pattern doesn't need.
- Test assertions that must prove "renders in the drill's own output, not the dock" scope DOM queries to each `render()` result's own `.container` rather than the shared `screen`/`baseElement`, since both the drill and the dock are separate `render()` calls appended to the same `document.body`.

## Deviations from Plan

None - plan executed exactly as written. Task 2 required no code changes, as anticipated by the plan's own conditional instruction ("If no change is required, record that in the SUMMARY and add no code.").

## Issues Encountered

- First attempt at the "register/prompt render in the component's own output, not inside the dock" test assertion used `dock.queryByTestId(...)`, which (like `screen`) defaults to querying the full shared `document.body` rather than being scoped to that render's own container - it found the drill's register element via the dock's render result too. Fixed by querying `dock.container`/`drill.container` directly (`container.querySelector(...)`), which are genuinely scoped to each render call's own wrapper. No production code was affected; this was a test-only fix caught by the plan's own required verification (`npm test -- src/lib/components/scaleKeyboardDrill.test.ts`).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Three of five KBD-01 pages are now dock-wired (Lookup, Theory, Scales' Practice surface), alongside the Plans 01-02 foundation. Plans 05-07 still need to dock `/drills` and `/recall` before KBD-01 can be marked complete in REQUIREMENTS.md - this plan's `requirements-completed` is intentionally empty, matching Plans 02/03's own correction (KBD-01 is only true once every in-scope page is dock-wired).

`npm run check` passes (0 errors); the full suite (983 tests) stays green.

No blockers for Plan 05.

---
*Phase: 15-playable-keyboard-everywhere*
*Completed: 2026-07-15*

## Self-Check: PASSED

- FOUND: src/lib/components/ScaleKeyboardDrill.svelte
- FOUND: src/lib/components/scaleKeyboardDrill.test.ts
- FOUND: 5505561 (Task 1 commit)
