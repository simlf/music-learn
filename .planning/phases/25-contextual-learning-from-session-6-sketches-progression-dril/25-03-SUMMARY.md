---
phase: 25-contextual-learning-from-session-6-sketches-progression-dril
plan: 03
subsystem: ui
tags: [svelte, piano-keyboard, css, sketch-019]

# Dependency graph
requires:
  - phase: 25-contextual-learning-from-session-6-sketches-progression-dril
    provides: "25-02's voicing-stage FSRS engine (voicingStageForChord), which the future 25-07 ShellVoicingDrill will pair with this ghost-hatch treatment"
provides:
  - "PianoKeyboard ghostKeys prop rendering an ink-hatch 'optional note' treatment with a tiny mono R/5 marker"
affects: [25-07-shell-voicing-drill]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ghostClass/ghostMarker mirror the existing pendingClass/flashWrongClass letter+octave-keyed, role-gated helper shape; marker renders via a data-ghost attribute + ::after (sketch 019's .k-ghost pattern)"

key-files:
  created:
    - src/lib/components/pianoKeyboardGhost.test.ts
  modified:
    - src/lib/components/PianoKeyboard.svelte

key-decisions:
  - "TDD RED/GREEN order executed as test-first across both plan tasks: the regression test file (plan Task 2) was written and committed first (RED, confirmed failing), then the PianoKeyboard implementation (plan Task 1) was committed second (GREEN) — both tasks' deliverables are unchanged, only the commit sequence follows genuine test-first TDD rather than the plan's task-listing order."
  - "ghostMarker() has no role parameter (per the plan's literal helper signature) — the data-ghost attribute can technically be set on a role-lit key, but it is visually inert there since the CSS ::after marker is scoped under .piano-keyboard__key--ghost, which ghostClass's role gate never applies to a role-lit key."

patterns-established: []

requirements-completed: [SK-019]

coverage:
  - id: D1
    description: "PianoKeyboard renders a ghost-hatch class + data-ghost R/5 marker for keys listed in ghostKeys, gated off when the key has no matching entry or already carries an interval role, and octave-specific for same-letter duplicate keys"
    requirement: "SK-019"
    verification:
      - kind: unit
        ref: "src/lib/components/pianoKeyboardGhost.test.ts#PianoKeyboard ghost-hatch (ghostKeys, sketch 019 synthesis)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Omitting ghostKeys leaves every existing PianoKeyboard render byte-identical (no ghost class, no data-ghost attribute)"
    requirement: "SK-019"
    verification:
      - kind: unit
        ref: "src/lib/components/pianoKeyboardGhost.test.ts#omitting ghostKeys renders no element with the ghost class or a data-ghost attribute (byte-identical additive default)"
        status: pass
      - kind: unit
        ref: "src/lib/components/pianoKeyboardPulse.test.ts, pianoKeyboardConstruct.test.ts, pianoKeyboardInspect.test.ts (full suites, all pre-existing tests green)"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-21
status: complete
---

# Phase 25 Plan 03: Ghost-Hatch Optional-Note Treatment Summary

**PianoKeyboard gains a gated `ghostKeys` prop rendering an ink-hatch "optional but allowed" treatment with a tiny mono R/5 marker, distinct from the gray wrong-extra ✕, for the sketch-019 shell-voicing subtraction stage.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-20T22:24:00Z (approx)
- **Completed:** 2026-07-20T22:36:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `ghostKeys?: { letter: string; octave: number; marker: string }[]` prop to `PianoKeyboard`'s Props interface, documented with the sketch-019 synthesis citation.
- Added `ghostClass(letter, octave, role)` (role-gated like `selectedClass`, octave-keyed like `flashWrongClass`/`pendingClass`) and `ghostMarker(letter, octave)` helpers.
- Wired `ghostClass`/`data-ghost` into both the white-key and black-key render paths, using the same `key.note?.letter ?? key.letter` (or `sharpLetter`) spelling `pendingClass` already uses.
- Added scoped `.piano-keyboard__key--ghost` CSS: a 45deg ink-hatch at low opacity plus a `::after` marker rendering `attr(data-ghost)` in mono `--color-faint`, with a black-key override for legibility over the dark key.
- Created `src/lib/components/pianoKeyboardGhost.test.ts` covering all four required behaviors (present, absent, role-gated, octave-specific).

## Task Commits

Each task was committed atomically, in genuine TDD RED → GREEN order:

1. **Task 2 (RED): Regression test for the ghost-hatch treatment** - `86f47f9` (test) — written and confirmed failing first (2 of 4 assertions failed against the pre-change component, as expected for a feature that didn't exist yet).
2. **Task 1 (GREEN): Add the gated ghostKeys prop, class helper, and marker to PianoKeyboard** - `b929392` (feat) — implementation made all four tests pass.

**Plan metadata:** (this commit, docs: complete plan)

_Note: TDD tasks may have multiple commits (test → feat → refactor); here the plan's two listed tasks map 1:1 onto the RED and GREEN commits, executed test-first rather than in the plan's task-listing order._

## Files Created/Modified

- `src/lib/components/pianoKeyboardGhost.test.ts` - New regression suite: ghost class + marker present when `ghostKeys` matches a role-less key; absent when the prop is omitted; role-gated (never applies over an interval-role fill); octave-specific (same letter at a different octave stays plain).
- `src/lib/components/PianoKeyboard.svelte` - New `ghostKeys` prop, `ghostClass`/`ghostMarker` helpers, wiring into both white/black key class strings and a new `data-ghost` attribute, and the `.piano-keyboard__key--ghost` (+ black-key override) scoped style rule.

## Decisions Made

- TDD order followed test-first (RED before GREEN) even though the plan lists the component-change task (Task 1) before the dedicated test-file task (Task 2) — both tasks' `tdd="true"` frontmatter and Task 1's own `<verify>` step (which runs `pianoKeyboardGhost.test.ts`) require the test file to exist before the component change can be verified, so writing+committing the failing test first is the only order that satisfies genuine RED→GREEN semantics for this pair of tasks. Both tasks' listed `<files>` and acceptance criteria are unchanged.
- `ghostMarker()` intentionally has no `role` parameter (matches the plan's literal helper signature), so `data-ghost` could technically be set on a role-lit key — harmless because the `::after` marker CSS is scoped under `.piano-keyboard__key--ghost`, and `ghostClass`'s `!role` guard means that class (and therefore the visible marker) never applies to a role-lit key.

## Deviations from Plan

None - plan executed exactly as written. (Commit ordering was adjusted to genuine TDD RED-then-GREEN sequence, as explained above; no code or test content differs from what the plan specified.)

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The `ghostKeys` prop, `ghostClass`/`ghostMarker` helpers, and `.piano-keyboard__key--ghost` style are ready for 25-07's `ShellVoicingDrill` to consume directly for the sketch-019 subtraction stage (root + fifth rendered as optional/ghost notes).
- All pre-existing `PianoKeyboard` test suites (pulse, construct, inspect, and the full 1391-test project suite) remain green; `npm run check` reports 0 errors / 0 warnings across 1343 files.
- No blockers for subsequent Phase 25 plans.

---
*Phase: 25-contextual-learning-from-session-6-sketches-progression-dril*
*Completed: 2026-07-21*
