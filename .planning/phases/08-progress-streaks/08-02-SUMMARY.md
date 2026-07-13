---
phase: 08-progress-streaks
plan: 02
subsystem: api
tags: [fetch, localstorage, offline-queue, docker, docker-compose, svelte, vitest]

requires:
  - phase: 08-progress-streaks
    provides: "server/ Fastify+better-sqlite3 backend from 08-01: POST /answers (bearer auth + JSON-schema validation + SQLite insert), open GET /health"
provides:
  - "src/lib/api/client.ts: apiFetch bearer wrapper + getApiToken/setApiToken localStorage persistence"
  - "src/lib/api/progress.ts: recordAnswer (fire-and-forget, never-throw) + flushQueue (offline queue, oldest-first, stop-on-failure) + localDateString (local calendar date)"
  - "drills page wired end to end: every graded answer POSTs to the backend without touching drill-loop pacing; queued answers replay on load"
  - "docker-compose.yml + server/Dockerfile + .env.example: runnable docker compose packaging of the 08-01 backend"
affects: [08-03, 08-04, 09-deployment]

tech-stack:
  added: []
  patterns:
    - "Client-side localStorage persistence mirrors src/lib/lookup/recentLookups.ts's try/catch/never-throw shape verbatim (token storage, offline queue)"
    - "Fire-and-forget network call pattern: enqueue synchronously, then `void flushQueue()`, so the caller never awaits or blocks (D-04)"
    - "import.meta.env.VITE_API_BASE_URL resolves in both Vite and vitest without needing SvelteKit's $env virtual module"
    - "docker-compose env_file long-form (`path/required`) keeps `docker compose config` valid before a developer creates .env"

key-files:
  created:
    - src/lib/api/client.ts
    - src/lib/api/client.test.ts
    - src/lib/api/progress.ts
    - src/lib/api/progress.test.ts
    - docker-compose.yml
    - server/Dockerfile
    - server/.dockerignore
    - .env.example
  modified:
    - src/routes/drills/+page.svelte
    - tests/drills.e2e.test.ts
    - .gitignore

key-decisions:
  - "localDateString() uses getFullYear/getMonth/getDate (LOCAL time), never toISOString - resolves the UI-SPEC streak-boundary open question so day boundaries follow the user's local clock, not UTC"
  - "Offline queue is capped at 500 events (drop-oldest) to bound storage growth during an extended offline stretch (T-08-07 mitigation)"
  - "docker-compose.yml's env_file uses the long-form `path: ./.env, required: false` so `docker compose config -q` validates cleanly even before a developer has created .env (Rule 3 fix - see Deviations)"
  - "The item kind sent to the backend is always 'chord' this phase, regardless of question.kind (construction/identification are drill DIRECTIONS, not item kinds); scale items arrive in Phase 6"

patterns-established:
  - "recordAnswer/flushQueue offline-queue shape is the template for any future client-side write-with-retry (e.g. a future streak-nudge dismissal)"

requirements-completed: [PROG-01]

coverage:
  - id: D1
    description: "Client API module (client.ts + progress.ts): bearer-attaching fetch wrapper, fire-and-forget recordAnswer, offline queue that drains oldest-first and stops on first failure, local-calendar-date clientDate"
    requirement: PROG-01
    verification:
      - kind: unit
        ref: "src/lib/api/client.test.ts (5 tests: token round-trip, corrupt-storage resilience, Bearer header attachment, no-token omission)"
        status: pass
      - kind: unit
        ref: "src/lib/api/progress.test.ts (6 tests: local date string, synchronous never-throw recordAnswer, POST payload shape, offline enqueue + drain, stop-on-failure, full drain)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Drill loop wired to the backend: recordGrade fires an unawaited recordAnswer with { item, kind: 'chord', correct }; onMount drains the offline queue; existing drill-loop timing/behavior unchanged"
    requirement: PROG-01
    verification:
      - kind: e2e
        ref: "tests/drills.e2e.test.ts (19 tests total: all 16 pre-existing pinned-behavior cases plus 3 new - recordAnswer payload on correct answer, on wrong answer, and flushQueue called on mount)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Backend packaged for docker compose: multi-stage server/Dockerfile (pinned node:22-bookworm-slim, native build toolchain, non-root runtime user), docker-compose.yml api service with a /data volume and GET /health healthcheck, .env.example documenting every required env var"
    requirement: PROG-01
    verification:
      - kind: other
        ref: "docker compose config -q (validates service `api`, volumes -> target: /data, healthcheck present) - exits 0"
        status: pass
      - kind: manual_procedural
        ref: "Built server run directly (node dist/main.js, not containerized - Docker daemon unavailable in this execution sandbox) against a real file-backed SQLite DB: GET /health -> 200, authed POST /answers -> 201, unauthed POST -> 401 with no write, and the persisted row survives a process restart reading the same DB file"
        status: pass
    human_judgment: true
    rationale: "The Docker daemon is not running in this execution sandbox, so `docker compose up --build` itself was never exercised - only `docker compose config -q` (static validation) and a substitute non-containerized run of the built server against a real SQLite file (proving the underlying persistence/auth/health behavior). The container image build and its healthcheck have not been confirmed to actually work. The developer should run `docker compose up --build` once, real API_TOKEN in hand, and confirm the api service reports healthy."

