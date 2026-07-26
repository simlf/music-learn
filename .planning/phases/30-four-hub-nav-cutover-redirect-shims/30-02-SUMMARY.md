---
phase: 30-four-hub-nav-cutover-redirect-shims
plan: 02
subsystem: ui
tags: [sveltekit, svelte5, fsrs, drill-seeds, practice-queue]

requires:
  - phase: 27-practice-hub-fsrs
    provides: the hybrid FSRS+synthetic practice queue (composePracticeQueue/cardsToQueueItems/CardedQueueItem) and the /practice host page
provides:
  - consumeDrillSeeds/consumeLessonSeeds wired into /practice's load(), matching the old /drills page's one-shot seed-consumption semantics
  - seeded chord symbols surface as prioritized name-it CardedQueueItems, prepended to the composed queue and deduped by id
  - a seeded session bypasses every empty-state early return so it starts even when nothing is FSRS-due
affects: [30-03-lookup-progress-handoff-repoint, 30-04-remaining-handoff-repoint, phase-31-comprehensive-test-remap]

tech-stack:
  added: []
  patterns:
    - "One-shot localStorage seed channels (drillSeeds.ts) consumed at the top of a page's load(), lesson channel taking precedence over the weak-list channel, both always drained regardless of which wins"
    - "Synthesizing a not-yet-persisted CardRecord via `{...newCard(now), factId, factKind, mode, lastRating: null, masteryDayCount: 0}` when a seeded fact has no existing card, mirroring deck.ts's introduceNewCards write shape"

key-files:
  created:
    - src/routes/practiceSeedHandoff.test.ts
  modified:
    - src/routes/practice/+page.svelte

key-decisions:
  - "Seed consumption happens via a new buildSeededItems() helper called at the very top of load(), before any due/backlog logic, so both localStorage channels are always drained (never leaked) regardless of what else the load does"
  - "Every early empty-state return (empty-filtered, empty-no-deck/empty-none-due, composed-empty) is gated behind `seededItems.length === 0`, preserving byte-identical non-seeded behavior while letting a seeded session bypass every empty tier"
  - "Seeded items are deduped from the composed due/synthetic queue by id (`fsrs:{factId}:{mode}`) so a due card that is also seeded is drilled once, at the front, not twice"
  - "No LevelPicker/tier gating ported into /practice, per the phase's tier-drop decision — FSRS due/weakness scheduling remains the sole drill scheduler"

patterns-established:
  - "buildSeededItems() as the single seam for translating one-shot localStorage seed channels into typed queue items, keeping load() itself readable"

requirements-completed: [HUB-03]

coverage:
  - id: D1
    description: "Drill seeds (Progress 'Drill these'/danger-cards/per-symbol, Lookup 'Drill it') surface as prioritized name-it questions in /practice, starting a session even when nothing is FSRS-due"
    requirement: "HUB-03"
    verification:
      - kind: unit
        ref: "src/routes/practiceSeedHandoff.test.ts#a pending drill seed starts a session even with nothing due, and drills the seeded chord first as a name-it question"
        status: pass
    human_judgment: false
  - id: D2
    description: "Seeds are consumed one-shot (localStorage) and do not leak into a later session"
    requirement: "HUB-03"
    verification:
      - kind: unit
        ref: "src/routes/practiceSeedHandoff.test.ts#consumes the seed one-shot: a later render with no seeds and the same empty deck lands on empty-none-due"
        status: pass
    human_judgment: false
  - id: D3
    description: "Non-seeded /practice sessions are unaffected (existing due/empty-tier/carded-grade-commit behavior stays byte-identical)"
    verification:
      - kind: unit
        ref: "tests/practice-hub.e2e.test.ts"
        status: pass
      - kind: unit
        ref: "tests/practice-hub-mix.e2e.test.ts"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-07-25
status: complete
---

# Phase 30 Plan 02: Wire Drill Seeds into /practice Summary

