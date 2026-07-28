# Phase 35: Inversions — New Drill Family - Context

**Gathered:** 2026-07-27
**Status:** Ready for planning
**Mode:** Autonomous smart-discuss (grey areas auto-accepted from locked design docs — sketch 023-B + counting-hint-grammar.md §023 + 024-A hint graft; user away, decisions recorded for review)

<domain>
## Phase Boundary

A NEW drill family: drill a chord in a named inversion (root / 1st / 2nd / 3rd) with the
correct bass note. Graded by chroma set plus the required bass (never letter strings). Role
colors stay fixed across inversions — only the note order changes ("same 4 notes, different
bass"). An escalating optional hint ladder (bass note → stack order from the bass → ghost keys)
guides a beginner and fades as the FSRS card matures. The drill joins the Practice hybrid queue
as its own FSRS-scheduled family alongside the existing five.

Delivers INV-01 (inversion drill + chroma+bass grading), INV-02 (fading hint ladder), INV-03
(own family in the hybrid queue). HIGHEST-RISK phase — a net-new family.

**HARD CONSTRAINTS (locked):** reuse the existing `PianoKeyboard`, `composePracticeQueue`, and
FSRS card infra. Do NOT introduce a new scheduler. Do NOT introduce a data-schema migration
(no Dexie version bump). Derive the inversion note-rotation from existing `tonal` data. Grade
by chroma + required bass, never letter strings.

**Explicitly NOT in this phase:** cold-session queue ordering so a scaffold-heavy inversion item
never leads a cold session — that is QUEUE-01, Phase 36, which reorders the SAME
`composePracticeQueue` this phase extends. Land the family here; Phase 36 tunes ordering.
</domain>

<decisions>
## Implementation Decisions

### Inversion drill mechanics (INV-01)
- One inversion at a time (sketch 023 winner B — fits the existing one-item hybrid queue), NOT the 4-up ladder (A) or slot-shift (C).
- Prompt names the chord + the target inversion + which chord tone is in the bass (e.g. "Cm7 — 2e renversement, quinte a la basse"). The chord symbol may be shown (this is not an earn-the-symbol drill; it teaches bass position of a known chord).
- Inversions drilled: root / 1st / 2nd / 3rd for seventh chords; root / 1st / 2nd for triads. Draw the chord pool from the app's existing v1 quality matrix / fact catalog — do NOT introduce new chord symbols.
- Grading: the played chroma set matches the chord's chroma AND the designated bass pitch-class is the lowest played note. Chroma/MIDI only, never letter strings (locked v2 constraint). Reuse the existing `matchChord` chroma-set path; add a bass-note check.
- Bass-note emphasis on the keyboard: ink ring + "B" badge (counting-hint-grammar.md `.bass-ring` / `.bass-badge`). Role colors (root vermilion / third verdigris / fifth tan / seventh mustard) stay fixed across all inversions — only the order changes.

### Hint ladder (INV-02)
- Escalating optional ladder, richest last (010-A pattern), mirroring the inline HintLadder approach established in Phase 34 (do NOT extend the shared HintLadder component if its LayerKind union does not fit — reuse the interaction/CSS grammar inline, per the Phase 34 precedent).
- Rungs, in order: (1) the bass note; (2) the stack order from the bass (which chord tones stack up from that bass, using the CountingChipRow counting grammar where it applies); (3) ghost-hatched keys on the keyboard (shared `.ghost` treatment).
- Fades as the FSRS card matures (fold-into-deepest-rung / fading-scaffold, locked 005/010). Reuse the existing maturity-signal precedent (the same `voicingStageForChord`-style per-card read used by ShellVoicingDrill and Phase 34) — do NOT invent a new maturity metric.

### FSRS family + queue integration (INV-03) — LOAD-BEARING, planner to finalize
- Add `'inversion'` to the `PracticeFamily` union in `src/lib/practice/practiceQueue.ts`; extend `composePracticeQueue` so the inversion family interleaves like the others.
- Represent inversion cards on the EXISTING card store with NO Dexie schema migration. Preferred approach (planner confirms): a new additive `FactKind` value (e.g. `'chord-inversion'`) in `src/lib/srs/facts.ts` — a new string value in the union is additive to the fact catalog, not a stored-schema version bump — with a stable, derivable `factId` (chord symbol + inversion index). If a chord-formula card with an inversion parameter/mode is cleaner and avoids a new FactKind, that is acceptable — the binding rule is "no schema migration, stable factId, own schedulable family."
- REG binding: the existing five families' scheduling, grading, and telemetry stay byte-for-byte unaffected. Preserve interleaving, the single-type-due gate, and song-filter steering exactly as they are today.

### Copy + scope
- French drill copy (inversion names: "fondamentale / 1er / 2e / 3e renversement"; bass-position phrasing); reuse existing i18n domain patterns; abbreviate per the 013 fit rule; no em dashes (project rule).
- Scope: a new drill component (e.g. `InversionDrill.svelte`), its facts/family wiring, the `composePracticeQueue` extension, i18n, and tests. Reuse `PianoKeyboard` (bass ring/badge + `ghostKeys`), `CountingChipRow`, the Phase 34 inline hint-ladder pattern, and the FSRS `deck`/`scheduler` seam.

### Claude's Discretion (planner finalizes)
- Exact FactKind-vs-mode representation for inversion cards (constraint: no schema migration, stable factId, own family).
- Exact bass-note grading predicate shape (lowest-played-chroma == designated bass chroma) and how it composes with `matchChord`.
- Exact rung→maturity thresholds (reuse existing) and French abbreviations under the fit rule.
- Whether the inversion family is FSRS-carded like name-it/build-it/interval, or synthetic like voicing/progression — pick whichever preserves REG for the existing five and gives inversions a real schedulable presence per INV-03.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/practice/practiceQueue.ts` — `PracticeFamily = 'name-it'|'build-it'|'interval'|'voicing'|'progression'` (add `'inversion'`); `CardedFamily`; `composePracticeQueue()` (the composer Phase 36 reorders — do not race it); `familiesInQueue()`.
- `src/lib/srs/facts.ts` — `FactKind = 'chord-formula'|'interval-size'|'scale-degree'|'scale-formula'`; fact catalog + `factById`. `src/lib/srs/deck.ts` (card store, Zod-validated reads) and `scheduler.ts` (single fsrs instance) are the FSRS seam.
- `src/lib/components/PianoKeyboard.svelte` — reuse; add/confirm bass ring + "B" badge treatment; `ghostKeys` prop already shipped (Phase 25).
- `src/lib/components/CountingChipRow.svelte` (Phase 32) — the stack-order counting grammar rung.
- `src/lib/components/ProgressionDrill.svelte` (Phase 34) — the inline escalating hint-ladder precedent (offeredRungs / hintDepth / revealHint) + the maturity-read pattern to mirror.
- `src/lib/practice/shellVoicing.ts` `voicingStageForChord` — the per-card maturity-read precedent.
- `matchChord` (chroma-set grading, octave-agnostic) — extend with a bass check, do not duplicate chroma logic.

### Established Patterns
- Grade by chroma/MIDI, never letter strings; ear-naming multiple-choice never gates (locked v2).
- Inversion note-rotation derives from `tonal` chord data (no new theory source).
- French copy via i18n domain files; no em dashes.

### Integration Points
- The inversion drill must run BOTH standalone and inside the Practice hybrid queue (embed seam), like ShellVoicingDrill / ProgressionDrill. INV-03 wires it into `composePracticeQueue` + the `/practice` host.
</code_context>

<specifics>
## Specific Ideas

- Design source: sketch 023-inversion-drill (winner B, play-it prompt) grafted with sketch 024-A's escalating hint ladder, synthesized in `.claude/skills/sketch-findings-music-learn/references/counting-hint-grammar.md` §023.
- Bass CSS: `.bass-ring { outline: 3px solid var(--color-ink); }` + `.bass-badge` (mono "B"). Role colors fixed across inversions is the whole teaching point ("same notes, different bass").
</specifics>

<deferred>
## Deferred Ideas

- Cold-session queue ordering so the inversion (or progression) family never leads a cold low-mastery session — QUEUE-01, Phase 36 (reorders the same `composePracticeQueue` extended here).
- Inversion practice for the lookup companion / voicing "Voir" stage — future requirement, out of this milestone.
</deferred>
