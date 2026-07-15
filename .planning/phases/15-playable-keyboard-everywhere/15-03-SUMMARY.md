---
phase: 15-playable-keyboard-everywhere
plan: 03
subsystem: ui
tags: [svelte5, runes, keyboard-dock, snippets, inspectable]

requires:
  - "15-01: dockContext.svelte.ts (getDockRegistry registration seam)"
  - "15-02: KeyboardDock.svelte (the fixed dock chrome that renders whichever config is registered)"
provides:
  - "Lookup (/): docked, always-inspectable, tap-to-hear keyboard present from first load (KBD-01)"
  - "Theory (/theory): a brand-new docked, always-inspectable, tap-to-hear keyboard (KBD-01, Scope Decision 2)"
affects: ["15-04..15-07 (remaining KBD-01 pages: /drills, /recall, /scales)"]

tech-stack:
  added: []
  patterns:
    - "Page registers a `{#snippet dockedKeyboard()}` + `{#snippet dockedRegister()}` pair with getDockRegistry() in onMount, clears via clear(dockToken) in onDestroy - the registry reference itself is captured once at component init (`const dockRegistry = getDockRegistry()`), never re-read inside onDestroy, since getContext() throws lifecycle_outside_component when called outside initial component setup"
    - "Docked keyboard snippets close over reactive page state (result/inspectPayload) rather than being re-registered on every change, so the dock's rendering stays live with a single register() call"

key-files:
  created:
    - src/routes/lookupDock.test.ts
    - src/routes/theoryDock.test.ts
  modified:
    - src/routes/+page.svelte
    - src/routes/theory/+page.svelte
    - tests/lookup.e2e.test.ts
    - tests/theory.e2e.test.ts

key-decisions:
  - "getDockRegistry() is captured once into a `dockRegistry` const at component script top level (component-init time), and that captured reference is reused inside both onMount and onDestroy - calling getDockRegistry() again inside onDestroy throws Svelte's lifecycle_outside_component error, since getContext() is only valid during initial component setup, not during teardown."
  - "Both pages' pre-existing e2e test suites (lookup.e2e.test.ts, theory.e2e.test.ts) needed a renderPage() helper supplying a real dockContext via the render() context option, since both pages now call getDockRegistry() unconditionally at init - rendering them without a registry in context throws immediately. KeyboardDock is rendered alongside the page (same document.body) only in tests that need to interact with the docked keyboard/register content."

requirements-completed: []

coverage:
  - id: D1
    description: "Lookup registers a dock config on mount whose keyboard snippet renders piano keys even with no chord looked up (notes empty); tapping a docked key invokes playNote; the register snippet shows the idle text before any tap; clear(dockToken) fires on unmount"
    requirement: "KBD-01"
    verification:
      - kind: unit
        ref: "src/routes/lookupDock.test.ts"
        status: pass
      - kind: unit
        ref: "tests/lookup.e2e.test.ts (updated harness, 21 tests, all green)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Theory registers a brand-new dock config on mount whose keyboard snippet renders an inspectable piano keyboard; tapping a docked key invokes playNote; the register snippet shows the idle text; every existing ChordExample section/lesson control is unchanged; clear(dockToken) fires on unmount"
    requirement: "KBD-01"
    verification:
      - kind: unit
        ref: "src/routes/theoryDock.test.ts"
        status: pass
      - kind: unit
        ref: "tests/theory.e2e.test.ts (updated harness, 11 tests, all green)"
        status: pass
    human_judgment: false
  - id: D3
    description: "No PianoKeyboard remains rendered in Lookup's own document flow (it was relocated, not duplicated); full suite (npm run check, npm test) stays green"
    requirement: "KBD-01"
    verification:
      - kind: automated
        ref: "npm run check"
        status: pass
      - kind: automated
        ref: "npm test (full suite, 980 tests)"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-07-15
status: complete
---

# Phase 15 Plan 3: Playable keyboard on Lookup + Theory Summary

**Lookup's inline keyboard relocates into the shared dock (present from first load, notes empty pre-search); Theory gains a brand-new docked always-inspectable tap-to-hear keyboard it never had before - both register a keyboard + register Snippet pair with the Plan 01/02 dock seam on mount and clear it on unmount.**

## Performance

- **Duration:** 25 min
- **Completed:** 2026-07-15
- **Tasks:** 2 completed
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments

