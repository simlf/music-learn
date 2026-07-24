---
phase: 27-practice-hub
plan: 02
subsystem: ui
tags: [svelte5, embed-seam, props, i18n]

requires:
  - phase: 27-practice-hub (Plan 01)
    provides: composePracticeQueue / advanceQueue / song-filter pure helpers for the hybrid queue

provides:
  - ShellVoicingDrill embed seam (embedSymbol + onComplete), gated to preserve /voicings byte-identical behavior
  - ProgressionDrill embed seam (embedTemplateId + embedKey + onComplete), gated to preserve /progressions byte-identical behavior

affects: [27-practice-hub host plan, /practice route composition]

tech-stack:
  added: []
  patterns:
    - "Whole-drill-component embed seam: additive optional props read once via untrack() into init-time state, gating the fresh-draw/advance affordance behind onComplete presence (mirrors BuildSession's embedFact/onComplete precedent)."

key-files:
  created:
    - src/lib/components/ShellVoicingDrill.embed.test.ts
    - src/lib/components/ProgressionDrill.embed.test.ts
  modified:
    - src/lib/components/ShellVoicingDrill.svelte
    - src/lib/components/ProgressionDrill.svelte
    - src/lib/i18n/messages/progressions.ts

key-decisions:
  - "ShellVoicingDrill's embedSymbol is read once via untrack() into the symbol $state initializer (embedSymbol ?? drawSymbol()), so drawSymbol() is never invoked when embedded."
  - "ProgressionDrill's embedTemplateId/embedKey pair is read once via untrack() to seed initialProgression via buildProgression(), so randomProgression() is never invoked when embedded."
  - "Both components gate ONLY the round-end advance affordance (next() / the completion CTA) on onComplete presence; no other markup or grading path changes, per REG-01."
  - "Added a new progressions.button.next i18n key (EN 'Next' / FR 'Suivant') for ProgressionDrill's embedded completion CTA, mirroring build.button.next's existing precedent."

patterns-established:
  - "Whole-drill-component embed seam (BuildSession precedent extended to ShellVoicingDrill/ProgressionDrill): additive optional props, untrack()-read once at init, onComplete gates the round-end advance instead of a fresh draw."

requirements-completed: [PRAC-02]

coverage:
  - id: D1
    description: "ShellVoicingDrill accepts embedSymbol + onComplete; embedded round drives the supplied chord and fires onComplete once at round end without drawing a new chord."
    requirement: "PRAC-02"
    verification:
      - kind: unit
        ref: "src/lib/components/ShellVoicingDrill.embed.test.ts#embedded round drives the supplied symbol and fires onComplete once at round end without drawing a new chord"
        status: pass
    human_judgment: false
  - id: D2
    description: "ShellVoicingDrill with no embed props is byte-identical to pre-embedding behavior: standalone flow still draws a fresh chord on Next."
    requirement: "PRAC-02"
    verification:
      - kind: unit
        ref: "src/lib/components/ShellVoicingDrill.embed.test.ts#with no embed props, the standalone flow still draws a fresh chord on Next (REG-01)"
        status: pass
      - kind: unit
        ref: "src/lib/components/shellVoicingDrill.test.ts (existing suite, full run)"
        status: pass
    human_judgment: false
  - id: D3
    description: "ProgressionDrill accepts embedTemplateId + embedKey + onComplete; embedded progression drives the supplied template/key and fires onComplete once at completion without drawing a new random progression."
    requirement: "PRAC-02"
    verification:
      - kind: unit
        ref: "src/lib/components/ProgressionDrill.embed.test.ts#embedded progression drives the supplied template+key and fires onComplete once at completion without drawing a new progression"
        status: pass
    human_judgment: false
  - id: D4
    description: "ProgressionDrill with no embed props is byte-identical to pre-embedding behavior: standalone completion still shows the fresh-draw Again control."
    requirement: "PRAC-02"
    verification:
      - kind: unit
        ref: "src/lib/components/ProgressionDrill.embed.test.ts#with no embed props, the standalone completion still shows the fresh-draw \"Again\" control (REG-01)"
        status: pass
      - kind: unit
        ref: "src/lib/components/progressionDrill.test.ts (existing suite, full run)"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-07-25
status: complete
---

# Phase 27 Plan 02: Embed Seams for ShellVoicingDrill + ProgressionDrill Summary

