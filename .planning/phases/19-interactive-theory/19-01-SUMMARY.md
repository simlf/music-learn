---
phase: 19-interactive-theory
plan: 01
subsystem: theory-engine
tags: [tonal, chroma-grading, lessons, unit-tests]

requires:
  - phase: 03-drill-answer-checking
    provides: gradeIntervalTap chroma-comparison pattern (Note.chroma(toAsciiAccidentals(letter)))
  - phase: 01-foundation
    provides: SpelledNote/IntervalRole shapes in $lib/theory/types.ts
provides:
  - LessonStep type, the locked four-step THIRDS_LESSON content array
  - gradeLessonTap (chroma-only, enharmonic-blind, total tap grading)
  - semitonesFromC (count-hint distance helper for wrong-tap retry copy)
  - THIRDS_LESSON_DRILL_SEEDS (['C', 'Cm'] handoff pair for LEARN-03)
affects: [19-02, 19-03, interactive-lesson-component, drills-handoff]

tech-stack:
  added: []
  patterns:
    - "Pure theory-engine module (no Svelte/audio/DOM), mirrors $lib/theory/types.ts purity convention"
    - "Chroma-only grading via Note.chroma(toAsciiAccidentals(letter)), never letter-string equality (locked v2 constraint)"

key-files:
  created:
    - src/lib/lessons/thirdsLesson.ts
    - src/lib/lessons/thirdsLesson.test.ts
  modified: []

key-decisions:
  - "Body copy stores the literal **phrase** markdown-style emphasis markers verbatim from the UI-SPEC Copywriting Contract table; the component (Plan 19-03) owns parsing them into verdigris-colored spans."
  - "LessonStep shape kept deliberately generic (title/body/targetChroma/role/letter/hearable/correctLine/wrongHint) so future lessons can ship as additional LessonStep[] arrays without changing grading or component logic."

patterns-established:
  - "Lesson content + grading modules live in $lib/lessons/, split from UI exactly like $lib/drills/generateIntervalQuestion.ts splits grading from drill UI."

requirements-completed: [LEARN-01]

coverage:
  - id: D1
    description: "LessonStep type and locked four-step THIRDS_LESSON data (anchor C, major third E, hear-it, minor third E-flat) with drill-seed pair"
    requirement: "LEARN-01"
    verification:
      - kind: unit
        ref: "src/lib/lessons/thirdsLesson.test.ts#THIRDS_LESSON content invariants"
        status: pass
    human_judgment: false
  - id: D2
    description: "gradeLessonTap grades taps by chroma only (enharmonic-blind) and semitonesFromC computes the wrong-tap count-hint distance, both total (never throw)"
    requirement: "LEARN-01"
    verification:
      - kind: unit
        ref: "src/lib/lessons/thirdsLesson.test.ts#gradeLessonTap (chroma-only, enharmonic-blind, total)"
        status: pass
      - kind: unit
        ref: "src/lib/lessons/thirdsLesson.test.ts#semitonesFromC"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-07-18
status: complete
---

# Phase 19 Plan 01: Thirds Lesson Data + Chroma Grading Summary

**Pure data + grading module for the major-vs-minor-third interactive lesson: four locked LessonStep entries, chroma-only tap grading (enharmonic-blind), and the count-hint/drill-seed helpers, ready for Wave 2's InteractiveLesson component.**

## Performance

- **Duration:** 10 min
- **Tasks:** 2 completed
- **Files modified:** 2 (both new)

## Accomplishments

- `LessonStep` interface and the locked four-step `THIRDS_LESSON` array (targetChroma sequence `[0, 4, null, 3]`), copy taken verbatim from the UI-SPEC Copywriting Contract, no em dashes
- `gradeLessonTap` and `semitonesFromC`: chroma-only comparison via `Note.chroma(toAsciiAccidentals(letter))`, mirroring `gradeIntervalTap`'s existing pattern, enharmonic-blind (D♯ grades true against E♭'s `targetChroma: 3`), total (never throw)
- `THIRDS_LESSON_DRILL_SEEDS = ['C', 'Cm']` for the LEARN-03 drill handoff
- 15 unit tests covering content invariants, grading behavior, and the count-hint helper, all passing; zero new type errors; full project test suite (76 files, 1062 tests) unaffected

## Task Commits

Each task was committed atomically:

1. **Task 1: Define LessonStep type + THIRDS_LESSON data + seed constant** - `07ab376` (feat)
2. **Task 2: Add gradeLessonTap + semitonesFromC chroma helpers and their tests** - `8117788` (test, RED) then `715e210` (feat, GREEN)

## TDD Gate Compliance

Task 2 (`tdd="true"`) followed the RED/GREEN cycle correctly:
- RED: `8117788` — failing test file added (11 of 15 tests failed on missing exports, confirmed before any implementation)
- GREEN: `715e210` — `gradeLessonTap`/`semitonesFromC` implemented, all 15 tests pass

No REFACTOR commit was needed; the implementation matched the plan's exact pattern with no cleanup required.

## Files Created/Modified

- `src/lib/lessons/thirdsLesson.ts` - LessonStep type, THIRDS_LESSON (4 steps), THIRDS_LESSON_DRILL_SEEDS, gradeLessonTap, semitonesFromC. Pure module: only imports `tonal`'s `Note` and `$lib/theory/interval`'s `toAsciiAccidentals`/`$lib/theory/types`'s `IntervalRole` — no Svelte/audio/DOM.
- `src/lib/lessons/thirdsLesson.test.ts` - 15 tests: content invariants (length, targetChroma sequence, flat-glyph letter, drill seeds), gradeLessonTap behavior (correct/wrong/enharmonic/null-step/unparseable/octave-agnostic), semitonesFromC behavior (E=4, E♭=3, C=0, B=11).

## Decisions Made

- Body copy stores the literal `**phrase**` markdown-style emphasis markers verbatim as specified in the UI-SPEC Copywriting Contract table (e.g. "That's a **major third**: open, bright, the happy sound."). This is the "existing emphasis convention" the plan referred to; Wave 2's InteractiveLesson component owns parsing `**...**` into verdigris-colored inline spans.
- No deviation from the planner's note correcting `letterToSolfege`'s location — this plan's tasks never needed `letterToSolfege` (that import belongs to the Wave 2 component per 19-PATTERNS.md), so no import was added here.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `src/lib/lessons/thirdsLesson.ts` exports everything Plan 19-03's `InteractiveLesson.svelte` needs verbatim: `LessonStep`, `THIRDS_LESSON`, `THIRDS_LESSON_DRILL_SEEDS`, `gradeLessonTap`, `semitonesFromC`.
- Module is pure and fully unit-tested in isolation; ready for Wave 2 (component) and Wave 3 (drills SOURCE_TAGS extension) consumption with no further changes anticipated to this file.
- No blockers.

---
*Phase: 19-interactive-theory*
*Completed: 2026-07-18*

## Self-Check: PASSED

- FOUND: src/lib/lessons/thirdsLesson.ts
- FOUND: src/lib/lessons/thirdsLesson.test.ts
- FOUND: 07ab376 (Task 1 commit)
- FOUND: 8117788 (Task 2 RED commit)
- FOUND: 715e210 (Task 2 GREEN commit)
- FOUND: 979ddbe (SUMMARY commit)
