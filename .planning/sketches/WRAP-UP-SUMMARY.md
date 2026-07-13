# Sketch Wrap-Up Summary

**Date:** 2026-07-13
**Sketches processed:** 1
**Design areas:** Drill Feedback
**Skill output:** `./.claude/skills/sketch-findings-music-learn/`

## Included Sketches

| # | Name | Winner | Design Area |
|---|------|--------|-------------|
| 001 | merged-feedback-keyboard | A: Colors + Gray | Drill Feedback |

## Excluded Sketches

| # | Name | Reason |
|---|------|--------|
| — | none | — |

## Design Direction

Print Shop contract holds; drill wrong-answer feedback becomes a single in-place keyboard transform. Interval colors carry the answer, warm gray + ✕ marks the user's extra notes, no played-vs-missed distinction. Must work at one-octave phone width.

## Key Decisions

- Transform in place on Check; replaces two-keyboard layout and can subsume the text diff
- New gray tokens proposed: `--color-wrong` #b8b0a0 (white keys), `--color-wrong-deep` #8f877a (black keys)
- Legend line under the headline explains the two color meanings
- Reuse stamp-in animation; respect prefers-reduced-motion
- Rejected: hollow-missed outlines (Variant B), preserved selection hatch (Variant C)
