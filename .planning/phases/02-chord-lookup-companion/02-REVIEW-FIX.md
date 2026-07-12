---
phase: 02-chord-lookup-companion
fixed_at: 2026-07-13T00:40:00Z
review_path: .planning/phases/02-chord-lookup-companion/02-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-07-13T00:40:00Z
**Source review:** .planning/phases/02-chord-lookup-companion/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (1 Critical, 6 Warning; fix_scope: critical_warning, Info findings not addressed)
- Fixed: 7
- Skipped: 0

**Verification:** Full suite green after all fixes: `npx vitest run` 179/179 passed (173 baseline + 6 new regression tests), `npm run check` (svelte-check) 0 errors, 0 warnings.

## Fixed Issues

### CR-01: PianoKeyboard never updates after the first lookup

**Files modified:** `src/lib/components/PianoKeyboard.svelte`, `tests/lookup.e2e.test.ts`
**Commit:** 12efb16
**Applied fix:** Root-cause fix in the component (review's preferred option, since Phase 3 drills will reuse it): `noteAssignment`, `whiteKeys`, and `blackKeys` converted from plain top-level `const`s to `$derived(...)` so they recompute when the `notes` prop changes. Added a regression test that stamps Cm7 then Fmaj7 and asserts the keyboard no longer shows E♭/B♭ and does show F-A-C-E. The test was confirmed to fail against the pre-fix component (stale E♭ present) and pass after.

### WR-01: Chord input is not trimmed before lookup

**Files modified:** `src/routes/+page.svelte`, `tests/lookup.e2e.test.ts`
**Commit:** 5ad8517
**Applied fix:** `showChord` now trims the input once at the entry point; both `spellChord` and the `didYouMean` fallback receive the cleaned value. Added a test stamping `"Cm7 "` (trailing space, the mobile-autocomplete artifact) asserting a direct chord-result with no error bar.

### WR-02: aliasLine mixes ASCII and glyph accidentals

**Files modified:** `src/lib/lookup/chordPresentation.ts`, `src/lib/lookup/chordPresentation.test.ts`
**Commit:** 04ea82e
**Applied fix:** Used the review's root-aware variant rather than the naive whole-string replace: `aliasLine` rebuilds `chord.symbol` on the glyph root by swapping the ASCII root prefix (`toAsciiAccidentals(chord.root)`) for `chord.root`, leaving quality suffixes (e.g. `b5` in `m7b5`) untouched so the Set dedupe still collapses the symbol against the `root + alias` forms. Added flat-root (`Bbmaj7`) and sharp-root (`F#m7b5`) test cases asserting glyph-only output with no ASCII duplicates.

### WR-03: getRecentLookups neither caps at 5 nor dedupes

**Files modified:** `src/lib/lookup/recentLookups.ts`, `src/lib/lookup/recentLookups.test.ts`
**Commit:** 0f6dbfa
**Applied fix:** Read path now returns `[...new Set(parsed)].slice(0, MAX_RECENT)`, enforcing the documented invariants (no duplicates that would crash the keyed chip row with `each_key_duplicate`, never more than 5 chips). Added tests for a duplicate-bearing store and an oversized (7-entry) store.

### WR-04: Did-you-mean suggestion violates the 44px touch-target rule

**Files modified:** `src/routes/+page.svelte`
**Commit:** 345a543
**Applied fix:** Added a `suggestion-tap` class on the inline suggestion button with `min-height: 44px; min-width: 44px; padding: var(--spacing-sm); margin: calc(-1 * var(--spacing-sm))` (the review's padded-hit-area option, using existing spacing tokens). The negative margin keeps the error bar's visual height and text flow unchanged while the tap area meets the 44px minimum.

### WR-05: Extraction to chordPresentation.ts left duplicates in the showcase page

**Files modified:** `src/routes/showcase/+page.svelte`
**Commit:** 2ce054c
**Applied fix:** Deleted the inline `formulaFor`, `toAsciiAccidentals`, `aliasLine`, and local `FormulaEntry` copies; the showcase page now imports `formulaFor`/`aliasLine` from `$lib/lookup/chordPresentation`. Removed the now-unused `Interval` (tonal) and `IntervalRole` imports. This also propagates the WR-02 fix to the showcase page, as the review required.

### WR-06: "Hear it" pins all notes to octave 4, playing an inversion

**Files modified:** `src/lib/audio/playChord.ts`
**Commit:** 3b5732e
**Applied fix:** Replaced the fixed-`4` `toTonePitch` with `toAscendingPitches`: starting at octave 4, the octave increments whenever `Note.chroma` stops ascending, so the audio matches the keyboard's ascending root-position voicing. Verified empirically against tonal: G7 plays G4-B4-D5-F5, Am7 plays A4-C5-E5-G5, Bm7b5 plays B4-D5-F5-A5, Cm7 stays C4-Eb4-G4-Bb4.

## Skipped Issues

None. All 7 in-scope findings were fixed.

---

_Fixed: 2026-07-13T00:40:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
