---
phase: 03-on-screen-drill-loop
plan: 02
subsystem: ui
tags: [svelte5, a11y, keyboard-input, css]

# Dependency graph
requires:
  - phase: 01-print-shop-foundation-theory-core
    provides: PianoKeyboard display-only component, interval-color token contract
  - phase: 03-on-screen-drill-loop (plan 01)
    provides: matchChord (chroma-based matcher) that consumes the letters this plan emits
provides:
  - PianoKeyboard interactive/selectable mode (opt-in props, click + keyboard toggling)
  - Selected-key diagonal ink-hatch CSS treatment, mutually exclusive with interval-color fills
  - Non-regression guarantee that display-only rendering is unchanged when interactive is omitted
affects: [03-on-screen-drill-loop plan 03 (drills page wiring), phase 04 (MIDI input reuses the same onToggle/selected contract)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Opt-in interactive props on a display-only component (interactive/selected/onToggle), default false, gated attribute binding via `interactive ? value : undefined` so Svelte omits the attribute entirely rather than rendering a falsy value"
    - "Component-scoped CSS state treatment (repeating-linear-gradient hatch) instead of a new design token, for a state that's specific to one component"

key-files:
  created: []
  modified:
    - src/lib/components/PianoKeyboard.svelte
    - src/lib/components/components.test.ts

key-decisions:
  - "Black keys emit their sharp-spelling letter (e.g. C♯) as the canonical onToggle payload; the parent page maps letter to chroma before calling matchChord, so either enharmonic spelling resolves to the same pitch class."
  - "Selection is not owned by the component (no internal $state) — selected is a prop the parent controls, keeping PianoKeyboard a pure display+event component per PATTERNS.md's lift-state-to-parent guidance."
  - "Selected and interval-role (revealed-correct) classes are mutually exclusive by construction: selectedClass() only returns the hatch class when the key carries no interval role."

patterns-established:
  - "Attribute values conditioned on a boolean prop use `condition ? value : undefined` (not `{#if}` blocks around whole attributes) so Svelte omits the attribute from the DOM entirely in the false case, which is what the non-regression test asserts (getAttribute(...) === null, not just falsy)."

requirements-completed: [INPUT-02]

coverage:
  - id: D1
    description: "Display-only render is byte-identical (no role=button/aria-pressed/tabindex on keys) when interactive is omitted or false"
    requirement: "INPUT-02"
    verification:
      - kind: unit
        ref: "src/lib/components/components.test.ts#non-regression: omitting interactive keeps keys free of button semantics"
        status: pass
    human_judgment: false
  - id: D2
    description: "Clicking a key in interactive mode calls onToggle with the key's letter"
    requirement: "INPUT-02"
    verification:
      - kind: unit
        ref: "src/lib/components/components.test.ts#interactive mode: clicking a white key calls onToggle with its letter"
        status: pass
    human_judgment: false
  - id: D3
    description: "aria-pressed and aria-label reflect selected state per the {letter} key / {letter} key, selected pattern"
    requirement: "INPUT-02"
    verification:
      - kind: unit
        ref: "src/lib/components/components.test.ts#interactive mode: aria-pressed and aria-label reflect selected state"
        status: pass
    human_judgment: false
  - id: D4
    description: "Enter and Space keydown both toggle a key (keyboard accessibility parity with click)"
    requirement: "INPUT-02"
    verification:
      - kind: unit
        ref: "src/lib/components/components.test.ts#interactive mode: Enter and Space keydown both toggle a key"
        status: pass
    human_judgment: false
  - id: D5
    description: "Selected-key hatch treatment is visually distinct from the four interval-color fills (diagonal repeating-linear-gradient + inset ink border, no interval-color tokens referenced, no new app.css token)"
    verification:
      - kind: other
        ref: "git diff --stat src/app.css (empty) + manual review of PianoKeyboard.svelte <style> block"
        status: pass
    human_judgment: true
    rationale: "Visual distinctness of the hatch pattern from the interval-color fills is a design-intent judgment (contrast, legibility on both white and black keys) best confirmed by a human looking at the rendered keyboard, even though the absence-of-token-reuse is mechanically verified."

# Metrics
duration: 8min
completed: 2026-07-13
status: complete
---

# Phase 3 Plan 2: Interactive PianoKeyboard Summary

**Extended PianoKeyboard.svelte in place with opt-in interactive/selected/onToggle props, click + Enter/Space key toggling, and a diagonal ink-hatch CSS treatment for pending selections that never overlaps the four reserved interval colors.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-13T01:10:31Z (approx, from STATE.md session start)
- **Completed:** 2026-07-13T01:14:58Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `PianoKeyboard` gained `interactive?`, `selected?: Set<string>`, and `onToggle?` props, all optional and defaulting to the pre-existing display-only behavior.
- Every key (white and black) is click- and keyboard-toggleable (Enter/Space) when `interactive` is true, emitting the toggled key's letter via `onToggle`.
- A selected key renders a diagonal ink-hatch texture (`repeating-linear-gradient`) plus a 2px inset ink border, distinct from the interval-color fills and applied identically to white and black keys (inverted hatch color on black keys for visibility).
- Non-regression test proves the display-only render (no `interactive` prop) has no `role="button"`, `aria-pressed`, or `tabindex` on any key, and the container still exposes `role="img"` / the original `aria-label`.

## Task Commits

Both tasks were combined into a single cohesive TDD RED/GREEN cycle since Task 1's props/attributes and Task 2's render/CSS additions land in the same lines of the same render blocks:

1. **Task 1 (RED): Add failing tests for interactive mode** - `d96e41c` (test)
2. **Task 1 + Task 2 (GREEN): Extend props, wire interactive attributes, add selected hatch CSS** - `7ff8a4a` (feat)

**Plan metadata:** committed separately after this SUMMARY (docs: complete plan)

_Note: Tasks 1 and 2 share one GREEN commit — see Deviations below for rationale._

## Files Created/Modified
- `src/lib/components/PianoKeyboard.svelte` - Added `interactive`/`selected`/`onToggle` props, gated `role`/`tabindex`/`aria-pressed`/`aria-label`/`onclick`/`onkeydown` attributes on both key render blocks, added `selectedClass()` helper and `.piano-keyboard__key--selected` (+ black-key override) CSS hatch treatment.
- `src/lib/components/components.test.ts` - Added 4 new test cases: non-regression, click-toggle, aria-state, and Enter/Space keydown coverage for `PianoKeyboard`.

## Decisions Made
- Black keys emit their sharp-spelling letter (`C♯`, `D♯`, etc.) as the canonical `onToggle` payload; the drill page (Plan 03) is responsible for mapping either enharmonic spelling to the same chroma before calling `matchChord`.
- No internal `$state` for selection inside `PianoKeyboard` — `selected` is a controlled prop, keeping the component pure display+event per `03-PATTERNS.md`'s explicit "lift state to the parent" instruction.
- Selected and interval-role classes are mutually exclusive by construction (`selectedClass()` only fires when the key has no `note`/role), matching the UI-SPEC's "these two states are visually incompatible by construction" requirement.
- Added `svelte-ignore a11y_no_noninteractive_tabindex` comments on both key render blocks: Svelte's static a11y linter cannot see that `role` is dynamically `'button'` whenever `tabindex` is set (both are gated by the same `interactive` boolean at runtime), so the warning is a false positive that would otherwise show up in every `npm run check` run.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript inference error on empty `Set()` literals in new tests**
- **Found during:** Task 1 verification (`npm run check`)
- **Issue:** `selected: new Set()` in two new test cases inferred `Set<unknown>`, which is not assignable to the `Set<string>` prop type, producing 2 `svelte-check` errors.
- **Fix:** Added explicit type parameter: `new Set<string>()`.
- **Files modified:** `src/lib/components/components.test.ts`
- **Verification:** `npm run check` reports 0 errors, 0 warnings after the fix.
- **Committed in:** `7ff8a4a` (GREEN commit)

**2. [Rule 1 - Bug] Suppressed a11y false-positive on dynamically-interactive keys**
- **Found during:** Task 2 verification (`npm run check` / vite-plugin-svelte compile warnings)
- **Issue:** Svelte's compiler flagged `a11y_no_noninteractive_tabindex` on both key `<div>`s because it cannot statically prove `role="button"` is present whenever `tabindex="0"` is set (both come from the same runtime-conditional `interactive` boolean, but the linter only sees the raw attribute expressions).
- **Fix:** Added a `<!-- svelte-ignore a11y_no_noninteractive_tabindex -->` comment directly above each key element with an inline rationale, rather than restructuring the render into two near-duplicate blocks (interactive vs. non-interactive) which would have doubled the markup and risked drifting from the "byte-identical when non-interactive" non-regression guarantee.
- **Files modified:** `src/lib/components/PianoKeyboard.svelte`
- **Verification:** `npm run check` reports 0 warnings after the fix; both key blocks still pass the non-regression and interactive test suites.
- **Committed in:** `7ff8a4a` (GREEN commit)

**3. [Process] Combined Task 1 and Task 2 into a single GREEN commit**
- **Found during:** Implementation planning before writing code
- **Issue:** Task 1 (props + non-regression test) and Task 2 (interactive render attributes + selected hatch CSS) both modify the exact same lines inside the same `{#each whiteKeys}`/`{#each blackKeys}` render blocks in `PianoKeyboard.svelte`. Implementing Task 1's GREEN phase without also wiring the render attributes would have left `onToggle`/`selected` as unused props (dead code that couldn't pass the interactive-mode tests, which require the render wiring from Task 2 to exist).
- **Resolution:** Wrote all four new tests first (RED, task 1's TDD requirement), confirmed they failed for the expected reason (missing interactive plumbing), then implemented the full props + render + CSS change as one GREEN commit covering both tasks' acceptance criteria simultaneously. No task's acceptance criteria were skipped; all are verified and documented above.
- **Files modified:** `src/lib/components/PianoKeyboard.svelte`
- **Verification:** All 4 new tests plus all 5 pre-existing `PianoKeyboard`/`RecentChipRow` tests pass; full suite (199 tests, 12 files) green; `npm run check` clean.
- **Committed in:** `7ff8a4a`

---

**Total deviations:** 3 (2 auto-fixed bugs, 1 process/commit-structure note)
**Impact on plan:** No scope creep. Both auto-fixes were required for a clean `npm run check`; the commit-structure combination was necessary because the two tasks are not independently shippable given they edit the same render blocks. All of Task 1's and Task 2's acceptance criteria are individually verified in the Coverage block above.

## Issues Encountered
- Two of my own new tests used `getByRole('button', { name: 'C key' })`, which threw "multiple elements found" because the two-octave keyboard repeats the letter C three times (indices 0, 7, 14). Fixed by switching to `getAllByRole(...)` and asserting against the first match (or all matches, for the aria-state test) — this was a test-authoring bug, not a component bug, caught immediately by the RED-phase run.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `PianoKeyboard` now exposes the shared clickable input surface Plan 03 (`/drills` page) needs to wire construction-drill answer selection, and that Phase 4 (MIDI) will eventually drive via the same `selected`/`onToggle` contract without forking the component.
- No blockers. `matchChord` (Plan 01) and interactive `PianoKeyboard` (this plan) are both ready for Plan 03 to compose into the `/drills` route.

---
*Phase: 03-on-screen-drill-loop*
*Completed: 2026-07-13*

## Self-Check: PASSED

- FOUND: src/lib/components/PianoKeyboard.svelte
- FOUND: src/lib/components/components.test.ts
- FOUND: .planning/phases/03-on-screen-drill-loop/03-02-SUMMARY.md
- FOUND commit: d96e41c (test)
- FOUND commit: 7ff8a4a (feat)
- FOUND commit: 3c72b8d (docs: summary)
