---
phase: 14-mastery-criterion
plan: 01
subsystem: srs
tags: [fsrs, dexie, zod, svelte, ts-fsrs, spaced-repetition]

# Dependency graph
requires:
  - phase: 11-recall-engine
    provides: CardRecord/CardRecordSchema, deriveCellState, recordGrade, deck.ts's single Dexie/Zod persistence seam
  - phase: 13-multimodal-recall
    provides: teach-cluster seeding (introduceNewCards), the four-mode CardRecord shape RecallMap renders against
provides:
  - masteryDayCount distinct-calendar-day correct-review counter on CardRecord
  - successive-relearning gate in deriveCellState (State.Review AND masteryDayCount >= 2 to report 'mastered')
affects: [recall-map, recall-session, build-session, any future phase reading CellState as a mastery/confidence signal]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Local-calendar-day comparison via getFullYear/getMonth/getDate (matches Phase 08's clientDate/localDateString convention), replicated as a small private helper in deck.ts rather than importing api/progress.ts across the srs/api layer boundary."
    - "Additive Zod schema migration with .default(0): legacy IndexedDB records missing a new field load safely without a version bump or explicit migration step (D-09 boundary)."

key-files:
  created: []
  modified:
    - src/lib/srs/deck.ts
    - src/lib/srs/deck.test.ts
    - src/lib/components/RecallMap.svelte (no changes needed - see Deviations)
    - src/lib/components/recallMap.test.ts
    - src/lib/components/BuildSession.svelte
    - src/lib/components/recallSession.test.ts
    - src/lib/srs/rotation.test.ts

key-decisions:
  - "masteryDayCount lives on CardRecord (not derived from a separate review-log table): keeps the fix additive and inside deck.ts's existing single persistence seam, no new Dexie table/version bump needed."
  - "Day comparison uses card.last_review (the PRE-grade value) against `now`, not a separately tracked 'last mastery-counted day' field: last_review already IS the day of the most recent grade, so no new date field was needed to detect a same-day repeat."
  - "Replicated the local-day comparison logic in deck.ts as a private helper (isSameLocalDay) instead of importing api/progress.ts's localDateString: keeps deck.ts's srs-layer module free of a dependency on the app/api layer, matching its existing single-seam, no-cross-layer-import discipline."

requirements-completed: [IMP-01]

coverage:
  - id: D1
    description: "CardRecord gains masteryDayCount:number; CardRecordSchema validates it and legacy records lacking the field default to 0 without throwing."
    requirement: "IMP-01"
    verification:
      - kind: unit
        ref: "src/lib/srs/deck.test.ts#CardRecordSchema: a legacy persisted record with no masteryDayCount field loads via getAllCards and defaults to 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "recordGrade increments masteryDayCount by at most 1 per distinct local calendar day, only on a correct (Good/Easy) grade; Again/Hard never increment."
    requirement: "IMP-01"
    verification:
      - kind: unit
        ref: "src/lib/srs/deck.test.ts#recordGrade: a first correct grade (Good) on a never-mastery-counted card sets masteryDayCount to 1"
        status: pass
      - kind: unit
        ref: "src/lib/srs/deck.test.ts#recordGrade: a second correct grade on the SAME local calendar day leaves masteryDayCount unchanged"
        status: pass
      - kind: unit
        ref: "src/lib/srs/deck.test.ts#recordGrade: a correct grade on a LATER distinct local calendar day raises masteryDayCount to 2"
        status: pass
      - kind: unit
        ref: "src/lib/srs/deck.test.ts#recordGrade: a Rating.Again grade never increments masteryDayCount, even on a distinct day"
        status: pass
      - kind: unit
        ref: "src/lib/srs/deck.test.ts#recordGrade: a Rating.Hard grade never increments masteryDayCount"
        status: pass
    human_judgment: false
  - id: D3
    description: "deriveCellState reports 'mastered' only when State.Review AND masteryDayCount >= 2; a State.Review card with masteryDayCount < 2 reports 'weak'; due still takes priority over everything, including a genuinely mastered card."
    requirement: "IMP-01"
    verification:
      - kind: unit
        ref: "src/lib/srs/deck.test.ts#deriveCellState === 'mastered' when card.due > now, state === Review, lastRating !== Again, AND masteryDayCount >= 2 (successive-relearning gate)"
        status: pass
      - kind: unit
        ref: "src/lib/srs/deck.test.ts#deriveCellState === 'weak', NOT 'mastered', when card.due > now, state === Review, lastRating !== Again, but masteryDayCount < 2"
        status: pass
      - kind: integration
        ref: "src/lib/components/recallMap.test.ts#renders all four cell states with the correct treatment/glyph, and the legend"
        status: pass
    human_judgment: false
  - id: D4
    description: "Real multi-day (2-distinct-calendar-day) confirmation on the live /recall Map, since unit tests simulate distinct days by stamping timestamps rather than waiting real days."
    verification: []
    human_judgment: true
    rationale: "Time-dependent behavior spanning real calendar days cannot be exercised in a single automated session; the plan's own <human-check> flags this as a future UAT item."

# Metrics
duration: 40min
completed: 2026-07-15
status: complete
---

# Phase 14 Plan 01: Successive-Relearning Mastery Criterion Summary

**CardRecord gains a masteryDayCount distinct-calendar-day counter; deriveCellState now requires State.Review AND 2+ separate correct-grade days before reporting 'mastered', fixing the one-grade-flips-to-Mastered defect (I-01) per Rawson & Dunlosky successive-relearning evidence.**

## Performance

- **Duration:** 40 min
- **Started:** 2026-07-15T20:35:00Z
- **Completed:** 2026-07-15T20:46:28Z
- **Tasks:** 2 (both `tdd="true"`, executed as one RED/GREEN cycle per plan-level `type: tdd`)
- **Files modified:** 7

## Accomplishments
- `CardRecord.masteryDayCount` field + `.default(0)` Zod validation, so every existing IndexedDB record keeps loading (D-09 boundary preserved).
- `recordGrade` increments the counter by at most 1 per distinct local calendar day, only on a correct (Good/Easy) grade; Again/Hard grades never increment it, and a same-day repeat correct grade doesn't double-count.
- `deriveCellState`'s mastered gate now requires `State.Review AND masteryDayCount >= 2`; a single successful grade reports `weak`, matching the plan's core truth. Due-priority and lapse-detection (`lastRating === Again` -> weak) are unchanged.
- All existing `CardRecord` construction/fixture sites across the codebase (introduceNewCards's two seeding paths, BuildSession's fetch-or-create, and three test-helper builders in deck/rotation/recallSession tests) updated for the new required field.

## Task Commits

TDD RED/GREEN cycle (plan-level `type: tdd`, per `execute-plan.md`'s plan-level gate enforcement):

1. **RED - failing tests for masteryDayCount + deriveCellState gate** - `3453ec9` (test)
2. **GREEN - masteryDayCount field/schema/recordGrade + deriveCellState gate** - `80f8a21` (feat)

**Plan metadata:** (this commit, following this Summary)

## Files Created/Modified
- `src/lib/srs/deck.ts` - `CardRecord.masteryDayCount` field, `CardRecordSchema` default, `isSameLocalDay`/`nextMasteryDayCount` helpers, `recordGrade` day-counter logic, `deriveCellState` mastery gate.
- `src/lib/srs/deck.test.ts` - New tests: distinct-day counting (first grade, same-day repeat, next-day), Again/Hard non-increment, legacy-record default-0, mastered-vs-weak gate assertions.
- `src/lib/components/RecallMap.svelte` - No code change needed; it consumes `deriveCellState` unchanged, exactly as the plan's `key_links` anticipated (the fix is entirely in the derivation, not the component).
- `src/lib/components/recallMap.test.ts` - Fixture cards claiming to be "mastered" now set `masteryDayCount: 2` so they still exercise the real mastered cell treatment/glyph/legend.
- `src/lib/components/BuildSession.svelte` - Its fetch-or-create `CardRecord` construction site gains `masteryDayCount: 0` for new cards.
- `src/lib/components/recallSession.test.ts` - Two local `CardRecord` builder helpers (`makeCard`, `makeCardWithState`) gain `masteryDayCount: 0`.
- `src/lib/srs/rotation.test.ts` - Its `makeCardRecord` test helper gains `masteryDayCount: 0`.

## Decisions Made
- Reused `card.last_review` (the pre-grade value) as the "day of the last correct grade" signal rather than adding a separate tracking date field - it already carries exactly that information whenever a correct grade was previously committed.
- Replicated Phase 08's local-day comparison (`getFullYear`/`getMonth`/`getDate`, not UTC) as a small private helper inside `deck.ts` instead of importing `src/lib/api/progress.ts`'s `localDateString`, to avoid a cross-layer import from the srs persistence seam into the app/api layer.
- Kept `masteryDayCount` a required (non-optional) field on the `CardRecord` TypeScript interface, with the "legacy default" behavior living entirely in the Zod schema's `.default(0)` - this is what surfaced (via `svelte-check`) every existing construction/fixture site in the codebase that needed updating, rather than silently letting them compile with an implicit `undefined`.

## Deviations from Plan

None - plan executed exactly as written. The only additions beyond the two named test/implementation files were mechanical: updating other `CardRecord` construction sites (`BuildSession.svelte`) and test fixture helpers (`recallSession.test.ts`, `rotation.test.ts`) that the plan's `files_modified` list didn't enumerate, because they construct `CardRecord` literals directly and would not type-check once `masteryDayCount` became a required field. This is the natural, mechanical consequence of the plan's own required schema change (Rule 3 - Blocking: `npm run check` failed until these were updated), not new functionality.

## Issues Encountered
- The full `npx vitest run` suite showed one flaky timeout (`recallMap.test.ts > narrows the visible rows via the kind filter tabs`, a pre-existing `fireEvent`/`waitFor` timing test unrelated to this plan's changes) when run under full-suite parallel load; it passed cleanly both in isolation and on a subsequent full-suite re-run, confirming it is a pre-existing timing sensitivity, not a regression introduced by this plan (out of scope per the deviation rules' scope boundary - not fixed, not modified).

## User Setup Required
None - no external service configuration required.

## Known Stubs
None.

## Threat Flags
None - this plan changes internal derivation logic and a persisted-record schema field only; no new network endpoints, auth paths, or trust-boundary surface introduced.

## Next Phase Readiness
- `deriveCellState`'s mastered gate is now durable per the successive-relearning criterion; any future feature reading `CellState`/`masteryDayCount` as a confidence signal (e.g. I-06's hint-suppression tied to mature Review cards, per the v2.1 backlog) can build on this without re-deriving mastery logic.
- The plan's own `<human-check>` flags a genuine real-multi-day confirmation on the live `/recall` Map as a future UAT item (unit tests simulate distinct days via stamped timestamps, not real elapsed calendar days) - no blocker, just a noted limitation of automated coverage for this specific truth.

---
*Phase: 14-mastery-criterion*
*Completed: 2026-07-15*

## Self-Check: PASSED

All 7 modified files verified present on disk; both task commits (`3453ec9` test, `80f8a21` feat) verified present in git log. `npx vitest run` (948 tests) and `npm run check` (0 errors) both green.
