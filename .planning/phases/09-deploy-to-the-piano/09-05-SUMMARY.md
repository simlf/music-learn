---
phase: 09-deploy-to-the-piano
plan: 05
subsystem: infra
tags: [pwa, web-app-manifest, sveltekit, adapter-static]

# Dependency graph
requires:
  - phase: 09-deploy-to-the-piano
    provides: Print Shop palette tokens in app.css (--color-ink, --color-paper) reused for manifest colors
provides:
  - "static/manifest.webmanifest — valid standalone web app manifest with Print Shop theme/background colors and a full icon set"
  - "Print Shop app icons (SVG master + 192/512/maskable-512 PNGs) under static/icons/"
  - "app.html <head> links (manifest, theme-color, apple-touch-icon) enabling Add to Home Screen"
  - "tests/manifest.test.ts validating manifest shape and icon-file existence"
affects: [deployment, phase-09-remaining-plans]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Minimal PWA manifest with no service worker/offline caching (D-07) — install/standalone chrome removal only"
    - "Manifest and app.html colors sourced directly from existing app.css palette tokens, never new hex values"

key-files:
  created:
    - static/manifest.webmanifest
    - static/icons/icon.svg
    - static/icons/icon-192.png
    - static/icons/icon-512.png
    - static/icons/maskable-512.png
    - tests/manifest.test.ts
  modified:
    - src/app.html

key-decisions:
  - "Manifest theme_color/background_color reuse app.css's --color-ink (#221e17) and --color-paper (#f2ecdd) exactly, per D-07 discretion constraint"
  - "No service worker or vite-plugin-pwa added — manifest-only PWA per D-07"

patterns-established:
  - "Pattern: static/ PWA assets (manifest + icons) ship via adapter-static's default static-file copy with no build config changes"

requirements-completed: [PLAT-01]

coverage:
  - id: D1
    description: "Valid web app manifest (name, short_name, start_url, display standalone, theme_color, background_color, icons) referencing Print Shop icons that all exist on disk"
    requirement: "PLAT-01"
    verification:
      - kind: unit
        ref: "tests/manifest.test.ts"
        status: pass
      - kind: integration
        ref: "npm run build (manifest + icons ship under build output root)"
        status: pass
    human_judgment: false
  - id: D2
    description: "app.html head links (manifest, theme-color, apple-touch-icon) present with no service worker added"
    requirement: "PLAT-01"
    verification:
      - kind: unit
        ref: "tests/manifest.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Add to Home Screen opens the app standalone (no browser chrome) with the correct Print Shop icon and theme tint"
    verification: []
    human_judgment: true
    rationale: "Standalone install behavior can only be confirmed visually on a device; developer approved manifest/icon correctness during this checkpoint, with the real-device install itself deferred to the user's HTTPS deployment step (PLAT-02, out of scope for this plan)."

# Metrics
duration: 10min
completed: 2026-07-14
status: complete
---

# Phase 09 Plan 05: Minimal PWA Manifest Summary

**Web app manifest + Print Shop icon set + app.html head links so Add to Home Screen opens the app standalone, with no offline service worker (D-07)**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-13T23:50:00Z (approx)
- **Completed:** 2026-07-14T00:00:29+02:00
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 7

## Accomplishments
- Valid `static/manifest.webmanifest` with standalone display, Print Shop theme/background colors drawn from existing app.css tokens, and a full icon set (192, 512, maskable-512)
- Print Shop app icon set created under `static/icons/` (SVG master + rasterized PNGs)
- `src/app.html` `<head>` now links the manifest, sets `theme-color`, and provides an `apple-touch-icon` — no service worker added
- `tests/manifest.test.ts` validates manifest JSON shape and confirms every referenced icon file exists on disk
- Developer approved the checkpoint: icon rendering and manifest correctness confirmed; the real-device standalone install check is explicitly deferred to the user's own HTTPS deployment step (PLAT-02)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the manifest, Print Shop icons, and app.html head links (with a validity test)** - `20da675` (feat)
2. **Task 2: Human verify — Add to Home Screen opens standalone** - approved by developer, no code changes (checkpoint only)

**Plan metadata:** (this commit) `docs(09-05): complete minimal PWA plan`

## Files Created/Modified
- `static/manifest.webmanifest` - Web app manifest: standalone display, Print Shop theme/background colors, icon set
- `static/icons/icon.svg` - SVG master app icon (Print Shop identity)
- `static/icons/icon-192.png` - 192x192 raster icon
- `static/icons/icon-512.png` - 512x512 raster icon
- `static/icons/maskable-512.png` - 512x512 maskable icon (safe-area padded)
- `src/app.html` - Added `<link rel="manifest">`, `<meta name="theme-color">`, `<link rel="apple-touch-icon">` to `<head>`
- `tests/manifest.test.ts` - Manifest-validity test (JSON shape + icon file existence)

## Decisions Made
- Reused app.css's `--color-ink` (#221e17) and `--color-paper` (#f2ecdd) directly for `theme_color`/`background_color` rather than introducing new colors, per D-07's discretion constraint to stay within the existing palette.
- No service worker, offline caching, or `vite-plugin-pwa` dependency added — matches D-07's explicit "minimal manifest only" scope for this phase.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required. Note: real-device "Add to Home Screen" standalone verification requires HTTPS, which is the user's own deferred Oracle-server deployment step (PLAT-02), not part of this plan.

## Next Phase Readiness
- PLAT-01 (minimal installable PWA) is complete and shipped in the static build output.
- PLAT-02 (HTTPS deployment enabling real-device standalone install) remains the user's deferred step outside these plans, per 09-CONTEXT.md's Phase Boundary.
- No blockers for the remaining Phase 09 plans; this plan's files (manifest, icons, app.html additions) are disjoint from the keyboard/backend work in other Phase 09 plans.

---
*Phase: 09-deploy-to-the-piano*
*Completed: 2026-07-14*

## Self-Check: PASSED
- FOUND: static/manifest.webmanifest
- FOUND: static/icons/icon-192.png
- FOUND: tests/manifest.test.ts
- FOUND: 20da675
