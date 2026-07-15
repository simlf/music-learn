---
phase: 12-build-it-construction
plan: 05
subsystem: ui
tags: [svelte, piano-keyboard, construction, tdd, enharmonic]

# Dependency graph
requires:
  - phase: 12-build-it-construction (plan 03)
    provides: "construction.ts: isNotableSpelling, ConstructionStep.interval (IntervalInfo with .role/.long/.semitones)"
  - phase: 12-build-it-construction (plan 04)
    provides: "BuildSession.svelte's picker + full construction step loop, with the 'complete' state left as a minimal placeholder"
provides:
  - "BuildSession.svelte: opt-in, session-persistent count-up hint (chords only)"
  - "BuildSession.svelte: enharmonic teaching line firing exactly per isNotableSpelling on a correct tap"
  - "BuildSession.svelte: full completion summary (heading, rule statement, finalized formula strip + keyboard, Build Another / Recall It Now CTAs) replacing 12-04's placeholder"
affects: [12-06-fsrs-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Enharmonic 'common name' lookup reuses the SAME intervalFromRoot/transposeFrom simplest-enharmonic machinery PianoKeyboard's unhighlighted-black-key labeling already uses (chroma-matched against the 7 natural letters, falling back to the sharp/flat pair via blackKeysForOctaves(1) for accidental chromas) - no new enharmonic-preference heuristic"
    - "The just-earned CONSECUTIVE interval's own quality+degree word (step.interval.role, e.g. 'third') drives the enharmonic line's pluralized intervalWord, deliberately NOT the chord-tone role (step.role, e.g. 'seventh') - the teaching line describes the stacked interval, not the chord-tone position"
    - "'Build Another' is just 12-04's existing resetPicker() reused verbatim - it already never touches `kind`, so no new reset logic was needed to satisfy the 'kind preserved' requirement"

key-files:
  created: []
  modified:
    - src/lib/components/BuildSession.svelte
    - src/lib/components/buildSession.test.ts

key-decisions:
  - "countUpRevealed resets inside the existing resetSessionUiState() (called by both startChordConstruction/startScaleConstruction AND resetPicker), so a single reset point covers both 'new target picked mid-session' and 'Build Another' without duplicating reset logic"
  - "The scale-rule-statement's whole/half list uses a direct step.interval.quality check ('M' -> 'whole', else 'half'), not phraseStep's asScaleStep option - phraseStep returns the full 'whole step'/'half step' phrase (needed for the step-line copy), but the rule statement's list format needs the bare word since the sentence already implies steps (caught by a failing test against the UI-SPEC's literal 'C major: whole, whole, half...' example)"
  - "The enharmonic teaching line's copy template names 'the chord' verbatim even for scale targets (no scale-specific rewording), per the UI-SPEC's single literal template with no chord/scale variant for this specific line"

requirements-completed: [BUILD-01, BUILD-02, BUILD-03]

coverage:
  - id: D1
    description: "Opt-in 'Show the count-up hint' ghost toggle (chords only, never scales): reveals '{semitones} half step{s} up from {lastLetter}. Count it out.' (count only, destination letter never interpolated), stays revealed across step advances within the same target, and resets to hidden only when a brand-new target is picked."
    requirement: BUILD-03
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#BuildSession count-up hint (BUILD-03, 12-05 Task 1)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Enharmonic teaching line fires on a correct tap exactly when isNotableSpelling(letter) is true (double accidentals, or C♭/F♭/E♯/B♯), naming the simpler common name (via intervalFromRoot/transposeFrom against the current root), the chord/scale's own spelling, and the just-earned interval word pluralized - and never fires on a routine spelling."
    requirement: BUILD-03
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#a correct tap earning a notable spelling (Cdim7's B♭♭) shows the enharmonic teaching line"
        status: pass
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#a correct tap earning a routine spelling (Cm7's E♭) never shows the enharmonic teaching line"
        status: pass
    human_judgment: false
  - id: D3
    description: "Full completion summary replacing 12-04's placeholder: exact heading/rule-statement copy for both chords and scales, a fully-filled formula strip (no '?' remaining), a non-interactive display-mode PianoKeyboard, 'Build Another' (returns to the picker with the SAME kind preserved) and 'Recall It Now' (a real /recall link, no data write)."
    requirement: [BUILD-01, BUILD-02]
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#BuildSession completion summary (BUILD-01/02, 12-05 Task 2)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Manual browser verification of the full loop's real pacing/visual polish for both a complete Cm7 chord build and a complete G major scale build, per the plan's own human-check step (jsdom proves the state machine and DOM structure precisely, but not real browser feel)."
    verification: []
    human_judgment: true
    rationale: "The plan's verify block specifies a human-check for visual/pacing polish (the completion card's real rendering, keyboard finality, CTA navigation) that the automated jsdom suite cannot observe directly."

# Metrics
duration: 13min
completed: 2026-07-15
status: complete
---

# Phase 12 Plan 05: Count-up Hint, Enharmonic Teaching Line, and Completion Summary Summary

**Opt-in count-up hint and enharmonic teaching line layered onto BuildSession's construction loop, plus the full "Voila, you built it" completion summary (rule statement, finalized formula strip/keyboard, Build Another / Recall It Now CTAs) closing the BUILD-01/02/03 loop.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-07-15T14:59:35Z
- **Completed:** 2026-07-15T15:12:14Z
- **Tasks:** 2 (both TDD-authored: tests and implementation verified together before each task commit)
- **Files modified:** 2

## Accomplishments
- A "Show the count-up hint" ghost toggle renders for chords only, between steps (never while feedback is showing). Once tapped it reveals `"{semitones} half step{s} up from {lastLetter}. Count it out."` (destination letter never interpolated) and stays revealed across every subsequent step of the SAME target, resetting to hidden only when a brand-new target is picked (via a fresh pick or "Build Another").
- The enharmonic teaching line fires on a correct tap exactly when `isNotableSpelling` returns true (double accidentals, or C♭/F♭/E♯/B♯), rendering `"This key's usually called {commonName}, but {symbol} spells it {actualName} so the chord reads as a clean stack of {intervalWord}s."` - verified firing for Cdim7's B♭♭ ("This key's usually called A, but Cdim7 spells it B♭♭ so the chord reads as a clean stack of minor thirds.") and NOT firing for Cm7's routine E♭.
- `commonName` is derived via the existing `intervalFromRoot`/`transposeFrom` simplest-enharmonic machinery (chroma-matched against the natural letters, or the sharp/flat pair for accidental chromas) - no new enharmonic-preference heuristic was written.
- 12-04's placeholder `'complete'` state is replaced with the full completion summary: the exact heading (`"Voila. You built {symbol}."` / `"Voila. {tonic} major, built from scratch."`), the derived rule statement (comma/"then"-joined for chords, comma-joined whole/half list for scales), a fully-filled formula strip (zero `?` chips remaining), and a non-interactive, display-mode `PianoKeyboard` showing the completed spelling.
- "Build Another" resets to the picker with the current `kind` preserved (reuses 12-04's `resetPicker`, which never touches `kind`); "Recall It Now" is a plain `<a href="/recall">` via `Button`'s `href` prop, with no data write.
- `buildSession.test.ts` extended to 26 cases: the new count-up hint/enharmonic suite (Task 1), and a full end-to-end Cm7 chord run plus a full end-to-end G major scale run driven entirely through the public component API (Task 2), proving the whole picker-through-completion flow for both kinds.
- Zero regressions: the full 883-test suite and `svelte-check` (1282 files) both pass.

## Task Commits

Each task was committed atomically:

1. **Task 1: Count-up hint (chords only) + enharmonic teaching line** - `65d5b5d` (feat)
2. **Task 2: Full completion summary + comprehensive component test suite** - `215c9c1` (feat)

_Both tasks were implemented and their full test coverage validated together before each task's commit landed (tests and implementation pass jointly per task, per this plan's `tdd="true"` per-task attribute); no separate REFACTOR commit was needed for either task._

## Files Created/Modified
- `src/lib/components/BuildSession.svelte` - Modified: adds `countUpRevealed` state + toggle/reveal line, the enharmonic teaching-line computation (`commonNameFor`/`intervalWordFor` helpers) wired into `handleConstructTap`'s correct branch, and the full completion summary (`headingFor`/`ruleStatementFor` helpers) replacing the 12-04 placeholder
- `src/lib/components/buildSession.test.ts` - Modified: adds the count-up hint/enharmonic-line test suite (Task 1) and the completion-summary end-to-end test suite (Task 2), 26 total cases

## Decisions Made
- `countUpRevealed` resets inside the existing `resetSessionUiState()` (already called by both `startChordConstruction`/`startScaleConstruction` and `resetPicker`), so a single reset point correctly covers both "new target picked mid-session" and "Build Another" without duplicating reset logic.
- The enharmonic teaching line's `intervalWord` uses the just-earned step's own CONSECUTIVE interval word (`step.interval.role`, e.g. "third") rather than the chord-tone role (`step.role`, e.g. "seventh") - for Cdim7's B♭♭ (the chord's seventh, but reached via a stacked minor third), the correct phrase is "a clean stack of minor thirds," not "minor sevenths."
- The scale rule statement's whole/half list uses a direct `step.interval.quality` check (`'M'` -> `'whole'`, else `'half'`) rather than `phraseStep`'s `asScaleStep` option, since `phraseStep` returns the full `"whole step"`/`"half step"` phrase (needed for the per-step copy) but the rule-statement's list format needs the bare word, per the UI-SPEC's literal `"C major: whole, whole, half, ..."` example - caught by a failing test during authoring and fixed before the task's final verification pass.
- The enharmonic teaching line's copy is rendered verbatim from the UI-SPEC's single fixed template (naming "the chord" even for scale targets) since the UI-SPEC provides no separate scale-specific wording for this particular line.

