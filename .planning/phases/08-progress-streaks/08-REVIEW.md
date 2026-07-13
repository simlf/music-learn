---
phase: 08-progress-streaks
reviewed: 2026-07-13T19:24:07Z
depth: standard
files_reviewed: 35
files_reviewed_list:
  - server/package.json
  - server/src/auth.ts
  - server/src/config.ts
  - server/src/db.ts
  - server/src/index.ts
  - server/src/main.ts
  - server/src/routes/answers.ts
  - server/src/routes/stats.ts
  - server/src/routes/streak.ts
  - server/src/stats.ts
  - server/src/streak.ts
  - server/test/answers.test.ts
  - server/test/stats.test.ts
  - server/test/streak.test.ts
  - server/tsconfig.json
  - server/vitest.config.ts
  - src/lib/api/client.test.ts
  - src/lib/api/client.ts
  - src/lib/api/progress.test.ts
  - src/lib/api/progress.ts
  - src/lib/components/AccuracyTable.svelte
  - src/lib/components/Button.svelte
  - src/lib/components/PracticeItemRow.svelte
  - src/lib/components/StreakBadge.svelte
  - src/lib/components/progressComponents.test.ts
  - src/lib/components/streakBadge.test.ts
  - src/lib/copy/streak.test.ts
  - src/lib/copy/streak.ts
  - src/routes/+layout.svelte
  - src/routes/drills/+page.svelte
  - src/routes/progress/+page.svelte
  - tests/drills.e2e.test.ts
  - tests/progress.e2e.test.ts
  - docker-compose.yml
  - server/Dockerfile
findings:
  critical: 2
  warning: 6
  info: 8
  total: 16
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-07-13T19:24:07Z
**Depth:** standard
**Files Reviewed:** 35
**Status:** issues_found

## Summary

Reviewed the new standalone Fastify/better-sqlite3 backend (auth, config, store, three routes, pure stats/streak modules), the client API layer (bearer-token fetch wrapper, offline answer queue), the Progress page and streak UI components, the drills-page persistence wiring, and the docker compose deployment.

The server core is in good shape: parameterized SQL throughout, strict route schemas with `removeAdditional: false` correctly overridden (and tested), timing-safe token comparison, an encapsulated auth context that leaves only `/health` open, and pure, well-tested stats/streak computations. The trust-boundary test coverage (401/400 with no-write assertions) is solid.

Two Critical issues remain. First, the offline answer queue has a concurrency bug that can both duplicate answers on the server and permanently lose queued answers — this is in the core persistence path exercised on every graded drill answer. Second, the docker deployment as written will almost certainly crash-loop on the target Linux server because the bind-mounted `./data` directory will not be writable by the container's non-root user. Several warnings follow: a poison-message flaw in the queue, a client/server duplication of the needs-practice threshold, an unrecoverable wrong-token UI state, a `PORT` env-leak that breaks the compose port mapping, devDependencies shipped in the runtime image contrary to the Dockerfile's own comment, and cleartext bearer-token transport.

## Critical Issues

### CR-01: Concurrent `flushQueue` runs duplicate answers on the server and can permanently lose queued answers

**File:** `src/lib/api/progress.ts:95-122`
**Issue:** `recordAnswer()` synchronously enqueues, then fires an unawaited `flushQueue()`. There is no in-flight guard, and `flushQueue` operates on a snapshot: it does `const queue = readQueue()` once, awaits network calls, then blindly writes back `queue.slice(sentCount)`. Two realistic failure modes:

1. **Duplicate rows.** Flush A reads `[e1]` and starts POSTing `e1`. Before it resolves, the user answers the next question: `recordAnswer` enqueues `e2` (queue is now `[e1, e2]`) and starts flush B, which reads `[e1, e2]` and POSTs `e1` again. `e1` lands twice in SQLite, silently inflating `attempts` in `/stats` and corrupting accuracy — there is no server-side dedup (no client event id, no uniqueness constraint in `db.ts`).
2. **Lost answers.** Flush A reads snapshot `[e1]`, and while `await apiFetch` is in flight, `enqueue(e2)` writes `[e1, e2]` to localStorage. Flush A completes and executes `writeQueue(queue.slice(1))` — i.e. writes `[]` from its *stale* snapshot. `e2` is erased from storage without ever being sent. Data loss in the feature whose entire point is that no graded answer is lost.

