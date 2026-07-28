---
phase: 34-progression-scaffold-beginner-keyboard
fixed_at: 2026-07-26T23:25:02Z
review_path: .planning/phases/34-progression-scaffold-beginner-keyboard/34-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 34: Code Review Fix Report

**Fixed at:** 2026-07-26T23:25:02Z
**Source review:** .planning/phases/34-progression-scaffold-beginner-keyboard/34-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (all Warnings; 0 Critical)
- Fixed: 3
- Skipped: 0

REG-01 preserved throughout: `checkPlay` chroma-set grading, the verbatim
`bar.roman` display, and the read-only `getAllCards` maturity read (no deck
writes / no scheduling changes) are all untouched. No em dashes introduced in
copy. Full suite green after every fix (1538 tests, 108 files) and svelte-check
reports 0 errors / 0 warnings.

## Fixed Issues

### WR-01: Degree hint re-derived scale degree from a hardcoded roman map with a silent wrong fallback

**Files modified:** `src/lib/practice/progressions.ts`, `src/lib/components/ProgressionDrill.svelte`
**Commit:** 8d448ac
**Applied fix:** Surfaced the engine's authoritative `degree` on the
`ProgressionBar` interface and populated it in `buildProgression` from
`slot.degree`. Deleted the parallel `ROMAN_TO_DEGREE` map and its `?? 1`
silent-wrong fallback in the component; the degree rung now reads
`ordinalWord(currentBar.degree)` directly. A future template with a new or
chromatic roman (e.g. a Neapolitan `bII`, a secondary dominant) now carries its
own correct degree from the engine instead of collapsing to "1st".

### WR-02: `qualityWord` silently fell back to "dominant" and sliced from tonal's canonical symbol

**Files modified:** `src/lib/practice/progressions.ts`, `src/lib/components/ProgressionDrill.svelte`
**Commit:** 7777acc
**Applied fix:** Surfaced the engine's own fixed quality suffix
(`maj7`/`m7`/`7`/`m7b5`) as `ProgressionBar.quality` from `slot.quality`, and
changed the count rung to call `qualityWord(currentBar.quality)`. Removed the
fragile `currentQualitySuffix` derived that sliced off tonal's canonical
re-spelling (`currentChord.symbol`). Rewrote `qualityWord` as an exhaustive
`switch` over the engine's four known suffixes with an explicit `'7' ->
dominant` case; an unmapped suffix now logs a dev warning
(`import.meta.env.DEV` + `console.warn`, matching the codebase convention in
`answerTelemetry.ts`/`api/progress.ts`) instead of silently captioning a
major-7 / minor-7 / half-diminished chord as "dominant".

### WR-03: `loadCards` async deck read had no error handling (unhandled rejection)

**Files modified:** `src/lib/components/ProgressionDrill.svelte`
**Commit:** e5aa428
**Applied fix:** Wrapped the `getAllCards()` read in `try/catch/finally`. On a
rejected Dexie/IndexedDB read (quota, blocked upgrade, private-mode
restrictions) it now fails closed to the cold-beginner default (`cards = []` ->
one octave, all rungs) instead of surfacing an unhandled promise rejection. The
staleness guard is preserved: a response for a bar the cursor has moved past
does NOT flip `cardsLoaded`; only the current bar's own read marks it loaded
(the `finally` guards on `forSymbol === currentBar?.symbol`).

## Notes

- The two Info findings (IN-01 stale-`stage`-during-reload window, IN-02
  redundant `recognized` re-check) were out of scope (`fix_scope:
  critical_warning`) and were not addressed. Both are documented in REVIEW.md as
  defensive-only / masked-in-practice.
- No new tests were added. The existing 28 progression tests already cover the
  degree/count/ghost rungs and the empty-deck happy path; the new WR-03 catch
  branch (rejected deck read) is not exercised by a test. If the team wants
  regression coverage for the fail-closed path, a follow-up test mocking
  `getAllCards` to reject would assert one-octave + all-rungs.

---

_Fixed: 2026-07-26T23:25:02Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
