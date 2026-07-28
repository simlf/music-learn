---
phase: 35-inversions-new-drill-family
plan: 02
subsystem: ui
tags: [svelte, chordPresentation, PianoKeyboard, CountingChipRow, inversions]

# Dependency graph
requires:
  - phase: 35-inversions-new-drill-family (plan 01)
    provides: pure inversion engine (inversions.ts, matchInversion.ts)
provides:
  - "stackedThirdsFor(chord, startRole?) rotation param"
  - "CountingChipRow rotateFromRole prop"
  - "PianoKeyboard bassHint prop + .piano-keyboard__key--bass-ring CSS"
affects: [35-03 (InversionDrill.svelte), inversion hint ladder]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive/gated display props: new prop omitted -> byte-identical render (mirrors ghostKeys/pendingKeys convention)"
    - "bassHint is the one deliberate exception to the !role gating convention -- documented inline at every call site"

key-files:
  created:
    - src/lib/components/pianoKeyboard.bassHint.test.ts
  modified:
    - src/lib/lookup/chordPresentation.ts
    - src/lib/lookup/chordPresentation.test.ts
    - src/lib/components/CountingChipRow.svelte
    - src/lib/components/CountingChipRow.test.ts
    - src/lib/components/PianoKeyboard.svelte

key-decisions:
  - "stackedThirdsFor owns rotation (not CountingChipRow locally): one source of truth for both formulaFor's tone labels and the intervalBetween gap loop"
  - "bassHint is NOT gated on !role (deliberate deviation from ghostKeys/pendingKeys/selectedClass convention), per UI-SPEC section 3"
  - "Rotated non-third gaps reuse the existing .gap-chip.other neutral state -- no new visual state added"

patterns-established:
  - "IntervalRole-based rotation of a chord's notes array, with graceful fallback to unrotated order when no note carries the requested role"

requirements-completed: [INV-01, INV-02]

coverage:
  - id: D1
    description: "stackedThirdsFor(chord, startRole) rotates tones/gaps to start at startRole, recomputing gaps via the existing intervalBetween loop; omitted startRole is byte-identical"
    requirement: "INV-02"
    verification:
      - kind: unit
        ref: "src/lib/lookup/chordPresentation.test.ts#stackedThirdsFor: startRole rotation (Phase 35, INV-02)"
        status: pass
    human_judgment: false
  - id: D2
    description: "CountingChipRow rotateFromRole prop reorders tone chips from the bass while role tints stay fixed; omitted prop unchanged"
    requirement: "INV-02"
    verification:
      - kind: unit
        ref: "src/lib/components/CountingChipRow.test.ts#CountingChipRow: rotateFromRole (Phase 35, INV-02)"
        status: pass
    human_judgment: false
  - id: D3
    description: "PianoKeyboard bassHint prop renders an ink ring + B badge matched by chroma+octave, layered on top of a role fill (not gated on !role); omitted prop is byte-identical"
    requirement: "INV-01"
    verification:
      - kind: unit
        ref: "src/lib/components/pianoKeyboard.bassHint.test.ts#PianoKeyboard bass emphasis (bassHint, Phase 35 INV-01)"
        status: pass
    human_judgment: false

# Metrics
duration: 20min
completed: 2026-07-27
status: complete
---

# Phase 35 Plan 02: Shared Display Primitives for Inversions Summary

**Additive `startRole`/`rotateFromRole`/`bassHint` props on `stackedThirdsFor`, `CountingChipRow`, and `PianoKeyboard` give the inversion drill a rotated stack-order row and a chroma-matched bass ring, with zero change to any existing caller's render.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-07-27
- **Tasks:** 2
- **Files modified:** 5 modified, 1 created

## Accomplishments
- `stackedThirdsFor` gained an optional `startRole?: IntervalRole` param that rotates the tone/gap row to lead with a given role, reusing the existing `intervalBetween` gap-derivation loop (no hand-rolled semitone math); a rotated Cm7 from the fifth surfaces a genuine non-third gap (+M2) mid-row.
- `CountingChipRow` gained a `rotateFromRole` prop delegating straight to `stackedThirdsFor` (one source of truth); non-third gaps from rotation fall into the already-shipped `.gap-chip.other` neutral treatment.
- `PianoKeyboard` gained a `bassHint` prop (chroma+octave matched, like `ghostKeys`) rendering an ink ring + "B" badge — deliberately NOT gated on `!role`, so it layers on top of an existing role fill, ghost hatch, or plain key.

## Task Commits

Each task was committed atomically:

1. **Task 1: startRole rotation on stackedThirdsFor + CountingChipRow rotateFromRole prop** - `78fab9a` (feat)
2. **Task 2: PianoKeyboard bassHint prop (ink ring + "B" badge, chroma+octave matched, NOT role-gated)** - `3020633` (feat)

_Note: both tasks were TDD-flagged; tests were authored alongside the implementation in the same commit per this project's existing per-task commit granularity (no separate RED-only commit was created for either task)._

## Files Created/Modified
- `src/lib/lookup/chordPresentation.ts` - `stackedThirdsFor` gains `startRole?: IntervalRole` param + `rotateNotesToRole` helper
- `src/lib/lookup/chordPresentation.test.ts` - rotation test cases (byte-identical omission, rotated tones/gaps, no-op root rotation, fallback when role absent)
- `src/lib/components/CountingChipRow.svelte` - `rotateFromRole?: IntervalRole` prop, delegates to `stackedThirdsFor`
- `src/lib/components/CountingChipRow.test.ts` - byte-identical omission test + rotated render test + rotated non-third-gap "other" state test
- `src/lib/components/PianoKeyboard.svelte` - `bassHint?: { letter: string; octave: number } | null` prop, `bassHintEntryFor`/`bassHintClass`/`bassBadge` helpers, wired into both white/black key templates, `.piano-keyboard__key--bass-ring` CSS
- `src/lib/components/pianoKeyboard.bassHint.test.ts` (new) - omission, role-fill-layering, enharmonic chroma match, octave-specificity, plain-keyboard, and explicit-`null` cases

## Decisions Made
- Rotation logic lives in `stackedThirdsFor` (chordPresentation.ts), not duplicated locally in `CountingChipRow.svelte`, per the plan's explicit "one source of truth" instruction.
- `bassHintClass` intentionally omits the `!role` guard every other gated `PianoKeyboard` prop (`ghostClass`, `selectedClass`, `pendingClass`) uses — this is the one documented deviation from that convention, per 35-UI-SPEC section 3 and 35-PATTERNS.md.
- `rotateNotesToRole` falls back to the unrotated array both when no note carries the requested role (e.g. `'seventh'` on a triad) and when the requested role already leads (index 0) — both are no-ops that keep `stackedThirdsFor(chord, role)` safely idempotent with `stackedThirdsFor(chord)`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three primitives (`stackedThirdsFor` rotation, `CountingChipRow.rotateFromRole`, `PianoKeyboard.bassHint`) are ready for `InversionDrill.svelte` (35-03) to consume for its hint ladder's `bass` and `stack` rungs and its live-keyboard bass ring.
- `npm run check` is clean (0 errors) and the full existing test suite (111 files, 1570 tests) passes, confirming REG-01 (byte-identical existing renders) held.

---
*Phase: 35-inversions-new-drill-family*
*Completed: 2026-07-27*

## Self-Check: PASSED

All created/modified files verified present on disk; both task commits (`78fab9a`, `3020633`) verified present in git log.
