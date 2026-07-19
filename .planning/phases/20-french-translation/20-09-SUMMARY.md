---
phase: 20-french-translation
plan: 09
subsystem: i18n
tags: [svelte5-runes, i18n, sveltekit]

requires:
  - phase: 20-french-translation
    provides: "20-01's reactive locale store (currentLocale/setLocale/t), merged messages/index.ts dictionary architecture, and the pre-created home.ts stub"
provides:
  - "Home (Lookup) domain dictionary (home.ts) filled: page title, input placeholder, insert-glyph aria labels, Stamp/Hear-it actions, empty state, recent-lookups group heading + chip aria template, inspect idle line, and the semitone singular/plural word pair"
  - "hints.ts and mnemonics.ts made locale-aware: pickHint()/pickSuggestionHint()/mnemonicFor() now read currentLocale() and select FR pools/records (errorHintsFr, suggestionHintsFr, MNEMONICS_FR) in parallel to the existing EN ones, preserving {SYMBOL}, chord-symbol examples, and ♭/♯ glyphs verbatim"
  - "InspectRegister.svelte's long-form interval name and semitone word are now locale-aware (info.long vs info.longFr, semitone(s) vs demi-ton(s)), reading the existing longFr seed rather than re-deriving French terms; its idle line defaults to t('home.inspect.idle') via a $derived, with the caller's idleText prop still overriding"
  - "+page.svelte and RecentChipRow.svelte render all home-surface copy through t(), with STARTER_CHORDS and chord/note notation left untouched"
  - "RevealInsight's mnemonic line inherits locale-awareness for free from mnemonicFor() being locale-reactive - no template changes needed there, only a regression test added"
affects: []

tech-stack:
  added: []
  patterns:
    - "Copy-module locale seam (Option A, established in 20-PATTERNS.md): keep the existing EN pool/record exported under its original name, add a parallel FR pool/record (Xxx Fr suffix), and make the picker/lookup function branch on currentLocale() internally - callers and API signatures never change"
    - "Idle/default-text props go through $derived(propValue ?? t('key')) rather than a `= 'literal'` default parameter, so the fallback stays reactive to locale changes while a caller-supplied override still wins"
    - "Placeholder-token translation for aria-label templates with embedded dynamic data (t('home.recent.chip-aria').replace('{symbol}', symbol)) mirrors the existing {SYMBOL} substitution pattern in hints.ts, keeping the interpolated value (a chord symbol) outside the translation layer"

key-files:
  created: []
  modified:
    - src/lib/i18n/messages/home.ts
    - src/lib/copy/hints.ts
    - src/lib/copy/hints.test.ts
    - src/lib/copy/mnemonics.ts
    - src/lib/copy/mnemonics.test.ts
    - src/routes/+page.svelte
    - src/lib/components/RecentChipRow.svelte
    - src/lib/components/InspectRegister.svelte
    - src/lib/components/components.test.ts
    - src/lib/components/revealInsight.test.ts
    - tests/lookup.e2e.test.ts
    - tests/drills.e2e.test.ts
    - tests/scales.e2e.test.ts

key-decisions:
  - "InspectRegister's long-name field previously read info.longFr unconditionally (a pre-i18n bilingual-by-design choice, not tied to any locale toggle). Making it locale-aware is a genuine behavior change: under the new 'en' default it now shows info.long (\"minor 3rd\") and the word \"semitone(s)\" instead of always showing French. This required updating several pre-existing tests (components.test.ts, drills.e2e.test.ts, scales.e2e.test.ts) that had hardcoded the old always-French register line - fixed as Rule-1 regressions since InspectRegister is the explicitly shared component this plan owns."
  - "'recent-lookups heading' (named in the plan but absent as visible markup) was implemented as an accessible group label (role=\"group\" aria-label={t('home.recent.heading')}) on RecentChipRow's wrapper, rather than inventing new visible heading text - keeps the existing visual layout unchanged while giving the group a translated accessible name."
  - "RevealInsight.svelte needed no code changes: it has no literal English text of its own (its content is entirely derived from contrastLine() and mnemonicFor()). mnemonicFor() becoming locale-reactive (Task 2) is sufficient for its mnemonic line to flip to French, since Svelte 5's $derived tracks the currentLocale() read that happens inside mnemonicFor() during the derived's evaluation. Only a regression test was added to lock this in."
  - "contrastLine() (src/lib/theory/contrast.ts) stays English-only in both locales - it is not in this plan's files_modified and was not translated. This is a known, intentionally out-of-scope gap for this plan, not a bug."

