---
phase: 27-practice-hub
plan: 04
subsystem: ui
tags: [svelte, practice-hub, fsrs, hybrid-queue, i18n, chord-drill, interval-drill, build-session]

# Dependency graph
requires:
  - phase: 27-practice-hub
    provides: "practiceQueue.ts composer (27-01), PracticeChordDrill/PracticeIntervalDrill (27-03), BuildSession's embedFact/onComplete seam (Phase 13/25)"
provides:
  - "src/routes/practice/+page.svelte: the thin /practice host - load()/compose (FSRS skeleton mirrored from RecallSession), pre-start landing with a single 'Start practice' CTA + due-count register (PRAC-01), the three empty tiers + error state, in-session routing of the three carded families with an always-populated family-cue chip, FSRS grade commit via deck.recordGrade for name-it/interval (PRAC-03/REG-01), and the reused drills-style score register + session-end-card"
  - "practice.ts i18n domain (EN+FR), registered in messages/index.ts"
affects: [27-05 (adds synthetic voicing/progression items into this host's composePracticeQueue seam), 30-nav-cutover, 31-no-regression-gate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Host-level cardEpoch counter (mirrors RecallSession's cardEpoch): the in-session {#key} block keys on `${currentItem.id}|${cardEpoch}`, not the item id alone, so an Again-graded item re-enqueued as the SOLE queue item (same id, same object) still force-remounts a fresh drill component instead of leaving a stale already-answered instance on screen"
    - "BuildSession's embedFact/onComplete seam commits its own FSRS grade internally (recordConstructionOutcome's getCard/recordGrade using the same (factId, 'formula-build') identity) - the host's completeBuild handler only advances the local queue and records telemetry, never calling recordGrade a second time"

key-files:
  created:
    - src/routes/practice/+page.svelte
    - src/lib/i18n/messages/practice.ts
    - tests/practice-hub.e2e.test.ts
  modified:
    - src/lib/i18n/messages/index.ts
    - src/lib/i18n/messages.test.ts

key-decisions:
  - "completeBuild (build-it family) does NOT call deck.recordGrade a second time - BuildSession's own onComplete(rating) contract already committed the FSRS grade internally via recordConstructionOutcome using the identical (factId, 'formula-build') card identity, mirroring RecallSession's handleModeCNext precedent exactly. A second host-side recordGrade call would double-apply the FSRS scheduler transition for one review (Rule 1 bug), caught before writing the test rather than by a failing assertion."
  - "Added a cardEpoch counter to the {#key} block (Rule 1 bug, caught by the wrong-answer re-enqueue test): without it, an Again-graded item re-enqueued as the sole queue item keeps the same id, so Svelte's {#key} never remounts and the drill component stays frozen in its already-answered state, silently re-submitting the stale prior answer on every subsequent Next tap."
  - "Empty-state extension beyond the plan's literal branches: if the composed queue is empty because every due card belonged to an excluded family (scale-degree/scale-formula, out of this phase's scope per 27-01's familyForCard), the host falls back to 'empty-none-due' rather than rendering nothing - a defensive completion of RecallSession's mirrored MD-02 branch, not exercised by the plan's own test scenarios but necessary for a due-but-unqueueable deck state."
  - "practice.error.body's FR translation coins 'la file de pratique' (no prior French term existed for this vocabulary swap) since 27-UI-SPEC's copy swaps recall's 'ledger' wording for 'queue', which has no precedent translation elsewhere in the i18n catalog."
  - "CUE_LABELS built via $derived.by (not a plain module-scope const) so a live locale flip re-renders the family-cue chip, matching RecallSession's MODE_LABELS reactive-locale convention rather than baking the label in at component-init time."

patterns-established:
  - "A queue-item union with a discriminant field ('family') is narrowed per-branch in both <script> logic (missedLabelFor's if-chain) and template {#if} blocks exactly like RecallSession narrows its Fact union on factKind - confirmed both narrowing shapes typecheck cleanly under svelte-check for this codebase's Svelte 5 + TS setup."

requirements-completed: [PRAC-01, PRAC-02, PRAC-03, PRAC-04]

coverage:
  - id: D1
    description: "/practice's pre-start landing renders exactly one primary 'Start practice' CTA plus the due-count register (singular/plural) - never a mode-picker grid (PRAC-01 hard gate)"
    requirement: "PRAC-01"
    verification:
      - kind: e2e
        ref: "tests/practice-hub.e2e.test.ts#pre-start landing (PRAC-01) > shows the due-count register and exactly one primary CTA, never a mode-picker grid"
        status: pass
      - kind: e2e
        ref: "tests/practice-hub.e2e.test.ts#pre-start landing (PRAC-01) > tapping Start moves the page into the reviewing state"
        status: pass
    human_judgment: false
  - id: D2
    description: "The three empty tiers (no deck / nothing due / song-filter hides all due) render the 27-UI-SPEC copy, including the filtered tier's hidden-count body"
    requirement: "PRAC-01"
    verification:
      - kind: e2e
        ref: "tests/practice-hub.e2e.test.ts#empty tiers > empty deck: no cards anywhere shows the no-deck copy"
        status: pass
      - kind: e2e
        ref: "tests/practice-hub.e2e.test.ts#empty tiers > nothing due: cards exist but none are due shows the none-due copy"
        status: pass
      - kind: e2e
        ref: "tests/practice-hub.e2e.test.ts#empty tiers > song filter hides all due cards: shows the filtered copy with the hidden count"
        status: pass
    human_judgment: false
  - id: D3
    description: "load() mirrors RecallSession's FSRS skeleton (getDueCards -> intro budget -> applySongFilter -> selectReviewCards -> interleaveQueue -> cardsToQueueItems -> composePracticeQueue) and the song filter (PRAC-04) restricts the FSRS half exactly like RecallSession's applySongFilter"
    requirement: "PRAC-04"
    verification:
      - kind: e2e
        ref: "tests/practice-hub.e2e.test.ts#empty tiers > song filter hides all due cards: shows the filtered copy with the hidden count"
        status: pass
    human_judgment: false
  - id: D4
    description: "In-session routing sends each carded family to its own component (PracticeChordDrill/PracticeIntervalDrill/BuildSession) with an always-populated, correctly-labeled family-cue chip"
    requirement: "PRAC-02"
    verification:
      - kind: e2e
        ref: "tests/practice-hub.e2e.test.ts#mixed carded families: routing, family cue, and session drain > routes name-it/interval/build-it to their own component with a correctly-labeled family cue, and drains to the reused end-card"
        status: pass
    human_judgment: false
  - id: D5
    description: "Completing a carded (name-it/interval) item commits an FSRS grade via deck.recordGrade with the item's own CardRecord and the Rating mapped from correct/incorrect (T-27-04-01); a wrong answer re-enqueues the item (D-10) rather than silently no-op'ing or completing early"
    requirement: "PRAC-03"
    verification:
      - kind: e2e
        ref: "tests/practice-hub.e2e.test.ts#carded grade commit (PRAC-03/REG-01/T-27-04-01) > a correct name-it answer commits Rating.Good via deck.recordGrade for the item's own card"
        status: pass
      - kind: e2e
        ref: "tests/practice-hub.e2e.test.ts#carded grade commit (PRAC-03/REG-01/T-27-04-01) > a wrong name-it answer commits Rating.Again and re-enqueues the item (D-10); a later correct answer completes the round with the miss listed"
        status: pass
      - kind: e2e
        ref: "tests/practice-hub.e2e.test.ts#carded grade commit (PRAC-03/REG-01/T-27-04-01) > an interval item commits its own card and rating"
        status: pass
    human_judgment: false
  - id: D6
    description: "The build-it family's grade is committed exactly once (by BuildSession's own internal recordConstructionOutcome), never double-committed by the host, and finishing the round shows the reused session-end-card with drills.end.roundComplete copy"
    requirement: "PRAC-03"
    verification:
      - kind: e2e
        ref: "tests/practice-hub.e2e.test.ts#mixed carded families: routing, family cue, and session drain > routes name-it/interval/build-it to their own component with a correctly-labeled family cue, and drains to the reused end-card"
        status: pass
    human_judgment: false

# Metrics
duration: 25min
completed: 2026-07-25
status: complete
---

# Phase 27 Plan 04: Practice Hub Host Summary

**The thin `/practice` host: FSRS-mirrored load/compose, a single "Start practice" gate with no mode-picker grid, the three empty tiers, and one interleaved carded session (name-it/build-it/interval) with an always-populated family cue and FSRS grade commit.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-07-25T01:56Z (after 27-PATTERNS.md)
- **Completed:** 2026-07-25T00:19:00Z
- **Tasks:** 2
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments
- `src/routes/practice/+page.svelte`: a genuinely thin host (no re-entangled drills monolith) that owns only load/compose, page-state, family cue, grade-commit, and advance - every question surface is delegated to `PracticeChordDrill`/`PracticeIntervalDrill`/`BuildSession` (27-01/27-03/Phase 13).
- `load()` reproduces `RecallSession.svelte`'s exact FSRS skeleton (due-backlog gate, intro budget, song-filter restriction, `selectReviewCards`/`interleaveQueue`, then `practiceQueue.ts`'s `cardsToQueueItems`/`composePracticeQueue`), landing on `pre-start` (never auto-reviewing) so the user must tap the single "Start practice" CTA (PRAC-01).
- The three empty tiers (no-deck/none-due/filtered) and the error state render the 27-UI-SPEC copy exactly, reusing `recall.state.loading`/`recall.empty.none-due.*`/`recall.cta.try-again` verbatim where the copy is identical rather than duplicating keys.
- In-session, the family-cue chip (the existing `question-source-tag` slot/style) is always populated with the current item's family label and routes name-it/build-it/interval to their own component inside a `{#key}` block that force-remounts on every advance (including an Again re-enqueue of the sole remaining item - a real bug caught by the wrong-answer test and fixed with a `cardEpoch` counter mirroring RecallSession's own precedent).
- Grading commits an FSRS grade via `deck.recordGrade` for name-it/interval items using the item's own `CardRecord`; the build-it family's grade is committed exactly once, by `BuildSession`'s own internal `recordConstructionOutcome`, never double-committed by the host.
- The reused drills score register (`{asked} OF {length} · {correct} RIGHT · {streak} STREAK`) and `session-end-card` (`ROUND COMPLETE`, best-run, missed-item chips, "Run it again") close the round.
- `practice.ts` adds the new i18n domain (page title, CTA, due-register, empty/error copy, five family-cue labels, EN+FR) and is registered in `messages/index.ts`; `messages.test.ts`'s domain-collision gate was updated to include it so the full i18n suite stays green.

