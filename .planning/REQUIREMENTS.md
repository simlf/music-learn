# Requirements — v2.3 Beginner On-Ramp & Inversions

**Source:** v2.2 post-ship on-device UAT (PR #27). Session-7 sketches locked at `.planning/sketches/021-024`; design decisions in `.claude/skills/sketch-findings-music-learn/references/counting-hint-grammar.md`. Existing stack only — no new library, no data-schema migration.

## Milestone v2.3 Requirements

### Shape Legibility (SHAPE)

- [x] **SHAPE-01**: After a user answers a name-it (nomme cet accord) question, the chord's quality pattern is shown as role-tinted tone chips with fill/outline gap chips between them (minor third = solid ink fill, major third = outline), replacing the illegible grey mono `M7: M3·M3·M3` feedback line. Reuses the LOCKED interval color language (root vermilion, third verdigris, fifth tan, seventh mustard). (sketch 021-A)

### Voicing UX (VOICE)

- [x] **VOICE-01**: The voicing drill's always-on 3-way `Fond. · Shell · Sans fond.` toggle is removed. The player starts on the shell (the core) and reaches the full and rootless voicings via contextual add/drop controls ("+ poser la fondamentale" / "− retirer la basse"); style becomes a by-product of what is added/removed, not a mode picked. The from-memory recall grading and staged-by-card-state behavior are preserved. (sketch 022-A)

### Inversions (INV) — new drill family

- [x] **INV-01**: The user can drill a chord in a named inversion (root / 1st / 2nd / 3rd), playing the notes with the correct bass note, graded by chroma plus the required bass (never letter strings). Role colors stay fixed across inversions — only the order changes. (sketch 023-B)
- [x] **INV-02**: The inversion drill guides a beginner with an escalating, optional hint ladder (bass note → stack order from the bass → ghost keys) that fades as the FSRS card matures, following the locked fold-into-deepest-rung / fading-scaffold pattern. (sketch 023-B + 024-A graft)
- [x] **INV-03**: The inversion drill participates in the Practice hybrid queue as its own FSRS-scheduled family alongside the existing five (name-it, build-it, voicings, intervals, progressions), with no regression to their scheduling, grading, or telemetry.

### Progression Scaffold (SCAF)

- [x] **SCAF-01**: On the earn-the-symbol progression drill, a beginner can reveal an escalating, optional counting-hint ladder (degree → root note → semitone-count chips → ghost keys) without the earned chord symbol being given away; the hint fades as the card matures. (sketch 024-A)
- [x] **SCAF-02**: At beginner level the progression drill's keyboard is reduced to the tonic's one octave (fewer keys, less overwhelming) and widens to the full span as the level rises. (sketch 024-A)

### Queue Ordering (QUEUE)

- [x] **QUEUE-01**: A cold, low-mastery practice session does not lead with a scaffold-heavy progression or inversion item; the hybrid-queue composer (`composePracticeQueue`) orders simpler families first when mastery is low, so the first item is never a hard block.

### No Regression (REG)

- [x] **REG-01**: Existing drill grading (chroma/MIDI, never letter strings), FSRS scheduling, tiers, telemetry, song-filter behavior, and the multiple-choice-never-gates ear-naming rule work exactly as before; only the named surfaces change. Full suite + `svelte-check` stay green; every new surface (chip grammar, nudges, inversion family, hint ladders, queue ordering) is covered by tests.

## Out of Scope (this milestone)

- Upper-structure / altered voicings — shells and rootless remain the ceiling until fundamentals stick (carried from v2.2 out-of-scope).
- MIDI play-to-answer (Phase 4 carry-over) — needs hardware-in-the-loop.
- New theory data source or data-schema migration — all four features compute from existing `tonal` data and the existing FSRS/queue infra.
- Metronome / tempo-fluency drill (sketch 018, I-03) — stays in the improvement backlog.

## Future Requirements (deferred)

- Inversion practice for the lookup companion / voicing "Voir" stage (the shape-teaching grammar could later appear beyond name-it).
- Extending the counting-hint grammar to the Learn hub interval reference.

## Traceability

| REQ-ID | Phase |
|--------|-------|
| SHAPE-01 | Phase 32 |
| VOICE-01 | Phase 33 |
| INV-01 | Phase 35 |
| INV-02 | Phase 35 |
| INV-03 | Phase 35 |
| SCAF-01 | Phase 34 |
| SCAF-02 | Phase 34 |
| QUEUE-01 | Phase 36 |
| REG-01 | Phase 37 |
