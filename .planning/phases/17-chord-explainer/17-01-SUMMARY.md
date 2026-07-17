---
phase: 17-chord-explainer
plan: 01
subsystem: theory-copy
tags: [tonal, vitest, chord-theory, copy]

# Dependency graph
requires:
  - phase: 12-interval-language
    provides: intervalFromShort/.long English diction shared with BuildSession
  - phase: 16-hear-the-chord
    provides: existing chordPresentation.ts/mnemonics.ts modules extended here
provides:
  - "familyLineFor(qualitySuffix): string | null covering the 3 v1 triad qualities with no mnemonic ('', 'm', 'dim')"
  - "formulaSentence(chord: ChordResult): string generating the plain-English Layer 2 formula sentence"
affects: [17-02-hint-ladder]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Layer-1 resolution: mnemonicFor(q) ?? familyLineFor(q) is total across all 8 v1 QUALITY_SUFFIXES"
    - "Generated (never hardcoded) sentence copy built from formulaFor entries + intervalFromShort(...).long, joined by one template regardless of tone count"

key-files:
  created: []
  modified:
    - src/lib/copy/mnemonics.ts
    - src/lib/copy/mnemonics.test.ts
    - src/lib/lookup/chordPresentation.ts
    - src/lib/lookup/chordPresentation.test.ts

key-decisions:
  - "familyLineFor is keyed strictly by canonical triad suffixes ('', 'm', 'dim'), not routed through mnemonics.ts's ALIASES map, since the hint ladder's Layer-1 resolver always passes the canonical sliced suffix"
  - "formulaSentence filters formulaFor's entries by role !== 'root' and maps through intervalFromShort(label).long, so the sentence is generated from the shared interval vocabulary rather than hardcoded per chord quality"

patterns-established:
  - "Total-function contract extended to a second copy helper: unknown/unrecognized input returns null/''  rather than throwing, matching mnemonicFor's 'better none than cheesy' doc convention"

requirements-completed: [HINT-03]

coverage:
  - id: D1
    description: "familyLineFor resolves the 3 v1 triad qualities to pinned beginner-plain lines and null everywhere else; mnemonicFor(q) ?? familyLineFor(q) is total across all 8 v1 qualities"
    requirement: "HINT-03"
    verification:
      - kind: unit
        ref: "src/lib/copy/mnemonics.test.ts#familyLineFor: the 3 triad qualities (deliberate snapshot)"
        status: pass
      - kind: unit
        ref: "src/lib/copy/mnemonics.test.ts#Layer 1 resolution order: mnemonicFor(q) ?? familyLineFor(q) is total"
        status: pass
    human_judgment: false
  - id: D2
    description: "formulaSentence generates the Layer 2 plain-English formula sentence from formulaFor + intervalFromShort(...).long, matching the three UI-SPEC worked examples (Cdim, Cm7b5, Cmaj7), and is total (empty string) for unrecognized chords"
    requirement: "HINT-03"
    verification:
      - kind: unit
        ref: "src/lib/lookup/chordPresentation.test.ts#formulaSentence (all 6 cases)"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-07-17
status: complete
---

# Phase 17 Plan 01: Chord Explainer Copy Helpers Summary

**Added `familyLineFor` (Layer 1's totality fallback for plain major/minor/dim triads) and `formulaSentence` (Layer 2's generated plain-English formula sentence), both pure and TDD-verified, so Plan 02's HintLadder only wires them up.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-17T21:05:20+02:00
- **Completed:** 2026-07-17T21:07:14+02:00
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `familyLineFor(qualitySuffix)` added to `mnemonics.ts`: the 3 beginner-plain triad lines (major/minor/dim) pinned verbatim from the UI-SPEC Layer 1 table, `null` for every seventh quality (already covered by `mnemonicFor`) and every unsupported suffix. `mnemonicFor(q) ?? familyLineFor(q)` is now proven total across all 8 v1 `QUALITY_SUFFIXES`.
- `formulaSentence(chord)` added to `chordPresentation.ts`: generates ("From the root, stack a {long}, then a {long}...") from `formulaFor`'s non-root entries via the shared `intervalFromShort(...).long` vocabulary. No per-chord literals, no per-count branching — a triad's 2-tone sentence and a seventh chord's 3-tone sentence fall out of the same join. Matches all three UI-SPEC worked examples verbatim (Cdim, Cm7b5, Cmaj7). Total: unrecognized input returns `""`.

