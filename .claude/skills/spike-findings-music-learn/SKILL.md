---
name: spike-findings-music-learn
description: Implementation blueprint from pedagogy spike experiments (006-009). Requirements, proven patterns, and verified knowledge for building the memorization engine, "Build it" construction mode, and scale keyboard drill in music-learn. Auto-loaded during implementation work.
---

<context>
## Project: music-learn

Jazz-piano theory companion for a returning classical pianist (strong reading/motor skills, beginner theory). Core value: chord-symbol fluency. Session 2 spikes explored how to make theory STICK: real spaced repetition, formula-driven construction, multi-modal recall, and a fix for the confusing /scales practice.

Spike sessions wrapped: 2026-07-14 (session 2, pedagogy).
</context>

<requirements>
## Requirements (locked by spiking, non-negotiable)

- **Grade notes by chroma/MIDI, never by letter string.** Enharmonic-blind matching is mandatory (Bb vs A#, Gb major's Cb, Cdim7's B𝄫 on the white A key). Compare pitch class; render tonal's own spelling. Hit independently by 006/007/008.
- **SRS card unit = (fact, mode), not fact.** Multi-modal encoding (009) IS the FSRS card model. Cm7|see-play, Cm7|hear-name, Cm7|formula-build are separate cards sharing a factId.
- **FSRS config `enable_short_term: false`.** Default true gives ~10min learning steps and breaks day-scale daily review. Rehydrate Date fields after storage round-trip (they silently become strings).
- **Scales stay a DEDICATED drill, NOT the one-shot DrillQuestion union.** Ordered multi-tap sequence. Reuse drill chrome, extend scaleDrill.ts. Movable tonic-anchored keyboard replaces the confusing ladder (no toggle).
- **"Build it" construction mode teaches WHY** via consecutive-note intervals (stack m3/M3, or W/H for scales), not root-relative. Enharmonic collision is a teaching moment. Needs 2 octaves. Upstream of recall drilling.
- **Ear/notes -> symbol modes are multiple-choice only** (Chord.detect leaks inversions), same-root distractors, ear-naming demoted and never gates progress.
- Local-first (localStorage -> Dexie/IndexedDB), per-device v1, no server. No em dashes in copy.
</requirements>

<findings_index>
## Feature Areas

| Area | Reference | Key Finding |
|------|-----------|-------------|
| Memorization engine (SRS + recall modes) | references/memorization-engine.md | ts-fsrs with enable_short_term:false; card = (fact, mode); split scheduler.ts from Dexie storage |
| "Build it" construction mode | references/construction-mode.md | Derive from consecutive-interval formula on a keyboard; match chroma, render tonal spelling; chords + scales one engine |
| Scale keyboard drill | references/scale-drill.md | Replace confusing ladder with movable tonic-anchored keyboard; grade by MIDI; dedicated, not folded into drill engine |

## Source Files

Original spike source (README + runnable index.html) preserved in `sources/` for complete reference. Preview any via `.claude/launch.json` (spike006-009, ports 4806-4809).
</findings_index>

<metadata>
## Processed Spikes

- 006-srs-recall-loop
- 007-construct-not-memorize
- 008-scale-keyboard-drill
- 009-recall-modes
</metadata>
