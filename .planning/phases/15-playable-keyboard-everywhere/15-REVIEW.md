---
phase: 15-playable-keyboard-everywhere
reviewed: 2026-07-15T22:38:16Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - src/lib/keyboard/dockCollapse.ts
  - src/lib/keyboard/dockContext.svelte.ts
  - src/lib/components/KeyboardDock.svelte
  - src/routes/+layout.svelte
  - src/routes/+page.svelte
  - src/routes/theory/+page.svelte
  - src/lib/components/ScaleKeyboardDrill.svelte
  - src/routes/scales/+page.svelte
  - src/routes/drills/+page.svelte
  - src/lib/components/RecallSession.svelte
  - src/lib/components/BuildSession.svelte
  - src/lib/keyboard/dockCollapse.test.ts
  - src/lib/keyboard/dockContext.svelte.test.ts
  - src/lib/components/keyboardDock.test.ts
  - src/routes/lookupDock.test.ts
  - src/routes/theoryDock.test.ts
  - src/lib/components/scaleKeyboardDrill.test.ts
  - src/routes/drillsDock.test.ts
  - src/lib/components/recallSession.test.ts
  - src/lib/components/buildSession.test.ts
  - tests/lookup.e2e.test.ts
  - tests/theory.e2e.test.ts
  - tests/drills.e2e.test.ts
  - tests/practice.e2e.test.ts
  - tests/reveal-insight.e2e.test.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 15: Code Review Report

**Reviewed:** 2026-07-15T22:38:16Z
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

Reviewed the shared keyboard-dock introduction: the `$state.raw` single-slot
registry (`dockContext.svelte.ts`), the dock chrome (`KeyboardDock.svelte`),
device-local collapse persistence (`dockCollapse.ts`), and the five page/
component registrants (Lookup, Theory, Scales/ScaleKeyboardDrill, Drills,
RecallSession + embedded BuildSession Mode C).

The core architecture holds up well under adversarial tracing. The concern the
phase brief flagged most loudly — last-writer-wins clobbering on the single
slot — is genuinely defused by the **token-guarded `clear`** (`clear(token)`
only nulls `current` when `current.token === token`). I traced every
mount/unmount ordering permutation (Drills `$effect` cleanup vs Lookup
`onMount`; RecallSession's effect vs the keyed BuildSession mount/unmount for
the Mode C handoff) and in every ordering the guard prevents a stale unmount
from wiping a newer registration. `$state.raw` is the correct choice
(preserves the identity equality `clear` relies on). Timer and effect cleanup
is disciplined in ScaleKeyboardDrill, BuildSession, and RecallSession. The
`ResizeObserver`/`document` SSR guards are present and correct. No em dashes in
UI copy; grading is chroma-based (`Note.chroma(...)`), never letter-string.

No blockers found. Three warnings (one core-flow UX gap, one leaked timer, one
ordering concern flagged for verification) and three info items.

## Warnings

### WR-01: Collapsing the dock hides the only answer-input surface on construction / build / scale-drill pages, and the choice persists across reload

**File:** `src/lib/components/KeyboardDock.svelte:35-38, 83-92`; `src/lib/keyboard/dockCollapse.ts:35-42`

**Issue:** After Phase 15 the docked keyboard is the *sole* input surface for
answer-requiring flows: Drills chord/interval **construction**, BuildSession
Mode C, and ScaleKeyboardDrill. `toggleCollapsed` removes
`.keyboard-dock__surface` from the DOM entirely (`{#if !collapsed}`) and
persists `collapsed=true` device-locally. A user who collapses the dock once
(even on a passive page like Lookup or Theory) then opens a construction drill
lands on a question whose Check button is disabled (`selected.size === 0`) with
no visible keys — the only recovery is noticing the bottom handle bar and
tapping "Keyboard · tap to expand". Because the flag survives reload, this
persists across sessions. This is recoverable (the handle is fixed and
labeled) but is a real trap for the core answer loop, and it is not exercised
by any test (no e2e covers collapse-then-answer).

**Fix:** Either (a) suppress collapse — or auto-expand — while the currently
registered config represents an input-required surface (e.g. add an
`interactive?: boolean` flag to `DockKeyboardConfig` and ignore the persisted
collapsed state when it is set), or (b) keep the handle but guarantee an
in-flow fallback control on those pages. At minimum, add a regression test that
collapses the dock and asserts a construction/scale-drill question is still
answerable.

### WR-02: `hearResolution` timer is never cleared on unmount (stray audio after navigation)

**File:** `src/routes/theory/+page.svelte:57-61, 87-89`

**Issue:** `hearResolution` schedules `setTimeout(() => playChord([...]), 800)`
but the component's `onDestroy` (line 87) only clears the dock registration —
it does not track or clear this timer. Tapping "Hear G7 resolve" and navigating
away within 800ms fires `playChord` against an unmounted component, playing a
chord with no visible source. `ensureAudioReady()` on line 58 is also called
without `void`/await, unlike every other call site in the codebase
(`+page.svelte:119`, `drills/+page.svelte`, RecallSession) which use
`void ensureAudioReady()`. This is inconsistent with the rigorous timer-cleanup
discipline the phase's own new components follow (BuildSession
`flashTimer`/`feedbackTimer`, ScaleKeyboardDrill `wrongTimer`, RecallSession
`hearNameAdvanceTimer` all cleared in `onDestroy`).

