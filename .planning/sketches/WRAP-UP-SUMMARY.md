# Sketch Wrap-Up Summary

**Date:** 2026-07-20 session 6 pass (previous passes: 2026-07-13, 2026-07-20 morning)
**Sketches processed:** 3 this pass (017, 019, 020); 001–016 processed earlier
**Design areas:** Drill Feedback (prior), Scales & Interval Keyboard, Drill Scaffolding & Onboarding, Global Layout & Mobile Nav, Teaching & Hints, Audio & Song Provenance, Contextual Learning & Metacognition (new)
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
| 017 | progression-drill | Synthesis (C sheet + B derive) | Contextual Learning & Metacognition |
| 019 | shell-voicings | Synthesis (staged C→B→A by card state) | Contextual Learning & Metacognition |
| 020 | confidence-calibration | B: Inline dots | Contextual Learning & Metacognition |

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
- **Staged-by-card-state (session 6):** rich pedagogy (compare intros, subtraction teaching) only while a card is NEW/LEARNING; cold drill at REVIEW (019 synthesis, extends 005 fading rule).
- **Earn-the-symbol (session 6):** progression drill hides lead-sheet chord symbols until named from the numeral and played; sheet fills verdigris (017 synthesis).
- **Optional confidence dots (session 6):** ? ~ ! serif dots under the glyph, never block Reveal, skip logs unrated (020-B); calibration payoff view on /progress (bar vs 3x2 matrix still open).

---

# Session 7 pass (2026-07-26)

**Sketches processed:** 4 (021–024) — post-v2.2 on-device UAT (PR #27)
**Design areas:** Counting-Hint Grammar & Inversions (new: references/counting-hint-grammar.md); Contextual Learning & Metacognition (022 appended)

## Included Sketches
| # | Name | Winner | Design Area |
|---|------|--------|-------------|
| 021 | shape-pattern-chips | A: Colored gap-chips | Counting-Hint Grammar & Inversions |
| 022 | voicing-lean-flow | A: Add/drop nudges | Contextual Learning & Metacognition (evolution) |
| 023 | inversion-drill | B: Play-it prompt + 024-A hint graft | Counting-Hint Grammar & Inversions |
| 024 | progression-scaffold | A: Counting-hint ladder + 1-octave beginner keyboard | Counting-Hint Grammar & Inversions |

## Excluded Sketches
None.

## Design Direction (session 7)
One shared thread across four UAT asks: teaching a beginner *how to find the notes*. The
unifying win is a **counting-hint grammar** — tone chips tinted by interval role + gap chips
whose fill (minor third) vs outline (major third) show the chord's shape and semitone count at
a glance — reused on name-it feedback, the progression on-ramp, and the new inversion drill.
Hints stay escalating, optional, and fade with FSRS card maturity; a cold beginner keyboard
shrinks to one octave. Separately, the voicing drill sheds its 3-way toggle for add/drop nudges.

## Key Decisions (session 7)
- **021-A** colored gap-chips replace the illegible grey mono shape line (`M7: M3·M3·M3`).
- **022-A** kill the Fond./Shell/Sans fond. toggle; shell default + "+ fondamentale" / "− basse" nudges.
- **023-B** inversion drill one-at-a-time (fits the hybrid queue), bass ring + badge, role colors fixed across inversions, grafted with an escalating hint ladder.
- **024-A** escalating counting-hint ladder (degree → semitone chips → ghost keys), symbol still earned, beginner keyboard reduced to one octave.
- **Non-visual follow-up:** hybrid-queue ordering should not lead a cold low-mastery session with a scaffold-heavy progression/inversion item.
