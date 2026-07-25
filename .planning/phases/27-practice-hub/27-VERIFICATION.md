---
phase: 27-practice-hub
verified: 2026-07-25T00:53:13Z
status: passed
score: 9/9 must-haves verified
behavior_unverified: 0
overrides_applied: 1
override_reason: "All 9/9 automated must-haves passed. The 2 remaining human_verification items are visual-only (accent placement, phone-width layout + end-card stamp-in animation) and cannot be exercised by the jsdom e2e suite or the null-origin SvelteKit preview harness. Deferred to on-device eyeball per established project convention (phases 09/21/23/25) and the user's auto-run-all directive. Tracked in 27-UAT.md; resume with /gsd-verify-work 27."
human_verification:
  - test: "Load /practice in a real browser (Chrome, phone width + desktop width) with a mixed due deck. Confirm the family-cue chip ('NAME IT'/'BUILD IT'/'VOICING'/'INTERVAL'/'PROGRESSION') renders in the muted/ink color, never vermilion, and that vermilion appears ONLY on the 'Start practice' button and the in-session 'Next'/'Check' primary buttons per existing drills convention (not as a new accent surface)."
    expected: "Family-cue chip is visually muted/gray; the pre-start card shows exactly one vermilion-filled button; no second vermilion element appears anywhere on the page."
    why_human: "Computed color/contrast and visual accent placement cannot be asserted from jsdom text/attribute checks; this project's preview harness cannot hydrate the app (null-origin SvelteKit), so an on-device/browser check is required per project convention."
  - test: "Play one full mixed session on a phone-width viewport: pre-start card, in-session score register + family cue, and the session-end-card ('stamp' animation) with a mix of correct/missed items."
    expected: "Layout doesn't overflow or clip on narrow widths; the stamp-in animation on the end-card plays smoothly; missed-item chips wrap cleanly; the due-count register text is legible."
    why_human: "Layout/animation/responsive rendering is not exercised by the jsdom-based e2e suite (jsdom does not run CSS animations or layout reflow)."
---

# Phase 27: Practice Hub Verification Report

