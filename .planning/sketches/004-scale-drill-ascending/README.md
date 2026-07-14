---
sketch: 004
name: scale-drill-ascending
question: "How should the play-the-scale-ascending drill show progress and cue the next step?"
winner: A
tags: [scales, drills, keyboard, learning]
---

# Sketch 004: Scale drill, play ascending

## Design Question
A new easy scale-learning drill, biased toward the active song's key: name a scale, tap its notes bottom to top. How is progress and the next expected note shown?

## How to View
Serve the sketches dir and open `004-scale-drill-ascending/index.html`. Tap the keys in ascending order (G A B C D E F# G) to feel each variant; a wrong tap flashes.

## Variants
- **A: Degree ladder** *(recommended)* — a 1-to-8 ladder above the keyboard fills vermilion as you go and outlines the next rung. Progress and target are legible without reading the keys, and it reuses the degree-strip vocabulary from sketch 002.
- **B: Ghost next key** — no ladder; the next expected key wears a faint outline and a step counter ticks. Closest to playing a real instrument, least hand-holding.
- **C: Minimal register** — one mono register line ("STEP 3 OF 8"), no ladder, no ghost. Matches the existing drill chrome exactly.

## What to Look For
A teaches degree numbering alongside the shape (best for a beginner learning scales cold); B is the natural graduation once the shape is known. A build could start on A and fade to B as mastery grows, mirroring the app's existing fading-scaffold pattern.
