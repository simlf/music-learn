---
phase: 15-playable-keyboard-everywhere
plan: 02
subsystem: ui
tags: [svelte5, runes, keyboard-dock, fixed-chrome, resize-observer]

requires:
  - "15-01: dockCollapse.ts (collapse persistence), dockContext.svelte.ts (registration seam)"
provides:
  - "KeyboardDock.svelte: the fixed dock chrome that renders whichever keyboard a page has registered (KBD-02)"
  - "+layout.svelte: registry provision (setDockRegistry(createDockRegistry())) and the dock mount + content-clearance wrapper"
  - "--dock-height custom property: the dock's live rendered height, consumed by the layout's content-clearance padding"
affects: ["15-03..15-07 (every page that registers a keyboard with the dock)"]

tech-stack:
  added: []
  patterns:
    - "Manual guarded ResizeObserver (typeof ResizeObserver === 'undefined' short-circuit) instead of Svelte 5's built-in bind:offsetHeight/clientHeight bindings, which construct a ResizeObserver unconditionally and throw in a jsdom test environment lacking one - mirrors PianoKeyboard.svelte's existing measurement pattern exactly"
    - "Svelte 5 mount `context` option (a Map keyed by the context symbol) used directly in component tests to inject a context-provided dependency, in place of a dedicated wrapper .svelte test-host component"

key-files:
  created:
    - src/lib/components/KeyboardDock.svelte
    - src/lib/components/keyboardDock.test.ts
  modified:
    - src/routes/+layout.svelte

key-decisions:
  - "bind:offsetHeight replaced with bind:this + a manually-guarded ResizeObserver effect - Svelte 5's built-in box-size bindings unconditionally call `new ResizeObserver(...)` with no availability check, which threw in the jsdom test environment (no global ResizeObserver); the codebase's own established fix (PianoKeyboard.svelte) is the guarded manual observer, so KeyboardDock reuses that exact pattern rather than introducing a second measurement approach."
  - "Test supplies the dock registry via Svelte 5's `mount`/`render` context option (Map keyed by DOCK_CONTEXT_KEY) rather than a wrapper .svelte component - functionally identical to calling setDockRegistry() at a parent's top level, since that function's only job is placing the registry into the same context Map."

requirements-completed: [KBD-02]

coverage:
  - id: D1
    description: "KeyboardDock renders nothing (no visible chrome) when no page has registered a keyboard, and the Dock Chrome Contract (handle + keyboard surface + optional register line) when one has"
    requirement: "KBD-02"
    verification:
      - kind: unit
        ref: "src/lib/components/keyboardDock.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Handle click toggles collapsed/expanded, removes the keyboard/register content from the DOM (not just visually) when collapsed, and persists the choice via dockCollapse; a freshly mounted KeyboardDock reads that persisted choice at init"
    requirement: "KBD-02"
    verification:
      - kind: unit
        ref: "src/lib/components/keyboardDock.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Dock outer element is fixed to the viewport bottom (position: fixed; bottom: 0), the grip mark is aria-hidden, and no sound-toggle control exists anywhere in the dock"
    requirement: "KBD-02"
    verification:
      - kind: unit
        ref: "src/lib/components/keyboardDock.test.ts"
        status: pass
      - kind: manual
        ref: "grep -in sound src/lib/components/KeyboardDock.svelte (matches only doc comments, no control)"
        status: pass
    human_judgment: false
  - id: D4
    description: "+layout.svelte provides the shared registry once, mounts KeyboardDock once after a content-clearance wrapper whose padding-bottom tracks --dock-height, and leaves the masthead/StreakBadge/streak-fetch byte-unchanged"
    requirement: "KBD-01"
    verification:
      - kind: automated
        ref: "npm run check"
        status: pass
      - kind: automated
        ref: "npm test (full suite, 970 tests)"
        status: pass
      - kind: manual
        ref: "git diff src/routes/+layout.svelte confirms masthead/StreakBadge/onMount fetch untouched"
        status: pass
    human_judgment: false

duration: 18min
completed: 2026-07-15
status: complete
---

# Phase 15 Plan 2: Keyboard dock chrome + layout host Summary

**Fixed bottom-docked chrome (handle + keyboard surface + optional register line) rendering whichever keyboard the shared registry currently holds, mounted once in the app shell with a content-clearance wrapper that tracks the dock's live height via a `--dock-height` custom property.**

## Performance

- **Duration:** 18 min
- **Completed:** 2026-07-15
- **Tasks:** 2 completed
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- `KeyboardDock.svelte` renders the Dock Chrome Contract: a solid-ink handle bar (`Keyboard · tap to collapse` / `Keyboard · tap to expand`, 44px min-height, aria-hidden grip mark), a paper-bright keyboard surface hosting `{@render config.keyboard()}`, and a conditional register line below it. Renders nothing when `getDockRegistry().current` is null.
- Collapse state initializes from `readDockedKeyboardCollapsed()` and persists via `setDockedKeyboardCollapsed()` on every toggle; collapsing removes the keyboard surface and register line from the DOM entirely (not just hidden).
- The dock's live rendered height is measured (guarded ResizeObserver, see Deviations) and written to the `--dock-height` custom property, zeroed when nothing is docked or the component tears down.
- `+layout.svelte` now creates the shared registry once (`createDockRegistry()` + `setDockRegistry()`), wraps `{@render children()}` in a `.dock-clearance` container whose `padding-bottom: var(--dock-height, 0px)` tracks that property, and mounts `<KeyboardDock />` once after it.

