---
phase: quick-260804-1uq
plan: 01
subsystem: ui
tags: [svelte, piano-keyboard, chord-drills, i18n]

requires:
  - phase: quick-260803-u3g
    provides: showIntervalTicks tick rail wired into PracticeChordDrill's three reveal keyboards
provides:
  - "PianoKeyboard: every adjacent-tone gap of a revealed chord is now readable, either drawn on the tick rail or badged on the arrival key when the rail cannot draw it (wrapped/backwards gaps, or any gap on a stacked two-row board)"
  - "PracticeChordDrill: CountingChipRow removed from the feedback block (reveal keyboard now carries the same shape information with real tap targets)"
affects: [piano-keyboard, practice-chord-drill, drills-i18n]

tech-stack:
  added: []
  patterns:
    - "One derivation (railLayout) computes both the rail's drawn gaps and the arrival-key badge map in a single walk, so 'never doubled' is structural rather than a duplicated condition"
    - "Badge maps keyed by SpelledNote object identity (never key index/kind), since a stacked row's BlackKey carries only a row-relative position with no absolute black-key index"

key-files:
  created: []
  modified:
    - src/lib/components/PianoKeyboard.svelte
    - src/lib/components/components.test.ts
    - src/lib/components/PracticeChordDrill.svelte
    - src/lib/components/PracticeChordDrill.test.ts
    - src/lib/i18n/messages/drills.ts

key-decisions:
  - "D-01 (user-locked): undrawable gaps get a badge on the gap's ARRIVAL key (paper-bright bg, ink border, 9px mono +label), never a redrawn/backwards line"
  - "D-02 (user-locked): CountingChipRow call site removed from PracticeChordDrill only; the component, its test file, and its drills.chip.* strings stay untouched (ProgressionDrill/InversionDrill still mount it)"
  - "stacked is no longer part of intervalGaps' bail condition - a stacked board is exactly where every gap now needs a badge, since the rail cannot cross a row break that does not exist in the DOM"

patterns-established:
  - "Gap-carrier fallback pattern: when a rail/line geometry can't be drawn honestly, fall back to a small badge on the arrival endpoint rather than dropping the information silently"

requirements-completed: [QUICK-260804-1uq]

coverage:
  - id: D1
    description: "A wrapped gap the rail cannot draw (Gm on a one-octave board: D wraps left of the root) renders as a +M3 badge on the D key, while the rail still draws the drawable G→B♭ gap"
    requirement: "QUICK-260804-1uq"
    verification:
      - kind: unit
        ref: "src/lib/components/components.test.ts#showIntervalTicks: a wrapped gap the rail cannot draw becomes a +label badge on its arrival key"
        status: pass
    human_judgment: false
  - id: D2
    description: "On a stacked two-row board the rail stays absent and every consecutive gap is carried by a badge on its arrival key"
    requirement: "QUICK-260804-1uq"
    verification:
      - kind: unit
        ref: "src/lib/components/components.test.ts#showIntervalTicks: a stacked board draws no rail and badges every gap"
        status: pass
    human_judgment: false
  - id: D3
    description: "A gap the rail draws never also gets a badge, and omitting showIntervalTicks renders neither rail nor badge (byte-identical to before)"
    requirement: "QUICK-260804-1uq"
    verification:
      - kind: unit
        ref: "src/lib/components/components.test.ts#showIntervalTicks: a gap the rail draws never also gets a badge"
        status: pass
      - kind: unit
        ref: "src/lib/components/components.test.ts#non-regression: omitting showIntervalTicks renders no gap badges"
        status: pass
    human_judgment: false
  - id: D4
    description: "PracticeChordDrill's feedback block no longer renders a counting-chip row after answering (any of the three modes, hit or miss); the reveal keyboard's rail carries the same gap information instead"
    requirement: "QUICK-260804-1uq"
    verification:
      - kind: unit
        ref: "src/lib/components/PracticeChordDrill.test.ts#PracticeChordDrill: reveal keyboard carries the chord shape (quick-260804-1uq) - after a correct answer, no counting-chip row exists and the reveal keyboard carries the m7 gaps"
        status: pass
      - kind: unit
        ref: "src/lib/components/PracticeChordDrill.test.ts#PracticeChordDrill: reveal keyboard carries the chord shape (quick-260804-1uq) - after a wrong answer, no counting-chip row exists and the reveal keyboard carries the m7 gaps too"
        status: pass
    human_judgment: false
  - id: D5
    description: "CountingChipRow.svelte, its test file, ProgressionDrill.svelte and InversionDrill.svelte are untouched by the removal"
    requirement: "QUICK-260804-1uq"
    verification:
      - kind: unit
        ref: "npx vitest run (full suite: 148 files, 2543 tests passed, including CountingChipRow.test.ts, progressionDrill.test.ts, inversionDrill.test.ts)"
        status: pass
      - kind: other
        ref: "git diff --name-only across both task commits lists only the 5 files_modified"
        status: pass
    human_judgment: false
  - id: D6
    description: "On-device legibility of the new badge on a real phone (one-octave wrapped board, stacked two-row board) - not automatable in jsdom, no contrast pair to compute"
    verification: []
    human_judgment: true
    rationale: "Plan's own <verification> section defers this explicitly to on-device eyes; jsdom cannot render real pixel layout or evaluate visual collision."

