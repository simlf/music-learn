---
phase: 08-progress-streaks
plan: 03
subsystem: api
tags: [fastify, better-sqlite3, svelte, vitest, tdd, stats, weakness]

requires:
  - phase: 08-progress-streaks
    provides: "server/ Fastify+better-sqlite3 backend (08-01) storing raw answer rows; client API module (client.ts/progress.ts) with bearer token storage and recordAnswer/flushQueue (08-02)"
provides:
  - "GET /stats (bearer-authed): computeStats(rows) aggregates raw answer rows into per-(item,kind) attempts/accuracy plus a worst-accuracy-first weakest shortlist"
  - "PracticeItemRow + AccuracyTable Svelte components rendering the weakness contract in the Print Shop visual language"
  - "src/routes/progress/+page.svelte: the app's first client network round-trip, with loading/empty/error/populated states plus a token-entry branch"
  - "Progress nav link in the masthead, positioned between Drills and Showcase"
  - "Button.svelte href prop: renders a real <a> (same visual treatment) so primary CTAs can navigate"
affects: [08-04, spaced-repetition-v1.x]

tech-stack:
  added: []
  patterns:
    - "Pure, framework-free aggregation function (computeStats) mirroring the client theory modules' style, unit-tested independently of the HTTP layer"
    - "PracticeItemRow renders a real <tr> (not a div), so AccuracyTable and the Progress page's Weakest Spots table both compose it inside a genuine <table>/<tbody>"
    - "Button.svelte's optional href prop conditionally renders <a> vs <button> via an {#if}, keeping one shared component for both navigational and action CTAs"

key-files:
  created:
    - server/src/stats.ts
    - server/src/routes/stats.ts
    - server/test/stats.test.ts
    - src/lib/components/PracticeItemRow.svelte
    - src/lib/components/AccuracyTable.svelte
    - src/lib/components/progressComponents.test.ts
    - src/routes/progress/+page.svelte
    - tests/progress.e2e.test.ts
  modified:
    - server/src/index.ts
    - src/lib/api/progress.ts
    - src/lib/api/progress.test.ts
    - src/routes/+layout.svelte
    - src/lib/components/Button.svelte

key-decisions:
  - "needsPractice threshold implemented as a literal `attempts >= 3` comparison (not a named constant) so the plan's acceptance-criteria grep and the UI-SPEC threshold text stay directly traceable in the source"
  - "PracticeItemRow renders a semantic <tr>/<td> row rather than a div-based grid, so it composes directly inside AccuracyTable's <table> and the Progress page's inline Weakest Spots <table> without a second markup convention"
  - "Button.svelte gained an optional href prop (renders <a> instead of <button>, same ps-button classes) rather than duplicating button styling in the Progress page, since the plan's acceptance criteria require real <a href=/drills> link semantics for Start a Drill / Practice Now"
  - "Local page state variable renamed from `state` to `pageState`: naming it `state` collided with the Svelte 5 `$state` rune during svelte-check's type inference (self-referential initializer error), even though it compiled and ran fine under Vite/Vitest - fixed proactively since `npm run check` is part of this plan's own verification block"

patterns-established:
  - "Server-side per-item stats aggregation (computeStats) is pure and independently unit-tested from the route/HTTP layer, matching the client theory-module convention of keeping business logic framework-free"

requirements-completed: [PROG-02]

