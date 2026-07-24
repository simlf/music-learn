---
phase: 26-shared-intervalview-component
plan: 03
subsystem: ui
tags: [svelte, svelte5-runes, i18n, interval-theory, tdd]

requires:
  - phase: 26-01
    provides: "stackedThirdsFor(chord) pure derivation, StackedGap/StackedThirds interfaces"
  - phase: 26-02
    provides: "interval-view.* i18n keys (toggle stacked/formula, aria group/stacked/formula) in EN/FR"
provides:
  - "IntervalView.svelte: shared component rendering stacked-thirds (default) or formula view behind a segmented toggle"
  - "DOM contract: data-testid interval-view/interval-stacked/interval-formula/interval-view-toggle, data-view attr"
affects: [26-04, 28-learn-hub]

tech-stack:
  added: []
  patterns:
    - "Component owns only render + local $state toggle; all derivation delegated to Plan 01's pure stackedThirdsFor/formulaFor"
    - "Gated-prop inert rendering: onInspectTone omitted renders the same tone column markup with no button wrapper (mirrors IntervalChip.longName convention)"

key-files:
  created:
    - src/lib/components/IntervalView.svelte
    - src/lib/components/intervalView.test.ts

key-decisions:
  - "Stacked mode's root tone chip label is a display-only override to the word 'root' (lowercase); formula mode keeps 'R' unchanged, matching the UI-SPEC's locked root-label resolution without mutating FormulaEntry/stackedThirdsFor data"
  - "A single shared tone-rendering path (conditional button-vs-div wrapper) serves both stacked and formula modes since both iterate FormulaEntry[] identically; only gap-marker interleaving differs"
  - "Gap markers are plain aria-hidden spans (never IntervalChip, never button) styled --color-muted, preserving the DESIGN-02 reservation that accent colors are tone-chip-only"

patterns-established:
  - "Cross-hub shared component (Lookup now, Learn Phase 28 next) stays prop-driven with zero page-specific coupling, verified by a component test suite that never imports +page.svelte"

requirements-completed: [IVW-01, IVW-02, IVW-03]

coverage:
  - id: D1
    description: "Default render shows the stacked-thirds row (data-view=stacked): tone chips interleaved with neutral +gap markers, first chip labelled 'root'"
    requirement: "IVW-01"
    verification:
      - kind: unit
        ref: "src/lib/components/intervalView.test.ts#IntervalView default (stacked-thirds) render (IVW-01)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Clicking the Formula toggle segment switches to data-view=formula: tone chips only, no gap markers, first chip labelled 'R' (byte-identical to today's row)"
    requirement: "IVW-02"
    verification:
      - kind: unit
        ref: "src/lib/components/intervalView.test.ts#IntervalView formula toggle (IVW-02)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Gap markers render as plain aria-hidden spans (never a button, never IntervalChip); tone chips render via IntervalChip and are the only role=button elements alongside the toggle segments"
    verification:
      - kind: unit
        ref: "src/lib/components/intervalView.test.ts#IntervalView default (stacked-thirds) render (IVW-01) > gap markers are not buttons"
        status: pass
    human_judgment: false
  - id: D4
    description: "Inspect passthrough: tone chips are button.formula-tap with aria-label 'Inspect {letter}' calling onInspectTone(entry) when provided; inert (no button wrapper) when omitted"
    verification:
      - kind: unit
        ref: "src/lib/components/intervalView.test.ts#IntervalView inspect passthrough"
        status: pass
    human_judgment: false
  - id: D5
    description: "Dual naming with solfège accidental carry-through: the E-flat tone shows letter E-flat and solfege Mi-flat in both stacked and formula views"
    requirement: "IVW-03"
    verification:
      - kind: unit
        ref: "src/lib/components/intervalView.test.ts#IntervalView dual naming + accidental carry-through (IVW-03)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Toggle chrome: labels/aria-labels flip live with locale (en Stacked/Formula, fr Empile/Formule, group aria-label Vue des intervalles); active segment aria-pressed=true + primary variant, inactive ghost"
    requirement: "IVW-02"
    verification:
      - kind: unit
        ref: "src/lib/components/intervalView.test.ts#IntervalView toggle i18n + chrome (IVW-02)"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-24
status: complete
---

# Phase 26 Plan 03: IntervalView Component Summary

**Shared `IntervalView.svelte` built: stacked-thirds default (root +m3 ♭3 +M3 5 +m3 ♭7) with a segmented toggle to a byte-identical formula row, reusing IntervalChip for tone chips and neutral muted spans for gap markers, proven by 9 new component tests.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-24T18:18:29Z
- **Completed:** 2026-07-24T18:22:23Z
- **Tasks:** 2 (RED, GREEN)
- **Files modified:** 2

