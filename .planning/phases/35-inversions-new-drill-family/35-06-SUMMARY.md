---
phase: 35-inversions-new-drill-family
plan: 06
subsystem: practice
tags: [practice-host, hybrid-queue, synthetic-family, svelte, vitest]

# Dependency graph
requires:
  - phase: 35-04
    provides: syntheticInversionItems/filterInversionsBySong/InversionQueueItem (src/lib/practice/practiceQueue.ts) - the pure inversion-family builders and the practice.cue.inversion i18n key + CUE_LABELS entry
  - phase: 35-05
    provides: InversionDrill.svelte - the render component for one inversion queue item (grading + escalating hint ladder)
provides:
  - The /practice host weaves synthetic inversion items into the hybrid queue, gated on due chord symbols (single-type-due gate) and song-filterable like voicing
  - A render branch mounting InversionDrill for an 'inversion' queue item
  - completeSynthetic extended to consume inversion items with NO deck.recordGrade call
  - Host integration test (practiceInversions.test.ts) + REG-01 gate test (practiceInversionsReg.test.ts) proving the existing five families are byte-unchanged
affects: [37]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "New synthetic-family host wiring: import the family's syntheticXItems builder + its Drill component, add a SYNTHETIC_X_COUNT constant, compute candidates from dueChordSymbols (with its own song-filter branch when the family carries a symbol), append to syntheticItems before composePracticeQueue, add a render branch, and widen completeSynthetic's allowlist - all inside the existing dueChordSymbols.size > 0 gate, touching nothing on the carded (getDueCards/selectReviewCards/interleaveQueue/cardsToQueueItems) path."
    - "Generic host-test driving without RNG replication: read a synthetic item's own identity straight off its rendered DOM (ChordGlyph's shadow text for the symbol, the prompt's leading inversion-name phrase for the index) rather than trying to replicate composePracticeQueue's internal shuffle order - the test then works for ANY draw the real syntheticInversionItems produces, not just one hardcoded case."

key-files:
  created:
    - src/routes/practiceInversions.test.ts
    - src/routes/practiceInversionsReg.test.ts
  modified:
    - src/routes/practice/+page.svelte
    - src/routes/practiceSeedHandoff.test.ts
    - tests/practice-hub.e2e.test.ts
    - tests/practice-hub-mix.e2e.test.ts
    - tests/hub-consolidation.e2e.test.ts

key-decisions:
  - "Inversion candidates are filtered by symbolHasProvenance BEFORE calling syntheticInversionItems (filtering the candidate symbol list itself), not by filtering the built items afterward via filterInversionsBySong - matches the plan's explicit action text; filterInversionsBySong (added by 35-04) stays exported but unused by the host, available for a future caller that needs the post-build shape."
  - "Rule 1 fix (regression, not scope creep): four pre-existing practice-hub e2e/host test files use REAL due seventh-chord fixtures (Cm7/Dm7/G7) without previously needing to stub practiceQueue's synthetic builders down to the inversion family (it didn't exist at the host level yet); wiring inversions into the same due-chord gate as voicing meant these fixtures would now ALSO silently earn real inversion items, growing their queues and breaking hardcoded 'N LEFT'/family-set assertions. Added `syntheticInversionItems: () => []` to each file's existing partial practiceQueue mock, mirroring the exact isolation convention those files already established for syntheticVoicingItems/syntheticProgressionItems."
  - "The REG-01 gate test (practiceInversionsReg.test.ts) runs syntheticVoicingItems AND syntheticInversionItems for REAL (only syntheticProgressionItems is stubbed, for its own template+key draw determinism, mirroring Plan 05's precedent) - genuinely exercising the six-family weave rather than asserting only at a lower seam, since a full host render proved tractable and more faithful to REG-01's host-boundary intent."

patterns-established:
  - "A synthetic family's host-test helper reads its rendered identity (symbol + variant index) off the DOM rather than hardcoding an assumed RNG-derived draw - keeps the test valid across any future change to the family's own shuffle-and-take internals, as long as the rendered contract (prompt text, ChordGlyph shadow) stays stable."

requirements-completed: [INV-03]

