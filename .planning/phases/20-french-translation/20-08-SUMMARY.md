---
phase: 20-french-translation
plan: 08
subsystem: i18n
tags: [svelte5-runes, i18n, progress-page, streak-copy]

requires:
  - phase: 20-french-translation
    plan: 01
    provides: "Reactive locale store (currentLocale/setLocale/initLocale/t) and the merged messages/index.ts dictionary architecture, with progress.ts pre-created as an empty stub"
  - phase: 20-french-translation
    plan: 04
    provides: "Precedent for keeping tiers.ts (shared tier name/blurb data) out of every Phase 20 plan's file scope, translating only the surrounding chrome word (TIER/NIVEAU)"
provides:
  - "messages/progress.ts filled: /progress page's four fetch states, streak hero CTA, Weakest Spots card, All Stats heading, AccuracyTable headers, PracticeItemRow KIND category word, and Practice Settings (SOUND/STUDY MODE toggles + TIER/coming-later chrome)"
  - "streak.ts made locale-aware: parallel Fr pools (activePracticedTodayFr/activeNudgeFr/zeroStreakFr) with pickStreakLine selecting the current-locale pool via currentLocale(), API signature unchanged"
  - "StreakBadge's compact chip translated (progress.streakBadge.compactCount), flipping both the Progress hero card and the shared masthead streak chip"
  - "AccuracyTable + PracticeItemRow rewired to t(), including a translated CHORD/SCALE/INTERVAL kind tag (mirrors 20-02's recall.map.kind.* category-word precedent)"
affects: []

tech-stack:
  added: []
  patterns:
    - "Streak-copy locale selection: poolsByLocale[currentLocale()][kind] picks the active-locale pool while a single (not per-locale) lastIndices Record keeps each kind's anti-repeat behavior independent from the other two kinds, per the plan's explicit instruction to keep that logic 'intact' rather than re-architecting it per-locale."
    - "PracticeItemRow's kind tag is looked up via a template-built key (`progress.table.kind.${item.kind}`), the same dynamic-key-lookup pattern 20-06 established for caption arrays (captionKey resolved via t(entry.captionKey))."

key-files:
  created: []
  modified:
    - src/lib/i18n/messages/progress.ts
    - src/lib/copy/streak.ts
    - src/lib/copy/streak.test.ts
    - src/lib/components/StreakBadge.svelte
    - src/routes/progress/+page.svelte
    - src/lib/components/AccuracyTable.svelte
    - src/lib/components/PracticeItemRow.svelte
    - src/lib/components/progressComponents.test.ts
    - tests/progress.e2e.test.ts

key-decisions:
  - "Tier names/blurbs (TIERS data in tiers.ts) and the tierById(...).name shown in the current-tier-line stay untranslated/English - tiers.ts is a shared data file outside this plan's (and every other Phase 20 plan's) file_modified scope, matching 20-04's established precedent exactly. Only the surrounding 'TIER'/'TIERS 5 AND 6: COMING LATER' chrome words are keyed (progress.settings.tierPrefix = 'NIVEAU' in fr, mirroring 20-04's drills.ts TIER->NIVEAU wording for the same concept elsewhere in the app)."
  - "PracticeItemRow's KIND-cell category word (CHORD/SCALE/INTERVAL) IS routed through t() despite living close to the prohibited 'chord/scale symbols' boundary - it's a category label, not a chord symbol/interval-shorthand notation, and 20-02's recall.map.kind.chords/intervals/scales ('Chords'/'Intervals'/'Scales' -> 'Accords'/'Intervalles'/'Gammes') already established this exact distinction for the identical concept elsewhere in the app."
  - "StreakBadge's compact chip and the streak-line {N} count both use the established '{N}-templated key + .replace(\"{N}\", String(count))' pattern (mirroring songs.mark.count's '{N} SONGS'/'{N} MORCEAUX'), not a second dictionary-key-per-count-bucket scheme - keeps the raw number immune while letting the surrounding words translate."
  - "streak.ts's lastIndices stays a single Record<StreakLineKind, number> rather than split per locale: a language switch mid-session is a rare edge case, and the anti-repeat guarantee only needs to hold each kind independent of the *other two* kinds (its original purpose), not independent of itself across a locale flip."

requirements-completed: [I18N-02]

coverage:
  - id: D1
    description: "The /progress page (page title, all four fetch-state cards, streak hero CTA, Weakest Spots card, All Stats heading, and Practice Settings incl. SOUND/STUDY MODE toggles and TIER/coming-later chrome) renders correct French under fr while chord symbols, streak counts, accuracy percentages, and attempts stay verbatim"
    requirement: "I18N-02"
    verification:
      - kind: e2e
        ref: "tests/progress.e2e.test.ts#French locale (I18N-02)"
        status: pass
      - kind: unit
        ref: "src/lib/i18n/messages.test.ts#en/fr message parity (I18N-02)"
        status: pass
    human_judgment: false
  - id: D2
    description: "streak.ts's pickStreakLine returns French lines under fr with the {N} placeholder preserved and the zeroStreak pool staying non-scolding; StreakBadge's compact chip (masthead + hero) renders French"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/lib/copy/streak.test.ts#Fr streak copy pools (I18N-02)"
        status: pass
      - kind: unit
        ref: "src/lib/components/streakBadge.test.ts#StreakBadge compact variant"
        status: pass
    human_judgment: false
  - id: D3
    description: "AccuracyTable's SYMBOL/KIND/ATTEMPTS/ACCURACY headers and PracticeItemRow's CHORD/SCALE/INTERVAL kind tag translate to French while the chord symbol and accuracy percentage render identically across locales"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/lib/components/progressComponents.test.ts#French locale (I18N-02)"
        status: pass
    human_judgment: false