coverage:
  - id: D1
    description: "GET /stats (bearer-authed) computes per-item accuracy server-side from raw rows: each item carries attempts, accuracy, and needsPractice; needsPractice true only when attempts >= 3 AND accuracy < 0.7"
    requirement: PROG-02
    verification:
      - kind: unit
        ref: "server/test/stats.test.ts#computeStats — grouping, threshold, tie-break, empty-rows cases (7 tests)"
        status: pass
      - kind: integration
        ref: "server/test/stats.test.ts#GET /stats (authenticated) — returns 200 with computed items/weakest"
        status: pass
      - kind: integration
        ref: "server/test/stats.test.ts#GET /stats (authentication) — 401 without/with wrong bearer token"
        status: pass
    human_judgment: false
  - id: D2
    description: "Weakest Spots shows up to 5 needsPractice items worst-accuracy-first (tie-break: more attempts, then alphabetical); items below the 3-attempt floor are excluded from weakest but still appear in the full stats table, unflagged"
    requirement: PROG-02
    verification:
      - kind: unit
        ref: "server/test/stats.test.ts#computeStats — weakest sort/tie-break/cap-at-5, 2-attempt item excluded from weakest but present in items"
        status: pass
    human_judgment: false
  - id: D3
    description: "PracticeItemRow + AccuracyTable render the weakness contract: symbol (text-heading), kind tag, attempts, accuracy%, vermilion accent only under threshold, no interval-role color tokens, non-interactive 44px-min-height rows"
    requirement: PROG-02
    verification:
      - kind: unit
        ref: "src/lib/components/progressComponents.test.ts (4 tests: weak-accent class threshold both directions, AccuracyTable headers + row count)"
        status: pass
      - kind: other
        ref: "grep for --color-third/--color-fifth/--color-seventh in PracticeItemRow.svelte — no matches"
        status: pass
    human_judgment: false
  - id: D4
    description: "Progress page renders four states (loading/empty/error/populated) plus a token-entry branch, all with the exact locked UI-SPEC copy, reachable from a new masthead Progress nav link"
    requirement: PROG-02
    verification:
      - kind: e2e
        ref: "tests/progress.e2e.test.ts (6 tests: populated weakest+all-stats rendering, empty state + Start a Drill link, error state + Try Again retry, token-missing render, Save-then-refetch, masthead Progress link)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The client never re-derives accuracy from raw events (D-02): fetchStats returns the server-computed { items, weakest } verbatim and the page renders those fields directly"
    requirement: PROG-02
    verification:
      - kind: unit
        ref: "src/lib/api/progress.test.ts#fetchStats — resolves parsed { items, weakest } on ok, throws on non-ok"
        status: pass
      - kind: other
        ref: "grep for accuracy arithmetic (correct/attempts, division) in src/routes/progress/+page.svelte — none found; page only assigns result.items/result.weakest"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-07-13
status: complete
---

# Phase 8 Plan 03: Weakness-Aware Stats Slice (GET /stats + Progress Page) Summary

**Server-computed per-chord accuracy via a new authed GET /stats endpoint, surfaced on a new /progress page (Weakest Spots + full stats table) with real loading/empty/error states and a token-entry flow — the app's first true network round-trip in the UI**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-13T18:55:00Z
- **Completed:** 2026-07-13T19:05:00Z
- **Tasks:** 3 (2 TDD + 1 standard)
- **Files modified:** 13 (8 created, 5 modified)

## Accomplishments

- `computeStats(rows)` (server/src/stats.ts): pure aggregation grouping raw answer rows by `(item, kind)`, computing attempts/accuracy, flagging `needsPractice` only at `attempts >= 3 AND accuracy < 0.7`, and producing a worst-accuracy-first `weakest` shortlist (tie-break: more attempts, then alphabetical; capped at 5).
- `GET /stats`: registered inside the same bearer-authed encapsulated Fastify context as `/answers` (08-01), so it's 401'd without a token with zero extra auth code.
- `PracticeItemRow` + `AccuracyTable`: token-styled, prop-driven components rendering the weakness contract (kind tag, `text-heading` symbol, attempts, accuracy%, vermilion accent only under threshold) — inert this phase since Phase 5's session-scoping (DRILL-04) isn't built.
- `src/routes/progress/+page.svelte`: the app's first genuine client fetch, with loading (static skeleton blocks), empty, error (with working retry), and populated states, plus a token-entry branch for D-03's "entered once per device" flow — all exact UI-SPEC copy, no em dashes.
- Masthead gains a Progress nav link between Drills and Showcase.

## Task Commits