coverage:
  - id: D1
    description: "The /practice host weaves synthetic inversion items into the hybrid queue, gated on due chord symbols (single-type-due gate) and song-filterable, and renders InversionDrill for an inversion queue item."
    requirement: "INV-03"
    verification:
      - kind: integration
        ref: "src/routes/practiceInversions.test.ts#inversion family surfaces and completes without an FSRS write (INV-03)"
        status: pass
      - kind: unit
        ref: "npm run check"
        status: pass
    human_judgment: false
  - id: D2
    description: "An inversion item is consumed via completeSynthetic (no deck.recordGrade call), exactly like voicing/progression; the family cue shows via practice.cue.inversion."
    requirement: "INV-03"
    verification:
      - kind: integration
        ref: "src/routes/practiceInversions.test.ts#renders InversionDrill under the INVERSION family cue, and completing it advances the queue with no deck.recordGrade call for that item"
        status: pass
      - kind: integration
        ref: "src/routes/practiceInversionsReg.test.ts#REG-01: six-family interleave, carded FSRS grade-commit, and synthetic telemetry silence"
        status: pass
    human_judgment: false
  - id: D3
    description: "The existing five families' scheduling, grading (FSRS commit), telemetry, interleaving, single-type-due gate, and song-filter steering are byte-for-byte unaffected by the inversion addition."
    requirement: "REG-01"
    verification:
      - kind: integration
        ref: "src/routes/practiceInversionsReg.test.ts (all three describe blocks: six-family interleave/grade-commit/telemetry, single-type-due gate, song-filter steering)"
        status: pass
      - kind: regression
        ref: "tests/practice-hub.e2e.test.ts, tests/practice-hub-mix.e2e.test.ts, tests/hub-consolidation.e2e.test.ts, src/routes/practiceSeedHandoff.test.ts (all green with syntheticInversionItems stubbed to [] for isolation)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Single-type-due gate (PRAC-05): an interval-only due set surfaces no inversion item."
    requirement: "INV-03"
    verification:
      - kind: integration
        ref: "src/routes/practiceInversions.test.ts#single-type-due gate (PRAC-05): interval-only due set yields no inversion item"
        status: pass
      - kind: integration
        ref: "src/routes/practiceInversionsReg.test.ts#REG-01: single-type-due gate (PRAC-05) unaffected by the inversion addition"
        status: pass
    human_judgment: false

duration: 19min
completed: 2026-07-27
status: complete
---

# Phase 35 Plan 06: Wire the inversion family into the /practice host Summary

**The `/practice` host now weaves synthetic inversion items into the hybrid queue on the same due-chord gate as voicing, renders `InversionDrill` for them, and consumes them via `completeSynthetic` with no FSRS write - proven both by a new host integration test and a dedicated REG-01 gate showing the existing five families stay byte-unchanged.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-07-27T01:10:21Z (approx, prior plan's completion commit)
- **Completed:** 2026-07-27T01:29:18Z UTC
- **Tasks:** 3 completed
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments
- `+page.svelte` imports `syntheticInversionItems`/`InversionQueueItem` and `InversionDrill`; a `SYNTHETIC_INVERSION_COUNT = 2` constant mirrors `SYNTHETIC_PROGRESSION_COUNT`'s rationale
- Inside the existing `dueChordSymbols.size > 0` gate, `inversionCandidates` is computed from the due chord symbols and filtered to provenanced symbols when the song filter is active (mirrors the voicing filter's intent, applied to the candidate list rather than the built items); `syntheticInversionItems(inversionCandidates, SYNTHETIC_INVERSION_COUNT, Math.random)` is appended to `syntheticItems` alongside voicing/progression, ahead of the unchanged `composePracticeQueue` call
- `CUE_LABELS` already covered `inversion` (pre-added by Plan 35-04); a new `{:else if currentItem.family === 'inversion'}` branch mounts `<InversionDrill symbol={...} inversionIndex={...} onComplete={() => completeSynthetic()} />`
- `completeSynthetic`'s guard widened to accept `'inversion'` alongside `'voicing'`/`'progression'` - `recordGrade` is never called for it; `completeCarded`'s carded-only allowlist and the `getDueCards`/`applySongFilter`/`selectReviewCards`/`interleaveQueue`/`cardsToQueueItems` path were left untouched
- `src/routes/practiceInversions.test.ts`: a due chord-formula fixture surfaces and renders `inversion-drill` under the `INVERSION` family cue; completing it (via a generic helper that reads the drawn symbol/index straight off the rendered DOM, not a hardcoded RNG replication) advances the queue without ever calling `deck.recordGrade`; an interval-only due set never surfaces `inversion-drill` (PRAC-05)
- `src/routes/practiceInversionsReg.test.ts`: with `syntheticVoicingItems`/`syntheticInversionItems` running REAL (only `syntheticProgressionItems` stubbed for its own draw determinism), proves the six-family interleave has no 3-in-a-row, FSRS grade commit stays exactly the pre-existing three (name-it/interval/build-it), no synthetic completion (voicing/progression/inversion) ever calls `recordGrade`/`recordPracticeAnswer`, the single-type-due gate holds, and song-filter steering restricts the carded half, voicing, AND inversion identically while progressions stay omitted

## Task Commits

Each task was committed atomically:

1. **Task 1: Weave inversion family into the /practice host + practice.cue.inversion key** - `d04b3e4` (feat) - includes the Rule 1 regression fix to 4 pre-existing test files (see Deviations)
2. **Task 2: Host integration test** - `6af1011` (test)
3. **Task 3: REG gate - existing five families byte-unchanged** - `4c155f7` (test)

**Plan metadata:** (final commit hash recorded below after `final_commit` step)

## Files Created/Modified
- `src/routes/practice/+page.svelte` - inversion weave (candidates + song-filter branch + `syntheticInversionItems` call), render branch, `completeSynthetic` guard widened, doc comments updated
- `src/routes/practiceInversions.test.ts` (new) - host integration test for surfacing/rendering/completing an inversion item and the single-type-due gate
- `src/routes/practiceInversionsReg.test.ts` (new) - REG-01 gate: six-family interleave/grade-commit/telemetry, single-type-due gate, song-filter steering, all with inversions genuinely woven in
- `tests/practice-hub.e2e.test.ts`, `tests/practice-hub-mix.e2e.test.ts`, `tests/hub-consolidation.e2e.test.ts`, `src/routes/practiceSeedHandoff.test.ts` - added `syntheticInversionItems: () => []` to each file's existing partial `practiceQueue` mock (Rule 1 regression fix)

## Decisions Made
- Filtered `inversionCandidates` (the symbol list) before calling `syntheticInversionItems`, rather than filtering the built `InversionQueueItem[]` afterward via `filterInversionsBySong` - follows the plan's explicit action text; `filterInversionsBySong` remains exported and unused by the host (available for a future caller)
- Ran the REG-01 gate test with REAL `syntheticVoicingItems`/`syntheticInversionItems` (full host render) rather than stopping at the `composePracticeQueue`/`completeSynthetic` seam the plan flagged as an acceptable fallback - the full render proved tractable and gives a more faithful host-boundary guarantee

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug/Regression] Stubbed `syntheticInversionItems` to `[]` in four pre-existing practice-hub test files**
- **Found during:** Task 1 verification (`npx vitest run` after the host weave change)
- **Issue:** `tests/practice-hub.e2e.test.ts`, `tests/practice-hub-mix.e2e.test.ts`, `tests/hub-consolidation.e2e.test.ts`, and `src/routes/practiceSeedHandoff.test.ts` all use REAL due seventh-chord fixtures (Cm7/Dm7/G7) and only partially mock `$lib/practice/practiceQueue` (stubbing `syntheticVoicingItems`/`syntheticProgressionItems` to `[]` for isolation, established by Phase 27 Plan 05). Because inversions are now woven into the SAME `dueChordSymbols.size > 0` gate as voicing, these fixtures started silently earning real inversion items too, growing queue lengths and breaking hardcoded `'N LEFT'`/family-set assertions (7 failing tests) - a direct, mechanical consequence of this task's own change.
- **Fix:** Added `syntheticInversionItems: () => []` to each file's existing `vi.mock('$lib/practice/practiceQueue', ...)` factory, with a doc-comment note explaining the isolation rationale (mirrors the files' own existing convention for voicing/progression). No test assertions were altered - only the mock surface was extended.
- **Files modified:** `tests/practice-hub.e2e.test.ts`, `tests/practice-hub-mix.e2e.test.ts`, `tests/hub-consolidation.e2e.test.ts`, `src/routes/practiceSeedHandoff.test.ts`
- **Verification:** `npx vitest run tests/practice-hub.e2e.test.ts tests/practice-hub-mix.e2e.test.ts tests/hub-consolidation.e2e.test.ts src/routes/practiceSeedHandoff.test.ts src/routes/practiceScalePractice.test.ts` - 26/26 passing (was 7 failing before the fix); full suite `npx vitest run` - 114 files / 1594 tests passing
- **Committed in:** `d04b3e4` (Task 1 commit, alongside the host weave change that caused the regression)

