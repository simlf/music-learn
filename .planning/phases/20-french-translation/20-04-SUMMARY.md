---
phase: 20-french-translation
plan: 04
subsystem: i18n
tags: [svelte5-runes, sveltekit, i18n, drills, construction-drill, interval-recognition]

requires:
  - phase: 20-french-translation
    provides: "Plan 20-01's reactive locale store (t()/setLocale/currentLocale), merged messages/index.ts dictionary architecture, and the pre-created drills.ts domain stub"
provides:
  - "drills.ts filled with every Drills-surface literal (mode row, score register, rotate hint, question-source tags including the Phase 19 FROM YOUR LESSON -> DE TA LEÇON handoff, From-my-songs filter props, construction/identification/interval prompts, scaffold/hint copy, feedback prose, confirm/wrong variant pools, end-of-round card, unlock-suggestion card, LevelPicker on-ramp captions, IntervalScaffold caption) keyed en/fr"
  - "drills/+page.svelte, IntervalScaffold.svelte, LevelPicker.svelte rewired to t(), locale-reactive via $derived.by for module-scope arrays/records (MODES/CORRECT_VARIANTS/WRONG_VARIANTS/SOURCE_TAGS) and via direct t() calls in the template"
  - "French-locale tests proving the construction prompt, DE TA LEÇON tag, LevelPicker captions, and IntervalScaffold caption render in French while chord/interval notation stays byte-identical across locales"
affects: [20-05, 20-06, 20-07, 20-08, 20-09]

tech-stack:
  added: []
  patterns:
    - "Locale-reactive module-scope arrays/records via $derived.by, extended from 20-02/20-03's identical pattern to Drills's MODES, CORRECT_VARIANTS/WRONG_VARIANTS, and SOURCE_TAGS - all read from plain `const` at component scope so a live locale flip re-renders them without touching pickVariant/SOURCE_TAGS[...] call sites"
    - "Split-sentence keys for interpolated strings extended to a 4-value sentence (drills.unlock.* prefix/answersAre/correctAcross/daysUnlock/colon/questionMark around rollingCount/pct/distinctDays/tierName/qualities), following 20-02/20-03's prefix/infix/suffix convention"
    - "Interval long-name immunity is preserved AS-IS rather than made locale-aware: Drills already showed IntervalInfo.longFr unconditionally (a pre-existing bilingual pedagogy feature independent of the EN|FR toggle, predating Phase 20), so only the surrounding English words ('Tap a'/'above'/'You tapped') are keyed - the longFr field itself is left untouched in both locales, unlike Build's locale-branching localizedPhraseFor()"

key-files:
  created: []
  modified:
    - src/lib/i18n/messages/drills.ts
    - src/routes/drills/+page.svelte
    - src/lib/components/IntervalScaffold.svelte
    - src/lib/components/LevelPicker.svelte
    - src/routes/drillsSongFilter.test.ts
    - src/lib/components/levelPicker.test.ts
    - src/lib/components/intervalScaffold.test.ts

key-decisions:
  - "Interval long-names on Drills (IntervalScaffold's per-role longFr, the interval-construction prompt's trailing sentence, the interval-answer/tap-line, and every IntervalChip longName tooltip) are left exactly as they were: always French, regardless of the EN|FR toggle. This differs from Build's (20-03) locale-branching localizedPhraseFor()/intervalWordFor(), because Drills' own pre-existing convention (confirmed by the untouched drills.e2e.test.ts assertions like 'Tierce mineure.' appearing under the DEFAULT en locale, with no setLocale call) already showed the French long name unconditionally as a secondary label, predating this phase's toggle. Making it locale-aware here would have been an undocumented behavior change outside this plan's must_haves and would have broken dozens of existing byte-identical EN assertions."
  - "Tier names/blurbs (TIERS data in tiers.ts) and the unlock card's tierById(...).name stay untouched/English even under fr - tiers.ts is a shared data file outside this plan's (and every other Phase 20 plan's) file_modified scope; only the surrounding words ('Tier'/'Niveau', 'Unlock Tier'/'Débloquer le niveau') are keyed."
  - "CORRECT_VARIANTS/WRONG_VARIANTS (drills.confirm.*/drills.wrong.*) were brought into drills.* scope even though not explicitly named in 20-UI-SPEC.md's coverage manifest, mirroring 20-02's and 20-03's identical decision for their own rotating confirmation pools - they are +page.svelte's own module-scope literals and Task 1's action calls for 'every user-facing literal.'"
  - "The unlock-suggestion card's 4-value interpolated sentence ('Your last N answers are P% correct across D days. Unlock TIER: QUALITIES?') is split into six ordered fragment keys (prefix/answersAre/correctAcross/daysUnlock/colon/questionMark) rather than re-deriving a single templated string, since French word order around each dynamic value stays in the same relative position as English, letting the same split-sentence pattern from 20-02/20-03 scale to more than one embedded value."

