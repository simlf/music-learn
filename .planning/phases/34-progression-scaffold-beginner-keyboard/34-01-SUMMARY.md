---
phase: 34-progression-scaffold-beginner-keyboard
plan: 01
subsystem: ui
tags: [svelte5, fsrs, i18n, piano-keyboard, progressions]

requires:
  - phase: 25-contextual-learning
    provides: voicingStageForChord maturity mapping (shellVoicing.ts), ShellVoicingDrill's self-contained getAllCards read pattern
provides:
  - ProgressionDrill's play-step keyboard reduced to one octave for a beginner (New/absent) card on the current bar, widening to two octaves once that bar's card reaches State.Review
  - A self-contained, staleness-guarded per-bar FSRS maturity read (`cards`/`cardsLoaded`/`stage`) inside ProgressionDrill.svelte, reusable as the shared signal for Plan 34-02's hint-ladder fade
  - `progressions.keyboard.beginnerCaption` i18n key (en/fr)
affects: [34-02-progression-scaffold-hint-ladder]

tech-stack:
  added: []
  patterns:
    - "Per-bar (not per-component-instance) staleness-guarded async deck read: the $effect key is `currentBar?.symbol`, and the guard re-checks `currentBar?.symbol` after the await (not a separately-tracked top-level `symbol` state var), since ProgressionDrill's 'current chord' changes every cursor advance rather than only on a fresh draw."

key-files:
  created: []
  modified:
    - src/lib/i18n/messages/progressions.ts
    - src/lib/components/ProgressionDrill.svelte
    - src/lib/components/progressionDrill.test.ts
    - src/lib/components/ProgressionDrill.embed.test.ts

key-decisions:
  - "voicingStageForChord(cards) is reused verbatim (no parallel maturity function); ProgressionDrill has no voicingMet-equivalent gate, so the derived stage skips ShellVoicingDrill's hasVoicingMet override entirely."
  - "octaves is passed explicitly to PianoKeyboard (stage === 'drill' ? 2 : 1) rather than left to width self-measurement, per UI-SPEC's requirement that the beginner reduction hold at any viewport width."
  - "The beginner caption is gated on step === 'play' (not just cardsLoaded && stage !== 'drill') since the caption is only meaningful once the play-step keyboard is on screen; the name step never shows it."

patterns-established:
  - "A second self-contained FSRS maturity read now exists in the codebase (ShellVoicingDrill's chord-level read, ProgressionDrill's per-bar read) — both call getAllCards directly and both are gated by a cardsLoaded flag, establishing this as the repeatable shape for future per-item maturity signals."

requirements-completed: [SCAF-02]

coverage:
  - id: D1
    description: "Play-step keyboard renders one octave for a beginner (New/absent) card on the current bar and the beginner caption is shown"
    requirement: SCAF-02
    verification:
      - kind: unit
        ref: "src/lib/components/progressionDrill.test.ts#ProgressionDrill: beginner keyboard span from per-bar card maturity (SCAF-02) > an empty deck resolves to one octave with the beginner caption shown"
        status: pass
      - kind: unit
        ref: "src/lib/components/progressionDrill.test.ts#ProgressionDrill: beginner keyboard span from per-bar card maturity (SCAF-02) > a State.Learning card for the current bar resolves to one octave with the beginner caption shown"
        status: pass
    human_judgment: false
  - id: D2
    description: "Play-step keyboard widens to two octaves once the current bar's card reaches State.Review, and the beginner caption is absent"
    requirement: SCAF-02
    verification:
      - kind: unit
        ref: "src/lib/components/progressionDrill.test.ts#ProgressionDrill: beginner keyboard span from per-bar card maturity (SCAF-02) > a State.Review card for the current bar resolves to two octaves with no beginner caption"
        status: pass
    human_judgment: false
  - id: D3
    description: "Earn-the-symbol grading, roman-numeral display, function reveal, completion, and the embed onComplete seam are byte-behavior unchanged (REG-01)"
    verification:
      - kind: unit
        ref: "src/lib/components/progressionDrill.test.ts (all pre-existing describes)"
        status: pass
      - kind: unit
        ref: "src/lib/components/ProgressionDrill.embed.test.ts (both describes)"
        status: pass
      - kind: unit
        ref: "tests/practice-hub-mix.e2e.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "On-device visual confirmation of the one-octave beginner span vs two-octave mature span"
    verification: []
    human_judgment: true
    rationale: "The preview harness cannot hydrate this SvelteKit app (project memory: preview-harness-null-origin-sveltekit); visual span/caption verification is deferred to on-device UAT, per this plan's own <verification> note."

duration: ~20min
completed: 2026-07-26
status: complete
---

