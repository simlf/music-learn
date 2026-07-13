---
phase: 09-deploy-to-the-piano
plan: 06
subsystem: ui
tags: [svelte, tailwind, responsive, masthead, accuracy-table, e2e-test]

# Dependency graph
requires:
  - phase: 09-01
    provides: responsive PianoKeyboard (octavesForWidth) that Lookup/Progress inherit
provides:
  - Compact single-row mobile masthead with Showcase hidden below the small breakpoint
  - Mobile-fit Progress accuracy table (KIND column hidden via CSS, not removed from DOM)
  - New tests/masthead.e2e.test.ts covering mobile nav-link presence and Showcase's responsive class
affects: [09-deploy-to-the-piano remaining plans, any future nav/table UI changes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Responsive DOM-preserving hide: use `hidden sm:table-cell` / `hidden sm:inline` CSS display utilities instead of {#if} conditional rendering, so existing DOM-querying tests stay green while mobile users see a narrower layout."

key-files:
  created:
    - tests/masthead.e2e.test.ts
  modified:
    - src/routes/+layout.svelte
    - src/lib/components/AccuracyTable.svelte
    - src/lib/components/PracticeItemRow.svelte
    - src/lib/components/progressComponents.test.ts

key-decisions:
  - "Masthead: Showcase link kept in markup for desktop, hidden on mobile with a `hidden sm:inline`-style class (D-09)."
  - "Accuracy table: KIND column hidden with `hidden sm:table-cell` on both the header <th> and the PracticeItemRow <td>, never {#if}, to preserve getByText('CHORD') assertions (D-08 discretion)."

patterns-established:
  - "Pattern: DOM-preserving responsive hide (`hidden sm:*`) is the standard technique for hiding secondary UI on mobile without breaking existing tests that query hidden content by text."

requirements-completed: [PLAT-01]

coverage:
  - id: D1
    description: "Compact single-row mobile masthead with Showcase dropped on mobile, restored on desktop"
    requirement: "PLAT-01"
    verification:
      - kind: e2e
        ref: "tests/masthead.e2e.test.ts"
        status: pass
      - kind: manual_procedural
        ref: "Task 3 human-verify checkpoint at ~390px and desktop widths"
        status: pass
    human_judgment: true
    rationale: "Visual compactness and pixel-level fit at 390px require human eyes; automated tests confirm structure/classes but not visual polish."
  - id: D2
    description: "Progress accuracy table drops KIND column on mobile without breaking existing tests"
    requirement: "PLAT-01"
    verification:
      - kind: unit
        ref: "src/lib/components/progressComponents.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Lookup and Progress fit ~390px with no horizontal overflow and 44px+ tap targets"
    requirement: "PLAT-01"
    verification:
      - kind: manual_procedural
        ref: "Task 3 human-verify checkpoint"
        status: pass
    human_judgment: true
    rationale: "Overflow/tap-target sizing at a specific viewport width is a visual/interaction judgment call best confirmed by a human looking at the rendered page."

# Metrics
duration: 15min
completed: 2026-07-14
status: complete
---

# Phase 09 Plan 06: Mobile Masthead + Accuracy Table Polish Summary

**Compact single-row mobile masthead (Showcase dropped on mobile) and a mobile-fit Progress accuracy table (KIND column hidden via CSS), both DOM-preserving so existing tests stayed green**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-14T00:40:00+02:00 (approx, from first task commit)
- **Completed:** 2026-07-14T00:48:44Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 5 (4 modified, 1 created)

## Accomplishments
- Masthead is a single compact row on mobile with tightened spacing; Showcase link retained in markup but hidden below the small breakpoint, restored on desktop
- Progress accuracy table drops the KIND column on mobile (SYMBOL/ATTEMPTS/ACCURACY fit ~390px) via a DOM-preserving `hidden sm:table-cell` class, not conditional rendering
- New `tests/masthead.e2e.test.ts` asserts Lookup/Drills/Progress links resolve and Showcase carries the mobile-hidden class, without touching the existing drills masthead test
- Human-verify checkpoint confirmed at ~390px: masthead single row, no overflow on Lookup/Progress, Showcase and KIND both reappear at desktop width

## Task Commits

Each task was committed atomically:

1. **Task 1: Compact the mobile masthead and drop Showcase on mobile (with a masthead test)** - `56a8b1d` (feat)
2. **Task 2: Drop the KIND column on mobile in the accuracy table (DOM-preserving)** - `441435c` (feat)
3. **Task 3: Human verify — masthead, Lookup, and Progress fit the phone** - checkpoint, approved by user (no code changes)

**Plan metadata:** (this commit) `docs(09-06): complete plan`

## Files Created/Modified
- `src/routes/+layout.svelte` - Tightened mobile masthead spacing into one compact row; Showcase link hidden on mobile via responsive class, retained for desktop
- `src/lib/components/AccuracyTable.svelte` - KIND `<th>` hidden on mobile via `hidden sm:table-cell`
- `src/lib/components/PracticeItemRow.svelte` - KIND `<td>` (`.practice-row__kind`) hidden on mobile via `hidden sm:table-cell`; isWeak vermilion accent unchanged
- `src/lib/components/progressComponents.test.ts` - Added assertion that the KIND column carries the mobile-hidden responsive class, alongside existing CHORD/weak-accent assertions
- `tests/masthead.e2e.test.ts` - New test verifying Lookup/Drills/Progress links present and Showcase carries the mobile-hidden class

## Decisions Made
- Showcase link stays in the DOM at all viewport widths; only its visibility toggles via CSS, so no route/nav-array restructuring was needed (D-09).
- KIND column hidden via `hidden sm:table-cell` on both the header cell and row cell rather than `{#if}`, preserving `getByText('CHORD')`-style assertions in progressComponents.test.ts (D-08 discretion).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 09 (Deploy to the Piano) now has masthead and Progress/Lookup mobile polish complete; this was the last plan addressing D-08/D-09 mobile-fit decisions.
- No blockers introduced; existing Phase 8 blockers (CORS_ORIGIN, 401 messaging, SQLite bind-mount chown) remain open and unaffected by this plan.

---
*Phase: 09-deploy-to-the-piano*
*Completed: 2026-07-14*

## Self-Check: PASSED
