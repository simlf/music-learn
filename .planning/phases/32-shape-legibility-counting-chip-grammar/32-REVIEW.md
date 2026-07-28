---
phase: 32-shape-legibility-counting-chip-grammar
reviewed: 2026-07-26T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/lib/components/CountingChipRow.svelte
  - src/lib/components/CountingChipRow.test.ts
  - src/lib/components/PracticeChordDrill.svelte
  - src/lib/components/PracticeChordDrill.test.ts
  - src/lib/i18n/messages/drills.ts
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: issues_found
---

# Phase 32: Code Review Report

**Reviewed:** 2026-07-26
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Reviewed the new presentational `CountingChipRow.svelte` primitive and its wiring into the name-it drill feedback (`PracticeChordDrill.svelte`), plus their tests and the `drills.ts` message additions.

Security posture is clean: no `{@html}`, no `eval`, no injection surface. All dynamic values (`tone.letter`, `gap.label`, `gap.longFr`, `picked`, `symbol`) flow through Svelte's auto-escaping and safe attribute bindings. The `String.replace` substitutions in `pickedVsCorrect` use chord symbols that never contain `$`/`{}` metacharacters, so no replacement-pattern injection. REG-01 is respected: grading/scheduling logic is untouched; the component derives everything from `stackedThirdsFor` with no hand-rolled interval math. LOCKED interval-role color tokens are used for their intended role tinting, not repurposed.

The material defect is scope coverage: the component and its tests assume every drillable chord is tertian (all gaps `m3`/`M3`, all tones one of root/third/fifth/seventh). That assumption is false for the tier 3+ drill pool defined in `src/lib/practice/tiers.ts` (`6`, `m6`, `sus4`, `7sus4`, `9`, `maj9`, `m9`, `13`, ...). For those chords the primitive silently degrades back toward the "illegible grey" state this phase set out to eliminate — untinted tone chips and unexplained neutral gap chips. Neither degradation throws, so these are quality/robustness warnings rather than crashes.

## Warnings

### WR-01: Tone chips render with no role tint for `second`/`fourth`/`sixth` roles (untinted chips for real drill-pool chords)

**File:** `src/lib/components/CountingChipRow.svelte:101-119`
**Issue:** The component only styles `.tone-chip.root`, `.third`, `.fifth`, `.seventh`. But `SpelledNote.role` (theory/types.ts) has seven values, and the drill pool in `src/lib/practice/tiers.ts` includes qualities that produce the other three roles:
- `6` / `m6` -> a `sixth`-role tone
- `sus4` / `7sus4` -> a `fourth`-role tone
- `9` / `maj9` / `m9` / `13` -> a `second`-role tone (13 also `sixth`)

For those chords the tone chip receives a class (`.tone-chip.sixth` etc.) that has **no** `background`/`color` rule in this component, so it renders as a bordered chip with default inherited text on the page background — no role tint at all. This is exactly the "grey mono" legibility problem the phase set out to fix, reappearing for an entire class of drillable chords. Sibling components already handle all seven roles: `IntervalChip.svelte:66-76` and `ScaleDegreeStrip.svelte:145-161` both style `second`/`fourth`/`sixth`, and the tokens exist (`--color-second`, `--color-fourth`, `--color-sixth`, `--color-on-second`, `--color-on-fourth`, `--color-on-sixth` in `src/app.css:27-45`).
**Fix:** Add the three missing rules so coverage matches the sibling components:
```css
.tone-chip.second {
	background: var(--color-second);
	color: var(--color-on-second);
}
.tone-chip.fourth {
	background: var(--color-fourth);
	color: var(--color-on-fourth);
}
.tone-chip.sixth {
	background: var(--color-sixth);
	color: var(--color-on-sixth);
}
```

### WR-02: Non-third gaps DO occur in production; the documented "always tertian" invariant is false and the legend leaves them unexplained

