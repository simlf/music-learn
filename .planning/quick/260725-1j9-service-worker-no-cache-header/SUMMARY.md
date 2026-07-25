---
quick_id: 260725-1j9
slug: service-worker-no-cache-header
date: 2026-07-25
status: complete
---

# Summary: no-cache header for /service-worker.js

## What changed

`nginx.conf` — added a `location = /service-worker.js` block before
`location /`, serving the service worker with
`Cache-Control: no-cache, no-store, must-revalidate`.

## Why

The PWA update flow (`src/service-worker.ts`, `src/lib/pwa/swUpdate.svelte.ts`)
detects new deploys by the browser re-fetching a byte-changed
`/service-worker.js` on each load. Without an explicit no-cache header, a
cached SW script stalls update detection on installed mobile clients — the
known follow-up from Phase 22 (memory: pwa-phase22-device-verify-and-nginx).

## Verification

- Standard nginx directives in server context; syntactically valid.
- `nginx -t` not run locally (docker daemon offline at authoring time); the
  container's own startup validates on deploy.
- On-device confirmation (install PWA, deploy new build, confirm update
  prompt appears) remains an on-device check.
