---
phase: 36-cold-session-queue-ordering
verified: 2026-07-27T02:47:43Z
status: passed
score: 8/8 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 36: Cold-Session Queue Ordering Verification Report

**Phase Goal:** A cold, low-mastery practice session never leads with a scaffold-heavy progression or inversion item, so the first item is never a hard block.
**Verified:** 2026-07-27T02:47:43Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | With `{ lowMastery: true }` and at least one simpler family present, `composePracticeQueue`'s FIRST emitted item is never `progression`/`inversion`, for any rng | VERIFIED | `practiceQueue.ts:378-393` (`pickFrom` guard scoped to `output.length === 0`); `practiceQueue.test.ts:479-497` asserts across seeds 1-8; unit run green |
| 2 | Warm/default path (options absent, `lowMastery: false`, or scaffold-heavy-only) stays byte-identical to today, frozen-order guard preserved | VERIFIED | `practiceQueue.ts:348` (`byFamily.size <= 1` short-circuit untouched), `:387-393` (guard is a no-op unless `lowMastery===true && output.length===0`); frozen-order test at `practiceQueue.test.ts:449-476` untouched and green; scaffold-heavy-only equivalence test at `:499-511`; default==warm test at `:523-535` |
| 3 | Single-type-due gate preserved for a scaffold-heavy-only single family under the cold signal | VERIFIED | `practiceQueue.ts:348` short-circuit runs before the weave/guard; `practiceQueue.test.ts:513-521` |
| 4 | `isLowMasterySession` returns a documented boolean over `CardRecord[]` using the `State.Review` maturity notion, no Dexie/FSRS-engine read | VERIFIED | `practiceQueue.ts:87-91` (`matureCount * 2 < cards.length`, pure, imports only `State` enum value); `practiceQueue.test.ts:554-599` (6 cases: empty, all-New, all-Learning, 1/3, 2/3, 3/3) |
| 5 | `/practice` computes the low-mastery signal from the composed carded half's FSRS state distribution and passes it as `composePracticeQueue`'s 4th argument | VERIFIED | `+page.svelte:336-339` — `isLowMasterySession(cardedItems.map((item) => item.card))` then `composePracticeQueue(cardedItems, syntheticItems, Math.random, { lowMastery })` |
| 6 | A cold session (all-New) → `lowMastery: true`; a warm session (majority `State.Review`) → `lowMastery: false`, proven at the host boundary | VERIFIED | `practiceColdOrdering.test.ts:158-178` — argument-capturing spy on the real `composePracticeQueue`, captured 4th arg equals `{ lowMastery: true }` / `{ lowMastery: false }` respectively |
| 7 | End-to-end: a cold session with every synthetic family woven (song filter OFF) never renders progression/inversion as the first family cue | VERIFIED | `practiceColdOrdering.test.ts:181-193` — renders the real page, starts the session, asserts `question-source-tag` textContent is never `t('practice.cue.progression')`/`t('practice.cue.inversion')` |
| 8 | Existing `/practice` suites (warm REG fixtures, song-filter + single-type-due gating, seed handoff) stay green (REG-01 at the host boundary) | VERIFIED | `npx vitest run` of the 7 named suites: 75/75 tests pass; full project suite: 115 files / 1611 tests pass; `npm run check` (svelte-check): 0 errors / 0 warnings |

