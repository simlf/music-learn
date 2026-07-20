---
sketch: 016
name: lookup-why-panel
question: "On lookup, how does 'why these notes?' teaching appear — including the Am7 vs Amaj7 casing trap?"
winner: null
tags: [lookup, teaching, beginner, theory, i18n]
---

# Sketch 016: Lookup "Pourquoi ces notes ?"

Issue #14, point 4: user typed AM7, got A-C-E-G, expected C♯ because "A major scale has C♯". Two gaps: (1) casing/symbol ambiguity (Am7 vs Amaj7), (2) no in-place explanation that `m` = minor third, independent of key signature.

## Design Question
Where does the theory explanation live: after the result, at input time, or as a comparison?

## How to View
open .planning/sketches/016-lookup-why-panel/index.html

## Variants
- **A: Pourquoi ? dépliant** — result card grows an expandable "Pourquoi ces notes ?" panel (010 hint-ladder tone), with a "Voir Amaj7" escape hatch.
- **B: Chips m / maj** — ambiguous input (AM7/am7) triggers a disambiguation prompt before showing a result; picking a chip teaches the difference at decision time.
- **C: Duo comparatif** — side-by-side Am7 / Amaj7 mini-dossiers with keyboards, teaching the third + seventh contrast visually.

## What to Look For
- A vs B: teach after the answer, or prevent the wrong question? B only fires on genuinely ambiguous casing.
- C: is the side-by-side clearer than prose, or too much for a lookup page?
- Copy check: does "la gamme n'impose rien ici" land for a beginner?