1. **Task 1 (RED): failing test for computeStats + GET /stats** - `62661e9` (test)
2. **Task 1 (GREEN): computeStats aggregation + GET /stats route** - `2c1c523` (feat)
3. **Task 2 (RED): failing test for PracticeItemRow/AccuracyTable + fetchStats** - `bf11406` (test)
4. **Task 2 (GREEN): PracticeItemRow + AccuracyTable + fetchStats** - `e086d03` (feat)
5. **Task 3: Progress page (four states + token entry) and nav link** - `089fa71` (feat)

No REFACTOR commits were needed; both GREEN implementations were already minimal and clean.

## Files Created/Modified

- `server/src/stats.ts` - `StatItem` type + pure `computeStats(rows)`
- `server/src/routes/stats.ts` - `registerStatsRoute(app, store)`
- `server/test/stats.test.ts` - 12 tests (7 unit + 5 integration)
- `server/src/index.ts` - registers `/stats` inside the bearer preHandler context
- `src/lib/components/PracticeItemRow.svelte` - inert weakness-contract table row
- `src/lib/components/AccuracyTable.svelte` - SYMBOL/KIND/ATTEMPTS/ACCURACY table
- `src/lib/components/progressComponents.test.ts` - 4 component tests
- `src/lib/api/progress.ts` - `fetchStats()` + `StatItem` type
- `src/lib/api/progress.test.ts` - 2 added `fetchStats` tests
- `src/routes/progress/+page.svelte` - the Progress page, all states
- `src/routes/+layout.svelte` - Progress nav link
- `src/lib/components/Button.svelte` - optional `href` prop (renders `<a>`)
- `tests/progress.e2e.test.ts` - 6 e2e tests

## Decisions Made

