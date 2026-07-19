---
phase: 22-installable-pwa-add-a-service-worker-for-offline-app-shell-c
plan: 02
subsystem: pwa
tags: [pwa, ios, app-html, manifest, vitest]

# Dependency graph
requires:
  - phase: 22-01
    provides: service worker (src/service-worker.ts) that unlocks Android/Chrome installability
provides:
  - iOS add-to-home-screen meta tags in src/app.html (apple-mobile-web-app-capable, mobile-web-app-capable, apple-mobile-web-app-status-bar-style, apple-mobile-web-app-title)
  - a 180x180 apple-touch-icon derived from the existing icon-512.png
  - an automated guard test (pwaMeta.test.ts) pinning the iOS meta tags and the manifest's installability fields
affects: [pwa, ios-presentation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Static-file content guard tests: read src/app.html and static/manifest.webmanifest from disk with readFileSync in a plain Vitest test, no rendering/SW/network involved."

key-files:
  created:
    - static/icons/apple-touch-icon-180.png
    - src/lib/pwa/pwaMeta.test.ts
  modified:
    - src/app.html

key-decisions:
  - "apple-mobile-web-app-status-bar-style set to black (not black-translucent) because the app has no safe-area-inset handling; a translucent bar would let content slide under the iOS notch on the dark #221e17 chrome."
  - "static/manifest.webmanifest left untouched (verify-only per 22-CONTEXT PWA-02) — all required installability fields (name, short_name, start_url '/', scope '/', display 'standalone', 192/512/maskable icons) were already present and correct."
  - "180x180 icon derived from the existing icon-512.png via macOS sips, no new art commissioned."

patterns-established:
  - "PWA installability guard tests live under src/lib/pwa/ alongside precache.test.ts, asserting on raw file content/JSON rather than rendered DOM."

requirements-completed: [PWA-02]

coverage:
  - id: D1
    description: "src/app.html carries the four apple/mobile-web-app iOS meta tags (capable, mobile-web-app-capable, status-bar-style, title 'Music Learn') and a 180x180 apple-touch-icon link"
    requirement: "PWA-02"
    verification:
      - kind: unit
        ref: "src/lib/pwa/pwaMeta.test.ts#src/app.html iOS add-to-home-screen meta tags"
        status: pass
      - kind: other
        ref: "npm run check (svelte-check) - 0 errors, 0 warnings"
        status: pass
    human_judgment: false
  - id: D2
    description: "A 180x180 apple-touch-icon exists at static/icons/apple-touch-icon-180.png, derived from icon-512.png"
    requirement: "PWA-02"
    verification:
      - kind: other
        ref: "sips -g pixelWidth -g pixelHeight static/icons/apple-touch-icon-180.png -> 180x180"
        status: pass
    human_judgment: false
  - id: D3
    description: "static/manifest.webmanifest still meets Android/Chrome installability preconditions (name/short_name, start_url '/', scope '/', display 'standalone', 192+512+maskable icons) after this plan"
    requirement: "PWA-02"
    verification:
      - kind: unit
        ref: "src/lib/pwa/pwaMeta.test.ts#static/manifest.webmanifest installability preconditions"
        status: pass
    human_judgment: false
  - id: D4
    description: "iOS Safari Add to Home Screen presents the correct title, 180 icon, and launches standalone with a dark (non-overlaying) status bar; Android/Chrome Install prompt appears and Lighthouse PWA/installability audit passes"
    verification: []
    human_judgment: true
    rationale: "Real iOS/Android device (or Chrome DevTools Application panel + Lighthouse audit) is required to observe home-screen presentation and install-prompt behavior; this cannot be exercised in jsdom/Vitest, per 22-CONTEXT's verification note."

# Metrics
duration: 4min
completed: 2026-07-19
status: complete
---

# Phase 22 Plan 02: iOS Add-to-Home-Screen Polish Summary

**Added apple-mobile-web-app-* meta tags, a 180x180 apple-touch-icon derived from icon-512.png, and a Vitest guard test pinning both the iOS meta tags and the manifest's Android/Chrome installability fields.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-07-19T12:36:21Z
- **Completed:** 2026-07-19T12:39:54Z
- **Tasks:** 2
- **Files modified:** 3 (1 modified, 2 created)

## Accomplishments
- `src/app.html` now carries `apple-mobile-web-app-capable`, `mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` (black), and `apple-mobile-web-app-title` ("Music Learn"), with the existing manifest link, theme-color, and viewport left untouched.
- Generated `static/icons/apple-touch-icon-180.png` (180x180, confirmed via `sips`) from the existing `icon-512.png`, and repointed the single `apple-touch-icon` link to it with an explicit `sizes="180x180"` attribute.
- Added `src/lib/pwa/pwaMeta.test.ts`, a pure file-content/JSON Vitest guard that pins both the new iOS meta tags in `app.html` and the pre-existing installability fields in `static/manifest.webmanifest` (name/short_name, start_url, scope, display, 192/512/maskable icons), so an accidental future edit that breaks installability fails the suite.

## Task Commits

Each task was committed atomically:

1. **Task 1: iOS meta tags in src/app.html + 180x180 apple-touch-icon** - `d2cf771` (feat)
2. **Task 2: Installability guard test (src/lib/pwa/pwaMeta.test.ts)** - `22463b4` (test)

**Plan metadata:** pending (docs: complete plan, per this SUMMARY commit)

## Files Created/Modified
- `src/app.html` - Adds the four apple/mobile-web-app iOS meta tags and repoints apple-touch-icon to the new 180 asset with explicit sizing; manifest link, theme-color, and viewport unchanged.
- `static/icons/apple-touch-icon-180.png` - New 180x180 PNG derived from `icon-512.png` via `sips -z 180 180`.
- `src/lib/pwa/pwaMeta.test.ts` - New Vitest file reading `src/app.html` and `static/manifest.webmanifest` from disk to assert iOS meta tags and manifest installability fields are present.

## Decisions Made
- `apple-mobile-web-app-status-bar-style` set to `black` rather than `black-translucent`: the app has no safe-area-inset CSS handling, so a translucent bar would let content slide under the iOS notch on the dark `#221e17` chrome. `black` keeps the status bar opaque and out of the way.
- `static/manifest.webmanifest` left completely untouched: all required installability fields were already present and correct per 22-CONTEXT, and the plan explicitly scopes it as verify-only. The new test asserts this without modifying the file.
- No new dependency added; icon generation used the macOS built-in `sips` tool as specified in the plan.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Manual Verification Still Required (device-only, not automated)

Per 22-CONTEXT's verification note, these cannot be exercised in jsdom/Vitest and were NOT claimed as automated-verified:
- **iOS Safari -> Share -> Add to Home Screen:** confirm the home-screen title reads "Music Learn", the icon is the new 180 asset (not a screenshot), and launching opens standalone (no Safari chrome) with a dark, non-overlaying status bar.
- **Android/Chrome (after Plan 01's service worker ships):** confirm the Install / Add to Home Screen prompt appears; run a Lighthouse PWA/installability audit and confirm it passes.

## Next Phase Readiness
- PWA-02 satisfied: iOS presentation meta tags, 180 icon, and manifest installability preconditions are all in place and guarded by an automated test.
- Ready for Plan 03 (new-version update prompt, PWA-03), which is independent of this plan's app.html/manifest changes.
- Manual device verification (iOS add-to-home-screen, Android install prompt, Lighthouse audit) remains an open human UAT item for phase completion.

---
*Phase: 22-installable-pwa-add-a-service-worker-for-offline-app-shell-c*
*Completed: 2026-07-19*

## Self-Check: PASSED

- FOUND: static/icons/apple-touch-icon-180.png
- FOUND: src/lib/pwa/pwaMeta.test.ts
- FOUND: src/app.html
- FOUND commit: d2cf771
- FOUND commit: 22463b4
