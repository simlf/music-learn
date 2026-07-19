---
phase: 20-french-translation
plan: 05
subsystem: i18n
tags: [svelte5-runes, i18n, songs, chord-provenance]

requires:
  - phase: 20-french-translation
    provides: "Reactive locale store (currentLocale/setLocale/initLocale/t) in a Svelte 5 .svelte.ts runes module, merged en/fr message dictionary architecture, en/fr key-parity test seam (Plan 20-01)"
provides:
  - "Filled songs-domain i18n dictionary (src/lib/i18n/messages/songs.ts): SongMark/SongFilterToggle/SongHook shared-component copy plus every /songs page literal"
  - "SongMark, SongFilterToggle, and SongHook (Phase 18 shared components, rendered by Drills/Recall/Lookup/Songs) translated once at the source so every caller page inherits the flip"
  - "/songs profile page (title, empty state, register line, toggle labels, preset shelf, full new/edit CRUD form, delete confirm) fully readable in French"
affects: [20-06, 20-07, 20-08, 20-09, 20-10]

tech-stack:
  added: []
  patterns:
    - "t()-keyed templates with a literal {N} placeholder token (e.g. '{N} SONGS' / '{N} MORCEAUX'), substituted client-side via .replace('{N}', String(n)) since t() itself takes no interpolation arguments - mirrors the prefix/suffix composition pattern already used in drills.ts/build.ts for pluralized or parameterized copy"
    - "Shared cross-page components (SongMark/SongFilterToggle/SongHook) own their own internal-copy keys under the songs.* domain even though they're imported by other domains' pages; caller-supplied props (poolLabel/note/noteOn/noteOff) stay owned by the calling domain's own dictionary file (drills.ts, recall.ts), unchanged by this plan"

key-files:
  created: []
  modified:
    - src/lib/i18n/messages/songs.ts
    - src/lib/components/SongMark.svelte
    - src/lib/components/SongFilterToggle.svelte
    - src/lib/components/SongHook.svelte
    - src/lib/components/songMark.test.ts
    - src/lib/components/songFilterToggle.test.ts
    - src/lib/components/songHook.test.ts
    - src/routes/songs/+page.svelte
    - src/routes/songsPage.test.ts

key-decisions:
  - "songs.mark.count keeps the literal '{N}' token in both locale values and the component does a plain string .replace at render time, since locale.svelte.ts's t(key) signature takes no interpolation arguments (confirmed by reading locale.svelte.ts directly rather than assuming)"
  - "SongFilterToggle's poolLabel/note/noteOn/noteOff props are NOT given component-level t()-translated defaults: both real callers (drills/+page.svelte from Plan 20-04, recall/+page.svelte from Plan 20-02) already pass fully-translated strings built from their own domain dictionaries, so the component has no default copy to route through songs.* - verified by grepping both call sites before writing Task 2, not assumed from the plan's read_first note"
  - "The registerLine 'CUSTOM'/'PRESET' source tag and the toggle's bare 'ON' stamp were swept in as in-scope literals beyond the plan's explicit list (Task 1 said 'grep-sweep... for user-facing literals'); 'ON' was kept identical in both locales (t()-keyed for architectural consistency, deliberate same-value case, same pattern as the chrome.ts brand exception) since it reads as a compact iconographic stamp inside a fixed 28x28 box, not translatable prose"
  - "SONG_PRESETS' preset.note field (src/lib/practice/presets.ts) stays English-only: it is data-file content outside this plan's files_modified list and not enumerated in 20-UI-SPEC's coverage manifest, so it was left untouched rather than silently stubbed - flagged in Issues Encountered below for a future plan's attention if full preset-shelf translation is wanted"

patterns-established:
  - "songs.page.* prefix for the /songs route's own copy, distinct from the bare songs.* prefix used for the three shared cross-page components, so a future domain sweep can tell at a glance which keys are page-owned vs. component-owned"

