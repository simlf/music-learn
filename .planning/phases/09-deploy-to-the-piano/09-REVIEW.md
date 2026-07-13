---
phase: 09-deploy-to-the-piano
reviewed: 2026-07-13T23:45:10Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - src/app.css
  - src/app.html
  - src/lib/components/AccuracyTable.svelte
  - src/lib/components/PianoKeyboard.svelte
  - src/lib/components/PracticeItemRow.svelte
  - src/lib/components/components.test.ts
  - src/lib/components/keyboardLayout.test.ts
  - src/lib/components/keyboardLayout.ts
  - src/lib/components/progressComponents.test.ts
  - src/lib/drills/rotateHint.test.ts
  - src/lib/drills/rotateHint.ts
  - src/routes/+layout.svelte
  - src/routes/+page.svelte
  - src/routes/drills/+page.svelte
  - static/icons/icon.svg
  - static/manifest.webmanifest
  - tests/drills.e2e.test.ts
  - tests/manifest.test.ts
  - tests/masthead.e2e.test.ts
findings:
  critical: 0
  warning: 3
  info: 7
  total: 10
status: issues_found
---

# Phase 09: Code Review Report

**Reviewed:** 2026-07-13T23:45:10Z
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Reviewed the phase 09 mobile/PWA surface: the responsive PianoKeyboard (octave self-measurement, press cue, haptics, gesture hygiene, wrong-answer feedback mode), the pure keyboardLayout module with its chroma fallback, the drills page's portrait/landscape grid layout and rotate hint, the compact masthead, the mobile accuracy table, the PWA manifest/icons, and all accompanying tests.

