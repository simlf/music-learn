# Phase 3: On-Screen Drill Loop - Context

**Gathered:** 2026-07-13
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — user delegated all decisions to Claude, consistent with Phase 1/2 direction

<domain>
## Phase Boundary

The practice drill loop, playable entirely on the clickable on-screen keyboard, in both directions of chord fluency:

1. **Construction drill (DRILL-01):** show a chord symbol, user clicks the notes on the keyboard, any correct voicing (any inversion, any octave) is accepted.
2. **Identification drill (DRILL-02):** highlight notes on the keyboard, user names the chord symbol and is graded.
3. **Instant elaborative feedback (DRILL-03):** every answer gives immediate right/wrong; a wrong answer reveals the correct notes and the interval formula in interval colors.
4. **On-screen clickable keyboard as a fully equivalent input path (INPUT-02):** works on any browser/device, not a degraded fallback.

In scope: a `/drills` page, an interactive (clickable/selectable) keyboard input mode, a pure chord-answer matcher, both drill directions interleaved, in-session-only scoring.
Explicitly NOT in scope: MIDI input (Phase 4), session scoping / blocked-vs-interleaved controls / label fading (Phase 5, DRILL-04/05/06), scales (Phase 6), persistence / streaks / weak-item stats across sessions (Phase 8). In-session score is in-memory only and resets on reload.
</domain>

<decisions>
## Implementation Decisions

### Chord-answer matching tolerance (resolves the STATE research flag)
- **D-01 (matching rule):** A construction answer is correct when the SET of distinct pitch classes played equals the set of the target chord's pitch classes. Octave and inversion are ignored (compare by pitch-class / chroma, not by MIDI number or key index). This directly satisfies success criterion 1 ("any inversion or octave accepted").
- **D-02 (extra/missing notes):** Exact set equality. Extra notes make the answer wrong (an added note changes the chord); missing notes make it wrong (incomplete). No partial credit in v1. Enharmonic equivalence is handled at the pitch-class level (a played C♯ key and a required D♭ are the same chroma and match), because the keyboard produces chroma, not spelled letters.
- **D-03 (matcher is a pure function over pitch-class sets):** The matcher takes a set of pitch classes (numbers 0-11) and the target chord and returns correct/incorrect plus the diff (missing, extra). It must NOT couple to the click UI, so Phase 4 (MIDI) feeds the identical matcher from note-on events. This is the INPUT-03 "identical matching logic" foundation, built now, consumed by Phase 4.

### Drill interaction model
- **D-04 (construction answer submission):** Explicit "Check" button. The user toggles keys on/off freely, then presses Check. No auto-grading the instant the selected-count matches (that would grade mid-thought). A "Clear" affordance resets the selection.
- **D-05 (identification answer format):** Multiple choice, 4 options (the correct symbol plus 3 plausible distractors drawn from the same 12-root x 8-quality matrix, e.g. same root different quality, or same quality different root). Rationale: deterministic grading without wrestling alias/enharmonic spelling in a typed answer, faster on mobile, and recognition-first scaffolding suits a returning beginner. Free-type identification (reusing the lookup parser to normalize+compare) is noted as a deferred enhancement, not v1.
- **D-06 (question source + interleaving):** Questions are drawn from the proven 12-root x 8-quality matrix via the existing `randomChord`. Both drill directions are interleaved (each question is randomly a construction or identification prompt). This honors the interleaving philosophy without building Phase 5's scoping/blocking controls. No difficulty ramp in v1.
- **D-07 (session flow):** A continuous practice loop: one question at a time, answer, see feedback, advance to the next. Endless (no fixed length); the user leaves when done. A "Next" action appears after each answer (auto-advance is NOT used, so the user controls pacing and can study the wrong-answer feedback).

### Feedback design (DRILL-03)
- **D-08 (right answer):** Reuse the Phase 1 stamp success beat as the reward. Brief, warm, no scolding. Keep the shop voice (D-02..D-05 from Phase 1); no em dashes in copy.
- **D-09 (wrong answer, elaborative):** Reveal the correct notes highlighted on the keyboard in interval colors AND the interval-formula readout (R/3rd/5th/7th chips with dual letter+solfège naming), reusing `chordPresentation.formulaFor`, `PianoKeyboard`, and `IntervalChip`. For construction drills, also show what the user played vs. what was correct (missing/extra) so the miss is legible. This is the "teach when wrong" requirement.
- **D-10 (in-session score):** A simple running tally for the current session (e.g., correct count and a current-streak counter) shown unobtrusively in the shop's mono status register. In-memory only; resets on reload. No cross-session persistence, no per-chord weakness stats (both Phase 8).

