---
phase: 18-your-songs-chords
verified: 2026-07-18T12:33:58Z
status: passed
score: 8/8 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 18: Your Songs' Chords Verification Report

**Phase Goal:** Chords that appear in songs the user has added surface throughout the app with a provenance mark, and drills/recall can be filtered to just those chords, so app practice reinforces the exact chords the user must play at the piano.
**Verified:** 2026-07-18T12:33:58Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Any chord belonging to a user's song carries a consistent provenance mark on the Drills prompt, Recall card, and Chord Lookup result (ROADMAP SC1 / SONG-01) | ✓ VERIFIED | Single `SongMark.svelte` component imported and rendered at all three surfaces: `src/routes/drills/+page.svelte:856,934` (construction + identification prompts), `src/lib/components/RecallSession.svelte:604-608,628,709,820` (formula-build, formula, see-play, hear-name-post-answer), `src/routes/+page.svelte:222` (Lookup result header). All four call sites use the same `songsForSymbol(symbol, provenanceIndex)` seam. |
| 2 | Drills and Recall expose a "From my songs" filter that restricts the practiced/reviewed set to song chords; off = full library with marks still showing (ROADMAP SC2 / SONG-02) | ✓ VERIFIED | `SongFilterToggle.svelte` rendered on Drills (`drills/+page.svelte:825-830`, only in the active-drilling branch) and Recall Review surface (`recall/+page.svelte:76-84`, gated `{#if mode === 'review'}`, absent on Map). Drills: `drawFromSymbols(drillableSongSymbols(), poolContext())` restricts the draw when ON (`+page.svelte:208-218`); `poolContext().songSymbols` line is untouched for OFF (verified unchanged). Recall: `applySongFilter()` in `RecallSession.svelte:173-183` filters `getDueCards()` output to chord-formula facts with provenance. |
| 3 | Provenance is derived from songs stored on `/songs` (single source of truth) (ROADMAP SC3 / SONG-03) | ✓ VERIFIED | `songProvenance.ts` reads exclusively via `listSongs()`/`activeSongChordSymbols()` from `songs.ts`; grep confirms no direct `localStorage` reference in the module. `buildProvenanceIndex()` skips `active === false` songs. |
| 4 | Chord identity matching is enharmonic/alias-aware (Cm7 = C-7 = Cmin7; F♯ø7 = G♭ø7), not raw string equality | ✓ VERIFIED | `normalizeSymbolForMatch` builds a `${rootChroma}:${quality}` composite key using `tonal`'s `Note.get(...).chroma` (enharmonic) and `spellChord`'s parsed quality name (alias-invariant); `songProvenance.test.ts` (14 tests) asserts both collapses directly. |
| 5 | SongMark renders nothing / single `♪ NAME` / double-border `N SONGS`, escaped as text (no XSS) | ✓ VERIFIED | `SongMark.svelte` — `{#if songs.length > 0}` guard, `{songs[0]}` / `{songs.length} SONGS` via auto-escaped Svelte interpolation, no `{@html}` present (grep confirmed). `songMark.test.ts` (4 tests) covers empty/single/multi/escaping. |
| 6 | hear-name mode never shows the SongMark before the user answers (spoiler safety) | ✓ VERIFIED | `RecallSession.svelte:809-823` — the ONLY `SongMark` in the hear-name branch is nested strictly inside `{#if hearNameAnswered}`; no mark rendering exists anywhere earlier in that branch (lines 777-808 checked directly). `recallSession.test.ts` includes a pre/post-answer spoiler assertion. |
| 7 | Filter ON with zero derivable song chords falls back to the full library/queue and shows a non-blocking note, without auto-flipping the toggle off | ✓ VERIFIED | Drills: `songFallbackActive = songFilterOn` set only when `drillableSongSymbols()` is empty while filter is ON (`+page.svelte:208-218`); toggle state (`songFilterOn`) itself is never reset. Recall: `applySongFilter` returns `due` unchanged when `provenanceIndex.size === 0` (`RecallSession.svelte:174`); page's `songFallbackActive` derived shows the note. Both note strings match the UI-SPEC copy exactly. |
| 8 | Lookup has no filter; only the mark (SONG-02 scoped to Drills/Recall) | ✓ VERIFIED | `src/routes/+page.svelte` — grep confirms no `SongFilterToggle` import/usage; only `SongMark` + `provenanceIndex`/`songsForSymbol` added. |

