---
phase: 17-chord-explainer
status: passed
verified: 2026-07-17
requirements: [HINT-01, HINT-02, HINT-03]
---

# Phase 17: Chord Explainer — Verification

**Status: PASSED.** All three requirements delivered and confirmed by the full test suite, svelte-check, and a live in-browser walkthrough of the hint ladder on `/recall`.

## Evidence

### Automated
- `npx vitest run` (full suite) → **1030 tests passed / 70 files**, 0 failures.
- `npm run check` (svelte-check) → **0 errors, 0 warnings**.
- New coverage: `hintLadder.test.ts` (6), `recallSession.test.ts` hint-wiring (+8 across see-play/formula-build/hear-name), `mnemonics.test.ts` / `chordPresentation.test.ts` copy-rule + totality tests.

### In-browser (dev server against this worktree, `/recall`)
Walked the review queue to a `FORMULA → BUILD` C7 card and stepped the ladder to full depth. Rendered exactly to the UI-SPEC:
- **HINT 1 · THE FAMILY** — "Major triad plus a ♭7, a whole step under the octave. The 3 and ♭7 form a tritone: that pull is the engine of the chord." (from `mnemonicFor`; ♭ glyph; no em dash)
- **HINT 2 · ON THE KEYS** — mini keyboard, C/E/G/B♭ lit in root/third/fifth/seventh interval colors with solfège tags.
- **HINT 3 · FULL SPELLING** — serif `ChordGlyph` C7 + interval-colored note boxes + "SOUNDS LIKE…" song hook (dossier fold-in).
- Closing line "That's the whole chord." (12px label size), control removed at max depth, layers stacked cumulatively above the BuildSession answer surface.
- Adaptive: the formula-chip layer is correctly skipped for `formula-build` (3-layer). The pre-existing `formula` mode (SYMBOL → FORMULA) correctly shows **no** hint control (documented scope exclusion).
- 0 console errors. Keyboards render inline (Phase-15 dock removal is live on this base).

## Requirement mapping

- **HINT-01** (escalating one-layer-per-tap affordance: family → formula chips → mini keyboard → full spelling) — `HintLadder.svelte` (17-02), wired into `see-play` (full 4-layer), `formula-build` (3-layer), and `hear-name` (post-answer) in RecallSession (17-03, 17-04). Confirmed in browser + tests. **PASS**
- **HINT-02** (stop at any layer; grading row stays present; grading commits after help) — control sits above the pinned grade row; `see-play` no-hint grading path is byte-identical; `recordGrade` fires exactly once and hint depth never changes the rating (honor system, D-04); `hear-name` opening a hint cancels the 650ms auto-advance and surfaces a `Continue` that replays the committed rating. Covered by recallSession tests. **PASS**
- **HINT-03** (copy from the mnemonics layer, beginner-plain) — Layer 1 from `mnemonicFor` + `familyLineFor` (plain-triad fallback); Layer 2 from generated `formulaSentence`. Copy-rule tests enforce no em dashes / glyph accidentals. **PASS**

## Scope notes
- Ladder scoped to `chord-formula` facts in `see-play` / `formula-build` / `hear-name`; excludes the pre-existing `formula` mode (its own mechanic delivers the deepest content) and non-chord facts. Documented in the UI-SPEC scope resolution.
- Deferred (not implemented, intentionally): hint-usage analytics, Variant B tutor-chat, standalone Variant C flip-dossier, pre-answer help on `hear-name`.

*Verified 2026-07-17 on branch `gsd/phase-17-chord-explainer`.*
