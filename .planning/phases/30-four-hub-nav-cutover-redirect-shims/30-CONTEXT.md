# Phase 30: Four-Hub Nav Cutover + Redirect Shims - Context

**Gathered:** 2026-07-25
**Status:** Ready for planning
**Mode:** Autonomous — grounded in the approved design + a scout of the nav layout, internal handoffs, and route tests + one user decision (drills cutover = wire seeds, drop tiers).

<domain>
## Phase Boundary

Collapse the app's navigation from 10 flat links to 4 hubs (Lookup `/`, Practice `/practice`, Learn `/learn`, Progress `/progress`) on both the desktop masthead and the phone bottom tab bar; remove the phone "More" bottom sheet. Delete the orphan `/showcase` route. Turn the 8 old routes into thin, prerender-safe redirect shims to their absorbing hub. Repoint every internal handoff link to the new hubs, and preserve the "drill my weak/danger spots" handoff by wiring drill seeds into `/practice`.

The app must end with exactly 4 hubs everywhere, old bookmarks landing on the right hub, and the full suite + svelte-check green.

</domain>

<decisions>
## Implementation Decisions

### Nav cutover (HUB-01)
- In `src/routes/+layout.svelte`, reduce the single `navLinks` source array to the 4 hubs: `{ '/', nav.lookup }`, `{ '/practice', nav.practice }`, `{ '/learn', nav.learn }`, `{ '/progress', nav.progress }`. The desktop masthead renders these 4.
- Phone bottom tab bar = the SAME 4 hubs (set `bottomTabHrefs = ['/', '/practice', '/learn', '/progress']`, still filtering `navLinks`, never a second literal list). REMOVE the "More" bottom sheet entirely: delete `moreHrefs`, `moreLinks`, the `BottomSheet` import and its markup/usage. The `.filter`-not-duplicate-literal convention stays.
- `TAB_ICONS`: keep the existing `/` (lookup) icon; supply icons for `/practice`, `/learn`, `/progress` (SVG path strings, `stroke: currentColor`, house style so the active-tab ink-fill/paper-text still works). Reasonable reuse: `/practice` can adopt the former `/drills` icon; `/progress` keeps its concept; `/learn` gets a book/lesson glyph. Keep them keyed by href so the two nav renders stay in sync.

### i18n
- Add `nav.practice` and `nav.learn` message keys (EN/FR). `nav.lookup` and `nav.progress` already exist. Register nothing new domain-wise (these live in the existing `chrome`/nav domain). The now-unused `nav.drills/build/recall/scales/songs/theory/progressions/voicings` keys may be LEFT in place (their removal is a follow-up cleanup; removing now risks needless coverage churn) — do not spend effort deleting them.

### Redirect shims (HUB-03) — prerender-safe
- The app prerenders (`src/routes/+layout.ts` `export const prerender = true`). Each old route becomes a redirect shim by REPLACING its `+page.svelte` with a `+page.ts`:
  ```
  import { redirect } from '@sveltejs/kit';
  export const prerender = true;
  export function load() { throw redirect(308, '<TARGET>'); }
  ```
  Delete the route's old `+page.svelte` (the heavy page code is removed now; the route directory stays as the shim for one release — full route removal is a deferred follow-up). The extracted components (`TheoryLessons`, `ScaleExplorer`, `RecallPanel`, `SongManager`, and the drill generators/components) stay in `$lib` — they are what the hubs render.
- Redirect mapping:
  - `/drills`, `/build`, `/voicings`, `/progressions` -> `/practice`
  - `/scales`, `/theory` -> `/learn`
  - `/recall`, `/songs` -> `/progress`
- Verify the 308 redirect prerenders cleanly under `adapter-static` (build stays green); if a server-load redirect does not prerender in this setup, fall back to a minimal client redirect (`onMount(() => goto(target, { replaceState: true }))`) — but prefer the load-throw redirect.

### Delete showcase (HUB-02)
- Delete the entire `src/routes/showcase/` directory (orphan, not in nav, duplicate of Lookup). Remove any showcase-only test/reference.

### Repoint internal handoffs (REG-01)
- Repoint every internal link/goto to an old route to its hub. Confirmed sites:
  - `/drills` -> `/practice`: `src/routes/+page.svelte:192` (Lookup "Drill it"), `src/lib/components/ProgressStats.svelte` (x5: danger-cards, weakest "Drill these", empty CTA, streak CTA, per-symbol), `src/lib/components/RecallSession.svelte` (x4 practice-now CTAs), `src/lib/components/InteractiveLesson.svelte:292` (lesson handoff). The `theory.footer.drillsButton` on the deleted `/theory` page goes away with the redirect.
  - `/recall` -> `/progress`: `src/lib/components/BuildSession.svelte:966` (recallNow CTA).
- After repointing, grep the whole `src/` tree to confirm no remaining `href="/drills"` / `goto('/drills')` / `/recall` / `/scales` / `/theory` / `/songs` / `/build` / `/voicings` / `/progressions` / `/showcase` links exist outside the shim `+page.ts` files.