duration: ~25min
completed: 2026-07-18
status: complete
---

# Phase 20 Plan 08: Progress / Settings Surface Summary

**Progress page, streak copy module, StreakBadge (masthead + hero), and AccuracyTable/PracticeItemRow all flip to French via the new progress.ts dictionary, with tier data and all numbers/symbols staying locale-immune.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-07-18T18:47:00Z (approx.)
- **Completed:** 2026-07-18T19:12:31Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Filled `messages/progress.ts` with the full progress-domain dictionary: page title, token-entry/loading/empty/error state copy, the streak hero's "Practice Now" CTA, the Weakest Spots card, "All Stats" heading, AccuracyTable's four column headers, PracticeItemRow's CHORD/SCALE/INTERVAL kind tag, and the entire Practice Settings card (heading, TIER/NIVEAU chrome, tier-unlock blurb, per-tier aria-labels, "TIERS 5 AND 6: COMING LATER", and both the SOUND and STUDY MODE toggle label/on/off/aria strings).
- Made `streak.ts` locale-aware: added `activePracticedTodayFr`/`activeNudgeFr`/`zeroStreakFr` pools in the same Print Shop voice as the English pools, preserving the `{N}` placeholder and the non-scolding `zeroStreak` tone, then rewired `pickStreakLine` to read `currentLocale()` and select the matching pool while keeping its per-kind anti-repeat `lastIndex` logic and public signature unchanged.
- Rewired `StreakBadge.svelte`'s compact chip to `t('progress.streakBadge.compactCount').replace('{N}', String(count))`, which flips both the Progress page's hero-adjacent context and the shared masthead streak chip (StreakBadge is the same component in both places).
- Rewired `progress/+page.svelte`, `AccuracyTable.svelte`, and `PracticeItemRow.svelte` to read every static literal via `t('progress.*')`, keeping `pickStreakLine()`, tier names/blurbs (`tiers.ts` data, out of scope per 20-04's precedent), streak counts, accuracy percentages, attempts, and chord symbols untouched.
- Extended `streak.test.ts`, `progressComponents.test.ts`, and `progress.e2e.test.ts` with French-locale assertions: Fr-pool parity/placeholder/em-dash checks, a `setLocale('fr')` `pickStreakLine` check, French AccuracyTable headers, a translated PracticeItemRow kind tag alongside a verbatim chord symbol/accuracy%, and a page-level check that Practice Settings/SOUND/STUDY MODE/accuracy-table headers render French while `Cm7`/`40%` stay identical across `en` and `fr`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Fill messages/progress.ts with the progress-domain dictionary** - `afc9d17` (feat)
2. **Task 2: Make streak.ts locale-aware + rewire StreakBadge.svelte** - `3c79c4b` (feat)
3. **Task 3: Rewire progress/+page.svelte + AccuracyTable.svelte + PracticeItemRow.svelte** - `d83bae1` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `src/lib/i18n/messages/progress.ts` - filled progress-domain en/fr dictionary
- `src/lib/copy/streak.ts` - Fr pools + locale-aware `pickStreakLine`
- `src/lib/copy/streak.test.ts` - Fr-pool parity/placeholder/pickStreakLine assertions
- `src/lib/components/StreakBadge.svelte` - compact chip reads `t()`
- `src/routes/progress/+page.svelte` - all static literals rewired to `t()`
- `src/lib/components/AccuracyTable.svelte` - column headers rewired to `t()`
- `src/lib/components/PracticeItemRow.svelte` - kind tag rewired to `t()`
- `src/lib/components/progressComponents.test.ts` - added French-locale assertions
- `tests/progress.e2e.test.ts` - added French-locale page-level assertions

## Decisions Made
- Tier names/blurbs (`tiers.ts` data) and `tierById(...).name` stay untranslated/English, matching 20-04's established precedent that `tiers.ts` is a shared data file outside every Phase 20 plan's file scope; only the surrounding "TIER"/"TIERS 5 AND 6: COMING LATER" words are keyed (`progress.settings.tierPrefix` = "NIVEAU" in fr, echoing 20-04's `drills.ts` TIER->NIVEAU wording for the same concept).
- PracticeItemRow's KIND-cell category word (CHORD/SCALE/INTERVAL) is routed through `t()` even though it sits near the "chord/scale symbols never translate" boundary - it's a category label, not chord-symbol/interval-shorthand notation, and 20-02's `recall.map.kind.*` (`Chords`/`Intervals`/`Scales` -> `Accords`/`Intervalles`/`Gammes`) already established this exact distinction for the identical concept.
- StreakBadge's compact chip and the streak-line `{N}` count both reuse the established `{N}`-templated-key + `.replace()` pattern (mirroring `songs.mark.count`), not a per-count-bucket dictionary scheme.
- `streak.ts`'s `lastIndices` stays a single `Record<StreakLineKind, number>` rather than split per locale - a mid-session language switch is a rare edge case, and the anti-repeat guarantee only needs to hold each kind independent of the other two kinds (its original purpose), not independent of itself across a locale flip.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `npm run check` is 0 errors and the full suite (`npm test`) is green: 1133 tests / 82 files, including the new French-locale assertions in `streak.test.ts`, `progressComponents.test.ts`, and `progress.e2e.test.ts`.
- The Progress/Settings surface (page, streak copy, StreakBadge in both contexts, accuracy table) is fully bilingual; no blockers for subsequent Phase 20 plans.

---
*Phase: 20-french-translation*
*Completed: 2026-07-18*

## Self-Check: PASSED

All 8 created/modified files confirmed present on disk; all 3 task commit hashes (afc9d17, 3c79c4b, d83bae1) confirmed in git log.
