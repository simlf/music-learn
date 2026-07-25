---
phase: 29-progress-hub-stats-streak-review-map-songs
verified: 2026-07-25T05:35:00Z
status: passed
score: 10/10 must-haves verified
behavior_unverified: 0
overrides_applied: 1
override_reason: "10/10 automated must-haves passed. The 1 remaining human_verification item is visual-only (3-tab chrome consistency) and cannot be exercised by jsdom or the null-origin SvelteKit preview harness. Deferred to on-device eyeball per established project convention and the user's auto-run-all directive. Tracked in 29-UAT.md; resume with /gsd-verify-work 29."
human_verification:
  - test: "Load /progress on a phone-width viewport (or resize the browser to ~375px) and switch through Stats -> Recall -> Songs. Compare the panel chrome (border, background, padding) across all three tabs."
    expected: "All three tabs read as one consistent 'panel language' per 29-UI-SPEC.md's Layout Contract: ProgressStats and SongManager (host-wrapped in `border-ink bg-paper-bright border-2 px-2 py-6 sm:px-6`) should look visually equivalent to RecallPanel's own internal panel (`border-ink bg-paper-bright mt-4 border-2 px-2 py-6 sm:px-6`) — no section should look double-bordered or barer than the others. Vermilion accent count on screen at any time should stay low (one selected tab + at most one selected nested toggle + 0-1 visible primary CTA)."
    why_human: "This is a purely visual/subjective consistency judgment (spacing rhythm, border-doubling, accent density) that cannot be confirmed by source grep or unit tests. The preview harness in this environment cannot hydrate this SvelteKit app (null-origin), so it must be checked on-device/in-browser. The phase's own 29-UI-SPEC.md checker sign-off section is still unchecked ('Approval: pending'), and the 29-04-SUMMARY.md explicitly lists this as a deferred on-device visual pass."
---

# Phase 29: Progress Hub — Stats, Streak, Review Map, Songs Verification Report

**Phase Goal:** One /progress surface presents stats + streak + weak spots + the SRS review map + song management (absorbing /recall and /songs) as a 3-tab hub (Stats|Recall|Songs, Recall keeps nested Review|Map); /recall and /songs keep working; no regression; song filter still written from the Songs section and read by Practice/Recall.
**Verified:** 2026-07-25T05:35:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | (ROADMAP SC1) Progress hub shows stats, streak, and weak spots (former `progress` route) | ✓ VERIFIED | `src/routes/progress/+page.svelte` renders `<ProgressStats />` on the default (`activeTab==='stats'`) tab; `ProgressStats.svelte` (487 lines) contains the full streak hero, weakest-spots, accuracy table, calibration/danger-cards, and practice-settings body extracted verbatim from the former `/progress`, with every original testid preserved (`streak-hero`, `weakest-spots`, `confidence-calibration`, `danger-cards`, `practice-settings`, etc.) |
| 2 | (ROADMAP SC2) Progress hub shows the SRS review map (former `recall` route) | ✓ VERIFIED | Hub's Recall tab renders `<RecallPanel bind:mode={recallMode} />`; `RecallPanel.svelte` contains the Review\|Map toggle and renders `<RecallMap />` when `mode==='map'`, byte-identical to the former `/recall` composition |
| 3 | (ROADMAP SC3) Progress hub shows song management, including the From-my-songs filter (former `songs` route) | ✓ VERIFIED | Hub's Songs tab renders `<SongManager heading={false} />`; `SongManager.svelte` (574 lines) contains the full song CRUD/presets/didYouMean body plus `SongFilterToggle` at the top of its content, exactly matching 29-UI-SPEC's placement contract |
| 4 | (ROADMAP SC4) All three formerly separate surfaces are reachable from the one Progress surface | ✓ VERIFIED | `/progress/+page.svelte` renders a `role="group"` 3-button tab switch (`data-testid="hub-tabs"`) labelled Stats/Recall/Songs via `progress-hub.tab.*` keys; clicking each tab mounts the corresponding section per the `{#if}/{:else if}/{:else}` block |
| 5 | `/progress` is one surface with a 3-tab switch, only the active section mounted | ✓ VERIFIED | `{#if activeTab === 'stats'}...{:else if activeTab === 'recall'}...{:else}...{/if}` — Svelte only instantiates the active branch; no CSS-hide pattern used |
| 6 | Recall tab keeps the nested Review\|Map toggle + RecallSession + RecallMap; Songs tab shows the full SongManager including SongFilterToggle | ✓ VERIFIED | `RecallPanel.svelte` source read directly: `data-testid="mode-toggle"` group + `{#if mode==='review'}<RecallSession .../>{:else}<RecallMap /></if}`; `SongManager.svelte` source read directly: `<SongFilterToggle poolLabel=... on={songFilterOn} onToggle={toggleSongFilter} .../>` present before the song list |
| 7 | CRITICAL: `data-review-dock` gated on BOTH `activeTab==='recall'` AND `recallMode==='review'`, never on Stats/Songs | ✓ VERIFIED | `src/routes/progress/+page.svelte` line 27: `data-review-dock={activeTab === 'recall' && recallMode === 'review' ? '' : undefined}` — exact compound gate. Confirmed behaviorally by `tests/progress-hub.e2e.test.ts` "Review-dock gating (CRITICAL coupling)" test: absent on Stats, present on Recall+Review, absent on Recall+Map, absent on Songs (ran this test directly — passes) |
| 8 | DRY: ProgressStats/RecallPanel/SongManager are ONE source of truth; `/recall` + `/songs` are thin wrappers with no copy-paste | ✓ VERIFIED | `/songs/+page.svelte` = 7 lines rendering `<SongManager />` (default heading=true); `/recall/+page.svelte` = 18 lines rendering `<RecallPanel bind:mode={recallMode} />` with its own `data-review-dock={recallMode==='review' ...}` gate; hub renders the SAME three components. No duplicated markup found in any of the three host files |
| 9 | Song filter: SongFilterToggle (sole `writeSongFilter` caller) lives in SongManager; global-key contract intact | ✓ VERIFIED | `grep -rn writeSongFilter src/` shows exactly one call site (`SongManager.svelte:63`, inside `toggleSongFilter`); `RecallPanel.svelte`, `src/routes/practice/+page.svelte`, and `src/routes/drills/+page.svelte` only call `readSongFilter` (read-only consumers) — single-writer contract confirmed unbroken |
| 10 | REG-01/REG-02: `/recall`, `/songs`, `/progress` existing e2e suites pass unedited; full suite + svelte-check green | ✓ VERIFIED | Ran full suite directly (not trusting SUMMARY claims): `npx vitest run` → 119 files, 1611 tests, all pass. `npx svelte-check` → 0 errors, 0 warnings, 1392 files. Also ran targeted subset (`progress-hub.e2e.test.ts`, `progress.e2e.test.ts`, `songs.e2e.test.ts`, `messages.test.ts`, `coverage.test.ts`) → 5 files, 65 tests, all pass |

