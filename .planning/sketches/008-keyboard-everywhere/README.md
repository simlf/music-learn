---
sketch: 008
name: keyboard-everywhere
question: "Where does an always-playable keyboard live on pages that already carry content?"
winner: "A"
tags: [keyboard, layout, global, mobile]
---
# Sketch 008: Keyboard Everywhere

## Design Question
The non-negotiable requirement: on every page that has a piano keyboard, the keyboard must be immediately playable (tap a key, it sounds). Today keyboards are inline per-page and not consistently playable. Where should an always-playable keyboard live on pages that already carry a lot of content: Recall review cards, Chord Lookup results, Scales, Drills, and Theory? The winning treatment must guarantee the keyboard is present and playable on all of /recall, /scales, /drills, /theory, and the root chord-lookup page.

## How to View
open .planning/sketches/008-keyboard-everywhere/index.html

Tap the white and black keys. Each tap depresses the key and writes a line to the mono register (e.g. `♪ E4`). In the real app the same taps drive the audio engine (`playNote` / `playChord` in `PianoKeyboard.svelte`) with a persisted sound toggle; this sketch fakes sound with the visual press plus the register line.

## Variants
- **A: Docked bottom bar** — a 1.5-octave keyboard pinned to the bottom of the viewport inside a phone frame; the Recall card scrolls above it and the keyboard never leaves. Always thumb-reachable; an ink handle collapses it to a thin strip to reclaim screen height.
- **B: Inline, guaranteed** — each surface keeps its own in-flow keyboard (today's pattern), but every surface is guaranteed to have one. Shows a Lookup result and a Recall card stacked, each with its own playable keyboard, plus a sticky SOUND chip that is the one shared sound-state truth across the whole page.
- **C: Floating summon** — a persistent PIANO button at bottom-right on every page. Tapping it slides a dismissible keyboard sheet up from the bottom. Present everywhere but hidden until summoned, so content-heavy pages keep their full height until you actually want to play. Shown in both collapsed (FAB only) and expanded (sheet open) states.

## What to Look For
- **Thumb reach on a phone:** which treatment puts keys under the thumb without hunting or scrolling? (A wins by default; C after one tap; B only when a keyboard happens to be on-screen.)
- **Content cost:** how much vertical space does the treatment steal from a busy Recall card? (A always eats a fixed strip; C eats nothing until summoned; B eats one keyboard per surface, potentially several.)
- **Guarantee strength:** does the pattern *force* a keyboard onto /scales, /drills, /theory too, or does it depend on each page remembering to include one? (A and C are global by construction; B relies on discipline per page.)
- **Sound-state clarity:** with multiple keyboards visible (B), is one shared toggle clearer than a toggle per keyboard? Does a single global chrome (A / C) make "is sound on?" unambiguous?
- **Collapse / dismiss ergonomics:** is A's handle or C's sheet-dismiss the lighter gesture when the keyboard is in the way?
