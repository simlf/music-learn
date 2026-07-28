---
phase: 32-shape-legibility-counting-chip-grammar
plan: 02
subsystem: ui
tags: [svelte, i18n, design-system, drills, gap-closure]

requires:
  - phase: 32-shape-legibility-counting-chip-grammar
    provides: "CountingChipRow.svelte primitive (Plan 01) and its wiring into PracticeChordDrill's name-it feedback surface"
provides:
  - "CountingChipRow tints all seven IntervalRole values (root/second/third/fourth/fifth/sixth/seventh), not just the four tertian-chord roles"
  - "A first-class neutral .gap-chip.other state for non-third gaps, legend-explained via drills.chip.otherGap (en/fr)"
  - "A genuine regression proof that the old grey mono shape line is gone (middot fingerprint absent + counting-chip-row present)"
affects: [phase-34-progression-scaffold, phase-35-inversions]

tech-stack:
  added: []
  patterns:
    - "Counting-chip grammar now covers the full IntervalRole space and a neutral non-third gap state, so the primitive is safe to reuse app-wide (Phases 34/35) for any drillable chord quality, not just tertian sevenths"

key-files:
  created: []
  modified:
    - src/lib/components/CountingChipRow.svelte
    - src/lib/components/CountingChipRow.test.ts
    - src/lib/i18n/messages/drills.ts
    - src/lib/components/PracticeChordDrill.test.ts

key-decisions:
  - "gapModifier() returns the literal string 'other' (not empty string) for non-m3/M3 gaps, giving the CSS a real modifier class to target instead of relying on the bare .gap-chip base rule as an implicit fallback"
  - "The neutral .gap-chip.other treatment is a dashed var(--color-faint) border with color: var(--color-muted) and no background fill, deliberately distinct from both the m3 solid-ink-fill and M3 ink-outline states"
  - "Legend's third entry uses a representative +P4 swatch (hardcoded, immune) rather than trying to enumerate every possible non-third interval"

requirements-completed: [SHAPE-01]

coverage:
  - id: D1
    description: "Every IntervalRole value (root/second/third/fourth/fifth/sixth/seventh) renders a tinted tone chip, verified against real non-tertian drill-pool chords (Csus4, C6, Cmaj9), closing WR-01"
    requirement: "SHAPE-01"
    verification:
      - kind: unit
        ref: "src/lib/components/CountingChipRow.test.ts#CountingChipRow: full role coverage on real non-tertian drill-pool chords (WR-01) > tints every tone chip for Csus4 (root/fourth/fifth), including the new .fourth role"
        status: pass
      - kind: unit
        ref: "src/lib/components/CountingChipRow.test.ts#CountingChipRow: full role coverage on real non-tertian drill-pool chords (WR-01) > tints every tone chip for C6 (root/third/fifth/sixth), including the new .sixth role"
        status: pass
      - kind: unit
        ref: "src/lib/components/CountingChipRow.test.ts#CountingChipRow: full role coverage on real non-tertian drill-pool chords (WR-01) > tints every tone chip for Cmaj9 (root/third/fifth/seventh/second), including the new .second role"
        status: pass
      - kind: other
        ref: "grep -c 'tone-chip.second|tone-chip.fourth|tone-chip.sixth' src/lib/components/CountingChipRow.svelte (source assertion for the 3 new CSS rules; DOM classList checks alone cannot detect missing tint under jsdom)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Non-third gaps (+P4/+M2/+P5) render a defined neutral .gap-chip.other state, distinct from m3 (solid fill) and M3 (outline), keeping real interval label + longFr tooltip, closing WR-02"
    requirement: "SHAPE-01"
    verification:
      - kind: unit
        ref: "src/lib/components/CountingChipRow.test.ts#CountingChipRow: neutral non-third gap on a real chord (WR-02) > renders Csus4 non-third gaps (+P4, +M2) with the neutral modifier, no m3/M3, real label + longFr tooltip"
        status: pass
    human_judgment: false
  - id: D3
    description: "Legend has a third entry explaining the neutral gap state, translated via drills.chip.otherGap (en/fr), immune +m3/+M3/numbers unchanged"
    requirement: "SHAPE-01"
    verification:
      - kind: unit
        ref: "src/lib/components/CountingChipRow.test.ts#CountingChipRow: legend > renders a third legend entry explaining non-third gaps (en)"
        status: pass
      - kind: unit
        ref: "src/lib/components/CountingChipRow.test.ts#CountingChipRow: legend > renders the third legend entry in French under fr, immune tokens unchanged"
        status: pass
    human_judgment: false
  - id: D4
    description: "PracticeChordDrill's name-it regression test now proves the old grey '{quality}: m3 · M3 · m3' shape line is actually gone via its real middot fingerprint, and that counting-chip-row replaced it, rather than asserting absence of a never-present testid (IN-04)"
    requirement: "SHAPE-01"
    verification:
      - kind: unit
        ref: "src/lib/components/PracticeChordDrill.test.ts#PracticeChordDrill: counting-chip row (E2, SHAPE-01) > removes the old grey mono shape line, replaced by the counting-chip row (Success Criterion 4, IN-04)"
        status: pass
      - kind: other
        ref: "npm test (full vitest suite) - 108 files, 1523 tests, all passing (REG-01 regression gate)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Manual/visual confirmation that the neutral gap-chip dashed treatment and full seven-role tint palette read correctly on-device"
    verification: []
    human_judgment: true
    rationale: "Preview harness cannot hydrate this SvelteKit app (see [[preview-harness-null-origin-sveltekit]]); visual legibility of the new tints/dashed state is a human-judgment call, same as Plan 01's D6."

