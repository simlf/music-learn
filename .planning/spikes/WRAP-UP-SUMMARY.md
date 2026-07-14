# Spike Wrap-Up Summary

**Date:** 2026-07-14 (session 2, pedagogy)
**Spikes processed:** 4
**Feature areas:** Memorization engine (SRS + recall modes), "Build it" construction mode, Scale keyboard drill
**Skill output:** `./.claude/skills/spike-findings-music-learn/`

## Processed Spikes

| # | Name | Type | Verdict | Feature Area |
|---|------|------|---------|--------------|
| 006 | srs-recall-loop | build | VALIDATED | Memorization engine |
| 007 | construct-not-memorize | build | VALIDATED | Construction mode |
| 008 | scale-keyboard-drill | build | VALIDATED | Scale keyboard drill |
| 009 | recall-modes | build | VALIDATED | Memorization engine |

## Key Findings

- **Grade by chroma/MIDI, never letter string** emerged independently across 006/007/008 as the single load-bearing decision for any note-matching surface.
- **The memory model is (fact, mode).** 006's FSRS card and 009's multi-modal recall are the same object, merging the two biggest spikes into one system.
- **FSRS `enable_short_term: false`** is the config that makes a once-a-day recall app work (default gives 10-minute steps). Rehydrate Date fields after storage.
- **Scales are a dedicated drill, not the one-shot drill union.** Movable tonic-anchored keyboard replaces the confusing ladder outright; the concrete user complaint is answered.
- **Construction ("Build it") mode** teaches derivation via consecutive-note intervals for both chords and scales; place it upstream of recall drilling in the learning flow.

Learning order for the real build: Build it (007) -> scale keyboard drill (008) -> recall modes (009) -> all scheduled by SRS (006).
