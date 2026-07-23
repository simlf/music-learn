---
phase: quick-260722-2jy
plan: 01
subsystem: ui
tags: [svelte, tonal, i18n, chord-theory]

requires:
  - phase: quick-260718-iyj
    provides: inline (non-docked) lookup keyboard, current +page.svelte structure
provides:
  - "Drill it" ghost button on the lookup result card, seeding the resolved symbol into the one-shot drill queue and navigating to /drills
  - Slash-chord (inversion) support in spellChord: root-position spelling, bass field, and rejection of non-chord-tone basses
  - Bass-explanation line + Drill it hiding for slash-chord lookups
affects: [lookup, drills-seeding, theory-engine]

tech-stack:
  added: []
  patterns:
    - "Lookup-page drill handoff mirrors progress/+page.svelte's setDrillSeeds([symbol]) then goto('/drills') pattern"
    - "ROLE_ORDER lookup constant re-sorts tonal's bass-first slash-chord note order into canonical root-position order"

key-files:
  created:
    - src/routes/lookupDrillIt.test.ts
    - src/routes/lookupSlashChord.test.ts
  modified:
    - src/routes/+page.svelte
    - src/lib/theory/types.ts
    - src/lib/theory/chord.ts
    - src/lib/theory/chord.test.ts
    - src/lib/i18n/messages/home.ts

key-decisions:
  - "A non-chord-tone bass (e.g. C/D) is rejected via the existing unrecognized path, not accepted as a degraded slash chord: tonal only populates chord.root with the bass note for a genuine inversion (root === bass); a non-inversion slash yields root === '' alongside a negative bass interval that would corrupt the role-based re-sort. Guard: chord.bass non-empty AND chord.root empty. Verified against tonal 6.4.3: C/E root:\"E\", Cmaj7/G root:\"G\", G7/F root:\"F\", Am7/G root:\"G\" (all recognized); C/D root:\"\" (rejected)."
  - "Drill it is hidden whenever result.bass is set (rather than validating the symbol downstream), since consumeDrillSeeds performs no chord-symbol validation and the drill deck has no facts for slash chords."

patterns-established:
  - "Slash-chord bass/root-position re-sort: ROLE_ORDER (root=1..seventh=7) drives a stable Array.sort over the already interval-tagged notes array, reusable by any future feature needing canonical role ordering."

requirements-completed: [LOOKUP-DRILL-HANDOFF, LOOKUP-SLASH-CHORD]

coverage:
  - id: D1
    description: "Drill it ghost button on the lookup result seeds [result.symbol] via setDrillSeeds and navigates to /drills"
    requirement: "LOOKUP-DRILL-HANDOFF"
    verification:
      - kind: unit
        ref: "src/routes/lookupDrillIt.test.ts#seeds the resolved symbol and navigates to /drills"
        status: pass
    human_judgment: false
  - id: D2
    description: "home.action.drill-it i18n key exists in EN and FR"
    requirement: "LOOKUP-DRILL-HANDOFF"
    verification:
      - kind: unit
        ref: "src/lib/i18n/coverage.test.ts (full i18n coverage suite, EN+FR key parity)"
        status: pass
    human_judgment: false
  - id: D3
    description: "spellChord spells C/E, Cmaj7/G, G7/F, Am7/G in root-position role order with correct bass field"
    requirement: "LOOKUP-SLASH-CHORD"
    verification:
      - kind: unit
        ref: "src/lib/theory/chord.test.ts#slash chords (inversions)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A non-chord-tone bass (C/D) is rejected as unrecognized; a plain chord (Cm7) keeps bass undefined (no regression)"
    requirement: "LOOKUP-SLASH-CHORD"
    verification:
      - kind: unit
        ref: "src/lib/theory/chord.test.ts#C/D (non-chord-tone bass) is rejected as unrecognized; #Cm7 (no regression) has bass undefined"
        status: pass
    human_judgment: false
  - id: D5
    description: "Lookup renders a bass-explanation line for slash chords and hides Drill it (keeps Hear it); rejects C/D with no slash-explain line; plain chords show Drill it with no slash-explain line"
    requirement: "LOOKUP-SLASH-CHORD"
    verification:
      - kind: unit
        ref: "src/routes/lookupSlashChord.test.ts (all three tests)"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-07-22
status: complete
---

# Quick Task 260722-2jy: Lookup Drill-it Handoff + Slash-Chord Support Summary