duration: 10min
completed: 2026-07-13
status: complete
---

# Phase 8 Plan 02: Client Wiring, Offline Queue & Docker Packaging Summary

**Drill loop fire-and-forget-POSTs every graded answer through a new bearer-token client module with a localStorage offline queue, and the 08-01 backend now ships as a docker-compose `api` service with a pinned, non-root Dockerfile**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-13T18:42:00Z
- **Completed:** 2026-07-13T18:52:05Z
- **Tasks:** 3
- **Files modified:** 11 (8 created, 3 modified)

## Accomplishments

- `src/lib/api/client.ts` + `src/lib/api/progress.ts`: bearer-token fetch wrapper, fire-and-forget `recordAnswer`, and an offline queue (`flushQueue`) that drains oldest-first and stops on the first failure - all defensively try/catch'd, mirroring `recentLookups.ts`'s never-throw shape.
- `localDateString()` resolves the UI-SPEC's open streak-boundary question: clientDate is the browser's LOCAL calendar date, never a UTC slice.
- `src/routes/drills/+page.svelte`'s `recordGrade` now fires an unawaited `recordAnswer({ item: question.symbol, kind: 'chord', correct })` after its existing synchronous score/copy mutation - the drill loop's answer -> feedback -> Next pacing is untouched (D-04), and an `onMount` drains any queue left from a previous offline session.
- The project's first runnable deployment substrate: `docker-compose.yml` + `server/Dockerfile` (multi-stage, pinned `node:22-bookworm-slim`, native build toolchain for `better-sqlite3`, non-root runtime user) + `.env.example`. `docker compose config -q` validates the compose file; the SvelteKit app stays `adapter-static` (D-01 untouched).

## Task Commits

