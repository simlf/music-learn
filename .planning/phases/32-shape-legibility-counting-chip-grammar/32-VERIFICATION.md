---
phase: 32-shape-legibility-counting-chip-grammar
verified: 2026-07-26T20:59:58Z
status: passed
score: 9/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:

  - test: "Open the name-it drill on-device (or in a browser, not the null-origin preview harness), answer a Csus4/C6/Cmaj9/C13 question, and inspect the CountingChipRow feedback row."
    expected: "All tone chips (including the new second/fourth/sixth tinted roles) are legible with sufficient text/background contrast; the m3 solid-ink fill, M3 ink-outline, and the new dashed .gap-chip.other neutral state are visually distinguishable from each other at a glance; the 3-row legend (+m3/+M3/other-gap) reads clearly in both locales."
    why_human: "The project's preview harness cannot hydrate this SvelteKit app (null-origin limitation — see project memory [[preview-harness-null-origin-sveltekit]]), so pixel-level legibility, color contrast, and shape-distinguishability cannot be confirmed by grep/DOM assertions. jsdom tests confirm the correct CSS classes are applied but cannot confirm they read correctly to a human eye."
---

# Phase 32: Shape Legibility — Counting-Chip Grammar Verification Report

**Phase Goal:** After answering a name-it question, a beginner can read the chord's third-pattern as role-tinted tone chips with fill/outline gap chips, instead of the illegible grey mono line — and this chip grammar becomes the shared visual primitive the later hint-ladder phases reuse.
**Verified:** 2026-07-26T20:59:58Z
**Status:** human_needed
**Re-verification:** No — initial verification (covers both 32-01 and the 32-02 gap-closure plan together, as instructed)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | After answering a name-it question, feedback renders a CountingChipRow — role-tinted tone chips + gap chips (SHAPE-01) | VERIFIED | `PracticeChordDrill.svelte:151` mounts `<CountingChipRow chord={target} .../>` inside the `{#if answered}` block; `PracticeChordDrill.test.ts` "shows the m7 counting-chip row ... after a correct answer" and "... after a wrong answer too" both pass (ran live: 27/27 in the two component test files). |
| 2 | Gap chips render minor third as solid ink fill (.gap-chip.m3) and major third as outline (.gap-chip.M3) | VERIFIED | `CountingChipRow.svelte:157-168` — `.gap-chip.m3 { background: var(--color-ink); color: var(--color-paper-bright); }` and `.gap-chip.M3 { background: var(--color-paper-bright); border: 2px solid var(--color-ink); }`. Test asserts Cm7 gap order m3/M3/m3 with correct classes and text. |
| 3 | Legend maps gap chips to semitone counts, French-aware, immune shorthand | VERIFIED | `CountingChipRow.svelte:74-88`; `drills.ts` carries `drills.chip.semitones` (en "semitones" / fr "demi-tons") and `drills.chip.legendAria`. Tests assert en text, fr "demi-tons", and immune `+m3`/`+M3`/`3`/`4` tokens unchanged across locales. |
| 4 | Old grey uppercase mono shape line (chord-drill-shape / stackedThirdsPattern) is genuinely gone from PracticeChordDrill, asserted by a real test | VERIFIED | `git show 769afa7` confirms the old `<p data-testid="chord-drill-shape">{targetQuality}: {stackedThirdsPattern}</p>` and its `stackedThirdsPattern` const were removed in favor of `<CountingChipRow>`. The 32-02 gap-closure plan additionally replaced the original vacuous "testid never existed here" assertion (IN-04, flagged in 32-REVIEW.md) with a real middot-fingerprint check: `PracticeChordDrill.test.ts:246-248` asserts `container.textContent` does not contain `'m3 · M3 · m3'`, does not match `/·/` at all, and that `counting-chip-row` is present. Ran live — passes. |
| 5 | CountingChipRow is a standalone reusable component, driven only by `stackedThirdsFor(chord)`, ready for Phases 34/35 | VERIFIED | `CountingChipRow.svelte` takes generic props (`chord: ChordResult`, `showLegend?`, `ariaLabel?`), has no PracticeChordDrill-specific coupling, and derives everything via `stackedThirdsFor(chord)` (line 45) — no hand-rolled interval math (confirmed by reading the full component; `gapModifier()` only strips the `+` prefix and string-compares, no semitone/interval computation). Only current consumer is `PracticeChordDrill.svelte` (expected — Phases 34/35 haven't shipped yet), confirmed via `grep -rn CountingChipRow src/lib --include="*.svelte"`. |
| 6 | Every IntervalRole value (root/second/third/fourth/fifth/sixth/seventh) tints as a tone chip — no bare grey chip (WR-01 closure) | VERIFIED | `src/lib/theory/types.ts` confirms the 7-value `IntervalRole` union. `CountingChipRow.svelte:109-142` now has all 7 `.tone-chip.<role>` CSS rules (root/second/third/fourth/fifth/sixth/seventh), each with its `--color-<role>`/`--color-on-<role>` pair (tokens confirmed present in `app.css`). Tests assert full-role coverage against real non-tertian drill-pool chords: Csus4 (.fourth), C6 (.sixth), Cmaj9 (.second) — all pass live. |
| 7 | Non-third gaps render a defined neutral state (not masquerading as m3/M3), legend explains all three states, French-first, no em dashes | VERIFIED | `gapModifier()` (line 56-60) returns the literal `'other'` for any non-m3/M3 gap; `.gap-chip.other` CSS (line 174-178) is a dashed `--color-faint` border with `--color-muted` text and no fill — visually distinct from both m3 (solid) and M3 (outline). Legend has a third entry (`chip-legend__entry`, line 84-87) reading `t('drills.chip.otherGap')`; `drills.ts` carries the key in both locales with no em dash (`grep "—"` on both files returned no matches). Test asserts Csus4's real `+P4`/`+M2` gaps carry the `other` modifier, not `m3`/`M3`, with real label text and a non-empty `title` (longFr tooltip) — passes live. |
| 8 | The 4 LOCKED tokens (root/third/fifth/seventh) are not repurposed | VERIFIED | `.tone-chip.root/.third/.fifth/.seventh` CSS rules are byte-identical to the 32-01 original (same `--color-root/third/fifth/seventh` + `--color-on-*` var names, unchanged by the 32-02 diff). |
| 9 | REG-01 scope fence: grading/FSRS/telemetry/queue behavior untouched | VERIFIED | `git diff 58cd742 HEAD -- src/lib/components/PracticeChordDrill.svelte` shows `selectChoice`/`handleNext`/`onComplete` bodies unchanged except one pre-existing `picked = choice;` line from an earlier (non-32) phase; no scheduling/telemetry/queue code exists in this component at all. Full regression gate confirms: `npx vitest run` (whole suite) — 108 files, 1523 tests, all passing, run live in this verification session. |

**Score:** 9/9 truths verified (0 present-but-behavior-unverified — this phase is purely presentational with no state-transition/cancellation invariants to exercise)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/components/CountingChipRow.svelte` | Reusable primitive: tone chips (7 roles tinted) + gap chips (m3/M3/other) + legend (3 entries) | VERIFIED | Read in full; all CSS rules and markup present and correctly structured. |
| `src/lib/components/CountingChipRow.test.ts` | Full behavior + WR-01/WR-02 coverage tests | VERIFIED | 12 test cases across 6 describe blocks; ran live, all pass. |
| `src/lib/components/PracticeChordDrill.svelte` | Mounts CountingChipRow, old shape line removed | VERIFIED | Confirmed via source read + `git show`. |
| `src/lib/components/PracticeChordDrill.test.ts` | Wiring + real removal-proof tests | VERIFIED | Ran live, all pass, including the middot-fingerprint regression test. |
| `src/lib/i18n/messages/drills.ts` | `drills.chip.semitones`, `drills.chip.legendAria`, `drills.chip.otherGap` (en+fr) | VERIFIED | All 3 keys confirmed present in both locale blocks via grep. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| PracticeChordDrill.svelte | CountingChipRow.svelte | `<CountingChipRow chord={target} ariaLabel={...}/>` inside `{#if answered}` | WIRED | Confirmed in source; test proves it renders after answer, absent before. |
| CountingChipRow.svelte | chordPresentation.ts | `stackedThirdsFor(chord)` | WIRED | Sole data source for tones/gaps; no interval math duplicated. |
| CountingChipRow.svelte legend | drills.ts | `t('drills.chip.semitones')`, `t('drills.chip.otherGap')`, `t('drills.chip.legendAria')` | WIRED | Confirmed via source + i18n key presence + locale-switch tests. |
| tone.role class | CSS `.tone-chip.<role>` | 7 role-token pairs (`--color-<role>`/`--color-on-<role>`) | WIRED | All 7 roles have matching CSS rules; tokens confirmed present in `app.css`. |
| `gapModifier()` 'other' return | CSS `.gap-chip.other` | dashed `--color-faint` neutral treatment | WIRED | Confirmed distinct from m3 (solid)/M3 (outline) treatments. |

### Behavioral Spot-Checks / Test Execution (run live in this verification session)

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| CountingChipRow + PracticeChordDrill unit tests | `npx vitest run src/lib/components/CountingChipRow.test.ts src/lib/components/PracticeChordDrill.test.ts` | 2 files, 27 tests, all passed | PASS |
| Type-check / svelte-check | `npm run check` | 1381 files, 0 errors, 0 warnings | PASS |
| Full regression suite (REG-01 gate, run once) | `npx vitest run` | 108 files, 1523 tests, all passed | PASS |
| No `{@html}` in CountingChipRow | `grep "{@html}" CountingChipRow.svelte` | no matches | PASS |
| No debt markers (TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER) in phase files | `grep -E "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER"` across 5 modified files | no matches | PASS |
| No em dash in new copy | `grep "—"` on CountingChipRow.svelte and drills.ts | no matches | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| SHAPE-01 | 32-01-PLAN.md, 32-02-PLAN.md | Name-it feedback shows role-tinted tone chips + fill/outline gap chips replacing the illegible grey mono line | SATISFIED | Already marked `[x]` in REQUIREMENTS.md, mapped to Phase 32; verified end-to-end above (truths 1-9). No other requirement IDs are mapped to Phase 32 in REQUIREMENTS.md — no orphaned requirements. |

### Anti-Patterns Found

None blocking. Three residual code-review Info items (IN-01 aria-label-on-div reliability, IN-02 legend swatch duplicate screen-reader announcement, IN-03 stale drills.ts comment) from `32-REVIEW.md` were explicitly triaged as Info-severity and left open by the 32-02 SUMMARY as out-of-scope for the gap-closure plan's `files_modified` list. These do not block the phase goal (visual/structural chip grammar working) but are noted here for visibility — they were not must-haves in either PLAN's frontmatter and were correctly scoped out of gap closure (only the two Warnings, WR-01/WR-02, and the vacuous-test Info item IN-04 were in scope, and all three are closed).

### Human Verification Required

### 1. On-device visual legibility of the full chip grammar

**Test:** Open the name-it drill in an actual browser (not the null-origin preview harness), answer questions spanning the tertian set (Cm7) and the newly-tinted non-tertian set (Csus4, C6, Cmaj9, C13), and look at the CountingChipRow feedback row and its 3-entry legend.
**Expected:** All 7 tinted tone-chip roles are legible with adequate text/background contrast; the m3 solid-ink fill, M3 ink-outline, and the new dashed `.gap-chip.other` neutral state read as visually distinct shapes at a glance (the core "small-big-small" teaching value the phase exists to deliver); the legend's 3 rows are readable in both English and French.
**Why human:** The project's preview harness cannot hydrate this SvelteKit app (documented project limitation), and jsdom/vitest can confirm the correct CSS classes are applied but cannot confirm color contrast or shape-distinguishability to a human eye. This mirrors the same human-judgment item (D6/D5) both 32-01-SUMMARY.md and 32-02-SUMMARY.md already flagged for on-device UAT.

### Gaps Summary

No gaps. All must-haves from both 32-01-PLAN.md and 32-02-PLAN.md frontmatter are verified against the actual codebase (not just SUMMARY claims): the reusable `CountingChipRow` primitive exists, is wired into `PracticeChordDrill`'s name-it feedback, tints all 7 `IntervalRole` values, gives non-third gaps a defined neutral state with a legend entry, and the old grey mono shape line's removal is proven by a real (not vacuous) regression test. `REG-01` is held (grading/FSRS/telemetry/queue untouched, full 108-file/1523-test suite green). The only outstanding item is the on-device visual legibility confirmation, which is expected given this project's known preview-harness limitation and was already anticipated by both phase SUMMARYs — it routes to human verification rather than blocking the phase.

---

_Verified: 2026-07-26T20:59:58Z_
_Verifier: Claude (gsd-verifier)_
