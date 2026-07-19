---
phase: 19-interactive-theory
plan: 02
subsystem: practice-engine
tags: [svelte, tdd, localStorage, session-model, drills]

requires:
  - phase: 19-interactive-theory
    provides: "THIRDS_LESSON_DRILL_SEEDS (['C','Cm']) from Plan 19-01, the seed pair Wave 2's InteractiveLesson will hand off through this plan's channel"
provides:
  - "LESSON_SEEDS_KEY / setLessonSeeds / consumeLessonSeeds — a dedicated one-shot localStorage channel for lesson-to-drills handoffs, independent of the existing drill-seeds (Progress weak-list) channel"
  - "QuestionSource union gains 'seeded_lesson'; SessionItem gains optional origin?: 'weak' | 'lesson', threaded through nextQuestion's seeded branch"
  - "Drills page init consumes both one-shot channels (lesson wins on precedence, both always cleared) and renders SOURCE_TAGS.seeded_lesson = 'FROM YOUR LESSON'"
affects: [19-03, interactive-lesson-component]

tech-stack:
  added: []
  patterns:
    - "Two independent one-shot localStorage handoff channels (drill-seeds, lesson-seeds) sharing an identical defensive contract (try/catch, JSON round-trip, one-shot clear-on-read, non-string filtering) but never sharing a key"
    - "SessionItem.origin is a UX-label-only field (never participates in dedupe key, never leaks into NextQuestionPlan) that fans out into a distinct QuestionSource at read time"

key-files:
  created: []
  modified:
    - src/lib/practice/drillSeeds.ts
    - src/lib/practice/drillSeeds.test.ts
    - src/lib/practice/session.ts
    - src/lib/practice/session.test.ts
    - src/routes/drills/+page.svelte
    - src/routes/drillsSongFilter.test.ts
    - tests/drills.e2e.test.ts
    - tests/reveal-insight.e2e.test.ts
    - tests/practice.e2e.test.ts

key-decisions:
  - "Lesson seeds win over weak-list seeds when both channels are somehow present at drills init; both channels are always consumed (cleared) regardless of which one wins, so neither can leak into a later session"
  - "origin never participates in dedupeItems' family+symbol dedupe key: a symbol seeded by both a lesson and the weak list collapses to one queued item, which is acceptable since origin is a UX label, not a correctness signal"

patterns-established:
  - "New one-shot localStorage handoff channels mirror drillSeeds.ts's setX/consumeX pair byte-for-byte (try/catch, JSON round-trip, one-shot remove-on-read, non-string filter, [] on any failure) rather than introducing new persistence plumbing"

requirements-completed: [LEARN-03]

coverage:
  - id: D1
    description: "Dedicated lesson-seeds one-shot channel (LESSON_SEEDS_KEY/setLessonSeeds/consumeLessonSeeds), independent of the drill-seeds channel"
    requirement: "LEARN-03"
    verification:
      - kind: unit
        ref: "src/lib/practice/drillSeeds.test.ts#lesson seeds one-shot handoff (InteractiveLesson -> /drills)"
        status: pass
    human_judgment: false
  - id: D2
    description: "QuestionSource gains 'seeded_lesson'; a lesson-origin seed grades to source 'seeded_lesson' while an origin-less seed still grades to 'seeded' (backward compatible)"
    requirement: "LEARN-03"
    verification:
      - kind: unit
        ref: "src/lib/practice/session.test.ts#nextQuestion priorities > a lesson-origin seed yields plan source \"seeded_lesson\""
        status: pass
      - kind: unit
        ref: "src/lib/practice/session.test.ts#nextQuestion priorities > an origin-less seed still yields plan source \"seeded\" (backward compatible)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Drills init consumes both seed channels (lesson wins on precedence); SOURCE_TAGS.seeded_lesson renders 'FROM YOUR LESSON', existing 'FROM YOUR WEAK LIST' untouched"
    requirement: "LEARN-03"
    verification:
      - kind: e2e
        ref: "src/routes/drillsSongFilter.test.ts#Lesson-seeds handoff to Drills (LEARN-03) > renders FROM YOUR LESSON for a lesson-seeded question, never FROM YOUR WEAK LIST"
        status: pass
      - kind: e2e
        ref: "src/routes/drillsSongFilter.test.ts#Lesson-seeds handoff to Drills (LEARN-03) > a plain weak-list seed (no lesson seeds present) still renders FROM YOUR WEAK LIST"
        status: pass
      - kind: e2e
        ref: "src/routes/drillsSongFilter.test.ts#Lesson-seeds handoff to Drills (LEARN-03) > lesson seeds take precedence over weak-list seeds when both channels are present"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-07-18
