---
phase: 15-playable-keyboard-everywhere
plan: 06
subsystem: ui
tags: [svelte5, runes, keyboard-dock, snippets, recall]

requires:
  - phase: "15-01"
    provides: "dockContext.svelte.ts (getDockRegistry registration seam)"
  - phase: "15-02"
    provides: "KeyboardDock.svelte (the fixed dock chrome that renders whichever config is registered)"
provides:
  - "Recall (/recall) modes A (see-play), B (hear-name), and formula: one mode-aware docked keyboard whose interactive/inspectable state mirrors today's per-mode logic exactly (KBD-01, KBD-03), leaving Mode C (formula-build/BuildSession) for Plan 07"
affects: ["15-07 (Mode C's own embedded BuildSession keyboard, the last remaining KBD-01/KBD-03 surface)"]

tech-stack:
  added: []
  patterns:
    - "One {#snippet dockedKeyboard()} branches on currentItem.mode/currentFact.factKind/revealed to reproduce Mode A's interactive->inspectable transform-on-wrong and the formula-mode reveal exactly, plus a brand-new Mode B inspectable board - mirrors Plans 04/05's established one-snippet-per-page pattern"
    - "Dock registration is $effect-driven (register, return a cleanup that clears) keyed off pageState !== 'reviewing' || currentItem?.mode === 'formula-build', not a mount-once register()/onDestroy clear() pair - mirrors Plan 05's isShortLandscape-driven pattern, since the register/clear boundary must react live to queue advances and pageState transitions, not just mount/unmount"

key-files:
  created: []
  modified:
    - src/lib/components/RecallSession.svelte
    - src/lib/components/recallSession.test.ts

key-decisions:
  - "getDockRegistry() is captured once at component-init time into a `dockRegistry` const (matching Plans 02-05's established pattern), reused by both the registration $effect and its own cleanup - calling getContext() again during teardown throws Svelte's lifecycle_outside_component."
  - "No `register` snippet is registered alongside `dockedKeyboard` (Recall's readouts - grade grid, hear-name choices, mode-A feedback legend - all stay in flow, per the plan's own explicit instruction), matching Drills' construction-input choice from Plan 05."
  - "recallSession.test.ts's pre-existing render(RecallSession) call sites (29 total) were mechanically replaced with a new `renderRecallSession()` helper that supplies a real dock registry via context and renders KeyboardDock alongside the component - the same context-injection harness Plans 03/05 established for lookup/theory/drills. A second `renderRecallSessionPageOnly()` helper (page + context, no KeyboardDock) backs the new registration/clear-specific assertions that check the registry object directly rather than rendered dock content."

requirements-completed: []

coverage:
  - id: D1
    description: "Mode A (see-play) registers an interactive docked keyboard; tapping sounds via mocked playNote (through pressModeAKey) and toggles selection; a wrong Check transforms the SAME docked keyboard to show target.notes + extra-letter grays"
    requirement: "KBD-01"
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#Mode A (see-play): the docked keyboard is interactive"
        status: pass
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#Mode A (see-play): a wrong Check transforms the SAME docked keyboard"
        status: pass
    human_judgment: false
  - id: D2
    description: "Mode B (hear-name) registers an inspectable docked keyboard; the multiple-choice grid stays in flow and still auto-advances (never gates) unchanged"
    requirement: "KBD-01"
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#Mode B (hear-name): the docked keyboard is a plain inspectable tap-to-hear board"
        status: pass
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts (Mode B describe block - correct/wrong choice, never-gates, mixed-mode integration tests all stay green)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Formula mode registers an inspectable docked keyboard present through the whole flow (empty pre-reveal, chord notes post-reveal); the reveal's formula chips/grade grid stay in flow, grading/day-interval labels unchanged"
    requirement: "KBD-01"
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#formula mode: the docked keyboard is inspectable and present before AND after Show Answer"
        status: pass
    human_judgment: false
  - id: D4
    description: "No <PianoKeyboard> for modes A/B/formula remains in the component's own flow; the dock clears outside the reviewing state and for formula-build mode, and on unmount"
    requirement: "KBD-03"
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#renders no PianoKeyboard in the page's own document flow itself"
        status: pass
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#clears its registration once the session completes"
        status: pass
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#clears its registration while a formula-build (Mode C) card is showing"
        status: pass
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#clears its registration on unmount"
        status: pass
      - kind: automated
        ref: "npm run check"
        status: pass
      - kind: automated
        ref: "npm test (full suite, 1000 tests)"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-07-16
status: complete
---

# Phase 15 Plan 6: Mode-aware docked keyboard for Recall modes A/B/formula Summary

**RecallSession's Mode A (see-play), Mode B (hear-name), and formula-mode reveal keyboards collapse into ONE mode-aware `dockedKeyboard` snippet registered with the shared dock; Mode C (formula-build/embedded BuildSession) is left untouched for Plan 07, with the dock explicitly clearing whenever that mode is showing.**

## Performance

- **Duration:** 20 min
- **Completed:** 2026-07-16
- **Tasks:** 1 completed
- **Files modified:** 2

