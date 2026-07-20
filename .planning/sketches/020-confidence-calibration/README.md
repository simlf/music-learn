---
sketch: 020
name: confidence-calibration
question: "Where does the pre-reveal 'how sure?' prompt sit, and how does confidence-vs-correctness render on stats?"
winner: "B"
tags: [recall, metacognition, stats, learning]
---

# Sketch 020: Confidence Calibration

## Design Question

Backlog I-05: capture a judgment-of-learning ("how sure?") before every Recall reveal, log it beside the FSRS grade, and surface a calibration view that turns confident-but-wrong cards into a drillable category (the cards most likely to fail cold at the piano).

## How to View

open .planning/sketches/020-confidence-calibration/index.html

## Variants

- **A: Dock strip capture** — 3-button strip (Not sure / Somewhat / Certain) inside the action dock, above Reveal. Reveal locked until rated: guaranteed data, one extra tap.
- **B: Inline dots capture** — three serif dots (? ~ !) under the chord glyph, in content flow. Optional, never blocks Reveal; skipping logs "unrated".
- **C: Stats calibration view** — the payoff on /progress: 3-bar confidence-vs-correctness chart with a MISCALIBRATED flag, a confident-but-wrong card list with a drill CTA, plus a denser 3x2 matrix alternative in the same tab.

## What to Look For

- A vs B is a friction-vs-data-quality tradeoff: is a forced rating on EVERY card acceptable at 20+ due cards, or does it get mashed mindlessly?
- Does B violate the session-5 docked-actions rule (rating can scroll away) badly enough to matter?
- In C, bar chart vs 3x2 matrix: which one makes you actually want to tap "Drill the danger cards"?
- Do the French equivalents (Pas sûr / Moyen / Certain) fit A's 3-button strip at 390px?
