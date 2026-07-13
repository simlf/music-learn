---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 3
current_phase_name: On-Screen Drill Loop
status: executing
stopped_at: Phase 8 context gathered
last_updated: "2026-07-13T18:19:22.430Z"
last_activity: 2026-07-13
last_activity_desc: Phase 3 execution started
progress:
  total_phases: 9
  completed_phases: 3
  total_plans: 11
  completed_plans: 11
  percent: 33
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-12)

**Core value:** See a jazz chord symbol and know instantly what to play with the left hand.
**Current focus:** Phase 3 — On-Screen Drill Loop

## Current Position

Phase: 3 (On-Screen Drill Loop) — EXECUTING
Plan: 4 of 4
Status: Ready to execute
Last activity: 2026-07-13 — Phase 3 execution started

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 7
- Average duration: — min
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 4 | - | - |
| 2 | 3 | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01 P01 | 35 min | 3 tasks | 18 files |
| Phase 01 P02 | 25 min | 2 tasks | 7 files |
| Phase 01 P03 | 27min | 3 tasks | 7 files |
| Phase 01 P04 | 22min | 3 tasks | 8 files |
| Phase 02 P01 | 32min | 3 tasks | 5 files |
| Phase 02 P02 | 10min | 3 tasks | 8 files |
| Phase 02 P03 | 18min | 3 tasks | 7 files |
| Phase 03 P01 | 12min | 2 tasks | 4 files |
| Phase 03 P02 | 8min | 2 tasks | 2 files |
| Phase 03 P03 | 22min | 2 tasks | 3 files |
| Phase 03 P04 | 4min | 2 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Chord symbol fluency is the v1 priority (drives Phases 1-5 ordering).
- Both MIDI and on-screen input; on-screen is primary (Phase 3 before MIDI in Phase 4).
- Letters primary, solfège alongside; interval color language applied app-wide from Phase 1.
- Spaced repetition deferred to v1.x; v1 persists raw answer history (Phase 8), no scheduler.
- Backend on user's Oracle server + SQLite for cross-device progress (Phases 8-9).
- [Phase 01]: Vite pinned to 8.1.4; resolve.conditions:['browser'] required for Vitest component tests under SvelteKit — Vite 8.x satisfies all peer ranges (kit, vite-plugin-svelte, tailwind vite plugin, vitest); browser condition fixes lifecycle_function_unavailable in @testing-library/svelte tests
- [Phase 01 P02]: Reference chord matrix generated from tonal's Chord.get output (12 roots x 8 v1 qualities), including legitimate double-flat diminished-seventh spellings, as the correctness proof for THEORY-01/03
- [Phase 01 P02]: ø/ø7 jazz shorthand (half-diminished glyph) both normalize to m7b5 before parsing; ASCII and glyph accidentals normalized at the spellChord input boundary
- [Phase 01 P03]: Two-octave PianoKeyboard span resolves the delegated keyboard-span decision; note-to-key assignment walks ascending from the root rather than matching by letter alone — Naive letter matching over-highlights repeated letters across a two-octave keyboard; caught during Task 3 verification
- [Phase 01 P03]: app.css theme token contract completed additively across Plans 01-03: base palette, interval aliases, on-fill text colors, spacing scale, typography roles — Each plan extends the shared token contract rather than redefining it, per the phase's living design-token baseline
- [Phase 01 P04]: randomChord() draws only from the proven 12-root x 8-quality matrix; tone pinned exact 15.1.22 — Guarantees surprise-me never produces an unrecognized symbol; matches project convention of exact-pinning vetted direct deps
- [Phase 02 P01]: Lookup page reuses showcase's non-blocking showChord pattern verbatim; formulaFor/aliasLine extracted into $lib/lookup/chordPresentation for reuse by Phase 3 drills
- [Phase 02 P02]: Node 22+'s built-in globalThis.localStorage stub shadowed jsdom's implementation in vitest tests; fixed once in vitest-setup.ts by pulling the real implementation off jsdom's internal window — Project-wide fix rather than a per-test workaround; benefits all future localStorage-dependent tests (e.g. Phase 8 persistence)
- [Phase 02 P03]: didYouMean draws candidates from randomChord's exported ROOTS/QUALITY_SUFFIXES matrix; exact-match priority and extension-over-truncation tie-breaking resolve ambiguous Levenshtein ties while still returning null on genuine ambiguity
- [Phase 03 P01]: matchChord compares only chroma (0-11) sets, never MIDI number or spelled-letter strings, so keyboard clicks and future MIDI note-on events share identical grading logic (D-01/D-02/D-03)
- [Phase 03 P01]: pickDistractors reuses matchChord's chroma derivation (via an empty played set) rather than duplicating chroma-extraction logic a second time
- [Phase 03 P01]: Distractor candidates are ordered near-miss-first (same root or same quality as correct answer) before falling back to any other supported symbol, for pedagogical plausibility (D-05)
- [Phase 03 P02]: PianoKeyboard interactive mode is opt-in via interactive/selected/onToggle props; selection state is lifted to the parent (no internal $state), keeping the component a pure display+event surface
- [Phase 03 P02]: Black keys emit their sharp-spelling letter as the canonical onToggle payload; parent maps letter to chroma before matchChord, so either enharmonic spelling resolves correctly
- [Phase 03 P03]: generateQuestion() is redrawn in a loop until a construction question lands (Plan 03 only implements the construction branch)
- [Phase 03 P03]: Black-key letters are queried/toggled by their sharp spelling (D♯, A♯) throughout the drills page, matching PianoKeyboard's Plan 02 onToggle contract
- [Phase 03 P03]: The masthead Drills nav-link e2e test renders +layout.svelte directly with a mocked $app/stores page readable, per the plan's explicit assertion requirement
- [Phase 03 P04]: generateQuestion() is now called directly on load and on every Next, removing Plan 03's construction-only redraw loop entirely; both kinds interleave with no mode toggle per D-06
- [Phase 03 P04]: Identification's wrong-answer reveal renders a ChordGlyph of the correct symbol above the shared keyboard/interval-formula reveal; the You played/Correct diff row stays construction-only
- [Phase 03 P04]: A single recordGrade(correct) helper is shared by checkAnswer (construction) and selectChoice (identification) for score mutation and confirmation/headline variant selection

### Pending Todos

None yet.

### Blockers/Concerns

- ~~Phase 1: Verify tonal.js enharmonic spelling against jazz conventions (F♯ø7, C♯m7)~~ — RESOLVED in 01-02: 96-cell reference chord matrix confirms tonal's spellings match jazz conventions (F♯m7 → C♯ not D♭); ø/ø7 required explicit normalization since tonal doesn't parse the glyph natively.
- Phase 3: Document explicit chord-matching tolerance (voicing/octave/extra-note) before coding — research flag.
- Phase 4: Cross-browser Web MIDI permission/hot-plug behavior needs testing (Chrome/Firefox/Safari) — research flag.

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-07-13T17:51:52.698Z
Stopped at: Phase 8 context gathered
Resume file: .planning/phases/08-progress-streaks/08-CONTEXT.md
