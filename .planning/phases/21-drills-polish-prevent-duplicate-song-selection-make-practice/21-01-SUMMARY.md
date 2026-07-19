---
phase: 21-drills-polish-prevent-duplicate-song-selection-make-practice
plan: 01
subsystem: ui
tags: [svelte5, i18n, drills, songs, vitest]

requires:
  - phase: 20-songs-theory-i18n
    provides: bilingual i18n layer (t()/setLocale), SongFilterToggle shared component, /drills and /songs pages
provides:
  - findSongByPresetId, a total pure presetId lookup used to dedupe preset adds
  - SongFilterToggle discrete?: boolean opt-in variant (Drills-only recede/reveal styling)
  - An on-demand chord replay control in the /drills answer reveal
affects: [songs, drills, recall]

tech-stack:
  added: []
  patterns:
    - "Opt-in component variant via a boolean prop + scoped CSS class, so a shared component's base styling never changes for other consumers (SongFilterToggle discrete)."
    - "Dedupe-by-provenance-id (presetId) rather than by name/content, mirroring the existing upsert-by-id pattern in songs.ts."

key-files:
  created:
    - src/routes/drillsChordReplay.test.ts
  modified:
    - src/lib/practice/songs.ts
    - src/routes/songs/+page.svelte
    - src/lib/i18n/messages/songs.ts
    - src/lib/practice/songs.test.ts
    - src/routes/songsPage.test.ts
    - src/lib/components/SongFilterToggle.svelte
    - src/routes/drills/+page.svelte
    - src/lib/components/songFilterToggle.test.ts
    - src/lib/i18n/messages/drills.ts

key-decisions:
  - "DPOL-01 dedupes by presetId, not by name; custom-song duplicates stay explicitly out of scope."
  - "DPOL-02's discrete recede/reveal is an opt-in SongFilterToggle prop, not a Drills-scoped global CSS override, so Recall's copy of the bar is provably byte-identical (no prop passed = old CSS class list unchanged)."
  - "DPOL-03's replay control sits in its own {#if question.kind === 'chord'} block outside the correct/wrong if-else, so it renders for both directions and both outcomes without duplicating the button in two branches."

patterns-established:
  - "Opt-in prop + scoped CSS class variant for shared components used by multiple pages (extend this instead of caller-specific overrides when only one consumer needs a visual change)."

requirements-completed: [DPOL-01, DPOL-02, DPOL-03]

coverage:
  - id: D1
    description: "Clicking an already-added preset card does not create a second song; it scrolls to the existing row and the card shows a bilingual Added / Déjà ajouté marker."
    requirement: "DPOL-01"
    verification:
      - kind: unit
        ref: "src/lib/practice/songs.test.ts#findSongByPresetId (DPOL-01)"
        status: pass
      - kind: integration
        ref: "src/routes/songsPage.test.ts#Preset shelf dedupe (DPOL-01)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The /drills practice-pool filter bar is an opt-in discrete variant: recedes on hover-capable desktops, reveals on hover/focus-within/focus-visible, stays fully readable on touch, and its CSS transition is skipped under prefers-reduced-motion; Recall's bar is unaffected."
    requirement: "DPOL-02"
    verification:
      - kind: unit
        ref: "src/lib/components/songFilterToggle.test.ts#SongFilterToggle discrete variant (DPOL-02)"
        status: pass
      - kind: integration
        ref: "src/routes/recallSongFilter.test.ts (regression: Recall renders unchanged)"
        status: pass
    human_judgment: true
    rationale: "The recede/reveal opacity behavior and its hover/focus-visible/prefers-reduced-motion CSS states are exercised by class-presence assertions only (jsdom does not compute layout/opacity/media-query state), so the actual visual recede-and-reveal interaction has not been eyeballed in a live browser this session."
  - id: D3
    description: "The /drills chord answer reveal offers an on-demand full-chord replay for chord questions (construction and identification, correct and wrong answers), reusing the existing playChord engine; never rendered for interval questions."
    requirement: "DPOL-03"
    verification:
      - kind: integration
        ref: "src/routes/drillsChordReplay.test.ts#Chord reveal replay (DPOL-03)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Both new i18n keys (songs.page.presets.added, drills.button.replayChord) exist in both en and fr with no em dashes."
    verification:
      - kind: unit
        ref: "src/lib/i18n/coverage.test.ts (full suite run, EN/FR parity enforced)"
        status: pass
    human_judgment: false

duration: 45min
completed: 2026-07-19
status: complete
---

# Phase 21 Plan 01: Drills Polish Summary

**Presets dedupe by presetId with an Added marker, the Drills practice-pool bar gets an opt-in discrete hover/focus-reveal variant that leaves Recall untouched, and chord answers get an on-demand full-chord replay button.**

