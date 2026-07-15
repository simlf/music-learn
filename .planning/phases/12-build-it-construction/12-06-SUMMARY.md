---
phase: 12-build-it-construction
plan: 06
subsystem: ui, srs
tags: [svelte, ts-fsrs, dexie, vitest]

# Dependency graph
requires:
  - phase: 12-build-it-construction (plan 01)
    provides: "deck.ts's getCard(factId, mode) and widened 'formula-build' Mode/schema; facts.ts's scaleFormulaFactId(tonic)"
  - phase: 12-build-it-construction (plan 05)
    provides: "BuildSession.svelte's full construction step loop and completion summary (the 'complete' sessionState transition this plan hooks into)"
provides:
  - "BuildSession.svelte: ratingForWrongTaps(count) mapping a session's wrongTapCount to Rating.Easy/Good/Hard"
  - "BuildSession.svelte: recordConstructionOutcome(), a best-effort async write firing once on the 'complete' transition into the (factId, 'formula-build') card"
  - "BuildSession.svelte: 'SAVED TO RECALL · FORMULA-BUILD MODE' status line rendered once the write is attempted"
affects: [13-multi-modal-recall]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fire-and-forget best-effort write from a completion transition: void recordConstructionOutcome() is called synchronously inside the same setTimeout callback that sets sessionState = 'complete', with the entire body wrapped in try/catch and no state escalation on failure (mirrors RecallSession's handleReveal audio-failure silent-catch, NOT handleGrade's error-surfacing pattern)"
    - "Fetch-or-create card assembly for a single-record, non-bulk write: getCard(factId, mode) ?? { ...newCard(now), factId, factKind, mode, lastRating: null }, mirroring introduceNewCards' own CardRecord shape without going through its bulk/limit semantics"

key-files:
  created: []
  modified:
    - src/lib/components/BuildSession.svelte
    - src/lib/components/buildSession.test.ts

key-decisions:
  - "The ORIGINAL ASCII chord symbol (pickedRoot+pickedQuality, e.g. 'Cm7') is retained in a dedicated startedSymbol state set at the top of startChordConstruction, since construction.label is the re-derived display-glyph form (e.g. could differ from the ASCII catalog key) and is unsafe to reuse for the factId"
  - "fsrsSaved resets inside the existing resetSessionUiState() (already called by both startChordConstruction/startScaleConstruction and resetPicker/Build Another), so a single reset point covers every per-target reset path with no duplicated logic, matching 12-05's countUpRevealed precedent"
  - "recordConstructionOutcome is called fire-and-forget (void, not awaited) from inside the same 650ms feedbackTimer callback that sets sessionState = 'complete', so the write can never delay or block the already-rendered completion summary"

requirements-completed: [BUILD-04]

coverage:
  - id: D1
    description: "ratingForWrongTaps(count) maps 0 wrong taps to Rating.Easy, 1-2 to Rating.Good, 3+ to Rating.Hard; Rating.Again is never returned for any input"
    requirement: BUILD-04
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#BuildSession FSRS write on completion (BUILD-04, 12-06) - zero/2/3-wrong-tap rating band cases"
        status: pass
    human_judgment: false
  - id: D2
    description: "Completing a CHORD construction target writes a gradeable event to the SAME 'chord-formula:{ASCII symbol}' factId Phase 11's Recall uses, under mode 'formula-build' - a distinct (factId, mode) card from Recall's own 'formula' card for the same fact"
    requirement: BUILD-04
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#a zero-wrong-tap Cm7 completion writes a formula-build card rated Easy under the ORIGINAL ASCII chord-formula factId"
        status: pass
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#getCard is never called with mode \"formula\" and recordGrade is never called with Rating.Again"
        status: pass
    human_judgment: false
  - id: D3
    description: "Completing a SCALE construction target writes a gradeable event to scaleFormulaFactId(tonic) ('scale-formula:{tonic}'), factKind 'scale-formula', mode 'formula-build'"
    requirement: BUILD-04
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#a full G major scale completion writes a formula-build card under scale-formula:G, factKind scale-formula"
        status: pass
    human_judgment: false
  - id: D4
    description: "The write is best-effort: a getCard/recordGrade failure never blocks or alters the already-rendered completion summary, and never throws/surfaces an uncaught error"
    requirement: BUILD-04
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#a getCard rejection is swallowed silently: the completion summary still renders every element except the status line"
        status: pass
    human_judgment: false
  - id: D5
    description: "The completion summary's status line reads 'SAVED TO RECALL · FORMULA-BUILD MODE' (mono uppercase) once the write is attempted, and BuildSession.svelte never introduces cards in bulk or touches mode 'formula'"
    requirement: BUILD-04
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#never wires a mock for introduceNewCards from $lib/srs/deck (the component genuinely never reaches for it)"
        status: pass
      - kind: other
        ref: "grep -c introduceNewCards / Rating.Again / em-dash src/lib/components/BuildSession.svelte all return 0; npm run check passes"
        status: pass
    human_judgment: false
  - id: D6
    description: "Manual browser verification: build a target with zero wrong taps and confirm the status line appears; confirm building a chord never consumes/alters that fact's separate Recall ('formula') card visible on /recall; build a target with a couple of deliberate wrong taps and confirm the session still completes"
    verification: []
    human_judgment: true
    rationale: "The plan's verify block specifies a human-check for real IndexedDB persistence and cross-page (/build -> /recall) visual confirmation that the automated jsdom suite (mocked deck seam) cannot observe directly."

