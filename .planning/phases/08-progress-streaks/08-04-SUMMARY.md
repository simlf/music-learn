---
phase: 08-progress-streaks
plan: 04
subsystem: api
tags: [fastify, better-sqlite3, svelte, vitest, tdd, streak]

requires:
  - phase: 08-progress-streaks
    provides: "server/ Fastify+better-sqlite3 backend (08-01) with the AnswerRow client_date substrate; client API module (client.ts/progress.ts) with bearer token storage, fetchStats, and localDateString (08-02); GET /stats + Progress page loading/empty/error/populated state machine + masthead nav link (08-03)"
provides:
  - "GET /streak?today=YYYY-MM-DD (bearer-authed): computeStreak(rows, today) derives the current daily practice streak from distinct client_date values, with one-day grace when today hasn't been practiced yet"
  - "src/lib/copy/streak.ts: three never-scolding rotation pools (activePracticedToday, activeNudge, zeroStreak) with a per-pool anti-repeat pickStreakLine"
  - "StreakBadge.svelte: compact (self-hiding masthead chip) and hero (Progress page numeral) variants sharing one component"
  - "Progress page streak hero card (rotation line + hero numeral + Practice Now) at the top of the populated layout"
  - "Masthead compact streak chip, fetched once a token exists, self-hiding at 0/loading/error"
affects: [09-deployment, spaced-repetition-v1.x]

tech-stack:
  added: []
  patterns:
    - "computeStreak mirrors computeStats: pure, framework-free aggregation over AnswerRow[], unit-tested independently of the HTTP layer"
    - "Streak copy pools follow hints.ts's per-pool anti-repeat rotation exactly, with three independent lastIndex slots keyed by pool name"
    - "StreakBadge's compact self-hide means callers (masthead) render it unconditionally with no wrapping {#if}"

key-files:
  created:
    - server/src/streak.ts
    - server/src/routes/streak.ts
    - server/test/streak.test.ts
    - src/lib/copy/streak.ts
    - src/lib/copy/streak.test.ts
    - src/lib/components/StreakBadge.svelte
    - src/lib/components/streakBadge.test.ts
  modified:
    - server/src/index.ts
    - src/lib/api/progress.ts
    - src/lib/api/progress.test.ts
    - src/routes/progress/+page.svelte
    - src/routes/+layout.svelte
    - tests/progress.e2e.test.ts

key-decisions:
  - "previousDate() parses/formats YYYY-MM-DD strings using UTC Date fields only, so the day-subtraction math never drifts with the server process's own timezone; the calendar labels being subtracted already came from the browser's local date (D-02's timezone simplification)"
  - "The streak hero card's Practice Now button replaces the 08-03 bottom-of-page Practice Now button rather than duplicating it, per the UI-SPEC's explicit 'avoid duplicate CTAs' instruction for the populated layout"
  - "The streak fetch on the Progress page runs independently of the page's loading/empty/error state machine (which stays driven by fetchStats alone): a failed streak fetch defaults to streak 0 and the hero still renders in its zero form rather than blocking or erroring the rest of the page"

patterns-established:
  - "Server-side streak aggregation (computeStreak) is pure and independently unit-tested, matching computeStats' and the client theory modules' framework-free convention"

requirements-completed: [PROG-03]

