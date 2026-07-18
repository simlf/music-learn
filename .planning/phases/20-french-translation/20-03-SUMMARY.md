---
phase: 20-french-translation
plan: 03
subsystem: i18n
tags: [svelte5-runes, sveltekit, i18n, build, construction-drill]

requires:
  - phase: 20-french-translation
    provides: "Plan 20-01's reactive locale store (t()/setLocale/currentLocale), merged messages/index.ts dictionary architecture, and the pre-created build.ts domain stub"
provides:
  - "build.ts filled with every Build-surface literal (kind toggle, Root/Quality/Tonic captions, quality-chip labels, STEP register, step/WHY prose, wrong-tap diagnostics, count-up hint, enharmonic teaching line, completion summary, CTAs, confirmation/wrong-answer variant pools, /build page copy) keyed en/fr"
  - "BuildSession.svelte + build/+page.svelte rewired to t(), locale-reactive via $derived.by for module-scope arrays/records and via direct t() calls inside template-invoked functions"
  - "Locale-aware interval phrasing that reads IntervalInfo.longFr directly for chords in French, and introduces Build-owned whole/half-tone vocabulary for scale steps (interval.ts has no French seed for that scale-step-specific phrasing)"
affects: [20-04, 20-05, 20-06, 20-07, 20-08, 20-09]

tech-stack:
  added: []
  patterns:
    - "Locale-aware interval phrasing seam: a small localizedPhraseFor()/intervalWordFor()/ruleStatementFor() branch on currentLocale() === 'fr' to read IntervalInfo.longFr directly for the general case, while a scale-step-specific whole/half-tone vocabulary (with no existing interval.ts seed) lives in the domain's own messages file rather than being added to interval.ts"
    - "Split-sentence keys for interpolated strings, extended from 20-02: prefix/infix keys around chord-vs-scale-specific dynamic content (build.step.chordsPrefix/scalesPrefix, build.why.chordsPrefix/scalesPrefix, build.restatement.needChordsPrefix/needScalesPrefix) so one function serves both kinds without a single mega-key per sentence"
    - "Locale-reactive module-scope arrays/records via $derived.by, extended from 20-02's GRADES/MODE_LABELS pattern to BuildSession's QUALITY_LABELS/QUALITY_CHIPS and CORRECT_VARIANTS/WRONG_VARIANTS"

key-files:
  created: []
  modified:
    - src/lib/i18n/messages/build.ts
    - src/lib/components/BuildSession.svelte
    - src/routes/build/+page.svelte
    - src/lib/components/buildSession.test.ts

key-decisions:
  - "Chord interval terminology reads IntervalInfo.longFr directly at render time (never re-derived); scale-step whole/half-tone French vocabulary ('ton entier'/'demi-ton') is new and lives in build.ts, since scale construction steps are always consecutive seconds and interval.ts's phraseStep() only has an English-only 'whole step'/'half step' override with no French seed to reuse - adding it to interval.ts was out of this plan's file scope, and the vocabulary is genuinely Build-domain-specific."
  - "intervalWordFor() now returns its plural form pre-baked (both EN and FR) rather than the template appending a bare 's' - EN behavior is byte-identical ('minor thirds') since English pluralizes by the same trailing 's'; FR pluralizes word-by-word (every FR degree noun/quality adjective in this app's fixed vocabulary - tierce/tierces, mineure/mineures, etc - is a regular +s plural), avoiding a wrong 'tierce mineures' concatenation."
  - "The enharmonic teaching line's 'so the chord'/'so the scale' segment is combined into two whole-phrase keys (build.enharmonic.dChords/dScales) rather than a bare word + generic article, because French elision differs (l'accord vs la gamme) and combining them sidesteps article-agreement logic entirely."
  - "'Voila.' (no accent, existing English-locale voice) becomes 'Voilà.' (accented) only in French; kept ASCII 'Voila.' for English to preserve the existing byte-identical test expectations and the app's established EN voice."
  - "CORRECT_VARIANTS/WRONG_VARIANTS (the rotating tap-confirmation copy) were brought into build.* scope even though 20-UI-SPEC.md's Copy Coverage Manifest doesn't name them explicitly, mirroring 20-02's identical decision for RecallSession - they are BuildSession's own module-scope literals and the plan's Task 1 action calls for 'every user-facing literal.'"

