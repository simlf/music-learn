---
phase: 22-installable-pwa-add-a-service-worker-for-offline-app-shell-c
verified: 2026-07-19T12:53:35Z
status: human_needed
score: 9/9 must-haves verified (automated layer)
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Production build + serve, open Chrome DevTools -> Application -> Service Workers."
    expected: "The service worker (src/service-worker.ts) registers and activates without errors."
    why_human: "Service worker registration/activation is a real-browser lifecycle event; jsdom has no SW implementation and Vitest cannot exercise it."
  - test: "DevTools -> Application -> Cache Storage: inspect the version-keyed cache after first load, before playing any chord."
    expected: "Cache contains build chunks, prerendered HTML, icons, and manifest.webmanifest, and contains NO /samples/salamander/*.mp3 entries. After playing one chord, the played sample's mp3 appears in the cache."
    why_human: "Requires an actual browser Cache Storage inspection; the unit tests only prove the pure list-construction logic (installPrecacheList) excludes samples, not that the live SW's cache.addAll/runtime-cache-on-demand path behaves identically at runtime."
  - test: "Toggle DevTools -> Network -> Offline (or airplane mode on a phone) and reload the app, including a non-root route."
    expected: "The app shell and routes still open (served from cache) instead of showing the browser's offline error page."
    why_human: "Offline navigation fallback behavior can only be observed with a real network-offline browser session."
  - test: "iOS Safari -> Share -> Add to Home Screen."
    expected: "Home-screen title reads 'Music Learn', icon is the new 180x180 asset (not a screenshot thumbnail), and launching opens standalone (no Safari chrome) with an opaque (non-overlaying) dark status bar."
    why_human: "iOS home-screen presentation is rendered by Springboard/Safari natively; cannot be exercised in jsdom or a Linux/macOS test runner."
  - test: "Android/Chrome: confirm the Install / Add to Home Screen prompt appears after the SW is active; run a Lighthouse PWA/installability audit."
    expected: "Install prompt appears; Lighthouse PWA/installability audit passes."
    why_human: "Requires a live Chromium install-eligibility evaluation and Lighthouse run against a served origin; not reproducible in the unit test environment."
  - test: "Two real deploys (version A then version B), or DevTools -> Application -> Service Workers manual 'skipWaiting'/update simulation."
    expected: "On reopening after version B deploys, the bilingual 'Update available. Reload.' / 'Mise a jour disponible. Recharger.' prompt appears; clicking Reload activates the new SW and reloads the page exactly once (no loop); NOT clicking it leaves the current session on the old build with no silent reload."
    why_human: "The full update lifecycle (waiting worker -> user confirm -> skipWaiting -> controllerchange -> single reload) depends on real service-worker install/update semantics across two builds, which cannot be simulated in jsdom/Vitest. The pure logic (computeUpdateReady truth table, SKIP_WAITING_MESSAGE shape, one-shot reload guard) is unit-tested, but the end-to-end browser flow is not."
  - test: "Deployment check on the Oracle box: confirm /service-worker.js is served from the site root with a revalidating (non-immutable, short/no max-age) Cache-Control header."
    expected: "A new deploy's service worker file is fetched promptly by returning clients rather than served from a long-lived browser cache."
    why_human: "nginx.conf in this repo sets no explicit Cache-Control headers at all (relies on nginx defaults), so this is a live-server header inspection, not a code-level check; no plan task modified nginx.conf for this phase."
---

# Phase 22: Installable PWA Verification Report

