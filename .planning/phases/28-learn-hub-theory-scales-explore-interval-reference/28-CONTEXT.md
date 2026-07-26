# Phase 28: Learn Hub — Theory + Scales Explore + Interval Reference - Context

**Gathered:** 2026-07-25
**Status:** Ready for planning
**Mode:** Autonomous — grounded in the approved design + a scout of `/theory` and `/scales`.

<domain>
## Phase Boundary

Create a single Learn hub at `/learn` that presents, in one surface: the six shape-first theory lessons (from `/theory`), the Scales "Explore" content (major-scale degrees/intervals from `/scales`), and the shared IntervalView (Phase 26) as an interval reference block. The Scales "Practice" tab (the scale-keyboard drill) leaves Learn and becomes reachable through the Practice hub.

This phase does NOT redirect or delete the old `/theory` and `/scales` routes (Phase 30) and does NOT change persisted schema.

</domain>

<decisions>
## Implementation Decisions

### The Learn hub (LEARN-01)
- New `src/routes/learn/+page.svelte`. One surface presenting three parts: Theory lessons, Scales Explore, and an Interval reference block. Phone-first, keyboards/rows inline (house rule). Use a simple sectioned layout or a small in-page tab set consistent with existing patterns (e.g. the scales Explore/Practice toggle style) — Claude's discretion, keep it minimal.
- **Theory part:** reuse the existing `/theory` lesson content and components verbatim — `ChordExample`, `InteractiveLesson`, `ChordGlyph`, `NoteLabel`, the KEEP-rated mnemonics (`$lib/copy/mnemonics`), and the `SEVENTH_SHAPES` / `ANCHOR_CHORDS` lesson data. Do NOT rewrite the lessons.
- **Scales Explore part:** reuse `ScaleDegreeStrip` + tonic picker + `InspectRegister` exactly as `/scales` Explore renders them. Explore ONLY — no Practice mode toggle in Learn.
- **Interval reference block:** embed the shared `IntervalView` (Phase 26; `{ chord: ChordResult, onInspectTone? }`). Render it for the five representative seventh qualities already in the theory lessons (Cmaj7, C7, Cm7, Cm7b5, Cdim7) so the invariant stacked-thirds pattern per quality reads as a reusable-shape teacher (the design's stated intent). `onInspectTone` may be omitted here (reference, not a drill) — tones stay inert.

### DRY extraction (avoid copy-paste; "only pages move")
- Extract the theory-lesson body into a reusable component (e.g. `TheoryLessons.svelte`) and the scales-Explore body into a component (e.g. `ScaleExplorer.svelte`), then compose both in `/learn`. Prefer having `/theory` and `/scales` render the SAME extracted components (thin wrappers) so there is one source of truth and no duplicated lesson/explorer markup. If full extraction of `/theory` is too large for one plan, at minimum do NOT copy-paste its content into `/learn` — factor the shared piece. Planner decides extraction depth.

### Scales Practice relocation (LEARN-02) — decision
- The Scales "Practice" tab (the `ScaleKeyboardDrill`, tonic-anchored 2-octave keyboard graded by pitch class) is REMOVED from Learn. Learn keeps only Explore.
- It becomes **reachable through the Practice hub** as a distinct, ADDITIVE entry (e.g. a secondary "Scale practice" affordance on `/practice` that opens the scale-keyboard drill for a chosen tonic). It is NOT woven into Phase 27's interleaved hybrid queue — the merged session's five families (name-it/build-it/voicings/intervals/progressions) stay as built; the scale-keyboard drill is a separate practice surface reached from the hub. This satisfies LEARN-02 ("reachable through the Practice hub") without re-touching the risky interleaved queue core. Keep the change to `/practice` additive and small (REG-01 for Phase 27's session).

### Scope / regression
- `/theory` and `/scales` keep working this phase (their redirects to `/learn` are Phase 30). `/learn` is new and standalone.
- REG-01: theory lesson behavior (including its handoff into seeded drills), scale Explore behavior, and the scale-keyboard drill behavior are unchanged — only their location moves.
- REG-02 (tests, formally Phase 31): a render/smoke test for `/learn` (theory lessons present, Explore present, IntervalView reference present), and a test that the scale-keyboard drill is reachable from `/practice`. Full suite + svelte-check stay green.

### Claude's Discretion
- Exact `/learn` layout (single scroll vs. tabbed sections) and the names/shapes of the extracted components.
- The exact affordance for scale practice on `/practice` (inline section vs. a launcher), as long as it is additive and does not alter the interleaved session.
- Which tonic(s) the Learn Explore defaults to (reuse the `/scales` default).

</decisions>

<code_context>
## Existing Code Insights

### Reusable assets
- `src/routes/theory/+page.svelte` — 6 shape-first lessons; data `SEVENTH_SHAPES`, `ANCHOR_CHORDS`; uses `ChordExample`, `InteractiveLesson`, `ChordGlyph`, `NoteLabel`, `$lib/copy/mnemonics`, audio contract. Pure client render, prerender-safe.
- `src/routes/scales/+page.svelte` — Explore|Practice mode toggle. Explore = `ScaleDegreeStrip {notes,tonic,onInspect}` + `InspectRegister`. Practice = `ScaleKeyboardDrill {notes,tonic}`. Explore is default.
- `src/lib/components/IntervalView.svelte` (Phase 26) — `{ chord: ChordResult, onInspectTone? }`; renders stacked-thirds (default) + formula toggle.
- `src/lib/components/ScaleDegreeStrip.svelte`, `ScaleKeyboardDrill.svelte`, `InspectRegister.svelte`, `ChordExample.svelte`, `InteractiveLesson.svelte`.
- `src/lib/theory/chord.ts` `spellChord(symbol)` -> `ChordResult` for feeding IntervalView.

### Established patterns
- Prerender-safe pure client pages; i18n via `t()` with EN/FR parity gate (`coverage.test.ts`, `messages.test.ts` domain list — remember to register any NEW message domain there, as prior phases required).
- Explore/Practice toggle uses Button `variant primary|ghost` + `aria-pressed` (a reusable toggle precedent).

### Integration points
- New `src/routes/learn/+page.svelte`; possibly `src/routes/practice/+page.svelte` (additive scale-practice entry).
- Nav wiring to `/learn` is Phase 30, not here.

</code_context>

<specifics>
## Specific Ideas

- The IntervalView reference doubling as a per-quality shape teacher (maj7 = M3,m3,M3; m7 = m3,M3,m3; dom7 = M3,m3,m3; ø7 = m3,m3,M3; °7 = m3,m3,m3) is the design's explicit intent — render the 5 seventh qualities.
- Keep Learn read/explore-first; any drill handoff (theory lessons already seed drills) keeps its current behavior.

</specifics>

<deferred>
## Deferred Ideas

- Redirecting `/theory` and `/scales` to `/learn` — Phase 30.
- Nav showing the 4 hubs — Phase 30.
- Weaving the scale-keyboard drill INTO the interleaved Practice queue (as a 6th carded/synthetic family) — deferred; kept as a separate reachable surface to protect the Phase 27 queue.
