# Phase 22: Installable PWA - Context

**Gathered:** 2026-07-19
**Status:** Ready for planning
**Source:** Autonomous capture (user request during Phase 21 ship: "plan having the app as a PWA on mobile for easier access"), grounded against live code.

<domain>
## Phase Boundary

Turn the already-manifested app into a real installable PWA so the single user can add it to their phone home screen and open it one-tap next to the piano, with offline app-shell loading and a sane update path.

**Current state (verified):**
- `static/manifest.webmanifest` is already complete and correct: `name`/`short_name` "Music Learn", `start_url:"/"`, `scope:"/"`, `display:"standalone"`, `background_color:"#f2ecdd"`, `theme_color:"#221e17"`, icons 192 + 512 + maskable-512.
- `src/app.html` already links the manifest, sets `theme-color`, one `apple-touch-icon` (icon-192), and the viewport meta.
- `src/service-worker.ts` does NOT exist yet. This is the core gap: without an active service worker there is no offline support and Android/Chrome will not offer "Install".
- Build: `@sveltejs/adapter-static` (pages+assets = `build`, `fallback: undefined`, `strict: true`), SvelteKit 2.69.2 / Svelte 5.56.4. Deployed over HTTPS (Oracle box, docker + nginx, tailnet) — installability's HTTPS precondition is already met.
- Audio: 30 Salamander mp3s (~1.9 MB total) are self-hosted under `static/samples/salamander/` (served at `/samples/salamander/`). A synth fallback plays if samples are unavailable.

**In scope:** service worker + offline app shell (PWA-01), mobile installability incl. iOS add-to-home-screen polish (PWA-02), new-version update prompt (PWA-03).

**Out of scope:** push notifications, background sync, periodic background sync, share target, any backend/server changes, cross-device sync.
</domain>

<decisions>
## Implementation Decisions

### Locked: native SvelteKit service worker, no new dependency
- Use SvelteKit's built-in service worker support: add `src/service-worker.ts` and consume the `$service-worker` virtual module (`build`, `files`, `version`, `base`). Do NOT add `@vite-pwa/sveltekit` / Workbox — the app values dependency discipline and this is a small static app; the native SW covers all three requirements. (If the planner finds a hard blocker, surface it rather than silently adding a dependency.)
- SvelteKit auto-registers `src/service-worker.ts` in the client production build; in `vite dev` the `$service-worker` `build` list is empty so the SW effectively no-ops — acceptable, and keeps dev from serving stale caches.

### PWA-01 — offline app-shell caching
- **Install:** precache the `build` array (hashed, immutable JS/CSS chunks) plus the SMALL entries of `files` (icons, manifest, favicon). Name the cache with `version` from `$service-worker`.
- **EXCLUDE the audio samples from install-time precache.** `files` includes the 30 `/samples/salamander/*.mp3` (~1.9 MB); precaching them on install would force a big download on first visit and hurt the "quick start on phone" goal. Instead runtime-cache them on demand (cache-first, fall back to network, populate cache after first fetch) so offline playback works after first use — the synth fallback already covers offline-before-first-play.
- **Activate:** delete any cache whose key does not match the current `version` (clean up old builds).
- **Fetch:** serve precached `build`/`files` cache-first (immutable). For navigation requests, fall back to the cached app shell when offline so routes open without network. Cache successful same-origin GET responses opportunistically; never cache non-GET or cross-origin/opaque error responses.

### PWA-02 — installable on mobile
- Android/Chrome installability is satisfied once the SW (PWA-01) is active + the existing manifest is served over HTTPS. Verify the manifest `id`/`start_url`/`scope` still pass Lighthouse installability.
- **iOS add-to-home-screen polish** in `src/app.html`: add `apple-mobile-web-app-capable` (and the newer `mobile-web-app-capable`), `apple-mobile-web-app-status-bar-style` (choose a value that fits the dark `#221e17` chrome), and `apple-mobile-web-app-title` "Music Learn". Add a 180x180 `apple-touch-icon` if a suitable asset exists (reuse/derive from existing icons; do not block on new art).
- An in-app "Install" button (via the `beforeinstallprompt` event) is OPTIONAL — include only if it stays lightweight and unobtrusive; iOS has no such event so it must degrade gracefully.

### PWA-03 — new-version update prompt
- Implement the standard SW update flow: on `updatefound` / a waiting worker, show an unobtrusive prompt ("Update available. Reload.") that, on confirm, tells the waiting SW to `skipWaiting()` and reloads on `controllerchange`. Do not force-reload silently mid-session.
- Prompt copy is bilingual (EN + FR) via the existing i18n layer, no em dashes.

## Claude's Discretion
- Exact caching strategy details (SwR vs cache-first per request type) as long as the app loads offline, serves fresh immutable assets, and never traps the user on a stale build.
- Where the update prompt renders (small toast/banner) and its exact copy, within the bilingual + no-em-dash rule.
- Whether to include the optional `beforeinstallprompt` affordance.
- Test shape — see constraints below.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `svelte.config.js` — adapter-static config (build output dir, fallback, strict)
- `src/app.html` — where the iOS meta tags + apple-touch-icons go
- `static/manifest.webmanifest` — existing manifest (already correct; verify only)
- `static/icons/` — existing icons (icon-192, icon-512, maskable-512, icon.svg)
- `src/lib/audio/samples.ts` + `static/samples/salamander/` — the ~1.9 MB sample set to EXCLUDE from install precache
- `src/lib/i18n/messages/*.ts` — add the bilingual update-prompt copy (en + fr blocks; `coverage.test.ts` enforces parity)
- SvelteKit `$service-worker` module — `build`, `files`, `version`, `base`
- `.claude/CLAUDE.md` — stack + conventions (no new deps casually; no em dashes)

### Deployment note
- Static build is served by nginx in docker on the Oracle box over HTTPS (see memory: music-learn prod deploy). The SW must be served from the site root so its scope is `/`. Confirm nginx serves `/service-worker.js` with no long-lived immutable cache header (the SW file itself must be revalidated, unlike the hashed `build` assets).
</canonical_refs>

<specifics>
## Specific Ideas
- User's words: "I would also like you to plan having the app as a PWA on mobile for easier access." Motivation is one-tap access on the phone next to the piano.
</specifics>

<deferred>
## Deferred Ideas
- Push notifications / practice reminders, background sync, periodic sync, share target — out of scope.
- New icon art beyond deriving apple-touch sizes from existing assets.
- Precaching the piano samples at install (rejected: too heavy for first load; runtime-cache instead).
</deferred>

---

## Verification note for planning
Service-worker offline/install behavior cannot be exercised in jsdom/Vitest and the preview harness can't render this app (see prior phases). The planner should unit-test any PURE logic it can (cache-key/version helpers, the precache list derivation, update-prompt state), and mark the actual offline-load + Android-install + iOS-add-to-home-screen behavior as human/manual verification items (a real device or Chrome DevTools Application panel + Lighthouse PWA audit). Do not claim these as automated-verified.

---

*Phase: 22-installable-pwa*
*Context gathered: 2026-07-19 via autonomous capture*