duration: 9min
completed: 2026-07-26
status: complete
---

# Phase 32 Plan 02: Shape Legibility Gap Closure Summary

**CountingChipRow now tints all seven IntervalRole values and gives non-third gaps a legend-explained neutral state, closing code-review findings WR-01/WR-02/IN-04 against real non-tertian drill-pool chords (Csus4/C6/Cmaj9/C13).**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-26T22:44:00+02:00
- **Completed:** 2026-07-26T22:53:00+02:00
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added `.tone-chip.second/.fourth/.sixth` CSS rules to `CountingChipRow.svelte` so all seven `IntervalRole` values render tinted, matching the sibling `IntervalChip`/`ScaleDegreeStrip` components — closes WR-01. Verified against real drill-pool chords: `Csus4` (root/fourth/fifth), `C6` (root/third/fifth/sixth), `Cmaj9` (root/third/fifth/seventh/second).
- `gapModifier()` now returns `'other'` for non-m3/M3 gaps instead of an empty string; added a `.gap-chip.other` CSS rule (dashed `--color-faint` border, `--color-muted` text, no fill) as a first-class neutral state distinct from both the `m3` solid-ink-fill and `M3` outline states — closes WR-02.
- Added a third `.chip-legend__entry` explaining the neutral gap state, with a new `drills.chip.otherGap` i18n key ("other gaps show their own interval" / "les autres écarts affichent leur propre intervalle"), keeping the `+m3`/`+M3`/numbers shorthand immune.
- Corrected `CountingChipRow.test.ts`'s false "non-third gap never occurs" test: it now uses a real chord (`Csus4`, whose `stackedThirdsFor` gaps are genuinely `+P4`/`+M2`) instead of a synthetic fixture, and the misleading `gapModifier` JSDoc no longer claims the branch is unreachable.
- Replaced the vacuous `PracticeChordDrill.test.ts` assertion (checking absence of a `chord-drill-shape` testid this component never rendered) with a real regression proof: the old line's middot fingerprint (` · ` / `m3 · M3 · m3`) is genuinely absent from the rendered feedback, and `counting-chip-row` is genuinely present — closes IN-04.

## Task Commits

Each task was committed atomically (TDD for Task 1: RED test then GREEN implementation):

1. **Task 1: Tint every role + neutral non-third gap state** — `6d79b49` (test, RED) / `9d3716f` (feat, GREEN)
2. **Task 2: Real removal proof for the old grey shape line** — `f17acec` (test)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified
- `src/lib/components/CountingChipRow.svelte` - added `.tone-chip.second/.fourth/.sixth` and `.gap-chip.other` CSS rules, changed `gapModifier()`'s fallback return value, added the third legend entry, corrected the `gapModifier` JSDoc
- `src/lib/components/CountingChipRow.test.ts` - added full-role-coverage tests (Csus4/C6/Cmaj9), replaced the false neutral-gap-never-occurs test with a real-chord (Csus4) test, added third-legend-row tests (en/fr)
- `src/lib/i18n/messages/drills.ts` - added `drills.chip.otherGap` key (en/fr)
- `src/lib/components/PracticeChordDrill.test.ts` - replaced the vacuous old-shape-line-removal assertion with a real middot-fingerprint-absence + counting-chip-row-presence assertion

## Decisions Made
- `gapModifier()` returns the literal `'other'` string rather than continuing to return `''` and relying on the bare `.gap-chip` rule as an implicit neutral state — gives the CSS an explicit, greppable modifier class matching the `m3`/`M3` pattern.
- The `.gap-chip.other` treatment (dashed `--color-faint` border, `--color-muted` text, no background fill) was chosen to be visually distinct from both existing states without introducing new tokens.
- The legend's third entry uses a representative `+P4` swatch (immune shorthand) rather than enumerating every possible non-third interval, consistent with how the existing `+m3`/`+M3` entries are single representative examples.

## Deviations from Plan
None - plan executed exactly as written. Both tasks matched their `<action>`/`<acceptance_criteria>` blocks; no architectural changes, no scope creep into grading/FSRS/telemetry/queue behavior (REG-01 respected).

## Issues Encountered
None. Verified the plan's own "ground truth" claims about `Csus4`/`C6`/`Cmaj9`/`C13`/`C7sus4` gap data against live `stackedThirdsFor` output before writing tests (via a throwaway scratch test file, deleted before any commit) — all matched the plan's stated values exactly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 4 code-review findings from `32-REVIEW.md` addressed: WR-01 (tint coverage), WR-02 (neutral gap state + false test), IN-04 (vacuous regression test) closed by this plan; IN-01/IN-02/IN-03 (aria-label semantics, legend swatch aria-hidden, stale comment) were Info-severity and out of this gap-closure plan's `files_modified` scope — not addressed here.
- Full regression gate green: `npm test` (108 files, 1523 tests) and `npm run check` (0 errors/warnings, 1381 files) both pass.
- `CountingChipRow` now covers the entire drillable chord pool (tiers 1-6, all qualities including sus4/6/9/13), ready for Phase 34 (progression hint ladder) and Phase 35 (inversion hint ladder) to embed without re-hitting the same legibility gap.
- Flagged for on-device visual UAT (same as Plan 01's D6): confirm the new second/fourth/sixth tints and the dashed neutral gap-chip state read correctly in the browser — preview harness cannot hydrate this app.

---
*Phase: 32-shape-legibility-counting-chip-grammar*
*Completed: 2026-07-26*

## Self-Check: PASSED

All 4 modified files confirmed present on disk; all 3 commit hashes (6d79b49, 9d3716f, f17acec) confirmed in `git log`.
