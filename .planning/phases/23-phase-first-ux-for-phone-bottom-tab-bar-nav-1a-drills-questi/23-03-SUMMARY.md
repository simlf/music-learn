---
phase: 23-phase-first-ux-for-phone-bottom-tab-bar-nav-1a-drills-questi
plan: 03
subsystem: ui
tags: [svelte, progress, i18n, accuracy, streak]

# Dependency graph
requires:
  - phase: 23-02
    provides: "server/client StreakResult.last7? optional 7-day practiced array"
provides:
  - "PracticeItemRow.svelte: inline threshold-colored accuracy bar on every row + onDrill-gated per-row DRILL button"
  - "progress/+page.svelte: 7-day practiced strip (last7-backed, graceful no-op when absent), per-row DRILL wiring, Drill all N bulk CTA"
  - "i18n keys: progress.weakest.drillOne/drillOneAria/ctaAllN, progress.streak.last7.practicedAria/missedAria/todayAria (en+fr); progress.weakest.cta retired"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PracticeItemRow stays import-pure: onDrill is an optional callback prop, never a direct setDrillSeeds/goto import, so AccuracyTable's All-Stats view (which never passes onDrill) automatically excludes the button with zero extra logic"
    - "Accuracy-bar fill color threshold ($derived from item.accuracy) reuses the existing vermilion/mustard/verdigris interval-color tokens as a semantic accuracy gradient, no new hex"

key-files:
  created: []
  modified:
    - src/lib/components/PracticeItemRow.svelte
    - src/lib/components/progressComponents.test.ts
    - src/routes/progress/+page.svelte
    - src/lib/i18n/messages/progress.ts
    - tests/progress.e2e.test.ts

key-decisions:
  - "progress.weakest.drillOne/drillOneAria i18n keys were added in Task 1 (not deferred to Task 2 as the plan literally listed) because PracticeItemRow.svelte's DRILL button references them via t(), and MessageKey is a keyof-derived literal union: referencing an as-yet-unadded key would fail svelte-check before Task 2 ever ran. Task 1's own verification step requires npm run check clean, so the two keys needed to exist by then. This is a Rule 3 (blocking-issue) auto-fix, not a scope change - all six new keys still exist, bilingual, by the end of the plan."
  - "progress.weakest.cta retired outright (not kept as a deprecated fallback) after grep confirmed the message file itself was the only remaining reference once the page's own usage was renamed"

requirements-completed: [UX-1C]

coverage:
  - id: T1
    description: "Inline accuracy bar (threshold-colored fill) renders on every PracticeItemRow, replacing the border-left weak accent; a DRILL button renders only when onDrill is supplied AND the item is weak AND kind === 'chord'"
    requirement: "UX-1C"
    verification:
      - kind: unit
        ref: "src/lib/components/progressComponents.test.ts#renders the inline accuracy bar on every row, including a non-weak (strong) row"
        status: pass
      - kind: unit
        ref: "src/lib/components/progressComponents.test.ts#renders no DRILL button when onDrill is omitted, even for a weak chord item"
        status: pass
      - kind: unit
        ref: "src/lib/components/progressComponents.test.ts#renders a ghost DRILL button ... and clicking it calls onDrill with the symbol"
        status: pass
      - kind: unit
        ref: "src/lib/components/progressComponents.test.ts#renders no DRILL button for a weak SCALE item even when onDrill is supplied (chord-only)"
        status: pass
      - kind: unit
        ref: "src/lib/components/progressComponents.test.ts#renders no DRILL button for a non-weak chord item even when onDrill is supplied"
        status: pass
    human_judgment: false
  - id: T2
    description: "Progress page renders a 7-day strip only when last7 is present (7 squares); absent otherwise. Per-row DRILL seeds one symbol + navigates; bulk CTA reads Drill all N and still seeds all weak chords. Old key retired, six new keys bilingual."
    requirement: "UX-1C"
    verification:
      - kind: e2e
        ref: "tests/progress.e2e.test.ts#renders no strip when fetchStreak resolves without a last7 field"
        status: pass
      - kind: e2e
        ref: "tests/progress.e2e.test.ts#renders 7 streak-day squares when fetchStreak resolves a last7 array"
        status: pass
      - kind: e2e
        ref: "tests/progress.e2e.test.ts#reads \"Drill all 2\" for two weak chords, seeds the drill session with the weakest chord items, and navigates to /drills"
        status: pass
      - kind: e2e
        ref: "tests/progress.e2e.test.ts#the per-row DRILL button seeds only that one symbol and navigates to /drills"
        status: pass
      - kind: other
        ref: "npm run check (0 errors, 1331 files); npm test (root, 1305 tests / 91 files, all green)"
        status: pass
    human_judgment: false

