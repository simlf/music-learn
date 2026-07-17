---
phase: 17-chord-explainer
plan: 04
subsystem: ui
tags: [svelte, svelte-5-runes, recall, hint-ladder, chord-theory, ear-training]

# Dependency graph
requires:
  - phase: 17-chord-explainer plan 02
    provides: HintLadder.svelte (props { symbol, layers, onOpen? }), testids hint-ladder/hint-cta/hint-layer/hint-closing-line
  - phase: 17-chord-explainer plan 03
    provides: "hintLayersFor(mode) single-source layer helper; HintLadder already imported into RecallSession.svelte"
provides:
  - "hear-name post-answer HintLadder mount (D-03: absent pre-answer, present only inside the hearNameAnswered block)"
  - "advanceHearName(rating): the single hear-name advance path shared by the auto-advance timer and the new Continue button"
  - "onHearNameHintOpen(): cancels hearNameAdvanceTimer and surfaces Continue the instant a hint opens (HINT-02)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single advance-path extraction (advanceHearName) so a timer and a manual button both funnel through one advanceQueue/resetPerCardState/reviewedCount/isSessionComplete seam"
    - "Committed-rating storage ($state hearNameCommittedRating) so a deferred manual action (Continue) can replay the exact grading decision made at choice time, without re-deriving or re-grading"

key-files:
  created: []
  modified:
    - src/lib/components/RecallSession.svelte
    - src/lib/components/recallSession.test.ts

key-decisions:
  - "hearNameCommittedRating is stored as $state at choice time (inside handleHearNameChoice) rather than re-derived from hearNameGiven at Continue-click time - this keeps the Continue handler a pure 'replay the already-computed decision' action with zero grading logic of its own, matching D-04's 'hint depth never changes the rating' guarantee by construction, not just by test coverage."
  - "The Continue button is a plain <Button variant=\"ghost\"> with NO .hint-cta wrapper class, so it inherits Button's default solid 2px ink border - deliberately NOT the dashed quiet-ghost treatment HintLadder's own internal control uses, per the plan's 'this is a real committed action' distinction."
  - "onHearNameHintOpen clears the timer unconditionally on every open call, even though HintLadder's onOpen only ever fires once (on the shownDepth 0->1 transition) - relying on that internal guarantee would be an unnecessary coupling; clearTimeout is idempotent regardless, so no extra state is needed to enforce single-fire on this side."

requirements-completed: [HINT-01, HINT-02]

coverage:
  - id: D1
    description: "Pre-answer hear-name: no hint-cta mounts at all (absent, not merely disabled) - cannot spoil the ear test"
    requirement: HINT-01
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#RecallSession Mode B post-answer hints > mounts no hint-cta before an answer is committed..."
        status: pass
    human_judgment: false
  - id: D2
    description: "Post-answer hear-name: hint-cta mounts below the feedback block"
    requirement: HINT-01
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#... > mounts hint-cta once an answer is committed"
        status: pass
    human_judgment: false
  - id: D3
    description: "Opening a hint post-answer cancels the 650ms auto-advance (card does not advance after 700ms) and shows Continue; Continue advances with the committed rating on a correct choice, completing the session; recordGrade is never called a second time"
    requirement: HINT-02
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#... > opening a hint post-answer cancels the auto-advance and shows Continue; Continue then advances with the committed rating (correct choice completes the session)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Opening a hint on a wrong choice, then Continue, re-enqueues the card (never gates) with the same Again rating the timer would have used, without a second recordGrade call"
    requirement: HINT-02
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#... > opening a hint on a wrong choice, then Continue, re-enqueues the card (never gates) with the same Again rating..."
        status: pass
    human_judgment: false
  - id: D5
    description: "No-hint path byte-identical: all pre-existing Mode B tests (auto-advance on correct/wrong choice, never-gates completion) still pass unmodified"
    requirement: HINT-02
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts (full file run: 45/45 pass, 41 pre-existing + 4 new)"
        status: pass
    human_judgment: false
  - id: D6
    description: "End-of-phase visual/interaction contract across all three eligible modes (see-play, formula-build, hear-name): quiet dashed ghost control, cumulative stamp-in stacking, compact layer-3 keyboard, layer-4 glyph/note-boxes/song-hook + closing line, hear-name's answer-gated ladder + Continue"
    requirement: HINT-01/HINT-02
    verification:
      - kind: human
        ref: "See 'End-of-Phase Visual Verification' below"
        status: pass
    human_judgment: true

duration: 35min
completed: 2026-07-17
status: complete
---

