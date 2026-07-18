---
phase: 19-interactive-theory
verified: 2026-07-18T14:26:34Z
status: human_needed
score: 7/7 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Open /theory on an actual phone-width viewport (or Chrome device toolbar), and physically tap through the one-octave mini keyboard for each of the four thirds-lesson steps."
    expected: "Every key (white and black) is legible and easy to tap without mis-hits at real touch-target size; the vermilion/verdigris left-border, step-num badge fill, and handoff ink-inversion render as specified in 19-UI-SPEC.md (colors, spacing, typography) on a real rendering engine, not just jsdom/CSS-string inspection."
    why_human: "CONTEXT.md explicitly requires the mini keyboard be 'tap-legible on a phone' and UI-SPEC locks exact visual treatment (colors, borders, badge fills, inverted handoff card). jsdom component tests confirm the correct CSS classes/inline styles are applied and the interaction logic is correct, but cannot verify real-device visual rendering, touch ergonomics, or font/color legibility — that requires a human looking at and tapping the actual rendered page."
---

# Phase 19: Interactive Theory Verification Report

**Phase Goal:** A returning classical pianist with beginner theory can work through short, interactive, do-then-check lessons (starting with major vs minor third) on a real keyboard, each ending with a clean handoff into the matching first drill.
**Verified:** 2026-07-18T14:26:34Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Lesson runs as a vertical sequence of small steps pairing plain-English sentence + keyboard action; correct tap advances with confirmation, wrong tap gives gentle retry (Roadmap SC1) | ✓ VERIFIED | `InteractiveLesson.svelte` renders `THIRDS_LESSON` as a step-card stack (locked/active/done, lines 190-260). `interactiveLesson.test.ts` behaviorally proves: correct anchor tap reveals step 2 (line 56-62); wrong tap on step 2 shows count-hint retry, does NOT advance, plays NO audio (line 64-85, asserted `playNoteMock`/`playChordMock` not called and step-2 keyboard still present). Ran `npx vitest run` on this file: **9/9 pass**. |
| 2 | Steps can play their interval/chord so the learner hears what they build (Roadmap SC2 / LEARN-02) | ✓ VERIFIED | `hearCurrent()` calls `playNote`/`playChord` + bumps `hearPulseToken` (InteractiveLesson.svelte:107-116). Tests: "Hear it" on step 1 calls `playNote` (line 101-107); "Hear it" on step 2 calls `playChord(['C','E'])` (line 109-116). Both pass. |
| 3 | Lesson ends with explicit "Try this in a drill" handoff into beginner course on /drills (Roadmap SC3 / LEARN-03) | ✓ VERIFIED | Handoff card renders only when `activeIndex >= steps.length` (InteractiveLesson.svelte:264-280); CTA is `<Button href="/drills" onclick={handleHandoff}>Try this in a drill →</Button>`. Test asserts the handoff card appears with a real `<a href="/drills">` link (line 127-133) and that clicking it writes `['C','Cm']` to `music-learn:lesson-seeds` (line 135-142). Both pass. |
| 4 | Taps are graded by chroma/pitch class, never letter-string comparison (locked v2 constraint) | ✓ VERIFIED | `gradeLessonTap`/`semitonesFromC` in `thirdsLesson.ts` use `Note.chroma(toAsciiAccidentals(letter))` exclusively (lines 115-133). `grep -nE "letter ===|=== letter|tappedLetter ==="` on both `thirdsLesson.ts` and `InteractiveLesson.svelte` returns nothing. Unit tests cover the enharmonic case (D♯ grades true against E♭'s targetChroma 3) — `thirdsLesson.test.ts` 15/15 pass. Component test's `completeAllSteps()` taps the "D♯ key" button for the minor third, proving the same enharmonic-blind grading end-to-end (line 45). |
| 5 | Sound-off still advances steps visually (no silent dead-end); LEARN-02 locked clause | ✓ VERIFIED (behavioral test) | Explicit test: "with sound disabled, a correct tap still advances the step, with no error thrown" — `soundEnabledMock.mockReturnValue(false)`, taps C, asserts step 2's title renders (interactiveLesson.test.ts:118-125). Passes. Code confirms advancement/earnedNotes fill are unconditional, never gated on `soundEnabled()` (InteractiveLesson.svelte:144-150 comment + logic). |
| 6 | Handoff seeds `['C','Cm']` into /drills and renders "FROM YOUR LESSON" tag distinct from "FROM YOUR WEAK LIST" | ✓ VERIFIED | `drillsSongFilter.test.ts` describe block "Lesson-seeds handoff to Drills (LEARN-03)": lesson-seeded question renders "FROM YOUR LESSON" and NOT "FROM YOUR WEAK LIST" (line 301-313); a plain weak-list seed still renders "FROM YOUR WEAK LIST" (line 315-322); lesson seeds take precedence when both channels present (line 324-332). `SOURCE_TAGS` map confirmed at drills/+page.svelte:680-685 (`seeded: 'FROM YOUR WEAK LIST'`, `seeded_lesson: 'FROM YOUR LESSON'`). Both one-shot channels (`LESSON_SEEDS_KEY`/`DRILL_SEEDS_KEY`) independently implemented in `drillSeeds.ts`. All 3 tests pass. |
| 7 | Existing static theory lessons remain intact (not removed/reordered) | ✓ VERIFIED | `theory/+page.svelte` still contains all six original section testids (`section-symbol`, `section-sevenths`, `section-anchor`, `section-dominant`, `section-diminished`, `section-solfege`) plus the new `section-interactive-lesson` inserted first. `theoryInteractiveLesson.test.ts` proves document order (interactive lesson section is index 0, before `section-symbol`) and that `section-symbol`/`section-sevenths` still render. 4/4 tests pass. |

**Score:** 7/7 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/lessons/thirdsLesson.ts` | Pure LessonStep data + grading (LEARN-01) | ✓ VERIFIED | 4-step `THIRDS_LESSON` (targetChroma `[0,4,null,3]`), `THIRDS_LESSON_DRILL_SEEDS = ['C','Cm']`, `gradeLessonTap`, `semitonesFromC`. No Svelte/audio/DOM imports (pure). |
| `src/lib/lessons/thirdsLesson.test.ts` | Unit tests for lesson data/grading | ✓ VERIFIED | 15 tests, all pass (verified via direct run). |
| `src/lib/practice/drillSeeds.ts` | Dedicated lesson-seeds channel | ✓ VERIFIED | `LESSON_SEEDS_KEY`, `setLessonSeeds`, `consumeLessonSeeds` present, independent of `DRILL_SEEDS_KEY`/`setDrillSeeds`/`consumeDrillSeeds`. |
| `src/lib/practice/session.ts` | `seeded_lesson` QuestionSource + origin threading | ✓ VERIFIED | `QuestionSource` union includes `'seeded_lesson'`; `SessionItem.origin?: 'weak'\|'lesson'`; `nextQuestion` emits `source: seed.origin === 'lesson' ? 'seeded_lesson' : 'seeded'`. |
| `src/routes/drills/+page.svelte` | Consumes both seed channels, renders FROM YOUR LESSON tag | ✓ VERIFIED | Lines 130-153 consume both channels with lesson precedence; `SOURCE_TAGS.seeded_lesson = 'FROM YOUR LESSON'` at line 684. |
| `src/lib/components/InteractiveLesson.svelte` | The guided lesson UI component | ✓ VERIFIED | Full step-state machine, chroma-graded taps, audio/pulse, handoff card — all present and wired (see Truths 1-6 evidence). |
| `src/lib/components/interactiveLesson.test.ts` | Component behavior tests | ✓ VERIFIED | 9 tests, all pass. |
| `src/routes/theory/+page.svelte` | InteractiveLesson as first section | ✓ VERIFIED | Import + `section-interactive-lesson` wrapper inserted before `section-symbol`; all 6 static sections intact below it. |
| `src/routes/theoryInteractiveLesson.test.ts` | Placement/coexistence integration test | ✓ VERIFIED | 4 tests, all pass. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `InteractiveLesson.svelte` | `$lib/lessons/thirdsLesson` | imports `THIRDS_LESSON`, `THIRDS_LESSON_DRILL_SEEDS`, `gradeLessonTap`, `semitonesFromC` | ✓ WIRED | Confirmed import block (InteractiveLesson.svelte:3-8); used throughout `handleTap`/`hearCurrent`/`handleHandoff`. |
| `InteractiveLesson.svelte` | `$lib/practice/drillSeeds` | imports `setLessonSeeds`, called in `handleHandoff` | ✓ WIRED | Confirmed line 9, called line 164. |
| `InteractiveLesson.svelte` | `PianoKeyboard.svelte` | `constructable`/`onConstructTap`/`flashWrongKey`/`pulseToken` props | ✓ WIRED | Confirmed lines 219-226. |
| `src/routes/theory/+page.svelte` | `InteractiveLesson.svelte` | direct import + render inside `section-interactive-lesson` | ✓ WIRED | Confirmed lines 9, 90-93. |
| `src/routes/drills/+page.svelte` | `$lib/practice/drillSeeds` | imports `consumeLessonSeeds`/`consumeDrillSeeds`, consumed at session init with lesson precedence | ✓ WIRED | Confirmed line 20, 130-153. |
| `src/lib/practice/session.ts` `nextQuestion` | `SOURCE_TAGS` on drills page | `plan.source` → `questionSource` → `SOURCE_TAGS[questionSource]` | ✓ WIRED | Confirmed `source: seed.origin === 'lesson' ? 'seeded_lesson' : 'seeded'` (session.ts:159) renders through existing render sites (drills/+page.svelte:901,981,1013,1045). |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase-19 targeted test files all pass | `npx vitest run src/lib/lessons/thirdsLesson.test.ts src/lib/components/interactiveLesson.test.ts src/routes/theoryInteractiveLesson.test.ts src/routes/drillsSongFilter.test.ts src/lib/practice/session.test.ts src/lib/practice/drillSeeds.test.ts` | 6 files, 75 tests, all pass | ✓ PASS |
| Full project test suite | `npm test` | 78 files, 1086 tests, all pass | ✓ PASS |
| Type check | `npm run check` | 1301 files, 0 errors, 0 warnings | ✓ PASS |
| No letter-string grading in lesson/component code | `grep -nE "letter ===\|=== letter\|tappedLetter ===" thirdsLesson.ts InteractiveLesson.svelte` | no matches | ✓ PASS |
| No dock references reintroduced | `grep -niE "dock\|KeyboardDock\|dockContext" InteractiveLesson.svelte theory/+page.svelte drills/+page.svelte` | no matches | ✓ PASS |
| No em dashes in modified files | `grep -n "—"` across all phase-19 source files | no matches | ✓ PASS |
| No unresolved debt markers | `grep -niE "TBD\|FIXME\|XXX\|TODO\|HACK\|placeholder"` across all phase-19 source files | one hit, a doc-comment describing the `{N}` token literally named "placeholder token" (not a debt marker) | ✓ PASS (no blocker) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|--------------|--------|----------|
| LEARN-01 | 19-01, 19-03, 19-04 | Vertical do-then-check step sequence, chroma grading, gentle retry | ✓ SATISFIED | Truths 1, 4, 7 above |
| LEARN-02 | 19-01, 19-03 | Steps can play interval/chord, sound-off still advances | ✓ SATISFIED | Truths 2, 5 above |
| LEARN-03 | 19-01, 19-02, 19-03 | "Try this in a drill" handoff, distinct source tag | ✓ SATISFIED | Truths 3, 6 above |

No orphaned requirements: REQUIREMENTS.md maps only LEARN-01/02/03 to Phase 19, and all three are claimed and satisfied across the four plans.

### Anti-Patterns Found

None. No debt markers (TBD/FIXME/XXX), no placeholder returns, no empty handlers, no hardcoded-empty stub data in any phase-19 file.

### Human Verification Required

### 1. Real-device visual and tap-legibility check

**Test:** Open `/theory` on an actual phone-width viewport (or Chrome device toolbar), physically tap through the one-octave mini keyboard for each of the four thirds-lesson steps (anchor, major third, hear-it/continue, minor third), and visually inspect the step-card color states and the inverted handoff card.

**Expected:** Every key (white and black) is legible and easy to tap without mis-hits at the app's 44px minimum touch target; the active step's vermilion left-border, the done step's verdigris left-border + filled step-num badge, and the handoff card's ink-inverted background with mustard eyebrow/CTA all render as specified in `19-UI-SPEC.md`.

**Why human:** CONTEXT.md locks an explicit requirement that the mini keyboard be "tap-legible on a phone," and UI-SPEC locks exact color/spacing/typography treatment. jsdom-based component tests (all passing) confirm the correct CSS classes and inline `style` strings are applied and that the interaction/state-machine logic is correct, but cannot verify real-device rendering, touch ergonomics, or visual legibility — only a human looking at and tapping the actual rendered page can confirm this.

### Gaps Summary

No gaps found. All 7 observable truths (3 from ROADMAP.md success criteria, 4 additional locked constraints from PLAN must_haves) are verified against real code with passing behavioral tests, not just presence/wiring. All three requirement IDs (LEARN-01, LEARN-02, LEARN-03) are satisfied with no orphaned requirements. The only outstanding item is a real-device visual/tap-legibility spot-check that automated tooling cannot perform, which routes this report to `human_needed` rather than `passed` per the verification decision tree.

---

*Verified: 2026-07-18T14:26:34Z*
*Verifier: Claude (gsd-verifier)*