## Performance

- **Duration:** ~45 min
- **Tasks:** 3/3 completed
- **Files modified:** 9 modified, 1 created

## Accomplishments
- Fixed a real duplication bug: adding the same preset twice on `/songs` now creates exactly one song, and the already-added preset card carries a bilingual "Added" / "Déjà ajouté" marker.
- Made the `/drills` practice-pool filter bar visually discrete via an opt-in `discrete` prop on the shared `SongFilterToggle` component, so it recedes on hover-capable desktops and reveals on hover/keyboard focus, while Recall's copy of the same component is provably unchanged (no prop passed there).
- Added a "Hear it again" full-chord replay control to the `/drills` answer reveal for chord questions in both directions, right or wrong, reusing the exact same `playChord` call the auto-play already makes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Prevent duplicate preset song (DPOL-01)** - `b6010eb` (fix)
2. **Task 2: Make the /drills practice-pool filter bar discrete (DPOL-02)** - `a3c4287` (feat)
3. **Task 3: Replay the answered chord on demand (DPOL-03)** - `67c3c89` (feat)

_No TDD gate declared on this plan (`tdd="true"` only on Task 1); each task shipped as a single behavior+test commit rather than separate RED/GREEN commits, matching how prior phase plans in this codebase have executed non-strict-TDD tasks._

## Files Created/Modified
- `src/lib/practice/songs.ts` - Added `findSongByPresetId`, a total pure presetId lookup.
- `src/routes/songs/+page.svelte` - `addPreset` now dedupes by presetId (scroll-only reuse path); added `addedPresetIds` derived set and the "Added" marker on preset cards.
- `src/lib/i18n/messages/songs.ts` - Added `songs.page.presets.added` (EN "Added" / FR "Déjà ajouté").
- `src/lib/practice/songs.test.ts` - `findSongByPresetId` unit tests (empty, match, ignores custom/non-matching).
- `src/routes/songsPage.test.ts` - Double-click-same-preset dedupe + Added-marker integration tests.
- `src/lib/components/SongFilterToggle.svelte` - Added opt-in `discrete?: boolean` prop and scoped `.song-filter-toggle-bar--discrete` CSS (lighter box, `@media (hover: hover)` recede/reveal, `:focus-within`/`:focus-visible` reveal, `prefers-reduced-motion` transition guard).
- `src/routes/drills/+page.svelte` - Passes `discrete` to `SongFilterToggle`; added `replayChord()` and the chord-only reveal replay button; added `drills.button.replayChord` key usage.
- `src/lib/components/songFilterToggle.test.ts` - Discrete-variant opt-in assertions (class present only when `discrete: true`).
- `src/lib/i18n/messages/drills.ts` - Added `drills.button.replayChord` (EN "Hear it again" / FR "Réécouter").
- `src/routes/drillsChordReplay.test.ts` - New: replay renders for chord construction/identification, right/wrong, absent for intervals; click triggers `playChord` with `target.notes` letters.

## Decisions Made
- Dedupe guard is `presetId`-based per the locked CONTEXT decision; custom-song duplicates remain explicitly out of scope.
- Chose the opt-in-prop route for DPOL-02 (over Drills-scoped global CSS) so Recall's rendering is provably unaffected by inspection of the component's own prop default, not just by manual review of drills/+page.svelte's usage site.
- Replay control lives in its own `{#if question.kind === 'chord'}` block placed right before the `drillInspect` block, outside the correct/wrong branch, so one code path covers both directions and both outcomes.

## Deviations from Plan

None - plan executed exactly as written. All three tasks matched their `<action>` blocks; no Rule 1-4 triggers encountered.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

All three DPOL requirements are implemented, tested, and verified:
- `npx vitest run` (full suite): 85 test files, 1254 tests, all passing.
- `npm run check` (svelte-check/tsc): 1321 files, 0 errors, 0 warnings.

One item flagged for human follow-up (see `coverage` D2 above): the DPOL-02 discrete recede/reveal CSS (opacity gating under `@media (hover: hover)`, `:focus-within`, `:focus-visible`, `prefers-reduced-motion`) is verified by class-presence assertions only; a live-browser visual pass on `/drills` (desktop hover recede/reveal, touch readability, Recall bar unchanged) has not been performed this session and is recommended before considering DPOL-02 fully closed.

---
*Phase: 21-drills-polish-prevent-duplicate-song-selection-make-practice*
*Completed: 2026-07-19*

## Self-Check: PASSED

All 10 created/modified source files and the SUMMARY.md itself verified present on disk; all 3 task commit hashes (`b6010eb`, `a3c4287`, `67c3c89`) verified present in `git log --oneline --all`.
