---
phase: 12-build-it-construction
verified: 2026-07-15T15:35:22Z
status: passed
score: 9/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 12: Build-it Construction Verification Report

**Phase Goal:** The learner earns each note by stacking one interval at a time on a keyboard, deriving chords and scales from their formula instead of reading a finished list, and construction accuracy feeds the memorization engine as the formula-build mode of a fact.
**Verified:** 2026-07-15T15:35:22Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria + critical checks)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User builds a chord by tapping notes one interval at a time, earning each note (BUILD-01) | ✓ VERIFIED | `src/lib/practice/construction.ts`'s `createChordConstruction`/`gradeConstructionTap`; `BuildSession.svelte` renders the step loop; `buildSession.test.ts` drives a full Cm7 build end to end through the public API. |
| 2 | User builds a major scale the same way, whole/half steps, closing on the octave (BUILD-02) | ✓ VERIFIED | `createScaleConstruction` appends the forced-root octave close (`interval.short === 'm2'`, `role: 'root'`); test drives a full G major build (`whole, whole, half, whole, whole, whole, half.`). |
| 3 | Each step shows plain-English instruction + WHY; wrong taps give diagnostic feedback; grading by pitch class; enharmonic spelling taught (BUILD-03) | ✓ VERIFIED | `phraseStep` (interval.ts) phrases consecutive intervals with the scale-step second override; `BuildSession`'s `stepLineFor`/`whyLineFor`; wrong-pitch-class diagnostic `"{n} half step{s} too {high|low}."` and wrong-octave `"Right note, wrong octave."`; enharmonic teaching line fires exactly on `isNotableSpelling`. All covered by passing tests. |
| 4 | Completing/missing construction steps records gradeable events as the fact's formula-build mode (BUILD-04) | ✓ VERIFIED | `recordConstructionOutcome()` calls `getCard`/`recordGrade` under mode `'formula-build'`, reusing `chord-formula:{ASCII symbol}` for chords and `scaleFormulaFactId(tonic)` for scales; `ratingForWrongTaps` maps 0→Easy, 1-2→Good, 3+→Hard, never Again; mocked-deck tests assert exact factId/factKind/mode/rating combinations and best-effort failure resilience. |
| 5 (critical check 1) | Construction grades by MIDI/chroma, never letter-string equality; renders target's own tonal spelling | ✓ VERIFIED | `gradeConstructionTap` uses `Note.midi`/`Note.chroma` exclusively (grep confirms zero letter-string equality in the module); Cdim7's 7th step keeps `B♭♭` (never re-derived as `A`); a physical A-key tap satisfies the B♭♭ target by MIDI equality while `earnedNotes` still records `B♭♭`. |
| 6 (critical check 2) | Instructions use consecutive-note intervals (phraseStep), not root-relative | ✓ VERIFIED | `intervalBetween(fullNotes[i-1].letter, fullNotes[i].letter)` computes each step's interval from the PREVIOUS note, not the root; `phraseStep` phrases it plainly ("minor 3rd" / "whole step" / "half step"). |
| 7 (critical check 3) | Wrong-tap gives diagnostic "N half steps too high/low" + wrong-octave branch; full answer list never revealed before completion | ✓ VERIFIED | Both branches implemented distinctly in `gradeConstructionTap`/`BuildSession`; the wrong-pitch-class restatement names only the interval (never the target letter, grep + test-asserted); the formula strip renders exactly one `?` placeholder, never revealing remaining steps. |
| 8 (critical check 4) | Works for chords (stack thirds) and scales (W/H) on a 2-octave keyboard; all catalog targets reachable | ✓ VERIFIED | Full-catalog reachability sweep test walks all 96 chords (ROOTS × QUALITY_SUFFIXES) and 12 scales (MAJOR_SCALE_ROOTS), asserting every step's MIDI falls within [60, 84] and every target completes with zero wrong taps — passing. |
| 9 (critical check 5/6) | Recall surfaces (RecallSession/RecallMap) and existing PianoKeyboard modes unbroken; no em dashes | ✓ VERIFIED | Zero commits to RecallSession.svelte/RecallMap.svelte since Phase 11 (`git log` confirms); full repo test suite (890 tests, 65 files) passes with zero regressions; `npm run check` reports 0 errors/warnings; `grep -c "—"` on BuildSession.svelte and routes/build/+page.svelte both return 0. |