---

**Total deviations:** 1 auto-fixed (1 bug/regression, directly caused by this plan's own Task 1 change and fixed within the same commit)
**Impact on plan:** None on scope - the fix only extends pre-existing test isolation mocks to cover the new family, it does not alter any assertion or add new test scenarios to those four files. The dedicated new coverage for the inversion family lives entirely in `practiceInversions.test.ts`/`practiceInversionsReg.test.ts`.

## Issues Encountered
- PianoKeyboard's black keys are always aria-labeled by their sharp spelling (`keyAriaLabel(key.sharpLetter)`), never the chord's own flat spelling - both new test files convert `spellChord`'s note letters (e.g. `E♭`) to their sharp equivalent (`D♯`) before querying the DOM by accessible name. Not a code bug (grading is chroma-based and enharmonic-blind by design, per D-01/D-02); purely a test-harness detail, documented inline in both files.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- INV-03 is now fully delivered end-to-end: inversions run inside the one interleaved Practice session as their own synthetic family, gated and song-filtered like voicing/progression, with the existing five families provably byte-unchanged (REG-01).
- Deferred, flagged for the user (not blocking): on-device visual UAT - the inversion family appearing in a real Practice session, bass ring/badge + 2-octave keyboard legibility on phone.
- Phase 37 (the milestone-wide green gate) can proceed against a fully green suite (`npm test` and `npm run check` both clean as of this plan's completion).
- No blockers.

---
*Phase: 35-inversions-new-drill-family*
*Completed: 2026-07-27*

## Self-Check: PASSED

- FOUND: src/routes/practice/+page.svelte
- FOUND: src/routes/practiceInversions.test.ts
- FOUND: src/routes/practiceInversionsReg.test.ts
- FOUND: tests/practice-hub.e2e.test.ts
- FOUND: tests/practice-hub-mix.e2e.test.ts
- FOUND: tests/hub-consolidation.e2e.test.ts
- FOUND: src/routes/practiceSeedHandoff.test.ts
- FOUND: d04b3e4 (feat commit)
- FOUND: 6af1011 (test commit)
- FOUND: 4c155f7 (test commit)
