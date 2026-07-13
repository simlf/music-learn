---
phase: 09-deploy-to-the-piano
plan: 03
subsystem: ui
tags: [svelte, tailwind, css-media-queries, drills, responsive, playwright]

# Dependency graph
requires:
  - phase: 09-02
    provides: Merged feedback keyboard and phone-width key geometry fixes on the drills page
provides:
  - Portrait thumb-zone layout: Check as a generous primary target directly below the keyboard, smaller Clear beside it (D-10)
  - Landscape two-pane layout (prompt/controls or 2x2 choices left, keyboard right) that fits a short viewport with zero scroll (D-06)
  - 2x2 identification choice grid on phone and in the landscape left panel (D-13)
  - Dismissable, shown-once rotate hint via a device-local localStorage flag, dismissed on rotation too (D-05)
affects: [09-04, 09-05, 09-06, phone-QA-passes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Named CSS grid-template-areas on a single wrapper (.drill-layout) let one media query reflow the SAME DOM elements into a two-pane layout without reordering markup"
    - "Svelte component-scoped element/attribute selectors (main, h1, [data-testid=...]) reliably out-specificity Tailwind utility classes (py-8, mt-8, min-h-screen) regardless of stylesheet order, since Svelte appends its own scope class to the selector - used here to compact chrome only inside a short-landscape media query"
    - "A device-local localStorage flag utility (rotateHint.ts) mirrors recentLookups.ts's guarded try/catch read/write shape exactly, so a corrupted or hand-edited value degrades to 'not dismissed' rather than throwing"

key-files:
  created:
    - src/lib/drills/rotateHint.ts
    - src/lib/drills/rotateHint.test.ts
  modified:
    - src/routes/drills/+page.svelte
    - tests/drills.e2e.test.ts

key-decisions:
  - "Landscape two-pane switch gates on `(orientation: landscape) and (max-height: 600px)`, not orientation alone, so a roomy landscape desktop window stays single-column and only a genuinely short (phone-rotated) viewport reflows"
  - "Entering landscape counts as an implicit rotate-hint dismissal (matchMedia change listener calls dismissRotateHint()), in addition to the explicit dismiss control, per D-05's 'never shows again once dismissed or after the first rotation'"
  - "D-06 fix (post-checkpoint): main's `min-h-screen` (100vh) had to be cleared inside the short-landscape query, not just its padding - the masthead sits ABOVE main, so a 100vh-tall main plus the masthead always overflowed the viewport by the masthead's own height (58px at 844x390), independent of how compact main's actual content was"

patterns-established:
  - "Pattern 1: grid-template-areas reflow under a media query, keyed off max-height (not just orientation), to distinguish a rotated phone from a wide desktop window"
  - "Pattern 2: compacting page chrome above a card inside an existing short-viewport media query via component-scoped element selectors, rather than inventing a second breakpoint or duplicating markup"

requirements-completed: [PLAT-01]

coverage:
  - id: D1
    description: "Portrait: Check sits directly below the keyboard as a generous primary target in the thumb zone, with a smaller Clear beside it"
    requirement: "PLAT-01"
    verification:
      - kind: e2e
        ref: "tests/drills.e2e.test.ts#drills page Check button gating"
        status: pass
      - kind: manual_procedural
        ref: "Task 3 human-verify checkpoint at ~390px portrait"
        status: pass
    human_judgment: true
    rationale: "Thumb reach and generous-target sizing are physical/visual judgments; the user approved this live in a browser at the Task 3 checkpoint."
  - id: D2
    description: "Landscape: side-by-side two-pane layout (prompt/controls or 2x2 choices left, keyboard right) fits a short viewport (844x390) with zero vertical scroll, for both construction and identification load states"
    requirement: "PLAT-01"
    verification:
      - kind: automated_ui
        ref: "playwright: headless Chromium at 844x390, document.documentElement.scrollHeight === 390 (viewport height) for both construction and identification load states, screenshot confirms two-pane render"
        status: pass
      - kind: manual_procedural
        ref: "Task 3 human-verify checkpoint (approved two-pane split; then reported the 89px scroll gap as a fix-now issue)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Identification answer choices render as a 2x2 grid of large targets on phone and in the landscape left panel"
    requirement: "PLAT-01"
    verification:
      - kind: e2e
        ref: "tests/drills.e2e.test.ts#drills page identification prompt (choice-grid grid-cols-2 assertion)"
        status: pass
      - kind: manual_procedural
        ref: "Task 3 human-verify checkpoint"
        status: pass
    human_judgment: false
  - id: D4
    description: "A dismissable rotate hint shows once in portrait, persists dismissal via localStorage, and never reappears after dismissal or after the first rotation to landscape"
    requirement: "PLAT-01"
    verification:
      - kind: unit
        ref: "src/lib/drills/rotateHint.test.ts"
        status: pass
      - kind: e2e
        ref: "tests/drills.e2e.test.ts#drills page rotate hint (D-05)"
        status: pass
      - kind: manual_procedural
        ref: "Task 3 human-verify checkpoint (dismiss + reload; rotate to landscape)"
        status: pass
    human_judgment: false

duration: ~30min (continuation session, resuming after the human-verify checkpoint)
completed: 2026-07-14
status: complete
---

# Phase 9 Plan 3: Portrait Thumb-Zone + Landscape Two-Pane Drills Layout Summary

**Responsive drills page: portrait puts Check in the thumb zone below the keyboard with a smaller Clear beside it, landscape reflows the same DOM into a side-by-side two-pane layout via CSS grid-template-areas, choices stay a 2x2 grid in both orientations, and a once-ever rotate hint (localStorage-backed) points to landscape - plus a post-checkpoint fix that closed an 89px short-landscape scroll gap by clearing `main`'s `min-h-screen` floor and compacting chrome above the card.**

## Performance

- **Duration:** ~30 min (continuation session, resuming after the Task 3 human-verify checkpoint)
- **Completed:** 2026-07-14
- **Tasks:** 2 planned tasks (Task 1 RED, Task 2 GREEN) + 1 human-verify checkpoint (3 of 4 items approved live; 1 issue reported) + 1 checkpoint-discovered fix
- **Files modified:** 3 (2 created in Task 1, 1 further modified in the fix)

## Accomplishments

- `rotateHint.ts` mirrors `recentLookups.ts`'s guarded localStorage shape exactly: `isRotateHintDismissed()` / `dismissRotateHint()`, both degrading silently on any storage throw.
- Drills page restructured with a single named-grid wrapper (`.drill-layout`) so portrait (base) and landscape (media query) reflow the same prompt/keyboard/controls/feedback/next elements without any DOM reordering.
- Portrait: Check is a generous primary target (`flex: 3`) directly below the keyboard, Clear a smaller secondary (`flex: 1`) beside it, in the thumb zone.
- Landscape (orientation: landscape AND max-height: 600px, so only a genuinely short rotated-phone viewport - not a roomy desktop window): two-pane grid, prompt/controls or the 2x2 choices on the left, keyboard filling the right.
- 2x2 identification choice grid (`grid-cols-2`) holds on phone and in the landscape left panel.
- Rotate hint shows once in portrait (shop voice, no em dash: "Turn the phone sideways for the full two-octave board."), dismissed either by its own control or implicitly on the first rotation to landscape (`matchMedia` change listener), and never reappears once the localStorage flag is set.
- **Checkpoint defect fix (D-06 scroll gap):** the Task 3 checkpoint passed portrait, the hint, and the landscape two-pane split live, but measured 89px of unwanted vertical scroll at 844x390. Root-caused via headless-Chromium diagnostics to two stacked causes inside the existing short-landscape media query: (1) page chrome above the card (the "Drills" h1, `main`'s `py-8`, and the score register's `mt-8`) cost more than the compact two-pane content needed, and (2) `main`'s `min-h-screen` (100vh) held it at a 390px floor regardless of trimmed content, and since the masthead sits above `main`, that floor plus the masthead always overflowed the viewport by the masthead's own height. Fixed both inside the same media query (no new breakpoint): hide the h1 (redundant with the masthead's active nav state), tighten `main`'s padding and the score register's margin, and clear `main`'s `min-height`.

## Task Commits

Each task/fix was committed atomically:

1. **Task 1: Create rotate-hint utility + tests (RED first)** - `f30dafb` (test)
2. **Task 2: Restructure drills page: portrait thumb-zone + landscape two-pane + rotate hint (GREEN)** - `c897510` (feat)
3. **Checkpoint defect fix: close short-landscape scroll gap (D-06)** - `5e4c9c5` (fix)

**Plan metadata:** _pending final commit below_

## Files Created/Modified

- `src/lib/drills/rotateHint.ts` - `isRotateHintDismissed()` / `dismissRotateHint()`, localStorage key `music-learn:rotate-hint-dismissed`, guarded try/catch
- `src/lib/drills/rotateHint.test.ts` - Unit tests for the three dismissed states and the no-op write
- `src/routes/drills/+page.svelte` - Portrait/landscape responsive grid-template-areas layout, rotate-hint wiring, and the D-06 short-landscape compaction fix (hidden h1, tightened main/score-register spacing, cleared `main`'s `min-height`)
- `tests/drills.e2e.test.ts` - Rotate-hint present/dismiss/absent scenarios; 2-column choice-grid class assertion

## Decisions Made

- Landscape reflow gates on `max-height: 600px` in addition to `orientation: landscape`, so only a genuinely short (phone-rotated) viewport switches to two-pane - a wide-but-tall-enough desktop window stays single-column.
- Rotation to landscape is treated as an implicit rotate-hint dismissal (not just the explicit "Got it" control), matching D-05's "never shows again... or after the first rotation."
- The D-06 fix stays entirely inside the existing short-landscape media query (no second breakpoint invented), per the issue's explicit instruction, and does not touch portrait at all.

## Deviations from Plan

One issue was found by the user during the Task 3 human-verify checkpoint (not present in the original plan) and fixed under the checkpoint's explicit "fix it now" instruction:

### Auto-fixed Issues

**1. [Checkpoint-discovered, user-approved] Landscape (844x390) load state needed 89px of scroll**
- **Found during:** Task 3 checkpoint - user measured live in a real browser (`document.documentElement.scrollHeight` 479 vs viewport 390) after approving the portrait layout, rotate hint, and landscape two-pane split
- **Issue:** Two stacked causes, both inside the already-passing short-landscape media query: (a) chrome above the card - the "Drills" h1, `main`'s `py-8` (32px top/bottom), and the score register's `mt-8` (32px) - cost more than the trimmed two-pane content needed; (b) `main`'s `min-h-screen` (100vh) kept `main` at a 390px floor even once its actual content shrank well below that, and since the masthead renders above `main`, that floor plus the masthead's own height (58px at this viewport, from the `md:py-4` masthead padding at >=768px width) always pushed total document height past the viewport regardless of how compact `main`'s content became
- **Fix:** Inside the existing `@media (orientation: landscape) and (max-height: 600px)` block: `h1 { display: none; }` (redundant with the masthead's active DRILLS nav state, explicitly sanctioned by the issue), `main { padding-top/-bottom: var(--spacing-xs); min-height: 0; }`, and `[data-testid='score-register'] { margin-top: 0; margin-bottom: var(--spacing-xs); }`. Component-scoped element/attribute selectors reliably out-specificity the Tailwind utility classes they override (Svelte appends its own scope class to every selector written in a component's `<style>` block), so the override holds regardless of stylesheet order.
- **Files modified:** `src/routes/drills/+page.svelte`
- **Verification:** Installed Playwright transiently (`npm install --no-save`, using an already-cached Chromium binary - no network browser download, and `package-lock.json`'s incidental churn was reverted before committing) and drove headless Chromium at 844x390 against the real dev server: `document.documentElement.scrollHeight` now equals exactly `390` (the viewport height) for both the construction and identification load states, with ~55px of margin to spare below the card. Confirmed portrait (390x844) is unaffected - h1 and rotate hint still render, single-column grid, existing (expected, pre-approved) scroll behavior unchanged. Screenshot confirms the two-pane render reads correctly. Full suite (294/294), `npm run check`, and `npm run build` all green after the fix.
- **Committed in:** `5e4c9c5`

---

**Total deviations:** 1 auto-fixed (checkpoint-discovered, user explicitly approved fixing it before closing the plan)
**Impact on plan:** The fix completes the D-06 "everything visible without scrolling" success criterion the checkpoint exists to verify; no scope creep beyond the reported issue.

## Issues Encountered

None beyond the documented D-06 fix above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Portrait thumb-zone, landscape two-pane (verified with zero scroll via headless-Chromium measurement for both load states), 2x2 choices, and the once-ever rotate hint are all in place, automated-test-covered, and now also live-verified in a real rendering engine (not just jsdom arithmetic).
- No blockers for Phase 9's remaining plans (09-04 through 09-06).

---
*Phase: 09-deploy-to-the-piano*
*Completed: 2026-07-14*

## Self-Check: PASSED

All modified/created files exist on disk; all 3 commit hashes (`f30dafb`, `c897510`, `5e4c9c5`) are present in git history.
