# Spike Conventions

Patterns and stack choices established across spike sessions. New spikes follow these unless the question requires otherwise.

## Stack

- **Standalone demo = single `index.html`.** Throwaway spikes are one self-contained HTML file, not a SvelteKit route. The user opens it and feels the idea in seconds. (006, 007, 008, 009.)
- **Theory engine: `tonal@6.4.3` imported from `https://esm.sh/tonal@6.4.3`.** Same version the app pins, so findings transfer. Scheduling spikes add `https://esm.sh/ts-fsrs@5.4.1`.
- **Sound: bare WebAudio oscillator (or a tiny Tone beep).** No sample loading in a spike. The real app has the sampled-piano engine (audio.ts); a spike only needs "a note happened."

## Structure

- One dir per spike: `.planning/spikes/NNN-descriptive-name/` holding `index.html` + `README.md`.
- README carries YAML frontmatter (spike, name, type, validates, verdict, related, tags) and sections: What This Validates, Research, How to Run, What to Expect, Investigation Trail, Results.
- **Preview via `.claude/launch.json`:** one entry per spike, `npx -y serve <dir> -l <port>`, ports `48NN` (spike006 -> 4806 ...). Serve statically so esm.sh module imports resolve (file:// blocks them in some browsers).

## Patterns

- **Grade notes by chroma/MIDI, never by letter string.** Load-bearing decision proven independently by 006/007/008: enharmonic-blind matching is the only thing that handles Bb vs A#, Gb major's Cb, and double-flats (Cdim7's Bdoubleflat on the white A key). Compare pitch class; render tonal's own spelling for display.
- **Consecutive intervals, not root-relative, when teaching construction.** tonal gives root-relative (`1P 3m 5P 7m`); "stack a minor 3rd" needs `Interval.distance` between adjacent notes.
- **Ear/notes -> symbol is multiple-choice only.** `Chord.detect` leaks inversions/enharmonics, so never free-text grade it; offer same-root distractors.
- Copy is em-dash-free (existing project rule).

## Tools & Libraries

- `tonal@6.4.3` (esm.sh) — chord/scale/interval spelling. `Chord.get`, `Scale.get`, `Interval.distance`, `Note.midi`, `Chord.detect`.
- `ts-fsrs@5.4.1` (esm.sh) — spaced repetition. Config `enable_short_term: false` for day-scale review; rehydrate `Date` fields after storage round-trip.
- WebAudio `OscillatorNode` — spike-grade sound, zero deps.
