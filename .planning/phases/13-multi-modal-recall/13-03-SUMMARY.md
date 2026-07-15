---
phase: 13-multi-modal-recall
plan: 03
subsystem: ui
tags: [svelte5, recall-session, piano-keyboard, matchchord, fsrs]

requires:
  - phase: 13-multi-modal-recall
    provides: "deck.ts's Mode union widened to include 'see-play'/'hear-name' (13-01)"
provides:
  - "RecallSession.svelte's universal mode-signal chip (MODE_LABELS), rendered for every mode including the pre-existing formula mode"
  - "RecallSession.svelte's 'see-play' render branch: chord-glyph prompt, interactive PianoKeyboard, matchChord chroma grading, transform-on-wrong feedback, single-Next advance"
  - "A shared resetPerCardState() helper backing both the existing formula-mode handleGrade and Mode A's Next"
affects: [13-04, 13-05, 13-06]

tech-stack:
  added: []
  patterns:
    - "Mode-dispatch render branches keyed on currentItem.mode, sibling to the existing factKind-dispatch inside the formula branch, both nested under the same 'reviewing' guard"
    - "Fire-and-forget recordGrade write pattern (snapshot card+key before any await, swallowed .catch) reused verbatim from BuildSession's WR-03 precedent for a binary auto-rating surface"

key-files:
  created: []
  modified:
    - src/lib/components/RecallSession.svelte
    - src/lib/components/recallSession.test.ts

key-decisions:
  - "Mode A's PianoKeyboard stays interactive={true} throughout, even after answering, with onToggle/onPress internally no-op'ing once modeAAnswered is true - unlike Drills' construction branch, which flips interactive to false on a wrong reveal (that would also silently drop the selected-key hatch highlight the plan explicitly wants preserved)."
  - "selected stays bound to the keyboard at all times (never set to undefined on reveal), so a correct Check's 'no transform' requirement and a wrong Check's simultaneous selected-hatch + interval-color + wrong-gray-fill layering both fall out of PianoKeyboard's existing class-composition rules with no new keyboard prop."
  - "confirmationIndex/wrongIndex are tracked as separate per-branch no-repeat counters (mirroring drills' lastCorrectIndex/lastWrongIndex), so Mode A's correct/wrong variant rotations never fight over one shared lastIndex."

patterns-established:
  - "Pattern: a new recall mode surface is added as a sibling {:else if currentItem.mode === '<mode>'} branch beside the existing formula branch, never by branching further inside it - keeps each mode's prompt/answer/feedback fully self-contained."

requirements-completed: [RECALL-01]

coverage:
  - id: D1
    description: "Every reviewing-mode queue item (formula, formula-build, see-play, hear-name) renders the mode-signal chip with the exact MODE_LABELS text for its mode, including the pre-existing formula mode which had no chip before this plan"
    requirement: "RECALL-01"
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#reviews a chord-formula card end to end: reveal template, live grade-button day-interval labels, and completion (asserts recall-mode-chip = SYMBOL → FORMULA)"
        status: pass
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#renders the see-play prompt (mode chip, chord glyph, keyboard prompt) with Check disabled until a key is played (asserts recall-mode-chip = SYMBOL → PLAY)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Mode A (see-play) shows the chord glyph + 'Play it on the keyboard.', accepts notes via an interactive PianoKeyboard, and Check is disabled until at least one key is selected"
    requirement: "RECALL-01"
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#renders the see-play prompt (mode chip, chord glyph, keyboard prompt) with Check disabled until a key is played"
        status: pass
    human_judgment: false
  - id: D3
    description: "A correct Check grades by chroma set equality via matchChord (never letter strings), leaves the keyboard untransformed, shows a CORRECT_VARIANTS confirmation, writes Rating.Good via recordGrade fire-and-forget, and Next advances/completes the session"
    requirement: "RECALL-01"
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#a correct Check leaves the keyboard untransformed, shows a CORRECT_VARIANTS confirmation, records Rating.Good, and Next completes the session"
        status: pass
    human_judgment: false
  - id: D4
    description: "A wrong Check transforms the same keyboard element in place (target.notes interval-color fill + wrongLetters gray fill on extra selections), shows the 'The chord'/'Your extra note' legend and a WRONG_VARIANTS headline, writes Rating.Again, and Next re-enqueues the card (register stays at its pre-answer count, prompt resets fully)"
    requirement: "RECALL-01"
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#a wrong Check transforms the keyboard (interval colors + gray extra-note fill), shows a legend and WRONG_VARIANTS headline, records Rating.Again, and Next re-enqueues the card"
        status: pass
    human_judgment: false
  - id: D5
    description: "Mode A never renders the 4-button Again/Hard/Good/Easy grade grid; the existing formula-mode grade grid is byte-identical and untouched; no em dash anywhere in the new markup"
    requirement: "RECALL-01"
    verification:
      - kind: unit
        ref: "npm run check (0 errors, 0 warnings) and full vitest suite (920 tests, 0 regressions)"
        status: pass
      - kind: other
        ref: "grep -c \"—\" src/lib/components/RecallSession.svelte returns 0"
        status: pass
    human_judgment: false
  - id: D6
    description: "Live human verification of the see-play surface on a real /recall session: chip, prompt, correct-flow confirmation, wrong-flow keyboard transform/legend, and Next advancing the queue"
    verification: []
    human_judgment: true
    rationale: "Requires visually confirming the keyboard's interval-color reveal, gray wrong-fill, and stamp-in animation render as intended in a live browser - not fully assertable from jsdom-rendered class names alone."

