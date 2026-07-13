---
phase: 03-on-screen-drill-loop
plan: 04
subsystem: ui
tags: [svelte5, drills, tdd, e2e, identification-drill, interleaving, score-register]

# Dependency graph
requires:
  - phase: 03-on-screen-drill-loop (plan 01)
    provides: generateQuestion identification branch (4 shuffled choices), matchChord
  - phase: 03-on-screen-drill-loop (plan 02)
    provides: PianoKeyboard interactive mode (selected/onToggle) and display mode (interval colors)
  - phase: 03-on-screen-drill-loop (plan 03)
    provides: "/drills construction-drill loop, feedback composition, .stamp animation, Drills nav link"
provides:
  - "Full interleaved /drills loop: construction + identification (DRILL-02, DRILL-03)"
  - "Next user-paced advancement (D-07), in-memory ScoreRegister (D-10)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Direct generateQuestion() draw for both kinds replaces Plan 03's loop-until-construction redraw, completing D-06 interleaving with zero mode-toggle surface"
    - "Shared recordGrade(correct) helper centralizes score-state mutation and variant-text selection for both construction Check and identification tap grading paths"

key-files:
  created: []
  modified:
    - src/routes/drills/+page.svelte
    - tests/drills.e2e.test.ts

key-decisions:
  - "generateQuestion() is now called directly on load and on every Next, removing Plan 03's construction-only redraw loop entirely; both kinds interleave with no mode toggle per D-06 and Claude's Discretion in 03-CONTEXT.md"
  - "Identification's wrong-answer reveal renders a ChordGlyph of the correct symbol above the shared keyboard/interval-formula reveal, since the user was naming the chord and needs the symbol shown; the You played/Correct diff row stays construction-only since identification has no assembled note-set to diff"
  - "A single recordGrade(correct) helper is shared by checkAnswer (construction) and selectChoice (identification) so score mutation and confirmation/headline variant selection have exactly one implementation for both directions"

patterns-established:
  - "Deterministic Math.random re-arming must happen BEFORE the click that triggers a synchronous re-draw (e.g. before clicking Next), not after, since the mocked draws array is consumed at click time, not at the next assertion"

requirements-completed: [DRILL-02, DRILL-03]

coverage:
  - id: D8
    description: "An identification question shows 'Name this chord.', the interval-colored mystery keyboard, and 4 Answer choices with no give-away chord-glyph symbol for the prompt"
    requirement: "DRILL-02"
    verification:
      - kind: e2e
        ref: "tests/drills.e2e.test.ts#drills page identification prompt"
        status: pass
    human_judgment: false
  - id: D9
    description: "Tapping the correct choice grades immediately (no Check step) and shows the shared right-answer stamp confirmation"
    requirement: "DRILL-02"
    verification:
      - kind: e2e
        ref: "tests/drills.e2e.test.ts#drills page identification immediate grading > grades the correct choice immediately with no separate Check step"
        status: pass
    human_judgment: false
  - id: D10
    description: "Tapping a wrong choice reveals the wrong-answer headline, the correct symbol, the interval formula, and the teaching keyboard reveal, matching construction's DRILL-03 elaborative feedback"
    requirement: "DRILL-03"
    verification:
      - kind: e2e
        ref: "tests/drills.e2e.test.ts#drills page identification immediate grading > reveals the correct symbol, interval formula, and wrong-answer headline on an incorrect choice"
        status: pass
    human_judgment: false
  - id: D11
    description: "Choice buttons lock (disabled) once the question is answered, preventing a second grade on the same question"
    requirement: "DRILL-02"
    verification:
      - kind: e2e
        ref: "tests/drills.e2e.test.ts#drills page identification immediate grading > locks further choice taps once answered"
        status: pass
    human_judgment: false
  - id: D12
    description: "Next is absent before answering, appears only after an answer, clears feedback/selection on click, draws a fresh question, and never auto-fires"
    requirement: "DRILL-03"
    verification:
      - kind: e2e
        ref: "tests/drills.e2e.test.ts#drills page Next advances the loop"
        status: pass
    human_judgment: false
  - id: D13
    description: "ScoreRegister reads '0 RIGHT · 0 STREAK' on load (literal mid-dot), increments both on a correct answer, and resets streak to 0 while keeping the correct count on a wrong answer"
    requirement: "DRILL-03"
    verification:
      - kind: e2e
        ref: "tests/drills.e2e.test.ts#drills page ScoreRegister"
        status: pass
    human_judgment: false
  - id: D14
    description: "No em dashes in drill-page copy; no localStorage write anywhere in the page (score is in-memory only, D-10)"
    requirement: "DRILL-03"
    verification:
      - kind: other
        ref: "grep -n \"—\" and grep -n \"localStorage\" against src/routes/drills/+page.svelte: no em dash hits, localStorage appears only inside a code comment, never called"
        status: pass
    human_judgment: false

