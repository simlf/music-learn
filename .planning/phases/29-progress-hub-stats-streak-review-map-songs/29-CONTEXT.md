# Phase 29: Progress Hub — Stats, Streak, Review Map, Songs - Context

**Gathered:** 2026-07-25
**Status:** Ready for planning
**Mode:** Autonomous — grounded in the approved design + a scout of `/progress`, `/recall`, `/songs`.

<domain>
## Phase Boundary

Expand the existing `/progress` route into the Progress hub: one surface presenting stats + streak + weak spots (existing), the SRS recall (Review session + Map), and song management (absorbing `/recall` and `/songs`). Only the pages that display this state move; persisted schema and behavior are unchanged.

This phase does NOT redirect or delete `/recall` and `/songs` (Phase 30) and does NOT change persisted schema.

</domain>

<decisions>
## Implementation Decisions

### The Progress hub (PROG-01)
- The hub IS the existing `/progress` route (design keeps Progress at `/progress`), expanded to absorb `/recall` and `/songs`.
- It presents three parts:
  1. **Stats** — the existing content: streak hero, weakest-spots shortlist, accuracy table, per-tier level, Phase 25 calibration payoff + danger-cards CTA, and the "Drill these" seed handoff. Unchanged behavior (network round-trip via fetchStats/fetchStreak; token-gated). 
  2. **Recall** — the full `/recall` content: the reveal-then-grade `RecallSession` (Review) AND the `RecallMap` (fact x mode review map), with the existing Review|Map toggle. PROG-01 explicitly names "the SRS review map"; keep the Review session too so no recall functionality is lost (the recall modes see-play / hear-name / formula-build are distinct from the Practice hub's five families, so this is complementary, not duplicate).
  3. **Songs** — the `/songs` library management (add/delete, presets, didYouMean) INCLUDING the `SongFilterToggle`. This settles the deferred "From-my-songs filter placement" question: the song filter is WRITTEN here (Progress -> Songs) and READ by Practice + Recall via `readSongFilter()`.

### Layout
- A sectioned/tabbed hub, phone-first, reusing the existing toggle affordance (the `/scales` Explore/Practice and `/recall` Review/Map pattern: Button `variant primary|ghost` + `aria-pressed`). Recommend top-level sections so the page is navigable rather than one very long scroll (e.g. Stats | Review | Map | Songs, or Stats | Recall | Songs with Recall keeping its internal Review|Map). Exact section structure is Claude's discretion — keep it minimal and consistent with existing toggles; keyboards/rows inline (house rule).

### DRY extraction (avoid copy-paste; "only pages move")
- Extract `/songs` body (~566 lines) into `SongManager.svelte`; `/songs` becomes a thin wrapper rendering it. The Progress hub renders the SAME `SongManager`. One source of truth.
- `/recall` is thin (~71 lines: mode toggle + `RecallSession` + `RecallMap`). Either extract its composition into a small `RecallPanel.svelte` used by both `/recall` and the hub, or compose `RecallSession` + `RecallMap` directly in the hub with a local mode toggle. Prefer one source of truth (a `RecallPanel`) so `/recall` and the hub cannot drift.
- To keep the hub host thin (the existing `/progress` is already ~488 lines), extract the existing stats body into `ProgressStats.svelte` and have the hub compose `ProgressStats` + `RecallPanel` + `SongManager`. `/progress`'s own load/token logic stays with the stats part. Planner decides exact extraction depth; the hard rule is NO copy-paste of the songs/recall/stats markup into a second place.

### Scope / regression
- `/recall` and `/songs` keep working this phase (their redirects to `/progress` are Phase 30). 
- REG-01: stats fetch + streak + weakest + calibration + drill-seed handoff, the recall Review session + Map behavior, and song CRUD + filter read/write behavior are all unchanged — only their location moves. The global song-filter contract (single key `music-learn:song-filter`, written by SongFilterToggle, read by Practice/Recall) is preserved exactly.
- REG-02 (tests, formally Phase 31): a hub render/smoke test (stats section, recall Map present, songs management present, filter toggle writes the shared pref), recall Review session reachable; the extracted `/recall` and `/songs` e2e suites pass unedited; full suite + svelte-check green.
- i18n: reuse existing `progress.*`, `recall.*`, `songs.*` keys; add a small `progress-hub.*` (or reuse `progress.*`) domain only for new hub chrome (section labels/toggle), registered in `messages/index.ts` AND `messages.test.ts` domain-collision list.

### Claude's Discretion
- Exact section/tab structure and names; whether Recall keeps a nested Review|Map toggle or is flattened to top-level sections.
- Names/shapes of the extracted components (`SongManager`, `RecallPanel`, `ProgressStats`).
- Whether the token-entry affordance (the stats section needs an API token) stays inline in the Stats section (recommended — unchanged from today).

</decisions>

<code_context>
## Existing Code Insights

### Reusable assets
- `src/routes/progress/+page.svelte` (~488 lines) — stats: `fetchStats`/`fetchStreak` (`$lib/api/progress`), token via `getApiToken`/`setApiToken`, `PracticeItemRow`, `AccuracyTable`, `StreakBadge`, tier level (`getLevelState`/`setCurrentTier`/`TIERS`), calibration + danger-cards (Phase 25), `setDrillSeeds` handoff, `pickStreakLine`.
- `src/routes/recall/+page.svelte` (~71 lines) — Review|Map mode toggle composing `RecallSession.svelte` + `RecallMap.svelte`; reads `readSongFilter()` at init (RecallSession owns the queue restriction). Review is default; the session-complete "View Recall Map" CTA flips the same mode in place.
- `src/routes/songs/+page.svelte` (~566 lines) — song CRUD (`listSongs`/`saveSong`/`deleteSong`, `SONG_PRESETS`/`songFromPreset`), `SongFilterToggle` (the ONLY writer of the global filter via `writeSongFilter`), `drillableSongSymbols`, `didYouMean`, `spellChord`. Prerender-safe (listSongs total/degrading).

### Established patterns
- Toggle: Button `variant primary|ghost` + `aria-pressed` (scales, recall).
- i18n via `t()`, EN/FR parity + collision gates (`coverage.test.ts`, `messages.test.ts` — register any NEW domain in the messages.test.ts domain array, as every prior phase required).
- Song-filter contract: `songFilterPref.ts` (`readSongFilter`/`writeSongFilter`, single key), `songProvenance.ts`.

### Integration points
- `src/routes/progress/+page.svelte` (the hub host, expanded).
- New `SongManager.svelte`, `RecallPanel.svelte`, `ProgressStats.svelte` (extractions).
- Nav wiring to the 4 hubs is Phase 30, not here.

</code_context>

<specifics>
## Specific Ideas

- The song-filter placement finally lands in Progress -> Songs (resolves the long-standing From-my-songs filter-placement todo). Practice + Recall remain read-only consumers.
- Keep the Stats section's existing calibration payoff + danger-cards CTA (Phase 25) intact — it is a Progress-native feature.

</specifics>

<deferred>
## Deferred Ideas

- Redirecting `/recall` and `/songs` to `/progress` and the 4-hub nav cutover — Phase 30.
- Any rethink of whether the standalone Recall Review session should merge into the Practice interleaved session — out of scope; kept as-is in the Progress hub's Recall part.
