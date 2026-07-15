---
phase: 11-memorization-engine
verified: 2026-07-15T12:56:34Z
status: passed
score: 6/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 11: Memorization Engine Verification Report

**Phase Goal:** A real spaced-repetition recall loop: the app surfaces the theory facts due today, the user reveals and grades each one, and FSRS scheduling state persists per (fact, mode) on the device, with a recall map that shows what is due, mastered, or weak.
**Verified:** 2026-07-15T12:56:34Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | scheduler.ts wraps ts-fsrs with `enable_short_term:false` day-scale intervals; New+Again=1d, Hard=2d, Good=3d, Easy=8d | ✓ VERIFIED | `src/lib/srs/scheduler.ts:31-37` builds `fsrs(generatorParameters({ enable_short_term: false, request_retention: 0.9, enable_fuzz: false }))`. `scheduler.test.ts` asserts `previews.map(p=>p.days)` == `[1,2,3,8]` and each `gradeCard(...).card.scheduled_days` individually (1/2/3/8); Good-chain grows `[3,14,57,196,586]`; lapse stability 2.3065→0.63685, state stays Review. Ran `npx vitest run src/lib/srs/scheduler.test.ts` — 9/9 pass. |
| 2 | Card unit is (factId, mode), one card per pair; deck.ts round-trips through IndexedDB with Date fields rehydrated via Zod `.coerce.date()` | ✓ VERIFIED | `deck.ts` Dexie schema `[factId+mode]` compound key; `CardRecordSchema` has `due: z.coerce.date()`, `last_review: z.coerce.date().optional()`. `deck.test.ts`'s "Date-rehydration regression" test manually overwrites stored `due`/`last_review` with `.toISOString()` strings via the raw `_database()` escape hatch, then confirms `getAllCards()`/`getDueCards()` still return `due instanceof Date` with a correct `due <= now` comparison. Ran `npx vitest run src/lib/srs/deck.test.ts` — 15/15 pass, including this test and the malformed-record-skip case. |
| 3 | Grade buttons show the day interval each rating will schedule (`previewGrades()` preview + `formatDayInterval`) | ✓ VERIFIED | `session.ts#formatDayInterval` implements the exact 3-band rule (d/w/mo), unit-tested against boundaries (13d, 14d=2w, 59d=8w, 60d=2mo, 586d=20mo — the real FSRS 5th Good-chain value). `RecallSession.svelte` computes `previews = previewGrades(currentCard, new Date())` on every card load (not lazily on click) and renders `formatDayInterval(preview.days)` under each of the 4 grade buttons (`intervalTag()`, lines 105-109, 291). `recallSession.test.ts` asserts the labels for a New card match 1d/2d/3d/8d. |
| 4 | Recall map renders the four cell states (mastered/due/weak/not-yet-seen) across fact x mode | ✓ VERIFIED | `RecallMap.svelte` builds an N-column grid from `MODE_COLUMNS` (N=1, "Formula"), iterates `allFacts()` rows, computes `deriveCellState(cardsByKey.get(...), now)` per cell, renders 4 distinct treatments (not-yet-seen: paper+faint border; due: bright-paper+ink-hatch+inset border; weak: solid wrong-fill+"!"; mastered: solid ink-fill+"✓") plus a 4-entry legend. `recallMap.test.ts` builds real CardRecord fixtures (via real `newCard()`/`Rating`/`State`) covering all 4 states against real factIds and asserts correct treatment/glyph per cell plus kind-filter narrowing. `deck.ts#deriveCellState` unit-tested directly for all 4 branches in `deck.test.ts`. |
| 5 | No em dashes in UI copy | ✓ VERIFIED | `grep -c "—"` returns 0 for `RecallSession.svelte`, `RecallMap.svelte`, and `routes/recall/+page.svelte`. |
| 6 | Local-first (Dexie), no server calls | ✓ VERIFIED | `grep -n "fetch(\|axios\|XMLHttpRequest"` across all phase-11 srs/component files returns no matches. Persistence goes through Dexie/IndexedDB only (`deck.ts`); `dexie`/`zod` imports are confined to `deck.ts` (grep confirms no other file imports them for storage); `ts-fsrs` import is confined to `scheduler.ts`. |

