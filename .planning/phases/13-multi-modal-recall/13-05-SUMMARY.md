---
phase: 13-multi-modal-recall
plan: 05
subsystem: ui
tags: [svelte5, build-session, recall-session, fsrs, embedding-seam]

requires:
  - phase: 12-build-it-construction
    provides: "BuildSession.svelte's fully-working, fully-tested construction step loop (picker, gradeConstructionTap wiring, formula strip, recordConstructionOutcome FSRS write) - reused verbatim, never duplicated"
  - phase: 13-multi-modal-recall
    provides: "RecallSession.svelte's universal mode-signal chip, resetPerCardState() seam, and the see-play/hear-name sibling-branch pattern (13-03/13-04)"
provides:
  - "BuildSession.svelte's embedFact/onComplete optional-props seam: skips the kind-toggle/picker and starts construction immediately for a given chord symbol or scale tonic; swaps the completion CTAs for a single 'Next' and suppresses the 'SAVED TO RECALL' status line when embedded"
  - "RecallSession.svelte's 'formula-build' render branch: embedTargetFor() parses chord-formula:/scale-formula: factId prefixes independent of factById()/allFacts(), mounting a keyed BuildSession instance per queue item; handleModeCNext() advances the queue on completion"
affects: [13-06]

tech-stack:
  added: []
  patterns:
    - "An optional-props embedding seam (embedFact/onComplete) gates both picker markup AND completion CTA/status-line markup behind prop presence, keeping the un-embedded render path byte-identical when both props are omitted - the same 'gated-prop compatibility contract' this codebase already establishes for RecallSession's own onViewMap prop (11-06)"
    - "untrack() from 'svelte' wraps a deliberate init-time-only read of a reactive prop at the top level of a component's <script> block, when the intent is genuinely 'snapshot once at mount' rather than 'stay reactive' - avoids Svelte 5's state_referenced_locally compiler warning without changing runtime behavior"
    - "A factId string's own prefix shape (e.g. 'scale-formula:{tonic}') can be parsed by an inverse-parse helper living OUTSIDE the shared fact catalog (facts.ts), letting a consumer render a fact kind the catalog deliberately never generalizes into - the parse helper and the catalog's own prohibition against generalizing stay decoupled"

key-files:
  created: []
  modified:
    - src/lib/components/BuildSession.svelte
    - src/lib/components/buildSession.test.ts
    - src/lib/components/RecallSession.svelte
    - src/lib/components/recallSession.test.ts

key-decisions:
  - "The embedFact-gated construction-start logic reads embedFact via svelte's untrack() wrapper rather than a bare top-level reference, because Svelte 5's compiler emits a state_referenced_locally warning on any bare read of a $props()-destructured value outside a reactive context (derived/effect) - even though a component's top-level <script> body is itself a genuinely one-time initialization context. untrack() makes the 'read once at init, never react to later changes' intent explicit and produces a clean 0-warning npm run check, matching this plan's own acceptance criterion."
  - "RecallSession's top-level reviewing guard was loosened from `pageState === 'reviewing' && currentFact && currentItem` to `pageState === 'reviewing' && currentItem` (dropping the currentFact requirement) exactly as the plan specified - a scale-formula factId (e.g. 'scale-formula:G') never resolves via factById() since facts.ts deliberately excludes scale-formula from its Fact union/CATALOG, so gating the outer guard on currentFact would have made a scale-formula formula-build card silently fail to render at all."
  - "embedTargetFor() lives inside RecallSession.svelte, not facts.ts, and is a plain prefix-strip with no Zod validation - deliberately mirroring facts.ts's own explicit prohibition against adding scale-formula to the shared catalog (established in 12-01, reaffirmed by this plan's own prohibitions list)."

patterns-established: []

requirements-completed: [RECALL-01]

