---
phase: 03-on-screen-drill-loop
plan: 01
subsystem: theory-engine
tags: [tonal, vitest, tdd, pitch-class-matching, drill-generation]

# Dependency graph
requires:
  - phase: 01-print-shop-foundation-theory-core
    provides: spellChord/ChordResult/SpelledNote theory engine, randomChord's ROOTS x QUALITY_SUFFIXES matrix
provides:
  - "matchChord: pure, source-agnostic pitch-class-set matcher (played vs target chord)"
  - "generateQuestion + pickDistractors + pickQuestionType: pure drill-question generator"
affects: [03-02, 03-03, 03-04, 04-midi-input]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure, framework-free $lib/drills modules mirroring $lib/theory's no-DOM/no-Svelte/total-function discipline"
    - "Local toAsciiAccidentals helper duplicated per module (matches chordPresentation.ts precedent) rather than shared import"
    - "Distractor generation reuses matchChord's chroma derivation instead of re-deriving pitch classes"

key-files:
  created:
    - src/lib/drills/matchChord.ts
    - src/lib/drills/matchChord.test.ts
    - src/lib/drills/generateQuestion.ts
    - src/lib/drills/generateQuestion.test.ts
  modified: []

key-decisions:
  - "matchChord compares only chroma (0-11) sets, never MIDI number or spelled-letter strings, so keyboard clicks and future MIDI note-on events share identical grading logic (D-01/D-02/D-03)"
  - "pickDistractors reuses matchChord(played=[], target) to derive a symbol's chroma set rather than duplicating chroma-extraction logic a second time"
  - "Distractor candidates are ordered near-miss-first (same root or same quality as the correct answer) before falling back to any other supported symbol, for pedagogical plausibility (D-05)"

patterns-established:
  - "Pure theory/drill modules: no DOM/Svelte/audio imports, total functions (never throw), co-located Vitest tests, JSDoc citing the decision IDs they satisfy"

requirements-completed: [DRILL-01, DRILL-02]

coverage:
  - id: D1
    description: "matchChord grades a played pitch-class set against a target chord by exact chroma-set equality, ignoring octave/order/duplicates, and treating enharmonic spellings as equal"
    requirement: "DRILL-01"
    verification:
      - kind: unit
        ref: "src/lib/drills/matchChord.test.ts#matchChord"
        status: pass
    human_judgment: false
  - id: D2
    description: "matchChord never throws and always returns a total { correct, missing, extra } result, including for an empty played set"
    requirement: "DRILL-01"
    verification:
      - kind: unit
        ref: "src/lib/drills/matchChord.test.ts#matchChord grades incorrect with all target chroma missing when the played set is empty / never throws for an empty played set"
        status: pass
    human_judgment: false
  - id: D3
    description: "generateQuestion produces a valid construction-or-identification question with a symbol drawn from the proven ROOTS x QUALITY_SUFFIXES matrix"
    requirement: "DRILL-02"
    verification:
      - kind: unit
        ref: "src/lib/drills/generateQuestion.test.ts#generateQuestion"
        status: pass
    human_judgment: false
  - id: D4
    description: "pickDistractors returns exactly 3 unique, parseable distractors, none enharmonically identical to the correct answer"
    requirement: "DRILL-02"
    verification:
      - kind: unit
        ref: "src/lib/drills/generateQuestion.test.ts#pickDistractors"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-13
status: complete
---

# Phase 3 Plan 1: Drill Logic Foundations Summary

**Pure chroma-set matcher (matchChord) and drill-question generator (generateQuestion/pickDistractors/pickQuestionType) built and unit-tested, with no DOM/Svelte/audio coupling so Phase 4 MIDI reuses matchChord unchanged.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-13T03:05:00Z
- **Completed:** 2026-07-13T03:17:00Z
- **Tasks:** 2
- **Files modified:** 4 (all new)

