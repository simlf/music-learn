---
phase: 16-hear-the-chord
plan: 03
subsystem: ui
tags: [svelte, animation, css-keyframes]

requires:
  - phase: 16-hear-the-chord (plan 01)
    provides: "Shared app.css pulse-once/stamp-in keyframes and combined first-reveal rule"
provides:
  - "ChordGlyph.svelte stamped and pulseToken opt-in props for the BUILD reveal's serif house-reference"
affects: [16-hear-the-chord plan 05]

tech-stack:
  added: []
  patterns:
    - "ChordGlyph pulseToken retrigger mirrors PianoKeyboard's off-then-on setTimeout(0)/setTimeout(200) idiom (Plan 16-02), not a {#key} remount"

key-files:
  created:
    - src/lib/components/chordGlyph.test.ts
  modified:
    - src/lib/components/ChordGlyph.svelte

key-decisions:
  - "pulseToken retrigger reuses PianoKeyboard's exact off/on timer pattern (0ms then 200ms) for consistency across the two components sharing the same app.css keyframes"

patterns-established:
  - "Presentational components that need a one-shot retriggerable animation follow the pulsing $state flag + cleared setTimeout pair keyed on a bumped numeric token prop, not a {#key} remount"

requirements-completed: [HEAR-01]

coverage:
  - id: D1
    description: "ChordGlyph gains stamped?: boolean prop that adds chord-glyph--stamped entrance class when true, and leaves the glyph static when omitted"
    requirement: HEAR-01
    verification:
      - kind: unit
        ref: "src/lib/components/chordGlyph.test.ts#adds chord-glyph--stamped when stamped is passed"
        status: pass
      - kind: unit
        ref: "src/lib/components/chordGlyph.test.ts#renders the current markup unchanged when no new props are passed"
        status: pass
    human_judgment: false
  - id: D2
    description: "ChordGlyph gains pulseToken?: number prop that applies pulse-once on each new bump while mounted, using the shared app.css keyframe (no component-local @keyframes)"
    requirement: HEAR-01
    verification:
      - kind: unit
        ref: "src/lib/components/chordGlyph.test.ts#applies pulse-once when pulseToken is set, and re-applies it on a new bump while mounted"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-16
status: complete
---

# Phase 16 Plan 03: ChordGlyph Animation Props Summary

**Added opt-in `stamped` and `pulseToken` props to `ChordGlyph.svelte`, reusing Plan 16-01's shared `app.css` keyframes with zero component-local CSS, so the presentational glyph can serve as the pulsing serif house-reference on the BUILD reveal (D-01) while the existing picker-state glyph stays byte-identical.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-16T20:19:00Z
- **Completed:** 2026-07-16T20:22:06Z
- **Tasks:** 1 completed (TDD: RED, GREEN; no REFACTOR needed)
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- `ChordGlyph.svelte` now exposes `stamped?: boolean` (adds `chord-glyph--stamped`) and `pulseToken?: number` (retriggers `.pulse-once` on every new bump while mounted), both opt-in so the existing `BuildSession.svelte:623` picker-state glyph renders unchanged.
- Retrigger logic mirrors `PianoKeyboard.svelte`'s Plan 16-02 pulseToken idiom exactly: a `pulsing` `$state` flag flipped off then on via a cleared `setTimeout(0)`/`setTimeout(200)` pair, so the browser genuinely restarts the shared keyframe animation on each bump instead of a no-op class re-application.
- No `@keyframes` added to the component; both classes bind to the shared `stamp-in`/`pulse-once` definitions and the combined first-reveal rule already added to `app.css` by Plan 16-01.
- New `chordGlyph.test.ts` covers all three plan-specified behaviors: byte-identical baseline render, `stamped` class toggle, and `pulseToken` apply/re-apply while mounted.

## Task Commits

Each task was committed atomically (TDD RED/GREEN cycle):

1. **Task 1 (RED): add failing test for ChordGlyph stamped/pulseToken** - `b403ec6` (test)
2. **Task 1 (GREEN): add stamped + pulseToken animation props to ChordGlyph** - `f08fb5a` (feat)

No REFACTOR commit was needed; the GREEN implementation was already clean (mirrors an established pattern verbatim).

**Plan metadata:** committed as part of this summary (see Final Commit below).

## Files Created/Modified

- `src/lib/components/ChordGlyph.svelte` - Added `stamped`/`pulseToken` props, the pulseToken retrigger effect, and the `stampedClass`/`pulseClass` template bindings on the outer `.chord-glyph` span.
- `src/lib/components/chordGlyph.test.ts` - New component test: baseline render, stamped toggle, pulseToken apply/re-apply.

## Decisions Made

- Reused `PianoKeyboard.svelte`'s exact pulseToken retrigger timer shape (off/on via cleared `setTimeout(0)`/`setTimeout(200)`) rather than a `{#key pulseToken}` wrapper, per the plan's explicit instruction to mirror the Plan 16-02 idiom for consistency across both components sharing the same app.css keyframes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## TDD Gate Compliance

RED gate (`test(16-03): add failing test for ChordGlyph stamped/pulseToken props`, `b403ec6`) confirmed 2 of 3 tests failing before implementation (the byte-identical baseline test passed as expected, since it exercises unchanged default behavior). GREEN gate (`feat(16-03): add stamped + pulseToken animation props to ChordGlyph`, `f08fb5a`) brought all 3 tests to green. No REFACTOR commit needed.

## Next Phase Readiness

`ChordGlyph` is ready for Plan 05 to render it in the BUILD `complete` block with `stamped` and a bumped `pulseToken` synced to the chord-strike audio tick, per D-01/D-02/D-03 in `16-CONTEXT.md`. Full project test suite (74 files, 1024 tests) passes with this change in place.

---
*Phase: 16-hear-the-chord*
*Completed: 2026-07-16*

## Self-Check: PASSED

All created/modified files and task commit hashes verified present on disk and in git history.