**Phase Goal:** A single "Start practice" action runs one FSRS-scheduled interleaved session mixing all five drill families (name-it, build-it, voicings, intervals, progressions); no mode-picker; song filter steers the queue; single-type-due gate holds; existing grading (chroma/MIDI), telemetry, tiers, and scaffolds preserved; host stays thin (no drills-monolith duplication).
**Verified:** 2026-07-25T00:53:13Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Single "Start practice" action; no mode-picker grid (PRAC-01) | ✓ VERIFIED | `src/routes/practice/+page.svelte` L402-414: pre-start renders exactly one `Button variant="primary"` with `t('practice.cta.start')`. `tests/practice-hub.e2e.test.ts` L125-141 asserts `within(preStart).getAllByRole('button')` has length 1, text "Start practice". Test passes in full suite run. |
| 2 | One session interleaves all five generators in a single queue (PRAC-02) | ✓ VERIFIED | `practiceQueue.ts` `composePracticeQueue` weaves carded + synthetic items with a no-3-in-a-row guarantee; `+page.svelte` routes each of the 5 families to its own component inside one `{#key}` block (L428-447). `tests/practice-hub-mix.e2e.test.ts` "five-family interleaving (PRAC-02)" drives a live session through all 5 families and asserts `new Set(familiesSeen)` equals all 5 labels with no 3-in-a-row run. Test passes. |
| 3 | Queue ordered by FSRS due-date/weakness; tiers, grading (chroma/MIDI), telemetry preserved (PRAC-03/REG-01) | ✓ VERIFIED | `load()` calls the real `selectReviewCards`/`interleaveQueue` from `$lib/srs/rotation` (unmodified, confirmed via `git diff` against pre-phase commit = no diff) before composing. Grading delegates to `matchChord`/`gradeIntervalTap`/`generateQuestion`/`generateIntervalQuestion` (all unmodified). FSRS commit via `deck.recordGrade` asserted in `tests/practice-hub-mix.e2e.test.ts` "grade-commit split (REG-02)" (`recordGradeMock` called once with the carded card + mapped Rating). Telemetry via `recordPracticeAnswer` (unmodified module) called from `completeCarded`/`completeBuild`. |
| 4 | Song filter steers the Practice queue (PRAC-04) | ✓ VERIFIED | `applySongFilter` (byte-faithful port of `RecallSession`'s) restricts the FSRS due half; `filterVoicingsBySong` restricts the synthetic voicing half; progressions are deliberately omitted under the filter (documented policy). `tests/practice-hub-mix.e2e.test.ts` "song filter steers the merged queue (PRAC-04)" seeds one provenance chord and asserts only that chord's name-it + voicing items surface, no progression synthesized. Test passes. |
| 5 | Single-type-due gate: only one family surfaces when only it is due (PRAC-05) | ✓ VERIFIED | `composePracticeQueue` returns the single family's items unchanged when `byFamily.size <= 1` (L231). Synthetic voicing/progression building in `load()` is gated on `dueChordSymbols.size > 0`, so an interval-only due set yields zero synthetics. `tests/practice-hub-mix.e2e.test.ts` "single-type-due gate (PRAC-05)" seeds only interval cards and asserts every item is INTERVAL, no other family ever mounts, and `syntheticProgressionItemsMock` is never called. Test passes. |
| 6 | HYBRID model honored: no new FSRS card kinds; synthetic items never call `recordGrade` | ✓ VERIFIED | `git diff` of `src/lib/srs/facts.ts` and `src/lib/srs/deck.ts` against the pre-phase-27 commit (`885361e`) is empty — byte-identical, no new card kind/persisted field added. `completeSynthetic()` in `+page.svelte` (L343-351) never calls `recordGrade`; `tests/practice-hub-mix.e2e.test.ts`'s grade-commit-split test asserts `recordGradeMock` is called exactly once total across a mixed carded+2-synthetic-item round. |
| 7 | Thin host: `/practice/+page.svelte` delegates, is not a drills-monolith copy | ✓ VERIFIED | `src/routes/practice/+page.svelte` is 485 lines vs. `src/routes/drills/+page.svelte`'s 1459 lines. It imports and delegates to `practiceQueue.ts` (pure composer) plus 5 render components (`PracticeChordDrill`, `PracticeIntervalDrill`, `BuildSession`, `ShellVoicingDrill`, `ProgressionDrill`); it owns only session-glue state (score, asked, queue, page-state). No generator/grading logic is re-implemented inline. |
| 8 | REG-01: `/drills`, `/voicings`, `/progressions`, `/build` routes unchanged or only additively changed | ✓ VERIFIED | `git diff 885361e..HEAD -- src/routes/drills src/routes/voicings src/routes/progressions src/routes/recall src/routes/build` is empty (routes untouched). `ShellVoicingDrill.svelte`/`ProgressionDrill.svelte` changes are additive-only (new optional props, gated branches); with no embed props both components' existing test suites (`shellVoicingDrill.test.ts`, `progressionDrill.test.ts`) still pass unmodified in the full suite run. |
| 9 | Full vitest suite + svelte-check green | ✓ VERIFIED | `npm test -- --run`: 116 test files, 1596 tests, all passed. `npm run check`: svelte-check reports "1380 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS". |

**Score:** 9/9 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/practice/practiceQueue.ts` | Pure queue composer (types, familyForCard, cardsToQueueItems, synthetic builders, composePracticeQueue, advanceHybridQueue, filter helpers) | ✓ VERIFIED | All exports present; no Svelte/Dexie/localStorage import; `CardRecord`/`Mode`/`FactKind` imported `type`-only. |
| `src/lib/practice/practiceQueue.test.ts` | Unit tests for the above | ✓ VERIFIED | 361 lines; part of the passing 1596-test run. |
| `src/lib/components/ShellVoicingDrill.svelte` | Additive embed seam (`embedSymbol`/`onComplete`) | ✓ VERIFIED | Additive props, gated `next()` branch; unembedded path unchanged (verified via diff). |
| `src/lib/components/ProgressionDrill.svelte` | Additive embed seam (`embedTemplateId`/`embedKey`/`onComplete`) | ✓ VERIFIED | Additive props, gated completion-card branch; unembedded "Again" path preserved. |
| `src/lib/components/ShellVoicingDrill.embed.test.ts` / `ProgressionDrill.embed.test.ts` | Embed-seam behavior tests | ✓ VERIFIED | Present, passing. |
| `src/lib/components/PracticeChordDrill.svelte` | name-it render component | ✓ VERIFIED | Imports `generateQuestion` from `$lib/drills/generateQuestion`; no import from `src/routes/drills`; renders identification choice grid, reveal, `onComplete(correct)`. |
| `src/lib/components/PracticeIntervalDrill.svelte` | intervals render component (both directions) | ✓ VERIFIED | Imports `generateIntervalQuestion`/`gradeIntervalTap` etc.; construction grading is chroma-based per test assertions. |
| `src/routes/practice/+page.svelte` | Thin host: load/compose, pre-start, empty tiers, in-session routing, grade commit, end-card | ✓ VERIFIED | 485 lines; delegates rendering; owns only session glue. |
| `src/lib/i18n/messages/practice.ts` + registration in `index.ts` | Practice i18n domain | ✓ VERIFIED | Registered via `import { practice } from './practice'` + spread into `en`/`fr`; no em dashes in copy (project convention). |
| `tests/practice-hub.e2e.test.ts` | Plan 04 e2e (carded-only host behavior) | ✓ VERIFIED | 333 lines, passing. |
| `tests/practice-hub-mix.e2e.test.ts` | Plan 05 REG-02 five-family e2e (interleaving, single-type-due, song filter, grade-commit split) | ✓ VERIFIED | 393 lines; all four described scenarios present and passing. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `practiceQueue.ts` | `srs/rotation.ts`, `srs/scheduler.ts` | `import { ... } from '$lib/srs/rotation'` / `'$lib/srs/scheduler'` | ✓ WIRED | Confirmed direct import, no re-implementation; `srs/rotation.ts`/`srs/scheduler.ts` unmodified (git diff empty). |
| `+page.svelte` `load()` | `srs/deck.ts` (`getDueCards`/`getAllCards`/`introduceNewCards`/`recordGrade`) | direct import + `await` calls | ✓ WIRED | All four functions called in `load()`/`completeCarded()`; `srs/deck.ts` unmodified. |
| `+page.svelte` reviewing state | `PracticeChordDrill` / `PracticeIntervalDrill` / `BuildSession` / `ShellVoicingDrill` / `ProgressionDrill` | `{#if currentItem.family === ...}` branches inside `{#key}` | ✓ WIRED | All 5 branches present (L429-446); each passes the correct props and `onComplete` callback. |
| `completeCarded`/`completeBuild` | `deck.recordGrade` | `await recordGrade(item.card, rating)` (carded); BuildSession's own internal commit (build-it) | ✓ WIRED | Test asserts exactly one `recordGrade` call per carded item and BuildSession's own separate internal call for build-it — no double-commit (a bug the executor caught and fixed pre-verification, per SUMMARY). |
| `completeSynthetic` | `deck.recordGrade` | — (deliberately NOT called) | ✓ WIRED (absence verified) | Test `tests/practice-hub-mix.e2e.test.ts` "grade-commit split" asserts `recordGradeMock` called exactly once total across a session with 1 carded + 2 synthetic completions. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|------------|-------------|--------|----------|
| PRAC-01 | 27-04 | Single "Start practice" action, no mode-picker | ✓ SATISFIED | Truth #1 above. |
| PRAC-02 | 27-01, 27-02, 27-03, 27-04, 27-05 | All five generators interleaved in one queue | ✓ SATISFIED | Truth #2 above. |
| PRAC-03 | 27-01, 27-04 | FSRS-scheduled ordering, existing tiers/grading/telemetry preserved | ✓ SATISFIED | Truth #3 above. |
| PRAC-04 | 27-01, 27-04, 27-05 | Song filter steers the Practice queue | ✓ SATISFIED | Truth #4 above. |
| PRAC-05 | 27-01, 27-05 | Single-type-due quality gate | ✓ SATISFIED | Truth #5 above. |

No orphaned requirements — REQUIREMENTS.md's traceability table maps exactly PRAC-01..05 to Phase 27, and all five are claimed and satisfied across the five plans.

### Anti-Patterns Found

None. Scanned all phase-modified files (`practiceQueue.ts`/`.test.ts`, `ShellVoicingDrill.svelte`/`.embed.test.ts`, `ProgressionDrill.svelte`/`.embed.test.ts`, `PracticeChordDrill.svelte`/`.test.ts`, `PracticeIntervalDrill.svelte`/`.test.ts`, `+page.svelte`, `practice.ts`, both e2e test files) for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` and stub patterns — no unresolved debt markers found. One incidental "placeholder" match in `practice.ts` refers to the i18n `{N}` substitution placeholder in copy, not a stub. No em dashes in any new copy (project convention). No blockers.

### Behavioral Spot-Checks / Probe Execution

Not applicable as separate runs — the project's own vitest e2e suite (`tests/practice-hub.e2e.test.ts`, `tests/practice-hub-mix.e2e.test.ts`) already exercises exactly the behaviors goal-backward verification would spot-check (session start, family routing, grade commit, single-type-due gate, song-filter steering), and the full suite (1596 tests) was run once and confirmed green, plus `npm run check` confirmed clean (0 errors/warnings across 1380 files).

### Human Verification Required

1. **Visual accent placement check.** Load `/practice` in a real browser with a mixed due deck. Confirm the family-cue chip renders in the muted/ink color (never vermilion) and that vermilion appears only on the "Start practice" button and in-session primary controls (matching existing drills convention), never as a second new accent surface. Why human: computed color/visual accent placement cannot be asserted from jsdom text/attribute checks, and this project's preview harness cannot hydrate the app (null-origin SvelteKit issue, documented project memory).
2. **Responsive/animation check.** Play one full mixed session at phone width: pre-start card, in-session register + family cue, and the session-end-card (`stamp-in` CSS animation). Why human: layout reflow and CSS animation are not exercised by the jsdom-based e2e suite.

### Gaps Summary

No gaps found. All 9 observable truths (5 ROADMAP success criteria plus 4 verification-note-specific truths: HYBRID model integrity, thin host, REG-01 route preservation, and full green suite) are verified against actual source code — not SUMMARY.md claims. The `git diff` against the pre-phase-27 commit confirms `srs/facts.ts`, `srs/deck.ts`, `srs/rotation.ts`, `srs/scheduler.ts`, `srs/session.ts`, `srs/introBudget.ts`, the drills/voicings/progressions/recall/build routes, and all five pure generator/grader modules are byte-identical to before the phase — the phase adds new pure/component code and reuses existing engines rather than duplicating them. The two items above are genuinely un-verifiable by automated means in this project's harness (documented limitation) and are routed to human verification rather than silently passed.

---

_Verified: 2026-07-25T00:53:13Z_
_Verifier: Claude (gsd-verifier)_