## Accomplishments
- `matchChord(played, target)`: source-agnostic pitch-class-set matcher; correct/missing/extra always by chroma (0-11), octave/order/duplicate-agnostic, enharmonic-agnostic, never throws.
- `generateQuestion()`, `pickDistractors()`, `pickQuestionType()`: pure question generator drawing exclusively from `randomChord`'s existing 12x8 matrix, with near-miss-first, bounded, non-enharmonic-identical distractor selection.
- 16 new unit tests (7 for matchChord, 9 for generateQuestion), all green; full suite remains 195/195 passing.

## Task Commits

Each task was committed atomically via the TDD RED/GREEN cycle:

1. **Task 1: matchChord pure pitch-class-set matcher**
   - `7aebd14` test(03-01): add failing test for matchChord pitch-class-set matcher
   - `c6d8472` feat(03-01): implement matchChord pure pitch-class-set matcher
2. **Task 2: generateQuestion + distractor generation + question-type picker**
   - `c50e9c3` test(03-01): add failing test for generateQuestion + distractor generation
   - `40a482f` feat(03-01): implement generateQuestion, pickDistractors, pickQuestionType

_TDD tasks: each is a RED (failing test, confirmed the module did not resolve) followed by a GREEN (implementation, all cases pass) commit. No REFACTOR commit needed for either task._

## Files Created/Modified
- `src/lib/drills/matchChord.ts` - Pure chroma-set matcher; `MatchResult` type + `matchChord(played, target)`.
- `src/lib/drills/matchChord.test.ts` - 7 cases: exact match, order/octave/duplicate-agnostic, enharmonic equivalence, extra note, missing note, empty-set, never-throws.
- `src/lib/drills/generateQuestion.ts` - `DrillQuestion` type + `generateQuestion()`, `pickDistractors()`, `pickQuestionType()`.
- `src/lib/drills/generateQuestion.test.ts` - 9 cases across pickDistractors, pickQuestionType, generateQuestion.

## Decisions Made
- `pickDistractors` derives a candidate's chroma set via `matchChord([], spellChord(candidate)).missing` (matchChord's own "missing = all target chroma when played is empty" behavior) instead of writing a second chroma-extraction routine, keeping the two modules DRY without cross-importing implementation internals beyond the public `matchChord` function.
- Distractor candidate ordering is near-miss-first (same root OR same quality as the correct answer, shuffled) then falls back to the shuffled remainder of the 96-cell space, so multiple-choice distractors read as plausible near-misses rather than arbitrary noise, per D-05's "plausible" requirement and Claude's Discretion.
- `pickQuestionType`'s 50/50 draw uses the same `Math.floor(Math.random() * n)` indexing style as `randomChord`, keeping both modules' randomness style consistent and easily pinned in tests via `vi.spyOn(Math, 'random')`.

## Deviations from Plan

None - plan executed exactly as written. Both tasks followed the RED/GREEN TDD cycle specified in the plan, used only the read_first analogs (chord.ts, types.ts, chord.test.ts, chordPresentation.ts, randomChord.ts), and produced exactly the exports the plan's `<action>` blocks specified.

## Issues Encountered

None. `tonal`'s `Note.chroma` behaved exactly as expected for both ASCII and glyph-converted accidental inputs (verified directly via a Node script before writing the matcher), and the `Math.random()` mocking pattern for `pickQuestionType`/`generateQuestion` determinism worked on the first attempt (`Math.floor(0 * 2) = 0` -> `'construction'`; `Math.floor(0.99 * 2) = 1` -> `'identification'`).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `matchChord` and `generateQuestion` are ready for Plan 02 (interactive `PianoKeyboard`) and Plan 03 (`/drills` construction slice) to consume directly.
- Both modules verified free of `svelte`/`$app`/DOM imports (grep-checked per acceptance criteria), so Phase 4's MIDI adapter can call `matchChord` unchanged (INPUT-03 foundation) with no refactor needed.
- No blockers. `npx vitest run` (195/195 passing) and `npm run check` (0 errors, 0 warnings) both green.

---
*Phase: 03-on-screen-drill-loop*
*Completed: 2026-07-13*

## Self-Check: PASSED

All created files verified present on disk; all 5 commits (2 RED, 2 GREEN, 1 docs) verified present in git log.
