---
phase: 29-progress-hub-stats-streak-review-map-songs
plan: 01
subsystem: i18n
tags: [i18n, sveltekit, typescript]

# Dependency graph
requires: []
provides:
  - "progress-hub.* i18n domain (4 EN + 4 FR keys) for the hub's tab chrome"
affects: [29-04-progress-hub-host]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "New per-domain i18n dictionary file mirroring recall.ts's LocaleDict shape, registered at both the messages/index.ts merge point and the messages.test.ts collision-guard array"

key-files:
  created:
    - src/lib/i18n/messages/progress-hub.ts
  modified:
    - src/lib/i18n/messages/index.ts
    - src/lib/i18n/messages.test.ts

key-decisions:
  - "Domain holds only the 4 new hub-chrome keys (3 tab labels + 1 aria-label); absorbed progress/recall/songs copy stays untouched, matching the 'only pages move' boundary"

patterns-established:
  - "progress-hub.ts follows the established per-domain module pattern: type-only LocaleDict import, `export const progressHub = { en, fr } satisfies LocaleDict`, registered in both messages/index.ts spreads and messages.test.ts's domains collision array"

requirements-completed: [PROG-01]

coverage:
  - id: D1
    description: "progress-hub.* i18n domain created with 4 EN + 4 FR keys (tab.stats/tab.recall/tab.songs/aria.tabs), registered in messages/index.ts merge and messages.test.ts collision guard"
    requirement: "PROG-01"
    verification:
      - kind: unit
        ref: "src/lib/i18n/messages.test.ts#en/fr message parity (I18N-02) and domain dictionary key collisions (I18N-02)"
        status: pass
      - kind: unit
        ref: "src/lib/i18n/coverage.test.ts"
        status: pass
      - kind: other
        ref: "npm run check (svelte-check, 0 errors / 0 warnings, 1388 files)"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-25
status: complete
---

# Phase 29 Plan 01: Progress Hub i18n Domain Summary

**Registered the `progress-hub.*` i18n domain (4 EN + 4 FR keys for the hub's Stats/Recall/Songs tab chrome) so the Wave-2 hub host type-checks against `MessageKey`.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-25T02:49:00Z
- **Completed:** 2026-07-25T02:55:48Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created `src/lib/i18n/messages/progress-hub.ts` with `progress-hub.tab.stats`, `.tab.recall`, `.tab.songs`, and `.aria.tabs` in both EN and FR
- Registered the new domain in `messages/index.ts`'s merge point (both `messages.en` and `messages.fr` spreads)
- Registered the new domain in `messages.test.ts`'s collision-guard `domains` array
- All i18n gates (parity, collision, merged-size) and `npm run check` (svelte-check) stay green

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the progress-hub domain dictionary** - `70062cf` (feat)
2. **Task 2: Register progress-hub in the merge point and the collision guard** - `8aaf099` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified
- `src/lib/i18n/messages/progress-hub.ts` - New domain dictionary: 4 EN + 4 FR keys for the hub's tab chrome
- `src/lib/i18n/messages/index.ts` - Imports `progressHub` and merges `.en`/`.fr` into `messages.en`/`messages.fr`, placed adjacent to `progress.en`/`progress.fr`
- `src/lib/i18n/messages.test.ts` - Imports `progressHub` and adds `['progress-hub', progressHub.en]` to the collision-guard `domains` array

## Decisions Made
None - plan executed exactly as written. FR tone matched existing precedent verbatim (recall tab reads "Révision", songs reads "Morceaux" per the plan's explicit instruction).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
`progress-hub.*` keys resolve in EN and FR and type-check via `MessageKey`. Plan 29-04 (the hub host) can now reference `t('progress-hub.tab.stats' | '.recall' | '.songs')` and `t('progress-hub.aria.tabs')` without breaking `npm run check`. No blockers.

---
*Phase: 29-progress-hub-stats-streak-review-map-songs*
*Completed: 2026-07-25*

## Self-Check: PASSED

- FOUND: src/lib/i18n/messages/progress-hub.ts
- FOUND: 70062cf (Task 1 commit)
- FOUND: 8aaf099 (Task 2 commit)
