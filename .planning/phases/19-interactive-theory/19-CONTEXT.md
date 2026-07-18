# Phase 19: Interactive Theory - Context

**Gathered:** 2026-07-18
**Status:** Ready for planning
**Mode:** Autonomous (smart-discuss auto-resolved from sketch 012 winner A + success criteria; user away, yolo mode)

<domain>
## Phase Boundary

A returning classical pianist with beginner theory can work through short, interactive, do-then-check lessons on a real (on-screen) keyboard, each ending with a clean handoff into the matching first drill. The worked example that ships is **major third vs minor third** (the interval that makes a chord happy vs sad) — thirds are the core of chord quality.

In scope: a guided-step lesson format (plain-English sentence + one keyboard action per step), audible interval/chord playback per step, and an explicit "Try this in a drill" handoff into the beginner course on `/drills`.

Out of scope: a full curriculum map / lesson index (sketch variant B, noted as the later container), play-first discovery (variant C), and lessons beyond the thirds lesson (the format must be extensible to add them later, but only the thirds lesson is the deliverable).
</domain>

<decisions>
## Implementation Decisions

### Lesson Format (LEARN-01)
- A lesson is a vertical sequence of small steps. Each step pairs one plain-English sentence with one DO-action on a mini keyboard (e.g. "Tap C", then "Tap the note a major third above C — 4 keys up", then "Hear it").
- Correct tap: verdigris light + check; the step locks green and the next step opens. Wrong tap: gentle retry with a count hint (e.g. "That's 3 keys — a major third is 4"). Never a hard fail or dead-end.
- Grade taps by pitch class (chroma/MIDI), never by letter-string comparison (locked v2 constraint). Accept the target pitch in the octave(s) shown.

### First Lesson Content — Major vs Minor Third
- Build understanding by contrast: play C, tap the major third (E, +4 semitones), hear it (bright/happy); then tap the minor third (E♭, +3 semitones), hear it (darker/sad). The "aha" is told-then-do (variant A framing).
- Plain-English, beginner-first copy in the Print Shop voice; no jargon dumps.

### Audio (LEARN-02)
- Steps can play their interval/chord using the existing audio engine (`playNote` for single notes, `playChord` for the two-note interval). Respect `soundEnabled()`; with sound off, steps still advance visually (no audio, no error).
- Unlock audio on first interaction via `ensureAudioReady()` (existing pattern).

### Keyboard
- Reuse `PianoKeyboard.svelte` in interactive mode (`onPress`/`onToggle`, interval-color lit keys, `wrongLetters` for gentle wrong feedback). A mini/one-octave keyboard anchored at C for the thirds lesson; must be tap-legible on a phone.

### Drill Handoff (LEARN-03)
- Each lesson ends with an explicit "Try this in a drill →" handoff card that launches the matching beginner drill on `/drills`, seeded to the lesson's focus (thirds / the chords built from them) rather than dropping into a generic session.

### /theory Page Integration
- Introduce the guided interactive lesson as the primary interactive theory surface. Keep the existing static shape lessons accessible as reference — do not remove existing theory content.
- Track step completion within the running lesson (steps lock green). Cross-session lesson-completion state / a lesson map is deferred (variant B).

### Claude's Discretion
- Exact step count and micro-copy for the thirds lesson, the handoff seeding mechanism into the drill session, and how the interactive lesson is placed relative to the existing static lessons are at implementation discretion, following the sketch mock and Print Shop patterns.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/components/PianoKeyboard.svelte` — responsive C-to-C keyboard, interactive/display/inspect modes; props `notes, interactive, selected, onToggle, onPress, octaves, wrongLetters, onInspect`; `InspectPayload` (letter, solfege, octave, interval, inChord).
- `src/lib/audio/audio.ts` — `playNote()` (206), `playChord()` (251), `playArpeggio()` (274), `ensureAudioReady()` (160), `soundEnabled()` (71, localStorage "music-learn:sound").
- `src/lib/components/NoteLabel.svelte`, `IntervalChip.svelte` — dual-name + interval-color primitives.

### Established Patterns
- Interval colors (root/third/fifth/seventh) as the visual language for correct lights.
- Chroma/MIDI grading, never letter strings (v2 locked constraint).
- Print Shop letterpress voice for copy.

### Integration Points
- `src/routes/theory/+page.svelte` — currently static shape lessons (SEVENTH_SHAPES, ANCHOR_CHORDS, SOLFEGE_MAP); the interactive lesson is added here.
- `src/routes/drills/+page.svelte` + `src/lib/practice/session.ts` (`createSession()`, `nextQuestion()`) — the drill handoff target; seed the beginner course from the lesson.
- Keyboards are rendered INLINE per page (the Phase 15 collapsible bottom dock was removed by quick task 260718-iyj on 2026-07-18; `KeyboardDock.svelte`/`dockContext.svelte.ts` are deleted). The lesson uses an inline mini `PianoKeyboard` in interactive mode directly on `/theory` — do NOT reintroduce or register with the removed dock. See [[keyboard-inline-not-docked]].
</code_context>

<specifics>
## Specific Ideas

- Reference mock: `.planning/sketches/012-interactive-theory/` (winner Variant A: guided steps). Steps lock green as you go, next opens, ends on a "Try this in a drill →" handoff card.
- The plain-English + one-action pairing must feel achievable for a true beginner without moving so slowly it bores a returning pianist who reads music.
- Count hints on wrong taps are the gentle-retry mechanism; keep them helpful, not noisy.
</specifics>

<deferred>
## Deferred Ideas

- Variant B: letterpress curriculum index (Intervals → Triads → 7th chords) with done/current/locked marks — the later container for many lessons.
- Variant C: play-first discovery (theory emerges from doing before it is named).
- Lessons beyond major/minor third (triads, 7th chords) — the format should extend to them, but only the thirds lesson ships this phase.
- Cross-session lesson progress persistence and unlock gating.
</deferred>
