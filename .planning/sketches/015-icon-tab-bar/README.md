---
sketch: 015
name: icon-tab-bar
question: "How does the phone tab bar shrink when full French labels overflow and eat vertical space?"
winner: "B"
tags: [i18n, french, mobile, navigation, layout]
---

# Sketch 015: Icon Tab Bar

Issue #14, point 2: French bottom nav takes too much room — reduce, abbreviate, or use icons. Follows up 013's flagged risk (register slots must abbreviate long French or widen).

## Design Question
Icons, icon+label, or abbreviated text — what keeps the 5-slot bar compact in both FR and EN?

## How to View
open .planning/sketches/015-icon-tab-bar/index.html — use the FR ⇄ EN button to stress-test both languages.

## Variants
- **A: Icônes seules** — 48px bar (vs 64px today), language-independent, but icons must be learnable.
- **B: Icône + micro-libellé** — 56px, 9px label teaches the icon; label may truncate in FR.
- **C: Texte abrégé** — 48px, abbreviated French (RECH., EXOS, RÉVIS., MORC.), no icon design needed.

## What to Look For
- Toggle FR ⇄ EN: which variant is stable across both?
- A: do the five glyphs read without labels (magnifier, keys, cards, note, dots)?
- C: are the abbreviations dignified enough for Print Shop, or do they read as clipped?
- Bar height gain: 64 → 48/56px.
