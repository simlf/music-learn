---
phase: 23-phase-first-ux-for-phone-bottom-tab-bar-nav-1a-drills-questi
reviewed: 2026-07-19T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - server/src/streak.ts
  - src/app.css
  - src/app.html
  - src/lib/api/progress.ts
  - src/lib/components/BottomSheet.svelte
  - src/lib/components/PracticeItemRow.svelte
  - src/lib/i18n/messages/chrome.ts
  - src/lib/i18n/messages/drills.ts
  - src/lib/i18n/messages/progress.ts
  - src/routes/+layout.svelte
  - src/routes/drills/+page.svelte
  - src/routes/progress/+page.svelte
findings:
  critical: 1
  warning: 4
  info: 2
  total: 7
status: resolved
---

## Fix Summary (applied post-review)

All Critical + Warning findings applied to the working tree; Info
findings (IN-01, IN-02) intentionally left unfixed per fix scope.

- **CR-01** (fixed, `ffe3b4f`): `.bottom-tab-bar` now has an explicit,
  unlayered `@media (min-width: 640px) { display: none; }` rule in its
  own scoped stylesheet, verified against the compiled build CSS. Added a
  static source-assertion test (`tests/masthead.e2e.test.ts`) since
  jsdom cannot evaluate media queries.
- **WR-01** (fixed, `5016c85`): removed the surface's blanket
  `onkeydown={stopPropagation}` so Escape genuinely bubbles to
  `svelte:window`'s handler regardless of focus origin inside the sheet.
  Added a `svelte-ignore a11y_click_events_have_key_events` (the onclick
  is a bubbling guard, not a click-to-activate affordance) plus
  regression tests.
- **WR-02** (fixed, `2dc1878`): added minimal WAI-ARIA APG modal dialog
  focus management to `BottomSheet.svelte` - focus moves into the
  surface on open, is trapped via Tab/Shift+Tab while open, and returns
  to the opener on close. Also guarded `handleBackdropKeydown` with an
  `event.target === event.currentTarget` check, since WR-01's fix
  exposed that a keydown bubbling from a focused descendant (e.g. Space
  on a toggle inside the sheet body) would otherwise incorrectly reach
  the backdrop's Enter/Space-to-close handler too.
- **WR-03** (fixed, `bbcd92e` - test-only, no source change needed):
  `AccuracyTable.svelte` already delegates row rendering to
  `PracticeItemRow.svelte`, which was updated in this phase to render
  the inline accuracy bar unconditionally on every row. AccuracyTable
  therefore already inherited the bar treatment through the shared
  component; no source changes were needed. Added a regression test
  (`progressComponents.test.ts`) asserting the bar renders in
  AccuracyTable so this stays caught.
- **WR-04** (fixed, `8b9c9a5`): the 7-day streak strip's aria-label now
  formats `day.date` via `Intl.DateTimeFormat(currentLocale(), {month:
  'long', day: 'numeric'})` instead of interpolating the raw ISO string,
  per the UI-SPEC's Copywriting Contract.
- **IN-01, IN-02**: intentionally skipped (out of fix scope per this run's
  instructions - Info findings excluded).

Full `npm test` (1322 tests, 91 files) and `npm run check` (0 errors)
green after every fix.

# Phase 23: Code Review Report

**Reviewed:** 2026-07-19
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Server-side `last7` derivation in `server/src/streak.ts` is correct (verified against its own new unit tests: ordering, gap handling, empty-history, duplicate-date collapsing all check out) and the client mirror in `progress.ts` is a clean additive/optional field. The 1B drills-strip phone/desktop split is implemented with an actual `{#if isPhone}` JS branch (not CSS display toggling), which is the right call and avoids the class of bug found elsewhere.

