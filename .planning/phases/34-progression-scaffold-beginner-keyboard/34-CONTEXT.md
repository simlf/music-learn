# Phase 34: Progression Scaffold & Beginner Keyboard - Context

**Gathered:** 2026-07-27
**Status:** Ready for planning
**Mode:** Autonomous smart-discuss (grey areas auto-accepted from locked design docs — sketch 024-A + counting-hint-grammar.md; user away, decisions recorded for review)

<domain>
## Phase Boundary

Add an escalating, optional counting-hint ladder and a level-scaled beginner keyboard to the
earn-the-symbol progression drill (`ProgressionDrill.svelte`). A beginner who cannot derive the
chord from the roman numeral alone can climb the ladder rung by rung to get unblocked, while the
chord symbol stays hidden (earn-the-symbol payoff preserved). At beginner level the keyboard
shows only the tonic's one octave, widening to the full span as the card/level matures.

Delivers SCAF-01 (hint ladder) and SCAF-02 (beginner keyboard span). Scoped to
`ProgressionDrill.svelte`; reuses the Phase 32 `CountingChipRow` primitive and existing
hint-ladder / ghost-key / keyboard-span infra. No new library, no data-schema migration.

**Explicitly NOT in this phase:** cold-session queue ordering so a scaffold-heavy item never
leads a cold session — that is the non-visual follow-up (QUEUE-01, Phase 36).
</domain>

<decisions>
## Implementation Decisions

### Hint ladder mechanics
- Escalating optional ladder, one "Afficher un indice" control; each tap reveals the next rung. Never always-on (024-C anti-pattern rejected: a permanent inline hint kills the earn-the-symbol payoff).
- Rungs in order, richest content last (010-A stacked-bordered-rungs pattern), per counting-hint-grammar.md §024: (1) degree → root note ("ii de Si♭ majeur → fondamentale Do"); (2) quality + count = the `CountingChipRow` (e.g. R +m3 +M3 +m3); (3) "show me" = ghost-hatched keys on the keyboard. This 3-rung structure satisfies SCAF-01's degree → root → semitone-count → ghost-keys sequence (degree+root collapse into rung 1 per the grammar doc).
- The chord symbol stays hidden through every rung. Ghost keys show where to land without naming the chord.
- Reuse `CountingChipRow` (Phase 32) as the count rung — one source of truth, do NOT author a second chip component. Ghost keys reuse the shared `.ghost` hatch treatment (SK-019 / counting-hint-grammar.md CSS).

### Fade with card maturity
- The ladder fades as the FSRS card matures (locked fold-into-deepest-rung / fading-scaffold pattern, 005/010): fewer rungs offered as stability rises; a mature card offers none.
- Reuse the existing maturity signal and thresholds the app already uses for scaffold fade (Build-it / 010 hint ladder) — do NOT invent a new maturity metric or new thresholds.

### Beginner keyboard span (SCAF-02)
- Beginner level = the tonic's one octave only (fewer keys = less overwhelming); widens to the full span (two octaves) as level rises. The full 2-octave cold span was part of what made the first item overwhelming (sketch 024).
- "Level" derives from the same maturity/mastery signal that drives the ladder fade, reusing existing keyboard-span infra (`keyboardLayout` / `octavesForWidth`) rather than a new mechanism. Anchor the one-octave window on the progression's tonic.

### Copy + scope (REG-01 binding)
- French reveal control "Afficher un indice"; rung labels reuse existing comptage / indice vocabulary; abbreviate per the 013 French fit rule on overflow. No em dashes (project copy rule).
- Scoped to `ProgressionDrill.svelte`. The earn-the-symbol grading, roman-numeral display, and progression scheduling stay byte-unchanged — only the optional ladder and beginner keyboard span are added. Every new surface covered by tests.

### Claude's Discretion
- Exact rung → maturity-threshold mapping and the exact level → octave-count boundary, provided they reuse existing infra and satisfy SCAF-01/02.
- Exact French abbreviations under the fit rule.
- Whether the ladder lives inline in `ProgressionDrill.svelte` or as a small extracted `HintLadder` helper, provided `CountingChipRow` remains the single count-rung source.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/components/ProgressionDrill.svelte` — the target (earn-the-symbol drill, sketch 017; embed seam added in Phase 27-02).
- `src/lib/components/CountingChipRow.svelte` (+ `.test.ts`) — Phase 32 role-tinted tone chips + fill/outline gap chips; the count rung reuses this verbatim.
- `src/lib/components/hintLadder.test.ts` — existing hint-ladder test surface; a hint-ladder pattern already exists in the app (010-A / Build-it "indice de comptage") to reuse.
- `src/lib/components/PianoKeyboard.svelte`, `src/lib/components/keyboardLayout.ts` — keyboard render + span geometry (`octavesForWidth`), ghost-key support (`pianoKeyboardGhost.test.ts`).

### Established Patterns
- Grade by chroma/MIDI, never letter strings; ear-naming multiple-choice never gates (locked v2 constraints).
- Ghost-hatched keys = "allowed / land here" (SK-019 subtract treatment, shared `.ghost` CSS).
- Fading scaffold keyed off FSRS card maturity (005/010); rungs fold into the deepest as stability rises.
- French copy is locale-driven via the i18n domain files; no em dashes.

### Integration Points
- ProgressionDrill is hosted both standalone and inside the Practice hybrid queue (embed seam) — the ladder/keyboard changes must survive both host contexts without regressing the queue.
</code_context>

<specifics>
## Specific Ideas

- Design source: sketch 024-progression-scaffold (winner: variant A counting-hint ladder + 1-octave beginner keyboard) and `.claude/skills/sketch-findings-music-learn/references/counting-hint-grammar.md` §024.
- The ladder reuses the exact Build-it chip language the user already knows, so the counting grammar reads as one consistent app-wide vocabulary.
</specifics>

<deferred>
## Deferred Ideas

- Cold-session queue ordering (`composePracticeQueue`) so a scaffold-heavy progression/inversion item never leads a cold low-mastery session — QUEUE-01, Phase 36 (the non-visual follow-up flagged in sketch 024).
</deferred>
