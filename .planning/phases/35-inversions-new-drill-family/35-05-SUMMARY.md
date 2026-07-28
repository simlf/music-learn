---
phase: 35-inversions-new-drill-family
plan: 05
subsystem: ui
tags: [svelte, i18n, fsrs, piano-keyboard, hint-ladder, inversions]

requires:
  - phase: 35-inversions-new-drill-family (plans 01-03)
    provides: "pure inversions.ts engine + matchInversion grading (35-01), bassHint PianoKeyboard prop + CountingChipRow rotateFromRole (35-02), inversions.* i18n domain (35-03)"
provides:
  - "InversionDrill.svelte: Practice-hub-embedded component drilling one named inversion at a time (symbol shown, chroma+bass grading, fixed role colors, bass ring emphasis)"
  - "Inline escalating hint ladder (bass -> stack -> ghost) fading by the drilled chord's FSRS maturity via voicingStageForChord"
affects: [35-06 (Practice hub integration)]

tech-stack:
  added: []
  patterns:
    - "One-shot untrack() init read of symbol/inversionIndex/bassRole/bassNote/bassChroma per queue item (mirrors PracticeChordDrill/ProgressionDrill)"
    - "pressedOctaveByLetter Map fed by PianoKeyboard's existing onPress(letter, octave), used only at Check time to derive the lowest-pitched selected letter as the played bass"
    - "Inline hint ladder mirrored verbatim from ProgressionDrill's shape (not an extension of shared HintLadder.svelte) - same rationale as Phase 34"

key-files:
  created:
    - src/lib/components/InversionDrill.svelte
    - src/lib/components/inversionDrill.test.ts
  modified: []

key-decisions:
  - "onComplete is () => void, not (correct: boolean) => void: a wrong play always retries and never completes, so every completion is correct - supersedes 35-UI-SPEC's PracticeChordDrill-mirrored signature per the plan's explicit override, matching ProgressionDrill/ShellVoicingDrill's own onComplete shape."
  - "octaves forced to 2 (not left unset/self-measuring): the bass must be able to sit below the stack, which a single octave cannot represent. Flagged for on-device visual UAT (2-octave tap targets on phone width)."
  - "Tasks 1 and 2 (base grading UI, then the hint ladder) shipped as a single commit: both touch the same new file inseparably (the ladder wires directly into ghostRevealed/ghostKeysForInversion state introduced in Task 1's keyboard markup)."

patterns-established:
  - "Synthetic-family maturity read: filter getAllCards() to chord-formula:{symbol}, feed voicingStageForChord - no dedicated card kind per family, reused verbatim from ProgressionDrill/ShellVoicingDrill."

requirements-completed: [INV-01, INV-02]

