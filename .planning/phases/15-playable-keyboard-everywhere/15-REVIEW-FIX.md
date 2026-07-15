---
phase: 15-playable-keyboard-everywhere
fixed_at: 2026-07-15T23:13:08Z
review_path: .planning/phases/15-playable-keyboard-everywhere/15-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 2
skipped: 1
status: partial
---

# Phase 15: Code Review Fix Report

**Fixed at:** 2026-07-15T23:13:08Z
**Source review:** .planning/phases/15-playable-keyboard-everywhere/15-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (WR-01, WR-02, WR-03 — the 3 warnings; the 3 info findings were out of scope)
- Fixed: 2
- Skipped: 1 (WR-03 — defect not reproduced, regression guard added, needs browser verification)

All fixes committed to the main working tree with hooks enabled (`npm run check`
clean, relevant Vitest files green before each commit). Worktree isolation was
disabled for this run per instructions.

## Fixed Issues

### WR-02: `hearResolution` timer is never cleared on unmount (stray audio after navigation)

**Files modified:** `src/routes/theory/+page.svelte`
**Commit:** 3f42a3d
**Applied fix:** Applied the reviewer's suggested fix verbatim. Added a
module-scoped `resolutionTimer` handle, cleared it before scheduling and inside
`onDestroy`, and changed the bare `ensureAudioReady()` call to
`void ensureAudioReady()` to match every other call site in the codebase.
Navigating away within the 800ms window can no longer fire `playChord` against an
unmounted component. Verified: `npm run check` clean; `theoryDock.test.ts` (5) and
`theory.e2e.test.ts` (11) pass.

### WR-01: Collapsing the dock hides the only answer-input surface, and the choice persists across reload

**Files modified:** `src/lib/keyboard/dockContext.svelte.ts`,
`src/lib/components/KeyboardDock.svelte`, `src/lib/components/ScaleKeyboardDrill.svelte`,
`src/lib/components/BuildSession.svelte`, `src/routes/drills/+page.svelte`,
`src/lib/components/RecallSession.svelte`, `src/lib/components/keyboardDock.test.ts`
**Commit:** 84bfaa6
**Applied fix:** Chose the reviewer's option (a). Added an `inputRequired?: boolean`
flag to `DockKeyboardConfig` (named `inputRequired` rather than the reviewer's
suggested `interactive` to avoid colliding with `PianoKeyboard`'s existing
`interactive` prop). When the currently registered config is `inputRequired`,
`KeyboardDock` ignores the persisted collapsed state (`surfaceVisible = inputRequired || !collapsed`)
and suppresses the collapse handle entirely, so an input-required surface can never
be hidden — closing the trap where a user who collapsed the dock on a passive page
lands on an unanswerable question with no visible keys.

Registrants set the flag precisely, not blanket-true:
- **ScaleKeyboardDrill** and **BuildSession (Mode C)**: `inputRequired: true` (the
  whole surface is the input).
- **Drills**: `inputRequired: question.direction === 'construction'` (via a
  `$derived`) — the flag stays true across the answered in-place reveal of a
  construction question so the reveal keyboard never vanishes mid-question;
  identification questions answer via in-flow choice buttons and keep the normal
  collapse handle.
- **RecallSession**: `inputRequired: currentItem?.mode === 'see-play'` (Mode A chord
  construction); Mode B (hear-name) and formula reveals stay inspect-only with the
  handle.

Added the regression test the reviewer requested to `keyboardDock.test.ts`: with
`collapsed=true` persisted, an `inputRequired` config still renders its keys and
shows no collapse handle.

Verified: `npm run check` clean; 131 dock-related unit tests pass
(keyboardDock, dockContext, drillsDock, scaleKeyboardDrill, buildSession,
recallSession, lookupDock, theoryDock); 92 relevant e2e tests pass
(drills, practice, lookup, theory).

**Note for human review:** This changes dock collapse behavior across five
surfaces. The logic is covered by a deterministic regression test, but a quick
visual pass on a phone (collapse the dock on Lookup, then open a construction
drill / Build It / scale drill) is worth doing to confirm the UX feels right.

## Skipped Issues

### WR-03: Embedded BuildSession may call `scrollRootIntoView` before its docked keyboard exists (verify)

**File:** `src/lib/components/BuildSession.svelte:179-196, 449-490, 532-546`
**Reason:** Defect not reproduced — marked needs-verification rather than applying
the speculative source change, per instructions. The reviewer's own confidence was
"moderate" and they could not prove the race by static reading. I wrote a faithful
reproduction test (`buildSession.test.ts`, committed 502bef1) that mirrors the real
app ordering: `KeyboardDock` already mounted (as it is in the layout), then a keyed
embedded `BuildSession` mounts and registers its `buildKeyboard` reactively. The
test spies on `Element.prototype.scrollIntoView` and asserts the root key is
scrolled into view. It passes: `scrollRootIntoView` runs exactly once from the init
`tick().then(...)` continuation, and the spy is called, proving `containerEl` was
already populated. Svelte's scheduler flushes the cross-component dock re-render
(triggered by the registry update) within the same flush cycle before `tick()`
resolves, so the one-shot scroll fires after `containerEl` is set.

No source change was made. The regression guard test is kept (this is the "add a
Mode C embedded test" the reviewer asked for). Because jsdom cannot exercise real
layout/scroll and the reviewer's concern was moderate-confidence, a quick
real-browser check of the first Mode C render on a phone (root key scrolled to the
left edge of the docked strip) is recommended to fully close this out.

**Original issue:** Standalone `/build` renders `buildKeyboard` inline synchronously
so `bind:this={containerEl}` is set before `void tick().then(scrollRootIntoView)`
resolves. When embedded (Mode C), `buildKeyboard` is only rendered once the
registration `$effect` runs and KeyboardDock picks up the config, but
`startChordConstruction`/`startScaleConstruction` are invoked from the init
`untrack` block, which runs before effects — so `containerEl` might be `undefined`
when the `tick()` continuation fires, making the scroll silently no-op.

---

_Fixed: 2026-07-15T23:13:08Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
