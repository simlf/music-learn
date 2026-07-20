---
phase: 24-mobile-ux-fixes-from-issue-14-review-action-dock-sketch-014-
plan: 02
subsystem: ui
tags: [svelte, mobile-ux, i18n, accessibility, navigation]

# Dependency graph
requires:
  - phase: 24-mobile-ux-fixes-from-issue-14-review-action-dock-sketch-014- (Plan 01)
    provides: phone-only review-action dock in RecallSession.svelte and the --review-dock-clearance token in src/app.css
provides:
  - Phone bottom tab bar restyled to sketch 015 winner B (icon + 9px micro-label), 56px tall
  - Per-route TAB_ICONS map (magnifier/keys/cards/note) + MORE_ICON, keyed off navLinks href
  - --tab-bar-clearance token updated from 64px to 56px base (shared by every page's bottom padding and Plan 01's review-dock offset)
  - masthead.e2e.test.ts coverage for icon+label structure and accessible-name survival under label truncation (EN + FR)
affects: [24-03, any future phase touching src/routes/+layout.svelte or the bottom-tab-bar]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Icon selection via a Record<string, string> keyed by route href (TAB_ICONS), never a second literal href array, so icons cannot drift from the single navLinks source"
    - "{@html} injection of hardcoded module-level SVG string constants, documented in-line as never sourced from user input/storage/network"

key-files:
  created: []
  modified:
    - src/routes/+layout.svelte
    - src/app.css
    - tests/masthead.e2e.test.ts

key-decisions:
  - "aria-label={t(link.labelKey)} set explicitly on each anchor/button so the accessible name is always the full localized label, independent of the 9px micro-label's possible ellipsis truncation"
  - "Icon SVGs use stroke: currentColor so the existing active-tab ink-fill/paper-text treatment recolors the icon for free, no separate active-icon CSS rule needed"

patterns-established:
  - "Icon+micro-label tab slot pattern (icon on top, 9px uppercase label below, aria-label carries full name) is the template for any future icon-bearing nav surface in this app"

requirements-completed: []

coverage:
  - id: D1
    description: "Phone bottom tab bar renders as icon + 9px micro-label per slot, 56px tall (down from 64px)"
    verification:
      - kind: unit
        ref: "tests/masthead.e2e.test.ts#renders each tab item as an icon plus a 9px micro-label (24-02, sketch 015-B)"
        status: pass
      - kind: unit
        ref: "npm run check — 0 errors, 0 warnings (source-level height:56px assertion)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Bar height is stable across EN and FR; long French labels do not force the bar taller or wrap"
    verification: []
    human_judgment: true
    rationale: "jsdom does not evaluate layout/CSS, so pixel height and wrap behavior across locales cannot be verified in this test environment. The Task 3 on-device checkpoint (390px viewport, EN|FR toggle) was offered; the user chose 'Defer testing, continue' — deferring this manual visual verification to a later /gsd-verify-work session rather than blocking the plan, trusting the green automated suite (npm run check + npm test) as sufficient evidence to proceed. STATUS: deferred, not completed — the real 390px phone check of bar height, FR/EN stability, icon legibility, and clearance remains pending and should be surfaced by the verifier as outstanding UAT."
  - id: D3
    description: "Each tab remains a real link/button with an accessible name equal to its full localized label, regardless of the visually-truncated 9px micro-label"
    verification:
      - kind: unit
        ref: "tests/masthead.e2e.test.ts#resolves each of the 4 primary tabs plus More by accessible name even though the visible micro-label may be clipped (24-02, sketch 015-B)"
        status: pass
      - kind: unit
        ref: "tests/masthead.e2e.test.ts#resolves the FR accessible names live after the locale flip (24-02, I18N-01/02)"
        status: pass
    human_judgment: false
  - id: D4
    description: "--tab-bar-clearance token updated to 56px so no page content hides behind the bar, and Plan 01's review-action-dock offset stays correct"
    verification:
      - kind: unit
        ref: "npm run check — 0 errors, 0 warnings (source-level calc(56px + env(safe-area-inset-bottom)) assertion)"
        status: pass
    human_judgment: true
    rationale: "Content-clearance correctness on a real device (no clipped last-content-row) is a visual on-device check, not something jsdom's non-layout DOM can verify. The Task 3 checkpoint was offered; the user chose to defer this on-device verification to a later /gsd-verify-work session. STATUS: deferred, not completed — pending on-device confirmation that no content is clipped behind the 56px bar."

# Metrics
duration: 25min
completed: 2026-07-20
status: complete
human_verification:
  - id: HV-24-02-01
    description: "On-device 390px phone viewport check: 56px icon+micro-label bar, FR/EN height stability (no wrap), icon legibility, active-tab ink-fill treatment, and content clearance at the bottom of a long page"
    status: deferred
    deferred_to: /gsd-verify-work
    reason: "User chose 'Defer testing, continue' at the Task 3 human-verify checkpoint, trusting the green automated suite (npm run check + npm test) as sufficient to proceed without blocking the plan on a manual visual pass."
---

# Phase 24 Plan 02: Icon + Micro-Label Bottom Tab Bar Summary

