---
phase: 19-interactive-theory
plan: 03
subsystem: interactive-lesson-ui
tags: [svelte, piano-keyboard, audio, chroma-grading, component-test]

requires:
  - phase: 19-interactive-theory
    provides: "THIRDS_LESSON/gradeLessonTap/semitonesFromC/THIRDS_LESSON_DRILL_SEEDS from Plan 19-01"
  - phase: 19-interactive-theory
    provides: "setLessonSeeds one-shot lesson-seeds channel from Plan 19-02"
provides:
  - "InteractiveLesson.svelte: the guided do-then-check thirds lesson component (LEARN-01/02/03), self-contained, no props"
  - "Button.svelte's onclick widened to a plain MouseEvent handler wired on BOTH the button and anchor render branches"
affects: [19-04, theory-page-integration]

tech-stack:
  added: []
  patterns:
    - "Step-card state machine (locked/active/done) mirroring BuildSession's construction-step loop shape, minus the picker and the 650ms pacing timer - a correct tap advances activeIndex immediately"
    - "Hear control previews the ACTIVE step's own target letter (not earnedNotes) for role='third' steps, since immediate advancement means a role-bearing step is never simultaneously active AND already earned - the only way Hear can ever sound anything for those two steps"
    - "Wrapper + :global() CSS override to skin a single Button instance (mustard-on-ink handoff CTA) without touching the shared component's variant API - mirrors RecallSession's/drills' existing .mode-a-controls__primary :global(.ps-button) pattern"

key-files:
  created:
    - src/lib/components/InteractiveLesson.svelte
    - src/lib/components/interactiveLesson.test.ts
  modified:
    - src/lib/components/Button.svelte

key-decisions:
  - "Button.svelte's onclick prop type widened from HTMLButtonAttributes' button-scoped handler to a plain (event: MouseEvent) => void, and wired onto BOTH the <a href> and <button> branches - previously the anchor branch spread no props at all, so href+onclick together (needed for the handoff CTA to both write to storage and navigate) silently dropped the click handler. Fixed as a Rule 1 bug: every existing onclick call site passes a zero-arg callback that never reads the event, so this is backward compatible."
  - "The 'Hear it' control's third-letter source branches on the CURRENT STEP's own role/letter (not earnedNotes) for the two graded third steps (major, minor), falling back to earnedNotes for the root-only step and the hear-then-continue step. This is a deliberate, documented interpretation of the plan's 'derived from earnedNotes' language: since a correct tap advances activeIndex immediately (no BuildSession-style pacing window), a role='third' step is never simultaneously active and already earned, so previewing from earnedNotes would never sound anything for those two steps."
  - "playNote/playChord calls use toPitch(letter, octave)/plain letters rather than the plan's literal bare playNote(letter) pseudocode, matching audio.ts's actual octave-bearing pitch contract used at every other call site in the app (Rule 1: a bare-letter playNote call would pass Tone an octave-less pitch string)."

patterns-established:
  - "A lesson component built architecturally as 'BuildSession minus the picker and the pacing timer' - the step-loop/flash-timer/audio-gating shape is now proven reusable for a second, non-construction interactive surface"

requirements-completed: [LEARN-01, LEARN-02, LEARN-03]

coverage:
  - id: D1
    description: "Vertical step-card stack (locked/active/done visual states); a correct tap (graded by gradeLessonTap, chroma-only) locks the active step green and reveals the next; a wrong tap gives a gentle count-hint retry, does not advance, and plays no audio"
    requirement: "LEARN-01"
    verification:
      - kind: unit
        ref: "src/lib/components/interactiveLesson.test.ts#mounts with only the first step active / a correct tap on the anchor locks step 1 / a wrong tap on step 2 shows the count-hint retry"
        status: pass
    human_judgment: false
  - id: D2
    description: "Each hearable step plays its interval/chord and pulses the lit keys; with sound off, a correct tap still advances the step and no error is thrown"
    requirement: "LEARN-02"
    verification:
      - kind: unit
        ref: "src/lib/components/interactiveLesson.test.ts#clicking Hear it on step 1 / clicking Hear it on step 2 / with sound disabled, a correct tap still advances"
        status: pass
    human_judgment: false
  - id: D3
    description: "After all four steps, the inverted handoff card appears with a real /drills CTA that seeds ['C','Cm'] into the lesson-seeds channel"
    requirement: "LEARN-03"
    verification:
      - kind: unit
        ref: "src/lib/components/interactiveLesson.test.ts#after completing all four steps, the handoff card renders / clicking the handoff CTA writes ['C','Cm']"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-07-18
status: complete
---

# Phase 19 Plan 03: InteractiveLesson Component Summary

