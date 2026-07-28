---
sketch: 024
name: progression-scaffold
question: "How does a beginner get unblocked on the earn-the-symbol progression drill when they can't derive the chord from the roman numeral alone?"
winner: "A + beginner 1-octave keyboard"
tags: [progressions, scaffold, hints, beginner, drills]
---

# Sketch 024: Progression Scaffold

## Design Question
The progression drill (017 earn-the-symbol) shows only roman numerals (ii / V / I) with `?`
placeholders until the learner names + plays each chord. A beginner hit "Étape 2 : joue-le"
for the ii of B♭ major (Cm7), had no counting hints like the other exercises, and was
hard-blocked — the drill popped first and the whole session stalled ("Pas tout à fait.
Rejoue-le." on loop). Need to simplify or gamify with counting hints, without killing the
earn-the-symbol payoff.

## How to View
open .planning/sketches/024-progression-scaffold/index.html

## Variants
- **A: Counting-hint ladder** — an escalating "Afficher un indice" that reveals, rung by rung:
  (1) the degree → root note, (2) quality + semitone-count chips (R +3 +4 +3), (3) ghost keys
  on the keyboard. Reuses the locked 010-A hint-ladder + Build-it "indice de comptage". Symbol
  stays hidden; hint fades as the card matures (005/010 rule).
- **B: Reveal the root** — spell the degree's root (ii → fond. Do) and anchor it in vermilion on
  the keyboard, turning "derive from nothing" into "build from Do". Never blocked; lower payoff.
- **C: Count-the-semitones cue** — the interval-count chips + ghost landing keys shown inline
  always (not behind a button), matching the exercises the user already likes. Most gamified,
  least earned.

## Winner
**A (counting-hint ladder)** — escalating optional hints, symbol still earned. Refinement:
at beginner level the keyboard is **reduced to the tonic's one octave** (fewer keys = less
confusing) and widens to two octaves as level rises. The full 2-octave span in the live
screenshot is part of what made the first item overwhelming.

## What to Look For
- Does the hint stay optional/escalating (A) or become a permanent crutch (C)? Which fits a
  returning-classical-pianist who's a theory beginner?
- Does any variant preserve the earn-the-symbol payoff (symbol still hidden until played)?
- Is the semitone count (+3/+4) the right "comptage" language, matching Build-it?

## Non-visual follow-up (out of sketch scope)
Scheduling: a hard 3-chord progression should not be the *first* item a low-mastery session
serves. Worth a separate look at the hybrid-queue ordering (composePracticeQueue) so
scaffold-heavy families don't lead a cold session — noted here, not sketched.