The core logic is solid. I traced the `assignNotesToKeys` ascending-walk plus chroma fallback through several adversarial chord cases (Cdim7's B♭♭, F♯maj7's E♯, Db7's C♭, one-octave Bm7 wrap) and found no case where two notes collide onto one key or a note is dropped. `matchChord` cross-referencing, the wrong-letter/interval-role mutual exclusion, `flushQueue`'s internal error swallowing, and the manifest icon assets all check out. No security issues: no injection surface, no `{@html}`, no secrets; localStorage access is consistently try/catch-guarded.

Three warnings concern real (if non-crashing) behavioral/layout defects in the new drills grid and the keyboard's interaction/ARIA model; the info items are quality and consistency issues.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: Conditionally-rendered grid areas leave phantom rows whose gaps add dead space to the drill card

**File:** `src/routes/drills/+page.svelte:333-343` (portrait) and `:395-406` (two-pane landscape)
**Issue:** `.drill-layout` reserves explicit `grid-template-areas` rows for `hint`, `feedback`, and `next`, but those elements are conditionally rendered (`{#if !hintDismissed}`, `{#if answered && feedback}`, `{#if answered}`). CSS grid gutters apply between all explicit tracks regardless of content, so an empty row still contributes a `gap` on each side:
- Portrait, hint dismissed, not yet answered: empty `hint` row adds ~24px (`--spacing-lg`) of dead space above the prompt, and the empty `feedback` + `next` rows add ~48px below the Check/Clear controls — inside the bordered card, permanently visible.
- Two-pane landscape before answering: the empty `feedback feedback` / `next next` rows add ~32px (2 × `--spacing-md`) below the two panes, working against the very "no-scroll at 844x390" fix documented at lines 412-437.

This partially defeats the phase's thumb-zone/compact-fit goals whenever the optional rows are absent (which is the majority state: hint dismissed, question unanswered).
**Fix:** Only reserve areas for always-present elements and let conditional ones auto-place as full-width implicit rows (implicit rows are only created when an item exists, so no phantom gaps):
```css
.drill-layout {
	grid-template-areas:
		'prompt'
		'keyboard'
		'controls';
}
.drill-layout__hint,
.drill-layout__feedback,
.drill-layout__next {
	grid-column: 1 / -1;
}
.drill-layout__hint { grid-row: 1; } /* keep hint above prompt when present */
```
(mirror the same approach in the two-pane query), or switch the portrait base to a flex column with `gap`, keeping grid only where two-pane placement needs it.

### WR-02: `role="img"` container with `role="button"` children is an ARIA conflict that hides interactive keys from assistive tech

**File:** `src/lib/components/PianoKeyboard.svelte:254` (container), `:269`/`:298` (keys)
**Issue:** The keyboard container always carries `role="img"`, including in interactive mode. Per WAI-ARIA, `img` is a role with presentational children: conforming assistive technologies must prune all descendants — including the `role="button"` keys with their `aria-pressed`/`aria-label` — from the accessibility tree. The interactive/keydown affordances added for the drill input (and this phase's press-cue keys) are therefore spec-invisible to screen readers, and even where browsers don't prune, `role="img"` containing buttons is invalid ARIA. jsdom/testing-library does not implement presentational-children semantics, so the existing `getAllByRole('button')` tests cannot catch this.
**Fix:** Make the container role conditional:
```svelte
role={interactive ? 'group' : 'img'}
aria-label={keyboardAriaLabel(effectiveOctaves)}
```
`group` keeps the descriptive label while exposing the child buttons.

### WR-03: Press cue and haptic keep firing on a locked keyboard after a correct answer

**File:** `src/lib/components/PianoKeyboard.svelte:117-127`, `src/routes/drills/+page.svelte:114-123` and `:211-217`
**Issue:** After a correct construction answer, `showConstructionReveal` stays `false` (it requires `!feedback.correct`), so the keyboard remains `interactive={true}` while the drills page's `toggleKey` silently drops every toggle (`if (answered) return`). In the answered-correct window (until Next is pressed), each tap still fires `navigator.vibrate(10)` and the scale/shade press cue — feedback whose entire stated purpose (D-11: "an immediate, brief confirmation that a tap landed") now confirms taps that are discarded. The keys also keep `role="button"`/`tabindex=0` and a stale `aria-pressed` state while non-functional. The same tap-confirms-nothing mismatch exists for keyboard focus users (Enter/Space also no-op).
**Fix:** Lock the keyboard once answered, e.g. pass `interactive={!answered}` from the drills page if losing the selected hatch post-answer is acceptable, or add a `locked` prop to PianoKeyboard that keeps the selected/hatch visuals but suppresses pointer/keydown handlers, the haptic, and the pressed class:
```svelte
<PianoKeyboard ... interactive={!showConstructionReveal} locked={answered} ... />
```

## Info

### IN-01: Lookup page still duplicates the `stamp-in` keyframe that app.css claims is the single shared definition

**File:** `src/routes/+page.svelte:219-235`, `src/app.css:87-106`
**Issue:** app.css's comment states the shared `stamp-in` keyframe "lives here (not component-scoped) so both consumers share one definition instead of duplicating the keyframe," and the drills page's copy was removed accordingly — but the lookup page still declares its own local `@keyframes stamp-in` plus `.stamp` rule. Svelte scopes the local keyframe name, so the lookup page silently uses its private copy, not the shared one. Functionally identical today, but the two definitions can now drift.
**Fix:** Delete the local `@keyframes stamp-in` block (and keep only `.stamp { animation: stamp-in 240ms ease-out; }`) in `src/routes/+page.svelte`, matching what the drills page already does.

### IN-02: `min-height: 44px` on a table row has no effect

**File:** `src/lib/components/PracticeItemRow.svelte:45-47`
**Issue:** `min-height` on `display: table-row` elements is undefined per the CSS spec and ignored by browsers, so the rule documented as upholding "the app's touch-target rule" silently does nothing. Actual row height comes from cell padding + line-height (which happens to land near 44px anyway).
**Fix:** Either drop the rule and comment, or enforce height where it works: `height: 44px;` on the row (acts as a minimum for table rows), or bump cell vertical padding.

### IN-03: Each-key concatenation without a separator can theoretically collide

**File:** `src/lib/components/AccuracyTable.svelte:33`
**Issue:** `{#each items as item (item.item + item.kind)}` builds keys like `Cm7chord` by raw concatenation. Collisions require pathological symbol names today, but a separator makes the key unambiguous for free.
**Fix:** `` {#each items as item (`${item.item}:${item.kind}`)} ``

### IN-04: `pickVariant`'s rejection-sampling loop is unbounded under degenerate randomness

**File:** `src/routes/drills/+page.svelte:31-38`
**Issue:** `while (index === lastIndex)` redraws until a different index appears. With real `Math.random` this terminates with probability 1, but under a constant/mocked `Math.random` (exactly what this page's own test suite installs via `vi.spyOn(Math, 'random')`) a second wrong answer in one component instance would spin forever. Current tests happen to grade at most one wrong answer per render, so nothing hangs today — this is one test away from a hard hang.
**Fix:** Replace rejection sampling with a bounded pick:
```ts
let index = Math.floor(Math.random() * variants.length);
if (index === lastIndex) index = (index + 1) % variants.length;
```

### IN-05: `$app/stores` `page` store is deprecated in Svelte 5 / SvelteKit 2

**File:** `src/routes/+layout.svelte:4`
**Issue:** The masthead (modified this phase) still reads `$page` from `$app/stores`, deprecated since SvelteKit 2.12 in favor of `page` from `$app/state` (runes-based, no store subscription). Works today; scheduled for removal in SvelteKit 3.
**Fix:** `import { page } from '$app/state';` and use `page.url.pathname` directly (test mocks would move to `$app/state` accordingly).

### IN-06: Unmeasured/pre-hydration default is the two-octave board on phones

**File:** `src/lib/components/PianoKeyboard.svelte:97-99`
**Issue:** `effectiveOctaves` defaults to 2 until the ResizeObserver delivers a first measurement. With adapter-static prerendering, the served HTML shows a 15-white-key board (~13px keys on a 390px phone) until hydration + the first RO callback flips it to 1 octave — a brief layout jump on slow devices. Within a hydrated session RO fires before paint, so this is only visible around initial load.
**Fix:** Acceptable as-is for v1; if the flash proves visible, seed the initial guess from `window.innerWidth` when available (`typeof window !== 'undefined' ? octavesForWidth(window.innerWidth) : 2`) before the observer takes over.

### IN-07: Styling hooked on a `data-testid` selector couples layout CSS to test infrastructure

**File:** `src/routes/drills/+page.svelte:443-446`
**Issue:** The short-landscape compaction overrides the score register's margins via `[data-testid='score-register']`. Test IDs are conventionally test-only contracts; renaming or removing the testid for test reasons would silently break the landscape layout.
**Fix:** Add a class (e.g. `.drill-score`) to the `<p>` and target that in the media query, keeping `data-testid` purely for tests.

---

_Reviewed: 2026-07-13T23:45:10Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
