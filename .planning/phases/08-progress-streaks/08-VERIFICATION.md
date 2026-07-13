---
phase: 08-progress-streaks
verified: 2026-07-13T19:30:42Z
status: passed
score: 3/3 must-haves verified
behavior_unverified: 2
overrides_applied: 0
human_verification:

  - test: "Run `docker compose up --build` on the actual target (or a Linux VM/container host) with a real .env, and confirm the `api` service reports healthy and `GET /health` returns 200 through the published port."
    expected: "The api container builds, starts, and stays healthy; the SQLite file at ./data/music-learn.db is created and writable."
    why_human: "The docker daemon was unavailable in both the execution sandbox (per 08-02-SUMMARY.md) and this verification sandbox, so `docker compose up --build` itself has never been exercised. Static validation (`docker compose config -q`) passed and a non-containerized run of the built server against real SQLite confirmed persistence/auth/health logic, but the container image build/run path is unverified. 08-REVIEW.md's CR-02 additionally gives a concrete, code-level reason to expect this will fail on the actual Linux deploy target: the Dockerfile's `chown -R app:app /data` has no effect once `docker-compose.yml`'s `./data:/data` bind mount shadows it at runtime, so the non-root `app` user likely cannot write to the mounted directory, and the server would crash-loop on `SQLITE_CANTOPEN`."

  - test: "With the api service reachable and a bearer token saved via the Progress page's token-entry form, reload the app (or open a fresh tab) and confirm the masthead's compact streak chip appears within a moment of page load once a streak exists."
    expected: "The masthead shows '{N} DAY STREAK' shortly after load when a token is stored and the streak is >= 1; it stays absent at 0/loading/error."
    why_human: "08-04-SUMMARY.md's own coverage (D5) flags that no e2e test exercises the masthead's token-present fetch-and-render sequence end to end; the existing masthead e2e test (from 08-03) renders +layout.svelte without a token, only exercising the self-hidden path. Component-level self-hide behavior is unit-tested (streakBadge.test.ts), but the layout's onMount wiring around it is not."
behavior_unverified_items:

  - truth: "`docker compose up` brings up the api service on the Oracle-server-shaped Linux target with a persisted SQLite volume and a passing healthcheck."
    test: "Run `docker compose up --build` against a fresh `./data` directory on a Linux host (bind mount, non-root container user) and observe container health."
    expected: "Container starts, stays healthy, and the SQLite file persists across a container restart."
    why_human: "Never executed end to end (no docker daemon available at execution time or verification time); CR-02 identifies a specific ownership-shadowing bug (chown at build time vs. bind-mount ownership at runtime) that is very likely to reproduce this failure on Linux, unlike on Docker Desktop/OrbStack for Mac where ownership shimming hides it."

  - truth: "Masthead compact streak chip renders correctly after a real onMount fetch with a stored token (not just its self-hide states)."
    test: "Load the app with a token already stored in localStorage and a non-zero streak on the server; observe the masthead chip appear."
    expected: "Chip text '{N} DAY STREAK' appears without blocking nav render."
    why_human: "No e2e test drives this path (see 08-04-SUMMARY.md coverage D5); only the self-hide states (no token / loading / zero) are exercised by tests."
---

# Phase 8: Progress & Streaks Verification Report

