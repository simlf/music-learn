---
phase: 08-progress-streaks
plan: 01
subsystem: api
tags: [fastify, better-sqlite3, bearer-auth, vitest, tdd, backend]

requires:
  - phase: 03-on-screen-drill-loop
    provides: "recordGrade(correct) drill hook whose graded answers this backend will persist (client wiring lands in 08-02)"
provides:
  - "Standalone server/ Fastify service: POST /answers (bearer auth + JSON-schema validation + SQLite insert) and open GET /health"
  - "SQLite answers table (raw per-event rows with created_at + client_date) via createStore(path) with :memory: test support"
  - "bearerAuth(apiToken) timing-safe preHandler factory reusable for later /stats and /streak routes"
  - "loadConfig(env) fail-fast config loader (API_TOKEN mandatory, sane defaults for DB_PATH/PORT/HOST/CORS_ORIGIN)"
affects: [08-02, 08-03, 08-04, 09-deployment, spaced-repetition-v1.x]

tech-stack:
  added: [fastify 5.10.0, "@fastify/cors 11.3.0", better-sqlite3 12.11.1, tsx, "vitest 4.1.10 (server-side)"]
  patterns:
    - "Dependency-injected Fastify factory buildApp({ store, apiToken, corsOrigin }); only main.ts listens"
    - "Encapsulated Fastify plugin context carries the bearer preHandler; /health registered outside it stays open"
    - "Prepared, parameterized SQLite statements only; no string-interpolated SQL"
    - "Server package mirrors root conventions: exact-pinned runtime deps, TypeScript 6.x, plain function modules"

key-files:
  created:
    - server/package.json
    - server/tsconfig.json
    - server/vitest.config.ts
    - server/.gitignore
    - server/src/config.ts
    - server/src/db.ts
    - server/src/auth.ts
    - server/src/index.ts
    - server/src/main.ts
    - server/src/routes/answers.ts
    - server/test/answers.test.ts
  modified: []

key-decisions:
  - "Overrode Fastify's Ajv default removeAdditional:true with false so additionalProperties:false rejects unknown body fields with 400 instead of silently stripping them"
  - "Added Content-Type to CORS allowedHeaders alongside Authorization: browsers preflight JSON POSTs with it, so client fetches would fail CORS otherwise"
  - "Dropped deprecated Fastify disableRequestLogging option (removed in fastify@6); logger:false already disables all logging including request bodies"
  - "Auth ordering note: Fastify runs schema validation before preHandler, so a malformed body on an unauthenticated request yields 400 rather than 401; authenticated-path behavior is unaffected"

patterns-established:
  - "buildApp DI factory: tests inject in-memory store + known token via app.inject, no socket"
  - "server/src modules use NodeNext .js-extension relative imports so tsc build and vitest share one style"

requirements-completed: [PROG-01]

coverage:
  - id: D1
    description: "Valid authed POST /answers returns 201 and persists exactly one raw row with item, kind, correct, created_at (ISO), client_date"
    requirement: PROG-01
    verification:
      - kind: integration
        ref: "server/test/answers.test.ts#returns 201 and persists exactly one raw answer row"
        status: pass
    human_judgment: false
  - id: D2
    description: "Missing or wrong bearer token yields 401 with nothing written (D-03 trust boundary)"
    requirement: PROG-01
    verification:
      - kind: integration
        ref: "server/test/answers.test.ts#returns 401 with no Authorization header and writes nothing"
        status: pass
      - kind: integration
        ref: "server/test/answers.test.ts#returns 401 with a wrong bearer token and writes nothing"
        status: pass
    human_judgment: false
  - id: D3
    description: "Malformed bodies (bad kind, missing field, unknown extra field, wrong clientDate format) yield 400 with nothing written"
    requirement: PROG-01
    verification:
      - kind: integration
        ref: "server/test/answers.test.ts#POST /answers (body validation) — 4 cases"
        status: pass
    human_judgment: false
  - id: D4
    description: "GET /health returns 200 without auth for container liveness probing"
    verification:
      - kind: integration
        ref: "server/test/answers.test.ts#returns 200 without any Authorization header"
        status: pass
    human_judgment: false
  - id: D5
    description: "SvelteKit app remains adapter-static; all server code isolated under server/ (D-01)"
    verification:
      - kind: other
        ref: "grep adapter-static svelte.config.js (unchanged) + git diff scope limited to server/"
        status: pass
    human_judgment: false

