---
phase: 20-french-translation
plan: 10
subsystem: i18n
tags: [svelte5-runes, sveltekit, i18n, testing-library, vitest]

requires:
  - phase: 20-french-translation
    provides: "20-01's locale store/t()/merged dictionary + 20-02..20-09's per-domain FR wiring across every surface"
provides:
  - "coverage.test.ts: a single cross-surface aggregate gate rendering every major surface (masthead, Lookup, Drills, Build, Recall + RecallMap, Scales, Songs + SongMark/SongFilterToggle, Theory + InteractiveLesson, Progress + StreakBadge) under both locales in one file, proving live en/fr flip and completeness end to end"
  - "Chord symbol/ChordGlyph/interval-shorthand/solfège immunity re-proven byte-identical across locales and across surfaces (not just within one component's own test file)"
  - "A no-raw-key-leak sweep over the ENTIRE merged catalog (every key in messages.en/messages.fr), stronger than a sample - catches any future domain addition that ships a stub or a missing FR entry"
  - "I18N-03 fit-rule assertions re-locked in the aggregate gate: RecallSession's grade grid keeps grid-cols-2/sm:grid-cols-4, the masthead nav keeps flex-wrap, BuildSession's Root/Quality captions render full-word FR - confirming the sketch-013 audit's conclusion holds with zero fit fixes needed"
affects: []

tech-stack:
  added: []
  patterns:
    - "Cross-surface aggregate test file merges the union of every surface's own component-test mocks ($lib/audio/audio, $lib/srs/deck via importOriginal, $lib/api/client, $lib/api/progress, and the Drills page's practice/pool/practiceLog/levelState/scaffold/drillSeeds/rotateHint set) into one vi.mock block per module, so every real route +page.svelte can be rendered in a single file exactly as its own per-plan test already proved possible"
    - "Direct setLocale(...) calls made mid-test (after a component is already mounted) must be wrapped in Svelte 5's flushSync(() => setLocale(...)) to force a synchronous re-render before the next assertion - fireEvent-driven locale changes (the toggle click) already auto-flush, but a raw setLocale() call does not, and asserting immediately after it without flushSync intermittently reads stale (pre-flip) DOM"

key-files:
  created:
    - src/lib/i18n/coverage.test.ts
  modified: []

key-decisions:
  - "Combined the plan's Task 1 (FR-wiring + immunity + no-key-leak) and Task 2 (I18N-03 fit-rule assertions) into a single commit: both tasks build the same coverage.test.ts file as one coherent gate, and splitting the diff would have been artificial."
  - "No app.css fit fix was applied - the I18N-03 fit-rule assertions (grade grid breakpoint, nav flex-wrap, Build's full-word captions) all pass unchanged under fr, matching the UI-SPEC audit's own conclusion that the existing responsive layout already absorbs French's longer strings. This matches the plan's own stated expectation (\"any targeted fit fix (expected: none)\")."
  - "tiers.ts (tier names/blurbs) and presets.ts (SONG_PRESETS preset.note) are left as accepted English residuals, not translated in this plan. Neither file is in this plan's (or any Phase 20 plan's) files_modified scope; 20-UI-SPEC.md and progress.ts's own code comment explicitly call tiers.ts \"a shared data file outside every Phase 20 plan's file_modified scope.\" Scoping them in would be an architectural/scope expansion beyond what 20-10-PLAN.md's tasks describe (Rule 4 territory, not Rule 1-3 auto-fixable) - flagging here for a future phase or explicit user decision rather than silently translating."
  - "The no-raw-key-leak check was implemented as an exhaustive sweep over every key in the merged catalog (not just a sample), since the check is pure object comparison with no rendering cost - strictly stronger than the plan's own 'a sample of keys' wording while still satisfying it."

patterns-established:
  - "Aggregate cross-surface test files that need to mount several real route pages should declare ONE vi.mock per shared module (the union of every surface's own requirements), rather than mocking per-describe-block, since vi.mock is hoisted and file-scoped in Vitest."

requirements-completed: [I18N-01, I18N-02, I18N-03]

