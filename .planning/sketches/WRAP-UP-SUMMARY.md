# Sketch Wrap-Up Summary

**Date:** 2026-07-20 (previous wrap-up: 2026-07-13)
**Sketches processed:** 15 this pass (002–016); 001 processed 2026-07-13
**Design areas:** Drill Feedback (prior), Scales & Interval Keyboard, Drill Scaffolding & Onboarding, Global Layout & Mobile Nav, Teaching & Hints, Audio & Song Provenance
**Skill output:** `./.claude/skills/sketch-findings-music-learn/`

## Included Sketches
| # | Name | Winner | Design Area |
|---|------|--------|-------------|
| 002 | scale-tonic-anchored | B: Degree strip | Scales & Interval Keyboard |
| 003 | interval-distance-badge | C: Floating / corner split | Scales & Interval Keyboard |
| 004 | scale-drill-ascending | A: Degree ladder | Scales & Interval Keyboard |
| 005 | interval-scaffold | A: Formula strip | Drill Scaffolding & Onboarding |
| 006 | interval-song-hooks | A: Inline expand | Drill Scaffolding & Onboarding |
| 007 | beginner-onramp | A: Course stepper | Drill Scaffolding & Onboarding |
| 008 | keyboard-everywhere | A: Docked bottom bar | Global Layout & Mobile Nav |
| 009 | hear-the-chord | A: Auto-play + pulse | Audio & Song Provenance |
| 010 | chord-explainer | A: Hint ladder | Teaching & Hints |
| 011 | your-songs-chords | A: Provenance mark + filter | Audio & Song Provenance |
| 012 | interactive-theory | A: Guided steps | Teaching & Hints |
| 013 | french-fit-test | A: Header toggle | Global Layout & Mobile Nav |
| 014 | mobile-review-flow | A: Action dock | Global Layout & Mobile Nav |
| 015 | icon-tab-bar | B: Icon + micro-label | Global Layout & Mobile Nav |
| 016 | lookup-why-panel | A+B (C folded into A) | Teaching & Hints |

## Excluded Sketches
| # | Name | Reason |
|---|------|--------|
| — | none | — |

## Design Direction
Print Shop, phone-first. Serif ChordGlyph + 240ms stamp-in reveal are locked house references reused across all reveal surfaces. Drill wrong-answer feedback remains the single in-place keyboard transform from the first wrap-up.

## Key Decisions
- **Docked actions house rule:** advance/answer controls (keyboard 008-A, review grades 014-A) pinned above the phone tab bar, never in scrolling content.
- **Fold-into-deepest-rung:** escalating help ladders (010, 016) hold their richest content (dossier, Am7/Amaj7 duo) in the last rung.
- **Mobile nav:** 015-B icon + 9px micro-label at 56px (down from 64px), stable FR/EN; header EN|FR toggle (013-A).
- **Teaching at input:** 016-B disambiguation chips fire only on ambiguous chord-symbol casing.
- **Beginner ramp:** course stepper with tier names, advanced tiers ghosted (007-A); interval scaffold fades with level (005-A).
