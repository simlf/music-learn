---
phase: 30-four-hub-nav-cutover-redirect-shims
plan: 01
subsystem: nav-chrome
tags: [i18n, svelte, nav, tab-bar]
dependency-graph:
  requires: []
  provides:
    - 4-hub navLinks source array (Lookup/Practice/Learn/Progress)
    - nav.practice / nav.learn i18n keys (EN/FR)
    - TAB_ICONS entries for /practice, /learn, /progress
  affects:
    - src/routes/+layout.svelte (desktop masthead + phone bottom tab bar)
    - src/lib/i18n/messages/chrome.ts
    - tests/masthead.e2e.test.ts
tech-stack:
  added: []
  patterns:
    - navLinks single source array; bottomTabLinks derived via .filter (never a second literal list)
    - TAB_ICONS keyed by href, inline SVG string constants, stroke currentColor
key-files:
  created: []
  modified:
    - src/lib/i18n/messages/chrome.ts
    - src/routes/+layout.svelte
    - tests/masthead.e2e.test.ts
decisions:
  - "navLinks reduced from 10 entries to exactly 4 (Lookup, Practice, Learn, Progress); bottomTabHrefs mirrors the same 4, still derived by filter"
  - "TAB_ICONS: /practice re-keys the former /drills keyboard glyph verbatim; /learn gets an open-book glyph; /progress gets an ascending-bars glyph, all copied exactly from 30-UI-SPEC"
  - "More affordance removed entirely (MORE_ICON, moreHrefs, moreLinks, moreOpen state, BottomSheet import/markup/button) since 4 hubs need no overflow slot"
  - "Old unused nav.* i18n keys and dead /recall, /songs TAB_ICONS entries intentionally left in place per CONTEXT.md deferred cleanup"
metrics:
  duration: 25min
  completed: 2026-07-25
status: complete
---

# Phase 30 Plan 01: Four-Hub Nav Cutover (chrome + i18n) Summary

Collapsed the site-wide navigation from 10 flat links to the 4 consolidated hubs (Lookup, Practice, Learn, Progress) on both the desktop masthead and the phone bottom tab bar, and removed the phone "More" bottom sheet entirely.

## What Was Built

- Added `nav.practice` (Practice / Pratiquer) and `nav.learn` (Learn / Apprendre) to both `en` and `fr` in `src/lib/i18n/messages/chrome.ts`, preserving the existing (now-unused) old-route keys per CONTEXT.md's deferred-cleanup decision.
- Reduced `src/routes/+layout.svelte`'s single `navLinks` source array to the 4-hub order: `/` (nav.lookup), `/practice` (nav.practice), `/learn` (nav.learn), `/progress` (nav.progress). The desktop masthead loop and `.masthead__link` CSS are unchanged, just rendering 4 items.
- Set `bottomTabHrefs = ['/', '/practice', '/learn', '/progress']`; `bottomTabLinks` stays derived via `navLinks.filter(...)`.
- Added 3 new `TAB_ICONS` entries: `/practice` re-keys the former `/drills` keyboard-glyph SVG verbatim, `/learn` gets an open-book glyph, `/progress` gets a three-ascending-bars glyph — all copied exactly from 30-UI-SPEC.md's SVG strings (viewBox 0 0 24 24, width/height 22, stroke currentColor, fill none, stroke-width 2, aria-hidden true). The existing `/` lookup magnifier icon is unchanged. The dead `/recall` and `/songs` TAB_ICONS entries are intentionally left (deferred cleanup).
- Deleted the More affordance completely: `MORE_ICON` constant, `moreHrefs`, `moreLinks` derivation, `moreOpen` state, the `BottomSheet` import, the `<BottomSheet>` markup block, the More `<button>` in the tab bar, and the now-dead `.more-sheet__*` CSS rules. `.bottom-tab-bar__item { flex: 1 }` already redistributes width across the remaining 4 slots with no CSS change needed. Confirmed `BottomSheet.svelte` is still used elsewhere (RecallSession.svelte, /drills page) so the component itself was not deleted.
- Rewrote `tests/masthead.e2e.test.ts`: masthead and bottom-tab-bar assertions now target Lookup/Practice/Learn/Progress (EN and FR), assert the More button is absent (`queryByRole` returns null) on both locales, and dropped the old Drills/Theory/Songs/More-sheet-open-close assertions. The CR-01 desktop-hide-rule regression suite (static source assertions) is kept unchanged since that mechanism didn't move.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stale comment referencing the removed BottomSheet**
- **Found during:** Task 2
- **Issue:** The `.bottom-tab-bar` CSS block's comment referenced "the BottomSheet backdrop/surface... so an open More sheet visually covers it" — no longer accurate once the More sheet was deleted.
- **Fix:** Reworded the comment to reflect the 4-hub, no-More-sheet state (Phase 30, HUB-01) while keeping the CR-01 technical explanation intact.
- **Files modified:** `src/routes/+layout.svelte`
- **Commit:** 297dc8f

None of the other deviation rules applied — the plan executed as written otherwise.

## Known Fallout (Expected, Deferred to Later Plans in This Phase)

Running the full `npm test` suite (not part of this plan's own verification scope — see 30-01-PLAN.md `<verification>`, which scopes to `npm run check` + `messages.test.ts` + `masthead.e2e.test.ts`) shows 7 pre-existing test files now fail because they assert on the old 10-link nav / More sheet that this plan intentionally removed:

- `tests/drills.e2e.test.ts`, `tests/progress.e2e.test.ts`, `tests/scales.e2e.test.ts`, `tests/theory.e2e.test.ts` — masthead nav-link assertions for now-removed old-route links
- `src/routes/progressionsPage.test.ts`, `src/routes/voicingsPage.test.ts` — assert the removed More sheet lists `/progressions`/`/voicings`
- `src/lib/i18n/coverage.test.ts` — FR nav flex-wrap fit-rule test asserts a `Drills` link that no longer exists

This is expected: `30-CONTEXT.md` explicitly assigns removing/neutralizing these obsolete route-page tests, the redirect shims, and handoff repointing to this phase's other plans (`30-02` through `30-05`, confirmed present on disk), not to this nav-chrome-only plan. This plan's own success criteria (exactly 4 hubs render, no More sheet, nav.practice/nav.learn resolve, masthead test file passes) are all met. No action taken here per the plan's explicit scope boundary and the deviation rules' scope-boundary clause (pre-existing tests in unrelated files are out of scope for auto-fix within a single plan).

## Self-Check: PASSED

- FOUND: src/lib/i18n/messages/chrome.ts
- FOUND: src/routes/+layout.svelte
- FOUND: tests/masthead.e2e.test.ts
- FOUND commit b466862 (nav.practice/nav.learn i18n keys)
- FOUND commit 297dc8f (4-hub navLinks, TAB_ICONS, More sheet removal)
- FOUND commit a6e69cf (masthead.e2e.test.ts update)
