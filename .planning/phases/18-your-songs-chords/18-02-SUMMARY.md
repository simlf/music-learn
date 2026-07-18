---
phase: 18-your-songs-chords
plan: 02
subsystem: ui
tags: [svelte, tonal, provenance, testing-library, practice-pool]

# Dependency graph
requires:
  - phase: 18-01
    provides: "songProvenance.ts (buildProvenanceIndex/songsForSymbol/drillableSongSymbols), SongMark.svelte, SongFilterToggle.svelte"
provides:
  - "pool.ts: drawFromSymbols(symbols, ctx, config?, rng?) — the SONG-02 restricted (not just weighted) draw primitive, reusing needFor/cappedShares/applyInterleaving/weightedDraw"
  - "Drills page: PRACTICE POOL SongFilterToggle bar, songFilterOn/songFallbackActive state persisted under music-learn:drills-song-filter, SongMark on construction + identification chord prompts"
affects: [18-03-recall-song-filter, 18-04-lookup-song-mark]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Restricted draw (drawFromSymbols) as a sibling primitive to the existing weighted draw (drawFromPool): additive-only, same need/cap/interleave machinery, returns null for an empty candidate set so the caller can fall back to the full library"
    - "Filter-restricted question draw: freshPoolQuestion branches on a page-level boolean BEFORE calling into the pool, never mutating PoolContext.songSymbols (that stays the separate, always-on 60% weighting seam)"

key-files:
  created:
    - src/routes/drillsSongFilter.test.ts
  modified:
    - src/lib/practice/pool.ts
    - src/lib/practice/pool.test.ts
    - src/routes/drills/+page.svelte

key-decisions:
  - "drawFromSymbols is a pure additive export beside drawFromPool, not a parameter added to drawFromPool, so the proven 0/60/25/15 bucket-weighting tests are provably untouched (no shared code path to regress)"
  - "The restricted-draw branch lives in freshPoolQuestion (not poolContext()): poolContext().songSymbols keeps feeding the existing always-on 60% song-bucket weighting for the filter-OFF case, per the plan's explicit prohibition"

requirements-completed: [SONG-01, SONG-02]

coverage:
  - id: D1
    description: "drawFromSymbols(symbols, ctx, config?, rng?) draws only from the passed candidate set (need-weighted, capped, interleaved) and returns null for an empty set"
    requirement: "SONG-02"
    verification:
      - kind: unit
        ref: "src/lib/practice/pool.test.ts (drawFromSymbols (SONG-02 restricted draw) describe block)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Drills renders a PRACTICE POOL SongFilterToggle defaulting to aria-pressed=false, persisting 'true' under music-learn:drills-song-filter on click"
    requirement: "SONG-02"
    verification:
      - kind: unit
        ref: "src/routes/drillsSongFilter.test.ts (PRACTICE POOL filter toggle (SONG-02) describe block)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A drawn song chord shows its SongMark on both the construction and identification prompts; a non-song chord shows no mark"
    requirement: "SONG-01"
    verification:
      - kind: unit
        ref: "src/routes/drillsSongFilter.test.ts (SongMark on the Drills prompt (SONG-01) describe block)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Filter ON with a drillable song chord restricts the draw via drawFromSymbols; filter ON with no drillable song chords shows the fallback note and falls back to the full library, with the toggle staying visually ON"
    requirement: "SONG-02"
    verification:
      - kind: unit
        ref: "src/routes/drillsSongFilter.test.ts (restricts the draw / fallback note tests)"
        status: pass
    human_judgment: false

duration: 30min
completed: 2026-07-18
status: complete
---

# Phase 18 Plan 02: Drills Song-Provenance Marks + Practice Pool Filter Summary

**`drawFromSymbols` genuine-restriction draw primitive in `pool.ts`, wired into the Drills page as a PRACTICE POOL "From my songs" toggle (with a locked no-active-songs fallback) plus SongMark on every song-chord prompt.**

## Performance

