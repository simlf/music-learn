---
phase: 27-practice-hub
plan: 05
subsystem: ui
tags: [svelte, practice-hub, fsrs, hybrid-queue, voicings, progressions, e2e]

# Dependency graph
requires:
  - phase: 27-practice-hub
    provides: "the thin /practice host + load() FSRS skeleton (27-04); composePracticeQueue/syntheticVoicingItems/syntheticProgressionItems/filterVoicingsBySong (27-01); ShellVoicingDrill/ProgressionDrill embed seams (27-02)"
provides:
  - "load() gates synthetic voicing/progression items on the FSRS due signal (PRAC-05 single-type-due gate): voicing synthetics restricted to DUE seventh chords, progression synthetics emitted only when a chord-formula card is due, both halves restricted by the song filter (progressions omitted entirely under the filter)"
  - "the reviewing state's render seam routes 'voicing'/'progression' queue items to ShellVoicingDrill/ProgressionDrill via their 27-02 embed props"
  - "completeSynthetic(): advances the queue for a synthetic item without ever calling deck.recordGrade (T-27-05-01)"
  - "tests/practice-hub-mix.e2e.test.ts: REG-02 end-to-end coverage (five-family interleave, single-type-due gate, song-filter steering, grade-commit split) written ahead of Phase 31"
