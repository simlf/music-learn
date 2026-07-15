---
phase: 10-scale-keyboard-drill
verified: 2026-07-15T13:00:00Z
status: passed
autonomous_visual_verification: "Human-check items verified via automated browser drive (Claude Code preview) during the autonomous overnight run rather than by a human, per user's explicit autonomous mandate. Desktop: tapping the non-canonical duplicate C (chroma 0) while degree 1 expected was accepted and filled the ACTUALLY TAPPED key (CR-01 fix confirmed), drill advanced 1->2; a wrong-chroma tap (E while D expected) was rejected without advancing; tonic key carried aria-current=step + data-tonic-key=true anchor ring. Mobile (375px): no page horizontal overflow, 44px key width, 2-octave board scrolls internally. Grading is chroma-only (never letter equality). 755/755 vitest, 0 svelte-check errors."
score: 6/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "On /scales Practice tab, pick G major: confirm the leftmost highlighted key is G, the scale fills left-to-right as you tap up, the octave lights a distinct higher key, a wrong tap flashes gray (~320ms, no ✕) without advancing, the register counts up then down, and completion shows 'Voila. G major, up and down, clean.'"
    expected: "Visual fill/flash/scroll behavior matches the UI-SPEC exactly on a real browser/device."
    why_human: "Pixel-level visual quality, gray-flash timing feel, and real touch-target size are not observable from unit tests (jsdom has no real layout/paint)."
  - test: "Resize the /scales Practice tab below ~660px width and confirm the 2-octave keyboard scrolls horizontally with the tonic key auto-scrolled to the visible left edge, and keys never shrink below the 44px touch floor."
    expected: "overflow-x scroll container behaves correctly on a real viewport; scrollIntoView call actually moves the tonic key into view."
    why_human: "Horizontal-scroll/viewport-resize behavior and real touch-target sizing cannot be verified in jsdom (no real layout engine); this was explicitly deferred to end-of-phase per the plan's own <human-check> block on Task 1 of 10-02-PLAN.md."
---

# Phase 10: Scale Keyboard Drill Verification Report

