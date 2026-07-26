---
phase: 29-progress-hub-stats-streak-review-map-songs
fixed_at: 2026-07-25T05:45:00Z
review_path: .planning/phases/29-progress-hub-stats-streak-review-map-songs/29-REVIEW.md
iteration: 1
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase 29: Code Review Fix Report

**Fixed at:** 2026-07-25T05:45:00Z
**Source review:** .planning/phases/29-progress-hub-stats-streak-review-map-songs/29-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope (critical + warning): 1
- Fixed: 1
- Skipped: 0

(IN-01 was out of scope for this run per `fix_scope: critical,warning` and was intentionally not touched.)

## Fixed Issues

### WR-01: Stats tab performs a fresh network round-trip on every tab switch back to it

**Files modified:** `src/lib/components/ProgressStats.svelte`, `src/lib/practice/statsCache.ts` (new), `tests/progress.e2e.test.ts`, `tests/progress-hub.e2e.test.ts`
**Commit:** `1368654`
**Applied fix:** Followed the orchestrator's guidance for a lightweight module-level cache rather than the reviewer's alternative suggestion (keep-all-sections-mounted was explicitly ruled out to preserve the single-mounted-section invariant required by the `data-review-dock` gate).

- Added `src/lib/practice/statsCache.ts`: an in-memory, session-lifetime module singleton keyed by the current API token, exposing `getCachedStats`/`getCachedStreak` (reads, null on miss or token mismatch) and `setCachedStats`/`setCachedStreak` (writes), plus a `resetStatsCache()` test-only reset.
- Rewrote `ProgressStats.svelte`'s `load()`: on a cache hit, `items`/`weakest`/`streak`/`practicedToday`/`last7` are set synchronously from the cache (pageState goes straight to `populated`/`empty`, skipping the `loading` skeleton), while `fetchStats()`/`fetchStreak()` still run in the background and reconcile both the cache and the visible state when they resolve. On a cache miss (first `/progress` visit this session, or a token change since the cache is keyed by token), behavior is unchanged from before the fix: `pageState` goes to `loading` and only resolves once the network round-trip completes. A background-fetch failure only flips `pageState` to `error` when there was no cache to fall back on; with a cache hit, a failed background refresh just leaves the last-known-good data visible.
- Updated both `tests/progress.e2e.test.ts` and `tests/progress-hub.e2e.test.ts` to call `resetStatsCache()` in `beforeEach` (the cache is a module-level singleton that would otherwise leak state across `it` blocks that share the same mocked token, breaking pre-existing assertions like the error-state test). Added two new tests to `progress.e2e.test.ts` (cache-hit-renders-immediately, token-change-invalidates-cache) and one new test to `progress-hub.e2e.test.ts` (Stats -> Recall -> Stats renders cached data with no loading-skeleton flash) to cover the new caching behavior directly.

**Verification:**
- `svelte-check`: 0 errors, 0 warnings across 1393 files.
- Targeted run: `vitest run tests/progress.e2e.test.ts tests/progress-hub.e2e.test.ts` — 29/29 passed.
- Full suite: `vitest run` — 119 test files, 1614 tests, all passed.

## Skipped Issues

None. IN-01 was excluded by `fix_scope: critical,warning` (not skipped due to failure — simply out of scope for this run).

---

_Fixed: 2026-07-25T05:45:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
