# Phase 2: Chord Lookup Companion - Context

**Gathered:** 2026-07-12
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — user delegated all decisions to Claude, consistent with Phase 1 direction

<domain>
## Phase Boundary

A chord lookup page the user keeps open at the piano: type any supported chord symbol from a lead sheet and instantly see its notes highlighted on the keyboard diagram with dual letter/solfège naming and interval colors (LOOK-01). This productizes what `/showcase` proved in Phase 1 into the app's primary surface.

In scope: lookup page as app home, app navigation shell (masthead), input ergonomics (speed, phone typing), recent-lookups recall, minimal "did you mean" suggestion on unrecognized input.
Not in scope: drills (Phase 3), voicing suggestions (v2 LOOK-02), equivalent-symbol education display (v2 LOOK-03), persistence backend (Phase 8).

</domain>

<decisions>
## Implementation Decisions

### Page identity & routing
- The lookup page IS the app home page (`/`). Rationale: core value is "at the piano, type symbol, instant answer" — zero navigation friction wins.
- `/showcase` remains as-is: an engine test/dev page. No effort spent evolving or retiring it this phase.
- Add a persistent print-shop masthead/nav shell in `+layout.svelte`: app name plus nav links. Phase 2 ships with Lookup (active) and Showcase; later phases append their routes (Drills, Scales, Lessons, Progress). Keep it one row, letterpress register, mobile-friendly.
- Page framing: the lookup reads like the shop's "catalog counter". Copy voice per Phase 1 D-02..D-05 (warm, witty, no em dashes in app copy, occasional French winks).

### Input speed & typing
- Chord renders on explicit submit (Enter key, Go button, starter-chip click, recent-chip click). No live-render-as-you-type: partial input (C → Cm → Cm7) would stamp wrong intermediate chords and cheapen the stamp beat (D-06/D-07 carried).
- Input is forgiving: trims whitespace, accepts ASCII `#`/`b` and display glyphs `♯`/`♭` (already normalized at the `spellChord` boundary), and accepts lowercase roots (`cm7` → `Cm7`) since phone keyboards default to lowercase. Normalization happens at the UI input boundary, not in the theory engine.
- Two small helper buttons (♯ and ♭) sit next to the input for phone typing; they insert the glyph at the cursor. Desktop users can just type `#`/`b`.
- Input is autofocused on page load. After a result renders, focus returns to the input with content selected (type-over), so the next symbol replaces the old one without manual clearing.

### Mid-song ergonomics
- Layout priority: keyboard diagram is the hero, full-width on phone; chord glyph + interval-formula chips (R/m3/P5/m7 with dual naming) above it. Everything for one chord fits above the fold on a phone in portrait.
- Recent lookups: a chip row of the last 5 distinct looked-up chords, most recent first, clickable to re-stamp. Persisted in `localStorage` (device-local is fine; cross-device history is Phase 8's problem, and drill history is out of scope here).
- Keep the "hear it" synth playback action from Phase 1 (D-11) on the lookup page. Leave "surprise me" (D-10) on `/showcase` only: it is an engine spot-check toy, not a mid-song tool.
- The last successful result stays rendered until replaced. Unrecognized input never clears it (D-08 carried: rotating playful hints in the error bar).

### "Did you mean" suggestion (promoted from Phase 1 deferral)
- On unrecognized input, run a small heuristic against the supported chord matrix (case slips, missing root capitalization, common quality misspellings like `Cmin7`→already aliased, `Cm7b`→`Cm7b5`?, single-character edit distance on the quality token). If exactly one confident candidate emerges, the error bar shows one clickable suggestion in the shop voice (spirit: "NOT IN THE CATALOG. DID YOU MEAN Cm7?"). Clicking it stamps that chord.
- If no confident candidate, fall back to the existing rotating hints. Never show multiple suggestions, never auto-correct silently.
- This is a should-have: if the heuristic balloons during planning, planner may cut it to a stretch task rather than let it delay LOOK-01.

### Claude's Discretion
- Exact masthead wording, nav link labels, and page copy (within D-02..D-05 voice rules, no em dashes).
- Exact recent-chips visual treatment (reuse existing chip/button tokens).
- Whether the Go button is labeled "STAMP", "LOOK UP", or similar (copy register decision).
- How much of the showcase page composition is extracted into shared components vs duplicated — favor extracting a reusable lookup composition so Phase 3 drills can reuse pieces.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/phases/01-print-shop-foundation-theory-core/01-UI-SPEC.md` — Locked visual contract (tokens, interval colors, typography, components). Copy examples inside pre-date the no-em-dash rule; rewrite copy, keep visuals.
- `.planning/phases/01-print-shop-foundation-theory-core/01-CONTEXT.md` — Phase 1 decisions D-01..D-12 (tone, motion, error/empty states) that carry forward app-wide.
- `.planning/REQUIREMENTS.md` — LOOK-01 (this phase); LOOK-02/LOOK-03 explicitly v2.
- `.planning/ROADMAP.md` — Phase 2 success criteria (3 verifiable statements).
- `src/routes/showcase/+page.svelte` — Working reference composition: input → spellChord → keyboard + chips + hear-it + error hints. The lookup page is a productized evolution of this.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/components/PianoKeyboard.svelte` — two-octave keyboard with interval-color highlighting (walks ascending from root).
- `src/lib/components/ChordGlyph.svelte` (stamp animation), `IntervalChip.svelte`, `NoteLabel.svelte`, `Button.svelte`.
- `src/lib/theory/chord.ts` (`spellChord`, alias + accidental normalization), `randomChord.ts`, `solfege.ts`, `types.ts`.
- `src/lib/copy/hints.ts` (rotating error hints), `src/lib/audio/playChord.ts` (Tone.js synth).
- `src/app.css` — complete Print Shop token contract (palette, interval aliases, spacing, typography roles).

### Established Patterns
- Svelte 5 runes (`$state`) for page-local state; theory engine stays pure (no DOM/audio coupling).
- Copy: uppercase mono status register, warm telegram voice, no em dashes.
- Exact-pinned vetted deps; Vitest with browser condition for component tests.

### Integration Points
- `src/routes/+page.svelte` currently a placeholder home — becomes the lookup page.
- `src/routes/+layout.svelte` — masthead/nav shell lands here.
- Showcase page logic (formulaFor, showChord flow) is the blueprint; extract shared pieces into `$lib` so drills (Phase 3) can reuse.

</code_context>

<specifics>
## Specific Ideas

- The lookup should feel like asking the shop clerk at the counter: type, stamp, done. Speed over ceremony.
- Recent chips exist because real songs repeat the same 4-6 chords; re-tap beats re-type.
- Suggestion copy spirit: the shop admits it is stumped but offers its best guess, never scolds.

</specifics>

<deferred>
## Deferred Ideas

- **LOOK-02 left-hand voicing suggestions (shell voicings)** — v2, after lookup proves useful in real practice.
- **LOOK-03 equivalent-symbol display as education layer** — v2; the existing alias confirmation line from showcase may be reused as-is if free, but no new work on it.
- **Fuzzy matching library / multi-suggestion ranking** — only the minimal single-suggestion heuristic ships now.

</deferred>

---

*Phase: 2-chord-lookup-companion*
*Context gathered: 2026-07-12*
