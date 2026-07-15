---
phase: 10-scale-keyboard-drill
reviewed: 2026-07-15T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/lib/practice/scaleKeyboardDrill.ts
  - src/lib/practice/scaleKeyboardDrill.test.ts
  - src/lib/components/ScaleKeyboardDrill.svelte
  - src/lib/components/scaleKeyboardDrill.test.ts
  - src/routes/scales/+page.svelte
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: resolved
fixed_at: 2026-07-15T00:00:00Z
fixed:
  critical: 1
  warning: 3
  info: 0
  total: 4
skipped:
  total: 0
---

# Phase 10: Code Review Report

**Reviewed:** 2026-07-15T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** resolved (critical + in-scope warnings fixed; see Resolution below)

## Resolution

All findings targeted for this pass (CR-01, WR-01, WR-02, WR-03, WR-04) are fixed, committed atomically, and covered by tests. `WR-05` (test coverage for the `notes.length !== 7` degenerate-input path) was folded into the WR-01/WR-02 fix commit since it's the same test file/scenario. `IN-01`, `IN-02`, `IN-03` were left as-is (Info-tier, not requested for this pass).

| Finding | Commit | Summary |
|---------|--------|---------|
| CR-01 | `a48ff44` | `filledMap` is now an event-driven state map keyed by the physical key actually tapped (`kind:keyIndex`), not the precomputed canonical placement. A correct-but-non-canonical tap (any key sharing the expected degree's chroma) now visibly fills the key the user actually touched. Grading remains chroma-only — no letter-string equality introduced. Added a visible pre-tap cue (inset ring) for `data-tonic-key`, which previously had zero CSS. |
| WR-01 / WR-02 | `84f1089` | `createScaleKeyboardDrillState` and `placeAscendingScaleKeys` now validate all 7 input chromas up front and fail safe (empty state / `[]`) instead of silently defaulting an unparseable chroma to 0 (C) or letting a skipped note desync `placements.length`-derived degree numbering. `placeAscendingScaleKeys` now numbers each placement's degree from its fixed position in the ascending sequence, never from the output array's length. Also fixed `chromaFor` itself: `Note.chroma` returns `NaN` (not `undefined`) for unparseable input, so the `=== undefined` guards would never have fired without this normalization. Includes the WR-05 coverage (non-7-note input tests) plus new fail-safe-path tests for the unparseable-letter case. |
| WR-03 | `6e5d24c` | Added `onDestroy(() => clearTimeout(wrongTimer))` so a pending wrong-flash timer can't fire against an already-torn-down component instance. |
| WR-04 | `d47bdc3` | Per-key `aria-label` now carries a static, fill-independent scale-degree suffix (e.g. `"C4 key, scale degree 1"`) for the 8 canonical ascending-placement keys, restoring the semantics the retired ladder's `${letter} degree ${n}` label provided. The canonical key for the currently-expected target is marked `aria-current="step"`, and the position register is now `aria-live="polite"`. |

Verification: `npx vitest run` — 755/755 tests passing across 56 files (including new CR-01 duplicate-key-tap and WR-01/WR-02 fail-safe-path tests). `npm run check` — 0 errors, 0 warnings.

## Summary

Reviewed the commits tagged `10-01` (pure logic: `scaleKeyboardDrill.ts` + its unit tests) and `10-02` (the `ScaleKeyboardDrill.svelte` component, its component test, and the `/scales` wiring/retirement of `ScalePractice`/`scaleDrill.ts`).

The core chroma grading (`gradeScaleTap`) is correctly octave-agnostic and never uses letter-string equality — this satisfies the SCALE-04 constraint and the primary defect the phase set out to fix. The 15-target ascending-then-descending state machine is structurally sound at start/turnaround/completion, verified against the fixed 12-tonic `MAJOR_SCALE_ROOTS` domain (traced C, G, F♯, B♭, A, B major by hand; all 8 ascending degrees land within the 2-octave board with the octave landing on a distinct key). `placeAscendingScaleKeys`'s unified-ordinal cursor walk is a legitimate fix for the `assignNotesToKeys` collision the plan called out.

However, one **critical** interaction bug exists in `ScaleKeyboardDrill.svelte`: because a 2-octave board always contains a second (and for some tonics a third) instance of every pitch class, and `gradeScaleTap` accepts *any* key whose chroma matches (by design, per the UI-SPEC's discretionary note), a correct-but-non-canonical tap advances the drill and plays audio, but visually fills the pre-computed *canonical* key — not the key the user actually touched — leaving the tapped key with **no feedback at all** (not filled, not wrong-flashed). Nothing in the UI marks which physical key is "the" expected one before it is filled (`data-tonic-key` carries zero CSS), so this is easy to trigger on the very first tap of nearly any scale. This is the single most consequential finding below.

Several lower-severity defensive-coding and coverage gaps round out the findings, plus one real (if minor, and shared with the pre-existing app-wide convention) accessibility regression in the per-key `aria-label`s versus the retired ladder's degree-labeled cells.

## Critical Issues

### CR-01: Correct-but-non-canonical key tap advances the drill while filling a different key than the one tapped

**File:** `src/lib/components/ScaleKeyboardDrill.svelte:100-119` (interacting with `src/lib/practice/scaleKeyboardDrill.ts:117-135`)

**Issue:** `gradeScaleTap` grades purely by chroma (correct, per SCALE-04 — see focus area 1, which is otherwise clean). But a fixed 2-octave C-to-C board necessarily contains a second (sometimes third) key sharing every scale degree's pitch class (e.g. C major has three "C" keys at white `keyIndex` 0, 7, 14). `handleTap` computes the visual fill purely from the precomputed `placements` array indexed by `target.degree`:

```ts
const canonical = target ? placements[target.degree - 1] : undefined;
if (canonical) {
    playNote(toPitch(canonical.letter, canonical.octave));
}
```

...and `filledMap` (used to decide which keys render a role color + `NoteLabel`) is built purely from `placements[0..filledCount)`, never from which `kind`/`keyIndex` was actually clicked:

```ts
const filledMap = $derived.by(() => {
    const map = new Map<string, ScaleKeyPlacement>();
    for (let i = 0; i < filledCount; i += 1) {
        const placement = placements[i];
        if (placement) map.set(`${placement.kind}:${placement.keyIndex}`, placement);
    }
    return map;
});
```

So: if the user, expecting degree 1 (tonic), taps the *other* C on the board (white `keyIndex` 7 or 14) instead of the canonical tonic key (`keyIndex` 0), `gradeScaleTap` accepts it (chroma 0 === chroma 0), the drill advances, `playNote` fires for the canonical tonic — but the fill appears at `keyIndex` 0 (a key the user never touched), while the actually-tapped key (`keyIndex` 7 or 14) shows **nothing**: it isn't in `filledMap` (not the canonical index) and it isn't `wrongKey` (the tap was graded correct, so `clearWrong()` runs, not the wrong-flash branch). From the user's perspective: "I tapped a key, nothing visibly happened there, but a completely different key across the board turned red."

This directly contradicts the UI-SPEC's own requirement (10-UI-SPEC.md line 135): *"this UI-SPEC only requires that whichever key IS accepted fills with the correct degree color."* The implementation accepts broadly (any matching chroma) but fills narrowly (only the one canonical key), which is the one combination the spec explicitly rules out. It is also highly reachable: nothing before the first tap marks which physical key is the expected one (`data-tonic-key` is set on the DOM but has no CSS binding anywhere in the `<style>` block — it exists solely as a `scrollIntoView` query hook), so a user has no way to distinguish the "real" tonic key from its duplicates by sight before tapping.

**Fix:** Constrain acceptance to the canonical key for the currently-expected degree (reject a same-chroma tap on any other key as a miss, flashing the actually-tapped key gray, same as any other wrong tap):

```ts
function handleTap(kind: KeyKind, keyIndex: number, letter: string) {
    const target = expectedTarget(drill);
    const canonical = target ? placements[target.degree - 1] : undefined;
    const isCanonicalKey = canonical?.kind === kind && canonical?.keyIndex === keyIndex;

    const result = isCanonicalKey ? gradeScaleTap(drill, letter) : { correct: false, state: drill };

    if (result.correct && canonical) {
        drill = result.state;
        clearWrong();
        playNote(toPitch(canonical.letter, canonical.octave));
        return;
    }

    wrongKey = { kind, keyIndex };
    clearTimeout(wrongTimer);
    wrongTimer = setTimeout(() => { wrongKey = null; }, 320);
}
```

If broad pitch-class acceptance across the whole board is intentionally desired instead (the UI-SPEC leaves this as a discretionary call), the alternative fix is to make the fill track the *actually tapped* key rather than the precomputed canonical one, so whichever key is accepted is the one that visibly changes. Either fix resolves the mismatch; the current code does neither.

## Warnings

### WR-01: `createScaleKeyboardDrillState` silently defaults an unparseable chroma to 0 (C), while the sibling placement function skips instead

**File:** `src/lib/practice/scaleKeyboardDrill.ts:88`

**Issue:** `const chromas = notes.map((note) => chromaFor(note.letter) ?? 0);` — if `chromaFor` ever returns `undefined` (unparseable letter), this silently substitutes chroma 0 (C) as the expected target for that degree, meaning a tap of "C" would be graded *correct* for a completely unrelated degree rather than the drill failing safely. Compare `placeAscendingScaleKeys` (line 202-203), which instead does `if (chroma === undefined) continue;` — a different (and also flawed, see WR-02) totality strategy for the identical failure mode. Currently unreachable given `majorScaleNotes` only ever returns exactly-7 valid letters or `[]` (caught by the `notes.length !== 7` guard), but this is exactly the kind of silent-wrong-grading trap the module's own doc comments explicitly try to avoid ("Unparseable input does not throw and does not advance" — for `gradeScaleTap`, but not for this internal path).

**Fix:** Fail the same way the `notes.length !== 7` guard already does, rather than defaulting to a plausible-looking wrong value:

```ts
const chromas = notes.map((note) => chromaFor(note.letter));
if (chromas.some((c) => c === undefined)) {
    return { targets: [], position: 0, done: true };
}
// chromas is now number[]; proceed as before with a cast or a re-map
```

### WR-02: `placeAscendingScaleKeys`'s skip-on-failure silently desyncs the degree numbering from the placements array index

**File:** `src/lib/practice/scaleKeyboardDrill.ts:201-226`

**Issue:** When a note's chroma is unparseable or no matching key is found, the loop does `continue`, omitting that note from `placements` entirely. But `degree: placements.length + 1` (line 216) numbers the *next* placement based on how many placements exist so far — so if any degree is skipped, every subsequent placement silently shifts down by one degree number. Worse, `ScaleKeyboardDrill.svelte` assumes a rigid 1:1 correspondence between array index and degree everywhere it consumes this array (`placements[target.degree - 1]` in `handleTap`, `placements[i]` for `i < filledCount` in `filledMap`) — a skip anywhere in this array would silently corrupt every subsequent fill/audio lookup, not just the skipped degree. Currently unreachable for the same reason as WR-01 (the 12 supported tonics never produce an unparseable/unfindable note), but the failure mode is worse than an exception: wrong data presented as correct.

**Fix:** Given the shared root cause with WR-01, the most robust fix is to validate all 7 input chromas up front (as suggested in WR-01) and return `[]` immediately if any are unparseable, so the loop below never needs a `continue` branch that can desync indices. If a per-note skip is still desired, track `degree` explicitly (incrementing every iteration regardless of whether a placement was pushed) instead of deriving it from `placements.length`.

### WR-03: No cleanup of the wrong-flash timer on component destroy

**File:** `src/lib/components/ScaleKeyboardDrill.svelte:52-53, 114-119`

**Issue:** `wrongTimer` is a plain module-scope-per-instance `setTimeout` handle with no `onDestroy` (or `$effect` return cleanup) to cancel it. If the component unmounts (e.g. switching back to Explore mode, or navigating away) while a wrong-flash timer is pending, the callback still fires later and writes to `wrongKey` on an already-torn-down component instance. Harmless today in practice (Svelte 5 `$state` writes on a destroyed component don't throw), but it's a lingering timer with no lifecycle guard — a real code-quality gap, not merely a style nit.

**Fix:**
```ts
import { onDestroy, tick } from 'svelte';
// ...
onDestroy(() => clearTimeout(wrongTimer));
```

### WR-04: Accessibility regression — per-key `aria-label` lost the scale-degree semantic the retired ladder provided

**File:** `src/lib/components/ScaleKeyboardDrill.svelte:220, 238`

**Issue:** The retired `ScalePractice.svelte` gave each tap target an unambiguous, always-present label: `aria-label={`${note.letter} degree ${index + 1}`}` — a screen-reader user always knew which scale degree a cell represented. The new component's keys carry only `aria-label={`${key.letter}${key.octave} key`}` (e.g. "C4 key", "C♯4 key") — raw keyboard-key identity only, never the scale degree, never the current expected-target state, and never whether the key is already filled/correct. Combined with CR-01's lack of any pre-tap visual/DOM marker for "the" expected key, a screen-reader or keyboard-only user has strictly less information than before this phase to determine which of several identically-labeled keys (e.g. three "C4"/"C5"/"C6"-ish keys, spelling aside) is the one currently expected.

**Fix:** Enrich the label when a key is filled (state-aware), and/or expose the currently-expected key's identity via `aria-describedby` pointing at the register paragraph:
```svelte
aria-label={placement
    ? `${placement.letter} degree ${placement.degree}, filled`
    : `${key.letter}${key.octave} key`}
```
Consider also wrapping the register `<p>` in `aria-live="polite"` (the app already does this for `InspectRegister.svelte`), so degree/direction changes are announced without requiring the user to re-navigate to the register text after every tap.

### WR-05: Missing test coverage for the documented `notes.length !== 7` degenerate-input path

**File:** `src/lib/practice/scaleKeyboardDrill.test.ts`

**Issue:** Both `createScaleKeyboardDrillState` and `placeAscendingScaleKeys` have doc comments promising specific total-function behavior for malformed input ("input that isn't exactly 7 notes yields an inert empty state rather than throwing" / "returns []"), but no test in `scaleKeyboardDrill.test.ts` exercises either function with a non-7-length `notes` array. This is exactly the kind of edge case that should be locked down by a test given it's called out explicitly in the module's own contract comments.

**Fix:** Add two small cases, e.g.:
```ts
it('createScaleKeyboardDrillState returns an inert empty state for non-7-note input', () => {
    const state = createScaleKeyboardDrillState(majorScaleNotes('C').slice(0, 5));
    expect(state.targets).toEqual([]);
});

it('placeAscendingScaleKeys returns [] for non-7-note input', () => {
    expect(placeAscendingScaleKeys(majorScaleNotes('C').slice(0, 5))).toEqual([]);
});
```

## Info

### IN-01: `done` is left `false` for the degenerate 0-target state, even though `position >= targets.length` is already vacuously true

**File:** `src/lib/practice/scaleKeyboardDrill.ts:83-86`

**Issue:** `if (notes.length !== 7) return { targets: [], position: 0, done: false };` — with `targets.length === 0` and `position === 0`, the stated invariant ("done` once all 15 targets have been tapped in order") is vacuously satisfied (there's nothing left to tap), yet `done` reads `false`. Functionally harmless today (`expectedTarget` already returns `null` and `gradeScaleTap` already short-circuits via the `null` check, not the `done` check), but it's an inconsistent invariant that could mislead a future caller that branches on `state.done` directly instead of `expectedTarget`.

**Fix:** `return { targets: [], position: 0, done: true };` for consistency.

### IN-02: Component test waits on a real 400ms timer instead of fake timers

**File:** `src/lib/components/scaleKeyboardDrill.test.ts:130`

**Issue:** `await new Promise((resolve) => setTimeout(resolve, 400));` to let the 320ms wrong-flash timer clear. This works, but is slower than necessary and is the classic pattern that becomes flaky under CI load (a 320ms real timer racing against a fixed 400ms wait has a comfortable but non-zero margin).

**Fix:** Use `vi.useFakeTimers()` / `vi.advanceTimersByTime(320)` / `vi.useRealTimers()` around this test instead, matching a more deterministic test style.

### IN-03: Test's `ariaLabelFor` helper duplicates the component's octave arithmetic rather than reusing a shared source

**File:** `src/lib/components/scaleKeyboardDrill.test.ts:19-27`

**Issue:** `ariaLabelFor` reimplements `4 + Math.floor(keyIndex / 7)` / `4 + Math.floor(pattern.afterWhiteIndex / 7)` independently of the component's own `whiteKeyOctave`/`blackKeyOctave` functions. If the octave formula ever changes in the component only, this test would keep passing against its own (now-stale) copy rather than catching the drift — reducing the test's value as a regression guard for exactly the kind of geometry bug this phase was designed to fix.

**Fix:** Export the octave-calculation helpers from `scaleKeyboardDrill.ts` (they're already duplicated as pure functions there via `buildOrderedKeys`'s `octave` field) and have the test import/derive labels from that single source instead of re-deriving the formula.

---

_Reviewed: 2026-07-15T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