coverage:
  - id: D1
    description: "GET /streak?today=YYYY-MM-DD (bearer-authed) computes { streak, practicedToday } server-side from distinct client_date values, with grace through yesterday and a reset on any larger gap"
    requirement: PROG-03
    verification:
      - kind: unit
        ref: "server/test/streak.test.ts#computeStreak — 3-in-a-row, grace-yesterday, 2+-day-gap-reset, single-day, dedupe, empty-rows cases (6 tests)"
        status: pass
      - kind: integration
        ref: "server/test/streak.test.ts#GET /streak (authenticated) — returns 200 with computed shape from seeded client_dates"
        status: pass
      - kind: integration
        ref: "server/test/streak.test.ts#GET /streak (authentication) — 401 without/with wrong bearer token"
        status: pass
      - kind: integration
        ref: "server/test/streak.test.ts#GET /streak (validation) — 400 on bad format or missing today"
        status: pass
    human_judgment: false
  - id: D2
    description: "Streak copy: three never-scolding rotation pools (activePracticedToday, activeNudge, zeroStreak) with the exact UI-SPEC lines, {N} placeholder in the active pools, no em dashes, per-pool anti-repeat picking"
    requirement: PROG-03
    verification:
      - kind: unit
        ref: "src/lib/copy/streak.test.ts — exact-lines, {N}-placeholder, no-em-dash, anti-repeat cases (7 tests)"
        status: pass
    human_judgment: false
  - id: D3
    description: "StreakBadge: hero variant always renders the numeral (vermilion when count >= 1, ink at 0); compact variant renders nothing when count < 1 or loading, otherwise '{N} DAY STREAK'"
    requirement: PROG-03
    verification:
      - kind: unit
        ref: "src/lib/components/streakBadge.test.ts — hero active/zero class, compact rendered/hidden-at-zero/hidden-while-loading cases (5 tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Progress page shows a streak hero card (rotation line + hero numeral + Practice Now) at the top of the populated layout, driven by fetchStreak(localDateString())"
    requirement: PROG-03
    verification:
      - kind: e2e
        ref: "tests/progress.e2e.test.ts — active-streak hero shows count 3 and a rotation line containing 3; zero-streak hero shows 0 in the non-active class (2 tests)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Masthead renders a compact streak chip between the app name and nav links, fetching only when a token exists, swallowing fetch errors, and never blocking/delaying nav render"
    requirement: PROG-03
    verification:
      - kind: other
        ref: "grep for StreakBadge placement in src/routes/+layout.svelte (between the MUSIC LEARN span and the nav-links div, no conditional wrapper) — present"
        status: pass
      - kind: unit
        ref: "src/lib/components/streakBadge.test.ts (loading-hides case) covers the self-hide contract the masthead relies on"
        status: pass
    human_judgment: true
    rationale: "No dedicated e2e test exercises the masthead's own onMount fetch-and-render sequence (token present -> loading -> populated chip) end to end; the existing masthead nav-link e2e test (08-03) renders +layout.svelte without a token, so it only exercises the self-hidden path. A human should visually confirm the chip appears in the running app after practicing with a stored token."

duration: 9min
completed: 2026-07-13
status: complete
---

# Phase 8 Plan 04: Daily-Streak Slice (GET /streak + Streak Hero + Masthead Chip) Summary

**Server-computed daily practice streak over local-date buckets via a new authed GET /streak endpoint, surfaced as a rotating-encouragement hero numeral on the Progress page and a self-hiding compact chip in the masthead, completing Phase 8**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-13T19:07:00Z
- **Completed:** 2026-07-13T19:16:00Z
- **Tasks:** 3 (all TDD)
- **Files modified:** 13 (7 created, 6 modified)

## Accomplishments

- `computeStreak(rows, today)` (server/src/streak.ts): pure aggregation over distinct `client_date` values. Practiced today anchors the count at today; not-yet-practiced-today but practiced-yesterday still counts through yesterday (grace, so the nudge copy can invite practicing today); any gap of more than one day resets the streak to 0. Day-subtraction math is done in UTC fields only so it never drifts with the server's own timezone.
- `GET /streak?today=YYYY-MM-DD`: registered inside the same bearer-authed encapsulated Fastify context as `/answers` and `/stats` (401 with zero extra auth code); a querystring schema restricts `today` to the `YYYY-MM-DD` pattern (400 on bad/missing format).
- `src/lib/copy/streak.ts`: three never-scolding rotation pools with the exact UI-SPEC lines and a per-pool anti-repeat `pickStreakLine`, mirroring `hints.ts`'s established pattern.
- `StreakBadge.svelte`: one component, two variants. `hero` always renders the numeral at display size in mono (vermilion only when active, ink at zero, per the "display + mono = big data numeral" typography rule). `compact` self-hides at zero/loading so the masthead never shows a discouraging "0 DAY STREAK" or a loading skeleton.
- Progress page gains a streak hero card at the top of the populated layout (rotation line + hero numeral + Practice Now), and the masthead gains the compact chip between the app name and nav links, fetched only when a token is stored and never blocking nav render.

## Task Commits

1. **Task 1: Server streak computation (computeStreak) + GET /streak route** - `ec8a566` (feat, TDD)
2. **Task 2: Streak copy pools + fetchStreak client helper** - `ca97d6a` (feat, TDD)
3. **Task 3: StreakBadge component, Progress streak hero card, masthead streak chip** - `a9fc2dd` (feat, TDD)

No REFACTOR commits were needed; each GREEN implementation was already minimal and clean.

## Files Created/Modified