status: complete
---

# Phase 19 Plan 02: /drills LEARN-03 Handoff Summary

**A dedicated `music-learn:lesson-seeds` one-shot localStorage channel, a new `seeded_lesson` question source threaded through the pure session model, and the locked "FROM YOUR LESSON" tag on the drills page, all fully independent of the existing Progress weak-list handoff.**

## Performance

- **Duration:** 10 min
- **Tasks:** 3 completed
- **Files modified:** 5 planned + 3 pre-existing e2e suites fixed (deviation)

## Accomplishments

- `LESSON_SEEDS_KEY`, `setLessonSeeds`, `consumeLessonSeeds` in `drillSeeds.ts`, mirroring the existing `setDrillSeeds`/`consumeDrillSeeds` pair exactly (defensive try/catch, JSON round-trip, one-shot clear on read, non-string filtering), with explicit channel-independence tests
- `QuestionSource` gains `'seeded_lesson'`; `SessionItem` gains optional `origin?: 'weak' | 'lesson'`; `nextQuestion`'s seeded branch now emits `source: seed.origin === 'lesson' ? 'seeded_lesson' : 'seeded'` with `NextQuestionPlan`'s shape unchanged
- Drills page init consumes both one-shot channels (lesson wins on precedence, both always cleared); `SOURCE_TAGS.seeded_lesson = 'FROM YOUR LESSON'` added alongside the untouched `seeded: 'FROM YOUR WEAK LIST'`
- Full project test suite (76 files, 1073 tests) green; `npm run check` reports 0 errors/0 warnings across 1298 files

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the dedicated lesson-seeds one-shot channel** - `4c0b532` (test, RED) then `eb76f15` (feat, GREEN)
2. **Task 2: Thread lesson origin through the pure session model as 'seeded_lesson'** - `c890d12` (test, RED) then `06c8562` (feat, GREEN)
3. **Task 3: Consume lesson seeds and render the FROM YOUR LESSON tag on /drills** - `7a628db` (feat)
4. **Deviation fix (Rule 3):** `e763305` (fix) - repaired three pre-existing e2e suites broken by Task 3's new import

## TDD Gate Compliance

Task 1 and Task 2 (both `tdd="true"`) followed the RED/GREEN cycle correctly:
- Task 1 RED: `4c0b532` - failing lesson-channel tests added and confirmed failing (`setLessonSeeds is not a function`) before any implementation existed
- Task 1 GREEN: `eb76f15` - `setLessonSeeds`/`consumeLessonSeeds` implemented, all 10 tests in the file pass
- Task 2 RED: `c890d12` - failing lesson-origin-source assertion added and confirmed failing (`expected 'seeded_lesson', received 'seeded'`) before the implementation change
- Task 2 GREEN: `06c8562` - `QuestionSource`/`SessionItem`/`nextQuestion` updated, all 24 tests in the file pass

Task 3 (`type="auto"`, no `tdd` flag) followed standard implement-then-verify flow; no REFACTOR commit was needed for any task.

## Files Created/Modified