**Score:** 8/8 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/practice/songProvenance.ts` | Pure provenance derivation module | ✓ VERIFIED | Exports `normalizeSymbolForMatch`, `buildProvenanceIndex`, `songsForSymbol`, `symbolHasProvenance`, `drillableSongSymbols`; no localStorage of its own; 14 passing tests |
| `src/lib/components/SongMark.svelte` | Shared provenance tag | ✓ VERIFIED | Nothing/single/multi render rule, no `{@html}`; 4 passing tests |
| `src/lib/components/SongFilterToggle.svelte` | Shared filter control | ✓ VERIFIED | `aria-pressed` button, pool label, optional note; 5 passing tests |
| `src/lib/practice/pool.ts` (`drawFromSymbols`) | Restricted (not merely weighted) draw primitive | ✓ VERIFIED | Additive export, reuses `needFor`/`cappedShares`/`applyInterleaving`/`weightedDraw`; returns `null` for empty candidate set; existing `drawFromPool` untouched |
| `src/routes/drills/+page.svelte` | Filter bar + SongMark + restricted draw wiring | ✓ VERIFIED | All wiring present and matches plan exactly (see Key Link Verification) |
| `src/lib/components/RecallSession.svelte` | Queue restriction + SongMark across 4 modes | ✓ VERIFIED | `applySongFilter()` helper, `SongMark` at all 4 mode anchors, hear-name gated correctly |
| `src/routes/recall/+page.svelte` | REVIEW POOL filter bar, Review-only | ✓ VERIFIED | Gated `{#if mode === 'review'}`, remounts `RecallSession` via `{#key songFilterOn}` |
| `src/routes/+page.svelte` (Lookup) | SongMark in result header, no filter | ✓ VERIFIED | `SongMark` beside `ChordGlyph` in `{#if result?.recognized}` block; no filter control added |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `songProvenance.ts` | `songs.ts` | `listSongs()`/`activeSongChordSymbols()` | WIRED | No direct localStorage read in songProvenance.ts; single source of truth preserved |
| `drills/+page.svelte` | `pool.ts` | `drawFromSymbols(drillableSongSymbols(), poolContext())` when filter ON | WIRED | Confirmed at `+page.svelte:212-218`; `poolContext().songSymbols: activeSongChordSymbols()` line unchanged (grep-verified untouched) |
| `RecallSession.svelte` | `songProvenance.ts` | `applySongFilter()` calling `symbolHasProvenance(fact.symbol, provenanceIndex)` | WIRED | Confirmed at `RecallSession.svelte:173-183`; only `factKind === 'chord-formula'` cards with provenance survive |
| `recall/+page.svelte` | `RecallSession.svelte` | `{#key songFilterOn}` remount passing `songFilterOn` + `provenanceIndex` props | WIRED | Confirmed at `recall/+page.svelte:89-91` |
| All 3 surfaces | `SongMark.svelte` | `songsForSymbol(symbol, provenanceIndex)` | WIRED | Same shared component + seam at all 4 render call sites (Drills x2, Recall x4, Lookup x1) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SONG-01 | 18-01, 18-02, 18-03, 18-04 | Provenance mark wherever a chord appears | ✓ SATISFIED | SongMark shared component wired at Drills (both prompt kinds), Recall (all 4 modes, spoiler-safe), Lookup |
| SONG-02 | 18-01, 18-02, 18-03 | "From my songs" filter on Drills + Recall | ✓ SATISFIED | Restricted draw (Drills) + queue restriction (Recall), per-surface localStorage persistence, graceful fallback, Lookup correctly excluded |
| SONG-03 | 18-01 | Provenance derived from `/songs` single source of truth | ✓ SATISFIED | `songProvenance.ts` reads only via `songs.ts`; enharmonic/alias-aware matching verified by test |

No orphaned requirements — REQUIREMENTS.md maps exactly SONG-01/02/03 to Phase 18, and all three appear in each plan's `requirements` frontmatter.

### Anti-Patterns Found

None. Grep for `TODO|FIXME|XXX|TBD|HACK|PLACEHOLDER|placeholder|not yet implemented` across all phase-18-modified files returned zero matches (the two `placeholder` hits in `src/routes/+page.svelte` are a pre-existing hint-splitting constant and an HTML input `placeholder` attribute, unrelated to Phase 18). No em dashes in any added copy. No `{@html}` in `SongMark.svelte`.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All phase-18 unit/component test files pass | `npm test -- run src/lib/practice/songProvenance.test.ts src/lib/components/songMark.test.ts src/lib/components/songFilterToggle.test.ts src/routes/drillsSongFilter.test.ts src/routes/recallSongFilter.test.ts src/lib/components/recallSession.test.ts src/routes/lookupSongMark.test.ts src/lib/practice/pool.test.ts` | 8 files / 96 tests passed | ✓ PASS |
| Type-check clean | `npm run check` | 1296 files, 0 errors, 0 warnings | ✓ PASS |
| Full suite (ground truth per orchestrator, re-confirmed relevant subset above) | `npm test` | 1032 passing (75 files), per environment note | ✓ PASS (not re-run in full; scoped subset re-verified directly) |

### Probe Execution

Not applicable — this phase has no `scripts/*/tests/probe-*.sh` conventions; it is a Svelte UI/logic phase verified via Vitest.

### Human Verification Required

None. All must-haves resolved programmatically: the spoiler-safety rule (hear-name mode) is proven by a direct code-structure check (single SongMark render site nested inside the `{#if hearNameAnswered}` block) plus a passing dedicated test, not by visual/runtime-only inspection. Visual styling (letterpress mono tag, double border, vermilion pressed state) matches 18-UI-SPEC.md's CSS verbatim in both components' `<style>` blocks — a static, deterministic check, not a rendered-pixel judgment call.

### Gaps Summary

None. All 8 derived truths (roadmap's 3 success criteria plus 5 plan-level must-haves covering matching semantics, mark rendering rules, spoiler safety, and the fallback edge case) verified against the actual codebase, not just SUMMARY.md claims. Environment note's caveat (concurrent Phase-15-dock-removal task landing in shared commits) was checked and confirmed cosmetic to Phase 18's own deliverables — all SONG-01/02/03 code is present, wired, and tested regardless of which commit hash it landed in.

---

_Verified: 2026-07-18T12:33:58Z_
_Verifier: Claude (gsd-verifier)_
