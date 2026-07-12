---
phase: 02-chord-lookup-companion
plan: 03
subsystem: ui
tags: [svelte5, heuristic, error-handling, copy, e2e, vitest]

# Dependency graph
requires:
  - phase: 02-chord-lookup-companion
    provides: "Plan 01's lookup page (/) and showChord/showChordFromSymbol pattern; Plan 02's recent-lookups, glyph helpers, and vitest-setup.ts localStorage fix"
provides:
  - "$lib/theory/didYouMean.ts - pure single-candidate heuristic over the 12x8 supported chord matrix"
  - "suggestionHints/pickSuggestionHint in $lib/copy/hints.ts - independent rotating did-you-mean copy"
  - "Inline tappable suggestion token inside the lookup page's existing error bar, completing LOOK-01's error experience"
affects: [phase-03-drills]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Candidate-space reuse: didYouMean.ts imports ROOTS/QUALITY_SUFFIXES from randomChord.ts rather than redefining the supported matrix, so both modules stay in lockstep with reference-chords.test.ts"
    - "Independent no-repeat rotation state per copy list (lastIndex vs lastSuggestionIndex) so two rotating-hint lists never cross-contaminate"
    - "Placeholder-token copy substitution ({SYMBOL}) rendered as an inline interactive element inside a text node, split via a small helper rather than a templating library"

key-files:
  created:
    - src/lib/theory/didYouMean.ts
    - src/lib/theory/didYouMean.test.ts
    - src/lib/copy/hints.test.ts
  modified:
    - src/lib/theory/randomChord.ts
    - src/lib/copy/hints.ts
    - src/routes/+page.svelte
    - tests/lookup.e2e.test.ts

key-decisions:
  - "ROOTS and QUALITY_SUFFIXES exported (not duplicated) from randomChord.ts so didYouMean draws from the exact same proven 12x8 matrix as the reference-chords.test.ts correctness proof; randomChord()'s own behavior is unchanged."
  - "Exact quality-token match always wins over any distance-1 tie (e.g. typed 'm7' beats the distance-1-away '7' suffix outright) rather than treating every within-tolerance suffix identically."
  - "Among a genuine edit-distance tie, prefer the suffix that EXTENDS the typed token (typed text is missing a trailing character, e.g. 'm7b' -> 'm7b5') over one that is a truncation of it; if that still doesn't resolve to exactly one, return null rather than guess."
  - "Suggestion token is a plain inline <button> with an underline utility class (not the shared Button component), per UI-SPEC's explicit instruction that it read as part of the error-bar sentence, not a separate control; the whole bar's existing padding remains the 44px tap target."

requirements-completed: [LOOK-01]

coverage:
  - id: D1
    description: "When a typed symbol is unrecognized but one confident supported candidate exists, the error bar offers a single tappable in-sentence suggestion; tapping it stamps that chord."
    requirement: "LOOK-01"
    verification:
      - kind: unit
        ref: "src/lib/theory/didYouMean.test.ts (8 tests: lowercase root, quality typo, missing m7b5 digit, ambiguous/unrelated -> null, empty/whitespace -> null, unsupported root -> null, never throws)"
        status: pass
      - kind: e2e
        ref: "tests/lookup.e2e.test.ts#stamping an unrecognized-but-close symbol shows a tappable suggestion that stamps the candidate on click"
        status: pass
    human_judgment: false
  - id: D2
    description: "When no confident candidate exists, the error bar falls back to the existing rotating hints unchanged; never auto-corrects silently; never shows multiple suggestions."
    requirement: "LOOK-01"
    verification:
      - kind: e2e
        ref: "tests/lookup.e2e.test.ts#stamping an unrelated unrecognized symbol falls back to a plain rotating hint with no suggestion token"
        status: pass
      - kind: unit
        ref: "src/lib/theory/didYouMean.test.ts#returns null when no confident candidate exists / returns null when the root is not one of the 12 supported roots"
        status: pass
    human_judgment: false
  - id: D3
    description: "The last successful result stays rendered under a failed submit whether or not a suggestion is offered (non-blocking, D-08 carried)."
    requirement: "LOOK-01"
    verification:
      - kind: e2e
        ref: "tests/lookup.e2e.test.ts#keeps the previously rendered chord-result visible while showing the suggestion bar (non-blocking)"
        status: pass
    human_judgment: false
  - id: D4
    description: "suggestionHints offers 3 uppercase, em-dash-free variants with a {SYMBOL} placeholder and an independent no-repeat picker, leaving errorHints/pickHint untouched."
    verification:
      - kind: unit
        ref: "src/lib/copy/hints.test.ts (5 tests: variant count, no em dash, placeholder present, picker returns a member, no immediate repeat)"
        status: pass
    human_judgment: false

duration: 18min
completed: 2026-07-13
status: complete
---

# Phase 2 Plan 3: Did You Mean Suggestion Summary

**A minimal, deterministic didYouMean heuristic (case slips, single-character quality typos, missing m7b5 digit) now powers a single tappable inline suggestion inside the lookup page's error bar, turning an unrecognized-but-close chord symbol into a one-tap recovery instead of a dead end, while unrelated misses still fall back to the existing rotating hints unchanged.**

## Performance

- **Duration:** 18 min
- **Completed:** 2026-07-13
- **Tasks:** 3
- **Files modified:** 7 (3 new: didYouMean module + test, hints test; 4 modified: randomChord exports, hints.ts, lookup page, lookup e2e test)

## Accomplishments