**Score:** 10/10 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/i18n/messages/progress-hub.ts` | New i18n domain, 4 EN + 4 FR keys, no em dashes | ✓ VERIFIED | Read directly: exactly `tab.stats/tab.recall/tab.songs/aria.tabs` in both locales, no em dashes, header comment present |
| `src/lib/components/SongManager.svelte` | Extracted `/songs` body, bare fragment, `heading` prop | ✓ VERIFIED | 574 lines; `heading = true` prop gates only `songs.page.title` h1 + subtitle (lines 268-273); no outer `<main>` |
| `src/lib/components/RecallPanel.svelte` | Extracted `/recall` composition, `$bindable mode` | ✓ VERIFIED | `let { mode = $bindable<Mode>('review') } = $props()` (correct Svelte 5 runes syntax, not `export let`); no outer `<main>`, no dock attribute (host-owned) |
| `src/lib/components/ProgressStats.svelte` | Extracted `/progress` stats body, bare fragment | ✓ VERIFIED | 487 lines; no `<h1>`, no outer `<main>`; owns `fetchStats`/`fetchStreak`/`onMount`/token/calibration/settings verbatim |
| `src/routes/progress/+page.svelte` | Rewritten as 3-tab hub host | ✓ VERIFIED | 71 lines; tab state, dock-gate, single shared `<h1>`, composes all three extracted components |
| `src/routes/recall/+page.svelte` | Thin wrapper | ✓ VERIFIED | 18 lines; renders `<RecallPanel bind:mode={recallMode} />` with its own `data-review-dock` gate |
| `src/routes/songs/+page.svelte` | Thin wrapper | ✓ VERIFIED | 7 lines; renders `<SongManager />` inside original `<main>` frame class |
| `tests/progress-hub.e2e.test.ts` | New hub smoke test | ✓ VERIFIED | 6 tests: tab switch, Stats default, Recall Map reveal, Songs presets, filter-write contract, dock-gating lifecycle — all read and confirmed to assert real behavior (not tautologies), ran directly and passes |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `progress-hub.ts` | `messages/index.ts` | `...progressHub.en` / `...progressHub.fr` spreads | ✓ WIRED | Confirmed at lines 44/61 of index.ts |
| `progress-hub.ts` | `messages.test.ts` | `['progress-hub', progressHub.en]` in domains array | ✓ WIRED | Confirmed at line 66 |
| `/songs/+page.svelte` | `SongManager.svelte` | `<SongManager />` (heading defaults true) | ✓ WIRED | Confirmed |
| `/recall/+page.svelte` | `RecallPanel.svelte` | `<RecallPanel bind:mode={recallMode} />` | ✓ WIRED | Confirmed |
| `/progress/+page.svelte` | `ProgressStats` + `RecallPanel` + `SongManager` | `{#if activeTab...}` switch | ✓ WIRED | Confirmed — only one component instantiated at a time |
| `SongFilterToggle` (inside SongManager) | `writeSongFilter` | sole caller | ✓ WIRED | Confirmed via repo-wide grep — one call site only |
| hub `<main>` | `data-review-dock` | `activeTab==='recall' && recallMode==='review'` | ✓ WIRED | Confirmed in source + exercised behaviorally by the new smoke test |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full suite green (REG-02) | `npx vitest run` | 119 files, 1611 tests, all pass | ✓ PASS |
| svelte-check clean | `npx svelte-check --tsconfig ./tsconfig.json` | 1392 files, 0 errors, 0 warnings | ✓ PASS |
| Hub smoke test (dock gating, filter write) | `npx vitest run tests/progress-hub.e2e.test.ts` (part of combined run above) | 6/6 pass, confirmed reading assertions directly | ✓ PASS |
| i18n parity/collision + coverage | `npx vitest run src/lib/i18n/messages.test.ts src/lib/i18n/coverage.test.ts` | pass | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|--------------|--------|----------|
| PROG-01 | 29-01, 29-02, 29-03, 29-04, 29-05 | Progress hub presents stats, streak, weak spots, SRS review map, and song management in one surface, absorbing former progress/recall/songs routes | ✓ SATISFIED | All 4 roadmap success criteria verified directly against source; hub composes the 3 extracted components with a real tab switch and correct dock coupling |

No orphaned requirements — REQUIREMENTS.md maps only PROG-01 to Phase 29; REG-01 and REG-02 are formally mapped to Phase 31, though this phase's plans voluntarily kept the full suite/svelte-check green as a guard (confirmed above).

### Anti-Patterns Found

None. Scanned all 10 phase-modified files (`progress-hub.ts`, `messages/index.ts`, `messages.test.ts`, `SongManager.svelte`, `songs/+page.svelte`, `RecallPanel.svelte`, `recall/+page.svelte`, `ProgressStats.svelte`, `progress/+page.svelte`, `progress-hub.e2e.test.ts`) for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER|coming soon|not yet implemented`. Only matches were legitimate HTML `placeholder=` input attributes (form fields) and one CSS comment referring to a loading-skeleton "static placeholder block" — neither is a stub/debt marker.

### Human Verification Required

### 1. On-device visual chrome consistency across the three tabs

**Test:** Load `/progress` on a phone-width viewport and switch through Stats → Recall → Songs. Compare panel borders, padding, and vermilion accent density across all three tabs.
**Expected:** All three tabs read as one consistent panel language per 29-UI-SPEC.md (no double-bordering, no tab looking barer than the others, low vermilion count at any time).
**Why human:** Purely visual/subjective judgment; the preview harness cannot hydrate this SvelteKit app (null-origin), and 29-UI-SPEC.md's own checker sign-off is still unchecked ("Approval: pending"). The 29-04-SUMMARY.md explicitly defers this as an on-device visual pass.

### Gaps Summary

No functional gaps found. All 10 must-have truths (4 from ROADMAP.md success criteria + 6 from PLAN frontmatter, deduplicated) are verified directly against source code — not inferred from SUMMARY.md claims. The DRY extraction is real (verified line counts, prop contracts, and absence of duplicated markup), the 3-tab switch mounts only the active section, the CRITICAL `data-review-dock` compound gate is implemented exactly as specified and is exercised by a real behavioral test that was independently confirmed to pass, and the single-writer song-filter contract is intact. The full 1611-test suite and svelte-check were re-run directly by this verifier (not taken on faith) and are green.

The only outstanding item is a genuinely visual, on-device consistency check that the phase's own artifacts (UI-SPEC checker sign-off, 29-04-SUMMARY's "Deferred" note) already flag as unresolved — this routes to human verification per the escalation-gate pattern rather than blocking the phase.

---

_Verified: 2026-07-25T05:35:00Z_
_Verifier: Claude (gsd-verifier)_