requirements-completed: [I18N-02]

coverage:
  - id: D1
    description: "Home-domain dictionary filled: home page title/placeholder/actions/empty-state, recent-lookups group heading + chip aria template, inspect idle line, and semitone singular/plural, all as balanced en/fr key pairs"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/lib/i18n/messages.test.ts#en/fr message parity (I18N-02)"
        status: pass
    human_judgment: false
  - id: D2
    description: "pickHint()/pickSuggestionHint()/mnemonicFor() return the current-locale variant, preserving {SYMBOL}, chord-symbol examples, and ♭/♯ glyphs"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/lib/copy/hints.test.ts#pickHint locale awareness (I18N-02)"
        status: pass
      - kind: unit
        ref: "src/lib/copy/mnemonics.test.ts#mnemonicFor: FR locale (I18N-02)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Home/Lookup page and RecentChipRow render French under the fr locale (title, placeholder, insert-glyph labels, Stamp/Hear-it, empty state, recent-lookup chip aria), with STARTER_CHORDS and chord notation immune"
    requirement: "I18N-02"
    verification:
      - kind: e2e
        ref: "tests/lookup.e2e.test.ts#lookup page French locale (I18N-02)"
        status: pass
    human_judgment: false
  - id: D4
    description: "InspectRegister switches its long-form interval name (info.long vs info.longFr) and semitone word by locale without re-deriving French terms, and its idle line is locale-aware while still overridable"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/lib/components/components.test.ts#InspectRegister"
        status: pass
      - kind: e2e
        ref: "tests/lookup.e2e.test.ts#lookup page French locale (I18N-02)"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-07-18
status: complete
---

# Phase 20 Plan 09: Home/Lookup Surface + Copy Modules + Shared Reveal/Inspect Components Summary

**Home/Lookup page, RecentChipRow, InspectRegister, and the hints/mnemonics copy modules all flip to French, with InspectRegister's long-name segment switching between the English `info.long` and the pre-existing `info.longFr` seed rather than re-deriving French terms.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments
- Filled `src/lib/i18n/messages/home.ts` with the full home-domain dictionary: page title, input placeholder, insert-sharp/flat aria labels, Stamp/Hear-it action labels, empty-state title + body, a new recent-lookups group aria-label, the `{symbol}`-templated recent-chip aria label, the inspect idle line, and the semitone singular/plural word pair - all as balanced en/fr key pairs, verified against the standing key-parity test.
- Made `hints.ts` and `mnemonics.ts` locale-aware: added parallel `errorHintsFr`/`suggestionHintsFr` pools and a `MNEMONICS_FR` record (same voice, same length, `{SYMBOL}` placeholder and chord-symbol examples/♭/♯ glyphs preserved verbatim), and updated `pickHint()`/`pickSuggestionHint()`/`mnemonicFor()` to branch on `currentLocale()` internally with unchanged API signatures and unchanged anti-repeat rotation logic.
- Rewired `+page.svelte` and `RecentChipRow.svelte` to read all copy through `t('home.*')`, keeping `STARTER_CHORDS` and every chord/note symbol untouched.
- Made `InspectRegister.svelte`'s interval long-name and semitone word locale-aware: `info.long` under `en`, `info.longFr` under `fr` (reading the existing seed, never re-deriving), `t('home.inspect.semitones.singular'|'plural')` for the count word, and a `$derived` idle line (`idleText ?? t('home.inspect.idle')`) that keeps caller overrides working.
- Confirmed `RevealInsight.svelte` needed no template changes - its mnemonic line already flips to French for free because `mnemonicFor()` (a shared, now-reactive function) is called inside its existing `$derived`; added a regression test to lock this in.

## Task Commits

Each task was committed atomically:

