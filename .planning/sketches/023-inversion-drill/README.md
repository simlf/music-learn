---
sketch: 023
name: inversion-drill
question: "How does a new inversion drill present a chord's inversions and let the user practice moving notes through them?"
winner: "B + 024-A hint graft"
tags: [inversions, drills, new-feature, keyboard, teaching]
---

# Sketch 023: Inversion Drill

## Design Question
New feature request: practice a chord's inversions (e.g. Cm7 → root / 1st / 2nd / 3rd
inversion), so the same chord can be drilled with different bass notes. How should the
inversion be presented, and how does the user practice shifting a chord through its
inversions? Bigger than 021/022 — a net-new drill family (own queue type, own build phase).

## How to View
open .planning/sketches/023-inversion-drill/index.html

## Variants
- **A: Inversion ladder** — all four inversions stacked as mini keyboards, bass note ringed +
  badged. "Play the 2nd inversion" with the target rung highlighted. Shows the whole family
  (same 4 notes, different bass) — most teaching-forward.
- **B: Play-it prompt** — one keyboard, one inversion at a time ("Cm7 — 2ᵉ renversement, quinte
  à la basse"), graded on bass + set, reveal stacks the chord. Mirrors the existing single-item
  drill shape — path of least resistance into the hybrid queue.
- **C: Slot-shift mechanic** — vertical note-slots where advancing an inversion sends the
  current bass up an octave to the top. Teaches the *mechanic* viscerally; role colors never
  move, only order. Most conceptual.

## Winner
**B (play-it prompt)** — fits the current one-item queue. Grafted with an escalating hint
ladder from 024-A (bass note → stack order from the bass → ghost keys) so the user is guided
early and the drill goes cold as the card matures.

## What to Look For
- Does the drill teach "inversion = same notes, different bass" or just quiz positions?
- Bass-note emphasis: is the ring+badge (A/B) enough, or does the octave-shift (C) teach more?
- B fits the current one-item-at-a-time queue cleanly; A/C need more surface. Worth it?
- Role colors stay fixed across inversions — does that anchor or does the reordering confuse?
