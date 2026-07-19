---
phase: 23-phase-first-ux-for-phone-bottom-tab-bar-nav-1a-drills-questi
verified: 2026-07-20T00:10:00Z
status: human_needed
score: 15/15 must-haves verified (presence + wiring + regression evidence)
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "On a real phone (<640px, e.g. Chrome DevTools device mode or an actual device), confirm the bottom tab bar is visually hidden at >=640px and load /drills, /progress, / at phone width."
    expected: "Bottom tab bar (Lookup/Drills/Recall/Songs/More) shows only <640px; desktop masthead unchanged at >=640px; drills strip collapses chrome above the prompt with no scroll-per-question; keyboard ~180px, Check ~52px."
    why_human: "Preview harness cannot hydrate this SvelteKit app (null-origin SSR); jsdom cannot evaluate CSS media queries or perceived layout/spacing/no-scroll feel. Verified headlessly via built CSS source (confirms the CR-01 fix's cascade behavior) but real-device rendering/feel is unobservable from source."
  - test: "Open the More sheet and the Drills strip sheet on a real device; tab through their contents with a keyboard; press Escape from inside each; check the sheet slide-in feel and safe-area clearance on an installed PWA (notched iPhone)."
    expected: "Focus moves into the sheet, Tab traps within it, Escape closes from any focus origin, focus returns to the opener; sheet slides in smoothly; content clears the iOS home indicator."
    why_human: "Focus-trap/Escape logic (WR-01/WR-02 fixes) has jsdom regression tests that pass, but real assistive-tech/keyboard behavior and animation feel require an on-device pass."
  - test: "Eyeball the accuracy-bar fill colors (vermilion/mustard/verdigris thresholds) on PracticeItemRow and the 7-day streak strip's practiced (vermilion fill) vs today-dashed vs past-solid-open squares."
    expected: "Colors read clearly against the paper/ink chrome; the three accuracy tiers and three streak-square states are visually distinguishable."
    why_human: "Preview harness cannot render CSS color output; only class/style-attribute presence was asserted via Vitest."
  - test: "Confirm the active bottom-tab-bar item's ink-fill/paper-text contrast is legible in both light conditions and that it reads clearly as 'active', never confused with vermilion (reward/warning color)."
    expected: "Active tab is visually distinct via ink-fill, not vermilion."
    why_human: "Color contrast perception requires a real screen; only the CSS class and color-token values were confirmed in source."
---

# Phase 23: Phase-First UX for Phone Verification Report

**Phase Goal:** The app is phone-first where it matters most. Nav moves to a thumb-reachable bottom tab bar on phones (Lookup, Drills, Recall, Songs, More-sheet) with the top masthead slimmed to brand + streak; desktop keeps its full masthead. The Drills page puts the question first — LevelPicker/mode/song-filter fold into one compact strip, prompt sits directly under it, and keyboard + Check anchor in the thumb zone so no scroll per question. Progress becomes glanceable and actionable — a 7-day practiced strip on the streak hero, inline accuracy bars on weak-item rows and the All-Stats table, and a per-row DRILL button that seeds one item into /drills.