### Interactive keyboard (INPUT-02)
- **D-11:** Extend the existing `PianoKeyboard` to support an interactive/selectable mode: keys become clickable, clicking toggles a selected state, selected keys show a distinct "pending answer" treatment (NOT the interval colors, which are reserved for revealed/correct notes). The read-only display mode used by lookup (Phase 2) must remain unchanged. Prefer a mode prop or a thin wrapper over duplicating the layout math. Touch targets and mobile usability per the Phase 1/2 UI-SPEC (keys are already ≥ the interactive minimum in practice; confirm on mobile).
- **D-12:** The keyboard's click output is pitch classes fed to the D-03 matcher, keeping the answer path source-agnostic for Phase 4.

### Routing & nav
- **D-13:** Add a "Drills" link to the masthead nav (after Lookup, before Showcase). Drill page lives at `/drills`. Masthead pattern is already established in Phase 2's `+layout.svelte`.

### Claude's Discretion
- Exact drill-page layout and copy (within Phase 1 voice rules, no em dashes).
- Distractor-generation strategy for identification multiple-choice (must be plausible and always parseable; avoid a distractor that is enharmonically identical to the answer).
- Whether construction and identification share one page with mixed questions or a segmented control; default to a single interleaved loop per D-06.
- Exact visual treatment of "pending/selected" keys vs revealed correct keys (must be visually distinct from the interval-color language).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/phases/01-print-shop-foundation-theory-core/01-UI-SPEC.md` — locked visual/token/interval-color contract; feedback UI must reuse it.
- `.planning/phases/02-chord-lookup-companion/02-UI-SPEC.md` — masthead/nav pattern, 44px touch targets, copy register (extend, do not contradict).
- `.planning/phases/01-print-shop-foundation-theory-core/01-CONTEXT.md` — D-01..D-12 tone/motion/feedback decisions carried app-wide.
- `.planning/REQUIREMENTS.md` — DRILL-01, DRILL-02, DRILL-03, INPUT-02 (this phase); INPUT-01/INPUT-03 (Phase 4) depend on the source-agnostic matcher built here; DRILL-04/05/06 (Phase 5) build on this loop.
- `.planning/ROADMAP.md` — Phase 3 goal + 4 success criteria.
- `src/lib/components/PianoKeyboard.svelte` — the keyboard to extend with an interactive mode (currently display-only, uses `$derived` note assignment).
- `src/lib/lookup/chordPresentation.ts` — `formulaFor`/`aliasLine` reused for wrong-answer feedback.
- `src/lib/theory/randomChord.ts` — `randomChord`, `ROOTS`, `QUALITY_SUFFIXES` (question + distractor source).
- `src/lib/theory/chord.ts` — `spellChord` (target chord notes for matching; source of truth for pitch classes).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PianoKeyboard.svelte` — layout math + interval-colored highlighting; extend for clickable selection.
- `chordPresentation.ts` (`formulaFor`, `aliasLine`), `IntervalChip.svelte`, `NoteLabel.svelte`, `ChordGlyph.svelte`, `Button.svelte` — feedback UI building blocks.
- `randomChord.ts` (proven 12x8 matrix), `chord.ts` (`spellChord`), `solfege.ts` — question generation + correct-answer derivation.
- `+layout.svelte` masthead — add the Drills nav link here.
- `src/app.css` — Print Shop token contract; add a "selected/pending key" token distinct from interval colors if needed.

### Established Patterns
- Pure, framework-free `$lib/theory` + `$lib/lookup` modules with co-located Vitest tests; Svelte 5 runes (`$state`, `$derived`) for component/page state.
- Non-blocking, warm-voice feedback; no em dashes in app copy; exact-pinned deps.
- Chord identity is pitch-class based; the keyboard emits chroma, `spellChord` gives spelled letters for display and pitch classes for matching.

### Integration Points
- New route `src/routes/+page`-style page at `src/routes/drills/+page.svelte`.
- New pure matcher module (e.g. `src/lib/drills/matchChord.ts`) consumed by the drill page now and by Phase 4 MIDI later.
- `PianoKeyboard` interactive mode is the shared input surface for INPUT-02 (click) and INPUT-01 (MIDI, Phase 4).

</code_context>

<specifics>
## Specific Ideas

- The wrong-answer screen is the teaching moment: it should make the correct shape obvious in interval colors, not just say "wrong."
- Keep the loop zero-friction: land on `/drills`, a question is already there, answer, learn, next. No setup screen (that is Phase 5's scoping).
- Build the matcher as a pure pitch-class-set function from day one so Phase 4 MIDI is a thin adapter, not a reimplementation.

</specifics>

<deferred>
## Deferred Ideas

- **Free-type identification answers** (parse + normalize + compare via `spellChord`) — v1 uses multiple choice; revisit if recall-not-recognition is wanted.
- **Session scoping, blocked-vs-interleaved controls, label-fading scaffolds** — Phase 5 (DRILL-04/05/06).
- **Cross-session persistence, weak-item weighting, streak counter that survives reload** — Phase 8 (PROG-01/02/03).
- **Partial-credit / near-miss scoring** — v1 is exact set equality; not planned.

</deferred>

---

*Phase: 3-on-screen-drill-loop*
*Context gathered: 2026-07-13*