requirements-completed: [I18N-02]

coverage:
  - id: D1
    description: "BuildSession's kind-toggle (Chords/Scales), Root/Quality/Tonic captions, and quality-chip labels render the locked FR strings (Accords/Gammes, Fondamentale/Qualité/Tonique) and flip live with the locale toggle"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#BuildSession French rendering + chord-symbol immunity (I18N-02) - kind-toggle/caption assertions"
        status: pass
    human_judgment: false
  - id: D2
    description: "The STEP register, step/WHY prose, and completion summary translate correctly for both a chord build (Cm7) and a scale build (G major) in French, with chord symbols and letter names rendering byte-identical across locales"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#BuildSession French rendering + chord-symbol immunity (I18N-02) (2 new tests)"
        status: pass
      - kind: unit
        ref: "src/lib/i18n/messages.test.ts#en/fr message parity (I18N-02)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Interval long-names in the formula strip/step/WHY/enharmonic lines switch to French via IntervalInfo.longFr (chords) or the two new Build-owned whole/half-tone strings (scales), never a re-invented interval vocabulary; every pre-existing English-locale BuildSession test (55 tests) still passes byte-identical after the t()-rewire"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts (57 tests total: 55 pre-existing EN tests unchanged + 2 new FR tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Chord symbols, ChordGlyph, interval shorthand (R/m3/P5), and letter/pitch names remain untouched by t() across the whole Build surface"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/lib/i18n/immunity.test.ts#ChordGlyph locale immunity (pre-existing, unaffected by this plan's changes)"
        status: pass
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#BuildSession French rendering + chord-symbol immunity (I18N-02) - Cm7 symbol rendered unchanged inside the French WHY line"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-07-18
status: complete
---

# Phase 20 Plan 03: Build Surface Translation Summary

**Keyed the entire Build-it construction surface (kind toggle, picker captions, STEP/WHY/reveal prose, wrong-tap diagnostics, completion summary) to en/fr, reading IntervalInfo.longFr directly for chord interval terminology and introducing Build-owned whole/half-tone vocabulary for scale steps.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Filled `src/lib/i18n/messages/build.ts` with ~65 keyed en/fr pairs covering the kind toggle (Chords/Scales -> Accords/Gammes), the Root/Quality/Tonic captions (Fondamentale/Qualité/Tonique, full-word per UI-SPEC Fit Rule 1), all 8 chord-quality chip labels, the STEP-X-OF-Y register words, split-sentence prefix/infix keys for the step/WHY/restatement lines (separate chords-vs-scales variants), the wrong-tap diagnostic vocabulary (half step/steps, too, high/low), the enharmonic teaching line's framing words, the completion summary's heading/rule-statement/status-line/CTA copy, the rotating confirmation/wrong-answer variant pools, and the `/build` page's title/subtitle.
- Rewired `BuildSession.svelte`: `QUALITY_LABELS`/`QUALITY_CHIPS` and `CORRECT_VARIANTS`/`WRONG_VARIANTS` converted to `$derived.by` reads of `t('build.*')` (mirroring 20-02's RecallSession pattern) so a live locale flip re-renders them; every remaining literal (kind-toggle labels, captions, register, step/why/restatement/diagnostic/enharmonic/heading/rule text, FSRS status line, CTAs) now routes through `t()`, either inline in the template or inside the existing `stepLineFor`/`whyLineFor`/`headingFor`/`ruleStatementFor`/`intervalWordFor` functions (all invoked from the template, so they're reactive to locale automatically).
- Added `localizedPhraseFor()`: branches on `currentLocale() === 'fr'` to read `step.interval.longFr` directly for chords (the existing French interval seed, never re-derived) and two new Build-owned strings (`build.interval.wholeStep`/`.halfStep`) for scale steps, since scale construction steps are always consecutive seconds and `interval.ts`'s `phraseStep()` has no French seed for its English-only "whole step"/"half step" scale-step override.
- Rewired `build/+page.svelte`: page title and subtitle now read `build.page.title`/`build.page.subtitle`.
- Extended `buildSession.test.ts` with a new `describe` block asserting the French kind-toggle/captions/STEP-register/step-WHY lines for both a chord build (Cm7) and a scale build (G major), each confirming the rendered chord symbol or letter name stays byte-identical to its English form (I18N-02 immunity).

## Task Commits

Each task was committed atomically:

1. **Task 1: Fill messages/build.ts with the build-domain dictionary** - `a495716` (feat)
2. **Task 2: Rewire BuildSession.svelte + build/+page.svelte to t()** - `0439485` (feat)

## Files Created/Modified
- `src/lib/i18n/messages/build.ts` - filled with the full build domain dictionary (en+fr)
- `src/lib/components/BuildSession.svelte` - kind-toggle/captions/step/why/diagnostic/enharmonic/completion prose rewired to `t()`; interval phrasing made locale-aware via `localizedPhraseFor`/`intervalWordFor`
- `src/routes/build/+page.svelte` - title/subtitle rewired to `t()`
- `src/lib/components/buildSession.test.ts` - added the French rendering + chord-symbol immunity test block

## Decisions Made
- Chord interval terminology reads `IntervalInfo.longFr` directly (never re-derived); scale-step whole/half-tone French vocabulary is new Build-domain vocabulary living in `build.ts`, since `interval.ts`'s scale-step override has no existing French seed and modifying `interval.ts` was out of this plan's file scope.
- `intervalWordFor()` returns its plural form pre-baked for both locales (EN behavior byte-identical via the same trailing-'s' pluralization it always used; FR pluralizes word-by-word since the fixed FR vocabulary in this app is entirely regular `+s` plural).
- The enharmonic line's "so the chord"/"so the scale" segment is two whole-phrase keys rather than a bare word plus generic article, sidestepping French elision (l'accord vs la gamme) entirely.
- "Voila." (no accent) stays ASCII in English (preserving existing test expectations and established EN voice); only the French value is accented ("Voilà.").
- Brought `CORRECT_VARIANTS`/`WRONG_VARIANTS` (rotating tap-confirmation copy) into `build.*` scope, mirroring 20-02's identical decision for RecallSession's own confirmation pools.

