---
phase: 12-build-it-construction
plan: 02
subsystem: ui
tags: [svelte, piano-keyboard, gated-props, tdd]

# Dependency graph
requires:
  - phase: 09-deploy-to-the-piano
    provides: PianoKeyboard.svelte's existing interactive/inspectable gated-prop contract and octave-count math this plan extends
  - phase: 12-build-it-construction (12-01)
    provides: theory phraseStep + scale-formula factId + deck.ts formula-build mode this phase's construction engine will feed
provides:
  - PianoKeyboard.svelte constructable/onConstructTap/flashWrongKey props, a third gated tap-driven mode
  - Non-regression proof (10-case unit suite + full 842-test repo suite) that existing display/interactive/inspectable/placement rendering is byte-identical when the new props are omitted
affects: [12-03, 12-04, 12-05, build-it-construction BuildSession]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Third gated-prop mode on a shared component (constructable, sibling to interactive/inspectable), same subordinate-precedence chain pattern as inspecting"
    - "Octave-specific transient flash class kept as a fully separate prop/helper from the existing letter-only permanent wrongLetters prop"

key-files:
  created:
    - src/lib/components/pianoKeyboardConstruct.test.ts
  modified:
    - src/lib/components/PianoKeyboard.svelte

key-decisions:
  - "constructable and inspectable are mutually exclusive; constructable wins over inspectable when both are passed without interactive (interactive still wins over both) - extends the existing `inspecting = inspectable && !interactive` precedent to a third `constructing` branch."
  - "onConstructTap fires with zero playNote/Tone calls from inside PianoKeyboard - the caller (BuildSession) owns correct/wrong audio feedback, unlike inspectable's emitInspect which always plays."
  - "flashWrongKey is a fully separate prop/helper from wrongLetters (never reads from or writes to the other's rendering path): flashWrongKey is transient and octave-specific (letter+octave exact match), wrongLetters is permanent-per-reveal and letter-only. Both reuse the same `.piano-keyboard__key--wrong` CSS class verbatim - no new class or color token."

patterns-established:
  - "Pattern: adding a new gated tap-driven mode to PianoKeyboard requires (1) a `$derived` precedence flag following the `X && !interactive && !othermodes` shape, (2) folding it into `keysActive`, (3) a new branch in activateWhiteKey/activateBlackKey ordered after `interactive` but before the mode it's subordinate to, (4) a per-key CSS-class helper concatenated additively alongside the existing role/selected/wrong/stamped/pressed classes - never replacing them."

requirements-completed: [BUILD-01, BUILD-02, BUILD-03]

coverage:
  - id: D1
    description: "constructable gates a third tap-driven mode: every rendered key (in notes or not) is clickable/keyboard-activatable and reports its own letter+octave via onConstructTap, with zero audio playback from inside PianoKeyboard"
    requirement: "BUILD-01"
    verification:
      - kind: unit
        ref: "src/lib/components/pianoKeyboardConstruct.test.ts#gives every key button semantics, including keys not in notes (parity with interactive/inspectable)"
        status: pass
      - kind: unit
        ref: "src/lib/components/pianoKeyboardConstruct.test.ts#clicking a white key not in notes fires onConstructTap with its letter and key-position octave, without playing audio"
        status: pass
      - kind: unit
        ref: "src/lib/components/pianoKeyboardConstruct.test.ts#clicking a black key fires onConstructTap with its sharp-letter spelling and correct octave"
        status: pass
      - kind: unit
        ref: "src/lib/components/pianoKeyboardConstruct.test.ts#Enter and Space both activate a key in constructable mode, mirroring interactive/inspectable"
        status: pass
    human_judgment: false
  - id: D2
    description: "constructable and inspectable are mutually exclusive (constructable wins without interactive); interactive still wins over both"
    requirement: "BUILD-02"
    verification:
      - kind: unit
        ref: "src/lib/components/pianoKeyboardConstruct.test.ts#is mutually exclusive with interactive: interactive wins when both are passed"
        status: pass
      - kind: unit
        ref: "src/lib/components/pianoKeyboardConstruct.test.ts#is mutually exclusive with inspectable: constructable wins when both are passed without interactive"
        status: pass
    human_judgment: false
  - id: D3
    description: "flashWrongKey paints the wrong-fill class on the exact physical key only (letter AND octave match), never a same-letter duplicate at another octave, on both white and black keys"
    requirement: "BUILD-03"
    verification:
      - kind: unit
        ref: "src/lib/components/pianoKeyboardConstruct.test.ts#flashWrongKey paints the wrong-fill class on the exact octave-specific white key only"
        status: pass
      - kind: unit
        ref: "src/lib/components/pianoKeyboardConstruct.test.ts#flashWrongKey applies to a black key too, discriminating by octave"
        status: pass
      - kind: unit
        ref: "src/lib/components/pianoKeyboardConstruct.test.ts#flashWrongKey omitted or null leaves every key free of the wrong-fill class"
        status: pass
    human_judgment: false
  - id: D4
    description: "Omitting constructable/onConstructTap/flashWrongKey leaves every existing display-only/interactive/inspectable/placement render byte-identical - zero regressions across the full pre-existing PianoKeyboard-adjacent test surface"
    verification:
      - kind: unit
        ref: "src/lib/components/pianoKeyboardConstruct.test.ts#omitting constructable/onConstructTap/flashWrongKey renders the same display-only markup: zero buttons, zero wrong-fill classes, silent on click"
        status: pass
      - kind: unit
        ref: "npx vitest run (full repo suite, 63 files / 842 tests, includes pianoKeyboardInspect.test.ts, keyboardLayout.test.ts, components.test.ts, and every page/component test rendering PianoKeyboard)"
        status: pass
      - kind: unit
        ref: "npm run check (svelte-check, 1276 files, 0 errors, 0 warnings)"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-07-15
