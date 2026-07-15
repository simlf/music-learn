---
phase: 15-playable-keyboard-everywhere
plan: 07
subsystem: ui
tags: [svelte5, runes, keyboard-dock, snippets, build-session, recall]

requires:
  - phase: "15-01"
    provides: "dockContext.svelte.ts (getDockRegistry registration seam)"
  - phase: "15-02"
    provides: "KeyboardDock.svelte (the fixed dock chrome that renders whichever config is registered)"
  - phase: "15-06"
    provides: "RecallSession's mode-aware dockedKeyboard snippet for Modes A/B/formula, and the Mode C skip-guard this plan reconciles"
provides:
  - "BuildSession.svelte docks its constructable input keyboard when embedded (embedFact set), completing KBD-01/KBD-03's last remaining surface: Recall Mode C (formula-build)"
affects: []

tech-stack:
  added: []
  patterns:
    - "BuildSession's constructable keyboard moves into a {#snippet buildKeyboard()} (containerEl's bind:this lives INSIDE the snippet, not at the call site, mirroring ScaleKeyboardDrill's keyStrip precedent from Plan 04 - so scrollRootIntoView's querySelector still resolves the real DOM node whether the snippet renders inline or via the dock)"
    - "Dock registration is $effect-driven, keyed off sessionState === 'building' (register) vs anything else (clear) - mirrors ScaleKeyboardDrill's drill.done-driven register-else-clear shape exactly, gated by a component-init-time shouldDock = embedFact-and-provider-present flag rather than always registering"
    - "getDockRegistry() returning undefined (no provider in context) degrades to inline rendering without throwing - getContext() returns undefined rather than throwing when no provider ever set the key, so a standalone unit render of an embedded instance with no dock context is still safe"

key-files:
  created: []
  modified:
    - src/lib/components/BuildSession.svelte
    - src/lib/components/buildSession.test.ts
    - src/lib/components/RecallSession.svelte
    - src/lib/components/recallSession.test.ts

key-decisions:
  - "RecallSession's Mode C skip (`currentItem?.mode === 'formula-build'` in the dock-registration effect's early-return) is KEPT, not removed - re-examined empirically (a real Svelte effect-ordering test), an unconditional per-card re-registration raced against BuildSession's own mount-time registration and let RecallSession's no-op dockedKeyboard branch clobber BuildSession's real constructable keyboard. The deterministic, order-independent design is: RecallSession never WRITES to the registry during Mode C (so it can never clobber BuildSession's registration regardless of effect-flush order), and its own token-guarded clear() calls are no-ops once BuildSession's different token owns `current`. Only the SUMMARY framing changed: the skip's purpose is no longer 'force-clear a competing registration' (Plan 06, when BuildSession rendered inline) but 'cede sole registrant status to BuildSession' (Plan 07, now that BuildSession docks itself)."
  - "shouldDock is computed once at BuildSession's component-init time (`untrack(() => Boolean(embedFact)) && Boolean(dockRegistry)`), not reactively - embedFact never changes for an embedded instance's lifetime (documented precedent from 13-05's own untrack block), and wrapping the read in untrack avoids Svelte 5's state_referenced_locally warning that a plain `Boolean(embedFact)` read would trigger outside a derived/effect."

requirements-completed: [KBD-01, KBD-03]

coverage:
  - id: D1
    description: "Embedded (embedFact set, dock provider present): the constructable keyboard registers with the dock and does not render in BuildSession's own flow; a docked construct tap still routes through handleConstructTap (build advances)"
    requirement: "KBD-01"
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#BuildSession docked constructable keyboard (Task 1, 15-07, KBD-01/KBD-03) > embedded with a dock provider present"
        status: pass
    human_judgment: false
  - id: D2
    description: "Standalone (embedFact undefined, no provider): the constructable keyboard renders inline exactly as today and register is never called"
    requirement: "KBD-01"
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#BuildSession docked constructable keyboard (Task 1, 15-07, KBD-01/KBD-03) > standalone (no embedFact, no provider)"
        status: pass
      - kind: automated
        ref: "src/lib/components/buildSession.test.ts (42 pre-existing standalone-picker/construction/completion/FSRS tests stay green, unmodified)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Reaching the embedded complete state clears the dock registration; unmount clears it too; getDockRegistry() returning undefined degrades to inline rendering without throwing"
    requirement: "KBD-03"
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#reaching the embedded complete state clears the dock registration"
        status: pass
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#unmounting an embedded, docked instance clears the dock registration"
        status: pass
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#embedded with NO dock provider in context (getDockRegistry returns undefined) degrades to inline rendering without throwing"
        status: pass
    human_judgment: false
  - id: D4
    description: "On a Mode C card, RecallSession's own snippet contributes no keyboard and the embedded BuildSession's constructable keyboard is the docked element; advancing past it (onComplete) results in the next card's keyboard being docked"
    requirement: "KBD-01"
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#on a formula-build (Mode C) card, the embedded BuildSession's own constructable keyboard is the docked element"
        status: pass
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#advancing past a Mode C card (BuildSession's onComplete) clears back to the next card's docked keyboard"
        status: pass
      - kind: automated
        ref: "npm run check"
        status: pass
      - kind: automated
        ref: "npm test (full suite, 1006 tests)"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-07-16