- `src/routes/+page.svelte` no longer renders `<PianoKeyboard>`/`<InspectRegister>` inline in the result block. A `dockedKeyboard`/`dockedRegister` snippet pair is registered with `getDockRegistry()` on mount (`onMount`) and cleared via `clear(dockToken)` on `onDestroy`. The keyboard snippet renders `notes={result?.notes ?? []}`, so the dock hosts a playable board from first load (pre-search) and stays reactive to every subsequent lookup with the single registration made at mount.
- `src/routes/theory/+page.svelte` gains a new `inspectPayload`/`handleInspect` pair and registers a plain always-inspectable `<PianoKeyboard notes={[]} inspectable onInspect={handleInspect}/>` with the dock - a pure addition (Scope Decision 2); every existing lesson section, `ChordExample` display keyboard, mnemonic aside, and control (`Hear G7 resolve`, `Take it to the drills`) is untouched.
- Both docked register lines show the verbatim idle string `Tap a key to hear it.` (overriding `InspectRegister`'s own default `Tap a key to inspect it.`) per the UI-SPEC Copywriting Contract.
- `src/routes/lookupDock.test.ts` and `src/routes/theoryDock.test.ts` each cover: dock registration on mount (keyboard renders even pre-search/empty), tap-to-hear through the mocked `playNote`, idle register text, and `clear(dockToken)` on unmount - using `KeyboardDock` itself as the harness that renders the page's captured snippets (mirrors `keyboardDock.test.ts`'s own context-injection seam).

## Task Commits

Each task was committed atomically:

1. **Task 1: Dock Lookup's inspectable keyboard** - `953996c` (feat)
2. **Task 2: Add Theory's new docked inspectable keyboard** - `f2577dc` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/routes/+page.svelte` - keyboard/register moved from inline result-block markup into `{#snippet dockedKeyboard()}`/`{#snippet dockedRegister()}`, registered with the dock on mount, cleared on destroy
- `src/routes/theory/+page.svelte` - new `inspectPayload` state + `handleInspect`, new docked keyboard/register snippet pair, registered on mount, cleared on destroy
- `src/routes/lookupDock.test.ts` (new) - dock-registration coverage for Lookup
- `src/routes/theoryDock.test.ts` (new) - dock-registration coverage for Theory
- `tests/lookup.e2e.test.ts` - `renderPage()` helper now supplies a real dock registry via `context` and renders `KeyboardDock` alongside the page (both append to the same `document.body`), since the keyboard/register no longer render inline; two idle-text assertions updated from `"Tap a key to inspect it."` to `"Tap a key to hear it."` to match the new copy
- `tests/theory.e2e.test.ts` - same `renderPage()` harness fix, required because Theory now calls `getDockRegistry()` unconditionally at init

## Decisions Made

