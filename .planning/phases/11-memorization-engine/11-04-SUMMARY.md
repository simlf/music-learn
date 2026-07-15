---
phase: 11-memorization-engine
plan: 04
subsystem: srs
tags: [session-queue, fsrs, ts-fsrs, ui-formatting]

requires: ["src/lib/srs/scheduler.ts: Rating enum (11-01)"]
provides:
  - "src/lib/srs/session.ts: QueueItem, buildQueue, advanceQueue, isSessionComplete, sessionRemaining, formatDayInterval"
affects: [11-05]

tech-stack:
  added: []
  patterns:
    - "Pure in-memory queue math module, storage-layer agnostic: session.ts only imports the Rating type from ./scheduler, has no dependency on deck.ts or facts.ts, so it operates on any {factId, mode}-shaped queue item"

key-files:
  created:
    - src/lib/srs/session.ts
    - src/lib/srs/session.test.ts
  modified: []

key-decisions:
  - "advanceQueue destructures [current, ...rest] and returns a brand-new array in both branches (rest, or [...rest, current]) so callers can rely on reference equality to detect a change; the empty-queue guard returns the same reference (acceptable since it's already immutable/empty, no new items to leak mutation into)"

requirements-completed: [MEM-01, MEM-02]

coverage:
  - id: D1
    description: "advanceQueue re-enqueues Again-graded cards to the back of the queue without decrementing the count (D-10 Anki-style second look)"
    requirement: "MEM-01"
    verification:
      - kind: unit
        ref: "src/lib/srs/session.test.ts#advanceQueue removes and re-enqueues the front item at the back on Again (D-10)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every other grade (Hard/Good/Easy) removes the current item from the queue without re-enqueueing"
    requirement: "MEM-01"
    verification:
      - kind: unit
        ref: "src/lib/srs/session.test.ts#advanceQueue removes the front item on Good/Hard/Easy, without re-enqueueing"
        status: pass
    human_judgment: false
  - id: D3
    description: "advanceQueue never mutates its input array; buildQueue returns a defensive copy"
    verification:
      - kind: unit
        ref: "src/lib/srs/session.test.ts#advanceQueue does not mutate its input array"
        status: pass
    human_judgment: false
  - id: D4
    description: "formatDayInterval implements the UI-SPEC's exact three-band rounding rule (d/w/mo), verified at both band boundaries and against the real FSRS Good-chain 586d value"
    requirement: "MEM-02"
    verification:
      - kind: unit
        ref: "src/lib/srs/session.test.ts#formatDayInterval formats the real FSRS Good-chain fifth interval (586d) as 20mo"
        status: pass
    human_judgment: false

duration: 1min
completed: 2026-07-15
status: complete
---

# Phase 11 Plan 04: Session Queue Logic Summary

**Pure in-memory session-queue module (`session.ts`) implementing the Anki-style "re-enqueue Again cards within the session" behavior and the UI-SPEC's exact three-band day-interval label formatter, unit-tested against both hand-picked boundary values and the real FSRS Good-chain numbers from 11-01.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-07-15T12:25:40Z
- **Completed:** 2026-07-15T12:27:31Z (approx, per test-run timestamps)
- **Tasks:** 2
- **Files modified:** 2 (session.ts, session.test.ts)

## Accomplishments
- `src/lib/srs/session.ts` created: `QueueItem`, `buildQueue`, `advanceQueue`, `isSessionComplete`, `sessionRemaining`, `formatDayInterval` — all pure, no Dexie/Svelte/DOM imports, importing only `Rating` from `$lib/srs/scheduler`
- `advanceQueue` re-enqueues `Rating.Again`-graded items to the back of the queue (D-10); every other rating removes the item without re-enqueueing; the function never mutates its input array (always returns a new array reference)
- `formatDayInterval` reproduces the UI-SPEC's exact three-band rounding rule (`days<14` -> `{round(days)}d`; `14<=days<60` -> `{round(days/7)}w`; `days>=60` -> `{round(days/30)}mo`), verified against both band-boundary values and the real FSRS Good-chain fifth interval (586d -> 20mo) from 11-01's scheduler tests
- `src/lib/srs/session.test.ts` created: 17 Vitest cases covering buildQueue's defensive copy, advanceQueue's re-enqueue/no-re-enqueue/non-mutation/empty-queue behaviors, isSessionComplete, sessionRemaining, and all formatDayInterval bands/boundaries

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — failing unit tests for the session queue and day-interval formatter** - `1b96fc2` (test)
2. **Task 2: GREEN — implement the session queue and day-interval formatter** - `03fe9d0` (feat)

_TDD gate sequence confirmed in git log: `test(11-04)` commit (`1b96fc2`) precedes `feat(11-04)` commit (`03fe9d0`)._

## Files Created/Modified
- `src/lib/srs/session.ts` - Pure session-queue math and day-interval formatter: buildQueue, advanceQueue, isSessionComplete, sessionRemaining, formatDayInterval
- `src/lib/srs/session.test.ts` - Vitest suite (17 cases) covering re-enqueue semantics, non-mutation, empty-queue safety, and the exact three-band day-interval rounding rule

## Decisions Made
- `advanceQueue`'s empty-queue guard returns the same input reference (not a copy) since there is nothing to mutate into and no items to leak; all non-empty paths return brand-new arrays so callers can rely on reference-equality change detection, per the plan's prohibition against in-place mutation.

## Deviations from Plan

None - plan executed exactly as written. All acceptance criteria and behavior-block cases were satisfied without needing any Rule 1-4 adjustments.

## Issues Encountered

A pre-existing `npx tsc --noEmit` error was observed in an unrelated file, `src/lib/components/pianoKeyboardInspect.test.ts` (`Module '"*.svelte"' has no exported member 'InspectPayload'`). This predates this plan (introduced in an earlier `feat(intervals): PianoKeyboard tap-to-inspect mode` commit) and is out of scope per the executor's scope-boundary rule — not fixed here, not caused by this plan's changes. `src/lib/srs/session.ts` itself introduces no new type errors.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `src/lib/srs/session.ts` is ready for 11-05 (RecallSession UI) to consume: builds the queue from `getDueCards()` results, calls `advanceQueue` after every grade, renders `sessionRemaining(queue)` as the "{n} LEFT TODAY" register, and calls `formatDayInterval` on each of `previewGrades()`'s four `days` values to label the grade buttons.
- No Dexie, Svelte, or DOM imports were introduced — the module stays pure and storage-layer agnostic (confirmed via `grep -Ec "from 'svelte'|dexie|\$app/" src/lib/srs/session.ts` returning 0).

---
*Phase: 11-memorization-engine*
*Completed: 2026-07-15*

## Self-Check: PASSED

- FOUND: src/lib/srs/session.ts
- FOUND: src/lib/srs/session.test.ts
- FOUND: .planning/phases/11-memorization-engine/11-04-SUMMARY.md
- FOUND: 1b96fc2 (test commit)
- FOUND: 03fe9d0 (feat commit)
