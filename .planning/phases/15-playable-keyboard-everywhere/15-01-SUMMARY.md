---
phase: 15-playable-keyboard-everywhere
plan: 01
subsystem: ui
tags: [svelte5, runes, localStorage, context, keyboard-dock]

requires: []
provides:
  - "dockCollapse.ts: device-local persistence for the dock's collapsed state (KBD-02)"
  - "dockContext.svelte.ts: Svelte context registration seam for a page to hand its keyboard Snippet to the shared dock"
affects: ["15-02 (KeyboardDock chrome)", "15-03..15-07 (every page that relocates its keyboard into the dock)"]

tech-stack:
  added: []
  patterns:
    - "$state.raw (not $state) for context-registry values that must preserve reference identity across register/clear"
    - "Defensive localStorage read/write: strict string compare, try/catch swallow, no JSON.parse, mirrors audio.ts/rotateHint.ts"

key-files:
  created:
    - src/lib/keyboard/dockCollapse.ts
    - src/lib/keyboard/dockCollapse.test.ts
    - src/lib/keyboard/dockContext.svelte.ts
    - src/lib/keyboard/dockContext.svelte.test.ts
  modified: []

key-decisions:
  - "dockCollapse mirrors audio.ts/rotateHint.ts's defensive-read shape exactly: strict === 'true' comparison, try/catch swallow, availability-over-durability writes."
  - "dockContext's registry uses $state.raw, not $state, so registered DockKeyboardConfig objects keep reference identity through register/clear (Svelte 5 deep-proxies plain $state objects, which would break the token last-writer-wins comparison and the plan's current === cfg contract)."

patterns-established:
  - "Pattern: token last-writer-wins guard for shared single-slot registries — clear(token) only nulls state when token matches the currently-registered owner, so a stale unmount can never blank a newer registration."

requirements-completed: [KBD-02]

coverage:
  - id: D1
    description: "readDockedKeyboardCollapsed/setDockedKeyboardCollapsed persist the dock's collapsed state to localStorage, defaulting to expanded and never throwing on malformed/unreadable storage"
    requirement: "KBD-02"
    verification:
      - kind: unit
        ref: "src/lib/keyboard/dockCollapse.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "createDockRegistry/setDockRegistry/getDockRegistry context seam: register/clear with a token last-writer-wins guard so a stale unmount can't clobber a newer page's registered keyboard"
    verification:
      - kind: unit
        ref: "src/lib/keyboard/dockContext.svelte.test.ts"
        status: pass
    human_judgment: false

duration: 9min
completed: 2026-07-15
status: complete
---

# Phase 15 Plan 1: Dock foundations Summary

**Two pure-logic modules: localStorage-backed collapse persistence (KBD-02) and a Svelte context registry (with a token last-writer-wins guard) for handing a page's single keyboard to the shared dock — no rendered chrome yet.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-15T22:53:25+02:00
- **Completed:** 2026-07-15T23:01:48+02:00
- **Tasks:** 2 completed
- **Files modified:** 4 (all new)

## Accomplishments

- `dockCollapse.ts` persists the docked keyboard's collapsed/expanded state device-locally under `music-learn:docked-keyboard-collapsed`, defaulting to expanded and never throwing on an absent, malformed, or unreadable value.
- `dockContext.svelte.ts` provides the context seam (`createDockRegistry`, `setDockRegistry`, `getDockRegistry`, `DOCK_CONTEXT_KEY`) that lets each page hand its single keyboard `Snippet` to the shared dock and clear it safely on unmount, with a token-based last-writer-wins guard so a stale unmount can never blank a newer page's registration.

## Task Commits

Each task was committed atomically:

1. **Task 1: Dock collapse-state persistence module** - `eb38a82` (feat)
2. **Task 2: Dock registration context seam** - `bdb60b3` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/lib/keyboard/dockCollapse.ts` - `readDockedKeyboardCollapsed`/`setDockedKeyboardCollapsed`, device-local boolean persistence for KBD-02
- `src/lib/keyboard/dockCollapse.test.ts` - covers absent/malformed/throwing-storage/round-trip cases
- `src/lib/keyboard/dockContext.svelte.ts` - `DockKeyboardConfig`, `createDockRegistry`, `DOCK_CONTEXT_KEY`, `setDockRegistry`, `getDockRegistry`
- `src/lib/keyboard/dockContext.svelte.test.ts` - covers initial null, register, clear no-op, clear match, last-writer-wins, and context-key/export shape

## Decisions Made

- Mirrored `audio.ts`'s `readStoredEnabled`/`setSoundEnabled` and `rotateHint.ts`'s defensive read/write shape exactly for `dockCollapse.ts` (strict string compare, try/catch swallow, no caching — read fresh each call, per the plan's explicit instruction).
- Used `$state.raw` instead of `$state` for the registry's `current` slot. See Deviations below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `$state` deep-proxying broke the required `current === cfg` reference-identity contract**
- **Found during:** Task 2 (`dockContext.svelte.ts`), while running the acceptance-criteria test suite
- **Issue:** The plan specified `$state<DockKeyboardConfig | null>(null)` for the registry's backing field. Svelte 5's `$state()` deep-proxies any object assigned into it, so `registry.current` returned a Proxy wrapping the registered config rather than the original object. This broke `expect(registry.current).toBe(cfg)` (Object.is/reference equality) in two of the plan's own acceptance-criteria tests: the `clear(otherToken)` no-op check and the last-writer-wins check.
- **Fix:** Switched to `$state.raw<DockKeyboardConfig | null>(null)`, which keeps top-level reactivity (reassigning `current` still triggers updates) without deep-proxying the assigned object, preserving reference identity through `register`/`clear`. The config's payload is an opaque `Snippet` that never needed fine-grained reactive tracking anyway.
- **Files modified:** `src/lib/keyboard/dockContext.svelte.ts`
- **Verification:** All 7 tests in `dockContext.svelte.test.ts` pass, including the last-writer-wins and clear-no-op cases that failed under plain `$state`.
- **Committed in:** `bdb60b3` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary correctness fix to satisfy the plan's own acceptance criteria (reference-identity checks). No scope creep — same public API, same behavior contract, only the internal `$state` call changed to `$state.raw`.

## Issues Encountered

None beyond the deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Both modules exist with the exact exports named in the plan. `dockCollapse` is ready for `KeyboardDock` (Plan 02) to read the initial collapsed state and for the collapse toggle to write it back. `dockContext`'s registry, `setDockRegistry`, and `getDockRegistry` are ready for the layout (Plan 02) to instantiate once and for every page (Plans 03-07) to register their keyboard `Snippet` on mount and clear it on unmount. No page or layout file was touched by this plan (confirmed via `git status --short src/routes`, empty).

No blockers for Plan 02.

---
*Phase: 15-playable-keyboard-everywhere*
*Completed: 2026-07-15*

## Self-Check: PASSED

- FOUND: src/lib/keyboard/dockCollapse.ts
- FOUND: src/lib/keyboard/dockContext.svelte.ts
- FOUND: eb38a82 (Task 1 commit)
- FOUND: bdb60b3 (Task 2 commit)
