---
phase: 13-multi-modal-recall
plan: 02
subsystem: ui
tags: [svelte5, recall-map, accessibility, css]

requires:
  - phase: 13-multi-modal-recall
    provides: "13-01's widened deck.ts Mode union ('formula' | 'formula-build' | 'see-play' | 'hear-name')"
provides:
  - "RecallMap.svelte's MODE_COLUMNS widened from 1 to 4 entries (Formula, Build, Play, Name) in fading-scaffold order"
  - "A columnApplies(fact, column) applicability gate that decides, per cell, whether to call deriveCellState or render the new 'not applicable' texture"
  - "A UI-only 'not applicable' cell treatment (flat --color-paper fill, no border, middle-dot glyph, aria-label) for interval-size/scale-degree rows' Build/Play/Name columns"
affects: [13-03, 13-04, 13-05, 13-06]

tech-stack:
  added: []
  patterns:
    - "Applicability-gated conditional rendering computed BEFORE calling a data-layer function (deriveCellState), keeping UI-only concepts (not applicable) fully out of the data schema (deck.ts's CellState)"

key-files:
  created: []
  modified:
    - src/lib/components/RecallMap.svelte
    - src/lib/components/recallMap.test.ts

key-decisions:
  - "columnApplies() is a plain synchronous function of fact.factKind, called inline in the {#each MODE_COLUMNS} loop's {#if}/{:else} branch, so deriveCellState is provably never invoked for inapplicable cells (verified via a call-counting spy, not just visual output)"
  - "The not-applicable cell's glyph color (--color-faint) is set once on the parent .recall-map__cell--not-applicable class rather than a nested span selector, since the span has no other styling to conflict with"

requirements-completed: [RECALL-01]

coverage:
  - id: D1
    description: "MODE_COLUMNS grows from 1 to 4 entries (Formula, Build, Play, Name) in fading-scaffold order; chord-formula fact rows render a real deriveCellState-driven cell in all 4 columns"
    requirement: "RECALL-01"
    verification:
      - kind: unit
        ref: "src/lib/components/recallMap.test.ts#extends to 4 mode columns in fading-scaffold order (Formula, Build, Play, Name)"
        status: pass
      - kind: unit
        ref: "src/lib/components/recallMap.test.ts#chord-formula rows get 4 real cells; interval-size/scale-degree rows get 1 real cell plus 3 not-applicable cells"
        status: pass
    human_judgment: false
  - id: D2
    description: "interval-size/scale-degree fact rows render a real cell only in the Formula column; Build/Play/Name render the 'not applicable' texture (flat paper fill, no border, middle-dot glyph, 'Not applicable' aria-label) and never call deriveCellState for those three cells"
    requirement: "RECALL-01"
    verification:
      - kind: unit
        ref: "src/lib/components/recallMap.test.ts#chord-formula rows get 4 real cells; interval-size/scale-degree rows get 1 real cell plus 3 not-applicable cells"
        status: pass
      - kind: unit
        ref: "src/lib/components/recallMap.test.ts#never calls deriveCellState for the non-applicable Build/Play/Name columns on interval-size rows"
        status: pass
    human_judgment: false
  - id: D3
    description: "The 4-entry legend, kind filter tabs, and grid-template-columns sizing continue to work unchanged at N=4 columns; no 5th legend entry for 'not applicable'"
    requirement: "RECALL-01"
    verification:
      - kind: unit
        ref: "src/lib/components/recallMap.test.ts#renders all four cell states with the correct treatment/glyph, and the legend (pre-existing, unmodified)"
        status: pass
      - kind: unit
        ref: "src/lib/components/recallMap.test.ts#narrows the visible rows via the kind filter tabs (pre-existing, unmodified)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Visual review of the live /recall Map view: 4-column grid, chord rows fully populated, interval/scale rows show a quiet borderless dot in the 3 inapplicable columns, legend still lists only 4 entries"
    verification: []
    human_judgment: true
    rationale: "Requires visually confirming the not-applicable texture reads as distinct from the not-yet-seen border treatment in the browser; not mechanically verifiable from unit test DOM assertions alone."

duration: 4min
completed: 2026-07-15
status: complete
---

# Phase 13 Plan 02: RecallMap 4-Column Grid + Not-Applicable Cell Summary

**RecallMap.svelte's MODE_COLUMNS widened from 1 to 4 entries (Formula/Build/Play/Name); a columnApplies() gate renders a genuine deriveCellState cell for chord-formula rows across all 4 columns while interval-size/scale-degree rows get a quiet, borderless "not applicable" texture (flat paper fill, middle-dot glyph) for the 3 non-Formula columns, with zero changes to deck.ts's CellState vocabulary or the 4-entry legend.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-15T16:54:53Z
- **Completed:** 2026-07-15T16:58:53Z
- **Tasks:** 1 (RED, GREEN)
- **Files modified:** 2