- **Duration:** 30 min
- **Started:** 2026-07-18T13:44:00Z
- **Completed:** 2026-07-18T14:01:27Z
- **Tasks:** 2
- **Files modified:** 4 (1 created, 3 modified in this plan's own commits)

## Accomplishments
- `drawFromSymbols(symbols, ctx, config?, rng?)`: a new additive export in `pool.ts` that draws ONLY from a caller-supplied candidate set (need-weighted via the existing `needFor`/`cappedShares`, honoring the existing max-same-quality-run interleaving), returning `null` for an empty set. `drawFromPool` and its proven 0/60/25/15 bucket weighting are untouched.
- Drills page now imports the Plan 01 shared primitives (`SongMark`, `SongFilterToggle`, `songProvenance.ts`) and wires:
  - A `provenanceIndex` built once at init, feeding `SongMark` under both the construction ("Click the notes for...") and identification ("Name this chord.") chord prompts, unconditional on filter state (SONG-01).
  - A `PRACTICE POOL` `SongFilterToggle` bar above the drill card. `songFilterOn` persists under `music-learn:drills-song-filter` (default off, degrades to off on storage failure). Toggling re-draws the current question immediately if unanswered.
  - `freshPoolQuestion` branches on `songFilterOn`: when on and `drillableSongSymbols()` is non-empty, the draw is genuinely restricted via `drawFromSymbols`; when on but nothing is derivable, `songFallbackActive` flips true (rendering the locked fallback note) and the draw falls back to `drawFromPool` — the toggle itself stays visually on.
- `src/routes/drillsSongFilter.test.ts` (new, 7 tests): SongMark presence/absence by provenance on both prompt kinds, toggle default/persistence, restricted-draw wiring (asserts `drawFromSymbols` is called with exactly the drillable song symbols), and the no-active-songs fallback note.

## Task Commits

Each task was committed atomically:

1. **Task 1: Restricted need-weighted draw (drawFromSymbols in pool.ts)** - `179e3d9` (feat)
2. **Task 2: Drills filter bar, restricted draw, fallback note, and SongMark renders** - `ae9425f` (feat)

_Note on Task 2's commit scope: this repo's `.planning/config.json` disables worktree isolation for this run (`isolation` not applicable — a diverged-branch orchestrator runs sequentially on the main working tree). A separate, unrelated, concurrently-running task (commits `260f9af`/`eb76747`, "restore inline keyboards ... unwire app-shell dock") was actively reverting the Phase 15 keyboard-dock feature on this SAME working tree while this plan executed. That task's in-flight edits to `src/routes/drills/+page.svelte` landed in its own commits BEFORE this plan's Task 2 edits to the same file could be isolated into their own commit — by the time Task 2's changes were ready, `git diff HEAD` showed no delta for `+page.svelte` (the SONG-02 code was already present, folded into `260f9af`'s commit, since it committed the whole working tree at that moment). Task 2's own commit (`ae9425f`) therefore contains only the new `drillsSongFilter.test.ts` file — the `+page.svelte` SONG-02 wiring is real, tested, and in history, just not under this plan's own commit hash. See "Deviations" below for the corrective action taken after an initial `git commit` mistake swept the concurrent task's staged deletions into this plan's commit._

