---
phase: 34-progression-scaffold-beginner-keyboard
plan: 02
subsystem: ui
tags: [svelte5, fsrs, i18n, counting-chips, piano-keyboard, progressions]

requires:
  - phase: 34-progression-scaffold-beginner-keyboard
    provides: "Plan 34-01's stage/cardsLoaded per-bar FSRS maturity signal (voicingStageForChord reused verbatim)"
  - phase: 32-shape-legibility
    provides: "CountingChipRow (role-tinted tone chips + fill/outline gap chips), reused verbatim as the count rung"
provides:
  - "An escalating, optional hint ladder inline in ProgressionDrill.svelte (degree -> root, CountingChipRow count rung, ghost-hatched keys), never revealing the chord symbol"
  - "The rung set offered fades with the current bar's card maturity: meet 3 rungs, subtract 2 (degree dropped), drill 0 (no ladder)"
  - "PianoKeyboard's ghostKeys prop wired to the current bar's R/3/5/7 chord tones, populated only once the ghost rung is revealed"
  - "progressions.hint.* i18n keys (en/fr) for the ladder's reveal-control labels, tier tags, split-sentence rung bodies, mode words, and quality words"
affects: []

tech-stack:
  added: []
  patterns:
    - "A shared component's escalating-reveal interaction/CSS (HintLadder.svelte) can be mirrored verbatim into a second, purpose-specific inline ladder rather than grafting a new layer kind onto the shared component, when the rung content genuinely doesn't fit that component's fixed API - keeps both consumers scoped and REG-01-safe."

key-files:
  created: []
  modified:
    - src/lib/i18n/messages/progressions.ts
    - src/lib/components/ProgressionDrill.svelte
    - src/lib/components/progressionDrill.test.ts

key-decisions:
  - "The hint ladder is inline markup in ProgressionDrill.svelte, not an extension of the shared HintLadder.svelte and not a new standalone component - HintLadder's fixed family/formula/keyboard/spelling layer kinds don't fit this drill's degree/count/ghost rungs, and grafting a 5th kind onto it would risk regressing RecallSession/BuildSession outside this phase's scope."
  - "qualityWord uses dedicated progressions.hint.quality.* i18n keys (literal FR fallback words from the UI-SPEC) rather than mnemonicFor/familyLineFor, since those helpers' prose doesn't fit this sentence shape and the UI-SPEC explicitly supersedes that suggestion for sentence fit and en/fr parity."
  - "The degree rung's ordinal word and the ROMAN_TO_DEGREE map are small local lookups inside ProgressionDrill.svelte (not added to ProgressionBar/progressions.ts), keeping the change scoped to this one component per REG-01."
  - "Ghost revealed-ness is derived as `offeredRungs.includes('ghost') && hintDepth >= offeredRungs.length` (ghost is always the last offered rung), rather than a separate revealed-rungs Set, since the ladder's reveal is strictly cumulative/ordered."

patterns-established:
  - "A second escalating-hint-ladder implementation now exists in the codebase (HintLadder.svelte's shared family/formula/keyboard/spelling ladder, ProgressionDrill's inline degree/count/ghost ladder) sharing one interaction grammar and CSS shape but independent markup/state - the reusable pattern is the grammar (cumulative reveal, capped depth, renumbered tier tags, quiet dashed CTA), not a single shared component."

requirements-completed: [SCAF-01]