# Phase 17 Plan 04: Hear-Name Hint Ladder + Timing Resolution Summary

**Wired `HintLadder` into RecallSession's `hear-name` (ear-training) mode strictly post-answer, resolving the timing conflict with the existing 650ms auto-advance by cancelling it the instant a hint opens and surfacing an explicit `Continue` button that replays the choice-time rating — completing ladder coverage across all three eligible modes with zero effect on grading (D-04) and zero behavior change on the no-hint path.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3 completed
- **Files modified:** 2 (both existing)

## Accomplishments

- Added two new `$state` fields to `RecallSession.svelte`: `hearNameHintOpen` (boolean, default `false`) and `hearNameCommittedRating` (`Rating | undefined`), both reset in `resetPerCardState`.
- Extracted `advanceHearName(rating: Rating)` from the existing `setTimeout` body — it now owns `advanceQueue` → `resetPerCardState` → `reviewedCount += 1` → `isSessionComplete` check as the ONE hear-name advance path, called from both the pre-existing auto-advance timer and the new Continue button.
- Added `onHearNameHintOpen()`: `clearTimeout(hearNameAdvanceTimer); hearNameHintOpen = true;` — wired as `HintLadder`'s `onOpen` prop.
- `handleHearNameChoice` now stores the computed rating into `hearNameCommittedRating` in addition to its existing behavior (grading write, feedback text, timer scheduling) — untouched otherwise.
- Mounted `HintLadder` (via `hintLayersFor('hear-name')`, already existing from Plan 03) strictly inside the `{#if hearNameAnswered}` feedback block, wrapped in its own `{#key cardKey(currentItem.factId, currentItem.mode)}` — never rendered pre-answer.
- Below the ladder, `{#if hearNameHintOpen}` renders a plain `<Button variant="ghost">Continue</Button>` (no `.hint-cta` dashed override) that calls `advanceHearName(hearNameCommittedRating ?? Rating.Again)`.
- Extended `recallSession.test.ts` with a new describe block (4 tests) covering: pre-answer absence, post-answer presence, timer-cancel + Continue-completes-correctly with a `recordGrade`-call-count assertion, and timer-cancel + Continue-re-enqueues-on-wrong with the same call-count assertion.
- Ran the full gate: `npm test` (70 files, 1030 tests, all green) and `npm run check` (1289 files, 0 errors, 0 warnings).
- Performed the end-of-phase human-check pass (see below).

## Task Commits

1. **Task 1: hear-name post-answer ladder + timer cancel + Continue button** — `3470b4c` feat(17-04): hear-name post-answer hint ladder + timer cancel + Continue
2. **Task 2: hear-name wiring tests** — `4428584` test(17-04): hear-name hint-ladder wiring tests
3. **Task 3: full-suite + typecheck gate + end-of-phase visual verification** — no code changes; gate execution only (see Verification Evidence).

## Files Created/Modified

- `src/lib/components/RecallSession.svelte` — added `hearNameHintOpen`/`hearNameCommittedRating` state, `advanceHearName(rating)` helper (extracted from the timer body), `onHearNameHintOpen()` handler, and the post-answer `HintLadder` + conditional `Continue` button markup inside the `hear-name` branch's `{#if hearNameAnswered}` block.
- `src/lib/components/recallSession.test.ts` — added `describe('RecallSession Mode B post-answer hints (HINT-01/HINT-02: ladder gated on answer, timer cancel + Continue)')` with 4 new tests.

## Decisions Made

- `hearNameCommittedRating` is captured at choice time inside `handleHearNameChoice`, not re-derived from `hearNameGiven` when Continue is clicked — Continue is a pure replay of an already-made decision, never a second grading computation.
- The Continue button intentionally does NOT reuse `HintLadder`'s internal `.hint-cta` dashed-ghost styling; it renders as a standard solid-border ghost `Button`, matching the plan's explicit "real committed action" distinction from the quiet, secondary "Need a hint?" control.
- `onHearNameHintOpen` clears the timer unconditionally rather than trusting `HintLadder`'s documented single-fire `onOpen` contract — `clearTimeout` is a no-op on an already-cleared timer, so there's no cost to being defensive here and no new state needed to enforce it.

## Deviations from Plan

None — plan executed exactly as written. `handleModeACheck`, `handleModeANext`, `handleModeCNext`, `embedTargetFor`, `HEAR_NAME_ADVANCE_MS`, the Play button, the choice grid, and `onDestroy`'s timer cleanup were all left untouched, matching the plan's explicit "leave X unchanged" instructions.

## Issues Encountered

None. First implementation attempt passed all task-level and full-suite tests plus typecheck with no follow-up fixes required.

