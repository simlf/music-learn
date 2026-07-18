---
phase: 20-french-translation
plan: 02
subsystem: i18n
tags: [svelte5-runes, sveltekit, i18n, recall, srs]

requires:
  - phase: 20-french-translation
    provides: "Plan 20-01's reactive locale store (t()/setLocale/currentLocale), merged messages/index.ts dictionary architecture, and the pre-created recall.ts domain stub"
provides:
  - "recall.ts filled with every Recall-surface literal (grade buttons, mode-signal chip, session prompt/reveal/feedback prose, RecallMap columns/kind-filter/legend, recall page copy) keyed en/fr"
  - "RecallSession.svelte, RecallMap.svelte, recall/+page.svelte rewired to t(), all locale-reactive via $derived.by"
  - "I18N-03 tight-surface fit test proving the grade row's grid-cols-2 sm:grid-cols-4 breakpoint renders French labels with no FR-only override"
affects: [20-03, 20-04, 20-05, 20-06, 20-07, 20-08, 20-09]

tech-stack:
  added: []
  patterns:
    - "Locale-reactive derived data: module-level const arrays/records that depend on t() are converted to $derived.by(() => [...]) so a live locale flip re-renders them without touching call sites (GRADES/MODE_LABELS/CORRECT_VARIANTS/WRONG_VARIANTS in RecallSession; MODE_COLUMNS/KIND_TABS/LEGEND in RecallMap)"
    - "Split-sentence keys for interpolated strings: sentences with a dynamic value in the middle (e.g. 'Degree {N} of {tonic} major', 'Filter on: practicing the {N} chords...') are keyed as separate prefix/infix/suffix strings concatenated in the template around the untranslated dynamic value, rather than a single templated key"

key-files:
  created: []
  modified:
    - src/lib/i18n/messages/recall.ts
    - src/lib/components/RecallSession.svelte
    - src/lib/components/RecallMap.svelte
    - src/routes/recall/+page.svelte
    - src/lib/components/recallSession.test.ts

key-decisions:
  - "Mode A/B's confirmation and wrong-answer feedback pools (CORRECT_VARIANTS/WRONG_VARIANTS) were brought into recall.* scope even though 20-UI-SPEC.md's Copy Coverage Manifest doesn't name them explicitly - they are RecallSession's own module-scope literals (this plan's exclusive file), and PLAN.md Task 2's action explicitly calls for 'every other hardcoded user-facing literal' beyond the locked grade/mode tables."
  - "'À revoir' (the locked Again grade label) and the recall map's 'Due' legend label are kept as distinct French strings ('À revoir' vs 'À réviser') to avoid the two different UI concepts (a grade choice vs. a map cell state) colliding on the same phrase."
  - "The hear-name choice button's aria-label ('Answer: {symbol}') is split into a translated 'recall.aria.answer-prefix' key concatenated with the untranslated chord symbol, keeping the accessible name informative in both locales without ever routing the symbol itself through t()."
  - "Interval-size/scale-degree prompts keep note letters (e.g. 'G', 'C') untranslated per the app's existing letter-primary convention (never solfège-translated), only translating the surrounding English words ('Degree'/'of'/'major', 'to')."

patterns-established:
  - "recall.ts is the third domain file completed after chrome.ts (20-01), giving later plans (build/drills/songs/theory/scales/progress/home) a second worked example of the split-sentence-key and $derived.by-array patterns for their own interpolated/reactive copy."

requirements-completed: [I18N-02, I18N-03]

coverage:
  - id: D1
    description: "Recall grade buttons (Again/Hard/Good/Easy) and the mode-signal chip (SYMBOL → FORMULA etc.) render the locked FR strings and flip live with the locale toggle"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#RecallSession French grade-button fit (I18N-03)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Grade row keeps its grid-cols-2 sm:grid-cols-4 responsive breakpoint unchanged under French copy (no FR-only 2x2 override), satisfying the I18N-03 tight-surface audit"
    requirement: "I18N-03"
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts#RecallSession French grade-button fit (I18N-03) - asserts grid.className contains grid-cols-2 and sm:grid-cols-4"
        status: pass
    human_judgment: false
  - id: D3
    description: "RecallSession's full prompt/reveal/feedback/empty/error/complete prose, RecallMap's column/kind-filter/legend labels, and the recall page's title/subtitle/mode-toggle/pool-filter copy are all keyed en/fr with the parity test green"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/lib/i18n/messages.test.ts#en/fr message parity (I18N-02)"
        status: pass
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts (42 tests, EN default byte-identical to prior hardcoded strings)"
        status: pass
      - kind: unit
        ref: "src/lib/components/recallMap.test.ts (5 tests)"
        status: pass
      - kind: unit
        ref: "src/routes/recallSongFilter.test.ts (6 tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Chord symbols, ChordGlyph, interval shorthand, solfège, and the numeric day-interval sub-label remain untouched by t() across the whole Recall surface"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/lib/i18n/immunity.test.ts#ChordGlyph locale immunity (pre-existing, unaffected by this plan's changes)"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-18
status: complete
---

# Phase 20 Plan 02: Recall Surface Translation Summary

