---
phase: 35-inversions-new-drill-family
fixed_at: 2026-07-27T00:00:00Z
review_path: .planning/phases/35-inversions-new-drill-family/35-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 35: Code Review Fix Report

**Fixed at:** 2026-07-27
**Source review:** .planning/phases/35-inversions-new-drill-family/35-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (CR-01 Critical, WR-01 Warning)
- Fixed: 2
- Skipped: 0

Both the BLOCKER and the WARNING are fixed with dedicated regression tests. The
full test suite (1597 tests, 114 files) and `svelte-check` (0 errors, 0
warnings) are green after both fixes.

## Fixed Issues

### CR-01: Bass ring (`bassHint`) shown unconditionally, spoiling the answer and bypassing the maturity fade

**Files modified:** `src/lib/components/InversionDrill.svelte`, `src/lib/components/inversionDrill.test.ts`
**Commit:** 8682402
**Applied fix:** Gated the `bassHint` prop the same way `ghostKeys` is gated. The
keyboard now receives `bassHint={!answered && ghostRevealed ? bassHintEntry :
null}` instead of the unconditional `bassHint={bassHintEntry}`. The bass
ink-ring + "B" badge therefore appears only once the ghost hint rung has been
revealed, never on the initial blank keyboard, never after answering, and never
at the `drill` (matured) stage — where `offeredRungs` is `[]`, so `ghostRevealed`
is always false. This restores the INV-02 maturity fade and makes the "right
notes, wrong bass" retry path reachable in normal play.

`PianoKeyboard`'s own `bassHint` contract (render the ring whenever a `bassHint`
is passed, layered on top of any role fill — deliberately NOT `!role`-gated) is
unchanged and still covered by `pianoKeyboard.bassHint.test.ts`; the gating now
lives entirely in the drill component that decides *when* to pass it.

Two regression tests were added to `inversionDrill.test.ts`:
- the bass ring is absent before any hint, absent after rungs 1 (bass copy) and
  2 (stack), and present (exactly one key, `data-bass="B"`) only after the ghost
  rung is revealed;
- a drill-stage (matured, `State.Review`) card never renders the bass ring at all.

### WR-01: Keyboard-only activation never recorded an octave, breaking bass detection for AT/keyboard users

**Files modified:** `src/lib/components/PianoKeyboard.svelte`, `src/lib/components/inversionDrill.test.ts`, `src/lib/components/components.test.ts`
**Commit:** 0dc7606
**Applied fix:** `onPress(letter, octave)` is now emitted from the interactive
branch of both activation choke points (`activateWhiteKey` / `activateBlackKey`),
not only from `handlePointerDown`. Enter/Space activation routes through
`onkeydown` → `handleKeydown` → `activate*Key`, which previously called
`toggleKey` but never `onPress`, so `pressedOctaveByLetter` stayed empty for
keyboard/AT users and `lowestPlayedBassChroma()` degenerated to "lowest chroma
among selected letters." Recording the octave on the shared activation path makes
any inversion whose bass is not the minimum-chroma tone (e.g. Dm7 2nd inversion,
bass A / chroma 9, versus C / chroma 0) winnable without a pointer.

The only consumer of `onPress` is `InversionDrill.handlePress`, an idempotent
last-press-wins `Map` set, so a pointer tap now reporting the octave twice
(pointerdown + activation, identical `letter`+`octave`) is harmless. The
key-touch sound still plays exactly once, from the choke point's `playKeyTouch`.

Tests:
- Added a regression test in `inversionDrill.test.ts` that wins the Dm7 2nd-
  inversion drill using keyboard activation only (`keyDown` Enter, no
  pointerdown) and asserts the reveal is reached and the wrong-bass retry line is
  not shown. Without the fix this voicing loops forever on wrong-bass.
- Updated the pre-existing `components.test.ts` "does not double-play" test:
  `onPress` now fires twice for a pointerdown+click gesture (was 1) while the
  key-touch sound still plays exactly once. This is the intended, direct
  consequence of the WR-01 change; the test's core invariant (sound plays once)
  is unchanged.

## Preserved invariants

- REG-01: no change to `composePracticeQueue` / `advanceHybridQueue`, `isCardedItem`,
  or any FSRS write path; inversion stays synthetic. Both fixes touch only
  `InversionDrill.svelte` (render gating) and `PianoKeyboard.svelte` (activation
  choke point).
- Chroma + bass grading via `matchInversion` is untouched — no spelled-letter
  comparison introduced.
- No em dashes introduced in any copy (fixes are logic/gating only, no user-facing
  strings changed).

---

_Fixed: 2026-07-27_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
