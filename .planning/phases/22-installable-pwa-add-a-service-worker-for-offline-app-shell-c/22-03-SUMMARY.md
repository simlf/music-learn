---
phase: 22-installable-pwa-add-a-service-worker-for-offline-app-shell-c
plan: 03
subsystem: pwa
tags: [sveltekit, svelte5, service-worker, i18n, testing-library]

requires:
  - phase: 22-installable-pwa-add-a-service-worker-for-offline-app-shell-c (plan 01)
    provides: "src/service-worker.ts with a message listener handling { type: 'SKIP_WAITING' }"
provides:
  - "Reactive SW update-state module (swUpdate.svelte.ts) with computeUpdateReady, SKIP_WAITING_MESSAGE contract, registerUpdateWatcher, applyUpdate"
  - "Bilingual (EN/FR) update-prompt copy in the chrome i18n domain"
  - "UpdatePrompt.svelte banner mounted once in the root layout"
affects: [pwa, i18n, layout]

tech-stack:
  added: []
  patterns:
    - "Reactive .svelte.ts module state (mirrors locale.svelte.ts) for cross-cutting, non-component app state"
    - "One-shot controllerchange reload guard (module-level boolean) to prevent SW-update reload loops"

key-files:
  created:
    - src/lib/pwa/swUpdate.svelte.ts
    - src/lib/pwa/swUpdate.test.ts
    - src/lib/components/UpdatePrompt.svelte
    - src/lib/components/UpdatePrompt.test.ts
  modified:
    - src/lib/i18n/messages/chrome.ts
    - src/routes/+layout.svelte

key-decisions:
  - "computeUpdateReady requires BOTH hasWaiting AND hasController so the prompt never fires on a visitor's very first install"
  - "applyUpdate only posts SKIP_WAITING; the actual reload is driven solely by a controllerchange listener guarded by a one-shot 'reloaded' flag, never called directly from applyUpdate itself"
  - "UpdatePrompt reuses the existing Button.svelte primary/ghost variants rather than introducing new button styling, for visual consistency with the rest of the chrome"
  - "Update copy added to the existing chrome.ts domain (not a new i18n module), per the plan's prohibition on touching messages/index.ts or the hard-coded domain list in messages.test.ts"

patterns-established:
  - "Reactive cross-cutting singletons live in .svelte.ts modules with a computeX() pure-logic export unit-tested separately from the browser-only wiring function"

requirements-completed:
  - PWA-03

coverage:
  - id: D1
    description: "Bilingual EN/FR update-prompt copy (pwa.update.message/action/dismiss) added to the chrome i18n domain, keeping parity with messages.test.ts and coverage.test.ts"
    requirement: PWA-03
    verification:
      - kind: unit
        ref: "src/lib/i18n/messages.test.ts and src/lib/i18n/coverage.test.ts (full suite)"
        status: pass
    human_judgment: false
  - id: D2
    description: "computeUpdateReady/SKIP_WAITING_MESSAGE/updateAvailable/setUpdateAvailable pure logic in swUpdate.svelte.ts, matching Plan 22-01's SW message contract exactly"
    requirement: PWA-03
    verification:
      - kind: unit
        ref: "src/lib/pwa/swUpdate.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "UpdatePrompt.svelte renders nothing when no update is available, shows a bilingual message/Reload/Dismiss banner when one is, Dismiss hides it, Reload invokes applyUpdate"
    requirement: PWA-03
    verification:
      - kind: unit
        ref: "src/lib/components/UpdatePrompt.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "+layout.svelte mounts <UpdatePrompt /> once and calls registerUpdateWatcher() in its existing onMount, wiring the whole update flow client-side"
    verification:
      - kind: unit
        ref: "npm run check (svelte-check, 0 errors) and full npm test suite (1284 tests passing, no regressions)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Real two-deploy SW update flow: a genuinely new deploy surfaces the prompt, Reload activates the waiting worker and reloads exactly once (no loop), and not clicking it never silently reloads mid-session"
    verification: []
    human_judgment: true
    rationale: "Service-worker lifecycle (waiting worker, controllerchange, browser-native install/update semantics) cannot be exercised in jsdom/Vitest; requires a real browser via two actual deploys or Chrome DevTools Application panel manual SW-update simulation, per 22-CONTEXT.md's verification note."

duration: 7min
completed: 2026-07-19
status: complete
---

# Phase 22 Plan 3: SW Update Prompt Summary

**Reactive SW update-state module (swUpdate.svelte.ts) plus a bilingual UpdatePrompt.svelte banner, wired into the root layout, that only ever reloads on explicit user confirmation**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-19T14:41:00Z
- **Completed:** 2026-07-19T14:48:44Z
- **Tasks:** 3
- **Files modified:** 6 (2 modified, 4 created)

