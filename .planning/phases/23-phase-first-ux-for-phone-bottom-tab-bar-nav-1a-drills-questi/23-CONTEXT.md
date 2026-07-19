# Phase 23: Phase-First UX for Phone - Context

**Gathered:** 2026-07-19
**Status:** Ready for planning
**Source:** Direct decisions + SOURCE-SPEC.md (from UX Improvements.dc.html)

<domain>
## Phase Boundary

Three phone-first UX reworks, planned as one phase, executed in order 1B -> 1C -> 1A:

- **1B — Drills question-first reflow.** Collapse LevelPicker + mode tabs + SongFilterToggle into one compact strip that opens a sheet; put the prompt directly under it; anchor keyboard + Check in the thumb zone. Phone portrait only.
- **1C — Progress glanceable + actionable.** 7-day practiced strip on the streak hero (server-backed), inline accuracy bars on weak-item rows and the All-Stats table, per-row DRILL button, "Drill all N" bulk rename.
- **1A — Bottom tab bar nav (phone only).** Thumb-reachable bottom bar (Lookup, Drills, Recall, Songs, More-sheet); slim the phone header to brand + StreakBadge; add bottom padding so content clears the bar. Desktop masthead unchanged.

Everything ships bilingual (EN + FR) — the app was translated in Phase 20. Every new user-facing string needs a message in both locales.
</domain>

<decisions>
## Implementation Decisions

### Cross-cutting (all three tasks)
- **Phone breakpoint is `max-width: 640px`** (Tailwind `sm:` boundary already used app-wide). "Phone" = below `sm:`; "desktop" = `sm:` and up.
- **All new copy avoids em dashes** — use periods, colons, commas. (Project rule; UI strings only. This CONTEXT/plan prose may use them.)
- **All new copy is bilingual** — add keys to the existing i18n message modules (`src/lib/i18n/messages/*.ts`) for both EN and FR. No hardcoded English in components.
- **Reuse the LocaleToggle active-segment treatment** (ink fill / paper text) for any new active-state affordance (active tab, active strip segment).
- Keep all touch targets >= 44px.

### 1B — Drills question-first
- **Collapsed strip is phone-only** (< 640px). Desktop (`sm:`+) keeps the current full LevelPicker card and existing layout — it already fits above the fold. [RESOLVED gray-area]
- The strip is a single compact row: tier/mode summary (e.g. "TIER 1 · MIX ▾") + score register ("1/10 · 0 ✓"). Tapping the ▾ opens a sheet/accordion holding LevelPicker's full blurb, the mode tabs, and the SongFilterToggle. The full LevelPicker blurb shows inside the sheet, never inline on phone.
- **Reorder via the existing grid-area layout, not DOM reorder** — `drills/+page.svelte` already uses grid areas; reflow prompt directly under the strip and keyboard + Check/Clear into the thumb zone by changing grid placement only.
- **Keyboard is NOT a fixed/sticky dock.** It sits at the bottom of the page's normal flow (thumb zone) via grid order. The user previously rejected a fixed-bottom keyboard dock — keep the keyboard inline per page. (Distinct from 1A's nav bar, which IS a fixed bar.)
- Grow phone keyboard height ~160px -> ~180px; grow the Check button to ~52px tall.
- Rotate hint: keep it, but move it inside the sheet or show it as a one-time toast. Never above the question.
- The existing landscape two-pane layout (`@media (orientation: landscape) and (max-height: 600px)`) is unaffected.

### 1C — Progress glanceable + actionable
- **7-day strip is server-backed.** Extend the streak path to return per-day practiced data, not a client-only derivation. [RESOLVED gray-area]
  - Server: `computeStreak` in `server/src/streak.ts` already builds a `practicedDates` Set. Add a `last7` field to `StreakResult` — an ordered array (oldest->today, length 7) of `{ date, practiced }` derived from that same Set relative to the passed `today`. Keep `streak` and `practicedToday` unchanged (backward compatible). Update the querystring/response as needed in `server/src/routes/streak.ts`.
  - Client: mirror the new field on the `StreakResult` interface in `src/lib/api/progress.ts` (line ~39) and expose it from `fetchStreak`. Add server-side unit tests for the 7-day derivation (mirrors existing streak tests).
- **Streak strip rendering:** practiced day = vermilion stamped square; today when not-yet-practiced = dashed-open square. Reuse existing brand tokens for vermilion.
- **Inline accuracy bar** on `PracticeItemRow.svelte`, replacing the current thin left-border weak accent: 1.5px ink border track; fill color by accuracy — vermilion < 50%, mustard < 70%, verdigris >= 70%.
- **Apply the same accuracy-bar treatment to `AccuracyTable.svelte`** (All Stats view). Keep the existing `sm:` un-hide of the KIND column.
- **Per-row DRILL button** on weak chord items -> `setDrillSeeds([item])` then `goto('/drills')` — the same seam the bulk button already uses in `drillThese()`. `setDrillSeeds(symbols: string[])` is exported from `src/lib/practice/drillSeeds.ts`.
- **Rename the bulk CTA to "Drill all N"** (N = weak item count), bilingual.
- Optional on wide screens: cap the progress card width (~640px) so bars don't stretch absurdly. Nice-to-have, not required.

