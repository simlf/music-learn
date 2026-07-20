---
phase: 260720-v9u
plan: 01
subsystem: ui
tags: [svelte, localStorage, i18n, drills, recall, songs]

requires: []
provides:
  - Single global "From my songs" practice-pool preference (`music-learn:song-filter`), set from one control on /songs
  - Automatic OR-migration of the two legacy per-surface keys with deletion, preserving a returning user's ON state
  - Drills and Recall reduced to read-only consumers of the shared preference (no more duplicate toggles)
affects: [drills, recall, songs, i18n]

tech-stack:
  added: []
  patterns:
    - Shared read/write preference module (songFilterPref.ts) as the one seam multiple pages read from and one page writes to, replacing per-page localStorage duplication

key-files:
  created:
    - src/lib/practice/songFilterPref.ts
    - src/lib/practice/songFilterPref.test.ts
  modified:
    - src/routes/songs/+page.svelte
    - src/routes/songsPage.test.ts
    - src/lib/i18n/messages/songs.ts
    - src/routes/recall/+page.svelte
    - src/routes/drills/+page.svelte
    - src/lib/i18n/messages/recall.ts
    - src/lib/i18n/messages/drills.ts
    - src/routes/recallSongFilter.test.ts
    - src/routes/drillsSongFilter.test.ts
    - src/routes/drillsPhoneStrip.test.ts

key-decisions:
  - "songFilterPref.ts owns exactly one persisted key and performs a one-time OR-migration of the two legacy keys on first read, deleting both once migrated, so no drift between three copies of the same flag can recur."
  - "The /songs control's live count is a $derived.by over the existing `songs` state (not a one-shot snapshot), so toggling a song active/inactive updates the filter-on note's {N} without a reload."
  - "drawFromSymbols/drawFromPool and the empty-active-songs fallback in Drills' freshPoolQuestion are untouched; only the toggle UI and its write-only songFallbackActive bookkeeping were removed."

patterns-established:
  - "Shared preference module pattern: one write path (owning page), N read paths (consumer pages), migration logic isolated in the module itself."

requirements-completed: [SONG-PREF-01]

coverage:
  - id: D1
    description: "songFilterPref module reads/writes the single music-learn:song-filter key and OR-migrates + deletes the two legacy keys on first read, degrading to off on any storage failure"
    requirement: "SONG-PREF-01"
    verification:
      - kind: unit
        ref: "src/lib/practice/songFilterPref.test.ts (9 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "/songs renders the one global PRACTICE POOL / From my songs control; toggling persists to music-learn:song-filter and the note reflects on/off/fallback with the live drillable-chord count; French copy resolves"
    requirement: "SONG-PREF-01"
    verification:
      - kind: unit
        ref: "src/routes/songsPage.test.ts (Global \"From my songs\" practice-pool filter describe, 5 tests)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Recall and Drills render no filter toggle; both read the persisted global preference at init and pass it into their existing draw/queue logic unchanged, including the drawFromSymbols/drawFromPool seam and the empty-active-songs fallback"
    requirement: "SONG-PREF-01"
    verification:
      - kind: unit
        ref: "src/routes/recallSongFilter.test.ts (3 tests), src/routes/drillsSongFilter.test.ts (reads the persisted global filter describe, 5 tests), src/routes/drillsPhoneStrip.test.ts (3 tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Dead filter-note i18n keys removed from drills.ts/recall.ts in both en and fr with parity intact; recall.empty.filtered.* and songs.filter.button are preserved (still used elsewhere)"
    requirement: "SONG-PREF-01"
    verification:
      - kind: unit
        ref: "src/lib/i18n/coverage.test.ts"
        status: pass
    human_judgment: false

duration: 35min
completed: 2026-07-20
status: complete
---

# Quick Task 260720-v9u: Unify the From-my-songs practice-pool filter Summary

**Consolidated Recall's and Drills' independently-toggled "From my songs" filters into one `music-learn:song-filter` preference set from a single control on /songs, with automatic migration of both legacy keys.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-07-20
- **Tasks:** 3
- **Files modified:** 12 (2 created, 10 modified)