**Phase Goal:** The app installs like a native app on the user's phone for one-tap access next to the piano: a service worker caches the app shell so it opens instantly and works offline, the install/add-to-home-screen experience is correct on Android and iOS, and a new deploy surfaces a gentle "update available" prompt instead of silently serving a stale cached build.
**Verified:** 2026-07-19T12:53:35Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | On a repeat visit offline, the built app shell (hashed build chunks + small static assets + prerendered route HTML) loads from the SW cache | PRESENT_BEHAVIOR_UNVERIFIED (routes to human) | `src/service-worker.ts` install handler calls `cache.addAll(PRECACHE)` where `PRECACHE = installPrecacheList(build, files, prerendered)`; fetch handler serves cache-first for `PRECACHE_SET` entries and falls back to cached page/root shell on navigate-mode fetch failure. Logic present and type-checked (`npm run check`: 0 errors); actual offline load requires a real browser (see human_verification). |
| 2 | The ~1.9MB Salamander sample mp3s are NOT fetched at install time; they populate the cache only on first real playback | VERIFIED | `src/lib/pwa/precache.ts#installPrecacheList` filters `files` through `isSampleAsset` (keyed off `SALAMANDER_BASE_URL = '/samples/salamander/'` imported from `src/lib/audio/samples.ts`), and `precache.test.ts` asserts negatively: "excludes sample mp3s", "never contains an entry that includes SALAMANDER_BASE_URL" (10/10 tests pass). `service-worker.ts`'s fetch handler has a separate branch that only caches a sample after a real network fetch succeeds (`cache.put` inside the sample branch, not at install). |
| 3 | Activating a newer deploy deletes every cache whose key does not match the current `$service-worker` version | VERIFIED | `service-worker.ts` activate handler: `caches.keys()` then `Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))`; `CACHE = cacheName(version)` and `precache.test.ts#cacheName` proves it is deterministic and version-keyed (different version -> different name). |
| 4 | src/app.html carries the four apple/mobile-web-app iOS meta tags and a 180x180 apple-touch-icon link | VERIFIED | `src/app.html` lines 8-16 contain `apple-mobile-web-app-capable`, `mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` (`black`), `apple-mobile-web-app-title` (`Music Learn`), and `<link rel="apple-touch-icon" sizes="180x180" href="%sveltekit.assets%/icons/apple-touch-icon-180.png" />`. Asserted by `src/lib/pwa/pwaMeta.test.ts` (file-content grep test, passing in full suite run). |
| 5 | A real 180x180 apple-touch-icon exists and is derived from existing art (no new art) | VERIFIED | `file static/icons/apple-touch-icon-180.png` -> "PNG image data, 180 x 180, 8-bit/color RGBA"; confirmed independently via PNG IHDR byte parse (width 180, height 180). SUMMARY documents `sips -z 180 180 static/icons/icon-512.png`. |
| 6 | The manifest still exposes name/short_name, start_url '/', scope '/', display 'standalone', and 192+512+maskable-512 icons | VERIFIED | `static/manifest.webmanifest` untouched per SUMMARY (verify-only); `pwaMeta.test.ts` parses the manifest JSON and asserts all these fields; test passes in full suite run. |
| 7 | Android/Chrome install eligibility and Lighthouse PWA/installability audit pass | PRESENT_BEHAVIOR_UNVERIFIED (routes to human) | Preconditions (active SW + valid manifest over HTTPS) are code-verified present (truths 1, 4-6); the actual Chromium install-eligibility check and Lighthouse audit run against a live served origin, not reproducible in Vitest. |
| 8 | A new-version update prompt appears (bilingual), confirming reloads exactly once via skipWaiting/controllerchange, and no silent mid-session reload ever happens | VERIFIED (pure logic) / PRESENT_BEHAVIOR_UNVERIFIED (end-to-end reload behavior, routes to human) | `swUpdate.svelte.ts#computeUpdateReady` requires `hasWaiting && hasController` (unit-tested truth table, 3 cases, all pass) so first install never falsely prompts; `SKIP_WAITING_MESSAGE = { type: 'SKIP_WAITING' }` matches `service-worker.ts`'s message listener literally (`event.data?.type === 'SKIP_WAITING'` -> `sw.skipWaiting()`); `applyUpdate()` only posts the message, never reloads directly; `registerUpdateWatcher` guards the `controllerchange` listener with a one-shot `reloaded` boolean. `UpdatePrompt.test.ts` (5 tests) proves render/hide, EN+FR copy, Dismiss hides, Reload invokes `applyUpdate` (spied) - all in jsdom against the real reactive module state. The genuine two-deploy waiting-worker-to-reload lifecycle cannot be exercised in jsdom (no real SW), so the end-to-end behavior is a human-verification item, not a jsdom-provable state transition. |
| 9 | Bilingual copy for the update prompt (EN+FR) with i18n parity, no em dashes | VERIFIED | `src/lib/i18n/messages/chrome.ts` has matching `en`/`fr` blocks for `pwa.update.message/action/dismiss`; `npm test` (full suite, includes `messages.test.ts` and `coverage.test.ts`) is green; `grep` for em dash (`—`) across all phase-touched files returned zero matches. |