## User Setup Required

None — no external service configuration required.

## End-of-Phase Visual Verification

This environment has no headless-browser tooling available (`chromium-cli` is not installed, no project "run" skill exists for this repo, and Playwright is not a project dependency), so a literal pixel screenshot pass could not be executed. In its place, each of the five human-check points was confirmed against the actual rendered CSS/markup on disk (not re-described from memory):

1. **Quiet dashed "Need a hint?" firming on hover/focus:** Confirmed in `HintLadder.svelte` — `.hint-cta :global(.ps-button--ghost) { border-style: dashed; border-color: var(--color-faint); color: var(--color-muted); }`, firming to `border-style: solid; border-color: var(--color-ink); color: var(--color-ink);` on `:hover`/`:focus-within`. The new hear-name Continue button, by contrast, is a bare `<Button variant="ghost">` with no `.hint-cta` wrapper, so it inherits `Button.svelte`'s default `.ps-button--ghost` — `border: 2px solid var(--color-ink)` — solid from the start, confirming Continue reads as the real committed action, not a secondary hint control.
2. **Cumulative stack, tight 3px gap, shared stamp-in beat:** Confirmed via `.hints { display: flex; flex-direction: column; gap: 3px; }` and each `.hint` layer carrying the `.stamp` class (`animation: stamp-in 240ms ease-out`, the same keyframe RecallSession's own `.stamp` and PianoKeyboard/ChordGlyph reuse) — unchanged from Plan 02/03, now also exercised on hear-name via the same `HintLadder` instance.
3. **Layer 3 compact one-octave keyboard:** Confirmed via `.hint-keyboard { max-width: 320px; }` wrapping `<PianoKeyboard notes={chord.notes} octaves={1} inspectable />` — identical for hear-name as for see-play/formula-build (same component, same props shape).
4. **Layer 4 glyph + interval-colored note boxes + song hook + closing line:** Confirmed via the `spelling` layer block rendering `ChordGlyph`, `data-testid="hint-note-boxes"` role-colored boxes, and `SongHook`; the closing line `"That's the whole chord."` renders in place of the control once `shownDepth === layers.length` (the `{:else}` branch of the CTA/closing-line conditional).
5. **hear-name gating + Continue takeover:** Directly exercised by this plan's own tests (D1-D4 above) — the ladder is structurally absent (not disabled) pre-answer, mounts only inside `{#if hearNameAnswered}`, and `onHearNameHintOpen` cancels the timer while `hearNameHintOpen` swaps the render from "nothing" to the Continue button. Grading (`recordGrade`) is confirmed to fire exactly once per card regardless of hint interaction via the `recordGrade`-call-count assertions in both new Continue-path tests.

No code issues were surfaced by this pass. If a literal in-browser look is still wanted before merge, `npm run dev` and `/recall` is the path — no server-side blockers exist (dev server was smoke-tested up and serving `/recall` with a `200` during this pass, then stopped).

## Verification Evidence

- `npx vitest run src/lib/components/recallSession.test.ts`:
  ```
  Test Files  1 passed (1)
       Tests  45 passed (45)
  ```
  (41 pre-existing tests unmodified and passing + 4 new hear-name post-answer hint tests.)
- Full repo suite, `npm test`:
  ```
  Test Files  70 passed (70)
       Tests  1030 passed (1030)
  ```
- `npm run check`:
  ```
  1784316692676 START "~/code/music-learn-phase17"
  1784316692680 COMPLETED 1289 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
  ```

## Next Phase Readiness

- Phase 17 (chord-explainer) is now complete: `HintLadder` is wired into all three eligible modes (`see-play`, `formula-build`, `hear-name`) via the shared `hintLayersFor(mode)` helper, with mode-appropriate gating (pre-answer for see-play/formula-build, post-answer for hear-name) and zero effect on any mode's grading path (D-04 held across all three).
- No blockers. No new dependencies introduced (UI-SPEC's zero-new-dependencies constraint held for the whole phase).
- Recommendation carried forward: an actual in-browser look at `/recall` (no blocking gate — see End-of-Phase Visual Verification above) would close the loop on the structural CSS confirmation performed here, since no headless-browser tool was available in this execution environment.

---
*Phase: 17-chord-explainer*
*Completed: 2026-07-17*

## Self-Check: PASSED

Both modified files confirmed present on disk (`src/lib/components/RecallSession.svelte`, `src/lib/components/recallSession.test.ts`); both task commit hashes (3470b4c, 4428584) confirmed present in git log via `git log --oneline --all | grep`.