1. **Task 1: Fill messages/home.ts with the home-domain dictionary** - `96bd8d4` (feat)
2. **Task 2: Make hints.ts + mnemonics.ts locale-aware** - `7a33981` (feat)
3. **Task 3: Rewire home +page.svelte + RecentChipRow + InspectRegister + RevealInsight** - `6fdcea5` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `src/lib/i18n/messages/home.ts` - home-domain dictionary, filled
- `src/lib/copy/hints.ts` - `errorHintsFr`/`suggestionHintsFr` pools added; pickers now locale-aware
- `src/lib/copy/hints.test.ts` - FR pool assertions + locale-awareness tests for both pickers
- `src/lib/copy/mnemonics.ts` - `MNEMONICS_FR` record added; `mnemonicFor()` now locale-aware
- `src/lib/copy/mnemonics.test.ts` - FR pinned-table assertions + alias/glyph/em-dash checks under `fr`
- `src/routes/+page.svelte` - home page copy rewired through `t()`
- `src/lib/components/RecentChipRow.svelte` - group aria-label + per-chip aria template rewired through `t()`
- `src/lib/components/InspectRegister.svelte` - long-name/semitone-word locale switch, `$derived` idle line
- `src/lib/components/components.test.ts` - InspectRegister suite updated for the en-default behavior change, plus new fr-locale assertions
- `src/lib/components/revealInsight.test.ts` - new fr-locale regression test for the inherited mnemonic reactivity
- `tests/lookup.e2e.test.ts` - three pre-existing always-French register assertions fixed to the en-default English strings; new French-locale describe block (placeholder, idle line, long-name switch, STARTER_CHORD immunity)
- `tests/drills.e2e.test.ts` - two InspectRegister assertions fixed to en-default English strings (shared-component regression)
- `tests/scales.e2e.test.ts` - one InspectRegister assertion fixed to en-default English strings (shared-component regression)

## Decisions Made
- InspectRegister's long-name field previously always rendered `info.longFr` regardless of any locale (a pre-Phase-20 bilingual-by-design choice). Making it genuinely locale-aware changes default (`en`) output from French to English, which required fixing several pre-existing tests across drills/scales/components suites that had hardcoded the old always-French line. Treated as a Rule-1 regression fix since InspectRegister is this plan's explicitly shared component.
- The plan's "recent-lookups heading" was implemented as an accessible group label (`role="group"` + `aria-label`) on `RecentChipRow`'s wrapper rather than new visible heading markup, since no such heading exists in the current UI and none was requested visually.
- `RevealInsight.svelte` required zero code changes - it has no literal text of its own; its French behavior is inherited entirely from `mnemonicFor()`'s new locale-reactivity via the existing `$derived`.
- `contrastLine()` (`src/lib/theory/contrast.ts`) is intentionally left English-only: it is not in this plan's `files_modified` list and was out of scope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug/regression] Updated pre-existing InspectRegister-consuming tests for the new en-default behavior**
- **Found during:** Task 3 (full-suite verification)
- **Issue:** `InspectRegister` previously rendered `info.longFr` and the word "demi-ton(s)" unconditionally, so `components.test.ts`, `drills.e2e.test.ts`, and `scales.e2e.test.ts` had hardcoded French assertions even though those pages run at the (now-default) `en` locale. Making the component genuinely locale-aware surfaced these as failing assertions.
- **Fix:** Updated the five affected assertions to expect the correct English default (`info.long` / "semitone(s)"), and added parallel French-locale test coverage where missing (components.test.ts) to lock the switch in both directions.
- **Files modified:** `src/lib/components/components.test.ts`, `tests/drills.e2e.test.ts`, `tests/scales.e2e.test.ts`
- **Verification:** Full suite (`npx vitest run`) green: 82 files / 1163 tests.
- **Committed in:** `6fdcea5` (part of Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1)
**Impact on plan:** Necessary correctness fix so the shared `InspectRegister` component behaves consistently across every page that reuses it (drills, scales, lookup). No scope creep - no new features added beyond what the plan specified.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `npm run check`: 0 errors, 0 warnings (1317 files).
- Full suite: 82 files / 1163 tests passing.
- `messages.test.ts` en/fr key-parity gate still green with the new `home.*` keys added.
- `immunity.test.ts` (ChordGlyph) unaffected; no chord/note/interval-shorthand notation was routed through `t()` anywhere in this plan.
- No blockers for subsequent Phase 20 plans. `contrastLine()` (RevealInsight's contrast line) remains untranslated - flagged above as an intentional, plan-scoped gap should a future plan want to close it.

---
*Phase: 20-french-translation*
*Completed: 2026-07-18*

## Self-Check: PASSED

All 7 files/commits confirmed: `home.ts`, `hints.ts`, `mnemonics.ts`, `+page.svelte`, `RecentChipRow.svelte`, `InspectRegister.svelte`, and this SUMMARY.md exist on disk; task commits `96bd8d4`, `7a33981`, `6fdcea5` all confirmed in git log.