duration: 7min
completed: 2026-07-13
status: complete
---

# Phase 8 Plan 01: Backend Answer-Persistence Service Summary

**Standalone Fastify + better-sqlite3 service under server/: bearer-guarded POST /answers persisting raw answer rows (created_at + client_date) to a SQLite answers table, open GET /health, integration-tested end to end via TDD**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-13T18:33:42Z
- **Completed:** 2026-07-13T18:40:19Z
- **Tasks:** 3 (1 checkpoint + 2 TDD auto tasks)
- **Files modified:** 12 (11 source/config files + package-lock.json)

## Accomplishments

- First backend footprint of the repo: `server/` standalone package (D-01, app stays adapter-static), exact-pinned deps, TS 6.x NodeNext, vitest suite.
- Raw-event storage substrate (D-02): `answers` table with CHECK-constrained kind/correct, per-event rows carrying both server ISO timestamp and browser-local calendar date, parameterized prepared statements, `:memory:` support for tests.
- Bearer-token trust boundary (D-03): `bearerAuth` preHandler using `timingSafeEqual` behind a length guard, scoped via an encapsulated plugin context so `/health` stays open.
- Full HTTP-to-SQLite integration coverage: 8 tests exercising 201-persist, 401-no-write, 400-no-write (4 malformed-body shapes), and open health probe — all green.

## Task Commits

1. **Task 1: Package legitimacy gate** - checkpoint (no commit); user approved all seven packages against npmjs.com.
2. **Task 2 (RED): Scaffold + failing integration test** - `5fe3fc1` (test)
3. **Task 3 (GREEN): buildApp, POST /answers, /health, entrypoint** - `8aac7e2` (feat)

No REFACTOR commit was needed; GREEN implementation was already minimal and clean.

## Files Created/Modified

