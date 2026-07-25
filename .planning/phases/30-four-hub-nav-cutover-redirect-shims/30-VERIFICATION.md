---
phase: 30-four-hub-nav-cutover-redirect-shims
verified: 2026-07-25T13:05:00Z
status: passed
score: 8/8 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 30: Four-Hub Nav Cutover + Redirect Shims Verification Report

**Phase Goal:** The app shows exactly 4 hubs (Lookup / Practice / Learn / Progress) on desktop masthead and phone tab bar (no More sheet); the 8 old routes redirect (308) to their absorbing hub; /showcase is deleted; the drill-seed handoff is preserved via /practice; full build + test + svelte-check green.

**Verified:** 2026-07-25T13:05:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Desktop masthead shows exactly 4 nav links: Lookup, Practice, Learn, Progress | ✓ VERIFIED | `src/routes/+layout.svelte:22-27` `navLinks` array has exactly 4 entries in order `/`, `/practice`, `/learn`, `/progress`; `tests/masthead.e2e.test.ts` asserts all 4 by role/name and href |
| 2 | Phone bottom tab bar shows the same 4 hubs and no More button | ✓ VERIFIED | `bottomTabHrefs = ['/', '/practice', '/learn', '/progress']` derived-by-filter from `navLinks` (`+layout.svelte:65-66`); `MORE_ICON`/`moreLinks`/`moreOpen`/`BottomSheet` import all absent from the file (grep confirmed zero matches); test asserts `queryByRole('button', { name: 'More' })` is null |
| 3 | nav.practice / nav.learn resolve EN (Practice, Learn) and FR (Pratiquer, Apprendre) | ✓ VERIFIED | `src/lib/i18n/messages/chrome.ts` has both keys in `en` and `fr`; `messages.test.ts` en/fr key-parity gate passes (full suite green) |
| 4 | The three new hubs each render a tab icon; /practice reuses the former /drills glyph verbatim | ✓ VERIFIED | `TAB_ICONS['/practice']` SVG string is byte-identical to the pre-phase `TAB_ICONS['/drills']` string (diffed against `git show 297dc8f^:src/routes/+layout.svelte`); `/learn` (open book) and `/progress` (ascending bars) icons present |
| 5 | Each of the 8 old routes returns a 308 redirect to its owning hub | ✓ VERIFIED | All 8 `+page.ts` shims read (`drills`/`build`/`voicings`/`progressions` → `/practice`; `scales`/`theory` → `/learn`; `recall`/`songs` → `/progress`), each `throw redirect(308, target)` with `prerender = true`; `src/routes/redirectShims.test.ts` asserts status 308 + location for all 8 (part of the green full suite); static `build/` output confirms prerendered client-redirect HTML for each (e.g. `build/drills.html` → `location.href="/practice"`) |
| 6 | The orphan /showcase route no longer exists | ✓ VERIFIED | `src/routes/showcase/` directory does not exist; `find build -iname "*showcase*"` returns nothing in the built static output |
| 7 | The drill-seed handoff is preserved via /practice | ✓ VERIFIED | `src/routes/practice/+page.svelte` `buildSeededItems()` consumes `consumeLessonSeeds`/`consumeDrillSeeds` at the top of `load()`, builds prioritized name-it `CardedQueueItem`s, dedupes from composed queue, and gates every empty-state return behind `seededItems.length === 0`; all 5 `ProgressStats.svelte` handoffs, the Lookup `drillIt()` handler, `RecallSession.svelte` (x4), and `InteractiveLesson.svelte` navigate to `/practice` with `setDrillSeeds(...)` intact; `src/routes/practiceSeedHandoff.test.ts` behaviorally proves a seeded Cm7 becomes the first name-it question and starts a session with nothing due, and that a subsequent unseeded render lands on empty-none-due (one-shot consumption, no leak) — both assertions pass |
| 8 | Full build + test + svelte-check green | ✓ VERIFIED | `npm run build` succeeds (adapter-static writes 8 prerendered redirect pages); `npm test` → 106 test files, 1459 tests, all passed; `npm run check` → svelte-check 0 errors, 0 warnings across 1378 files |