**Score:** 8/8 truths verified (0 present-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/practice/practiceQueue.ts` | `ComposeOptions`, exported `SCAFFOLD_HEAVY`, extended `composePracticeQueue` signature, first-pick guard, `isLowMasterySession` | VERIFIED | All present (lines 58, 68-70, 87-91, 330-447); guard is additive only, rest of the weave (relax branch, no-3-in-a-row, scarcest-last, anti-adjacency) byte-unchanged |
| `src/lib/practice/practiceQueue.test.ts` | New cold-first-item, scaffold-heavy-only, single-type-due-under-cold, `isLowMasterySession` cases; frozen-order guard preserved | VERIFIED | `describe('cold-session first-item ordering (QUEUE-01)')` (5 cases, lines 478-552), `describe('isLowMasterySession')` (6 cases, 554-599); frozen-order describe block at 449-476 untouched |
| `src/routes/practice/+page.svelte` | imports `isLowMasterySession`, computes `lowMastery` in `load()`, passes 4th arg | VERIFIED | Import at line 13; computation + call at lines 336-339; no other `load()` logic touched (diff-confirmed by code review report) |
| `src/routes/practiceColdOrdering.test.ts` | new host test spying on the options argument for cold vs warm | VERIFIED | Full file read; genuine argument-capturing delegating spy (importOriginal + push-then-delegate), not a stub; exercises the real weave |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `options.lowMastery + output.length === 0` | first-pick guard | restricts pick to simpler families when present | WIRED | `practiceQueue.ts:387-393`; unit-tested across 8 seeds |
| `byFamily.size <= 1` short-circuit | runs before weave loop | single-type-due gate unaffected | WIRED | `practiceQueue.ts:348`, precedes the guard entirely |
| `isLowMasterySession` maturity notion | `voicingStageForChord`'s `State.Review` rule | shared "mature" notion | WIRED | `practiceQueue.ts:79-85` doc + `:89`; `shellVoicing.ts` cross-referenced in code review (IN-01 notes the intentional Relearning exclusion, matching convention) |
| `isLowMasterySession(cardedItems.map(item => item.card))` | `composePracticeQueue(..., { lowMastery })` | host `load()` | WIRED | `+page.svelte:336-339`; host test proves both the value computed and the argument passed |
| Warm REG/e2e fixtures (`State.Review`) | `lowMastery: false` → unchanged order | REG-01 | WIRED | `practiceColdOrdering.test.ts` warm case + full named-suite green run (75/75) + full project suite green (1611/1611) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Scoped unit suite (composer + host-wiring) | `npx vitest run src/lib/practice/practiceQueue.test.ts src/routes/practiceColdOrdering.test.ts src/routes/practiceInversionsReg.test.ts src/routes/practiceInversions.test.ts src/routes/practiceSeedHandoff.test.ts tests/practice-hub-mix.e2e.test.ts tests/practice-hub.e2e.test.ts` | 7 files / 75 tests passed | PASS |
| Type gate (canonical, per project convention) | `npm run check` | `0 ERRORS 0 WARNINGS` (1392 files) | PASS |
| Full project suite (run once) | `npx vitest run` | 115 files / 1611 tests passed | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| QUEUE-01 | 36-01, 36-02 | Cold, low-mastery session never leads with scaffold-heavy progression/inversion | SATISFIED | Composer guard (36-01) + host wiring (36-02), both unit- and host-boundary tested; see Truths 1-7 above |

No orphaned requirements: REQUIREMENTS.md's traceability table maps QUEUE-01 to Phase 36 only, matching the declared `requirements: [QUEUE-01]` in both plan frontmatters. REG-01 is separately tracked in REQUIREMENTS.md as Phase 37's own requirement (the milestone-wide no-regression gate); Phase 36's plans additionally self-verify REG-01-preserving behavior as a safety constraint on their own change, which is consistent with (not a substitute for) Phase 37's dedicated gate.

### Anti-Patterns Found

None. `grep` for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` across `practiceQueue.ts`, `+page.svelte`, `practiceColdOrdering.test.ts`, and `practiceQueue.test.ts` returned zero matches. No stub returns, no hardcoded-empty renders, no console.log-only handlers. The 36-REVIEW.md code review (0 critical, 0 warning, 2 info-only) independently confirms purity, REG-01 byte-identity via no added `rng()` calls in the guard, correct first-pick scoping, and correct `isLowMasterySession` boundary math.

### Human Verification Required

None. This phase is a pure composer change + host wiring + tests — no visual surface was added or changed (no new UI copy, no new component, no styling). All must-haves are machine-verifiable and were verified above.

### Gaps Summary

No gaps. All 8 derived truths (roadmap success criteria + PLAN frontmatter must-haves, merged and deduplicated) are VERIFIED against actual source, not SUMMARY.md claims:

- Read `practiceQueue.ts` directly and confirmed the guard's exact placement, scoping (`output.length === 0`), and fallback behavior (empty-simpler-subset falls through unchanged).
- Read `+page.svelte` directly and confirmed the signal computation source (`cardedItems`, not `selectedCards`) and the exact 4th-argument call shape.
- Read `practiceColdOrdering.test.ts` in full and confirmed the spy is a genuine delegating capture (not a stub returning canned data) and that the end-to-end assertion renders the real page and starts a real session.
- Independently ran (not trusted from SUMMARY.md): the 7 named test files (75/75 pass), the full project suite (115 files/1611 tests pass), and `npm run check` (0 errors/0 warnings) — all matched the SUMMARY's claims.
- Cross-checked git log for the 4 phase commits (`2c072fa`, `2686b89`, `bf6595c`, `fcd981c`) — all present.
- Cross-referenced REQUIREMENTS.md: QUEUE-01 → Phase 36 only, no orphaned IDs for this phase.

---

*Verified: 2026-07-27T02:47:43Z*
*Verifier: Claude (gsd-verifier)*
