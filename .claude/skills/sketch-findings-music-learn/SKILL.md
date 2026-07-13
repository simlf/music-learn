---
name: sketch-findings-music-learn
description: Validated design decisions, CSS patterns, and visual direction from sketch experiments. Auto-loaded during UI implementation on music-learn.
---

<context>
## Project: music-learn

Print Shop identity (locked by 01-UI-SPEC): letterpress paper/ink palette, zero radius, mono status register, interval color language (root vermilion, third verdigris, fifth tan, seventh mustard) reserved for revealed/correct notes, ink-hatch for selected/pending keys. Sketches explore drill surfaces within that contract, phone-first per Phase 9.

Reference points: the app itself (src/routes/drills, PianoKeyboard.svelte) — sketches evolve existing surfaces.

Sketch sessions wrapped: 2026-07-13
</context>

<design_direction>
## Overall Direction

Wrong-answer drill feedback collapses to ONE keyboard that transforms in place: interval colors stamp the correct chord, the user's wrong extras go gray with ✕ tags. Simplest read wins over richer diff grammars. All treatments must survive the one-octave phone keyboard (Phase 9 responsive-octaves rule) and reuse the existing stamp-in beat.
</design_direction>

<findings_index>
## Design Areas

| Area | Reference | Key Decision |
|------|-----------|--------------|
| Drill Feedback | references/drill-feedback.md | Merged in-place feedback keyboard: interval colors for the chord, gray + ✕ for extras, no played-vs-missed distinction |

## Theme

The winning theme file is at `sources/themes/default.css` (mirrors src/app.css tokens; adds proposed `--color-wrong` / `--color-wrong-deep` grays).

## Source Files

Original sketch HTML files are preserved in `sources/` for complete reference.
</findings_index>

<metadata>
## Processed Sketches

- 001-merged-feedback-keyboard
</metadata>