# Metrics
duration: 4min
completed: 2026-07-13
status: complete
---

# Phase 3 Plan 4: Identification Drill, Interleaving, Next, and Score Summary

**Completed the /drills loop by adding the identification direction (mystery notes -> 4-option multiple choice, graded on tap), replacing Plan 03's construction-only redraw with true interleaving of both directions, a user-paced Next action, and an in-memory ScoreRegister, so the full phase goal (two-way chord fluency, on-screen only, with teaching feedback) is met.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-13T01:28:05Z
- **Completed:** 2026-07-13T01:32:24Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `tests/drills.e2e.test.ts`: 9 new e2e scenarios (identification prompt, immediate grading correct/wrong, input-lock after answering, Next appears-only-after-answer/clears feedback/never-auto-fires, ScoreRegister zero-state/increment/streak-reset), all passing alongside Plan 03's 7 original construction scenarios (16/16 in this file).
- `src/routes/drills/+page.svelte`: identification branch (display-mode mystery keyboard, `Name this chord.` instruction, 4-option `ChoiceGrid` of ghost `Button`s with serif Heading-size symbols and `Answer: {symbol}` aria-labels), full interleaving via a direct `generateQuestion()` draw on load and on every `Next`, a `Next` button that redraws and resets per-question state in one handler, and an in-memory-only `ScoreRegister` (`{correct} RIGHT · {streak} STREAK`, mid-dot separator).
- Shared `FeedbackBanner` composition extended (not forked) to cover identification's wrong-answer reveal: the same inverted-ink headline bar, `Here is the shape:` lead-in, keyboard reveal, and interval-formula chip row as construction, plus a `ChordGlyph` reveal of the correct symbol; the `You played` / `Correct` diff row stays construction-only per the UI-SPEC.
- Full suite: 215/215 passing (was 206 before this plan); `npm run check`: 0 errors, 0 warnings.

## Task Commits

Each task followed the RED/GREEN TDD cycle:

1. **Task 1 (RED):** `ac0dbdf` test(03-04): add failing e2e scenarios for identification, Next, and score
2. **Task 2 (GREEN):** `26296ad` feat(03-04): build identification branch, interleaving, Next, and ScoreRegister

## Files Created/Modified
- `tests/drills.e2e.test.ts` - 9 new scenarios; a second `forceIdentificationCm7()` deterministic-draw helper mirrors Plan 03's `forceConstructionCm7()`, forcing root C / quality m7 / question-type identification.
- `src/routes/drills/+page.svelte` - Identification branch, interleaving (removed the construction-only redraw loop), `Next`, `ScoreRegister`, shared `recordGrade` helper.

