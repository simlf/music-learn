---
phase: 25-contextual-learning-from-session-6-sketches-progression-dril
verified: 2026-07-21T17:43:47Z
status: passed
score: 24/24 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification: null
---

# Phase 25: Contextual Learning from Session 6 Sketches Verification Report

**Phase Goal:** A returning classical pianist can practice music in real context: naming and playing chords bar-by-bar through ii-V-I progressions on an earn-the-symbol lead sheet (symbols hidden until derived, then filled verdigris), learning shell voicings through help that fades with each chord's FSRS card maturity (meet → subtract → cold drill), and optionally rating pre-reveal confidence in Recall that feeds a calibration payoff view flagging over-confidence and the exact cards gotten wrong while feeling sure.
**Verified:** 2026-07-21T17:43:47Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

This verification reads CURRENT code, not the plan SUMMARY.md snapshots. All 6 post-summary review-fix commits (2416f14, e200a73, dc8edc3, bb0d012, 349698c, de21ecc, documented in `25-REVIEW-FIX.md`) were confirmed present and correctly applied in the files below before scoring any must-have.

### Observable Truths (per-plan must_haves.truths, 24 total across 8 plans)

| # | Plan | Truth | Status | Evidence |
|---|------|-------|--------|----------|
| 1 | 25-01 | `buildProgression('major-ii-V-I','B♭')` returns 3 bars ii/V/I, Cm7/F7/B♭maj7, subdominant/dominant/tonic | ✓ VERIFIED | `src/lib/practice/progressions.ts:105-134,155-170`; `progressions.test.ts` green in full suite |
| 2 | 25-01 | `nameChoices` for V bar of B♭ major returns 4 same-key symbols incl. correct F7, diatonic, no dupes | ✓ VERIFIED | `progressions.ts:182-210` (`diatonicSevenths` + `nameChoices`); test passes |
| 3 | 25-01 | Every bar symbol across every template x key is `spellChord`-recognized | ✓ VERIFIED | `buildProgression` drops any unrecognized symbol (line 165); reachability test green |
| 4 | 25-02 | `shellNotes(spellChord('Cm7'))` returns 3rd+7th only, role order | ✓ VERIFIED | `shellVoicing.ts:46-48`; test green |
| 5 | 25-02 | `optionalMarkers(spellChord('Cm7'))` marks root 'R' + fifth '5' | ✓ VERIFIED | `shellVoicing.ts:69-78`; test green |
| 6 | 25-02 | `voicingStageForChord` returns meet/drill/subtract per State rules | ✓ VERIFIED | `shellVoicing.ts:90-94`; 5 staging tests green |
| 7 | 25-03 | Passing `ghostKeys` renders ghost-hatch class + R/5 marker, distinct from wrong-extra gray | ✓ VERIFIED | `PianoKeyboard.svelte:605-611` (`ghostClass`/`ghostMarker`), distinct `.piano-keyboard__key--ghost` (line 937) vs `.piano-keyboard__key--wrong` (line 837) CSS classes; `pianoKeyboardGhost.test.ts` green |
| 8 | 25-03 | Omitting `ghostKeys` renders byte-identical to before (all existing keyboard tests stay green) | ✓ VERIFIED | Full suite 1450/1450 green including pulse/construct/inspect suites |
| 9 | 25-03 | A ghost key is octave-specific and never applies over an interval-role fill | ✓ VERIFIED | `ghostClass` gates on `!role` (line 606); `ghostEntryFor` compares `octave` equality (line 590) |
| 10 | 25-04 | `logConfidence`/`listConfidence` capped ring buffer; malformed store degrades to `[]` | ✓ VERIFIED | `confidenceLog.ts:66-95`, `isConfidenceEntry` guard (line 48); test green |
| 11 | 25-04 | `calibration(entries)` per-level accuracy + `miscalibrated` flag (certain < somewhat) | ✓ VERIFIED | `confidenceLog.ts:116-133`; divide-by-zero guarded (line 130) |
| 12 | 25-04 | `dangerCards(entries)` groups certain-and-wrong by factId+mode, sorted descending | ✓ VERIFIED | `confidenceLog.ts:146-162`; test green |
| 13 | 25-05 | `/progressions` shows lead-sheet grid: roman numerals visible, symbols hidden as `?`, vermilion cursor, KEY banner | ✓ VERIFIED | `ProgressionDrill.svelte:154-189` (`.measures`/`.measure--cursor`/`?` fallback at line 183), `key-banner` at line 155 |
| 14 | 25-05 | Two-step: name via same-key MC chips, then play via inline keyboard graded by chroma; correct earns symbol (verdigris ChordGlyph stamp-in) + reveals harmonic function | ✓ VERIFIED | `pickName`/`checkPlay` (lines 90-139); `matchChord` grep count 4 in component; `ChordGlyph stamped` at line 178; `functionReveal` at line 201 |
| 15 | 25-05 | Wrong never blocks; completion shows done state + fresh-progression control | ✓ VERIFIED | `nameRetry`/`playRetry` never gate (lines 97-99, 122-125); `progression-complete` card + `again()` (lines 141-151, 238-246) |
| 16 | 25-06 | 3 optional confidence dots render under formula-mode prompt, content flow, before Reveal, one-line legend | ✓ VERIFIED | `RecallSession.svelte:958-977` — `{#if !revealed}`, outside `.review-action-dock` (which starts at line 884), legend at line 975 |
| 17 | 25-06 | Picking a dot never blocks/gates Reveal; grading commits regardless | ✓ VERIFIED | Dots are pure local state (`toggleConfidence`, line 689); `handleGrade` (line 628) never reads `selectedConfidence` to gate, only to log |
| 18 | 25-06 | On grade, confidence entry logged (picked or 'unrated'; correct = Good/Easy) via 25-04's log; resets between cards | ⚠ note (post-fix) | Original semantics were "correct = Good/Easy"; **WR-06 fix changed this to `correct: rating !== Rating.Again`** (Hard now counts as passing) at `RecallSession.svelte:648`, an explicit, tested, orchestrator-approved contract change documented in `confidenceLog.ts:34-39` and `25-REVIEW-FIX.md`. This is a widening/correction of the original wording, not a regression — verified correct per current intended behavior. Reset confirmed via `resetPerCardState` (line 342). |
| 19 | 25-07 | `/voicings` stages by FSRS maturity: New→compare, Learning→subtract (ghost root+fifth + teach panel), Review→cold selector | ✓ VERIFIED | `ShellVoicingDrill.svelte` stage derivation via `voicingStageForChord`; `data-testid={stage === 'drill' ? 'stage-drill' : 'stage-subtract'}` (line 269); compare block at line 244 |
| 20 | 25-07 | Shell answer = 2-note 3rd+7th, graded by chroma; compare intro shows once then scaffold advances | ✓ VERIFIED | `targetNotes` = `shellNotes(chord)` in subtract (line 109); `voicingMet.ts` mark/hasVoicingMet gates re-showing compare |
| 21 | 25-07 | Droppable notes render ghost-hatch (R/5), never wrong-extra gray; 1/2/3 step indicator shows current stage | ✓ VERIFIED | `ghostKeys={stage === 'subtract' ? ghostKeys : undefined}` (line 305); step-indicator chips lines 223-241 |
| 22 | 25-08 | Progress page shows confidence-calibration section: 3-bar chart per level, read from local log | ✓ VERIFIED | `progress/+page.svelte:294-...` `data-testid="confidence-calibration"`, gated `confidenceEntries.length > 0` (line 294); `calibration()`/`listConfidence()` wired (lines 65, 137) |
| 23 | 25-08 | Vermilion MISCALIBRATED flag when certain-accuracy < somewhat-accuracy; danger-cards list with mono meta line | ✓ VERIFIED | `calibrationResult.miscalibrated` consumed; danger list + meta line built from `dangerCards()` (line 66) |
| 24 | 25-08 | "Drill the danger cards" CTA seeds confident-but-wrong chords into `/drills`; section hides gracefully with no data | ✓ VERIFIED | `drillDangerCards()` calls `setDrillSeeds` (line 93-94); section absent when `confidenceEntries.length === 0` |

