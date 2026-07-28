---
sketch: 021
name: shape-pattern-chips
question: "How does the per-quality stacked-thirds pattern read at a glance so a beginner instantly sees minor vs major vs dim shape?"
winner: "A"
tags: [drills, name-it, intervals, teaching, feedback]
---

# Sketch 021: Shape Pattern Chips

## Design Question
The name-it (nomme cet accord) feedback line currently prints the quality's third
pattern as grey uppercase mono text (`M7: M3 · M3 · M3`) — illegible and not visual.
The user wants it to read instantly, borrowing the colored interval chips already used
in the Build-it stage (screenshot 2). Goal: a beginner sees "minor triad / major triad /
dim" shape at a glance from color + fill, not by parsing mono text.

## How to View
open .planning/sketches/021-shape-pattern-chips/index.html

## Variants
- **A: Colored gap-chips** — tone chips tinted by role (root vermilion, third verdigris,
  fifth tan, seventh mustard) with `+m3`/`+M3` gap chips between (filled = minor, outline =
  major). Directly borrows the screenshot-2 build chips. Path of least resistance.
- **B: Glyph + shape strip** — ChordGlyph beside a 3-segment strip (filled/hollow = min/maj
  third) plus a plain-language tag ("forme mineur 7"). Compact, names the shape.
- **C: Stacked-thirds boxes** — vertical stack read bottom→top, each note a role-colored box,
  each gap a labeled tick. Shows the literal stacking, most spatial.

## What to Look For
- Can you tell minor-third from major-third without reading the letters? (fill vs outline)
- Does the color reinforce the existing interval-role language or fight it?
- Is the "shape" (small-big-small = m7) legible enough to become a memorized pattern?
- Which survives at phone width in a feedback slot below the choices?