requirements-completed: [I18N-02]

coverage:
  - id: D1
    description: "SongMark's multi-song tag renders '{N} MORCEAUX' under fr and the single-song '♪ {songName}' form stays byte-identical user data in both locales"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/lib/components/songMark.test.ts#SongMark renders in French (I18N-02, Phase 20 Plan 05)"
        status: pass
    human_judgment: false
  - id: D2
    description: "SongFilterToggle's fixed button copy reads 'Depuis mes morceaux' under fr while the caller-supplied poolLabel renders unchanged"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/lib/components/songFilterToggle.test.ts#SongFilterToggle renders in French (I18N-02, Phase 20 Plan 05)"
        status: pass
    human_judgment: false
  - id: D3
    description: "SongHook's tap-to-reveal toggle reads 'Ça sonne comme…' / 'Masquer l'air' under fr"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/lib/components/songHook.test.ts#SongHook renders in French (I18N-02, Phase 20 Plan 05)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The /songs page (heading, empty state, New song button) renders in French under fr while a user-entered song name and its chord-count register line render correctly (chord symbols/names never translate)"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/routes/songsPage.test.ts#Songs page renders in French (I18N-02, Phase 20 Plan 05)"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-18
status: complete
---

# Phase 20 Plan 05: Songs Surface + Shared Song Components Summary

**Filled the songs-domain i18n dictionary and rewired SongMark/SongFilterToggle/SongHook plus the /songs profile page to t(), flipping the Phase 18 song-provenance surface to French everywhere those shared components render (Drills, Recall, Lookup, Songs) while leaving user song names, chord symbols, and caller-owned filter-note props untouched.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-07-18T20:27:57+02:00 (first task commit)
- **Completed:** 2026-07-18T20:33:19+02:00 (last task commit)
- **Tasks:** 3
- **Files modified:** 9 (1 dictionary, 3 components + 3 component tests, 1 page + 1 new page test)

## Accomplishments
- Filled `src/lib/i18n/messages/songs.ts` with every songs-domain literal: the shared SongMark/SongFilterToggle/SongHook internal copy plus the full `/songs` page sweep (title, subtitle, empty state, register line, source tags, toggle labels, preset shelf, new/edit CRUD form, chord-entry errors, delete confirm) as balanced en/fr pairs.
- Rewired `SongMark.svelte`'s multi-song tag to a t()-keyed template with a literal `{N}` placeholder (`t('songs.mark.count').replace('{N}', String(songs.length))`), since `t()` has no interpolation support; the single-song `♪ {songName}` branch stays untouched (user data).
- Rewired `SongFilterToggle.svelte`'s fixed "From my songs" button text and `SongHook.svelte`'s "Sounds like…"/"Hide tune" toggle to `t('songs.filter.button')` / `t('songs.hook.*')`; verified both real callers (Drills, Recall) already pass fully-translated `poolLabel`/`note`/`noteOn`/`noteOff` props from their own domain dictionaries, so no component-level defaults were needed there.
- Rewired `songs/+page.svelte` end to end: `registerLine()` and the paste-failure error composer now build their strings from `t()` fragments instead of hardcoded English nouns; every template literal (headings, buttons, labels, placeholders, empty state, preset shelf, delete confirmation) reads `t('songs.page.*')`. CRUD/provenance logic (SONG-03 single source of truth) untouched.
- Extended all three component test files and added a new `src/routes/songsPage.test.ts` with fr-locale assertions (French chrome, English-default baseline, and a user-entered song name rendering byte-identical under `fr`).

## Task Commits

Each task was committed atomically:

