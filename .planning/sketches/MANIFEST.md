# Sketch Manifest

## Design Direction

Print Shop identity (locked by 01-UI-SPEC): letterpress paper/ink palette, zero radius, mono status register, interval color language (root vermilion, third verdigris, fifth tan, seventh mustard) reserved for revealed/correct notes, ink-hatch for selected/pending keys. Sketches explore drill feedback within that contract, phone-first per Phase 9.

## Reference Points

The app itself (src/routes/drills, PianoKeyboard.svelte) — sketches evolve existing surfaces, not greenfield.

## Sketches

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 001 | merged-feedback-keyboard | How does one keyboard show played (gray) + correct (colors) after a wrong answer? | A: Colors + Gray | drills, feedback, keyboard, mobile |
| 002 | scale-tonic-anchored | How should the scale page present so the run reads cleanly and the tonic anchors? | B: Degree strip (proposed) | scales, keyboard, layout, intervals |
| 003 | interval-distance-badge | Where should each key's interval-from-root badge sit? | C floating / A corner split (proposed) | intervals, keyboard, lookup, drills |
| 004 | scale-drill-ascending | How should the play-ascending scale drill show progress and the next step? | A: Degree ladder (proposed) | scales, drills, keyboard, learning |

## Session 2 (2026-07-14): scale + interval surfaces

Sketched three of five user asks; two were logic fixes handled directly (every-keyboard-sounds-on-tap, and forcing the four "Name this chord" options to share the root). Diagnosed the live scale-page issue: fixed C-to-C span strands non-C scales. Winners proposed above, pending user confirmation.