affects: [30-nav-cutover, 31-no-regression-gate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "practiceQueue's synthetic builders are gated in the HOST's load(), not inside practiceQueue.ts itself: the due-chord-symbol set is computed once from selectedCards (the already-FSRS-selected carded half) and used both to scope syntheticVoicingItems' input map AND to decide whether syntheticProgressionItems runs at all - keeping the pure module free of any due/gating policy."
    - "Partial vi.mock of a pure module via importOriginal: tests/practice-hub-mix.e2e.test.ts overrides only practiceQueue's syntheticProgressionItems (undeterministic rng-drawn template/key) while composePracticeQueue/cardsToQueueItems/syntheticVoicingItems/filterVoicingsBySong/advanceHybridQueue all run REAL, so the actual weave/gate/filter logic is genuinely exercised, not mocked away."
    - "Fisher-Yates-with-constant-rng determinism: generateIntervalQuestion's final choices shuffle over a fixed Math.random()=0.1 collapses the 4-item [target, ...distractors] array to [d1, d2, d3, target] every time - the correct choice is provably always LAST, letting an e2e test click the correct answer without needing to read a reveal first."

key-files:
  created:
    - tests/practice-hub-mix.e2e.test.ts
  modified:
    - src/routes/practice/+page.svelte
    - tests/practice-hub.e2e.test.ts

key-decisions:
  - "SYNTHETIC_PROGRESSION_COUNT = 2: a small, session-scaled constant rather than a per-due-card-derived formula - progressions are the heaviest single item in the mix (4-bar earn-the-symbol grid), so a flat low count is 'enough variety' without crowding out the carded half. Claude's discretion per 27-CONTEXT."
  - "completeSynthetic() records NO telemetry event (no recordPracticeAnswer call) for voicing/progression completions - the plan's action text explicitly scopes the host to 'only advances' for synthetic items, unlike completeCarded/completeBuild which do record telemetry for their carded families. This keeps the synthetic seam free of a new event shape no family's own contract requires."
  - "Progressions are omitted ENTIRELY when the song filter is ON (rather than partially filtered) since progressions are key/template-based, not single-song-chord based - there is no principled way to restrict a 4-bar ii-V-I progression to 'one song's chord', so the chosen policy is to drop the whole family under the filter rather than guess at a partial restriction (documented in-line per the plan's explicit instruction)."
  - "The due-chord-symbol gate reads selectedCards (the post-selectReviewCards carded half), not the raw post-filter due[] array - this is the set actually entering the carded half of the session, so a chord due but excluded by selectReviewCards' per-fact cap never spuriously unlocks a voicing/progression synthetic."

patterns-established:
  - "Host-level due-gating for synthetic families: any FUTURE synthetic (non-FSRS) family added to this queue should compute its own due-signal gate in load() from selectedCards, mirroring this plan's dueChordSymbols Set, rather than pushing gating logic into practiceQueue.ts's pure builders."

requirements-completed: [PRAC-02, PRAC-04, PRAC-05]

coverage:
  - id: D1
    description: "load() builds voicing synthetics only for DUE seventh chords (gated on the carded half's actual due chord-formula symbols) and progression synthetics only when at least one chord-formula card is due - an interval-only due set yields zero synthetics of either kind."
    requirement: "PRAC-05"
    verification:
      - kind: e2e
        ref: "tests/practice-hub-mix.e2e.test.ts#single-type-due gate (PRAC-05) > an interval-only due set yields an intervals-only session - no other family ever appears"
        status: pass
    human_judgment: false
  - id: D2
    description: "The reviewing state renders ShellVoicingDrill/ProgressionDrill via their 27-02 embed seams (embedSymbol/embedTemplateId+embedKey, onComplete) for synthetic queue items, sharing the same family-cue chip and {#key} remount mechanism as the carded families."
    requirement: "PRAC-02"
    verification:
      - kind: e2e
        ref: "tests/practice-hub-mix.e2e.test.ts#five-family interleaving (PRAC-02) > interleaves all five families in one session with no family running three-in-a-row"
        status: pass
    human_judgment: false
  - id: D3
    description: "completeSynthetic() advances the queue (Rating.Good, never re-enqueued) and never calls deck.recordGrade for a voicing/progression item - synthetic items carry no FSRS card and never write scheduling state (T-27-05-01)."
    requirement: "PRAC-02"
    verification:
      - kind: e2e
        ref: "tests/practice-hub-mix.e2e.test.ts#grade-commit split (REG-02) > commits an FSRS grade for the carded item but never for the synthetic voicing/progression items"
        status: pass
    human_judgment: false
  - id: D4
    description: "The song filter (PRAC-04) restricts BOTH halves of the merged queue: the carded half via the existing applySongFilter, and voicing synthetics via filterVoicingsBySong against the same provenance index; progression synthetics are omitted entirely under the filter."
    requirement: "PRAC-04"
    verification:
      - kind: e2e
        ref: "tests/practice-hub-mix.e2e.test.ts#song filter steers the merged queue (PRAC-04) > restricts both the carded half and the voicing synthetics to the one provenance chord, and omits progressions entirely"
        status: pass
    human_judgment: false
  - id: D5
    description: "One /practice session interleaves all five families with no family running three-in-a-row when 2+ families have due/available items (REG-02 five-family interleave, formally Phase 31 but proven here per 27-CONTEXT's instruction)."
    requirement: "PRAC-02"
    verification:
      - kind: e2e
        ref: "tests/practice-hub-mix.e2e.test.ts#five-family interleaving (PRAC-02) > interleaves all five families in one session with no family running three-in-a-row"
        status: pass
    human_judgment: false

# Metrics
duration: 40min
completed: 2026-07-25
status: complete
---

# Phase 27 Plan 05: Synthetic Weaving + REG-02 Coverage Summary

**Wires syntheticVoicingItems/syntheticProgressionItems into `/practice`'s load(), gated on the FSRS due signal (PRAC-05), rendered via the Plan 02 embed seams, and locks the full REG-02 behavior (five-family interleave, single-type-due gate, song-filter steering, grade-commit split) with a new end-to-end test suite.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-07-25T02:24Z
- **Completed:** 2026-07-25T02:42Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- `load()` computes a `dueChordSymbols` set from `selectedCards` (the actual FSRS-selected carded half, not the raw due[] array) and uses it to gate BOTH synthetic families: voicing synthetics are restricted to seventh chords whose symbol is in that due set, and progression synthetics (a small, session-scaled count of 2) are only emitted when at least one chord card is due - an interval-only due set yields zero synthetics of either kind (PRAC-05).
- The song filter restricts both halves exactly per 27-CONTEXT's policy: voicing synthetics pass through `filterVoicingsBySong` against the same provenance index the carded half already uses; progression synthetics are omitted entirely under the filter (documented in-line: progressions are key/template-based, with no principled partial restriction to one song's chord).
- The reviewing state's `{#key}` block now renders `ShellVoicingDrill`/`ProgressionDrill` for `voicing`/`progression` queue items via their Plan 02 embed props (`embedSymbol` / `embedTemplateId`+`embedKey`, `onComplete`), sharing the same family-cue chip and `cardEpoch` remount mechanism as the three carded families.
- `completeSynthetic()` advances the local queue (`advanceHybridQueue(queue, Rating.Good)`, never re-enqueued) and NEVER calls `deck.recordGrade` for a synthetic item - the HYBRID model's non-persisted contract (T-27-05-01).
- `tests/practice-hub-mix.e2e.test.ts` (4 tests) proves all four REG-02 behaviors end-to-end: five-family interleaving with no 3-in-a-row, the single-type-due gate, song-filter steering of the merged queue, and the carded-vs-synthetic grade-commit split - using a partial `vi.mock` of `practiceQueue.ts` that stubs only the rng-drawn `syntheticProgressionItems` for determinism while every weave/gate/filter function (`composePracticeQueue`, `cardsToQueueItems`, `syntheticVoicingItems`, `filterVoicingsBySong`, `advanceHybridQueue`) runs REAL.

## Task Commits

Each task was committed atomically:

