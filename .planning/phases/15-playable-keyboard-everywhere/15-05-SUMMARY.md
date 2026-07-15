---
phase: 15-playable-keyboard-everywhere
plan: 05
subsystem: ui
tags: [svelte5, runes, keyboard-dock, snippets, matchmedia, drills]

requires:
  - phase: "15-01"
    provides: "dockContext.svelte.ts (getDockRegistry registration seam)"
  - phase: "15-02"
    provides: "KeyboardDock.svelte (the fixed dock chrome that renders whichever config is registered)"
provides:
  - "Drills (/drills): a single mode-aware docked keyboard whose interactive/inspectable state mirrors today's per-question logic exactly (KBD-01, KBD-03), with short-landscape phones keeping the existing inline two-pane layout instead (Scope Decision 7)"
affects: ["15-06..15-07 (remaining KBD-01/KBD-03 surface: /recall)"]

tech-stack:
  added: []
  patterns:
    - "One {#snippet dockedKeyboard()} branches on question.kind/direction/answered/showConstructionReveal to reproduce all four former inline PianoKeyboard prop combinations plus the identification-reveal keyboard, so KBD-03 (never two input surfaces for the same fact) is true by construction rather than by convention"
    - "Dock registration is $effect-driven (register, return a cleanup that clears), keyed off a feature-detected isShortLandscape flag - not a mount-once register()/onDestroy clear() pair - so entering/leaving the short-landscape breakpoint live flips between docked and inline without a remount, mirroring Plan 04's drill.done-driven ScaleKeyboardDrill pattern"

key-files:
  created:
    - src/routes/drillsDock.test.ts
  modified:
    - src/routes/drills/+page.svelte
    - tests/drills.e2e.test.ts
    - tests/practice.e2e.test.ts
    - tests/reveal-insight.e2e.test.ts

key-decisions:
  - "Identification's docked keyboard wires onInspect + showIntervalBadges once `answered` is true regardless of correct/wrong, rather than only on a wrong answer (the prior feedback-block-only reveal's exact gating) - this is the literal reading of the plan's own read_first instruction ('on answered reveal show showIntervalBadges + onInspect... matching today's feedback-block keyboard') and is required to collapse the two previously-separate identification keyboards (inline mystery keyboard + feedback-block reveal) into ONE docked element without losing either behavior."
  - "Dock registration is driven by a single $effect that registers when !isShortLandscape and returns a cleanup calling clear(dockToken) - the cleanup fires on both effect re-run (short-landscape entered) and component teardown, so no separate onMount/onDestroy pair is needed (the onDestroy import was removed as a result)."
  - "isShortLandscape is fed by a matchMedia('(max-height: 600px) and (orientation: landscape)') listener, feature-detected exactly like the page's pre-existing rotate-hint orientation listener - confirmed via a throwaway probe that this project's jsdom test environment has window.matchMedia === undefined, so every test in this suite exercises the dock-by-default (non-short-landscape) branch, matching the plan's own acceptance criteria."

requirements-completed: []

