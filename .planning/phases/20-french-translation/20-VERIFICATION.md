---
phase: 20-french-translation
verified: 2026-07-18T20:14:19Z
status: passed
score: 10/10 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 20: French Translation Verification Report

**Phase Goal:** The entire UI can switch to French via a header EN|FR toggle backed by a real i18n layer, while chord symbols stay language-neutral and no Print Shop surface overflows.
**Verified:** 2026-07-18T20:14:19Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | EN\|FR toggle renders top-right in masthead, defaults to EN, persists to `localStorage["music-learn:locale"]` | ✓ VERIFIED | `src/lib/components/LocaleToggle.svelte` renders in `+layout.svelte` masthead (line 60); `locale.svelte.ts` `setLocale()` writes to `music-learn:locale` (browser-guarded + try/catch), `current` defaults to `'en'`. Round-trip write→reload→read has no dedicated automated test (see note below), but the code follows the exact proven pattern already used and tested for `audio.ts`'s own localStorage persistence, and the orchestrator's live-browser session (2026-07-18) directly observed FR active on `/recall` and `/theory`. |
| 2 | Clicking FR re-renders masthead nav labels live (no reload); clicking EN restores English | ✓ VERIFIED | `tests/masthead.e2e.test.ts` "flips the nav to French live when the FR segment is clicked" — fires click, asserts `Exercices`/`Théorie` links appear, brand unchanged. `coverage.test.ts`'s masthead describe block re-confirms with `flushSync(() => setLocale('fr'))` / `setLocale('en')`. |
| 3 | Every user-facing string across masthead, Lookup, Drills, Build, Recall, Scales, Songs, Theory, Progress is a keyed EN+FR entry, not a loose literal | ✓ VERIFIED | 9 domain dictionaries (`chrome`, `recall`, `build`, `drills`, `songs`, `theory`, `scales`, `progress`, `home`) merged in `messages/index.ts`. `messages.test.ts` asserts identical en/fr key sets. `coverage.test.ts` "No raw-key leak" test iterates **every** key in the merged catalog (not a sample) and asserts `messages.en[key] !== key` and `messages.fr[key] !== key` for all of them. Manual grep across all `.svelte` files under `src/routes` + `src/lib/components` found zero un-keyed hardcoded English strings in nav-reachable surfaces (only hits were in `src/routes/showcase/+page.svelte`, a pre-Phase-20 dev harness explicitly and intentionally excluded from nav — `masthead.e2e.test.ts` asserts "drops Showcase from the nav (v2 contract)"). |
| 4 | Chord symbols / serif ChordGlyph / interval shorthand / solfège / brand never translate | ✓ VERIFIED | `immunity.test.ts` + `coverage.test.ts`'s immunity describe block assert byte-identical rendering of `Cm7`, `F♯ø7`, `m3`/`P5` shorthand, `Mi` solfège, and `MUSIC LEARN` brand across `en`/`fr`, on multiple surfaces (Lookup starter chip, Build root chip, InspectRegister). `ChordGlyph.svelte`/`IntervalChip.svelte` have zero `t()` calls for root/quality/shorthand — confirmed by source read. |
| 5 | Recall grade buttons/mode chip/RecallMap render French, grade grid stays responsive | ✓ VERIFIED | `recallSession.test.ts` + `coverage.test.ts`: "À revoir/Difficile/Correct/Facile" render under fr; grid retains `grid-cols-2 sm:grid-cols-4` (no FR-only override); RecallMap column headers ("Formule"), legend, kind filters ("Accords") render French. |
| 6 | Build renders French captions/steps/WHY prose; interval long-names use existing `longFr` seed | ✓ VERIFIED | `buildSession.test.ts` + `coverage.test.ts`: "Construire" heading, "Fondamentale"/"Qualité" full-word captions (not truncated), `STEP`→`ÉTAPE`/`OF`→`SUR` register. `BuildSession.svelte` line 383 reads `step.interval.longFr` directly under fr, matching CONTEXT's reuse-not-reinvent instruction. |
| 7 | Drills renders French prompts/feedback/CTAs, `DE TA LEÇON` tag, French `poolLabel` | ✓ VERIFIED | `coverage.test.ts` "Drills FR wiring": `Exercices` heading, `DE TA LEÇON` source tag, `Clique sur les notes de Cm7.` prompt with chord symbol immune. `drillsSongFilter.test.ts` covers the From-my-songs filter bar. |
| 8 | Songs/Theory/Scales/Progress render French for their respective page copy, streak lines, and Phase 18/19 components (SongMark, SongFilterToggle, InteractiveLesson) | ✓ VERIFIED | `coverage.test.ts` per-surface describes: Songs ("Morceaux", "Aucun morceau pour l'instant", "2 MORCEAUX" pluralized tag, "Depuis mes morceaux"); Theory ("Théorie", "La note du bas" lesson step-1 title); Scales ("Gammes", "Pratiquer", tonic letter "C" immune in "C majeur"); Progress ("Réglages de pratique", streak badge "5 JOURS DE SUITE" with `{N}` substitution preserved). |
| 9 | Tight Print Shop surfaces (mono register labels, grading buttons, nav) render French without overflow | ✓ VERIFIED | `coverage.test.ts` explicit fit-rule assertions: nav container keeps `flex-wrap` class under fr; grade grid keeps `grid-cols-2 sm:grid-cols-4`; Build captions render as flowing `<p>` text (not a fixed-width mono slot), so the FONDAMENTALE-length risk flagged in sketch 013 doesn't apply to the real markup. Orchestrator's live-browser pass at 375px mobile confirmed 0px horizontal overflow on `/recall` (2×2 grade grid, wrapping nav) and `/theory` (mini keyboard fits, 331<375 right edge). |
| 10 | The two prior English residuals (tier ladder names/blurbs, song-preset notes) are also wired through `t()` | ✓ VERIFIED | Commit `9ca90a4` (HEAD) rewires `LevelPicker.svelte` to `progress.tier.{1-6}.name/.blurb` keys and `songs/+page.svelte` to `songs.preset.<id>.note` keys, with `levelPicker.test.ts`/`songsPage.test.ts` additions. `tiers.ts`/`presets.ts` data modules intentionally stay English-only (own tests assert literal strings) — only their UI consumers were rewired, per the commit message; this is a sound, minimal-footprint fix. |

