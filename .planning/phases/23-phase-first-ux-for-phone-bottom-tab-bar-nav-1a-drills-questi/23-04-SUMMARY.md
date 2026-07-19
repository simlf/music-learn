---
phase: 23-phase-first-ux-for-phone-bottom-tab-bar-nav-1a-drills-questi
plan: 04
subsystem: ui
tags: [svelte, i18n, layout, bottom-tab-bar, bottom-sheet, vitest]

# Dependency graph
requires:
  - phase: 23-phase-first-ux-for-phone-bottom-tab-bar-nav-1a-drills-questi
    plan: "01"
    provides: Shared BottomSheet.svelte primitive (backdrop/Close/Escape dismiss, safe-area aware)
provides:
  - Phone-only fixed bottom tab bar (Lookup/Drills/Recall/Songs/More) in +layout.svelte
  - More sheet (reuses BottomSheet) with Build/Scales/Theory/Progress + LocaleToggle
  - Slimmed phone masthead (brand + StreakBadge only, nav/LocaleToggle desktop-only)
  - --tab-bar-clearance shared CSS token + phone-only main padding-bottom
  - viewport-fit=cover for real safe-area-inset-bottom on the installed PWA
  - nav.more i18n key (en+fr)
affects: [phase-first-ux-for-phone]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "navLinks filtered (not duplicated as literal arrays) into bottomTabLinks/moreLinks so the three nav surfaces (desktop masthead, phone tab bar, More sheet) can never drift apart"
    - "Desktop-only chrome (nav-links row, LocaleToggle) hidden via hidden sm:flex / hidden sm:block wrapper, not removed from the DOM, so jsdom's no-media-query rendering intentionally dual-renders both breakpoints and existing/updated tests scope via within(getByTestId('masthead'))"
    - "One shared --tab-bar-clearance CSS custom property in app.css, applied to every main via a single phone-only media query, instead of a hand-copied calc per +page.svelte"

key-files:
  created: []
  modified:
    - src/routes/+layout.svelte
    - src/lib/i18n/messages/chrome.ts
    - src/app.html
    - src/app.css
    - tests/masthead.e2e.test.ts
    - src/lib/i18n/coverage.test.ts
    - tests/drills.e2e.test.ts

key-decisions:
  - "bottomTabLinks/moreLinks are derived via Array.filter over the single navLinks source array (not second literal arrays), so the desktop masthead, phone tab bar, and More sheet can never list different routes"
  - "A third test file (tests/drills.e2e.test.ts, 'drills masthead nav link') also renders +layout.svelte directly and needed the same within(masthead) scoping fix - not called out by name in the plan's Task 3 read_first list, but caught by 'run the FULL root suite; fix any OTHER test that renders +layout.svelte' instruction"
  - "More sheet's nav links close the sheet on tap (onclick sets moreOpen = false alongside the real href navigation), matching the plan's stated UX intent even though not explicitly required by the acceptance criteria list"

requirements-completed: [UX-1A]

coverage:
  - id: T1
    description: "Masthead has exactly one data-testid=\"masthead\" element; desktop nav-links/LocaleToggle become hidden sm:flex / hidden sm:block (content/order unchanged); phone-only bottom-tab-bar with 4 links + More"
    requirement: "UX-1A"
    verification:
      - kind: unit
        ref: "tests/masthead.e2e.test.ts#bottom tab bar + More sheet (23-04, UX-1A)"
        status: pass
      - kind: unit
        ref: "src/lib/i18n/messages.test.ts"
        status: pass
    human_judgment: false
  - id: T2
    description: "Active tab uses ink-fill/paper-text (never vermilion); More opens the shared BottomSheet with Build/Scales/Theory/Progress + LocaleToggle; closes on nav tap"
    requirement: "UX-1A"
    verification:
      - kind: unit
        ref: "tests/masthead.e2e.test.ts#marks the active tab with the ink-fill/paper-text treatment, never vermilion"
        status: pass
      - kind: unit
        ref: "tests/masthead.e2e.test.ts#opens the More sheet with Build/Scales/Theory/Progress links plus a LocaleToggle"
        status: pass
      - kind: unit
        ref: "tests/masthead.e2e.test.ts#closes the More sheet after tapping a nav link inside it"
        status: pass
    human_judgment: false
  - id: T3
    description: "viewport-fit=cover in app.html; --tab-bar-clearance token in app.css applied to every main under a phone-only media query; no per-page calc copies"
    requirement: "UX-1A"
    verification:
      - kind: unit
        ref: "npm run check (grep -q viewport-fit=cover src/app.html && grep -q -- --tab-bar-clearance src/app.css)"
        status: pass
    human_judgment: false
  - id: T4
    description: "Layout-rendering tests scoped to the phone/desktop split; full root vitest suite green; svelte-check 0 errors"
    requirement: "UX-1A"
    verification:
      - kind: unit
        ref: "npm test (1309 tests, 91 files)"
        status: pass
      - kind: unit
        ref: "npm run check (0 errors, 0 warnings, 1331 files)"
        status: pass
    human_judgment: false
  - id: T5
    description: "Active-fill contrast, More-sheet slide transition, and real-device notch/safe-area clearance"
    verification: []
    human_judgment: true
    rationale: "Preview harness cannot hydrate this app (null-origin SSR limitation); these are genuinely visual/tactile checks that require an on-device eyeball, per the phase's stated verification limitation carried from plan 23-01."

