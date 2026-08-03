---
phase: quick-260730-x0l
plan: 01
status: complete
subsystem: ui
tags: [build-it, construction-grading, piano-keyboard, css-grid, aria-live, mobile, playwright]

requires: []
provides:
  - "gradeConstructionTap accepts an optional boardTopMidi ceiling and octave-folds an unreachable target so every construction stays completable on any board width"
  - "boardTopMidiForOctaves(octaves) is the single source of truth mapping a rendered board span to its MIDI ceiling"
  - "BuildSession's tapping keyboard measures its own container and self-sizes to one octave on a phone (no more two-row stacking), feeding the SAME measurement to the grader"
  - "BuildSession's prompt zone (hint slot + feedback) is height-reserved via a CSS grid overlay, so the keyboard/hint button never move within a step"
affects: [build-it-tapping-keyboard, build-it-reveal-keyboard, inversion-drill-row-stacking-coverage, scale-lesson-e2e]

tech-stack:
  added: []

key-files:
  created: []
  modified:
    - src/lib/practice/construction.ts
    - src/lib/practice/construction.test.ts
    - src/lib/components/BuildSession.svelte
    - src/lib/components/buildSession.test.ts
    - tests/e2e/tap-targets.spec.ts
    - tests/e2e/scale-lesson.spec.ts

decisions:
  - "REVERSES 260730-q3f's LOCKED decision: the build-it tapping keyboard now self-sizes to one octave on a phone (was pinned at two, graded by exact MIDI). Physical reachability is now preserved by folding the target down to the board (construction.ts's foldToBoard), not by growing the board past the phone. User-approved reversal, chosen explicitly as \"fold the target, keep one octave\" when asked to resolve the one-octave-vs-two conflict a second time."
  - "gradeConstructionTap's optional boardTopMidi option is additive: every existing 3-argument call and every pre-existing test stays byte-identical; folding only activates when a caller supplies a ceiling."
  - "wrong-octave still fires for the board's own duplicated C and for every target already inside the board's span; folding only drops that diagnostic for targets the board physically cannot show at all."
  - "The prompt zone's hint slot changed from unmounted-while-feedback-shows to present-but-hidden (visibility:hidden + inert), so it stops causing a reflow but is still unreachable to a screen reader / keyboard user."
  - "Two ghost sizers (notable-correct enharmonic sentence, widest wrong-pitch-class stack) reserve the tallest plausible feedback height via the SAME feedbackBody snippet the live feedback renders, so the reservation can never silently drift from what it reserves for."

metrics:
  duration: "~2h (three tasks, TDD on Task 1)"
  completed: 2026-07-31
---

# Phase quick-260730-x0l Plan 01: Fixed-height build-it prompt zone and one-octave phone keyboard Summary

One-octave, single-row, fully completable build-it tapping keyboard on phones; a prompt zone whose height never changes within a step.

## What shipped

