---
phase: 26-shared-intervalview-component
plan: 02
subsystem: i18n
tags: [svelte, i18n, typescript, message-catalog]

requires:
  - phase: 20-french-translation
    provides: LocaleDict type, messages/index.ts merge pattern, one-file-per-domain i18n convention
provides:
  - Five interval-view i18n keys (toggle stacked/formula, aria group/stacked/formula) in EN and FR
  - src/lib/i18n/messages/interval-view.ts domain file merged into the message catalog
affects: [26-03 (IntervalView component build), 28 (Learn hub reuse of IntervalView)]

tech-stack:
  added: []
  patterns:
    - "Cross-hub component copy gets its own domain file (interval-view.ts) rather than living in the consuming page's domain file (home.ts), since Lookup (now) and Learn (Phase 28) both render the component"

key-files:
  created:
    - src/lib/i18n/messages/interval-view.ts
  modified:
    - src/lib/i18n/messages/index.ts

key-decisions:
  - "interval-view.ts kept as its own domain file (per UI-SPEC's suggested-not-mandatory guidance), not folded into chrome.ts or home.ts, since the component is shared cross-hub (Lookup now, Learn Phase 28)"

patterns-established:
  - "Domain files import LocaleDict type-only from ./index and export `satisfies LocaleDict` (not `: LocaleDict`) so MessageKey widens correctly"

requirements-completed: [IVW-02]

coverage:
  - id: D1
    description: "Five interval-view i18n keys (toggle.stacked, toggle.formula, aria.group, aria.stacked, aria.formula) resolve to real EN and FR values"
    requirement: "IVW-02"
    verification:
      - kind: unit
        ref: "src/lib/i18n/coverage.test.ts#No raw-key leak across every domain (I18N-02) > every catalog key resolves to a real value (not the bare key) in both en and fr"
        status: pass
    human_judgment: false
  - id: D2
    description: "intervalView domain merged into messages.en/fr in index.ts, widening MessageKey and keeping svelte-check clean"
    requirement: "IVW-02"
    verification:
      - kind: other
        ref: "npm run check (svelte-check --tsconfig ./tsconfig.json) — 0 errors, 0 warnings"
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-07-24
status: complete
---

# Phase 26 Plan 02: Interval-View i18n Domain Summary

**Added the five interval-view toggle/aria i18n keys (EN + FR) as a dedicated `interval-view.ts` domain file and merged it into the message catalog, unblocking Plan 03's component build.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-24T18:12:20Z
- **Completed:** 2026-07-24T18:14:16Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `src/lib/i18n/messages/interval-view.ts` exporting `intervalView` with `interval-view.aria.group`, `interval-view.toggle.stacked`, `interval-view.toggle.formula`, `interval-view.aria.stacked`, `interval-view.aria.formula` in both `en` and `fr`, using the `satisfies LocaleDict` convention
- Merged `intervalView` into `src/lib/i18n/messages/index.ts`'s `messages.en`/`messages.fr` spreads, widening `MessageKey` to include the five new keys
- Verified via `coverage.test.ts`'s whole-catalog no-raw-key-leak sweep and `npm run check` (both clean)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the interval-view domain dictionary** - `89388e2` (feat)
2. **Task 2: Merge interval-view into the message catalog** - `3235125` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/lib/i18n/messages/interval-view.ts` - New domain file with the five interval-view keys in EN/FR
- `src/lib/i18n/messages/index.ts` - Imports `intervalView` and spreads its `en`/`fr` maps into `messages`

## Decisions Made
- Kept `interval-view.ts` as its own domain file (the UI-SPEC's suggested, not mandatory, location) rather than folding into `chrome.ts` or `home.ts`, since the component is shared cross-hub (Lookup now, Learn in Phase 28)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 03 can now reference the five real `interval-view.*` message keys when building the `IntervalView` component (toggle labels + aria group/segment labels). No blockers.

---
*Phase: 26-shared-intervalview-component*
*Completed: 2026-07-24*

## Self-Check: PASSED
