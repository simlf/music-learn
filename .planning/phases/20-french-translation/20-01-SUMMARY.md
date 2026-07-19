---
phase: 20-french-translation
plan: 01
subsystem: i18n
tags: [svelte5-runes, sveltekit, adapter-static, localStorage, i18n]

requires:
  - phase: 15-playable-keyboard-everywhere
    provides: Button.svelte (variant/aria-pressed pattern), inline (non-dock) keyboard layout
  - phase: 18-your-songs-chords
    provides: SongFilterToggle.svelte ink/vermilion pressed-state precedent used as the "not vermilion" contrast case
provides:
  - Reactive locale store (currentLocale/setLocale/initLocale/t) in a Svelte 5 `.svelte.ts` runes module, SSR/static-safe
  - Merged en/fr message dictionary architecture: messages/index.ts merges 9 per-domain files (chrome filled, 8 empty stubs)
  - LocaleToggle.svelte EN|FR segmented control, mounted in the masthead
  - Masthead nav rekeyed to labelKey + t(), brand immune, live locale flip with no reload
  - en/fr key-parity test and chord-symbol/ChordGlyph immunity test seams for every later Phase 20 plan
affects: [20-02, 20-03, 20-04, 20-05, 20-06, 20-07, 20-08, 20-09, 20-10]

tech-stack:
  added: []
  patterns:
    - "Svelte 5 runes module files use the `.svelte.ts` extension so module-level $state stays reactive across component boundaries (locale.svelte.ts)"
    - "localStorage-backed module state follows audio.ts's lazy-read + browser-guard + try/catch convention, keyed music-learn:*"
    - "Per-domain i18n dictionaries (messages/*.ts) merged once in messages/index.ts; LocaleDict type defined there and imported type-only (erased at build time) by domain files to avoid a runtime circular dependency"

key-files:
  created:
    - src/lib/i18n/locale.svelte.ts
    - src/lib/i18n/messages/index.ts
    - src/lib/i18n/messages/chrome.ts
    - src/lib/i18n/messages/recall.ts
    - src/lib/i18n/messages/build.ts
    - src/lib/i18n/messages/drills.ts
    - src/lib/i18n/messages/songs.ts
    - src/lib/i18n/messages/theory.ts
    - src/lib/i18n/messages/scales.ts
    - src/lib/i18n/messages/progress.ts
    - src/lib/i18n/messages/home.ts
    - src/lib/i18n/messages.test.ts
    - src/lib/i18n/immunity.test.ts
    - src/lib/components/LocaleToggle.svelte
  modified:
    - src/routes/+layout.svelte
    - tests/masthead.e2e.test.ts

key-decisions:
  - "locale.svelte.ts is a .svelte.ts module (required, not stylistic) so t()'s dependency on the module-level $state is genuinely reactive in every consuming component"
  - "LocaleDict type is defined in messages/index.ts and imported type-only by each domain file; type-only circular imports are erased at compile time so this creates no runtime cycle"
  - "initLocale() has no one-time guard (unlike a typical 'idempotent init' pattern) - it always re-reads and re-applies localStorage, which is simpler and side-effect-free to call from onMount without hidden module state"
  - "locale.aria.en/locale.aria.fr are themselves t()-keyed (translate with the current locale), per PLAN.md's literal key/value spec, even though the UI-SPEC prose reads ambiguously on this point - PLAN.md's explicit strings were treated as authoritative"

patterns-established:
  - "Domain-owned i18n stub pattern: 8 empty { en: {}, fr: {} } files pre-created so Plans 20-02..20-09 are file-disjoint and the project type-checks green throughout the phase"
  - "messages.test.ts is a standing key-parity gate every later plan's additions must keep passing"

requirements-completed: [I18N-01, I18N-02]

coverage:
  - id: D1
    description: "Reactive i18n layer: locale store + t() accessor + merged per-domain dictionaries, SSR/static-safe with deterministic English prerender default"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/lib/i18n/messages.test.ts#en/fr message parity (I18N-02)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Chord symbols and the ChordGlyph component never translate across locales"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/lib/i18n/immunity.test.ts#ChordGlyph locale immunity"
        status: pass
    human_judgment: false
  - id: D3
    description: "EN|FR segmented toggle renders top-right in the masthead, defaults to EN, persists to localStorage, flips the nav live without reload, and the brand MUSIC LEARN stays unchanged in both languages"
    requirement: "I18N-01"
    verification:
      - kind: e2e
        ref: "tests/masthead.e2e.test.ts#EN|FR toggle live-flips the nav (I18N-01/02)"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-07-18
status: complete
---

# Phase 20 Plan 01: i18n Foundation Summary

**Reactive Svelte 5 runes locale store (`.svelte.ts`) + t() accessor + 9-file merged dictionary architecture, proven end to end with a persisted EN|FR masthead toggle that live-flips the nav.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-18T17:11:03Z
- **Completed:** 2026-07-18T17:19:19Z
- **Tasks:** 3
- **Files modified:** 16 (14 created, 2 modified)

