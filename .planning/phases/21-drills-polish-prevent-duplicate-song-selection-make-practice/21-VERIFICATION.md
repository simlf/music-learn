---
phase: 21-drills-polish-prevent-duplicate-song-selection-make-practice
verified: 2026-07-19T13:30:00Z
status: passed
status_note: "Shipped on user approval (2026-07-19). 5/6 must-haves machine-verified; the DPOL-02 desktop hover recede-reveal is accepted-unverified pending a user eyeball on /drills (CSS confirmed structurally correct). See human_verification below."
score: 5/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Open /drills on a hover-capable desktop browser (Chrome/Firefox), reach the practice-pool filter bar, and observe it at rest (not hovered/focused)."
    expected: "The bar sits at reduced opacity (~0.5) and is visibly less prominent than the drill card; hovering the bar or tabbing into it (focus-within/focus-visible) raises it to full opacity with a short (160ms) fade, not an instant snap unless prefers-reduced-motion is set; on a touch device or narrow/no-hover viewport the bar stays at full readable opacity at all times without needing a hover."
    why_human: "jsdom (the test environment) does not compute layout, opacity, or evaluate @media (hover:hover) / prefers-reduced-motion at runtime. The existing tests only assert class presence (`song-filter-toggle-bar--discrete` applied/absent), not the resulting rendered opacity or transition behavior. The CSS itself was read and confirmed structurally correct (see Key Link Verification), but the actual recede-and-reveal interaction has not been eyeballed in a live browser."
---

# Phase 21: Drills Polish Verification Report

**Phase Goal:** Polish the practice surfaces: adding a preset song can no longer create a duplicate; the /drills practice-pool filter bar recedes so it stops breaking immersion (discrete on desktop, revealing on hover/focus) while its on/off state keeps persisting; and after answering a chord the user can replay the full chord on demand to aid memorization.
**Verified:** 2026-07-19
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Clicking an already-added preset card does not create a second song (DPOL-01); it scrolls to / highlights the existing row instead | ✓ VERIFIED | `src/routes/songs/+page.svelte:206-217` `addPreset` calls `findSongByPresetId(songs, preset.presetId)` first; when found it only calls `scrollToSongRow(existing.id)` and returns, `saveSong` is not reached. `src/routes/songsPage.test.ts:82-94` clicks the same preset card twice and asserts exactly one `song-row`. |
| 2 | An already-added preset card shows a bilingual "Added" / "Déjà ajouté" marker (DPOL-01) | ✓ VERIFIED | `addedPresetIds` derived set (`+page.svelte:46-48`) drives `class:preset-card--added` and a `data-testid="preset-added-marker"` span rendering `t('songs.page.presets.added')` (`+page.svelte:300,312-318`). Keys present in both locale blocks: `src/lib/i18n/messages/songs.ts:63` (`'Added'`) and `:135` (`'Déjà ajouté'`). Test asserts the marker at `songsPage.test.ts:92-93`. |
| 3 | On desktop the /drills practice-pool filter bar recedes (reduced opacity) during play and lifts to full opacity on hover and on focus-within/focus-visible (DPOL-02) | ⚠️ NEEDS HUMAN (visual) | CSS read and structurally correct: `SongFilterToggle.svelte:134-150` — `@media (hover: hover) { .song-filter-toggle-bar--discrete { opacity: 0.5; transition: opacity 160ms ease-out } :hover, :focus-within { opacity: 1 } }`, plus `:has(.song-filter-toggle:focus-visible) { opacity: 1 }` outside the media query so keyboard focus always reveals it regardless of hover capability. jsdom cannot evaluate `@media (hover:hover)`/computed opacity, so only class-presence is exercised by tests, not the rendered visual result. See Human Verification. |
| 4 | On touch / no-hover devices the /drills filter bar stays at readable opacity with lighter compact styling (DPOL-02) | ✓ VERIFIED | `SongFilterToggle.svelte:130-132` sets `.song-filter-toggle-bar--discrete { opacity: 1 }` unconditionally (outside any media query); the `@media (hover:hover)` block is the only place opacity drops to 0.5, so no-hover/touch environments never see the reduced state by construction. Lighter/compact styling (`border:none; background:transparent; padding: var(--spacing-sm) 0`) at `:123-127` is unconditional for the discrete variant. |
| 5 | The /drills filter on/off state still survives a reload via localStorage['music-learn:drills-song-filter'] (DPOL-02 regression guard) | ✓ VERIFIED | `drills/+page.svelte:184-211` `readDrillsSongFilter`/`toggleSongFilter` and the literal key `'music-learn:drills-song-filter'` are unchanged from before this phase (only `discrete` was added to the component call at line 924). `src/routes/drillsSongFilter.test.ts` passes (10 tests, part of full-suite run below). |
| 6 | In the /drills answer reveal for a chord question (both construction and identification directions), a control replays the full chord on demand (DPOL-03) | ✓ VERIFIED | `drills/+page.svelte:1171-1177`: `{#if question.kind === 'chord'}` block (outside the correct/wrong branch, so it renders for both outcomes) renders a button calling `replayChord()` (`:467-471`, `playChord(target.notes.map(n => n.letter))`, the same call `recordGrade` auto-plays). Absent for interval questions (no such block in the `:else` interval branch). `src/routes/drillsChordReplay.test.ts` (4 tests) covers construction, identification, right/wrong, and interval-absence; all pass. |

