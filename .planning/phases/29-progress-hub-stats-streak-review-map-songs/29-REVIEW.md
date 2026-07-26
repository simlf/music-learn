---
phase: 29-progress-hub-stats-streak-review-map-songs
reviewed: 2026-07-25T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/routes/progress/+page.svelte
  - src/lib/components/ProgressStats.svelte
  - src/lib/components/RecallPanel.svelte
  - src/lib/components/SongManager.svelte
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
status: issues_found
---

# Phase 29: Code Review Report

**Reviewed:** 2026-07-25T00:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the Progress hub composition (`src/routes/progress/+page.svelte`) and the three extracted components it mounts (`ProgressStats`, `RecallPanel`, `SongManager`), cross-referencing against the pre-extraction `/recall` and `/songs` route diffs (`git diff e175fa5..HEAD`) to confirm the DRY extraction moved code verbatim rather than silently altering behavior.

Checked against every item in the review brief:

- **DRY extraction correctness**: Confirmed via diff that `RecallPanel` and `SongManager` are byte-for-byte extractions of the prior route bodies, with only the necessary composability seams added (`SongManager`'s `heading` prop, `RecallPanel`'s `$bindable` `mode` prop). `/recall/+page.svelte` and `/songs/+page.svelte` now just import and mount the same components with equivalent bindings (`bind:mode={recallMode}`, default `heading=true`). No lost props, lifecycle hooks, or effects found.
- **`data-review-dock` gate**: `activeTab === 'recall' && recallMode === 'review'` (progress/+page.svelte:27) correctly short-circuits on `activeTab`, so the dock cannot leak onto Stats or Songs even if `recallMode` is stale from a prior Recall visit. Matches the CRITICAL test in `tests/progress-hub.e2e.test.ts`.
- **Song-filter single-writer contract**: Repo-wide grep confirms `writeSongFilter` is called only from `SongManager.svelte:63` in source code (test files call it directly to seed state, which is expected). `RecallPanel` only reads via `readSongFilter()` and never writes.
- **Tab switch mounting**: The hub uses `{#if}/{:else if}/{:else}` across three distinct component types, so exactly one section is mounted at a time and switching tabs always destroys/recreates the leaving section — no cross-tab state bleed. However, this destroy/recreate-on-every-switch has a real cost for `ProgressStats` specifically (see WR-01 below).
- **Prerender-safety**: All top-level (script-init-time) storage reads used by these components — `readSongFilter()`, `listSongs()`, `soundEnabled()`, `studyModeEnabled()`, `getLevelState()`, `buildProvenanceIndex()` (via `listSongs()`) — wrap `localStorage` access in `try/catch` and degrade to safe defaults, so they remain safe under the app's `export const prerender = true` build. No violation found.
- **Reserved colors / no em dashes**: No raw hex/rgb literals and no em dashes (`—`) found in any of the four files or in `src/lib/i18n/messages/progress-hub.ts`. All `<style>` blocks reference the existing `--color-*` custom properties.

One real behavioral regression risk was found in the tab-switch lifecycle (WR-01), plus one minor duplication note (IN-01).

## Warnings

### WR-01: Stats tab performs a fresh network round-trip on every tab switch back to it

**File:** `src/lib/components/ProgressStats.svelte:109-144`
**Issue:** Because the Progress hub mounts sections via `{#if activeTab === 'stats'}...{:else if activeTab === 'recall'}...{:else}...{/if}` (`src/routes/progress/+page.svelte:59-69`), switching away from and back to the Stats tab fully destroys and recreates the `ProgressStats` component. Its `onMount` (lines 141-144) unconditionally calls `load()`, which performs two real network requests (`fetchStats()` and `fetchStreak()`, lines 116 and 125) every time. Before this phase, this cost was paid once per full navigation to `/progress`; the hub's whole purpose is to make switching between Stats/Recall/Songs a cheap, single-click, same-page action, but a user bouncing Stats → Recall → Stats (a very plausible flow: check a weak spot, review a card, check progress again) now re-triggers the loading skeleton and re-hits the stats/streak API every time, with no caching. This also means a slow or failing network can turn a habitual `Stats → Recall → Stats` glance into a jarring reload of the whole Stats view mid-session.
**Fix:** Cache the fetched stats/streak payload outside the per-mount component state (e.g., a module-level cache in `ProgressStats.svelte`, or lift `pageState`/`items`/`weakest`/`streak` into a small shared store keyed by session lifetime), and only re-fetch when the cache is empty or explicitly invalidated:
```ts
// module scope in ProgressStats.svelte
let cachedResult: { items: StatItem[]; weakest: StatItem[] } | null = null;
let cachedStreak: { streak: number; practicedToday: boolean; last7: ... } | null = null;

async function load(): Promise<void> {
  if (getApiToken() === '') { pageState = 'token-missing'; return; }
  if (cachedResult) {
    items = cachedResult.items;
    weakest = cachedResult.weakest;
    pageState = items.length === 0 ? 'empty' : 'populated';
  } else {
    pageState = 'loading';
    try {
      const result = await fetchStats();
      cachedResult = { items: result.items, weakest: result.weakest };
      items = result.items; weakest = result.weakest;
      pageState = result.items.length === 0 ? 'empty' : 'populated';
    } catch { pageState = 'error'; }
  }
  // similarly for streak, or keep streak refetch (it's a daily value, cheap to keep fresh)
}
```
Alternatively, keep all three sections mounted permanently and toggle visibility with CSS (`hidden` attribute / `display: none`) instead of `{#if}` branches — this preserves the "only Recall shows the dock" invariant (still gate `data-review-dock` on `activeTab`/`recallMode` as today) while avoiding remount cost for Stats and Songs. This would need re-verifying the "no wasted init" cost for `SongManager`/`RecallPanel` too, but their init work is local/cheap (`listSongs()`, `buildProvenanceIndex()`) unlike `ProgressStats`'s network fetch.

## Info

### IN-01: Wrapper box styling duplicated across the hub template (and diverges slightly for Recall)

**File:** `src/routes/progress/+page.svelte:60-68`
**Issue:** The Stats and Songs branches each hardcode the identical class string `"border-ink bg-paper-bright border-2 px-2 py-6 sm:px-6"` (lines 60 and 66), while the Recall branch relies on `RecallPanel`'s own internal box (`src/lib/components/RecallPanel.svelte:54`, `"border-ink bg-paper-bright mt-4 border-2 px-2 py-6 sm:px-6"` — note the extra `mt-4`). This isn't a functional bug (RecallPanel's toggle row above its box supplies its own `mt-8` spacing), but the duplicated literal invites drift if the "Print Shop" box style changes later, and a reviewer skimming the three tab bodies can't tell at a glance that the Recall tab's spacing rule differs from Stats/Songs by design vs. by oversight.
**Fix:** Extract the shared wrapper into a small local snippet/component (e.g., a `<HubSection>` wrapper) or a shared Tailwind class constant, and make the `mt-4` a single intentional variance the code documents once rather than three independent literals.

---

_Reviewed: 2026-07-25T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
