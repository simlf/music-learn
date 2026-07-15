---
phase: 12-build-it-construction
plan: 03
subsystem: practice-engine
tags: [tonal, vitest, tdd, construction]

# Dependency graph
requires:
  - phase: 12-build-it-construction (plan 01)
    provides: phraseStep(short, opts) in interval.ts, deck.ts's formula-build mode/getCard, facts.ts's scaleFormulaFactId
provides:
  - "construction.ts: ConstructionKind/ConstructionStep/ConstructionState/ConstructionTapResult types"
  - "createChordConstruction(symbol) and createScaleConstruction(tonic): ascending, octave-strict target sequences from spellChord/majorScaleNotes' own spelling"
  - "expectedStep(state) and gradeConstructionTap(state, letter, octave): total, MIDI/chroma-only grading with correct/wrong-pitch-class/wrong-octave outcomes"
  - "isNotableSpelling(letter) and CONSTRUCTION_BASE_OCTAVE"
affects: [12-04-build-session, 12-05-build-session, 12-06-fsrs-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "One engine, two grammars (D-04): a single shared buildConstruction() builder derives both chord (stack thirds) and scale (step W/H, closing octave) targets from the same root-first SpelledNote[] + ascending-voicing MIDI placement"
    - "Total, never-throw grading with a same-reference echo for terminal states: gradeConstructionTap on a done state returns the identical input `state` object rather than a copy, matching scaleKeyboardDrill.ts's own never-mutate convention"

key-files:
  created:
    - src/lib/practice/construction.ts
    - src/lib/practice/construction.test.ts
  modified: []

key-decisions:
  - "Label reconstruction for chords uses chord.root + chord.symbol.slice(chord.root.length), the exact glyph-symbol idiom chordPresentation.ts's aliasLine and RecallMap's chordLabel already use, so label rendering stays consistent app-wide"
  - "Scale's octave-close note is appended as { ...notes[0], role: 'root' } (forced root role), mirroring placeAscendingScaleKeys' precedent from the scale keyboard drill so degree 8 always reads as the returning tonic, not another 'seventh'-adjacent role"
  - "gradeConstructionTap's wrong-octave/wrong-pitch-class branches never mutate the input state in place: both return a fresh `{ ...state, wrongTapCount: state.wrongTapCount + 1 }` object, and the done/unrecognized-tap guards echo back the literal same state reference"

patterns-established:
  - "Full-catalog reachability sweep as a single programmatic test (not hand-enumerated): looping ROOTS x QUALITY_SUFFIXES (96) and MAJOR_SCALE_ROOTS (12) and walking every target's own exact expected taps to completion, proving both step-count shape and MIDI board-fit ([60,84]) for the entire real catalog in one assertion"

requirements-completed: [BUILD-01, BUILD-02, BUILD-03]

coverage:
  - id: D1
    description: "createChordConstruction/createScaleConstruction derive ascending, octave-strict targets from the theory engine's OWN spelling (Cdim7 keeps its B♭♭ seventh), with steps carrying the CONSECUTIVE interval, role, and degree"
    requirement: BUILD-01
    verification:
      - kind: unit
        ref: "src/lib/practice/construction.test.ts#createChordConstruction / createScaleConstruction"
        status: pass
    human_judgment: false
  - id: D2
    description: "gradeConstructionTap grades octave-strict by MIDI/chroma only: correct (exact MIDI), wrong-octave (same chroma, wrong MIDI), wrong-pitch-class (signed semitone distance + direction) - never letter-string comparison, never mutates input state, always returns a state"
    requirement: BUILD-01
    verification:
      - kind: unit
        ref: "src/lib/practice/construction.test.ts#gradeConstructionTap: ascending walk-through / wrong-pitch-class and wrong-octave grading"
        status: pass
    human_judgment: false
  - id: D3
    description: "One engine, two grammars: the same buildConstruction/gradeConstructionTap machinery serves both chords and scales, with no chord-only or scale-only branch inside gradeConstructionTap itself"
    requirement: BUILD-02
    verification:
      - kind: unit
        ref: "src/lib/practice/construction.test.ts#createScaleConstruction"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every one of the 96 chord targets (ROOTS x QUALITY_SUFFIXES) and all 12 scale targets (MAJOR_SCALE_ROOTS) is fully constructible and reachable within the fixed 2-octave C4-C6 board (MIDI 60-84), proven by a full-catalog sweep walking every target's exact expected taps to zero-wrong-tap completion"
    requirement: BUILD-03
    verification:
      - kind: unit
        ref: "src/lib/practice/construction.test.ts#full-catalog reachability sweep (BUILD-01/02 success criterion)"
        status: pass
    human_judgment: false

duration: 9min
completed: 2026-07-15
status: complete
---

# Phase 12 Plan 03: Build-it Construction Engine Summary

**Pure MIDI/chroma-graded construction engine (construction.ts) deriving ascending, octave-strict chord/scale build targets from the theory engine's own spelling, proven reachable across the full 96-chord + 12-scale catalog on a fixed 2-octave C4-C6 board.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-15T14:20:53Z
- **Completed:** 2026-07-15T14:29:52Z
- **Tasks:** 2 (TDD: RED then GREEN)
- **Files modified:** 2

## Accomplishments
- `construction.ts` exports `createChordConstruction(symbol)` and `createScaleConstruction(tonic)`: both derive an ordered, root-first, own-spelled note sequence (`spellChord`/`majorScaleNotes`) and place it on an ascending 2-octave board via `toAscendingPitches` (the exact algorithm the audio engine already uses), so a Cdim7 build keeps its B♭♭ seventh and every catalog target's placement matches how the app already sounds/plays it.
- Each `ConstructionStep` carries the CONSECUTIVE interval to the previous note (`intervalBetween`, never root-relative), its degree-class role, degree number, and expected MIDI - everything a later UI layer needs to phrase an instruction without re-deriving theory.
- `gradeConstructionTap` grades exclusively by `Note.midi`/`Note.chroma`: an exact MIDI match is `'correct'` (advances position, grows `earnedNotes` in the target's own spelling); a same-chroma-wrong-octave tap is a distinct `'wrong-octave'`; every other tap is `'wrong-pitch-class'` with a signed semitone distance and direction. Every branch is total (never throws) and never mutates the input state in place.
- A full-catalog reachability sweep (a single programmatic test looping `ROOTS x QUALITY_SUFFIXES`, 96 chords, and `MAJOR_SCALE_ROOTS`, 12 scales) proves every real target's steps fit MIDI 60-84 and are walkable to completion with zero wrong taps.
- Zero regressions: the full 857-test suite and `svelte-check` both pass.

## Task Commits

Each task was committed atomically (TDD RED/GREEN cycle, per the plan's `type: tdd` frontmatter):

1. **Task 1: RED - failing tests for the construction engine and the full-catalog reachability sweep** - `5910bb4` (test)
2. **Task 2: GREEN - implement the construction engine** - `f59bb9f` (feat)

_No separate REFACTOR commit was needed: the GREEN commit includes both the implementation and a fix to a bug discovered in the Task 1 test helper (documented below), since both were required to reach a passing, type-clean state._

## Files Created/Modified
- `src/lib/practice/construction.ts` - New pure module: `ConstructionKind`/`ConstructionStep`/`ConstructionState`/`ConstructionTapResult` types, `createChordConstruction`, `createScaleConstruction`, `expectedStep`, `gradeConstructionTap`, `isNotableSpelling`, `CONSTRUCTION_BASE_OCTAVE`
- `src/lib/practice/construction.test.ts` - New unit tests covering every behavior-block case (Cm7 worked example, Cdim7 double-flat enharmonic proof, wrong-pitch-class/wrong-octave grading, wrongTapCount accumulation, terminal states, `isNotableSpelling`, and the full 108-target reachability sweep)

## Decisions Made
- Chord `label` is rebuilt as `chord.root + chord.symbol.slice(chord.root.length)`, the exact idiom `chordPresentation.ts`'s `aliasLine` and `RecallMap.svelte`'s `chordLabel` already use, keeping label rendering consistent with every other chord-glyph surface in the app.
- Scale's 8th (octave-close) note is appended as `{ ...notes[0], role: 'root' }`, matching `placeAscendingScaleKeys`' established precedent for forcing the returning tonic's role, so degree 8 always reads as the root rather than inheriting any other role.
- `gradeConstructionTap`'s done-state and undefined-expectedStep guards echo back the literal same `state` reference (not a copy), while every advancing/incrementing branch returns a fresh object - proven by an explicit "input state unchanged" assertion in the wrong-pitch-class test.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed a test-helper octave-derivation bug in the Task 1 RED test file**
- **Found during:** Task 2 (GREEN implementation), running the full-catalog reachability sweep
- **Issue:** The RED test's `octaveOf(midi)` helper used the naive scientific-pitch formula `Math.floor(midi / 12) - 1` to convert a step's expected MIDI back into a concrete octave for tapping. This round-trips correctly for ordinary letters but NOT for multi-accidental letters that the ascending-voicing algorithm places by bumping an extra full octave (e.g. Dbdim7's C♭♭, which lands at MIDI 70 - octave 5 - but the naive formula computes octave 4, and tapping "Cbb4" resolves to MIDI 58, a mismatch). This caused the full-catalog sweep to fail on a real, plan-required test case, not a bug in construction.ts itself.
- **Fix:** Replaced the formula-based helper with `octaveForTap(letter, midi)`, which searches octaves 0-9 for the one where `Note.midi(letter + octave)` actually reproduces the target's own MIDI, then updated every call site (the ascending walk-through, the enharmonic proof, both wrong-tap tests, and the wrongTapCount accumulation test) to use it. This matches the plan's own allowance ("or by asserting against the step's own letter + a derived octave") since grading itself never depended on which enharmonic spelling produced the tap.
- **Files modified:** `src/lib/practice/construction.test.ts`
- **Verification:** `npx vitest run src/lib/practice/construction.test.ts` - all 15 tests pass, including the full 108-target sweep with zero wrong taps.
- **Committed in:** `f59bb9f` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed Note.midi's null (not undefined) return type**
- **Found during:** Task 2 (GREEN implementation), running `npx tsc --noEmit`
- **Issue:** `construction.ts` checked `tappedMidi === undefined` and `midis.some((midi) => midi === undefined)` to detect unparseable notes, but tonal's `Note.midi` is typed `(note: NoteLiteral) => number | null` - it returns `null`, never `undefined`. TypeScript flagged both comparisons as unreachable (`tappedMidi` possibly `null`, not `undefined`).
- **Fix:** Changed both guards to check `=== null` instead of `=== undefined`.
- **Files modified:** `src/lib/practice/construction.ts`
- **Verification:** `npx tsc --noEmit` reports no errors from `construction.ts` (one pre-existing, unrelated error remains in `pianoKeyboardInspect.test.ts`, out of this plan's scope); `npm run check` (svelte-check) reports 0 errors, 0 warnings.
- **Committed in:** `f59bb9f` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs - one test-helper defect, one type-narrowing defect)
**Impact on plan:** Both necessary to satisfy the plan's own acceptance criteria (the full-catalog sweep passing, and `npm run check`/`tsc --noEmit` reporting no new errors). No scope creep; construction.ts's grading logic and public contract are exactly as specified in the plan's action block.

## Issues Encountered
None beyond the two auto-fixed issues above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `construction.ts`'s full public contract (`createChordConstruction`, `createScaleConstruction`, `expectedStep`, `gradeConstructionTap`, `isNotableSpelling`, `CONSTRUCTION_BASE_OCTAVE`, and all four exported types) is in place and unit-tested for Phase 12's BuildSession plans (12-04/05) to drive their entire construction flow from, and for 12-06 to wire wrong-tap-count outcomes into the FSRS deck.
- The full-catalog reachability sweep gives downstream plans a standing proof that every real chord/scale target the app offers is constructible within the fixed 2-octave board - no per-symbol edge case needs re-verifying.
- No architectural decisions deferred; all `must_haves` (own-spelling, consecutive intervals, MIDI-only grading, one-engine-two-grammars, full-catalog reachability) are met exactly as specified.

---
*Phase: 12-build-it-construction*
*Completed: 2026-07-15*

## Self-Check: PASSED

All created files exist on disk; both task commits (`5910bb4`, `f59bb9f`) confirmed present in `git log --oneline --all`.