- `getDockRegistry()` is called exactly once per page, captured into a `dockRegistry` const at component-script top level (matching `KeyboardDock.svelte`'s own `const registry = getDockRegistry();` pattern from Plan 02) - see Deviations below for why this mattered.
- Docked keyboard snippets close over the page's existing reactive state (`result`, `inspectPayload` on Lookup) rather than re-registering on every change; a single `register()` call at mount is sufficient because Svelte re-renders the snippet's contents whenever the closed-over state changes, exactly like any other reactive template expression.
- Theory's new docked keyboard stays a plain `notes={[]}` board, not bound to `seventhPick`/`anchorPick` or any lesson chord (explicit plan instruction) - keeping this addition's scope to "a playable keyboard exists" rather than wiring it to lesson state, which was never requested.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Calling `getDockRegistry()` a second time inside `onDestroy` throws `lifecycle_outside_component`**
- **Found during:** Task 1, first `npm test -- src/routes/lookupDock.test.ts` run
- **Issue:** The plan's action text implied calling `getDockRegistry().register(...)` in `onMount` and `getDockRegistry().clear(dockToken)` in `onDestroy` as two independent calls. Svelte 5's `getContext()` (which `getDockRegistry()` wraps) can only be called during a component's initial synchronous setup - calling it again inside an `onDestroy` teardown callback throws `Svelte error: lifecycle_outside_component`, surfaced as an unhandled rejection on every test that unmounted the page.
- **Fix:** Captured the registry once into `const dockRegistry = getDockRegistry();` at component-script top level (init time, matching `KeyboardDock.svelte`'s own established pattern from Plan 02), and reused that single captured reference inside both `onMount` and `onDestroy`. Applied identically on Theory.
- **Files modified:** `src/routes/+page.svelte`, `src/routes/theory/+page.svelte`
- **Verification:** All dock/e2e tests pass, including unmount/`clear(dockToken)` assertions.
- **Committed in:** `953996c` (Task 1), `f2577dc` (Task 2)

---

**2. [Rule 1 - Bug] Pre-existing `lookup.e2e.test.ts`/`theory.e2e.test.ts` broke: rendering the page without a dock registry in context throws immediately**
- **Found during:** Task 1 (`npm test` full-suite run after Task 1's own test passed), then again in Task 2
- **Issue:** Both pages now call `getDockRegistry()` unconditionally during component init and `dockRegistry.register(...)` in `onMount`. The two pre-existing end-to-end test files (`tests/lookup.e2e.test.ts`, 21 tests; `tests/theory.e2e.test.ts`, 11 tests) rendered the page component directly with no context (`render(LookupPage)` / `render(TheoryPage)`), which is how every page test in this codebase worked before any dock existed. Without a registry in context, `getDockRegistry()` returns `undefined` and the subsequent `.register()` call throws, failing every test in both files.
- **Fix:** Added a `renderPage()` helper to each file that supplies a real `createDockRegistry()` via the `render()` `context` option (the identical seam `+layout.svelte`'s `setDockRegistry()` uses, and the same one `keyboardDock.test.ts` from Plan 02 established) and replaced every `render(LookupPage)`/`render(TheoryPage)` call site with it. Tests that need to interact with the docked keyboard/register content also render `KeyboardDock` alongside the page (both append to the same `document.body`, so `screen` queries find both). Also updated two idle-register-text assertions in `lookup.e2e.test.ts` from the old default `"Tap a key to inspect it."` to the new `"Tap a key to hear it."` per the plan's own copy contract - this is a legitimate copy change, not a bug, but the pre-existing assertions were written against the old default and needed updating to match.
- **Files modified:** `tests/lookup.e2e.test.ts`, `tests/theory.e2e.test.ts`
- **Verification:** `npm test -- tests/lookup.e2e.test.ts tests/theory.e2e.test.ts` - 32 tests, all pass. Full suite (`npm test`) - 980 tests, all pass. `npm run check` - 0 errors.
- **Committed in:** `953996c` (Task 1, lookup.e2e.test.ts), `f2577dc` (Task 2, theory.e2e.test.ts)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes were necessary for the plan's own required verification ("full `npm test` stays green") to hold. No scope creep beyond the plan's own files_modified intent - the second deviation touched two test files not listed in the plan's frontmatter `files_modified`, but leaving them broken would have violated the plan's explicit `<verification>` block, so fixing them was required rather than optional (Rule 1: bugs directly caused by this plan's own changes to the files it did modify).

## Issues Encountered

None beyond the deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Lookup and Theory both now present a docked, always-inspectable, tap-to-hear keyboard with the idle register line "Tap a key to hear it.", honoring the existing sound toggle (inherited unchanged from `PianoKeyboard`'s `inspectable` mode) and clearing their registration on unmount. `npm run check` passes (0 errors); the full suite (980 tests) stays green.

Two of five KBD-01 pages are now dock-wired (Lookup, Theory), alongside the two already covered by Plans 01-02's foundation work. Plans 04-07 still need to dock `/drills`, `/recall`, and `/scales` (per the UI-SPEC's Per-Page Keyboard Mode Mapping) before KBD-01 can be marked complete in REQUIREMENTS.md - this plan's own `requirements-completed` is intentionally empty, matching Plan 02's own correction (KBD-01 is only true once every page in scope is dock-wired).

No blockers for Plan 04.

---
*Phase: 15-playable-keyboard-everywhere*
*Completed: 2026-07-15*

## Self-Check: PASSED

- FOUND: src/routes/+page.svelte
- FOUND: src/routes/theory/+page.svelte
- FOUND: src/routes/lookupDock.test.ts
- FOUND: src/routes/theoryDock.test.ts
- FOUND: tests/lookup.e2e.test.ts
- FOUND: tests/theory.e2e.test.ts
- FOUND: 953996c (Task 1 commit)
- FOUND: f2577dc (Task 2 commit)