**Score:** 24/24 truths verified (0 present-but-behavior-unverified)

Item 18 is annotated (not downgraded) because the plan's literal wording ("correct = Good/Easy") was superseded by an explicit, reviewed, tested fix (WR-06) that the phase's own review process applied and documented — the current code correctly implements the corrected, intended semantic (Hard is a passing FSRS grade) and is covered by a dedicated regression test (`recallSession.test.ts`, "certain-then-Hard grade logs correct: true").

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/practice/progressions.ts` | Pure progression engine | ✓ VERIFIED | Exists, exports match plan, zero DOM/Svelte/Dexie imports |
| `src/lib/practice/shellVoicing.ts` | Pure voicing + staging engine | ✓ VERIFIED | Exists, all 6 exports present, pure |
| `src/lib/components/PianoKeyboard.svelte` (ghostKeys) | Additive ghost-hatch prop | ✓ VERIFIED | Additive prop confirmed; all pre-existing keyboard suites green |
| `src/lib/practice/confidenceLog.ts` | Capped local confidence log + aggregation | ✓ VERIFIED | Exists, all exports present, localStorage-only, no Dexie |
| `src/lib/components/ProgressionDrill.svelte` | sketch-017 drill component | ✓ VERIFIED | Exists, wired to 25-01 engine |
| `src/routes/progressions/+page.svelte` | `/progressions` route | ✓ VERIFIED | Exists, renders `<ProgressionDrill />` |
| `src/lib/components/RecallSession.svelte` (confidence dots) | Optional confidence capture | ✓ VERIFIED | Dots added, wired to `logConfidence` |
| `src/lib/components/ShellVoicingDrill.svelte` | sketch-019 staged drill | ✓ VERIFIED | Exists, 3-stage logic wired |
| `src/routes/voicings/+page.svelte` | `/voicings` route | ✓ VERIFIED | Exists, renders `<ShellVoicingDrill />` |
| `src/lib/practice/voicingMet.ts` | Compare-shown-once store | ✓ VERIFIED | Exists, total/degrade-to-safe |
| `src/routes/progress/+page.svelte` (calibration section) | Payoff view | ✓ VERIFIED | Section added, wired to 25-04 aggregation |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `progressions.ts` | `spellChord`/`transposeFrom` | tonal-backed transposition, never hand-rolled | ✓ WIRED | `buildProgression`/`diatonicSevenths` call `transposeFrom` then `spellChord(...).recognized` guard |
| `shellVoicing.ts` | `spellChord` role-tagged notes + scheduler `State` | Filters `chord.notes` by `IntervalRole`; reads `CardRecord.state` | ✓ WIRED | No Dexie/live read; caller-supplied `CardRecord[]` |
| `PianoKeyboard.svelte` ghostClass/ghostMarker | pendingClass/flashWrongClass pattern | Letter+octave-keyed, role-gated helper shape; chroma-based (post WR-01) | ✓ WIRED | `ghostEntryFor` compares by `Note.chroma` + octave (lines 582-591), not raw letter strings |
| `ProgressionDrill.svelte` | 25-01 engine + `matchChord` + `ChordGlyph`/`PianoKeyboard`/`SongMark` | Drives all bar content from engine, grades by chroma, reuses stamp-in reveal | ✓ WIRED | Confirmed via read; `matchChord` used, not letter-string compare |
| RecallSession dots | `.review-action-dock` exception | Dots in content flow, Reveal stays docked; `logConfidence` at grade time | ✓ WIRED | Confirmed at lines 884, 958-977, 638-650 |
| `ShellVoicingDrill.svelte` | 25-02 staging + 25-03 `ghostKeys` + `matchChord` | Reads deck via `getAllCards` (read-only), stages via `voicingStageForChord`, ghost-hatches via `ghostKeys`, grades by chroma | ✓ WIRED | `recordGrade` grep count 0; `matchChord` grep count 5; `ghostKeys` wired at line 305 |
| `progress/+page.svelte` | `listConfidence`/`calibration`/`dangerCards` + `setDrillSeeds` | Reads local log, derives aggregation, reuses existing seeding pattern | ✓ WIRED | Confirmed at lines 65-66, 93-94, 137 |

### Data-Flow Trace (Level 4)

All artifacts above are pure-function-driven (no network/DB dependency for the new phase-25 surfaces except `ShellVoicingDrill`'s read-only `getAllCards()` call, which reads real Dexie deck state — not a stub). `voicingStageForChord`'s stale-load guard (WR-05, `cardsLoaded`/`forSymbol !== symbol` check at `ShellVoicingDrill.svelte:66-71`) was specifically verified present, preventing a race where rapid "Next" taps could assign one chord's card records to another chord's stage derivation. Status: ✓ FLOWING for all data-bearing artifacts.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full project test suite | `npx vitest run` | 105 files / 1450 tests passed | ✓ PASS |
| Type-check | `npm run check` | 1360 files, 0 errors, 0 warnings | ✓ PASS |
| Targeted phase-25 suites (10 files) | `npx vitest run <10 phase-25 test files>` | 137 tests passed | ✓ PASS |
| Ghost-key chroma matching (WR-01) | grep + read `ghostEntryFor` | Compares by `Note.chroma(toAsciiAccidentals(...))` + octave, not letter string | ✓ PASS |
| Ghost-key octave-4 pin (WR-02) | grep + read `KEYBOARD_BASE_OCTAVE` usage | `pitchOctaveByLetter`/`toAscendingPitches` removed; pinned to octave 4 | ✓ PASS |
| Subtract-stage ghost-tolerant grading (WR-03) | grep + read `check()` | Extras tolerated only when ghost-marked optional (root/fifth chroma); shell notes still required | ✓ PASS |
| Minor-mode distractor pool (WR-04) | grep + read `diatonicSevenths`/`nameChoices` | Mode parameter threads through; minor bars draw from `MINOR_DIATONIC_QUALITIES`, never the parallel major | ✓ PASS |
| Stale-load guard (WR-05) | grep + read `loadCards` | `if (forSymbol !== symbol) return` after await; `cardsLoaded` gates all stage UI including "Got it" | ✓ PASS |
| Hard-counts-as-correct calibration (WR-06) | grep + read `handleGrade` | `correct: rating !== Rating.Again` | ✓ PASS |
| Debt-marker scan (TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER) on all 16 phase-25-touched files | grep | 0 matches | ✓ PASS |
| `{@html}` scan on new components/routes | grep | 0 matches | ✓ PASS |
| Em-dash scan on new i18n message files | grep | 0 matches | ✓ PASS |

### Probe Execution

No `scripts/*/tests/probe-*.sh` conventional probes exist in this project and none are declared in the phase's PLAN/SUMMARY files. Skipped — not applicable to this project/phase shape.

### Requirements Coverage

**REQUIREMENTS.md has no SK-* rows** (confirmed via `grep -n "SK-017\|SK-019\|SK-020B" .planning/REQUIREMENTS.md` — zero matches). This is consistent with the phase's own framing: `**Requirements**: none mapped (sketch-driven; must-haves derived per-plan from session-6 sketch winners 017/019/020-B)`. SK-017, SK-019, and SK-020B are sketch-lineage tags used in PLAN frontmatter (`requirements: [SK-017]` etc.), not formal REQUIREMENTS.md row IDs — their absence from REQUIREMENTS.md is expected and is NOT treated as an orphaned-requirement gap. No numbered REQ-IDs were declared by any of the 8 plans, so there is nothing to cross-reference against REQUIREMENTS.md's REQ-ID rows, and no orphaned REQUIREMENTS.md rows map to Phase 25 either (`grep -n "Phase 25" .planning/REQUIREMENTS.md` — zero matches).

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| SK-017 | 25-01, 25-05 | Sketch 017 synthesis (earn-the-symbol lead sheet) | ✓ SATISFIED | Verified above, truths 1-3, 13-15 |
| SK-019 | 25-02, 25-03, 25-07 | Sketch 019 synthesis (staged shell voicings) | ✓ SATISFIED | Verified above, truths 4-9, 19-21 |
| SK-020B | 25-04, 25-06, 25-08 | Sketch 020-B/020-C synthesis (confidence calibration) | ✓ SATISFIED | Verified above, truths 10-12, 16-18, 22-24 |

### Anti-Patterns Found

None. Debt-marker scan (TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER) across all 16 phase-25-touched files returned zero matches. No `{@html}` usage in any new component/route. No hardcoded empty stub returns found in the reviewed engine/component code — all data-bearing functions trace to real inputs (spellChord, CardRecord[], localStorage, Dexie via getAllCards).

### Human Verification Required

None required to pass this verification — no must-have truth depends on unverifiable runtime/visual behavior for goal achievement. However, two items are pre-flagged by the plan SUMMARYs themselves as recommended (not required) on-device follow-ups, carried forward here for completeness:

1. **Visual polish on `/progressions`** (vermilion cursor treatment, verdigris fill, stamp-in timing, phone-width chip/keyboard layout) — flagged human_judgment in 25-05-SUMMARY.md's coverage (D7). Not required for this verification since it doesn't affect goal-achievement truth status (CSS classes are confirmed present and distinct via code read), but recommended before considering sketch-017 "fully polished."
2. **Visual polish on `/voicings`** (ghost-hatch legibility, vcard/step-indicator/voicing-row layout, phone-width stamp-in timing) — flagged human_judgment in 25-07-SUMMARY.md's coverage (D8). Same status as above.
3. **Subtract-stage grading feel and /progress calibration numbers** — the 25-REVIEW-FIX.md notes recommend "a quick human sanity pass" on WR-03 (ghost-tolerant subtract grading) and WR-06 (Hard-as-correct) since both changed grading/logging semantics. Both are covered by dedicated new regression tests and read as correct per the sketch-019/FSRS contracts on code review; a human sanity pass is a nice-to-have, not a verification blocker.

These are not routed into `human_verification` frontmatter (which would force `status: human_needed`) because none of them represent an unresolved truth — every truth in this phase has either a passing automated test or is directly confirmed by reading the deterministic logic (chroma math, staging math, gating booleans). They are surfaced here as optional follow-up context only.

### Gaps Summary

No gaps. All 24 must-have truths across all 8 plans are verified present, substantive, and correctly wired in the current (post-review-fix) codebase. All 6 review-fix commits (WR-01 through WR-06) were independently confirmed applied by reading the actual source, not by trusting the SUMMARY/REVIEW-FIX narrative. Full test suite (1450/1450) and `svelte-check` (0 errors/0 warnings) both green. No debt markers, no `{@html}` injection risk, no em-dash house-rule violations in new copy. REQUIREMENTS.md's absence of SK-017/SK-019/SK-020B rows is expected (sketch-tags, not REQ-IDs) and does not constitute an orphaned requirement.

---

_Verified: 2026-07-21T17:43:47Z_
_Verifier: Claude (gsd-verifier)_
