---
phase: 260722-0ex-recall-pedagogy-fixes
verified: 2026-07-22T01:15:00Z
status: passed
score: 6/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Quick Task 260722-0ex: Recall Pedagogy Fixes Verification Report

**Task Goal:** Recall pedagogy fixes bundle: (1) daily new-card intro budget + due-backlog gate for recall deck; (2) hear-name wrong answers stop the 650ms auto-advance and wait for Continue while correct answers keep auto-advance; (3) interleaved recall review queue (no consecutive same factId, no 3 consecutive same root, New teach clusters adjacent, injectable rng); (4) BuildSession Again band scaled by steps length + actual rating threaded through RecallSession mode C so Again re-enqueues; (5) fire-and-forget recordPracticeAnswer telemetry in RecallSession mode A check, hear-name choice, and grade paths.

**Verified:** 2026-07-22
**Status:** passed
**Branch/commits:** `improve/recall-pedagogy` — dc50b8d (SRS core), e5ba3c2 (BuildSession), a37e11c (RecallSession)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Opening /recall repeatedly in one local calendar day introduces at most the daily cap of new facts total (budget persists across mounts via localStorage) | VERIFIED | `src/lib/srs/introBudget.ts:16-92` — `MAX_NEW_CARDS_PER_DAY = 10`, `remainingIntroBudget`/`consumeIntroBudget` are date-keyed (`localDateStringForBudget`), defensive-parsed (`isBudgetRecord`), never negative (`Math.max(0, ...)`), rollover resets to 0 on a new local date. Wired into `RecallSession.svelte:295-305` (`load()` calls `remainingIntroBudget`, then `introduceNewCards(remaining)`, then `consumeIntroBudget(introduced, ...)`). `introBudget.test.ts` (15 tests, all pass) covers cap arithmetic, rollover, corrupt-storage reset, write-failure no-op. |
| 2 | When more than 20 cards are already due, opening /recall introduces zero new facts (backlog gate) | VERIFIED | `RecallSession.svelte:290,295-299` — `const DUE_BACKLOG_GATE = 20;` ... `const preDue = await getDueCards(); if (preDue.length > DUE_BACKLOG_GATE) { dueBase = preDue; }` (skips the entire introduction branch). `recallSession.test.ts` "daily intro budget + backlog gate" describe block (6 tests, all pass) includes an explicit ">20 pre-due -> introduceNewCards never called" case. |
| 3 | The recall review queue never places two consecutive cards of the same fact except inside a State.New teach cluster, and never 3 consecutive cards of the same chord root | VERIFIED | `src/lib/srs/rotation.ts:154-238` `interleaveQueue` — groups State.New cards per fact into one atomic unit (contiguous), tracks `trailingRoot`/`trailingRootRun` and rejects candidates that would extend a same-root run to 3, rejects same-factId adjacency, relaxes only when no candidate satisfies constraints (never loops). Wired into `RecallSession.svelte:331-332`: `interleaveQueue(selectedCards, Math.random)` feeds `buildQueue`. `rotation.test.ts` interleaveQueue suite (9 tests, all pass): permutation, factId/root adjacency, cluster contiguity, degenerate single-fact input, determinism under seeded rng. Note: SUMMARY documents a resolved deviation (frequency-aware greedy vs. the plan's literal first-satisfying-candidate walk) after the naive version was empirically shown to violate the same-root invariant; the shipped code and its test suite reflect the corrected algorithm, not the plan's literal text — this is a legitimate in-flight fix, not a gap. |
| 4 | A wrong hear-name answer stays on screen with a Continue button instead of auto-advancing after 650ms; a correct hear-name answer still auto-advances | VERIFIED | `RecallSession.svelte:559-609` `handleHearNameChoice` — on `Rating.Good` schedules `setTimeout(..., HEAR_NAME_ADVANCE_MS)` (650ms); on the else branch (`Rating.Again`) sets `hearNameHintOpen = true` and does NOT schedule the timer. Continue button (`RecallSession.svelte:880-885`) calls `advanceHearName(hearNameCommittedRating ?? Rating.Again)`. `recallSession.test.ts` Mode B describe block covers both branches under fake timers (verified passing in targeted run). |
| 5 | A formula-build session with wrong taps at or above 2x the step count grades Again, so the card re-enqueues in the recall queue and can surface as weak | VERIFIED | `BuildSession.svelte:417-422` `ratingForWrongTaps(count, steps)`: 0->Easy, <=2->Good, <2*steps->Hard, else->Again — matches the plan's boundary spec exactly. `completionRating` computed synchronously at completion (`BuildSession.svelte:629`) and forwarded via `onComplete?.(completionRating ?? Rating.Good)` (line 960). `RecallSession.svelte:648` `handleModeCNext(rating)` calls `advanceQueue(queue, rating)`; `session.ts:34-41` `advanceQueue` re-enqueues at the back only when `rating === Rating.Again`. `buildSession.test.ts` boundary tests (Cm7, 3 steps, threshold 6): 5 wrong taps -> Hard, 6 wrong taps -> Again, far-more-than-threshold -> still Again (all pass). `recallSession.test.ts` Mode C re-enqueue test passes. |
| 6 | Every recall grade (mode A Check, hear-name choice, formula reveal grade) posts exactly one fire-and-forget practice answer event | VERIFIED | `RecallSession.svelte` — `handleModeACheck` (line 449, one `recordPracticeAnswer` call, kind:'chord'), `handleHearNameChoice` (line 581, one call, kind:'chord'), `handleGrade` (line 762, via `telemetryDescriptor` which maps chord-formula/interval-size/scale-degree to 'chord'/'interval'/'scale' — no new `AnswerEvent` kind; verified against `progress.ts:16,32` union `'chord' \| 'scale' \| 'interval'`). Mode C (`handleModeCNext`) deliberately does not call `recordPracticeAnswer` per plan scope (BuildSession owns its own grade write); `recallSession.test.ts` has an explicit test asserting Mode C never posts recall telemetry. Telemetry describe block (8 tests, all pass) covers each of the three paths' correct/incorrect cases. |

**Score:** 6/6 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/srs/introBudget.ts` | Daily budget module (new) | VERIFIED | Exists, substantive (92 lines, full implementation), wired into RecallSession.load(). |
| `src/lib/srs/introBudget.test.ts` | Budget test coverage (new) | VERIFIED | Exists, 15 tests, all pass. |
| `src/lib/srs/deck.ts` | introduceNewCards returns fact count | VERIFIED | `factsTouched + retrofitsTouched` returned (line 297); docstring updated (line 168). |
| `src/lib/srs/rotation.ts` | interleaveQueue export | VERIFIED | Exists (lines 154-238), pure, exported, wired. |
| `src/lib/components/BuildSession.svelte` | Steps-aware ratingForWrongTaps + widened onComplete | VERIFIED | Both present and wired (lines 417-422, 629, 960). |
| `src/lib/components/RecallSession.svelte` | Budget gate, interleave, hear-name pause, telemetry, mode-C rating | VERIFIED | All five sub-features present and wired (see truths above). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| RecallSession.load() | getDueCards/introduceNewCards/introBudget | backlog gate then budget gate then re-fetch | WIRED | `RecallSession.svelte:295-305` matches plan's described sequence exactly. |
| RecallSession.load() | interleaveQueue/buildQueue | selectReviewCards -> interleaveQueue -> buildQueue | WIRED | `RecallSession.svelte:323,331-332`. |
| handleHearNameChoice | setTimeout / hearNameHintOpen | conditional on Rating.Good | WIRED | `RecallSession.svelte:601-608`. |
| BuildSession.onComplete | RecallSession.handleModeCNext | rating: Rating parameter | WIRED | `BuildSession.svelte:960` calls `onComplete?.(completionRating ?? Rating.Good)`; `RecallSession.svelte:1020` `onComplete={handleModeCNext}`; `handleModeCNext(rating)` -> `advanceQueue(queue, rating)`. |
| handleModeACheck / handleHearNameChoice / handleGrade | recordPracticeAnswer | fire-and-forget, one call per grade | WIRED | Confirmed at each call site (lines 449, 581, 762); no `await`/`.then` on the telemetry call — genuinely fire-and-forget. |

### Behavioral Spot-Checks / Test Execution

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite | `npx vitest run` | 106 test files, 1490 tests, all passed (124.81s) | PASS |
| Type checking | `npx svelte-check --threshold error` | 1362 files, 0 errors, 0 warnings | PASS |
| Production build | `npm run build` | Succeeds, static output written to `build/` | PASS |
| Targeted phase tests (verbose) | `npx vitest run src/lib/srs/introBudget.test.ts src/lib/srs/rotation.test.ts src/lib/components/recallSession.test.ts src/lib/components/buildSession.test.ts` | 4 files, 180 tests, all passed | PASS |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|--------------|-------------|--------|----------|
| BACKLOG-1 | Daily new-card intro budget + due-backlog gate | SATISFIED | introBudget.ts + RecallSession.load() gate (truths 1, 2) |
| BACKLOG-2 | Recall telemetry (recall part) | SATISFIED | Three grade-path recordPracticeAnswer calls (truth 6) |
| BACKLOG-6 | Again band in formula-build grading | SATISFIED | ratingForWrongTaps steps-aware + rating threaded through mode C (truth 5) |
| BACKLOG-7 | Hear-name wrong-answer pause | SATISFIED | handleHearNameChoice conditional timer (truth 4) |
| BACKLOG-12 | Interleave the recall review queue | SATISFIED | rotation.interleaveQueue wired into load() (truth 3) |

No orphaned requirements found in v2.2-IMPROVEMENT-BACKLOG.md items 1, 2 (recall half), 6, 7, 12 — all mapped to this plan's `requirements` frontmatter.

### Anti-Patterns Found

None. Grepped all 5 modified/created core files (`introBudget.ts`, `deck.ts`, `rotation.ts`, `BuildSession.svelte`, `RecallSession.svelte`) for TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER/"not yet implemented" — zero matches except pre-existing, unrelated CSS class names (`formula-chip--placeholder`) in `BuildSession.svelte` that predate this phase and refer to a UI display state, not incomplete work.

### Human Verification Required

None. Per the plan's own verification note, the preview harness cannot hydrate this app (client-only bundle logic, no UI copy/layout changes beyond the already-present Continue button surfacing earlier); unit tests + svelte-check + build are the accepted verification for this bundle, and all three pass cleanly with no ambiguity requiring human judgment.

### Gaps Summary

No gaps. All 6 must-have truths verified against actual source code (not just SUMMARY claims), all key links traced and confirmed wired, full test suite (1490/1490) and svelte-check (0 errors) and production build all pass independently re-run by the verifier. The two deviations documented in SUMMARY.md (interleaveQueue's frequency-aware scoring fix, and pinning Math.random in pre-existing multi-card tests) are legitimate in-flight bug fixes made before commit, not gaps — verified the shipped code and its tests are internally consistent and correct.

---

*Verified: 2026-07-22*
*Verifier: Claude (gsd-verifier)*
