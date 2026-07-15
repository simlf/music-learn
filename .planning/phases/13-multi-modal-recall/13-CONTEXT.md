# Phase 13: Multi-modal Recall - Context

**Gathered:** 2026-07-15
**Status:** Ready for planning
**Mode:** Autonomous smart-discuss (overnight run). Decisions resolved from the spike-findings blueprint (spikes 006 + 009, "Multi-modal rotation" section of memorization-engine.md) + v2.0 PROJECT decisions. User delegated all choices.

<domain>
## Phase Boundary

One fact is drilled across rotating retrieval modes on top of the Phase 11 scheduler, so each chord is encoded through multiple paths. This closes the v2.0 learning loop: the (fact, mode) card model from Phase 11 finally gets its full set of mode surfaces.

In scope (RECALL-01..03):
1. **RECALL-01:** Drill one fact across rotating modes: see the symbol then play the notes (mode A); given the formula/degrees then build it (mode C, already built in Phase 12); hear the chord then name it (mode B).
2. **RECALL-02:** Ear-based naming (mode B) is answered by multiple choice against same-root distractors and NEVER gates progress or unlocks.
3. **RECALL-03:** Modes rotate per-fact when TEACHING a new item; modes are SPACED across sessions when REVIEWING a known one.

Explicitly NOT in scope: FSRS weight optimization; new theory content. This phase wires existing pieces (deck, scheduler, construction engine, keyboard, audio, chord matcher) into a rotating multi-modal recall surface. Reuses the /recall route from Phase 11.
</domain>

<decisions>
## Implementation Decisions (auto-resolved from blueprint)

### The modes (from spike 009)
- **D-01 (mode set):** A = recognition->production (see symbol -> play notes on keyboard); the spine / core product value. C = formula->build (Phase 12 construction, now surfaced as a recall mode over the same (fact, 'formula-build') card). B = ear->naming (hear chord -> pick symbol, multiple-choice, demoted). D = notes->symbol (see highlighted notes -> pick symbol, multiple-choice, cheap reverse of A) is a nice-to-have; include if cheap, else defer.
- **D-02 (mode = card, reuse Phase 11 deck):** Each mode is its own (factId, mode) FSRS card sharing the factId. Add the needed mode strings to deck.ts's Mode union ('formula' | 'formula-build' | 'see-play' | 'hear-name' [ + 'notes-symbol' if built]). Each mode grade goes through the existing scheduler.next / deck.recordGrade seam. Do NOT break Phase 11/12 surfaces or the recall map (extend MODE_COLUMNS additively).

### Grading per mode (locked constraints)
- **D-03 (mode A see-play):** User plays the notes on the keyboard (interactive/constructable mode); grade by CHROMA set equality (reuse Phase 3 matchChord chroma logic), never letter strings. Any octave/inversion accepted for chord identity (matches Phase 3 D-01/D-02).
- **D-04 (mode B hear-name):** Play the chord via the existing audio engine (Tone.js / audio.ts), user picks the symbol from 4 multiple-choice options. Distractors share the ROOT (quality-by-ear, not root-by-ear, per blueprint: ear naming is only fair when choices share the root). NEVER gates progress or unlocks; lowest rotation weight. Reuse the drill's distractor generation (pickDistractors from Phase 3) constrained to same-root.
- **D-05 (mode D notes-symbol, if built):** Highlight notes on the keyboard, user picks the symbol (4-way MC, same-root distractors). Multiple-choice only (Chord.detect leaks inversions/enharmonics, never free-text grade).

### Rotation (RECALL-03)
- **D-06 (teach vs review):** Rotate modes per-fact back-to-back when TEACHING a new fact (A->C->D on one chord makes multi-modal encoding felt, delivers interleaving). SPACE modes per-mode across sessions when REVIEWING a known fact (back-to-back same-fact modes test working memory, not long-term recall). Stagger mode introduction so FSRS never gets four brand-new cards for one fact at once: graduate A/C first, unlock D, then B. Do NOT drill every mode of every fact every session; pick 1-2 modes per encounter targeting the fact's weakest paths.
- **D-07 (weakest-path targeting):** When a fact has multiple due mode-cards, prefer the mode with the weakest stability (surface the weak retrieval path). Ear-naming (B) always lowest priority and never blocks the session from completing.

### Integration
- **D-08 (surface):** Extend the Phase 11 /recall session to rotate modes rather than only the 'formula' reveal. The reveal-grade loop from Phase 11 generalizes: each mode supplies its own prompt, answer surface, and grade signal, then commits via the same scheduler. Mode C reuses Phase 12's BuildSession construction step; mode A reuses PianoKeyboard + matchChord; mode B reuses audio + MC.
- **D-09 (audio):** Reuse the existing audio.ts / Tone.Synth engine for mode B playback (no new sampled-piano dependency). A reveal/replay control is fine.

### Constraints carried (locked)
- Grade by chroma/MIDI, never letter strings (mode A, D). ear/notes->symbol modes are multiple-choice only. Ear-naming never gates. No em dashes. Local-first. Same-root distractors for MC.
</decisions>

<code_context>
## Existing Code Insights

- Phase 11: src/lib/srs/{scheduler,deck,facts,session}.ts — deck.recordGrade over (factId, mode) cards; RecallSession.svelte reveal-grade loop; RecallMap MODE_COLUMNS (extend additively).
- Phase 12: src/lib/practice/construction.ts + BuildSession.svelte (mode C surface + FSRS write already wired as 'formula-build').
- Phase 3: matchChord (chroma set equality), pickDistractors (near-miss/same-root distractors), interactive PianoKeyboard.
- audio.ts: Tone.js engine for note/chord playback (mode B).
- app.css tokens, existing components (ChordGlyph, IntervalChip, Button, NoteLabel).
</code_context>

<specifics>
## Specific Ideas

- The recall map (Phase 11 MEM-04) grid gains real columns per mode (see-play / formula-build / hear-name), making multi-path encoding legible.
- Mode B: play button + 4 same-root symbol choices; correct/incorrect is informational, advances regardless (never gates).
- Rotation policy is a small pure function (teach: cluster modes of the new fact; review: pick weakest due mode-card), unit-testable.
</specifics>

<deferred>
## Deferred Ideas

- Grade-from-answer-time heuristic.
- FSRS weight optimization from the review log.
- Sampled-piano audio for mode B (Tone.Synth is enough).
- Full mode D (notes->symbol) if it proves more than a cheap add.
</deferred>
