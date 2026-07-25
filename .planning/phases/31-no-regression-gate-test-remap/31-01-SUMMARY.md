---
phase: 31-no-regression-gate-test-remap
plan: 01
subsystem: test-coverage
tags: [testing, e2e, regression-gate, hub-consolidation]
status: complete
dependency-graph:
  requires: []
  provides:
    - REG-02 coverage matrix (31-COVERAGE-MATRIX.md)
    - cross-hub capstone integration test (tests/hub-consolidation.e2e.test.ts)
  affects:
    - Phase 31 Plan 02 (the milestone's final full-suite + svelte-check gate)
tech-stack:
  added: []
  patterns:
    - "Cross-hub capstone test file sharing one module-level vi.mock harness (union of every hub page's dependency needs) across multiple describe blocks in one file"
key-files:
  created:
    - tests/hub-consolidation.e2e.test.ts
    - .planning/phases/31-no-regression-gate-test-remap/31-COVERAGE-MATRIX.md
  modified: []
decisions:
  - "Both CONTEXT-flagged thin spots (interval-family presence in the merged Practice mix; a single-type-due assertion that truly gates variety injection) were found already covered by tests/practice-hub-mix.e2e.test.ts - no gap-fill assertion was needed, no production source touched."
  - "The Practice flow in the capstone drives the build-it family (chroma-graded via PianoKeyboard key taps and matchChord), not name-it or interval-identification (both are symbol/string picks), since REG-01's locked constraint is grade-by-chroma; practiceQueue's synthetic builders (voicing/progression) are stubbed to [] for this one flow so exactly one due card drives the round to completion, isolating the capstone's own single-flow scope from the five-family weave already proven end-to-end in tests/practice-hub-mix.e2e.test.ts."
metrics:
  duration: ~35 min
  completed: 2026-07-25
---

# Phase 31 Plan 01: No-Regression Gate & Test Remap Summary

Audited the REG-02 acceptance list item-by-item against the Phase 26-30 test suite and added the milestone's one cross-hub capstone integration test proving the consolidated four-hub topology and one core flow per hub survive together end-to-end.

## What Was Built

**Task 1 - REG-02 coverage audit (`31-COVERAGE-MATRIX.md`):** Walked every REG-02 acceptance item (per-route test remap to the absorbing hub, merged Practice queue interleaving including the single-type-due gate, IntervalView stacked-vs-formula per chord quality plus accidental carry-through, and a redirect-shim test per old route) against the existing suite from Phases 26-30, citing the exact owning test file and assertion/describe block for each. Re-ran the four suites the plan's own `<verify>` names (`tests/practice-hub-mix.e2e.test.ts`, `src/lib/components/intervalView.test.ts`, `src/lib/lookup/chordPresentation.test.ts`, `src/routes/redirectShims.test.ts` - 55 tests) to confirm each citation points at a real, currently-passing assertion. Both thin spots the 31-CONTEXT flagged were found already covered:
- Interval FAMILY drill presence in the merged mix: `tests/practice-hub-mix.e2e.test.ts`'s `five-family interleaving (PRAC-02)` describe asserts `'INTERVAL'` is in the observed families set and drives the real `practice-interval-drill` component through `completeInterval()`.
- Single-type-due variety-injection gate: the same file's `single-type-due gate (PRAC-05)` describe asserts an interval-only due set yields an intervals-only session and `syntheticProgressionItemsMock` is never called.

No REG-02 item was orphaned or duplicated without reason, and no production source was touched (the audit surfaced no genuine behavior regression to record as a blocker).

**Task 2 - Cross-hub capstone (`tests/hub-consolidation.e2e.test.ts`):** New REG-01 integration test with 7 tests across 6 describe blocks:
- **Topology (HUB-01):** renders `+layout.svelte` and asserts the desktop masthead exposes exactly Lookup/Practice/Learn/Progress (no More link/button), and the phone bottom-tab-bar exposes the same 4 hrefs with no More button.
- **Redirects (HUB-03):** one compact data-driven loop over all 8 old routes (`/drills`, `/build`, `/voicings`, `/progressions` -> `/practice`; `/scales`, `/theory` -> `/learn`; `/recall`, `/songs` -> `/progress`), each asserting a 308 status and the correct `location`.
- **Lookup flow:** stamps `Cm7`, asserts the chord-result and its IntervalView render stacked-thirds by default, then toggles to Formula and asserts the `R`/`m3` chip labels.
- **Practice flow:** renders `/practice` with exactly one due build-it card (`Cm7`), starts the session, drives the real chroma key-tap sequence (`D♯`, `G`, `A♯`) through the mounted `BuildSession` component, clicks Next, and asserts the round-complete end card plus a real `deck.recordGrade` call (BuildSession's own internal commit, using the same mocked deck module - never a stubbed grade path).
- **Learn flow:** asserts `learn-theory`, the exploreOnly `learn-explore` (no `mode-toggle`), and exactly 5 `interval-view` instances inside `learn-interval-reference`.
- **Progress flow:** asserts Stats is the default tab, switches to Recall and reveals the recall map grid via the Review|Map toggle, then switches to Songs and performs a real song-filter write, asserting `readSongFilter()` flips from `false` to `true`.

The file's mock harness is a module-level union of the exact mock shapes already proven by `tests/masthead.e2e.test.ts`, `tests/lookup.e2e.test.ts`, `src/routes/learn.test.ts`, `tests/practice-hub-mix.e2e.test.ts`, and `tests/progress-hub.e2e.test.ts` - reused, not re-derived, so every describe block exercises the same real logic those suites already proved rather than a stub.

## Verification

- `npx vitest run tests/hub-consolidation.e2e.test.ts` - 7/7 pass.
- `npx vitest run tests/hub-consolidation.e2e.test.ts tests/practice-hub-mix.e2e.test.ts src/lib/components/intervalView.test.ts src/lib/lookup/chordPresentation.test.ts src/routes/redirectShims.test.ts` - 62/62 pass.
- `npx svelte-check --tsconfig ./tsconfig.json` - 0 errors, 0 warnings (1379 files).
- Full suite sanity check (not required by this plan's own `<verify>`, but run as a pre-summary safety net): `npm test` - 107 files / 1466 tests pass (1459 prior + 7 new from the capstone).

## Deviations from Plan

**1. [Rule 1 - Bug] Fixed a TS spread-argument type error in the capstone's synthetic-builder mock stubs**
- **Found during:** Task 2, `svelte-check` pass before commit.
- **Issue:** `syntheticVoicingItemsMock`/`syntheticProgressionItemsMock` were declared as `vi.fn(() => [])` (zero-arg inferred signature), then wrapped as `(...args: unknown[]) => syntheticVoicingItemsMock(...args)` - svelte-check flagged "A spread argument must either have a tuple type or be passed to a rest parameter" since the mock's inferred type takes no parameters.
- **Fix:** Typed both mocks explicitly as `vi.fn((..._args: unknown[]) => [] as unknown[])`, matching the rest-parameter signature the wrapper spreads into.
- **Files modified:** `tests/hub-consolidation.e2e.test.ts` (same commit as Task 2, fixed before commit).
- **Commit:** d96325f.

No other deviations. Both tasks executed as planned; no architectural changes, no auth gates, no production source modified.

## Known Stubs

None. The capstone's mocks (deck, introBudget, telemetry, audio, api/progress, api/client, levelState) are boundary mocks matching the established per-hub test conventions, not stubs that mask the flow under test - the Practice flow specifically drives a real chroma-graded key-tap sequence through the actual `BuildSession` component and asserts the actual `deck.recordGrade` mock was invoked, per T-31-01's mitigation.

## Threat Flags

None. This plan added test files and one planning doc only (per its own threat model: no new trust boundary, no production source change).

## Self-Check: PASSED

- FOUND: `tests/hub-consolidation.e2e.test.ts`
- FOUND: `.planning/phases/31-no-regression-gate-test-remap/31-COVERAGE-MATRIX.md`
- FOUND commit c3687be (docs(31-01): audit REG-02 coverage matrix, confirm both thin spots covered)
- FOUND commit d96325f (test(31-01): add cross-hub capstone integration test (REG-01))