duration: 45min
completed: 2026-08-04
status: complete
---

# Quick Task 260804-1uq: Wrapped-gap interval badge fallback Summary

**Arrival-key `+m3`/`+M3`/`+P4` badges recover every gap the tick rail's honest-geometry guard used to drop silently, and PracticeChordDrill's now-redundant CountingChipRow feedback row is removed.**

## Performance

- **Duration:** 45 min
- **Completed:** 2026-08-04T17:07:57Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `PianoKeyboard`'s `intervalGaps` derivation is split into one `railLayout` walk that produces both the drawn rail gaps and a `SpelledNote`-keyed badge map, so a wrapped/backwards gap (one-octave `Gm`) or ANY gap on a stacked two-row board now renders a `+label` badge on its arrival key instead of being dropped.
- New `.piano-keyboard__gapbadge` / `--black` styles sit just below the black-key band (white keys) or one row under the root-relative interval badge (black keys), never colliding with the existing `--ivbadge`, `--bass-ring`, or `NoteLabel`.
- Four new component tests pin the wrapped-gap badge, the stacked-board all-badges case, the never-doubled invariant, and the omitted-prop non-regression.
- `PracticeChordDrill`'s `<CountingChipRow>` call site, its import, and the orphaned `drills.aria.chordShape` i18n key (both locales) are removed; the component doc comment now explains the supersession.
- The practice-drill test suite is repointed at the reveal keyboard's gap labels instead of the removed chip row, keeping the same regression coverage under a new invariant.

## Task Commits

Each task was committed atomically:

1. **Task 1: Badge the gaps the tick rail cannot draw, on the arrival key** - `c5365c5` (feat)
2. **Task 2: Drop CountingChipRow from the practice drill's feedback block** - `ebb6fe4` (refactor)

_No TDD RED/GREEN split commits were required beyond the task-level tests-then-implementation flow described in the plan; both task commits bundle their own new/updated tests with the implementation, matching the plan's "write tests first, watch fail, implement" instruction executed within a single commit per task._

## Files Created/Modified

- `src/lib/components/PianoKeyboard.svelte` - `railLayout` derivation (drawn gaps + badge map), `gapBadgeFor` accessor, badge markup on both white/black keys, `.piano-keyboard__gapbadge`/`--black` styles, refreshed doc comments
- `src/lib/components/components.test.ts` - 4 new tests: wrapped-gap badge, stacked-board all-badges, never-doubled, omitted-prop non-regression
- `src/lib/components/PracticeChordDrill.svelte` - removed `CountingChipRow` import + call site; rewrote the `E2/SHAPE-01` doc paragraph to record the supersession
- `src/lib/components/PracticeChordDrill.test.ts` - repointed the `counting-chip row` describe block at the reveal keyboard's gap labels; deleted the now-vacuous pre-answer leak test
- `src/lib/i18n/messages/drills.ts` - deleted `drills.aria.chordShape` from both `en` and `fr` dictionaries

## Decisions Made

- `stacked` was removed from `intervalGaps`'/`railLayout`'s bail condition (it used to short-circuit to `[]` on a stacked board) - a stacked board is exactly the case that now needs every gap badged, and gaps stay empty there by construction (badges absorb them all), so the existing `intervalGaps.length > 0` rail gate is unaffected.
- Badge lookup keys by the `SpelledNote` object itself (matching `noteAssignment`'s own identity), not by key kind+index, because a stacked row's `BlackKey.position` is row-relative with no absolute black-key index - an index key would silently miss every stacked black key.
- Badge placement: `top: calc(60% + spacing-xs)` on white keys (just below where black keys end, since a white key's child cannot paint above a sibling black key), `top: spacing-lg` on black keys (one row under their own root-relative `--ivbadge`).

## Deviations from Plan

None - plan executed exactly as written, including both LOCKED user decisions (D-01 badge rendering, D-02 CountingChipRow removal scope).

## Issues Encountered

None. The stacked-board test drove via the documented `clientWidth` prototype stub + double `tick()` await, and it engaged stacking on the first attempt (no test-seam fix needed).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `npx vitest run`: 148 test files, 2543 tests, all passing (includes `src/lib/i18n/unusedKeys.test.ts`, `CountingChipRow.test.ts`, `progressionDrill.test.ts`, `inversionDrill.test.ts`).
- `npm run check` (svelte-check): 1473 files, 0 errors, 0 warnings - no new type errors introduced.
- `grep -v '^\s*\*' src/lib/components/PianoKeyboard.svelte | grep -c 'toPct <= fromPct'` returns `1` (guard not duplicated).
- `git diff --name-only` across both task commits lists exactly the 5 `files_modified` files - no `chordPresentation.ts`, `CountingChipRow.svelte`, `CountingChipRow.test.ts`, `ProgressionDrill.svelte`, or `InversionDrill.svelte` touched.
- Deferred to on-device visual UAT (not automatable in jsdom, no contrast pair to compute): badge legibility on a real phone for a one-octave wrapped-tone board (`Gm`) and a stacked two-row two-octave board where every key carries a badge.

---
*Phase: quick-260804-1uq*
*Completed: 2026-08-04*

## Self-Check: PASSED

All 5 modified source files and the SUMMARY.md itself confirmed present on disk; both task commit hashes (`c5365c5`, `ebb6fe4`) confirmed present in git log.
