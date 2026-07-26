---
phase: 29-progress-hub-stats-streak-review-map-songs
plan: 04
subsystem: ui
tags: [svelte5, runes, dry-extraction, progress, hub, tabs]

# Dependency graph
requires:
  - phase: 29-01
    provides: progress-hub.* i18n domain (tab.stats/tab.recall/tab.songs/aria.tabs)
  - phase: 29-02
    provides: SongManager.svelte with a heading prop gating the internal title
  - phase: 29-03
    provides: RecallPanel.svelte exposing mode via a $bindable prop
provides:
  - ProgressStats.svelte, a reusable bare-fragment component holding the full stats/streak/weakest/calibration/settings body
  - The Progress hub host at /progress/+page.svelte, a Stats|Recall|Songs three-tab switch composing ProgressStats + RecallPanel + SongManager
affects: [29-05 (hub smoke test), 30 (redirect cutover + nav wiring)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hub host owns the data-review-dock coupling by combining its own top-level tab state with a nested component's $bindable mode, so the extracted panel stays dock-agnostic"
    - "Section chrome parity: components with no single outer frame (ProgressStats, SongManager) get wrapped in one shared border-ink bg-paper-bright border-2 box by the host; a component that already renders its own outer panel (RecallPanel) is rendered unwrapped to avoid double-bordering"

key-files:
  created:
    - src/lib/components/ProgressStats.svelte
  modified:
    - src/routes/progress/+page.svelte

key-decisions:
  - "ProgressStats is a bare fragment with no props, owning fetchStats/fetchStreak/onMount/token/calibration/settings exactly as /progress did pre-extraction - no behavior change (REG-01)"
  - "The hub's <main> gates data-review-dock on activeTab === 'recall' && recallMode === 'review' (not /recall's former unconditional recallMode === 'review'), so the dock never leaks onto Stats or Songs"
  - "RecallPanel renders unwrapped (it owns its own border-ink bg-paper-bright panel); ProgressStats and SongManager each get a host-owned border-ink bg-paper-bright border-2 wrapper so all three tabs read as one consistent panel language"
  - "One shared <h1>{t('progress.page.title')}</h1> replaces the three former per-route titles; SongManager receives heading={false} to avoid a duplicate title"

requirements-completed: [PROG-01]

coverage:
  - id: D1
    description: "ProgressStats.svelte extracted verbatim from /progress's stats body (script + markup + styles), rendered as a bare fragment with no outer <main> and no progress.page.title h1"
    requirement: "PROG-01"
    verification:
      - kind: unit
        ref: "tests/progress.e2e.test.ts (20 tests: populated/empty/error/token-missing states, streak strip, weakest CTA, tier/sound settings) - pass"
      - kind: unit
        ref: "src/lib/i18n/coverage.test.ts (Progress + StreakBadge FR wiring: token-missing heading + Practice Settings EN/FR) - pass"
    human_judgment: false
  - id: D2
    description: "/progress/+page.svelte rewritten as the three-tab hub host: Stats|Recall|Songs switch (Stats default), mounting only the active section, gating data-review-dock on activeTab==='recall' && recallMode==='review', composing ProgressStats + RecallPanel (bind:mode) + SongManager (heading=false) under one shared title"
    requirement: "PROG-01"
    verification:
      - kind: unit
        ref: "tests/progress.e2e.test.ts, src/lib/i18n/coverage.test.ts, tests/songs.e2e.test.ts (54 tests total, unedited) - pass"
      - kind: unit
        ref: "npm run test (full suite): 118 files, 1605 tests, all pass"
        status: pass
      - kind: other
        ref: "npx svelte-check: 0 errors, 0 warnings"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-07-25
status: complete
---

# Phase 29 Plan 04: Progress Hub Composition Summary

**Extracted the /progress stats body into ProgressStats.svelte, then rewrote /progress/+page.svelte into the Stats|Recall|Songs Progress hub - a phone-first three-tab switch mounting one section at a time and composing all three Wave-1 extractions (ProgressStats, RecallPanel, SongManager) with no copy-paste.**

## Performance

- **Duration:** 20 min
- **Tasks:** 2 completed
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- Created `src/lib/components/ProgressStats.svelte`: the full stats/streak/weakest-spots/accuracy/calibration/danger-cards/practice-settings body moved verbatim into a bare fragment (no outer `<main>`, no `progress.page.title` h1), preserving every testid (`progress-token-entry`, `progress-loading`, `progress-empty`, `progress-error`, `streak-hero`, `streak-last7`, `streak-day`, `weakest-spots`, `confidence-calibration`, `calibration-bar`, `calibration-miscalibrated-flag`, `danger-cards`, `danger-card`, `practice-settings`, `current-tier-line`) and its scoped styles.
- Rewrote `/progress/+page.svelte` into the Progress hub host: a `Stats | Recall | Songs` tab switch (`Button variant="primary"|"ghost"` + `aria-pressed`, `role="group"`, Stats default), mounting only the active section via `{#if activeTab === ...}`.
- Wired the critical `data-review-dock` coupling on the hub's `<main>`: gated on `activeTab === 'recall' && recallMode === 'review'` (combining the hub's own tab state with `RecallPanel`'s `$bindable` nested mode via `bind:mode={recallMode}`), so the fixed review-action dock never appears while the user is on Stats or Songs.
- Applied consistent section chrome: `ProgressStats` and `SongManager` (no single outer frame of their own) each render inside a host-owned `border-ink bg-paper-bright border-2 px-2 py-6 sm:px-6` box; `RecallPanel` (already owns its own outer panel) renders unwrapped - avoiding both double-bordering and a barer-looking tab.
- One shared `<h1>{t('progress.page.title')}</h1>` replaces the three former per-route titles; `SongManager` receives `heading={false}` to suppress its internal title under the hub's shared one.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract the stats body into ProgressStats.svelte** - `17bafc8` (feat)
2. **Task 2: Rewrite /progress/+page.svelte as the three-tab hub host** - `90ec59b` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/lib/components/ProgressStats.svelte` - New: the extracted stats/streak/weakest/calibration/settings body as a bare, self-contained fragment.
- `src/routes/progress/+page.svelte` - Rewritten: from the ~488-line stats page into a ~56-line hub host with the three-tab switch and dock-gate logic.

## Decisions Made

- Kept `ProgressStats` fully self-contained (no props) per the plan's explicit instruction, matching the precedent already set by `SongManager`/`RecallPanel` in Wave 1 - the hub adds no logic beyond `activeTab` + `recallMode`.
- Followed the plan's section-chrome resolution exactly: wrap only the sections lacking their own outer panel (Stats, Songs), leave `RecallPanel` unwrapped since it already renders `border-ink bg-paper-bright border-2` internally.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The Progress hub composes all three Wave-1 extractions with zero copy-paste; `/recall` and `/songs` remain fully functional standalone routes this phase (their redirects to `/progress` are Phase 30, per 29-CONTEXT.md).
- Plan 29-05 (hub smoke test) can now assert directly against the tab switch, the dock-gate coupling, and cross-tab song-filter behavior.
- Full test suite (118 files, 1605 tests) and `svelte-check` (0 errors/warnings) confirmed green after this composition step.
- Deferred (per plan's own note): a final on-device visual consistency pass across the three tabs' panel chrome.

---
*Phase: 29-progress-hub-stats-streak-review-map-songs*
*Completed: 2026-07-25*

## Self-Check: PASSED

- FOUND: src/lib/components/ProgressStats.svelte
- FOUND: src/routes/progress/+page.svelte
- FOUND: 17bafc8 (Task 1 commit)
- FOUND: 90ec59b (Task 2 commit)