**Score:** 8/8 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/routes/+layout.svelte` | 4-entry navLinks, 3 new TAB_ICONS, More sheet removed | ✓ VERIFIED | Exists, substantive, wired — rendered by masthead/tab-bar tests |
| `src/lib/i18n/messages/chrome.ts` | nav.practice/nav.learn in en+fr | ✓ VERIFIED | Both keys present, both locales |
| `tests/masthead.e2e.test.ts` | 4-hub assertions, no old-route/More assertions | ✓ VERIFIED | Rewritten per plan; passes |
| `src/routes/practice/+page.svelte` | seed consumption wired into load() | ✓ VERIFIED | `buildSeededItems()` present and called; behavioral test passes |
| `src/routes/practiceSeedHandoff.test.ts` | regression test for seeded handoff | ✓ VERIFIED | Exists, both cases pass |
| `src/lib/components/ProgressStats.svelte` | 5 handoffs → /practice | ✓ VERIFIED | All 5 `goto`/`href` targets are `/practice`, `setDrillSeeds` intact |
| `src/routes/+page.svelte` (Lookup) | drillIt() → /practice | ✓ VERIFIED | `goto('/practice')` after `setDrillSeeds([result.symbol])` |
| `src/lib/components/RecallSession.svelte` | 4x "Practice Now" → /practice | ✓ VERIFIED | All 4 `href="/practice"` |
| `src/lib/components/InteractiveLesson.svelte` | lesson handoff → /practice | ✓ VERIFIED | `href="/practice"` |
| `src/lib/components/BuildSession.svelte` | "Recall It Now" → /progress | ✓ VERIFIED | `href="/progress"` |
| `src/routes/{drills,build,voicings,progressions}/+page.ts` | 308 → /practice, prerender=true | ✓ VERIFIED | All 4 confirmed |
| `src/routes/{scales,theory}/+page.ts` | 308 → /learn | ✓ VERIFIED | Both confirmed |
| `src/routes/{recall,songs}/+page.ts` | 308 → /progress | ✓ VERIFIED | Both confirmed |
| `src/routes/showcase/` | deleted | ✓ VERIFIED | Directory absent |
| `src/routes/redirectShims.test.ts` | asserts all 8 shims | ✓ VERIFIED | Present, all 8 asserted, passes |
| `src/lib/i18n/coverage.test.ts` | updated (not deleted) off 6 deleted pages | ✓ VERIFIED | Repointed masthead FR block to Practice/Pratiquer; removed DrillsPage/BuildPage/RecallPage/ScalesPage/SongsPage/TheoryPage imports and their describe blocks; passes |
| 15 obsolete route-bound test files | deleted | ✓ VERIFIED | All 15 confirmed absent from the tree |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `+layout.svelte` navLinks | `bottomTabLinks` | `.filter()` derivation | WIRED | No second literal list; single source array confirmed |
| `+layout.svelte` TAB_ICONS | masthead/tab-bar render | keyed by href, `{@html}` | WIRED | Icons render for all 4 hrefs |
| ProgressStats/Lookup/RecallSession/InteractiveLesson handoffs | `/practice` load() | `setDrillSeeds` → `consumeDrillSeeds`/`consumeLessonSeeds` | WIRED | Seed channel write/read pair confirmed end-to-end; behavioral test proves the seeded chord surfaces as first question |
| 8 shim `+page.ts` files | target hub routes | `redirect(308, target)` | WIRED | All 8 confirmed via source read + `redirectShims.test.ts` |
| `coverage.test.ts` | surviving hub surfaces | render of RootLayout/HomePage/ProgressPage only | WIRED | Deleted-page imports removed; file compiles and passes |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| HUB-01 | 30-01 | 4 top-level hubs, no More sheet | ✓ SATISFIED | navLinks/bottomTabLinks/TAB_ICONS confirmed; masthead.e2e.test.ts green |
| HUB-02 | 30-05 | Orphan showcase route deleted | ✓ SATISFIED | `src/routes/showcase/` absent; build output has no showcase page |
| HUB-03 | 30-02, 30-03, 30-04, 30-05 | 8 old routes redirect to owning hub | ✓ SATISFIED | All 8 shims confirmed 308 + correct target; redirectShims.test.ts green; all internal handoffs repointed off retired routes |

No orphaned requirements — REQUIREMENTS.md's traceability table maps exactly HUB-01/02/03 to Phase 30, matching the 3 requirement IDs declared across the phase's 5 plans.

### Anti-Patterns Found

None. Grep for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER|not implemented|coming soon` (case-insensitive) across the phase's modified files returned only legitimate pre-existing uses of the literal word "placeholder" (an HTML `placeholder` input attribute, a `{SYMBOL}` template-substitution constant, and a CSS class name for an unrelated build-mode UI affordance) — none are debt markers or stubs.

### Behavioral Spot-Checks / Full-Suite Execution

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| svelte-check clean | `npm run check` | 1378 files, 0 errors, 0 warnings | ✓ PASS |
| Static build succeeds with redirects prerendered | `npm run build` | Build succeeded; `build/drills.html` etc. contain `location.href="/practice"` client-redirect; no showcase output | ✓ PASS |
| Full test suite green | `npm test` | 106 test files, 1459 tests, all passed (124s) | ✓ PASS |
| Seeded /practice session behavior | `practiceSeedHandoff.test.ts` (run as part of full suite) | Seeded Cm7 becomes first name-it question with a startable session and nothing due; unseeded re-render lands on empty-none-due | ✓ PASS |
| All 8 redirect shims | `redirectShims.test.ts` (run as part of full suite) | All 8 assert 308 + correct location | ✓ PASS |

Note: only one full-suite run (`npm test`) was executed, per the constraint against repeated full-run filtering.

### Human Verification Required

None. This phase's UAT notes flagged that the preview harness cannot hydrate this app (null-origin SvelteKit), so purely-visual confirmations (icon shapes/spacing on an actual phone viewport) would normally route to human verification — but every truth in this phase's must-haves was verifiable via source read, the full automated test suite (which exercises DOM structure/roles/hrefs/aria-labels via jsdom), and the static build output, with no remaining behavior-dependent or visual-only claim left unverified by those means. No human verification items are outstanding for this phase's stated goal.

### Gaps Summary

None. All 3 requirement IDs (HUB-01, HUB-02, HUB-03), all 5 plans' must-haves, and the phase's stated goal are verified directly against the codebase: navigation collapsed to 4 hubs with the More sheet fully removed, all 8 old routes are prerender-safe 308 shims to the correct absorbing hub, /showcase is deleted, the drill/lesson-seed handoff is wired into /practice and behaviorally proven, and the full build/test/svelte-check gate is green (106 files / 1459 tests / 0 type errors).

---

_Verified: 2026-07-25T13:05:00Z_
_Verifier: Claude (gsd-verifier)_
