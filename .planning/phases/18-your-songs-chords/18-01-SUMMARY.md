---
phase: 18-your-songs-chords
plan: 01
subsystem: ui
tags: [svelte, tonal, provenance, testing-library]

# Dependency graph
requires: []
provides:
  - "songProvenance.ts: normalizeSymbolForMatch/buildProvenanceIndex/songsForSymbol/symbolHasProvenance/drillableSongSymbols"
  - "SongMark.svelte: shared read-only song-provenance tag component (props: { songs: string[] })"
  - "SongFilterToggle.svelte: shared From-my-songs filter-bar control (props: { poolLabel, on, onToggle, note? })"
affects: [18-02-drills-song-filter, 18-03-recall-song-filter, 18-04-lookup-song-mark]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Chord-identity provenance key: `${rootPitchClass}:${qualityName}` built from spellChord's root/quality plus tonal's Note.get(...).chroma, collapsing both alias spellings (Cm7/C-7/Cmin7) and enharmonic roots (F#/Gb) into one Map key"
    - "SongMark/SongHook conditional-render convention: render nothing rather than an empty tag"

key-files:
  created:
    - src/lib/practice/songProvenance.ts
    - src/lib/practice/songProvenance.test.ts
    - src/lib/components/SongMark.svelte
    - src/lib/components/songMark.test.ts
    - src/lib/components/SongFilterToggle.svelte
    - src/lib/components/songFilterToggle.test.ts
  modified: []

key-decisions:
  - "normalizeSymbolForMatch keys on root pitch-class (via tonal's Note.get(...).chroma) + spellChord's human-readable quality name, not spellChord's echoed `symbol` field - tonal's Chord.get(...).symbol merely echoes back the input's own alias spelling (Cm7 stays 'Cm7', C-7 stays 'C-7'), so using it directly would NOT have collapsed aliases as the plan's behavior spec required"

patterns-established:
  - "Provenance identity: root-pitch-class + quality-name composite key for any future chord-identity comparison that must be alias/enharmonic-aware"

requirements-completed: [SONG-01, SONG-02, SONG-03]

coverage:
  - id: D1
    description: "songProvenance.ts derives a symbol->song-names provenance index from active songs only, matching enharmonic/alias spellings (Cm7=C-7=Cmin7, F#o7=Gbo7) via a root-pitch-class + quality-name key, never raw string equality"
    requirement: "SONG-03"
    verification:
      - kind: unit
        ref: "src/lib/practice/songProvenance.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "SongMark renders nothing for an empty songs array, a single-border '♪ NAME' tag for one song, and a double-border 'N SONGS' tag for two or more, with song names escaped as literal text (no @html)"
    requirement: "SONG-01"
    verification:
      - kind: unit
        ref: "src/lib/components/songMark.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "SongFilterToggle renders a real button[aria-pressed] From-my-songs control whose pressed state flips the vermilion accent fill, with a mono pool label and optional note"
    requirement: "SONG-02"
    verification:
      - kind: unit
        ref: "src/lib/components/songFilterToggle.test.ts"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-07-18
status: complete
---

# Phase 18 Plan 01: Shared Song-Provenance Primitives Summary

**Pure enharmonic-aware `songProvenance.ts` derivation module plus the two shared Svelte primitives (`SongMark`, `SongFilterToggle`) every Phase 18 surface plan will import, all built and tested in isolation with zero page/route coupling.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-07-18T13:34:38+02:00
- **Completed:** 2026-07-18T13:38:26+02:00
- **Tasks:** 3
- **Files modified:** 6 (all created)

## Accomplishments
- `songProvenance.ts`: a pure, storage-free module deriving `symbol -> song names` provenance from `songs.ts`'s `listSongs()`/`activeSongChordSymbols()`, with enharmonic/alias-aware matching (Cm7 = C-7 = Cmin7; F♯ø7 = G♭ø7) and active-songs-only filtering
- `SongMark.svelte`: the single shared read-only provenance tag - nothing / `♪ NAME` / double-border `N SONGS` - rendered via auto-escaped Svelte text interpolation (no `{@html}`)
- `SongFilterToggle.svelte`: the single shared `From my songs` filter-bar control with an accessible `aria-pressed` button, a mono pool label, and an optional note line

## Task Commits

Each task was committed atomically:

1. **Task 1: Pure provenance module (songProvenance.ts)** - `613ef11` (feat)
2. **Task 2: SongMark shared provenance tag (SongMark.svelte)** - `9e2b62f` (feat)
3. **Task 3: SongFilterToggle filter bar (SongFilterToggle.svelte)** - `79921f9` (feat)

_Note: all three tasks used `tdd="true"`; tests were authored alongside the implementation and are committed together with it (test file + implementation in one commit per task, as the plan's `<files>` list specifies both together per task rather than a separate RED/GREEN commit pair)._

## Files Created/Modified
- `src/lib/practice/songProvenance.ts` - pure symbol->song-names provenance derivation (5 exported functions)
- `src/lib/practice/songProvenance.test.ts` - 14 tests covering normalization, index building, lookups, and empty-store tolerance
- `src/lib/components/SongMark.svelte` - shared read-only provenance tag
- `src/lib/components/songMark.test.ts` - 4 tests covering the render-nothing/single/multi/escaping behaviors
- `src/lib/components/SongFilterToggle.svelte` - shared filter-bar control
- `src/lib/components/songFilterToggle.test.ts` - 5 tests covering pressed state, click callback, labels, and note rendering

## Decisions Made

- **Provenance matching key is root-pitch-class + quality-name, not spellChord's `symbol` field.** The plan's action text suggested using "spellChord's canonical symbol" as the match key, but investigation during Task 1 (three tests failing on first run) showed `tonal`'s `Chord.get(...).symbol` simply echoes back whichever alias spelling was passed in (`Chord.get('C-7').symbol === 'C-7'`, `Chord.get('Cm7').symbol === 'Cm7'` - both parse to the same chord but the `symbol` field does not converge). The fix: build the match key from `spellChord`'s already-parsed `root` (converted to ASCII, then passed through `tonal`'s `Note.get(...).chroma` for pitch-class identity, collapsing F♯/G♭) combined with `spellChord`'s `quality` (a human-readable type name like `"minor seventh"` that IS consistent across `m7`/`min7`/`mi7`/`-7` aliases, per direct `tonal` `Chord.get` verification). This is a Rule 1 auto-fix (the described behavior didn't work as intended) discovered and resolved during Task 1's own TDD RED/GREEN cycle, not a deviation from a working implementation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] normalizeSymbolForMatch's key changed from spellChord's `symbol` field to a root-pitch-class + quality-name composite**
- **Found during:** Task 1 (Pure provenance module), first test run
- **Issue:** Using `spellChord(symbol).symbol` directly (as literally described in the plan's action text) does not collapse aliases: `tonal`'s `Chord.get('Cm7').symbol === 'Cm7'` while `Chord.get('C-7').symbol === 'C-7'` - two different strings for the same chord, so the Cm7/C-7/Cmin7 collapse test (and the enharmonic F♯ø7/G♭ø7 test, and two downstream lookup tests) failed immediately.
- **Fix:** Verified via direct `node -e` probes against `tonal`'s `Chord` and `Note` exports that `chord.type` (e.g. `"minor seventh"`) IS alias-invariant and `Note.get(asciiRoot).chroma` IS enharmonic-invariant (F♯ and G♭ both resolve to pitch-class `6`). Rewrote `normalizeSymbolForMatch` to return `` `${rootChroma}:${quality}` `` instead.
- **Files modified:** `src/lib/practice/songProvenance.ts`
- **Verification:** All 14 `songProvenance.test.ts` cases pass, including the exact Cm7/C-7/Cmin7 and F♯ø7/G♭ø7 collapse assertions specified in the plan's `<behavior>` block.
- **Committed in:** `613ef11` (Task 1 commit - the fix landed before the task was ever committed, so no separate fix commit was needed)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for SONG-03 correctness (the whole point of the module is alias/enharmonic collapsing); no scope creep, no architecture change - same module, same exported function signatures, same public contract.

## Issues Encountered
None beyond the Task 1 auto-fix documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness

All three shared primitives are built, tested (23 tests, all green), type-checked (`npm run check`: 0 errors), and committed. The full project test suite (1060 tests across 78 files) passes with no regressions.

Ready for Plans 02 (Drills), 03 (Recall), and 04 (Lookup) to import:
- `import { buildProvenanceIndex, songsForSymbol, symbolHasProvenance, drillableSongSymbols, normalizeSymbolForMatch } from '$lib/practice/songProvenance'`
- `import SongMark from '$lib/components/SongMark.svelte'`
- `import SongFilterToggle from '$lib/components/SongFilterToggle.svelte'`

No blockers. The Pattern Map's per-surface integration snippets (poolContext filtering, RecallSession queue filtering, localStorage-backed toggle state) remain accurate against the actual shipped `SongFilterToggle` props (`poolLabel`, `on`, `onToggle`, `note?`) - Plan 02/03 route code should call `SongFilterToggle` with those prop names, not the raw inline `<button>` markup sketched in `18-PATTERNS.md`'s route-level snippets (those snippets predate this plan's component build and describe the pre-extraction shape).

---
*Phase: 18-your-songs-chords*
*Completed: 2026-07-18*