**Restores the "drill my weak/danger spots" handoff after the route consolidation: seeded chord symbols now surface as prioritized name-it questions in `/practice`, starting a session even when nothing is FSRS-due.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- `load()` in `src/routes/practice/+page.svelte` now consumes both `consumeDrillSeeds`/`consumeLessonSeeds` one-shot channels at the very top, mirroring the old `/drills` page's precedence rule (lesson seeds win over weak-list seeds; both channels always drained).
- Seeded chord symbols become `CardedQueueItem`s (`family: 'name-it'`, `mode: 'formula'`), backed by an existing FSRS card when one exists, or a freshly synthesized `CardRecord` (mirroring `deck.ts`'s `introduceNewCards` write shape) otherwise. Symbols that don't resolve to a supported chord-formula fact are skipped.
- Every early empty-state return (`empty-filtered`, `empty-no-deck`/`empty-none-due`, the `composed.length === 0` return) is now gated behind `seededItems.length === 0`, so a seeded session always reaches `pre-start` even with an empty or none-due deck, while the non-seeded path stays byte-identical.
- Seeded items lead the final queue; any composed (due/synthetic) item sharing a seed's id is deduped so a due-and-seeded card is drilled once, at the front.
- Added `src/routes/practiceSeedHandoff.test.ts` proving: (1) a pending `['Cm7']` drill seed with an empty/none-due deck reaches a startable pre-start session and Cm7 is the first name-it question after Start, and (2) a later render with no seeds on the same deck lands on `empty-none-due`, proving one-shot consumption with no leak.

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire drill + lesson seeds into /practice load()** - `0833c07` (feat)
2. **Task 2: Regression test for seeded /practice handoff** - `1e33f9c` (test)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/routes/practice/+page.svelte` - Added `buildSeededItems()` helper + wired its output into `load()`'s empty-state gating and final queue composition
- `src/routes/practiceSeedHandoff.test.ts` - New regression test covering the seeded-session-starts and one-shot-no-leak behaviors

## Decisions Made
- Seed-building lives in its own `buildSeededItems()` async function (called once at the top of `load()`) rather than inlining the logic, keeping `load()`'s existing due/backlog/empty-tier structure readable and minimally diffed.
- `getAllCards()` for the seed lookup is only called when at least one seed symbol is pending (`seedSymbols.length > 0` guard), so the non-seeded path performs no extra Dexie read — preserving "existing load() behavior stays byte-unchanged" when there's nothing to seed.
- Dedup uses the queue item id format (`fsrs:{factId}:{mode}`) already established by `practiceQueue.ts`'s `cardsToQueueItems`, so a seeded item and its due-card counterpart always collide correctly on id.

## Deviations from Plan

None — plan executed exactly as written. No architectural changes, no missing-critical-functionality gaps found beyond what the plan already specified (the threat-model's factById validation was implemented exactly as directed).

## Issues Encountered

Ran the full `npm test` suite after completing this plan's two tasks (out of an abundance of caution, beyond this plan's own verification scope) and found 7 pre-existing test-file failures, all confirmed (via `git show d841d1d:...`) to predate this plan — introduced by 30-01's nav cutover to 4 hubs and explicitly named in `30-CONTEXT.md`'s "Tests" decisions as belonging to other work in this phase (30-03/30-04) or Phase 31's comprehensive remap. Logged to `.planning/phases/30-four-hub-nav-cutover-redirect-shims/deferred-items.md`; not fixed here (out of this plan's scope per its own `files_modified`/verification section, which only requires `practiceSeedHandoff.test.ts` and the two existing `practice-hub*.e2e` suites to be green — both confirmed passing).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `/practice` now fully absorbs the old `/drills` page's seed-handoff behavior; plans 30-03/30-04 can safely repoint every `goto('/drills')` handoff to `goto('/practice')` without breaking the "drill my weak spots" feature.
- Pre-existing full-suite failures (7 files, all nav-cutover fallout from 30-01, unrelated to this plan) are logged in `deferred-items.md` for whichever plan owns the phase's "full suite green" gate.

---
*Phase: 30-four-hub-nav-cutover-redirect-shims*
*Completed: 2026-07-25*

## Self-Check: PASSED

- FOUND: src/routes/practice/+page.svelte
- FOUND: src/routes/practiceSeedHandoff.test.ts
- FOUND: .planning/phases/30-four-hub-nav-cutover-redirect-shims/30-02-SUMMARY.md
- FOUND: commit 0833c07
- FOUND: commit 1e33f9c