- `src/lib/practice/drillSeeds.ts` - Added `LESSON_SEEDS_KEY`, `setLessonSeeds`, `consumeLessonSeeds`; updated file-level doc comment to describe both independent one-shot channels
- `src/lib/practice/drillSeeds.test.ts` - Added a `describe('lesson seeds one-shot handoff ...')` block: round-trip, empty, corrupt-JSON, non-string-filter, and two explicit channel-independence assertions
- `src/lib/practice/session.ts` - `QuestionSource` gains `'seeded_lesson'`; `SessionItem` gains optional `origin?: 'weak' | 'lesson'`; `nextQuestion`'s seeded branch derives source from `seed.origin`
- `src/lib/practice/session.test.ts` - Added an origin-less backward-compat guard test and a lesson-origin `'seeded_lesson'` test
- `src/routes/drills/+page.svelte` - Imports `consumeLessonSeeds`; init now consumes both channels with lesson-seed precedence; `SOURCE_TAGS.seeded_lesson = 'FROM YOUR LESSON'` added
- `src/routes/drillsSongFilter.test.ts` - Added a `consumeLessonSeedsMock`; new `describe('Lesson-seeds handoff to Drills (LEARN-03)')` block covering the lesson tag, the unchanged weak-list tag, and lesson-over-weak-list precedence
- `tests/drills.e2e.test.ts`, `tests/reveal-insight.e2e.test.ts`, `tests/practice.e2e.test.ts` - Added a `consumeLessonSeeds: (): string[] => []` stub to each file's pre-existing `$lib/practice/drillSeeds` mock (deviation fix, see below)

## Decisions Made

- Lesson seeds take precedence over weak-list seeds at drills init when both are somehow present; both localStorage channels are unconditionally consumed (one-shot cleared) regardless of which one wins, so a stale channel can never resurface in a subsequent session
- `origin` is deliberately excluded from `dedupeItems`' dedupe key (still `family:symbol` only) since it is a UX label, not a correctness signal - a symbol present in both a lesson handoff and the weak list collapses to one queued item, which is the existing dedupe contract unchanged

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Repaired three pre-existing e2e suites broken by the new `consumeLessonSeeds` import**
- **Found during:** Task 3 verification (full-suite `npm test` run after the drills-page edit)
- **Issue:** `tests/drills.e2e.test.ts`, `tests/reveal-insight.e2e.test.ts`, and `tests/practice.e2e.test.ts` each mock `$lib/practice/drillSeeds` with only `consumeDrillSeeds`. Once the drills page began importing and calling `consumeLessonSeeds` at init, every test rendering the drills page crashed with `consumeLessonSeeds is not a function` (64 failing tests across 3 files).
- **Fix:** Added a `consumeLessonSeeds: (): string[] => []` stub to each file's existing mock, matching each file's own style (bare arrow, or an existing mock-fn pattern where present).
- **Files modified:** `tests/drills.e2e.test.ts`, `tests/reveal-insight.e2e.test.ts`, `tests/practice.e2e.test.ts`
- **Verification:** Full suite re-run: 76 files / 1073 tests, all pass; `npm run check` 0 errors/0 warnings.
- **Committed in:** `e763305`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The fix was a direct, mechanical consequence of Task 3's own new import; no scope creep, no behavior change to any of the three test suites beyond the added stub.

## Issues Encountered

None beyond the deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `setLessonSeeds` is exported and ready for Plan 19-03's `InteractiveLesson.svelte` to call with `THIRDS_LESSON_DRILL_SEEDS` before navigating to `/drills`.
- The drills page already consumes the lesson channel with correct precedence and renders the locked "FROM YOUR LESSON" tag; no further /drills-side changes anticipated for the LEARN-03 handoff.
- No blockers.

---
*Phase: 19-interactive-theory*
*Completed: 2026-07-18*

## Self-Check: PASSED

- FOUND: src/lib/practice/drillSeeds.ts
- FOUND: src/lib/practice/drillSeeds.test.ts
- FOUND: src/lib/practice/session.ts
- FOUND: src/lib/practice/session.test.ts
- FOUND: src/routes/drills/+page.svelte
- FOUND: src/routes/drillsSongFilter.test.ts
- FOUND: 4c0b532 (Task 1 RED commit)
- FOUND: eb76f15 (Task 1 GREEN commit)
- FOUND: c890d12 (Task 2 RED commit)
- FOUND: 06c8562 (Task 2 GREEN commit)
- FOUND: 7a628db (Task 3 commit)
- FOUND: e763305 (deviation fix commit)