patterns-established: []

requirements-completed: [I18N-02]

coverage:
  - id: D1
    description: "Drills mode row (Chords/Intervals/Mix), score register (OF/RIGHT/STREAK), rotate hint, and question-source tags (BACK FOR ANOTHER GO/ONE MORE TIME/FROM YOUR WEAK LIST/FROM YOUR LESSON -> DE TA LEÇON) render the correct French strings and flip live with the locale toggle"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/routes/drillsSongFilter.test.ts#Drills renders in French (I18N-02, Phase 20 Plan 04) - DE TA LEÇON tag assertion"
        status: pass
      - kind: unit
        ref: "src/lib/i18n/messages.test.ts#en/fr message parity (I18N-02)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The construction/identification/interval prompts, scaffold/hint copy, feedback prose (Here is the shape/interval, legend labels, You tapped), and the confirm/wrong feedback variant pools translate correctly in French, with chord symbols and interval shorthand rendering byte-identical across locales"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/routes/drillsSongFilter.test.ts#Drills renders in French (I18N-02, Phase 20 Plan 04) - construction prompt + chord-symbol immunity assertions"
        status: pass
      - kind: unit
        ref: "tests/drills.e2e.test.ts (58 tests, all pre-existing EN assertions pass byte-identical after the t()-rewire)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The From-my-songs filter's poolLabel/note/noteOn/noteOff props render in French, and the end-of-round card / unlock-suggestion card copy translates correctly, while the SongFilterToggle/SongMark/hints.ts components remain untouched (owned by other plans)"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/routes/drillsSongFilter.test.ts (14 tests: 11 pre-existing EN tests unchanged + 1 new French test, plus lesson/weak-list source-tag tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "IntervalScaffold's 'This chord is' caption and LevelPicker's course caption, tier tag, Change-level control, and next-up section render French labels under fr, with interval shorthand and tier names/blurbs remaining untouched"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/lib/components/intervalScaffold.test.ts#IntervalScaffold renders in French (I18N-02, Phase 20 Plan 04)"
        status: pass
      - kind: unit
        ref: "src/lib/components/levelPicker.test.ts#LevelPicker renders in French (I18N-02, Phase 20 Plan 04)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Chord symbols, ChordGlyph, interval shorthand (R/m3/P5/m7), solfège syllables, and IntervalInfo.longFr remain untouched by t() across the whole Drills surface"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/lib/i18n/immunity.test.ts#ChordGlyph locale immunity (pre-existing, unaffected by this plan's changes)"
        status: pass
      - kind: unit
        ref: "src/routes/drillsSongFilter.test.ts#Drills renders in French - chord symbol renders identically across locales"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-07-18
status: complete
---

# Phase 20 Plan 04: Drills Surface Translation Summary

**Keyed the entire Drills surface (mode row, score register, rotate hint, question-source tags including the DE TA LEÇON lesson-handoff tag, From-my-songs filter props, prompts, scaffold/hint copy, feedback prose, confirm/wrong variant pools, end-of-round + unlock cards, LevelPicker on-ramp, IntervalScaffold caption) to en/fr, leaving Drills' pre-existing always-French interval long-name secondary label untouched.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Filled `src/lib/i18n/messages/drills.ts` with ~65 keyed en/fr pairs covering the mode row (Chords/Intervals/Mix -> Accords/Intervalles/Mixte), the score register (OF/RIGHT/STREAK -> SUR/BONNES/SÉRIE), the rotate hint, the four question-source tags (locked FR strings including FROM YOUR LESSON -> DE TA LEÇON), the From-my-songs filter's poolLabel/note/noteOn/noteOff props, construction/identification/interval prompts, scaffold/hint copy, feedback prose, the confirm/wrong variant pools, the end-of-round card, the split-sentence unlock-suggestion card, and LevelPicker's course caption/tier tag/Change-level control/next-up section plus IntervalScaffold's caption.
- Rewired `drills/+page.svelte`: `MODES`, `CORRECT_VARIANTS`, `WRONG_VARIANTS`, and `SOURCE_TAGS` converted from plain consts to `$derived.by(() => ...)` reads of `t('drills.*')` (mirroring 20-02/20-03's pattern) so a live locale flip re-renders every one of them; every remaining literal (h1, mode-group aria-label, score register words, rotate hint, construction/identification/interval prompt copy, scaffold/hint text, Check/Clear/Next buttons, feedback prose, end-of-round + unlock cards) now routes through `t()`.
- Rewired `IntervalScaffold.svelte` (caption) and `LevelPicker.svelte` (course caption/tier tag/Change-level/Switch-to-tier aria-label/next-up/Not-yet) to `t()`.
- Extended `drillsSongFilter.test.ts` with a French-locale test proving the construction prompt ("Clique sur les notes de Cm7.") and the DE TA LEÇON tag render in French, with the ChordGlyph's C/m7 spans still present verbatim. Added FR-locale tests to `levelPicker.test.ts` and `intervalScaffold.test.ts`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Fill messages/drills.ts with the drills-domain dictionary** - `8bdd8cb` (feat)
2. **Task 2: Rewire drills/+page.svelte to t()** - `87cad94` (feat)
3. **Task 3: Rewire IntervalScaffold.svelte + LevelPicker.svelte to t()** - `82ac21d` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `src/lib/i18n/messages/drills.ts` - filled with the full drills domain dictionary (en+fr)
- `src/routes/drills/+page.svelte` - mode row/score register/hint/source-tags/filter-props/prompts/scaffold/feedback/end-card/unlock-card rewired to `t()`
- `src/lib/components/IntervalScaffold.svelte` - caption rewired to `t()`
- `src/lib/components/LevelPicker.svelte` - course caption/tier tag/change-level/next-up rewired to `t()`
- `src/routes/drillsSongFilter.test.ts` - added the French-rendering + chord-symbol-immunity test
- `src/lib/components/levelPicker.test.ts` - added the French-rendering test
- `src/lib/components/intervalScaffold.test.ts` - added the French-caption test

## Decisions Made
- Kept Drills' interval long-name (`IntervalInfo.longFr`) display exactly as it was before this phase: always French, regardless of the EN|FR toggle. This is a pre-existing bilingual pedagogy convention on this specific surface (confirmed by the untouched `drills.e2e.test.ts` assertions showing French text like `'Tierce mineure.'` under the default `en` locale, with no `setLocale` call anywhere in that suite), distinct from Build's (20-03) locale-branching `localizedPhraseFor()`. Making it locale-aware here was out of this plan's `must_haves` and would have broken dozens of existing byte-identical EN test assertions.
- Left tier names/blurbs (`tiers.ts` data) untranslated - that file is shared and outside every Phase 20 plan's file scope; only the surrounding English words ("Tier"/"Unlock Tier") are keyed, so a French unlock-card sentence or LevelPicker tag can still show an English tier name (e.g. "Débloquer le niveau 2" unlocking "all-key triads").
- Brought `CORRECT_VARIANTS`/`WRONG_VARIANTS` into `drills.*` scope, mirroring 20-02's and 20-03's identical decision for their own rotating confirmation pools.
- Split the unlock card's 4-dynamic-value sentence into six ordered fragment keys rather than one templated string, extending 20-02/20-03's single-dynamic-value split-sentence pattern to a longer sentence.

## Deviations from Plan

None - plan executed exactly as written. The interval-long-name-immunity and tiers.ts-out-of-scope points above are documented as Decisions Made (judgment calls within the plan's explicit instructions: "Leave untouched: chord symbols, ChordGlyph, interval shorthand, and solfège names" and the file-scope boundary of `files_modified`), not deviations.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `drills.ts` is the fourth fully-populated domain dictionary (after `chrome.ts`, `recall.ts`, `build.ts`), giving Plans 20-05 through 20-09 a fourth worked example: the `$derived.by`-array pattern extended to a 4-key record (`SOURCE_TAGS`), the split-sentence pattern extended to a 6-fragment sentence, and a documented precedent for when to leave an existing bilingual convention untouched rather than force it into the new locale-toggle model.
- `npm run check` is 0 errors; the full suite is green (81 files / 1105 tests), including the extended `drillsSongFilter.test.ts` (14 tests: 1 new), `levelPicker.test.ts` (6 tests: 1 new), and `intervalScaffold.test.ts` (5 tests: 1 new).
- Plan 20-05 (SongMark/SongFilterToggle's own "From my songs"/"{N} SONGS" copy) is unaffected: this plan only translated the drills-page-owned `poolLabel`/`note`/`noteOn`/`noteOff` props passed INTO `SongFilterToggle`, never touching that component's own file.
- No blockers for the remaining Phase 20 plans (each owns a disjoint domain stub file and a disjoint set of components/routes).

---
*Phase: 20-french-translation*
*Completed: 2026-07-18*

## Self-Check: PASSED

All 7 modified/created files (drills.ts, drills/+page.svelte, IntervalScaffold.svelte, LevelPicker.svelte, drillsSongFilter.test.ts, levelPicker.test.ts, intervalScaffold.test.ts) confirmed present on disk; all 3 task commit hashes (8bdd8cb, 87cad94, 82ac21d) confirmed in git log.
