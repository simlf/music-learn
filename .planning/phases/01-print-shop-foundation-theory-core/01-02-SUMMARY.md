---
phase: 01-print-shop-foundation-theory-core
plan: 02
subsystem: theory-engine
tags: [tonal, vitest, chord-parsing, tdd, solfege]

# Dependency graph
requires:
  - phase: 01-print-shop-foundation-theory-core (Plan 01)
    provides: "Walking-skeleton spellChord(symbol): string[] wrapping tonal, /showcase route"
provides:
  - "spellChord(symbol): ChordResult - typed, interval-tagged, dual-named, enharmonically-correct chord spelling"
  - "letterToSolfege(letter): string - French solfège mapping (Do..Si)"
  - "ChordResult, SpelledNote, IntervalRole shared types"
  - "96-cell reference chord chart test (12 roots x 8 v1 qualities) as the correctness proof for THEORY-01/03"
affects: [01-03, 01-04, "Phase 2 (lookup)", "Phase 3 (drills)", "Phase 4 (MIDI matching)", "Phase 6 (scales)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Chord-symbol accidental normalization (ASCII #/b, glyphs ♯/♭, half-diminished ø/ø7) happens at the spellChord input boundary, before calling tonal's Chord.get - never a hand-rolled parser"
    - "Interval role (root/third/fifth/seventh) derived from tonal's interval-string degree number (e.g. '3m' -> third), not from array position, so it stays correct for any chord shape"
    - "Solfège is degree-based: letterToSolfege ignores accidentals, mapping only the base letter"

key-files:
  created:
    - src/lib/theory/types.ts
    - src/lib/theory/solfege.ts
    - src/lib/theory/solfege.test.ts
    - src/lib/theory/reference-chords.test.ts
  modified:
    - src/lib/theory/chord.ts
    - src/lib/theory/chord.test.ts
    - src/routes/showcase/+page.svelte

key-decisions:
  - "Reference chord matrix root set: C Db D Eb E F F# G Ab A Bb B (the standard jazz enharmonic root set that avoids double-accidental roots), generated from tonal's Chord.get output and spot-checked against known jazz theory rather than hand-typed"
  - "Diminished/half-diminished/dim7 chords legitimately spell with double-flats in several roots (e.g. Cdim7 -> C Eb Gb Bbb, Abm7b5 -> Ab Cb Ebb Gb) - this is correct one-letter-per-degree theory, not a bug, and is captured as-is in the reference chart"
  - "ø and ø7 both normalize to m7b5 before parsing (ø alone and ø7 are both common jazz shorthand for the half-diminished seventh)"

patterns-established:
  - "Reference-chart-as-test: a literal expected-value matrix embedded in a test file is the authoritative correctness proof for the theory engine, generated from the trusted parser (tonal) and reviewed for known-correct spellings rather than invented by hand"

requirements-completed: [THEORY-01, THEORY-02, THEORY-03, THEORY-04]

coverage:
  - id: D1
    description: "spellChord correctly spells every v1 chord quality (major/minor/dim triads, maj7, m7, dom7, ø7/m7b5, °7/dim7) across all 12 roots"
    requirement: "THEORY-01"
    verification:
      - kind: unit
        ref: "src/lib/theory/reference-chords.test.ts#reference chord matrix (THEORY-01, THEORY-03) - 96 generated cases"
        status: pass
    human_judgment: false
  - id: D2
    description: "Jazz notation aliases (Cm7/C-7/Cmin7, Cø7/Cm7♭5, C°7/Cdim7) resolve to identical spelled notes"
    requirement: "THEORY-02"
    verification:
      - kind: unit
        ref: "src/lib/theory/chord.test.ts#THEORY-02: jazz notation aliases resolve to the same chord"
        status: pass
    human_judgment: false
  - id: D3
    description: "Notes spell one letter per scale degree from root + interval formula; F♯m7 shows C♯ not D♭"
    requirement: "THEORY-03"
    verification:
      - kind: unit
        ref: "src/lib/theory/chord.test.ts#THEORY-03: enharmonically correct spelling, one letter per degree"
        status: pass
      - kind: unit
        ref: "src/lib/theory/reference-chords.test.ts#F♯m7 spells with C♯, never D♭ (THEORY-03 enharmonic anchor case)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every returned note carries a letter name and its French solfège"
    requirement: "THEORY-04"
    verification:
      - kind: unit
        ref: "src/lib/theory/chord.test.ts#THEORY-04: every note has a letter and a French solfège label"
        status: pass
      - kind: unit
        ref: "src/lib/theory/solfege.test.ts#letterToSolfege - all 7 letters + accidental-agnostic cases"
        status: pass
    human_judgment: false
  - id: D5
    description: "Theory engine stays a pure module (no DOM/audio/svelte imports)"
    verification:
      - kind: other
        ref: "grep -nE for svelte/\\$app imports across src/lib/theory/*.ts returns no matches"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-07-12
status: complete
---

# Phase 1 Plan 2: Theory Engine Core Summary

**`spellChord()` now returns a typed, interval-tagged, dual-named `ChordResult` that passes a 96-cell reference chord matrix (12 roots x 8 v1 qualities) plus alias, enharmonic, and solfège correctness tests, built via a strict RED-GREEN TDD cycle.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-12T22:44:00Z
- **Completed:** 2026-07-12T22:47:33Z
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files modified:** 7 (4 created, 3 modified)

## Accomplishments

- Defined `ChordResult`, `SpelledNote`, `IntervalRole` in `types.ts` as the shared contract every later phase (lookup, drills, MIDI matching, scales) builds on.
- Wrote a failing 96-cell reference chord chart (`reference-chords.test.ts`) covering all 12 roots x 8 v1 qualities, generated from tonal's `Chord.get` output and reviewed against jazz theory (including legitimate double-flat diminished-seventh spellings), plus expanded `chord.test.ts` with alias-equivalence, accidental-normalization, and dual-naming tests. Confirmed RED: 108 failing.
- Implemented `letterToSolfege()` (degree-based French solfège mapping) and rewrote `spellChord()` to normalize ASCII/glyph accidentals and the `ø`/`ø7` half-diminished shorthand into tonal's parser input, read tonal's enharmonically-correct spelled notes directly, tag each note's interval role from tonal's interval-degree number, and attach solfège. All 121 theory tests pass GREEN.

## Task Commits

Each task was committed atomically (TDD RED then GREEN):

1. **Task 1: RED - reference chord matrix + alias + enharmonic tests** - `a2bc880` (test) - confirmed 108 failing, 5 passing
2. **Task 2: GREEN - implement spellChord + solfège to pass the matrix** - `7d74113` (feat) - all 121 theory tests passing

_No REFACTOR commit - the GREEN implementation was already minimal and needed no cleanup._

## Files Created/Modified

- `src/lib/theory/types.ts` - `ChordResult`, `SpelledNote`, `IntervalRole` shared type contract
- `src/lib/theory/solfege.ts` - `letterToSolfege(letter)`: degree-based French solfège mapping
- `src/lib/theory/solfege.test.ts` - all 7 letters + accidental-agnostic cases
- `src/lib/theory/reference-chords.test.ts` - 96-cell reference chord matrix (THEORY-01/03 proof)
- `src/lib/theory/chord.ts` - `spellChord()` rewritten to return `ChordResult`: normalizes accidentals/ø, delegates parsing to tonal's `Chord.get`, tags interval role, attaches solfège
- `src/lib/theory/chord.test.ts` - expanded with THEORY-02/03/04 tests, interval role tagging, unrecognized-input safety, `ChordResult` shape assertion
- `src/routes/showcase/+page.svelte` - updated to read `spellChord(symbol).notes.map(n => n.letter)` after the return-type change (see Deviations)

## Decisions Made

- Reference chord matrix uses the standard jazz enharmonic root set (C Db D Eb E F F# G Ab A Bb B) rather than every possible enharmonic spelling, avoiding double-accidental roots while still legitimately producing double-accidental notes within diminished chords (correct one-letter-per-degree theory).
- `ø` and `ø7` both normalize to `m7b5` before parsing, since both are common jazz shorthand for the half-diminished seventh chord.
- Interval role is derived from tonal's interval-string degree number (not array position), keeping role tagging correct even if tonal's note ordering were ever to change.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed showcase page's now-mismatched spellChord usage**
- **Found during:** Task 2 (running `svelte-check` after implementing the new `ChordResult` return type)
- **Issue:** `src/routes/showcase/+page.svelte` (built in Plan 01) called `spellChord(symbol)` expecting a `string[]` return and stored it directly in a `string[]` state variable. Changing `spellChord`'s return type to `ChordResult` broke this call site: `svelte-check` reported "Type 'ChordResult' is missing the following properties from type 'string[]'".
- **Fix:** Updated the call site to `spellChord(symbol).notes.map((note) => note.letter)`, preserving the existing display behavior (a flat list of letter names) without touching any other part of the page. Plan 03/04 own the real showcase UI rebuild with interval colors and dual naming.
- **Files modified:** `src/routes/showcase/+page.svelte`
- **Verification:** `npx svelte-check --tsconfig ./tsconfig.json` reports 0 errors; `npx vitest run` (122 tests, including the e2e showcase test) all pass; `npm run build` succeeds.
- **Committed in:** `7d74113` (Task 2 GREEN commit)

**2. [Bug found during implementation] Fixed `ø7` double-suffix bug in accidental normalization**
- **Found during:** Task 2, while running the full suite after the first implementation pass
- **Issue:** The initial normalization regex replaced `ø` with `m7b5` unconditionally, so `Cø7` (a common jazz spelling where the `7` is written explicitly alongside `ø`) became `Cm7b57` - an invalid symbol tonal's `Chord.get` could not parse, causing `spellChord('Cø7').recognized` to be `false`.
- **Fix:** Changed the regex to `/ø7?/g` so the optional trailing `7` is consumed as part of the same match, producing `Cm7b5` correctly for both `Cø7` and `Cø` input forms.
- **Files modified:** `src/lib/theory/chord.ts`
- **Verification:** `spellChord('Cø7').notes` now equals `spellChord('Cm7♭5').notes`; full suite green.
- **Committed in:** `7d74113` (Task 2 GREEN commit, fixed before commit - not a separate follow-up commit)

---

**Total deviations:** 2 auto-fixed (1 blocking cross-file fix, 1 bug caught during GREEN implementation before commit)
**Impact on plan:** Both were necessary for correctness (the showcase page would not typecheck/build otherwise; the ø7 bug would have shipped a broken alias case). No scope creep - no new features, no architectural changes, no new dependencies.

## Issues Encountered

None beyond the deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The theory engine is now the complete, pure, unit-tested source of truth for chord spelling: `spellChord()` returns a typed `ChordResult` with interval-tagged, dual-named, enharmonically-correct notes for every v1 chord quality across all 12 roots, with jazz alias resolution.
- `letterToSolfege()` is available standalone for any future component (keyboard labels, drill feedback, lesson content) needing French solfège.
- The engine remains a pure module (verified via grep: zero `svelte`/`$app`/DOM/audio imports across `src/lib/theory/*.ts`), ready for Plan 03 (Print Shop design system components) and Plan 04 (full showcase slice), and for Phases 2-6 downstream (lookup, drills, MIDI matching, scales).
- No blockers for Plan 03.

## Self-Check: PASSED

All 7 created/modified files verified present on disk (`types.ts`, `solfege.ts`, `solfege.test.ts`, `reference-chords.test.ts`, `chord.ts`, `chord.test.ts`, `+page.svelte`). Both commits (`a2bc880`, `7d74113`) verified in `git log`. TDD gate sequence confirmed: RED commit (`test(01-02)`) precedes GREEN commit (`feat(01-02)`) in git log; no REFACTOR commit needed. Plan-level verification re-run and passing: `npx vitest run src/lib/theory` 121/121 green (full reference matrix + aliases + enharmonics + dual naming), `npx vitest run` 122/122 green (including e2e showcase test), `npx svelte-check --tsconfig ./tsconfig.json` 0 errors, `npm run build` succeeds, purity grep confirms zero forbidden imports.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED | `a2bc880` `test(01-02): add failing reference chord matrix + alias/enharmonic tests` | Present, confirmed failing (108 failed / 5 passed) before implementation |
| GREEN | `7d74113` `feat(01-02): implement spellChord + solfege to pass the full matrix` | Present, confirmed passing (121/121) after implementation |
| REFACTOR | - | Not needed - GREEN implementation required no cleanup |

No gate violations.

---
*Phase: 01-print-shop-foundation-theory-core*
*Completed: 2026-07-12*
