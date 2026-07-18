---
phase: 19-interactive-theory
reviewed: 2026-07-18T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/lib/lessons/thirdsLesson.ts
  - src/lib/components/InteractiveLesson.svelte
  - src/lib/practice/drillSeeds.ts
  - src/lib/practice/session.ts
  - src/routes/drills/+page.svelte
  - src/routes/theory/+page.svelte
  - src/lib/components/Button.svelte
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
fixed_at: 2026-07-18T16:42:15Z
fix_status: 4_of_5_resolved
---

# Phase 19: Code Review Report

**Reviewed:** 2026-07-18T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Traced the five correctness concerns called out in scope end to end:

1. **Chroma grading** — `gradeLessonTap`/`semitonesFromC` grade purely by `Note.chroma`, never letter strings. Verified the minor-third step (`targetChroma: 3`) correctly accepts both the `E♭` display spelling and the `D♯` sharp spelling the keyboard actually reports for that black key (`PianoKeyboard.activateBlackKey` always emits `key.sharpLetter`), matching the locked enharmonic-blind contract and its test coverage.
2. **Sound-off never dead-ends** — `playNote`/`playChord` self-guard on `soundEnabled()` internally (`audio.ts:207`, `:252`) and never throw; `InteractiveLesson`'s `handleTap`/`hearCurrent` call them unconditionally and advance `activeIndex` unconditionally on a correct tap, so a muted session still progresses. Confirmed by the existing sound-disabled test.
3. **Two seed channels stay independent** — `DRILL_SEEDS_KEY` and `LESSON_SEEDS_KEY` are distinct storage keys with symmetric, individually-`try/catch`-guarded read+clear functions; `drills/+page.svelte`'s init IIFE unconditionally calls both `consumeLessonSeeds()` and `consumeDrillSeeds()` every mount, so neither channel can leak into a later session regardless of which one "wins." This collision case (both present) is deliberately tested in `drillsSongFilter.test.ts:324` and the weak-list is intentionally dropped when a lesson handoff also exists — see Info-02 below for the one soft edge here.
4. **Button.svelte onclick-on-anchor fix** — does not double-fire (single `{onclick}` binding on the `<a>`) and does not change behavior for any existing `href`-only caller (none of the other 8 call sites pass `onclick`, so the new binding is a no-op for them). Found one real gap in the fix itself — see Warning-01.
5. **Step machine cannot wedge** — every active step either has a tap to grade (chroma-only, immediate unconditional advance on match) or is the one `targetChroma: null` step, which always renders a `Continue` button. Wrong taps only set a transient 450ms flash/hint and never block further taps; `flashTimer` is always cleared before being reassigned or on unmount.

No `{@html}`, no dangerous functions, no hardcoded secrets, no debug artifacts in the reviewed files. No Critical or High findings. Three Warnings (all Button.svelte-adjacent robustness/coverage gaps) and two Info notes below.

## Warnings

**RESOLVED 2026-07-18.** All three Warnings and IN-01 fixed; commits `384b608`, `4011abb`, `72511e5`, `e8686f6` on branch `feat/phase-18-20-songs-theory-i18n`. IN-02 left as-is per explicit instruction (intentional, already tested). Full `npm test` (1091 tests) and `npm run check` (0 errors) both pass after the fixes. See `19-REVIEW-FIX.md` for details.

### WR-01: Button.svelte's anchor branch silently drops every attribute in `...rest`

**Status: FIXED (commit `384b608`).**