**Score:** 5/6 truths verified (1 needs human/live-browser confirmation)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/practice/songs.ts` — `findSongByPresetId` | Total pure presetId lookup helper | ✓ VERIFIED | Lines 106-108: `songs.find((song) => song.presetId === presetId)`. Never throws; custom songs (`presetId: undefined`) never match a string id. Unit-tested at `songs.test.ts:127-145` (empty list, match, ignores custom/non-matching). |
| `src/lib/i18n/messages/songs.ts` — `songs.page.presets.added` (EN+FR) | Bilingual "Added"/"Déjà ajouté" key | ✓ VERIFIED | Line 63 (`en`): `'Added'`; line 135 (`fr`): `'Déjà ajouté'`. No em dash. |
| `src/lib/components/SongFilterToggle.svelte` — discrete prop + scoped CSS | Opt-in `discrete?: boolean` variant | ✓ VERIFIED | `Props.discrete?: boolean` (line 33), destructured with default `false` (line 36), applied via `class:song-filter-toggle-bar--discrete={discrete}` (line 48). Base (non-discrete) CSS rules (lines 65-116) untouched. |
| `src/lib/i18n/messages/drills.ts` — `drills.button.replayChord` (EN+FR) | Bilingual "Hear it again"/"Réécouter" key | ✓ VERIFIED | Line 80 (`en`): `'Hear it again'`; line 171 (`fr`): `'Réécouter'`. No em dash. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `addPreset` (songs/+page.svelte:206) | `findSongByPresetId` (songs.ts:106) | direct call, branches on result | ✓ WIRED | Existing branch skips `saveSong` entirely when a match is found; verified by reading the function body and by the dedupe test. |
| `drills/+page.svelte:924` | `SongFilterToggle` `discrete` prop | `<SongFilterToggle ... discrete />` | ✓ WIRED | Confirmed at line 924 (bare `discrete` = `true`). |
| `recall/+page.svelte:84-91` | `SongFilterToggle` (no `discrete`) | prop omitted | ✓ WIRED (regression-safe) | Recall's call site (lines 84-91) has no `discrete` prop, so it defaults to `false` and renders the original loud box; `recallSongFilter.test.ts` (10 tests) passes unchanged. |
| Replay button (`drills/+page.svelte:1173`) | `replayChord()` -> `playChord(target.notes.map(n => n.letter))` | `onclick={replayChord}` | ✓ WIRED | Same call shape as `recordGrade`'s auto-play (line 478-480); confirmed by `drillsChordReplay.test.ts` asserting `playChordMock` invoked with the chord's note letters on click. |

### Behavioral Spot-Checks / Test Execution

| Check | Command | Result | Status |
|-------|---------|--------|--------|
| Full test suite | `npx vitest run` | 85 test files, 1254 tests, all passed (95.16s) | ✓ PASS |
| Type/template check | `npm run check` | `svelte-check`: 1321 files, 0 errors, 0 warnings | ✓ PASS |
| i18n EN/FR parity | `npx vitest run src/lib/i18n/coverage.test.ts` | 21 tests passed | ✓ PASS |
| DPOL-02 regression scope | `npx vitest run src/routes/recallSongFilter.test.ts src/routes/drillsSongFilter.test.ts` | 2 files, 20 tests passed | ✓ PASS |
| Commits present | `git log --oneline --all \| grep -E "b6010eb\|a3c4287\|67c3c89"` | All 3 task commits found (`fix(21)`, `feat(21)` x2) | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|-------------|--------------|--------|----------|
| DPOL-01 | 21-01-PLAN.md | Prevent duplicate preset song add; show Added marker | ✓ SATISFIED | Truths 1-2, artifact `findSongByPresetId`, key link `addPreset` branch |
| DPOL-02 | 21-01-PLAN.md | Discrete /drills filter bar, hover/focus reveal, touch readable, persistence kept, Recall unbroken | ✓ SATISFIED (visual reveal behavior flagged for human confirmation) | Truths 3-5, artifact `discrete` prop, key links to drills/recall usage |
| DPOL-03 | 21-01-PLAN.md | On-demand full-chord replay in reveal, chord-only | ✓ SATISFIED | Truth 6, key link replay button -> `playChord` |

No orphaned requirements: `.planning/REQUIREMENTS.md` has no separate DPOL-* entries outside ROADMAP.md (this phase's requirements are defined and delivered entirely within ROADMAP.md Phase 21 + the plan's `requirements:` field, which match).

### Anti-Patterns Found

None. Scanned all phase-modified files (`songs.ts`, `songs/+page.svelte`, `messages/songs.ts`, `SongFilterToggle.svelte`, `drills/+page.svelte`, `messages/drills.ts`) for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` and em dashes (`—`): zero matches in any of them.