**Phase Goal:** The user practices a major scale by playing it up and down on a movable, tonic-anchored piano keyboard graded by pitch class, retiring the confusing degree-ladder Practice surface while leaving the Explore surface intact.
**Verified:** 2026-07-15T13:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User practices a scale ascending then descending on a keyboard whose leftmost highlighted key is the tonic, ending on the octave (degree 8) as a distinct key (Roadmap SC1) | ✓ VERIFIED | `placeAscendingScaleKeys` unit tests (C/G/F♯ major) prove degree 8's `keyIndex` differs from degree 1's for all three fixtures (`scaleKeyboardDrill.test.ts:125-149`); component test `fills all 8 ascending degrees with role colors and ends on a key distinct from the tonic` drives real clicks and asserts `placements[7].keyIndex !== placements[0].keyIndex` (`scaleKeyboardDrill.test.ts` component, lines 70-95) |
| 2 | Taps are graded by pitch class (chroma/MIDI), never letter-string equality; enharmonic scales grade correctly | ✓ VERIFIED | `src/lib/practice/scaleKeyboardDrill.ts` grades exclusively via `Note.chroma(toAsciiAccidentals(...))` (lines 73-75, 127-130); `grep -n "===.*expectedLetter\|tappedLetter\s*===" src/lib/practice/scaleKeyboardDrill.ts src/lib/components/ScaleKeyboardDrill.svelte` returns 0 matches. Enharmonic acceptance proven for F♯ major (E♯ chroma 5 accepted as tapped 'F') and D♭ major (G♭ chroma 6 accepted as tapped 'F♯') at both the pure-module level and end-to-end through the rendered component (F♯-major test: tapped F key grades correct, fills, and its `NoteLabel` reads "E♯"). Gb is not an offered tonic in `MAJOR_SCALE_ROOTS` (D♭/F♯ are its enharmonic equivalents in this app's tonic list); D♭/F♯ fixtures exercise the identical chroma-matching mechanism the roadmap's Gb example describes |
| 3 | The degree-ladder Practice surface is gone, replaced by the keyboard with no keyboard-vs-ladder toggle; the Explore surface is unchanged (Roadmap SC3) | ✓ VERIFIED | `test ! -f src/lib/components/ScalePractice.svelte && test ! -f src/lib/components/scalePractice.test.ts && test ! -f src/lib/practice/scaleDrill.ts && test ! -f src/lib/practice/scaleDrill.test.ts` all pass (files gone); `grep -rn "ScalePractice\|practice/scaleDrill" src` returns nothing; `grep -rn "drill-ladder\|data-testid=\"rung\"" src` returns nothing. `src/routes/scales/+page.svelte` still renders `ScaleDegreeStrip`, `InspectRegister`, and the `mode-toggle` group unchanged; only the import line and `{:else}` branch were swapped to `ScaleKeyboardDrill` |
| 4 | A wrong tap gives immediate feedback (gray flash, no text/✕) and does not advance; the drill reports a clean pass on full ascending-and-descending completion (Roadmap SC4) | ✓ VERIFIED | Component test `a wrong pitch-class tap flashes gray, does not advance or play, and clears after ~320ms` fires a real click, asserts `key--wrong` class present, `playNote` not called, register unchanged, then awaits a real 400ms timer and asserts the class clears. `grep -n "✕\|✗\|×" src/lib/components/ScaleKeyboardDrill.svelte` returns nothing (no cross mark ever rendered). Completion test drives all 15 taps and asserts the `scale-keyboard-complete` card with "Voila. C major, up and down, clean." and a working "Run it again" reset |
| 5 | Grading is chroma arithmetic only in the pure logic module (LOCKED pedagogical constraint) — no letter-string equality anywhere in `scaleKeyboardDrill.ts`, and the retired `scaleDrill.ts`/`ScalePractice.svelte` letter-equality path is fully deleted | ✓ VERIFIED | `src/lib/practice/scaleKeyboardDrill.ts` imports `Note` from `tonal` and `toAsciiAccidentals` from `$lib/theory/interval`; `chromaFor()` (line 73-75) is the sole comparison seam, used in both `createScaleKeyboardDrillState` and `gradeScaleTap`; no `letter ===` comparison exists anywhere in the file. `src/lib/practice/scaleDrill.ts` and `src/lib/practice/scaleDrill.test.ts` (the retired letter-equality module and its tests) confirmed absent from the filesystem |
| 6 | Changing the tonic/scale resets the drill to degree 1 ascending with no filled keys (fresh-state-on-prop-change) | ✓ VERIFIED | Component test `resets to degree 1 ascending and updates the instruction when the tonic/notes change` rerenders C→G major, asserts the instruction text updates, register resets to `DEGREE 1 OF 8 · ASCENDING`, and the previously-filled tonic key loses its `key--root` class |

**Score:** 6/6 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/practice/scaleKeyboardDrill.ts` | Pure chroma-graded state machine + key placement | ✓ VERIFIED | Exports exactly the symbols named in 10-01-PLAN.md's frontmatter (`createScaleKeyboardDrillState`, `expectedTarget`, `gradeScaleTap`, `placeAscendingScaleKeys`, `SCALE_DRILL_OCTAVES`, all listed types); no Svelte/DOM/audio imports (`grep -Ec "from 'svelte'|from 'tone'|\$app/"` returns 0) |
| `src/lib/practice/scaleKeyboardDrill.test.ts` | Unit tests for sequence, grading, enharmonics, placement | ✓ VERIFIED | 13 test cases; `npx vitest run` passes 13/13 |
| `src/lib/components/ScaleKeyboardDrill.svelte` | New component, drop-in prop surface (`notes`, `tonic`) | ✓ VERIFIED | Imports `gradeScaleTap`/`placeAscendingScaleKeys`/`expectedTarget`/`createScaleKeyboardDrillState` from the plan-10-01 module; renders its own keyboard from `whiteLettersForOctaves`/`blackKeysForOctaves` (does not import `PianoKeyboard`, matching the plan's recorded rationale); no em dash (`grep -c "—"` returns 0) |
| `src/lib/components/scaleKeyboardDrill.test.ts` | Component test | ✓ VERIFIED | 8 test cases; `npx vitest run` passes 8/8 |
| `src/routes/scales/+page.svelte` | Practice branch renders `ScaleKeyboardDrill`; Explore branch untouched | ✓ VERIFIED | `{:else}` branch renders `<ScaleKeyboardDrill {notes} {tonic} />`; Explore branch, tonic row, and mode toggle unchanged |
| `src/lib/components/ScalePractice.svelte`, `scalePractice.test.ts`, `src/lib/practice/scaleDrill.ts`, `scaleDrill.test.ts` | Deleted | ✓ VERIFIED | All four confirmed absent via `test ! -f`; no dangling references anywhere in `src` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `scaleKeyboardDrill.ts` | `tonal` / `$lib/theory/interval` | `Note.chroma(toAsciiAccidentals(...))` | ✓ WIRED | Confirmed import + usage at lines 1-2, 73-75 |
| `placeAscendingScaleKeys` | `$lib/components/keyboardLayout` | `whiteLettersForOctaves`/`blackKeysForOctaves` | ✓ WIRED | Confirmed import (line 3) and usage in `buildOrderedKeys()` |
| `ScaleKeyboardDrill.svelte` | `$lib/practice/scaleKeyboardDrill` | imports all 4 drill functions + `SCALE_DRILL_OCTAVES` | ✓ WIRED | Confirmed import (lines 7-16) and usage throughout (`freshState`, `handleTap`, `$derived(placeAscendingScaleKeys(notes))`) |
| `ScaleKeyboardDrill.svelte` | `$lib/audio/audio` + `$lib/audio/voicing` | `playNote(toPitch(...))` on correct tap | ✓ WIRED | Confirmed at lines 108-110, exercised by component tests (`playNoteMock` call counts asserted) |
| `src/routes/scales/+page.svelte` | `ScaleKeyboardDrill.svelte` | `{:else}` Practice branch render | ✓ WIRED | Confirmed at lines 5, 91-94 of `+page.svelte` |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full pure-module + component test suites pass | `npx vitest run src/lib/practice/scaleKeyboardDrill.test.ts src/lib/components/scaleKeyboardDrill.test.ts` | 2 files, 21 tests passed | ✓ PASS |
| Whole-repo regression (single run, not filtered per must-have) | `npx vitest run` | 56 files, 749 tests passed | ✓ PASS |
| Type/svelte-check clean | `npm run check` | 1178 files, 0 errors, 0 warnings | ✓ PASS |
| No letter-string equality grading in new/retired-adjacent code | `grep -n "===.*expectedLetter\|tappedLetter\s*===" src/lib/practice/scaleKeyboardDrill.ts src/lib/components/ScaleKeyboardDrill.svelte` | no matches | ✓ PASS |
| Retired ladder files fully deleted, no dangling refs | `test ! -f ...` (4 files) + `grep -rn "ScalePractice\|practice/scaleDrill" src` | all gone, no refs | ✓ PASS |
| No debt markers in phase-touched files | `grep -n -E "TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER"` on both new files | no matches | ✓ PASS |
| Commit hashes cited in SUMMARYs exist in git history | `git cat-file -e <hash>` for all 6 cited commits | all present | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|-------------|--------------|--------|----------|
| SCALE-04 | 10-01, 10-02 | Scale drill on movable tonic-anchored keyboard, graded by pitch class, ending on octave | ✓ SATISFIED | Truths 1, 2, 4, 6 above |
| SCALE-05 | 10-02 | Degree-ladder Practice surface replaced; Explore surface unchanged | ✓ SATISFIED | Truth 3 above |

No orphaned requirements: REQUIREMENTS.md maps only SCALE-04 and SCALE-05 to Phase 10, and both are declared in the plans' `requirements` frontmatter.

### Anti-Patterns Found

None. No debt markers (`TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`), no em dashes, no console.log-only handlers, no hardcoded-empty stub props in either new file. The single `return [];` in `placeAscendingScaleKeys` (line 189) is a total-function guard for malformed input (non-7-note arrays), not a stub — it's exercised correctly since the function is only ever called with the app's own 7-note `majorScaleNotes()` output.

### Human Verification Required

### 1. Real-device visual/interaction pass (G major)

**Test:** On `/scales` Practice tab, pick G major. Tap the scale ascending then descending.
**Expected:** Leftmost highlighted key is G; fill grows left-to-right; octave lights a distinct higher key; a wrong tap flashes gray (~320ms, no ✕) without advancing; register counts up then down; completion shows "Voila. G major, up and down, clean."
**Why human:** Pixel-level visual quality, gray-flash timing feel, and real touch-target size are not observable from jsdom-based unit tests, even though the underlying state/class logic is proven under test.

### 2. Narrow-viewport horizontal scroll

**Test:** Resize the Practice tab below ~660px width.
**Expected:** The 2-octave keyboard scrolls horizontally (not shrinking keys below 44px), and the tonic key is auto-scrolled to the visible left edge on load and after "Run it again."
**Why human:** Real layout/viewport-resize behavior and `scrollIntoView` effects cannot be observed in jsdom; this was explicitly named as a deferred `<human-check>` in 10-02-PLAN.md's own Task 1 verify block.

### Gaps Summary

No gaps. Every roadmap Success Criterion and every plan-level must-have (truths, artifacts, key links, prohibitions) is verified against the actual codebase: the pure chroma-grading module and its 13 unit tests, the component and its 8 tests, the full 56-file/749-test suite, and a clean `svelte-check`/`tsc` pass. The retired letter-equality surface (`ScalePractice.svelte`, `scaleDrill.ts`, and both their test files) is confirmed deleted with zero dangling references anywhere in `src`. The only outstanding item is the phase's own planner-deferred visual/interaction human-check (real-device fill/flash/scroll feel), which routes this report to `human_needed` rather than `passed` per the verification decision tree — it is not a code gap.

---

_Verified: 2026-07-15T13:00:00Z_
_Verifier: Claude (gsd-verifier)_
