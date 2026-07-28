---
phase: 33-voicing-lean-flow
reviewed: 2026-07-26T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/lib/i18n/messages/voicings.ts
  - src/lib/components/ShellVoicingDrill.svelte
  - src/lib/components/shellVoicingDrill.test.ts
  - src/lib/components/ShellVoicingDrill.embed.test.ts
  - tests/practice-hub-mix.e2e.test.ts
findings:
  critical: 0
  warning: 1
  info: 3
  total: 4
status: issues_found
---

# Phase 33: Code Review Report

**Reviewed:** 2026-07-26
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Reviewed the VOICE-01 refactor that replaces the always-on 3-way voicing-style
selector with two add/drop nudges. I traced the nudge state machine
(`setVoicing`), the by-product label (`currentVoicingNameKey`), the grading
target derivation (`targetNotes`/`check`), the i18n dictionary, and both the
component and e2e tests, and cross-checked `shellVoicing.ts`'s note-set exports
(`shellNotes`, `rootlessNotes`, `fullStackNotes`, `optionalMarkers`).

The locked invariants hold up under inspection:

- **Grading is chroma-based** — `check()` maps selected letters through
  `Note.chroma(toAsciiAccidentals(...))` and calls `matchChord` against
  `targetNotes`; no letter-string comparison is introduced (correct per the
  matchChord contract).
- **REG-01 seams unchanged** — `embedSymbol` is still read once via `untrack`,
  `onComplete` still short-circuits `next()` without a fresh draw,
  `voicingStageForChord(cards)` staging and the read-only deck read
  (`getAllCards`, filter-only, no `recordGrade`) are untouched.
- **i18n parity** — the `en` and `fr` blocks carry an identical key set (26
  keys each), including the new `voicings.nudge.*`, `voicings.current.label`,
  and `voicings.voicing.{shell,full,rootless}` keys.
- **No em dashes** in any UI copy; only periods, colons, semicolons, and commas
  (the `-`/en-space characters that appear are confined to code comments, which
  are not rendered).

The nudge → style → prompt → label → grading-target mappings are internally
consistent (`root`→full, `rootless`→rootless, default→shell across
`noteSetFor`, `drillPrompt`, and `currentVoicingNameKey`). No BLOCKER-class
correctness or security defect was found. The findings below are one robustness
WARNING and three INFO observations.

## Warnings

### WR-01: Toggling a nudge back down leaves stale extra notes selected, so a correct-shaped voicing grades as wrong

**File:** `src/lib/components/ShellVoicingDrill.svelte:214-218` (with `check()` at 245-269)
**Issue:** `setVoicing` deliberately does not clear `selected` (UAT V3, to
preserve tapped notes across an *upward* switch where notes overlap). That is
sound when widening (shell → full). But because the nudges are toggles, the
player can also narrow: e.g. start shell, tap "Add the root" → full, tap
`C E G B`, then tap "Add the root" again → back to shell. `selected` still holds
`{C, E, G, B}` while `targetNotes` is now the 2-note shell `{E, B}`. `check()`
then fails on the extra `C, G` and shows "Not quite. Try again." even though the
player has produced a valid full voicing and merely narrowed the target. There
is no visual cue that the surviving keys now disqualify the answer. It is
recoverable (a wrong `check()` clears `selected`), so this is friction, not a
false positive — grading never reports wrong notes as correct.
**Fix:** When narrowing to a strictly smaller voicing, prune keys that are not
in the new target rather than keeping the full selection. For example, after
setting the new `voicingStyle`, intersect `selected` with the new target's
chroma:
```ts
function setVoicing(style: VoicingStyle) {
	if (effectiveStage !== 'drill' || answered) return;
	voicingStyle = voicingStyle === style ? 'shell' : style;
	wrongRetry = false;
	// Keep overlapping taps, drop any that the newly-targeted voicing excludes.
	const allowed = new Set(noteSetFor(voicingStyle).map((n) => n.letter));
	selected = new Set([...selected].filter((letter) => allowed.has(letter)));
}
```
If the preserve-everything behavior is intentional even when narrowing, add a
short comment stating that the down-toggle friction is accepted, so a future
reader does not treat it as a regression.

## Info

### IN-01: "Remove the bass" adds the fifth when starting from the shell default

**File:** `src/lib/components/ShellVoicingDrill.svelte:411-420`; `src/lib/practice/shellVoicing.ts:46-56`
**Issue:** The drill starts on the shell (`shellNotes` = 3rd + 7th). Tapping the
"Remove the bass" nudge sets `rootless` (`rootlessNotes` = 3rd + **5th** + 7th),
which *adds* a note relative to the shell and removes a bass note that the shell
never had. The label describes the transition relative to a full voicing mental
model, not the actual shell starting state, which could momentarily confuse a
first-time learner who watches a key appear after asking to "remove" something.
This appears to match the locked plan ("start on shell, − remove bass reaches
rootless"), so this is flagged only for human confirmation, not as a defect.
**Fix:** Confirm the copy is intended given the shell start point; if learner
testing shows confusion, consider wording that reads correctly from the shell
(e.g. framing the nudge as reaching a named voicing rather than an action).

### IN-02: `drawSymbol()` has no empty-catalog guard

**File:** `src/lib/components/ShellVoicingDrill.svelte:61-64`
**Issue:** `symbols[Math.floor(Math.random() * symbols.length)]` returns
`undefined` if `seventhChordSymbols()` ever returns an empty array, and the
resulting `spellChord(undefined)` would throw at init. The catalog is a fixed
static list today so this cannot happen in practice, but there is no defensive
guard.
**Fix:** Optional hardening — assert non-empty or fall back, e.g.
`if (symbols.length === 0) throw new Error('no seventh-chord symbols');` before
indexing. Low priority given the static invariant.

### IN-03: e2e helper relies on real-time `setTimeout(700)` sleeps

**File:** `tests/practice-hub-mix.e2e.test.ts:112-118` (`completeBuildIt`)
**Issue:** `completeBuildIt` waits `700ms` of wall-clock time per key via a real
`setTimeout` promise, with no fake timers. This slows the suite and is a
potential source of flake on a loaded CI runner. It is unchanged by this phase
(the VOICE-01 change is the new `completeVoicing` helper, which does not sleep),
so it is noted only for awareness.
**Fix:** If this test becomes flaky or slow, drive BuildSession's debounce with
`vi.useFakeTimers()` / `vi.advanceTimersByTime(...)` instead of real sleeps.

---

_Reviewed: 2026-07-26_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