# Metrics
duration: 12min
completed: 2026-07-15
status: complete
---

# Phase 12 Plan 06: FSRS Write on Completion Summary

**Completing a Build-it construction session now writes a rating-mapped, best-effort gradeable event into the Phase 11 FSRS deck as the fact's `formula-build` mode card, closing the phase's BUILD-04 loop.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-15T17:16:00Z
- **Completed:** 2026-07-15T17:28:08Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `BuildSession.svelte` gains `ratingForWrongTaps(count)`: a pure, total mapping of the session's `wrongTapCount` to `Rating.Easy` (0), `Rating.Good` (1-2), or `Rating.Hard` (3+) - `Rating.Again` is never returned, matching this design's no-give-up-path invariant.
- `recordConstructionOutcome()` fires exactly once, fire-and-forget, from inside the same 650ms pacing timer that transitions `sessionState` to `'complete'`: it computes the correct `(factId, factKind)` pair (chords: `chord-formula:{ORIGINAL ASCII symbol}` via a newly retained `startedSymbol` state, reusing Phase 11's existing catalog factId; scales: `scaleFormulaFactId(tonic)`, the new Phase 12 factId shape), fetches-or-creates the `'formula-build'` card via `getCard`/`newCard`, and commits the rating via `recordGrade` - all inside a try/catch that swallows any failure silently, mirroring `RecallSession`'s `handleReveal` audio-failure precedent exactly (not `handleGrade`'s error-surfacing precedent, which was explicitly NOT the pattern this plan calls for).
- On a successful write, `fsrsSaved` flips `true` and the completion summary renders `"SAVED TO RECALL · FORMULA-BUILD MODE"` (mono uppercase) below the finalized keyboard and above the CTA row; on failure, the flag stays `false` and every other completion element (heading, rule statement, formula strip, keyboard, both CTAs) still renders normally.
- `fsrsSaved` resets to `false` inside the existing `resetSessionUiState()` (already shared by `startChordConstruction`/`startScaleConstruction`/`resetPicker`), so a single reset point covers every per-target reset path.
- No call to `introduceNewCards` and no read/write ever targets mode `'formula'` from this code path - proven both by static grep (Task 1's acceptance criteria) and by a dedicated test asserting the mocked `$lib/srs/deck` module has no `introduceNewCards` export wired at all.
- `buildSession.test.ts` extended to 33 cases (26 -> 33): the chord-path factId/rating-band suite (zero/2/3+ wrong taps -> Easy/Good/Hard), the scale-path factId/factKind suite (G major -> `scale-formula:G`), the write-failure resilience case (mocked `getCard` rejection, completion summary still fully renders, no status line, no uncaught error), and the `mode !== 'formula'` / `Rating.Again` never-used guard cases.
- Zero regressions: the full 890-test repo suite and `svelte-check` (1282 files) both pass.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rating mapping + FSRS write wiring + status line** - `c32c571` (feat)
2. **Task 2: Comprehensive test coverage (mocked deck) + phase-level end-to-end verification** - `2b3c9f8` (test)

_Both tasks carry the plan's `tdd="true"` per-task attribute; per the file-scoping the plan itself specifies (Task 1 modifies only `BuildSession.svelte`, Task 2 modifies only `buildSession.test.ts`), Task 1's implementation was verified against `npm run check` and the plan's grep acceptance criteria, then Task 2 authored the full mocked-deck test suite against that implementation and both were confirmed green together before Task 2's commit - matching the same per-task test+implementation validation precedent 12-05 established for this same file-scoping shape. No separate REFACTOR commit was needed for either task._

## Files Created/Modified
- `src/lib/components/BuildSession.svelte` - Modified: adds `getCard`/`recordGrade`/`newCard`/`Rating`/`scaleFormulaFactId` imports, `startedSymbol` and `fsrsSaved` state, `ratingForWrongTaps`/`recordConstructionOutcome` functions, the completion-transition call site inside `handleConstructTap`'s `feedbackTimer`, and the conditional status line in the completion summary markup
- `src/lib/components/buildSession.test.ts` - Modified: adds a module-level `vi.mock('$lib/srs/deck', ...)` (getCard/recordGrade mocked, matching `recallSession.test.ts`'s established pattern) and a new `describe('BuildSession FSRS write on completion (BUILD-04, 12-06)', ...)` block with 7 new cases

## Decisions Made
- `startedSymbol` is a small dedicated piece of state (not derived from `construction.label`), set at the top of `startChordConstruction` before `resetSessionUiState()` runs, since `construction.label` is the re-derived display-glyph symbol and `facts.ts`'s `chord-formula` factIds are keyed on the original ASCII `ROOTS`/`QUALITY_SUFFIXES` form - reusing `.label` would risk a factId mismatch against the Phase 11 catalog for any chord whose glyph rendering differs from its ASCII spelling.
- `recordConstructionOutcome`'s fetch-or-create step (`getCard(...) ?? { ...newCard(now), factId, factKind, mode: 'formula-build', lastRating: null }`) mirrors `introduceNewCards`' own `CardRecord` assembly shape exactly, so a construction session's first-ever completion for a given fact creates a genuinely valid New card rather than a hand-rolled partial object.
- The silent-catch precedent explicitly mirrored is `RecallSession.handleReveal`'s audio-failure catch (swallow, no state change), not `handleGrade`'s catch (which escalates to `pageState = 'error'`) - the plan's prohibitions require the completion summary to render fully regardless of write outcome, which only the `handleReveal` shape satisfies.
- Task 2's test suite mocks `$lib/srs/deck` module-wide for the whole test file (matching `recallSession.test.ts`'s convention), so all 26 pre-existing Task 1/12-04/12-05 test cases in the same file now also exercise the mocked seam rather than real IndexedDB/fake-indexeddb - verified to introduce zero behavioral change to any of those 26 cases (all still pass unmodified).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 12's full BUILD-01..04 requirement set is complete. `BuildSession.svelte` now owns the entire construction loop from picker through completion through the FSRS write, with the same `deck.ts`/`scheduler.ts` seam Phase 11's `RecallSession`/`RecallMap` already depend on.
- A chord's `formula-build` construction card and its `formula` recall card are proven independent (distinct `mode` values under the same `factId`), so Phase 13's multi-modal recall work can extend the `Mode` union further without disturbing this plan's write path.
- No architectural decisions deferred; no blockers. The plan's own human-check (real-browser /build -> /recall cross-page confirmation) remains an open manual verification item (D6 above), consistent with 12-05's own precedent of leaving jsdom-unobservable browser-feel checks as a documented, non-blocking human-judgment coverage item.

---
*Phase: 12-build-it-construction*
*Completed: 2026-07-15*

## Self-Check: PASSED

- FOUND: src/lib/components/BuildSession.svelte
- FOUND: src/lib/components/buildSession.test.ts
- FOUND: .planning/phases/12-build-it-construction/12-06-SUMMARY.md
- FOUND commit: c32c571 (feat(12-06): wire FSRS write on construction completion)
- FOUND commit: 2b3c9f8 (test(12-06): add mocked-deck coverage for FSRS write on completion)
