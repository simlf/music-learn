# Sketch Manifest

## Design Direction

Print Shop identity (locked by 01-UI-SPEC): letterpress paper/ink palette, zero radius, mono status register, interval color language (root vermilion, third verdigris, fifth tan, seventh mustard) reserved for revealed/correct notes, ink-hatch for selected/pending keys. Sketches explore drill feedback within that contract, phone-first per Phase 9.

## Reference Points

The app itself (src/routes/drills, PianoKeyboard.svelte) — sketches evolve existing surfaces, not greenfield.

## Sketches

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 001 | merged-feedback-keyboard | How does one keyboard show played (gray) + correct (colors) after a wrong answer? | A: Colors + Gray | drills, feedback, keyboard, mobile |
| 002 | scale-tonic-anchored | How should the scale page present so the run reads cleanly and the tonic anchors? | B: Degree strip (proposed) | scales, keyboard, layout, intervals |
| 003 | interval-distance-badge | Where should each key's interval-from-root badge sit? | C floating / A corner split (proposed) | intervals, keyboard, lookup, drills |
| 004 | scale-drill-ascending | How should the play-ascending scale drill show progress and the next step? | A: Degree ladder (proposed) | scales, drills, keyboard, learning |

## Session 2 (2026-07-14): scale + interval surfaces

Sketched three of five user asks; two were logic fixes handled directly (every-keyboard-sounds-on-tap, and forcing the four "Name this chord" options to share the root). Diagnosed the live scale-page issue: fixed C-to-C span strands non-C scales. Winners proposed above, pending user confirmation. 002 (degree strip) has since shipped to the live /scales page.

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 005 | interval-scaffold | How should an always-on interval scaffold appear DURING a drill, and fade as the user levels up? | A: Formula strip (proposed) | drills, intervals, scaffold, learning |
| 006 | interval-song-hooks | How should the opt-in famous-tune interval hook surface (tap to reveal)? | A: Inline expand (proposed) | intervals, mnemonics, ear-training, learning |
| 007 | beginner-onramp | How does a beginner see the easiest course and pick a level without feeling overwhelmed, on the Drills page? | A: Course stepper (proposed) | levels, onboarding, drills, beginner |

## Session 3 (2026-07-14): interval visibility + beginner on-ramp

Locked decisions: always-on interval scaffold that fades with level (005); optional tap-to-reveal famous-tune hooks using a vetted 12-interval table, no cheese (006); beginner start-here course with the level picker moved onto the Drills page, tier NAMES not numbers, advanced tiers hidden/ghosted until reached (007). Built by parallel Sonnet agents, verified in browser by the Opus orchestrator. Winners proposed; 007-A (course stepper) is the strongest "not overwhelmed" default, with 007-B (ladder) as a motivating progress view.

## Session 4 (2026-07-15): playability, audio memory, in-place teaching, your-song chords, theory, i18n

Six user asks from a roadmap sketch pass. Captured constraint: reuse the chord-lookup serif display glyph (`ChordGlyph`, `--font-serif`/`--text-display`) and the `stamp-in` 240ms reveal animation — the user explicitly loves both; propagate into audio reveals and dossiers. French (i18n) is mostly an implementation phase; 013 only fit-tests the visual risk. "Add to roadmap" handled after sketch winners land, via /gsd-phase.

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 008 | keyboard-everywhere | Where does an always-playable keyboard live on pages that already carry content, so every keyboard page is playable? | A: Docked bottom bar | keyboard, layout, global, mobile |
| 009 | hear-the-chord | On FORMULA→BUILD reveal, how does hearing the chord surface (auto/tap/arpeggio) for audio memory? | A: Auto-play + pulse (C arpeggio as study option) | audio, drills, build, reveal, memory |
| 010 | chord-explainer | In Recall, when you meet a chord you don't know (Cdim), how do you get escalating help in place? | A: Hint ladder (C dossier as deepest rung) | recall, hints, teaching, beginner |
| 011 | your-songs-chords | How do chords from your added songs surface + get prioritized app-wide (drills, recall, lookup)? | A: Provenance mark + filter | songs, provenance, drills, motivation |
| 012 | interactive-theory | How do interactive beginner theory lessons look/flow and hand off into first drills? | A: Guided steps (B lesson-map as later container) | theory, lessons, beginner, interactive |
| 013 | french-fit-test | Where does the language toggle live, and does French copy fit the tightest Print Shop surfaces? | A: Header toggle (C stress-panel = the audit) | i18n, french, copy, layout |

## Session 5 (2026-07-20): issue #14 — phone fixes + lookup teaching

Driven by GitHub issue #14 (mobile review blocked, French tab bar too tall, beginner help). Point 3 (recall hints) reuses locked 010-A hint ladder — implementation, not re-sketched. Point 4 diagnosed: `Am7` = A-C-E-G by design (minor third); user expected `Amaj7` = A-C♯-E-G♯ — a casing/teaching gap, not a bug.

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 014 | mobile-review-flow | On phone, how do Révéler + grade actions stay reachable without scrolling? | — | recall, mobile, layout, actions |
| 015 | icon-tab-bar | How does the phone tab bar shrink when French labels overflow? | — | i18n, french, mobile, navigation |
| 016 | lookup-why-panel | How does "why these notes?" teaching appear on lookup (Am7 vs Amaj7)? | — | lookup, teaching, beginner, theory |

**Session 4 winners locked (2026-07-15):** all Variant A. Notes: 008-A docked keyboard is the only treatment that structurally guarantees playability on every keyboard page (drills/recall/scales/theory/lookup). 009 keeps C's arpeggio-then-block as an optional "study" mode. 010 folds C's dossier content into the deepest hint rung. 011 provenance mark travels app-wide + opt-in "From my songs" filter. 012-A guided steps is the first-drill bridge; B lesson-map becomes the container once lessons multiply. 013 ships the EN|FR toggle in the header; C's stress panel is the deliverable audit — register slots must abbreviate long French (FONDAMENTALE, MORCEAUX) or widen. Captured constraint: serif ChordGlyph + stamp-in reveal reused across 008/009/010/011 — locked house reference.
