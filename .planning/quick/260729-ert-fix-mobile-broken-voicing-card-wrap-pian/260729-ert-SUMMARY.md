---
phase: quick-260729-ert
plan: 01
subsystem: ui
tags: [piano-keyboard, mobile, css, responsive, tdd, live-browser-verification]

# Dependency graph
requires: []
provides:
  - "PianoKeyboard.svelte two-row stacking: keyboardLayout.ts's shouldStackRows/splitBoardIntoRows plus a .piano-keyboard__rows render path, verified working in a real browser"
  - "ShellVoicingDrill.svelte mobile-first .vcards grid and non-clipping .vcard__head"
  - "ScaleKeyboardDrill.svelte two-row stacking (own render path, mirrors PianoKeyboard's mechanism)"
affects: [practice-page-voicing-drill, practice-page-build-it-drill, practice-page-scale-practice-disclosure, learn-page-scale-explorer, every-pianokeyboard-call-site]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Svelte 5 {#snippet} used to share the per-key markup block between the single-row and stacked-row render paths, avoiding duplicated key-rendering logic (applied in both PianoKeyboard.svelte and ScaleKeyboardDrill.svelte)"

key-files:
  created: []
  modified:
    - src/lib/components/keyboardLayout.ts
    - src/lib/components/keyboardLayout.test.ts
    - src/lib/components/PianoKeyboard.svelte
    - src/lib/components/pianoKeyboard.stackedRows.test.ts
    - src/lib/components/BuildSession.svelte
    - src/lib/components/ScaleKeyboardDrill.svelte
    - src/lib/components/scaleKeyboardDrill.stackedRows.test.ts
    - src/lib/components/ShellVoicingDrill.svelte
    - tests/e2e/tap-targets.spec.ts

key-decisions:
  - "CRITICAL CORRECTION (post-unit-test-green, found by the coordinator's live-browser check): the first pass of this task shipped a fully green unit-test suite (133 files/2140 tests) while the feature was completely non-functional in a real browser - the keyboard still rendered as one 660px-wide row scrolling horizontally at a 374x812 phone viewport. Root causes and fixes are documented in detail below. This is the reason the task's own constraints (run the real Playwright suite, not just Vitest) exist, and why this SUMMARY leads with that finding rather than burying it."
  - "PianoKeyboard's measurement $effect must NOT gate on `octaves !== undefined` - every real call site (every construction/voicing/drill keyboard) passes octaves={2} explicitly to fix the SPAN, and gating self-measurement on the same prop meant measuredWidth stayed permanently undefined for all of them, so stacked could never become true. octaves and measuredWidth are separate concerns: one fixes the span, the other decides stack-vs-single."
  - "A caller's own pre-inflating wrapper (BuildSession's old scroll-wrap + inner 660px-min-width div) makes ResizeObserver's measurement self-referential - it measures the wrapper it just inflated, never the true available width. The wrapper must be removed so PianoKeyboard's own ResizeObserver sees the real container."
  - "shouldStackRows is NOT simply !fitsWithoutScrolling (that was the first pass's definition, and it was wrong): a one-octave span's row 1 (7 keys) only clears the 44px floor at 308px, so a container between 308px and 352px would 'stack' into two rows where row 1's own keys were STILL under 44px, achieving nothing (measured live in Chromium at a real 304px container: 43.42px keys). The corrected rule requires whichever row is wider (row 1 for one octave, row 2 for two octaves) to independently clear the floor before stacking is allowed; below that, the pre-existing single-row + horizontal-scroll fallback is the honest answer."
  - "The row split seam is always white-index 7 (the B-to-C gap): the only seam in BLACK_KEY_PATTERN with no adjacent black key, so splitting there never orphans a black key from its neighboring white key."
  - "Each stacked row computes its own local whiteKeyWidthPct/blackKeyWidthPct from its own white-letter count, independent of the full board's percentages, so each row's absolute leftPct never depends on the other row."
  - "The single noteAssignment map (keyed by the full-board whiteLetters/blackKeyPatterns) is never recomputed per row; only WHERE an already-assigned key renders (which row, which local index) changes."
  - ".vcards goes mobile-first (single column by default, two columns only at the existing min-width: 640px breakpoint), matching app.css's max-width: 639.98px convention inverted."
  - "ScaleKeyboardDrill (own key-rendering path, never delegated to PianoKeyboard, always fixed at SCALE_DRILL_OCTAVES=2) had the identical grows-past-its-container-and-scrolls defect and was fixed with the same mechanism, since it is a live phone-facing surface on /practice and /learn. filledMap/wrongKey/placementByKey stay keyed by absolute {kind, keyIndex} unchanged - only rendering location changes, not the grading model."
  - "The row-stacking e2e assertions were rewritten to exercise /practice's Build it drill (octaves={2}-pinned) instead of the Lookup page: Lookup's keyboard has no explicit octaves prop and self-measures a 1-octave span, which at 320px/375px viewports never actually reaches the octaves=2 code path this whole defect lived in."

patterns-established:
  - "Shared per-key markup extracted into a Svelte 5 {#snippet board(...)} block, called once (unstacked) or twice (stacked), rather than duplicating the ~140-line key-rendering block. Same pattern applied independently in ScaleKeyboardDrill.svelte's own {#snippet keyBoard(...)}."
  - "Live-browser verification (Playwright against a real Chromium instance) is required before declaring a viewport-dependent layout feature done - a fully green Vitest/jsdom suite passed throughout even while the feature was completely broken in an actual browser, because jsdom has no ResizeObserver and every unit test either stubbed it in a way that didn't exercise the real bug, or didn't stub it at all."

requirements-completed: []

coverage:
  - id: D1
    description: "keyboardLayout.ts exports shouldStackRows, firstRowWhiteCount, splitBoardIntoRows, covered by passing unit tests for both 1-octave and 2-octave cases, including the corrected floor-clearing semantics"
    requirement: null
    verification:
      - kind: unit
        ref: "npm test -- --run keyboardLayout - 40 tests passed (includes the corrected shouldStackRows describe block plus a new invariant test asserting both stacked rows always individually clear the fingertip floor)"
        status: pass
    human_judgment: false
  - id: D2
    description: "PianoKeyboard.svelte renders two stacked, independently-correct mini-keyboards when measured width falls under the per-span fingertip floor AND stacking would actually help, with highlight/wrong/ghost/selected/bass classes intact; unchanged single row above the floor or when stacking would not help"
    requirement: null
    verification:
      - kind: unit
        ref: "npm test -- --run pianoKeyboard - all pianoKeyboard*.test.ts files pass, including 9 tests in pianoKeyboard.stackedRows.test.ts covering: stacking with octaves omitted, stacking WITH an explicit octaves prop (the exact combination the live bug lived in), and the two new never-stacks-below-its-own-floor regression tests at the real 304px/308px widths that exposed the defect"
        status: pass
      - kind: e2e
        ref: "npm run test:e2e -- tap-targets - 29/29 passed in real Chromium via Playwright, including the rewritten row-stacking block against /practice's Build it drill (octaves={2}-pinned): phone-narrow (~304px measured) correctly stays unstacked, phone-portrait (~359px measured) correctly stacks into two rows with .piano-keyboard__rows present, landscape/desktop stay unstacked"
        status: pass
    human_judgment: false
  - id: D3
    description: "ShellVoicingDrill's .vcards stacks to one column by default and .vcard__head wraps instead of clipping, both mobile-first and enhanced at the 640px-class breakpoint"
    requirement: null
    verification:
      - kind: unit
        ref: "npm test -- --run shellVoicingDrill - all tests pass (unchanged, CSS-only change)"
        status: pass
      - kind: e2e
        ref: "npm run test:e2e -- tap-targets - 29/29 passed (see D2); the compare-card layout fix was not independently re-screenshotted in this follow-up pass since it was not implicated in the coordinator's reported defect (the keyboard-scroll bug), but the full e2e run confirms no regression"
        status: pass
    human_judgment: false
  - id: D4
    description: "ScaleKeyboardDrill.svelte (own key-rendering surface, not delegated to PianoKeyboard) gains the same two-row stacking mechanism, since it had the identical unconditional-660px-min-width-plus-scroll defect and renders on /practice and /learn on phone"
    requirement: null
    verification:
      - kind: unit
        ref: "npm test -- --run scaleKeyboardDrill - 40 tests passed across 3 files, including 5 new tests in scaleKeyboardDrill.stackedRows.test.ts (stacks at a real 358px measurement, stays unstacked at 700px and when ResizeObserver is unavailable, grading still works correctly across stacked rows, and total key counts reconcile to the full 15-white/10-black board)"
        status: pass
      - kind: e2e
        ref: "Verified live in Chromium via a throwaway (not committed) diagnostic Playwright test against /practice's Scale practice disclosure at all four viewport fixtures: the surrounding disclosure card's own padding keeps the drill's real container width (~323px portrait, ~268px narrow) under the two-octave stacked floor in every tested viewport, so it correctly falls back to its pre-existing internal scroll-wrap with NO page-level horizontal scroll (docScrollWidth <= docClientWidth confirmed) - matching the same last-resort fallback intent already documented on PianoKeyboard's own scroll wrapper, not a regression from this task."
        status: pass
    human_judgment: false
  - id: D5
    description: "npm test, npm run test:e2e -- tap-targets, and npm run check all pass, run against a fully installed node_modules (not the partial/broken environment the first pass ran under)"
    requirement: null
    verification:
      - kind: unit
        ref: "npm test -- --run (full suite) - 134 test files passed, 2156 tests passed, 0 failures (final run, after all corrections)"
        status: pass
      - kind: e2e
        ref: "npm run test:e2e -- tap-targets - 29/29 passed in real Chromium (Playwright 1.62.0, chromium build 1234, installed this session via `npx playwright install chromium`)"
        status: pass
      - kind: other
        ref: "npm run check (svelte-check) - 1440 files, 0 errors, 0 warnings, 0 files with problems (the 37 errors seen in the first pass were `Cannot find module '@playwright/test'` failures caused by node_modules never having been actually installed in this worktree at that time; a full npm install resolved them all)"
        status: pass
    human_judgment: false

duration: 105min
completed: 2026-07-29
status: complete
---

# Quick Task 260729-ert: Fix Mobile Broken Voicing Card (Keyboard Wrap + Header Clip) Summary

**Replaced PianoKeyboard's horizontal-scroll-on-narrow-viewport behavior with a two-row vertical wrap, fixed ShellVoicingDrill's clipped compare-card header/rigid grid, and - after a live-browser check by the coordinator caught the feature as completely non-functional despite a fully green unit-test suite - fixed two measurement-gating bugs and one floor-math bug that had prevented stacking from ever actually engaging in a real browser, then extended the same fix to ScaleKeyboardDrill's own separate keyboard-rendering surface.**

## Performance

- **Duration:** ~105 min total (first pass ~45 min + coordinator-flagged follow-up ~60 min)
- **Tasks:** 3 planned tasks + 1 coordinator-directed correction round
- **Files modified:** 9

## IMPORTANT: What the live-browser check found and why it matters

After the first implementation pass (Tasks 1-3 below) reported `npm test` green (133 files / 2140 tests) and `npm run check` clean, the coordinator opened the actual app in a real Chromium browser at a 374x812 phone viewport and found the keyboard **still rendering as one 660px-wide row, scrolling horizontally inside a 358px container** - exactly the bug this task was supposed to fix. Debug attributes added directly to the live DOM showed `measuredWidth` was `undefined`, meaning the stacking logic never had the data it needed to decide anything.

Three compounding defects were responsible, none of which any unit test in the first pass caught:

1. **`PianoKeyboard.svelte`'s measurement `$effect` gated on `if (octaves !== undefined) return;`** as its very first line. Every real call site that needs a fixed span (every construction/voicing/drill keyboard in this app) passes `octaves={2}` explicitly - so this line skipped ResizeObserver registration entirely for all of them, `measuredWidth` stayed permanently `undefined`, and `stacked` (which requires `measuredWidth !== undefined`) could never become `true`. **Fix:** removed the gate. `octaves` fixes the SPAN; measured width decides only stack-vs-single, and those are genuinely separate concerns.

2. **`BuildSession.svelte`'s `buildKeyboard` snippet wrapped `PianoKeyboard` in a `scroll-wrap` div plus an inner div with an unconditional `min-width: 660px`.** This pre-inflated the very container `PianoKeyboard`'s `ResizeObserver` was watching, making the measurement self-referential - it could only ever "discover" a width of at least 660px, never the real ~359px available on a 375px phone. **Fix:** removed both wrapper layers; the natural, unconstrained container width now reaches `PianoKeyboard`'s own observer.

3. **`shouldStackRows` was defined as exactly `!fitsWithoutScrolling(...)`**, with no check that stacking would actually help. For a one-octave span, row 1 (7 white keys) only clears the 44px fingertip floor at 308px - so a container between 308px and 352px would trigger stacking into two rows where row 1's own keys were **still under 44px** (measured live in Chromium at a real 304px container via the Lookup page: 43.42px keys), achieving literally nothing over the old scrolling behavior. The same latent gap existed for the two-octave span's row 2 (352px floor). **Fix:** `shouldStackRows` now also requires the wider of the two rows to independently clear the floor at the given width before allowing a stack; below that, the pre-existing single-row + horizontal-scroll fallback remains the honest answer for that (sub-308px, narrower than any real phone this app targets) width.

Both live-browser-caught defects, plus the floor-math defect found while fixing them, now have dedicated regression tests (see Task-by-task detail below) written to fail against the pre-fix code and confirmed to do so before being left in their passing state.

**Why unit tests alone did not catch this:** every pre-existing/first-pass test in `pianoKeyboard.stackedRows.test.ts` either omitted the `octaves` prop entirely (letting self-measurement run, so the gate never triggered) or passed `octaves: 2` *without* also stubbing `ResizeObserver` (so no narrow width was ever observed in the first place). Neither combination could exercise the actual failing case: an explicit `octaves` prop **plus** a real narrow measured width. This gap is now closed (see below).

## Accomplishments

### Original three tasks (first pass)

- Added `shouldStackRows`, `firstRowWhiteCount`, and `splitBoardIntoRows` to `keyboardLayout.ts`.
- Extended `PianoKeyboard.svelte` to render two stacked `.piano-keyboard__board` elements inside a `.piano-keyboard__rows` wrapper, sharing per-key markup via a `{#snippet board(...)}`.
- Fixed `ShellVoicingDrill.svelte`'s `.vcards` grid (mobile-first single column, two-column only at the existing `640px`-class breakpoint) and `.vcard__head` (wraps instead of clipping).
- Updated `tests/e2e/tap-targets.spec.ts`'s stale scroll-only rationale.

### Coordinator-directed correction round (second pass)

- **Diagnosed the root cause with a live production-build Playwright run** (not guesswork): reproduced the coordinator's exact scenario (`build-it` drill, phone viewport), confirmed the two fixes the coordinator had already made (removing the `octaves !== undefined` gate; removing `BuildSession`'s pre-inflating wrapper) were both correct and, together, made stacking work in a real browser.
- **Removed the coordinator's three temporary `data-debug-*` attributes** from `PianoKeyboard.svelte`.
- **Found and fixed a THIRD defect while stress-testing the fix against every viewport fixture**: `shouldStackRows`'s floor math (see point 3 above). Caught by running the real `tap-targets.spec.ts` e2e suite (now that Playwright's browser binary was installed) and seeing two geometry assertions genuinely fail (`white key 0 width: expected >= 44, received 43.42`) - not a test-authoring mistake, a real bug the corrected math fixes.
- **Extended two-row stacking to `ScaleKeyboardDrill.svelte`**, which renders its own keyboard (never delegates to `PianoKeyboard`) and had the identical always-2-octave, unconditional-660px-min-width, unconditional-horizontal-scroll defect. This component is live on `/practice`'s Scale practice disclosure and `/learn`'s Scale Explorer, both used on phone. Verified via a throwaway (uncommitted) Playwright diagnostic that its actual behavior at real container widths (reduced further by its own card's padding) correctly falls back to the pre-existing scroll-wrap with no page-level scroll - not a regression, matching the documented "last resort" fallback intent.
- **Added the missing regression test category**: an explicit `octaves` prop combined with a real narrow `ResizeObserver`-stubbed width - the exact combination that shipped broken and that no prior test exercised. Confirmed this new test genuinely fails against the pre-fix code (reintroduced the old gate temporarily, watched the test fail, then restored the fix) before finalizing.
- **Rewrote the e2e row-stacking test block** to exercise `/practice`'s Build it drill (`octaves={2}`-pinned) instead of the Lookup page, whose self-measuring 1-octave keyboard never actually reaches the `octaves={2}` code path this whole defect lived in. Verified the correct per-viewport expectations against real measured container widths in Chromium before writing them.
- Re-ran the full Vitest suite and the full `tap-targets.spec.ts` Playwright suite after every change, and one final time after all fixes were in place.

## Task Commits

1. **Task 1: Add row-split pure functions to keyboardLayout.ts**
   - `2708dde` - test(quick-260729-ert): add failing tests for row-split keyboard layout functions (RED)
   - `a3f18d2` - feat(quick-260729-ert): add row-split pure functions to keyboardLayout (GREEN)
2. **Task 2: Render two stacked rows in PianoKeyboard.svelte when required**
   - `234ba2c` - test(quick-260729-ert): add failing tests for PianoKeyboard two-row stacking (RED)
   - `34f4b99` - feat(quick-260729-ert): render two stacked rows in PianoKeyboard when measured width is too narrow (GREEN)
3. **Task 3: Fix ShellVoicingDrill's clipped compare-card header and rigid 2-col grid**
   - `3f86734` - fix(quick-260729-ert): stack voicing compare cards on phone and stop header clipping
4. **Coordinator-directed correction: measurement gating + floor math + ScaleKeyboardDrill + e2e fix**
   - `ddf7a91` - fix(quick-260729-ert): stacking never actually engaged for octaves-pinned keyboards, and its floor math was wrong
   - `a775e77` - fix(quick-260729-ert): extend two-row stacking to ScaleKeyboardDrill
   - `df0b80e` - test(quick-260729-ert): fix row-stacking e2e assertions against the octaves-pinned surface

**Plan metadata:** commit pending as part of the final metadata commit step (orchestrator-owned).

## Files Created/Modified

- `src/lib/components/keyboardLayout.ts` - `shouldStackRows`, `firstRowWhiteCount`, `KeyboardRow`, `splitBoardIntoRows`, plus (correction round) `secondRowWhiteCount`/`stackedRowFloorPx` helpers and the corrected `shouldStackRows` floor-clearing logic.
- `src/lib/components/keyboardLayout.test.ts` - tests for the new functions; corrected `shouldStackRows` describe block reflecting the fixed semantics, plus an invariant test that both stacked rows always individually clear the floor.
- `src/lib/components/PianoKeyboard.svelte` - `stacked` derived flag, per-row `rows` derivation, shared `{#snippet board(...)}`, `.piano-keyboard__rows` CSS; measurement `$effect` no longer gated on `octaves !== undefined`; coordinator's temporary debug attributes removed.
- `src/lib/components/pianoKeyboard.stackedRows.test.ts` - stacked/unstacked rendering tests, plus (correction round) regression tests for the explicit-octaves-plus-narrow-width combination and the stacking-does-not-help-below-its-own-floor case.
- `src/lib/components/BuildSession.svelte` - removed the pre-inflating `scroll-wrap`/660px-min-width wrapper around its `PianoKeyboard`; removed the now-unused `.scroll-wrap` CSS rule.
- `src/lib/components/ScaleKeyboardDrill.svelte` - added the same self-measuring `ResizeObserver` effect, `stacked` derivation, and two-row split/render (own `{#snippet keyBoard(...)}`) as `PianoKeyboard`; `filledMap`/`wrongKey`/`placementByKey` lookups unchanged.
- `src/lib/components/scaleKeyboardDrill.stackedRows.test.ts` - new test file covering stacked/unstacked rendering, grading correctness across stacked rows, and total key-count reconciliation.
- `src/lib/components/ShellVoicingDrill.svelte` - `.vcards` mobile-first grid, `.vcard__head`/`.vcard__label`/`.vcard__use` wrap fix.
- `tests/e2e/tap-targets.spec.ts` - corrected stale scroll-rationale comments; row-stacking `describe` block rewritten to exercise the Build it drill's `octaves={2}`-pinned keyboard with per-viewport expectations verified against real measured widths.

## Decisions Made

See `key-decisions` in the frontmatter above for the full list, including the critical correction. Summary:

- `octaves` (span) and measured width (stack-vs-single decision) must never gate each other.
- A caller's own layout wrapper must never pre-inflate the container a `ResizeObserver` is watching.
- `shouldStackRows` must verify stacking actually clears the floor for the wider row, not just that the unstacked span doesn't fit.
- The row split seam is always white-index 7 (no adjacent black key at that seam).
- Each row computes its own local width percentages; the underlying note-assignment map is never recomputed per row.
- `.vcards`/`.vcard__head` follow the app's existing `640px`-class breakpoint, mobile-first.
- `ScaleKeyboardDrill` gets the identical stacking mechanism as `PianoKeyboard` since it renders its own keys independently but had the same defect.
- e2e row-stacking assertions must target a page whose keyboard actually pins `octaves={2}`, not one that self-measures a narrower span.

## Deviations from Plan

- **Tasks 1-3 executed exactly as planned** (TDD RED->GREEN for Tasks 1-2, direct CSS fix for Task 3).
- **Rule 1 (auto-fix bugs) applied for the coordinator-directed correction round**: the live-browser-caught measurement-gating bugs and the floor-math bug are all genuine defects in code this task's own scope touched (`PianoKeyboard.svelte`, `keyboardLayout.ts`, `BuildSession.svelte`'s call site of the component this task modified) - fixed inline, with regression tests, per Rule 1's "fix inline -> add tests -> verify -> continue" process. No user permission was needed or sought for these fixes since they were bugs in the task's own deliverable.
- **`ScaleKeyboardDrill.svelte` was explicitly out of the original plan's file list**, but the coordinator directed a decision + implementation for it, having identified the identical defect pattern. Decision: implement it (Rule 2 - missing critical functionality parity across two live phone-facing keyboard surfaces sharing the same underlying defect), reusing the exact same mechanism (`shouldStackRows`/`firstRowWhiteCount` from the now-shared `keyboardLayout.ts`) rather than duplicating logic, while keeping its existing grading model (`filledMap`/`wrongKey`/`placementByKey`, all keyed by absolute `{kind, keyIndex}`) completely unchanged so its own extensive existing test suite (35 tests covering degree-ordering, tonic-scroll, CR-01 duplicate-key acceptance, locale-agnostic DOM lookups) needed zero modification and all passed unchanged.