**Score:** 10/10 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/i18n/locale.svelte.ts` | Reactive locale store + t()/setLocale/initLocale, SSR-safe | ✓ VERIFIED | `browser` guard from `$app/environment` on every localStorage touch; `current` defaults to `'en'`; no `window` reference at module top level. |
| `src/lib/i18n/messages/index.ts` + 9 domain files | Merged EN/FR keyed catalog | ✓ VERIFIED | `chrome`, `recall`, `build`, `drills`, `songs`, `theory`, `scales`, `progress`, `home` all present, spread-merged. |
| `src/lib/components/LocaleToggle.svelte` | EN\|FR segmented control | ✓ VERIFIED | Reuses `Button` + `role="group"` segmented pattern; wired into masthead. |
| `src/routes/+layout.svelte` | Masthead nav wired to `t()`, calls `initLocale()` | ✓ VERIFIED | `navLinks` uses `labelKey` + `t(link.labelKey)`; `onMount` calls `initLocale()`. |
| `src/lib/copy/hints.ts`, `mnemonics.ts`, `streak.ts` | FR variant pools, locale-aware pickers | ✓ VERIFIED | Each imports `currentLocale` and branches its pool selection on it; FR pools present with matching length/placeholder contracts. |
| `src/lib/i18n/coverage.test.ts` | Cross-surface completeness/immunity/fit gate | ✓ VERIFIED | 542 lines, renders all 8 real routes + shared components, asserts EN/FR flip, immunity, and fit rules; not a stub. |
| `src/lib/i18n/immunity.test.ts`, `messages.test.ts` | Chord-glyph immunity + key-parity gates | ✓ VERIFIED | Both substantive, exercised in `npm test`. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `LocaleToggle.svelte` | `locale.svelte.ts` | `setLocale('en'/'fr')` on click | WIRED | Confirmed by source read + `masthead.e2e.test.ts` click-driven assertion. |
| `+layout.svelte` nav | `messages/index.ts` via `t()` | `t(link.labelKey)` | WIRED | Nav labels flip live in `coverage.test.ts` + `masthead.e2e.test.ts`. |
| `LevelPicker.svelte` / `songs/+page.svelte` | `progress.ts` / `songs.ts` message keys | `t('progress.tier.N.name')` / `t('songs.preset.<id>.note')` | WIRED | Confirmed via commit `9ca90a4` diff; `levelPicker.test.ts`/`songsPage.test.ts` assert the French values render. |
| `BuildSession.svelte` interval display | `chordPresentation.ts` / theory `IntervalInfo.longFr` | direct field read, not `t()` | WIRED | Line 383: `currentLocale() === 'fr' ? step.interval.longFr : phraseStep(step.interval.short)` — matches CONTEXT's "reuse the existing longFr seam" instruction. |
| `locale.svelte.ts` `setLocale()` | `localStorage['music-learn:locale']` | `localStorage.setItem` | WIRED (presence + wiring confirmed; no dedicated round-trip test — see note) | See Observable Truth #1. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite passes | `npm test -- --run` | 83 files / 1187 tests passed | ✓ PASS |
| Type/lint check clean | `npm run check` | 1318 files, 0 errors, 0 warnings | ✓ PASS |
| Named cross-surface FR gate test file exists and is substantive | enumerate `src/lib/i18n/coverage.test.ts` | 542 lines, 9 describe blocks covering all 8 routes + immunity + no-raw-key-leak | ✓ PASS |
| No debt markers in phase-20-touched files | `grep -nE "TBD|FIXME|XXX|TODO|HACK"` across all 61 files changed since `b38b146` | no matches | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| I18N-01 | 20-01, 20-10 | Header EN\|FR toggle switches all copy, persists, chord symbols never translate | ✓ SATISFIED | LocaleToggle + masthead wiring + immunity tests |
| I18N-02 | 20-01..20-10 | i18n layer holds every user-facing string as keyed EN/FR translation | ✓ SATISFIED | 9-domain merged dictionary, key-parity test, no-raw-key-leak test, tier/preset follow-up commit closing residuals |
| I18N-03 | 20-02, 20-10 | Tight Print Shop surfaces (mono register, grading buttons, nav) render French without overflow | ✓ SATISFIED | coverage.test.ts fit-rule assertions + orchestrator's live 375px browser confirmation (0px overflow on /recall and /theory) |

No orphaned requirements: REQUIREMENTS.md maps only I18N-01/02/03 to Phase 20, and all three appear in plan frontmatter `requirements:` fields.

### Anti-Patterns Found

None. Zero `TBD`/`FIXME`/`XXX`/`TODO`/`HACK` markers across all 61 non-planning files touched in this phase. The only raw hardcoded English literals found by a full-repo `.svelte` sweep are in `src/routes/showcase/+page.svelte`, a Phase-1 dev-harness route that is explicitly and intentionally dropped from the masthead nav (asserted by `masthead.e2e.test.ts`) and outside the phase's declared "stable app surfaces" scope (per 20-CONTEXT.md) — informational only, not a gap.

### Human Verification Required

None required to reach `passed`. One low-severity note for awareness (not blocking, not routed to human_needed):

- **Note:** No automated test performs a literal write-then-reload round trip against `localStorage["music-learn:locale"]` (i.e., `setLocale('fr')` → simulate reload → `initLocale()` reads `'fr'` back). The implementation is correct by code inspection (mirrors `audio.ts`'s already-proven persistence pattern, browser-guarded, try/catch-wrapped) and the orchestrator's live-browser pass on 2026-07-18 directly observed FR active across page navigations. A quick manual `npm run dev` → toggle FR → hard-reload check would close this out fully, but it is not required to consider I18N-01 met given the code-level evidence and existing pattern reuse.

### Gaps Summary

No gaps. All 3 roadmap Success Criteria (I18N-01, I18N-02, I18N-03) and all 10 must-haves aggregated across the 10 phase plans are verified against real code: a genuine reactive `.svelte.ts` locale store (SSR-safe, no top-level `window`), a 9-domain merged EN/FR dictionary with a whole-catalog no-raw-key-leak test (not a sample), immunity tests proving chord symbols/glyph/shorthand/solfège/brand are byte-identical across locales on multiple surfaces, fit-rule assertions locking the nav flex-wrap / grade grid-cols-2×sm:grid-cols-4 / Build full-word-caption layout decisions from the sketch-013 audit, and a follow-up commit (`9ca90a4`, currently HEAD) closing the two English residuals (tier ladder, song presets) that a post-hoc audit caught. `npm test` (1187/1187) and `npm run check` (0/0) both pass cleanly on the actual working tree.

---

_Verified: 2026-07-18T20:14:19Z_
_Verifier: Claude (gsd-verifier)_
