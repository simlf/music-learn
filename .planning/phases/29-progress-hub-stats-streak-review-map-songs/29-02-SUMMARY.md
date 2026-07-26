---
phase: 29-progress-hub-stats-streak-review-map-songs
plan: 02
subsystem: ui
tags: [svelte, dry-extraction, songs, component-extraction]

# Dependency graph
requires:
  - phase: 29-01
    provides: progress-hub.ts i18n domain (tab.stats/tab.recall/tab.songs/aria.tabs)
provides:
  - SongManager.svelte, a reusable bare-fragment component holding the full songs UI (CRUD, presets, didYouMean, paste-a-line, SongFilterToggle)
  - heading prop contract for suppressing the internal title when hosted inside a larger frame (Progress hub, plan 29-04)
affects: [29-04 (Progress hub Songs tab), 29-05 (hub smoke test), 30 (redirect cutover)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Component extraction with a `heading` boolean prop that gates only the internal page title/subtitle, letting a thin route wrapper and a future hub host both render the same component with different chrome"

key-files:
  created:
    - src/lib/components/SongManager.svelte
  modified:
    - src/routes/songs/+page.svelte

key-decisions:
  - "SongManager renders as a bare fragment (no outer <main>); the frame stays owned by whichever route/host renders it"
  - "heading prop (default true) gates ONLY the songs.page.title h1 + subtitle in the list branch; the edit-branch heading stays unconditional since it's an internal sub-heading, not the page title"
  - "writeSongFilter's sole caller (toggleSongFilter inside SongFilterToggle's onToggle) stayed inside SongManager, preserving the single-writer contract for the global music-learn:song-filter preference"

patterns-established:
  - "heading?: boolean = true prop pattern for extracted components hosted by both a thin standalone route wrapper and a future multi-section hub"

requirements-completed: [PROG-01]

coverage:
  - id: D1
    description: "SongManager.svelte extracted verbatim from /songs body (song CRUD, presets, didYouMean, paste-a-line, SongFilterToggle), rendered as a bare fragment with a heading prop gating only the page title/subtitle"
    requirement: "PROG-01"
    verification:
      - kind: unit
        ref: "tests/songs.e2e.test.ts (34 tests, full CRUD/preset/typo/paste/delete suite)"
        status: pass
      - kind: unit
        ref: "src/lib/i18n/coverage.test.ts (Songs heading + FR Morceaux assertions, exactly one heading)"
        status: pass
    human_judgment: false
  - id: D2
    description: "/songs/+page.svelte reduced to a thin wrapper rendering <SongManager /> inside the original <main> frame class, byte-identical visual behavior"
    requirement: "PROG-01"
    verification:
      - kind: unit
        ref: "tests/songs.e2e.test.ts (unedited, all 34 pass against the new wrapper)"
        status: pass
      - kind: other
        ref: "npm run check (svelte-check): 0 errors, 0 warnings, 1389 files"
        status: pass
      - kind: unit
        ref: "npm run test (full suite): 118 files, 1605 tests, all pass"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-25
status: complete
---

# Phase 29 Plan 02: SongManager Extraction Summary

**Extracted the ~566-line /songs body verbatim into a reusable SongManager.svelte (bare fragment, heading prop), reducing /songs/+page.svelte to a 5-line thin wrapper with zero behavior change.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-25T04:58:50+02:00 (first task commit)
- **Completed:** 2026-07-25T05:03:09+02:00
- **Tasks:** 2 completed
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- Created `src/lib/components/SongManager.svelte`: the full songs management UI (song list, CRUD form, presets shelf, chord entry with paste-a-line and didYouMean, SongFilterToggle) moved verbatim, rendering as a bare fragment (no outer `<main>`) so any host frame (thin route wrapper today, Progress hub in 29-04) owns the page chrome.
- Added a `heading` prop (`= true` default) that gates only the list-view's `songs.page.title` h1 + subtitle, so `/songs` stays byte-identical by default while a future hub caller can pass `heading={false}` to avoid a duplicate title.
- Reduced `/songs/+page.svelte` to a 5-line thin wrapper (`<main class="bg-paper text-ink min-h-screen p-8 font-sans"><SongManager /></main>`), preserving the exact original frame class.
- `SongFilterToggle` and its sole `writeSongFilter` caller (`toggleSongFilter`) travel with SongManager, keeping the single-writer contract for the global `music-learn:song-filter` preference intact.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SongManager.svelte from the /songs body** - `acc6d32` (feat)
2. **Task 2: Reduce /songs/+page.svelte to a thin wrapper** - `fed324f` (refactor)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/lib/components/SongManager.svelte` - Full songs UI extracted verbatim as a bare-fragment, reusable component with a `heading` prop.
- `src/routes/songs/+page.svelte` - Reduced from ~566 lines to a 5-line thin wrapper rendering `<SongManager />` inside the original `<main>` frame.

## Decisions Made
- Kept the edit-branch heading (`songs.page.button.newSong` / `songs.page.editSong.title`) unconditional (never gated by `heading`), per the plan's explicit instruction — it's an internal sub-heading distinct from the page-level title the `heading` prop controls.
- Verified via `coverage.test.ts`'s `getByRole('heading', { name: 'Songs' })` assertion that only one heading renders for `/songs` (SongManager's own, wrapper renders none).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- SongManager is ready for the Progress hub (plan 29-04) to render as its Songs tab via `<SongManager heading={false} />` with zero copy-paste.
- `/songs` route unaffected — stays fully functional this phase (its redirect to `/progress` is Phase 30 per the context doc).
- Full test suite (118 files, 1605 tests) and `svelte-check` (0 errors/warnings) confirmed green after this extraction.

---
*Phase: 29-progress-hub-stats-streak-review-map-songs*
*Completed: 2026-07-25*

## Self-Check: PASSED

- FOUND: src/lib/components/SongManager.svelte
- FOUND: src/routes/songs/+page.svelte
- FOUND: acc6d32 (Task 1 commit)
- FOUND: fed324f (Task 2 commit)
