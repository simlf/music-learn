---
sketch: 010
name: chord-explainer
question: "In Recall, how do you get escalating help on a chord you don't know, in place?"
winner: "A"
tags: [recall, hints, teaching, beginner]
---
# Sketch 010: Chord Explainer

## Design Question
On the /recall page (RecallSession.svelte), the card shows a chord like "Cdim" but the user may not know what Cdim actually is. They want more help in place: escalating hints or a little teaching conversation, without abandoning the review. Grading (Again / Hard / Good / Easy) must stay present. Worked example throughout: **Cdim = C, E♭, G♭** (a diminished triad, two stacked minor thirds).

## How to View
open .planning/sketches/010-chord-explainer/index.html

## Variants
- **A · Hint ladder** — a "Need a hint?" affordance reveals tiered hints one tap at a time, escalating and free: (1) plain-English family, (2) the formula as interval-color chips, (3) notes lit on a mini keyboard, (4) full spelling "C E♭ G♭". Stop when it clicks, then grade.
- **B · Tutor chat** — a chat-style tutor opens with "What's tripping you up on Cdim?" and quick-reply chips ("What does 'dim' mean?", "What notes?", "How's it different from Cm?"). Each chip prints a short letterpress answer (with chips / mini keyboard where useful) and offers follow-ups. "Back to grading" returns to the card.
- **C · Flip dossier** — the recall card flips (CSS transform) to a compact chord dossier: serif name, one-line plain meaning, formula chips, lit mini keyboard, and a song hook. Flip back and the grading row is untouched.

## What to Look For
- Does help feel in-place, or like it hijacks the review? (A/B stay on the card; C leaves it for one flip.)
- Escalation vs. all-at-once: A meters the reveal so you stop early; C dumps everything on the flip; B is user-driven Q&A.
- Is the copy beginner-plain (no jargon dumps)? Grounding: hints.ts, mnemonics.ts, songHooks.ts, ChordGlyph.svelte.
- Mini keyboard: C / E♭ / G♭ lit in root / ♭3 / ♭5 interval colors — does the visual land the "two stacked minor thirds" idea?
- Grading row present and honest in all three (help does not replace the grade).