1. **Task 1: Fill messages/songs.ts with the songs-domain dictionary** - `bde237d` (feat)
2. **Task 2: Rewire SongMark.svelte + SongFilterToggle.svelte + SongHook.svelte to t()** - `1a434ab` (feat)
3. **Task 3: Rewire songs/+page.svelte to t()** - `12fa931` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `src/lib/i18n/messages/songs.ts` - songs-domain dictionary: shared-component copy + full `/songs` page sweep
- `src/lib/components/SongMark.svelte` - multi-song `{N} SONGS`/`{N} MORCEAUX` template via t() + string replace; single-song form untouched
- `src/lib/components/SongFilterToggle.svelte` - fixed button copy via `t('songs.filter.button')`
- `src/lib/components/SongHook.svelte` - toggle copy via `t('songs.hook.soundsLike'/'hideTune')`
- `src/lib/components/songMark.test.ts` - fr-locale count + user-data-immunity assertions
- `src/lib/components/songFilterToggle.test.ts` - fr-locale button-copy assertion
- `src/lib/components/songHook.test.ts` - fr-locale toggle-copy assertion
- `src/routes/songs/+page.svelte` - full page rewired to `t('songs.page.*')`; registerLine/error composers rebuilt from t() fragments
- `src/routes/songsPage.test.ts` - new: en-default baseline, fr chrome flip, user-song-name-immunity test

## Decisions Made
- `songs.mark.count` keeps a literal `{N}` placeholder substituted client-side (confirmed `t()` has no interpolation by reading `locale.svelte.ts` directly).
- No component-level default `noteOn`/`noteOff` copy was added to `SongFilterToggle` - verified both real call sites (Drills, Recall) already own and pass fully-translated strings.
- `registerLine`'s `CUSTOM`/`PRESET` source tag and the toggle's `ON` stamp were swept in as in-scope literals during the Task 1 grep sweep; `ON` intentionally keeps the identical value in both locales (compact iconographic stamp, not translatable prose - mirrors the `chrome.ts` brand-immunity precedent).
- `SONG_PRESETS`' `preset.note` field (`src/lib/practice/presets.ts`) stays English-only - it's data-file content outside this plan's `files_modified` scope and outside 20-UI-SPEC's coverage manifest; left untouched rather than silently stubbed.

## Deviations from Plan

None (Rules 1-4) - plan executed exactly as written. Two scope clarifications worth noting (not deviations, since the plan's own Task 1 instructed "grep-sweep... for user-facing literals" and both were resolved via direct source verification rather than assumption):
- The `CUSTOM`/`PRESET`/`ON` register-line and toggle-stamp literals were in-scope discoveries during the sweep, translated under new `songs.page.source.*`/`songs.page.toggle.on` keys.
- `SongFilterToggle`'s `noteOn`/`noteOff` JSDoc-example copy is not live component copy (both real callers already supply their own translated strings), so Task 2's conditional "if the component ships default noteOn/noteOff copy" branch did not apply - verified by grep before concluding, not assumed.

## Issues Encountered
None. One out-of-scope note for future consideration: `SONG_PRESETS`' `preset.note` strings (rendered on the Songs page's preset-shelf cards) remain English-only since that data file sits outside this plan's file scope and outside the UI-SPEC's coverage manifest - a future translation pass could add these if full preset-shelf localization becomes a priority.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The songs-domain dictionary file is now fully owned/filled; no further plans in this phase touch `songs.ts` or the four files this plan modified.
- `npm run check` is 0 errors; full suite is green (82 files / 1112 tests), including the extended component tests and the new `songsPage.test.ts`.
- SongMark/SongFilterToggle/SongHook's translated internal copy is inherited automatically by Drills (Plan 20-04) and Recall (Plan 20-02) since those plans already wired their own caller-supplied props through their own domain dictionaries - no follow-up wiring needed on those pages.
- No blockers for subsequent Phase 20 plans (20-06 through 20-10).

---
*Phase: 20-french-translation*
*Completed: 2026-07-18*

## Self-Check: PASSED

All 9 created/modified files confirmed present on disk; all 3 task commit hashes (bde237d, 1a434ab, 12fa931) confirmed in git log.
