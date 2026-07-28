---
phase: 35-inversions-new-drill-family
plan: 04
subsystem: practice
tags: [practiceQueue, hybrid-queue, synthetic-family, vitest, ts]

# Dependency graph
requires:
  - phase: 35-01
    provides: inversionCountFor (src/lib/practice/inversions.ts) - bounds valid inversion indices per symbol
provides:
  - PracticeFamily union widened with 'inversion' (synthetic, not carded)
  - InversionQueueItem type (id/family/symbol/inversionIndex) added to the HybridQueueItem discriminated union
  - syntheticInversionItems(candidateSymbols, count, rng) - enumerate/shuffle/take draw over inversionCountFor per symbol
  - filterInversionsBySong(items, predicate) - song-filter restriction for the synthetic inversion half
  - composePracticeQueue/advanceHybridQueue extended to full parity for the inversion family with zero change to the weave algorithm
affects: [35-05, 35-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Synthetic-family extension: widen PracticeFamily union + add a new *QueueItem interface to HybridQueueItem + a syntheticXItems shuffle-and-take builder, without touching composePracticeQueue's weave body (generic over families)."

key-files:
  created: []
  modified:
    - src/lib/practice/practiceQueue.ts
    - src/lib/practice/practiceQueue.test.ts
    - src/lib/i18n/messages/practice.ts
    - src/routes/practice/+page.svelte

key-decisions:
  - "syntheticInversionItems mirrors syntheticProgressionItems' enumerate-all-pairs -> shuffleWithRng -> take-count idiom exactly, rather than a per-symbol random pick, so distinctness and determinism-for-a-fixed-rng are structural, not incidental."
  - "Added a minimal 'inversion' cue label to practice.cue.* (en/fr) and +page.svelte's CUE_LABELS Record, following the established precedent (see existing comment: cue labels are pre-added for all families ahead of their own host-wiring plan) - this is the only change outside practiceQueue.ts/test.ts, required to keep `npm run check` clean after widening HybridQueueItem's family union; no InversionDrill UI wiring was added (owned by 35-05/35-06)."

patterns-established:
  - "Frozen-order REG-parity test: for a fixed seeded rng and an existing-five-only input (no inversion items), assert the exact composed id order as a literal array captured from the pre-existing weave output - any future accidental change to composePracticeQueue's algorithm fails this test immediately (REG-01 guard, also referenced by Phase 36's cold-session reordering work which must not regress it)."

requirements-completed: [INV-03]

coverage:
  - id: D1
    description: "PracticeFamily includes 'inversion'; InversionQueueItem (id/family/symbol/inversionIndex) is a synthetic HybridQueueItem member alongside VoicingQueueItem/ProgressionQueueItem."
    requirement: "INV-03"
    verification:
      - kind: unit
        ref: "src/lib/practice/practiceQueue.test.ts#syntheticInversionItems"
        status: pass
    human_judgment: false
  - id: D2
    description: "syntheticInversionItems draws distinct {symbol, inversionIndex} pairs from candidate symbols bounded by inversionCountFor; empty candidate list yields no items (single-type-due gate)."
    requirement: "INV-03"
    verification:
      - kind: unit
        ref: "src/lib/practice/practiceQueue.test.ts#syntheticInversionItems returns [] for an empty candidate list"
        status: pass
    human_judgment: false
  - id: D3
    description: "composePracticeQueue interleaves the inversion family with the existing five with NO change to its weave algorithm; advanceHybridQueue consumes an inversion item (synthetic, no FSRS re-enqueue) exactly like voicing/progression."
    requirement: "INV-03"
    verification:
      - kind: unit
        ref: "src/lib/practice/practiceQueue.test.ts#inversion family in composePracticeQueue (Phase 35, INV-03)"
        status: pass
      - kind: unit
        ref: "src/lib/practice/practiceQueue.test.ts#advanceHybridQueue consumes an inversion item on Again/Good without re-enqueue"
        status: pass
    human_judgment: false
  - id: D4
    description: "REG-parity: the existing-five ordering is byte-identical (frozen baseline) for a fixed rng when no inversion items are present."
    requirement: "INV-03"
    verification:
      - kind: unit
        ref: "src/lib/practice/practiceQueue.test.ts#REG-parity: existing-five ordering unchanged with no inversion items present"
        status: pass
    human_judgment: false

duration: 17min
completed: 2026-07-27
status: complete
---

# Phase 35 Plan 04: Inversion family in the hybrid practice queue composer Summary

**Widened `PracticeFamily`/`HybridQueueItem` with a synthetic `'inversion'` family (`InversionQueueItem`, `syntheticInversionItems`, `filterInversionsBySong`) in `practiceQueue.ts`, leaving `composePracticeQueue`'s weave body byte-for-byte unchanged and provably so via a frozen-order REG-parity test.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-07-27T02:34:00Z (approx, prior plan's completion commit)
- **Completed:** 2026-07-27T00:51:48Z UTC
- **Tasks:** 2 completed
- **Files modified:** 4

