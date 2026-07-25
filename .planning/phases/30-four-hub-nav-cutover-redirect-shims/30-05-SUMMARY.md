---
phase: 30-four-hub-nav-cutover-redirect-shims
plan: 05
subsystem: routing
tags: [sveltekit, adapter-static, redirect, i18n, vitest]

# Dependency graph
requires:
  - phase: 30-01
    provides: 4-hub nav chrome (nav.practice/nav.learn i18n keys, TAB_ICONS, bottomTabLinks)
  - phase: 30-02
    provides: drill/lesson seed consumption wired into /practice's load()
  - phase: 30-03
    provides: Progress + Lookup drill handoffs repointed to /practice
  - phase: 30-04
    provides: Recall/lesson/Build handoffs repointed to their new hubs
provides:
  - 8 prerender-safe redirect shims (drills/build/voicings/progressions -> /practice; scales/theory -> /learn; recall/songs -> /progress)
  - deletion of the orphan /showcase route
  - redirectShims.test.ts asserting all 8 shims
  - coverage.test.ts remapped off the 6 deleted route pages onto the surviving 4-hub nav
  - a fully green npm run build / npm test / npm run check gate for the phase
affects: [31-no-regression-gate-test-remap]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SvelteKit redirect-shim +page.ts: export const prerender = true; export function load() { throw redirect(308, target); }"

key-files:
  created:
    - src/routes/drills/+page.ts
    - src/routes/build/+page.ts
    - src/routes/voicings/+page.ts
    - src/routes/progressions/+page.ts
    - src/routes/scales/+page.ts
    - src/routes/theory/+page.ts
    - src/routes/recall/+page.ts
    - src/routes/songs/+page.ts
    - src/routes/redirectShims.test.ts
  modified:
    - src/lib/i18n/coverage.test.ts

key-decisions:
  - "The load()-throw redirect(308, target) form prerenders cleanly under adapter-static (confirmed by the build log printing all 8 `308 /x -> /y` lines); no client-side goto() fallback was needed."
  - "coverage.test.ts's cross-surface chord-identity test lost its Build-surface half (BuildPage no longer renders); dropped the whole test per plan guidance rather than rewriting it to a single surface — Phase 31 re-establishes comprehensive coverage."
  - "Masthead FR-wiring assertion in coverage.test.ts repointed from Drills/Exercices to Practice/Pratiquer (an EN/FR-differing surviving hub label), preserving the flex-wrap and brand-immunity assertions unchanged."

patterns-established:
  - "Redirect-shim +page.ts template: 5 lines, prerender=true, throw redirect(308, target) — reused identically across all 8 shims."

requirements-completed: [HUB-02, HUB-03]

coverage:
  - id: D1
    description: "8 old routes (drills, build, voicings, progressions, scales, theory, recall, songs) each replaced with a prerender-safe +page.ts that 308-redirects to its owning hub"
    requirement: "HUB-03"
    verification:
      - kind: unit
        ref: "src/routes/redirectShims.test.ts#Redirect shims (Phase 30 HUB-03)"
        status: pass
      - kind: integration
        ref: "npm run build (build log prints `308 /drills -> /practice`, `308 /build -> /practice`, `308 /voicings -> /practice`, `308 /progressions -> /practice`, `308 /scales -> /learn`, `308 /theory -> /learn`, `308 /recall -> /progress`, `308 /songs -> /progress`)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Orphan /showcase route deleted entirely"
    requirement: "HUB-02"
    verification:
      - kind: unit
        ref: "test ! -e src/routes/showcase (verify command, Task 2)"
        status: pass
    human_judgment: false
  - id: D3
    description: "coverage.test.ts remapped: masthead FR-wiring now asserts Practice/Pratiquer; imports/describe blocks for the 6 deleted route pages removed; SongMark/SongFilterToggle FR coverage kept; file still compiles and is green"
    verification:
      - kind: unit
        ref: "npm test (1459 tests / 106 files pass, including src/lib/i18n/coverage.test.ts)"
        status: pass
      - kind: unit
        ref: "npm run check (0 errors, 0 warnings, 1378 files)"
        status: pass
    human_judgment: false
  - id: D4
    description: "15 obsolete route-bound test files deleted (each imported a deleted +page.svelte)"
    verification:
      - kind: unit
        ref: "npm test full-suite run after deletion (1459 tests / 106 files pass, no missing-module errors)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Phase-end green gate: npm run build, npm test, npm run check all green; no residual old-route href/goto navigation in src outside the shim +page.ts files"
    verification:
      - kind: integration
        ref: "npm run build / npm test / npm run check (all exit 0)"
        status: pass
      - kind: other
        ref: "grep sweep for href/goto to any of the 8 old routes or /showcase across src/**/*.svelte and src/**/*.ts — zero matches outside shim +page.ts files"
        status: pass
    human_judgment: false

# Metrics
duration: 20min
completed: 2026-07-25
status: complete
---

# Phase 30 Plan 05: Redirect Shims + Showcase Deletion + Green Gate Summary

