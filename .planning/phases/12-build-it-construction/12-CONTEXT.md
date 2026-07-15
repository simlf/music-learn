# Phase 12: Build-it Construction - Context

**Gathered:** 2026-07-15
**Status:** Ready for planning
**Mode:** Autonomous smart-discuss (overnight run). Decisions resolved from the spike-findings construction-mode blueprint (spike 007) + v2.0 PROJECT decisions. User delegated all choices.

<domain>
## Phase Boundary

The learner earns each note by stacking one interval at a time on a keyboard, deriving chords and scales from their formula instead of reading a finished note list. Construction accuracy feeds the memorization engine (Phase 11) as the formula-build mode of a fact. This is the "generation effect made physical" and sits UPSTREAM of recall drilling in the learning flow.

In scope (BUILD-01..04):
1. **BUILD-01:** Build a chord from its symbol by tapping notes one interval at a time (stack a minor 3rd, then a major 3rd...), earning each note.
2. **BUILD-02:** Build a major scale the same way, following its whole/half step pattern, closing on the octave.
3. **BUILD-03:** Each step shows a plain-English interval instruction + why that note belongs; a wrong tap gives diagnostic feedback ("2 half steps too high"), grading by pitch class while teaching the correct enharmonic spelling.
4. **BUILD-04:** Completing or missing construction steps records gradeable events into the memorization engine as that fact's formula-build mode.

Explicitly NOT in scope: multi-modal recall drill surfaces (Phase 13); MIDI input (deferred). Reuses the Phase 11 FSRS deck and the existing theory engine + PianoKeyboard.
</domain>

<decisions>
## Implementation Decisions (auto-resolved from blueprint)

### Correctness + spelling (locked)
- **D-01 (match by chroma/MIDI):** Tap correctness is pitch-class equality, never letter-name comparison (letters false-negative E♭ vs D♯). Double accidentals land on white keys (B𝄫 = A key, E♯ = F key) so chroma matching is mandatory.
- **D-02 (render the target's OWN spelling):** Display the chord/scale's own spelling from `Chord.get`/`Scale.get` (Cdim7's 7th stays B𝄫, not A). Do NOT reuse the app's `intervalFromRoot` "simplest enharmonic" pick (that is inspect-mode only).
- **D-03 (consecutive-note intervals):** Instructions are the interval between CONSECUTIVE notes via `Interval.distance` (Cm7 -> stack m3, M3, m3), NOT tonal's root-relative `1P 3m 5P 7m`. Extend `interval.ts` with a shared, unit-tested `phraseStep`/consecutive-interval helper (`3m` -> "minor 3rd", `2M` -> "whole step", `2m` -> "half step") so phrasing lives in the theory engine, not trapped in a component.

### Engine shape
- **D-04 (one engine, two grammars):** Chords stack thirds; scales step W/H. Same construction loop, relabel the step (`2M` -> whole step, `2m` -> half step for scales; named interval for chords). Pure logic module (e.g. `src/lib/practice/construction.ts` or `src/lib/build/`) separate from the component, Vitest-tested against all catalog targets.
- **D-05 (ascending voicing):** Root pre-placed; each subsequent note placed at the lowest MIDI above the previous (build rises). Needs 2 octaves (7th chords + scale closing octave). All 7 catalog targets fit C4-C6.
- **D-06 (keyboard mode):** Reuse `PianoKeyboard.svelte` via a new gated `constructable` mode (sibling to `interactive`/`inspectable`), preserving the gated-prop compatibility contract. Emits taps, receives per-step target + role highlighting.

### Interaction + feedback
- **D-07 (flow):** root pre-placed -> prompt the NEXT interval only + one-line WHY -> tap -> confirm/correct -> advance -> summary states the rule + spelled result. A running formula strip fills in (`C -> m3 -> E♭ -> M3 -> ?`). Pace steps (~650ms inter-step advance) so each confirmation is seen.
- **D-08 (diagnostic wrong feedback):** "N half steps too high/low" + interval restatement (keeps the learner reasoning in interval space); a "right note, wrong octave, you are stacking UPWARD" branch. Do NOT show the full answer note list; the learner must produce it. Count-up hint is opt-in (preserve desirable difficulty).

### Integration with Phase 11
- **D-09 (feed FSRS):** Each step outcome (or per-fact construction completion) records a gradeable event into the Phase 11 deck as the fact's `formula-build` mode card. Reuse the deck/scheduler seam from Phase 11 (recordGrade over the (factId, mode='formula-build') card). Staggered mode introduction still holds (graduate A/formula-recall before piling on).

### Constraints carried (locked)
- tonal returns ASCII accidentals (`Eb`, `F#`) -> convert to glyphs via the app's `toAccidentalGlyphs`. No double-flat/double-sharp glyph token exists yet — B𝄫 rendered `B♭♭` is acceptable for v2; a `𝄫`/`𝄪` display pass is a deferred nicety.
- No em dashes in copy. Local-first. Grade by chroma never letters.
</decisions>

<code_context>
## Existing Code Insights

- `interval.ts` already has interval helpers + `toAsciiAccidentals`/`toAccidentalGlyphs`; extend it with the consecutive-interval `phraseStep` helper.
- `PianoKeyboard.svelte` has gated `interactive`/`inspectable`/(Phase 10 placement) modes; add `constructable` following the same gated-prop pattern (see Phase 03-02 and 09-04 notes on the gated contract).
- Phase 11 `src/lib/srs/deck.ts` exposes `recordGrade` over (factId, mode) cards and `facts.ts` defines factIds; the formula-build mode attaches here (mode string e.g. 'formula-build').
- `Chord.get`/`Scale.get`/`Interval.distance` from tonal are the derivation source.
- app.css interval color language for role highlighting; reuse existing IntervalChip/ChordGlyph/NoteLabel.
</code_context>

<specifics>
## Specific Ideas

- Running formula strip: `C -> m3 -> E♭ -> M3 -> G -> ...` filling left to right.
- Chords and scales share the construction loop; scale steps labelled whole/half.
- Wrong-tap distance computed in semitones via the tapped chroma vs expected chroma.
- Likely a `/build` route (or a mode within an existing practice surface) — planner + UI-SPEC decide, mirror /recall + /scales patterns.
</specifics>

<deferred>
## Deferred Ideas

- Double-accidental glyph rendering (𝄫/𝄪) pass.
- Count-up hint automation / adaptive scaffolding fade.
- MIDI construction input.
</deferred>