**Verified:** 2026-07-20
**Status:** human_needed (all automated/source-level checks pass; visual/tactile items are unobservable headlessly per the stated preview-harness constraint and are flagged below, not blocking)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | UX-1B: Phone (<640px) Drills page shows one compact strip replacing LevelPicker/mode row/SongFilterToggle, opening a bottom sheet with all four pieces unmodified | ✓ VERIFIED | `src/routes/drills/+page.svelte`: `isPhone` gate (line 424), `{#if isPhone}` strip (`data-testid="drill-strip"`, line 858) vs `{:else}` desktop branch (line ~932); sheet (line 874) contains `LevelPicker`, `drill-mode-row`, `SongFilterToggle`, `rotate-hint` in order. `drillsPhoneStrip.test.ts` (5 tests) exercises strip visibility, sheet open/close via Close + backdrop, `aria-expanded` flip, FR aria-label. `npm test` 1322/1322 green including unmodified `drillsSongFilter.test.ts`/`drillsChordReplay.test.ts` (desktop-branch regression proof). |
| 2 | UX-1B: Keyboard + Check sit in the thumb zone, keyboard never fixed/sticky; desktop byte-identical | ✓ VERIFIED | `@media (max-width: 639.98px)` block (line 1513) drops the `hint` grid area, grows `.piano-keyboard` to 180px and `.ps-button` to 52px min-height via `:global()` container override — no `position: fixed`/`sticky` anywhere in the file (grep confirmed, only a comment referencing the decision). Landscape two-pane queries untouched (not in this plan's diff). |
| 3 | UX-1C (server): GET /streak returns backward-compatible `last7` (7-length, oldest->today) | ✓ VERIFIED | `server/src/streak.ts` `computeStreak` derives `last7` via `previousDate()` walk + reverse; `cd server && npm test` 44/44 green including new last7 cases (first-day, gap, empty, dedupe) and unchanged 401/400 auth tests. |
| 4 | UX-1C (UI): Every PracticeItemRow shows an inline threshold-colored accuracy bar (replacing the old border-left accent), on both Weakest Spots and the All-Stats table | ✓ VERIFIED | `PracticeItemRow.svelte` renders `data-testid="accuracy-bar"` unconditionally (line 63); `AccuracyTable.svelte` delegates every row to `PracticeItemRow` with no `onDrill` prop (confirmed by direct read) — so the bar renders there too automatically. Code review's WR-03 finding was resolved with a regression test (`progressComponents.test.ts`) confirming this, not a source change (none was needed). `npm test` green. |
| 5 | UX-1C: Weak chord rows get a per-row DRILL button (seeds one item via setDrillSeeds+goto); All-Stats has none | ✓ VERIFIED | `PracticeItemRow.svelte` gates the button on `onDrill !== undefined && isWeak && item.kind === 'chord'` (line 51); `progress/+page.svelte` line 212 passes `onDrill={(symbol) => { setDrillSeeds([symbol]); goto('/drills'); }}` only in the Weakest Spots loop; `AccuracyTable` never passes `onDrill`. `progress.e2e.test.ts` asserts per-row seed + navigation. |
| 6 | UX-1C: 7-day strip on streak hero, server-backed, renders only when `last7` present | ✓ VERIFIED | `progress/+page.svelte` line 180 `{#if last7.length > 0}` renders `streak-last7`/`streak-day` squares; graceful no-op confirmed by e2e test asserting absence when `fetchStreak` omits `last7`. Aria-label uses `Intl.DateTimeFormat` (line 125) per the WR-04 fix, not a raw ISO string. |
| 7 | UX-1C: Bulk CTA reads "Drill all N" | ✓ VERIFIED | `progress/+page.svelte` line 223 `t('progress.weakest.ctaAllN').replace('{N}', ...)`; `progress.e2e.test.ts` asserts "Drill all 2" for two weak chords. |
| 8 | UX-1A: Fixed bottom tab bar (Lookup/Drills/Recall/Songs/More) on phone, active = ink-fill (never vermilion) | ✓ VERIFIED | `+layout.svelte` line 100 `<nav data-testid="bottom-tab-bar">`; `bottom-tab-bar__item--active` = `background: var(--color-ink); color: var(--color-paper)` (no vermilion token used anywhere in this block). `masthead.e2e.test.ts` asserts active class on the correct link per route. |
| 9 | UX-1A: More opens a sheet with Build/Scales/Theory/Progress + LocaleToggle; phone header slims to brand + StreakBadge | ✓ VERIFIED | `+layout.svelte` `moreLinks` filtered from `navLinks` (lines 41-42), rendered inside reused `BottomSheet` (line 123); desktop nav row + LocaleToggle wrapped `hidden sm:flex`/`hidden sm:block` (lines 82, 86) so phone shows only brand+StreakBadge. `masthead.e2e.test.ts` "opens the More sheet with Build/Scales/Theory/Progress links plus a LocaleToggle" passes. |
| 10 | UX-1A: Desktop (>=640px) masthead byte-identical, no bottom bar visible | ✓ VERIFIED (post code-review fix) | Original implementation had CR-01 (bottom bar visible on desktop due to Tailwind `@layer utilities` vs unlayered scoped-CSS precedence — `sm:hidden` couldn't win). **Fixed** with a self-contained unlayered `@media (min-width: 640px) { .bottom-tab-bar { display: none; } }` rule in the component's own `<style>` block. Confirmed directly in the **built production CSS** (`npm run build` → `build/_app/immutable/assets/0.DlIZUwk4.css`): `.bottom-tab-bar.svelte-12qhfyh{display:flex}@media (width>=640px){.bottom-tab-bar.svelte-12qhfyh{display:none}}` — same unlayered context, later rule wins, correctly hides the bar at >=640px regardless of the Tailwind-layer issue. A source-level regression test (`masthead.e2e.test.ts`, describe "bottom tab bar is actually hidden on desktop (CR-01, 23-REVIEW)") asserts the unlayered media-query rule exists and that no `@layer` wraps it. |
| 11 | Every full-height page gets bottom clearance so content never hides under the bar | ✓ VERIFIED | `src/app.css` defines `--tab-bar-clearance: calc(64px + env(safe-area-inset-bottom))` applied to `main` under `@media (max-width: 639.98px)`; `src/app.html` viewport meta includes `viewport-fit=cover` (grep-confirmed). No per-page hand-copied calc (grep across `+page.svelte` files found none). |
| 12 | BottomSheet dismiss paths (backdrop/Close/Escape) + focus management work correctly, including from inside the sheet | ✓ VERIFIED (post code-review fixes) | Code review found WR-01 (Escape swallowed when focus is inside the sheet body due to blanket `onkeydown={stopPropagation}` on the surface) and WR-02 (no focus trap/initial-focus/return-focus). Both fixed: `stopPropagation` now only wired to `onclick`; `handleSurfaceKeydown` implements a Tab/Shift+Tab trap; an `$effect` moves focus in on open and restores it to the opener on close. `bottomSheet.test.ts` has dedicated regression tests for Escape-from-inside-surface, Escape-from-Close-button, Space-not-mistaken-for-close, focus-in-on-open, focus-restore-on-close, Tab-trap-forward, Shift+Tab-trap-backward — all passing. |
| 13 | All new copy is bilingual (en+fr), no em dashes, chord symbols never translated | ✓ VERIFIED | Grepped `chrome.ts`, `drills.ts`, `progress.ts` for all new keys (`chrome.sheet.close`, `nav.more`, `drills.strip.ariaOpen/ariaClose`, `progress.weakest.ctaAllN/drillOne/drillOneAria`, `progress.streak.last7.*`) — all present in both `en` and `fr` blocks with distinct values; no em dash (—) found in any i18n message file. `messages.test.ts` parity + `coverage.test.ts` no-raw-key-leak both pass. |
| 14 | No debt markers / stubs in phase-touched files | ✓ VERIFIED | Grepped `TBD\|FIXME\|XXX` across all phase-touched source files (BottomSheet, +layout, drills/+page, progress/+page, PracticeItemRow, server/streak.ts) — zero hits. |
| 15 | Full automated verification suite green | ✓ VERIFIED | `npm test` (root): 91 files / 1322 tests, all pass. `cd server && npm test`: 4 files / 44 tests, all pass. `npm run check`: 1331 files, 0 errors, 0 warnings. `npm run build`: succeeds, static build written. |

**Score:** 15/15 truths verified. 0 behavior-unverified. All must-haves from the four PLAN.md frontmatter sections and the ROADMAP success criteria (UX-1A/1B/1C) are supported by both source-level evidence and passing automated tests, including regression tests added specifically to close the code-review's Critical + Warning findings.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/components/BottomSheet.svelte` | Shared bottom-sheet primitive, reused by 1B and 1A | ✓ VERIFIED | Exists, generic (no drills/nav-specific logic), imported by both `drills/+page.svelte` and `+layout.svelte`. |
| `src/routes/drills/+page.svelte` | isPhone gate + compact strip + grid reflow | ✓ VERIFIED | All present; desktop branch unchanged (existing tests green). |
| `server/src/streak.ts` / `server/src/routes/streak.ts` | `last7` field, unchanged querystring/auth | ✓ VERIFIED | `last7` derivation present; route passthrough unchanged; 401/400 tests intact. |
| `src/lib/api/progress.ts` | `StreakResult.last7?` optional | ✓ VERIFIED | Optional field confirmed; `npm run check` clean. |
| `src/lib/components/PracticeItemRow.svelte` | accuracy bar + onDrill-gated button | ✓ VERIFIED | Both present; render-pure (no goto/setDrillSeeds import). |
| `src/routes/progress/+page.svelte` | 7-day strip + onDrill wiring + CTA rename | ✓ VERIFIED | All present; `Intl.DateTimeFormat` locale-formats aria-label dates (WR-04 fix). |
| `src/routes/+layout.svelte` | responsive masthead + bottom tab bar + More sheet | ✓ VERIFIED | One masthead testid, one bottom-tab-bar testid, More sheet reuses BottomSheet. |
| `src/app.html` / `src/app.css` | viewport-fit=cover, --tab-bar-clearance | ✓ VERIFIED | Both grep-confirmed present. |
| i18n keys (all new, en+fr) | chrome.sheet.close, drills.strip.*, nav.more, progress.weakest.*, progress.streak.last7.* | ✓ VERIFIED | All present, bilingual, parity/coverage gates pass. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| Drills strip button | BottomSheet | `sheetOpen` state toggle | WIRED | `onclick={() => (sheetOpen = !sheetOpen)}`; `drillsPhoneStrip.test.ts` confirms open/close. |
| BottomSheet (More) | +layout nav links | `moreLinks` filtered from `navLinks` | WIRED | Same source array as desktop/tab-bar, cannot drift. |
| PracticeItemRow onDrill | setDrillSeeds + goto | Callback prop, parent-owned navigation | WIRED | Component stays render-pure; `progress.e2e.test.ts` confirms seed + navigation. |
| computeStreak.last7 | progress/+page.svelte 7-day strip | `fetchStreak()` optional field | WIRED | `progress.e2e.test.ts` confirms both presence and graceful absence. |
| Tailwind sm:hidden (belt-and-braces) + component's own unlayered @media | Desktop hiding of bottom-tab-bar | Self-contained unlayered CSS override | WIRED (verified in built CSS) | Confirmed the actual mechanism doing the hiding is the component's own unlayered `@media (min-width: 640px)` rule, not the Tailwind utility class (which remains present as a documented no-op). |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full root suite passes | `npm test` | 91 files / 1322 tests passed | ✓ PASS |
| Server suite passes | `cd server && npm test` | 4 files / 44 tests passed | ✓ PASS |
| Type-check clean | `npm run check` | 1331 files, 0 errors, 0 warnings | ✓ PASS |
| Production build succeeds | `npm run build` | Static build written successfully | ✓ PASS |
| Desktop CSS hiding of bottom-tab-bar | `grep` on built CSS asset | `.bottom-tab-bar{display:flex}` immediately followed by unlayered `@media (width>=640px){display:none}` in the same cascade context | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|-------------|-------------|--------|----------|
| UX-1B | 23-01 | Drills question-first phone reflow | ✓ SATISFIED | Strip/sheet/grid-reflow all present and tested; desktop regression-proof via unmodified existing suites. |
| UX-1C | 23-02, 23-03 | Progress glanceable + actionable (7-day strip, accuracy bars, per-row DRILL, bulk CTA rename) | ✓ SATISFIED | Server field + UI consumption both present and tested; WR-03/WR-04 review findings resolved. |
| UX-1A | 23-04 | Bottom tab bar nav (phone) + slimmed header + safe-area clearance | ✓ SATISFIED | Present, tested, and CR-01 (desktop leak) confirmed fixed in built CSS output — not just source claim. |

No orphaned requirements found for this phase in REQUIREMENTS.md.

### Anti-Patterns Found

None. Grepped all phase-touched files for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`/hardcoded-empty patterns — no hits requiring flagging. The one prior code-review Critical (CR-01) and both Warnings that touched runtime behavior (WR-01, WR-02) plus the two remaining substantive Warnings (WR-03, WR-04) are all confirmed resolved in the current source (see truths #10, #12, #4, #6 above), each backed by a dedicated regression test — not just a SUMMARY/REVIEW claim.

Info findings IN-01 (ragged Weakest-Spots column count) and IN-02 (isPhone hydration-mismatch tradeoff, matching an existing accepted app-wide pattern) were intentionally left unfixed per the review's own fix-scope decision; these are cosmetic/tradeoff items, not phase-goal blockers.

### Human Verification Required

1. **On-device phone-width pass (bottom tab bar visibility, drills no-scroll-per-question feel, keyboard/Check sizing)**
   **Test:** Load the app on a real phone (or Chrome DevTools device emulation) at <640px and at >=640px; navigate to /drills, /progress, /.
   **Expected:** Bottom tab bar shows only <640px; desktop is unaffected; drills page shows one prompt with no scroll to reach it; keyboard reads ~180px tall, Check button ~52px.
   **Why human:** Preview harness cannot hydrate this SvelteKit app; source/build-CSS evidence strongly supports correctness (see truth #10) but perceived layout, spacing, and "no scroll" feel are inherently visual/tactile.

2. **BottomSheet keyboard/focus behavior + slide-in feel on a real device**
   **Test:** Open the More sheet and the Drills strip sheet; Tab through contents; press Escape from various focus positions; observe the 200ms slide-in animation; check safe-area clearance on an installed PWA on a notched iPhone.
   **Expected:** Focus traps correctly, Escape always closes, focus returns to opener, animation is smooth (or absent under reduced-motion), content clears the home indicator.
   **Why human:** jsdom regression tests (7 new tests in `bottomSheet.test.ts`) prove the logic is wired correctly, but real assistive-tech interaction and animation feel need a device pass.

3. **Accuracy-bar and 7-day-strip color/visual distinction**
   **Test:** View the Progress page's Weakest Spots and All-Stats accuracy bars, and the 7-day streak strip.
   **Expected:** Vermilion/mustard/verdigris thresholds are visually distinguishable; practiced (vermilion fill) vs today-dashed vs past-solid-open squares are clearly different.
   **Why human:** Only class/style-attribute presence was asserted in tests; color perception requires a real screen.

4. **Active bottom-tab ink-fill contrast**
   **Test:** View the active tab-bar item on a real phone screen.
   **Expected:** Ink-fill/paper-text is legible and clearly reads as "active", distinct from vermilion.
   **Why human:** Contrast/legibility perception is not assertable from source or jsdom.

### Gaps Summary

No gaps. All must-haves across the four plans (23-01 through 23-04) are verified present, substantively implemented (not stubs), and wired — including the specific items a code review flagged as broken (CR-01's desktop leak, WR-01's Escape-swallowing, WR-02's missing focus management, WR-03's AccuracyTable bar, WR-04's raw-ISO aria-label). Each of those fixes was independently re-verified here against the actual current source and, where possible, against compiled build output — not merely accepted on the strength of 23-REVIEW.md's "resolved" status or the SUMMARY.md narratives. The only open items are four visual/tactile checks that this headless environment cannot observe (documented above), consistent with the phase's own stated preview-harness limitation; none of them represent a functional or wiring gap.

---

_Verified: 2026-07-20_
_Verifier: Claude (gsd-verifier)_