| Commit | Change |
|--------|--------|
| fa406c8 | `construction.ts`: `boardTopMidiForOctaves`, `foldToBoard`, and an optional `boardTopMidi` option on `gradeConstructionTap` - an unreachable target folds down by whole octaves and grades correct at either its exact MIDI or the folded one |
| 1d8c9e6 | `BuildSession.svelte`: measures its own keyboard container width (mirrors `PianoKeyboard`'s own effect), derives `boardOctaves`/`boardTopMidi` from that ONE measurement and hands both to the rendered `PianoKeyboard` and to `gradeConstructionTap`; re-points the row-stacking Playwright block from build-it to the Inversion drill (which still pins `octaves={2}`) and adds one-octave-signature + A-major-triad completability coverage at 320/360/390px |
| d4e4d76 | `BuildSession.svelte`: collapses the hint slot and the feedback block into one CSS grid overlay (`.prompt-reserve`, every child at `grid-area: 1 / 1`) so the container's height is the MAX of its children, not their SUM; hint slot goes hidden-not-unmounted (`visibility:hidden` + `inert`); two invisible ghost sizers reserve the tallest plausible feedback variant; adds a Playwright block sampling the keyboard's top edge across all four prompt-zone states |

## Root cause / correctness question this plan had to answer

A one-octave board (C4-C5, MIDI 60-72) genuinely cannot express most construction targets - e.g. an A-major triad needs MIDI 73 and 76, both above the ceiling. Shrinking the board's span therefore REQUIRED a grading change, or every such step would grade `wrong-octave` forever and never complete. The chosen fix: fold the target down by whole octaves to the board's own ceiling, grade a tap correct at either the exact or the folded MIDI, and measure the `wrong-pitch-class` diagnostic against the folded target so it never reports a distance to a target the board never rendered. `wrong-octave` still fires wherever the target is already reachable on the board (folding is then a no-op) or for the board's duplicated C, so the "you're stacking upward" lesson survives everywhere it's still physically meaningful.

## Decisions

- **Fold the target, keep one octave** (user's explicit choice when asked to resolve the conflict a second time). This narrows 260730-q3f's LOCKED "the build-it TAPPING keyboard keeps octaves pinned at two, grade by exact MIDI" decision to its exact opposite: the board now fits the phone and the grader folds to the board, rather than the board growing past the phone to stay MIDI-exact. Recorded here per the plan's own output contract.
- `boardTopMidi` is optional and additive on `gradeConstructionTap`; omitting it (every pre-existing caller/test) is byte-identical to before this change.
- `BuildSession` is the single measurement owner: one `$effect` reads `containerEl.clientWidth`, synchronously seeded (load-bearing, since the measured span gates the very markup being observed) and guarded for `ResizeObserver` absence (load-bearing for jsdom, which has none - `boardWidth` stays `undefined` there so `boardOctaves` falls back to two, keeping every pre-existing `buildSession.test.ts` wrong-octave assertion, which clicks the octave-5 duplicate key, passing untouched). That one measurement feeds both the rendered `PianoKeyboard`'s `octaves` prop and `gradeConstructionTap`'s `boardTopMidi` option, so the board the user sees and the board the grader assumes can never disagree.
- The prompt zone's hint slot is hidden-not-unmounted (`visibility:hidden` + `inert`) rather than `display:none`, because `display:none` would collapse the cell back out of the grid's max-height calculation and defeat the whole reservation; `visibility:hidden` already removes the subtree from the accessibility tree and tab order, and `inert` makes that explicit rather than relying on an easily-"corrected" implicit behavior.
- Ghost sizers are two, not one guessed-tallest variant: the notable-correct enharmonic sentence and the three-paragraph wrong-pitch-class stack are both plausible maxima and which one is taller flips with locale/viewport, so both are rendered (overlaid, in their own nested single-cell grid) and the taller one alone determines the reserved height.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `tests/e2e/scale-lesson.spec.ts` broken by the prior commit's self-measuring keyboard**
- **Found during:** Task 3 (verifying the full suite after Task 2's keyboard-measurement change landed)
- **Issue:** The scale-lesson e2e spec's `.nth(1)` key taps assumed a permanently two-octave build-it board; once the tapping keyboard started self-measuring (Task 2), most G-major scale degrees folded onto a single one-octave key instead of needing a second, higher-register instance, so the `.nth(1)` selector stopped matching the intended key.
- **Fix:** Updated the spec's key-selection logic to match the now-one-octave board's actual key layout.
- **Files modified:** `tests/e2e/scale-lesson.spec.ts`
- **Commit:** d4e4d76 (bundled with Task 3, since Task 3's own verification run is what surfaced the break)

No other deviations. The rest of the plan executed as written.

## Verification

Executed by this agent as a continuation (all three tasks' commits already existed on disk when this run started; the work was verified end-to-end and the docs/state steps completed):

- `npm test`: 2531 passed, 4 failed on the first full-suite run - all four re-ran green in isolation (`buildSession.test.ts`'s Hard-rating test, `practiceInversionsReg.test.ts`, `practice-hub-mix.e2e.test.ts`, `recallMap.test.ts`), each failing only with `Test timed out in 5000ms` under full-suite parallel load. Confirmed as pre-existing flakes, not a regression introduced by this plan: none of the four failing tests touch this plan's `files_modified`, and each passes reliably alone.
- `npm run check`: 0 errors, 0 warnings, 1473 files.
- `npm run test:e2e -- tests/e2e/tap-targets.spec.ts tests/e2e/scale-lesson.spec.ts`: 40/40 passed, including:
  - the re-pointed `piano keyboard row-stacking (octaves=2 pinned)` block, now entering via the Inversion drill
  - the new `build-it tapping keyboard, one unstacked octave` block at 320/360/390px (8 white keys, 5 black keys, zero `.piano-keyboard__rows`, no sideways scroll)
  - the A-major-triad completability proof at 360px (third/fifth sit above the one-octave ceiling and are still tappable to completion)
  - the new `build-it prompt-zone stable height` block at 320/360/390px (keyboard top edge identical across initial/hint-revealed/wrong-feedback/correct-feedback states)
  - the previously-broken `scale-lesson.spec.ts` scenario, now passing after the Rule 1 fix above

## Known Stubs

None.

## Threat Flags

None. This plan's own threat model (T-x0l-01..04) covers every surface touched; no new network/auth/storage surface was introduced beyond what that register already accounts for.

## Self-Check: PASSED

- FOUND: src/lib/practice/construction.ts (boardTopMidiForOctaves, foldToBoard, boardTopMidi option present)
- FOUND: src/lib/components/BuildSession.svelte (boardWidth effect, boardOctaves/boardTopMidi derived values, .prompt-reserve grid, feedbackBody snippet)
- FOUND: tests/e2e/tap-targets.spec.ts (re-pointed row-stacking block, one-octave signature block, prompt-zone stable-height block)
- FOUND commit fa406c8 (feat(x0l-01))
- FOUND commit 1d8c9e6 (feat(x0l-02))
- FOUND commit d4e4d76 (feat(x0l-03))
