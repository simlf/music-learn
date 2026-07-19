---
phase: 18-your-songs-chords
plan: 03
subsystem: ui
tags: [svelte, tonal, provenance, testing-library, srs]

# Dependency graph
requires:
  - phase: 18-01
    provides: "songProvenance.ts (buildProvenanceIndex/songsForSymbol/symbolHasProvenance/normalizeSymbolForMatch), SongMark.svelte, SongFilterToggle.svelte"
provides:
  - "Recall page: REVIEW POOL SongFilterToggle bar (Review surface only, absent on Map), songFilterOn/provenanceIndex state persisted under music-learn:recall-song-filter, {#key songFilterOn} remount passing both props to RecallSession"
  - "RecallSession: songFilterOn/provenanceIndex props, applySongFilter() queue restriction in load(), SongMark renders across formula/see-play/formula-build (immediate) and hear-name (post-answer only)"
affects: [18-04-lookup-song-mark]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-surface filter key: Recall's music-learn:recall-song-filter is independent of Drills' music-learn:drills-song-filter (18-02), same read/write try-catch shape, same SongFilterToggle component"
    - "Spoiler-safe reveal-only mark: SongMark placed strictly inside the existing {#if hearNameAnswered} feedback block rather than adding a new conditional, so the pre/post-answer split is enforced by the branch that already gates the answer disclosure"

key-files:
  created:
    - src/routes/recallSongFilter.test.ts
  modified:
    - src/routes/recall/+page.svelte
    - src/lib/components/RecallSession.svelte
    - src/lib/components/recallSession.test.ts

key-decisions:
  - "applySongFilter() is a named helper inside RecallSession (not inlined in load()) so the filter/fallback contract (filter ON + non-empty index restricts; filter ON + empty index leaves due unchanged) has one clear, testable seam, mirroring 18-02's drawFromSymbols/drawFromPool branch-at-the-call-site pattern"

requirements-completed: [SONG-01, SONG-02]

coverage:
  - id: D1
    description: "Recall page renders a REVIEW POOL SongFilterToggle on the Review surface only (absent on Map), defaulting to aria-pressed=false, persisting 'true' under music-learn:recall-song-filter on click"
    requirement: "SONG-02"
    verification:
      - kind: unit
        ref: "src/routes/recallSongFilter.test.ts (Recall page REVIEW POOL filter toggle (SONG-02) describe block)"
        status: pass
    human_judgment: false
  - id: D2
    description: "RecallSession.load() restricts the due-card queue to chord-formula cards with active-song provenance when songFilterOn is true and the provenance index is non-empty, dropping non-song chords and non-chord facts; leaves the queue unfiltered when the index is empty (no dead-end)"
    requirement: "SONG-02"
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts (RecallSession song-filter queue restriction (SONG-02, 18-03) describe block)"
        status: pass
    human_judgment: false
  - id: D3
    description: "SongMark renders immediately for a song chord in formula, see-play, and formula-build modes; in hear-name it renders ONLY inside the post-answer feedback block, never before a choice is picked"
    requirement: "SONG-01"
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts (RecallSession SongMark rendering (SONG-01, 18-03) describe block)"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-07-18
status: complete
---

# Phase 18 Plan 03: Recall Song-Provenance Marks + Review-Pool Filter Summary

**Recall page gains a REVIEW POOL "From my songs" toggle (`music-learn:recall-song-filter`) that restricts the due-card queue to active-song chords, plus SongMark renders across all four recall modes with hear-name locked to post-answer-only for spoiler safety.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-07-18T12:07:18Z
- **Completed:** 2026-07-18T12:27:00Z
- **Tasks:** 3
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- `/recall`'s Review surface now renders a `SongFilterToggle` labelled `REVIEW POOL`, independent of Drills' own filter key, persisted under `music-learn:recall-song-filter` (default off, try/catch-guarded read/write). The bar is rendered only when `mode === 'review'` and never on Map. A `provenanceIndex` is built once at the page level and passed down alongside `songFilterOn`; `RecallSession` remounts via `{#key songFilterOn}` so toggling immediately re-runs the filtered `load()`.
- `RecallSession` gained two new optional props (`songFilterOn`, `provenanceIndex`, both default-safe: omitting them reproduces the pre-18-03 unfiltered behavior byte-for-byte) and a new `applySongFilter()` helper called inside `load()` right after `getDueCards()`. When the filter is ON and the index is non-empty, only chord-formula cards whose symbol has active-song provenance survive; non-song chords and non-chord facts (interval-size, scale-degree) are dropped. When the filter is ON but the index is empty (no derivable song chords), the queue is left unfiltered so the session can never dead-end - the page's own `songFallbackActive` note covers that case visually.
- `SongMark` now renders beside the chord in `formula` (next to the `ChordGlyph` in the prompt), `see-play` (next to its own `ChordGlyph`), and `formula-build` (above the embedded `BuildSession`) - all three immediately, since the chord symbol is already visible or the task is building from a known target in those modes. In `hear-name`, the mark is placed strictly inside the existing `{#if hearNameAnswered}` feedback block (never before it), since the choice-grid buttons in that mode ARE the candidate answers - marking pre-answer would leak which button is correct.