## Task Commits

1. **Task 1: practice i18n domain + host scaffolding** - `7281102` (feat)
2. **Task 2: in-session routing + family cue + grade commit + end-card** - `5375669` (feat)

**Plan metadata:** (this commit)

_Note: both tasks touch the same two files (`+page.svelte`, `tests/practice-hub.e2e.test.ts`) with tightly-coupled logic (the family-cue map and the `cardEpoch` advance mechanism span both tasks' concerns), so the two commits are split along i18n-domain vs. full-host-implementation lines rather than an artificial mid-file task boundary - see Deviations._

## Files Created/Modified
- `src/routes/practice/+page.svelte` - the thin `/practice` host (load/compose, page-state machine, in-session routing, grading, end-card)
- `src/lib/i18n/messages/practice.ts` - new i18n domain: page title, CTA, due-register, empty/error copy, family-cue labels
- `src/lib/i18n/messages/index.ts` - registers the `practice` domain in the merged EN/FR dictionary
- `src/lib/i18n/messages.test.ts` - domain-collision/key-parity gate updated to include `practice` (Rule 1 fix, full-suite green requirement)
- `tests/practice-hub.e2e.test.ts` - pre-start/empty-tiers/routing/family-cue/grade-commit/session-drain coverage

## Decisions Made
- `completeBuild` never calls `deck.recordGrade` a second time for the build-it family - `BuildSession`'s own `onComplete(rating)` contract already committed that grade internally via its unchanged `recordConstructionOutcome`, using the exact same `(factId, 'formula-build')` card identity as the queue item. This mirrors `RecallSession.handleModeCNext`'s documented precedent; a second host-side call would double-apply the FSRS scheduler transition for one review.
- Added a `cardEpoch` counter (bumped on every advance) to the in-session `{#key}` block's key expression, so an Again-graded item re-enqueued as the sole remaining queue item (same `id`, same object reference) still force-remounts a fresh drill component instead of leaving a stale, already-answered instance frozen on screen.
- The composed-queue-empty-but-due-nonempty edge case (every due card belonged to an excluded family, e.g. scale practice) falls back to `empty-none-due` rather than rendering nothing - a defensive completion of RecallSession's mirrored MD-02 branch structure.
- `practice.error.body`'s FR translation coins "la file de pratique" since no prior French term exists for the "queue" vocabulary the 27-UI-SPEC specifies (recall's own FR error copy uses "registre"/"ledger" instead).
- `CUE_LABELS` is a `$derived.by` (not a plain const) so a live EN/FR locale flip re-renders the family-cue chip, matching `RecallSession`'s `MODE_LABELS` convention.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stale drill component on an Again-graded sole-item re-enqueue**
- **Found during:** Task 2, writing the wrong-answer test (`carded grade commit > a wrong name-it answer...`)
- **Issue:** `advanceHybridQueue`'s D-10 contract re-enqueues an Again-graded carded item to the back of the queue; when it is the only item, the re-enqueued item has the identical `id`, so the `{#key currentItem.id}` block never remounted. The already-answered `PracticeChordDrill` instance stayed frozen, silently re-submitting its stale prior (wrong) answer on every subsequent Next tap instead of presenting a fresh question.
- **Fix:** Added a `cardEpoch` counter, bumped on every advance (`completeCarded`/`completeBuild`) and reset on a fresh `load()`; the `{#key}` expression became `` `${currentItem.id}|${cardEpoch}` ``, mirroring `RecallSession.svelte`'s own documented `cardEpoch` fix for the identical Mode C re-enqueue hazard.
- **Files modified:** `src/routes/practice/+page.svelte`
- **Verification:** `tests/practice-hub.e2e.test.ts`'s wrong-answer test now asserts the item re-enqueues correctly and a subsequent correct answer completes the round.
- **Committed in:** `5375669` (Task 2 commit)

