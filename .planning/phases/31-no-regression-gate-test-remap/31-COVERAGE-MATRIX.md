# Phase 31 Plan 01: REG-02 Coverage Matrix

Audits the REG-02 acceptance list (REQUIREMENTS.md REG-02, and the design's
Testing strategy section in
`docs/superpowers/specs/2026-07-24-hub-consolidation-design.md`) item by item
against the test suite that shipped across Phases 26-30, plus this plan's new
capstone. Every item below is either COVERED (an existing assertion already
proves it, cited exactly) or GAP-FILLED (a focused assertion was added this
plan). No item is left orphaned or silently assumed.

## Matrix

| REG-02 item | Owning test file(s) | Specific assertion / describe block | Status |
|---|---|---|---|
| Per-route tests remapped: `/drills`, `/build`, `/voicings`, `/progressions` absorbed by `/practice` | `tests/practice-hub.e2e.test.ts`, `tests/practice-hub-mix.e2e.test.ts`, `src/routes/practiceSeedHandoff.test.ts`, `src/routes/practiceScalePractice.test.ts` | `practice-hub.e2e.test.ts` describes `pre-start landing (PRAC-01)`, `carded grade commit (PRAC-03/REG-01/T-27-04-01)`, `mixed carded families`; `practice-hub-mix.e2e.test.ts` describes `five-family interleaving`, `single-type-due gate`, `song filter steers the merged queue`, `grade-commit split`; `practiceSeedHandoff.test.ts` describes `practice seed handoff (REG-01)`; `practiceScalePractice.test.ts` describes `/practice: Scale practice disclosure reachability (LEARN-02)` | COVERED |
| Per-route tests remapped: `/scales`, `/theory` absorbed by `/learn` | `src/routes/learn.test.ts` | `/learn: hub structure and section presence` - renders `learn-theory` (Theory), `learn-explore` (Scale Explore, exploreOnly) | COVERED |
| Per-route tests remapped: `/recall`, `/songs` absorbed by `/progress` | `tests/progress-hub.e2e.test.ts` | `Progress hub tab switch`, `Switching to Recall`, `Switching to Songs`, `Song-filter write contract (PROG-01)`, `Review-dock gating (CRITICAL coupling)` | COVERED |
| Nav remap: 10 flat links collapse to 4 hubs, phone "More" sheet removed | `tests/masthead.e2e.test.ts` | `masthead responsive nav (30-01, HUB-01)` (desktop 4 hrefs), `bottom tab bar (30-01, HUB-01: 4 hubs, no More button)` (`queryByRole('button', { name: 'More' })` absent) | COVERED |
| Merged Practice queue interleaving (PRAC-02): all 5 families in one session, no family 3-in-a-row | `tests/practice-hub-mix.e2e.test.ts`, `src/lib/practice/practiceQueue.test.ts` | `five-family interleaving (PRAC-02)` describe: `expect(new Set(familiesSeen)).toEqual(new Set(['NAME IT', 'BUILD IT', 'INTERVAL', 'VOICING', 'PROGRESSION']))` plus the 3-in-a-row loop assertion; `composePracticeQueue` describe: `never runs a single family 3-in-a-row when 2+ families are present` | COVERED |
| Interval FAMILY drill present in the merged Practice mix, distinct from the IntervalView presentation component (thin spot 1) | `tests/practice-hub-mix.e2e.test.ts` | `five-family interleaving (PRAC-02)`: `familiesSeen` set includes `'INTERVAL'`; the loop drives `practice-interval-drill` (via `currentFamilyTestId()`) through `completeInterval(short)`, which clicks a real `Answer: {short}` choice on the mounted `PracticeIntervalDrill` component, not a stub | COVERED |
| Single-type-due quality gate (PRAC-05): an interval-only due set yields an intervals-only session, no synthetic ever attempted (thin spot 2) | `tests/practice-hub-mix.e2e.test.ts`, `src/lib/practice/practiceQueue.test.ts` | `single-type-due gate (PRAC-05)` describe: `question-source-tag` stays `'INTERVAL'` for all 3 items, `practice-chord-drill`/`build-session`/`shell-voicing-drill`/`progression-drill` are asserted absent every iteration, and `expect(syntheticProgressionItemsMock).not.toHaveBeenCalled()` proves no synthetic family is ever attempted; `composePracticeQueue` describe: `terminates and passes through unchanged for a single-family (worst-case infeasible) input (PRAC-05)` | COVERED |
| Song filter steers the merged queue (PRAC-04) | `tests/practice-hub-mix.e2e.test.ts` | `song filter steers the merged queue (PRAC-04)` describe: restricts the carded half and the voicing synthetic to the one provenance chord, omits progressions entirely under the filter | COVERED |
| Grade-commit split: carded items commit an FSRS grade, synthetic (voicing/progression) items never do | `tests/practice-hub-mix.e2e.test.ts` | `grade-commit split (REG-02)` describe: `expect(recordGradeMock).toHaveBeenCalledTimes(1)` after driving one carded + one voicing + one progression item, with the single call matching the carded item's own card | COVERED |
| IntervalView: stacked vs formula per chord quality (IVW-01/IVW-02) | `src/lib/components/intervalView.test.ts`, `src/lib/lookup/chordPresentation.test.ts` | `IntervalView default (stacked-thirds) render (IVW-01)` and `IntervalView formula toggle (IVW-02)` describes (component-level, Cm7 fixture); `stackedThirdsFor` describe in `chordPresentation.test.ts` covers gap sequences per quality: Cm7, Cmaj7, C7 (dominant), Cm7b5 (half-dim), Cdim7 (fully dim), Cm (triad), Cmaj9 (extended) | COVERED |
| IntervalView: accidental carry-through (e.g. E♭ -> Mi♭) (IVW-03) | `src/lib/components/intervalView.test.ts`, `src/lib/lookup/chordPresentation.test.ts` | `IntervalView dual naming + accidental carry-through (IVW-03)`: asserts `E♭`/`Mi♭` render in both stacked and formula views; `stackedThirdsFor`: `carries the E♭ third solfege "Mi♭" and B♭ seventh solfege "Si♭" through for Cm7 (IVW-03)` | COVERED |
| Redirect shim per old route, asserting a 308 to the correct hub (HUB-03), all 8 routes | `src/routes/redirectShims.test.ts` | One `it` per route: `/drills`, `/build`, `/voicings`, `/progressions` -> `/practice`; `/scales`, `/theory` -> `/learn`; `/recall`, `/songs` -> `/progress`, each asserting `status === 308` and the exact `location` | COVERED |
| Cross-hub capstone: consolidated topology (4 hubs, no More, 8 redirects) and one representative flow per hub survive together (REG-01) | `tests/hub-consolidation.e2e.test.ts` (new, this plan) | `Topology`, `Redirects`, `Lookup`, `Practice`, `Learn`, `Progress` describe blocks - see file header comment for the exact scope boundary against the per-phase suites above | GAP-FILLED |
| Full suite + `svelte-check` stay green | (verified by Phase 31 Plan 02, the milestone's final gate) | `npm run build && npm test && npm run check` | Deferred to 31-02 (out of this plan's own verify scope; this plan's own verify command runs only the suites it touches) |

## Audit outcome

- No REG-02 acceptance item was found orphaned (missing a test) or duplicated
  without reason. Every item above traces to at least one existing test file
  from Phases 26-30, plus the new capstone this plan adds.
- Both thin spots the 31-CONTEXT flagged (interval-family presence in the
  merged mix, and a single-type-due assertion that genuinely gates variety
  injection) were already present and passing in
  `tests/practice-hub-mix.e2e.test.ts` before this plan ran; no new assertion
  was required for either, and both are marked COVERED (not GAP-FILLED) since
  no code change was needed. This plan's audit re-ran both suites
  (`tests/practice-hub-mix.e2e.test.ts`, `src/lib/components/intervalView.test.ts`,
  `src/lib/lookup/chordPresentation.test.ts`, `src/routes/redirectShims.test.ts`)
  to confirm they cite real, currently-passing assertions rather than
  historical/rotted ones - all 55 tests across the 4 files pass.
- No production source was touched: the audit surfaced no genuine behavior
  regression, so there is no blocker to record.
- The one GAP-FILLED row is `tests/hub-consolidation.e2e.test.ts` itself,
  the REG-01 capstone this plan's Task 2 adds (no prior test proved the
  4-hub topology and all 8 redirects and one flow per hub together in a
  single cross-hub assertion).
