---
phase: 01-print-shop-foundation-theory-core
plan: 03
subsystem: ui
tags: [svelte5, tailwind4, design-system, print-shop, interval-color-language]

# Dependency graph
requires:
  - phase: 01-print-shop-foundation-theory-core (Plan 01)
    provides: "Base @theme tokens (Print Shop palette, interval color aliases, border-radius:0) in src/app.css"
  - phase: 01-print-shop-foundation-theory-core (Plan 02)
    provides: "SpelledNote/IntervalRole/ChordResult types and spellChord() theory engine"
provides:
  - "Complete @theme tokens: on-fill text colors, spacing scale (xs-3xl), four typography roles"
  - "PianoKeyboard.svelte - two-octave display-only keyboard highlighting spelled notes by interval role"
  - "NoteLabel.svelte, ChordGlyph.svelte, Button.svelte, IntervalChip.svelte - reusable Print Shop primitives"
affects: [01-04, "Phase 2 (lookup)", "Phase 3 (drills)", "Phase 7 (lessons)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Print Shop components are pure presentation: props in, styled markup out, zero business logic - theory engine values flow in as props (SpelledNote[], IntervalRole)"
    - "Interval color application is table-driven: a role -> CSS class map ('piano-keyboard__key--root' etc.), never inline conditional styling, so the four semantic tokens stay the single source of highlight color everywhere"
    - "Keyboard note-to-key assignment walks the keyboard once in ascending order from the root, assigning each spelled note to the nearest unused key at or after the previous note's position - avoids re-highlighting a letter's later octave repeat on a multi-octave keyboard"

key-files:
  created:
    - src/lib/components/PianoKeyboard.svelte
    - src/lib/components/NoteLabel.svelte
    - src/lib/components/ChordGlyph.svelte
    - src/lib/components/Button.svelte
    - src/lib/components/IntervalChip.svelte
    - src/lib/components/components.test.ts
  modified:
    - src/app.css

key-decisions:
  - "PianoKeyboard renders a two-octave C-to-C span (15 white keys) so any v1 chord's root/3rd/5th/7th fit fully above its root without wrapping, per the delegated 01-CONTEXT.md decision - verified against B♭maj7 (root B♭, seventh A lands in the second octave)"
  - "Note-to-key assignment is position-ordered and stateful (a cursor that only moves forward), not simple letter-equality matching - a naive 'highlight every white key with a matching letter' approach over-highlights (e.g. C appears 3 times across two octaves) and was caught and fixed during Task 3 verification"
  - "Black keys match notes enharmonically (either the sharp or flat spelling) since a chord may spell an accidental either way (e.g. Cm7's third is E♭, matching the D♯/E♭ key) - white keys never participate in this ambiguity since only natural letters land there"
  - "White-key and black-key candidate pools never overlap during assignment: a note only ever competes for a key of its own kind (natural letter -> white, accidental -> black), preventing a documented cross-kind collision that briefly double-highlighted E♭/B♭ before the fix"

patterns-established:
  - "@theme token additions extend rather than replace Plan 01's base palette block - each plan expected to grow app.css purely additively per the phase's living token contract"

requirements-completed: [DESIGN-01, DESIGN-02]

coverage:
  - id: D1
    description: "The interval color language is a fixed set of semantic tokens (--color-root/-third/-fifth/-seventh) applied identically wherever interval role is shown"
    requirement: "DESIGN-02"
    verification:
      - kind: unit
        ref: "src/lib/components/components.test.ts#highlights the four Cm7 spelled notes with their interval role colors and dual naming"
        status: pass
      - kind: other
        ref: "grep -n 'color-root|color-third|color-fifth|color-seventh' src/app.css confirms all four tokens declared once, consumed via CSS class in IntervalChip and PianoKeyboard"
        status: pass
    human_judgment: false
  - id: D2
    description: "Core components render the Print Shop identity: paper ground, 2px ink borders, sharp corners, offset-shadow buttons, misregistered vermilion chord-glyph shadow, serif chords + mono data labels"
    requirement: "DESIGN-01"
    verification:
      - kind: other
        ref: "grep confirms ChordGlyph.svelte has aria-hidden shadow + user-select:none; Button.svelte declares both primary/ghost variants and a pressed offset-reduction state; svelte-check 0 errors across all components"
        status: pass
    human_judgment: true
    rationale: "Visual fidelity to the Print Shop mockups (design-hybrid.html variant B) - exact color/shadow/typography rendering - is a judgment call best confirmed visually in Plan 04's full showcase wiring; this plan's automated checks confirm structural/token correctness, not pixel appearance."
  - id: D3
    description: "PianoKeyboard highlights given spelled notes in their interval colors and shows dual letter/solfège labels"
    requirement: "DESIGN-02"
    verification:
      - kind: unit
        ref: "src/lib/components/components.test.ts#highlights the four Cm7 spelled notes with their interval role colors and dual naming"
        status: pass
      - kind: unit
        ref: "src/lib/components/components.test.ts#renders a display-only keyboard with no click or keydown handlers"
        status: pass
    human_judgment: false

duration: 27min
completed: 2026-07-12
status: complete
---

# Phase 1 Plan 3: Print Shop Components Summary

**Five reusable Svelte 5 components (PianoKeyboard, NoteLabel, ChordGlyph, Button, IntervalChip) realizing the Print Shop visual identity and the fixed four-token interval color language, plus the completed `@theme` typographic/spacing contract in `app.css`.**

## Performance

- **Duration:** 27 min
- **Started:** 2026-07-12T20:30:00Z
- **Completed:** 2026-07-12T20:57:08Z
- **Tasks:** 3
- **Files modified:** 7 (6 created, 1 modified)

## Accomplishments

- Extended `src/app.css`'s `@theme` block (base palette from Plan 01) with the paired on-fill text colors for each interval token, the full spacing scale (4-64px, multiples of 4), and the four typography roles (Body, Label, Heading, Display) — completing the Print Shop token contract.
- Built `ChordGlyph`, `NoteLabel`, `IntervalChip`, and `Button` as pure Svelte 5 runes components matching the `01-UI-SPEC.md` contract: serif chord glyph with an `aria-hidden`, non-selectable misregistered vermilion shadow; dual letter/solfège note labels; interval-colored mono chips; and primary/ghost buttons with an offset-shadow press-into-paper active state.
- Built `PianoKeyboard.svelte` as a display-only two-octave (15 white key) keyboard that assigns each spelled note to exactly one key in ascending order from the root, highlighting it with the correct interval color and a `NoteLabel`. Caught and fixed a real assignment bug during verification (see Deviations) where naive letter matching over-highlighted repeated letters across octaves and let accidental notes bleed onto natural-letter white keys.

## Task Commits

Each task was committed atomically:

1. **Task 1: Finalize interval color tokens + typographic/structural theme** - `f19b07b` (feat)
2. **Task 2: Build ChordGlyph, NoteLabel, IntervalChip, Button components** - `c6c6b54` (feat)
3. **Task 3: Build display-only PianoKeyboard with interval-colored highlights** - `bcf8ee2` (feat)

## Files Created/Modified

- `src/app.css` - Added `--color-on-root/-third/-fifth/-seventh` on-fill text colors, `--spacing-xs..3xl` scale, and `--text-body/-label/-heading/-display` typography role tokens
- `src/lib/components/ChordGlyph.svelte` - Serif chord glyph with misregistered vermilion print shadow (`aria-hidden`, `user-select:none`), superscript quality suffix
- `src/lib/components/NoteLabel.svelte` - Dual letter/solfège naming, faint unhighlighted state
- `src/lib/components/IntervalChip.svelte` - Mono tag filled with the matching semantic interval token
- `src/lib/components/Button.svelte` - Primary (vermilion, offset shadow) and ghost variants with press-into-paper active state
- `src/lib/components/PianoKeyboard.svelte` - Two-octave display-only keyboard, interval-colored key highlighting via ascending-order note-to-key assignment
- `src/lib/components/components.test.ts` - Cm7 highlighting/dual-naming test + display-only (no handlers) test

## Decisions Made

- Two-octave C-to-C keyboard span (15 white keys) resolves the delegated span decision from `01-CONTEXT.md`, verified against B♭maj7 spilling into the second octave.
- Note-to-key assignment is a stateful, position-ordered walk (not simple letter matching) to correctly handle a two-octave keyboard where letters repeat.
- Black keys match either their sharp or flat spelling since chords may spell an accidental either way; white keys and black keys never share a candidate pool during assignment.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed over-highlighting from naive letter-based key matching**
- **Found during:** Task 3, first test run of `components.test.ts`
- **Issue:** The initial implementation matched every white key sharing a spelled note's letter (e.g. every "C" key), which on a two-octave keyboard highlights the same letter 2-3 times instead of once for the actual chord voicing. The acceptance criterion "exactly four highlighted keys" failed (7 keys lit).
- **Fix:** Rewrote key assignment as a single ascending-order walk from the root's position: each note claims the nearest unused key at or after the previous note's position, so a chord highlights exactly one key per note regardless of how many times that letter repeats across the keyboard's span.
- **Files modified:** `src/lib/components/PianoKeyboard.svelte`
- **Verification:** `npx vitest run src/lib/components/components.test.ts` - both tests pass; manually re-verified with B♭maj7 (root spans into second octave) still highlights exactly 4 keys.
- **Committed in:** `bcf8ee2` (Task 3 commit)

**2. [Rule 1 - Bug] Fixed accidental notes bleeding onto natural-letter white keys**
- **Found during:** Task 3, second test run after the first fix (Mi/E♭ appeared twice: once correctly on the black key, once incorrectly on white key "E")
- **Issue:** White-key indices and black-key positions shared an overlapping integer space (both counted "key slots left to right"), so a note assigned to a black-key position also satisfied the white-key lookup's position check even though the note's letter was never a natural letter for that white key.
- **Fix:** Tagged each key assignment candidate with its kind (`white` | `black`) so a note can only ever be looked up against its own kind's key list, eliminating the cross-kind collision.
- **Files modified:** `src/lib/components/PianoKeyboard.svelte`
- **Verification:** `npx vitest run src/lib/components/components.test.ts` passes; highlighted-key count confirmed as exactly 4 via a temporary debug assertion (removed before commit).
- **Committed in:** `bcf8ee2` (Task 3 commit, fixed before commit - not a separate follow-up commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 bugs caught during the task's own verification loop before commit)
**Impact on plan:** Both fixes were necessary for the PianoKeyboard to correctly satisfy its own acceptance criteria (exactly 4 highlighted keys, correctly role-colored). No scope creep - no new components, no architectural changes, no new dependencies.

## Issues Encountered

None beyond the deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All five Print Shop primitives (`PianoKeyboard`, `NoteLabel`, `ChordGlyph`, `Button`, `IntervalChip`) exist, are type-clean, and are unit-tested against real theory-engine output (`spellChord('Cm7')`).
- The `@theme` token contract in `src/app.css` is now complete for this phase's scope: full Print Shop palette, interval color language, on-fill text pairs, spacing scale, and typography roles.
- Plan 04 can now wire these components into the full `/showcase` experience per `01-UI-SPEC.md` (chord input, alias confirmation line, interval-formula readout, empty/error states with the D-05 through D-12 tone decisions), replacing the showcase page's current hard-coded inline styling from Plan 01.
- No blockers for Plan 04.

## Self-Check: PASSED

All 6 created files verified present on disk (`ChordGlyph.svelte`, `NoteLabel.svelte`, `IntervalChip.svelte`, `Button.svelte`, `PianoKeyboard.svelte`, `components.test.ts`); `src/app.css` modification verified present. All 3 commits (`f19b07b`, `c6c6b54`, `bcf8ee2`) verified in `git log`. Plan-level verification re-run and passing: `svelte-check` 0 errors/400 files, `npx vitest run src/lib/components/components.test.ts` 2/2 passing, `npx vitest run` full suite 124/124 passing, interval color tokens confirmed present via grep, no em dash in any component file, no hardcoded hex colors in any component (all consume `var(--color-*)` tokens exclusively).

---
*Phase: 01-print-shop-foundation-theory-core*
*Completed: 2026-07-12*