coverage:
  - id: D1
    description: "Cross-surface FR-wiring + completeness gate: every major surface (masthead, Lookup, Drills, Build, Recall + RecallMap, Scales, Songs + SongMark/SongFilterToggle, Theory + InteractiveLesson, Progress + StreakBadge) renders its locked FR string under fr and its English equivalent under en in one aggregate test file"
    requirement: "I18N-01"
    verification:
      - kind: unit
        ref: "src/lib/i18n/coverage.test.ts (9 describe blocks, one per surface)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Chord symbol / ChordGlyph / interval-shorthand / solfège immunity proven byte-identical across locales and across surfaces (Home starter chip, Build root chip, InspectRegister, IntervalChip)"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/lib/i18n/coverage.test.ts#Chord/glyph/interval-shorthand/solfège immunity across surfaces (I18N-02)"
        status: pass
    human_judgment: false
  - id: D3
    description: "No-raw-key-leak sweep: every key in the entire merged en/fr catalog resolves to a real translated value, never the bare key, in both locales"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/lib/i18n/coverage.test.ts#No raw-key leak across every domain (I18N-02)"
        status: pass
    human_judgment: false
  - id: D4
    description: "I18N-03 fit-rule assertions: RecallSession's grade grid keeps grid-cols-2/sm:grid-cols-4, the masthead nav keeps flex-wrap, BuildSession's Root/Quality captions render full-word FR - no fixed-width slot regressions"
    requirement: "I18N-03"
    verification:
      - kind: unit
        ref: "src/lib/i18n/coverage.test.ts (fit-rule assertions embedded in the Masthead/Build/Recall describe blocks)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Visual French sign-off across every surface at phone and laptop widths: the whole UI reads correct French with no overflow, and chord symbols/glyph/shorthand/solfège/brand stay unchanged, confirmed by eye in a running browser"
    verification: []
    human_judgment: true
    rationale: "Automated tests confirm the responsive CSS classes/breakpoints stay structurally intact under fr (grid-cols-2/sm:grid-cols-4, flex-wrap, full-word captions) and that every locked FR string renders, but cannot confirm actual pixel-level visual fit, subjective readability, or genuine cross-page navigation feel at real viewport widths. This is the plan's own Task 3 (checkpoint:human-verify) - explicitly deferred to the orchestrator per this execution's instructions rather than performed by this agent."

duration: 20min
completed: 2026-07-18
status: complete
---

# Phase 20 Plan 10: Cross-Surface Immunity + Completeness Gate + I18N-03 Fit Audit Summary

**One aggregate `coverage.test.ts` gate renders all 9 major surfaces under both locales, re-proves chord/glyph/interval/solfège immunity across surfaces, exhaustively sweeps the entire merged catalog for raw-key leaks, and re-locks the I18N-03 fit-rule assertions - all green with zero fit fixes needed.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-07-18
- **Tasks:** 2 automated (Task 1 + Task 2), 1 deferred to orchestrator (Task 3)
- **Files created:** 1 (`src/lib/i18n/coverage.test.ts`, 542 lines, 21 tests)

## Accomplishments

