---
phase: 13-multi-modal-recall
plan: 04
subsystem: ui
tags: [svelte5, recall-session, audio, pickdistractors, revealinsight, fsrs]

requires:
  - phase: 13-multi-modal-recall
    provides: "RecallSession.svelte's universal mode-signal chip, resetPerCardState() seam, and the see-play sibling-branch pattern (13-03)"
provides:
  - "RecallSession.svelte's 'hear-name' render branch: Play/Play again button (audio.ts reused verbatim), a 4-choice same-root multiple-choice grid (pickDistractors reused unmodified, shuffled once per card), auto-rating via recordGrade, RevealInsight's confusion-contrast line on a miss, and an unconditional 650ms auto-advance"
  - "Mode B's 'never gates' guarantee: a wrong answer advances the queue exactly like a correct one (both fire the same 650ms timer), proven by an explicit only-due-card regression test"
affects: [13-05, 13-06]

tech-stack:
  added: []
  patterns:
    - "State mutation triggered from a fresh $effect (not from an {@const} inside markup) when a per-card computed value needs to be idempotently derived once per card - Svelte 5's state_unsafe_mutation guard forbids mutating $state from a template expression, even when the mutation itself is internally idempotent"
    - "A timer-driven auto-advance (no manual button) reuses the exact same advanceQueue/resetPerCardState/reviewedCount/isSessionComplete sequence the button-driven Next handlers already use, just triggered from inside a setTimeout callback instead of an onclick"

key-files:
  created: []
  modified:
    - src/lib/components/RecallSession.svelte
    - src/lib/components/recallSession.test.ts

key-decisions:
  - "ensureHearNameChoices is invoked from a new $effect keyed on currentItem/currentFact rather than from an {@const} inside the hear-name render branch as the plan's <action> block literally specified - Svelte 5 throws state_unsafe_mutation when $state is written from a template expression, even when the write is internally guarded to run only once per card. The $effect achieves the identical once-per-card idempotent behavior (same internal guard: `if (hearNameChoices.length === 0)`) without violating the render-purity rule."
  - "Mode B's 'never gates' regression test answers wrong first (proving the queue's existing re-enqueue-on-Again contract still applies - normal FSRS retry, not a gate) and then answers correctly on the same re-presented card to reach `pageState === 'complete'`, rather than asserting completion after a single wrong tap. A 1-item queue's `advanceQueue` re-enqueues an Again-rated card behind itself (D-10, unchanged across every mode), so a lone wrong answer cannot complete a single-card session without contradicting that existing, already-tested contract; the true 'never gates' guarantee this plan protects is that a wrong hear-name answer is never a dead end - the session still completes normally once graded well, exactly like every other mode, with no special unlock step required for hear-name specifically."
  - "Added `ensureAudioReady: vi.fn()` to recallSession.test.ts's existing `$lib/audio/audio` mock (previously only `playChord`/`playNote` were mocked). Mode B's Play button is the first path in this test file to actually invoke `ensureAudioReady()` on a code path fireEvent.click reaches, surfacing a pre-existing mock gap - a real code path, not a plan-specific issue, so fixed inline per Rule 3 (blocking issue)."

patterns-established: []

requirements-completed: [RECALL-02, RECALL-01]

coverage:
  - id: D1
    description: "Mode B ('hear-name') shows 'Listen. Name the chord.' plus a Play/Play again button that plays the chord via audio.ts, and a 4-choice grid (correct symbol + 3 same-root distractors from pickDistractors, shuffled once per card), never auto-playing on mount"
    requirement: "RECALL-02"
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#renders the Play/Play again prompt and a 4-choice grid, all sharing the correct root, with no auto-play on mount"
        status: pass
    human_judgment: false
  - id: D2
    description: "Tapping a choice is the complete answer: writes Rating.Good/Rating.Again via recordGrade fire-and-forget, shows a rotating confirmation/wrong headline (with RevealInsight's contrast line on a miss), and auto-advances after exactly 650ms with no manual Next button"
    requirement: "RECALL-02"
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#a correct choice records Rating.Good and auto-advances (no manual Next button) after ~650ms, completing the session"
        status: pass
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#a wrong choice records Rating.Again, shows RevealInsight, and still auto-advances (re-enqueuing the card, never gating)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Mode B never gates or blocks session completion: a wrong answer advances the queue exactly like a correct one, and a session whose only due card is hear-name still completes normally"
    requirement: "RECALL-02"
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#never gates session completion: a session whose ONLY due card is hear-name still completes normally, a prior wrong answer re-queuing it (never blocking) rather than getting stuck"
        status: pass
    human_judgment: false
  - id: D4
    description: "All 4 choices always share the correct answer's ROOT (pickDistractors called unmodified); no new distractor logic, no new dependency, no em dash"
    requirement: "RECALL-01"
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#renders the Play/Play again prompt and a 4-choice grid, all sharing the correct root, with no auto-play on mount"
        status: pass
      - kind: other
        ref: "grep -c \"—\" src/lib/components/RecallSession.svelte returns 0; npm run check (0 errors, 0 warnings); full vitest suite (924 tests, 0 regressions)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Live human verification of the hear-name surface on a real /recall session: chip, Play/Play again sound, same-root choice grid, correct/wrong auto-advance timing, and the RevealInsight contrast line on a miss"
    verification: []
    human_judgment: true
    rationale: "Requires visually/aurally confirming the chord plays correctly through Tone.js, the ~650ms auto-advance pacing feels right, and the RevealInsight contrast line reads correctly in a live browser - not fully assertable from jsdom timer-advance assertions alone."

