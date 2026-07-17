---
phase: 17-chord-explainer
plan: 02
subsystem: ui
tags: [svelte, svelte-5-runes, chord-theory, hint-ladder, recall]

requires:
  - phase: 17-chord-explainer plan 01
    provides: familyLineFor(qualitySuffix) in src/lib/copy/mnemonics.ts, formulaSentence(chord) in src/lib/lookup/chordPresentation.ts
provides:
  - HintLadder.svelte, a self-contained, cumulative "Need a hint?" component adaptive to a 4-item or 3-item layers[] array
  - Component test (hintLadder.test.ts) proving the cumulative reveal, both ladder shapes, and the closing line
affects: [17-chord-explainer plan 03, 17-chord-explainer plan 04]

tech-stack:
  added: []
  patterns:
    - "Component owns its own derivation from a bare `symbol` string (RevealInsight precedent) rather than the host pre-computing chord data"
    - "Cumulative reveal ladder via a single `shownDepth` counter and an array slice, not per-layer boolean flags"

key-files:
  created:
    - src/lib/components/HintLadder.svelte
    - src/lib/components/hintLadder.test.ts
  modified: []

key-decisions:
  - "qualitySuffix is derived exactly like RevealInsight's (ASCII-root slice of chord.symbol), then reused directly as ChordGlyph's `quality` prop too — same value already used by every other ChordGlyph call site (`chord.symbol.slice(chord.root.length)`), so no second derivation path was needed for Layer 4's glyph."
  - "Added a `data-testid=\"hint-note-boxes\"` wrapper around Layer 4's note-box row (not specified in the plan) purely as a test seam — Cdim's root note letter \"C\" collides with ChordGlyph's own \"C\" text node, so tests needed a scoped container to disambiguate."

requirements-completed: [HINT-01, HINT-03]

coverage:
  - id: D1
    description: "HintLadder renders nothing for an unrecognized chord symbol (no partial/broken ladder)"
    requirement: HINT-01
    verification:
      - kind: unit
        ref: "src/lib/components/hintLadder.test.ts#renders nothing for an unrecognized symbol"
        status: pass
    human_judgment: false
  - id: D2
    description: "4-item ladder reveals family -> formula -> keyboard -> spelling cumulatively, with the exact UI-SPEC control and tier label tables at every depth"
    requirement: HINT-01
    verification:
      - kind: unit
        ref: "src/lib/components/hintLadder.test.ts#4-item ladder: reveals family -> formula -> keyboard -> spelling cumulatively, with the exact control and tier labels"
        status: pass
    human_judgment: false
  - id: D3
    description: "Seventh-chord fixture (Cm7) generates the correct formula sentence and IntervalScaffold entries (R/m3/P5/m7)"
    requirement: HINT-03
    verification:
      - kind: unit
        ref: "src/lib/components/hintLadder.test.ts#Cm7 (seventh chord): formula sentence includes the seventh, IntervalScaffold shows R/m3/P5/m7"
        status: pass
    human_judgment: false
  - id: D4
    description: "3-item ladder (formula-build mode, formula chip omitted) renumbers tier/control labels sequentially and never renders an interval-scaffold"
    requirement: HINT-01
    verification:
      - kind: unit
        ref: "src/lib/components/hintLadder.test.ts#3-item ladder (formula omitted): tier labels and control labels renumber sequentially, never showing an interval-scaffold"
        status: pass
    human_judgment: false
  - id: D5
    description: "At max depth the control disappears and the closing line \"That's the whole chord.\" replaces it"
    requirement: HINT-01
    verification:
      - kind: unit
        ref: "src/lib/components/hintLadder.test.ts (asserted inline in the 4-item and 3-item test cases above)"
        status: pass
    human_judgment: false
  - id: D6
    description: "onOpen fires exactly once, on the shownDepth 0->1 transition"
    verification:
      - kind: unit
        ref: "src/lib/components/hintLadder.test.ts#onOpen fires exactly once, on the 0->1 transition"
        status: pass
    human_judgment: false
  - id: D7
    description: "HintLadder never imports from $lib/srs or calls recordGrade/advanceQueue (D-04)"
    verification:
      - kind: other
        ref: "grep for '$lib/srs' and 'recordGrade'/'advanceQueue' against src/lib/components/HintLadder.svelte returns no import matches (manual inspection during execution)"
        status: pass
    human_judgment: false

duration: 45min
completed: 2026-07-17
status: complete
---

# Phase 17 Plan 02: HintLadder Component Summary

**Self-contained, cumulative "Need a hint?" ladder component composed entirely from existing pieces (ChordGlyph, IntervalScaffold, PianoKeyboard, NoteLabel, SongHook, Button), adaptive to both the 4-item and 3-item layer arrays, tested standalone ahead of RecallSession wiring.**

## Performance

- **Duration:** 45 min
- **Started:** 2026-07-17T18:33:00Z (approx.)
- **Completed:** 2026-07-17T19:18:19Z
- **Tasks:** 2 completed (folded into one RED/GREEN TDD cycle)
- **Files modified:** 2 (both created)

## Accomplishments