## Accomplishments
- New `songFilterPref.ts` module: single `music-learn:song-filter` key, OR-migrates `music-learn:recall-song-filter` + `music-learn:drills-song-filter` on first read (deleting both), degrades safely to off on any storage failure
- `/songs` gained the one global "PRACTICE POOL" / "From my songs" control (reusing `SongFilterToggle.svelte` unchanged), with a live drillable-chord count that updates when a song's active state is toggled
- Recall and Drills no longer render their own filter toggle; both simply call `readSongFilter()` at init and pass the result into their existing, unmodified draw/queue logic (`drawFromSymbols`/`drawFromPool` seam, `RecallSession`'s `applySongFilter`, and the empty-active-songs fallback all untouched)
- Dead filter-note i18n keys removed from `drills.ts`/`recall.ts` (en+fr parity preserved by `coverage.test.ts`)

## Task Commits

1. **Task 1: Create the shared global song-filter preference module** - `77ff140` (feat, TDD RED/GREEN in one commit per plan's tdd="true" task type)
2. **Task 2: Add the single global filter control to the /songs page + songs-domain i18n copy** - `e4d5460` (feat)
3. **Task 3: Reduce Recall and Drills to read-only consumers of the global preference; update their tests** - `eec9db4` (refactor)

## Files Created/Modified
- `src/lib/practice/songFilterPref.ts` - single read/write seam: `readSongFilter()`/`writeSongFilter()`, OR-migration + legacy-key deletion
- `src/lib/practice/songFilterPref.test.ts` - 9 tests covering fresh-install, both migration branches, new-key-wins, and storage-failure degrade
- `src/routes/songs/+page.svelte` - added the one global `SongFilterToggle` control with a live `$derived.by` chord count
- `src/routes/songsPage.test.ts` - added the "Global From my songs practice-pool filter" describe (5 tests)
- `src/lib/i18n/messages/songs.ts` - added `songs.filter.poolLabel`/`noteOnPrefix`/`noteOnSuffix`/`noteOff`/`noteFallback` in en+fr
- `src/routes/recall/+page.svelte` - removed the toggle/persistence code and the rendered bar; now reads `readSongFilter()` once at init
- `src/routes/drills/+page.svelte` - removed both toggle placements (phone sheet + desktop), the write-only `songFallbackActive` state, and its own persistence function; now reads `readSongFilter()` once at init
- `src/lib/i18n/messages/recall.ts` - removed `recall.page.pool-label`/`note.*` keys (en+fr); kept `recall.empty.filtered.*`
- `src/lib/i18n/messages/drills.ts` - removed `drills.filter.*` keys (en+fr)
- `src/routes/recallSongFilter.test.ts` - rewritten to assert the control is gone and the page reads the persisted pref
- `src/routes/drillsSongFilter.test.ts` - "PRACTICE POOL filter toggle" describe rewritten into "reads the persisted global filter"; the HI-01 in-page-toggle regression describe deleted (no control left to regress)
- `src/routes/drillsPhoneStrip.test.ts` - sheet-open test updated to assert no `song-filter-toggle-bar` renders

## Decisions Made
- The new module's migration logic (new key wins immediately if present; otherwise OR the two legacy values and delete both) lives entirely inside `songFilterPref.ts`, isolated from all three page components.
- `/songs`' drillable-chord count is derived reactively from the existing `songs` state rather than snapshotted once at mount, so the note stays accurate as songs are added/toggled without a reload.
- `RecallSession`'s `applySongFilter` and Drills' `freshPoolQuestion` restriction/fallback logic were left completely untouched per the plan's explicit preservation requirement — only the toggle UI and duplicate persistence were removed.

## Deviations from Plan

None - plan executed exactly as written. All three tasks, their TDD test-first sequencing (Task 1), i18n key additions/removals, and test-file rewrites match the plan's `<action>` blocks.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The single global preference is in place and fully covered by tests (full suite: 1367 tests green; `svelte-check`: 0 errors, 0 warnings).
- No further follow-up required for this task; the STATE.md pending todo "Move From-my-songs review pool filter off Recall page" is now resolved.

---
*Phase: 260720-v9u*
*Completed: 2026-07-20*

## Self-Check: PASSED

All 13 created/modified files verified present on disk; all 3 task commit hashes (77ff140, e4d5460, eec9db4) verified present in git log.
