---
phase: 11-memorization-engine
plan: 02
subsystem: srs
tags: [tonal, ts-fsrs, spaced-repetition, vitest]

requires:
  - phase: 01-foundation
    provides: spellChord, randomChord (ROOTS/QUALITY_SUFFIXES), interval.ts (DRILL_INTERVALS), scale.ts (MAJOR_SCALE_ROOTS/majorScaleNotes)
  - phase: 11-memorization-engine
    provides: 11-01 scheduler.ts (ts-fsrs wrapper, Card/Rating/State re-exports)
provides:
  - "src/lib/srs/facts.ts: pure 192-entry fact catalog (Fact union, allFacts(), factById()), generated entirely from the existing theory engine"
affects: [11-03-deck, 11-05-recall-session, 11-06-recall-map]

tech-stack:
  added: []
  patterns:
    - "Fact catalog as a module-level constant built once from theory-engine exports, with a Map-backed factById lookup"
    - "Facts are thin identity references only (symbol / short / tonic+degree) — never denormalized note/interval data, so downstream consumers re-derive prompt/reveal content via spellChord/intervalFromShort/majorScaleNotes"

key-files:
  created:
    - src/lib/srs/facts.ts
    - src/lib/srs/facts.test.ts
  modified: []

key-decisions:
  - "Chord-formula factId uses the original ASCII symbol (e.g. 'chord-formula:F#m7'), not spellChord's re-derived display-glyph symbol, so factIds stay stable and match the ROOTS/QUALITY_SUFFIXES ASCII spelling exactly"
  - "Catalog and factById Map are built once at module load (computed eagerly, not per-call), since generation is pure and cheap for 192 entries"

patterns-established:
  - "Deterministic allFacts() order: chord-formula, then interval-size, then scale-degree — downstream consumers (deck.ts, recall map) can rely on stable ordering"

requirements-completed: [MEM-01]

coverage:
  - id: D1
    description: "allFacts() returns exactly 192 facts (96 chord-formula, 12 interval-size, 84 scale-degree), all generated from the existing theory engine, with unique factIds"
    requirement: "MEM-01"
    verification:
      - kind: unit
        ref: "src/lib/srs/facts.test.ts#allFacts returns exactly 192 facts"
        status: pass
      - kind: unit
        ref: "src/lib/srs/facts.test.ts#has exactly 96 chord-formula, 12 interval-size, and 84 scale-degree facts"
        status: pass
      - kind: unit
        ref: "src/lib/srs/facts.test.ts#every factId is unique across the full catalog"
        status: pass
      - kind: unit
        ref: "src/lib/srs/facts.test.ts#every chord-formula fact symbol is recognized by spellChord"
        status: pass
    human_judgment: false
  - id: D2
    description: "factById is a total lookup (round-trips a sample fact from each kind, returns undefined for unknown ids, never throws)"
    requirement: "MEM-01"
    verification:
      - kind: unit
        ref: "src/lib/srs/facts.test.ts#factById round-trips a sample fact from each kind"
        status: pass
      - kind: unit
        ref: "src/lib/srs/facts.test.ts#factById returns undefined for an unknown factId, never throws"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-07-15
status: complete
---

# Phase 11 Plan 02: Fact Catalog Summary

**Pure 192-entry fact catalog (`src/lib/srs/facts.ts`) generated entirely from the existing theory engine's ROOTS/QUALITY_SUFFIXES, DRILL_INTERVALS, and MAJOR_SCALE_ROOTS, with stable unique factIds ready to key FSRS cards.**

## Performance

- **Duration:** 15 min
- **Tasks:** 2 completed (TDD RED/GREEN)
- **Files modified:** 2 (both new)

## Accomplishments

- `src/lib/srs/facts.ts`: exports `FactKind`, `ChordFormulaFact`/`IntervalSizeFact`/`ScaleDegreeFact`/`Fact`, `allFacts()`, and `factById()`
- 96 chord-formula facts built from `randomChord.ts`'s `ROOTS` x `QUALITY_SUFFIXES` matrix, each `symbol` verified recognized by `spellChord`
- 12 interval-size facts built from `interval.ts`'s `DRILL_INTERVALS`
- 84 scale-degree facts built from `scale.ts`'s `MAJOR_SCALE_ROOTS` x degrees 1..7
- Full Vitest suite (13 tests) covering count, kind breakdown, uniqueness, symbol recognition, specific factId examples, and total-function `factById` round-trip/miss behavior

## Task Commits

Each task was committed atomically (TDD RED/GREEN cycle):

1. **Task 1: RED — failing unit tests for the fact catalog** - `90676cf` (test)
2. **Task 2: GREEN — implement the fact catalog** - `f08b9ca` (feat)

## Files Created/Modified

- `src/lib/srs/facts.ts` - Pure fact-catalog module: `allFacts()`/`factById()` built from the theory engine
- `src/lib/srs/facts.test.ts` - Vitest suite encoding the full behavior spec (192 facts, kind counts, uniqueness, factId examples, round-trip lookup)

## Decisions Made

- ChordFormulaFact.symbol and its factId use the original ASCII string built from `ROOTS`/`QUALITY_SUFFIXES` (e.g. `F#m7`), not spellChord's re-derived display-glyph symbol — keeps factIds byte-stable and matching the plan's literal examples (`chord-formula:Cm7`, `chord-formula:F#m7`)
- Catalog and the `factById` Map are computed once at module load time (not per-call) since the 192-entry generation is pure and cheap; no memoization complexity needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Confirmed the RED test failed solely on the missing module (`Failed to resolve import "./facts"`), then GREEN turned all 13 tests green with no iteration needed. A pre-existing, unrelated `tsc --noEmit` error in `src/lib/components/pianoKeyboardInspect.test.ts` was checked and confirmed present before this plan's changes (out of scope per the deviation-rules scope boundary).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `allFacts()`/`factById()` are ready for 11-03 (deck.ts) to seed not-yet-introduced cards, and for 11-05 (RecallSession)/11-06 (RecallMap) to re-derive prompt/reveal content via `spellChord`/`intervalFromShort`/`transposeFrom`/`majorScaleNotes`
- No blockers. Module is pure (no DOM/Svelte/Dexie), matching the D-03 module-split convention alongside `scheduler.ts`

---
*Phase: 11-memorization-engine*
*Completed: 2026-07-15*

## Self-Check: PASSED

- FOUND: src/lib/srs/facts.ts
- FOUND: src/lib/srs/facts.test.ts
- FOUND: 90676cf (test commit)
- FOUND: f08b9ca (feat commit)
