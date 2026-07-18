# Phase 17: Chord Explainer - Context

**Gathered:** 2026-07-17
**Status:** Ready for planning

<domain>
## Phase Boundary

In a Recall review, a learner who does not know the prompted chord can pull escalating in-place help — a hint ladder that reveals one layer per tap (plain-English family → formula as interval-color chips → notes lit on a mini keyboard → full spelling) — without leaving the review, then still grades honestly. Design winner: sketch 010 Variant A (hint ladder), with Variant C's chord "dossier" folded into the deepest layer. Requirements HINT-01, HINT-02, HINT-03.

Out of scope: Variant B tutor-chat; a standalone flip-dossier card; recording/analytics of hint usage; any change to FSRS scheduling math.

</domain>

<decisions>
## Implementation Decisions

The user expressed no preference on the gray areas and delegated the HOW. All decisions below are Claude's calls, grounded in the sketch-010 winner, the roadmap success criteria, and existing components. Open to revision at planning.

### Escalation model
- **D-01:** Cumulative ladder. Each tap reveals the next layer BELOW the ones already shown; earlier layers stay visible (family → formula chips → mini keyboard → full spelling) so it reads as one teaching build-up and the learner stops when it clicks. Not replace-one-at-a-time.
- **D-02:** The "Need a hint?" affordance is a quiet ghost control placed between the prompt/answer area and the Again/Hard/Good/Easy grading row. The grading row stays pinned and fully visible at every layer (HINT-02). The control's label advances with depth and it disappears once the deepest layer is shown.

### Recall mode scope
- **D-03:** Every Recall card offers the affordance (HINT-01), but the layers adapt per mode:
  - `see-play` (Mode A, SYMBOL → PLAY): full 4-layer ladder, available before answering.
  - `formula-build` (FORMULA → BUILD): the formula is already on-screen, so the ladder skips the formula-chip layer (family → mini keyboard → spelling), available before answering.
  - `hear-name` (Mode B, SOUND → NAME, ear training): to avoid spoiling the ear test, the ladder is present but reveals only AFTER an answer is committed — teaching, not an answer give-away.

### Hints vs honest grading
- **D-04:** Honor system. Using a hint never changes or caps the FSRS rating; the learner freely picks Again/Hard/Good/Easy (HINT-02, "grade honestly"). Hint depth reached is NOT recorded or fed to FSRS this phase — no analytics coupling, avoids scope creep.

### Copy source + deepest layer
- **D-05:** Layer 1 (plain-English family) is sourced from the existing mnemonics layer (`mnemonicFor`). For qualities with no mnemonic (major / minor / diminished / augmented triads), add a small beginner-plain family-line map alongside `mnemonics.ts` — one plain sentence per quality. Never cheesy filler (the `mnemonics.ts` "better none than cheesy" rule); no em dashes; ♭/♯ glyphs only (HINT-03).
- **D-06:** Deepest layer folds in Variant C's dossier: full spelling rendered with the serif `ChordGlyph` + interval-colored notes, plus a `SongHook` when one exists for that chord (render nothing when none — RevealInsight's no-empty-frames rule).

### Claude's Discretion
Everything above. The user delegated all four gray areas ("no preference"). Planner may refine layer copy, animation timing, and the exact control placement within RecallSession's card without re-asking.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design
- `.planning/sketches/010-chord-explainer/README.md` — design question, three variants, winner rationale (Variant A ladder + Variant C dossier folded into the deepest layer); worked example Cdim = C, E♭, G♭.
- `.planning/sketches/010-chord-explainer/index.html` — the interactive mockup of all three variants.

### Requirements / scope
- `.planning/REQUIREMENTS.md` §HINT-01, HINT-02, HINT-03 — the locked requirements.
- `.planning/ROADMAP.md` §"Phase 17: Chord Explainer" — goal + three success criteria.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/components/RecallSession.svelte` — the host. Three modes (`see-play`, `hear-name`, `formula-build`), per-card reset, and the Again/Hard/Good/Easy grading row. The hint ladder mounts inside the card here.
- `src/lib/copy/mnemonics.ts` (`mnemonicFor`) — layer-1 plain-English copy (covers maj7/m7/7/m7b5/dim7 only; extend for plain triads per D-05).
- `src/lib/components/RevealInsight.svelte` — existing teaching-line component; owns its own derivation and renders nothing when there's nothing worth saying. Model the hint ladder's density/no-empty-frame behavior on it.
- `src/lib/components/IntervalScaffold.svelte` + `IntervalChip.svelte` (props: `entries` from `formulaFor`, `level`) — layer-2 formula-as-interval-color chips.
- `src/lib/components/PianoKeyboard.svelte` — layer-3 mini keyboard with interval-color lit notes; renders inline (never a dock).
- `src/lib/components/ChordGlyph.svelte` — serif chord name + stamp-in reveal for the deepest layer.
- `src/lib/theory/songHooks.ts` + `src/lib/components/SongHook.svelte` — deepest-layer song hook.
- `src/lib/theory/chord.ts` (`spellChord`), `formulaFor` — spelling + formula derivation.

### Established Patterns
- Copy rules: no em dashes (D-05 project-wide), display accidental glyphs ♭/♯ only, short one-breath lines on phone cards.
- Interval-color language is shared across keyboard, chips, and glyph — the four layers must use the same color mapping.
- Components that own their own derivation so the page only passes symbols through (RevealInsight precedent).

### Integration Points
- A new hint-ladder component consumes `currentFact.symbol`, sits above the grading row inside RecallSession's card, and never touches the grading/FSRS path.

</code_context>

<specifics>
## Specific Ideas

- Canonical worked example (from the sketch): **Cdim = C, E♭, G♭** — two stacked minor thirds. Use it as the demo/test fixture through the ladder.
- Layer-3 mini keyboard should land the "two stacked minor thirds" idea visually (root / ♭3 / ♭5 in interval colors).

</specifics>

<deferred>
## Deferred Ideas

- Recording which hint layer the learner reached (analytics / progress insight) — future phase if wanted; explicitly not fed to FSRS now.
- Variant B tutor-chat and a standalone Variant C flip-dossier card — not chosen; the ladder won.
- Pre-answer help on `hear-name` — intentionally excluded to preserve the ear test.

</deferred>

---

*Phase: 17-chord-explainer*
*Context gathered: 2026-07-17*