**Score:** 9/9 truths have supporting code present, wired, and (where jsdom-testable) unit-tested. 3 of the 9 assert real-browser/native runtime behavior (SW offline load, install-eligibility/Lighthouse, end-to-end update reload) that cannot be exercised in jsdom — these route to human verification per the explicit verification-honesty instruction in this task and 22-CONTEXT.md, and are not claimed as automated-verified.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/service-worker.ts` | Uses `$service-worker` (build/files/prerendered/version), no new dependency; install/activate/fetch/message handlers per PWA-01 | VERIFIED | Confirmed by direct read; imports `{ build, files, prerendered, version }` from `$service-worker` only, no third-party SW lib. |
| `src/lib/pwa/precache.ts` | Pure module, no `$service-worker` import, precache list excludes samples | VERIFIED | Confirmed by direct read; only imports `SALAMANDER_BASE_URL` from `$lib/audio/samples`. |
| `src/lib/pwa/precache.test.ts` | Asserts sample exclusion negatively | VERIFIED | 10 tests including "never contains an entry that includes SALAMANDER_BASE_URL"; all pass. |
| `src/app.html` | iOS meta tags + 180 apple-touch-icon link; manifest link/theme-color/viewport untouched | VERIFIED | Confirmed by direct read; all pre-existing tags intact, four new meta tags + repointed icon link present. |
| `static/icons/apple-touch-icon-180.png` | 180x180 PNG | VERIFIED | Confirmed via `file` and raw PNG IHDR byte parse: 180 x 180. |
| `src/lib/pwa/pwaMeta.test.ts` | Asserts app.html + manifest fields | VERIFIED | Present, included in the green full-suite run. |
| `src/lib/pwa/swUpdate.svelte.ts` | computeUpdateReady, SKIP_WAITING_MESSAGE, updateAvailable/setUpdateAvailable, registerUpdateWatcher, applyUpdate | VERIFIED | Confirmed by direct read; matches plan's exact contract. |
| `src/lib/pwa/swUpdate.test.ts` | Pure-logic coverage | VERIFIED | 3 describe blocks, all pure-logic assertions pass. |
| `src/lib/components/UpdatePrompt.svelte` | Bilingual banner, renders only when updateAvailable() | VERIFIED | Confirmed by direct read; `{#if updateAvailable()}` guard, calls `applyUpdate()`/`setUpdateAvailable(false)`. |
| `src/lib/i18n/messages/chrome.ts` | pwa.update.* EN+FR keys | VERIFIED | Confirmed via grep; matching en/fr entries present. |
| `src/routes/+layout.svelte` | Mounts UpdatePrompt, calls registerUpdateWatcher in onMount | VERIFIED | Confirmed by direct read: `import UpdatePrompt`, `<UpdatePrompt />` after `{@render children()}`, `registerUpdateWatcher();` inside existing `onMount`. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `service-worker.ts` | `precache.ts` | imports `installPrecacheList`, `cacheName` and passes `build`/`files`/`prerendered`/`version` | WIRED | Confirmed by direct read of both files. |
| `precache.ts` | `samples.ts` | imports `SALAMANDER_BASE_URL` to key the exclusion | WIRED | Confirmed; `isSampleAsset` uses `url.includes(SALAMANDER_BASE_URL)`. |
| `service-worker.ts` message listener | `swUpdate.svelte.ts` `applyUpdate()` | both use the literal `{ type: 'SKIP_WAITING' }` shape | WIRED | `service-worker.ts`: `event.data?.type === 'SKIP_WAITING'`; `swUpdate.svelte.ts`: `SKIP_WAITING_MESSAGE = { type: 'SKIP_WAITING' } as const`, posted via `registration?.waiting?.postMessage(SKIP_WAITING_MESSAGE)`. Shapes align exactly. |
| `UpdatePrompt.svelte` | `swUpdate.svelte.ts` | imports `updateAvailable`, `setUpdateAvailable`, `applyUpdate`; Reload/Dismiss buttons call them | WIRED | Confirmed by direct read. |
| `+layout.svelte` | `UpdatePrompt.svelte` + `swUpdate.svelte.ts` | imports and mounts `<UpdatePrompt />`; calls `registerUpdateWatcher()` in existing `onMount` | WIRED | Confirmed by direct read. |
| `app.html` | `static/icons/apple-touch-icon-180.png` | `<link rel="apple-touch-icon" sizes="180x180" href=".../apple-touch-icon-180.png">` | WIRED | Confirmed; file exists at the referenced path, 180x180. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|------------|-------------|--------|----------|
| PWA-01 | 22-01 | Offline app-shell caching via native SW | SATISFIED (code) / human-pending (runtime) | service-worker.ts + precache.ts present, wired, unit-tested; actual offline load is a human-verification item. |
| PWA-02 | 22-02 | Mobile installability incl. iOS polish | SATISFIED (code) / human-pending (device presentation) | app.html meta tags + 180 icon + manifest guard present and unit-tested; actual iOS/Android device presentation is a human-verification item. |
| PWA-03 | 22-03 | Bilingual new-version update prompt | SATISFIED (code) / human-pending (real update flow) | swUpdate.svelte.ts + UpdatePrompt.svelte + i18n copy present, wired, unit-tested; the real two-deploy reload flow is a human-verification item. |

No orphaned requirements found for Phase 22 in REQUIREMENTS.md beyond PWA-01/02/03.

### Anti-Patterns Found

None. Grep for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` and for em dashes (`—`) across all phase-touched files (`src/service-worker.ts`, `src/lib/pwa/precache.ts`, `src/lib/pwa/swUpdate.svelte.ts`, `src/lib/components/UpdatePrompt.svelte`, `src/app.html`, `src/routes/+layout.svelte`, `src/lib/i18n/messages/chrome.ts`) returned zero matches.

### Automated Verification Run

- `npx vitest run` (full suite): **89 test files passed, 1284 tests passed** (0 failures). Two pre-existing jsdom console warnings ("Not implemented: navigation to another Document") noted in SUMMARY as unrelated/pre-existing; did not affect pass/fail.
- `npm run check` (svelte-check): **1328 files checked, 0 errors, 0 warnings, 0 files with problems.**

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite green | `npx vitest run` | 89 files / 1284 tests passed | PASS |
| Type-check clean | `npm run check` | 0 errors, 0 warnings | PASS |
| SW registers/activates in a real browser | N/A (requires Chrome DevTools/device) | not run | SKIP -> human verification |
| Offline navigation serves cached shell | N/A (requires real network-offline browser session) | not run | SKIP -> human verification |
| Android/iOS install & Lighthouse audit | N/A (requires live device/Chromium eligibility check) | not run | SKIP -> human verification |
| Real two-deploy update-prompt flow | N/A (requires two actual deploys or DevTools SW simulation) | not run | SKIP -> human verification |

### Human Verification Required

### 1. Service worker registers and activates
**Test:** Build for production, serve, open Chrome DevTools -> Application -> Service Workers.
**Expected:** `src/service-worker.ts` registers and activates with no errors.
**Why human:** Real-browser SW lifecycle; jsdom has no SW implementation.

### 2. Cache Storage contents (samples excluded at install, cached after first play)
**Test:** DevTools -> Application -> Cache Storage, inspect the version-keyed cache before playing any chord, then play one chord and re-inspect.
**Expected:** Before play: build chunks, prerendered HTML, icons, manifest present; no `/samples/salamander/*.mp3` entries. After play: the played sample's mp3 appears.
**Why human:** Confirms the live SW's `cache.addAll`/runtime-cache-on-demand behavior matches the unit-tested pure list logic; jsdom cannot run this.

### 3. Offline navigation
**Test:** Toggle DevTools Network -> Offline (or airplane mode) and reload the app shell and a non-root route.
**Expected:** Both open from cache instead of showing the browser offline error page.
**Why human:** Real network-offline browser behavior.

### 4. iOS Add to Home Screen presentation
**Test:** iOS Safari -> Share -> Add to Home Screen.
**Expected:** Title "Music Learn", correct 180 icon (not a screenshot), standalone launch with opaque dark status bar.
**Why human:** Native iOS Springboard/Safari rendering, not reproducible outside a real device.

### 5. Android/Chrome install prompt + Lighthouse audit
**Test:** Confirm the Install/Add to Home Screen prompt appears after the SW is active; run Lighthouse PWA/installability audit.
**Expected:** Prompt appears; audit passes.
**Why human:** Live Chromium install-eligibility evaluation.

### 6. End-to-end update prompt flow
**Test:** Two real deploys (version A then B), or DevTools manual skipWaiting simulation.
**Expected:** Prompt appears bilingually on reopen after B; Reload activates the new SW and reloads exactly once; not clicking it never silently reloads.
**Why human:** Full real-browser SW waiting/controllerchange lifecycle across two builds; the pure decision logic is unit-tested but the end-to-end browser flow is not.

### 7. Deploy-side service worker cache header
**Test:** On the Oracle box, confirm `/service-worker.js` is served with a revalidating (non-immutable) Cache-Control header.
**Expected:** Returning clients fetch the new SW file promptly after a deploy rather than serving a long-cached stale copy.
**Why human:** `nginx.conf` in this repo sets no explicit Cache-Control headers (no task in this phase touched nginx config); this is a live-server header check, not a code-level one.

### Gaps Summary

No code-level gaps found. All three requirements (PWA-01, PWA-02, PWA-03) have their supporting artifacts present, substantive (no stubs, no debt markers, no em dashes), correctly wired end-to-end (SW <-> precache helper <-> samples constant; SW message contract <-> update-flow module; update module <-> UpdatePrompt <-> layout), and covered by passing unit tests (89/89 files, 1284/1284 tests) plus a clean type-check (0 errors). The status is `human_needed` rather than `passed` solely because this phase's core deliverable is real-browser/native runtime behavior (service worker lifecycle, offline navigation, mobile install eligibility, and the two-deploy update-reload flow) that cannot be exercised in jsdom/Vitest by design — this was explicitly anticipated in 22-CONTEXT.md's verification note and is not a defect. Recommend running the 7 human-verification items above (ideally via Chrome DevTools Application panel + a Lighthouse PWA audit, plus one real second deploy) before considering the phase fully closed.

---

_Verified: 2026-07-19T12:53:35Z_
_Verifier: Claude (gsd-verifier)_