duration: 9min
completed: 2026-07-15
status: complete
---

# Phase 13 Plan 04: Mode B Hear-Name Recall Surface Summary

**Mode B's ear-based naming surface: a Play/Play-again button reusing audio.ts's playChord verbatim, a 4-choice same-root multiple-choice grid built once per card from pickDistractors, auto-rating via recordGrade, RevealInsight's confusion-contrast line on a miss, and an unconditional 650ms auto-advance that never gates session completion on a wrong answer.**

## Performance

- **Duration:** 9 min (git commit timestamps, 13-03 completion to 13-04 completion)
- **Started:** 2026-07-15T17:13:33Z
- **Completed:** 2026-07-15T17:21:46Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- New `{:else if currentItem.mode === 'hear-name' && currentFact.factKind === 'chord-formula'}` render branch, sibling to the existing `formula`/`see-play` branches: "Listen. Name the chord." body line, a Play/Play again primary button, and a 4-choice grid.
- The Play button calls `ensureAudioReady()` then `playChord(chord.notes.map((note) => note.letter))` (verbatim reuse of `handleReveal`'s exact call shape), labeled "Play" on first tap and "Play again" on every subsequent tap while unanswered - no auto-play on mount.
- The 4-choice grid (`shuffle([fact.symbol, ...pickDistractors(fact.symbol, 3)])`) is generated exactly once per card via an idempotent `ensureHearNameChoices` guarded on `hearNameChoices.length === 0`, driven from a new `$effect` keyed on `currentItem`/`currentFact` (see Decisions Made for why this isn't inlined in the template as the plan's action block literally suggested).
- Tapping a choice is the complete answer: sets `hearNameAnswered`/`hearNameGiven`, computes `Rating.Good`/`Rating.Again`, fires the existing `CORRECT_VARIANTS`/`WRONG_VARIANTS` `pickVariant` picker (reused verbatim from Mode A, not a second independent picker), writes the grade fire-and-forget via `recordGrade` (swallowed catch), and renders `RevealInsight` on a wrong answer only.
- Exactly 650ms after answering (correct or wrong), `hearNameAdvanceTimer` fires `advanceQueue`/`resetPerCardState`/`reviewedCount += 1`/`isSessionComplete` - the identical sequence every other mode's Next button already uses, just timer-triggered instead of click-triggered. No manual Next button exists anywhere in this branch.
- `resetPerCardState()` extended to also reset Mode B's four state fields and clear `hearNameAdvanceTimer`; a new `onDestroy(() => clearTimeout(hearNameAdvanceTimer))` prevents a leaked timer on unmount, mirroring BuildSession's `flashTimer`/`feedbackTimer` discipline.

## Task Commits

Each task was committed atomically:

1. **Task 1: Mode B's hear-name surface - Play/Play again, 4-choice grid, auto-rating, RevealInsight, 650ms auto-advance** - `665df4e` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/lib/components/RecallSession.svelte` - imports `pickDistractors` (from `$lib/drills/generateQuestion`), `RevealInsight`, and `onDestroy`; adds a local `shuffle<T>` helper (per-module private copy, matching generateQuestion.ts's own convention); adds Mode B state (`hearNameAnswered`, `hearNameGiven`, `hearNameChoices`, `hearNamePlayCount`, `hearNameAdvanceTimer`, `HEAR_NAME_ADVANCE_MS`); extends `resetPerCardState()`; adds `ensureHearNameChoices`, `handleHearNamePlay`, `handleHearNameChoice`, the driving `$effect`, and the `onDestroy` timer cleanup; adds the `hear-name` render branch.
- `src/lib/components/recallSession.test.ts` - adds `ensureAudioReady: vi.fn()` to the existing `$lib/audio/audio` mock (see Deviations); new `describe` block covering the Play/Play again label transition + no-auto-play-on-mount, the 4-choice same-root grid, a correct-choice flow (Rating.Good, auto-advance, session completion), a wrong-choice flow (Rating.Again, RevealInsight, re-enqueue, full state reset), and the never-gates regression test.

