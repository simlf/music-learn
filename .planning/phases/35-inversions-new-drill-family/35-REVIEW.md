---
phase: 35-inversions-new-drill-family
reviewed: 2026-07-27T00:00:00Z
depth: standard
iteration: 2
files_reviewed: 6
files_reviewed_list:
  - src/lib/components/InversionDrill.svelte
  - src/lib/components/PianoKeyboard.svelte
  - src/lib/drills/matchInversion.ts
  - src/lib/practice/inversions.ts
  - src/lib/practice/practiceQueue.ts
  - src/routes/practice/+page.svelte
findings:
  critical: 0
  warning: 0
  info: 4
  total: 4
status: issues_found
---

# Phase 35: Code Review Report (iteration 2 — fix verification)

**Reviewed:** 2026-07-27
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found (INFO only — 0 BLOCKER, 0 WARNING)

## Summary

Re-review of the two fixes from iteration 1. Both PASS verification. No new
BLOCKER or WARNING was introduced. Four INFO items remain — three carried
forward from iteration 1 (untouched code) plus one new low-priority doc-drift
note surfaced by the CR-01 fix.

### Fix verification

**CR-01 (BLOCKER) — RESOLVED.** `InversionDrill.svelte:275` now gates the bass
ring: `bassHint={!answered && ghostRevealed ? bassHintEntry : null}`. Traced
against all three required invariants:

- **Hidden until the ghost rung.** `ghostRevealed = offeredRungs.includes('ghost')
  && hintDepth >= offeredRungs.length`. Ghost is always the last offered rung, so
  the ring only appears once every rung — including ghost — has been revealed.
  Before any hint, `hintDepth === 0`, so the ring is absent (no more first-render
  spoiler). Now matches `ghostKeys`' own gating exactly, so ring and ghost
  voicing appear/disappear together and the bass key gets both the ghost hatch
  and the ink ring — the intended "which voicing note is the bass" cue.
- **Hidden at the matured `drill` stage.** At `drill`, `offeredRungs === []`, so
  `offeredRungs.includes('ghost')` is false → `ghostRevealed` is false → `null`.
  The INV-02 maturity fade is no longer bypassed.
- **Hidden after answering.** The `!answered` guard nulls the ring at reveal;
  simultaneously `notes` flips to `target.notes`, so the reveal shows role-colored
  keys with no ring — consistent with the stated intent.

Covered by three new tests (`inversionDrill.test.ts:234, 262, 276`): ring absent
through rungs 1–2, present only after rung 3 (ghost) with `data-bass="B"`, and
never present at `State.Review` (drill stage).

**WR-01 (WARNING) — RESOLVED.** `PianoKeyboard.svelte:348-378` now emits
`onPress?.(letter, octave)` from the interactive branch of the activation choke
point (`activateWhiteKey`/`activateBlackKey`), which serves click, Enter, and
Space alike. Keyboard/AT users now populate `pressedOctaveByLetter`, so
`lowestPlayedBassChroma()` no longer degenerates to "lowest chroma among selected
letters" and a bass that is not the minimum-chroma tone (the test's Dm7 2nd
inversion, bass A = chroma 9) is now winnable via Enter. Covered by
`inversionDrill.test.ts:159` (keyboard-only correct voicing wins).

Sub-checks all clear:
- **Pointer double-fire is idempotent/harmless.** A pointer tap fires `onPress`
  twice (pointerdown + click) with the identical `(letter, octave)`;
  `handlePress` is a `Map.set`, so the second write is a no-op. Confirmed by
  `components.test.ts:446` (`toHaveBeenCalledTimes(2)`, same args).
- **Sound still plays once.** `playKeyTouch` remains the single audio source in
  the choke point; `onPress` carries no audio. `components.test.ts:430/472`
  assert exactly one `playNote` per click and per Enter.
- **`onPress` contract unchanged for other paths.** Still strictly interactive-
  only (both the choke point and `handlePointerDown` guard on `interactive`); the
  byte-identical-markup test (`components.test.ts:503`) still passes.