**2. [Rule 1 - Bug] Double FSRS-grade commit for the build-it family**
- **Found during:** Task 2, before writing `completeBuild` (caught by reading `BuildSession.svelte`'s `recordConstructionOutcome` and `RecallSession.svelte`'s `handleModeCNext` precedent, not by a failing test)
- **Issue:** The plan's literal Task 2 action text calls for `completeBuild(rating)` to call `recordGrade(currentItem.card, rating)`. `BuildSession`'s embedded construction already commits that exact same grade internally (via its own `getCard`/`recordGrade` call using the identical `(factId, 'formula-build')` identity) when `onComplete` fires. Calling `recordGrade` a second time with the host's (now-stale) pre-update `CardRecord` would double-apply the FSRS scheduler's state transition for a single review, corrupting the card's schedule.
- **Fix:** `completeBuild` only advances the local queue and records telemetry; it never calls `deck.recordGrade`, mirroring `RecallSession.handleModeCNext`'s own documented behavior for the identical embedding seam.
- **Files modified:** `src/routes/practice/+page.svelte`
- **Verification:** `tests/practice-hub.e2e.test.ts`'s mixed-family test asserts `recordGrade` is called exactly 3 times total (once each for the name-it/interval items from the host, once for the build-it item from `BuildSession`'s own internal call), never 4.
- **Committed in:** `5375669` (Task 2 commit)

