---
phase: 27-practice-hub
fixed_at: 2026-07-25T01:13:46Z
review_path: .planning/phases/27-practice-hub/27-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 27: Code Review Fix Report

**Fixed at:** 2026-07-25T01:13:46Z
**Source review:** .planning/phases/27-practice-hub/27-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (2 critical, 2 warning; IN-01 excluded by fix_scope)
- Fixed: 4
- Skipped: 0

## Fixed Issues

### CR-01: Stale `CardRecord` snapshot corrupts FSRS state on Again-then-retry

**Files modified:** `src/routes/practice/+page.svelte`, `tests/practice-hub.e2e.test.ts`
**Commit:** f1a2dbd
**Applied fix:** `completeCarded` now captures the `CardRecord` returned by
`recordGrade` and threads it into the item re-enqueued to the queue (`{
...item, card: updatedCard }`), instead of discarding the return value and
re-enqueuing the original pre-grade `item`/`queue[0]` snapshot. This mirrors
`RecallSession.svelte`'s `cardsByKey`-refresh-after-grade pattern, so a
re-enqueued Again item is graded from its current persisted FSRS state on
its next pass. Updated the e2e assertion at (formerly) line 252 - which
asserted the second `recordGrade` call used the IDENTICAL stale `card`
object - to assert the corrected behavior: the second call now expects the
mock's own first-call return value (`{ ...card, lastRating: Rating.Again
}`), not the stale pre-grade snapshot.

### CR-02: No in-flight guard on `completeCarded` — double-tap double-commits the FSRS grade

**Files modified:** `src/routes/practice/+page.svelte`
**Commit:** 928e28f
**Applied fix:** Added a host-level `grading = $state(false)` flag mirroring
`RecallSession.svelte`'s own in-flight guard (`grading` flag, checked at the
top of `handleGrade`, set to `true` before the async work, and cleared in a
`finally` block). `completeCarded` now early-returns if a grade commit is
already in flight, and wraps its body in `try { ... } finally { grading =
false; }` so a double-tap on Next before the first `recordGrade` await
resolves can no longer re-invoke the async handler for the same item.

### WR-01: `completeCarded`'s family guard is a denylist, not an allowlist

**Files modified:** `src/routes/practice/+page.svelte`
**Commit:** 2133b83
**Applied fix:** Changed the guard from `item.family === 'voicing' ||
item.family === 'progression'` (denylist, excludes only the two synthetic
families) to `item.family !== 'name-it' && item.family !== 'interval'`
(allowlist), matching the allowlist convention already used by
`completeBuild`/`completeSynthetic`. This closes the gap where a future
routing change could accidentally wire a `build-it` item into
`completeCarded`, causing a second, silent FSRS commit on top of
`completeBuild`'s own internal `recordGrade` call.

### WR-02: `filterCardedBySong` is dead code; the module's header doc-comment describes a pipeline that isn't actually used

**Files modified:** `src/lib/practice/practiceQueue.ts`, `src/lib/practice/practiceQueue.test.ts`
**Commit:** 75c653a
**Applied fix:** Chose the "remove dead code" branch of the fix guidance
rather than wiring the helper in: the host already restricts the carded
half of the due-set upstream (via its own `applySongFilter` over the raw
`CardRecord[]`, before `selectReviewCards`/`cardsToQueueItems` run), so
calling `filterCardedBySong` on the already-filtered, mapped
`CardedQueueItem[]` afterward would be a redundant no-op second pass -
wiring it in would not change behavior but would add a confusing second
song-filter mechanism. Removed the unused `filterCardedBySong` export and
its dedicated test (`describe('filterCardedBySong', ...)` plus the now-
unused import), and corrected the module header doc-comment to state that
only the synthetic voicing half is filtered inside this module (via
`filterVoicingsBySong`) - the carded half's restriction happens entirely in
the host, upstream of this module.

## Skipped Issues

None — all 4 in-scope findings were fixed.

---

**Verification performed:**
- `npm run check` (svelte-check): 1380 files, 0 errors, 0 warnings (run after each fix)
- `tests/practice-hub.e2e.test.ts` + `src/lib/practice/practiceQueue.test.ts`: 35/35 passing (run after each fix)
- Full suite (`npx vitest run`): 116 test files, 1595 tests, all passing
- IN-01 (progression missed-chip raw template id) intentionally left unfixed per `fix_scope: critical,warning`.

_Fixed: 2026-07-25T01:13:46Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
