---
phase: 25-contextual-learning-from-session-6-sketches-progression-dril
plan: 06
subsystem: ui
tags: [svelte5, i18n, localstorage, metacognition, recall, tdd]

# Dependency graph
requires:
  - phase: 25-04
    provides: "confidenceLog.ts: logConfidence/listConfidence + Confidence type"
provides:
  - "RecallSession formula-mode optional confidence dots (? ~ !) that log a confidence entry (picked level or 'unrated') paired with correctness on every grade"
affects: [25-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Content-flow enrichment control living outside .review-action-dock, a deliberate documented exception to the 014 docked-actions rule (rating is optional, never a required action)"

key-files:
  created: []
  modified:
    - src/lib/components/RecallSession.svelte
    - src/lib/i18n/messages/recall.ts
    - src/lib/components/recallSession.test.ts

key-decisions:
  - "Confidence dots render in the formula-mode template block generically (all three factKinds: chord-formula/interval-size/scale-degree), not gated to chord-formula only, matching the plan's 'under the prompt' wording rather than the sketch's chord-specific mock"
  - "logConfidence call sites use currentCard.factId/currentCard.mode (not currentItem), so the logged record always matches the card that was actually graded even if the queue reorders on advanceQueue"
  - "Tapping an already-picked dot again clears it back to undefined (toggle-off), which then logs as 'unrated' rather than forcing a pick to be sticky"

patterns-established:
  - "Confidence dot row: role=group button set with aria-pressed toggle state, gone entirely once revealed (no post-hoc re-rating), CSS .conf-dot/.conf-dot.picked lifted verbatim from the sketch 020-B reference"

requirements-completed: [SK-020B]

coverage:
  - id: D1
    description: "Three optional serif confidence dots (? ~ !) render under the formula-mode prompt in content flow (not the action dock), with a one-line mono legend, gone once revealed"
    requirement: "SK-020B"
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#RecallSession confidence dots (sketch 020-B: optional, never gates, logs on grade) > never gates Reveal or grading"
        status: pass
    human_judgment: false
  - id: D2
    description: "Picking a dot never blocks or gates Reveal; grading commits regardless of whether a dot was chosen, and the pick can be toggled off back to unrated"
    requirement: "SK-020B"
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#RecallSession confidence dots (sketch 020-B: optional, never gates, logs on grade) > never gates Reveal or grading"
        status: pass
    human_judgment: false
  - id: D3
    description: "On grade, a confidence entry is logged (picked dot or 'unrated', correct = Good/Easy) via 25-04's logConfidence, and the pick resets between cards"
    requirement: "SK-020B"
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#RecallSession confidence dots (sketch 020-B: optional, never gates, logs on grade) > logs confidence \"certain\" and correct:true when grading Good after picking the ! dot"
        status: pass
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#RecallSession confidence dots (sketch 020-B: optional, never gates, logs on grade) > logs confidence \"unrated\" when grading Again (wrong) without picking any dot"
        status: pass
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#RecallSession confidence dots (sketch 020-B: optional, never gates, logs on grade) > resets the confidence pick between cards: a pick on card A never leaks onto card B"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-07-21
status: complete
---

# Phase 25 Plan 06: Confidence Dots Capture (Sketch 020-B) Summary

**Optional ? ~ ! confidence dots added to Recall's formula-mode reveal-then-grade card, logging every graded review's confidence (or 'unrated') paired with correctness via 25-04's confidenceLog, never gating Reveal.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-21T18:14:00Z
- **Completed:** 2026-07-21T18:18:00Z
- **Tasks:** 2 completed
- **Files modified:** 3

## Accomplishments
- Three serif glyph dots (`?` not sure / `~` somewhat / `!` certain), 44px square, zero radius, render in content flow between the formula-mode prompt and the keyboard/reveal region, with a one-line mono legend below - never inside `.review-action-dock`, and gone entirely once the card is revealed.
- `selectedConfidence` per-card `$state<Confidence | undefined>` toggles on tap (tapping the picked dot again clears it), resets to `undefined` inside the existing `resetPerCardState()` seam so every new card starts unrated.
- `handleGrade` now calls `logConfidence({ factId, mode, confidence: selectedConfidence ?? 'unrated', correct, at })` using the just-graded card's own factId/mode, wrapped in an inner try/catch so a logging failure can never block the FSRS grade commit.
- New `recall.confidence.*` i18n keys (group aria label, three per-level aria labels, mono legend line) added to both EN and FR blocks; the literal glyphs themselves stay untranslated per the existing chord-glyph/interval-shorthand immunity convention.
- 4 new regression tests cover: certain+correct logging, unrated-when-skipped logging, no-gating (dots gone post-reveal, toggle-off works, Reveal/grade unaffected either way), and reset-between-cards (a pick on card A never leaks onto card B).

## Task Commits

Each task was committed atomically:

1. **Task 1: Confidence dots UI + per-card state + recall i18n keys** - `22a4431` (feat)
2. **Task 2: Log confidence on grade + reset + regression tests** - `90439b2` (test)

**Plan metadata:** (this commit, follows)

## Files Created/Modified
- `src/lib/components/RecallSession.svelte` - New `selectedConfidence` state (reset in `resetPerCardState`), the confidence-dot row + `.conf-dot`/`.conf-dot.picked` scoped CSS in the formula-mode template block, and the `logConfidence` call inside `handleGrade`
- `src/lib/i18n/messages/recall.ts` - New `recall.confidence.*` keys (group-aria, aria.unsure/somewhat/certain, legend) in EN + FR
- `src/lib/components/recallSession.test.ts` - New describe block with 4 confidence-dot regression tests, asserting against the real `confidenceLog` module (localStorage cleared per test)

## Decisions Made
- Confidence dots render for all three formula-mode factKinds (chord-formula, interval-size, scale-degree), not just chord-formula, since the plan's must-haves describe the dots as a formula-mode-wide feature ("under the prompt") rather than chord-specific.
- `logConfidence`'s factId/mode come from `currentCard` (the record actually being graded), not `currentItem` (the queue pointer), so the log entry is correct even though `advanceQueue` mutates the queue in the same function.
- Toggling the already-picked dot off is treated as returning to the unrated state (not a locked-in pick), consistent with "optional and never blocks" - there is no scenario where a user is stuck having committed a dot.

## Deviations from Plan

**1. [TDD gate ordering] Task 2's implementation (the `logConfidence` call in `handleGrade`) was written and committed as part of Task 1's `feat` commit rather than in its own RED-then-GREEN sequence.**
- **Found during:** Task 1 implementation - while wiring the confidence-dot UI and per-card state, the natural next step (reading `RecallSession.svelte`'s existing `handleGrade`) made it clear the logging call belonged in the same seam, and it was added inline.
- **Impact:** Task 2's regression tests (written afterward, in the `test(25-06)` commit) therefore never observed a RED (failing) state before GREEN - the implementation was already present when the tests were written and ran green on first execution.
- **Verification:** All 4 new tests pass; the full existing 61-test `recallSession.test.ts` suite plus the full project suite (101 files, 1417 tests) stayed green; `npm run check` is 0 errors/0 warnings.
- **Assessment:** No functional risk - the behavior is correctly implemented and covered by tests - but this deviates from the plan's `tdd="true"` RED->GREEN gate sequence for Task 2. Documented below under TDD Gate Compliance rather than re-ordering commits after the fact.

---

**Total deviations:** 1 (TDD gate ordering, no functional impact)
**Impact on plan:** None on correctness or scope; purely a commit-sequencing note.

## TDD Gate Compliance

Task 2 was marked `tdd="true"`. The plan expected RED (failing test commit) then GREEN (implementing feat commit). In practice the implementation landed in Task 1's `feat(25-06)` commit (`22a4431`) before the test commit `test(25-06)` (`90439b2`) - GREEN before a dedicated RED. No `test(...)` commit precedes a `feat(...)` commit for this specific behavior in the git log. Functionality and coverage are complete and verified (see Deviations above); flagging here per the gate-sequence-validation requirement.

## Issues Encountered
None - all verification commands (`npx vitest run src/lib/i18n/coverage.test.ts`, `npx vitest run src/lib/components/recallSession.test.ts`, `npm run check`, full project `npx vitest run`) passed cleanly on first attempt.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Every graded formula-mode review now writes a `ConfidenceEntry` (via 25-04's `logConfidence`) with the picked level or `'unrated'` plus correctness, ready for 25-08's `/progress` calibration-bar and danger-cards payoff view to consume via `listConfidence()`/`calibration()`/`dangerCards()`.
- No blockers. Full project suite (101 files, 1417 tests) and `npm run check` (0 errors/0 warnings, 1351 files) both green after this plan.

---
*Phase: 25-contextual-learning-from-session-6-sketches-progression-dril*
*Completed: 2026-07-21*

## Self-Check: PASSED

- FOUND: src/lib/components/RecallSession.svelte
- FOUND: src/lib/i18n/messages/recall.ts
- FOUND: src/lib/components/recallSession.test.ts
- FOUND: .planning/phases/25-contextual-learning-from-session-6-sketches-progression-dril/25-06-SUMMARY.md
- FOUND commit: 22a4431
- FOUND commit: 90439b2