## Accomplishments
- `RecallMap.svelte`'s `MODE_COLUMNS` widened to the exact 4-entry, fading-scaffold-ordered array (`formula`/Formula, `formula-build`/Build, `see-play`/Play, `hear-name`/Name), typed against 13-01's widened `Mode` union via `satisfies readonly { mode: Mode; label: string }[]`.
- New `columnApplies(fact, column)` helper gates every cell render: chord-formula rows get a real `deriveCellState`-driven cell in all 4 columns; interval-size/scale-degree rows get a real cell only in Formula, with the new "not applicable" treatment (`data-cell-state="not-applicable"`, flat `--color-paper` fill, no border, `·` glyph, `aria-label` ending "Not applicable") for Build/Play/Name.
- `recallMap.test.ts` extended (not replaced) with 3 new cases: 4-column header order + `grid-template-columns` at N=4, full applicability-gated cell/legend assertions for both chord and non-chord rows, and a `deriveCellState` call-count spy proving it is never invoked for the 3 non-applicable columns on interval-size rows.
- `deck.ts`'s `CellState`/`deriveCellState` confirmed untouched (grep + diff review); the legend still renders exactly its original 4 entries with no 5th "not applicable" row.

## Task Commits

Each task was committed atomically (TDD RED/GREEN):

1. **Task 1 RED: add failing tests for 4-column RecallMap + not-applicable cells** - `e1f49d6` (test)
2. **Task 1 GREEN: extend RecallMap to 4 mode columns with not-applicable cells** - `af94b42` (feat)

**Plan metadata:** (this commit)

_TDD gate sequence confirmed in git log: test(13-02) before feat(13-02); no refactor commit needed (implementation was clean on first pass)._

## Files Created/Modified
- `src/lib/components/RecallMap.svelte` - `MODE_COLUMNS` widened to 4 entries; new `columnApplies()` applicability gate; conditional not-applicable cell markup; new `.recall-map__cell--not-applicable` CSS rule
- `src/lib/components/recallMap.test.ts` - 3 new test cases added (4-column header/grid assertions, applicability-gated cell/legend assertions, deriveCellState call-count spy); the 2 pre-existing tests are untouched and still pass

## Decisions Made
- `columnApplies()` is computed inline in the `{#each MODE_COLUMNS}` loop's `{#if}/{:else}` branch (not as a `$derived` or precomputed map), keeping the applicability check a plain synchronous function of `fact.factKind` per the plan's explicit instruction, and making the "deriveCellState never called for n/a cells" guarantee mechanically true rather than merely visually true.
- The not-applicable glyph's `--color-faint` color is set on the parent `.recall-map__cell--not-applicable` class (inherited by the child `<span>`) rather than via a nested selector, since no other color rule needs to apply to that span.
- Verified `deriveCellState`'s non-invocation for inapplicable cells via a `vi.fn()` wrapper around the real implementation (imported via `importOriginal`) rather than a full mock, so the four real cell-state classifications continue to exercise Phase 11's genuine `deriveCellState` logic while still allowing a call-count assertion.

## Deviations from Plan

None - plan executed exactly as written. No architectural questions arose; the applicability check, cell markup, and CSS rule all matched the plan's `<action>` block verbatim.

## Issues Encountered
None.

## TDD Gate Compliance

Gate sequence verified in git log:
1. RED (`test(13-02): ...`) - `e1f49d6`
2. GREEN (`feat(13-02): ...`) - `af94b42`

Both gates present in correct order. No REFACTOR commit needed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `RecallMap.svelte` is ready for Phase 13's remaining RecallSession mode-surface plans (13-03 through 13-06) to populate real `formula-build`/`see-play`/`hear-name` card records for chord-formula facts - the map will render their genuine states with no further RecallMap.svelte changes needed.
- `deck.ts`'s `CellState`/`deriveCellState`, the legend, kind filter tabs, and grid sizing are all confirmed unchanged - no regressions to any Phase 11/12 consumer (full 917-test suite passes, `npm run check` clean).
- No blockers for the remaining Phase 13 plans.

---
*Phase: 13-multi-modal-recall*
*Completed: 2026-07-15*

## Self-Check: PASSED

- FOUND: src/lib/components/RecallMap.svelte
- FOUND: src/lib/components/recallMap.test.ts
- FOUND: .planning/phases/13-multi-modal-recall/13-02-SUMMARY.md
- FOUND: commit e1f49d6 (test: RED)
- FOUND: commit af94b42 (feat: GREEN)
