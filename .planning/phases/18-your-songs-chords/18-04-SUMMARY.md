---
phase: 18-your-songs-chords
plan: 04
subsystem: ui
tags: [svelte, provenance, testing-library]

# Dependency graph
requires:
  - phase: 18-your-songs-chords
    provides: "songProvenance.ts (buildProvenanceIndex/songsForSymbol) and SongMark.svelte from Plan 01"
provides:
  - "Chord Lookup result header renders the shared SongMark beside the resolved chord name"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "provenanceIndex built once via buildProvenanceIndex() at component init, reused per render via songsForSymbol(result.symbol, provenanceIndex) — same read-once-per-page pattern as Drills/Recall"

key-files:
  created:
    - src/routes/lookupSongMark.test.ts
  modified:
    - src/routes/+page.svelte

key-decisions:
  - "No dock-context harness needed for the new test: the Phase 15 keyboard dock was removed by a concurrent quick task (260718-iyj) before this plan executed, and the current +page.svelte renders PianoKeyboard inline directly, so lookupSongMark.test.ts renders the page with no context option (modeled on drillsSongFilter.test.ts's plain render() pattern instead of the plan's stale lookupDock.test.ts reference)."

patterns-established: []

requirements-completed: [SONG-01]

coverage:
  - id: D1
    description: "A recognized Chord Lookup result for a chord belonging to an active song shows the shared SongMark beside the chord name in the result header"
    requirement: "SONG-01"
    verification:
      - kind: unit
        ref: "src/routes/lookupSongMark.test.ts#shows the SongMark with the seeded song name for a resolved song chord"
        status: pass
    human_judgment: false
  - id: D2
    description: "A recognized result for a chord in no song shows no SongMark"
    requirement: "SONG-01"
    verification:
      - kind: unit
        ref: "src/routes/lookupSongMark.test.ts#shows no SongMark for a resolved chord in no song"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-18
status: complete
---

# Phase 18 Plan 04: Lookup SongMark Summary

**Chord Lookup result header now renders the shared SongMark component beside the resolved chord's ChordGlyph, keyed off a component-init `buildProvenanceIndex()` and `songsForSymbol(result.symbol, ...)`, completing SONG-01's "wherever it appears" contract across Drills, Recall, and Lookup with no filter control added to Lookup.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-18T14:24:00+02:00
- **Completed:** 2026-07-18T14:36:00+02:00
- **Tasks:** 1
- **Files modified:** 2 (1 modified, 1 created)

## Accomplishments
- `src/routes/+page.svelte` builds `provenanceIndex` once at component init and renders `<SongMark songs={songsForSymbol(result.symbol, provenanceIndex)} />` beside the `ChordGlyph` in the recognized-result header
- No filter control was added to Lookup (SONG-02 remains Drills/Recall-only, per the plan's explicit prohibition)
- `src/routes/lookupSongMark.test.ts` proves both the shown case (seeded song chord) and the hidden case (chord in no song)

## Task Commits

Each task was committed atomically:

1. **Task 1: Render SongMark in the Chord Lookup result header** - `f5ccd65` (feat)

**Plan metadata:** (this commit, see below)

## Files Created/Modified
- `src/routes/+page.svelte` - imports `SongMark` and `buildProvenanceIndex`/`songsForSymbol`; builds the index once; renders the mark in the result header
- `src/routes/lookupSongMark.test.ts` - two tests: SongMark shown with seeded song name, SongMark absent for a non-song chord

## Decisions Made

- **Test harness dropped the dock context entirely.** The plan's `<read_first>` pointed at `src/routes/lookupDock.test.ts` for the interaction pattern, but that file no longer exists — a concurrent quick task (260718-iyj, documented in this run's environment note and in STATE.md's resolved blocker) deleted the Phase 15 keyboard-dock infrastructure and restored inline keyboards on `+page.svelte` before this plan executed. The current `+page.svelte` renders `PianoKeyboard` directly with no dock registration, so `lookupSongMark.test.ts` was modeled instead on `src/routes/drillsSongFilter.test.ts`'s plain `render(Page)` pattern (no context map), seeding an active song via the real `saveSong()`/`listSongs()` read path and driving the lookup form's `input`/submit exactly as the live component now works. This is a Rule 3 fix (the plan's referenced file was gone, blocking literal instruction-following) with zero behavior-contract change: the acceptance criteria (SongMark shown/hidden, no filter added) are unaffected.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Rewrote the test harness reference from the deleted lookupDock.test.ts to the current dock-free render pattern**
- **Found during:** Task 1, `<read_first>` step
- **Issue:** The plan's context references (`@src/routes/lookupDock.test.ts`) and `<read_first>` list pointed at a test file removed by a concurrent quick task; the dock-context (`createDockRegistry`/`DOCK_CONTEXT_KEY`) it demonstrated no longer applies since `+page.svelte` was rewritten to render `PianoKeyboard` inline.
- **Fix:** Read the current `+page.svelte` directly (per this run's environment note) and modeled `lookupSongMark.test.ts` on `drillsSongFilter.test.ts`'s dock-free `render(Page)` + `saveSong()` seeding pattern instead.
- **Files modified:** `src/routes/lookupSongMark.test.ts` (new file; no dock context used)
- **Verification:** `npm test -- run src/routes/lookupSongMark.test.ts` — 2/2 pass. Full suite: `npm test` — 1032/1032 pass across 75 files, no regressions. `npm run check` — 0 errors/0 warnings across 1296 files.
- **Committed in:** `f5ccd65` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — stale test-harness reference from a concurrent branch change)
**Impact on plan:** No scope creep, no architecture change. Same component (`SongMark`), same wiring (`songsForSymbol(result.symbol, provenanceIndex)`), same acceptance criteria met; only the test's rendering harness differs from what the plan described, because the underlying page it targets had already changed shape before this plan ran.

## Issues Encountered
None beyond the Task 1 auto-fix documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness

Phase 18 (Your Songs' Chords) is now complete across all four plans: shared provenance primitives (01), Drills song filter + SongMark (02), Recall song filter + SongMark (03), and Lookup SongMark (04). SONG-01's "wherever it appears" contract is proven on all three surfaces; SONG-02's filter is proven Drills/Recall-only, with no filter leaking into Lookup. No blockers for Phase 19 (Interactive Theory) or Phase 20 (French Translation).

---
*Phase: 18-your-songs-chords*
*Completed: 2026-07-18*

## Self-Check: PASSED

`src/routes/+page.svelte` and `src/routes/lookupSongMark.test.ts` verified present on disk; commit `f5ccd65` verified present in git log (`git log --oneline --all | grep f5ccd65`).