coverage:
  - id: D1
    description: "The escalating hint ladder reveals degree -> root, then the CountingChipRow count rung, then ghost-hatched keys, one tap at a time, ending in a closing note with the control gone"
    requirement: SCAF-01
    verification:
      - kind: unit
        ref: "src/lib/components/progressionDrill.test.ts#ProgressionDrill: escalating hint ladder (SCAF-01) > reveals degree -> count -> ghost one rung at a time, then shows the closing note with the control gone"
        status: pass
    human_judgment: false
  - id: D2
    description: "The chord symbol never appears inside the ladder container at any reveal depth"
    requirement: SCAF-01
    verification:
      - kind: unit
        ref: "src/lib/components/progressionDrill.test.ts#ProgressionDrill: escalating hint ladder (SCAF-01) > never renders the current bar's chord symbol inside the ladder at any depth"
        status: pass
    human_judgment: false
  - id: D3
    description: "The rung set offered fades with card maturity: meet offers 3, subtract offers 2 with renumbered tier tags (degree dropped), drill offers 0 (no ladder rendered)"
    requirement: SCAF-01
    verification:
      - kind: unit
        ref: "src/lib/components/progressionDrill.test.ts#ProgressionDrill: escalating hint ladder (SCAF-01) > a subtract-stage card (State.Learning) offers only 2 rungs (count, ghost), tags renumbered from 1"
        status: pass
      - kind: unit
        ref: "src/lib/components/progressionDrill.test.ts#ProgressionDrill: escalating hint ladder (SCAF-01) > a drill-stage card (State.Review) renders no hint ladder at all"
        status: pass
    human_judgment: false
  - id: D4
    description: "hintDepth resets to closed on cursor advance to a new bar, but a wrong Check within the same bar never hides already-revealed rungs"
    requirement: SCAF-01
    verification:
      - kind: unit
        ref: "src/lib/components/progressionDrill.test.ts#ProgressionDrill: escalating hint ladder (SCAF-01) > resets the ladder to closed when the cursor advances to the next bar"
        status: pass
      - kind: unit
        ref: "src/lib/components/progressionDrill.test.ts#ProgressionDrill: escalating hint ladder (SCAF-01) > preserves already-revealed rungs across a wrong Check within the same bar"
        status: pass
    human_judgment: false
  - id: D5
    description: "Ghost markers (R/3/5/7) populate on the live play keyboard only after the ghost rung is revealed, never before"
    requirement: SCAF-01
    verification:
      - kind: unit
        ref: "src/lib/components/progressionDrill.test.ts#ProgressionDrill: escalating hint ladder (SCAF-01) > populates ghost keys on the keyboard only after the ghost rung is revealed"
        status: pass
    human_judgment: false
  - id: D6
    description: "Earn-the-symbol grading, roman display, function reveal, completion, embed onComplete, and the interleaved practice queue are byte-behavior unchanged (REG-01)"
    verification:
      - kind: unit
        ref: "src/lib/components/progressionDrill.test.ts (all pre-existing describes)"
        status: pass
      - kind: unit
        ref: "src/lib/components/ProgressionDrill.embed.test.ts (both describes)"
        status: pass
      - kind: unit
        ref: "tests/practice-hub-mix.e2e.test.ts"
        status: pass
      - kind: unit
        ref: "full vitest suite (108 files, 1538 tests)"
        status: pass
    human_judgment: false
  - id: D7
    description: "On-device visual confirmation of the ladder rungs, chip row, ghost keys, and the dashed quiet control"
    verification: []
    human_judgment: true
    rationale: "The preview harness cannot hydrate this SvelteKit app (project memory: preview-harness-null-origin-sveltekit); visual confirmation is deferred to on-device UAT, per this plan's own <verification> note."

duration: ~15min
completed: 2026-07-27
status: complete
---

# Phase 34 Plan 02: Progression Scaffold & Beginner Keyboard - Hint Ladder Summary