status: complete
---

# Phase 12 Plan 02: PianoKeyboard Constructable Mode Summary

**PianoKeyboard.svelte gains a third gated tap-driven mode - constructable + onConstructTap + flashWrongKey - proven additive with a 10-case unit suite plus a full 842-test zero-regression run.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-15T14:14:00Z
- **Completed:** 2026-07-15T14:22:00Z
- **Tasks:** 2 (TDD: RED then GREEN)
- **Files modified:** 2

## Accomplishments
- Added `constructable`, `onConstructTap`, and `flashWrongKey` to PianoKeyboard's Props interface, gated exactly like `interactive`/`inspectable`
- Every key (highlighted or not) becomes tappable in constructable mode and reports its own letter+octave via `onConstructTap`, with zero audio playback from inside the component
- New `constructing = $derived(constructable && !interactive)` precedence branch; `inspecting` updated to `inspectable && !interactive && !constructable` so constructable wins over inspectable while interactive still wins over both
- `flashWrongClass` helper paints the existing `.piano-keyboard__key--wrong` CSS class on the exact letter+octave match only, kept fully separate from the pre-existing `wrongLetters` prop/`wrongClass` helper
- 10-case `pianoKeyboardConstruct.test.ts` suite covers every behavior in the plan (button semantics parity, white/black tap reporting, keyboard activation, both mutual-exclusivity directions, octave-specific flash on white and black keys, and the display-only non-regression case)
- Full repo suite (63 files, 842 tests) and `npm run check` (1276 files, 0 errors) both pass with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: RED - failing tests for constructable, onConstructTap, and flashWrongKey** - `1b8c13d` (test)
2. **Task 2: GREEN - implement constructable, onConstructTap, and flashWrongKey on PianoKeyboard** - `866e9e7` (feat)

_No REFACTOR commit needed - the GREEN implementation matched the plan's exact prescribed shape (derived precedence flag, three-way activate branch, additive class-list concatenation) with nothing left to clean up._

## Files Created/Modified
- `src/lib/components/pianoKeyboardConstruct.test.ts` - New 10-case Vitest suite for the constructable mode (RED spec, now green)
- `src/lib/components/PianoKeyboard.svelte` - Added constructable/onConstructTap/flashWrongKey props, constructing derivation, activateWhiteKey/activateBlackKey's new branch, and the flashWrongClass helper wired into both key class lists

## Decisions Made
- constructable and inspectable are mutually exclusive; constructable wins over inspectable when both are passed without interactive (interactive still wins over both) - a one-line comment documents this precedence choice in the component, since the two modes are never expected to be passed together in practice.
- onConstructTap fires with zero playNote/Tone calls from inside PianoKeyboard - construction's correct/wrong audio feedback is owned entirely by the caller (BuildSession, built in 12-04/05).
- flashWrongKey stays a fully separate prop and helper from wrongLetters, reusing the same `.piano-keyboard__key--wrong`/`.piano-keyboard__key--black.piano-keyboard__key--wrong` CSS rules verbatim rather than introducing a new class or color token.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' acceptance criteria were met on the first implementation pass; no auto-fixes, blockers, or architectural questions arose.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `PianoKeyboard.svelte` is ready for 12-04/05's `BuildSession.svelte` to consume: `<PianoKeyboard notes={earnedNotes} constructable octaves={2} onConstructTap={handleConstructTap} flashWrongKey={flashKey} />`, with octaves passed explicitly per the UI-SPEC's forced-2-octave requirement.
- No blockers. The gated-prop compatibility contract holds: every pre-existing PianoKeyboard consumer (display, interactive, inspectable, placement) is proven byte-identical by the full 842-test suite.

---
*Phase: 12-build-it-construction*
*Completed: 2026-07-15*

## Self-Check: PASSED

- FOUND: src/lib/components/pianoKeyboardConstruct.test.ts
- FOUND: src/lib/components/PianoKeyboard.svelte
- FOUND: .planning/phases/12-build-it-construction/12-02-SUMMARY.md
- FOUND commit: 1b8c13d (test(12-02): add failing tests for PianoKeyboard constructable mode)
- FOUND commit: 866e9e7 (feat(12-02): implement PianoKeyboard constructable mode)
