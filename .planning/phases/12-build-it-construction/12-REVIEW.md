---
phase: 12-build-it-construction
reviewed: 2026-07-15T15:42:57Z
depth: deep
files_reviewed: 9
files_reviewed_list:
  - src/lib/theory/interval.ts
  - src/lib/practice/construction.ts
  - src/lib/practice/construction.test.ts
  - src/lib/components/PianoKeyboard.svelte
  - src/lib/components/BuildSession.svelte
  - src/lib/components/buildSession.test.ts
  - src/routes/build/+page.svelte
  - src/routes/+layout.svelte
  - src/lib/srs/deck.ts
  - src/lib/srs/facts.ts
findings:
  critical: 0
  warning: 5
  info: 1
  total: 6
status: resolved
resolved_at: 2026-07-15T18:01:00Z
resolution:
  WR-01: 4b0bbeb
  WR-02: 0072acd
  WR-03: 0072acd
  WR-04: 172d88f
  WR-05: 172d88f
  IN-01: a94f45d
---

# Phase 12: Code Review Report

**Reviewed:** 2026-07-15T15:42:57Z
**Depth:** deep
**Files Reviewed:** 9 (plus supporting reads: `src/lib/audio/voicing.ts`, `src/lib/theory/chord.ts`, `src/lib/theory/scale.ts`, `src/lib/srs/deck.test.ts` for cross-file verification)
**Status:** resolved

## Summary

The construction engine itself (`construction.ts`) is solid: I hand-traced the ascending-voicing MIDI math for several worst-case targets (B major scale, C♯ major scale, a B-rooted dim7, Cdim7's B♭♭ seventh) and it holds up — every step's MIDI is derived independently from `toAscendingPitches`, grading is strictly MIDI-first with a chroma-only fallback for the octave check, and the full 96-chord/12-scale sweep test proves every target's MIDI stays within the fixed C4–C6 (60–84) board with zero off-by-one at the edges. `phraseStep`'s scale W/H relabeling only ever fires on degree-2 intervals, which is exactly the entire interval space a major scale's consecutive steps ever produce, so it can't misfire. `svelte-check` reports 0 errors/0 warnings across the repo and the full targeted test suite (100 tests across `construction.test.ts`, `buildSession.test.ts`, `interval.test.ts`, `deck.test.ts`) passes.

The defects found are concentrated in three places: (1) a fixed, direction-blind copy string for the wrong-octave case that gives backwards advice in a reachable scenario the test suite itself exercises; (2) a narrow but real async race in the FSRS completion write that a bare `catch {}` silently swallows, which can drop a completed session's grade with zero symptom; and (3) an accessibility regression relative to this codebase's own established `aria-live` convention (RecallSession/ScaleKeyboardDrill) — the entire build-step/feedback zone, which is the whole pedagogical payoff of this mode, is not in a live region at all. There's also a hardcoded "chord" in the enharmonic-teaching copy that renders literally wrong for the one scale (F♯ major) that can trigger it, confirmed by direct execution.

No BLOCKER-severity/Critical findings (no security issues, no crashes, no unrecoverable data corruption). Every issue below is a Warning; one Info-level cosmetic note is included for completeness.

## Warnings

### WR-01: Wrong-octave restatement gives backwards directional advice when the tap was too HIGH

**File:** `src/lib/components/BuildSession.svelte:531-535` (copy), `src/lib/practice/construction.ts:214-221` (grading — no direction on `wrong-octave`)

**Issue:** The fixed wrong-octave copy is:
```
You're stacking upward: try the next {lastTappedLetter} up.
```
This is correct only when the tapped key was an octave too *low*. But `gradeConstructionTap`'s `wrong-octave` branch deliberately omits a `direction` field (`ConstructionTapResult` docs it as "Present only on `wrong-pitch-class`"), so the UI can't tell which way the user actually erred — and the copy always says "up" regardless. This is directly reachable: `buildSession.test.ts`'s own wrong-octave test taps `getAllByRole('button', { name: 'D♯ key' })[1]` — the *higher*-register instance of a target that lives at the lower register — i.e. exactly the "tapped too high" case — and still asserts the "try the next D♯ up" copy. Telling a user who already overshot upward to go "up" reinforces the wrong mental model.

This matches the locked UI-SPEC's fixed copy verbatim, so it isn't a deviation from spec, but it ships an objectively backwards instruction in a case the implementation itself proves is reachable.

**Fix:** Extend `ConstructionTapResult` to carry `direction` for `wrong-octave` too (same `tappedMidi > target.midi ? 'high' : 'low'` comparison already used for `wrong-pitch-class`), and phrase the restatement conditionally:
```ts
// construction.ts, wrong-octave branch
const direction = tappedMidi > target.midi ? 'high' : 'low';
return { outcome: 'wrong-octave', state: { ...state, wrongTapCount: state.wrongTapCount + 1 }, direction };
```
```svelte
<!-- BuildSession.svelte -->
{feedback.direction === 'high'
  ? `You're stacking upward: try the next ${lastTappedLetter} down.`
  : `You're stacking upward: try the next ${lastTappedLetter} up.`}
