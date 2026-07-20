---
sketch: 007
name: beginner-onramp
question: How does a beginner see the easiest course and pick their level without feeling overwhelmed, right where they practice (the Drills page), with advanced tiers hidden until reached?
winner: "A"
tags: [levels, onboarding, drills, beginner]
---

## Design Question

Today the level control is six bare tier-number buttons (1 through 6, with 5 and 6 disabled) buried in the Progress page settings. A beginner never sees a tier name, a description, or a reason to start at Tier 1. It reads as a settings knob, not a course. This sketch asks: what does the top of the Drills page look like when the level picker lives right where practice happens, names tiers instead of numbering them, and keeps advanced tiers out of sight until they are relevant?

## How to View

Open `index.html` directly in a browser (file://), no server needed. Use the "Simulate progress" strip near the top (buttons 1 to 4) to pretend you have reached different tiers, then switch between the three tabs to compare how each variant reacts to that progress.

## Variants

**A &middot; Course stepper.** A single "Your course" band names the current tier ("Tier 1 &middot; White-key triads"), gives a one-line plain description, and a big "Start practicing" button. A muted "Next up" strip previews only the immediately following tier. Nothing past that renders at all.

**B &middot; Progress ladder.** A vertical list of tiers by name: checked for done, highlighted for current, dimmed for future-but-visible, dashed and italic for locked. Tapping any reached tier switches practice level immediately. Tier 5 and 6 stay off the ladder entirely until Tier 4 is reached, at which point they appear as locked, dashed "coming later" rows.

**C &middot; Two-choice on-ramp.** First thing shown: a large "New here? Start the beginner course" card next to a smaller "Pick my level" card. The beginner course needs no further decisions, it snaps straight to Tier 1 with the interval scaffold on. "Pick my level" reveals a compact list of only the tiers already reached.

All three tabs render a real "Drills" title and a faded, masked drill-card hint below the fold, to show how the new level UI sits above the existing drill content rather than replacing the page.

## What to Look For

- Does the tier read as a name and a short reason to start ("White-key triads... start here"), not a bare number?
- Is Tier 1 the obvious, low-effort default for someone who has never played a drill?
- At low progress (reached = 1), do tiers 2 through 6 stay invisible or nearly invisible, so the page feels calm rather than a wall of six options?
- As "reached" increases via the simulator, does each variant reveal exactly one new relevant thing at a time (next tier, next rung, more picker options) rather than dumping the whole ladder at once?
- Does switching tiers (variants B and C) feel like one clear tap, with no confirmation dialog or settings detour?
- Which variant would least intimidate a beginner seeing the Drills page for the first time, and which best serves a returning player who already knows their tier?