## Accomplishments
- Bilingual `pwa.update.message` / `pwa.update.action` / `pwa.update.dismiss` copy added to the existing chrome i18n domain, with matching EN/FR entries and no em dashes
- `swUpdate.svelte.ts`: pure `computeUpdateReady({ hasWaiting, hasController })` (only true with BOTH a waiting worker and an active controller, so first install never prompts), the exact `{ type: 'SKIP_WAITING' }` message contract matching Plan 22-01's service worker, reactive `updateAvailable()`/`setUpdateAvailable()`, `registerUpdateWatcher()` (watches the existing SW registration for a waiting/installed worker, one-shot `controllerchange` reload guard), and `applyUpdate()` (posts SKIP_WAITING only, never reloads directly)
- `UpdatePrompt.svelte`: an unobtrusive fixed bottom banner using existing Button.svelte primary/ghost variants and app.css theme tokens, rendering only when an update is ready
- `+layout.svelte` now mounts `<UpdatePrompt />` once (after `{@render children()}`) and calls `registerUpdateWatcher()` in the existing `onMount`, alongside `initLocale()`

## Task Commits

Each task was committed atomically (TDD tasks show test → feat gate pairs):

1. **Task 1: Bilingual update-prompt copy in chrome.ts** - `1507db0` (feat)
2. **Task 2: SW update state module** - `7e10e1e` (test, RED) → `8d3873d` (feat, GREEN)
3. **Task 3: UpdatePrompt.svelte + layout wiring** - `56cdfe5` (test, RED) → `a678b54` (feat, GREEN)

_No plan-metadata docs commit was made per the orchestrator's instruction: this executor does not update STATE.md or ROADMAP.md._

## Files Created/Modified
- `src/lib/i18n/messages/chrome.ts` - added `pwa.update.message`/`action`/`dismiss` keys to both `en` and `fr` blocks
- `src/lib/pwa/swUpdate.svelte.ts` - reactive SW update-state module (new)
- `src/lib/pwa/swUpdate.test.ts` - unit tests for the pure logic (new)
- `src/lib/components/UpdatePrompt.svelte` - the bilingual reload/dismiss banner (new)
- `src/lib/components/UpdatePrompt.test.ts` - component tests (new)
- `src/routes/+layout.svelte` - mounts `<UpdatePrompt />`, calls `registerUpdateWatcher()` in onMount

## Decisions Made
- `computeUpdateReady` requires both `hasWaiting` and `hasController` to be true — matches the plan's explicit truth table and prevents a false "update available" prompt on a visitor's very first install.
- `applyUpdate()` only posts the `SKIP_WAITING` message; the reload is driven exclusively by a `controllerchange` listener guarded with a one-shot `reloaded` boolean, so there is no path by which the app reloads without the waiting worker actually taking control, and no risk of a reload loop.
- `UpdatePrompt.svelte` reuses `Button.svelte`'s `primary`/`ghost` variants (matching the LocaleToggle pattern) instead of inventing new button styling, keeping the banner visually consistent with the rest of the app chrome.
- Component test mocks only `applyUpdate` via `importOriginal` + spread (keeping `updateAvailable`/`setUpdateAvailable` as the real reactive module state), so the test exercises the actual `$state` round-trip rather than a fully-mocked stand-in.

## Deviations from Plan

None - plan executed exactly as written. The TDD gate sequence (test commit before feat commit) was followed for both Task 2 and Task 3 as required by the `tdd="true"` frontmatter.

## Issues Encountered
None. A pre-existing, unrelated jsdom console warning ("Not implemented: navigation to another Document") appears in the full test suite output; confirmed via `git stash` that it is present identically on the pre-plan commit and is not caused by this plan's changes.

## User Setup Required
None - no external service configuration required.

## Manual Verification Still Required

Per `22-CONTEXT.md`'s verification note, the real update-prompt behavior cannot be exercised in jsdom and must be manually verified (see coverage item D5):
- Deploy version A, install/open the app; deploy version B; reopen and confirm the "Update available. Reload." prompt appears in the active locale (EN and FR), that clicking Reload activates the new SW and reloads exactly once (no loop), and that NOT clicking it leaves the current session untouched (no silent reload).
- Alternatively, use Chrome DevTools → Application → Service Workers "Update on reload"/skipWaiting to reproduce the waiting-worker state and confirm the same prompt + single reload.

## Next Phase Readiness
Phase 22 (Installable PWA) is now feature-complete across all three requirements: PWA-01 (offline app shell, Plan 22-01), PWA-02 (mobile installability + iOS polish, Plan 22-02), and PWA-03 (update prompt, this plan). No blockers for closing out the phase; the only remaining work is the manual two-deploy verification noted above, which cannot be automated.

---
*Phase: 22-installable-pwa-add-a-service-worker-for-offline-app-shell-c*
*Completed: 2026-07-19*

## Self-Check: PASSED

All created/modified files and all 5 task commit hashes (1507db0, 7e10e1e, 8d3873d, 56cdfe5, a678b54) were verified present on disk and in git log.