### Project Constraints Check

- **No em dashes in new UI copy:** confirmed — grep for `—` across all modified source/i18n files returned nothing.
- **New strings have both EN and FR entries:** confirmed — `songs.page.presets.added` (EN line 63 / FR line 135) and `drills.button.replayChord` (EN line 80 / FR line 171); `src/lib/i18n/coverage.test.ts` (21 tests) passes, which enforces EN/FR key parity across the whole catalog.
- **No new dependencies, pages, schema, or persistence keys:** confirmed by reading `package.json` diff surface (none touched per `files_modified` list) and by inspecting that the only persistence key referenced is the pre-existing `music-learn:drills-song-filter`.

### Human Verification Required

### 1. Desktop hover/focus recede-and-reveal of the /drills filter bar

**Test:** On a hover-capable desktop browser, load `/drills`, let the practice-pool bar render at rest, then hover it, then tab away and tab back in (keyboard focus), then tab into the toggle button specifically (focus-visible).
**Expected:** At rest the bar is visibly dimmed (roughly half-opacity) and less prominent than the drill card; hovering it or moving keyboard focus into it raises it to full, readable opacity with a short fade (unless the OS/browser has "reduce motion" set, in which case the change should be instant); it should never become fully invisible.
**Why human:** The CSS (`@media (hover:hover)`, `:hover`, `:focus-within`, `:has(:focus-visible)`, `prefers-reduced-motion`) was read and is structurally correct, but jsdom (the automated test environment) does not lay out, apply media queries, or compute opacity, so no automated check can confirm the actual rendered recede/reveal interaction.

### 2. Touch-device readability spot check (lower priority, code strongly implies pass)

**Test:** On a touch device (phone/tablet) or a desktop with hover simulated off, load `/drills` and confirm the filter bar is fully readable at all times (no dimmed state).
**Expected:** The bar stays at normal opacity always; no hover-dependent dimming appears.
**Why human:** Same jsdom limitation as above; the CSS logic (opacity:1 outside the hover-capable media query) is simple enough that this is very likely to pass, included here mainly to close out DPOL-02 alongside item 1 in the same browser session.

### Gaps Summary

No gaps found. All three requirements (DPOL-01, DPOL-02, DPOL-03) have working, tested, wired implementations. The single open item is not a code gap: the DPOL-02 discrete recede/reveal CSS is correct by inspection and covered by class-presence tests, but the actual hover/focus opacity transition has not been visually confirmed in a live browser (jsdom cannot exercise `@media (hover:hover)` or computed opacity). This is flagged for human sign-off rather than as a blocking defect, consistent with the executor's own SUMMARY.md D2 flag.

---

_Verified: 2026-07-19_
_Verifier: Claude (gsd-verifier)_
