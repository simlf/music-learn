---
sketch: 014
name: mobile-review-flow
question: "On phone, how does the review 'next step' action stay reachable without scrolling?"
winner: "A"
tags: [recall, mobile, layout, actions]
---

# Sketch 014: Mobile Review Flow

Issue #14, point 1: on mobile the review page sometimes blocks advancing — the reveal/grade actions fall below the fold.

## Design Question
Where do Révéler + grade buttons live so the loop never requires scrolling on a 390px phone?

## How to View
open .planning/sketches/014-mobile-review-flow/index.html

## Variants
- **A: Action dock** — actions pinned in a dock above the tab bar; content scrolls underneath. Structural guarantee (mirrors 008-A docked keyboard logic).
- **B: Fit-in-viewport** — compact card sizing so card + keyboard + grades always fit; nothing scrolls.
- **C: Auto-scroll** — layout unchanged, reveal auto-scrolls actions into view. Cheapest fix, weakest guarantee.

## What to Look For
- Tap Révéler, then a grade — did anything require scrolling?
- A vs B: dock costs vertical space always; B shrinks the glyph/keyboard — still legible?
- C: does the scroll jump feel acceptable or janky?