# Metrics
duration: 24min
completed: 2026-07-19
status: complete
---

# Phase 23 Plan 04: Bottom tab bar navigation (1A) Summary

**Phone (`<640px`) gets a fixed bottom tab bar (Lookup/Drills/Recall/Songs/More) with ink-fill active state and a More sheet holding Build/Scales/Theory/Progress + the EN|FR toggle, while the desktop masthead stays byte-identical.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-07-19T21:XX (Task 1 commit `dd5fbff`)
- **Completed:** 2026-07-19T21:59 (Task 3 commit `2d8edde`)
- **Tasks:** 3
- **Files modified:** 7 (0 created, 7 modified across the plan)

## Accomplishments

- Restructured `+layout.svelte`'s single `data-testid="masthead"` header so the desktop nav-links row and `LocaleToggle` become desktop-only (`hidden sm:flex` / `hidden sm:block`) while brand + `StreakBadge` stay visible at every width; desktop markup content/order is unchanged.
- Added a phone-only fixed `<nav data-testid="bottom-tab-bar">` with Lookup/Drills/Recall/Songs real links plus a More button; active tab reuses `LocaleToggle`'s ink-fill/paper-text treatment, never vermilion.
- Wired the More button to the shared `BottomSheet` (from plan 23-01) holding Build/Scales/Theory/Progress links and a second, centered `LocaleToggle`; tapping any sheet link closes the sheet.
- Added `viewport-fit=cover` to `app.html` and a single `--tab-bar-clearance` custom property in `app.css` applied to every route's `main` under one phone-only media query, so no `+page.svelte` needed a hand-copied padding calc.
- Added the bilingual `nav.more` i18n key (`More` / `Plus`).
- Updated `tests/masthead.e2e.test.ts`, `src/lib/i18n/coverage.test.ts`, and (discovered via the full-suite run) `tests/drills.e2e.test.ts` to scope desktop-nav queries via `within(getByTestId('masthead'))`, since jsdom renders both the desktop masthead and the phone bottom-tab-bar simultaneously (no media-query evaluation). Added new coverage for the tab bar, active-fill class, and the More sheet.
- Full root suite (1309 tests, 91 files) green; `npm run check` 0 errors / 0 warnings across 1331 files.

## Task Commits

Each task was committed atomically:

1. **Task 1: Responsive masthead + phone bottom tab bar + More sheet** - `dd5fbff` (feat)
2. **Task 2: viewport-fit=cover + shared tab-bar clearance padding** - `85081d4` (feat)
3. **Task 3: Update layout-rendering tests for the phone/desktop split** - `2d8edde` (test)

## Files Created/Modified

- `src/routes/+layout.svelte` - desktop nav-links row + `LocaleToggle` gated `hidden sm:flex`/`hidden sm:block`; new phone-only `bottom-tab-bar` nav (5 items, ink-fill active state); More sheet via `BottomSheet` with Build/Scales/Theory/Progress + `LocaleToggle`; `moreOpen` state; `bottomTabLinks`/`moreLinks` derived from the single `navLinks` array
- `src/lib/i18n/messages/chrome.ts` - added `nav.more` (en: "More", fr: "Plus")
- `src/app.html` - viewport meta gains `viewport-fit=cover`
- `src/app.css` - `:root { --tab-bar-clearance: calc(64px + env(safe-area-inset-bottom)); }` + `@media (max-width: 639.98px) { main { padding-bottom: var(--tab-bar-clearance); } }`
- `tests/masthead.e2e.test.ts` - scoped all desktop-nav/FR-toggle assertions to `within(getByTestId('masthead'))`; added a new `describe('bottom tab bar + More sheet (23-04, UX-1A)')` block (4 tests: tab bar links + More button, active-fill class, More sheet contents + LocaleToggle, sheet-closes-on-nav-tap)
- `src/lib/i18n/coverage.test.ts` - scoped the "Masthead FR wiring + nav flex-wrap fit rule" test's link/toggle queries to `within(getByTestId('masthead'))`
- `tests/drills.e2e.test.ts` - scoped the "drills masthead nav link" test's Drills-link query to `within(getByTestId('masthead'))` (discovered during the full-suite run, not named in the plan's read_first list)