### Preserve the drill-seed handoff (user decision: wire seeds, drop tiers)
- Wire drill seeds into `/practice`: in `src/routes/practice/+page.svelte` `load()` (or its init), call `consumeDrillSeeds()` (`$lib/practice/drillSeeds`); if seeds are present, seed the practice queue with those chord symbols as name-it (identification) items, prioritized at the front, so the Progress "Drill these" / danger-cards / per-symbol handoffs still drill exactly those spots (mirrors how the old `/drills` page consumed seeds). This is REQUIRED — repointing the CTAs without consuming seeds would silently break the feature.
- DROP the tier/level picker: no active removal needed — `LevelPicker` + the tier-unlock UX lived on the now-deleted `/drills` page. `levelState`/`TIERS` modules stay (Progress still shows tier state). FSRS due/weakness scheduling in `/practice` is the drill scheduler now. Do NOT port `LevelPicker`/pool-tier gating into `/practice`.

### Tests (keep the suite green; comprehensive remap is Phase 31)
- ADD a redirect-assertion test per old route (8 routes) asserting each redirects to the correct hub (design testing strategy). A single new test file covering all 8 shims is fine.
- UPDATE `tests/masthead.e2e.test.ts` for the 4-hub nav (desktop 4 links; phone tab bar = 4, no More sheet).
- UPDATE `src/routes/lookupDrillIt.test.ts` for the Lookup drill handoff now targeting `/practice` (+ seed consumption).
- REMOVE/neutralize the now-obsolete route-page tests whose route redirects (their behavior moved to a hub, covered by hub tests): `tests/drills.e2e.test.ts`, `tests/scales.e2e.test.ts`, `tests/theory.e2e.test.ts`, and `src/routes/drillsChordReplay.test.ts`, `drillsPhoneStrip.test.ts`, `drillsSongFilter.test.ts`, `voicingsPage.test.ts`, `progressionsPage.test.ts`, `songsPage.test.ts`, `recallSongFilter.test.ts`, and `theoryInteractiveLesson.test.ts` if it renders the `/theory` route (keep it if it renders the `InteractiveLesson` component directly). Prefer deleting truly route-bound tests over rewriting; the extracted-component + hub tests (learn.test, progress-hub.e2e, practice-hub*.e2e, component tests) carry the coverage. Phase 31 does the comprehensive remap + new interleaving/interval/redirect coverage + the final gate.
- The full `npm test` suite + `npm run check` MUST be green at the end of this phase.

### Claude's Discretion
- Exact SVG glyphs for the `/learn` and `/progress` tab icons (house style, currentColor stroke).
- Whether all 8 redirect assertions live in one test file or per-route.
- Precisely how seeds map into the queue (name-it vs build-it; the old `/drills` behavior is the reference — match its seed-consumption semantics).

</decisions>

<code_context>
## Existing Code Insights

### Nav
- `src/routes/+layout.svelte` (~322 lines): single `navLinks` (10), desktop masthead (`{#each navLinks}`), phone `bottom-tab-bar` (`bottomTabHrefs = ['/', '/drills', '/recall', '/songs']`), `moreHrefs`/`moreLinks` + `BottomSheet` for the remaining 6, `TAB_ICONS` map (SVG per href, stroke currentColor).

### Handoff links (repoint)
- `/drills` -> `/practice`: `+page.svelte:192`, `ProgressStats.svelte` (x5), `RecallSession.svelte` (x4), `InteractiveLesson.svelte:292`.
- `/recall` -> `/progress`: `BuildSession.svelte:966`.
- Seed handoff: `ProgressStats.svelte` calls `setDrillSeeds(...)` then `goto('/drills')`; `/practice` currently has ZERO `consumeDrillSeeds` references (the gap to close).

### Prerender
- `src/routes/+layout.ts`: `export const prerender = true` (whole app prerenders; shims must be prerender-safe).

### Tests touching old routes
- e2e: `masthead.e2e.test.ts` (nav), `drills.e2e.test.ts`, `scales.e2e.test.ts`, `theory.e2e.test.ts`, `progress.e2e.test.ts` (progress stays a hub).
- route unit: `drills*.test.ts` (x3), `voicingsPage.test.ts`, `progressionsPage.test.ts`, `songsPage.test.ts`, `recallSongFilter.test.ts`, `theoryInteractiveLesson.test.ts`, `lookupDrillIt.test.ts`.

### Integration points
- `src/routes/+layout.svelte` (nav), `src/routes/practice/+page.svelte` (seed wiring), the 8 old route dirs (shims), `src/routes/showcase/` (delete), the handoff components above.

</code_context>

<specifics>
## Specific Ideas

- Design: "Nav drops from 10 flat links to these 4. Phone tab bar = the same 4; the More bottom sheet is removed. showcase deleted. Old routes become thin redirects for one release (bookmark/deep-link safety), then removed in a follow-up."
- The redirect shims are the no-regression safety net for existing bookmarks/deep-links; removing them is out of scope (deferred follow-up).
- Every hub already exists and works standalone (Phases 26-29). This phase is nav + routing + handoff-repoint + seed-wiring only.

</specifics>

<deferred>
## Deferred Ideas

- Removing the redirect shim route directories entirely — a later cleanup milestone (shims live one release).
- Deleting the now-unused `nav.*` i18n keys for old routes — follow-up cleanup.
- Comprehensive per-route test remap + new interleaving/interval/redirect coverage + the final green gate — Phase 31 (REG-01/REG-02).
- Porting the tier/level progression into Practice — explicitly rejected (FSRS scheduling replaces it per user decision).
