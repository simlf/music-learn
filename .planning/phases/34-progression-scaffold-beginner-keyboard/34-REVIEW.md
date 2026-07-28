---
phase: 34-progression-scaffold-beginner-keyboard
reviewed: 2026-07-27T01:30:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/lib/components/ProgressionDrill.svelte
  - src/lib/practice/progressions.ts
  - src/lib/i18n/messages/progressions.ts
  - src/lib/components/progressionDrill.test.ts
  - src/lib/components/ProgressionDrill.embed.test.ts
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
status: issues_found
---

# Phase 34: Code Review Report

**Reviewed:** 2026-07-27
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found (info-only; the three prior warnings are resolved)

## Summary

Iteration 2 re-review. The three warnings from the previous pass were fixed by
surfacing the engine's own authoritative fields on `ProgressionBar` and hardening
the async deck read. All three fixes are correct, and no new defects were
introduced. Only two pre-existing, optional defensive-hardening info items carry
over.

**Verification of the iteration-1 fixes:**

- **WR-01 (degree re-derivation with silent `?? 1`) — FIXED.**
  `ProgressionBar` now carries `degree: number` (progressions.ts:28,174), set from
  the template slot in `buildProgression`. The component reads it directly
  (`ordinalWord(currentBar.degree)`, ProgressionDrill.svelte:456) — the hardcoded
  `ROMAN_TO_DEGREE` map and the `?? 1` fallback are fully removed (grep-confirmed:
  no leftover `ROMAN_TO_DEGREE`/`currentDegree` symbols). `ordinalWord` returns
  `table[degree - 1] ?? ''` for any out-of-1..7 degree, so an unmapped degree now
  renders an empty ordinal rather than a pedagogically-wrong "1st". This is a
  genuine correctness improvement, not cosmetic: the map approach depended on
  every roman string (including `iiø`) being hand-listed.

- **WR-02 (`qualityWord` sliced tonal's canonical symbol, silent "dominant"
  fallback) — FIXED.** `ProgressionBar` now carries `quality: string`
  (progressions.ts:29,175), documented as "the engine's own fixed quality suffix
  ... NOT tonal's canonical re-spelling." `qualityWord(currentBar.quality)`
  (ProgressionDrill.svelte:464) switches over the engine's fixed vocabulary
  (`maj7`/`m7`/`m7b5`/`7`), all four of which are mapped, so the `default` arm is
  now unreachable for real input and additionally logs a dev-only `console.warn`
  before its fallback. The fragile slice off `currentChord.symbol` is removed
  (no leftover `currentQualitySuffix`). Decoupled from tonal canonicalization.

- **WR-03 (unhandled rejection in `loadCards`) — FIXED.**
  `loadCards` (ProgressionDrill.svelte:119-135) now wraps `await getAllCards()` in
  `try/catch/finally`. A rejected Dexie/IndexedDB read fails closed to the
  cold-beginner default (`cards = []`) only when the response still matches the
  current bar, and the pre-existing staleness guard is preserved: a stale response
  neither writes `cards` nor flips `cardsLoaded`. No unhandled promise rejection.

**Cross-cutting checks (all pass):**

- **Interface change is safe.** `degree`/`quality` are added to an *output* type
  produced solely by `buildProgression`; no other site constructs a
  `ProgressionBar` literal (`randomProgression` and the embed init both route
  through `buildProgression`; the component uses a cast). `progressions.test.ts`
  asserts field-wise (`bars.map(b => b.roman)`) and self-compares
  (`buildProgression(...) toEqual buildProgression(...)`), so the added fields do
  not break it. `tsc --noEmit` reports no progression-related errors.
- **REG-01 grading unchanged.** `checkPlay` still grades by chroma set
  (`Note.chroma(toAsciiAccidentals(letter))` vs `matchChord(..., spellChord(bar.symbol))`,
  lines 313-317); roman display, function reveal, completion/embed seam untouched.
- **Symbol never leaks through the ladder.** Degree/count/ghost rungs render only
  `currentBar.roman`, the ordinal degree word, `progression.key`, the mode word,
  `currentChord.root`, `qualityWord(...)`, and `CountingChipRow` tone letters —
  never the assembled symbol. The "never renders the symbol" test still guards
  `Dm7`.
- **No em dashes in app copy.** `progressions.ts` (i18n) copy is clean. The lone
  em dash in the repo is a JSDoc comment (`src/lib/practice/progressions.ts:208`),
  pre-existing since Phase 25 (commit bb0d012), not user-facing copy — out of the
  "app copy" rule's scope.
- **Tests green.** All 28 tests across `progressions.test.ts`,
  `progressionDrill.test.ts`, and `ProgressionDrill.embed.test.ts` pass.

No Critical or Warning findings. The two Info items below are unchanged from
iteration 1, defensive-only, and do not block convergence of the fix loop.

## Info

### IN-01: Octave count reads `stage` from possibly-stale `cards` during an in-flight reload

**File:** `src/lib/components/ProgressionDrill.svelte:119-135,436`
**Issue:** `loadCards` sets `cardsLoaded = false` at entry but does not clear
`cards`, while `octaves={stage === 'drill' ? 2 : 1}` (line 436) reads `stage`
(derived from `cards`) unconditionally — unlike the ladder/caption, which gate on
`cardsLoaded`. During a bar-to-bar reload `stage` momentarily reflects the previous
bar's maturity, which could briefly show the wrong octave span. In practice this
is masked: `checkPlay` resets `step` to `'name'` before advancing, so the keyboard
is unmounted during the transition and the local deck read resolves before the
learner reaches step 2 again. Documented because the `cardsLoaded` reasoning only
covers the cold-mount default, not the bar-to-bar stale window.
**Fix (optional):** Gate the octave count on `cardsLoaded` too, or clear
`cards = []` at the top of `loadCards` so the stale window falls back to the
one-octave default rather than the previous bar's span.

### IN-02: Hint-ladder render path does not re-check `currentChord.recognized`

**File:** `src/lib/components/ProgressionDrill.svelte:447-473`
**Issue:** The ladder `{#if}` guards on `currentChord` (truthy) but not
`currentChord.recognized`. An unrecognized spelling would render an empty
`currentChord.root` in the degree rung (line 458) and feed an unrecognized
`ChordResult` to `CountingChipRow`. `buildProgression`/`diatonicSevenths` already
drop any symbol that fails `spellChord`, so every bar reaching the UI is
recognized — this is defensive-only. Note `ghostKeysForCurrentBar` already checks
`.recognized`, so the guard is inconsistent across the two consumers.
**Fix (optional):** Add `&& currentChord.recognized` to the ladder's `{#if}` guard
for parity with `ghostKeysForCurrentBar`.

---

_Reviewed: 2026-07-27_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
