---
phase: 09-deploy-to-the-piano
plan: 01
subsystem: ui
tags: [svelte, resize-observer, keyboard-layout, responsive, vitest]

# Dependency graph
requires:
  - phase: 01-print-shop-foundation-theory-core
    provides: PianoKeyboard.svelte (two-octave fixed layout, interval-colored key assignment, 44px key floor)
provides:
  - "keyboardLayout.ts pure module: octavesForWidth, whiteLettersForOctaves, blackKeysForOctaves, assignNotesToKeys (with one-octave wrap-around branch)"
  - "Responsive PianoKeyboard.svelte: width-derived octave count (1 or 2), octaves prop override, ResizeObserver self-measurement, octave-aware aria-label"
  - "One-octave pitch-class highlight wrapping so overflowing chords still show all interval colors"
  - "Octave-agnostic (letter-based) selection so in-progress picks survive an octave-count change (rotation continuity)"
affects: [09-02, 09-03, 09-04, 09-05, 09-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure layout logic co-located with the component it serves (keyboardLayout.ts next to PianoKeyboard.svelte), unit-tested independently of Svelte rendering"
    - "Width-derived responsive behavior via guarded ResizeObserver with an explicit prop override as the deterministic test seam (octaves?: 1 | 2)"

key-files:
  created:
    - src/lib/components/keyboardLayout.ts
    - src/lib/components/keyboardLayout.test.ts
  modified:
    - src/lib/components/PianoKeyboard.svelte
    - src/lib/components/components.test.ts

key-decisions:
  - "octavesForWidth returns 2 iff availableWidthPx >= 15 * 44 (660px), otherwise 1; 1 is the floor, never 0"
  - "assignNotesToKeys wrap-around branch: when a note has zero candidates at or after the ascending cursor, fall back to the lowest same-pitch-class key in the visible span rather than dropping the note"
  - "PianoKeyboard defaults to 2 octaves when unmeasurable (no ResizeObserver, e.g. jsdom) to keep all pre-existing tests green"
  - "Selection state stays letter-based/octave-agnostic so toggling octaves does not clear in-progress picks (D-03 rotation continuity)"

patterns-established:
  - "octaves?: 1 | 2 prop as the explicit override/test seam for any width-derived Svelte component; self-measurement guarded behind typeof ResizeObserver !== 'undefined'"

requirements-completed: [PLAT-01]

coverage:
  - id: D1
    description: "keyboardLayout.ts pure module: octavesForWidth, whiteLettersForOctaves, blackKeysForOctaves, assignNotesToKeys with one-octave wrap-around, unit-tested"
    requirement: "PLAT-01"
    verification:
      - kind: unit
        ref: "src/lib/components/keyboardLayout.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "PianoKeyboard renders 1 or 2 octaves from width (prop-overridable), 660px min-width removed, 44px key floor kept, octave-aware aria-label, selection survives octave change"
    requirement: "PLAT-01"
    verification:
      - kind: unit
        ref: "src/lib/components/components.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Real phone-width rendering: one octave at >=44px keys with no horizontal overflow, two octaves on wide viewports, wrapped interval-colored highlights, and selection surviving rotation"
    verification:
      - kind: manual_procedural
        ref: "Checkpoint Task 3 how-to-verify steps (npm run dev at ~390px and ~800px+, /drills and / (Lookup))"
        status: pass
    human_judgment: true
    rationale: "Real viewport width, no-overflow rendering, and device-rotation continuity cannot be measured in jsdom; requires a human confirming the actual rendered layout in a browser."

# Metrics
duration: 6min
completed: 2026-07-13
status: complete
---

# Phase 9 Plan 1: Responsive PianoKeyboard Summary

**Width-derived 1-or-2-octave PianoKeyboard replacing the fixed `min-width: 660px` layout, with pitch-class highlight wrapping and octave-agnostic selection so the on-screen keyboard fits and stays usable on a phone.**

## Performance

- **Duration:** 6 min (automated task work; checkpoint pause for human visual verification not counted)
- **Started:** 2026-07-13T21:43:00Z
- **Completed:** 2026-07-13T21:54:42Z
- **Tasks:** 3 (2 automated TDD tasks + 1 human-verify checkpoint)
- **Files modified:** 4

## Accomplishments
- Extracted a pure, DOM-free `keyboardLayout.ts` module (`octavesForWidth`, `whiteLettersForOctaves`, `blackKeysForOctaves`, `assignNotesToKeys`) from PianoKeyboard's inline literals, with a one-octave wrap-around branch so no interval-colored note is ever dropped at one octave.
- Made `PianoKeyboard.svelte` responsive: removed the fixed `min-width: 660px`, kept the 44px per-key touch floor, added a self-measuring `ResizeObserver` (guarded for jsdom) and an explicit `octaves?: 1 | 2` prop override as the deterministic test seam.
- Preserved rotation continuity — selection state is letter-based and octave-agnostic, so in-progress picks survive an octave-count change.
- Verified visually on real phone width (~390px): single octave, keys at/above 44px, no horizontal scroll; ~800px+ shows two octaves unchanged; a high-rooted chord (e.g. Bm7/B7) still shows all four interval colors wrapped into the one-octave span; selection survives a portrait/landscape rotation cycle.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract pure keyboard layout + octave/wrapping logic (RED first)** - `f7ac07c` (test), `6b41092` (feat)
2. **Task 2: Make PianoKeyboard responsive** - `0c72f6a` (test), `c8e1202` (feat)
3. **Task 3: Human verify — responsive keyboard fits the phone** - approved by user, no code commit (verification-only checkpoint)

**Plan metadata:** (this commit)

_Note: TDD tasks produced separate RED (test) and GREEN (feat) commits._

## Files Created/Modified
- `src/lib/components/keyboardLayout.ts` - Pure octave/wrapping logic: `octavesForWidth`, `whiteLettersForOctaves`, `blackKeysForOctaves`, `assignNotesToKeys` (with the wrap-around branch and `KeyCandidate` type)
- `src/lib/components/keyboardLayout.test.ts` - Unit tests covering width thresholds, per-octave array lengths, byte-identical 2-octave assignment, and 1-octave wrap assignment
- `src/lib/components/PianoKeyboard.svelte` - Consumes `keyboardLayout.ts`; adds `octaves?: 1 | 2` prop, guarded `ResizeObserver` self-measurement, octave-aware aria-label; removes `min-width: 660px`, keeps `min-width: 44px`
- `src/lib/components/components.test.ts` - Added `octaves={1}` / `octaves={2}` cases and a rotation-continuity case (selection persists across an octave-count rerender)

## Decisions Made
- `octavesForWidth` threshold is `>= 15 * 44px` (660px) for two octaves, matching the prior fixed layout's implicit width requirement exactly, so the two-octave render stays byte-identical on wide viewports.
- Unmeasurable width (no `ResizeObserver`, e.g. jsdom) defaults to 2 octaves specifically to keep every pre-existing PianoKeyboard test green without modification.
- Wrap-around fallback picks the lowest same-pitch-class key in the visible span rather than the nearest one, keeping the algorithm simple and deterministic (four distinct pitch classes always resolve to four distinct keys at one octave).

## Deviations from Plan

None - plan executed exactly as written. One in-flight test-authoring correction occurred during Task 1 (RED phase): the initial failing test asserted the wrong `keyIndex` for Cm7's seventh in the 2-octave case; this was a test-authoring error caught before GREEN, not a deviation from the plan's behavior spec, and was corrected within the same RED commit's follow-up before the GREEN implementation commit (visible in `6b41092`'s commit message).

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Every page rendering `PianoKeyboard` (Lookup, Drills, feedback reveal) now inherits phone-width fitness and highlight wrapping for free, since the fix lives in the single shared component.
- `keyboardLayout.ts`'s pure functions are directly reusable by remaining Phase 9 plans (09-02 through 09-06) for any further responsive work without re-deriving octave/wrap logic.
- No blockers. PLAT-02 (Oracle-server HTTPS deployment) remains explicitly deferred to the user per the phase's Scope Boundary — not claimed by this or any Phase 9 plan.

---
*Phase: 09-deploy-to-the-piano*
*Completed: 2026-07-13*

## Self-Check: PASSED

All 4 created/modified source files and the SUMMARY.md file exist on disk; all 4 task commit hashes (f7ac07c, 6b41092, 0c72f6a, c8e1202) verified present in git log.