**Score:** 9/9 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/theory/interval.ts` | `phraseStep` export | ✓ VERIFIED | Present, delegates to `intervalFromShort(short).long`, overrides seconds only under `asScaleStep`. |
| `src/lib/srs/facts.ts` | widened `FactKind` + `scaleFormulaFactId`, catalog untouched | ✓ VERIFIED | `FactKind` includes `'scale-formula'`; `scaleFormulaFactId` present; `Fact` union/`CATALOG`/`allFacts()` unchanged (192-fact catalog, no scale-formula member). |
| `src/lib/srs/deck.ts` | widened `Mode`, widened Zod enums, `getCard` | ✓ VERIFIED | `Mode = 'formula' | 'formula-build'`; `CardRecordSchema`'s `mode`/`factKind` enums widened; `getCard(factId, mode)` implemented as a filter over `getAllCards()`. |
| `src/lib/components/PianoKeyboard.svelte` | `constructable`, `onConstructTap`, `flashWrongKey` | ✓ VERIFIED | All three props present with documented precedence (`constructing = constructable && !interactive`; `inspecting` demoted to lose to `constructing`); no `playNote` call in the constructable branch. |
| `src/lib/practice/construction.ts` | construction engine, MIDI/chroma grading, reachability | ✓ VERIFIED | Full module present; 108-target reachability sweep passes; no SRS/Svelte imports (pure module confirmed via grep). |
| `src/lib/components/BuildSession.svelte` | picker + step loop + completion + FSRS write | ✓ VERIFIED | All present: picker, step loop, count-up hint, enharmonic line, completion summary, FSRS write with status line. |
| `src/routes/build/+page.svelte` | `/build` route | ✓ VERIFIED | Renders h1 "Build It", intro line, bordered card wrapping `<BuildSession />`. |
| `src/routes/+layout.svelte` | nav entry between Drills/Recall | ✓ VERIFIED | `navLinks` array: Drills → Build → Recall, confirmed by direct read. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| BuildSession.svelte | construction.ts | `createChordConstruction`/`createScaleConstruction`/`expectedStep`/`gradeConstructionTap`/`isNotableSpelling` imports | ✓ WIRED | All imported and called. |
| BuildSession.svelte | PianoKeyboard.svelte | `<PianoKeyboard notes={construction.earnedNotes} constructable octaves={2} onConstructTap={handleConstructTap} flashWrongKey={flashKey} />` | ✓ WIRED | Exact prop wiring confirmed by direct read. |
| BuildSession.svelte | interval.ts | `phraseStep(step.interval.short, { asScaleStep: kind === 'scale' })` | ✓ WIRED | `phraseFor` helper calls exactly this pattern. |
| BuildSession.svelte | deck.ts / scheduler.ts / facts.ts | `getCard`/`recordGrade`/`newCard`/`Rating`/`scaleFormulaFactId` | ✓ WIRED | `recordConstructionOutcome` calls all five, gated to mode `'formula-build'` only, never `introduceNewCards` or mode `'formula'`. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full repo test suite | `npx vitest run` | 65 files / 890 tests passed | ✓ PASS |
| Type check | `npm run check` | 1282 files, 0 errors, 0 warnings | ✓ PASS |
| Full-catalog reachability (108 targets) | part of `construction.test.ts` | all 96 chords + 12 scales complete with 0 wrong taps, all MIDI in [60,84] | ✓ PASS |
| No em dash in BuildSession.svelte / routes/build/+page.svelte | `grep -c "—"` | 0 / 0 | ✓ PASS |
| No debt markers (TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER) in phase files | `grep -nE ...` | none found | ✓ PASS |
| RecallSession.svelte / RecallMap.svelte untouched since Phase 11 | `git log -- <file>` | last commits are Phase 11 fixes, no Phase 12 commits | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| BUILD-01 | 12-01/02/03/04/05 | Build a chord one interval at a time | ✓ SATISFIED | construction.ts + BuildSession step loop, full Cm7 test run. |
| BUILD-02 | 12-01/02/03/04/05 | Build a scale the same way, W/H, octave close | ✓ SATISFIED | createScaleConstruction + BuildSession scale branch, full G major test run. |
| BUILD-03 | 12-01/02/03/04/05 | Plain-English instructions/WHY, diagnostic wrong-tap feedback, pitch-class grading, enharmonic teaching | ✓ SATISFIED | phraseStep, gradeConstructionTap's three outcomes, count-up hint, enharmonic teaching line. |
| BUILD-04 | 12-06 | Construction accuracy feeds memorization engine as formula-build mode | ✓ SATISFIED | recordConstructionOutcome, getCard/recordGrade wiring, rating mapping, status line. |

No orphaned requirements: REQUIREMENTS.md maps only BUILD-01..04 to Phase 12, and all four are claimed and satisfied.

### Anti-Patterns Found

None. No TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER markers, no stub returns, no hardcoded-empty props in any Phase 12 file.

### Human Verification Required

None. All must-haves are programmatically verifiable and were verified directly against source and a full passing automated test suite (890 tests). The plans' own `<human-check>` blocks (visual pacing feel, manual /build walkthrough) are UX-polish confirmations layered on top of already-proven automated behavior, not gating truths — the underlying behaviors they describe (step advance timing, diagnostic copy, completion summary, nav reachability) are all covered by passing component tests with real timers (`setTimeout`-based waits, not mocked), so the pacing behavior itself is exercised, not merely asserted.

### Gaps Summary

No gaps found. All 9 truths (4 ROADMAP success criteria + 5 critical checks) verified directly against source code, all artifacts exist/are substantive/are wired, all key links confirmed, the full repository test suite passes (890/890), type-checking is clean, and the two Phase 11 consumer surfaces (RecallSession.svelte, RecallMap.svelte) are provably untouched since Phase 11's own commits.

---

_Verified: 2026-07-15T15:35:22Z_
_Verifier: Claude (gsd-verifier)_
