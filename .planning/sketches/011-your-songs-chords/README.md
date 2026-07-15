---
sketch: 011
name: your-songs-chords
question: "How do chords from your added songs surface and get prioritized app-wide?"
winner: "A"
tags: [songs, provenance, drills, motivation]
---
# Sketch 011: Your Songs' Chords

## Design Question
The user is a beginner learning specific songs, and drilling chords that aren't in
those songs is wasted effort. They've added songs on `/songs` (Autumn Leaves, Fly Me
to the Moon). How should "this chord is in one of your songs" surface and get
prioritized across Drills, Recall, and Chord Lookup, so app practice reinforces the
exact chords they must play at the piano?

## How to View
open .planning/sketches/011-your-songs-chords/index.html

## Variants
- **A · Provenance mark + filter** — every chord chip/card app-wide that appears in a
  song gets a letterpress mono tag (`♪ AUTUMN LEAVES`). Drills and Recall gain a
  "FROM MY SONGS" filter toggle. Mock shows a Drills prompt with the tag, the toggle
  in on/off states, and a Lookup result carrying the same mark. Explicit, controllable,
  app-wide reach — but adds a tag to nearly everything and asks the user to manage a filter.
- **B · Song-first practice lane** — a pinned "PRACTICE YOUR SONGS" band at the top of
  Drills/Recall lists your songs; tapping one expands its chord set into a ready-made deck
  ("Autumn Leaves · 7 chords · Start"). Rest of the app stays generic. Strong intent match
  and zero ambiguity — but it's a new navigation surface and the provenance only lives in
  the lane, not on chords elsewhere.
- **C · Ambient prioritization** — no new navigation. The SRS picker silently weights
  toward your-song chords; each served drill carries one subtle motivational line
  ("This one shows up in Fly Me to the Moon"), plus a tiny "why am I seeing this?"
  affordance that reveals the weighting. Lowest friction, most motivational — but the
  reach is invisible; the user can't deliberately focus a session on one song.

## What to Look For
- Provenance shown consistently across at least a Drills surface, a Lookup result, and
  (conceptually) a Recall card — does the mark read as the same object everywhere?
- Serif chord names vs mono provenance tags: is the typographic split legible and
  letterpress-consistent with the rest of the app?
- Control vs ambience: A/B let the user deliberately focus on their songs; C makes it
  happen automatically. Which matches a beginner who "just wants to practice what's in
  the sheet music"?
- Multi-song chords (e.g. a chord in both songs) — the double-border `2 songs` tag.
  Does collapsing multiple songs into a count feel right, or should it name them?
- Does A's mark-everything approach create visual noise once the library is mostly
  covered by a few songs?