## Accomplishments

- `src/lib/components/RecallSession.svelte`'s two inline `<PianoKeyboard>` sites (Mode A's interactive input/wrong-answer reveal, and the `formula`-mode reveal keyboard) are gone from the component's own document flow. A single `{#snippet dockedKeyboard()}` branches on `currentItem?.mode`/`currentFact?.factKind`/`revealed` to reproduce: Mode A's exact prop combination (interactive → target notes + wrongLetters on a miss, relocated verbatim), Mode B's brand-new plain `inspectable` tap-to-hear board (the mapping's inspectable fallback - Mode B never had a keyboard before), and the `formula`-mode reveal (`inspectable`, empty pre-reveal so the dock is present through the whole flow, `chord.notes` post-reveal for `chord-formula` facts).
- `getDockRegistry()` is captured once at component-init time (`dockRegistry` const, matching Plans 02-05's established pattern). A single `$effect` registers `{ token: dockToken, keyboard: dockedKeyboard }` whenever `pageState === 'reviewing'` AND the current item's mode isn't `'formula-build'`, and returns a cleanup that calls `clear(dockToken)` - firing on every re-run (queue advance into Mode C, or into `complete`/`error`) and on unmount, so no separate `onMount`/`onDestroy` pair was needed. No `register` snippet is provided - every readout (grade grid, hear-name choice grid, Mode A's feedback legend) stays in flow.
- `src/lib/components/recallSession.test.ts`'s 29 pre-existing `render(RecallSession)` call sites were mechanically replaced with a new `renderRecallSession()` helper that supplies a real dock registry via the `render()` `context` option and renders `KeyboardDock` alongside the component (mirrors Plans 03/05's own context-injection harness fix). A second `renderRecallSessionPageOnly()` helper (page + context, no `KeyboardDock`) backs a new dedicated describe block covering: dock registration on mount, no `PianoKeyboard` in the page's own flow, unmount-clears-registration, complete-state-clears-registration, formula-build-clears-registration, Mode A interactivity + wrong-answer in-place transform, Mode B's plain inspectable board, and formula mode's pre/post-reveal keyboard presence.

## Task Commits

Each task was committed atomically:

1. **Task 1: Mode-aware docked keyboard for Recall modes A / B / formula** - `f57954e` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/lib/components/RecallSession.svelte` - two inline `PianoKeyboard` sites (Mode A, formula reveal) collapsed into one `{#snippet dockedKeyboard()}`, registered/cleared via a `pageState`/`currentItem.mode`-driven `$effect`; Mode B gains a brand-new docked inspectable board it never had before
- `src/lib/components/recallSession.test.ts` - `renderRecallSession()`/`renderRecallSessionPageOnly()` harness helpers supplying a real dock registry via context; all 29 existing render call sites mechanically substituted; new dock registration/clear/mode-transform describe block added

## Decisions Made

- `getDockRegistry()` captured once at component-init time into a `dockRegistry` const, reused by both the registration `$effect` and its own cleanup closure - matches Plans 02-05's established pattern (calling `getContext()` again during teardown throws `lifecycle_outside_component`).
- No `register` snippet registered alongside `dockedKeyboard` - Recall's readouts (grade grid, hear-name choices, Mode A's feedback legend) all stay in flow, matching Drills' Plan 05 choice for its own construction-input branch.
- Dock registration is `$effect`-driven (register + returned cleanup that clears), not a mount-once `register()`/`onDestroy` `clear()` pair - mirrors Plan 05's `isShortLandscape`-driven pattern, since the register/clear boundary must react live to every queue advance and `pageState` transition (into Mode C, `complete`, or `error`), not just component mount/unmount.

## Deviations from Plan

None - plan executed exactly as written. The plan's own read_first instructions anticipated the dock-registration test-harness need (matching Plans 02/03/05's precedent), so no reactive test-infrastructure fix was required; `npm run check` and the full `npm test` suite passed on the first run after the change.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Recall's Mode A, Mode B, and `formula`-mode reveal keyboards are all dock-wired and verified (`npm run check` passes, 0 errors; the full suite - 1000 tests - stays green). Mode C (`formula-build`, the embedded `BuildSession` instance) intentionally still renders its own keyboard inline, exactly as before this plan - the dock's registration `$effect` explicitly clears whenever that mode is showing, so no stale keyboard exists alongside it.

Plan 07 is the last remaining piece: docking BuildSession's own keyboard (both standalone on `/build` if in scope, and embedded here in Mode C) before KBD-01 and KBD-03 can be marked complete in REQUIREMENTS.md. This plan's `requirements-completed` is intentionally empty, matching Plans 02/03/05's own correction (KBD-01/KBD-03 are only true once every in-scope page/mode is dock-wired).

No blockers for Plan 07.

---
*Phase: 15-playable-keyboard-everywhere*
*Completed: 2026-07-16*

## Self-Check: PASSED

- FOUND: src/lib/components/RecallSession.svelte
- FOUND: src/lib/components/recallSession.test.ts
- FOUND: f57954e (Task 1 commit)
