---
sketch: 022
name: voicing-lean-flow
question: "How to drop the heavy always-on Fond./Shell/Sans fond. 3-way toggle but keep full/shell/rootless variation practice?"
winner: "A"
tags: [voicings, layout, ux, drills]
---

# Sketch 022: Voicing Lean Flow

## Design Question
The voicing drill's `Fond. · Shell · Sans fond.` 3-way toggle reads as heavy visual chrome
(UAT V5: "cassée et pas très intuitive"). The user wants the toggle gone — style variation
should blend into the exercise itself — while keeping the "racing"/variation-practice value
that makes the drill good for learning to improvise.

## How to View
open .planning/sketches/022-voicing-lean-flow/index.html

## Variants
- **A: Add / drop nudges** — start on the shell (the core); two contextual buttons
  ("+ poser la fondamentale" / "− retirer la basse") let you build variations. Style is a
  by-product of what you add/remove, not a mode you pick. Most guided.
- **B: Single cycle chip** — one button cycles Complet → Shell → Sans fond., showing current
  + next. Three controls collapse to one. Smallest change.
- **C: Ghost-layer, no toggle** — no control at all: shell renders solid, root+fifth as
  ghost-hatch (reuses the existing subtract treatment); tapping a ghost adopts it. The
  variation IS which ghosts you play. Most blended into the exercise.

## What to Look For
- Does removing the toggle actually reduce clutter, or just hide the choice?
- Does the "racing"/variation intent survive — can you still deliberately practice all three?
- C reuses the locked ghost-hatch language (SK-019) — does the double-duty read clearly, or
  confuse "optional" with "wrong extra"?
- Which needs the least new i18n / logic against the current ShellVoicingDrill?
