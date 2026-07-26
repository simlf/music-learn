---
phase: 29-progress-hub-stats-streak-review-map-songs
plan: 03
subsystem: ui
tags: [svelte5, runes, bindable-props, recall, srs, dry-extraction]

requires:
  - phase: 29-progress-hub-stats-streak-review-map-songs
    provides: "Plan 29-02's SongManager fragment-with-heading-prop precedent for reusable extraction"
provides:
  - "RecallPanel.svelte: the /recall composition (Review|Map toggle + RecallSession + RecallMap) as a bare, reusable fragment"
  - "A $bindable mode prop pattern for exposing nested toggle state to a host <main> (data-review-dock gating)"
affects: [29-04, 29-05]

tech-stack:
  added: []
  patterns:
    - "Svelte 5 $bindable prop to expose a component's internal toggle state to its host, instead of lifting the state up or duplicating markup"
    - "Extracted panel is a bare fragment with no <main>/heading - the host owns page chrome and any dock-gating attribute"

key-files:
  created:
    - src/lib/components/RecallPanel.svelte
  modified:
    - src/routes/recall/+page.svelte

key-decisions:
  - "RecallPanel exposes mode via `let { mode = $bindable<Mode>('review') } = $props()` (Svelte 5 runes), not Svelte 4's `export let` - the plan's own CRITICAL note; verified by a clean `npm run check`"
  - "The data-review-dock gate stays host-owned: /recall/+page.svelte's <main> reads a local recallMode bound from RecallPanel via bind:mode, so the dock coupling is never duplicated inside the shared panel"

requirements-completed: [PROG-01]

coverage:
  - id: D1
    description: "RecallPanel.svelte holds the Review|Map toggle + RecallSession (default Review) + RecallMap as a bare fragment, exposing mode via a $bindable prop"
    requirement: "PROG-01"
    verification:
      - kind: unit
        ref: "src/lib/i18n/coverage.test.ts (Recall + RecallMap FR wiring describe block) - pass"
      - kind: unit
        ref: "npm run test (full suite, 1605 tests) - pass"
      - kind: other
        ref: "npm run check (svelte-check, 0 errors/0 warnings) - pass"
    human_judgment: false
  - id: D2
    description: "/recall/+page.svelte reduced to a thin wrapper rendering RecallPanel bind:mode, with data-review-dock preserved on the host <main>, behaving identically to before"
    requirement: "PROG-01"
    verification:
      - kind: unit
        ref: "src/lib/i18n/coverage.test.ts (Recall + RecallMap FR wiring describe block) - pass"
      - kind: unit
        ref: "npm run test (full suite, 1605 tests) - pass"
    human_judgment: false

duration: 15min
completed: 2026-07-25
status: complete
---

# Phase 29 Plan 3: Extract RecallPanel Summary

**Extracted the /recall Review|Map + RecallSession/RecallMap composition into a reusable `RecallPanel.svelte` exposing its nested mode via a Svelte 5 `$bindable` prop, then reduced `/recall/+page.svelte` to a thin wrapper that binds to it.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-07-25T03:00Z (approx.)
- **Completed:** 2026-07-25T03:09:39Z
- **Tasks:** 2/2 completed
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- Created `RecallPanel.svelte`: a bare fragment holding the Review|Map toggle, the reveal-then-grade `RecallSession` (default Review, wrapped in `{#key songFilterOn}`), and `RecallMap`, with no `<main>`/heading of its own.
- Exposed the panel's nested mode via `let { mode = $bindable<Mode>('review') } = $props()` (Svelte 5 runes) so a host can read/gate on the live nested state - explicitly avoiding the Svelte 4 `export let` syntax that would fail to compile in runes mode.
- Reduced `/recall/+page.svelte` to a thin wrapper: local `recallMode` state, `<RecallPanel bind:mode={recallMode} />`, with `data-review-dock` on the host `<main>` gated on `recallMode === 'review'` exactly as before.
- Verified `/recall` behaves byte-identically: the coverage recall FR-wiring test, the full 1605-test suite, and `svelte-check` all stayed green unedited.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create RecallPanel.svelte with a $bindable mode** - `0237773` (feat)
2. **Task 2: Reduce /recall/+page.svelte to a thin wrapper preserving the dock gate** - `1d80b32` (refactor)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/lib/components/RecallPanel.svelte` - New: Review|Map toggle + RecallSession/RecallMap composition as a bare fragment, `mode` exposed via `$bindable`.
- `src/routes/recall/+page.svelte` - Modified: reduced from the full composition (71 lines) to a thin wrapper (17 lines) rendering `RecallPanel` and owning the page frame + dock-gate attribute.

## Decisions Made
- Used Svelte 5's `$bindable()` rune (not `export let`) per the plan's explicit CRITICAL instruction and this repo's CLAUDE.md convention - confirmed compiling cleanly via `npm run check`.
- Kept `data-review-dock` gating entirely inside the host `<main>` (not inside `RecallPanel`), so the shared panel has zero knowledge of the dock and cannot introduce drift when reused by the Progress hub in plan 29-04.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
`RecallPanel.svelte` is ready for plan 29-04 (the Progress hub) to render via `<RecallPanel bind:mode={...} />`, with the hub responsible for its own `data-review-dock` gate (combining the active hub tab with the nested recall mode, per 29-PATTERNS.md's documented coupling). No blockers.

---
*Phase: 29-progress-hub-stats-streak-review-map-songs*
*Completed: 2026-07-25*

## Self-Check: PASSED

- FOUND: src/lib/components/RecallPanel.svelte
- FOUND: src/routes/recall/+page.svelte
- FOUND: 0237773
- FOUND: 1d80b32
