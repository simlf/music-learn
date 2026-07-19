---
phase: 23-phase-first-ux-for-phone-bottom-tab-bar-nav-1a-drills-questi
plan: 02
subsystem: api
tags: [fastify, vitest, sqlite, progress, streak]

# Dependency graph
requires:
  - phase: 08-progress-streaks
    provides: computeStreak's practicedDates Set / previousDate UTC-field arithmetic, GET /streak route
provides:
  - "server/src/streak.ts: computeStreak returns last7 (7-length, oldest->today, {date, practiced})"
  - "server/src/routes/streak.ts: GET /streak response includes last7 automatically (no route change needed)"
  - "src/lib/api/progress.ts: client StreakResult.last7? optional mirror"
affects: [23-03 progress-page-1c-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "last7 derivation walks backward from today via the existing previousDate() helper, then reverses to oldest->today order, keeping day-math strictly UTC-field-based per the existing timezone-neutral convention"

key-files:
  created: []
  modified:
    - server/src/streak.ts
    - server/test/streak.test.ts
    - src/lib/api/progress.ts

key-decisions:
  - "last7 built as a fixed 7-iteration walk from today backward using the already-proven previousDate() helper, then array.reverse() to yield oldest->today - no new date-math primitive introduced"
  - "Existing computeStreak unit assertions switched from .toEqual to .toMatchObject (plus dedicated last7 assertions) rather than hardcoding the full expected last7 array in every pre-existing case, keeping those tests focused on streak/practicedToday semantics"
  - "Client StreakResult.last7 kept optional (not required) so existing streak mocks in tests/progress.e2e.test.ts and src/lib/i18n/coverage.test.ts that omit last7 keep type-checking and passing"

requirements-completed: []

coverage:
  - id: D1
    description: "computeStreak returns a 7-length last7 array (oldest->today), each {date, practiced}, derived from the existing practicedDates Set relative to the passed today; streak/practicedToday unchanged"
    requirement: "UX-1C"
    verification:
      - kind: unit
        ref: "server/test/streak.test.ts#last7: practiced today only -> length 7, only final entry practiced, final date === today"
        status: pass
      - kind: unit
        ref: "server/test/streak.test.ts#last7: a gap inside the window shows an interior practiced:false entry"
        status: pass
      - kind: unit
        ref: "server/test/streak.test.ts#last7: empty rows -> all 7 entries practiced:false, ordered oldest -> today"
        status: pass
      - kind: unit
        ref: "server/test/streak.test.ts#last7: duplicate answers on one date still yield a single practiced:true entry"
        status: pass
    human_judgment: false
  - id: D2
    description: "GET /streak stays 401/400-protected with no new querystring param or unauthenticated surface, and returns the extended shape (streak, practicedToday, last7) for a valid authed request"
    requirement: "UX-1C"
    verification:
      - kind: integration
        ref: "server/test/streak.test.ts#GET /streak (authenticated) returns 200 with the computed shape from seeded client_dates"
        status: pass
      - kind: integration
        ref: "server/test/streak.test.ts#GET /streak (authentication) 401 tests"
        status: pass
      - kind: integration
        ref: "server/test/streak.test.ts#GET /streak (validation) 400 tests"
        status: pass
    human_judgment: false
  - id: D3
    description: "Client StreakResult interface mirrors last7 as an optional field; npm run check and root npm test stay green with existing streak mocks that omit last7"
    requirement: "UX-1C"
    verification:
      - kind: other
        ref: "npm run check (0 errors, 1331 files)"
        status: pass
      - kind: unit
        ref: "npm test (root, 1297 tests / 91 files, all green)"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-19
status: complete
---

# Phase 23 Plan 02: Server-Backed 7-Day Practiced Strip Summary

**computeStreak now returns a backward-compatible last7 array (oldest->today) derived from its existing practicedDates Set, with the client StreakResult type mirroring it as an optional field.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-19T19:33:00Z (approx, continuing directly after 23-01)
- **Completed:** 2026-07-19T19:39:30Z
- **Tasks:** 2 completed
- **Files modified:** 3

## Accomplishments
- `computeStreak` gains a `last7: { date: string; practiced: boolean }[]` field: fixed 7-iteration backward walk from `today` via the existing `previousDate()` UTC-field helper, reversed to oldest->today order. `streak`/`practicedToday` values are byte-unchanged for every pre-existing input.
- `GET /streak` exposes `last7` automatically (the handler already returns `computeStreak(...)` directly) — no querystring or auth-scope change, still 401/400-protected exactly as before.
- `server/test/streak.test.ts`: existing exact-match assertions switched to `toMatchObject` (to tolerate the new key) plus four new dedicated `last7` cases (first-day-only, gap-in-window, empty history, duplicate-dedupe) and an extended integration assertion.
- `src/lib/api/progress.ts`: client `StreakResult.last7?` added as an optional mirror; `fetchStreak`'s untyped JSON passthrough requires no change.

## Task Commits

Each task was committed atomically:

1. **Task 1: computeStreak returns last7 + GET /streak exposes it (+ tests)** - `17d4b79` (feat)
2. **Task 2: Mirror last7 as optional on the client StreakResult** - `f0df869` (feat)

**Plan metadata:** commit pending (docs: complete plan)

## Files Created/Modified
- `server/src/streak.ts` - `StreakResult.last7` field + `computeStreak` derivation (backward-compatible)
- `server/test/streak.test.ts` - Updated exact-match assertions + new last7 unit/integration cases
- `src/lib/api/progress.ts` - Client `StreakResult.last7?` optional mirror

## Decisions Made
- last7 built as a fixed 7-iteration backward walk using the already-proven `previousDate()` helper, then `.reverse()`'d — no new date-math primitive, keeping the timezone-neutral UTC-field convention intact.
- Pre-existing `computeStreak`/integration assertions switched to `toMatchObject` rather than hardcoding the full `last7` array in every case, keeping those tests scoped to streak/practicedToday semantics while dedicated new cases cover last7 in depth.
- Client `last7` kept strictly optional so existing streak mocks (in `tests/progress.e2e.test.ts` and `src/lib/i18n/coverage.test.ts`) that omit it stay valid with zero test changes required.

## Deviations from Plan

None - plan executed exactly as written. The route file (`server/src/routes/streak.ts`) required no code change since it already returns `computeStreak(...)` directly (confirmed per the plan's own instruction to verify this, not assume it).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`last7` is live and server-verified, ready for 23-03 (Progress page UI) to render the 7-day strip: practiced day = vermilion stamped square; today when not-yet-practiced = dashed-open square. The client type already exposes `last7?` so 23-03 can consume it directly from `fetchStreak()`'s return value with no further API changes.

No blockers.

---
*Phase: 23-phase-first-ux-for-phone-bottom-tab-bar-nav-1a-drills-questi*
*Completed: 2026-07-19*

## Self-Check: PASSED

All created/modified files found on disk; both task commits (17d4b79, f0df869) verified in git log.