coverage:
  - id: D1
    description: "BuildSession accepts an embedFact prop ({ kind: 'chord', symbol } or { kind: 'scale', tonic }) that skips the kind-toggle/picker entirely and starts construction immediately for that exact target, reusing startChordConstruction/startScaleConstruction verbatim (root/quality parsed from the chord symbol via the same longest-match ROOTS-prefix technique pickDistractors uses)"
    requirement: "RECALL-01"
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#BuildSession embedding seam (13-05, Task 1)"
        status: pass
    human_judgment: false
  - id: D2
    description: "BuildSession's completion summary is identical to standalone /build's own except: the 'SAVED TO RECALL - FORMULA-BUILD MODE' status line is suppressed when onComplete is provided, and the two exit buttons are replaced by a single primary 'Next' calling onComplete"
    requirement: "RECALL-01"
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#completing an embedded chord build with onComplete provided shows a single Next button and NO SAVED TO RECALL text, and clicking Next calls onComplete exactly once"
        status: pass
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#completing an embedded scale build with onComplete provided shows a single Next button and NO SAVED TO RECALL text"
        status: pass
    human_judgment: false
  - id: D3
    description: "Omitting both embedFact/onComplete leaves BuildSession's render byte-identical to its pre-embedding behavior (picker renders, kind-toggle visible, both CTAs present) - proven by every pre-existing buildSession.test.ts case continuing to pass unmodified"
    requirement: "RECALL-01"
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#omitting both embedFact/onComplete still renders the picker (byte-identical pre-embedding behavior)"
        status: pass
      - kind: other
        ref: "npx vitest run src/lib/components/buildSession.test.ts (42/42 tests pass, including every pre-existing Phase 12 case)"
        status: pass
    human_judgment: false
  - id: D4
    description: "RecallSession's formula-build queue items mount a keyed BuildSession instance for the exact fact via embedTargetFor's inverse factId parse - covering both a chord-formula factId and a SCALE-formula factId (Phase 12's accepted scope gap, never resolvable via factById()) - with no kind-toggle/picker visible"
    requirement: "RECALL-01"
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#a formula-build queue item for a chord-formula factId mounts BuildSession directly into its building state, with no kind-toggle/picker visible"
        status: pass
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#a formula-build queue item for a SCALE-formula factId also mounts BuildSession correctly (embedTargetFor scale branch, independent of factById)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Completing the embedded build and tapping Next advances RecallSession's own queue (handleModeCNext), including completing the whole session when it was the last queue item"
    requirement: "RECALL-01"
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#completing the embedded build and tapping Next advances RecallSession's own queue to the next item"
        status: pass
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#completing the LAST queue item via Mode C's Next completes the session (recall-complete)"
        status: pass
    human_judgment: false
  - id: D6
    description: "No scale-formula addition to facts.ts's Fact union/allFacts()/CATALOG/factById(); no change to recordConstructionOutcome/ratingForWrongTaps; no em dash anywhere in the new markup/copy; full existing suite has zero regressions"
    requirement: "RECALL-01"
    verification:
      - kind: other
        ref: "git diff --stat src/lib/srs/facts.ts shows no changes; grep -c em-dash on both modified .svelte files returns 0; npm run check: 0 errors, 0 warnings; npx vitest run (full suite): 933/933 tests pass, 0 regressions"
        status: pass
    human_judgment: false
  - id: D7
    description: "Live human verification of Mode C on a real /recall session: the FORMULA -> BUILD chip, the embedded construction loop running exactly like standalone /build with no kind-toggle/picker visible, and the completion summary showing no SAVED TO RECALL line with a single Next that advances to the next recall card (or completes the session)"
    verification: []
    human_judgment: true
    rationale: "Requires visually confirming the embedded construction loop feels identical to standalone /build in a live browser (register pacing, formula-strip fill, keyboard interaction) and that the completion beat's CTA swap reads correctly - not fully assertable from jsdom component-test assertions alone."

duration: 9min
completed: 2026-07-15
status: complete
---

# Phase 13 Plan 05: Mode C Formula-Build Embedded Recall Surface Summary

**Embeds Phase 12's BuildSession directly into Recall's queue as the third rotation mode (formula -> build): a small optional-props seam on BuildSession (embedFact/onComplete) skips its picker and swaps its completion CTAs, while RecallSession gains a factId-parsing seam that lets even a scale-formula card (an accepted Phase 12 scope gap) render correctly without touching facts.ts's shared catalog.**