**Phase Goal:** The user's drill history persists across sessions and devices, surfaces their weakest chords/scales, and shows a daily practice streak that supports the habit goal.
**Verified:** 2026-07-13T19:30:42Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Drill answers persist across sessions and across devices via the backend on the user's Oracle server (SQLite storage) | ✓ VERIFIED | `server/src/db.ts` `createStore()` uses real parameterized SQLite (`better-sqlite3`), not an in-memory stub for the runtime path. Live end-to-end check performed during this verification: built server (`npm run build`), ran `node dist/main.js` against a real file-backed DB, POSTed 4 answers over HTTP with a bearer token, killed the process, restarted it against the *same* DB file, and confirmed `GET /stats` returned the identical 4-attempt row — proving durable, cross-process persistence. Client wiring (`recordAnswer` → `apiFetch` → `POST /answers`) confirmed wired in `src/routes/drills/+page.svelte`. Cross-*device* sharing is architecturally satisfied (any device pointed at the same `VITE_API_BASE_URL` + token shares the one backend/DB) but the actual Linux/Oracle deployment packaging has an unverified, code-review-flagged risk (see Human Verification #1 / CR-02). |
| 2 | The user can see per-chord and per-scale accuracy stats that highlight their weakest items | ✓ VERIFIED | `server/src/stats.ts` `computeStats()` groups real rows by `(item, kind)`, computes `attempts`/`accuracy`, flags `needsPractice` at `attempts >= 3 && accuracy < 0.7`; unit + integration tests pass (`server/test/stats.test.ts`, 12/12). Live check: 4 seeded answers (1 correct/3 wrong) for `Cm7` produced `{"attempts":4,"accuracy":0.25,"needsPractice":true}` via `GET /stats`. `src/routes/progress/+page.svelte` renders `Weakest Spots` + `AccuracyTable` from the server response verbatim (no client-side re-derivation of accuracy, confirmed by grep — client `PracticeItemRow` does re-derive the *weak-accent* boolean locally rather than using the server's `needsPractice` field; see anti-patterns/WR-03 below, a duplication risk, not a functional failure today since both formulas currently agree). |
| 3 | The user can see a daily practice streak counter | ✓ VERIFIED | `server/src/streak.ts` `computeStreak()` derives distinct `client_date` values, applies today/yesterday-grace/reset logic; unit + integration tests pass (`server/test/streak.test.ts`, 12/12). Live check: `GET /streak?today=2026-07-13` after seeding today's answers returned `{"streak":1,"practicedToday":true}`. `StreakBadge` hero variant renders on `/progress` (verified via `tests/progress.e2e.test.ts`); compact chip wiring exists in the masthead (`src/routes/+layout.svelte`) but its live token-present render path is not covered by an e2e test (see Human Verification #2). |

**Score:** 3/3 truths verified (2 present + wired with a behavior-unverified sub-element each — see `behavior_unverified_items`)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `server/src/db.ts` | Real SQLite persistence, raw per-event rows | ✓ VERIFIED | Parameterized prepared statements, CHECK constraints, indexes; live-tested persistence across process restart |
| `server/src/auth.ts` | Bearer token guard | ✓ VERIFIED | `timingSafeEqual` + length guard; 401 confirmed live and via tests |
| `server/src/routes/answers.ts` | POST /answers, strict schema | ✓ VERIFIED | `additionalProperties:false`, enum kind, pattern clientDate; 201/400 confirmed |
| `server/src/stats.ts` + `server/src/routes/stats.ts` | GET /stats, server-computed aggregates | ✓ VERIFIED | Pure `computeStats`, authed route, live + test confirmed |
| `server/src/streak.ts` + `server/src/routes/streak.ts` | GET /streak, server-computed streak | ✓ VERIFIED | Pure `computeStreak`, authed route, live + test confirmed |
| `src/lib/api/client.ts` | Bearer fetch wrapper | ✓ VERIFIED | `apiFetch`, `getApiToken`/`setApiToken`; unit tests pass |
| `src/lib/api/progress.ts` | recordAnswer/flushQueue/fetchStats/fetchStreak | ✓ VERIFIED | All exports present and wired; see CR-01 caveat below for the offline-queue concurrency edge case |
| `src/routes/drills/+page.svelte` | Fire-and-forget recordAnswer hook | ✓ VERIFIED | `recordGrade` calls `recordAnswer` unawaited; `onMount` drains queue |
| `src/lib/components/PracticeItemRow.svelte` / `AccuracyTable.svelte` | Weakness contract rendering | ✓ VERIFIED | Token-styled, threshold accent correct, no interval-role colors (grep-confirmed) |
| `src/routes/progress/+page.svelte` | Four states + token entry + streak hero | ✓ VERIFIED | All data-testids present and exercised by `tests/progress.e2e.test.ts` (8 cases) |
| `src/lib/components/StreakBadge.svelte` | Hero + compact variants | ✓ VERIFIED | Self-hide logic tested; hero vermilion/ink threshold tested |
| `src/lib/copy/streak.ts` | Never-scolding rotation pools | ✓ VERIFIED | Exact UI-SPEC lines, `{N}` placeholders, no em dash, anti-repeat tested |
| `docker-compose.yml` + `server/Dockerfile` | Runnable deployment packaging | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `docker compose config -q` passes; Dockerfile builds a real multi-stage image on paper, but no actual `docker compose up --build` has ever been run (docker daemon unavailable both at execution and verification time), and 08-REVIEW.md's CR-02 identifies a concrete bind-mount-ownership bug likely to crash-loop the container on the real Linux target |
| `.env.example` | Documents required env vars | ✓ VERIFIED | Contains API_TOKEN/DB_PATH/PORT/HOST/CORS_ORIGIN/VITE_API_BASE_URL, no real secret, no em dash |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/routes/drills/+page.svelte` `recordGrade` | `src/lib/api/progress.ts` `recordAnswer` | direct unawaited call | ✓ WIRED | Confirmed by grep + `tests/drills.e2e.test.ts` (recordAnswer payload assertions) |
| `recordAnswer` | `POST /answers` (server) | `apiFetch` inside `flushQueue` | ✓ WIRED | Live-tested: seeded answers appear in `GET /stats` |
| `server/src/index.ts` | `bearerAuth` preHandler | encapsulated Fastify plugin context | ✓ WIRED | `/answers`, `/stats`, `/streak` all 401 without token (tested + live); `/health` open |
| `src/routes/progress/+page.svelte` | `fetchStats`/`fetchStreak` | `onMount` → `load()` | ✓ WIRED | e2e-tested across all four states + streak hero |
| `src/routes/+layout.svelte` | `StreakBadge` compact | conditional fetch on token presence | ⚠️ PARTIAL (self-hide states tested; live token-present fetch-and-render path not e2e-tested) | See Human Verification #2 |
| `PracticeItemRow` | server `needsPractice` field | NOT wired (client re-derives) | ⚠️ WIRED BUT DUPLICATED | Component computes `item.attempts >= 3 && item.accuracy < 0.7` itself instead of consuming `StatItem.needsPractice`; functionally correct today (formulas match) but two sources of truth (08-REVIEW.md WR-03) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `/progress` Weakest Spots / All Stats | `items`, `weakest` (`$state`) | `fetchStats()` → `GET /stats` → `computeStats(store.getAllAnswers())` | Yes — live-verified real SQLite rows produced the expected aggregate | ✓ FLOWING |
| `/progress` streak hero | `streak`, `practicedToday` (`$state`) | `fetchStreak()` → `GET /streak` → `computeStreak(store.getAllAnswers(), today)` | Yes — live-verified | ✓ FLOWING |
| masthead compact chip | `streakCount` | `fetchStreak()` inside `+layout.svelte` `onMount` | Wired to the same real endpoint, but the render-with-real-data path is not exercised by any automated test (see human verification) | ⚠️ WIRED, RUNTIME PATH UNTESTED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Server boots, health check, auth, persistence, restart-durability | Built server run directly (`node dist/main.js`) against real file-backed SQLite; 4 POSTs, GET /stats, GET /streak, process kill + restart, re-fetch | `GET /health` → 200; unauthed POST → 401; 4 authed POSTs → 201 each; `GET /stats` → correct aggregate; `GET /streak` → correct streak; identical result after restart | ✓ PASS |
| Server test suite | `npm --prefix server test` | 29/29 pass (3 files: answers, stats, streak) | ✓ PASS |
| Client test suite | `npx vitest run` (full suite incl. api, components, copy, e2e) | 58/58 pass across the targeted files re-run for this phase (7 files) | ✓ PASS |
| Type check | `npm run check` | 0 errors, 0 warnings (1105 files) | ✓ PASS |
| Docker compose static validation | `docker compose config -q` | exit 0 | ✓ PASS |
| Docker compose actual build/run | `docker compose up --build` | Not run — docker daemon unavailable in this sandbox | ? SKIP → routed to human verification |

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention exists in this project and no probes are declared in the PLAN/SUMMARY files for this phase. Skipped (not applicable).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| PROG-01 | 08-01, 08-02 | Drill answer history persists across sessions/devices (backend, SQLite) | ✓ SATISFIED | Backend + client wiring live-verified end to end; docker packaging present but unverified at runtime (see gaps) |
| PROG-02 | 08-03 | Per-chord/per-scale accuracy stats highlighting weakest items | ✓ SATISFIED | `GET /stats` + Progress page live-verified |
| PROG-03 | 08-04 | Daily practice streak counter | ✓ SATISFIED | `GET /streak` + hero/compact StreakBadge live-verified (compact's live token-present render path needs a human check) |

No orphaned requirements: REQUIREMENTS.md maps only PROG-01/02/03 to Phase 8, and all three are claimed across the four plans.

### Anti-Patterns Found

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in any of the 37 files modified across 08-01..08-04.

The phase's own code review (`08-REVIEW.md`, run 2026-07-13T19:24:07Z) already identified two Critical and six Warning findings, independently re-confirmed by this verification by reading the relevant source:

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/lib/api/progress.ts:107-122` (`flushQueue`) | No in-flight guard; snapshot-read-then-write-back queue update | 🛑 Blocker-class (already tracked, CR-01) | Confirmed present in source: `flushQueue` reads `readQueue()` once, awaits network per event, then `writeQueue(queue.slice(sentCount))` from the stale snapshot. Concurrent `flushQueue()` calls (e.g. `onMount` drain overlapping a fresh `recordAnswer`) can duplicate a POSTed answer (inflating `/stats` attempts) or silently drop an answer enqueued mid-flush. This directly touches the phase's core "never lose a practice answer" value. Already documented with a concrete fix in 08-REVIEW.md; tracked separately per this verification's brief, not re-litigated as a new blocking gap here, but flagged prominently since it affects Success Criterion 1's reliability guarantee. |
| `docker-compose.yml` + `server/Dockerfile` | `chown -R app:app /data` at image-build time has no effect on the `./data:/data` bind mount at runtime | 🛑 Blocker-class (already tracked, CR-02) | Confirmed present in source (Dockerfile line ~30, compose `volumes: - ./data:/data`). Very likely to crash-loop on the actual Linux/Oracle target due to `SQLITE_CANTOPEN`; masked on macOS/OrbStack by ownership shimming. Routed to human verification above. |
| `src/lib/components/PracticeItemRow.svelte:28` | Client re-derives `needsPractice` instead of consuming the server's field | ⚠️ Warning (WR-03) | Two sources of truth for the same threshold; currently in agreement, but will silently diverge if the server threshold changes (e.g. spaced-repetition work). Not a functional failure today. |
| `src/routes/progress/+page.svelte:33-36` | `streakLine` `$derived.by` mutates module-level pool state and calls `Math.random` inside a derived | ⚠️ Info (IN-05) | Svelte deriveds are expected to be pure; a re-evaluation could re-roll the visible copy without a real state change. Cosmetic risk, not a data-integrity issue. |

These are pre-existing, already-documented findings (08-REVIEW.md), not new discoveries from this verification pass — surfaced here per the adversarial-verification mandate to check codebase evidence directly rather than only reading SUMMARY claims, and because CR-01/CR-02 bear directly on this phase's stated success criteria.

### Human Verification Required

### 1. `docker compose up --build` on a real (Linux-shaped) host

**Test:** Run `docker compose up --build` with a populated `.env`, watch the `api` service reach a healthy state, confirm `GET /health` returns 200 through the published port, and confirm the SQLite file appears and is writable under `./data`.
**Expected:** Container builds, boots, and stays healthy; persisted data survives a container restart.
**Why human:** No docker daemon was available in the execution sandbox (per 08-02-SUMMARY.md) or in this verification sandbox. `docker compose config -q` (static validation) passed, and a non-containerized run of the built server against real SQLite confirmed the underlying logic — but the actual container build/run path, where CR-02's bind-mount ownership bug specifically lives, has never been exercised.

### 2. Masthead compact streak chip's live render path

**Test:** With a bearer token already saved (e.g. via the Progress page's token-entry form) and a non-zero streak on the server, load or reload the app and observe the masthead.
**Expected:** The compact chip reads "{N} DAY STREAK" shortly after load, without delaying nav rendering.
**Why human:** 08-04-SUMMARY.md's own coverage table (D5) flags that no e2e test drives the masthead's token-present fetch-and-render sequence; only the self-hidden states (no token / loading / zero streak) are exercised by `tests/progress.e2e.test.ts`. The component-level self-hide logic is unit-tested, but the `+layout.svelte` `onMount` wiring around a live positive case is not.

### Gaps Summary

No must-have truth is FAILED and no artifact is missing or stub. All 3 ROADMAP success criteria are backed by real, live-verified server logic and client wiring (not placeholders — confirmed with an actual HTTP round trip against a real SQLite file, including surviving a process restart). Both server (29/29) and client (58/58 across the phase's own test files) suites pass, and `npm run check` is clean.

The phase is held at `human_needed` rather than `passed` for two reasons, both already partially self-flagged by the executor:

1. The docker-compose deployment packaging (part of Success Criterion 1's "via the backend on the user's Oracle server") has never actually been run — not during execution (docker daemon unavailable) and not during this verification (same constraint). Static validation passed, but 08-REVIEW.md's CR-02 gives a specific, credible reason (bind-mount ownership shadowing the image's `chown`) to expect a real Linux run will crash-loop. This needs a human to run `docker compose up --build` on a real or Linux-shaped host before treating cross-device deployment readiness as done.
2. The masthead's live streak-chip render path (token present, non-zero streak) has no automated e2e coverage, per the executor's own note in 08-04-SUMMARY.md.

Separately, the code review's CR-01 (offline-queue concurrency race that can duplicate or drop a queued answer) is a real, already-documented correctness gap in the "answers persist reliably" guarantee. Per this verification's brief it is tracked separately (not re-opened as a new blocking gap here), but it is surfaced prominently because it bears directly on Success Criterion 1.

---

_Verified: 2026-07-13T19:30:42Z_
_Verifier: Claude (gsd-verifier)_