## Deviations from Plan

None - plan executed exactly as written. One test-authoring correction (not a deviation from the specified behavior): the scale rule-statement's whole/half list initially used `phraseStep`'s `asScaleStep` phrasing ("whole step, whole step, ...") before a failing assertion against the UI-SPEC's literal example ("whole, whole, half, ...") caught the mismatch; fixed to the bare word before the task's tests/build/typecheck were confirmed green.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `BuildSession.svelte` now fully implements BUILD-01/02/03: picker, construction loop, count-up hint, enharmonic teaching, and the complete-state summary with both CTAs. No FSRS/deck imports exist yet in this plan's files, matching the prohibition - 12-06 owns wiring `recordGrade` for the `formula-build` mode at both the per-step and completion-summary seams.
- No blockers. `isNotableSpelling` (12-03) and the existing `intervalFromRoot`/`transposeFrom`/`blackKeysForOctaves` machinery (Phase 1-12 theory/keyboard layer) both integrated cleanly with zero adjustments needed on either side.

---
*Phase: 12-build-it-construction*
*Completed: 2026-07-15*

## Self-Check: PASSED

- FOUND: src/lib/components/BuildSession.svelte
- FOUND: src/lib/components/buildSession.test.ts
- FOUND: .planning/phases/12-build-it-construction/12-05-SUMMARY.md
- FOUND commit: 65d5b5d (feat(12-05): add opt-in count-up hint and enharmonic teaching line)
- FOUND commit: 215c9c1 (feat(12-05): add full construction completion summary)