**File:** `src/lib/components/CountingChipRow.test.ts:99-108` (claim) and `src/lib/components/CountingChipRow.svelte:70-81` (legend)
**Issue:** The test file states: *"Every recognized chord in this app's v1 quality matrix is genuinely tertian (each stackedThirdsFor gap really is m3 or M3), so a non-third gap never occurs from spellChord() in practice."* This is factually incorrect for the drill pool. Verified via `spellChord` + `stackedThirdsFor`:
- `C6` gaps: `+M3 +m3 +M2`
- `Csus4` gaps: `+P4 +M2`
- `C7sus4` gaps: `+P4 +M2 +m3`
- `C13` gaps: `+M3 +m3 +m3 +M3 +P5`

So the neutral-fallback branch (`gapModifier` returning `''`) is reached by ordinary production data, not only by the synthetic test fixture. Two consequences: (1) the invariant comment will mislead a future maintainer into thinking the fallback is dead/unreachable and safe to remove; (2) the legend (`chip-legend`) only explains `+m3` and `+M3`, so for a drilled `Csus4`/`C6`/`C13` the row shows neutral grey `+M2`/`+P4`/`+P5` chips with no legend entry — the "read the shape" grammar breaks with no user-facing explanation. Combined with WR-01, a `Csus4` answer renders as almost entirely uncolored chips.
**Fix:** Correct the test comment to state the fallback is genuinely exercised by tier 3+ chords (sus/6/9/13). Decide product behavior for non-third gaps in the feedback surface: either suppress/label the primitive for non-tertian qualities, or extend the legend to cover the non-third gaps those qualities produce. At minimum, do not document the fallback as unreachable when it is not.

## Info

### IN-01: `aria-label` on a non-semantic `<div>` is unreliably announced

**File:** `src/lib/components/CountingChipRow.svelte:59` and `:71`
**Issue:** Both the `.chiprow` and `.chip-legend` containers are plain `<div>`s carrying an `aria-label` but no `role`. An `aria-label` on an element with the implicit generic role is not reliably surfaced by assistive tech, so the caller-supplied "Chord shape" / "Forme de l'accord" name may never be announced. The feedback surface therefore may not gain the accessible grouping the prop intends.
**Fix:** Give the labelled container a semantic role (e.g. `role="group"` or `role="img"` with the label as its accessible name) so the `aria-label` is honored.

### IN-02: Legend swatch text duplicates the entry text for screen readers

**File:** `src/lib/components/CountingChipRow.svelte:72-79`
**Issue:** Each legend entry contains a decorative swatch `<span>` whose text is `+m3`/`+M3`, immediately followed by the informative text `+m3 = 3 semitones`. A screen reader reads the swatch and the entry text, yielding "plus m3, plus m3 equals 3 semitones". The swatch is purely a visual sample.
**Fix:** Add `aria-hidden="true"` to the `.chip-legend__swatch` spans so only the informative text is announced.

### IN-03: Stale comment in drills.ts describes a removed visible line

**File:** `src/lib/i18n/messages/drills.ts:81-85`
**Issue:** The comment above `drills.aria.chordShape` says the key labels "the per-quality stacked-thirds teaching line (E2); the visible line itself ('m7: m3 · M3 · m3') ..." — but that grey mono line was removed and replaced by `CountingChipRow` in this very phase. The key is now the aria-label for the chip row, not a `m7: m3 · M3 · m3` text line. The comment describes an artifact that no longer exists.
**Fix:** Update the comment to describe the current use: the accessible name for the `CountingChipRow` counting-chip grammar, whose visible chips are built from immune role/interval shorthand.

### IN-04: Vacuous regression test asserts absence of an element this component never contained

**File:** `src/lib/components/PracticeChordDrill.test.ts:232-238`
**Issue:** The test "removes the old grey mono shape line (Success Criterion 4)" asserts `queryByTestId('chord-drill-shape')` is absent. `data-testid="chord-drill-shape"` does not exist anywhere in the source and never existed in `PracticeChordDrill` (the old shape line lived on the drills page, not this component). The assertion passes trivially regardless of whether the intended removal happened, so it provides no real regression protection.
**Fix:** Either drop the test or make it meaningfully assert the new behavior (e.g. that the feedback shape output is now the `counting-chip-row`, which the adjacent tests already cover) rather than the absence of a testid that never existed here.

---

_Reviewed: 2026-07-26_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