### Regression / invariant checks

- **REG-01 intact.** The two fix commits (`8682402`, `0dc7606`) touched only
  `InversionDrill.svelte`, `PianoKeyboard.svelte`, and their tests.
  `practiceQueue.ts` (`composePracticeQueue`/`advanceHybridQueue`) and
  `+page.svelte` are byte-unchanged this iteration; `isCardedItem` still excludes
  `inversion`, so synthetic items never touch FSRS. No other keyboard consumer
  wires `onPress` (only `InversionDrill` does), so the choke-point `onPress`
  addition cannot regress `PracticeChordDrill`/`ProgressionDrill`/
  `ShellVoicingDrill`/`BuildSession`.
- **Grading still chroma + bass, never letters.** `matchInversion` unchanged.
- **No em dashes.** The two new comment blocks and the gating expression use
  plain hyphens; no user-facing copy was added.
- **Test suite green.** `vitest run` across the phase's suites: 28 files, 424
  tests passing.

## Info

### IN-01: `filterInversionsBySong` is exported and tested but unused by the host

**File:** `src/lib/practice/practiceQueue.ts:417-422`
**Issue:** (carried from iteration 1, code unchanged) `filterInversionsBySong`
mirrors `filterVoicingsBySong`, but the host (`+page.svelte:304-309`) filters
inversion candidates inline via `symbolHasProvenance` before calling
`syntheticInversionItems`, so the helper is only referenced from its own test.
Dead production surface, inconsistent with the voicing path.
**Fix:** Either route the host's inversion song-filter through
`filterInversionsBySong`, or drop the unused export.

### IN-02: `Note.chroma` can return undefined at runtime, producing `NaN`/`undefined` scores

**File:** `src/lib/components/InversionDrill.svelte:108-121, 125-127`
**Issue:** (carried from iteration 1) `Note.chroma(...)` is typed `number` but
returns `undefined` for an unparseable note. In `lowestPlayedBassChroma`,
`octave*12 + undefined` is `NaN` (never wins the `< lowestScore` comparison); in
`checkPlay`, an undefined chroma would enter the played `Set<number|undefined>`.
Unreachable for valid key letters, so latent-defensive rather than active.
**Fix:** Skip letters whose `Note.chroma(...)` is `undefined` before scoring /
adding to the set.

### IN-03: Out-of-range `inversionIndex` renders an unwinnable drill

**File:** `src/lib/components/InversionDrill.svelte:69-72`
**Issue:** (carried from iteration 1) An index the chord lacks (e.g. index 3 on a
triad) makes `bassNote` undefined, `bassChroma` `-1`, and `bassHintEntry`/
`ghostKeysForInversion` empty — `bassCorrect` can never be true. Currently safe
only because `syntheticInversionItems` bounds indices; the component has no guard.
**Fix:** Guard the render on `bassNote !== undefined` (fail to a skip/no-op).

### IN-04: `bassHint` prop doc now over-describes states the sole consumer never uses

**File:** `src/lib/components/PianoKeyboard.svelte:187-194`
**Issue:** (new, surfaced by the CR-01 fix) The prop doc says the bass ring "must
render whether the matching key already carries an interval-role fill (reveal
state), a ghost hatch (hint state), or neither (rung-1-only hint state)." After
the fix, the only consumer (`InversionDrill`) passes `bassHint` exclusively in
the ghost-revealed hint state — never at reveal (`answered` nulls it) and never
in a rung-1-only state. The prop remains generic and the doc is not strictly
false (it describes capability), but "reveal state" and "rung-1-only hint state"
now describe usages nothing exercises, which could mislead a future consumer or a
reader auditing the CR-01 gating against the prop's own contract.
**Fix:** Trim the doc to the state actually used (bass ring accompanies the ghost
voicing), or add a one-line note that the ring is consumer-gated and no current
consumer passes it at reveal / rung-1.

---

_Reviewed: 2026-07-27_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard (iteration 2)_