## Task Commits

Both tasks followed strict TDD (RED test commit, then GREEN implementation commit):

1. **Task 1: Add familyLineFor to mnemonics.ts**
   - `7acc163` test(17-01): add failing tests for familyLineFor (RED)
   - `9778465` feat(17-01): add familyLineFor for the 3 v1 triad qualities (GREEN)
2. **Task 2: Add formulaSentence to chordPresentation.ts**
   - `e397c16` test(17-01): add failing tests for formulaSentence (RED)
   - `956c380` feat(17-01): add formulaSentence for the Layer 2 generated formula copy (GREEN)

_No refactor commits needed - both implementations were minimal and clean on first GREEN pass._

## Files Created/Modified
- `src/lib/copy/mnemonics.ts` - added exported `familyLineFor(qualitySuffix): string | null` and its private `FAMILY_LINES` record (3 triad entries)
- `src/lib/copy/mnemonics.test.ts` - added `describe` blocks pinning the 3 family lines, the null-for-seventh/null-for-unsupported cases, the total resolution-order test across all 8 `QUALITY_SUFFIXES`, and a copy-quality-bar guard (no em dashes, no ASCII accidentals)
- `src/lib/lookup/chordPresentation.ts` - added exported `formulaSentence(chord: ChordResult): string`, importing `intervalFromShort` from `$lib/theory/interval`
- `src/lib/lookup/chordPresentation.test.ts` - added `describe('formulaSentence')` pinning the three worked-example sentences, a generation-not-hardcoded tone-count assertion, the empty-string total case, and a no-em-dash guard

## Decisions Made
- `familyLineFor` deliberately does NOT route through `mnemonics.ts`'s existing `ALIASES` map (unlike `mnemonicFor`) — it is keyed strictly by the 3 canonical v1 triad suffixes (`''`, `m`, `dim`) since the ladder's Layer-1 resolver always passes the sliced canonical suffix from `QUALITY_SUFFIXES`, per the plan's explicit instruction.
- `formulaSentence` builds its sentence by filtering `formulaFor(chord)` on `entry.role !== 'root'` and mapping each remaining `label` through `intervalFromShort(label).long` — reusing the exact same interval-naming module BuildSession's construction steps already use (BUILD-03), so the Explainer and Build-it surfaces speak one shared vocabulary (D-05), per the plan.
- Per the UI-SPEC's "Correction to D-05," no `aug` entry was added to `familyLineFor` — augmented is not a supported v1 quality (`QUALITY_SUFFIXES` has no `aug`/`+`), matching the plan exactly.

## Deviations from Plan

None - plan executed exactly as written. Both tasks followed the plan's TDD sequencing precisely (RED test extending the existing co-located test file, then GREEN implementation alongside the existing `mnemonicFor`/`formulaFor` without modifying either).

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Verification Evidence

- `npx vitest run src/lib/copy/mnemonics.test.ts src/lib/lookup/chordPresentation.test.ts`:
  ```
  Test Files  2 passed (2)
       Tests  51 passed (51)
  ```
- `npm run check`:
  ```
  1784315227186 COMPLETED 1287 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
  ```
- Full repo test suite sanity check, `npx vitest run`:
  ```
  Test Files  69 passed (69)
       Tests  1016 passed (1016)
  ```

## Next Phase Readiness
- `familyLineFor` and `formulaSentence` are exported, pure, total, and TDD-pinned — Plan 02's `HintLadder` component can now wire Layer 1 (`mnemonicFor(q) ?? familyLineFor(q)`) and Layer 2 (`formulaSentence(chord)` + the unmodified `IntervalScaffold`) with zero further derivation logic of its own.
- No blockers. No new dependencies introduced (UI-SPEC's zero-new-dependencies constraint held).

---
*Phase: 17-chord-explainer*
*Completed: 2026-07-17*

## Self-Check: PASSED

All 4 modified files confirmed present on disk; all 4 task commit hashes (7acc163, 9778465, e397c16, 956c380) confirmed present in git log.
