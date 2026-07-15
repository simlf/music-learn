---
phase: 11-memorization-engine
plan: 01
subsystem: srs
tags: [ts-fsrs, spaced-repetition, scheduler, fsrs]

requires: []
provides:
  - "src/lib/srs/scheduler.ts: pure ts-fsrs wrapper (newCard/previewGrades/gradeCard) with re-exported Rating/State/Card"
  - "ts-fsrs@5.4.1 as a pinned runtime dependency"
affects: [11-02, 11-03, 11-04, 11-05, 11-06]

tech-stack:
  added: [ts-fsrs@5.4.1]
  patterns:
    - "Single-seam library encapsulation: every ts-fsrs consumer in this phase imports Rating/State/Card from ./scheduler, never from 'ts-fsrs' directly (mirrors src/lib/audio/audio.ts isolating Tone.js)"
    - "Preview/commit split: previewGrades() uses ts-fsrs's repeat() (read-only), gradeCard() uses next() (commits)"

key-files:
  created:
    - src/lib/srs/scheduler.ts
    - src/lib/srs/scheduler.test.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "fsrs(generatorParameters({ enable_short_term: false, request_retention: 0.9, enable_fuzz: false })) is the one module-level scheduler instance (D-02); enable_short_term:false confirmed by test to keep New+Again graduating straight to Review, never Relearning"
  - "gradeCard's public rating parameter is typed as the full Rating enum (matches the plan's artifact spec) but is cast to ts-fsrs's Grade type only at the internal next() call site, since Rating structurally includes Manual which Grade excludes and Manual is never a meaningful commit through this seam"

patterns-established:
  - "Pattern: pure engine modules (audio.ts, scheduler.ts) re-export their wrapped library's public types/enums verbatim so downstream modules never import the underlying library directly"

requirements-completed: [MEM-01, MEM-02]

coverage:
  - id: D1
    description: "scheduler.ts wraps ts-fsrs@5.4.1 with the D-02 config (enable_short_term:false, request_retention:0.9, enable_fuzz:false)"
    requirement: "MEM-01"
    verification:
      - kind: unit
        ref: "src/lib/srs/scheduler.test.ts#gradeCard Again on a New card schedules 1 day and graduates straight to Review"
        status: pass
    human_judgment: false
  - id: D2
    description: "Fixed day-scale intervals reproduced exactly: New+Again=1d, Hard=2d, Good=3d, Easy=8d"
    requirement: "MEM-02"
    verification:
      - kind: unit
        ref: "src/lib/srs/scheduler.test.ts#previewGrades returns exactly 4 entries in fixed order with the documented day intervals"
        status: pass
    human_judgment: false
  - id: D3
    description: "Good chain from a New card grows 3 -> 14 -> 57 -> 196 -> 586 scheduled days"
    requirement: "MEM-02"
    verification:
      - kind: unit
        ref: "src/lib/srs/scheduler.test.ts#a repeated Good chain from a New card grows 3 -> 14 -> 57 -> 196 -> 586 scheduled days"
        status: pass
    human_judgment: false
  - id: D4
    description: "Lapse (Good then Again) contracts stability from ~2.3065 to ~0.63685 while the card stays in Review, never Relearning"
    requirement: "MEM-02"
    verification:
      - kind: unit
        ref: "src/lib/srs/scheduler.test.ts#a lapse (Good then Again) contracts stability hard and stays in Review, never Relearning"
        status: pass
    human_judgment: false
  - id: D5
    description: "previewGrades computes all four rating outcomes via repeat() without committing; gradeCard commits via next()"
    verification:
      - kind: unit
        ref: "src/lib/srs/scheduler.test.ts#previewGrades never mutates the input card"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-15
status: complete
---

# Phase 11 Plan 01: SRS Scheduler Wrapper Summary

**Pure ts-fsrs@5.4.1 wrapper (`scheduler.ts`) exposing newCard/previewGrades/gradeCard with the day-scale D-02 config, unit-tested against the exact fixed intervals and Good-chain/lapse numbers from the validated spike blueprint.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-15T11:59:00Z
- **Completed:** 2026-07-15T12:02:30Z
- **Tasks:** 2 (plus one auto-approved package-legitimacy checkpoint)
- **Files modified:** 4 (package.json, package-lock.json, scheduler.ts, scheduler.test.ts)