**Phone bottom tab bar restyled to sketch 015 winner B: inline-SVG icon + 9px uppercase micro-label per slot, bar height reduced 64px to 56px, with explicit aria-label wiring so accessible names survive French label truncation.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-20T12:08:00Z
- **Completed:** 2026-07-20T12:33:00Z
- **Tasks:** 3 of 3 (Tasks 1-2 auto, completed and committed; Task 3 human-verify checkpoint resolved by user deferral — see Checkpoint section below)
- **Files modified:** 3

## Accomplishments
- Phone bottom tab bar (4 primary tabs + More) now renders icon-on-top, 9px micro-label-below, 56px tall — reclaiming 8px of phone viewport regardless of locale
- Icon selection is href-keyed off the single `navLinks` source array (`TAB_ICONS: Record<string, string>`), so icons cannot drift from the nav's own route list
- `aria-label={t(link.labelKey)}` set explicitly on every tab anchor/button — accessible names are proven correct in both EN and FR by new tests, independent of the label's possible visual truncation
- `--tab-bar-clearance` token dropped from 64px to 56px base in `src/app.css`, correctly cascading to both every page's bottom padding AND Plan 01's `--review-dock-clearance`-stacked offset (RecallSession.svelte reads the token directly, no second constant to update)
- Full test suite (1331 tests / 91 files) and `svelte-check` (0 errors, 0 warnings) stay green after the markup change

## Task Commits

Each task was committed atomically:

1. **Task 1: Render each bottom-tab item as icon + 9px micro-label at 56px, and shrink the clearance token** - `6156a38` (feat)
2. **Task 2: Update masthead tests for the icon+label tab bar and FR/EN height stability** - `b172ebe` (test)
3. **Task 3: Human verify the icon + micro-label tab bar and FR/EN height stability** - resolved via user-approved deferral (no code change; see Checkpoint section below)

**Plan metadata:** the final `docs({phase}-{plan}): complete` commit and STATE.md/ROADMAP.md updates are owned by the orchestrator after all wave agents complete.

## Files Created/Modified
- `src/routes/+layout.svelte` - TAB_ICONS/MORE_ICON constant maps, icon+micro-label markup for the 4 primary tabs + More button, aria-label wiring, `.bottom-tab-bar__item` height 64px→56px with flex-column layout, new `.bottom-tab-bar__icon`/`.bottom-tab-bar__label` scoped styles
- `src/app.css` - `--tab-bar-clearance` token calc updated from `64px` to `56px` base, comment updated to reference both consumers (page padding + Plan 01's review-dock offset)
- `tests/masthead.e2e.test.ts` - 3 new tests: aria-label accessible-name resolution (EN), FR accessible-name resolution after live locale flip, icon+micro-label DOM structure assertion

## Decisions Made
- Icons are inlined as hardcoded module-level SVG string constants injected via `{@html}`, documented in a code comment as a locked trust invariant (never wire user/network data into this sink) — matches the plan's `<threat_model>` T-24-02-01 mitigation exactly.
- `stroke: currentColor` on every icon means the existing active-tab ink-fill/paper-text color rule recolors icons automatically; no new active-icon CSS rule was needed.
- No abbreviated label variants were added (sketch winner is B, not C) — the full localized label always drives both the micro-label text and the aria-label.

## Deviations from Plan

None - plan executed exactly as written. Task 1 and Task 2's acceptance criteria were all met without needing any Rule 1-4 auto-fixes; `npm install` was required once (dependencies were not yet installed in this worktree) but this is routine environment setup, not a deviation from the plan's scope.

## Issues Encountered
- `node_modules` was not present in this worktree at execution start (`npm run check` failed with `svelte-kit: command not found`); resolved by running `npm install`, which is standard first-run setup and not a code change.

## User Setup Required

None - no external service configuration required.

## Checkpoint: Task 3 Resolved (Deferred)

Task 3 (`checkpoint:human-verify`, `gate="blocking"`) required a human to visually verify the 56px icon+label bar on a real 390px phone viewport, per the plan's `how-to-verify` steps (icon legibility, FR/EN height stability with no wrap, active-tab ink-fill treatment, content clearance at the bottom of a long page, and optional screen-reader full-label announcement).

**Resolution:** the user responded "Defer testing, continue" — choosing to defer this manual on-device visual verification to a later `/gsd-verify-work` session rather than block the plan, trusting the green automated suite (`npm run check`: 0 errors/0 warnings; `npm test`: full suite green including the new masthead accessible-name and structure assertions) as sufficient evidence to proceed now.

This is **approved-with-deferral**, not a skip: the real-device check (bar height, FR/EN stability, icon legibility, content clearance) is still required and is tracked as a pending human-verification item (see `human_verification: HV-24-02-01` in the frontmatter and coverage items D2/D4 above) for a future `/gsd-verify-work` pass.

## Next Phase Readiness
- Tasks 1-2 are code-complete, tested, and committed on this worktree branch
- Task 3's human-verify checkpoint is resolved via user-approved deferral; plan is complete for merge purposes
- Outstanding: the on-device 390px phone verification (HV-24-02-01) should be picked up in a future `/gsd-verify-work` session before this UX change is considered fully validated end-to-end
- No blockers for Plan 01 or other Phase 24 plans

---
*Phase: 24-mobile-ux-fixes-from-issue-14-review-action-dock-sketch-014-*
*Completed: 2026-07-20 (3/3 tasks; Task 3 resolved via user-approved deferral to /gsd-verify-work)*