coverage:
  - id: D1
    description: "InversionDrill renders the chord symbol (ChordGlyph), names the target inversion + bass role in the prompt, and shows a passive read-only N-cell inversion-rotation strip (target cell vermilion, cells non-interactive)"
    requirement: "INV-01"
    verification:
      - kind: unit
        ref: "src/lib/components/inversionDrill.test.ts#InversionDrill: symbol, prompt, passive strip > renders the symbol glyph, the inversion prompt, and a passive 4-cell strip with the target cell marked and non-interactive"
        status: pass
    human_judgment: false
  - id: D2
    description: "Grades a played voicing by chroma set + required bass via matchInversion: correct voicing reveals + Next fires onComplete once; wrong notes and right-notes/wrong-bass each show a distinct retry line and never gate"
    requirement: "INV-01"
    verification:
      - kind: unit
        ref: "src/lib/components/inversionDrill.test.ts#InversionDrill: grading (chroma + bass) > a correct voicing (bass lowest) reaches the reveal line, and Next fires onComplete exactly once"
        status: pass
      - kind: unit
        ref: "src/lib/components/inversionDrill.test.ts#InversionDrill: grading (chroma + bass) > right notes but the wrong bass shows the distinguishing retry line and does not complete"
        status: pass
      - kind: unit
        ref: "src/lib/components/inversionDrill.test.ts#InversionDrill: grading (chroma + bass) > wrong notes shows the generic wrong-notes retry line (distinct from the wrong-bass line) and does not complete"
        status: pass
    human_judgment: false
  - id: D3
    description: "Keyboard renders 2 octaves with bassHint (ink ring + B badge) on the bass key, role colors fixed across inversions"
    requirement: "INV-01"
    verification:
      - kind: unit
        ref: "src/lib/components/inversionDrill.test.ts (bassHint/2-octave rendering exercised implicitly by the octave-specific pressKeyAtOctave grading tests, which rely on a rendered second-octave duplicate key)"
        status: pass
    human_judgment: true
    rationale: "The bass ring/B badge visual legibility and 2-octave tap-target sizing on a real phone-width viewport is a visual/UX judgment call, not something a jsdom unit test can confirm - explicitly flagged for on-device UAT per the plan's own verification section."
  - id: D4
    description: "Escalating hint ladder (bass -> stack -> ghost) fades by the drilled chord's FSRS maturity: meet offers all 3 rungs, subtract drops bass, drill offers none; a wrong Check never collapses revealed rungs"
    requirement: "INV-02"
    verification:
      - kind: unit
        ref: "src/lib/components/inversionDrill.test.ts#InversionDrill: hint ladder fades by maturity (INV-02) > an empty deck (meet stage) offers all 3 rungs; revealing stack shows a rotated CountingChipRow, revealing ghost lights ghost keys on the keyboard"
        status: pass
      - kind: unit
        ref: "src/lib/components/inversionDrill.test.ts#InversionDrill: hint ladder fades by maturity (INV-02) > a subtract-stage card offers only 2 rungs (stack, ghost) - the bass rung is dropped"
        status: pass
      - kind: unit
        ref: "src/lib/components/inversionDrill.test.ts#InversionDrill: hint ladder fades by maturity (INV-02) > a drill-stage card (State.Review) renders no hint ladder at all"
        status: pass
      - kind: unit
        ref: "src/lib/components/inversionDrill.test.ts#InversionDrill: hint ladder fades by maturity (INV-02) > a wrong Check does not collapse an already-revealed rung"
        status: pass
    human_judgment: false

duration: 45min
completed: 2026-07-27
status: complete
---

# Phase 35 Plan 05: InversionDrill Component Summary

**New `InversionDrill.svelte` Practice-hub component: one-inversion-at-a-time chroma+bass grading via `matchInversion`, fixed role colors with a bass ink-ring, and an inline hint ladder (bass -> stack -> ghost) that fades with the drilled chord's own FSRS card maturity via `voicingStageForChord`.**

## Performance

- **Duration:** ~45 min
- **Tasks:** 3/3 completed (Tasks 1+2 shipped as one commit; see Deviations)
- **Files modified:** 2 (both new)

## Accomplishments

