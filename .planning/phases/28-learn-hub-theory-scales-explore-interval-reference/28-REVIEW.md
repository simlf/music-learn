---
phase: 28-learn-hub-theory-scales-explore-interval-reference
reviewed: 2026-07-25T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/lib/components/TheoryLessons.svelte
  - src/lib/components/ScaleExplorer.svelte
  - src/routes/learn/+page.svelte
  - src/routes/practice/+page.svelte
  - src/lib/i18n/messages/learn.ts
findings:
  critical: 0
  warning: 0
  info: 3
  total: 3
status: issues_found
---

# Phase 28: Code Review Report

**Reviewed:** 2026-07-25T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found (info-only; no blockers or warnings)

## Summary

Reviewed the Learn Hub phase's DRY extraction (`TheoryLessons.svelte`, `ScaleExplorer.svelte`), the new `/learn` hub composition, the additive Scale-practice disclosure on `/practice`, and the `learn.ts` i18n dictionary.

Verification performed beyond static reading:
- Diffed `TheoryLessons.svelte` and the `exploreOnly=false` path of `ScaleExplorer.svelte` against the pre-extraction `/theory` and `/scales` page bodies at `b1f74cb` — both extractions are byte-identical to the prior markup; no props/state were dropped and `exploreOnly` gates only the mode-toggle + Practice branch, exactly as documented.
- Diffed `practice/+page.svelte` against `b1f74cb` — the Scale-practice disclosure is a pure addition (new imports, two new `$state`/`$derived` declarations, one new `<div>` block after the existing `{/if}`). It does not touch `pageState`, `queue`, `completeCarded`/`completeBuild`/`completeSynthetic`, `grading`, or any FSRS/advance code, and its own toggle/tonic buttons use `variant="ghost"`/`variant="primary"` (the pre-existing selected-toggle convention), never introducing a second competing vermilion CTA.
- Confirmed all 5 `IntervalView` instances in `/learn` render through `spellChord(entry.symbol)` with `onInspectTone` omitted, and that `IntervalView` correctly gates to inert (non-button) tone chips when the prop is absent.
- Ran `npx svelte-check` (0 errors, 0 warnings) and the three relevant test files (`learn.test.ts`, `practiceScalePractice.test.ts`, `messages.test.ts` — 15/15 passing), including the repo's automated en/fr key-parity and cross-domain key-collision guard in `messages.test.ts`, which already covers `learn.ts`.
- Confirmed `learn.en`/`learn.fr` have identical key sets by manual inspection, and that no `learn.*` key collides with any other domain dictionary.
- Grepped all 5 files for em/en dashes in rendered copy (only hit is inside a `//` code comment in `TheoryLessons.svelte`, not user-facing text) and for debug artifacts (`console.*`, `debugger`, `TODO`/`FIXME`, `eval`, `innerHTML`) — none found.
- Checked `ScaleKeyboardDrill.svelte`'s own `$effect` (resets drill state whenever `notes`/`tonic` change) to confirm the new second call site in `/practice` (independent `scaleTonic` state, no `{#key}` wrapper) can't leave stale drill progress when the tonic is switched — it can't; the reset effect already handles it.

No bugs, security issues, or robustness gaps were found. The three items below are minor maintainability notes only.

## Info

### IN-01: Tonic-picker markup duplicated a third time

**File:** `src/routes/practice/+page.svelte:536-548` (compare `src/lib/components/ScaleExplorer.svelte:50-62`)
**Issue:** The Scale-practice disclosure re-implements the same tonic-picker button row (map over `MAJOR_SCALE_ROOTS`, `variant`/`aria-pressed`/`aria-label` logic) that already exists in `ScaleExplorer.svelte`, rather than factoring it into a shared `TonicPicker` component. This was presumably a deliberate choice (the disclosure only needs the picker + `ScaleKeyboardDrill`, not the rest of `ScaleExplorer`'s Explore surface), but it's now duplicated in two files with identical logic that will need to stay in sync by hand.
**Fix:** Optional follow-up: extract a small `TonicPicker.svelte` (`{ tonic, onPick }` props) used by both `ScaleExplorer.svelte` and `practice/+page.svelte`. Not required before shipping — purely a future-maintenance note.

### IN-02: Seventh-chord reference data duplicated between TheoryLessons and the Learn hub

**File:** `src/routes/learn/+page.svelte:23-29` (compare `src/lib/components/TheoryLessons.svelte:26-32`)
**Issue:** `INTERVAL_REFERENCE_CHORDS` (symbol + quality for the 5 seventh qualities) is a second hardcoded list that must stay in lockstep with `TheoryLessons.svelte`'s `SEVENTH_SHAPES` (same 5 symbols/qualities, different caption/label keys). If a future chord-quality set changes in one file, the other can silently drift out of sync.
**Fix:** Optional: hoist the shared `{ symbol, quality }` tuples (dropping only the caption/label key, which differs per consumer) into a small exported constant in `$lib/theory/chord.ts` or a new shared module, and have both components map their own caption/label keys onto it.

### IN-03: Dead `mode` state when `ScaleExplorer` is mounted with `exploreOnly`

**File:** `src/lib/components/ScaleExplorer.svelte:34`
**Issue:** `let mode = $state<Mode>('explore');` is declared unconditionally, but when `exploreOnly` is `true` (the `/learn` hub's usage) the `{#if !exploreOnly}` branch that reads/toggles `mode` never renders, so the variable and the `Mode` type are inert dead weight for that instance. Harmless (no observable behavior difference), but a reader skimming the component for `/learn`'s behavior has to trace the gate to realize `mode` never applies there.
**Fix:** No action required; if this file is touched again, consider noting in the doc comment that `mode` is a no-op under `exploreOnly` (already implied but not stated as explicitly as the `Mode` type's presence suggests).

---

_Reviewed: 2026-07-25T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