**3. [Rule 3 - Blocking] Full-suite regression: i18n domain-collision test missing the new domain**
- **Found during:** Full-suite verification after Task 1/2
- **Issue:** `src/lib/i18n/messages.test.ts`'s `domains` array is a static, hand-maintained list used to assert the merged catalog's key count equals the sum of every domain's key count (I18N-02's collision guard). Adding `practice.ts` without updating this list failed the test (518 merged keys vs. 503 expected from the stale list).
- **Fix:** Imported `practice` and added `['practice', practice.en]` to the `domains` array.
- **Files modified:** `src/lib/i18n/messages.test.ts`
- **Verification:** `npm test -- --run src/lib/i18n/messages.test.ts` passes; full suite (115 files / 1592 tests) green.
- **Committed in:** `7281102` (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (2 correctness bugs caught before/via test-writing, 1 blocking full-suite regression in an out-of-plan-scope file)
**Impact on plan:** All three fixes were necessary for correctness (FSRS schedule integrity, a genuinely stuck UI state) or to keep the full test suite green per the plan's own `<verification>` requirement. No scope creep beyond what correctness/the plan's stated gates required.

## Issues Encountered
None beyond the two auto-fixed bugs above (both caught and resolved before the plan's final `npm test`/`npm run check` verification, not left as known issues).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 05 has a clearly-marked seam to fill: `const syntheticItems: HybridQueueItem[] = [];` inside `load()`, and a template comment marking where the `voicing`/`progression` branches join the `{#if currentItem.family === ...}` chain in the in-session block.
- `/drills`, `/voicings`, `/progressions`, `/recall` routes are unchanged (verified: no edits to those files this plan).
- `npm run check` is clean (0 errors/warnings, 1379 files); the full suite (115 files / 1592 tests) is green.

---
*Phase: 27-practice-hub*
*Completed: 2026-07-25*

## Self-Check: PASSED

- FOUND: src/routes/practice/+page.svelte
- FOUND: src/lib/i18n/messages/practice.ts
- FOUND: tests/practice-hub.e2e.test.ts
- FOUND: src/lib/i18n/messages/index.ts
- FOUND: src/lib/i18n/messages.test.ts
- FOUND commit: 7281102
- FOUND commit: 5375669
