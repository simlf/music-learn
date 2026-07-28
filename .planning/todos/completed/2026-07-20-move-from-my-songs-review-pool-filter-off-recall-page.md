---
created: 2026-07-20T15:45:59.546Z
title: Move From-my-songs review pool filter off Recall page
area: ui
files:
  - src/lib/components/RecallSession.svelte
  - src/routes/recall/+page.svelte
---

## Problem

The "REVIEW POOL" box with the "FROM MY SONGS" checkbox (Phase 18 SONG-03 feature) currently lives on the /recall page, above the review card. The user finds this the wrong home for it: it's a source-selection preference, not a per-review control, and it takes vertical space on the phone review screen. Requested by the user on 2026-07-20 right after phase 24 UAT approval: "the 'review pool' option to select my songs as chords in the recall page should be in the songs page directly or in the settings".

Current wiring: the filter toggle drives RecallSession's applySongFilter() draw restriction (Phase 18-03) and its enabled state persists. The desired destination is the Songs page (near the songs it filters by) or a settings surface — decision open between the two.

## Solution

Decided 2026-07-20 via /gsd-explore:

**Finding:** the toggle is duplicated per-surface today — it renders on BOTH /recall and /drills (`src/routes/recall/+page.svelte` and `src/routes/drills/+page.svelte`, including the drills phone-strip sheet), each with its own localStorage key (`RECALL_SONG_FILTER_KEY` vs `music-learn:drills-song-filter`). So the "preference" can currently diverge between surfaces.

**Decision:** treat it as ONE global "practice from my songs" preference.

- Single localStorage key; migrate by OR-ing the two old keys on first read, then remove them.
- Control lives on the **Songs page** (not settings): a "Practice pool: my songs" control near the song list, so the songs feeding the pool are visible when flipping it.
- Remove `SongFilterToggle` usage from /recall and /drills (both desktop placement and the phone-strip sheet); those pages just read the persisted preference.
- Keep the `drawFromSymbols`/`drawFromPool` seam untouched (Phase 18-02 decision) — only the source of `songFilterOn` changes.
- Keep the empty-provenance fallback behavior (`songFallbackActive`) working on both consumers.
- Phone-first constraint from Phase 23/24 applies to the new Songs-page control (bottom tab bar, folded chrome).
- Update/relocate the existing tests: `songFilterToggle.test.ts`, `recallSongFilter.test.ts`, `drillsSongFilter.test.ts`, plus phone-strip test expectations.

## Resolved

Shipped by quick task `260720-v9u` (`.planning/quick/260720-v9u-move-the-from-my-songs-review-pool-filte/`), exactly as decided above. Verified in the tree while filing this:

- `src/lib/practice/songFilterPref.ts` owns the single `music-learn:song-filter` key and OR-migrates both legacy per-surface keys on first read, then deletes them.
- `SongFilterToggle.svelte` is imported by exactly one component, `SongManager.svelte` (the Songs surface). Neither Recall nor Drills renders it any more; they read the persisted preference instead.
- The `drawFromSymbols`/`drawFromPool` seam is untouched.