## Performance

- **Duration:** 9 min (git commit timestamps, 13-04 completion to 13-05 completion)
- **Started:** 2026-07-15T17:24:25Z
- **Completed:** 2026-07-15T17:33:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `BuildSession.svelte` gained an optional `Props` interface (`embedFact?: { kind: 'chord'; symbol: string } | { kind: 'scale'; tonic: string }`, `onComplete?: () => void`). When `embedFact` is set, an `untrack()`-wrapped init-time block (placed after every function declaration, so hoisting is never a concern) parses a chord's ASCII symbol into `pickedRoot`/`pickedQuality` via the same longest-match `ROOTS`-prefix technique `pickDistractors` uses, or assigns `pickedTonic` directly for a scale, then calls `startChordConstruction()`/`startScaleConstruction()` completely unmodified.
- The kind-toggle markup is now wrapped in `{#if !embedFact}...{/if}`; the picker screen is therefore never reachable when embedded (construction starts synchronously at init, before the picker would ever render).
- The completion state's status line changed from `{#if fsrsSaved}` to `{#if fsrsSaved && !onComplete}`; the CTA row now branches on `onComplete` presence, rendering a single primary "Next" button (`onclick={onComplete}`) in place of "Build Another"/"Recall It Now" when embedded.
- `recordConstructionOutcome` (the FSRS write) is completely untouched - it fires exactly as before, independent of `embedFact`/`onComplete`.
- `RecallSession.svelte` imports `BuildSession` and adds `embedTargetFor(factId)`: a plain prefix-strip parse (`'chord-formula:'`/`'scale-formula:'`) that lives outside `factById()`/`allFacts()` entirely, so a scale-formula factId (which `facts.ts` deliberately never adds to its shared catalog, per the 12-01 prohibition this plan explicitly does not touch) still resolves to a renderable embed target.
- The top-level `reviewing` guard loosened from `currentFact && currentItem` to just `currentItem` (a scale-formula factId never resolves via `factById()`, so requiring `currentFact` would have silently broken that fact kind's `formula-build` card). The "N LEFT TODAY" register and mode-signal chip render unconditionally from `currentItem` alone for every mode, matching the plan's contract.
- A new `{#if currentItem.mode === 'formula-build'}...{:else if currentFact}...{/if}` split lets Mode C mount `{#key `${currentItem.factId}|${currentItem.mode}`}<BuildSession embedFact={embedTarget} onComplete={handleModeCNext} />{/key}` (a fresh instance per distinct queue item), while every other mode (`formula`/`see-play`/`hear-name`) keeps its existing `currentFact`-gated dispatch chain byte-unchanged.
- `handleModeCNext()` calls `advanceQueue(queue, Rating.Good)`, `resetPerCardState()`, increments `reviewedCount`, and completes the session if the queue empties - the identical advance shape Mode A/B's own Next handlers already use.

## Task Commits

Each task was committed atomically:

1. **Task 1: BuildSession's embedFact/onComplete embedding seam** - `e18c4a7` (feat)
2. **Task 2: RecallSession's formula-build branch - mount the embedded BuildSession per queue item** - `3ae3026` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/lib/components/BuildSession.svelte` - `Props` interface, `embedFact`/`onComplete` destructured props, `untrack()`-wrapped init-time construction-start block, kind-toggle gated behind `!embedFact`, completion status-line/CTA-row gated behind `onComplete` presence.
- `src/lib/components/buildSession.test.ts` - new `describe('BuildSession embedding seam (13-05, Task 1)')` block: chord/scale `embedFact` renders directly into `building` with no picker, completion with `onComplete` shows a single "Next" (no "SAVED TO RECALL") that fires `onComplete` exactly once (chord and scale paths), and omitting both props still renders the picker unchanged.
- `src/lib/components/RecallSession.svelte` - imports `BuildSession`; adds `embedTargetFor`/`handleModeCNext`; loosens the top-level reviewing guard to `currentItem`; adds the `formula-build` render branch ahead of the existing `currentFact`-gated `formula`/`see-play`/`hear-name` chain.
- `src/lib/components/recallSession.test.ts` - adds `getCard` to the existing `$lib/srs/deck` mock factory (BuildSession's own internal call when embedded); new `describe('RecallSession Mode C (formula-build...)')` block covering a chord-formula factId mount, a scale-formula factId mount, Next advancing to the next queue item, and Next completing the session on the last item.

## Decisions Made
- The `embedFact`-gated construction-start block reads `embedFact` via `untrack()` (imported from `'svelte'`) rather than a bare top-level reference. Svelte 5's compiler emits a `state_referenced_locally` warning on any bare read of a `$props()`-destructured value outside a reactive context, even at a component's top-level `<script>` body (which is genuinely a one-time initialization context for the embedding seam's intended "snapshot once at mount" behavior - `embedFact` never changes across an embedded instance's lifetime since RecallSession mounts a fresh keyed instance per queue item). `untrack()` makes this intent explicit to the compiler and produces a clean `npm run check` (0 errors, 0 warnings), matching this plan's own acceptance criterion.
- RecallSession's top-level guard was loosened to `currentItem` alone (dropping `currentFact`) exactly as the plan specified, since `factById()` never resolves a scale-formula factId by design (facts.ts's 12-01 prohibition) - keeping the guard on `currentFact` would have silently prevented a scale-formula `formula-build` card from rendering at all, contradicting this plan's own must-have truth about that card kind.
- `embedTargetFor()` was implemented as a plain, unvalidated prefix-strip inside `RecallSession.svelte` (not inside `facts.ts`), mirroring the codebase's already-accepted low-severity threat disposition (T-13-08 in the plan's own threat register): the parse only ever runs on factIds already read through `deck.ts`'s Zod-validated `getAllCards()`/`getDueCards()` boundary, an identical risk profile to every other `factId` consumer in this codebase.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wrapped the embedFact init-time read in `untrack()` instead of a bare top-level reference**
- **Found during:** Task 1 (writing the embedding seam per the plan's literal `<action>` text)
- **Issue:** The plan's action block specified a bare `if (embedFact) { ... }` block at the script's top level. Running `npm run check` after implementing it verbatim surfaced 4 `state_referenced_locally` compiler warnings (Svelte 5 assumes any bare read of a destructured `$props()` value outside a reactive context may have intended reactivity, even when the read genuinely only needs to happen once at init).
- **Fix:** Imported `untrack` from `'svelte'` and wrapped the entire init-time block in `untrack(() => { ... })`, making the "read once, never react to later changes" intent explicit to the compiler without altering any runtime behavior.
- **Files modified:** src/lib/components/BuildSession.svelte
- **Verification:** `npm run check` now reports 0 errors, 0 warnings (previously 0 errors, 4 warnings); `npx vitest run src/lib/components/buildSession.test.ts` still passes 42/42.
- **Committed in:** `e18c4a7` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug, a compiler-warning-producing pattern that the plan's literal action text would otherwise have shipped)
**Impact on plan:** No scope creep - the embedding seam's props, gating conditions, and construction-start logic are otherwise implemented exactly as specified. The fix only changes HOW `embedFact` is read (via `untrack()`), never WHAT is read or WHEN it runs.

## Issues Encountered
None beyond the one auto-fixed deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `RecallSession.svelte` now has all four of `formula`/`see-play`/`hear-name`/`formula-build` render branches wired, closing RECALL-01's full mode set. Every mode shares the same "N LEFT TODAY" register and mode-signal chip, rendered unconditionally from `currentItem` alone.
- `BuildSession.svelte`'s embedding seam (`embedFact`/`onComplete`) is a general-purpose pattern any future surface needing a standalone-vs-embedded BuildSession split can reuse verbatim.
- 13-06 (if it exists in this phase's remaining scope) inherits a fully wired 3-mode recall rotation (A/B/C) plus the pre-existing `formula` reveal mode; no blockers.

---
*Phase: 13-multi-modal-recall*
*Completed: 2026-07-15*