coverage:
  - id: D1
    description: "One dockedKeyboard snippet reproduces all four former inline PianoKeyboard prop combinations (construction input/reveal, identification, interval identification, interval construction) plus the identification-reveal keyboard, registered with the shared dock; no PianoKeyboard remains in the page's own document flow"
    requirement: "KBD-01"
    verification:
      - kind: unit
        ref: "src/routes/drillsDock.test.ts#registers a single dock config on mount whose keyboard is a snippet function"
        status: pass
      - kind: unit
        ref: "src/routes/drillsDock.test.ts#renders no PianoKeyboard in the page document flow itself (it lives only in the dock snippet)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Construction (unanswered) docked keyboard is interactive: tapping sounds via the mocked playNote (through pressKey) and toggles selection"
    requirement: "KBD-01"
    verification:
      - kind: unit
        ref: "src/routes/drillsDock.test.ts#construction (unanswered): the docked keyboard is interactive - tapping sounds via mocked playNote and toggles selection"
        status: pass
    human_judgment: false
  - id: D3
    description: "After a wrong construction answer, the SAME docked keyboard shows target.notes with wrongLetters and becomes inspectable (the in-place reveal transform is preserved, exactly one keyboard on the page)"
    requirement: "KBD-03"
    verification:
      - kind: unit
        ref: "src/routes/drillsDock.test.ts#after a wrong construction answer, the SAME docked keyboard shows target.notes with wrongLetters and becomes inspectable"
        status: pass
    human_judgment: false
  - id: D4
    description: "Identification's docked keyboard is inspectable, and the post-answer reveal is the same docked element carrying interval badges - no separate feedback-block keyboard remains"
    requirement: "KBD-03"
    verification:
      - kind: unit
        ref: "src/routes/drillsDock.test.ts#identification: the docked keyboard is inspectable, and the post-answer reveal is the same docked element (no separate feedback-block keyboard)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The docked keyboard clears its registration on unmount, guarding against a stale docked keyboard"
    requirement: "KBD-01"
    verification:
      - kind: unit
        ref: "src/routes/drillsDock.test.ts#clears its registration on unmount"
        status: pass
    human_judgment: false
  - id: D6
    description: "In the default (non-short-landscape) environment the keyboard registers with the dock and .drill-layout__keyboard has no inline keyboard; matchMedia is feature-detected so rendering never throws"
    requirement: "KBD-03"
    verification:
      - kind: unit
        ref: "src/routes/drillsDock.test.ts#in the default (non-short-landscape) test environment, the keyboard registers with the dock and .drill-layout__keyboard has no inline keyboard"
        status: pass
      - kind: unit
        ref: "src/routes/drillsDock.test.ts#matchMedia is feature-detected: rendering never throws even though jsdom has no real matchMedia support"
        status: pass
    human_judgment: false
  - id: D7
    description: "Every pre-existing Drills grading/session/scaffold/telemetry/sound behavior stays byte-unchanged now that the keyboard renders through the dock instead of inline"
    requirement: "KBD-01"
    verification:
      - kind: e2e
        ref: "tests/drills.e2e.test.ts (45 tests, all green, updated harness)"
        status: pass
      - kind: e2e
        ref: "tests/practice.e2e.test.ts (14 tests, all green, updated harness)"
        status: pass
      - kind: e2e
        ref: "tests/reveal-insight.e2e.test.ts (5 tests, all green, updated harness)"
        status: pass
      - kind: automated
        ref: "npm run check (0 errors)"
        status: pass
      - kind: automated
        ref: "npm test (full suite, 991 tests)"
        status: pass
    human_judgment: false

duration: 14min
completed: 2026-07-15
status: complete
---

# Phase 15 Plan 5: One mode-aware docked keyboard for Drills Summary

**The four inline `<PianoKeyboard>` sites on `/drills` (construction input/reveal, identification, interval identification, interval construction) plus the separate identification-reveal keyboard collapse into ONE `dockedKeyboard` snippet registered with the shared dock; a feature-detected short-landscape flag suppresses the dock and renders the same snippet inline in the existing two-pane layout instead (Scope Decision 7).**

## Performance

- **Duration:** 14 min
- **Completed:** 2026-07-15
- **Tasks:** 2 completed
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments

- `src/routes/drills/+page.svelte`'s four `.drill-layout__keyboard` `<PianoKeyboard>` sites and the identification-reveal keyboard inside the feedback block are gone from the page's own document flow. A single `{#snippet dockedKeyboard()}` branches on `question.kind`/`question.direction`/`answered`/`showConstructionReveal` to reproduce every prior prop combination exactly: construction input/reveal (interactive → inspectable+wrongLetters+badges on a wrong answer), identification (inspectable, badges+onInspect wire up once answered), interval identification (inspectable, onInspect gated on answered), interval construction (interactive → inspectable+wrongLetters on answered) - unchanged from the original branch-specific prop wiring.
- `getDockRegistry()` is captured once at component-init time (`dockRegistry` const, matching Plans 02-04's own established pattern). A single `$effect` registers `{ token: dockToken, keyboard: dockedKeyboard }` whenever the viewport is not short-landscape and returns a cleanup that calls `clear(dockToken)` - firing both on re-run (entering short-landscape) and on unmount, so no separate `onMount`/`onDestroy` pair was needed.
- A feature-detected `isShortLandscape` flag (`window.matchMedia('(max-height: 600px) and (orientation: landscape)')`, mirroring the page's pre-existing rotate-hint orientation listener) drives the dock/inline split live: entering that breakpoint clears the dock registration and renders the same `dockedKeyboard()` snippet inline inside each branch's `.drill-layout__keyboard` grid area, restoring today's two-pane layout exactly; leaving it re-registers with the dock.
- `src/routes/drillsDock.test.ts` (new) covers: single dock registration on mount, no `PianoKeyboard` in the page's own document flow, construction interactivity + sound, the wrong-construction-answer in-place reveal transform (one keyboard, `wrongLetters` + interval colors), the identification inspectable→reveal transform (one keyboard, badges appear post-answer), unmount clearing, and the default-environment dock-vs-inline assertion (no inline keyboard renders in `.drill-layout__keyboard` when `matchMedia` is absent).

## Task Commits

Each task was committed atomically:

1. **Task 1: Single mode-aware docked keyboard for all question branches** - `3231746` (feat)
2. **Task 2: Short-landscape suppression — render inline in the two-pane instead of docking** - `08ac30b` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/routes/drills/+page.svelte` - four inline `PianoKeyboard` sites + the feedback-block identification-reveal keyboard collapsed into one `{#snippet dockedKeyboard()}`, registered/cleared via an `isShortLandscape`-driven `$effect`; `.drill-layout__keyboard` now conditionally renders the same snippet inline only in short-landscape
- `src/routes/drillsDock.test.ts` (new) - dock-registration + mode-transform + short-landscape-default coverage for Drills
- `tests/drills.e2e.test.ts` - `renderDrillsPage()` helper now supplies a real dock registry via context and renders `KeyboardDock` alongside the page, since the page calls `getDockRegistry()` unconditionally at init
- `tests/practice.e2e.test.ts` - `renderChordsDeck()` updated with the same dock-context + `KeyboardDock` harness fix
- `tests/reveal-insight.e2e.test.ts` - `renderChordsDeck()` updated with the same dock-context + `KeyboardDock` harness fix

## Decisions Made

- Identification's docked keyboard wires `onInspect` + `showIntervalBadges` once `answered` is true (correct or wrong), not only on a wrong answer - the literal reading of the plan's read_first instruction, and necessary to merge the previously-separate inline mystery keyboard and feedback-block reveal keyboard into one docked element.
- Dock registration is `$effect`-driven (register + returned cleanup that clears), not a mount-once `register()`/`onDestroy` `clear()` pair - mirrors Plan 04's `drill.done`-driven `ScaleKeyboardDrill` pattern, since the docked/inline split must react to live `isShortLandscape` changes, not just mount/unmount.
- `isShortLandscape` defaults to `false` (dock-by-default) whenever `matchMedia` is unavailable - confirmed via a throwaway probe that this project's jsdom test environment has `window.matchMedia === undefined`, so the entire test suite exercises the docked branch, matching the plan's own acceptance criteria for "the default (non-short-landscape) test environment."

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-existing `drills.e2e.test.ts`/`practice.e2e.test.ts`/`reveal-insight.e2e.test.ts` broke: rendering the page without a dock registry in context throws immediately**
- **Found during:** Task 1, first full `npm test` run after Task 1's own `drillsDock.test.ts` passed
- **Issue:** Drills now calls `getDockRegistry()` unconditionally during component init and `dockRegistry.register(...)` inside an `$effect`. The three pre-existing suites that render `DrillsPage` directly (`tests/drills.e2e.test.ts` - 45 tests, `tests/practice.e2e.test.ts` - 14 tests, `tests/reveal-insight.e2e.test.ts` - 5 tests) had no registry in context, so `getDockRegistry()` returned `undefined` and the subsequent `.register()` call threw, failing every test across all three files (64 failures total).
- **Fix:** Added the same `renderPage()`-style helper Plan 03 established for `lookup.e2e.test.ts`/`theory.e2e.test.ts`: supplies a real `createDockRegistry()` via the `render()` `context` option and renders `KeyboardDock` alongside the page (both append to the same `document.body`, so `screen` queries find the docked keyboard/keys). `drills.e2e.test.ts` got a named `renderDrillsPage()` function (38 call sites, mechanically substituted); the other two files' existing `renderChordsDeck()` helpers were updated in place since they already centralized the single render call.
- **Files modified:** `tests/drills.e2e.test.ts`, `tests/practice.e2e.test.ts`, `tests/reveal-insight.e2e.test.ts`
- **Verification:** All three suites pass (64 tests). Full suite (`npm test`) - 991 tests, all pass. `npm run check` - 0 errors.
- **Committed in:** `3231746` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for the plan's own required verification ("full `npm test` stays green") to hold. No scope creep beyond fixing what this plan's own page changes broke - all three touched files were pre-existing Drills test suites whose only needed change was the render harness, mirroring Plan 03's identical precedent.

## Issues Encountered

None beyond the deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Four of five KBD-01 pages are now dock-wired (Lookup, Theory, Scales' Practice surface, Drills), alongside the Plans 01-02 foundation. Plans 06-07 still need to dock `/recall` before KBD-01 and KBD-03 can be marked complete in REQUIREMENTS.md - this plan's `requirements-completed` is intentionally empty, matching Plans 02/03/04's own correction (KBD-01/KBD-03 are only true once every in-scope page/mode is dock-wired).

`npm run check` passes (0 errors); the full suite (991 tests) stays green.

No blockers for Plan 06.

---
*Phase: 15-playable-keyboard-everywhere*
*Completed: 2026-07-15*

## Self-Check: PASSED

- FOUND: src/routes/drills/+page.svelte
- FOUND: src/routes/drillsDock.test.ts
- FOUND: tests/drills.e2e.test.ts
- FOUND: tests/practice.e2e.test.ts
- FOUND: tests/reveal-insight.e2e.test.ts
- FOUND: 3231746 (Task 1 commit)
- FOUND: 08ac30b (Task 2 commit)