## Deviations from Plan

None - plan executed exactly as written. All literals the plan's Task 1/2 actions called for were covered; the only judgment calls made (whole/half-tone vocabulary placement, plural-baking in `intervalWordFor`, enharmonic elision handling) are documented above as Decisions Made rather than deviations, since they were implementation choices within the plan's explicit instructions (translate every literal, reuse `longFr`, never re-derive interval terms).

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `build.ts` is the third fully-populated domain dictionary (after `chrome.ts` in 20-01 and `recall.ts` in 20-02), giving Plans 20-04 through 20-09 a third worked example of the split-sentence-key pattern extended to chord-vs-scale variant prefixes, and of introducing new domain-owned vocabulary (whole/half-tone) alongside reused theory-engine seeds (`longFr`).
- `npm run check` is 0 errors; the full suite is green (81 files / 1102 tests), including the extended `buildSession.test.ts` (57 tests: all 55 pre-existing EN tests pass byte-identical, plus 2 new French tests).
- No blockers for the remaining Phase 20 plans (each owns a disjoint domain stub file and a disjoint set of components/routes).

---
*Phase: 20-french-translation*
*Completed: 2026-07-18*

## Self-Check: PASSED

All 5 created/modified files (build.ts, BuildSession.svelte, build/+page.svelte, buildSession.test.ts, 20-03-SUMMARY.md) confirmed present on disk; both task commit hashes (a495716, 0439485) confirmed in git log.