## Task Commits

Each task was committed atomically:

1. **Task 1: KeyboardDock chrome component** - `41fdeaa` (feat)
2. **Task 2: Layout host — provide registry, mount dock, clear content** - `c7ac097` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/lib/components/KeyboardDock.svelte` - the fixed dock chrome; owns collapse `$state`, `--dock-height` measurement, and the config-null empty render
- `src/lib/components/keyboardDock.test.ts` - covers empty-registry no-render, expanded content, collapse (DOM removal + persistence), persisted-collapse-at-init (via unmount/remount), fixed positioning + no-sound-toggle, and grip aria-hidden
- `src/routes/+layout.svelte` - provides the dock registry once, wraps children in `.dock-clearance`, mounts `<KeyboardDock />`

## Decisions Made

- Reused PianoKeyboard's existing guarded-ResizeObserver pattern for `KeyboardDock`'s own height measurement instead of Svelte 5's built-in `bind:offsetHeight` binding. See Deviations below.
- The component test supplies the registry through Svelte 5's `mount`/`render` `context` option (a `Map` keyed by `DOCK_CONTEXT_KEY`) rather than writing a separate wrapper `.svelte` test-host file — this is the same context-provision mechanism `setDockRegistry()` itself uses, so it exercises the identical seam without an extra file, keeping the plan's `files_modified` list exact (`KeyboardDock.svelte` + `keyboardDock.test.ts` only).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `bind:offsetHeight` threw `ReferenceError: ResizeObserver is not defined` in the test environment**
- **Found during:** Task 1, first `npm test -- src/lib/components/keyboardDock.test.ts` run
- **Issue:** The plan's action text specified measuring the dock's outer element "with `bind:offsetHeight`". Svelte 5's built-in box-size bindings (`bind:offsetHeight`/`clientHeight`/etc.) construct a `ResizeObserver` internally with no availability guard. jsdom (this project's Vitest environment) has no global `ResizeObserver`, so every test mounting `KeyboardDock` with a registered config crashed immediately (5 of 6 tests failed with the same `ReferenceError`).
- **Fix:** Replaced `bind:offsetHeight={dockHeight}` with `bind:this={dockEl}` plus a manually-guarded `$effect` that reads `dockEl.offsetHeight` on mount and on every `ResizeObserver` callback, short-circuiting via `typeof ResizeObserver === 'undefined'` before constructing one — the exact pattern `PianoKeyboard.svelte` already uses for its own width self-measurement (`octavesForWidth`), so this introduces no new measurement convention, just reuses the codebase's existing one.
- **Files modified:** `src/lib/components/KeyboardDock.svelte`
- **Verification:** All 6 tests in `keyboardDock.test.ts` pass; full 970-test suite (`npm test`) stays green.
- **Committed in:** `41fdeaa` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary correctness fix so the plan's own required verification command (`npm test -- src/lib/components/keyboardDock.test.ts`) could pass at all. No visible/behavioral change from the plan's contract — the dock still measures its own live height and writes it to `--dock-height` exactly as specified; only the internal measurement mechanism changed.

## Issues Encountered

None beyond the deviation above.

**Requirements-tracking correction:** the plan's own frontmatter listed `requirements: [KBD-01, KBD-02]`, and the standard state-update step's `requirements mark-complete` call (run against that list) checked off KBD-01 in REQUIREMENTS.md. That is premature: KBD-01 ("every keyboard-bearing page shows a keyboard") is only true once Plans 03-07 actually register each page's keyboard with the dock — this plan's own objective explicitly states "at the end of this plan the dock renders nothing on a live page." Reverted KBD-01 back to unchecked in `.planning/REQUIREMENTS.md` and set this SUMMARY's `requirements-completed` to `[KBD-02]` only (which this plan's chrome + collapse/persist mechanics + layout mount genuinely satisfies). KBD-01 should be marked complete once Plan 07 lands.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`KeyboardDock.svelte` and the `+layout.svelte` host wiring are both in place and verified (`npm run check` passes; full `npm test` — 970 tests — stays green). No page registers a keyboard yet, so the dock currently renders nothing on any live page — this is expected per the plan's objective; Plans 03-07 register each page's existing keyboard with `getDockRegistry().register(...)` on mount and `clear(token)` on unmount, and the chrome, collapse/persist mechanics, and `--dock-height` content-clearance are all ready for them to plug into unchanged.

No blockers for Plan 03.

---
*Phase: 15-playable-keyboard-everywhere*
*Completed: 2026-07-15*

## Self-Check: PASSED

- FOUND: src/lib/components/KeyboardDock.svelte
- FOUND: src/lib/components/keyboardDock.test.ts
- FOUND: 41fdeaa (Task 1 commit)
- FOUND: c7ac097 (Task 2 commit)