duration: 9min
completed: 2026-07-19
status: complete
---

# Phase 23 Plan 03: Progress Glanceable + Actionable (1C UI half) Summary

**PracticeItemRow now shows a threshold-colored accuracy bar on every row with an onDrill-gated per-row DRILL button, and the Progress page renders a server-backed 7-day practiced strip plus a "Drill all N" bulk CTA.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-19T19:41:03Z (approx, continuing directly after 23-02)
- **Completed:** 2026-07-19T19:50:00Z (approx)
- **Tasks:** 2 completed
- **Files modified:** 5

## Accomplishments

- `PracticeItemRow.svelte`: removed the weak-only `border-left: 4px solid vermilion` accent; every row now renders an 8px hairline-bordered accuracy-bar track with a fill colored by threshold (`<50%` vermilion, `<70%` mustard, `>=70%` verdigris). `practice-row--weak` now only gates the optional per-row DRILL button, never border styling.
- Added an optional `onDrill?: (symbol: string) => void` prop; the component imports no navigation/storage (stays render-pure). The ghost DRILL button renders only when `onDrill` is supplied AND the item is weak AND `kind === 'chord'`. `AccuracyTable`'s All-Stats view never passes `onDrill`, so it automatically shows the bar with no button and keeps its existing 4-column shape.
- `progress/+page.svelte`: captures `last7` from `fetchStreak()`'s optional field into page state (defaulting to `[]` on absence or fetch error). Renders a `data-testid="streak-last7"` strip of 7 `data-testid="streak-day"` squares (32x32, 2px ink border) only when `last7.length > 0`; practiced days fill vermilion, today-unpracticed gets a dashed border, past-unpracticed stays solid-open. Each square carries a translated `aria-label` with `{DATE}` substituted client-side.
- Weakest Spots rows now pass `onDrill={(symbol) => { setDrillSeeds([symbol]); void goto('/drills'); }}` to `PracticeItemRow`, reusing the exact seam `drillThese()` already uses for the bulk case.
- Bulk CTA renamed from `t('progress.weakest.cta')` ("Drill these") to `t('progress.weakest.ctaAllN').replace('{N}', ...)` ("Drill all N"), N = weak chord count. `drillThese()` itself is unchanged.
- Added six new bilingual i18n keys: `progress.weakest.drillOne`, `progress.weakest.drillOneAria`, `progress.weakest.ctaAllN`, `progress.streak.last7.practicedAria`, `progress.streak.last7.missedAria`, `progress.streak.last7.todayAria`. Retired `progress.weakest.cta` (confirmed via grep it had no other callers).

## Task Commits

Each task was committed atomically:

1. **Task 1: PracticeItemRow accuracy bar + onDrill-gated DRILL button** - `c762a40` (feat)
2. **Task 2: Progress page 7-day strip + onDrill wiring + bulk CTA rename + i18n** - `84f1c44` (feat)

**Plan metadata:** commit pending (docs: complete plan)

## Files Created/Modified