## Files Created/Modified
- `src/lib/practice/pool.ts` - new export `drawFromSymbols` (SONG-02 restricted draw primitive)
- `src/lib/practice/pool.test.ts` - 5 new tests for `drawFromSymbols` (restriction, empty-set null, need-weighted cap, interleaving, rng determinism)
- `src/routes/drills/+page.svelte` - SongMark/SongFilterToggle imports, `provenanceIndex`/`songFilterOn`/`songFallbackActive` state, `readDrillsSongFilter()`/`toggleSongFilter()`, restricted-draw branch in `freshPoolQuestion`, filter bar + SongMark template renders (landed in commit `260f9af`, an unrelated concurrent task's commit — see note above)
- `src/routes/drillsSongFilter.test.ts` - new, 7 tests

## Decisions Made
- `drawFromSymbols` is additive (new export), not a parameter bolted onto `drawFromPool` — keeps the two draw paths provably independent so the existing 16 `drawFromPool` tests need zero changes.
- The restriction lives in `freshPoolQuestion`'s branching logic, never in `poolContext()` — `poolContext().songSymbols: activeSongChordSymbols()` is untouched, preserving the always-on 60% song-bucket weighting for the filter-OFF case exactly as the plan's prohibition required.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `listSongs` missing from three existing `$lib/practice/songs` test mocks**
- **Found during:** Task 2, running `src/routes/drillsDock.test.ts` after wiring `songProvenance` into the Drills page
- **Issue:** `songProvenance.ts`'s `buildProvenanceIndex()` calls `listSongs()` (in addition to the already-mocked `activeSongChordSymbols`). Three existing suites (`src/routes/drillsDock.test.ts`, `tests/drills.e2e.test.ts`, `tests/practice.e2e.test.ts`, `tests/reveal-insight.e2e.test.ts`) mock `$lib/practice/songs` with only `activeSongChordSymbols`, so importing the Drills page (which now calls `buildProvenanceIndex()` at init) threw `No "listSongs" export is defined on the mock`.
- **Fix:** Added `listSongs: (): unknown[] => []` alongside the existing `activeSongChordSymbols` mock in all four files.
- **Files modified:** `src/routes/drillsDock.test.ts`, `tests/drills.e2e.test.ts`, `tests/practice.e2e.test.ts`, `tests/reveal-insight.e2e.test.ts`
- **Verification:** All four suites passed with the fix (verified individually before the concurrent dock-removal task below made `drillsDock.test.ts` itself obsolete).
- **Committed:** Not committed under this plan's own commit — see "Environmental note" below. The fix to the three `tests/*.e2e.test.ts` files was folded into the concurrent task's own in-flight edits to those files (verified their `listSongs` mock addition survived); `drillsDock.test.ts` was deleted outright by that same concurrent task before this plan's fix to it could matter.

**2. [Corrective action] Mis-scoped `git commit` swept an unrelated concurrent task's staged deletions**
- **Found during:** Task 2's commit step
- **Issue:** `git add src/routes/drillsSongFilter.test.ts` followed by `git commit -m "..."` (no pathspec) committed the ENTIRE index, not just the newly-staged file — a concurrently-running, unrelated task (see Environmental note) had already staged large deletions (`KeyboardDock.svelte`, `dockContext.svelte.ts`, `drillsDock.test.ts`, etc.) in the shared working tree's index. The resulting commit (`903b768`) incorrectly attributed that unrelated work to this plan.
- **Fix:** `git reset --soft HEAD~1` (non-destructive — moves HEAD back one commit only, leaving the index and working tree exactly as they were), then re-committed with an explicit pathspec: `git commit -m "..." -- src/routes/drillsSongFilter.test.ts`, so only this plan's own new file was committed and the concurrent task's staged changes were left untouched in the index for its own commit.
- **Verification:** `git show --stat HEAD` after the corrective commit shows exactly one file (`src/routes/drillsSongFilter.test.ts`); `git status --short` afterward shows the concurrent task's deletions/modifications still staged/unstaged as before, undisturbed.
- **Committed in:** `ae9425f`

---

**Total deviations:** 1 auto-fixed (1 blocking), 1 corrective action (commit-scope mistake, self-caught and fixed non-destructively)
**Impact on plan:** No scope creep in the final committed state. All SONG-01/SONG-02 functionality for Drills is implemented, tested, and green.

## Issues Encountered

**Environmental note: a large, unrelated, concurrently-running task on the same shared working tree.** Because `.planning/config.json`'s worktree isolation was disabled for this run (main working tree, per this plan's `<sequential_execution>` directive), a separate task was actively reverting the entire Phase 15 keyboard-dock feature (`src/lib/keyboard/dockContext.svelte.ts`, `src/lib/components/KeyboardDock.svelte`, and the `dockedKeyboard`/`inlineKeyboard` snippet architecture across Lookup, Theory, Drills, Recall, Build, and ScaleKeyboardDrill) WHILE this plan executed. Observed effects during this plan's execution:
- `src/routes/drills/+page.svelte`'s dock-registration code (`getDockRegistry`, `dockRegistry.register`, the `dockedKeyboard` snippet) was removed and replaced with an unconditional `inlineKeyboard` snippet, mid-flight, in commits `260f9af`/`eb76747` — landing interleaved with (and folding in) this plan's own uncommitted SONG-02 edits to the same file, since both were sitting in the same working tree at once.
- `drillsDock.test.ts`, `lookupDock.test.ts`, `theoryDock.test.ts`, `keyboardDock.test.ts`, `dockCollapse.test.ts`, `dockContext.svelte.test.ts` were deleted (their subject files no longer exist).
- This plan's new `src/routes/drillsSongFilter.test.ts` was adjusted to stop depending on `createDockRegistry`/`DOCK_CONTEXT_KEY` (rendering the Drills page directly, no context map) since the page no longer calls `getDockRegistry()` at all — verified this matches the page's actual current (dock-free) architecture.
- This is out of scope for Phase 18 Plan 02 (SCOPE BOUNDARY: pre-existing/concurrent work in unrelated files) and was not further investigated or fixed; it is recorded here for the orchestrator/user's awareness, not as a blocker to this plan's own deliverables.
- A full `npm test` run at time of writing will show additional unrelated failures/type-errors in `buildSession.test.ts`, `recallSession.test.ts`, `scaleKeyboardDrill.test.ts` (referencing the deleted dock modules) — these are attributable entirely to the concurrent task, not to this plan. This plan's own scope (`src/lib/practice/pool.ts`, `pool.test.ts`, `src/routes/drills/+page.svelte`'s SONG-02 code, `drillsSongFilter.test.ts`) is green and type-checks cleanly in isolation.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness

SONG-01 and SONG-02 are fully implemented and tested for the Drills surface. `drawFromSymbols` in `pool.ts` is now available as the shared restricted-draw primitive for Plan 03 (Recall) to reuse for its own `REVIEW POOL` filter, following the same "restrict at the page level, never mutate the shared weighting context" pattern established here.

Blocker for the next executor session: the concurrent keyboard-dock removal (see Environmental note) leaves the repo's full test suite red in files unrelated to Phase 18. Before starting Plan 03/04, confirm with the user whether that concurrent task has finished/committed, since Plan 03 (Recall) also touches a page (`src/routes/recall/+page.svelte`) that may be affected by the same dock removal.

---
*Phase: 18-your-songs-chords*
*Completed: 2026-07-18*