- Built `coverage.test.ts`, the single cross-surface completeness gate the phase's success criteria require: it renders the masthead (`+layout.svelte`), Lookup/home, Drills, Build, Recall + RecallMap, Scales, Songs (+ standalone SongMark/SongFilterToggle), Theory + InteractiveLesson, and Progress + StreakBadge - nine real surfaces in one file, each asserting its locked FR string under `fr` and its English equivalent under `en`, with several proving the LIVE flip (locale switched mid-test on an already-mounted component, not just at initial render).
- Merged every per-surface test file's own dependency mocks (`$lib/audio/audio`, `$lib/srs/deck` via `importOriginal`, `$lib/api/client`, `$lib/api/progress`, and the Drills page's full `practice/*` + `drills/rotateHint` mock set) into one shared block, so real route `+page.svelte` files render exactly as their own per-plan test already proved, but now all in a single aggregate gate.
- Re-proved the chord-symbol/ChordGlyph/interval-shorthand/solfège immunity boundary across surfaces (not just within one component's own suite): `ChordGlyph` renders `Cm7` byte-identically in en/fr; `IntervalChip`'s `m3` label carries zero `t()` involvement; `InspectRegister`'s letter/solfège/shorthand segments stay identical while only the long-name and unit word switch; the Home page's starter-chord chips render identical text in en/fr and the Build page's root chip letter (`C`) stays unchanged under fr.
- Added an exhaustive no-raw-key-leak sweep over the ENTIRE merged catalog (`Object.keys(messages.en)`, not a sample) plus a `t()`-level check across a representative key from every one of the 9 domains (chrome/recall/build/drills/songs/theory/scales/progress/home) in both locales.
- Re-locked the I18N-03 fit-rule assertions inside the aggregate gate itself: the masthead's nav-links container keeps `flex-wrap`; `RecallSession`'s grade grid keeps `grid-cols-2 sm:grid-cols-4` under fr with the FR grade labels rendered; `RecallMap`'s 4-column grid template (`repeat(4, 1fr)`) is unchanged under fr; `BuildSession`'s Root/Quality captions render as full French words (Fondamentale/Qualité), never a truncated fixed-width slot.
- Confirmed via `npm run check` (0 errors) and the full `npm test` suite (1184 tests, up from 1163 - the +21 new tests in this file) that the aggregate gate integrates cleanly with every prior Phase 20 plan's own per-surface coverage.

## Task Commits

Both automated tasks were built as one coherent `coverage.test.ts` file and committed together (documented as a deviation below):

1. **Task 1 + Task 2: Cross-surface FR-wiring/immunity/no-key-leak gate + I18N-03 fit-rule assertions** - `e46e66f` (test)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified

- `src/lib/i18n/coverage.test.ts` - the cross-surface completeness + immunity + fit gate (21 tests across 9 surface describe blocks + immunity + no-key-leak blocks)

## Decisions Made

- Combined Task 1 and Task 2 into a single commit since both build the exact same file as one coherent gate; splitting the diff artificially to match the plan's two-task numbering would have added no value.
- No `app.css` fit fix was applied. Every I18N-03 fit-rule assertion (grade grid breakpoint, nav flex-wrap, Build's full-word captions) passes unchanged under `fr` - matching the plan's own stated expectation ("any targeted fit fix (expected: none)").
- `tiers.ts` (tier names/blurbs, e.g. "White-key triads", "All-key triads") and `presets.ts` (`SONG_PRESETS`' `preset.note` strings, e.g. "Real Book key. Tonic saved as Gm...") are left as **accepted English residuals**, not translated here. Neither file is in this plan's or any prior Phase 20 plan's `files_modified` scope; `progress.ts`'s own code comment and 20-UI-SPEC.md both explicitly name `tiers.ts` as "a shared data file outside every Phase 20 plan's file_modified scope." Scoping these in now would be an architectural/scope expansion beyond what 20-10-PLAN.md's tasks describe - flagged here for a future decision rather than silently translated.
- The no-raw-key-leak check sweeps the ENTIRE merged catalog (every key in `messages.en`/`messages.fr`), not just a sample - stronger than the plan's literal wording, at effectively zero cost since it's pure object comparison with no rendering involved.

## Deviations from Plan

**1. [Rule N/A - process] Combined Task 1 and Task 2 into one commit.** Both tasks build the same `coverage.test.ts` file (Task 2's action explicitly says "Extend coverage.test.ts with fit-rule assertions"), so there was no natural seam to split the diff into two separate atomic commits without artificially partial-committing an incomplete file. Documented, not a scope change.

**2. [Rule 4 - deferred, not auto-fixed] tiers.ts/presets.ts English residuals left untranslated.** Per the environment note's own framing ("decide per plan whether to translate here or document as accepted"), this plan's tasks do not scope these files in (they're not in `files_modified`, and 20-UI-SPEC.md explicitly excludes `tiers.ts`). Translating them would require editing files outside this plan's declared scope and inventing new dictionary keys not specified anywhere in the phase's plans - an architectural/scope decision, not an auto-fixable bug or missing-functionality gap. Documented here rather than silently expanding scope.

No other deviations - Tasks 1 and 2 executed exactly per the plan's `<action>` specs, using the locked FR strings already established by 20-01 through 20-09's own dictionaries.

## Known Stubs

None. No hardcoded empty values, placeholder text, or unwired data sources were introduced by this plan (it only adds tests).

## Threat Flags

None. This plan introduces no new network endpoints, auth paths, file access patterns, or schema changes - it is a test-only plan matching the threat model's own disposition (`T-20-02` mitigate: the coverage test itself confirms every `t()` render site uses escaped text, no `{@html}`; `T-20-01` accept: unchanged).

## Issues Encountered

None. The one implementation snag (direct `setLocale(...)` calls made mid-test, after a component was already mounted, didn't visibly flip the DOM before the next synchronous assertion) was resolved by wrapping those calls in Svelte 5's `flushSync(() => setLocale(...))` - documented above as a established pattern for any future cross-locale test that needs to flip an already-mounted component outside of a real `fireEvent` click.

## User Setup Required

None - no external service configuration required.

---

## Orchestrator Visual Sign-off (Task 3 - PENDING, not performed by this executor)

Per this execution's instructions, Task 3 (`checkpoint:human-verify`, the plan's final task) is a visual browser verification explicitly deferred to the orchestrator rather than performed by this agent. **Tasks 1 and 2 are fully automated-done and committed (`e46e66f`). Task 3 is orchestrator-visual-pending.**

### Verification checklist for the orchestrator

1. Run `npm run dev` and open the app at a phone-width viewport (~390px) and a laptop width.
2. Click the EN|FR toggle (top-right of the masthead) to FR. Confirm the whole UI switches to correct French live (no reload), and that reloading the page keeps FR (persistence via `localStorage["music-learn:locale"]`).
3. Walk every page and confirm all copy is correct French with no overflow:
   - **Lookup (`/`):** heading "Recherche d'accord", input placeholder, empty state "Pas encore d'accord", starter chord chips (`Cm7`, `Fmaj7`, `G7` - these stay UNCHANGED, never translated).
   - **Drills (`/drills`):** heading "Exercices", mode row (Accords/Intervalles/Mixte), score register (SUR/BONNES/SÉRIE), question-source tags (e.g. "DE TA LEÇON").
   - **Build (`/build`):** heading "Construire", kind-toggle (Accords/Gammes), Root/Quality captions render as full words "Fondamentale"/"Qualité" (never truncated).
   - **Recall (`/recall`):** heading "Révision", Review/Map toggle (Réviser/Carte), the FOUR GRADE BUTTONS (À revoir/Difficile/Correct/Facile) - specifically check these do NOT clip or wrap awkwardly at ~390px and at ≥640px; the mode chip (e.g. "SYMBOLE → FORMULE").
   - **Recall Map:** column headers (Formule/Construire/Jouer/Nommer), kind-filter tabs (Tout/Accords/Intervalles/Gammes), legend (Pas encore vu/À réviser/Faible/Maîtrisé).
   - **Scales (`/scales`):** heading "Gammes", Explore/Practice toggle (Explorer/Pratiquer), tonic row - confirm tonic LETTERS stay unchanged (C, D♭, D...) with only the "majeur" suffix appearing.
   - **Songs (`/songs`):** heading "Morceaux", empty state, New song button ("Nouveau morceau"), SongMark pluralization ("2 MORCEAUX" for a multi-song chord), SongFilterToggle button ("Depuis mes morceaux" - note this is 6 chars longer than EN, confirm it wraps inside its flex row rather than clipping).
   - **Theory (`/theory`):** heading "Théorie", interactive lesson step titles/controls (Écouter/Continuer/Essayer dans un exercice), the static lesson sections below it.
   - **Progress (`/progress`):** heading "Progrès", Practice Settings card (Réglages de pratique), SOUND/STUDY MODE toggles (SON/MODE ÉTUDE), the streak chip in BOTH the masthead (compact) and the Progress hero card (if a token is configured and streak data loads) reading "{N} JOURS DE SUITE".
   - **Masthead (every page):** the 8 nav links wrap gracefully at narrow widths (Rechercher/Exercices/Construire/Révision/Gammes/Morceaux/Théorie/Progrès), brand "MUSIC LEARN" stays unchanged, the EN|FR toggle itself stays 44x44px minimum.
4. Confirm immunity holds visually everywhere: chord symbols (`Cm7`, `F♯ø7`), the serif ChordGlyph, interval shorthand (R, m3, P5), solfège (Do/Ré/Mi), and the brand "MUSIC LEARN" look IDENTICAL in French to how they look in English - no accidental translation anywhere.
5. Flip back to EN and confirm English is restored everywhere, live, no stale French fragments.

### Specific overflow risks to eyeball closely (per the UI-SPEC's own audit + this plan's fit-rule tests)

- **Register/interval-role slots:** LOW RISK per UI-SPEC - only flex-wrap captions (Fondamentale/Qualité/Tonique) or quality-first shorthand (R/m3/P5) are used anywhere; no fixed-width mono grid exists in the app today. Automated test confirms this.
- **Grade buttons:** LOW RISK - `grid-cols-2 sm:grid-cols-4` is width-driven, not language-driven; automated test confirms the class is unchanged under fr. Visually confirm "Difficile" (9 chars, the longest FR label) doesn't clip at exactly 640px.
- **Masthead nav:** LOW RISK - flex-wrap already absorbs the longer FR labels (Exercices/Théorie/Progrès with accents); automated test confirms the container keeps `flex-wrap`. Visually confirm the identity row (brand + streak chip + EN|FR toggle) doesn't crowd below ~360px.
- **SongFilterToggle button:** "Depuis mes morceaux" (20 chars) vs "From my songs" (14 chars) - the button itself has no `white-space: nowrap`, so it should wrap safely inside its flex row; visually confirm at narrow widths.

### Known accepted-English residuals (out of this plan's scope, confirm these are EXPECTED, not bugs)

- `src/lib/practice/tiers.ts`: tier names ("White-key triads", "All-key triads", "The big three sevenths", etc.) and their blurbs render in English even under fr, on the Progress page's Practice Settings card and the Drills page's LevelPicker. This is intentional per this plan's scope (see Decisions Made above) - do NOT treat as a bug during sign-off.
- `src/lib/practice/presets.ts`: the `SONG_PRESETS` preset shelf's `note` field (e.g. "Real Book key. Tonic saved as Gm, D7b9 as D7...") renders in English even under fr, on the Songs page's preset shelf. Same scope decision - expected, not a bug.

---
*Phase: 20-french-translation*
*Completed: 2026-07-18*

## Self-Check: PASSED

`src/lib/i18n/coverage.test.ts` confirmed present on disk (542 lines). Commit `e46e66f` confirmed in git log (`test(20-10): cross-surface FR coverage + immunity + fit gate (I18N-01/02/03)`).
