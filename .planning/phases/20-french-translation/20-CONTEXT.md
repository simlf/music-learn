# Phase 20: French Translation - Context

**Gathered:** 2026-07-18
**Status:** Ready for planning
**Mode:** Autonomous (smart-discuss auto-resolved from sketch 013 winner A + fit audit + success criteria; user away, yolo mode)

<domain>
## Phase Boundary

The entire UI can switch to French via a header EN|FR toggle backed by a real i18n layer, while chord symbols stay language-neutral and no Print Shop surface overflows.

In scope: a header EN|FR toggle that persists; an i18n layer holding every user-facing string as a keyed EN+French translation; and layout fixes for the tight Print Shop surfaces audited in sketch 013 so French renders without overflow.

Out of scope: languages beyond French, a settings-only toggle (variant B), and translating Phase 17 copy (Chord Explainer is not built yet — see deferred).
</domain>

<decisions>
## Implementation Decisions

### Toggle Placement (I18N-01)
- A segmented `EN | FR` control top-right in the app-bar masthead on every page (sketch 013-A). Not settings-only (variant B rejected).
- Persist the choice in localStorage (`music-learn:*` convention); it applies immediately and survives reload. Default EN.
- Chord symbols and the serif ChordGlyph never translate — they are language-neutral.

### i18n Layer (I18N-02)
- Every user-facing string becomes a keyed entry in a typed message catalog with English + French values, replacing loose inline literals.
- Implementation: a lightweight in-repo i18n — a reactive `locale` store (persisted) + typed `en`/`fr` dictionaries + a `t(key)` accessor (a derived store / helper) that is SSR/static-adapter safe and ships minimal JS. Prefer hand-rolled keyed dictionaries over a heavy framework; a small library (e.g. svelte-i18n / inlang Paraglide) is an acceptable substitute only if it stays static-build compatible and does not bloat the bundle. No machine-translation pipeline — French copy is authored by hand in the Print Shop voice.
- Seed interval/French terminology from the `longFr` fields that already exist (`InspectRegister.svelte`, `IntervalChip.svelte`, `chordPresentation.ts` FormulaEntry.longFr).

### Fit Fixes for Tight Surfaces (I18N-03)
- **FONDAMENTALE (root) is the breaking case** — 12 chars vs ROOT's 4, blows every fixed uppercase-mono register slot. Fix: use short forms in the fixed mono register slots in FR (e.g. `FOND.`), or a taller/2-line slot, per the sketch-013 audit. Leverage the existing `longFr` seam plus a short-FR label.
- **Grading buttons** ("À revoir", "Difficile") stress the 4-across row — allow smaller type or a 2×2 grid in FR.
- **Nav** ("Exercices", "Théorie") widens the already-scrolling multi-item bar — accept horizontal scroll and/or abbreviate the longest items.
- **Sentences** (prompt, hint) grow ~15-25% but wrap fine — no fixed-width fix needed; the danger is only the fixed-width uppercase mono slots.

### Translation Coverage
- Translate the stable app surfaces: nav + masthead, Lookup/home, Drills, Build, Recall (grade labels, mode labels), Scales, Songs, Theory, Progress/Settings, plus the copy modules (`src/lib/copy/hints.ts`, `mnemonics.ts`, `streak.ts`) and the interval/register labels.
- Phase 15-19 surfaces are in scope (their copy is now stable). Phase 17 (Chord Explainer) is unbuilt; its strings do not exist yet and are excluded — flagged for a follow-up when 17 lands.

### Claude's Discretion
- The exact i18n module shape (store + dictionary layout, key namespacing), whether long nav items are abbreviated vs scrolled, and the precise short-FR register abbreviations are at implementation discretion, following the sketch-013 audit and Print Shop patterns.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/components/InspectRegister.svelte`, `IntervalChip.svelte`, `src/lib/lookup/chordPresentation.ts` — already carry `longFr` French interval fields: the seed for interval terminology and proof the codebase anticipated FR.
- `src/lib/copy/hints.ts`, `mnemonics.ts`, `streak.ts` — centralized copy modules (Print Shop voice) that must gain FR variants.
- `src/app.css` — Print Shop `@theme` tokens (mono/serif/sans font stacks, interval colors); no webfonts. Fit fixes live against these fixed slots.

### Established Patterns
- Strings are currently hard-coded inline in `.svelte` files and in `/lib/copy/*.ts`; there is **no** existing i18n util, locale store, or `t()` — this phase introduces it.
- Local-first persistence via localStorage keys.
- Serif chord names / mono uppercase metadata split (mono slots are the overflow risk).

### Integration Points
- `src/routes/+layout.svelte` — masthead, `navLinks` array (8 labels: Lookup, Drills, Build, Recall, Scales, Songs, Theory, Progress), "MUSIC LEARN" title, active-state styling. The toggle goes here; nav labels pivot to keyed translations.
- `src/lib/components/RecallSession.svelte` — `GRADES` array (Again/Hard/Good/Easy) and `MODE_LABELS` record — centralize + translate.
- `src/routes/progress/+page.svelte` — Practice Settings copy + toggles (a natural home if a secondary language control is ever wanted, but primary is the header).
- `package.json` — SvelteKit 2.69.2, Svelte 5.56.4, TypeScript ^6, Tailwind 4.3.2; no i18n dependency present.
</code_context>

<specifics>
## Specific Ideas

- Reference mock: `.planning/sketches/013-french-fit-test/` (winner Variant A: header toggle; Variant C stress-panel is the overflow audit / real deliverable spec).
- The page should open correctly in whichever language is chosen; flipping EN|FR updates all copy live. The stress panel confirms symbols stay identical across languages.
- FONDAMENTALE is flagged red in the audit as the must-fix; grading buttons and nav are secondary fit risks.
</specifics>

<deferred>
## Deferred Ideas

- Variant B: settings-only language toggle (a 3-tap detour; rejected in favor of the always-visible header control).
- Translating Phase 17 (Chord Explainer) copy — that phase is not built; revisit its strings once it ships.
- Languages beyond French; any machine-translation/localization automation.
</deferred>