**An inline, escalating "Afficher un indice" ladder (degree -> root, then CountingChipRow's role-tinted count chips, then ghost-hatched keys) that unblocks the earn-the-symbol progression drill without ever revealing the chord symbol, fading to fewer rungs as the current bar's FSRS card matures.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Added `progressions.hint.*` i18n keys (en/fr) for the reveal-control labels, the tier prefix + three tier tags, the degree/count split-sentence rung bodies, lowercase in-sentence mode words, and four keyed quality words (maj7/m7/dom7/m7b5) - all symbol-immune, no chord symbol/roman numeral/note letter routed through `t()`.
- `ProgressionDrill.svelte` gained a fully self-contained, inline hint ladder: a local `ROMAN_TO_DEGREE` map, a locale-aware ordinal resolver, a `qualityWord` resolver, and a `ghostKeysForCurrentBar` derivation (R/3/5/7, extending `shellVoicing.ts`'s R/5-only vocabulary). The ladder mirrors `HintLadder.svelte`'s escalating-cumulative reveal grammar and CSS verbatim (copied into this component's own scoped `<style>`), without touching or extending that shared component.
- `hintDepth` ($state) caps at the number of rungs offered by the current bar's `stage` (meet 3 / subtract 2 / drill 0, reusing Plan 34-01's `voicingStageForChord` signal), resets to 0 on cursor advance via a `$effect` keyed on `cursor`, and is untouched by a wrong Check within the same bar.
- `CountingChipRow` (Phase 32) is imported directly as the count rung's single source of truth, fed `spellChord(currentBar.symbol)`; no chip markup was re-authored.
- `PianoKeyboard`'s existing `ghostKeys` prop now receives the current bar's R/3/5/7 markers, gated on `ghostHintRevealed` (true only once the ghost rung has actually been tapped open) - purely additive to the existing interactive/selection wiring.
- 8 new tests in `progressionDrill.test.ts` (reveal sequence, symbol-hidden invariant, maturity fade at subtract/drill stages, cursor-reset vs. wrong-Check preservation, and ghost-key gating), all passing alongside the full pre-existing suite (108 files, 1538 tests, `npm run check` 0 errors/0 warnings).

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the hint-ladder copy to the progressions i18n domain** - `28c16e8` (feat)
2. **Task 2: Inline escalating hint ladder + ghost keys (SCAF-01)** - `b309cf5` (feat)
3. **Task 3: SCAF-01 hint-ladder tests + REG-01 sweep** - `f1c4fb0` (test)

## Files Created/Modified

- `src/lib/i18n/messages/progressions.ts` - added `progressions.hint.*` keys (en/fr): reveal labels, tier tags, split-sentence rung bodies, mode words, quality words, ghost body, closing note
- `src/lib/components/ProgressionDrill.svelte` - added the inline hint ladder (state, derivations, markup, and CSS mirrored from `HintLadder.svelte`), and wired `ghostKeys`/gating onto the existing play-step `PianoKeyboard`
- `src/lib/components/progressionDrill.test.ts` - added a `revealHint()` test helper and a new SCAF-01 describe block covering reveal sequence, symbol-hidden, maturity fade, cursor reset, wrong-Check preservation, and ghost gating

## Decisions Made

- The ladder lives inline in `ProgressionDrill.svelte`, not as an extension of `HintLadder.svelte` or a new standalone component (per 34-UI-SPEC §1's explicit decision) - the shared component's fixed layer-kind API doesn't fit this drill's rungs, and touching it would risk regressing RecallSession/BuildSession outside this phase's REG-01 scope.
- `qualityWord` resolves through dedicated `progressions.hint.quality.*` keys (the UI-SPEC's literal FR fallback words) rather than `mnemonicFor`/`familyLineFor`, per the plan's explicit discretion grant for sentence fit and en/fr parity.
- `ROMAN_TO_DEGREE` and the ordinal-word tables are small local lookups inside `ProgressionDrill.svelte`, not new fields on `ProgressionBar`/`progressions.ts`, keeping the change scoped to one file.
- Ghost-revealed state is derived (`offeredRungs.includes('ghost') && hintDepth >= offeredRungs.length`) rather than tracked as a separate boolean, since ghost is always the last rung in a strictly cumulative reveal.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None - matches the plan's own threat register (all dispositions accept/mitigate-and-tested, no new trust boundary). The symbol-hidden mitigation (T-34-02-01) is proven by a dedicated test asserting `'Dm7'` never appears inside the `progression-hint-ladder` container at any depth.

## Issues Encountered

None.

## Next Phase Readiness

- Phase 34 (SCAF-01 + SCAF-02) is now fully delivered across Plans 01-02. The `stage`/`cardsLoaded` maturity signal and the escalating hint-ladder grammar are both established and available as precedent for Phase 35 (Inversions), which the roadmap notes will graft the same 024-A hint-ladder pattern onto a new drill family.
- On-device visual confirmation of the ladder rungs, chip row, ghost-hatch keys, and the dashed quiet reveal control remains an open post-ship UAT item, consistent with this project's standing preview-harness limitation (same disposition as Plan 34-01's beginner-keyboard span).

---
*Phase: 34-progression-scaffold-beginner-keyboard*
*Completed: 2026-07-27*

## Self-Check: PASSED

All 4 modified/created files confirmed present on disk; all 4 commit hashes (28c16e8, b309cf5, f1c4fb0, 0416a5f) confirmed present in git log.
