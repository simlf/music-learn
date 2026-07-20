---
sketch: 005
name: interval-scaffold
question: "How should an always-on interval scaffold appear DURING a chord drill (while answering, not just on reveal), and how does it fade as the user levels up?"
winner: "A"
tags: [drills, intervals, scaffold, learning]
---

# Sketch 005: Interval scaffold

## Design Question
Beginners need to know what interval each note in a chord should be WHILE they are still constructing the answer, not only after they reveal it. But a permanent scaffold would stop being useful once the player already knows the shapes. This sketch explores how an always-on scaffold can appear during answering, and how it fades out in three steps (Beginner, Improving, Confident) as the player levels up, using a realistic construction drill: "Click the notes for Cm7" (root C, minor 3rd E♭, perfect 5th G, minor 7th B♭).

## How to View
Open `005-interval-scaffold/index.html` directly in a browser (no server needed). Use the shared LEVEL control (Beginner / Improving / Confident) at the top to see each variant's scaffold fade, and switch tabs A/B/C to compare placements. Click keys on any keyboard to see the drill respond (correct notes take their degree color, wrong notes flash gray, a status line tracks progress).

## Variants
- **A: Formula strip**: a row of interval chips (R, m3, P5, m7) above the keyboard. Beginner shows interval + note name per chip, Improving keeps only the interval abbreviation, Confident removes the strip entirely.
- **B: Ghost key labels**: the target keys carry a faint interval label directly on the key face. Beginner shows interval + note name at high opacity, Improving shows only the interval abbreviation at low opacity, Confident removes all ghosts, leaving a fully blind keyboard.
- **C: Interval recipe line**: a single colored sentence above the prompt ("root (C) + minor 3rd (E♭) + ..."). Beginner includes note names in parentheses, Improving drops the parentheticals but keeps interval names as words, Confident collapses to bare symbols (R + m3 + P5 + m7).

## What to Look For
A is the simplest and cheapest to build (one static row, easy to reason about at each level) but sits apart from the keyboard, so the player still has to map "m3 chip" to "which key." B sits directly on the keys being pressed, the tightest coupling between hint and action, but needs careful opacity tuning so Improving still reads as a hint and not clutter. C reads most like a sentence a teacher would say out loud and works well paired with either A or B rather than alone. Consider whether the fade should be one single global setting (as built here) or per-chord-type mastery, and whether B's ghost labels risk feeling like the app is just handing over the answer at Beginner level.
