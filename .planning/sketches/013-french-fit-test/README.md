---
sketch: 013
name: french-fit-test
question: "Where does the language toggle live, and does French copy fit the tightest surfaces?"
winner: "A"
tags: [i18n, french, copy, layout]
---
# Sketch 013: French Fit Test

## Design Question
The user wants a French translation, but there is no i18n framework yet and every UI string is English. Before scoping that phase, two things need answering:
1. **Where does the EN/FR toggle live?** In the app bar on every page, or one level down in Settings.
2. **Does French copy fit?** French runs roughly 15 to 25 percent longer than English. Does it survive the tightest Print Shop surfaces (uppercase mono register labels, 12px labels, the 56px serif chord glyph, buttons, nav) without breaking layout?

Key fact this sketch makes visible: chord **symbols** (Cmaj7, F#o7) are language-neutral and never translate, so the serif chord glyph is unaffected. The **words around them** are what grow.

## How to View
open .planning/sketches/013-french-fit-test/index.html

The page opens in French so overflow is visible immediately. Use the top EN/FR switch (and the in-bar toggle in Variant A, the Settings toggle in Variant B) to flip live and watch strings grow and shrink.

## Variants
- **A - Header segmented toggle**: `EN | FR` control top-right of the app bar on every page. Representative drill page rendered in French; toggle flips it live. Shows the toggle competing with the brand and the already-scrolling 6-item nav for narrow bar width.
- **B - Settings-only toggle**: Language moved into a Settings/Profile row. App bar stays clean; changing language is a 3-tap detour. Same French drill page shown once chosen.
- **C - Inline EN/FR stress panel** (the real deliverable): every tight component stacked EN-above / FR-below in fixed Print Shop slots, so overflow is obvious at a glance. Register words, grading buttons, nav items, prompt, primary button, hint sentence, and the untranslated chord symbol.

## What to Look For
- **FONDAMENTALE** (root) is the breaking case: 12 chars vs ROOT's 4. It blows every fixed register slot. Flagged in red. Likely needs an abbreviation (FOND.) or a taller/2-line slot in FR.
- **Grading buttons** in FR ("A revoir", "Difficile") stress the 4-across row; may need smaller type or a 2x2 grid.
- **Nav** ("Exercices", "Theorie") widens the already-scrolling 6-item bar.
- **Chord glyph** stays identical across languages, confirming symbols are safe.
- **Sentences** (prompt, hint) grow but wrap fine; the danger is the fixed-width uppercase mono slots, not prose.
- Toggle placement trade-off: A is always one tap away but eats scarce bar width; B keeps the bar clean but hides the control mid-drill.
