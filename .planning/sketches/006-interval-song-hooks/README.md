---
sketch: 006
name: interval-song-hooks
question: "How should the optional famous-tune interval hook appear, opt-in per interval (tap to reveal), tasteful and not cheesy?"
winner: "A"
tags: [intervals, mnemonics, ear-training, learning]
---

# Sketch 006: Interval song hooks

## Design Question
Every interval can be anchored to a well-known tune (m3 sounds like the opening of Greensleeves, P5 like the first two notes of Twinkle Twinkle). This is a standard ear-training device, but it can read as cheesy or cluttered if shown by default. The hook must be strictly opt-in: available on tap, never forced, never auto-shown. How should that reveal surface, in a way that stays tasteful?

## How to View
Serve the sketches dir and open `006-interval-song-hooks/index.html`. Switch between the three tabs. Every interactive element is functional: rows expand, cards flip, and the register-line hook button toggles.

## Variants
- **A: Inline expand**: each interval is a full-width row with a color swatch. Tapping the row opens a short italic strip beneath it naming the tune, tapping again collapses it. Reads well in a linear list, one hook visible at a time per row.
- **B: Flip cards**: each interval is a small card in a grid. Tapping flips it from the interval name (front, colored) to the tune (back, dark). Best for browsing the full interval set at a glance on a dedicated reference page.
- **C: Register line integration**: reuses the app's existing mono inspect register (e.g. `m3 · Minor 3rd · tierce mineure · 3 demi-tons`). A picker selects the interval, and a "Sounds like…" button appends the tune as an italic clause onto that same register line, toggled independently per interval.

## What to Look For
All three keep the tune fully opt-in and never show it unprompted, per the locked direction. The tradeoff is context versus density: A is best embedded in a linear interval list during a lesson or drill review. B is best on a standalone reference page meant for browsing the whole set. C is the tightest integration with the app's existing inspect register, so it costs the least new UI surface but only shows one interval's hook at a time. The vetted tune table (m2 through P8) is fixed and should not be extended with other associations.