- `InversionDrill.svelte`: symbol shown up front (ChordGlyph), a composed prompt sentence naming the target inversion + bass role, and a passive read-only inversion-rotation strip (current target cell vermilion, no interactive affordances on any cell).
- Grading via `matchInversion`: `playedChroma` from the selected letter set, `playedBassChroma` derived from whichever selected letter sits at the lowest `(octave*12 + chroma)` score using a `pressedOctaveByLetter` map fed by `PianoKeyboard`'s existing `onPress` hook. Two distinct never-gating retry lines (wrong notes vs right-notes/wrong-bass); a correct play reveals + shows Next, which fires `onComplete()` exactly once.
- 2-octave interactive keyboard (forced, not self-measuring) so the bass can sit below the stack, with `bassHint` pinned to the chord's bass note at the fixed base octave.
- Inline escalating hint ladder (mirrors `ProgressionDrill`'s proven shape verbatim, not an extension of shared `HintLadder.svelte`): reads `getAllCards()` filtered to `chord-formula:{symbol}`, feeds `voicingStageForChord` - `meet` offers bass/stack/ghost, `subtract` drops bass, `drill` renders no ladder. The stack rung renders a bass-rotated `CountingChipRow`; the ghost rung lights ghost-hatched keys + the bass ring on the live keyboard. Already-revealed rungs never collapse on a wrong Check.
- `inversionDrill.test.ts`: 8 tests covering symbol/prompt/strip rendering, all three grading outcomes, hint-ladder fade across all three maturity stages, and the wrong-Check-preserves-hints invariant.

## Task Commits

Each task was committed atomically (Tasks 1 and 2 combined - see Deviations):

1. **Task 1+2: InversionDrill.svelte (grading UI + escalating hint ladder)** - `c70f599` (feat)
2. **Task 3: inversionDrill.test.ts** - `7c895c0` (test)

**Plan metadata:** (this commit, pending)

## Files Created/Modified

- `src/lib/components/InversionDrill.svelte` - the drill component (props, grading, keyboard, hint ladder)
- `src/lib/components/inversionDrill.test.ts` - component test suite (8 tests)

## Decisions Made

- `onComplete: () => void` (not `(correct: boolean) => void`): the plan explicitly supersedes 35-UI-SPEC's PracticeChordDrill-mirrored signature here, since a wrong play always retries and never completes - every completion is correct, matching ProgressionDrill/ShellVoicingDrill's own onComplete shape.
- `octaves={2}` forced on the keyboard (not left unset/self-measuring, unlike PracticeChordDrill/BuildSession's default): the bass must be able to sit below the stack, which a single octave cannot represent.
- Rung bodies composed client-side from split i18n keys (`inversions.hint.bass.mid`, `inversions.hint.stack.lead/.closing`) around the immune bass letter, mirroring the header comment already present in `inversions.ts` (35-03) rather than inventing a new composition shape.
- Test harness drills Dm7 (all-natural-letter notes: D/F/A/C) to sidestep black-key flat/sharp spelling ambiguity when looking up keys by accessible name in tests.

## Deviations from Plan

### Auto-fixed Issues

**1. [Process deviation, not a code bug] Tasks 1 and 2 combined into one commit**
- **Found during:** Task 2
- **Issue:** The plan specifies Task 1 (grading UI) and Task 2 (hint ladder) as separate commits, but both target the same new file and Task 2's markup wires directly into `ghostRevealed`/`ghostKeysForInversion` state that lives inside Task 1's keyboard block - there is no clean intermediate commit point without either (a) shipping a keyboard prop referencing an undefined variable, or (b) writing throwaway placeholder code just to split the diff.
- **Fix:** Authored the full component (both tasks' scope) in one pass and committed it as a single `feat` commit, with the commit message explicitly noting the combination and rationale.
- **Files modified:** `src/lib/components/InversionDrill.svelte`
- **Verification:** `npx vitest run src/lib/components/inversionDrill.test.ts` (8/8 pass), `npm run check` (0 errors), full suite (`npx vitest run`, 1589/1589 pass, no regressions).
- **Committed in:** `c70f599`

---

**Total deviations:** 1 (process/commit-granularity only, no code deviation)
**Impact on plan:** None on scope or correctness - both tasks' full acceptance criteria are met in the shipped file; only the commit-count mechanic differs from the plan's literal task-per-commit instruction.

## Issues Encountered

None. This worktree had no installed `node_modules` (gitignored, not present when the worktree was created); a symlink to the main checkout's `node_modules` (identical `package.json`/`package-lock.json`) was created locally to run `vitest`/`svelte-check` - this symlink is untracked and was never staged or committed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`InversionDrill.svelte` is ready for 35-06's Practice hub integration (mounting it per queue item with `symbol`/`inversionIndex` props and wiring `onComplete` to the host's synthetic-completion/FSRS-grade-commit path, mirroring `ProgressionDrill`/`ShellVoicingDrill`'s existing embed precedent). Flagged for on-device visual UAT once integrated: the forced 2-octave keyboard's tap targets on a phone-width viewport, and the bass ring + "B" badge legibility over a role fill.

---
*Phase: 35-inversions-new-drill-family*
*Completed: 2026-07-27*

## Self-Check: PASSED

- FOUND: src/lib/components/InversionDrill.svelte
- FOUND: src/lib/components/inversionDrill.test.ts
- FOUND: .planning/phases/35-inversions-new-drill-family/35-05-SUMMARY.md
- FOUND commit: c70f599
- FOUND commit: 7c895c0