```

### WR-02: FSRS completion write reads mutable `construction` state across `await` boundaries; a fast "Build Another"/kind-toggle click silently drops the grade

**File:** `src/lib/components/BuildSession.svelte:314-334`

**Issue:** `recordConstructionOutcome` reads `construction.wrongTapCount` *after two* `await`s (`getCard`, then inline in the `recordGrade` call), not from a value captured up front:
```ts
const existing = await getCard(factId, 'formula-build');
const card: CardRecord = existing ?? { ... };
await recordGrade(card, ratingForWrongTaps(construction.wrongTapCount), now); // construction re-read here
```
`construction` is the component's live `$state`, and both "Build Another" (`resetPicker()`) and the always-visible kind-toggle (`setKind()` → `resetPicker()` when the kind actually changes) set `construction = undefined` synchronously. Both are clickable the instant the completion screen renders — there is no `disabled` state gating them. If either fires while the write is between its two `await`s, `construction.wrongTapCount` throws on `undefined`, which is caught by the bare `catch {}` and swallowed exactly like a genuine IndexedDB failure: no console output, no retry, `fsrsSaved` never flips true. The just-completed session's grade is silently lost, and nothing in the UI indicates it (the user has already navigated to the picker by the time this would matter). The existing `getCard rejection is swallowed silently` test only proves the catch doesn't crash the UI — it does not cover this state-mutation-race path, so there's no regression test guarding against it.

**Fix:** Snapshot everything the async continuation needs before the first `await`, so a later state reset can't affect it:
```ts
async function recordConstructionOutcome(): Promise<void> {
  if (!construction || !construction.done) return;
  const wrongTapCount = construction.wrongTapCount; // snapshot before any await
  try {
    const now = new Date();
    const factId = kind === 'chords' ? `chord-formula:${startedSymbol}` : scaleFormulaFactId(pickedTonic ?? '');
    const factKind = kind === 'chords' ? ('chord-formula' as const) : ('scale-formula' as const);
    const existing = await getCard(factId, 'formula-build');
    const card: CardRecord = existing ?? { ...newCard(now), factId, factKind, mode: 'formula-build', lastRating: null };
    await recordGrade(card, ratingForWrongTaps(wrongTapCount), now);
    fsrsSaved = true;
  } catch {
    // best-effort
  }
}
```

### WR-03: The completion FSRS write is gated behind the 650ms pacing timer, so navigating away right after the final correct tap drops it with no retry

**File:** `src/lib/components/BuildSession.svelte:385-402`

**Issue:** `willComplete`/`recordConstructionOutcome()` only fire inside `feedbackTimer`'s 650ms callback, not at the moment the final tap is graded 'correct'. `onDestroy` cancels `feedbackTimer` on unmount (correctly, per the "no stuck states" requirement), but that means a client-side navigation away from `/build` (e.g. clicking any masthead nav link, which unmounts `BuildSession` immediately) within that 650ms window after the *last* correct tap permanently discards the pending completion write — the timer never fires, `sessionState` never reaches `'complete'`, and `recordConstructionOutcome` is never even called. This is a real, if narrow, window where a legitimately finished construction never gets graded, with no error and no way for the user to know.

**Fix:** Decouple "commit the grade" from "advance the visible UI": call `recordConstructionOutcome()` synchronously as soon as the tap that completes the sequence is graded (in the `'correct'` branch of `handleConstructTap`, guarded by `result.state.done`), and let the 650ms timer continue to own only the visual transition to the `complete` screen.

### WR-04: The entire build-step/feedback zone is not wrapped in an `aria-live` region, unlike this codebase's own established convention

**File:** `src/lib/components/BuildSession.svelte:481-537`

**Issue:** Only the `STEP {n} OF {total}` register line carries `aria-live="polite"` (line 482-488). The step line, WHY line, count-up hint, and the entire `data-testid="build-feedback"` block — the correct-tap confirmation, the wrong-pitch-class diagnostic + restatement, the wrong-octave headline + restatement, and the enharmonic teaching line — render as plain, non-live markup. A screen-reader user gets no announcement at all for the actual graded-tap feedback, which is the core pedagogical content of this mode (every key tap is a graded input per the UI-SPEC). This is a direct regression against the established pattern already in this codebase: `RecallSession.svelte:224` wraps its *entire* prompt+feedback region in a single `<div aria-live="polite">`, and `ScaleKeyboardDrill.svelte:253` does the same for its own register/feedback line. `BuildSession` should follow the same convention rather than only live-region-ing the counter.

**Fix:** Wrap the step/WHY/feedback block (or at minimum the `build-feedback` div) in an `aria-live="polite"` region, mirroring `RecallSession.svelte`'s existing pattern:
```svelte
<div aria-live="polite">
  {#if promptStep} ... step-line / why-line / count-up hint ... {/if}
  {#if feedback} <div data-testid="build-feedback"> ... </div> {/if}
</div>
```

### WR-05: Enharmonic teaching line hardcodes "chord" even for scale constructions, and is verifiably reachable for F♯ major

**File:** `src/lib/components/BuildSession.svelte:518-521`

**Issue:**
```svelte
This key's usually called {feedback.commonName}, but {targetSymbol} spells it {feedback.actualName}
so the chord reads as a clean stack of {feedback.intervalWord}s.
```
This line is not gated on `kind`, and `isNotableSpelling` is checked unconditionally for both chords and scales in `handleConstructTap`. I confirmed by direct execution (`createScaleConstruction('F♯')` + `isNotableSpelling`) that F♯ major — the one scale in `MAJOR_SCALE_ROOTS` whose own spelling contains a "notable" letter — triggers this on its 7th-degree step (E♯, one of the four natural-adjacent exceptions `isNotableSpelling` flags). Building F♯ major and earning that step renders: *"This key's usually called F, but F♯ major spells it E♯ so the **chord** reads as a clean stack of major seconds."* — describing a major scale as a chord. This copy is lifted verbatim from the UI-SPEC's fixed text (so the root cause is a spec gap, not a deviation from it), but it ships as literally incorrect, user-facing language, and it's untested (no test exercises F♯ major's completion or its enharmonic line together).

**Fix:** Branch the trailing clause on `kind`, the same way `whyLineFor`/`stepLineFor` already do:
```ts
const grammarNoun = kind === 'chords' ? 'chord' : 'scale';
// "...so the {grammarNoun} reads as a clean stack of {feedback.intervalWord}s."
```

## Info

### IN-01: `pressedClass` matches by letter only, not by (letter, octave), so a tap visually "presses" every same-letter key across both forced octaves

**File:** `src/lib/components/PianoKeyboard.svelte:431-433`

**Issue:** `pressedClass(letter)` compares only `pressedLetter === letter`, with no octave component, while `flashWrongClass` (added this phase) correctly compares both letter *and* octave. This is pre-existing logic (reused for `interactive`/`inspectable` modes before this phase), but `constructable` mode is the first consumer that *always* forces `octaves={2}` (per the UI-SPEC's "Forced two-octave keyboard" contract), so duplicate-letter collisions that were previously rare (interactive mode usually collapses to 1 octave on narrow viewports) are now guaranteed to be visible on every construction session that includes an octave-repeated pitch class. Purely cosmetic (a brief scale/brightness flash on an extra key) — no grading or state impact.

**Fix (low priority):** Track `pressedKey: { letter, octave } | undefined` instead of just `pressedLetter`, and compare both fields in `pressedClass`, mirroring the fix already applied for `flashWrongKey`.

---

## Resolution

All 6 findings fixed, each in its own atomic commit (WR-02 and WR-03 share one commit, and WR-04/WR-05 share one commit - see notes below). `npx vitest run` and `npm run check` were kept green after every commit.

| ID | Title | Commit |
|----|-------|--------|
| WR-01 | Wrong-octave restatement gave backwards directional advice when the tap was too HIGH | `4b0bbeb` |
| WR-02 | FSRS completion write read mutable `construction` state across `await` boundaries | `0072acd` |
| WR-03 | Completion FSRS write was gated behind the 650ms pacing timer | `0072acd` |
| WR-04 | Build-step/feedback zone wasn't wrapped in an `aria-live` region | `172d88f` |
| WR-05 | Enharmonic teaching line hardcoded "chord" for scale constructions | `172d88f` |
| IN-01 | `pressedClass` matched by letter only, not by (letter, octave) | `a94f45d` |

Notes on adaptation from the review's literal suggestions:
- WR-02 and WR-03 were fixed together in one commit: both live in the same `recordConstructionOutcome`/`handleConstructTap` region, and WR-03's fix (dispatching the write synchronously on the completing tap, before the pacing timer) only fully closes WR-02's race window if the snapshot-before-await discipline from WR-02 lands at the same time - splitting them would have left an intermediate commit with the race still live.
- WR-04 and WR-05 were fixed together in one commit for the same reason: WR-04's `aria-live` wrap reindents the exact block WR-05's one-line `kind`-branch touches, so a clean split would have required an artificial no-op intermediate commit.
- WR-01's `direction` field is now populated on `wrong-octave` too (previously "Present only on `wrong-pitch-class`"); added a "too low" regression test via a scale construction (chords never reach a too-low octave tap on this keyboard's fixed C4-C6 range, so the "low" direction needed a scale target to exercise).
- WR-05 verified against the exact reachable case the review traced by hand: F♯ major's 7th degree (E♯, enharmonically F) - added as a new regression test building through that step.
- IN-01 applied with `pressedClass`/`clearPressed` now taking an explicit octave argument at every call site (white and black key markup in `PianoKeyboard.svelte`), each already deriving the correct octave via the existing `octaveForWhiteIndex`/`octaveForBlackAfterWhiteIndex` helpers - non-regressing for interactive/inspectable modes, which pass through the same call sites unchanged.

_Reviewed: 2026-07-15T15:42:57Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Resolved: 2026-07-15T18:01:00Z_