- `needsPractice` written as the literal `attempts >= 3` comparison (not a named constant) so the plan's own acceptance-criteria grep stays directly satisfied by the source.
- `PracticeItemRow` renders a real `<tr>`/`<td>` row (not a div-based grid) so it composes inside both `AccuracyTable`'s `<table>` and the Progress page's inline Weakest Spots `<table>` — verified this renders correctly under jsdom via `@testing-library/svelte` before committing to the approach.
- Extended `Button.svelte` with an optional `href` prop rendering a real `<a>` (identical `ps-button` classes) rather than duplicating button CSS in the Progress page, since "Start a Drill" / "Practice Now" need genuine link semantics (`getByRole('link')`, real `href="/drills"`) per the plan's acceptance criteria — backward-compatible, existing `<Button>` usages elsewhere are unaffected since none pass `href`.
- Renamed the page's local state variable from `state` to `pageState` (see Deviations) — no visual or behavioral change, purely a type-checking fix.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Naming the Progress page's local state variable `state` broke `npm run check`**
- **Found during:** Task 3 (running the plan's own verification command, `npm run check`)
- **Issue:** `let state = $state<PageState>('loading');` compiled and ran correctly under Vite/Vitest, but `svelte-check`'s TypeScript inference reported "Block-scoped variable '$state' used before its declaration" and related implicit-any errors — a type-checker-only conflict between the local variable name `state` and the `$state` rune during type narrowing, not a runtime bug.
- **Fix:** Renamed the local variable to `pageState` throughout the component (state machine logic and template `{#if}` branches unchanged otherwise).
- **Files modified:** `src/routes/progress/+page.svelte`
- **Verification:** `npm run check` now reports `0 ERRORS 0 WARNINGS`; `npx vitest run tests/progress.e2e.test.ts` still passes (6/6)
- **Committed in:** `089fa71` (Task 3 commit)

**2. [Rule 3 - Blocking] Test mock signatures with `(...args: unknown[])` failed `svelte-check` against strictly-typed `vi.fn()` mocks**
- **Found during:** Task 3 (same `npm run check` run)
- **Issue:** `tests/progress.e2e.test.ts` originally wrapped `getApiTokenMock`/`setApiTokenMock` (each created with an explicit typed `vi.fn(...)` signature) using `(...args: unknown[]) => mock(...args)`, mirroring `tests/drills.e2e.test.ts`'s pattern — but that file's mocks are untyped `vi.fn()` (permissive `any[]`), while these have concrete signatures (0-arg and 1-arg respectively), so spreading an `unknown[]` into a non-rest call signature is a type error ("A spread argument must either have a tuple type or be passed to a rest parameter").
- **Fix:** Replaced the spread wrappers with direct, correctly-typed calls: `getApiToken: () => getApiTokenMock()` and `setApiToken: (token: string) => setApiTokenMock(token)`.
- **Files modified:** `tests/progress.e2e.test.ts`
- **Verification:** `npm run check` clean; test suite still 6/6 passing
- **Committed in:** `089fa71` (Task 3 commit)

**3. [Rule 2 - Missing Critical] Extended Button.svelte with an `href` prop so CTAs render real links**
- **Found during:** Task 3 (implementing "Start a Drill" / "Practice Now")
- **Issue:** The plan instructs reusing `Button.svelte` for these CTAs "linking to /drills", but `Button.svelte` only ever rendered a `<button>` element — with no `href`/anchor support there was no way to produce the real `<a href="/drills">` link semantics the plan's own acceptance criteria require (`getByRole('link', { name: 'Start a Drill' })`, `toHaveAttribute('href', '/drills')`).
- **Fix:** Added an optional `href?: string` prop to `Button.svelte`; when present it renders `<a {href} class="ps-button ps-button--{variant}">` instead of `<button>`, with the identical visual classes. No existing `<Button>` call site passes `href`, so behavior is unchanged everywhere else.
- **Files modified:** `src/lib/components/Button.svelte`
- **Verification:** Full client suite (241 tests) still green after the change; new Progress page tests confirm real anchor semantics
- **Committed in:** `089fa71` (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (2 blocking type-check fixes, 1 missing-critical component extension)
**Impact on plan:** All three were necessary for the plan's own verification commands (`npm run check`) and acceptance criteria (real `<a href>` link semantics) to pass. No scope creep — no new dependencies, no architectural changes.

## Issues Encountered

None beyond the auto-fixed deviations above.

## Authentication Gates

None.

## Known Stubs

None. The streak hero card (08-04) is explicitly out of scope for this plan per the UI-SPEC and CONTEXT.md; the populated layout starts directly with Weakest Spots, ready for 08-04 to insert the hero card above it without restructuring.

## User Setup Required

None new. The `API_TOKEN`/`VITE_API_BASE_URL` setup from 08-01/08-02 (see `08-USER-SETUP.md`) already covers everything this plan's `GET /stats` and the Progress page's token-entry flow need.

## Next Phase Readiness

- `computeStats`/`GET /stats` and `fetchStats()` are the exact seams 08-04's streak endpoint/page work will sit alongside (same bearer-authed context, same client API module).
- `PracticeItemRow`/`AccuracyTable` are ready to be reused unchanged once Phase 5's DRILL-04 session-scoping lands and rows become tappable — no visual rework needed, only wiring an `onSelect`/deep-link prop.
- Blocker: none. All verification commands (`npm --prefix server test`, `npx vitest run`, `npm run check`) pass clean.

## Self-Check: PASSED

- All 8 created files verified present on disk (`server/src/stats.ts`, `server/src/routes/stats.ts`, `server/test/stats.test.ts`, `src/lib/components/PracticeItemRow.svelte`, `src/lib/components/AccuracyTable.svelte`, `src/lib/components/progressComponents.test.ts`, `src/routes/progress/+page.svelte`, `tests/progress.e2e.test.ts`).
- Task commits `62661e9`, `2c1c523`, `bf11406`, `e086d03`, `089fa71` verified in `git log --oneline`.
- Plan-level verification re-run: `npm --prefix server test` (18/18 pass), `npx vitest run` (241/241 pass across the full client suite), `npm run check` (0 errors, 0 warnings).

---
*Phase: 08-progress-streaks*
*Completed: 2026-07-13*
