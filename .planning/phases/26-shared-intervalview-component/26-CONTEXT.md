# Phase 26: Shared IntervalView Component - Context

**Gathered:** 2026-07-24
**Status:** Ready for planning
**Mode:** Autonomous — decisions grounded in the approved design doc (`docs/superpowers/specs/2026-07-24-hub-consolidation-design.md`); open sub-details at Claude's discretion.

<domain>
## Phase Boundary

Deliver a single shared `IntervalView` component that renders any resolved chord two ways behind a toggle:
- **Stacked-thirds (default):** bottom-up adjacent gaps between consecutive chord tones, e.g. `Cm7 = root +m3 ♭3 +M3 5 +m3 ♭7`. Mirrors how the left hand physically stacks the chord.
- **Formula:** intervals-from-root, e.g. `Cm7 = R, ♭3, 5, ♭7`.

Embed it in the Lookup page (`/`) as the first consumer (IVW-01, IVW-02, IVW-03 Lookup side). The Learn-side embedding is Phase 28 (LEARN-01) — build the component so a second consumer needs zero changes.

Pure presentation over the chord's existing `tonal`-derived data. NO new theory data, NO schema change. Lookup's existing decode behavior (result card, keyboard, WhyTheseNotes, tap-a-tone-to-inspect) must stay intact (REG-01).

</domain>

<decisions>
## Implementation Decisions

### Component shape & placement
- New `src/lib/components/IntervalView.svelte`, Svelte 5 runes, `Props { chord: ChordResult }` plus optional `onInspectTone?` passthrough (see interaction below).
- Pure derivation lives in a testable module, not the component. The formula side already exists as `formulaFor(chord)` in `src/lib/lookup/chordPresentation.ts`; add a sibling `stackedThirdsFor(chord)` there (same file — cohesive with `formulaFor`, both are chord→interval-readout derivations). Component owns only render + toggle state. This mirrors the house convention (WhyTheseNotes / HintLadder: pure module derives, component renders).
- Stacked-thirds entries computed with the shared engine: for consecutive tones, `intervalBetween(notes[i].letter, notes[i+1].letter)` → the adjacent gap's `IntervalInfo` (`.short` like `m3`, `.longFr` for tooltip/aria). Note chips keep their root-relative `role` (for color); gaps are neutral connective labels (`+m3`).

### View toggle
- Default view = stacked-thirds (per design).
- Toggle = a 2-option segmented control, reusing the existing app toggle affordance/style (cf. `SongFilterToggle` / `LocaleToggle`), labels via i18n.
- Toggle state is component-local (`$state`), resets per component instance; no persistence (out of scope, no schema change).

### Rendering & colors
- Reuse `IntervalChip` for tone chips (keeps the reserved interval color language: root/third/fifth/seventh/second/fourth/sixth by `role`).
- Gap markers (`+m3`) render as neutral mono labels between chips (NOT colored interval chips — they are between-note gaps, not root-relative roles). Horizontal, wrapping layout consistent with the current Lookup formula row and phone widths (keyboards/rows render inline, never docked — house rule).
- Dual naming preserved: letter primary, solfège carried through WITH accidentals (`E♭` → `Mi♭`); `note.solfege` on each tone already carries the accidental after the related-work fix. Surface solfège the same way the current formula row does (tooltip/aria via `longFr`), no regression to the letters-primary rule.

### Lookup integration (REG-01 critical)
- Replace the current inline formula row in `src/routes/+page.svelte` (the `{#each formulaFor(result) …}` block, ~line 377) with `<IntervalView chord={result} … />`. Formula mode must reproduce today's row exactly, then add stacked-thirds + the toggle.
- Preserve the existing tap-a-tone-to-inspect interaction (`inspectFormulaEntry` wires a formula chip click to keyboard inspect). IntervalView must expose that click in formula mode (pass the handler through); decide whether stacked-thirds tone chips are also inspect-clickable — default YES for parity, since each chip still maps to a real chord tone.

### i18n
- All new copy (caption, two toggle labels) added to the message layer with EN + FR parity (enforced by `coverage.test.ts`). No em dashes in copy (house rule). French uses the existing feminine interval diction already in `interval.ts` / `formulaSentence`.

### Claude's Discretion
- Exact toggle markup, DOM structure, and where precisely the pure `stackedThirdsFor` type/shape lives (co-locating with `FormulaEntry` is fine).
- Whether stacked-thirds shows the very first tone as `root`/`R` or as the letter — pick whatever reads cleanest against the design's `root +m3 ♭3 …` example.
- Vertical vs horizontal stack presentation, as long as it stays inline and phone-friendly.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/theory/interval.ts` — `intervalBetween(a,b)`, `intervalFromShort`, `IntervalInfo` (`.short`, `.long`, `.longFr`, `.role`, `.semitones`). The naming engine for both views.
- `src/lib/lookup/chordPresentation.ts` — `formulaFor(chord): FormulaEntry[]` (formula view already done); `formulaSentence`, `displaySymbol`. Add `stackedThirdsFor` here.
- `src/lib/components/IntervalChip.svelte` — colored role chip (`role`, `label`, `longName`). Reuse for tone chips.
- `src/lib/components/IntervalScaffold.svelte` — precedent for rendering a `FormulaEntry[]` row (chips + captions), useful visual reference.
- `src/lib/theory/types.ts` — `ChordResult` (`root`, `notes[]` each with `letter`, `solfege`, `role`), `IntervalRole`.

### Established Patterns
- Pure theory/presentation modules (no DOM/audio/Svelte) with dedicated `*.test.ts`; components stay thin and pass data through.
- Interval color language via CSS custom props on `IntervalChip` — 4 reserved tokens never repurposed.
- i18n via `t()` from `$lib/i18n/locale.svelte`; EN/FR parity gate in `src/lib/i18n/coverage.test.ts`.

### Integration Points
- `src/routes/+page.svelte` (Lookup) — formula row (~L377) + `inspectFormulaEntry` (~L81); `WhyTheseNotes` sits just below and also uses `intervalBetween` (keep consistent spellings/colors).
- Phase 28 (Learn hub) will embed the SAME component as an interval reference block — no second copy.

</code_context>

<specifics>
## Specific Ideas

- Design's canonical examples to honor in tests: `Cm7` stacked = `root +m3 ♭3 +M3 5 +m3 ♭7`; formula = `R, ♭3, 5, ♭7`.
- Stacked pattern is invariant per chord QUALITY (m7 = m3, M3, m3; maj7 = M3, m3, M3; dom7 = M3, m3, m3; ø7 = m3, m3, M3; °7 = m3, m3, m3) — the view doubles as a reusable-shape teacher. Unit tests should cover one chord per quality (maj7/m7/dom7/ø7/°7/triads/extensions) plus accidental carry-through (`E♭`→`Mi♭`).

</specifics>

<deferred>
## Deferred Ideas

- Learn-hub embedding of IntervalView → Phase 28 (LEARN-01). Build shared now, embed there.
- Persisting the user's preferred view (stacked vs formula) across sessions — out of scope (no schema change this milestone).

</deferred>