**Keyed the entire Recall surface (grade buttons, mode-signal chip, session prose, recall map, page copy) to en/fr and proved the grade row's responsive grid needs no French-only layout fix.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-18T17:28:10Z
- **Completed:** 2026-07-18T17:36:15Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Filled `src/lib/i18n/messages/recall.ts` with ~70 keyed en/fr pairs covering the locked grade labels (Again/Hard/Good/Easy → À revoir/Difficile/Correct/Facile), the locked mode-signal chip phrases, the locked RecallMap column headers, plus every prompt/reveal/empty/error/complete/feedback string in RecallSession, RecallMap's kind-filter/legend labels, and the recall page's title/subtitle/mode-toggle/pool-filter copy — all authored in Print Shop voice, no em dashes.
- Rewired `RecallSession.svelte`: `MODE_LABELS`, `GRADES`, `CORRECT_VARIANTS`, and `WRONG_VARIANTS` converted from plain consts to `$derived.by(() => ...)` reads of `t('recall.*')` so a live locale flip re-renders every one of them; every remaining hardcoded literal (loading register, empty/error/complete states, formula/interval/scale-degree prompts, reveal headings, Mode A's Check/Clear/legend/Next, Mode B's Play/Play-again and answer aria-label) now routes through `t()`.
- Rewired `RecallMap.svelte`: `MODE_COLUMNS`, `KIND_TABS`, and `LEGEND` converted to `$derived.by` reads of `recall.map.*` keys; the kind-filter group's `aria-label` translated.
- Rewired `recall/+page.svelte`: page title, subtitle, mode-toggle aria-label, Review/Map button labels, and the `SongFilterToggle` `poolLabel`/`note`/`noteOn`/`noteOff` props now read `recall.page.*` keys (left `SongFilterToggle.svelte`'s own "From my songs" button copy untouched, per the plan's file-ownership boundary).
- Added a new I18N-03 fit test in `recallSession.test.ts`: renders `RecallSession` with `setLocale('fr')`, clicks through to the grade grid, and asserts both the four FR grade labels render AND the grid still carries `grid-cols-2 sm:grid-cols-4` — proving the width-driven breakpoint needed no French-only override.

## Task Commits

Each task was committed atomically:

1. **Task 1: Fill messages/recall.ts with the recall-domain dictionary** - `b16eb2d` (feat)
2. **Task 2: Rewire RecallSession.svelte to t() (grades, modes, session prose)** - `fdfc773` (feat)
3. **Task 3: Rewire RecallMap.svelte + recall/+page.svelte, verify the tight-surface fit (I18N-03)** - `0d5117e` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `src/lib/i18n/messages/recall.ts` - filled with the full recall domain dictionary (en+fr)
- `src/lib/components/RecallSession.svelte` - grades/modes/prompts/reveal/feedback rewired to `t()`
- `src/lib/components/RecallMap.svelte` - columns/kind-filter/legend rewired to `t()`
- `src/routes/recall/+page.svelte` - title/subtitle/mode-toggle/pool-filter rewired to `t()`
- `src/lib/components/recallSession.test.ts` - added the I18N-03 French grade-button fit test

## Decisions Made
- Brought Mode A/B's confirmation/wrong feedback variant pools into `recall.*` scope (not explicitly named in 20-UI-SPEC.md's coverage manifest, but they're RecallSession's own literals and PLAN.md's Task 2 action calls for "every other hardcoded user-facing literal").
- Kept `'À revoir'` (grade Again, locked) and the recall map's `'Due'` legend distinct in French (`'À réviser'` for the legend) to avoid two different UI concepts colliding on identical phrasing.
- Split the hear-name choice button's `aria-label` into a translated prefix (`recall.aria.answer-prefix` = "Answer:"/"Réponse :") concatenated with the untranslated chord symbol.
- Interval-size/scale-degree prompts keep note letters (e.g. "G", "C") untranslated, translating only the surrounding English words, consistent with the app's existing letter-primary (never solfège-translated) convention.

## Deviations from Plan

None - plan executed exactly as written. All three tasks matched their `<action>` specs; no Rule 1-4 auto-fixes were needed since the existing components already had clean single-owner literal boundaries (SongFilterToggle/BuildSession/RevealInsight/SongMark were correctly left untouched, per the plan's explicit file list).

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `recall.ts` is the second fully-populated domain dictionary (after `chrome.ts` in 20-01), giving Plans 20-03 through 20-09 a second worked example of the `$derived.by`-array pattern (for locale-reactive const arrays/records) and the split-sentence-key pattern (for strings with an untranslated dynamic value embedded mid-sentence).
- `npm run check` is 0 errors; the full suite is green (81 files / 1100 tests), including the extended `recallSession.test.ts` (43 tests, one new) and the pre-existing `recallMap.test.ts` (5) / `recallSongFilter.test.ts` (6) / `messages.test.ts` (3) / `immunity.test.ts` (2).
- No blockers for the remaining Phase 20 plans (each owns a disjoint domain stub file and a disjoint set of components/routes).

---
*Phase: 20-french-translation*
*Completed: 2026-07-18*

## Self-Check: PASSED

All 5 modified files (recall.ts, RecallSession.svelte, RecallMap.svelte, recall/+page.svelte, recallSession.test.ts) confirmed present on disk; all 3 task commit hashes (b16eb2d, fdfc773, 0d5117e) confirmed in git log.
