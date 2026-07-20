---
phase: 25-contextual-learning-from-session-6-sketches-progression-dril
plan: 01
subsystem: theory
tags: [tonal, progression-engine, tdd, chord-theory]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: spellChord (Chord.get canonicalization), transposeFrom (interval transposition), MAJOR_SCALE_ROOTS
provides:
  - Pure progression-template engine (buildProgression, nameChoices, randomProgression)
  - 3 roman-numeral templates (major-ii-V-I, major-turnaround-I-vi-ii-V, minor-ii-V-i) keyable to any of 12 tonics
affects: [25-05 (progression drill UI component, thin presentation over this engine)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Progression bar symbols are never hand-rolled strings: derived by transposing the key tonic through a per-degree interval via interval.ts's transposeFrom, then validated with spellChord before being surfaced"
    - "Same-key MC distractors drawn from a computed diatonic-seventh pool (major-scale degree->quality table), not a random out-of-key draw"

key-files:
  created: [src/lib/practice/progressions.ts, src/lib/practice/progressions.test.ts]
  modified: []

key-decisions:
  - "nameChoices always computes the same-key diatonic-seventh pool using major-scale degree intervals/qualities regardless of the bar's own template mode, since PROGRESSION_KEYS is a flat 12-tonic set with no separate minor-key list; the correct bar.symbol is always included even when it isn't literally one of that pool's 7 entries (true for major-mode bars, not always for the minor V bar's dominant-7 quality)"
  - "Minor-mode templates key off natural-minor degree intervals (1P,2M,3m,4P,5P,6m,7m) for the bar's root note only; the roman numeral's own chord quality (m7b5, dominant 7, m7) comes from the template's quality field, not from natural minor's own diatonic quality at that degree - this is what makes iiø/V7/i work as real jazz minor ii-V-i rather than a naive natural-minor triad set"

patterns-established:
  - "Progression templates: ProgressionTemplate { id, mode, degrees: {roman, degree, quality, functionLabel}[] } is the extension point for future templates (e.g. iii-vi-ii-V, or a 12-bar blues shape) - just add an entry to PROGRESSION_TEMPLATES"

requirements-completed: [SK-017]

coverage:
  - id: D1
    description: "buildProgression produces correct roman/symbol/function-label bars for major-ii-V-I and minor-ii-V-i on tested keys (B♭, C, A)"
    requirement: "SK-017"
    verification:
      - kind: unit
        ref: "src/lib/practice/progressions.test.ts#buildProgression"
        status: pass
    human_judgment: false
  - id: D2
    description: "nameChoices returns 4 distinct same-key diatonic distractors including the correct symbol, deterministic under seeded Math.random"
    requirement: "SK-017"
    verification:
      - kind: unit
        ref: "src/lib/practice/progressions.test.ts#nameChoices"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every bar symbol across every template x key is recognized by spellChord (full-coverage reachability)"
    requirement: "SK-017"
    verification:
      - kind: unit
        ref: "src/lib/practice/progressions.test.ts#reachability"
        status: pass
    human_judgment: false
  - id: D4
    description: "randomProgression draws a valid templateId/key and its bars match buildProgression"
    requirement: "SK-017"
    verification:
      - kind: unit
        ref: "src/lib/practice/progressions.test.ts#randomProgression"
        status: pass
    human_judgment: false

# Metrics
duration: 25min
completed: 2026-07-20
status: complete
---

# Phase 25 Plan 01: Progression Engine Summary

**Pure roman-numeral progression engine (ii-V-I, I-vi-ii-V, minor ii-V-i) that derives every bar's chord symbol by tonal-backed transposition, never a hand-rolled string, feeding sketch-017's earn-the-symbol lead-sheet drill.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-20T22:14:00Z
- **Completed:** 2026-07-20T22:39:00Z
- **Tasks:** 2 (TDD RED/GREEN)
- **Files modified:** 2

## Accomplishments
- `buildProgression(templateId, key)` resolves 3 roman-numeral templates keyed to any of the 12 vetted tonics, producing ordered bars with correct symbols and harmonic-function labels
- `nameChoices(bar, key)` produces 4 distinct, same-key, diatonic-seventh multiple-choice options (always includes the correct symbol), shuffled via the codebase's existing Fisher-Yates convention
- `randomProgression()` draws a random template+key pair for "surprise me"-style entry into the drill
- Full-coverage reachability test: every symbol produced across all 3 templates x 12 keys is recognized by the real `spellChord` (no mocks)

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — progression engine test suite** - `da5c70b` (test)
2. **Task 2: GREEN — implement the pure progression engine** - `3472054` (feat)

**Plan metadata:** (this commit)

_Note: TDD RED passed on `Cannot find module` import failure as expected; GREEN passed all 7 tests on first implementation attempt, no REFACTOR commit needed._

## Files Created/Modified
- `src/lib/practice/progressions.ts` - Pure progression engine: types (`RomanFunction`, `ProgressionBar`, `ProgressionTemplate`), data (`PROGRESSION_TEMPLATES`, `PROGRESSION_KEYS`), functions (`buildProgression`, `nameChoices`, `randomProgression`)
- `src/lib/practice/progressions.test.ts` - TDD suite: 7 tests covering all 6 planned behaviors (roman order/symbols/function-labels for major and minor templates, nameChoices diatonic-distractor contract + determinism, full reachability, randomProgression contract)

## Decisions Made
- See `key-decisions` in frontmatter: nameChoices always computes the major-scale diatonic-seventh pool regardless of template mode (since `PROGRESSION_KEYS` has no separate major/minor key lists); minor-mode templates use natural-minor degree intervals only for root-note placement, with the roman numeral's chord quality coming from the template's own `quality` field.

## Deviations from Plan

None - plan executed exactly as written. GREEN implementation passed all tests on the first attempt (no debug/iterate cycle needed), so no Rule 1-3 auto-fixes were triggered.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `src/lib/practice/progressions.ts`'s public API (`buildProgression`, `nameChoices`, `randomProgression`, `PROGRESSION_TEMPLATES`, `PROGRESSION_KEYS`, and the `ProgressionBar`/`ProgressionTemplate`/`RomanFunction` types) is stable and ready for 25-05's progression-drill UI component to consume as a thin presentation layer.
- No blockers. `npm run check` clean (0 errors), full suite green (1374/1374 tests, up from the pre-plan baseline).

---
*Phase: 25-contextual-learning-from-session-6-sketches-progression-dril*
*Completed: 2026-07-20*

## Self-Check: PASSED
- FOUND: src/lib/practice/progressions.ts
- FOUND: src/lib/practice/progressions.test.ts
- FOUND: da5c70b (test commit)
- FOUND: 3472054 (feat commit)
