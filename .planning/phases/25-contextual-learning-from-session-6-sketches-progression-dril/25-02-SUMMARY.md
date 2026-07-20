---
phase: 25-contextual-learning-from-session-6-sketches-progression-dril
plan: 02
subsystem: theory
tags: [tdd, fsrs, voicings, chord-theory]

# Dependency graph
requires:
  - phase: 25-01
    provides: session-6 sketch context and phase scaffolding
provides:
  - Pure shell/rootless/full-stack voicing derivation from spellChord's role-tagged SpelledNote[]
  - Droppable-note markers (root='R', fifth='5') for the 019 subtraction-stage ghost-hatch treatment
  - voicingStageForChord mapping a chord's CardRecord[] maturity to meet/subtract/drill
  - seventhChordSymbols deriving the maj7/m7/dom7/m7b5/dim7 chord-formula family from the shared fact catalog
affects: [25-03, 25-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Voicing-stage derivation reads only CardRecord.state (FSRS maturity signal), never a live Dexie read — caller-supplied CardRecord[] keeps the module pure"
    - "Total note-filter functions: shellNotes/rootlessNotes/fullStackNotes filter chord.notes by IntervalRole, returning fewer entries rather than throwing on triads/unrecognized chords"

key-files:
  created:
    - src/lib/practice/shellVoicing.ts
    - src/lib/practice/shellVoicing.test.ts
  modified: []

key-decisions:
  - "voicingStageForChord treats 'drill' as winning over 'subtract'/'meet' even in a mixed-maturity card set — the most-advanced card determines how much scaffolding is still owed, matching the sketch-019 'help staged by learner maturity' framing"
  - "seventhChordSymbols derives its symbol list from the shared facts.ts catalog (D-06 lineage) rather than re-deriving its own root x quality matrix, so it always mirrors the same chord space the deck seeds cards from"

patterns-established:
  - "Pattern: any new practice-engine module deriving from spellChord's SpelledNote[] should filter by IntervalRole rather than re-deriving note lists from tonal directly, keeping spellChord the single note-derivation seam"

requirements-completed: [SK-019]

coverage:
  - id: D1
    description: "shellNotes/rootlessNotes/fullStackNotes derive the three sketch-019 note sets from a spelled chord, total (never throw on a triad)"
    requirement: "SK-019"
    verification:
      - kind: unit
        ref: "src/lib/practice/shellVoicing.test.ts#shellNotes returns the third + seventh only, in ascending role order, for Cm7 (2 entries)"
        status: pass
      - kind: unit
        ref: "src/lib/practice/shellVoicing.test.ts#shellNotes is total: a plain triad with no seventh returns only the guide tones available, without throwing"
        status: pass
      - kind: unit
        ref: "src/lib/practice/shellVoicing.test.ts#rootlessNotes drops the root, keeping third + fifth + seventh for Cmaj7 (3 entries)"
        status: pass
      - kind: unit
        ref: "src/lib/practice/shellVoicing.test.ts#fullStackNotes returns all four role notes root/third/fifth/seventh in order for Cm7"
        status: pass
    human_judgment: false
  - id: D2
    description: "optionalMarkers flags root ('R') and fifth ('5') as the droppable notes for the subtraction-stage ghost-hatch"
    requirement: "SK-019"
    verification:
      - kind: unit
        ref: "src/lib/practice/shellVoicing.test.ts#optionalMarkers marks the root R and the fifth 5 for Cm7 (2 entries)"
        status: pass
    human_judgment: false
  - id: D3
    description: "voicingStageForChord maps a chord's card maturity to meet/subtract/drill per the sketch-019 staging contract"
    requirement: "SK-019"
    verification:
      - kind: unit
        ref: "src/lib/practice/shellVoicing.test.ts#voicingStageForChord returns 'meet' for an empty card set"
        status: pass
      - kind: unit
        ref: "src/lib/practice/shellVoicing.test.ts#voicingStageForChord returns 'meet' when every card is State.New"
        status: pass
      - kind: unit
        ref: "src/lib/practice/shellVoicing.test.ts#voicingStageForChord returns 'drill' when any card is State.Review"
        status: pass
      - kind: unit
        ref: "src/lib/practice/shellVoicing.test.ts#voicingStageForChord returns 'drill' even amid a mix of Learning and Review"
        status: pass
      - kind: unit
        ref: "src/lib/practice/shellVoicing.test.ts#voicingStageForChord returns 'subtract' when a card has advanced past New (e.g. Learning) but none is Review yet"
        status: pass
    human_judgment: false
  - id: D4
    description: "seventhChordSymbols() returns only the chord-formula symbols with a seventh, excluding plain triads"
    requirement: "SK-019"
    verification:
      - kind: unit
        ref: "src/lib/practice/shellVoicing.test.ts#seventhChordSymbols returns only chord-formula symbols spellChord recognizes as having a seventh"
        status: pass
      - kind: unit
        ref: "src/lib/practice/shellVoicing.test.ts#seventhChordSymbols excludes plain triads (e.g. C, Cm, Cdim never appear)"
        status: pass
      - kind: unit
        ref: "src/lib/practice/shellVoicing.test.ts#seventhChordSymbols includes representative seventh-family symbols"
        status: pass
    human_judgment: false

# Metrics
duration: 5min
completed: 2026-07-20
status: complete
---

# Phase 25 Plan 02: Shell Voicing + FSRS Staging Engine Summary

**Pure voicing-derivation module (`shellVoicing.ts`) that computes shell/rootless/full-stack note sets and root+fifth ghost-hatch markers from a spelled chord, and maps a chord's FSRS card maturity to the sketch-019 meet/subtract/drill pedagogy stages.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-20T22:22:31Z
- **Completed:** 2026-07-20T22:27:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `shellNotes`/`rootlessNotes`/`fullStackNotes` derive the three sketch-019 note sets (guide-tone shell, rootless, full 4-note stack) directly from `spellChord`'s role-tagged `SpelledNote[]`, total on triads/unrecognized chords
- `optionalMarkers` flags root ('R') and fifth ('5') as the droppable notes the 019 subtraction stage drains to ghost-hatch
- `voicingStageForChord` maps a chord's `CardRecord[]` FSRS maturity to `'meet' | 'subtract' | 'drill'`, with drill winning over subtract/meet in any mixed-maturity set
- `seventhChordSymbols` derives the maj7/m7/dom7/m7b5/dim7 chord-formula symbol family from the shared fact catalog, excluding plain triads
- 13-test TDD suite (RED then GREEN), zero writes to the deck, module verified free of svelte/$app/dexie/localStorage imports

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — shell voicing + staging test suite** - `0625130` (test)
2. **Task 2: GREEN — implement the pure voicing + staging engine** - `1c927ac` (feat)

**Plan metadata:** (pending — this commit)

## Files Created/Modified
- `src/lib/practice/shellVoicing.ts` - Pure voicing derivation + FSRS-maturity staging engine (6 exports: `shellNotes`, `rootlessNotes`, `fullStackNotes`, `optionalMarkers`, `voicingStageForChord`, `seventhChordSymbols`, plus the `VoicingStage`/`OptionalMarker` types)
- `src/lib/practice/shellVoicing.test.ts` - 13-test TDD suite pinning the full public API and staging contract

## Decisions Made
- `voicingStageForChord` checks for `State.Review` first (drill wins), then falls back to `'meet'` only when every card is `State.New` or the set is empty, otherwise `'subtract'` — matches the plan's exact truth table without needing a priority-ordering table.
- `rootlessNotes` is implemented as "every role except root" (not hardcoded to third/fifth/seventh) so it stays correct if a future 9th/11th/13th extension role ever needs to appear in a rootless voicing.
- `optionalMarkers` walks `chord.notes` twice (once for root, once for fifth) rather than a single filter+sort, guaranteeing the R-then-5 output order regardless of tonal's internal note ordering.

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

RED gate confirmed: `test(25-02): add failing shell-voicing suite` (`0625130`) committed before any implementation existed; suite failed at import resolution (`Failed to resolve import "./shellVoicing"`).
GREEN gate confirmed: `feat(25-02): implement shell-voicing + FSRS staging engine` (`1c927ac`) committed after all 13 tests passed.
No REFACTOR commit was needed — the GREEN implementation required no cleanup pass.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `shellVoicing.ts`'s note-derivation and staging exports are ready for Plan 25-07 (the thin presentation component) and Plan 25-03 (ghost-hatch keyboard treatment consuming `optionalMarkers`).
- Full suite green: 1387 tests / 97 files pass after this plan; `npm run check` clean (1342 files, 0 errors, 0 warnings).
- No blockers for downstream plans in this phase.

## Self-Check: PASSED

- FOUND: src/lib/practice/shellVoicing.ts
- FOUND: src/lib/practice/shellVoicing.test.ts
- FOUND: 0625130 (test(25-02): add failing shell-voicing suite)
- FOUND: 1c927ac (feat(25-02): implement shell-voicing + FSRS staging engine)

---
*Phase: 25-contextual-learning-from-session-6-sketches-progression-dril*
*Completed: 2026-07-20*
