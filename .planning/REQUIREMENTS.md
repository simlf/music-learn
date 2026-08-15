# Requirements — v2.4 Real Piano & Real Songs

**Source:** post-v2.3 project analysis (2026-08-03) ranking the deferred Phase 4 MIDI carry-over, the reserved song play-through mode (`songs.ts` ordered `chordSymbols`), and the FSRS deck cross-device gap. One new library expected (`webmidi`); SYNC is the only feature touching the backend and a schema.

## Milestone v2.4 Requirements

### MIDI — Web MIDI play-to-answer

- [ ] **MIDI-01**: The user can connect the USB digital piano and see its connection state in the app: device detected, device disconnected, or browser unsupported (Safari/iOS). Uses `webmidi`'s device events, no polling.
- [ ] **MIDI-02**: The user can answer play-type drills (build-it, inversions, voicings, scale, see-play) by playing on the MIDI piano, graded by the exact same chroma (+ required bass where applicable) logic as on-screen taps. MIDI note-on feeds the existing grading seam; no parallel grading path.
- [ ] **MIDI-03**: The user can play a full chord (held simultaneous notes) and the app grades it as one attempt, without a separate confirm tap. Held-notes set tracking handles note-on/note-off and sustain.
- [ ] **MIDI-04**: On browsers without Web MIDI, the app works unchanged with the on-screen keyboard and shows no MIDI chrome. Progressive enhancement: feature-detect, never degrade the non-MIDI path.

### PLAY — Song play-through

- [ ] **PLAY-01**: The user can start a play-through of one of their songs from song management, drilling its chords in sheet order (FIFO, seeded through the existing one-shot seed channel into the practice session engine).
- [ ] **PLAY-02**: Repeated chords stay in the sequence (no dedupe: real tunes repeat their ii-V-Is) and the session length equals the song's drillable chord count, with no pool questions diluting the run.
- [ ] **PLAY-03**: Non-drillable symbols are normalized to the catalog when possible (via songProvenance) or skipped with a visible skipped-count; a play-through never crashes on an exotic symbol.

### SYNC — FSRS deck sync

- [ ] **SYNC-01**: The FSRS deck (cards + review state) uploads to the existing Fastify/SQLite backend so a second device can pull the same deck; phone and laptop stop diverging.
- [ ] **SYNC-02**: Practicing offline still works fully (local-first stays the law); local changes reconcile with the backend on reconnect without losing any review.
- [ ] **SYNC-03**: The same card reviewed on two devices resolves deterministically (latest-review-wins per card, by review timestamp) without corrupting FSRS scheduling state.

### No Regression (REG)

- [ ] **REG-02**: Existing drill grading (chroma/MIDI, never letter strings), FSRS scheduling, tiers, telemetry, song-filter behavior, and the multiple-choice-never-gates ear-naming rule work exactly as before; the on-screen keyboard path stays first-class everywhere. Full suite + `svelte-check` stay green; every new surface (MIDI input, play-through, deck sync) is covered by tests.

## Out of Scope (this milestone)

- Tempo fluency (latency-aware grading / metronome drill, sketch 018 / I-03) — deliberately deferred at milestone definition; stays top of backlog.
- Minor scales and minor ii-V-i templates — next-milestone candidate.
- Lead-sheet cursor UI / notation rendering — play-through rides the existing drill session, the user reads from paper.
- MIDI sound output through the app — the digital piano makes its own sound; the app only reads input.
- Real-time multi-device sync (live push) — reconcile-on-load/save is enough for one user moving between devices.

## Future Requirements (deferred)

- Tempo fluency drill or latency-weighted FSRS grading (`questionClock.ts` groundwork exists).
- Minor keys: minor scales in Learn/practice + minor progression templates (gives `ø7` its home context).
- MIDI velocity/dynamics feedback (expressive layer, far future).

## Traceability

| REQ-ID | Phase |
|--------|-------|
| MIDI-01 | Phase 38 |
| MIDI-02 | Phase 39 |
| MIDI-03 | Phase 39 |
| MIDI-04 | Phase 38 |
| PLAY-01 | Phase 40 |
| PLAY-02 | Phase 40 |
| PLAY-03 | Phase 40 |
| SYNC-01 | Phase 41 |
| SYNC-02 | Phase 42 |
| SYNC-03 | Phase 42 |
| REG-02 | Phase 43 |