- `server/src/streak.ts` - `StreakResult` type + pure `computeStreak(rows, today)`
- `server/src/routes/streak.ts` - `registerStreakRoute(app, store)` with a `today` querystring schema
- `server/test/streak.test.ts` - 12 tests (6 unit + 6 integration)
- `server/src/index.ts` - registers `/streak` inside the bearer preHandler context
- `src/lib/copy/streak.ts` - `activePracticedToday`/`activeNudge`/`zeroStreak` pools + `pickStreakLine`
- `src/lib/copy/streak.test.ts` - 7 tests
- `src/lib/api/progress.ts` - `StreakResult` type + `fetchStreak(today)`
- `src/lib/api/progress.test.ts` - 2 added `fetchStreak` tests
- `src/lib/components/StreakBadge.svelte` - `compact`/`hero` variant streak display
- `src/lib/components/streakBadge.test.ts` - 5 tests
- `src/routes/progress/+page.svelte` - streak hero card + independent streak fetch; removed the now-duplicate bottom Practice Now button
- `src/routes/+layout.svelte` - masthead streak chip fetch + placement
- `tests/progress.e2e.test.ts` - mocks `fetchStreak`/`localDateString`; adds 2 streak-hero cases

## Decisions Made

- `previousDate()` in `streak.ts` parses/formats `YYYY-MM-DD` using `Date.UTC`/`getUTCFullYear` etc., never the host process's local timezone, so the day-subtraction arithmetic itself stays timezone-neutral; the calendar labels it operates on already came from the browser's local date via `localDateString()` (08-02).
- The streak hero card's "Practice Now" button replaces the 08-03 bottom-of-page "Practice Now" button (removed) rather than duplicating it, per the UI-SPEC's explicit instruction that the populated layout must avoid duplicate CTAs.
- The Progress page's streak fetch is independent of `pageState` (which is still driven solely by `fetchStats`): a failed or slow `fetchStreak` degrades to `streak: 0` without affecting the loading/empty/error/populated state machine.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed the duplicate "Practice Now" CTA left over from 08-03**
- **Found during:** Task 3 (adding the streak hero card's own "Practice Now" button)
- **Issue:** 08-03 added a "Practice Now" button at the bottom of the populated layout (before the streak hero card existed). Once the hero card's own "Practice Now" button was added per this plan's action text, the page had two identical CTAs, directly contradicting the UI-SPEC's explicit "to avoid duplicate CTAs" instruction for the populated state.
- **Fix:** Removed the bottom `<div class="mt-8"><Button variant="primary" href="/drills">Practice Now</Button></div>` block; the hero card is now the sole "Practice Now" CTA.
- **Files modified:** `src/routes/progress/+page.svelte`
- **Verification:** `tests/progress.e2e.test.ts` populated-state cases still pass; visual re-check of the file confirms a single "Practice Now" link.
- **Committed in:** `a9fc2dd` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug/UX correction)
**Impact on plan:** Necessary to satisfy the UI-SPEC's own explicit no-duplicate-CTA instruction. No scope creep - no new files, no architectural change.

## Issues Encountered

None beyond the auto-fixed deviation above.

## Authentication Gates

None.

## Known Stubs

None. The streak slice is fully wired end to end: server computation, client fetch, Progress hero, and masthead chip are all live and tested.

## User Setup Required

None new. The `API_TOKEN`/`VITE_API_BASE_URL` setup from 08-01/08-02 (see `08-USER-SETUP.md`) already covers everything `GET /streak` and the streak fetches need.

## Next Phase Readiness

- Phase 8 (progress-streaks) is now complete: PROG-01 (persistence), PROG-02 (weakness-aware stats), and PROG-03 (daily streak) are all shipped, tested, and wired into the Progress page and masthead.
- The raw `answers` table (client_date-indexed) remains the substrate for v1.x spaced repetition; no aggregate-only shortcuts were introduced anywhere in this phase.
- Minor manual-verification gap: the masthead's own token-present streak-fetch-and-render sequence has no dedicated e2e test (see coverage D5); a quick manual check in the running app (enter a token, practice, reload, confirm the chip appears) would close this out but does not block phase completion.

## Self-Check: PASSED

- All 7 created files verified present on disk (`server/src/streak.ts`, `server/src/routes/streak.ts`, `server/test/streak.test.ts`, `src/lib/copy/streak.ts`, `src/lib/copy/streak.test.ts`, `src/lib/components/StreakBadge.svelte`, `src/lib/components/streakBadge.test.ts`).
- Task commits `ec8a566`, `ca97d6a`, `a9fc2dd` verified in `git log --oneline`.
- Plan-level verification re-run: `npm --prefix server test` (29/29 pass), `npx vitest run` (257/257 pass across the full client suite), `npm run check` (0 errors, 0 warnings).

---
*Phase: 08-progress-streaks*
*Completed: 2026-07-13*
