---
phase: 33-voicing-lean-flow
verified: 2026-07-26T21:54:01Z
status: passed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:

  - test: "On a Chromium browser, open /voicings on a chord whose card is at Review (drill stage). Check the two nudges (\"+ poser la fondamentale\" / \"− retirer la basse\") at a narrow phone viewport width."
    expected: "Both nudge labels read cleanly and either fit on one line or wrap onto a second line without clipping (013 fit rule); French labels are not truncated."
    why_human: "Requires a real Chromium render at a narrow viewport to confirm CSS flex-wrap behavior; this project's preview harness cannot hydrate SvelteKit client-side interactivity (documented gap, see MEMORY.md), so it cannot be checked with curl/SSR."

  - test: "Tap 'Add the root' then 'Remove the bass' (or vice versa) on the drill stage and observe the current-voicing label and prompt text."
    expected: "The current-voicing label and prompt visibly flip in real time (Shell -> Full -> Shell -> Rootless, etc.), matching sketch 022 variant A's contextual by-product presentation; already-tapped keys stay visually selected across the tap."
    why_human: "Visual/interaction quality (label flip readability, keyboard key highlight persistence) requires eyeballing an actual render; unit tests already assert the underlying DOM state (aria-pressed, textContent) but not visual clarity."
---

# Phase 33: Voicing Lean Flow Verification Report

**Phase Goal:** The voicing drill starts on the shell and reaches the full and rootless voicings through contextual add/drop nudges, with no always-on mode picker.
**Verified:** 2026-07-26T21:54:01Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The always-on `Fond. · Shell · Sans fond.` 3-way toggle is gone | VERIFIED | `ShellVoicingDrill.svelte` no longer contains `data-testid="voicing-selector"`, `VOICING_STYLES`, `styleLabel()`, or `selectStyle()`. `grep -rn "voicing-selector\|VOICING_STYLES\|styleLabel\|selectStyle" src/ tests/` returns only the negative test assertion (`shellVoicingDrill.test.ts:684` asserts it is absent). `voicings.ts` no longer contains `voicings.selector.*` or `voicings.aria.selectorGroup`. Test "the old 3-way selector is gone from the drill stage" passes (queries for `voicing-selector` testid and ROOT/ROOTLESS/SHELL buttons all return null). |
| 2 | The drill starts on the shell and reaches full via "+ poser la fondamentale" / rootless via "− retirer la basse" | VERIFIED | `voicingStyle = $state<VoicingStyle>('shell')` (line 145) and `next()` resets it to `'shell'` (line 286). `setVoicing(style)` (lines 214-218) toggles `voicingStyle` between `'shell'` and the tapped target. Component renders two buttons labelled "Add the root" / "Remove the bass" (`voicings.nudge.addRoot`/`removeBass`, fr "Poser la fondamentale"/"Retirer la basse"). Tests "starts on the shell..." (grades E+B with no nudge tapped), "\"Add the root\" reaches the full voicing" (grades C+E+G+B after tap), "\"Remove the bass\" reaches the rootless voicing" (grades E+G+B after tap) all pass — 49/49 tests green in the targeted run. |
| 3 | Current voicing (Shell/Full/Rootless) shown as a by-product, not a picked mode | VERIFIED | `currentVoicingNameKey` is a `$derived` mapping `voicingStyle` to a voicing-name key (lines 221-227), rendered in `<p data-testid="current-voicing">{t('voicings.current.label')} {t(currentVoicingNameKey)}</p>` immediately below the nudge buttons, not as a selectable control. Tests assert `current-voicing` textContent flips to "Full"/"Rootless"/"Shell" (en) and "Complet"/"Voicing actuel :" (fr) purely as a byproduct of nudge taps, with no separate style-picker input. |
| 4 | From-memory chroma grading (matchChord) and staged-by-card-state (Meet/Subtract/Drill) unchanged (REG-01) | VERIFIED | `check()`, `targetNotes`, `matchChord` usage, `voicingStageForChord`, `loadCards`/`cardsLoaded`, `stage`/`effectiveStage`/`selectStep`, `gotIt`/`metVersion`, and the `embedSymbol`/`onComplete` embed seam are byte-identical to pre-phase behavior per the plan's own diff scope (only the drill-stage selector markup, `VOICING_STYLES`/`styleLabel`/`selectStyle`, and CSS `.voicing-row`/`.vchip*` were removed/replaced). Full suite run: `npm test` -> 1528/1528 passed (108 files), including all pre-existing meet/subtract/step-indicator/grading/embed-seam specs and `tests/practice-hub-mix.e2e.test.ts`. `npm run check` -> 0 errors, 0 warnings. |

