---
quick_id: 260725-1j9
slug: service-worker-no-cache-header
date: 2026-07-25
---

# Quick Task: no-cache header for /service-worker.js

## Description

Add a `no-cache` Cache-Control header for `/service-worker.js` in `nginx.conf`
so browsers always re-fetch the service worker script fresh. Fixes PWA update
detection stalling on installed (mobile) clients: the update flow in
`src/lib/pwa/swUpdate.svelte.ts` depends on the browser noticing a byte-changed
`/service-worker.js` on each load, which a cached copy prevents.

Known follow-up flagged in memory (pwa-phase22-device-verify-and-nginx).

## Task

- Add `location = /service-worker.js` block to `nginx.conf` before `location /`:
  - `add_header Cache-Control "no-cache, no-store, must-revalidate";`
  - `try_files $uri =404;`

## Verification

- Config syntax valid (standard nginx directives in server context).
- `nginx -t` in the container will validate on next deploy (docker daemon
  not running locally at authoring time).
