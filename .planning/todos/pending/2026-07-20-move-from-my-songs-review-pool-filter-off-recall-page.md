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

TBD — discuss first. Options: (a) move the toggle to the Songs page (e.g. a "practice from these songs" control near the song list), (b) put it in a settings surface (the More sheet has room), (c) both with shared persisted state. The recall page would then just read the persisted preference. Watch the phone-first constraint from Phase 23/24 (bottom tab bar, folded chrome) and keep drawFromSymbols/drawFromPool seam untouched (Phase 18-02 decision).