### 1A — Bottom tab bar nav (phone only)
- In `src/routes/+layout.svelte`, add a **fixed bottom tab bar shown only at `max-width: 640px`**. Five items: Lookup, Drills, Recall, Songs, More. 64px targets, mono uppercase labels, active tab = ink fill / paper text (LocaleToggle active-segment treatment).
- **"More" opens a sheet** containing: Build, Scales, Theory, Progress, plus the EN|FR `LocaleToggle` (LocaleToggle moves off persistent phone chrome into this sheet).
- **Slim the phone header** to brand + `StreakBadge` only (the 8-link nav row disappears on phone; it lives in the tab bar + More sheet).
- **Bottom padding:** every page whose main uses `min-h-screen` needs bottom padding equal to the tab bar height so content never hides under the bar. Audit `+page.svelte` files.
- **Desktop unchanged:** at `sm:` and up the current masthead (all 8 links, single row, no wrapping) stays; no bottom bar renders.
- **Tests:** keep `data-testid="masthead"` assertions passing, or update `tests/masthead.e2e.test.ts` to match the new phone/desktop split. Any new nav structure keeps a stable testid seam.

### Claude's Discretion
- Exact sheet/accordion component mechanics (transition, backdrop, dismiss-on-tap-outside) — pick the lightest approach consistent with existing components; no new dependency.
- Exact i18n key names and message-module placement.
- Whether the 1B strip and 1A More-sheet share a common "sheet" primitive or are bespoke — planner's call, but avoid duplicating logic if a shared primitive is cheap.
- Precise vermilion/mustard/verdigris token names (read the existing brand tokens / sketch-findings skill).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source spec (this phase)
- `.planning/phases/23-phase-first-ux-for-phone-bottom-tab-bar-nav-1a-drills-questi/23-SOURCE-SPEC.md` — the full verbatim task list with per-task desktop behavior.

### 1B — Drills
- `src/routes/drills/+page.svelte` — the page to reflow (grid-area layout).
- `src/lib/components/LevelPicker.svelte`, `SongFilterToggle.svelte` — fold into the strip/sheet.
- `src/routes/drillsSongFilter.test.ts`, `src/routes/drillsChordReplay.test.ts` — existing drills tests to keep green.

### 1C — Progress
- `src/routes/progress/+page.svelte` — streak hero + weak list + All Stats.
- `src/lib/components/PracticeItemRow.svelte`, `AccuracyTable.svelte`, `StreakBadge.svelte`.
- `src/lib/api/progress.ts` (StreakResult ~line 39, fetchStreak ~line 187) — client mirror of the server contract.
- `server/src/streak.ts`, `server/src/routes/streak.ts`, `server/src/streak.test.ts` (if present) — server-side 7-day extension + tests.
- `src/lib/practice/drillSeeds.ts` (`setDrillSeeds`) — per-row + bulk DRILL seam.

### 1A — Layout / nav
- `src/routes/+layout.svelte` — masthead + new bottom tab bar.
- `src/lib/components/LocaleToggle.svelte`, `StreakBadge.svelte` — reused in phone header / More sheet.
- `tests/masthead.e2e.test.ts` — keep passing or update.
- All `src/routes/**/+page.svelte` with `min-h-screen` — add bottom padding.

### Shared
- `src/lib/i18n/messages/*.ts` — bilingual copy for every new string.
- `.claude/skills/sketch-findings-music-learn/` — validated CSS patterns, brand tokens, visual direction (auto-loads on UI work).
</canonical_refs>

<specifics>
## Specific Ideas

- Suggested plan split (one plan per task, executed in this order): **1B** (drills reflow, biggest daily-friction win), then **1C** (progress + one server field), then **1A** (layout-wide, touches every page + e2e tests). 1C's server change is independent of 1B/1A and can be its own wave/plan.
- The preview harness cannot hydrate this app (null-origin SSR limitation) — visual-only checks (hover states, sheet transitions, exact colors) must be flagged to the user for on-device eyeballing rather than asserted via the preview pane. Prefer curl-SSR + CSS assertion + Vitest for what can be verified headlessly.
</specifics>

<deferred>
## Deferred Ideas

- Cross-device streak sync beyond what the existing server already provides — out of scope; the 7-day data reuses the current single-user answer store.
- Universal (desktop) version of the 1B collapsed strip — explicitly rejected for this phase; desktop keeps the full LevelPicker card.
- Realistic-piano audio, ear-training, and any non-UX feature work — unrelated to this phase.
</deferred>

---

*Phase: 23-phase-first-ux-for-phone-bottom-tab-bar-nav-1a-drills-questi*
*Context gathered: 2026-07-19 via direct decisions + SOURCE-SPEC*