## Known Stubs

None.

## Threat Flags

None. No new trust-boundary-crossing surface (network endpoint, auth path, schema change) was introduced by any file this task touched, in either pass.

## Issues Encountered

- **First-pass environment gap (resolved in the correction round):** the first pass's `node_modules` was not actually installed in this worktree (only Vite cache directories were present), so `npm run test:e2e -- tap-targets` could not run at all and was reported as an unverified gap. By the correction round, `node_modules` had been properly installed (`npm ls` confirms no `UNMET DEPENDENCY` entries) and Playwright's Chromium browser binary was installed this session via `npx playwright install chromium` (the project's pinned `@playwright/test@1.62.0` needed browser build 1234, one revision newer than what was cached on this machine).
- **The exact bug the coordinator caught is the textbook illustration of why "unit tests pass" is not sufficient for a viewport-dependent layout feature**: jsdom has no `ResizeObserver`, so every test path either bypassed self-measurement entirely or stubbed a width that happened not to exercise the real failure combination. This is now directly called out as a required pattern in `patterns-established` above.
- **Two pre-existing benign jsdom warnings** ("Not implemented: navigation to another Document") appeared during every full vitest run, unrelated to this task's changes.
- `npm run check` (svelte-check) went from 37 errors (all `Cannot find module '@playwright/test'`, an artifact of `node_modules` never having been installed) in the first pass to **0 errors, 0 warnings** once `node_modules` was properly installed.

## User Setup Required

None. All verification (unit tests, e2e tests, type-checking) now runs and passes in this environment with `node_modules` and Playwright's Chromium properly installed.

Recommended manual/visual spot-check (optional, not blocking): open `/practice` on a physical ~390px-wide phone, land on a voicing-family card and the Build it drill, confirm the piano keyboard(s) show two stacked rows with no horizontal scrollbar; separately open the Scale practice disclosure and confirm it still works via its internal scroll (by design, not stacked, per the padding/floor math above).

## Next Phase Readiness

- No blockers. `npm test` (134 files / 2156 tests), `npm run test:e2e -- tap-targets` (29/29), and `npm run check` (0 errors/0 warnings) are all green, verified in this environment with real dependencies installed and a real Chromium browser - not just jsdom/Vitest.
- The critical lesson (unit-test-green != feature-working for viewport-dependent layout) is captured in `patterns-established` for future phases touching `PianoKeyboard`/`ScaleKeyboardDrill` or any other self-measuring component.

---
*Phase: quick-260729-ert*
*Completed: 2026-07-29*

## Self-Check: PASSED

- FOUND: src/lib/components/keyboardLayout.ts (shouldStackRows/firstRowWhiteCount/splitBoardIntoRows/stackedRowFloorPx present)
- FOUND: src/lib/components/pianoKeyboard.stackedRows.test.ts
- FOUND: src/lib/components/ScaleKeyboardDrill.svelte (stacked rendering present)
- FOUND: src/lib/components/scaleKeyboardDrill.stackedRows.test.ts
- FOUND: 2708dde, a3f18d2, 234ba2c, 34f4b99, 3f86734, ddf7a91, a775e77, df0b80e (all commits present in git log)
- FOUND: no `data-debug-*` attributes remain in src/lib/components/PianoKeyboard.svelte (grep confirms zero matches)
