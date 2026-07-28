# Phase 37 REG-01 Coverage Matrix

**Phase:** 37-no-regression-gate, Plan 01
**Requirement:** REG-01 (existing behavior preserved, every new v2.3 surface covered by tests)
**Method:** enumerated the real test surface via `find . -path ./node_modules -prune -o -name "*.test.ts" -print` (127 files), spot-read each cited file below to confirm its assertions before citing it, and ran the full suite (`npx vitest run`) directly during this audit: 115 test files passed, 1611 tests passed, 0 failures. This mirrors v2.2's Phase 31 precedent (31-COVERAGE-MATRIX.md).

## Table A: Preserved behaviors (REG-01 success criteria 1 and 2)

| Behavior | Proving test file(s) | What it asserts |
|---|---|---|
| Drill grading is chroma/MIDI, never letter strings | `src/lib/drills/matchChord.test.ts` | `matchChord` grades by comparing played-chroma sets against target-chroma sets: order-agnostic, octave/duplicate-agnostic, and enharmonic-agnostic (a played C-sharp, chroma 1, matches a target spelled D-flat, chroma 1). No string comparison of note names anywhere in the assertions. |
| Drill grading is chroma/MIDI, never letter strings (inversion extension) | `src/lib/drills/matchInversion.test.ts` | `matchInversion` extends `matchChord` with a required bass chroma check (`bassCorrect`), and is itself enharmonic-blind: a bass entered via its sharp-spelling chroma grades identical to a flat-spelling target chroma. Confirms the chroma/MIDI invariant held through the Phase 35 inversion addition. |
| FSRS scheduling | `src/lib/srs/scheduler.test.ts`, `src/lib/srs/deck.test.ts`, `src/lib/srs/rotation.test.ts`, `src/lib/srs/session.test.ts` | `scheduler.test.ts` covers the FSRS rating/state-transition math; `deck.test.ts` covers CardRecord persistence and the formula-build mode seam; `rotation.test.ts` covers teach-cluster modes, cluster graduation, `selectReviewCards` weakness+cap selection, and `interleaveQueue` FSRS ordering; `session.test.ts` covers `buildQueue`/`advanceQueue`/`isSessionComplete`/`sessionRemaining`. None of these files changed shape or assertions across Phases 32-36. |
| Practice tiers | `src/lib/practice/tiers.test.ts` | The 6-tier table, tier blurbs, `itemsForTiers`, `tierForQuality`, `splitSymbol`, and the difficulty-ladder metadata all remain covered and green, unchanged by v2.3's new families. |
| Telemetry | `src/lib/practice/answerTelemetry.test.ts`, `src/lib/practice/practiceLog.test.ts` | `answerTelemetry.test.ts` covers `recordPracticeAnswer` (with and without telemetry fields), duration sanitization against the server schema bound, and the unknown/decided server-support probe. `practiceLog.test.ts` covers `readPracticeLog`, `appendPracticeAnswer`, `recentMisses`, and the daily-practice counters. Corroborated at the host boundary (see below) that synthetic (voicing/progression/inversion) completions never emit telemetry, only carded ones do. |
| Song-filter behavior | `src/lib/practice/songFilterPref.test.ts`, `src/lib/practice/songProvenance.test.ts` | `songFilterPref.test.ts` covers `readSongFilter`/`writeSongFilter` persistence. `songProvenance.test.ts` covers `normalizeSymbolForMatch`, `buildProvenanceIndex`, `songsForSymbol`, `symbolHasProvenance`, and `drillableSongSymbols`, the primitives the host composes into `applySongFilter`. |
| Multiple-choice-never-gates ear-naming rule | `src/lib/components/recallSession.test.ts` | The describe block `RecallSession Mode B (hear-name: hear the chord, pick its name, never gates)` exercises the ear-to-naming surface end to end and proves an incorrect multiple-choice pick never blocks progress to the next card, exactly the "never gates" invariant named in REG-01. |

### Host-level corroboration (cross-family end-state proofs)