**Turned 8 retired routes into 5-line prerender-safe 308 redirect shims to their absorbing hub, deleted the orphan /showcase route, remapped the i18n coverage gate and deleted 15 obsolete route-bound tests, and closed the phase with a fully green build/test/check gate.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-07-25T10:31:41Z
- **Completed:** 2026-07-25T10:43:20Z
- **Tasks:** 3
- **Files modified:** 18 (8 created +page.ts, 8 deleted +page.svelte, 1 deleted showcase route, 1 new test file, 1 updated test file, 15 deleted test files)

## Accomplishments
- All 8 old routes (drills, build, voicings, progressions, scales, theory, recall, songs) are now thin `+page.ts` shims that throw `redirect(308, target)` under `prerender = true`, proven prerender-safe by the build log printing all 8 `308 /x -> /y` lines
- Deleted `src/routes/showcase/` entirely (orphan duplicate of Lookup, not in nav)
- Added `redirectShims.test.ts` asserting the correct 308 status and location for all 8 shims
- Remapped `coverage.test.ts` off the 6 now-deleted route pages, repointing the masthead FR-wiring assertion to the surviving Practice/Pratiquer label and dropping the Build-half of the cross-surface chord-identity test
- Deleted the 15 obsolete route-bound test files named in the plan (7 in `tests/`, 8 in `src/routes/`)
- Closed the phase-end gate: `npm run build` (all 8 redirects prerender as static 308s), `npm test` (1459 tests / 106 files, all pass), `npm run check` (0 errors / 0 warnings across 1378 files)
- Grep sweep confirms zero residual `href`/`goto` navigation to any old route or `/showcase` outside the shim `+page.ts` files

## Task Commits

Each task was committed atomically:

1. **Task 1: Practice-bound redirect shims (drills, build, voicings, progressions)** - `8e2d7ce` (feat)
2. **Task 2: Learn/Progress-bound shims (scales, theory, recall, songs) and delete showcase** - `16883a9` (feat)
3. **Task 3: Redirect-assertion test, coverage-test remap, delete obsolete route tests, full green gate** - `9219b25` (test)

_Note: `npm run check` reported transitional errors after Tasks 1 and 2 (test files that still imported the not-yet-deleted `+page.svelte`s) — this was expected by the plan's own design, since Task 3 is the one that fixes/deletes those test files. The true green gate is only asserted after Task 3._

## Files Created/Modified
- `src/routes/drills/+page.ts` - 308 redirect to /practice
- `src/routes/build/+page.ts` - 308 redirect to /practice
- `src/routes/voicings/+page.ts` - 308 redirect to /practice
- `src/routes/progressions/+page.ts` - 308 redirect to /practice
- `src/routes/scales/+page.ts` - 308 redirect to /learn
- `src/routes/theory/+page.ts` - 308 redirect to /learn
- `src/routes/recall/+page.ts` - 308 redirect to /progress
- `src/routes/songs/+page.ts` - 308 redirect to /progress
- `src/routes/redirectShims.test.ts` - new test asserting all 8 shims' status/location
- `src/lib/i18n/coverage.test.ts` - remapped off deleted route pages, masthead assertion repointed to Practice/Pratiquer
- (deleted) `src/routes/{drills,build,voicings,progressions,scales,theory,recall,songs}/+page.svelte`
- (deleted) `src/routes/showcase/` (entire directory)
- (deleted) `tests/{drills,practice,reveal-insight,scales,theory,songs,showcase}.e2e.test.ts`
- (deleted) `src/routes/{drillsChordReplay,drillsPhoneStrip,drillsSongFilter,voicingsPage,progressionsPage,songsPage,recallSongFilter,theoryInteractiveLesson}.test.ts`

## Decisions Made
- The load()-throw redirect form prerenders cleanly under adapter-static; no client-side `goto()` fallback was required (the plan's fallback path was unused).
- Dropped (rather than rewrote) the cross-surface chord-identity test in coverage.test.ts that lost its Build-surface half, per the plan's explicit guidance.
- Masthead FR-wiring assertion repointed to Practice/Pratiquer (an EN/FR-differing surviving hub label) in place of the removed Drills/Exercices assertion.

## Deviations from Plan

None - plan executed exactly as written. The only wrinkle was that Task 1's and Task 2's own `npm run check` verify commands showed transitional errors from test files Task 3 was scoped to fix/delete; this is inherent to the plan's own task sequencing (not a defect requiring a fix) and resolved once Task 3 completed.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 30 is now feature-complete: 4-hub nav, seed handoff wiring, handoff repointing, redirect shims, and showcase deletion are all in place with a fully green suite.
- Phase 31 (no-regression gate + comprehensive test remap) can proceed: it inherits a clean baseline (1459 passing tests, 0 svelte-check errors) and picks up the deferred work explicitly flagged here (comprehensive per-route test remap, new interleaving/interval/redirect coverage).
- No blockers.

---
*Phase: 30-four-hub-nav-cutover-redirect-shims*
*Completed: 2026-07-25*