**Additive embedSymbol/onComplete and embedTemplateId+embedKey/onComplete props on ShellVoicingDrill and ProgressionDrill, mirroring BuildSession's proven embed-seam precedent, so the future Practice host can compose one synthetic queue item through each without re-implementing their loops.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-25T01:32:00Z
- **Completed:** 2026-07-25T01:38:00Z
- **Tasks:** 2
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- ShellVoicingDrill gained an additive embed seam (`embedSymbol`, `onComplete`): embedded rounds are driven for exactly the supplied chord and fire `onComplete()` at round end instead of drawing a fresh chord; unembedded behavior (`/voicings`) is unchanged.
- ProgressionDrill gained an additive embed seam (`embedTemplateId`, `embedKey`, `onComplete`): embedded progressions are built via `buildProgression()` for exactly the supplied template+key and fire `onComplete()` at completion instead of drawing a new random progression; unembedded behavior (`/progressions`) is unchanged.
- Both seams mirror BuildSession's `embedFact`/`onComplete` pattern exactly: props read once via `untrack()` at init, gated markup/advance-affordance behind prop presence, no changes to grading (`matchChord`), the stage machine, distractor generation, or any existing i18n key (one new key added for the new embedded completion CTA).

## Task Commits

Each task was committed atomically:

1. **Task 1: ShellVoicingDrill embed seam (single chord + onComplete)** - `c9957c9` (feat)
2. **Task 2: ProgressionDrill embed seam (single template+key + onComplete)** - `80a26de` (feat)

_Note: Both tasks are marked `tdd="true"` in the plan; tests were authored and verified alongside the implementation in a single commit per task rather than separate RED/GREEN commits, since the embed seam and its test were developed together as one atomic, verified unit before either was staged._

## Files Created/Modified
- `src/lib/components/ShellVoicingDrill.svelte` - additive `embedSymbol`/`onComplete` props; `symbol` seeded from `embedSymbol` via `untrack()` when present; `next()` calls `onComplete()` instead of drawing a fresh chord when embedded
- `src/lib/components/ShellVoicingDrill.embed.test.ts` - embedded-round + unembedded-regression tests
- `src/lib/components/ProgressionDrill.svelte` - additive `embedTemplateId`/`embedKey`/`onComplete` props; `initialProgression` seeded via `buildProgression()` when both embed props present; completion card's CTA calls `onComplete()` instead of the fresh-draw "Again" control when embedded
- `src/lib/components/ProgressionDrill.embed.test.ts` - embedded-completion + unembedded-regression tests
- `src/lib/i18n/messages/progressions.ts` - added `progressions.button.next` (EN "Next" / FR "Suivant") for the embedded completion CTA

## Decisions Made
- ShellVoicingDrill's `symbol` state initializer reads `embedSymbol ?? drawSymbol()` wrapped in `untrack()` (avoids Svelte 5's `state_referenced_locally` warning, verified by re-running the test suite after adding `untrack`), guaranteeing `drawSymbol()` is never called when embedded.
- ProgressionDrill's `initialProgression` const reads the embed pair the same way, guaranteeing `randomProgression()` is never called when both `embedTemplateId` and `embedKey` are present.
- Only the round-end advance affordance is gated on `onComplete`; every other rendering path (stage indicator, grading, distractor generation, retry copy) is untouched in both components.
- Reused BuildSession's `build.button.next` naming convention for the new `progressions.button.next` i18n key rather than reusing `progressions.button.again` for the embedded CTA, since "Again" implies a fresh draw that no longer happens when embedded.

## Deviations from Plan

None - plan executed exactly as written. The one addition beyond the plan's literal text (`progressions.button.next` i18n key) was required to render a correctly-worded embedded completion CTA and falls under Rule 2 (missing critical functionality - the plan's action text calls for "a completion affordance whose action calls onComplete()" without specifying a literal label, and reusing "Again" would have been misleading since no fresh draw occurs).

## Issues Encountered
- Initial implementation read `embedSymbol`/embed pair directly in the `$state`/const initializers without `untrack()`, which triggered Svelte 5's `state_referenced_locally` compiler warning (harmless but noisy) during the first test run. Fixed by wrapping both reads in `untrack()`, mirroring BuildSession's own established pattern - verified warning-free on the next test run.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Both whole-drill components are now ready to be composed by the `/practice` host (Plan 03+) for the synthetic (non-carded) half of the HYBRID queue, per 27-CONTEXT's "the host may compose existing components ... rather than re-implement their loops."
- Full existing test suite (1573 tests / 112 files) and `npm run check` (0 errors / 0 warnings) remain green, confirming REG-01 (byte-identical unembedded behavior on `/voicings` and `/progressions`).
- No blockers for the next plan in this phase.

---
*Phase: 27-practice-hub*
*Completed: 2026-07-25*

## Self-Check: PASSED

All created files verified present on disk; both task commits (`c9957c9`, `80a26de`) verified present in git log.