- `src/lib/components/PracticeItemRow.svelte` - accuracy bar (every row) + onDrill-gated DRILL button, weak-accent border removed
- `src/lib/components/progressComponents.test.ts` - new assertions for accuracy-bar presence and DRILL-button gating (onDrill x weak x kind)
- `src/routes/progress/+page.svelte` - `last7` state, 7-day strip markup+CSS, onDrill wiring on Weakest Spots rows, bulk CTA rename
- `src/lib/i18n/messages/progress.ts` - 6 new bilingual keys added, `progress.weakest.cta` retired
- `tests/progress.e2e.test.ts` - renamed bulk-CTA assertion, new per-row-seed case, new 7-day-strip presence/absence cases

## Decisions Made

- `progress.weakest.drillOne`/`drillOneAria` were added during Task 1 rather than deferred to Task 2 as the plan's literal task split listed. `MessageKey` is `keyof typeof messages.en`, so `PracticeItemRow.svelte`'s new `t('progress.weakest.drillOneAria')` call would fail `svelte-check` (a listed Task 1 acceptance criterion) if the key didn't exist yet. This is a Rule 3 (blocking-issue) auto-fix: both keys are still bilingual and match the plan's exact copy contract, just landed one task earlier than the prose described.
- `progress.weakest.cta` was retired outright (deleted, not deprecated-in-place) since grep confirmed the message file itself was the only remaining reference after the page's own call site was renamed to `ctaAllN`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `progress.weakest.drillOne`/`drillOneAria` i18n keys added one task earlier than the plan's literal split**
- **Found during:** Task 1 (writing the PracticeItemRow DRILL button)
- **Issue:** The plan's Task 1 references `t('progress.weakest.drillOne')`/`t('progress.weakest.drillOneAria')` in `PracticeItemRow.svelte`, but the plan's Task 2 is where these keys were literally scheduled to be added to `src/lib/i18n/messages/progress.ts`. Since `MessageKey` is a `keyof`-derived literal union type, calling `t()` with a key not yet in the dict is a compile error, and Task 1's own acceptance criteria require `npm run check` to report 0 errors.
- **Fix:** Added both keys (en+fr) to `progress.ts` during Task 1, using the exact copy the plan/UI-SPEC specify ("Drill"/"Exercer", "Drill {ITEM}"/"Exercer {ITEM}").
- **Files modified:** `src/lib/i18n/messages/progress.ts`
- **Commit:** `c762a40`

## Issues Encountered

None beyond the deviation above.

## User Setup Required

None - no external service configuration required.

## Visual-Only Items Flagged for On-Device Eyeball

The preview harness cannot hydrate this app (null-origin SSR limitation); the following were verified via CSS assertion + Vitest DOM structure only, not perceived rendering, and should be eyeballed on a real device:

- Exact accuracy-bar fill colors at the three thresholds (vermilion/mustard/verdigris) reading correctly against the 1.5px ink border track.
- The 7-day streak strip's practiced-square fill (vermilion) and the dashed-vs-solid border distinction between today-unpracticed and past-unpracticed squares.
- Whether the practiced squares would benefit from the optional `.stamp`/`stamp-in` keyframe treatment mentioned as a nice-to-have in the UI-SPEC (not applied in this plan - kept the squares as static filled/bordered divs, no stamp animation added, since it was explicitly optional and the plan's must-haves don't require it).

## Next Phase Readiness

1C (UX-1C) is now fully complete across both halves: 23-02 (server `last7` field) and 23-03 (this plan's UI consumption). The Progress page's streak hero, Weakest Spots, and All-Stats surfaces all match the UI-SPEC's locked visual/interaction contract. No blockers for 23-01 (already executed, Wave 1) or the remaining 1A/1B waves in this phase.

No blockers.

---
*Phase: 23-phase-first-ux-for-phone-bottom-tab-bar-nav-1a-drills-questi*
*Completed: 2026-07-19*

## Self-Check: PASSED

All created/modified files found on disk; both task commits (c762a40, 84f1c44) verified in git log.
