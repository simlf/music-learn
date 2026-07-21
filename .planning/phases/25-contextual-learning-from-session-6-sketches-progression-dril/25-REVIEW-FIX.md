---
phase: 25-contextual-learning-from-session-6-sketches-progression-dril
fixed_at: 2026-07-21T17:36:00Z
review_path: .planning/phases/25-contextual-learning-from-session-6-sketches-progression-dril/25-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 25: Code Review Fix Report

**Fixed at:** 2026-07-21T17:36:00Z
**Source review:** .planning/phases/25-contextual-learning-from-session-6-sketches-progression-dril/25-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (fix_scope: critical_warning; 5 Info findings excluded)
- Fixed: 6
- Skipped: 0

Verification after every fix: targeted vitest files green + `npm run check` at 0 errors. Final full suite: 1450 tests passing (baseline was 1440; the 10 new tests are regression coverage added with the fixes).

## Fixed Issues

### WR-01: Ghost markers never render for flat-spelled roots/fifths

**Files modified:** `src/lib/components/PianoKeyboard.svelte`, `src/lib/components/pianoKeyboardGhost.test.ts`, `src/lib/components/shellVoicingDrill.test.ts`
**Commit:** 2416f14
**Applied fix:** Replaced letter-string matching in `ghostClass`/`ghostMarker` with a shared `ghostEntryFor` helper that compares by chroma (`Note.chroma(toAsciiAccidentals(...))`) plus octave, per the project's "match by chroma, never letter strings" rule. Updated the `ghostKeys` prop contract doc. Added two regression tests: a flat-spelled ghost entry (`E♭`) landing on the sharp-labeled black key, and a drill-level test forcing an `Ebmaj7` draw asserting both `[data-ghost="R"]` and `[data-ghost="5"]` render.

### WR-02: Ghost octaves pinned to the audio voicing fall off one-octave (phone) keyboards

**Files modified:** `src/lib/components/ShellVoicingDrill.svelte`, `src/lib/components/shellVoicingDrill.test.ts`
**Commit:** e200a73
**Applied fix:** Removed `pitchOctaveByLetter` (and the now-unused `toAscendingPitches` import); ghost entries are now pinned to the keyboard's base octave 4 (`KEYBOARD_BASE_OCTAVE`), which exists on every visible span. Grading is chroma-based and octave-agnostic, so the audio octave carried no information for the visual hint. Added a drill-level test forcing a `G7` draw (fifth `D5` in the audio voicing) asserting the "5" marker renders and sits on the FIRST (octave-4) D key.

### WR-03: Subtract-stage grading contradicted the ghost "allowed but not required" semantic

**Files modified:** `src/lib/components/ShellVoicingDrill.svelte`, `src/lib/components/shellVoicingDrill.test.ts`
**Commit:** dc8edc3
**Applied fix:** Reconciled per the sketch-019 contract (option (a) from the review, as directed by the orchestrator): in `check()`, when the exact-set match fails AND the stage is `subtract`, extras that are ghost-marked optional notes (root/fifth chroma from `optionalMarkers`) are tolerated; shell notes stay required (`missing` must be empty). The drill stage keeps `matchChord`'s strict exact-set rule. No existing test conflicted with the sketch contract, so none had to be overridden. Added three tests: shell + ghost root grades correct in subtract; shell + a non-optional extra still retries in subtract; drill stage stays strict (shell style + root grades wrong).

### WR-04: Minor-mode progressions drew name distractors from the parallel MAJOR key

**Files modified:** `src/lib/practice/progressions.ts`, `src/lib/practice/progressions.test.ts`, `src/lib/components/ProgressionDrill.svelte`
**Commit:** bb0d012
**Applied fix:** Added `MINOR_DIATONIC_QUALITIES` (natural minor with the template's own dominant-V convention: `m7, m7b5, maj7, m7, 7, maj7, 7`), made `diatonicSevenths(key, mode)` select interval/quality tables by mode, and gave `nameChoices` a third `mode` parameter (defaulting to `'major'` to preserve the pre-existing call shape). `ProgressionDrill` now passes `currentTemplate?.mode ?? 'major'`. Two defensive guards keep the minor pool inside the app's vocabulary: double-accidental roots (e.g. `B♭♭`, natural minor's bVI of D♭) and any `spellChord`-unrecognized symbol are dropped, matching `buildProgression`'s own guard. Added a minor-key `nameChoices` test asserting every choice is diatonic to A minor, plus an exhaustive test over all 12 keys x every minor bar asserting 4 distinct recognized choices survive the defensive drops.

### WR-05: ShellVoicingDrill derived its stage from stale/racy card data

**Files modified:** `src/lib/components/ShellVoicingDrill.svelte`, `src/lib/components/shellVoicingDrill.test.ts`
**Commit:** 349698c
**Applied fix:** `loadCards` now drops stale responses (`if (forSymbol !== symbol) return` after the await, so out-of-order resolutions from rapid Next taps never assign another chord's records) and maintains a `cardsLoaded` flag (set false before the await, true only when the guarded assignment lands). The entire stage UI, including the meet stage's "Got it" action, is gated on `cardsLoaded`, so a stale stage can never flash and a fast "Got it" tap can never write a spurious `voicingMet` mark for the new chord. Added a deferred-promise test asserting no stage UI (and no "Got it") renders while the read is in flight, then the correct stage appears once it resolves. No new user-facing copy was introduced (the gate renders nothing), so no i18n additions were needed.

### WR-06: Confidence log recorded FSRS Hard grades as incorrect

**Files modified:** `src/lib/components/RecallSession.svelte`, `src/lib/components/recallSession.test.ts`, `src/lib/practice/confidenceLog.ts`
**Commit:** de21ecc
**Applied fix:** Per the orchestrator's explicit decision (FSRS Hard is a passing grade), `handleGrade` now logs `correct: rating !== Rating.Again` (true for Hard/Good/Easy, false only for Again), with an explanatory comment. Documented the pass/lapse semantics on `ConfidenceEntry.correct`'s contract in `confidenceLog.ts` since it defines what "accuracy" means on `/progress`. Existing calibration tests (Good=true, Again=false) were unaffected; added a new test asserting a certain-then-Hard grade logs `correct: true` and never becomes a confident-but-wrong entry.

## Notes

- All fixes were applied and committed in an isolated git worktree, then fast-forwarded onto `main`.
- WR-03 and WR-06 change grading/logging semantics (not just structure); both follow the explicit contract decisions supplied with this fix run and are locked in by new tests, but a quick human sanity pass on the subtract-stage grading feel and the /progress calibration numbers is a reasonable follow-up during UAT.

---

_Fixed: 2026-07-21T17:36:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
