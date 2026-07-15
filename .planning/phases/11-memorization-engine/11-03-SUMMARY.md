---
phase: 11-memorization-engine
plan: 03
subsystem: srs
tags: [dexie, zod, indexeddb, spaced-repetition, fsrs, vitest, fake-indexeddb]

requires:
  - phase: 11-memorization-engine
    provides: "11-01 scheduler.ts (newCard/gradeCard/Rating/State/Card single ts-fsrs seam)"
  - phase: 11-memorization-engine
    provides: "11-02 facts.ts (allFacts()/factById(), 192-entry fact catalog)"
provides:
  - "src/lib/srs/deck.ts: Dexie-backed persistence layer for FSRS CardRecords, keyed by [factId+mode]"
  - "CardRecordSchema (Zod): coerce.date() on due/last_review, the D-09 read-boundary enforcement point"
  - "getAllCards/getDueCards/introduceNewCards/recordGrade/deriveCellState exports"
  - "dexie@4.4.4, zod@4.4.3 as pinned runtime dependencies; fake-indexeddb@6.2.5 as pinned devDependency"
affects: [11-04, 11-05, 11-06]

tech-stack:
  added: [dexie@4.4.4, zod@4.4.3, fake-indexeddb@6.2.5 (dev)]
  patterns:
    - "Single-seam library encapsulation extended to storage: deck.ts is the only module allowed to import 'dexie'/'zod' for card storage, mirroring scheduler.ts's ts-fsrs seam and audio.ts's Tone.js isolation"
    - "Lazy module-level Dexie instance via a _database() accessor: importing deck.ts alone never touches IndexedDB"
    - "Zod .coerce.date() as the mandatory read boundary before any Date comparison or scheduler call touches a persisted record"

key-files:
  created:
    - src/lib/srs/deck.ts
    - src/lib/srs/deck.test.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "dexie/zod/fake-indexeddb pinned to exact versions (no caret ranges) in package.json, matching the project's exact-pinning convention for vetted stack deps (npm install adds carets by default; stripped manually and package-lock.json regenerated to match)"
  - "_database() is exported (underscore-prefixed, not part of the plan's public artifact surface) solely so deck.test.ts can perform a raw, typed-write-path-bypassing corruption for the D-09 Date-rehydration regression test; documented in the test file's own comments per the plan's discretion"
  - "getAllCards() uses Zod safeParse per record (not the whole array at once) so one corrupt record never fails every other valid record's read"

patterns-established:
  - "Pattern: persistence modules (deck.ts) get a lazy singleton accessor just like engine modules (audio.ts, scheduler.ts) get a lazy/module-level instance — consistent lazy-init discipline across the codebase's side-effecting singletons"

requirements-completed: [MEM-01, MEM-03, MEM-04]