1. **Task 1: build + gate synthetic items in load() and render voicing/progression branches** - `a26968c` (feat)
2. **Task 2: REG-02 end-to-end coverage for the merged five-family session** - `012f963` (test)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/routes/practice/+page.svelte` - `load()`'s due-chord gating for synthetic voicing/progression items; the `voicing`/`progression` render branches; `completeSynthetic()`
- `tests/practice-hub-mix.e2e.test.ts` - new REG-02 e2e suite (5-family interleave, single-type-due gate, song-filter steering, grade-commit split)
- `tests/practice-hub.e2e.test.ts` - Rule 1 fix: mocks `practiceQueue`'s synthetic builders to `[]` so its carded-only grading tests aren't polluted by the newly-wired due-gated synthetics (see Deviations)

## Decisions Made
- `SYNTHETIC_PROGRESSION_COUNT = 2`: a flat, small constant rather than a formula scaled off the due-card count - progressions are the heaviest single item in the merged session, so keeping the count low avoids crowding out the carded half while still adding real variety. Left to Claude's discretion per 27-CONTEXT.
- `completeSynthetic()` does not call `recordPracticeAnswer` - the plan's action text scopes the handler to "the host only advances," distinct from `completeCarded`/`completeBuild` which do record telemetry for their carded families. No family's own contract requires a new telemetry event shape for voicing/progression completions.
- Progressions are dropped entirely (not partially restricted) under the song filter, since a 4-bar ii-V-I progression has no principled way to be "restricted to one song's chord" the way a single carded chord item does.
- The due-gate reads `selectedCards` (post-`selectReviewCards`, the actual carded-half selection), not the raw post-song-filter `due[]` array, so a chord due but excluded by `selectReviewCards`'s per-fact cap never spuriously unlocks a synthetic.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Full-suite regression: Plan 04's carded-only grading tests polluted by the newly-wired synthetics**
- **Found during:** Task 1, running `npm test -- --run tests/practice-hub.e2e.test.ts` per the plan's own verification requirement (full suite must stay green)
- **Issue:** Three of Plan 04's tests (`practice-hub.e2e.test.ts`) seed a due chord-formula card (e.g. `Dm7`) to test carded name-it/build-it grading in isolation. Once Task 1 wired the PRAC-05 gate into `load()`, any due chord-formula card now ALSO triggers voicing/progression synthesis (since Dm7/Cm7 are seventh chords and any due chord card unlocks progression synthetics), so the previously single-item queue those tests assumed became a multi-family queue their test bodies weren't written to walk, breaking 3 tests.
- **Fix:** Added a partial `vi.mock('$lib/practice/practiceQueue', importOriginal, ...)` in `tests/practice-hub.e2e.test.ts` that stubs `syntheticVoicingItems`/`syntheticProgressionItems` to `[]`, keeping that file's scope on carded-family grading mechanics in isolation (its original Plan 04 intent). The full five-family interleave, gate, filter, and grade-split behaviors are now covered exhaustively (with the REAL builders) in the new `tests/practice-hub-mix.e2e.test.ts`.
- **Files modified:** `tests/practice-hub.e2e.test.ts`
- **Verification:** `npm test -- --run tests/practice-hub.e2e.test.ts` (9/9 pass); full suite (116 files / 1596 tests) green.
- **Committed in:** `a26968c` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking full-suite regression in an out-of-plan-scope file)
**Impact on plan:** The fix was required to satisfy the plan's own `<verification>` block ("tests/practice-hub-mix.e2e.test.ts + tests/practice-hub.e2e.test.ts pass; full npm test suite green"). No scope creep beyond what that gate required; Plan 04's test intent (isolated carded-family grading) is preserved, and the new mixed-family behavior gets its own dedicated, more thorough test file per the plan's Task 2.

## Issues Encountered
- `generateIntervalQuestion`'s final choices shuffle, under a fixed `Math.random()` mock, deterministically collapses the correct-answer position to LAST in the 4-item choice array (worked out by hand-tracing the Fisher-Yates loop) - the single-type-due-gate test initially clicked the first choice and hit a runaway re-enqueue loop (the same wrong choice is always regenerated identically under a constant rng). Fixed by clicking the last choice instead, documented in-line in the test.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 27 (Practice Hub) is now feature-complete for this milestone's scope: `/practice` composes and renders all five drill families in one interleaved, FSRS+synthetic hybrid session, gated by due signal, steered by the song filter, with the correct grade-commit split.
- `npm run check` is clean (0 errors/warnings, 1380 files); the full suite (116 files / 1596 tests) is green.
- `/drills`, `/voicings`, `/progressions`, `/recall` remain unchanged and untouched this plan (verified: no edits to those route files).
- Phase 30 (nav cutover) can now safely point at `/practice` as the single entry point; Phase 31 (no-regression gate) can lean on `tests/practice-hub-mix.e2e.test.ts`'s REG-02 coverage as its own regression baseline rather than re-deriving it from scratch.

---
*Phase: 27-practice-hub*
*Completed: 2026-07-25*

## Self-Check: PASSED

- FOUND: src/routes/practice/+page.svelte
- FOUND: tests/practice-hub-mix.e2e.test.ts
- FOUND: tests/practice-hub.e2e.test.ts
- FOUND: .planning/phases/27-practice-hub/27-05-SUMMARY.md
- FOUND commit: a26968c
- FOUND commit: 012f963