## Accomplishments
- `ts-fsrs@5.4.1` installed and pinned exactly (verified against npmjs.com/package/ts-fsrs and the open-spaced-repetition GitHub org per the checkpoint's legitimacy criteria)
- `src/lib/srs/scheduler.ts` created: a pure, DOM-free wrapper with a single module-level `fsrs(generatorParameters({...}))` instance configured per D-02
- `newCard`, `previewGrades`, `gradeCard` implemented plus re-exported `Rating`, `State`, `Card` as the phase's single ts-fsrs seam
- `src/lib/srs/scheduler.test.ts` created: 9 Vitest cases covering fixed intervals (1/2/3/8 days), the exact Good-chain growth (3->14->57->196->586), the lapse stability contraction (2.3065->0.63685) with state staying Review (never Relearning), previewGrades non-mutation, and the encapsulation contract

## Task Commits

Each task was committed atomically:

1. **Task 0: Package legitimacy gate for ts-fsrs** - auto-approved per autonomous-mode instructions (ts-fsrs is the project's already-vetted, version-pinned CLAUDE.md stack choice; npmjs.com/GitHub identity confirmed before install)
2. **Task 1: RED — install ts-fsrs and write failing tests** - `cc077d7` (test)
3. **Task 2: GREEN — implement the scheduler wrapper** - `702d66b` (feat)

_TDD gate sequence confirmed in git log: `test(11-01)` commit precedes `feat(11-01)` commit._

## Files Created/Modified
- `src/lib/srs/scheduler.ts` - Pure ts-fsrs wrapper: newCard/previewGrades/gradeCard, re-exports Rating/State/Card
- `src/lib/srs/scheduler.test.ts` - Vitest suite covering fixed intervals, Good chain, lapse contraction, non-mutation, encapsulation
- `package.json` - Added `ts-fsrs: "5.4.1"` (exact pin, runtime dependency)
- `package-lock.json` - Lockfile updated for the new dependency

## Decisions Made
- Confirmed `enable_short_term: false` produces the documented behavior at the real installed ts-fsrs@5.4.1 version (not just the blueprint's assertion): New+Again graduates directly to `State.Review`, never `State.Relearning`.
- `gradeCard`'s `rating` parameter keeps the plan's specified `Rating` type at the public boundary; internally cast to ts-fsrs's `Grade` type (`Exclude<Rating, Rating.Manual>`) only at the `scheduler.next()` call site, since `Rating` structurally includes `Manual` which `Grade` excludes at the type level and `Manual` is never a valid grade to commit through this seam.
- `previewGrades`'s fixed rating order is typed as `Grade[]` internally (not `Rating[]`) so it type-checks against ts-fsrs's `RecordLog` (keyed by `Grade`), while the public `GradePreview.rating` field remains typed `Rating` per the artifact spec — Grade values are assignable to Rating without a cast.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed a real TypeScript type mismatch between `Rating` and ts-fsrs's `Grade` type**
- **Found during:** Task 2 (GREEN implementation), surfaced by `npm run check` after the initial implementation
- **Issue:** `scheduler.repeat()` returns a `RecordLog` keyed by ts-fsrs's `Grade` type (`Exclude<Rating, Rating.Manual>`), not the full `Rating` enum. Indexing it with a `Rating[]`-typed array, and calling `scheduler.next()` with a `Rating`-typed parameter, both produced real `tsc` errors (`Element implicitly has an 'any' type` / `Argument of type 'Rating' is not assignable to parameter of type 'Grade'`) — not stylistic warnings.
- **Fix:** Imported ts-fsrs's `Grade` type; typed the internal `PREVIEW_ORDER` array as `Grade[]`; cast `rating as Grade` only at the `scheduler.next()` call site inside `gradeCard`, preserving the plan's specified public signature (`rating: Rating`).
- **Files modified:** `src/lib/srs/scheduler.ts`
- **Verification:** `npm run check` (svelte-check) went from 3 errors to 0; `npx vitest run src/lib/srs/scheduler.test.ts` and the full 764-test suite both still pass.
- **Committed in:** `702d66b` (Task 2 commit, GREEN — fixed before committing, so no separate commit was needed)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for the module to type-check under the project's strict tsconfig; no scope creep, no change to the plan's public API contract.

## Issues Encountered
None beyond the type-fix above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `src/lib/srs/scheduler.ts` is ready for 11-02/11-03 (deck persistence over Dexie) to build on: `newCard`/`gradeCard`/`Rating`/`State`/`Card` are the stable seam later plans import.
- 11-05 (RecallSession UI) can use `previewGrades` directly to label grade buttons with day intervals, per D-04.
- No other file in the repo imports `'ts-fsrs'` directly yet (confirmed via grep) — later plans' acceptance criteria should keep re-checking this as the phase grows.

---
*Phase: 11-memorization-engine*
*Completed: 2026-07-15*

## Self-Check: PASSED

- FOUND: src/lib/srs/scheduler.ts
- FOUND: src/lib/srs/scheduler.test.ts
- FOUND: .planning/phases/11-memorization-engine/11-01-SUMMARY.md
- FOUND: cc077d7 (test commit)
- FOUND: 702d66b (feat commit)