coverage:
  - id: D1
    description: "Cards persist in Dexie/IndexedDB as one record per (factId, mode), keyed by a compound [factId+mode] index, storing the raw FSRS Card fields plus factId/factKind/mode"
    requirement: "MEM-03"
    verification:
      - kind: unit
        ref: "src/lib/srs/deck.test.ts#introduceNewCards seeds distinct factIds across repeated calls, growing the deck incrementally"
        status: pass
      - kind: unit
        ref: "src/lib/srs/deck.test.ts#recordGrade persists an updated CardRecord matching the graded result"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every card read from Dexie is Zod-validated with due/last_review coerced via .coerce.date(); a string-corrupted due field rehydrates to a real Date instance before any comparison (D-09's core trap)"
    requirement: "MEM-03"
    verification:
      - kind: unit
        ref: "src/lib/srs/deck.test.ts#Date-rehydration regression: string-corrupted due/last_review fields still read back as real Date instances (D-09)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A record with a genuinely malformed due field is skipped (safeParse failure), not thrown; every other valid record still reads successfully"
    requirement: "MEM-03"
    verification:
      - kind: unit
        ref: "src/lib/srs/deck.test.ts#a record with a genuinely malformed due field is skipped, not thrown, while other valid records still read"
        status: pass
    human_judgment: false
  - id: D4
    description: "getDueCards(now) returns exactly the cards whose (Date-coerced) due <= now; the deck starts genuinely empty and grows incrementally via introduceNewCards (bounded, never all 192 at once)"
    requirement: "MEM-01"
    verification:
      - kind: unit
        ref: "src/lib/srs/deck.test.ts#getAllCards() on a fresh (never-written) database returns []"
        status: pass
      - kind: unit
        ref: "src/lib/srs/deck.test.ts#getDueCards(now) after introduceNewCards(5, now) returns exactly those 5 cards"
        status: pass
      - kind: unit
        ref: "src/lib/srs/deck.test.ts#exhaustion: introduceNewCards(1000, now) seeds all 192 facts and a further call introduces 0"
        status: pass
    human_judgment: false
  - id: D5
    description: "deriveCellState(card, now) classifies not-yet-seen / due / weak / mastered per the exact MEM-04 recall-map cell vocabulary, with due taking priority over mastered"
    requirement: "MEM-04"
    verification:
      - kind: unit
        ref: "src/lib/srs/deck.test.ts#deriveCellState(undefined, now0) === not-yet-seen"
        status: pass
      - kind: unit
        ref: "src/lib/srs/deck.test.ts#deriveCellState === 'due' when card.due <= now, regardless of lastRating or state"
        status: pass
      - kind: unit
        ref: "src/lib/srs/deck.test.ts#deriveCellState === 'weak' when card.due > now and lastRating === Again"
        status: pass
      - kind: unit
        ref: "src/lib/srs/deck.test.ts#deriveCellState === 'mastered' when card.due > now, state === Review, lastRating !== Again"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-15
status: complete
---

# Phase 11 Plan 03: Dexie Card Deck Persistence Summary

**Dexie-backed `deck.ts` persisting one FSRS CardRecord per (factId, mode) via a Zod `.coerce.date()` read boundary that provably rehydrates string-corrupted `due`/`last_review` fields back into real Date instances (D-09).**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-15T12:17:10Z
- **Completed:** 2026-07-15T12:21:50Z
- **Tasks:** 2 (plus one auto-approved package-legitimacy checkpoint)
- **Files modified:** 4 (package.json, package-lock.json, deck.ts, deck.test.ts)

## Accomplishments

- `dexie@4.4.4`, `zod@4.4.3` (runtime dependencies) and `fake-indexeddb@6.2.5` (devDependency) installed and exact-pinned
- `src/lib/srs/deck.ts` created: Dexie schema (`[factId+mode]` compound primary key plus factId/mode/due indexes), `CardRecordSchema` (Zod, `.coerce.date()` on due/last_review), lazy `_database()` accessor
- `getAllCards`, `getDueCards`, `introduceNewCards`, `recordGrade`, `deriveCellState` implemented per the artifact spec; `NEW_CARDS_PER_SESSION = 10` bounds gradual introduction
- `src/lib/srs/deck.test.ts`: 15 Vitest cases (13 in the original RED spec, plus one `NEW_CARDS_PER_SESSION` default-limit case) covering empty-start, gradual introduction across repeated calls, the 192-fact exhaustion boundary, grade persistence, the D-09 Date-rehydration regression (the core of this plan), malformed-record skip, and all four `deriveCellState` cell states

## Task Commits

Each task was committed atomically:

1. **Task 0: Package legitimacy gate for dexie, zod, and fake-indexeddb** - auto-approved per autonomous-mode instructions (dexie/zod are the project's already-vetted, version-pinned CLAUDE.md stack choices; fake-indexeddb identity confirmed as the standard IndexedDB test shim before install)
2. **Task 1: RED — install dependencies and write failing tests** - `6d547ce` (test)
3. **Task 2: GREEN — implement the Dexie-backed deck** - `0a150c6` (feat)

_TDD gate sequence confirmed in git log: `test(11-03)` commit (`6d547ce`) precedes `feat(11-03)` commit (`0a150c6`)._

## Files Created/Modified

- `src/lib/srs/deck.ts` - Dexie persistence layer: schema, Zod-validated reads, gradual card introduction, grade recording, recall-map cell derivation
- `src/lib/srs/deck.test.ts` - Vitest suite (15 cases) covering the full behavior spec including the D-09 Date-rehydration regression
- `package.json` - Added `dexie: "4.4.4"`, `zod: "4.4.3"` (dependencies) and `fake-indexeddb: "6.2.5"` (devDependency), all exact-pinned
- `package-lock.json` - Lockfile regenerated to match the exact pins

## Decisions Made

- Stripped npm's default caret-range pins (`^4.4.4` etc.) down to exact pins (`4.4.4`) in `package.json`, matching the project's established exact-pinning convention for vetted stack dependencies (see ts-fsrs/tonal/tone in earlier phases); regenerated `package-lock.json` afterward so the lockfile agrees
- Exported `_database()` (underscore-prefixed, deliberately outside the plan's public artifact list) as the sole test-only escape hatch for the Date-rehydration regression's raw, typed-write-path-bypassing corruption — documented directly in `deck.test.ts`'s comments per the plan's own discretion clause
- `getAllCards()` uses per-record Zod `safeParse` (not a single parse over the whole array) so one corrupt record is skipped without failing every other valid record's read

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed a real TypeScript type error in the test's raw-key tuple**
- **Found during:** Task 2 (GREEN implementation), surfaced by `npm run check` after the initial implementation
- **Issue:** `deck.test.ts`'s Date-rehydration regression test declared `const rawKey: [string, string] = [graded.factId, graded.mode]`, but Dexie's compound-key type for the `cards` table is `[string, "formula"]` (the literal `Mode` union), not `[string, string]`. `svelte-check` reported a real `tsc` error: the wider `string` type at tuple position 1 is not assignable to the narrower `"formula"` literal type.
- **Fix:** Changed the tuple's declared type to `[string, typeof graded.mode]`, deriving the literal type from the already-typed `graded.mode` value instead of widening it to `string`.
- **Files modified:** `src/lib/srs/deck.test.ts`
- **Verification:** `npm run check` (svelte-check) went from 1 error to 0; `npx vitest run src/lib/srs/deck.test.ts` and the full 790-test suite both still pass.
- **Committed in:** `0a150c6` (Task 2 commit, GREEN — fixed before committing, so no separate commit was needed)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for the test file to type-check under the project's strict tsconfig; no scope creep, no change to the plan's public API contract.

## Issues Encountered

None beyond the type-fix above. The GREEN implementation passed all 13 originally-planned test cases on the first run with no debugging iteration needed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `src/lib/srs/deck.ts` is ready for 11-05 (RecallSession UI, uses `getDueCards`/`introduceNewCards`/`recordGrade`) and 11-06 (RecallMap UI, uses `getAllCards`/`deriveCellState`)
- No other file in the repo imports `'dexie'` or `'zod'` for card storage yet (confirmed via grep of `deck.ts`'s own imports) — later plans' acceptance criteria should keep re-checking this as the phase grows
- Full 790-test suite green; `npm run check` reports 0 errors

---
*Phase: 11-memorization-engine*
*Completed: 2026-07-15*

## Self-Check: PASSED

- FOUND: src/lib/srs/deck.ts
- FOUND: src/lib/srs/deck.test.ts
- FOUND: .planning/phases/11-memorization-engine/11-03-SUMMARY.md
- FOUND: 6d547ce (test commit)
- FOUND: 0a150c6 (feat commit)
