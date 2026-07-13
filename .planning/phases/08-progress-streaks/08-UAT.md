---
status: complete
phase: 08-progress-streaks
source: [08-VERIFICATION.md]
started: 2026-07-13T19:35:00Z
updated: 2026-07-13T20:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. docker compose up --build on the real Linux target

expected: Run `docker compose up --build` with a real `.env` on the target (or a Linux VM). The api service builds, starts, stays healthy, and `GET /health` returns 200 through the published port. The SQLite file at `./data/music-learn.db` is created and writable.
result: pass
note: "Build passed. Container initially crash-looped: API_TOKEN unset (.env missing), config.ts fail-fast + restart: unless-stopped. Intended behavior, not a code gap. Fixed by creating .env per 08-USER-SETUP.md."

Note: never exercised (no docker daemon in sandbox). 08-REVIEW.md CR-02 predicts a likely failure on Linux: the `./data:/data` bind mount shadows the image's `chown app:app /data`, so the non-root app user may not be able to create the DB file (crash loop on SQLITE_CANTOPEN). If it fails this way, `chown` the host `./data` dir or fix per CR-02 before retesting.

### 2. Masthead streak chip renders after real fetch with stored token

expected: With the api service reachable and a bearer token saved via the Progress page token form, reload the app. The masthead shows "{N} DAY STREAK" shortly after load when the streak is 1 or more; it stays absent at 0/loading/error, and nav render is not blocked.
result: pass
note: "User did drills, stats visible, 1 DAY STREAK chip renders in masthead after reload. Setup detour: npm run preview (port 4173) blocked by CORS (allows 5173 only); npm run dev works."

Note: only the self-hide states are covered by tests (08-04 coverage D5); the token-present onMount fetch-and-render path in +layout.svelte has no e2e test.

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
