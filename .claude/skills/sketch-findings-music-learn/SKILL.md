---
name: sketch-findings-music-learn
description: Validated design decisions, CSS patterns, and visual direction from sketch experiments. Auto-loaded during UI implementation on music-learn.
---

<context>
## Project: music-learn

Print Shop identity (locked by 01-UI-SPEC): letterpress paper/ink palette, zero radius, mono status register, interval color language (root vermilion, third verdigris, fifth tan, seventh mustard) reserved for revealed/correct notes, ink-hatch for selected/pending keys. Sketches explore drill surfaces within that contract, phone-first per Phase 9.

Reference points: the app itself (src/routes/drills, PianoKeyboard.svelte) — sketches evolve existing surfaces.

Sketch sessions wrapped: 2026-07-13, 2026-07-20, 2026-07-26 (sessions 5, 6, 7)
</context>

<design_direction>
## Overall Direction

Print Shop, phone-first. Locked house references: serif `ChordGlyph` (`--font-serif`/`--text-display`) + the 240ms `stamp-in` reveal animation reused across all reveal surfaces. House rule from sessions 4–5: **docked actions** — anything the user must tap to advance (keyboard, Révéler/grade buttons) lives in a dock pinned above the phone tab bar, never in scrolling content. Escalating help follows the **fold-into-deepest-rung** pattern: hint ladders whose richest content (dossier, side-by-side comparison) is the last rung, never shown first. Wrong-answer feedback stays one keyboard transforming in place (interval colors + gray ✕ extras). Session 6 adds the **staged-by-card-state** rule: rich pedagogy (compare intros, subtraction teaching) appears only while a card is NEW/LEARNING and fades to a cold drill at REVIEW; and the **earn-the-symbol** rule for progressions: lead-sheet bars show roman numerals always, chord symbols only after the learner names and plays them. Session 7 adds the **counting-hint grammar**: one tone-chip + fill/outline gap-chip row (minor third solid, major third outline) expresses shape and semitone count everywhere (name-it feedback, progression + inversion hints), replacing illegible grey mono text; hints stay escalating/optional and fade with card maturity, and a cold beginner keyboard is reduced to one octave. Also the **lean-control** rule: prefer contextual add/drop nudges over always-on mode toggles.
</design_direction>

<findings_index>
## Design Areas

| Area | Reference | Key Decision |
|------|-----------|--------------|
| Drill Feedback | references/drill-feedback.md | Merged in-place feedback keyboard: interval colors for the chord, gray + ✕ for extras |
| Scales & Interval Keyboard | references/scales-interval-keyboard.md | Tonic-anchored degree strip (002-B), floating/corner interval badges (003-C), degree-ladder ascending drill (004-A) |
| Drill Scaffolding & Onboarding | references/drill-scaffolding-onboarding.md | Formula strip fading with level (005-A), inline tap-to-reveal song hooks (006-A), course stepper with tier names + ghosted advanced tiers (007-A) |
| Global Layout & Mobile Nav | references/global-layout-mobile-nav.md | Docked keyboard (008-A), header EN\|FR toggle (013-A), review action dock (014-A), icon + micro-label 56px tab bar (015-B) |
| Teaching & Hints | references/teaching-hints.md | Hint ladder with dossier as deepest rung (010-A), guided lesson steps (012-A), lookup disambiguation chips + "Pourquoi ces notes ?" panel (016 A+B) |
| Audio & Song Provenance | references/audio-song-provenance.md | Auto-play + pulse on reveal, arpeggio study mode (009-A), provenance mark + "From my songs" filter (011-A) |
| Contextual Learning & Metacognition | references/contextual-learning-metacognition.md | Lead-sheet progression drill with earn-the-symbol two-step (017 synthesis), voicing help staged by FSRS card state with ghost-hatch optional notes (019 synthesis), optional ? ~ ! confidence dots + calibration payoff view (020-B), voicing lean flow: kill the 3-way toggle for add/drop nudges (022-A) |
| Counting-Hint Grammar & Inversions | references/counting-hint-grammar.md | Shared tone-chip + fill/outline gap-chip grammar for shape/semitone count (name-it feedback 021-A), escalating optional hint ladder unblocking the earn-the-symbol progression with 1-octave beginner keyboard (024-A), new inversion drill one-at-a-time with bass ring + hint graft (023-B) |

## Theme

The winning theme file is at `sources/themes/default.css` (mirrors src/app.css tokens; adds proposed `--color-wrong` / `--color-wrong-deep` grays).

## Source Files

Original sketch HTML files are preserved in `sources/` for complete reference.
</findings_index>

<metadata>
## Processed Sketches

- 001-merged-feedback-keyboard
- 002-scale-tonic-anchored
- 003-interval-distance-badge
- 004-scale-drill-ascending
- 005-interval-scaffold
- 006-interval-song-hooks
- 007-beginner-onramp
- 008-keyboard-everywhere
- 009-hear-the-chord
- 010-chord-explainer
- 011-your-songs-chords
- 012-interactive-theory
- 013-french-fit-test
- 014-mobile-review-flow
- 015-icon-tab-bar
- 016-lookup-why-panel
- 017-progression-drill
- 019-shell-voicings
- 020-confidence-calibration
- 021-shape-pattern-chips
- 022-voicing-lean-flow
- 023-inversion-drill
- 024-progression-scaffold
</metadata>