- Built `HintLadder.svelte`: a stateless-across-cards, self-contained component that owns all its own derivation (`spellChord`, `formulaFor`, `formulaSentence`, `mnemonicFor`/`familyLineFor`) from a bare `symbol` string, mirroring `RevealInsight`'s "component owns derivation" convention.
- Implemented the cumulative reveal model (D-01): a single `shownDepth` counter drives an array slice of `layers`, so each tap appends exactly one new layer below the ones already shown; nothing already revealed is ever hidden.
- Wired the control-label and tier-label tables exactly per the UI-SPEC, for both the 4-item ladder (`family`/`formula`/`keyboard`/`spelling`) and the 3-item ladder (`formula` omitted, tiers renumbered sequentially, never "Hint 1, 3, 4").
- Implemented Layer 4's "dossier" fold-in (D-06): a static `ChordGlyph`, one interval-colored note box per chord tone (reusing `RecallSession`'s scale-degree box markup verbatim), and a `SongHook` for the chord's third.
- Wrote `hintLadder.test.ts` covering all 7 acceptance scenarios from the plan: unrecognized-symbol guard, depth-0 control-only state, full 4-item cumulative reveal with exact label assertions, a seventh-chord fixture (Cm7) formula check, the 3-item ladder's renumbering, the closing line at max depth, and the `onOpen` single-fire contract.
- Verified via a genuine RED/GREEN cycle: temporarily removed `HintLadder.svelte`, confirmed the test suite fails to even resolve the import, restored the component, and confirmed all tests pass.

## Task Commits

Each task was committed atomically as a TDD RED/GREEN pair (Task 1 was `tdd="true"`; Task 2's test file was authored as Task 1's RED step, since the plan's `<verify>` for Task 1 already targeted the full test file):

1. **Task 1 (RED): failing tests for HintLadder** - `ccfe6fe` (test)
2. **Task 1 (GREEN) + Task 2: implement HintLadder.svelte** - `4d36993` (feat)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP update, per orchestrator).

_Note: Task 1 (tdd=true) and Task 2 (the test file) were executed as a single RED -> GREEN cycle since Task 1's own `<verify>` already targeted the complete `hintLadder.test.ts` file described in Task 2's action; no separate third commit was needed since Task 2 introduced no additional file changes beyond what RED already delivered._

## Files Created/Modified

- `src/lib/components/HintLadder.svelte` - the cumulative, adaptive hint ladder: props `{ symbol, layers, onOpen }`, owns `shownDepth` state, renders nothing for unrecognized symbols.
- `src/lib/components/hintLadder.test.ts` - standalone component test (7 scenarios: unrecognized symbol, depth-0, 4-item cumulative reveal, Cm7 seventh-chord fixture, 3-item ladder, closing line, onOpen single-fire).

## Decisions Made

- **qualitySuffix reused for both copy lookup and ChordGlyph display.** The plan called for deriving `qualitySuffix` exactly as `RevealInsight` does (ASCII-root slice of `chord.symbol`) for the `mnemonicFor`/`familyLineFor` lookup. That same ASCII suffix numerically equals what every other `ChordGlyph` call site in the codebase already passes as `quality` (`chord.symbol.slice(chord.root.length)`), so Layer 4's `<ChordGlyph root={chord.root} quality={qualitySuffix} />` reuses the one derived value rather than introducing a second slice.
- **Added `data-testid="hint-note-boxes"`** around Layer 4's note-box row. Not specified in the plan's markup contract, but needed as a test seam: querying `getByText('C')` inside the whole Layer 4 block was ambiguous because Cdim's root note letter "C" and `ChordGlyph`'s rendered root text "C" both match. Scoping test queries to this wrapper resolves the collision without changing the rendered DOM structure the plan specified (the wrapper only adds a `data-testid` attribute, no new element).

## Deviations from Plan

None beyond the two decisions above, both minor test/derivation-reuse choices within the plan's own stated conventions (RevealInsight precedent, existing ChordGlyph call-site convention). No architectural changes, no scope additions.

## Issues Encountered

- First test run failed on the Layer-4 note-box assertion (`getByText('C')` matched multiple elements: the note box's "C" and `ChordGlyph`'s own "C" root text). Fixed by adding the `hint-note-boxes` test-scoping wrapper described above; re-ran and confirmed the fix without touching component behavior.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`HintLadder.svelte` is fully self-contained and ready for host wiring. Its prop contract and data-testids for the wiring plans (03/04):

- **Props:** `symbol: string` (the fact's chord symbol), `layers: ('family' | 'formula' | 'keyboard' | 'spelling')[]` (4-item for `see-play`/`hear-name`, 3-item with `'formula'` omitted for `formula-build`), `onOpen?: () => void` (fires once on the 0->1 transition; the host uses it to cancel `hear-name`'s auto-advance timer).
- **Data-testids:** `hint-ladder` (root wrapper, absent when `spellChord(symbol).recognized` is false), `hint-cta` (the control wrapper, present while `shownDepth < layers.length`), `hint-layer` with `data-layer={kind}` (one per revealed layer, in DOM order), `hint-closing-line` (replaces `hint-cta` at max depth), `hint-note-boxes` (Layer 4's note-box row, test-only seam).
- **Reset contract:** the component does NOT reset `shownDepth` internally on `symbol` change - the host MUST wrap the mount in a `{#key cardKey(...)}` block per card (same pattern already used for `BuildSession`), per the plan's `key_links`.
- No changes were made to `RecallSession.svelte` in this plan; that wiring (mode-conditional mount, `hearNameAdvanceTimer` cancellation, the `Continue` fallback button) is deferred to Plan 03/04 as scoped.

---
*Phase: 17-chord-explainer*
*Completed: 2026-07-17*

## Self-Check: PASSED

- FOUND: src/lib/components/HintLadder.svelte
- FOUND: src/lib/components/hintLadder.test.ts
- FOUND: .planning/phases/17-chord-explainer/17-02-SUMMARY.md
- FOUND commit: ccfe6fe
- FOUND commit: 4d36993