1. **Task 1: Client API module** - `a9b091d` (feat, TDD)
2. **Task 2: Wire recordGrade to recordAnswer, flush queue on load** - `6c3fecf` (feat, TDD)
3. **Task 3: Package the backend for docker compose** - `50e3037` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/lib/api/client.ts` - `getApiToken`/`setApiToken` (localStorage, never-throw) + `apiFetch` bearer-attaching fetch wrapper
- `src/lib/api/client.test.ts` - 5 unit tests
- `src/lib/api/progress.ts` - `recordAnswer`, `flushQueue`, `localDateString`, the client `AnswerEvent` type
- `src/lib/api/progress.test.ts` - 6 unit tests
- `src/routes/drills/+page.svelte` - imports `recordAnswer`/`flushQueue`; `recordGrade` fires the unawaited POST; `onMount` drains the queue
- `tests/drills.e2e.test.ts` - mocks `$lib/api/progress`; adds 3 new cases (recordAnswer payload on right/wrong answer, flushQueue-on-mount); all 16 pre-existing cases untouched and passing
- `docker-compose.yml` - `api` service: build `./server`, `/data` volume, GET `/health` healthcheck, `env_file` marked `required: false`
- `server/Dockerfile` - multi-stage build; pinned base image; native toolchain in build stage; non-root user + `CMD node dist/main.js` in runtime stage
- `server/.dockerignore` - excludes `node_modules`, `dist`, `test`, `*.db`, `.git`
- `.env.example` - documents `API_TOKEN`/`DB_PATH`/`PORT`/`HOST`/`CORS_ORIGIN`/`VITE_API_BASE_URL`, no real secret
- `.gitignore` - adds `/data/` so the mounted SQLite file is never committed

## Decisions Made

- `localDateString()` builds the date from `getFullYear`/`getMonth`/`getDate`, never `toISOString` - this is the one place a UTC slice would silently shift the calendar day near local midnight, and streak day-boundaries depend on getting this right.
- Offline queue capped at 500 events (drop-oldest) rather than left unbounded, so a multi-week offline stretch can't grow `localStorage` without limit.
- Item `kind` sent to the backend is always `'chord'` this phase; `question.kind` (`construction`/`identification`) is the drill *direction*, not the item kind, and is never conflated with it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `docker-compose.yml`'s `env_file: ./.env` broke `docker compose config -q` before a developer creates `.env`**
- **Found during:** Task 3 (running the plan's own verification command, `docker compose config -q`, with no `.env` present - the state of a fresh clone or CI)
- **Issue:** The plan's action text specified `env_file ./.env` (short form). Docker Compose's short-form `env_file` requires the referenced file to exist at parse time; since `.env` is gitignored and only created by the developer per `08-USER-SETUP.md`, `docker compose config -q` failed with `env file ... not found` on a fresh checkout - directly contradicting the plan's own acceptance criterion that this command must exit 0.
- **Fix:** Switched to the long-form `env_file: - path: ./.env, required: false`. `docker compose config -q` now validates cleanly with or without `.env` present; the `api` service still fails fast at runtime without `API_TOKEN` (enforced in `server/src/config.ts`'s `loadConfig`, from 08-01), so no security regression.
- **Files modified:** `docker-compose.yml`
- **Verification:** `rm -f .env && docker compose config -q` exits 0; `docker compose config` output confirms the `api` service, its `/data` volume, and its healthcheck are all still correctly defined.
- **Committed in:** `50e3037` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary so the plan's own literal verification command works on a fresh checkout, without weakening the runtime API_TOKEN requirement. No scope creep.

## Issues Encountered

- The execution sandbox's Docker daemon (OrbStack backend) is not running, so `docker compose up --build` itself could not be exercised end to end. Substitute verification performed instead: `docker compose config -q` (static validation, passing) plus running the *built* server directly with `node dist/main.js` (bypassing the container) against a real file-backed SQLite database at a temp path - confirmed `GET /health` returns 200, an authed `POST /answers` returns 201 and persists exactly one row, an unauthed `POST /answers` returns 401 and writes nothing, and the row survives reopening the same database file after the process restarts (equivalent to what the compose volume mount is for). This is flagged in the SUMMARY's `coverage` block (D3, `human_judgment: true`) so a human confirms `docker compose up --build` actually builds and reports healthy once Docker is available.

## User Setup Required

**External configuration required (carried over from 08-01, now also needed to run docker compose).** See [08-USER-SETUP.md](./08-USER-SETUP.md):
- `API_TOKEN`: developer-chosen shared secret, e.g. `openssl rand -hex 32`; copy `.env.example` to `.env` and fill it in.
- `VITE_API_BASE_URL`: URL where the browser can reach the `api` service (e.g. `http://localhost:8080` in dev).
- Run `docker compose up --build` and confirm `GET /health` returns 200 (this specific step - actually building and running the container - could not be verified in this execution sandbox; see Issues Encountered).

## Next Phase Readiness

- `src/lib/api/client.ts` / `src/lib/api/progress.ts` expose `getApiToken`/`setApiToken` ready for 08-03's token-entry UI, and `recordAnswer`'s payload shape is the exact contract 08-04's stats/streak endpoints will read back from.
- The docker-compose substrate (`api` service, `/data` volume) is ready for Phase 9's Oracle-server deployment; no Oracle-specific tooling was introduced (D-01).
- Blocker for real end-to-end runtime use only: a human needs to run `docker compose up --build` once Docker is available and confirm the healthcheck passes (see Issues Encountered / coverage D3).

## Self-Check: PASSED

- All 8 created files (`src/lib/api/client.ts`, `client.test.ts`, `progress.ts`, `progress.test.ts`, `docker-compose.yml`, `server/Dockerfile`, `server/.dockerignore`, `.env.example`) verified present on disk.
- Task commits `a9b091d`, `6c3fecf`, `50e3037` verified in `git log --oneline`.
- Plan-level verification re-run: `npx vitest run src/lib/api tests/drills.e2e.test.ts` -> 3 files, 30 tests, all passing; `docker compose config -q` exits 0 with and without `.env` present; `svelte.config.js` still imports `adapter-static`.

---
*Phase: 08-progress-streaks*
*Completed: 2026-07-13*