## Decisions Made

- `bottomTabLinks` and `moreLinks` are computed by filtering the existing `navLinks` array by href (not written as second literal arrays), so all three nav surfaces (desktop masthead, phone tab bar, More sheet) share one source of truth and cannot silently drift apart if a route is ever added/renamed.
- Per the plan's instruction to "fix any OTHER test that renders `+layout.svelte`/`RootLayout`," the full-suite run surfaced a third affected file (`tests/drills.e2e.test.ts`'s "drills masthead nav link" test) beyond the two named in Task 3 - fixed with the same `within(masthead)` scoping pattern.
- More sheet nav links close the sheet on tap (`onclick={() => (moreOpen = false)}` alongside the real `href` navigation) per the plan's stated intent ("Close the sheet after a nav link is tapped"), with a dedicated regression test.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - blocking issue] `tests/drills.e2e.test.ts`'s masthead-link test broke under the intentional phone/desktop dual-render**
- **Found during:** Task 3's "run the FULL root suite" step
- **Issue:** `tests/drills.e2e.test.ts` has its own `describe('drills masthead nav link', ...)` block that renders `RootLayout` directly and queries `screen.getByRole('link', { name: 'Drills' })` unscoped - this became ambiguous once the phone bottom-tab-bar also renders a Drills link in jsdom.
- **Fix:** Scoped the query to `within(screen.getByTestId('masthead')).getByRole('link', { name: 'Drills' })`, matching the pattern applied to the two files named in the plan.
- **Files modified:** `tests/drills.e2e.test.ts`
- **Commit:** `2d8edde`

No other deviations - the plan's remaining tasks executed exactly as written.

## Issues Encountered

None beyond the test-scoping deviation documented above.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None - this plan's threat register (T-23-1A-01..03, all `accept`) covers the full surface introduced; no new network endpoints, auth paths, or trust-boundary changes were added beyond what the register anticipated.

## VISUAL Follow-ups (flagged for on-device eyeball, per the phase's stated preview-harness limitation)

- Active-tab ink-fill contrast against `--color-paper-bright` on a real phone screen.
- More sheet slide-in transition feel (200ms ease-out, `prefers-reduced-motion` guarded).
- Real notched-iOS safe-area clearance: confirm the bottom tab bar clears the home indicator (`env(safe-area-inset-bottom)`) and that every page's content clears the fixed bar (`--tab-bar-clearance`) on an installed PWA.
- The drills page's short-landscape two-pane `main` padding override (component-scoped, higher specificity) coexisting correctly with the new global phone-portrait `--tab-bar-clearance` rule in a genuinely narrow-landscape phone viewport.
- This also resolves the two open on-device follow-ups already tracked from plans 23-01/23-02/23-03 for this phase (sheet feel, notch clearance) - all now bundled into one final device pass since 1A is the phase's last plan.

## Next Phase Readiness

- Phase 23 (Phase-First UX for Phone) is now complete: 1B (drills reflow, plan 01), 1C (progress glanceable+actionable, plans 02-03), and 1A (bottom tab bar nav, this plan) have all shipped.
- All three `BottomSheet` consumers (drills strip sheet, More sheet) share the one primitive from plan 23-01 with no divergence, as the UI-SPEC's discretion note recommended.
- Full on-device verification pass (listed above) is the one remaining open item before the phase can be considered fully verified end-to-end.

---
*Phase: 23-phase-first-ux-for-phone-bottom-tab-bar-nav-1a-drills-questi*
*Completed: 2026-07-19*

## Self-Check: PASSED

All 8 created/modified files verified present on disk; all three task commit hashes (dd5fbff, 85081d4, 2d8edde) verified present in git log.
