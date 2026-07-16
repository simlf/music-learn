# Phase 16: Hear the Chord - Context

**Gathered:** 2026-07-16
**Status:** Ready for planning

<domain>
## Phase Boundary

When a BUILD (formula→build) answer is revealed, the correct chord sounds automatically via the existing `playChord` engine, with a visual pulse on the lit keys and the serif chord glyph synced to the strike, so audio memory forms. With sound off, the reveal still pulses visually (never a silent dead-end). An optional "study" arpeggio playback (roll root→3rd→5th→7th, each key lighting as it sounds, then the block chord) is available behind a toggle. A "Hear again" control replays on demand.

**Scope anchor:** `BuildSession.svelte` `complete` state only. RecallSession reveals already play a chord — out of scope. No changes to the picker/construction flow, no new drill modes.

</domain>

<decisions>
## Implementation Decisions

### A. Pulse + glyph on reveal
- **D-01:** Add the serif `ChordGlyph` to the `complete` block (it is NOT rendered there today — glyph only appears during picking at `BuildSession.svelte:623`). The reveal must show glyph + lit keys together so both can pulse, matching the locked house reference (serif glyph + stamp-in).
- **D-02:** Entrance animation stays the existing `stamp-in` (loved reveal). The PULSE is a SEPARATE one-shot animation (~200ms scale/opacity) on the lit keys + glyph, fired in the same tick as `playChord`, on transition to `sessionState === 'complete'`. Keep pulse distinct from stamp-in so it reads as "the sound of this symbol" and does not fight the stamp-in entrance (explicit sketch 009 warning).
- **D-03:** Pulse and audio strike fire together (same tick / transition) so visual and audio are synced.

### B. Study-mode toggle
- **D-04:** Study mode is a GLOBAL setting persisted to localStorage, sibling to the existing sound toggle, surfaced on `/progress`. It is a learning-stage preference (not a per-card decision), and this matches the app's single-toggle pattern (exactly one sound toggle already lives on /progress).
- **D-05:** Study ON → reveal rolls the arpeggio (root→3rd→5th→7th, each key lights as its note sounds) then strikes the block chord + pulse. Study OFF → plain block auto-play + single pulse. Study mode REPLACES the plain auto-play; it is not a second simultaneous control.
- **D-06:** New audio helper `playArpeggio(notes, { staggerMs })` in `src/lib/audio/audio.ts`. Stagger ≈ 260ms/note (≈1.3s total for a 4-note chord, per sketch 009). Per-key lighting synced to each note via JS timers.
- **D-07:** With sound OFF, do the single visual pulse only — regardless of study toggle. No silent fake-roll (no sequential key-lighting without audio). Keeps the sound-off path simple and honest.

### C. Hear-again control
- **D-08:** Ghost `Button` in the existing complete-block action row, placed BEFORE Next / Build Another. Label: `Hear again` (plain copy, no em dash — see [[avoid-em-dashes-in-app-copy]]).
- **D-09:** "Hear again" honors study mode: replays the arpeggio roll + block when study is on, else the block chord. Always re-fires the pulse.
- **D-10:** With sound off, "Hear again" still re-pulses visually. Never disabled, never a dead control.

### D. Sound-off fallback
- **D-11:** Pure silent visual pulse. No inline "sound is off" hint or enable-sound nudge on the reveal. The single sound toggle on /progress is the one place to manage it; an inline nudge is clutter/scope creep. The pulse itself signals the reveal is working.

### Claude's Discretion
- Exact pulse curve/duration (~200ms) and easing, arpeggio stagger fine-tuning (~260ms), and whether the glyph pulse and key pulse share one keyframe or two — tune during implementation for the "sound of this symbol" feel. User expressed no preference on the specifics beyond the decisions above.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase spec + requirements
- `.planning/ROADMAP.md` §"Phase 16: Hear the Chord" — goal, success criteria, dependencies (Phase 12 reveal, Phase 15 keyboard).
- `.planning/REQUIREMENTS.md` — HEAR-01 (auto-play + pulse + Hear again), HEAR-02 (sound-off pulse + study-mode arpeggio toggle).

### Design reference (winner)
- `.planning/sketches/009-hear-the-chord/README.md` — winner Variant A (auto-play + synced pulse); Variant C arpeggio kept as the study option. Documents the sound-off fallback requirement and the "pulse must not fight stamp-in" warning.
- `.planning/sketches/009-hear-the-chord/index.html` — visual reference for the pulse and roll timing.

### Locked house reference
- Serif `ChordGlyph` + `stamp-in` reveal — reuse for every chord reveal (memory: loved-lookup-glyph-and-stamp-in).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/audio/audio.ts` — `playChord(notes, opts)` (respects `soundEnabled()`), `playNote`, `noteOn/noteOff`, `soundEnabled()` / `setSoundEnabled()`, `ensureAudioReady()`. Reuse `playChord` for the block strike; add `playArpeggio` alongside for study mode.
- `src/lib/components/ChordGlyph.svelte` — serif display glyph, already used in the picker; render it in the complete block.
- `src/lib/components/PianoKeyboard.svelte` — renders `construction.earnedNotes` with lit keys in the complete block (`BuildSession.svelte:739`); the pulse and per-key study-mode lighting attach here.
- `src/lib/components/Button.svelte` — ghost variant for the "Hear again" control.

### Established Patterns
- Exactly ONE sound toggle app-wide, on `/progress` (see `KeyboardDock.svelte:22` scope note). Study-mode toggle should follow the same single-place pattern, not a per-reveal control.
- `soundEnabled()` persists to localStorage; mirror this for a `studyModeEnabled()` / `setStudyModeEnabled()` pair.
- Sound-gated audio: every `play*` function early-returns when `!soundEnabled()`. The visual pulse must live OUTSIDE that gate so it always runs.

### Integration Points
- Reveal moment = transition into the `{:else if sessionState === 'complete' && construction}` block in `BuildSession.svelte:722`. Auto-play + pulse fire on that transition (guard against re-fire on re-render).
- The complete block currently renders formula strip + `PianoKeyboard` + action buttons; it needs the `ChordGlyph` added and the "Hear again" button inserted into the action row.

</code_context>

<specifics>
## Specific Ideas

- Sketch 009 Variant A is the exact target: "the instant the answer stamps in, playChord fires and the four lit keys plus the serif glyph pulse once in time with the strike." Variant C's roll is the study option.
- Arpeggio order and colors: root→3rd→5th→7th, each key lights in its interval color as it sounds, then all keys pulse on the block strike (sketch 009 Variant C).

</specifics>

<deferred>
## Deferred Ideas

- Extending auto-play/pulse to RecallSession reveals in a unified reveal component — out of scope for Phase 16 (Recall already plays a chord). Note for a future consolidation phase if the two reveals should share code.

None else — discussion stayed within phase scope.

</deferred>

---

*Phase: 16-Hear the Chord*
*Context gathered: 2026-07-16*