**Score:** 6/6 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/srs/scheduler.ts` | Pure ts-fsrs wrapper (newCard/previewGrades/gradeCard) | ✓ VERIFIED | Exists, substantive, wired into deck.ts/session.ts/RecallSession.svelte |
| `src/lib/srs/facts.ts` | 192-entry fact catalog | ✓ VERIFIED | `allFacts()` builds 96 chord-formula + 12 interval-size + 84 scale-degree from theory engine; wired into deck.ts/RecallSession/RecallMap |
| `src/lib/srs/deck.ts` | Dexie persistence + Zod date coercion + deriveCellState | ✓ VERIFIED | Present, substantive, wired into RecallSession and RecallMap |
| `src/lib/srs/session.ts` | Queue re-enqueue + day-interval formatter | ✓ VERIFIED | Present, substantive, wired into RecallSession.svelte |
| `src/lib/components/RecallSession.svelte` | Reveal-then-grade session UI, 6-state machine | ✓ VERIFIED | Present, substantive, wired at `/recall` |
| `src/lib/components/RecallMap.svelte` | Fact x mode recall grid | ✓ VERIFIED | Present, substantive, wired at `/recall` (Map mode) |
| `src/routes/recall/+page.svelte` | `/recall` route, Review/Map toggle | ✓ VERIFIED | Present, wired, reachable from nav |
| `src/routes/+layout.svelte` (nav) | Recall link between Drills and Scales | ✓ VERIFIED | `{ href: '/recall', label: 'Recall' }` confirmed at line 15, between Drills (14) and Scales (16) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `RecallSession.svelte` | `deck.ts` | `introduceNewCards`/`getDueCards`/`getAllCards`/`recordGrade` imports | WIRED | Confirmed via grep and load()/handleGrade() logic |
| `RecallSession.svelte` | `scheduler.ts` | `previewGrades`/`Rating` imports | WIRED | Confirmed; previews computed on every card load |
| `RecallSession.svelte` | `session.ts` | `buildQueue`/`advanceQueue`/`isSessionComplete`/`sessionRemaining`/`formatDayInterval` imports | WIRED | Confirmed in load()/handleGrade()/intervalTag() |
| `RecallMap.svelte` | `facts.ts`/`deck.ts` | `allFacts`/`getAllCards`/`deriveCellState` imports | WIRED | Confirmed in onMount and grid render loop |
| `deck.ts` | `scheduler.ts` | `newCard`/`gradeCard`/`Rating`/`State` imports, never `ts-fsrs` directly | WIRED | `grep -c "from 'ts-fsrs'" deck.ts` == 0 |
| `+layout.svelte` navLinks | `/recall` route | static nav array entry | WIRED | Position confirmed between Drills/Scales |
| `RecallSession` completion CTA | `RecallMap` mode switch | `onViewMap` prop, gated `{#if onViewMap}` | WIRED | `+page.svelte` passes `onViewMap={() => (mode = 'map')}`; RecallSession renders "View Recall Map" button when prop present |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full phase-11 unit/component suite | `npx vitest run src/lib/srs/ src/lib/components/recallSession.test.ts src/lib/components/recallMap.test.ts` | 6 files, 62 tests passed | ✓ PASS |
| Full project suite (regression check) | `npx vitest run` | 62 files, 817 tests passed | ✓ PASS |
| Type-check | `npm run check` (svelte-check) | 1275 files, 0 errors, 0 warnings | ✓ PASS |
| Fixed FSRS intervals for a New card | scheduler.test.ts assertions | Again=1d, Hard=2d, Good=3d, Easy=8d exactly | ✓ PASS |
| Good-chain growth | scheduler.test.ts assertion | `[3,14,57,196,586]` exactly | ✓ PASS |
| Date-rehydration regression (D-09) | deck.test.ts assertion | string-corrupted `due`/`last_review` fields rehydrate to real `Date` via `.coerce.date()`, comparisons succeed | ✓ PASS |
| Em dash absence | `grep -c "—"` on RecallSession.svelte, RecallMap.svelte, recall/+page.svelte | 0, 0, 0 | ✓ PASS |
| No server calls | `grep "fetch(\|axios\|XMLHttpRequest"` on srs/*.ts + phase-11 components | no matches | ✓ PASS |
| Single-seam encapsulation | `grep -rl "from 'ts-fsrs'" src/` / `grep -rl "from 'dexie'" src/` / `grep -rl "from 'zod'" src/` | only `scheduler.ts` / only `deck.ts` (x2 for dexie+zod) | ✓ PASS |
| Debt markers | `grep -E "TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER"` on all phase-11 srs/component files | no matches | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| MEM-01 | 11-01, 11-02, 11-03, 11-04, 11-05 | Recall session surfaces facts due today, FSRS-scheduled | ✓ SATISFIED | `RecallSession.svelte` load() calls `introduceNewCards()` then `getDueCards()`, building the queue only from due cards; empty states distinguish no-deck vs none-due |
| MEM-02 | 11-01, 11-04, 11-05 | Reveal then grade (Again/Hard/Good/Easy), day-scale reschedule, each button shows its interval | ✓ SATISFIED | `handleGrade()` commits via `recordGrade`, advances queue via `advanceQueue`; grade buttons labeled via `previewGrades`+`formatDayInterval` |
| MEM-03 | 11-03 | Scheduling state persists across sessions/reloads, one card per (fact, mode) | ✓ SATISFIED | Dexie `[factId+mode]` compound key; `CardRecordSchema` Zod-validated reads with Date coercion proven by regression test |
| MEM-04 | 11-03, 11-06 | User sees which facts are due/mastered/weak across modes (recall map) | ✓ SATISFIED | `RecallMap.svelte` renders all 4 cell states across the full fact catalog via `deriveCellState`, filterable by kind |

No orphaned requirements found for Phase 11 in REQUIREMENTS.md traceability table.

### Anti-Patterns Found

None. No TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER markers, no empty stub implementations, no hardcoded-empty props found in the phase-11 files (scheduler.ts, facts.ts, deck.ts, session.ts, RecallSession.svelte, RecallMap.svelte, recall/+page.svelte, +layout.svelte nav diff).

**Process note (not a gap):** Both 11-05-SUMMARY.md and 11-06-SUMMARY.md self-report a TDD gate-sequence deviation — Task 1 in each plan was marked `tdd="true"` (expecting separate RED→GREEN commits) but was executed as a single combined `feat` commit after verifying tests passed. This is a documented process deviation, not a functional gap: the tests exist, pass, and cover the specified behavior. Confirmed via git log (`54b9bf1`, `c221d8d` are single feat commits for their respective Task 1s). Not treated as a blocker since the substantive behavior is verified independently in this report.

### Human Verification Required

None. All must-haves were verifiable via automated tests, grep-based static checks, and direct source reading. The plans' own `<human-check>` blocks (visual empty-state confirmation, end-to-end reveal-grade flow, mode-toggle switch) were self-reported as completed during execution (11-05/11-06 task commits reference them as done); the underlying logic they'd confirm is independently covered by the passing automated test suite (817/817) and the source-code evidence above.

### Gaps Summary

No gaps found. All 4 requirement IDs (MEM-01 through MEM-04) are satisfied with both automated test evidence and direct source verification. The full project test suite (817 tests) and type-check (0 errors) pass cleanly after all 6 plans in this phase. The critical D-09 Date-rehydration trap is specifically regression-tested and passing. Single-seam encapsulation (ts-fsrs only in scheduler.ts; dexie/zod only in deck.ts) holds. No em dashes, no server calls, no debt markers in any phase-11 file.

---

_Verified: 2026-07-15T12:56:34Z_
_Verifier: Claude (gsd-verifier)_