duration: 22min
completed: 2026-07-15
status: complete
---

# Phase 13 Plan 03: Mode-Signal Chip + Mode A See-Play Recall Surface Summary

**Every recall queue item now shows a mode-signal chip (formula included), and a new see-play branch grades played keyboard notes by chroma set equality via matchChord, with transform-on-wrong feedback and a single Next button driving the same advanceQueue re-enqueue contract as the existing grade buttons.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-07-15T17:09:50Z (relative to session start; wall-clock includes file discovery/reading)
- **Completed:** 2026-07-15T17:09:50Z (commit timestamp)
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- `MODE_LABELS` lookup + a universal mode-signal chip (`data-testid="recall-mode-chip"`) now renders for every mode in the reviewing state, including the pre-existing `formula` mode, which had no chip before this plan.
- New `see-play` render branch: chord glyph + "Play it on the keyboard." prompt, an interactive `PianoKeyboard` (no highlight until answered), a Check/Clear control row (local 3:1 flex CSS, `Check` disabled until at least one key is selected).
- On Check: grades the played chroma set against the target chord via `matchChord` (never letter strings), computes `Rating.Good`/`Rating.Again`, and writes the grade fire-and-forget via `recordGrade` (swallowed catch, never blocks the UI).
- Correct feedback: the keyboard renders exactly as the user left it (no transform); a non-repeating `CORRECT_VARIANTS` confirmation line appears below it.
- Wrong feedback: the same keyboard element transforms in place (`target.notes` interval-color fill + `wrongLetters` gray fill/✕ on the user's extra notes), with a "The chord"/"Your extra note" swatch legend and a non-repeating `WRONG_VARIANTS` headline.
- A single "Next" button (never the 4-button grade grid) advances the queue via `advanceQueue`, re-enqueuing only on an Again rating - the identical contract the existing grade buttons already use.
- A shared `resetPerCardState()` helper now backs both Mode A's Next and the existing formula-mode `handleGrade`, replacing its inline `revealed = false` assignment.

## Task Commits

Each task was committed atomically:

1. **Task 1: Universal mode-signal chip + Mode A's see-play surface (prompt, keyboard, Check/Clear, matchChord grading, transform-on-wrong feedback, Next)** - `f1d2e56` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/lib/components/RecallSession.svelte` - MODE_LABELS + mode-signal chip (all modes); existing formula-mode render wrapped under `{#if currentItem.mode === 'formula'}`; new `{:else if currentItem.mode === 'see-play' && currentFact.factKind === 'chord-formula'}` branch (prompt, keyboard, Check/Clear, matchChord grading, transform-on-wrong feedback, Next); shared `resetPerCardState()` helper; local `.mode-a-controls` CSS.
- `src/lib/components/recallSession.test.ts` - Extended the existing formula-mode end-to-end test with a `recall-mode-chip` assertion; added a new `describe` block covering Mode A's prompt render, Check-disabled state, the full correct Check -> Next -> completion flow, and the full wrong Check -> Next -> re-enqueue flow (real `matchChord`/`spellChord` against the real `chord-formula:Cm7` catalog fact, mocked deck/audio seam only).

## Decisions Made
- Mode A's `PianoKeyboard` stays `interactive={true}` throughout (even after answering), with `toggleModeAKey`/`pressModeAKey` internally no-op'ing once `modeAAnswered` is true, rather than flipping `interactive` to false on a wrong reveal (Drills' own construction-branch approach) - flipping it would have silently dropped the selected-key hatch highlight the plan's behavior spec requires to persist through the reveal.
- `selected` stays bound to the keyboard unconditionally (never swapped to `undefined` on reveal, unlike Drills' construction branch), so the correct-answer "no transform" requirement and the wrong-answer's simultaneous selected-hatch + interval-color + wrong-gray-fill layering both fall out of `PianoKeyboard`'s existing class-composition rules (`selectedClass`/`wrongClass`/`roleClass` are independently additive) without any new keyboard prop.
- `confirmationIndex`/`wrongIndex` are tracked as Mode-A-local no-repeat counters (separate from Drills' own `lastCorrectIndex`/`lastWrongIndex`, which live in a different component), so Mode A's variant rotations never interact with any other surface's rotation state.

## Deviations from Plan

None - plan executed exactly as written. The implementation follows the plan's `<action>` block verbatim: same state field names, same function signatures, same render-branch structure, same CSS class names.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `RecallSession.svelte`'s `see-play` branch and universal mode-signal chip are ready for 13-04 (Mode B `hear-name`) and 13-05 (Mode C `formula-build` embedding) to add their own sibling `{:else if currentItem.mode === ...}` branches beside this one and the existing `formula` branch, following the same self-contained pattern.
- `resetPerCardState()` is the shared per-card reset seam every future mode's Next/advance path should call.
- No blockers for 13-04/13-05/13-06.

---
*Phase: 13-multi-modal-recall*
*Completed: 2026-07-15*

## Self-Check: PASSED

- FOUND: src/lib/components/RecallSession.svelte (MODE_LABELS, recall-mode-chip, matchChord, resetPerCardState all present via grep)
- FOUND: src/lib/components/recallSession.test.ts (14/14 tests passing)
- FOUND: commit f1d2e56 (feat(13-03): add mode-signal chip and Mode A see-play recall surface)