That "elsewhere" is the headline finding: I built the project (`npm run build`) and inspected the compiled CSS to confirm that **the new phone-only bottom tab bar in `+layout.svelte` is not actually hidden on desktop**. Tailwind v4's utilities live inside `@layer utilities`, while the component's own scoped `<style>` block is unlayered; per the CSS Cascade Layers spec, unlayered normal-priority rules always win over layered ones regardless of specificity or source order. The scoped `.bottom-tab-bar { display: flex; }` rule is unconditional (outside the component's own media query), so it beats Tailwind's `sm:hidden` (`display: none`, inside `@layer utilities`) at every viewport width. Confirmed directly in the built CSS asset (`.bottom-tab-bar.svelte-xxxx{display:flex}` appears unlayered, after `@layer utilities{...}` closes). The existing `masthead.e2e.test.ts` cannot catch this because jsdom never evaluates CSS/media queries at all (the test file's own comment says as much), so this shipped with a green test suite.

Two further issues in `BottomSheet.svelte`: the surface's `stopPropagation` handler is wired to `onkeydown` as well as `onclick`, which silently swallows the Escape keypress for any focus origin inside the sheet (contradicting the component's own doc comment), and the sheet never moves/traps focus on open, so keyboard/screen-reader users can tab into obscured background content behind the backdrop.

`AccuracyTable.svelte` was left completely untouched despite the UI-SPEC explicitly requiring the same accuracy-bar treatment there ("Apply the same accuracy-bar treatment to AccuracyTable.svelte") — that's a locked contract item that appears simply not implemented in this diff.

The 7-day streak strip's aria-label interpolates the raw ISO `day.date` string rather than a locale-formatted date, deviating from the UI-SPEC's explicit instruction.

## Critical Issues

### CR-01: Phone-only bottom tab bar also renders (and is visible) on desktop

**File:** `src/routes/+layout.svelte:100, 175-191`
**Issue:** The `<nav class="bottom-tab-bar sm:hidden">` relies on Tailwind's `sm:hidden` utility to hide the bar at `>=640px`. But the component's own scoped style sets `display: flex` unconditionally:

```css
.bottom-tab-bar {
	display: flex;
}

@media (max-width: 639.98px) {
	.bottom-tab-bar {
		position: fixed;
		...
	}
}
```

Tailwind v4 (`@import 'tailwindcss'` in `app.css`) emits its utilities inside `@layer utilities`. Svelte's scoped component `<style>` output is **not** wrapped in any `@layer`, i.e. it is unlayered. Per the CSS Cascade Layers spec, unlayered normal-priority rules always beat layered ones, regardless of specificity or source order. I verified this directly: `npm run build` then inspected `build/_app/immutable/assets/0.*.css` — `.sm\:hidden{display:none}` sits inside `@layer utilities{...}`, while `.bottom-tab-bar.svelte-xxxx{display:flex}` appears afterward, unlayered. The result: on every viewport, including desktop, `display: flex` wins, so the fixed bottom tab bar renders on top of (and duplicates) the full 8-link desktop masthead nav — directly violating the phase's locked "Desktop unchanged: … no bottom bar renders" requirement.

The existing `tests/masthead.e2e.test.ts` cannot catch this: its own comment states jsdom "does not evaluate media queries," so it only asserts markup presence, never actual visual hiding.

**Fix:** Don't depend on a Tailwind utility class to hide a component that also sets `display` unconditionally in its own scoped stylesheet. Make the component self-contained:

```css
.bottom-tab-bar {
	display: flex;
}

@media (min-width: 640px) {
	.bottom-tab-bar {
		display: none;
	}
}

@media (max-width: 639.98px) {
	.bottom-tab-bar {
		position: fixed;
		...
	}
}
```

(and drop `sm:hidden` from the markup, or keep it as a no-op belt-and-braces class — but the scoped rule above is what actually has to do the hiding). Re-run/extend the e2e test to assert computed `getComputedStyle(...).display` under a real browser-based check (e.g. Playwright) since jsdom cannot verify this class of bug at all.

## Warnings

### WR-01: BottomSheet swallows Escape (and all keydown) when focus is inside the sheet

**File:** `src/lib/components/BottomSheet.svelte:69-71`
**Issue:** The surface wires the same `stopPropagation` handler to both `onclick` (intentional — stops backdrop-close-on-click from firing) and `onkeydown`:

```svelte
<div
	class="bottom-sheet__surface"
	...
	onclick={stopPropagation}
	onkeydown={stopPropagation as unknown as (event: KeyboardEvent) => void}
>
```

`svelte:window onkeydown={handleWindowKeydown}` (line 45) is what implements "Escape closes the sheet regardless of where focus currently sits" (per the component's own doc comment at line 27). But any keydown that originates inside `.bottom-sheet__surface` — which is nearly all of the sheet's interactive surface (Close button, LevelPicker controls, mode tabs, etc.) — gets `stopPropagation()`'d before it can bubble to `window`, so `handleWindowKeydown` never fires and Escape does nothing when focus is anywhere inside the sheet body. This directly contradicts the documented intent and is a real accessibility regression (Escape-to-close is the baseline expectation for a modal dialog). The existing test (`bottomSheet.test.ts`, "calls onClose on Escape while open") only fires `keyDown` directly on `window`, never on an element inside the surface, so it never exercises this path and gives false confidence.
**Fix:** Only stop propagation for the events that need it (clicks, to prevent backdrop-close-on-click), not keydown:

```svelte
<div
	class="bottom-sheet__surface"
	...
	onclick={stopPropagation}
>
```

Remove the `onkeydown={stopPropagation}` from the surface entirely — there's no backdrop keydown-close behavior that clicking inside the surface needs to suppress (the backdrop's own Enter/Space handler only fires when the backdrop itself is focused, which can't happen while a descendant has focus). Add a regression test that fires `keyDown` on an element *inside* the surface (e.g. the close button or `sheet-body`) and asserts `onClose` is still called.

### WR-02: BottomSheet doesn't manage focus (no focus-trap, no initial focus, no return-focus)

**File:** `src/lib/components/BottomSheet.svelte:52-79`
**Issue:** The dialog surface has `tabindex="-1"` but nothing ever calls `.focus()` on it (or on a first focusable child) when `open` flips true, and there's no focus trap, so Tab can still move focus into the masthead/tab-bar/page content sitting behind the backdrop (those elements aren't marked `inert` or `aria-hidden` while the sheet is open). This falls short of the standard WAI-ARIA APG modal dialog pattern (move focus in on open, trap while open, restore focus to the trigger on close) and will be a real problem for keyboard/screen-reader users on both the More sheet and the Drills strip sheet.
**Fix:** In an `$effect` (or via `onMount`-style reaction to `open`), when `open` becomes `true`: call `surfaceEl.focus()` (or focus the Close button), and on close, return focus to the element that opened the sheet (the caller already has that reference — pass a ref back or focus in the caller). At minimum, add a `Tab`/`Shift+Tab` trap inside the surface, or mark sibling content `inert` while `open` is true.

### WR-03: `AccuracyTable.svelte` was not given the accuracy-bar treatment the UI-SPEC requires

**File:** `src/lib/components/AccuracyTable.svelte` (untouched by this diff — confirmed via `git diff 153447a..HEAD --name-only`)
**Issue:** 23-UI-SPEC.md, Interaction Specs / 1C, states plainly: "Apply the same accuracy-bar treatment to `AccuracyTable.svelte` (All Stats view)." `PracticeItemRow.svelte` got the new inline bar; `AccuracyTable.svelte` was never touched in this phase, so the All-Stats table still shows the old presentation while the Weakest-Spots list shows the new one — an inconsistent, half-shipped visual contract.
**Fix:** Either extract the bar markup/CSS from `PracticeItemRow.svelte` into a small shared snippet/component and use it in both places, or replicate the same track/fill markup directly in `AccuracyTable.svelte`'s row template, matching the same three-tier color thresholds.

### WR-04: 7-day streak strip aria-label uses the raw ISO date, not a locale-formatted one

**File:** `src/routes/progress/+page.svelte:172-178`
**Issue:** UI-SPEC (Copywriting Contract, `progress.streak.last7.*`) explicitly requires: "`{DATE}` substituted client-side with a locale-formatted date, same interpolation pattern as `songs.mark.count`'s `{N}`." The implementation does:

```svelte
aria-label={(day.practiced
	? t('progress.streak.last7.practicedAria')
	: isToday
		? t('progress.streak.last7.todayAria')
		: t('progress.streak.last7.missedAria')
).replace('{DATE}', day.date)}
```

`day.date` is the raw `YYYY-MM-DD` server string (e.g. `2026-07-15`), not a locale-formatted date, and this is identical in both `en` and `fr` renders — a screen reader will announce "2026-07-15 : pratiqué" in French rather than a natural French date.
**Fix:** Format via `Intl.DateTimeFormat` keyed to the active locale before interpolating, e.g. `new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric' }).format(new Date(day.date + 'T00:00:00'))`, mirroring how other date-bearing surfaces in the app already localize dates.

## Info

### IN-01: Weakest-Spots table rows have a variable cell count (ragged columns)

**File:** `src/lib/components/PracticeItemRow.svelte:70-81`, used from `src/routes/progress/+page.svelte:193-200`
**Issue:** The optional 5th `<td class="practice-row__action">` is only rendered `{#if showDrillButton}` (weak + chord items). In the Weakest-Spots table (which can list a mix of chord/scale/interval kinds), rows will have 4 or 5 cells depending on kind, which is valid HTML but means the action column's width/alignment is only established by the rows that happen to have it, and non-chord weak rows end without a trailing cell rather than an empty one.
**Fix:** Always render the 5th `<td>` (empty when there's no button, e.g. `<td class="practice-row__action">{#if showDrillButton}<Button ...>{/if}</td>`) so every row has a stable column count.

### IN-02: `isPhone` initial value can diverge from SSR output on first client paint

**File:** `src/routes/drills/+page.svelte:413-427`
**Issue:** `isPhone` is initialized synchronously from `window.matchMedia(...).matches` when `window` is defined. During SSR/prerender `window` is undefined so the server always emits the desktop-branch markup; during client hydration on an actual phone-width device, `window` **is** defined at construction time (unlike during SSR), so the very first client evaluation of `isPhone` can already read `true`, causing the client's initial branch to differ from the server-rendered DOM at hydration. This mirrors an existing, already-accepted pattern in this file (`hintDismissed`, explicitly called out in the code's own comment as the precedent), so it's not a new architectural decision, just worth flagging since it's exercised more/for a full layout branch here (LevelPicker/mode-tabs/SongFilterToggle stacks) rather than a single hint paragraph.
**Fix:** No action required if the existing hydration-mismatch tradeoff is accepted project-wide; if it becomes visible in practice (flash of desktop layout before the phone strip appears), consider deferring the phone/desktop branch decision to an `onMount`-gated flag instead of a construction-time read.

---

_Reviewed: 2026-07-19_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