- `server/package.json` - Standalone ESM package; exact-pinned fastify/@fastify/cors/better-sqlite3; test/dev/build/start scripts
- `server/tsconfig.json` - NodeNext, ES2022, strict, dist output
- `server/vitest.config.ts` - node environment, test/** include
- `server/.gitignore` - node_modules, dist, *.db, *.db-*
- `server/src/config.ts` - `loadConfig(env)`: throws without API_TOKEN; defaults for DB_PATH/PORT/HOST/CORS_ORIGIN/NODE_ENV
- `server/src/db.ts` - `createStore(path)`: schema + indexes, insertAnswer/getAllAnswers/close, AnswerEvent/AnswerRow types
- `server/src/auth.ts` - `bearerAuth(apiToken)` timing-safe preHandler factory
- `server/src/index.ts` - `buildApp({ store, apiToken, corsOrigin })`: bodyLimit 4096, generic error handler, CORS, open /health, guarded /answers
- `server/src/main.ts` - Runtime entrypoint; the only file that calls app.listen
- `server/src/routes/answers.ts` - POST /answers with strict route JSON schema, 201 { ok: true }
- `server/test/answers.test.ts` - 8 integration tests via app.inject against createStore(':memory:')

## Decisions Made

- Fastify's Ajv must be configured with `removeAdditional: false` for `additionalProperties: false` to reject (default strips silently) — see deviations.
- 401 tests use valid bodies: Fastify runs schema validation before preHandler, so unauthenticated + malformed requests return 400 first. Auth still fully guards every write path.
- DB errors propagate (surfacing as generic 500s) rather than being swallowed: the client-side never-throw persistence style (recentLookups.ts) is echoed in module shape only, since a failed write must not report 201.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fastify default Ajv stripped unknown body fields instead of rejecting them**
- **Found during:** Task 3 (GREEN run: unknown-extra-field test got 201, expected 400)
- **Issue:** Fastify ships Ajv with `removeAdditional: true`, which deletes properties not in the schema before validation, so `additionalProperties: false` never fires
- **Fix:** Set `ajv.customOptions.removeAdditional = false` in buildApp
- **Files modified:** server/src/index.ts
- **Verification:** Unknown-extra-field test now returns 400 with no write; full suite green
- **Committed in:** 8aac7e2 (Task 3 commit)

**2. [Rule 3 - Blocking] Added @types/node devDependency (not in the plan's package list)**
- **Found during:** Task 2 (tsc cannot type node:crypto/node:fs/process without it under NodeNext)
- **Issue:** Compilation of the server package requires Node type definitions
- **Fix:** Added `@types/node ^24.0.0` — same package and range already vetted in the root package.json, so no new-to-project package crossed the Task 1 legitimacy gate
- **Files modified:** server/package.json, server/package-lock.json
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** 5fe3fc1 (Task 2 commit)

**3. [Rule 2 - Missing Critical] Added Content-Type to CORS allowedHeaders**
- **Found during:** Task 3 (plan specified allowed header Authorization only)
- **Issue:** Browsers preflight `application/json` POSTs with `Content-Type` in Access-Control-Request-Headers; without it every client answer POST in 08-02 would fail CORS
- **Fix:** `allowedHeaders: ['Authorization', 'Content-Type']`
- **Files modified:** server/src/index.ts
- **Verification:** Suite green; header list inspected
- **Committed in:** 8aac7e2 (Task 3 commit)

**4. [Rule 1 - Bug] Replaced deprecated disableRequestLogging option**
- **Found during:** Task 3 (Fastify 5.10 FSTDEP023 deprecation warning; option removed in fastify@6)
- **Issue:** Plan asked for request-body logging disabled; the named option is deprecated
- **Fix:** Removed the flag — `logger: false` already disables all logging including request bodies; documented the constraint in a comment for any future logger enablement
- **Files modified:** server/src/index.ts
- **Verification:** No deprecation warning; suite green
- **Committed in:** 8aac7e2 (Task 3 commit)

---

**Total deviations:** 4 auto-fixed (2 bugs, 1 blocking, 1 missing critical)
**Impact on plan:** All fixes necessary for the plan's own contracts (strict validation, working CORS for the 08-02 client, clean compilation). No scope creep.

## Authentication Gates

None.

## Known Stubs

None. The service is fully functional end to end; deliberately deferred surface (Docker packaging, client wiring, /stats, /streak) belongs to plans 08-02..08-04 by design.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

**External configuration required.** See [08-USER-SETUP.md](./08-USER-SETUP.md):
- `API_TOKEN` env var: developer-chosen shared secret (e.g. `openssl rand -hex 32`); server refuses to boot without it.

## Next Phase Readiness

- `buildApp` / `createStore` / `bearerAuth` are ready for 08-02 (Docker packaging + client wiring) and expose the exact seams 08-03/08-04 need for /stats and /streak.
- The encapsulated auth plugin context means later authenticated routes register inside it with zero auth rework.
- Blocker for runtime use only: API_TOKEN must be chosen by the developer (08-USER-SETUP.md); tests are self-contained and unaffected.

## Self-Check: PASSED

- All 11 created files plus server/package-lock.json verified present on disk.
- Task commits 5fe3fc1 (test) and 8aac7e2 (feat) verified in git log; TDD RED→GREEN gate sequence intact.
- Plan verification re-run: 8/8 tests pass, svelte.config.js still adapter-static, lockfile committed.

---
*Phase: 08-progress-streaks*
*Completed: 2026-07-13*