## Accomplishments
- `PracticeFamily` now includes `'inversion'`; `InversionQueueItem { id; family: 'inversion'; symbol; inversionIndex }` joins the `HybridQueueItem` union alongside `VoicingQueueItem`/`ProgressionQueueItem`
- `syntheticInversionItems(candidateSymbols, count, rng)` enumerates every `{symbol, inversionIndex}` pair (bounded by `inversionCountFor` from Plan 35-01), shuffles via the existing `shuffleWithRng`, and takes the first `count` - mirroring `syntheticProgressionItems` exactly; an empty candidate list yields `[]`, preserving the single-type-due gate
- `filterInversionsBySong` mirrors `filterVoicingsBySong` verbatim for the synthetic inversion half
- `composePracticeQueue`'s weave loop was NOT modified (confirmed via `git diff` - no edits inside lines 241-340); it already iterates `byFamily` generically, so the union widening alone is sufficient for inversion items to interleave, respect the no-3-in-a-row rule, and participate in the G2 same-symbol anti-adjacency (since `InversionQueueItem` carries `symbol`)
- `advanceHybridQueue` consumes inversion items on any outcome (Again or Good) without re-enqueue, matching voicing/progression - `isCardedItem`'s discriminant was left untouched (inversion is synthetic, not carded)
- Added a frozen-order REG-parity test: for a fixed seeded rng over a carded+voicing+progression-only input (zero inversion items), the exact composed id order is asserted as a literal array captured from the pre-existing weave output, guarding REG-01 against any future accidental change to the weave algorithm (including Phase 36's planned cold-session reordering work on this same function)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the inversion family + synthetic builders to practiceQueue.ts** - `df8c911` (feat)
2. **Task 2: Extend practiceQueue.test.ts for the inversion family + REG parity** - `7ff09da` (test)

**Plan metadata:** (final commit hash recorded below after `final_commit` step)

## Files Created/Modified
- `src/lib/practice/practiceQueue.ts` - `PracticeFamily` widened; `InversionQueueItem` added to `HybridQueueItem`; `syntheticInversionItems`/`filterInversionsBySong` added; `composePracticeQueue`/`isCardedItem`/`advanceHybridQueue` bodies unchanged
- `src/lib/practice/practiceQueue.test.ts` - new `syntheticInversionItems` suite, inversion-family cases inside `composePracticeQueue` (single-type-due pass-through, interleave/no-3-in-a-row, faithful permutation), the REG-parity frozen-baseline test, `advanceHybridQueue` inversion consume cases (Again + Good), `filterInversionsBySong` case
- `src/lib/i18n/messages/practice.ts` - added `practice.cue.inversion` (en: `INVERSION`, fr: `INVERSION`), following the file's own established "add cue label ahead of host-wiring plan" precedent
- `src/routes/practice/+page.svelte` - added the `inversion` key to `CUE_LABELS`' `Record<HybridQueueItem['family'], string>` (Rule 3 fix, required for the widened union to type-check; no other behavior in this file changed - the practice hub still never calls `syntheticInversionItems`, so no inversion items appear in a real session yet)

## Decisions Made
- Followed `syntheticProgressionItems`' enumerate-all-then-shuffle-then-take shape exactly for `syntheticInversionItems`, rather than per-symbol independent random picks, to keep distinctness and determinism-for-a-fixed-rng structural (matches the plan's explicit instruction to mirror the shuffle-and-take idiom)
- Did not touch `composePracticeQueue`'s weave body per the orchestrator's explicit constraint (Phase 36 owns cold-session reordering of that function); verified via `git diff` that only additive lines were introduced outside the weave loop

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added the missing `'inversion'` cue label to satisfy `npm run check`**
- **Found during:** Task 1 (verification step, `npm run check`)
- **Issue:** Widening `HybridQueueItem`'s `family` union to include `'inversion'` made `src/routes/practice/+page.svelte`'s `CUE_LABELS: Record<HybridQueueItem['family'], string>` non-exhaustive, producing a `svelte-check` type error (`Property 'inversion' is missing...`). This is a direct, mechanical consequence of the type widening this task performs, not new functionality.
- **Fix:** Added `'practice.cue.inversion'` to both locale dictionaries in `src/lib/i18n/messages/practice.ts` (en/fr, both `'INVERSION'`) and the corresponding `inversion: t('practice.cue.inversion')` entry to `CUE_LABELS` in `+page.svelte`. This label is currently unreachable at runtime (the practice hub never emits an inversion item since it doesn't call `syntheticInversionItems` yet), matching the file's own precedent of pre-adding cue labels ahead of the family's own host-wiring plan.
- **Files modified:** `src/lib/i18n/messages/practice.ts`, `src/routes/practice/+page.svelte`
- **Verification:** `npm run check` - 0 errors (was 1 error before the fix)
- **Committed in:** `df8c911` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to keep `npm run check` clean per the plan's own acceptance criteria; no scope creep into 35-05/35-06's actual `InversionDrill` UI wiring (both plans still own `+page.svelte`'s runtime call sites and full copy).

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `practiceQueue.ts` now exposes full inversion-family parity (`InversionQueueItem`, `syntheticInversionItems`, `filterInversionsBySong`, `advanceHybridQueue` consumption) for Plan 35-05 (`InversionDrill.svelte`) and Plan 35-06 (`+page.svelte` host wiring + i18n) to consume directly.
- The REG-parity frozen-baseline test in `practiceQueue.test.ts` is available for Phase 36 to run against before/after any cold-session reordering change to `composePracticeQueue`.
- No blockers.

---
*Phase: 35-inversions-new-drill-family*
*Completed: 2026-07-27*

## Self-Check: PASSED

- FOUND: src/lib/practice/practiceQueue.ts
- FOUND: src/lib/practice/practiceQueue.test.ts
- FOUND: src/lib/i18n/messages/practice.ts
- FOUND: src/routes/practice/+page.svelte
- FOUND: df8c911 (feat commit)
- FOUND: 7ff09da (test commit)
