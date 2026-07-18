---
phase: 17-chord-explainer
plan: 03
subsystem: ui
tags: [svelte, svelte-5-runes, recall, hint-ladder, chord-theory]

# Dependency graph
requires:
  - phase: 17-chord-explainer plan 02
    provides: HintLadder.svelte (props { symbol, layers, onOpen? }), testids hint-ladder/hint-cta/hint-layer/hint-closing-line
provides:
  - "hintLayersFor(mode): ('family'|'formula'|'keyboard'|'spelling')[] in RecallSession.svelte, the single per-mode layer source"
  - "HintLadder mounted on see-play (pre-answer only, unmounts on modeAAnswered) and formula-build (whole card, chord targets only)"
affects: [17-chord-explainer plan 04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-card ladder reset via {#key cardKey(factId, mode)} wrap around the mount, matching the pre-existing BuildSession {#key} pattern"
    - "hintLayersFor(mode) as a single-source-of-truth pure helper reused across host modes, avoiding per-branch layer-array literals"

key-files:
  created: []
  modified:
    - src/lib/components/RecallSession.svelte
    - src/lib/components/recallSession.test.ts

key-decisions:
  - "see-play's HintLadder mount lives in its OWN {#key cardKey(...)} block, separate from the surrounding {#if !modeAAnswered} conditional itself (which has no {#key}) - this scopes the fresh-instance-per-card guarantee to exactly the ladder, without wrapping the Check/Clear controls in an unnecessary remount."
  - "formula-build's HintLadder mount shares the EXISTING {#key `${currentItem.factId}|${currentItem.mode}`} region that already wraps BuildSession, rather than adding a second key block, per the plan's explicit instruction to reuse that per-card reset seam."
  - "hintLayersFor takes the host's Mode type (imported from $lib/srs/deck) rather than a bespoke string union, so Plan 04's hear-name call site needs no additional type plumbing."

requirements-completed: [HINT-01, HINT-02]

coverage:
  - id: D1
    description: "see-play pre-answer: 'Need a hint?' renders alongside Check; tapping it reveals the family layer; Check remains clickable and a correct Check still records Rating.Good (hints never cap the grade, D-04); the ladder is gone once answered"
    requirement: HINT-02
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#RecallSession hint ladder wiring (17-03: see-play + formula-build) > see-play: shows 'Need a hint?' pre-answer alongside Check..."
        status: pass
    human_judgment: false
  - id: D2
    description: "formula-build chord card renders HintLadder above the embedded BuildSession, which still mounts in its building state"
    requirement: HINT-01
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#... > formula-build: a chord-formula card renders HintLadder above the embedded BuildSession..."
        status: pass
    human_judgment: false
  - id: D3
    description: "formula-build scale-formula card renders NO hint ladder (chord-only gate) but still mounts BuildSession"
    requirement: HINT-01
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#... > formula-build: a scale-formula card renders NO hint ladder..."
        status: pass
    human_judgment: false
  - id: D4
    description: "Per-card reset: after a wrong Check re-enqueues a see-play card whose hints were opened, its next presentation shows a fresh 'Need a hint?' at depth 0"
    requirement: HINT-02
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#... > per-card reset: after a wrong Check re-enqueues the card..."
        status: pass
    human_judgment: false
  - id: D5
    description: "No-hint path byte-identical: all 37 pre-existing recallSession tests (including the see-play no-hint grading test) still pass unmodified"
    requirement: HINT-02
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts (full file run: 41/41 pass, 37 pre-existing + 4 new)"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-07-17
status: complete
---

# Phase 17 Plan 03: Wire HintLadder into See-Play + Formula-Build Summary

**Mounted the existing `HintLadder` component into RecallSession's two pre-answer-eligible modes (see-play, formula-build), plus the shared `hintLayersFor(mode)` helper that both this plan and Plan 04 (hear-name) reuse as the single per-mode layer source.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2 completed
- **Files modified:** 2 (both existing)

## Accomplishments

- Added `hintLayersFor(mode: Mode)` to `RecallSession.svelte`: returns the 4-item array (`family`/`formula`/`keyboard`/`spelling`) for `see-play`/`hear-name`, and the 3-item array (formula omitted, D-03) for `formula-build`. Documented as the single source both this plan and Plan 04 reuse.
- Mounted `HintLadder` in the see-play branch, inside `{#if !modeAAnswered}`, directly above the `.mode-a-controls` Check/Clear row, wrapped in its own `{#key cardKey(currentItem.factId, currentItem.mode)}` block. Because it lives inside the pre-answer conditional, it unmounts automatically the instant `modeAAnswered` flips true — no extra guard needed.
- Mounted `HintLadder` in the formula-build branch, gated on `embedTarget.kind === 'chord'`, in its own block directly above the existing `<BuildSession>` mount, sharing the pre-existing `{#key \`${currentItem.factId}|${currentItem.mode}\`}` region (no second key wrapper introduced).
- Left `handleModeACheck`, `handleModeANext`, `handleModeCNext`, `embedTargetFor`, and the auto-rating logic completely untouched — the grading/commit path is byte-identical on the no-hint path.
- Extended `recallSession.test.ts` with a new describe block (4 tests): see-play hint-open + still-gradable Rating.Good + ladder-gone-after-answer; formula-build chord card shows the ladder above BuildSession; formula-build scale card shows no ladder but still mounts BuildSession; and a re-enqueued (Rating.Again) card resets to a fresh "Need a hint?" at depth 0 on its next presentation.

## Task Commits

1. **Task 1: hintLayersFor + see-play mount** — `5e2d3a2` feat(17-03): mount HintLadder on see-play + add hintLayersFor helper
2. **Task 2: formula-build mount + wiring tests** — `62a8d60` feat(17-03): mount HintLadder on formula-build + wiring tests

## Files Created/Modified

- `src/lib/components/RecallSession.svelte` — added `HintLadder` import, `hintLayersFor(mode)` helper, the see-play mount (own `{#key}` block above `.mode-a-controls`), and the formula-build mount (inside the existing `BuildSession` `{#key}` block, gated on `embedTarget.kind === 'chord'`).
- `src/lib/components/recallSession.test.ts` — added `describe('RecallSession hint ladder wiring (17-03: see-play + formula-build)')` with 4 new tests.

## Decisions Made

- see-play's ladder mount uses its own dedicated `{#key}` wrap rather than relying on any existing key higher up the tree — the surrounding `{#if !modeAAnswered}` block has no key of its own, so a distinct key was needed to guarantee `shownDepth` resets to 0 on every card change without also forcing an unrelated remount of the Check/Clear buttons.
- formula-build's ladder mount deliberately reuses the pre-existing `{#key \`${currentItem.factId}|${currentItem.mode}\`}` region that already wraps `BuildSession` (per the plan's explicit instruction), rather than introducing a second, redundant key boundary.
- `hintLayersFor` is typed against the host's own `Mode` type (from `$lib/srs/deck`, already imported), so Plan 04's `hear-name` call site can call `hintLayersFor('hear-name')` with no additional type work.

## Deviations from Plan

None — plan executed exactly as written. Both tasks matched their `<action>` blocks precisely: the see-play mount sits above `.mode-a-controls` inside the pre-answer branch; the formula-build mount sits in its own block above `BuildSession`, gated on `embedTarget.kind === 'chord'`, inside the existing `{#key}` region.

## Issues Encountered

None. First implementation attempt passed all tests and typecheck with no follow-up fixes required.

## User Setup Required

None — no external service configuration required.

## Verification Evidence

- `npx vitest run src/lib/components/recallSession.test.ts`:
  ```
  Test Files  1 passed (1)
       Tests  41 passed (41)
  ```
  (37 pre-existing tests unmodified and passing + 4 new hint-ladder-wiring tests, including the isolated no-hint-path check: `npx vitest run ... -t "a correct Check leaves the keyboard untransformed"` → 1 passed.)
- Full repo suite, `npx vitest run`:
  ```
  Test Files  70 passed (70)
       Tests  1026 passed (1026)
  ```
- `npm run check`:
  ```
  1784316307645 START "~/code/music-learn-phase17"
  1784316307650 COMPLETED 1289 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
  ```

## Next Phase Readiness

- `hintLayersFor(mode)` is exported at module scope (private to `RecallSession.svelte`, not re-exported) and ready for Plan 04 to call as `hintLayersFor('hear-name')` — returns the same 4-item array as `see-play` with no further changes needed.
- The `{#key cardKey(...)}` per-card-reset pattern is now demonstrated twice in this file (see-play's own block, formula-build's shared block); Plan 04 can follow either shape depending on where hear-name's post-answer ladder mounts relative to its existing structure.
- No blockers. No new dependencies (UI-SPEC's zero-new-dependencies constraint held).

---
*Phase: 17-chord-explainer*
*Completed: 2026-07-17*

## Self-Check: PASSED

Both modified files confirmed present on disk (`src/lib/components/RecallSession.svelte`, `src/lib/components/recallSession.test.ts`); both task commit hashes (5e2d3a2, 62a8d60) confirmed present in git log via `git log --oneline --all | grep`.
