---
phase: 02-chord-lookup-companion
plan: 01
subsystem: ui
tags: [svelte5, sveltekit, print-shop, lookup, e2e, vitest]

# Dependency graph
requires:
  - phase: 01-print-shop-foundation-theory-core
    provides: spellChord theory engine, PianoKeyboard/ChordGlyph/IntervalChip/Button components, app.css token contract, rotating error-hint copy, Tone.js hear-it playback
provides:
  - Lookup page as the app's home route (/), replacing the redirect placeholder
  - Persistent Print Shop masthead/nav shell in +layout.svelte (Lookup/Showcase, active-aware)
  - Extracted $lib/lookup/chordPresentation module (formulaFor, aliasLine, FormulaEntry type) shared by the lookup page and reusable by Phase 3 drills
  - Passing e2e coverage for the lookup page's happy path, dual naming, page identity, and non-blocking error behavior
affects: [02-02, 02-03, phase-03-drills]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pure presentation modules under $lib/lookup/* extracted from page components so multiple routes/phases can share chord-formatting logic without Svelte/DOM coupling
    - Masthead active-link detection via $app/stores' page.url.pathname (first route-aware component in the repo)

key-files:
  created:
    - tests/lookup.e2e.test.ts
    - src/lib/lookup/chordPresentation.ts
    - src/lib/lookup/chordPresentation.test.ts
  modified:
    - src/routes/+layout.svelte
    - src/routes/+page.svelte

key-decisions:
  - "Lookup page reuses showcase's exact non-blocking showChord pattern verbatim (last successful result stays rendered; only the hint changes on error) to preserve D-08 across both surfaces."
  - "randomChord/surprise-me intentionally left off the lookup page (showcase-only per 02-CONTEXT.md); lookup page imports only spellChord, pickHint, playChord, and the new chordPresentation helpers."
  - "Masthead nav uses ink underline for active state, never vermilion, per UI-SPEC's reserved-vermilion list (CTA/root/glyph-shadow only)."

patterns-established:
  - "Pattern: extract page-local pure helpers (formulaFor, aliasLine) into $lib/lookup/* rather than duplicating between showcase and production pages, so Phase 3 drills can import the same presentation logic."

requirements-completed: [LOOK-01]

coverage:
  - id: D1
    description: "Typing a supported chord symbol on the home page and pressing Stamp stamps its notes on the keyboard diagram with dual letter/solfège naming and interval colors."
    requirement: "LOOK-01"
    verification:
      - kind: e2e
        ref: "tests/lookup.e2e.test.ts#typing Dm7 and clicking Stamp renders a chord-result with dual naming and interval-colored keys"
        status: pass
      - kind: e2e
        ref: "tests/lookup.e2e.test.ts#typing Cm7 and stamping renders the interval-formula chip labels and dual-named notes"
        status: pass
    human_judgment: false
  - id: D2
    description: "The home page (/) is the lookup page; a persistent Print Shop masthead with Lookup (active) and Showcase nav links wraps every route."
    requirement: "LOOK-01"
    verification:
      - kind: manual_procedural
        ref: "npm run dev; curl localhost:5183/ shows 'Chord lookup' + masthead; curl localhost:5183/showcase shows 'Chord showcase' unchanged"
        status: pass
    human_judgment: true
    rationale: "Active-state nav styling (ink underline, hover/focus states) and visual masthead register are visual/UX judgments not covered by the page-only e2e suite (masthead intentionally excluded from lookup.e2e.test.ts to avoid layout-render coupling, per Task 1's behavior spec)."
  - id: D3
    description: "Unrecognized input surfaces a non-blocking rotating hint and leaves the last successful result rendered."
    requirement: "LOOK-01"
    verification:
      - kind: e2e
        ref: "tests/lookup.e2e.test.ts#stamping a valid chord then an invalid one shows the error bar while keeping the previous result visible"
        status: pass
    human_judgment: false
  - id: D4
    description: "formulaFor and aliasLine extracted into a pure $lib/lookup/chordPresentation module for reuse by the lookup page and future Phase 3 drills; showcase page left untouched."
    verification:
      - kind: unit
        ref: "src/lib/lookup/chordPresentation.test.ts (4 tests: formulaFor label/letter/solfege ordering for Cm7 and Dm7, aliasLine dedup and no-alias behavior)"
        status: pass
    human_judgment: false

duration: 32min
completed: 2026-07-12
status: complete
---

# Phase 2 Plan 1: Lookup Page as App Home Summary

**The home page (/) is now the chord lookup page: type a chord like Dm7 or Cm7, press Stamp, and see the notes stamped on the keyboard with dual letter/solfège naming and interval colors, wrapped in a persistent Print Shop masthead with active-aware Lookup/Showcase nav.**

## Performance

- **Duration:** 32 min
- **Started:** 2026-07-12T23:54:00Z
- **Completed:** 2026-07-12T23:57:21Z
- **Tasks:** 3
- **Files modified:** 5 (2 new tests, 1 new module + its test, 2 modified routes)

## Accomplishments
- Home page (`/`) productizes the Phase 1 `/showcase` engine test into the app's primary chord-lookup surface (LOOK-01 core loop working end to end)
- Persistent masthead/nav shell added to `+layout.svelte`: brand mark + active-aware Lookup/Showcase links, ink underline (no vermilion), wraps every route
- `formulaFor`/`aliasLine` extracted verbatim into a pure `$lib/lookup/chordPresentation` module with co-located unit tests, ready for Phase 3 drills to reuse
- Full e2e coverage (happy path, dual naming, page identity, non-blocking error) added and passing; `/showcase` suite unaffected

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the failing lookup e2e test (RED)** - `9958d54` (test)
2. **Task 2: Extract shared chord presentation helpers** - `24c0fec` (feat)
3. **Task 3: Build the masthead shell and the lookup page (GREEN)** - `f312c22` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `tests/lookup.e2e.test.ts` - Lookup page e2e suite: happy path, dual naming/interval formula, page identity, non-blocking error (masthead intentionally excluded, see code comment)
- `src/lib/lookup/chordPresentation.ts` - Pure `formulaFor`/`aliasLine`/`FormulaEntry` module, extracted from showcase, no Svelte/DOM/audio imports
- `src/lib/lookup/chordPresentation.test.ts` - Co-located unit tests for the extracted module
- `src/routes/+layout.svelte` - Adds the Print Shop masthead/nav shell (brand mark + active-aware Lookup/Showcase links) above `{@render children()}`
- `src/routes/+page.svelte` - Replaces the redirect placeholder with the full lookup page composition (input, Stamp CTA, error bar, empty state with starter chords, chord result with glyph/hear-it/alias-line/keyboard/interval-formula)

## Decisions Made
- Reused showcase's `showChord` non-blocking pattern verbatim on the lookup page to preserve the D-08 invariant (last result stays rendered through a failed submit) exactly.
- Left `randomChord`/"surprise me" off the lookup page entirely (showcase-only per 02-CONTEXT.md); the lookup page's engine surface is intentionally narrower than showcase's dev/test page.
- Masthead active-link state uses an ink underline class, never vermilion, matching the UI-SPEC's reserved-vermilion list (CTA button, glyph shadow, root interval color only).

## Deviations from Plan

None - plan executed exactly as written. One test-authoring correction (not a deviation from the plan's code, but from an incorrect assumption in my own draft test): my initial `chordPresentation.test.ts` assumed `aliasLine(spellChord('C-7'))` would always resolve to `Cm7` first; tonal's `chord.symbol` actually echoes back whichever alias form was typed (`C-7` stays `C-7`, since tonal does not renormalize to one canonical spelling). The extracted `aliasLine` code is a verbatim copy of the working showcase implementation and behaves identically to Phase 1; I corrected the test assertion to match actual (and correct) behavior rather than changing the extracted logic.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- LOOK-01's core loop (type symbol, see notes) is live on the app's home page; Plan 02 (input ergonomics: helper buttons, recent chips) and Plan 03 (did-you-mean suggestion) can now build directly on this lookup page and layout.
- `$lib/lookup/chordPresentation` is available for Plan 02/03 and Phase 3 drills to import without duplicating formula/alias logic.
- No blockers identified.

---
*Phase: 02-chord-lookup-companion*
*Completed: 2026-07-12*