## Decisions Made
- `generateQuestion()` is now drawn directly for both kinds, on load and on every `Next`, fully replacing Plan 03's `generateConstructionQuestion()` loop-until-construction helper (deleted). This completes D-06 interleaving with no mode toggle, exactly as 03-CONTEXT's Claude's Discretion default specified.
- The identification wrong-answer reveal renders a `ChordGlyph` of the correct symbol (in addition to the shared keyboard + interval-formula reveal), since the user was naming the chord and the symbol itself is the piece of information they got wrong; this is gated to `question.kind === 'identification'` only, keeping the construction reveal byte-identical to Plan 03.
- A single `recordGrade(correct)` helper is shared between `checkAnswer` (construction) and `selectChoice` (identification) so score-state mutation (`correct`/`streak` counters) and confirmation/headline variant-picking exist in exactly one place for both directions, rather than duplicated per-branch logic.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test assertion `getByText('Cm7')` could never match ChordGlyph's split text nodes**
- **Found during:** Task 2 verification (`npx vitest run tests/drills.e2e.test.ts`)
- **Issue:** The RED test asserted `within(feedback).getByText('Cm7')` to confirm the correct symbol is revealed on a wrong identification answer, but `ChordGlyph` renders the root (`"C"`) and the quality (`"m7"`, inside a `<sup>`) as two separate DOM text nodes, so no single node's text content is ever `"Cm7"`.
- **Fix:** Changed the assertion to `getAllByText('C')` and `getAllByText('m7')` (each `.length > 0`), matching how the component actually renders rather than an idealized concatenated string.
- **Files modified:** `tests/drills.e2e.test.ts`
- **Verification:** The scenario passes; no production code changed (this was a test-authoring bug, not a `ChordGlyph` defect - Plan 01's `ChordGlyph` contract is unchanged and correctly reused).
- **Committed in:** `26296ad` (GREEN commit)

**2. [Rule 1 - Bug] Streak-reset test re-armed the deterministic Math.random draws AFTER clicking Next instead of before**
- **Found during:** Task 2 verification
- **Issue:** The RED test called `forceIdentificationCm7()` after clicking `Next`, but `nextQuestion()`'s `generateQuestion()` draw happens synchronously inside the `Next` click handler, consuming whatever mock was active at click time (the first test's mock, already exhausted and clamped to its last array value, drew a different root than `C`). The test then asserted against a wrong-answer choice that wasn't actually a distractor for the drawn question, producing `2 RIGHT · 2 STREAK` instead of the expected `1 RIGHT · 0 STREAK`.
- **Fix:** Moved the `forceIdentificationCm7()` re-arm call to before the `Next` click, so the deterministic draws are active when `nextQuestion()`'s `generateQuestion()` call actually consumes them.
- **Files modified:** `tests/drills.e2e.test.ts`
- **Verification:** The scenario passes; `score-register` reads `1 RIGHT · 0 STREAK` as expected.
- **Committed in:** `26296ad` (GREEN commit)

**3. [Rule 1 - Bug] Unused `identificationCorrect` state variable left over from an initial draft**
- **Found during:** Task 2, self-review before committing
- **Issue:** An early draft of `selectChoice` set an `identificationCorrect` state flag intended to gate the correct-symbol reveal, but the reveal ended up correctly gated by `question.kind === 'identification'` alone (identical for both correct and wrong answers within that branch), leaving `identificationCorrect` unread anywhere in the template - dead state.
- **Fix:** Removed the `identificationCorrect` declaration, its assignment in `selectChoice`, and its reset in `nextQuestion`.
- **Files modified:** `src/routes/drills/+page.svelte`
- **Verification:** Full suite (215/215) and `npm run check` (0 errors) both still green after removal.
- **Committed in:** `26296ad` (GREEN commit)

---

**Total deviations:** 3 (all Rule 1 auto-fixes: two test-authoring bugs caught turning RED to GREEN, one dead-code cleanup before commit)
**Impact on plan:** None. No acceptance criteria were skipped, weakened, or reinterpreted; all three fixes align the test suite and implementation with the plan's own specified behavior (immediate identification grading, shared DRILL-03 feedback, Next's synchronous redraw).

## Issues Encountered

None beyond the three deviations above, all caught and resolved during Task 2's own verification loop before committing.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 3's full success criteria are met: DRILL-01/02/03 and INPUT-02 are all implemented on `/drills`, with both fluency directions interleaved, immediate grading, shared teaching feedback, user-paced `Next`, and an in-memory `ScoreRegister`.
- `matchChord` remains a pure, source-agnostic pitch-class matcher untouched by this plan, ready for Phase 4's MIDI adapter to call unchanged (INPUT-01/INPUT-03 foundation, per Plan 01's original design intent).
- No blockers. Full suite (215/215) and `npm run check` (0 errors, 0 warnings) both green. Phase 3 is ready for verification/close-out.

---
*Phase: 03-on-screen-drill-loop*
*Completed: 2026-07-13*

## Self-Check: PASSED

- FOUND: .planning/phases/03-on-screen-drill-loop/03-04-SUMMARY.md
- FOUND: src/routes/drills/+page.svelte
- FOUND: tests/drills.e2e.test.ts
- FOUND commit: ac0dbdf (test)
- FOUND commit: 26296ad (feat)
- FOUND commit: b8b7aed (docs: summary)