**Chord lookup gains a one-tap "Drill it" handoff to /drills and root-position slash-chord (inversion) spelling with a bass explanation, both gated on tonal's genuine-inversion signal (chord.root === chord.bass).**

## Performance

- **Duration:** 25 min
- **Tasks:** 2
- **Files modified:** 7 (5 modified, 2 created)

## Accomplishments

- Added a ghost "Drill it" button beside "Hear it" on the lookup result card: seeds `[result.symbol]` via `setDrillSeeds` and navigates to `/drills`, mirroring the proven `progress/+page.svelte` handoff pattern.
- Extended `spellChord` to recognize slash-chord inversions (`C/E`, `Cmaj7/G`, `G7/F`, `Am7/G`): notes are re-sorted into root-position role order (root, third, fifth, seventh...) and a new `bass` field on `ChordResult` records the bass letter.
- Non-chord-tone bass symbols (e.g. `C/D`) are cleanly rejected via the existing unrecognized/did-you-mean path rather than rendering a mis-modeled note set.
- Lookup page renders one bass-explanation line ("The slash means E is the lowest note: play C with E at the bottom.") for slash chords and hides "Drill it" for them (no slash symbol can reach the drill deck), while "Hear it" stays available.
- Added `home.action.drill-it` and `home.slash.explain` i18n keys to both EN and FR dictionaries, no em dashes.

## Task Commits

1. **Task 1: "Drill it" handoff button on the lookup result card** - `0d67771` (feat)
2. **Task 2: Slash-chord (inversion) support with bass explanation** - `aa22944` (feat)

_Both tasks were single feat commits (behavior + tests + i18n added together per the plan's task grouping); no separate TDD RED/GREEN split was required since the plan's `tdd="true"` flag pairs test creation with implementation in one atomic commit._

## Files Created/Modified

- `src/routes/+page.svelte` - Drill it button (gated on `!result.bass`), `drillIt()` handler, `slashExplainLine()` helper, slash-explain paragraph
- `src/lib/theory/types.ts` - `ChordResult.bass?: string` field
- `src/lib/theory/chord.ts` - non-chord-tone-bass reject branch, `ROLE_ORDER` constant, root-position re-sort + `bass` field for genuine inversions
- `src/lib/theory/chord.test.ts` - "slash chords (inversions)" describe block (6 new tests)
- `src/lib/i18n/messages/home.ts` - `home.action.drill-it`, `home.slash.explain` (EN + FR)
- `src/routes/lookupDrillIt.test.ts` (new) - Drill it handoff test
- `src/routes/lookupSlashChord.test.ts` (new) - slash-chord lookup rendering tests (3 tests)

## Decisions Made

- **Non-chord-tone bass rejection (C/D):** documented verbatim from the plan. tonal fills `chord.root` with the bass note ONLY when the bass is a genuine chord tone (a true inversion, `root === bass`); a non-chord-tone slash yields `root === ''` alongside a negative bass interval (`-7m` for C/D) that would collapse to `roleForDegree`'s DoS-safe `'root'` fallback and collide with the actual root, corrupting the re-sort. The guard `chord.bass !== '' && chord.root === ''` cleanly routes C/D through the existing did-you-mean/hint path. Verified directly against tonal 6.4.3 via a scratch script: C/E root:"E", Cmaj7/G root:"G", G7/F root:"F", Am7/G root:"G" (all recognized, root === bass); C/D root:"" (rejected).
- **Drill it hidden at the source, not validated downstream:** `consumeDrillSeeds` performs no chord-symbol validation (only filters non-strings), and the drill deck's `generateQuestion`/`matchChord` expect root-position symbols with no slash-chord facts. Hiding the button whenever `result.bass` is set is the robust guard (matches the plan's T-2jy-02 threat mitigation).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Lookup page now offers a full loop from "look up a chord" to "drill it," and correctly decodes slash inversions found in real sheet music (the project's core value: chord symbol fluency).
- No blockers. Both features are additive to existing lookup/theory-engine code paths; no downstream consumer of `ChordResult` needed changes since `bass` is optional.

---
*Phase: quick-260722-2jy*
*Completed: 2026-07-22*

## Self-Check: PASSED

- FOUND: src/routes/lookupDrillIt.test.ts
- FOUND: src/routes/lookupSlashChord.test.ts
- FOUND: .planning/quick/260722-2jy-lookup-upgrades-drill-it-handoff-button-/260722-2jy-SUMMARY.md
- FOUND commit: 0d67771 (feat: Drill it handoff button)
- FOUND commit: aa22944 (feat: slash-chord inversion support)