# Phase 34 Plan 01: Progression Scaffold Beginner Keyboard Summary

**ProgressionDrill's play-step keyboard now reads the current bar's own FSRS card maturity (via the reused `voicingStageForChord`) to render one octave for a beginner card and two once it reaches Review, with an explicit `octaves` prop and a gated beginner caption.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Added `progressions.keyboard.beginnerCaption` to both `en` and `fr` i18n blocks, verbatim per the UI-SPEC copywriting contract, keeping the en/fr parity gate green.
- `ProgressionDrill.svelte` gained a self-contained, read-only, staleness-guarded FSRS maturity read (`cards`/`cardsLoaded`/`loadCards`/`stage`), keyed off the current bar's own symbol (not a single top-level symbol) so a cursor advance re-reads maturity for the new bar. `voicingStageForChord` from `$lib/practice/shellVoicing` is reused verbatim — no parallel maturity function was written.
- The play-step `PianoKeyboard` now receives an explicit `octaves` prop (`stage === 'drill' ? 2 : 1`), holding the beginner reduction regardless of viewport width; the beginner caption renders only when `cardsLoaded` is true, `stage !== 'drill'`, and the play step is showing.
- Both `progressionDrill.test.ts` and `ProgressionDrill.embed.test.ts` gained a `$lib/srs/deck` mock (there is no global fake-indexeddb in this project), defaulting to an empty deck; a new SCAF-02 describe block proves empty-deck/Learning-card cases render one octave + caption and a Review-card case renders two octaves + no caption.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the beginner-keyboard caption i18n key to the progressions domain** - `d3e115b` (feat)
2. **Task 2: Self-contained maturity read + explicit beginner keyboard span (SCAF-02)** - `1f88cde` (feat)
3. **Task 3: Deck mock on existing ProgressionDrill tests + SCAF-02 coverage** - `9494db4` (test)

_Note: Task 2 carried `tdd="true"` in the plan frontmatter, but its `<files>` list is a single Svelte component and its acceptance criteria are svelte-check + behavior assertions layered onto Task 3's test file (not a standalone RED/GREEN cycle for this task alone) — the plan structures RED/GREEN across Tasks 2 and 3 rather than within Task 2 in isolation. Both `npm run check` (Task 2) and the full vitest run (Task 3) are green; no gate is missing, just non-standard task boundaries._

## Files Created/Modified

- `src/lib/i18n/messages/progressions.ts` - added `progressions.keyboard.beginnerCaption` (en/fr)
- `src/lib/components/ProgressionDrill.svelte` - added the per-bar maturity read (`cards`/`cardsLoaded`/`loadCards`/`stage`), explicit `octaves` prop on the play-step `PianoKeyboard`, and the gated beginner caption + its `.beginner-caption` style
- `src/lib/components/progressionDrill.test.ts` - added the `$lib/srs/deck` mock, `makeCard` helper, and the SCAF-02 describe block
- `src/lib/components/ProgressionDrill.embed.test.ts` - added the `$lib/srs/deck` mock (defaulting to an empty deck) so the embed-seam tests keep passing under the new maturity read

## Decisions Made

- `voicingStageForChord(cards)` reused verbatim; no `hasVoicingMet`-style override was added since ProgressionDrill has no "shown once" gate equivalent.
- `octaves` passed explicitly to `PianoKeyboard` rather than relying on its width self-measurement fallback, per the UI-SPEC's explicit requirement.
- The beginner caption is additionally gated on `step === 'play'` (beyond the plan's literal `cardsLoaded && stage !== 'drill'`) so it never appears during the name step, where there is no keyboard to caption.

## Deviations from Plan

None - plan executed exactly as written. The one clarification above (Task 2/3 TDD-boundary note) is a documentation note, not a code deviation.

## Known Stubs

None.

## Threat Flags

None - this plan adds only a read-only local IndexedDB read (already used elsewhere in the app) and static i18n copy; no new trust boundary, network endpoint, auth path, or schema change was introduced. Matches the plan's own threat register (all dispositions: accept).

## Issues Encountered

None.

## Next Phase Readiness

- The `stage`/`cardsLoaded` signal established in `ProgressionDrill.svelte` is ready for Plan 34-02 (the escalating hint-ladder fade, SCAF-01) to build directly on top of, per this plan's stated purpose.
- On-device visual confirmation of the one-octave vs two-octave span (and the beginner caption) remains an open post-ship UAT item, consistent with this project's standing preview-harness limitation.

---
*Phase: 34-progression-scaffold-beginner-keyboard*
*Completed: 2026-07-26*

## Self-Check: PASSED

All created/modified files confirmed present on disk; all 4 commit hashes (d3e115b, 1f88cde, 9494db4, 4c38e78) confirmed present in git log.