The drills page makes this likely in practice: `onMount` fires `flushQueue()` (draining a possibly long backlog) while the user immediately starts answering, and each answer fires its own flush; any network latency overlapping a grade triggers the race.

**Fix:** Serialize flushing with a module-level guard and re-read storage per event instead of operating on a snapshot:
```ts
let flushing = false;

export async function flushQueue(): Promise<void> {
	if (flushing) return;
	flushing = true;
	try {
		while (true) {
			const queue = readQueue();
			if (queue.length === 0) return;
			const [head, ...rest] = queue;
			try {
				const response = await apiFetch('/answers', { method: 'POST', body: head });
				if (!response.ok) return;
			} catch {
				return;
			}
			// Re-read so events enqueued during the await are preserved.
			writeQueue(readQueue().slice(1));
		}
	} finally {
		flushing = false;
	}
}
```
(Longer term, an idempotency key per event plus a server-side unique constraint would also close the duplicate window across page reloads mid-POST.)

### CR-02: Bind-mounted `./data` is not writable by the container's non-root user — server crash-loops on the Linux deploy target

**File:** `docker-compose.yml:19-20`, `server/Dockerfile:30-38`
**Issue:** The Dockerfile creates a system user `app` (uid assigned by `useradd --system`, typically 999) and does `RUN mkdir -p /data && chown -R app:app /data` — but the compose file bind-mounts `./data:/data`, which **shadows** the image's `/data` at runtime with the host directory's ownership. On the Linux deploy server (this app deploys via plain docker compose on an Oracle Linux box), `./data` will either be auto-created by Docker as root-owned or pre-created by the operator with their own uid; in both cases uid 999 (`app`) has no write permission. Startup then follows this chain: `createStore('/data/music-learn.db')` → `mkdirSync('/data')` succeeds (exists) → `new Database(...)` throws `SQLITE_CANTOPEN` → the module-level `createStore` call in `main.ts:11` throws → process exits → `restart: unless-stopped` → crash loop. The `chown` in the Dockerfile gives false confidence: it has no effect on the mounted volume. This works on Docker Desktop (macOS ownership shimming) and breaks exactly in production.
**Fix:** Either fix ownership at the mount, or use a named volume. Simplest robust option with the bind mount, pin the runtime uid and document the host-side chown:
```dockerfile
RUN groupadd --system --gid 10001 app && useradd --system --uid 10001 --gid app app
```
plus a documented `sudo chown -R 10001:10001 ./data` in 08-USER-SETUP.md — or switch to a named volume, which Docker initializes with the image's `/data` ownership:
```yaml
volumes:
  - api-data:/data
volumes:
  api-data:
```

## Warnings

### WR-01: A permanently-rejected queue entry blocks the entire answer queue (poison message)

**File:** `src/lib/api/progress.ts:60-69, 107-122`
**Issue:** `readQueue()` casts the parsed JSON to `QueuedAnswerEvent[]` without validating elements, and `flushQueue` treats every `!response.ok` identically: `break` and retry later. A queue entry the server will *always* 400 (corrupt localStorage, hand-edited storage, or schema drift — e.g. a payload shape from an older client version rejected by `additionalProperties: false`) sits at the head forever. Every flush breaks at index 0; every subsequent valid answer queues behind it and is never sent, until the 500-entry cap starts silently evicting — a slow-motion loss of up to ~500 answers with zero user-visible signal.
**Fix:** Distinguish permanent from transient failures: on a 4xx response, drop the event and continue; only `break` on network errors and 5xx:
```ts
if (!response.ok) {
	if (response.status >= 400 && response.status < 500) {
		// Permanently rejected: discard and keep draining.
		writeQueue(readQueue().slice(1));
		continue;
	}
	return; // transient (5xx): retry later
}
```
Optionally also validate entry shape in `readQueue` and filter out non-conforming elements.

### WR-02: `PORT` in `.env` leaks into the container via `env_file`, breaking the port mapping and healthcheck