## Accomplishments
- `IntervalView.svelte` exported with `Props { chord: ChordResult; onInspectTone?: (entry: FormulaEntry) => void }`, Svelte 5 runes throughout (`$state`, `$derived`)
- Stacked-thirds default view: tone chips (via `IntervalChip`, keyed by `role`) interleaved with neutral `aria-hidden` gap-marker spans (`+m3`, `+M3`, `+m3` for Cm7); root tone displays the word "root" as a display-only label override
- Formula toggle: clicking the "Formula view" segment switches `data-view="formula"`, rendering `data-testid="interval-formula"` with tone chips only (no gap markers) and the root chip back to "R" — reproduces today's Lookup row byte-for-byte
- Segmented toggle copied structurally from `LocaleToggle` (two `Button` instances, `role="group"`, `aria-pressed`, primary/ghost variants, scoped `:global(.ps-button[aria-pressed='true'])` ink override) using the five `interval-view.*` i18n keys from Plan 02
- Shared inspect-tap passthrough: one rendering path serves both modes — tone columns wrap in `button.formula-tap` (`aria-label="Inspect {letter}"`) calling `onInspectTone(entry)` when the prop is provided, and render as inert plain `div` columns (same chip/letter/solfège markup, no button, no click handler) when omitted
- Dual naming (letter then solfège) carries through both modes, including accidentals (E♭ → Mi♭)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the IntervalView component test (RED)** - `f645d88` (test)
2. **Task 2: Implement IntervalView.svelte (GREEN)** - `8765c1f` (feat)

_TDD cycle: RED confirmed the suite failed at import resolution (`Failed to resolve import "./IntervalView.svelte"`) before the component existed. GREEN implementation passed 8/9 assertions on first pass; one test-file bug (a `getByText('+m3')` call that matched 2 elements, since Cm7's stacked gaps are `+m3, +M3, +m3`) was fixed in the test itself, then all 9 passed._

## Files Created/Modified
- `src/lib/components/IntervalView.svelte` - New shared component: toggle + stacked/formula tone-row rendering, gap markers, inspect passthrough
- `src/lib/components/intervalView.test.ts` - New component test suite (9 tests across 5 describe blocks)

## Decisions Made
- Root tone chip label override to "root" (stacked) vs "R" (formula) implemented as a `displayLabel(entry)` helper computed at render time from `view` + `entry.role`, never mutating `FormulaEntry`/`stackedThirdsFor` data — keeps the single naming source intact per Plan 01's contract
- One shared tone-column snippet (repeated per-mode in `{#each}` blocks with a `{#if onInspectTone}` button-vs-div branch) rather than extracting a Svelte snippet/component, since the two blocks differ only in whether a gap marker is interleaved — kept simple and directly testable without adding an internal sub-component
- Gap markers use `aria-hidden="true"` plain `<span>` (never `IntervalChip`, never a button), per the UI-SPEC's explicit table distinguishing tone chips (colored, bordered, 44px tap target) from gap markers (muted, no border, no fill, non-interactive)

## Deviations from Plan

None - plan executed exactly as written. (One self-authored test bug was caught and fixed during GREEN, not a deviation from the plan itself — see Task Commits note above.)

## Issues Encountered

A pre-existing test failure was discovered while running the full suite, unrelated to this plan: `src/lib/i18n/messages.test.ts`'s domain-key-collision count assertion (expects 496, receives 501) — confirmed via `git stash` to reproduce identically without this plan's changes. It stems from Plan 02's `interval-view.ts` domain file (5 new keys) not updating this test's hardcoded expected total. Out of scope for Plan 03 (files_modified is `IntervalView.svelte`/`intervalView.test.ts` only); logged to `.planning/phases/26-shared-intervalview-component/deferred-items.md` for Plan 04 or a follow-up quick task.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `IntervalView.svelte` is ready as a pure drop-in for Plan 04's Lookup-page integration (replace the inline `data-testid="interval-formula"` block at `+page.svelte` ~line 376-389 with `<IntervalView chord={result} onInspectTone={inspectFormulaEntry} />`) — formula mode already reproduces that block byte-for-byte per REG-01.
- Also ready for Phase 28's Learn hub to embed the same component instance with zero changes, per the phase's stated purpose.
- Pre-existing `messages.test.ts` count assertion needs updating (496 → 501) before/during Plan 04 or as a quick task — not blocking, but flagged.
- `npm run check`: 0 errors, 0 warnings (1367 files). Full suite: 1540/1541 passing (the 1 failure is the pre-existing, unrelated `messages.test.ts` count assertion above); `intervalView.test.ts` itself is 9/9 green.

---
*Phase: 26-shared-intervalview-component*
*Completed: 2026-07-24*

## Self-Check: PASSED

- FOUND: src/lib/components/IntervalView.svelte
- FOUND: src/lib/components/intervalView.test.ts
- FOUND: commit f645d88 (test)
- FOUND: commit 8765c1f (feat)
