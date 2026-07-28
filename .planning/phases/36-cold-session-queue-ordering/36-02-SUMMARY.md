---
phase: 36-cold-session-queue-ordering
plan: 02
subsystem: practice
tags: [practice-queue, host-wiring, fsrs, svelte]

# Dependency graph
requires:
  - phase: 36-cold-session-queue-ordering (Plan 01)
    provides: "composePracticeQueue's optional options.lowMastery signal + first-pick guard (QUEUE-01), the exported isLowMasterySession pure helper, and the SCAFFOLD_HEAVY set"
provides:
  - "The /practice host computes lowMastery from the composed carded half's FSRS state distribution and passes it as composePracticeQueue's 4th argument, completing QUEUE-01 end-to-end"
  - "A host-boundary test (practiceColdOrdering.test.ts) proving the signal is computed and passed correctly, plus the end-to-end cold-lead guarantee"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Argument-capturing delegating spy over a real module export (importOriginal spread + push-then-delegate) to assert on an internal call's arguments while still exercising the real implementation end-to-end - reused from this phase's own Plan 01 test conventions, applied here at the host-call boundary instead of the unit boundary"

key-files:
  created:
    - src/routes/practiceColdOrdering.test.ts
  modified:
    - src/routes/practice/+page.svelte

key-decisions:
  - "lowMastery is computed from cardedItems.map(item => item.card) (post cardsToQueueItems), not selectedCards, so scale-family cards already dropped by cardsToQueueItems never skew the signal - matches the plan's explicit instruction"
  - "Seeded items are intentionally excluded from the lowMastery computation - they are prepended to the final queue after composition and always lead regardless of the signal, so including them would misrepresent what the composer actually weaves"
  - "Warm test fixture uses 2-of-3 State.Review (not 0-of-3 or 3-of-3) to pin isLowMasterySession's exact matureCount * 2 < cards.length boundary from the host, not just a trivially-warm all-mature case"

patterns-established: []

requirements-completed: [QUEUE-01]

coverage:
  - id: D1
    description: "/practice host imports isLowMasterySession and computes lowMastery from cardedItems' cards immediately before composing, passing { lowMastery } as composePracticeQueue's 4th argument"
    requirement: "QUEUE-01"
    verification:
      - kind: unit
        ref: "src/routes/practiceColdOrdering.test.ts#QUEUE-01: /practice host computes and passes the low-mastery signal > a cold (all-New) chord session passes lowMastery: true to composePracticeQueue"
        status: pass
      - kind: unit
        ref: "src/routes/practiceColdOrdering.test.ts#QUEUE-01: /practice host computes and passes the low-mastery signal > a warm (majority State.Review) chord session passes lowMastery: false to composePracticeQueue"
        status: pass
    human_judgment: false
  - id: D2
    description: "A cold all-New chord session, with song filter OFF and every synthetic family woven in, never renders progression or inversion as the first family cue (end-to-end QUEUE-01 guarantee at the host boundary)"
    requirement: "QUEUE-01"
    verification:
      - kind: unit
        ref: "src/routes/practiceColdOrdering.test.ts#QUEUE-01: a cold session never leads with a scaffold-heavy family > with song filter OFF and every synthetic woven, the first rendered family cue is never progression or inversion"
        status: pass
    human_judgment: false
  - id: D3
    description: "The existing /practice host suites (warm State.Review fixtures) stay byte-behaviour green - song filter, single-type-due gating, and seed handoff unchanged (REG-01)"
    requirement: "REG-01"
    verification:
      - kind: unit
        ref: "npx vitest run src/routes/practiceColdOrdering.test.ts src/routes/practiceInversionsReg.test.ts src/routes/practiceInversions.test.ts src/routes/practiceSeedHandoff.test.ts tests/practice-hub-mix.e2e.test.ts tests/practice-hub.e2e.test.ts (24/24 passed)"
        status: pass
      - kind: unit
        ref: "npm run check (svelte-check, 0 errors 0 warnings)"
        status: pass
      - kind: unit
        ref: "npx vitest run (full project suite, 115 files / 1611 tests passed)"
        status: pass
    human_judgment: false

duration: 7min
completed: 2026-07-27
status: complete
---

# Phase 36 Plan 02: Wire the Low-Mastery Signal into the /practice Host Summary