- `$lib/theory/didYouMean.ts`: pure, total heuristic drawing its entire candidate space from `randomChord.ts`'s proven 12-root x 8-quality matrix (now exported as `ROOTS`/`QUALITY_SUFFIXES`); returns exactly one confident candidate symbol or `null`, never throws, never adds a fuzzy-matching dependency
- `$lib/copy/hints.ts` extended with `suggestionHints` (3 uppercase, em-dash-free variants with a `{SYMBOL}` placeholder) and `pickSuggestionHint()`, using its own independent no-repeat index so it never interferes with `errorHints`/`pickHint`'s rotation
- Lookup page's unrecognized branch now calls `didYouMean(input)`; on a candidate it renders the suggestion inline inside the existing ink error bar as a tappable underlined token (`data-testid="suggestion"`) that restamps via `showChordFromSymbol`; on no candidate it falls back to the plain rotating hint exactly as before
- `result` is never cleared on the failure path (grep-verified); the non-blocking D-08 invariant holds with or without a suggestion
- 3 new e2e tests cover the tappable-suggestion-and-restamp path, the no-candidate fallback (no suggestion token rendered), and non-blocking result persistence; all 10 prior Plan 01/02 e2e assertions still pass unmodified

## Task Commits

Each task was committed atomically:

1. **Task 1: didYouMean single-candidate heuristic (with tests)** - `e5f4a9b` (feat)
2. **Task 2: Suggestion copy variants in hints.ts** - `221ac70` (feat)
3. **Task 3: Render and wire the inline suggestion in the error bar (GREEN)** - `6bf45c5` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified

- `src/lib/theory/didYouMean.ts` - Pure `didYouMean(input: string): string | null` heuristic: root-token extraction against `ROOTS`, then Levenshtein distance <=1 on the quality token against `QUALITY_SUFFIXES`, with exact-match priority and extension-over-truncation tie-breaking; local Levenshtein helper, no dependency
- `src/lib/theory/didYouMean.test.ts` - 8 co-located unit tests covering every behavior in the plan's `<behavior>` block
- `src/lib/theory/randomChord.ts` - `ROOTS` and `QUALITY_SUFFIXES` now exported (behavior of `randomChord()` unchanged, verified by existing `randomChord.test.ts` still passing)
- `src/lib/copy/hints.ts` - Added `suggestionHints` (3 variants) and `pickSuggestionHint()` with an independent `lastSuggestionIndex`; `errorHints`/`pickHint` untouched
- `src/lib/copy/hints.test.ts` - New file, 5 tests (variant count, em-dash absence, placeholder presence, picker membership, no-immediate-repeat)
- `src/routes/+page.svelte` - Imports `didYouMean` and `pickSuggestionHint`; unrecognized branch tries `didYouMean(input)` first, setting `suggestion` state and rendering it as an inline `<button data-testid="suggestion">` split out of the hint text via a small placeholder-splitting helper; falls back to `pickHint()`/`suggestion = null` unchanged when no candidate
- `tests/lookup.e2e.test.ts` - Added a `lookup page did-you-mean suggestion` describe block with 3 new tests

## Decisions Made

- Reused `randomChord.ts`'s exact matrix by exporting `ROOTS`/`QUALITY_SUFFIXES` rather than redefining a parallel candidate list, keeping `didYouMean` and `randomChord`/`reference-chords.test.ts` provably in sync.
- Built a small local Levenshtein helper directly in `didYouMean.ts` instead of adding a fuzzy-matching npm dependency, per the plan's explicit scope guard (deferred to a future milestone if ever needed).
- Introduced two tie-breaking rules on top of raw edit distance because pure symmetric Levenshtein alone produced ambiguous ties on the plan's own required test cases: (1) an exact quality-token match always wins outright even if another suffix is also within distance 1; (2) among a genuine tie, prefer the suffix that extends the typed token (missing trailing character) over one that truncates it. Both rules still fall through to `null` if they don't uniquely resolve, preserving "never guess."
- Rendered the suggestion as a plain `<button class="underline">` rather than the shared `Button` component, matching UI-SPEC's explicit instruction that the suggestion read as an inline part of the error-bar sentence, not a separate control with its own visual weight.

## Deviations from Plan

None - plan executed exactly as written. One implementation refinement within Task 1's own scope: the plan's algorithm description ("collect suffixes within distance 1; if exactly one qualifies, return it") produced ambiguous ties on the plan's own required behaviors (`Cm7` typed as `m7` also sits distance 1 from `7`; `Cm7b`'s `m7b` sits distance 1 from both `m7` and `m7b5`). Added the two tie-breaking rules described above (exact-match priority, extension-over-truncation) to resolve exactly the cases the plan's `<behavior>` block specifies, while keeping the "ambiguous stays null" guarantee for every case the plan requires to stay null (`Zxq9`, empty, unsupported root). This is a Rule 1 (bug/correctness) fix discovered during the task's own TDD RED/GREEN cycle, not a scope expansion.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- LOOK-01 is now fully shipped end to end: lookup, ergonomics, and error recovery all live on the home page.
- Phase 2 is complete (Plans 01, 02, 03 all done). Phase 3 (drills) can reuse `$lib/lookup/chordPresentation`, `$lib/lookup/recentLookups`, and the `didYouMean`/hints pattern if drill feedback ever needs a similar "close but not quite" recovery path.
- Manual cross-reload localStorage verification (deferred from Plan 02) remains the one outstanding end-of-phase human verification item, consistent with `human_verify_mode: end-of-phase`.
- No blockers identified.

---
*Phase: 02-chord-lookup-companion*
*Completed: 2026-07-13*

## Self-Check: PASSED

All created files found on disk (`src/lib/theory/didYouMean.ts`, `src/lib/theory/didYouMean.test.ts`, `src/lib/copy/hints.test.ts`, this summary); all task commits (e5f4a9b, 221ac70, 6bf45c5) verified present in git log.
