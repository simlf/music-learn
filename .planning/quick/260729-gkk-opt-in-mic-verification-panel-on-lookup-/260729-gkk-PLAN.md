---
quick_id: 260729-gkk
status: in-progress
---

# Quick Task 260729-gkk: Opt-in mic verification panel on Lookup page

Spec already fully provided by the dispatching session (see the task's own
system prompt for the complete brief). This file records the concrete
design decisions made while porting Spike 025 into the app, for GSD state
continuity.

## Scope

Opt-in "check it on your piano" panel on `src/routes/+page.svelte`, shown
after a recognized, non-slash-chord lookup. No drill/grading/FSRS wiring.

## New files

- `src/lib/audio/chromaDetector.ts` — pure DSP, ported from
  `.planning/spikes/025-mic-chord-detection/harness/detect.mjs` and its
  inlined `index.html` copy (constant-Q kernels, harmonic-sum salience with
  the Salamander-measured partial profile, matching-pursuit cancellation,
  chroma fold, frame-accept decision, stability/latch tracker). No DOM, no
  AudioContext: fully unit-testable with synthesized signals.
- `src/lib/audio/micInput.ts` — thin getUserMedia/AnalyserNode/rAF plumbing
  feeding chromaDetector.ts. Feature-detection, teardown, error mapping.
- `src/lib/components/MicCheckPanel.svelte` — the panel itself: start/stop
  affordance, live per-frame status, app-audio gating, fifth-honesty copy.
- Test files for all three, plus `tests/e2e/mic-check.spec.ts`.

## Key design decisions

1. **The fifth is a "don't care" chroma, not a required or forbidden one.**
   `buildChromaTarget()` inspects each `SpelledNote` tagged `role: 'fifth'`
   and excludes it from both the required-present and unexpected-extra sets
   ONLY when it is a perfect fifth (root chroma + 7 semitones exactly) — a
   diminished or augmented fifth is NOT excluded, since only the perfect
   fifth is physically unverifiable (it is the root's own 3rd partial). UI
   copy states this plainly rather than silently relaxing grading.

2. **App-audio gating lives in `audio.ts`** as a new `isAppAudioActive()`
   export, backed by a conservative time-window (`markAudioBusyFor`) set on
   every `playNote`/`playChord`/`playArpeggio` call, plus `heldNotes.length >
   0` and `activeLoop !== null` for held notes and the comping loop. Not
   tempo-exact by design (Tone.js duration strings need a live Transport to
   convert precisely); the windows are chosen comfortably longer than any
   real playback + release tail. `MicCheckPanel` polls this every frame and
   suppresses evaluation (resets the stability tracker) while true.

3. **Inversions/slash chords are out of scope**, matching the existing
   `!result.bass` gate already used for "Drill it" in `+page.svelte` — the
   mic panel reuses that same condition rather than inventing new copy about
   bass verification.

4. **Capture uses `AnalyserNode` (fftSize 32768) + rAF**, matching the
   spike's own verified `index.html` reference implementation exactly
   (not an AudioWorklet), since porting faithfully was prioritized over the
   README's "recommended production shape" aside, and this is a first,
   deliberately low-risk slice.

5. **Grading reuses `matchChord.ts`'s chroma-set-equality philosophy**
   (never letter strings), extended with the ignore-set concept above.

## Verification

- `npx vitest run` — baseline measured before changes, compared after.
- `npm run check`, `npm run build`, `npm run test:e2e`.
- PR opened, CI polled to green, then squash-merged.