status: complete
---

# Phase 15 Plan 7: Dock BuildSession's constructable keyboard for Recall Mode C Summary

**BuildSession's constructable input keyboard docks with the shared keyboard dock only when embedded in Recall's Mode C (`embedFact` set); the standalone `/build` page keeps its keyboard inline unchanged (Scope Decision 4). This is the last remaining KBD-01/KBD-03 surface — both requirements are now fully satisfied across all five in-scope pages.**

## Performance

- **Duration:** 25 min
- **Completed:** 2026-07-16
- **Tasks:** 2 completed
- **Files modified:** 4

## Accomplishments

- `BuildSession.svelte`'s constructable input `<PianoKeyboard>` site (the one wired to `handleConstructTap`/`flashWrongKey`) moved into a `{#snippet buildKeyboard()}` — `containerEl`'s `bind:this` now lives inside the snippet itself (mirroring `ScaleKeyboardDrill`'s `keyStrip` precedent from Plan 04), so `scrollRootIntoView`'s `querySelector` still resolves the real DOM node whether the snippet is rendered inline (standalone `/build`) or hosted by the dock (embedded in Recall). A component-init-time `shouldDock` flag (`embedFact` set AND a dock provider present in context) gates a `$effect` that registers `buildKeyboard` while `sessionState === 'building'` and clears it the instant it isn't (reaching `complete`, or unmount) — the exact register-else-clear shape `ScaleKeyboardDrill` established for its own `drill.done`-driven registration.
- The completion-summary display keyboard (`notes={construction.earnedNotes} octaves={2}`, non-interactive) stays in flow untouched in both the standalone and embedded cases — only the constructable input strip relocates, per the plan's own explicit contract.
- `RecallSession.svelte`'s dock-registration effect still skips registering for `formula-build` cards — this was deliberately KEPT rather than removed after an empirical Svelte effect-ordering test showed an unconditional per-card re-registration racing against BuildSession's own mount-time registration (RecallSession's no-op `dockedKeyboard` branch clobbered BuildSession's real keyboard when the parent effect happened to run after the child's). The skip's documented PURPOSE changed instead: no longer "force-clear a competing registration" (Plan 06's framing, when BuildSession rendered inline and there was nothing to compete with) but "cede sole registrant status to the embedded BuildSession instance" (Plan 07) — RecallSession never writes to the registry during Mode C, so it can never clobber BuildSession's registration regardless of effect-flush order, and its own token-guarded `clear()` calls are safe no-ops once BuildSession's different token owns `current`.
- `buildSession.test.ts` gained a new describe block (5 tests) covering: embedded-with-provider registers and a docked tap still advances the build; the embedded complete state clears the registration; unmount clears it; a missing dock provider degrades to inline rendering without throwing; and the standalone case never calls `register`. `recallSession.test.ts`'s Plan 06 test that asserted `registry.current` stays `null` throughout a Mode C card (true only while BuildSession rendered inline, pre-Plan-07) was replaced with two tests reflecting the new architecture: the embedded BuildSession's own registration IS the docked element on a Mode C card, and advancing past it restores the next card's real docked keyboard.

## Task Commits

Each task was committed atomically:

1. **Task 1: Dock BuildSession's constructable keyboard only when embedded** - `7c15f4c` (feat)
2. **Task 2: Remove RecallSession's Mode C dock-clear guard** - `1f91a86` (docs — see Deviations; the guard itself was kept, only its framing/tests changed)

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/lib/components/BuildSession.svelte` - constructable input keyboard extracted into `{#snippet buildKeyboard()}`; `getDockRegistry()`/`shouldDock`/registration `$effect` added; `onDestroy` extended to clear the dock registration
- `src/lib/components/buildSession.test.ts` - new `BuildSession docked constructable keyboard (Task 1, 15-07, KBD-01/KBD-03)` describe block (5 tests); all 42 pre-existing tests stay green unmodified
- `src/lib/components/RecallSession.svelte` - dock-registration effect's Mode C skip kept functionally identical; comment rewritten to describe BuildSession as the sole Mode C registrant rather than a "force-clear" exception
- `src/lib/components/recallSession.test.ts` - stale `registry.current` -> `null` assertion for a showing Mode C card replaced with two tests: BuildSession's own registration is the docked element, and advancing past it restores the next card's keyboard

## Decisions Made

- RecallSession's Mode C skip guard was KEPT (not removed) after empirical testing showed the alternative (unconditional per-card re-registration, relying on "last writer wins" ordering between RecallSession's own effect and BuildSession's mount-time effect) is non-deterministic in practice - a real test run showed RecallSession's no-op registration ending up as the final write, hiding BuildSession's keyboard entirely. The deterministic fix: RecallSession never writes during Mode C at all, so there is no race to reason about; only the SUMMARY/comment framing of the skip changed (see Deviations).
- `shouldDock` is computed once at BuildSession's component-init time via `untrack(() => Boolean(embedFact)) && Boolean(dockRegistry)` - `embedFact` never changes for an embedded instance's lifetime (matching 13-05's own untrack precedent for the same prop), and wrapping the read in `untrack` avoids Svelte 5's `state_referenced_locally` compiler warning that a bare `Boolean(embedFact)` read would otherwise trigger.
- `containerEl`'s `bind:this` moved from the call site into the `buildKeyboard` snippet definition itself, so `scrollRootIntoView`'s DOM query still targets the real rendered node regardless of whether the snippet renders inline (standalone) or is hosted by `KeyboardDock` (embedded) - the exact same relocation `ScaleKeyboardDrill`'s `keyStrip` snippet already established in Plan 04.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's literal instruction to "remove" RecallSession's Mode C dock-clear guard would have introduced a real race condition**
- **Found during:** Task 2, first `npm test -- src/lib/components/recallSession.test.ts` run after implementing an unconditional per-card re-registration effect (removing the `currentItem?.mode === 'formula-build'` early-return entirely, per the plan's literal action text)
- **Issue:** With the guard removed, RecallSession's dock-registration effect re-registered its own no-op `dockedKeyboard` snippet on every queue advance, including into Mode C. Whether this clobbered BuildSession's real registration depended on which of the two components' `$effect`s ran last within the same reactive flush - a real test run showed RecallSession's registration winning, so the embedded BuildSession's constructable keyboard never appeared in the dock (`screen.getAllByRole('button', { name: 'D♯ key' })` found nothing, failing 4 pre-existing Mode C tests plus 1 new one).
- **Fix:** Restored the `currentItem?.mode === 'formula-build'` early-return exactly as Plan 06 wrote it (RecallSession never registers during Mode C, so it can never win a "last writer" race it never enters), and rewrote the surrounding comment to describe the CURRENT reason for the skip (BuildSession is the sole Mode C registrant, Plan 07) rather than the STALE reason (Plan 06's "force-clear a competing registration," written before BuildSession registered anything at all). Updated `recallSession.test.ts`'s corresponding stale assertion (see key-files) to match the new, correct behavior.
- **Files modified:** `src/lib/components/RecallSession.svelte`, `src/lib/components/recallSession.test.ts`
- **Verification:** `npm test -- src/lib/components/recallSession.test.ts` (39/39 pass), full `npm test` (1006/1006 pass), `npm run check` (0 errors).
- **Committed in:** `1f91a86` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The plan's stated OUTCOME (RecallSession no longer needs to suppress the dock for Mode C; BuildSession's own docked keyboard is the single docked element on a Mode C card; no two registrants compete) is fully achieved. Only the plan's literal IMPLEMENTATION SUGGESTION (removing the guard's condition text) turned out to be unsafe in practice; the actual code in `RecallSession.svelte`'s registration effect is unchanged from Plan 06, functionally, with an updated comment and updated tests reflecting the correct current architecture.

## Issues Encountered

None beyond the deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Recall's Mode A, Mode B, `formula`-mode reveal (Plan 06), and now Mode C's embedded `BuildSession` constructable keyboard (this plan) are all dock-wired and verified. Every one of KBD-01's five named pages (Lookup, `/drills`, `/recall`, `/scales`, `/theory`) now docks its keyboard; KBD-03's "never two input surfaces for the same fact" invariant holds by construction across every mode this phase touched, including Mode C's own constructable/free-exploration mutual exclusion. `npm run check` passes (0 errors, 1293 files); the full suite (1006 tests) stays green.

`requirements-completed: [KBD-01, KBD-03]` in this SUMMARY's frontmatter marks both requirements complete in REQUIREMENTS.md - this is the final plan of Phase 15.

No blockers. Phase 15 is complete pending final phase-level sign-off.

---
*Phase: 15-playable-keyboard-everywhere*
*Completed: 2026-07-16*

## Self-Check: PASSED

- FOUND: src/lib/components/BuildSession.svelte
- FOUND: src/lib/components/buildSession.test.ts
- FOUND: src/lib/components/RecallSession.svelte
- FOUND: src/lib/components/recallSession.test.ts
- FOUND: 7c15f4c (Task 1 commit)
- FOUND: 1f91a86 (Task 2 commit)