## Accomplishments
- Built `locale.svelte.ts`: a Svelte 5 `.svelte.ts` runes module exporting `currentLocale()`, `setLocale()`, `initLocale()`, and `t(key)`, defaulting to `'en'` for a deterministic adapter-static prerender, persisting to `localStorage["music-learn:locale"]` behind a browser-guard + try/catch.
- Stood up `messages/index.ts` merging 9 per-domain dictionaries (`chrome` filled with all 8 nav labels + brand + toggle aria strings; `recall`/`build`/`drills`/`songs`/`theory`/`scales`/`progress`/`home` as empty `LocaleDict` stubs) into one `{ en, fr }` object, plus the shared `LocaleDict` type.
- Built `LocaleToggle.svelte`: a `role="group"` two-`Button` segmented control (EN/FR), active segment overridden to `--color-ink` fill (not the default vermilion primary) per UI-SPEC, each segment `aria-pressed` + a locale-appropriate `aria-label`.
- Wired the toggle into `+layout.svelte`'s masthead: `navLinks` rekeyed from `{ href, label }` to `{ href, labelKey }`, every label and the brand rendered via `t()`, toggle mounted in a new identity sub-cluster alongside the brand and `StreakBadge`, `initLocale()` called first inside the existing `onMount` (ahead of the streak-fetch early return, so it always runs).
- Added the en/fr key-parity test (`messages.test.ts`) and the ChordGlyph/brand immunity test (`immunity.test.ts`), plus extended the existing `tests/masthead.e2e.test.ts` with EN-default and FR-live-flip assertions.

## Task Commits

Each task was committed atomically:

1. **Task 1: i18n core — reactive locale store, t() accessor, merged per-domain dictionaries, key-parity test** - `b38b146` (feat)
2. **Task 2: LocaleToggle.svelte segmented control + chord-symbol immunity test** - `3f6dd24` (feat)
3. **Task 3: Wire the toggle + keyed nav into the masthead (live-flip end-to-end slice)** - `2ba0ae1` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `src/lib/i18n/locale.svelte.ts` - reactive locale store + t() accessor, SSR/static-safe
- `src/lib/i18n/messages/index.ts` - merges 9 domain dictionaries, exports `LocaleDict`
- `src/lib/i18n/messages/chrome.ts` - nav labels, brand, toggle aria strings (filled)
- `src/lib/i18n/messages/{recall,build,drills,songs,theory,scales,progress,home}.ts` - empty domain stubs, one owner per later plan
- `src/lib/i18n/messages.test.ts` - en/fr key-parity + brand-immunity + t() smoke test
- `src/lib/i18n/immunity.test.ts` - ChordGlyph symbol immunity across locales
- `src/lib/components/LocaleToggle.svelte` - EN|FR segmented control
- `src/routes/+layout.svelte` - masthead rekeyed to t()/labelKey, LocaleToggle mounted, initLocale() called on mount
- `tests/masthead.e2e.test.ts` - extended with EN-default + live-FR-flip assertions

## Decisions Made
- `locale.svelte.ts` uses the `.svelte.ts` extension (required, not a style choice) so `t()`'s read of the module-level `$state` stays reactive when called from any component template.
- `LocaleDict` is defined once in `messages/index.ts`; every domain file imports it as a type-only import, which TypeScript erases at compile time, avoiding a real runtime circular dependency between index.ts and its own domain imports.
- `initLocale()` has no one-time-only guard - it always re-reads and reapplies localStorage on every call, which is simpler than a hidden-state idempotency flag and still satisfies "safe to call more than once."
- `locale.aria.en`/`locale.aria.fr` are t()-keyed (their value follows the *current* locale), matching PLAN.md's literal key/value pairs exactly, even though the UI-SPEC's own prose reads ambiguously on whether these labels should stay fixed per-segment. PLAN.md's explicit strings (`"Langue : anglais"` for `locale.aria.en` under fr) were treated as the authoritative execution spec.

## Deviations from Plan

None - plan executed exactly as written. One clarification is worth noting (not a deviation, since PLAN.md's Task 1 action gave explicit key/value strings): 20-UI-SPEC.md's prose describes the toggle's per-segment `aria-label` as "not translated to match the currently-active locale," which reads as though each segment's aria-label should stay fixed regardless of locale. PLAN.md's own literal instruction gives distinct en/fr values for both `locale.aria.en` and `locale.aria.fr`, so this plan implemented the keys as fully t()-translated (matching PLAN.md, the more specific execution artifact). Flagging here in case a later plan or human review wants to reconcile the UI-SPEC wording.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The i18n foundation (store, `t()`, 9-file merged dictionary, key-parity test, immunity test) is in place; Plans 20-02 through 20-09 can each fill exactly one of the 8 pre-created domain stub files with zero shared-file conflicts.
- `npm run check` is 0 errors and the full suite (`npm test`) is green: 1099 tests / 81 files, including the new i18n tests and the extended masthead e2e suite.
- No blockers for subsequent Phase 20 plans.

---
*Phase: 20-french-translation*
*Completed: 2026-07-18*

## Self-Check: PASSED

All 16 created/modified files confirmed present on disk; all 3 task commit hashes (b38b146, 3f6dd24, 2ba0ae1) confirmed in git log.
