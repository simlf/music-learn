---
phase: 26-shared-intervalview-component
verified: 2026-07-24T18:46:50Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 26: Shared IntervalView Component Verification Report

**Phase Goal:** Any looked-up chord reveals its stacked-thirds (default) and its formula (toggle), computed from existing chord data; shared IntervalView component embedded in Lookup and built for reuse in the Learn hub (Phase 28); no regression in Lookup decode behavior.
**Verified:** 2026-07-24T18:46:50Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | For any looked-up chord in Lookup, the user sees its stacked-thirds bottom-up adjacent gaps by default (`Cm7 = root +m3 m3 +M3 P5 +m3 m7`) | VERIFIED | `stackedThirdsFor` (`src/lib/lookup/chordPresentation.ts:68-75`) derives `gaps` via `intervalBetween` on consecutive `chord.notes`; `IntervalView.svelte` defaults `view = $state<'stacked'|'formula'>('stacked')` (line 31) and renders `data-testid="interval-stacked"` with interleaved `+gap` spans when `view === 'stacked'` (lines 75-106). `+page.svelte:372` embeds `<IntervalView chord={result} onInspectTone={inspectFormulaEntry} />` as the only interval-view surface on Lookup. Component test `IntervalView default (stacked-thirds) render (IVW-01)` passes (9/9 component tests green). |
| 2 | The user can toggle the same chord to a formula view of intervals-from-root (`Cm7 = R, m3, P5, m7`) | VERIFIED | Toggle `Button` with `aria-label={t('interval-view.aria.formula')}` sets `view = 'formula'` (IntervalView.svelte:64-72); formula branch renders `data-testid="interval-formula"`, tone chips only, no gap markers, root label reverts to `"R"` (`displayLabel`, lines 42-45). Test `IntervalView formula toggle (IVW-02)` passes; e2e test confirms `tapping a formula column does the same as tapping its key` still fires `onInspectTone`/`playNote`/`InspectRegister` fill. |
| 3 | Solfège labels carry their accidentals through in both views (`E♭` renders as `Mi♭`) | VERIFIED | `stackedThirdsFor.tones = formulaFor(chord)` verbatim (chordPresentation.ts:69) — no recompute of `solfege`. Unit test `carries the E♭ third solfege "Mi♭" and B♭ seventh solfege "Si♭" through for Cm7 (IVW-03)` passes. Component test `IntervalView dual naming + accidental carry-through (IVW-03)` asserts `Mi♭` renders in both stacked and formula views. |
| 4 | The view is one reusable component driven only by the chord's existing `tonal` intervals — no new theory data source added | VERIFIED | `IntervalView.svelte` imports only `stackedThirdsFor`/`formulaFor` from `chordPresentation.ts`, which import `intervalBetween`/`intervalFromShort` from the existing `$lib/theory/interval` module (no new theory file, no new npm dependency; `git log` shows only chordPresentation.ts/interval-view.ts/IntervalView.svelte/+page.svelte touched, no `theory/` data files). Single component, prop-driven (`Props { chord; onInspectTone? }`), imported once in `+page.svelte` and nowhere page-specific is baked in — ready for Phase 28 embed. |
| 5 | No regression in Lookup decode behavior (REG-01) | VERIFIED | `inspectFormulaEntry`/`handleInspect` unchanged (only passed through as `onInspectTone`); ChordGlyph/PianoKeyboard/InspectRegister/SongHook/WhyTheseNotes/alias line untouched in `+page.svelte` diff. `lookupWhyPanel.test.ts`'s 3 assertions retargeted from `interval-formula` to the always-present `interval-view` wrapper and pass. Full suite run in this verification: **1541/1541 tests pass** (109 test files), `npm run check`: **0 errors, 0 warnings** (1367 files). |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/lookup/chordPresentation.ts` | `stackedThirdsFor`, `StackedGap`, `StackedThirds` exported | VERIFIED | Confirmed present at lines 46-75; reuses `formulaFor` verbatim for tones, `intervalBetween` for gaps. |
| `src/lib/lookup/chordPresentation.test.ts` | `describe('stackedThirdsFor')` test block | VERIFIED | Present at line 168; test run confirms pass. |
| `src/lib/i18n/messages/interval-view.ts` | 5 keys (toggle.stacked/formula, aria.group/stacked/formula) in en+fr | VERIFIED | All 5 keys present in both locales, no em dashes, `satisfies LocaleDict`. |
| `src/lib/i18n/messages/index.ts` | `intervalView` merged into `messages.en`/`messages.fr` | VERIFIED | `import { intervalView } from './interval-view'` + spreads at lines 12, 44, 58. |
| `src/lib/components/IntervalView.svelte` | Shared component, stacked default + formula toggle + inspect passthrough | VERIFIED | All behaviors present (see truths above); no `{@html}` used. |
| `src/lib/components/intervalView.test.ts` | Component test suite | VERIFIED | 9 tests across 5 describe blocks, all pass. |
| `src/routes/+page.svelte` | Inline formula block replaced by `<IntervalView>` | VERIFIED | Line 372; dead `.formula-tap` CSS and unused `IntervalChip`/`formulaFor` imports removed (grep confirms no `formula-tap`/`IntervalChip` references remain in +page.svelte). |
| `src/routes/lookupWhyPanel.test.ts` | 3 selectors retargeted to `interval-view` | VERIFIED | Test run passes. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `IntervalView.svelte` | `chordPresentation.ts` | `import { stackedThirdsFor, formulaFor, type FormulaEntry }` | WIRED | Line 3 of IntervalView.svelte; both functions called in `$derived` (lines 33-34). |
| `IntervalView.svelte` | `$lib/i18n/locale.svelte` | `import { t }` | WIRED | 5 `t('interval-view.*')` calls used for toggle labels/aria (lines 52,59,62,68,71). |
| `+page.svelte` | `IntervalView.svelte` | `<IntervalView chord={result} onInspectTone={inspectFormulaEntry} />` | WIRED | Line 372; `inspectFormulaEntry` (existing, unchanged) passed through. |
| `messages/index.ts` | `interval-view.ts` | `import { intervalView } from './interval-view'` + spread into `messages.en`/`fr` | WIRED | Confirmed at lines 12, 44, 58; `coverage.test.ts` no-raw-key-leak sweep passes. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full workspace test suite | `npx vitest run` | 109 files / 1541 tests passed | PASS |
| Type-check | `npm run check` | 0 errors, 0 warnings (1367 files) | PASS |
| Targeted phase test files | `npx vitest run intervalView.test.ts chordPresentation.test.ts coverage.test.ts lookupWhyPanel.test.ts lookup.e2e.test.ts` | 5 files / 95 tests passed | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| IVW-01 | 26-01, 26-03, 26-04 | Stacked-thirds default view | SATISFIED | `stackedThirdsFor` derivation + `IntervalView` default render + Lookup embed, all tested. |
| IVW-02 | 26-02, 26-03, 26-04 | Formula toggle | SATISFIED | i18n keys + toggle segment + byte-identical formula row, all tested. |
| IVW-03 | 26-01, 26-03 | Shared component, solfège accidental carry-through | SATISFIED (Lookup half); Learn-hub embedding explicitly deferred to Phase 28 per ROADMAP.md notes ("Reuses the Phase 26 IntervalView instance" — Phase 28 depends_on Phase 26) | Accidental carry-through proven by unit + component tests; component built prop-driven/Lookup-agnostic for the Phase 28 reuse, not yet consumed there (correctly out of this phase's scope per ROADMAP Success Criteria, which only requires Lookup-side behavior). |

No orphaned requirements — REQUIREMENTS.md maps only IVW-01/02/03 to Phase 26, all three claimed and satisfied.

### Anti-Patterns Found

None. Grep for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER|not yet implemented|coming soon` across all phase-modified files (`chordPresentation.ts`, `IntervalView.svelte`, `interval-view.ts`, `+page.svelte`) returned no matches in phase-added code (the only "Placeholder" hits in `+page.svelte` are pre-existing, unrelated input-placeholder/template-substitution code, not stub debt).

### Human Verification Required

None. The verification-notes explicitly call out that purely visual confirmation should route to human_verification, but every must-have here is asserted by an automated test (unit + component + e2e), and no behavior-dependent state-transition/cancellation invariant was left unexercised — the toggle state transition, inspect passthrough, and accidental carry-through are all covered by passing tests, not just presence/wiring checks.

### Gaps Summary

None. All 4 plans' must-haves are met: the pure derivation, i18n keys, shared component, and Lookup embedding are all present, substantive, wired, and proven by a 1541/1541 green suite plus a clean svelte-check. The only historical wrinkle (a pre-existing `messages.test.ts` hardcoded-count assertion noted as a deviation in 26-03's SUMMARY) does not exist in the current test file — `totalDomainKeys` is computed dynamically, not hardcoded — so it is not a live gap.

---

_Verified: 2026-07-24T18:46:50Z_
_Verifier: Claude (gsd-verifier)_