| Corroborating file | What it adds beyond the unit-level rows above |
|---|---|
| `tests/practice-hub-mix.e2e.test.ts` | Describe blocks `song filter steers the merged queue (PRAC-04)` and `grade-commit split (REG-02)` render the real Practice host and prove the song filter restricts both the carded half and the voicing synthetics to the one provenance chord (progressions omitted entirely), and that an FSRS grade is committed only for the carded item, never for synthetic voicing/progression items. |
| `src/routes/practiceInversionsReg.test.ts` | The three `REG-01` describe blocks (six-family interleave with FSRS grade-commit and synthetic-telemetry silence; single-type-due gate unaffected by the inversion addition; song filter steering the carded half, voicing, and inversion identically) prove the whole REG-01 preserved-behavior set holds at the host boundary with the Phase 35 inversion family woven in, complementing (not replacing) the frozen-order case in `practiceQueue.test.ts`. |

## Table B: New v2.3 surfaces (REG-01 success criterion 3)

| Surface | Phase | Proving test file(s) |
|---|---|---|
| Chip grammar (tone chips + fill/outline gap chips) | Phase 32, SHAPE-01 | `src/lib/components/CountingChipRow.test.ts` (tone chips, gap chips, legend, unrecognized-chord safety, full role coverage on real non-tertian drill-pool chords, and the `rotateFromRole` helper reused by Phase 35's INV-02 hint ladder). |
| Voicing add/drop lean flow | Phase 33, VOICE-01 | `src/lib/components/shellVoicingDrill.test.ts` (describe `ShellVoicingDrill: lean nudge flow replaces the 3-way selector (VOICE-01)`, plus the surrounding stage/grading/step-tab describes that prove the from-memory recall grading and staged-by-card-state behavior are preserved), `src/lib/components/ShellVoicingDrill.embed.test.ts` (the embed seam). |
| Progression hint ladder + beginner keyboard | Phase 34, SCAF-01, SCAF-02 | `src/lib/components/progressionDrill.test.ts` (describes `beginner keyboard span from per-bar card maturity (SCAF-02)` and `escalating hint ladder (SCAF-01)`), `src/lib/components/hintLadder.test.ts` (the shared ladder component, including its French-locale copy), `src/lib/components/ProgressionDrill.embed.test.ts` (the embed seam), `src/lib/practice/scaffold.test.ts` and `src/lib/practice/scaffoldLevel.test.ts` (the underlying scaffold-stage and fade-level state machines the ladder reads). |
| Inversion drill family | Phase 35, INV-01, INV-02, INV-03 | `src/lib/practice/inversions.test.ts` (`inversionCountFor`, `bassRoleForIndex`, `bassNoteFor`, `inversionVoicing`), `src/lib/drills/matchInversion.test.ts` (chroma+bass grading), `src/lib/components/inversionDrill.test.ts` (symbol/prompt/passive strip, grading, hint-ladder fade by maturity), `src/lib/components/pianoKeyboard.bassHint.test.ts` (bass emphasis on the keyboard), `src/routes/practiceInversions.test.ts` (inversion family surfacing without an FSRS write, single-type-due gate for an interval-only due set), `src/routes/practiceInversionsReg.test.ts` (the REG-01 six-family host gate). |
| Cold-session queue ordering | Phase 36, QUEUE-01 | `src/lib/practice/practiceQueue.test.ts` (describe blocks `cold-session first-item ordering (QUEUE-01)` and `isLowMasterySession`), `src/routes/practiceColdOrdering.test.ts` (describes `QUEUE-01: /practice host computes and passes the low-mastery signal` and `QUEUE-01: a cold session never leads with a scaffold-heavy family`). |

## Audit conclusion

Every row in Table A and Table B is PRESENT. No genuine coverage gap was found: Phases 34, 35, and 36 each shipped comprehensive REG tests alongside their own surface tests, and Phases 32 and 33 shipped their own surface tests as they landed. No targeted gap-fill test was needed (no Task 1b).

No genuine behavior regression was found. As direct evidence beyond the citation review above, the full suite was run during this audit (`npx vitest run`) and passed completely: 115 test files, 1611 tests, 0 failures, matching the 37-CONTEXT baseline exactly. There is no "REG-01 DEFECT FOUND" heading in this document because none was surfaced; the capstone (Task 2) proceeds.
