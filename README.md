# Music Learn

Jazz piano theory companion. Deployment is described in [docs/DEPLOY.md](docs/DEPLOY.md).

## Run locally

Requires Node 22 (the version CI uses) and npm.

```sh
npm ci
npm run dev          # http://localhost:5173
npm test             # unit tests (Vitest)
npm run check        # type check (svelte-check)
npm run test:e2e:install   # once: Playwright's Chromium
npm run test:e2e     # e2e: builds, then serves on port 4173
npm run build        # static site in build/
npm run preview      # serve the build
```

No env vars or services are needed: progress lives in the browser
(IndexedDB). The optional answer-sync API lives in `server/` and needs
`API_TOKEN`; the app looks for it at `VITE_API_BASE_URL`
(default `http://localhost:8080`):

```sh
cd server && npm ci
API_TOKEN=dev-token npm run dev   # http://localhost:8080/health
npm test
```

## CI cost

Tests (`ci`, `visual`) run on pull requests only, not again on push to `main`.
The `deploy` workflow on `main` starts with a no-op `debounce` job bound to the
`main-debounce` environment. That job's concurrency group cancels an older run
still waiting there, so a burst of merges deploys once, for the last merge.
A running build or deploy is never cancelled: `build-push` and `deploy` each
have their own non-cancelling group, so a newer run queues behind an in-flight
one, and a newer pending job may replace an older pending one (it ships the
newer image tag). A push-triggered `deploy` skips its SSH step, yet still ends
green, when `main` already holds a newer commit touching non-doc files; check
the "Skip if a newer commit" step log before assuming a green run deployed.

The `main-debounce` environment must have a 10-minute wait timer (a wait uses
no runner minutes). Set it once:

```sh
gh api -X PUT repos/<owner>/<repo>/environments/main-debounce -F wait_timer=10
```
