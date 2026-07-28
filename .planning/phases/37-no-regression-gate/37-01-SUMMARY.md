---
phase: 37-no-regression-gate
plan: 01
subsystem: testing
tags: [vitest, fsrs, chroma-grading, regression-testing, requirements-traceability]

# Dependency graph
requires:
  - phase: 32-shape-legibility
    provides: CountingChipRow chip grammar (SHAPE-01)
  - phase: 33-voicing-ux
    provides: ShellVoicingDrill add/drop lean nudge flow (VOICE-01)
  - phase: 34-progression-scaffold
    provides: ProgressionDrill hint ladder + beginner keyboard (SCAF-01, SCAF-02)
  - phase: 35-inversions
    provides: inversion drill family, matchInversion, inversions engine, synthetic queue family (INV-01/02/03)
  - phase: 36-queue-ordering
    provides: composePracticeQueue lowMastery guard + isLowMasterySession (QUEUE-01)
provides:
  - REG-01 coverage matrix mapping six preserved behaviors and five new v2.3 surfaces to proving test files
  - Six-family cross-surface capstone integration test at the pure composePracticeQueue boundary
affects: [37-02-milestone-green-gate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Coverage matrix as a dedicated traceability doc (mirrors v2.2's 31-COVERAGE-MATRIX.md): Table A (preserved behaviors) + Table B (new surfaces) + audit conclusion, each row citing a real, spot-read test file."
    - "Cross-surface capstone as a NEW pure-composer test file rather than extending a host-level e2e test, when the property under test (all six families in one array) is itself a composer-level property."

key-files:
  created:
    - .planning/phases/37-no-regression-gate/37-COVERAGE-MATRIX.md
    - src/lib/practice/practiceQueueCapstone.test.ts
  modified: []

key-decisions:
  - "Coverage matrix lives as a dedicated file (37-COVERAGE-MATRIX.md), not inline in the capstone test, mirroring the v2.2 Phase 31 precedent."
  - "Capstone is a new pure-composer test file (practiceQueueCapstone.test.ts) rather than an extension of src/routes/practiceInversionsReg.test.ts, because all four properties under test (interleaving, single-type-due gate, song-filter, cold-session ordering) are composer-level, and the host-level six-family end-state is already proven one level up."
  - "Audit concluded no genuine coverage gap and no behavior regression: ran the full suite directly during the audit (115 files, 1611 tests, 0 failures), matching the 37-CONTEXT baseline exactly, so no Task 1b gap-fill test was needed."

patterns-established:
  - "When a milestone phase's final gate needs a cross-surface proof, add it at the lowest shared pure-function boundary (here, composePracticeQueue) rather than duplicating host-level render assertions, and cross-reference both directions (capstone header points to the matrix and to the host REG test; the matrix cites the capstone)."

requirements-completed: [REG-01]

coverage:
  - id: D1
    description: "REG-01 coverage matrix maps every preserved behavior (chroma/MIDI grading, FSRS, tiers, telemetry, song-filter, ear-naming never-gates) and every new v2.3 surface (chip grammar, voicing nudges, progression ladder, inversion family, cold-session ordering) to a real, green, spot-read test file, with an audit conclusion stating PRESENT for every row and no genuine gap or regression found."
    requirement: "REG-01"
    verification:
      - kind: other
        ref: "verify loop: every cited src/*.test.ts and tests/*.test.ts path in 37-COVERAGE-MATRIX.md resolved to a real file on disk; grep confirmed zero em dashes."
        status: pass
    human_judgment: false
  - id: D2
    description: "Six-family cross-surface capstone integration test proves name-it, build-it, interval, voicing, progression, and inversion coexist in one composePracticeQueue call with interleaving, the single-type-due gate, the synthetic-half song filter, and cold-session ordering all intact together."
    requirement: "REG-01"
    verification:
      - kind: unit
        ref: "src/lib/practice/practiceQueueCapstone.test.ts (9 tests, all passing)"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-07-27
status: complete
---

# Phase 37 Plan 01: REG-01 Coverage Matrix + Six-Family Capstone Summary

**Produced the REG-01 traceability matrix confirming all six preserved v2 behaviors and five new v2.3 surfaces are covered by real green tests, plus a new pure-composer capstone test that proves all six practice families coexist in one composePracticeQueue with interleaving, the single-type-due gate, song-filter, and cold-session ordering intact.**

## Performance

- **Duration:** ~8 min (03:03 plan creation to 05:09 last commit; execution itself ran within this window)
- **Started:** 2026-07-27T05:03:30+02:00
- **Completed:** 2026-07-27T05:09:13+02:00
- **Tasks:** 2
- **Files modified:** 2 (both new files)

## Accomplishments

- Enumerated the real test surface (127 `*.test.ts` files via `find`), spot-read every file cited in the matrix before citing it, and confirmed the full suite passes directly (`npx vitest run`: 115 test files, 1611 tests, 0 failures), matching the 37-CONTEXT baseline exactly.
- Wrote `.planning/phases/37-no-regression-gate/37-COVERAGE-MATRIX.md`: Table A maps the six preserved behaviors (chroma/MIDI grading, FSRS scheduling, practice tiers, telemetry, song-filter, ear-naming never-gates) to their proving unit tests plus two host-level corroboration files; Table B maps the five new v2.3 surfaces (chip grammar/Phase 32, voicing add/drop nudges/Phase 33, progression hint ladder + beginner keyboard/Phase 34, inversion drill family/Phase 35, cold-session queue ordering/Phase 36) to their proving test files. Audit conclusion: every row PRESENT, no genuine gap, no behavior regression.
- Wrote `src/lib/practice/practiceQueueCapstone.test.ts`: a new pure-composer test file with 9 passing tests proving (1) all six families compose into a faithful permutation with no 3-in-a-row and preserved within-family order across 5 seeds, (2) the single-type-due gate passes each of the six families through unchanged in isolation, (3) `filterVoicingsBySong` + `filterInversionsBySong` restrict the synthetic half of a composed queue to the allowed symbol, and (4) cold-session ordering (`{ lowMastery: true }`) never leads with a `SCAFFOLD_HEAVY` family across 8 seeds when a simpler one is present.

## Task Commits

Each task was committed atomically:

1. **Task 1: Audit REG-01 coverage and write the coverage matrix** - `83d346b` (docs)
2. **Task 2: Add the six-family cross-surface capstone integration test** - `eba43c0` (test)

**Plan metadata:** (this commit, following this SUMMARY)

## Files Created/Modified

- `.planning/phases/37-no-regression-gate/37-COVERAGE-MATRIX.md` - REG-01 traceability matrix (Table A preserved behaviors, Table B new v2.3 surfaces, audit conclusion)
- `src/lib/practice/practiceQueueCapstone.test.ts` - six-family cross-surface capstone integration test over `composePracticeQueue`

## Decisions Made

- Coverage matrix as a dedicated file mirroring v2.2's `31-COVERAGE-MATRIX.md`, not inline in the capstone test (per 37-CONTEXT's Claude's-Discretion note), finalized here.
- Capstone as a brand-new pure-composer test file rather than extending `src/routes/practiceInversionsReg.test.ts`, since the four properties under test are all composer-level and the host-level six-family end-state (grade-commit split, telemetry silence) is already proven at that host boundary; duplicating it there would add no new proof.
- No Task 1b gap-fill test: the audit found every behavior and surface already covered, and the direct full-suite run (115 files / 1611 tests / 0 failures) confirmed no regression, so the "fill only genuine gaps" scope-discipline rule from 37-CONTEXT meant stopping at the matrix + capstone as planned.

## Deviations from Plan

None - plan executed exactly as written. No genuine coverage gap was found (so Task 1b was not triggered) and no genuine behavior regression was found (so the capstone was not skipped and no "REG-01 DEFECT FOUND" heading was needed).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 37-02 (milestone green gate: `npm run build`, `npm test`, `npm run check`, REQUIREMENTS.md traceability, marking REG-01 delivered) can proceed; this plan's audit already confirmed the suite is green (115 files, 1611 tests before this plan's additions, plus 9 new capstone tests, all passing) and `svelte-check` reports 0 errors/0 warnings on the new capstone file.
- No blockers.

---
*Phase: 37-no-regression-gate*
*Completed: 2026-07-27*

## Self-Check: PASSED

- FOUND: .planning/phases/37-no-regression-gate/37-COVERAGE-MATRIX.md
- FOUND: src/lib/practice/practiceQueueCapstone.test.ts
- FOUND: commit 83d346b (Task 1)
- FOUND: commit eba43c0 (Task 2)
