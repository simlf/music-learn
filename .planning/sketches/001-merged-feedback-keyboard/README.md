---
sketch: 001
name: merged-feedback-keyboard
question: "After a wrong construction answer, how does ONE keyboard show what you played (gray) and the correct answer (interval colors) at once?"
winner: "A"
tags: [drills, feedback, keyboard, mobile]
---

# Sketch 001: Merged Feedback Keyboard

## Design Question

Today's wrong-answer feedback shows TWO keyboards (your input above, correct answer below) plus a text diff. The idea: the input keyboard transforms in place on Check into a single merged view. Three key categories need marking: correct notes you played, correct notes you missed, extra notes you played wrongly.

Scenario in all variants: Cm7 asked, user played C, E, G (E wrong, missed E♭ and B♭).

## How to View

open .planning/sketches/001-merged-feedback-keyboard/index.html

(or http://localhost:8410/001-merged-feedback-keyboard/index.html while the sketch server runs)

## Variants

- **A: Colors + Gray** — all 4 correct notes fill interval colors, your extra E goes gray with ✕. No played-vs-missed distinction.
- **B: Hollow Missed** — played-correct fill solid, missed-correct are hollow (thick interval-color outline), extras gray. Shows exactly which fingers to add.
- **C: Hatch Memory** — interval colors stamp the answer; every key you touched keeps the selection hatch overlaid. Your fingerprint stays visible under the correction.

## What to Look For

- Which reads fastest as "here is the shape" vs "here is what you got wrong"?
- Does B's hollow treatment stay legible on black keys (ink fill + colored outline)?
- Does C's hatch read as information or as noise?
- Check on phone width (toolbar 📱): keyboard drops to one octave (Phase 9 responsive rule); do the treatments survive small keys?
- The Check interaction is live: toggle keys, Check, Next resets.
