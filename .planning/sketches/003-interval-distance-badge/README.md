---
sketch: 003
name: interval-distance-badge
question: "Where should each highlighted key's interval-from-root badge sit so the interval stack reads without crowding the note label?"
winner: C
tags: [intervals, keyboard, lookup, drills]
---

# Sketch 003: Distance-from-root badge

## Design Question
Highlighted keys already carry their interval COLOR, and the formula chips name the intervals below the keyboard. The user wants the interval-from-root readable ON the keys. Where does the badge go?

## How to View
Serve the sketches dir and open `003-interval-distance-badge/index.html`. Use the chord picker (Cm7, Cmaj7, C7, Cdim7) to see badges on both white and black keys.

## Variants
- **A: Corner tab** — badge pinned to the top of each colored key. Most compact, best for the one-octave phone keyboard, but shares the key face with the NoteLabel.
- **B: Under the label** — badge stacked below letter + solfege inside the key. Reads as one unit but needs vertical room and is tight on black keys.
- **C: Floating above** *(recommended for desktop)* — badge floats above the keyboard on a tick. Clearest read of the interval stack, never crowds the key, but costs a strip of height above the keys.

## What to Look For
The real tradeoff is space: C is clearest on the lookup/desktop view; A is the compact fallback for the phone drill keyboard where vertical room is scarce. A build could use C where there is headroom and A where there is not.