**File:** `src/lib/components/Button.svelte:25-36`
**Issue:** `Props` extends `Omit<HTMLButtonAttributes, 'onclick'>`, and the destructure captures every attribute besides `variant`/`href`/`onclick`/`children` into `...rest`. The `<button>` branch spreads `{...rest}` (line 33), but the `<a>` branch (line 29) only ever applies `href`, `class`, and `onclick` — `id`, `aria-label`, `disabled`, `data-testid`, `style`, `name`, etc. passed by a caller are accepted by the type system but rendered nowhere when `href` is set. This is pre-existing (not introduced by this phase's diff), but the phase's own doc comment ("`onclick` ... so the SAME handler prop works whichever element actually renders") states an equivalence between the two branches that the component doesn't fully deliver — any future caller that passes e.g. `aria-label` to an `href` Button (very plausible: `redrillMiss`/`selectChoice` buttons elsewhere in this same file already pass `aria-label` to non-href Buttons) will silently lose it. No current caller triggers this today (checked all 9 `href=` Button usages across the codebase), so it's not user-visible yet, but it's a live trap for the next caller.
**Fix:**
```svelte
{#if href}
	<a {href} class="ps-button ps-button--{variant}" {onclick} {...rest}>
		{@render children()}
	</a>
{:else}
	<button class="ps-button ps-button--{variant}" {onclick} {...rest}>
		{@render children()}
	</button>
{/if}
```
(Note `rest` is typed from `HTMLButtonAttributes`, so spreading it onto an `<a>` will pass through some button-only attributes like `disabled`/`type` that don't apply to anchors — harmless as extra DOM attributes, but worth a follow-up if strict attribute typing matters later.)

### WR-02: Modified-click on the handoff CTA skips the lesson-seed write but still navigates

**Status: FIXED (commit `4011abb`).**

**File:** `src/lib/components/InteractiveLesson.svelte:277`
**Issue:** `<Button href="/drills" onclick={handleHandoff}>` relies on a native `click` event to run `setLessonSeeds(...)`. A middle-click or Ctrl/Cmd-click (open-in-new-tab) does not dispatch a `click` event in most browsers, only `auxclick`/`mousedown`, so the seed write is skipped while the browser still opens `/drills` in a new tab (via the anchor's plain `href`). The user lands on `/drills` believing the handoff worked (the CTA looked identical) but gets a normal pool-drawn question instead of the seeded `C`/`Cm` pair, with no feedback that anything was skipped. Low likelihood for a single-user, primarily-mobile-first app, but it is a real gap in the one interactive feature this phase's Button change exists to support.
**Fix:** Either accept the risk (single-user app, primary-click is the overwhelmingly common path) and document it, or make the seed write independent of the click type by writing the seeds eagerly once the handoff card renders (i.e., call `setLessonSeeds(THIRDS_LESSON_DRILL_SEEDS)` as soon as `activeIndex >= steps.length` is reached, rather than deferring it to the CTA's `onclick`), since the seeds are cheap/idempotent and only ever consumed once on the next `/drills` visit anyway:
```svelte
{#if activeIndex >= steps.length}
	<!-- write seeds as soon as the handoff card appears, not gated on the click -->
{/if}
```
with the write moved into the `$effect`/reactive block that flips the handoff card on, rather than `handleHandoff`.

### WR-03: Button.svelte has no dedicated unit/component test

**Status: FIXED (commit `72511e5`).**

**File:** `src/lib/components/Button.svelte`
**Issue:** This phase changed the type signature and both render branches of a component used on 9+ pages across the app, but there is no `Button.test.ts`/`button.test.ts` anywhere in the repo. Coverage of the new anchor-`onclick` behavior exists only incidentally, through `interactiveLesson.test.ts`'s handoff-card assertions (which happen to exercise `href` + `onclick` together). The `...rest`-spread asymmetry in WR-01 would have been easy to catch with even a minimal direct test (e.g., "an href Button spreads `disabled`/`aria-label` the same as a plain button").
**Fix:** Add `src/lib/components/Button.test.ts` covering: button branch renders `type`/`disabled`/`aria-label` from `rest`; anchor branch renders `href` and fires `onclick`; anchor branch (once WR-01 is fixed) also renders `aria-label`/`disabled` from `rest`.

## Info

### IN-01: `wrongHintFor`'s `n < 0` fallback is dead code in production

**Status: FIXED (commit `e8686f6`).**

**File:** `src/lib/components/InteractiveLesson.svelte:83-87`
**Issue:** `wrongHintFor` special-cases `semitonesFromC(tappedLetter) < 0` (unparseable tap) by stripping the "That's {N} keys up." lead-in. In practice `tappedLetter` only ever originates from `PianoKeyboard`'s `onConstructTap`, which always supplies a real key letter (`key.letter` or `key.sharpLetter`), so `Note.chroma` can never fail here and this branch is unreachable through the UI. It's harmless defensive code, but it's untested (no unit test reaches it since `wrongHintFor` isn't exported) and could bit-rot silently if the wording of the two `wrongHint` strings ever changes without updating the regex.
**Fix:** Either export `wrongHintFor` from the lesson module (alongside `gradeLessonTap`/`semitonesFromC`) so it can be unit-tested directly with a synthetic bad letter, or drop the dead branch and rely on `gradeLessonTap`'s own total behavior (a step is only ever active with an already-validated tap letter).

### IN-02: Lesson-seed handoff silently discards a pending "Drill these" weak-list seed

**Status: LEFT AS-IS (by explicit instruction).** Intentional trade-off, already covered by `drillsSongFilter.test.ts:324`; not changed.

**File:** `src/routes/drills/+page.svelte:130-153`
**Issue:** When both `consumeLessonSeeds()` and `consumeDrillSeeds()` return non-empty arrays on the same mount (e.g., user clicked "Drill these" on `/progress`, got distracted before visiting `/drills`, then separately finished the `/theory` lesson and clicked its handoff), the lesson seeds win and the weak-list seeds are consumed (cleared) and thrown away with no user-facing indication that the weak-list redrill never happened. This is intentional and already covered by `drillsSongFilter.test.ts:324` ("lesson seeds take precedence... "), so it's not a defect, just worth flagging as a UX trade-off: a previously-queued user action (Drill these) can vanish without any signal.
**Fix:** No action required if the current trade-off is accepted; if it matters later, consider merging the two queues (lesson seeds first, weak-list seeds appended after) instead of an either/or choice, so neither intent is lost.

---

_Reviewed: 2026-07-18T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
