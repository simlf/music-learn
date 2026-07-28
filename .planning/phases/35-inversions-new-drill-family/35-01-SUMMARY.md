---
phase: 35-inversions-new-drill-family
plan: 01
subsystem: theory-engine
tags: [tonal, vitest, chroma-grading, inversions]

requires: []
provides:
  - "src/lib/practice/inversions.ts: inversionCountFor/bassRoleForIndex/bassNoteFor/inversionVoicing pure inversion engine"
  - "src/lib/drills/matchInversion.ts: chroma+bass grading composing matchChord"
affects: [35-02, 35-03, 35-04, 35-05, 35-06]

tech-stack:
  added: []
  patterns:
    - "Inversion voicing derived by rotating chord.notes to the bass role then walking an ascending-chroma cursor, incrementing octave whenever the next chroma does not sit strictly above the running one (mirrors keyboardLayout's ascending-placement idea)"
    - "matchInversion composes matchChord rather than re-deriving chroma-set arithmetic; bass correctness is a separate chroma equality check layered on top"

key-files:
  created:
    - src/lib/practice/inversions.ts
    - src/lib/practice/inversions.test.ts
    - src/lib/drills/matchInversion.ts
    - src/lib/drills/matchInversion.test.ts
  modified: []

key-decisions:
  - "bassRoleForIndex is the single source of the inversion-index-to-bass-role table (0 root, 1 third, 2 fifth, 3 seventh); both voicing derivation and future prompt copy read from this one function, no parallel table"
  - "inversionVoicing's octave-assignment rule increments only when the next note's chroma is <= the running chroma (not < ), which correctly handles the same-chroma edge case and matches the expected Cm7-2nd-inversion wrap"

patterns-established:
  - "Pure inversion engine mirrors shellVoicing.ts's file/import/purity shape exactly (no DOM/Svelte/Dexie)"
  - "InversionMatchResult exposes chordCorrect/bassCorrect as separate booleans so callers can branch cleanly between the two distinct retry copy lines"

requirements-completed: [INV-01]

coverage:
  - id: D1
    description: "inversionCountFor/bassRoleForIndex/bassNoteFor derive inversion count and bass role/note purely from spellChord data, total over unrecognized symbols and out-of-range indices"
    requirement: "INV-01"
    verification:
      - kind: unit
        ref: "src/lib/practice/inversions.test.ts#inversionCountFor / bassRoleForIndex / bassNoteFor"
        status: pass
    human_judgment: false
  - id: D2
    description: "inversionVoicing derives the ascending bass-lowest voicing (Cm7 2nd inversion wrap, root-position triad, role preservation across inversions) with R/3/5/7 markers pinned to INVERSION_BASE_OCTAVE"
    requirement: "INV-01"
    verification:
      - kind: unit
        ref: "src/lib/practice/inversions.test.ts#inversionVoicing"
        status: pass
    human_judgment: false
  - id: D3
    description: "matchInversion grades chroma set + required bass by composing matchChord, never comparing spelled letters, covering right/right, right-notes-wrong-bass, wrong-notes, undefined-bass, and enharmonic-equality cases"
    requirement: "INV-01"
    verification:
      - kind: unit
        ref: "src/lib/drills/matchInversion.test.ts#matchInversion"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-27
status: complete
---

# Phase 35 Plan 01: Pure Inversion Engine + Chroma/Bass Grading Summary

**Pure, DOM-free inversion-rotation engine (inversions.ts) and chroma+required-bass grading (matchInversion.ts) built on top of spellChord/matchChord, with 18 passing unit tests and zero new theory source.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-27T00:20:11Z
- **Completed:** 2026-07-27T00:32:00Z
- **Tasks:** 3
- **Files modified:** 4 (all new)

## Accomplishments
- `inversions.ts` exports `inversionCountFor`, `bassRoleForIndex`, `bassNoteFor`, `inversionVoicing`, and `INVERSION_BASE_OCTAVE`, deriving triad (3) vs seventh-chord (4) inversion counts, the bass role/note for any inversion index, and the ascending bass-lowest voicing with fixed per-note roles and R/3/5/7 markers - all purely from `spellChord`'s tonal-backed data.
- `matchInversion.ts` composes `matchChord` for chroma-set grading and layers a required-bass chroma equality check on top (`InversionMatchResult.bassCorrect`), giving the drill's two retry copy lines (`chordCorrect && !bassCorrect` vs `!chordCorrect`) a clean boolean to branch on.
- 18 Vitest unit tests across both modules cover triad/seventh inversion counts, bass-lowest voicing with octave wrap, role preservation across inversions, all four grading-matrix cases, and one enharmonic-equality proof.

## Task Commits

Each task was committed atomically:

1. **Task 1: Pure inversion engine (inversions.ts)** - `9e7c846` (feat)
2. **Task 2: Chroma + bass grading (matchInversion.ts)** - `6b849c5` (feat)
3. **Task 3: Unit tests for inversions.ts and matchInversion.ts** - `cfda768` (test)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/lib/practice/inversions.ts` - Pure inversion-rotation engine: count, bass role/note, ascending voicing
- `src/lib/practice/inversions.test.ts` - Unit tests for the above
- `src/lib/drills/matchInversion.ts` - Chroma + required-bass grading, composing matchChord
- `src/lib/drills/matchInversion.test.ts` - Unit tests for the above

## Decisions Made
- `bassRoleForIndex`'s 0/1/2/3 -> root/third/fifth/seventh table is the single source both `bassNoteFor`/`inversionVoicing` and (per the phase-wide architecture note) future prompt copy will read from - no parallel table introduced.
- The octave-increment rule in `inversionVoicing` triggers on `chroma <= runningChroma` (not strict `<`), which correctly produces the Cm7 2nd-inversion expected wrap (G4, B♭4, C5, E♭5) and the plain root-position case (C4, E4, G4) with the same single rule - verified directly against the plan's `<behavior>` examples.

## Deviations from Plan

None - plan executed exactly as written. Both new modules import only `spellChord`, `Note` (tonal), `toAsciiAccidentals`, and existing types, per the plan's explicit "compose, don't duplicate" constraint; `matchInversion` calls `matchChord` rather than re-deriving chroma-set arithmetic.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `inversions.ts` and `matchInversion.ts` are ready for 35-02 (CountingChipRow `rotateFromRole`, `stackedThirdsFor` `startRole`, `PianoKeyboard` `bassHint`) and 35-05 (`InversionDrill.svelte`) to build on directly.
- `npm run check`: 0 errors, 0 warnings across 1385 files. `npm test`: 1556/1556 tests passing across 110 files (full-suite regression check, no existing family touched).
- No blockers.

---
*Phase: 35-inversions-new-drill-family*
*Completed: 2026-07-27*

## Self-Check: PASSED

All 5 created files verified present on disk; all 4 commit hashes (9e7c846, 6b849c5, cfda768, 3c245cb) verified in git log.