**File:** `docker-compose.yml:12-18`, `server/src/config.ts:30`
**Issue:** The compose file both interpolates `${PORT:-8080}` for the *host* side of the mapping and injects the entire `.env` into the container via `env_file`. If the operator sets `PORT=9000` in `.env` (the natural way to change the exposed port, since the compose file references `PORT`), the server inside the container reads `env.PORT` and listens on 9000 — but the mapping still targets container port `8080` and the healthcheck still probes `localhost:8080`. Result: container reported unhealthy and the API unreachable, with no obvious cause.
**Fix:** Pin the in-container port explicitly; `environment` takes precedence over `env_file`:
```yaml
environment:
  DB_PATH: /data/music-learn.db
  PORT: 8080
```

### WR-03: `needsPractice` threshold duplicated in the client instead of using the server-computed field

**File:** `src/lib/components/PracticeItemRow.svelte:28` (vs `server/src/stats.ts:50`)
**Issue:** The server computes and returns `needsPractice` on every `StatItem` (and D-02's stated rule is that the client never re-derives), yet `PracticeItemRow` ignores that field and re-derives it locally: `item.attempts >= 3 && item.accuracy < 0.7`. The threshold now lives in two codebases (plus the magic `3` is unnamed in both, unlike `ACCURACY_THRESHOLD`). If the server threshold ever changes (spaced-repetition work in v1.x is explicitly anticipated), the Weakest Spots shortlist (server-decided) and the row accent (client-decided) will disagree on the same screen.
**Fix:** Add `needsPractice: boolean` to the component's `PracticeItem` interface and use it directly:
```ts
const isWeak = $derived(item.needsPractice);
```
The callers (`AccuracyTable`, Progress page) already receive `StatItem` objects that carry the field.

### WR-04: A wrong or revoked token is unrecoverable through the UI — 401 collapses into the generic network-error state

**File:** `src/routes/progress/+page.svelte:38-61`, `src/lib/api/progress.ts:129-148`
**Issue:** The token-entry branch renders only when `getApiToken() === ''`. Once *any* token is stored, a 401 from the server (typo'd token, rotated `API_TOKEN`) is indistinguishable from a network outage: `fetchStats` throws a generic `Error('Failed to fetch stats')`, the page shows "Couldn't reach the ledger... Check your connection" — copy that actively misdirects the user — and "Try Again" can never succeed. There is no path back to the token-entry form short of manually clearing localStorage in devtools. For a token that is "entered once per device" (D-03), the one failure mode that will actually happen (mistyping it) is a dead end.
**Fix:** Surface the status. E.g. have `fetchStats`/`fetchStreak` throw a typed error carrying `response.status`, and in `load()`:
```ts
} catch (e) {
	pageState = e instanceof ApiError && e.status === 401 ? 'token-missing' : 'error';
}
```
(Optionally clear the stored token when entering `token-missing` from a 401 so the form doesn't silently reuse the bad one.)

### WR-05: Runtime image ships full devDependencies despite the Dockerfile claiming "pruned node_modules"

**File:** `server/Dockerfile:19,33` (comment at line 5)
**Issue:** The build stage runs plain `npm ci` (installing `tsx`, `typescript`, `vitest`, `@types/*`), and the runtime stage copies that whole `node_modules` verbatim. The header comment claims the runtime stage carries "pruned node_modules", which is not what the code does. Beyond image bloat, shipping a TypeScript runner (`tsx`) and a test framework into an internet-facing production container needlessly widens the supply-chain/attack surface the same comment says it is mitigating (T-08-SC).
**Fix:** Prune before the copy:
```dockerfile
RUN npm run build && npm prune --omit=dev
```
(better-sqlite3's compiled binary in `node_modules` survives `npm prune`; only devDependencies are removed.)

### WR-06: Bearer token transits in cleartext — no TLS in the declared deployment

**File:** `docker-compose.yml:17-18`, `server/src/config.ts:31`
**Issue:** This compose file *is* the deployment (D-01): the API binds `0.0.0.0` and is published directly on the host port with nothing terminating TLS in front of it. Every request from phone/laptop to the internet-facing Oracle server carries the shared-secret `Authorization: Bearer ...` header in plaintext HTTP — the single credential protecting all endpoints (T-08-01's careful timing-safe comparison is moot if the token is sniffable in transit). Additionally, once the static frontend is served over HTTPS (Phase 9), browsers will block these `http://` API calls as mixed content, so the plain-HTTP setup breaks functionally too.
**Fix:** Front the API with a TLS-terminating reverse proxy (Caddy is the lowest-effort in a compose file — automatic Let's Encrypt) and stop publishing 8080 directly. If TLS is explicitly deferred to Phase 9, record that as an accepted interim risk in the phase docs and bind the published port to localhost (`127.0.0.1:8080:8080`) until the proxy lands.

## Info

### IN-01: `PORT` env var is not validated — `Number(garbage)` is NaN

**File:** `server/src/config.ts:30`
**Issue:** `port: Number(env.PORT ?? 8080)` silently produces `NaN` for a malformed `PORT`, failing later inside `listen()` with a less actionable error than the deliberate `API_TOKEN` guard above it.
**Fix:** Validate: `const port = Number(env.PORT ?? 8080); if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(...)`.

### IN-02: Date regexes accept semantically invalid dates (e.g. `2026-99-99`)

**File:** `server/src/routes/answers.ts:22`, `server/src/routes/streak.ts:17`, `server/src/streak.ts:25-33`
**Issue:** `^\d{4}-\d{2}-\d{2}$` admits month 99 / day 99. `previousDate` then silently rolls the overflow through `Date.UTC`, so `/streak?today=2026-99-99` computes against fabricated calendar labels, and nonsense `clientDate` values persist into the event history that future spaced-repetition work will consume. No crash, but garbage-in is accepted at a validated boundary.
**Fix:** After the pattern check, round-trip validate: parse the components, rebuild the string from the `Date`, and reject on mismatch (or tighten the pattern to `-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])`).

### IN-03: Zero observability: no logger and an error handler that swallows everything

**File:** `server/src/index.ts:32, 52-61`
**Issue:** `logger: false` plus an error handler that returns only generic bodies means a failing DB write (disk full, the CR-02 permission failure after first boot, corrupted file) produces 500s with no trace anywhere — `docker logs` shows nothing. The privacy goal (T-08-04: no request bodies in logs) does not require discarding error *events*.
**Fix:** In the error handler, `console.error(error instanceof Error ? error.message : error)` (message/stack only, never request contents) before sending the generic body.

### IN-04: No graceful shutdown — `store.close()` is never called

**File:** `server/src/main.ts`
**Issue:** No SIGTERM/SIGINT handling; on `docker stop`, Node's default handler kills the process without `app.close()`/`store.close()`. SQLite's journal makes this safe in practice, but a two-line handler removes the reliance on crash recovery.
**Fix:** `process.on('SIGTERM', async () => { await app.close(); store.close(); process.exit(0); });`

### IN-05: Impure `$derived.by` — `streakLine` mutates module state and calls `Math.random`

**File:** `src/routes/progress/+page.svelte:33-36`
**Issue:** `pickStreakLine` mutates `lastIndices` and draws randomness inside a `$derived.by`. Deriveds are expected to be pure; Svelte is free to re-evaluate them, which would re-roll the visible copy line without any user-meaningful state change.
**Fix:** Pick the line imperatively where the streak result lands (inside `load()`'s success path) and store it in a plain `$state<string>`.

### IN-06: `API_BASE` silently falls back to `http://localhost:8080` in production builds

**File:** `src/lib/api/client.ts:18-19`
**Issue:** If `VITE_API_BASE_URL` is unset at build time, the deployed static app quietly points every API call at the user's own machine — the failure mode is a mystifying "Couldn't reach the ledger" rather than a build-time error.
**Fix:** In production builds, fail loudly: `if (import.meta.env.PROD && !import.meta.env.VITE_API_BASE_URL) throw new Error('VITE_API_BASE_URL must be set for production builds');` (or at minimum guard with `import.meta.env.DEV` for the localhost default).

### IN-07: Masthead streak chip never refreshes within a session

**File:** `src/routes/+layout.svelte:29-43`
**Issue:** The layout's `onMount` runs once per app session; after the user practices (or saves a token on the Progress page), the compact chip stays stale/hidden until a full reload. Acceptable for this phase, but worth a follow-up (e.g. re-fetch on navigation or after a successful `flushQueue`).
**Fix:** Track as a known limitation or re-fetch on `$page` navigation changes.

### IN-08: Access-key input is a visible `type="text"` field

**File:** `src/routes/progress/+page.svelte:79-84`
**Issue:** The shared secret renders in cleartext while typed. Single-user app, low risk, but `type="password"` (with `autocomplete="off"`) is free.
**Fix:** `<input type="password" autocomplete="off" ... />`

---

_Reviewed: 2026-07-13T19:24:07Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