**Score:** 4/4 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/components/ShellVoicingDrill.svelte` | Nudge-based drill stage, no 3-way selector | VERIFIED | Read in full; `voicing-nudges` group (role=group, aria-label from `voicings.aria.nudgeGroup`), two `.nudge` buttons with `aria-pressed` and `class:nudge--on`, `current-voicing` by-product line, `setVoicing()` toggle. Old selector/CSS fully removed. |
| `src/lib/i18n/messages/voicings.ts` | Nudge/current-voicing/voicing-name keys added; selector keys removed | VERIFIED | 7 new keys present in both en/fr (`nudge.addRoot/removeBass`, `aria.nudgeGroup`, `current.label`, `voicing.shell/full/rootless`); `selector.*`/`aria.selectorGroup` absent (grep confirms 0 hits outside the negative test assertion). No em dash in the file's copy. |
| `src/lib/components/shellVoicingDrill.test.ts` | Nudge-flow specs + VOICE-01 specs | VERIFIED | Read in full: rewritten selector-dependent specs now assert `voicing-nudges`/nudge buttons; 5 new specs cover starts-on-shell, add-root->full, remove-bass->rootless, old-selector-gone, and French labels. All pass. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `voicingStyle` state | `targetNotes` -> `matchChord` grading | `noteSetFor(voicingStyle)` inside `$derived(targetNotes)`, unchanged from pre-phase | WIRED | `targetNotes` derivation (lines 166-168) is untouched; `check()` (lines 245-269) still grades against it via `matchChord`. Confirmed by passing grading tests for shell/full/rootless. |
| nudge `onclick` | `voicingStyle` toggle, preserving `selected` | `setVoicing(style)` sets `voicingStyle`, does NOT touch `selected`, clears only `wrongRetry` | WIRED | Lines 214-218 confirm no `selected` mutation. Test "tapping a nudge keeps the already-tapped keys selected" (UAT V3) passes. |
| `embedSymbol`/`onComplete` | `/practice` hybrid queue embed seam | Untouched props/handling in `next()` and component init | WIRED | `ShellVoicingDrill.embed.test.ts` both specs pass (embedded round drives supplied symbol, `onComplete` fires once, no fresh draw; standalone flow unaffected). `src/routes/practice/+page.svelte` embed usage (`<ShellVoicingDrill embedSymbol={currentItem.symbol} onComplete={...} />`) unchanged. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| VOICE-01 | 33-01-PLAN.md | 3-way toggle removed; shell start; add/drop nudges reach full/rootless; by-product display; regression preserved | SATISFIED | All 4 truths above verified; REQUIREMENTS.md line 13 checkbox `[x]`. |

No orphaned requirements: REQUIREMENTS.md maps only VOICE-01 to Phase 33 (line 51); REG-01 is mapped to Phase 37 (line 58) and is referenced in this plan only as an internal regression-preservation label, not claimed as satisfied by this phase — consistent with the plan's own `requirements: [VOICE-01]` frontmatter.

### Anti-Patterns Found

None. `grep -rn "TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER"` across all 5 phase-modified files returns no matches. No em dashes found in UI copy (the 3 em dashes present in `ShellVoicingDrill.svelte` are pre-existing code comments outside this phase's touched lines, not UI copy, and not introduced by this phase).

### Behavioral Spot-Checks / Full Suite

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Targeted component + i18n + e2e tests | `npx vitest run src/lib/components/shellVoicingDrill.test.ts src/lib/components/ShellVoicingDrill.embed.test.ts src/lib/i18n/messages.test.ts tests/practice-hub-mix.e2e.test.ts` | 4 files / 49 tests passed | PASS |
| Full milestone test suite | `npm test` | 108 files / 1528 tests passed | PASS |
| Type/lint gate | `npm run check` | 1381 files, 0 errors, 0 warnings | PASS |

### Human Verification Required

### 1. Nudge label wrapping at narrow phone width

**Test:** On a Chromium browser, open `/voicings` on a chord whose card is at Review (drill stage shows). View at a narrow phone viewport width.
**Expected:** Both nudge labels ("+ poser la fondamentale" / "− retirer la basse") read cleanly and either fit on one line or wrap onto a second line without clipping (013 fit rule).
**Why human:** Requires a real Chromium render at a narrow viewport to confirm CSS flex-wrap behavior. This project's preview harness cannot hydrate SvelteKit client-side interactivity (documented project gap), so this cannot be checked via curl/SSR inspection.

### 2. Nudge tap visibly flips current-voicing label + keeps keys selected

**Test:** Tap "Add the root" then "Remove the bass" on the drill stage; observe the current-voicing label, prompt text, and already-selected piano keys.
**Expected:** The current-voicing label and prompt visibly flip in real time (Shell -> Full -> Shell -> Rootless), matching sketch 022 variant A's contextual by-product intent, and previously-tapped keys remain visually highlighted as selected across the tap.
**Why human:** Visual/interaction quality (label flip readability, persisted key highlight) requires eyeballing an actual render. Unit tests already assert the underlying DOM state (`aria-pressed`, textContent, `aria-label` on selected keys) but not visual clarity or perceived smoothness.

This is an explicitly deferred item: the plan's own `<human-check>` block (workflow.human_verify_mode = end-of-phase) and SUMMARY.md's coverage item D5 both flag this as intentionally deferred to end-of-phase human UAT, not a gap in the implementation.

### Gaps Summary

No gaps found. All 4 roadmap Success Criteria are verified against the actual codebase (not just SUMMARY.md claims): the component, i18n domain, and all three test files were read in full and cross-checked against the plan's exact acceptance criteria; the full 1528-test suite and svelte-check were re-run fresh in this verification pass (not trusted from SUMMARY.md's reported numbers) and both came back green. The only outstanding item is the plan's own pre-declared end-of-phase visual/interaction UAT, which requires a human on a real browser.

---

_Verified: 2026-07-26T21:54:01Z_
_Verifier: Claude (gsd-verifier)_