**The /practice host now computes `lowMastery` from the FSRS state distribution of the carded half entering the weave (`isLowMasterySession(cardedItems.map(i => i.card))`) and passes `{ lowMastery }` as composePracticeQueue's 4th argument, completing QUEUE-01 end-to-end with the warm path byte-identical.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-27T02:30Z (approx)
- **Completed:** 2026-07-27T02:37Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `src/routes/practice/+page.svelte`'s `load()` imports `isLowMasterySession` from `$lib/practice/practiceQueue`, computes `const lowMastery = isLowMasterySession(cardedItems.map((item) => item.card))` immediately before the compose call, and passes `{ lowMastery }` as the 4th argument to `composePracticeQueue` - the only change to the host's `load()`, with the song filter, synthetic gating, seed handoff, and grade/advance handlers all untouched.
- New host test `src/routes/practiceColdOrdering.test.ts` partially mocks `$lib/practice/practiceQueue` (importOriginal, overriding only `composePracticeQueue` with an argument-capturing spy that delegates to the real implementation) and proves: a cold all-New three-chord fixture yields `composeCalls[0][3] === { lowMastery: true }`; a warm 2-of-3 State.Review fixture yields `{ lowMastery: false }`; and with the cold fixture and song filter OFF (every synthetic family woven), the first rendered `question-source-tag` is never the localized progression or inversion cue label.
- QUEUE-01 is now complete end-to-end: Plan 01 built the pure signal + first-pick guard in the composer; this plan supplies the one real signal source (the host's Dexie-fetched, FSRS-ordered carded half) and proves the wiring at the host boundary.

## Task Commits

1. **Task 1: Compute and pass the low-mastery signal from the /practice host** - `bf6595c` (feat)
2. **Task 2: Host test proving the cold vs warm signal and a green REG suite** - `fcd981c` (test)

## Files Created/Modified
- `src/routes/practice/+page.svelte` - Added `isLowMasterySession` to the named import from `$lib/practice/practiceQueue`; added the `lowMastery` const computed from `cardedItems.map((item) => item.card)` right before the `composePracticeQueue` call; changed that call to pass `{ lowMastery }` as its 4th argument. Nothing else in `load()`, the synthetic gating, song-filter steering, seed handoff, or grade/advance handlers changed.
- `src/routes/practiceColdOrdering.test.ts` - New host test file mirroring `practiceInversionsReg.test.ts`'s mock harness (deck/introBudget/telemetry/audio mocked; `practiceQueue` partially mocked for `composePracticeQueue` only). Three test cases across two describe blocks: cold->true, warm->false, and the end-to-end cold-lead assertion via the real i18n `t('practice.cue.progression'/'practice.cue.inversion')` keys (not hardcoded English).

## Decisions Made
- Computed `lowMastery` from `cardedItems` (not `selectedCards`) per the plan's explicit instruction - `cardsToQueueItems` already drops scale-family cards, so the signal reflects exactly the cards entering the weave, not a superset.
- Seeded items are deliberately excluded from the signal computation (they are prepended post-composition and always lead regardless) - matches the plan's stated rationale and the composer's own contract from Plan 01.
- Chose Cm7/Dm7/G7 as the fixture's three chord symbols (reusing `practiceInversionsReg.test.ts`'s `VOICING_SHELL_LETTERS` catalog convention) so the cold fixture reliably earns voicing, progression, AND inversion synthetics, making the end-to-end assertion (D2) a genuine multi-family weave rather than a degenerate single-family case.
- Warm fixture uses 2-of-3 State.Review (not all-mature) to exercise `isLowMasterySession`'s exact `matureCount * 2 < cards.length` boundary at the host layer, not just a trivially-warm case.

## Deviations from Plan

None - plan executed exactly as written. All `must_haves` truths, artifacts, and key_links from the plan frontmatter are satisfied by the implementation and tests above.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- QUEUE-01 is fully shipped: composer (Plan 01) + host wiring (Plan 02), both proven by unit and host-boundary tests.
- Full project test suite is green (115 files, 1611 tests); `npm run check` (svelte-check) is clean with 0 errors/warnings.
- No blockers. Phase 36 has no further plans - this closes the phase's only requirement (QUEUE-01).

---
*Phase: 36-cold-session-queue-ordering*
*Completed: 2026-07-27*

## Self-Check: PASSED

- FOUND: src/routes/practice/+page.svelte
- FOUND: src/routes/practiceColdOrdering.test.ts
- FOUND: .planning/phases/36-cold-session-queue-ordering/36-02-SUMMARY.md
- FOUND commit bf6595c (feat: wire low-mastery signal into /practice host)
- FOUND commit fcd981c (test: host test proving cold/warm signal)