## Task Commits

Each task was committed atomically:

1. **Task 1: Recall page filter bar + state + prop passing** - `aa5e2e3` (feat)
2. **Task 2: RecallSession song-filter queue restriction** - `3915372` (feat)
3. **Task 3: SongMark renders across recall modes (spoiler-safe)** - `42de252` (feat)

## Files Created/Modified
- `src/routes/recall/+page.svelte` - `readRecallSongFilter()`, `songFilterOn` state, `provenanceIndex`, `songFallbackActive` derived, `toggleSongFilter()`, REVIEW POOL filter bar (Review-only), `{#key songFilterOn}` remount passing `songFilterOn` + `provenanceIndex` to `RecallSession`
- `src/routes/recallSongFilter.test.ts` - 3 tests: default `aria-pressed=false` + REVIEW POOL label, persistence to `localStorage` on click, absence on the Map surface
- `src/lib/components/RecallSession.svelte` - new `songFilterOn`/`provenanceIndex` props, `applySongFilter()` queue-restriction helper wired into `load()`, `SongMark` renders at all four mode anchors (hear-name gated inside `{#if hearNameAnswered}`)
- `src/lib/components/recallSession.test.ts` - `renderRecallSession()` helper extended to accept the two new props; 2 new tests for the queue restriction (song chord kept, non-song chord + non-chord fact dropped; empty-index fallback), 5 new tests for `SongMark` rendering (immediate in formula/see-play/formula-build, absent for a non-song chord, pre/post-answer spoiler-safety split in hear-name)

## Decisions Made
- `applySongFilter()` is a dedicated named function inside `RecallSession` (not inlined into `load()`'s body) so the filter/fallback branching has one obvious, independently-readable seam - mirrors 18-02's `drawFromSymbols`/`drawFromPool` branch-at-the-call-site convention rather than duplicating that logic's shape.
- The `hear-name` `SongMark` is placed inside the SAME `{#if hearNameAnswered}` block that already gates `RevealInsight`/the correct/wrong feedback, rather than introducing a new conditional - the pre/post-answer contract is enforced by the exact branch structure that already exists for revealing the answer, so there's no second place the spoiler rule could drift out of sync.

## Deviations from Plan
None - plan executed exactly as written. The plan's line-number references were stale (a concurrent quick task had removed the Phase 15 keyboard dock and restored inline keyboards before this plan ran), but the described logic (props, `load()` restriction point, all four SongMark anchors) mapped directly onto the live file with no structural surprises.

## Issues Encountered
One test-authoring correction (not a plan deviation, caught before any commit): the first draft of the queue-restriction test built a hand-rolled `provenanceIndex` keyed on the raw string `'Cm7'`, but `songProvenance.ts`'s index keys are normalized via `normalizeSymbolForMatch` (a `${rootChroma}:${quality}` composite per 18-01), not raw symbol strings. Fixed by importing `normalizeSymbolForMatch` and building the test fixture's key the same way the real module does. Caught immediately by the test's own first run; no implementation code was affected.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
All three tasks are committed, the full project test suite passes (1030 tests across 74 files, up from the pre-existing 1020 baseline plus this plan's 10 new tests), and `npm run check` is clean (1295 files, 0 errors, 0 warnings). Grep confirms exactly one `SongMark` in the `hear-name` branch, strictly inside the `{#if hearNameAnswered}` block, and no em dashes were introduced in any added copy.

Ready for Plan 04 (Lookup surface): `songsForSymbol`/`buildProvenanceIndex`/`SongMark` are now proven across three of Phase 18's four target surfaces (Drills, Recall, and - pending - Lookup), with two independent, correctly-scoped localStorage filter keys (`music-learn:drills-song-filter`, `music-learn:recall-song-filter`) established as the per-surface persistence pattern Plan 04 should NOT need to replicate (Lookup has no review/practice queue to filter, only a mark to render).

---
*Phase: 18-your-songs-chords*
*Completed: 2026-07-18*

## Self-Check: PASSED

All 5 files verified present on disk; all 3 task commit hashes (`aa5e2e3`, `3915372`, `42de252`) verified present in git log.