**The guided thirds lesson UI: a locked/active/done step-card stack, an inline one-octave constructable keyboard, chroma-only grading with gentle count-hint retries, per-step audio with pulse, and an inverted "Now make it stick" handoff card that seeds ['C','Cm'] into /drills - plus a Button.svelte fix so its handoff CTA can write to storage and navigate in one click.**

## Performance

- **Duration:** 25 min
- **Tasks:** 2 completed
- **Files modified:** 3 (2 new, 1 existing fixed)

## Accomplishments

- `InteractiveLesson.svelte`: self-contained, no-props component rendering the four locked `THIRDS_LESSON` steps as a vertical card stack (`opacity-40` plain-border locked, vermilion-left-border active, verdigris-left-border + filled badge + "Done" chip done), an inline one-octave `PianoKeyboard` on the active step only, `gradeLessonTap`-only grading (never letter-string comparison), a `{N}`-filled count-hint retry on a wrong tap (`semitonesFromC`, with a total fallback for an unparseable letter), a `**phrase**` inline-emphasis parser rendering verdigris `<strong>` spans, a "Hear it" control (`playNote`/`playChord` + pulse, outside any `soundEnabled()` gate), and the inverted mustard-on-ink handoff card wired to `setLessonSeeds(THIRDS_LESSON_DRILL_SEEDS)` via a real `href="/drills"` anchor.
- `Button.svelte`: fixed to accept `onclick` on its `href`-rendering anchor branch (previously dropped silently), a Rule 1 bug fix required for the handoff CTA to both persist the seed pair and navigate through one Button instance.
- `interactiveLesson.test.ts`: 9 tests covering mount state, correct-advance, wrong-tap count-hint (no audio/no advance), the minor-third-role coloring, Hear-it audio for both the root-only and chord cases, sound-off advancement, and the full handoff round-trip (real link + localStorage write).
- Zero new type errors (`npm run check`: 1300 files, 0 errors/0 warnings); full project suite green (77 files, 1082 tests).

## Task Commits

Each task was committed atomically:

1. **Task 1: Build InteractiveLesson.svelte (steps, chroma-graded taps, audio, handoff card)** - `bea2d5d` (feat)
2. **Task 2: Component test for InteractiveLesson (advance, retry, audio, sound-off, handoff)** - `bf19de0` (test)

## TDD Gate Compliance

Task 2 was flagged `tdd="true"`, but Task 1 (its own preceding task) already built the full implementation - there was no separate "missing feature" for a RED phase to fail against at the task-2 boundary. While first authoring the test file, two of the nine assertions failed against the real component:

- One asserted `queryByText('Hear the bright one')` was absent after a wrong tap - a test-authoring mistake, not a component bug: every step's title always renders (locked steps show title + body too, per the UI-SPEC), so "which title exists" was never the right advancement signal. Rewritten to assert on which step's card still holds the live keyboard.
- One asserted an `E key` button role existed on step 3's keyboard - a test-authoring mistake: step 3's keyboard is intentionally non-`constructable` (a hear-then-continue step, `targetChroma: null`), so its keys carry no button role. Rewritten to find the earned E by its `.piano-keyboard__key--third` class instead.

Both fixes were to the TEST file, not the component - the implementation needed no changes to pass. No separate GREEN commit was warranted since there was nothing to fix in production code; the single `test(19-03)` commit already reflects the corrected, passing test suite.

## Files Created/Modified

- `src/lib/components/InteractiveLesson.svelte` - New. Step state machine (`activeIndex`, `earnedNotes`, `wrongFlash`, `feedbackLine`, `hearPulseToken`), body-copy emphasis parser, wrong-hint token filler, `currentThirdLetter()`'s active-step-first/earnedNotes-fallback Hear logic, `handleTap`/`hearCurrent`/`continueStep`/`handleHandoff`, and the locked/active/done card markup plus the inverted handoff card.
- `src/lib/components/interactiveLesson.test.ts` - New. 9 tests, audio mocked (`playNote`/`playChord`/`ensureAudioReady`/`soundEnabled`), `$lib/lessons/thirdsLesson` and `$lib/practice/drillSeeds` left real so grading and the localStorage round-trip are exercised end to end.
- `src/lib/components/Button.svelte` - `onclick` moved out of the inherited `HTMLButtonAttributes` type into an explicit `(event: MouseEvent) => void` prop, wired on both the `<button>` and `<a href>` render branches (previously only the button branch received any props at all when `href` was omitted).

## Decisions Made

