---
sketch: 002
name: scale-tonic-anchored
question: "How should the scale page present so the run reads cleanly and the tonic anchors, instead of stranding non-C scales mid-keyboard?"
winner: B
tags: [scales, keyboard, layout, intervals]
---

# Sketch 002: Scale page, tonic-anchored

## Design Question
The live /scales page renders every scale on a fixed C-to-C two-octave span, so a non-C scale (E flat major) starts a third of the way in, wraps its top degrees into the second octave, and leaves both ends blank. How should it present instead?

## How to View
Serve the sketches dir and open `002-scale-tonic-anchored/index.html`. Use the tonic picker to see each approach hold up across all 12 keys (E flat is the telling case).

## Variants
- **A: Anchored piano** — literal one-octave piano beginning on the tonic key. Preserves real geometry but a black-key tonic (E flat, A flat) sits as a narrow floating key, not a clean left edge.
- **B: Degree strip** *(recommended)* — the seven degrees plus the octave as equal cells numbered 1 to 8, colored by degree role, note + solfege. Drops piano geometry for a clean left-to-right scale read that works identically in every key.
- **C: Piano + degree numbers** — variant A with the scale-degree number under each in-key note.

## What to Look For
Switch the tonic to E flat and A flat. A stays awkward (tonic is a black key); B reads as one clean run every time and directly teaches the 1-2-3-4-5-6-7-8 degree numbering the drill (sketch 004) reuses.