**Fix:**
```ts
let resolutionTimer: ReturnType<typeof setTimeout> | undefined;
function hearResolution() {
	void ensureAudioReady();
	playChord(['G', 'B', 'D', 'F']);
	clearTimeout(resolutionTimer);
	resolutionTimer = setTimeout(() => playChord(['C', 'E', 'G']), 800);
}
onDestroy(() => {
	clearTimeout(resolutionTimer);
	dockRegistry.clear(dockToken);
});
```

### WR-03: Embedded BuildSession may call `scrollRootIntoView` before its docked keyboard exists (verify)

**File:** `src/lib/components/BuildSession.svelte:179-196, 449-490, 532-546`

**Issue:** Standalone `/build` renders `buildKeyboard` inline synchronously, so
`bind:this={containerEl}` is set and `void tick().then(scrollRootIntoView)`
resolves the real node. When **embedded** (Mode C), `buildKeyboard` is only
rendered once the registration `$effect` (line 477) runs and KeyboardDock picks
up the new config — but `startChordConstruction`/`startScaleConstruction` are
invoked from the init `untrack` block (lines 501-518), which runs *before*
effects. If `containerEl` is still `undefined` when the `tick()` continuation
fires, `scrollRootIntoView` silently no-ops (`el?.scrollIntoView?.()`), so the
target chord's root key is not scrolled into view on the first Mode C render —
degrading the phone horizontal-scroll experience the method exists to fix.
Confidence is moderate: whether `containerEl` is populated by the time `tick()`
resolves depends on Svelte's effect/render flush ordering relative to the
microtask, which I could not prove by static reading alone.

**Fix:** Drive the scroll from a reactive effect that waits for the node rather
than a one-shot `tick()` at construction start, e.g.:
```ts
$effect(() => {
	if (sessionState === 'building' && containerEl) {
		scrollRootIntoView();
	}
});
```
or explicitly re-run the scroll after registration. Add a Mode C embedded test
asserting the root key is scrolled into view.

## Info

### IN-01: Formula-mode interval / scale-degree recall cards get an unrelated empty playable dock keyboard

**File:** `src/lib/components/RecallSession.svelte:223-227, 574-581`

**Issue:** The registration effect only excludes `formula-build` (Mode C), so a
`formula`-mode card whose `factKind` is `interval-size` or `scale-degree`
(e.g. "C to E — what's the interval?" or "Degree 5 of G major — which note?")
still registers `dockedKeyboard`, which falls through to
`<PianoKeyboard notes={[]} inspectable />`. The user is presented a full
playable keyboard with no relationship to the fact being recalled and no
inspect register wired to it. Consistent with the "keyboard everywhere" intent,
but arguably noise on a text-answer recall card.

**Fix:** If undesired, gate the `formula`-mode dock branch on
`currentFact?.factKind === 'chord-formula'` and skip registration otherwise.

### IN-02: ScaleKeyboardDrill re-registers a fresh dock config object on every correct tap

**File:** `src/lib/components/ScaleKeyboardDrill.svelte:132-138`

**Issue:** The register/clear effect tracks `drill.done`, but `drill` is
reassigned (`drill = result.state`) on every correct tap, re-running the effect
and calling `dockRegistry.register({ token, keyboard: keyStrip })` with a new
object literal each time. Because `keyStrip` is a stable snippet reference the
rendered dock content does not change, so this is correctness-neutral churn —
it does momentarily re-trigger KeyboardDock's `--dock-height` effect
(clear-to-0 then reset) on each tap. Harmless in a browser (synchronous, no
paint between), but needless.

**Fix:** Guard the register call so it only fires on the done→not-done edge, or
register once on mount and only toggle via `clear`/re-register on `done`
transitions.

### IN-03: `getDockRegistry()` return type asserts non-null but `getContext` can return undefined

**File:** `src/lib/keyboard/dockContext.svelte.ts:67-69`

**Issue:** `getDockRegistry(): DockRegistry` returns
`getContext<DockRegistry>(DOCK_CONTEXT_KEY)`, which is `undefined` when no
provider set the key. Every page calls it at init and dereferences the result
(`dockRegistry.register(...)`), so a missing provider would throw at a call
site rather than at the seam. BuildSession already handles this deliberately
(line 461-466: `Boolean(dockRegistry)`), demonstrating the value really can be
falsy — but the signature hides it from the other four callers.

**Fix:** Type the return as `DockRegistry | undefined` (matching reality) so
callers are forced to acknowledge the standalone-render case, or document that
all non-BuildSession callers assume the layout-provided context.

---

_Reviewed: 2026-07-15T22:38:16Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