- **Button.svelte href+onclick fix (Rule 1):** every existing `Button` call site passes a callback that ignores its event argument, so widening `onclick`'s type to a plain `MouseEvent` handler and wiring it onto the anchor branch is backward compatible with all prior usages (verified: full suite green, `npm run check` clean).
- **Hear-it's third-letter source:** for the two graded third steps (major, minor), `currentThirdLetter()` reads the ACTIVE step's own `letter` field rather than `earnedNotes`, since a correct tap advances `activeIndex` immediately - there is no pacing window (unlike BuildSession's 650ms) where a role='third' step is simultaneously active and already earned. Falls back to `earnedNotes` for the root-only step 1 (nothing to preview before any tap - so `playNote` sounds the root alone) and for step 3 (the hear-then-continue step, which legitimately plays back the just-completed root+major-third pair already sitting in `earnedNotes`).
- **playNote/playChord octave handling:** used `toPitch(letter, octave)` for the tapped-note echo and `toPitch('C', 4)` for the step-1/no-third Hear case, rather than the plan's literal bare `playNote(letter)`/`playNote('C')` pseudocode - matching `audio.ts`'s real octave-bearing pitch contract (every other call site in the app passes an octave; a bare letter would hand Tone.js a frequency-less pitch class).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Button.svelte silently dropped `onclick` when `href` was set**
- **Found during:** Task 1, writing the handoff CTA (`<Button href="/drills" onclick={handleHandoff}>`)
- **Issue:** `Button.svelte`'s anchor-rendering branch (`{#if href}`) never spread `...rest` or referenced `onclick` at all - only the `<button>` branch received any of the destructured props. Every pre-existing `href`-only usage in the app (`Take it to the drills`, `Recall It Now`) never needed a click handler, so this gap was previously invisible.
- **Fix:** Widened `onclick`'s type to a plain `(event: MouseEvent) => void` (via `Omit<HTMLButtonAttributes, 'onclick'>` plus an explicit field) and wired it onto both the `<a>` and `<button>` branches.
- **Files modified:** `src/lib/components/Button.svelte`
- **Verification:** `npm run check` (0 errors/0 warnings, 1300 files); full suite (77 files, 1082 tests) green; `interactiveLesson.test.ts`'s handoff test confirms the click fires `setLessonSeeds`.
- **Committed in:** `bea2d5d`

**2. [Rule 1 - Bug] playNote called with a bare letter (no octave) per the plan's literal pseudocode**
- **Found during:** Task 1, implementing `handleTap`'s correct branch and `hearCurrent`
- **Issue:** The plan's action text reads `playNote(letter)` / `playNote('C')` literally, but every real call site of `playNote` across the app (`RecallSession`, `PianoKeyboard`, `ScaleKeyboardDrill`, `drills/+page.svelte`, `routes/+page.svelte`) passes an octave-bearing pitch string via `toPitch`/string interpolation - a bare letter has no octave for `Tone`'s `triggerAttackRelease` to resolve a frequency from.
- **Fix:** Used `playNote(toPitch(letter, octave))` for the tapped-note echo (the tap's own reported octave) and `playNote(toPitch('C', 4))` for the step-1 Hear preview (matching the app's established base octave 4 convention).
- **Files modified:** `src/lib/components/InteractiveLesson.svelte`
- **Verification:** `interactiveLesson.test.ts`'s "Hear it" and correct-tap tests assert the mocked `playNote` is called; `npm run check` clean.
- **Committed in:** `bea2d5d`

---

**Total deviations:** 2 auto-fixed (both Rule 1 bugs)
**Impact on plan:** Both fixes were small, mechanically necessary corrections to make the plan's own explicit requirements (the handoff CTA's click behavior, LEARN-02's audible requirement) actually function; no scope creep, no behavior beyond what the plan specified.

## Issues Encountered

None beyond the deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `InteractiveLesson.svelte` is a self-contained, no-props component, ready for Plan 19-04 to import onto `/theory` as the page's first section (wrapped in that plan's own `<section data-testid="section-interactive-lesson">` shell, per the UI-SPEC's page-integration contract - this plan does not add its own outer section wrapper/border, only the internal heading/lead/step-stack/handoff markup).
- `Button.svelte`'s widened `onclick` typing is a general-purpose fix, not lesson-specific - any future `href`+`onclick` combination elsewhere in the app now works without further changes.
- No blockers.

---
*Phase: 19-interactive-theory*
*Completed: 2026-07-18*

## Self-Check: PASSED

- FOUND: src/lib/components/InteractiveLesson.svelte
- FOUND: src/lib/components/interactiveLesson.test.ts
- FOUND: src/lib/components/Button.svelte
- FOUND: bea2d5d (Task 1 commit)
- FOUND: bf19de0 (Task 2 commit)