## Decisions Made
- `ensureHearNameChoices` is invoked from a new `$effect` (keyed on `currentItem`/`currentFact`) instead of from an `{@const}` inside the hear-name render branch, as the plan's `<action>` block literally specified. Svelte 5's `state_unsafe_mutation` guard forbids writing `$state` from inside a template expression (`{@const}`/`$derived`/`$inspect`), even when the write is internally idempotent (guarded by `if (hearNameChoices.length === 0)`) - the first test run surfaced this as an uncaught exception. The `$effect` achieves byte-identical once-per-card behavior without violating render purity; `ensureHearNameChoices` itself is unchanged from the plan's spec.
- The never-gates regression test answers wrong first (proving the queue's pre-existing `advanceQueue` re-enqueue-on-Again contract still applies for hear-name - normal FSRS retry, not a special gate) and then answers correctly on the same re-presented card to reach `pageState === 'complete'`. A single-item queue's `advanceQueue` re-enqueues an Again-rated card behind itself (D-10, identical across every mode); a lone wrong answer therefore cannot complete a 1-card session without contradicting that already-tested, unchanged contract. The actual "never gates" guarantee this plan protects - and what the test proves - is that a wrong hear-name answer is never a dead end: the session still completes normally once graded well, with no hear-name-specific unlock step, exactly like every other mode.
- Added `ensureAudioReady: vi.fn()` to `recallSession.test.ts`'s existing `$lib/audio/audio` mock. Mode B's Play button is the first `fireEvent.click`-reachable path in this test file to actually invoke `ensureAudioReady()`; the mock previously only stubbed `playChord`/`playNote`, so the first Mode B test run threw an uncaught "no export defined on mock" error. Fixed inline (Rule 3 - blocking issue): a pre-existing test-mock gap exposed by exercising a genuinely new code path, not a plan-specific defect.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `ensureHearNameChoices` moved from `{@const}` to a driving `$effect`**
- **Found during:** Task 1 (writing the hear-name render branch per the plan's literal `<action>` text)
- **Issue:** Svelte 5 throws `state_unsafe_mutation` when `$state` is mutated inside a template expression, which `{@const _ensureChoices = ensureHearNameChoices(currentFact.symbol)}` does.
- **Fix:** Moved the call into a new `$effect(() => { if (currentItem?.mode === 'hear-name' && currentFact?.factKind === 'chord-formula') ensureHearNameChoices(currentFact.symbol); })`, keeping `ensureHearNameChoices` itself unchanged (same idempotent guard).
- **Files modified:** src/lib/components/RecallSession.svelte
- **Verification:** `npx vitest run src/lib/components/recallSession.test.ts` passes; `npm run check` reports 0 errors, 0 warnings.
- **Committed in:** `665df4e` (Task 1 commit)

**2. [Rule 3 - Blocking] Added missing `ensureAudioReady` mock to recallSession.test.ts**
- **Found during:** Task 1 (writing the Play/Play again test)
- **Issue:** The test file's `vi.mock('$lib/audio/audio', ...)` only stubbed `playChord`/`playNote`; Mode B's Play button is the first click-reachable path in this file to call `ensureAudioReady()`, which threw an uncaught "no export defined on mock" error.
- **Fix:** Added `ensureAudioReady: (...args) => ensureAudioReadyMock(...args)` to the mock factory and reset/resolve it in `beforeEach`.
- **Files modified:** src/lib/components/recallSession.test.ts
- **Verification:** Full test file passes (18/18); full suite passes (924/924, 0 regressions).
- **Committed in:** `665df4e` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking issues discovered while implementing the plan's literal action text)
**Impact on plan:** Both fixes were necessary to make the plan's specified behavior actually run under Svelte 5's render-purity rules and this test file's existing mock shape. No scope creep - the plan's state field names, function signatures, and render-branch structure are otherwise implemented verbatim.

## Issues Encountered
None beyond the two auto-fixed deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `RecallSession.svelte` now has all three of `formula`/`see-play`/`hear-name` render branches, each a fully self-contained sibling `{:else if currentItem.mode === ...}` block.
- 13-05 (Mode C `formula-build` embedding) can add its own sibling branch following the same pattern; `resetPerCardState()` is the shared per-card reset seam it should extend.
- The `$effect`-driven idempotent-per-card-computation pattern (this plan's Mode B choice-grid generation) is available as precedent for any future mode needing similar once-per-card derived state.
- No blockers for 13-05/13-06.

---
*Phase: 13-multi-modal-recall*
*Completed: 2026-07-15*

## Self-Check: PASSED

- FOUND: src/lib/components/RecallSession.svelte
- FOUND: src/lib/components/recallSession.test.ts
- FOUND: .planning/phases/13-multi-modal-recall/13-04-SUMMARY.md
- FOUND: commit 665df4e (feat(13-04): add Mode B hear-name recall surface)
