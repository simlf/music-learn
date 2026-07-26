---
phase: 28
slug: learn-hub-theory-scales-explore-interval-reference
status: draft
shadcn_initialized: false
preset: none
created: 2026-07-25
---

# Phase 28 — UI Design Contract

> Visual and interaction contract for the Learn hub (theory + Scales Explore + interval reference) and the additive Scale practice affordance on `/practice`. This is a reuse-heavy phase: nothing below introduces a new visual language. Every token, component, and pattern already exists in the Print Shop design system (locked since Phase 1) and in Phases 26-27. This contract only decides ARRANGEMENT — how existing pieces compose on the new `/learn` surface and where the new affordance sits on `/practice`.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — hand-rolled Print Shop design system (Tailwind v4 tokens in `src/app.css` + bespoke Svelte components), locked since Phase 1. No `components.json`/shadcn present or warranted this deep into a bespoke system; not re-prompted. |
| Component library | none (custom `$lib/components/*`) |
| Icon library | none in use (text/mono-label based UI; no icon set introduced) |
| Font | `--font-sans` (system stack) for body chrome, `--font-serif` (Georgia) for `ChordGlyph` display glyphs, `--font-mono` (Courier New) for labels/registers — all pre-existing, reused verbatim |

---

## Spacing Scale

Declared values (multiples of 4, from `src/app.css` — unchanged, reused):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon/label gaps (IntervalView tone-column internal gap) |
| sm | 8px | Compact spacing (Button gaps, toggle rows) |
| md | 16px | Default element spacing (page padding, section internal gaps) |
| lg | 24px | Section padding (bordered card `py-6`) |
| xl | 32px | Layout gaps (between the 3 Learn parts, `gap-8`≈32px already used on `/theory`) |
| 2xl | 48px | Major section breaks |
| 3xl | 64px | Page-level spacing |

Exceptions: none. The Interval Reference block's 5 stacked sub-rows use `gap-8` (32px, `xl`) between each quality — same value `/theory`'s outer section stack already uses, not a new spacing value.

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Label | 12px | 700 | 1.4 (mono, uppercase, 0.14em tracking) |
| Heading | 20px | 700 | 1.2 |
| Display | 56px | 700 | 1.05 |

All 4 sizes / 2 weights are the existing `--text-*` tokens (`src/app.css`). No new size or weight is introduced. The Interval Reference block's per-quality label (e.g. "MAJ7", "DOM7") uses the existing `text-label font-mono uppercase` pattern identical to every other section eyebrow label on `/theory` and `/scales`.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--color-paper` (#f2ecdd) | Page background |
| Secondary (30%) | `--color-paper-bright` (#faf6ea) | Bordered section cards (`border-ink border-2 bg-paper-bright`) — Theory part, Scale Explore part, Interval Reference part all use this, matching `/theory`/`/scales` card treatment |
| Accent (10%) | `--color-vermilion` (#c8502e) | Reserved for: (1) the Learn hub's single footer handoff CTA ("Go to Practice", `Button` default/primary variant — replaces `/theory`'s current `href="/drills"` footer button now that drills lives at `/practice`); (2) the existing selected/active-toggle convention already established app-wide (`Button variant="primary"` used for the CURRENTLY SELECTED item in a toggle row — tonic picker, seventh-quality picker, IntervalView's stacked/formula toggle). This is pre-existing reuse, not a new accent grant. |
| Destructive | n/a this phase | No destructive actions exist on `/learn` or in the additive `/practice` Scale practice affordance |

Accent reserved for: the Learn hub's one footer CTA button, and the pre-existing selected-toggle-state pattern (tonic buttons, quality-picker buttons, IntervalView's internal view toggle) — never for inert reference chips, gap markers, or IntervalChip tone fills (those already carry the fixed interval-color language: root vermilion / third verdigris / fifth tan / seventh mustard, per DESIGN-02, unchanged).

Interval color language (unchanged, reused): root `--color-root`, third `--color-third`, fifth `--color-fifth`, seventh `--color-seventh` (+ degree-class colors for 2/4/6). No new interval colors.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Learn hub page title | "Learn" |
| Learn hub page subtitle | "Read the theory, explore the major scale, and see how any chord's intervals stack." |
| Part 1 eyebrow label | "Theory" |
| Part 2 eyebrow label | "Scale Explore" |
| Part 2 heading (if a heading is added above the reused Explore body) | "Explore the major scale" |
| Part 3 eyebrow label | "Interval Reference" |
| Part 3 heading | "How every seventh chord stacks" |
| Part 3 intro body | "Five qualities, one repeating pattern of thirds. Compare the gaps below." |
| Part 3 per-quality labels (reuse `/theory`'s `SEVENTH_SHAPES` order/captions) | "MAJ7", "DOM7", "M7", "M7♭5", "DIM7" |
| Learn hub footer CTA | "Go to Practice" (primary/vermilion `Button href="/practice"`, replaces `/theory`'s current drills handoff) |
| Scale practice disclosure toggle (on `/practice`, collapsed by default) | "Scale practice" (ghost `Button`, `aria-expanded`) |
| Scale practice section heading (once expanded) | "Practice a major scale" |
| Scale practice section body | "Pick a tonic, then play its scale ascending and back down." |
| Empty state | n/a — Learn has no empty state (all content is static/reused, always renders); Scale practice affordance has no empty state (reuses `ScaleKeyboardDrill`'s existing, unchanged behavior) |
| Error state | n/a — no new data-fetch paths introduced by this phase |
| Destructive confirmation | n/a — no destructive actions in this phase |

Copy rules carried from project convention: no em dashes (periods/colons only); English source strings shown above are the new message-key values needing FR parity entries in the existing i18n coverage gate (`coverage.test.ts`/`messages.test.ts`), per established Phase 20 pattern — new keys must be registered there like every prior phase's new copy.

---

## Layout Contract (the phase-specific decision)

### `/learn` hub — single sectioned scroll, phone-first

Recommend the **sectioned-scroll** option over an in-page tab set: `/theory` already renders as one long vertical scroll of bordered cards (7 sections), and `/scales` Explore is a single self-contained block. Stitching three self-contained parts into one continuous scroll needs no new interaction chrome, matches the phone-first "keyboards/rows inline, never docked" house rule, and avoids adding a 4th visual grouping mechanism (tabs) on top of the toggle idiom already reserved for Explore/Practice-style mode switches — which does NOT apply here since Learn is Explore-only (no mode toggle to render).

Order (top to bottom, phone-first — most-visited part first per existing nav weight: Theory was the standalone `/theory` entry point, Scale Explore is secondary reading, Interval Reference is the newest/most reference-like part and closes the page):

1. **Theory part** — the extracted theory-lessons body (`TheoryLessons.svelte` per CONTEXT's DRY-extraction decision), rendered byte-identical to `/theory`'s current section sequence (Interactive lesson → Symbol → Sevenths → Anchor chords → Dominant → Diminished → Solfège). No new heading needed above it beyond its own internal headers; give the WHOLE Learn page a light outer eyebrow so a scanning user knows which part they're in: wrap in `<section data-testid="learn-theory">` with a single top label `text-label font-mono uppercase` reading "Theory" before the extracted component, mirroring how `/theory`'s own sections use eyebrow labels.
2. **Scale Explore part** — the extracted `ScaleExplorer.svelte` (tonic row + `ScaleDegreeStrip` + `InspectRegister`, Explore only, no Practice tab, no mode-toggle group). Wrapped identically with a "Scale Explore" eyebrow label above it.
3. **Interval Reference part** — new block (see below), wrapped with "Interval Reference" eyebrow + heading + intro body.

Each of the 3 parts is its own `border-ink bg-paper-bright border-2 px-4 py-6` card (or, if the extracted components already render their own card chrome — they do, `/theory` and `/scales` both wrap in `border-ink bg-paper-bright` — do NOT double-wrap; let each extracted component keep owning its own card exactly as today, and only the NEW Interval Reference part gets a fresh card). Gap between the 3 parts: `gap-8` (32px), matching `/theory`'s existing outer `flex flex-col gap-8` container. Page shell: `<main class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8">` with the same `mx-auto max-w-[42rem]` centering `/theory` already uses — reused verbatim, not redesigned.

Footer: single primary/vermilion `Button href="/practice"` reading "Go to Practice" at the bottom, replacing `/theory`'s current `href="/drills"` footer button (drills now lives at `/practice`) — this is the ONE vermilion accent element on the page.

### Interval Reference block — reusable-shape teacher layout

Render the shared `IntervalView` component **5 times, all simultaneously visible** (not behind a one-at-a-time picker) — because the pedagogical point (LEARN-01, Phase 26 design intent) is comparing the invariant stacked-thirds pattern ACROSS qualities, which requires seeing them side by side, not toggling between them. A picker would hide the very comparison the block exists to teach.

Structure per quality (5 total, in this fixed order, matching `/theory`'s existing `SEVENTH_SHAPES` order and captions so the two teaching surfaces stay mentally aligned): Cmaj7, C7, Cm7, Cm7b5, Cdim7.

Each of the 5 sub-rows:
- Eyebrow-style quality label (`text-label font-mono uppercase`): "MAJ7" / "DOM7" / "M7" / "M7♭5" / "DIM7"
- Inline `ChordGlyph root="C" quality={...}` (serif display glyph, per the locked "reuse ChordGlyph for every chord reveal" convention) — the symbol identity anchor for the row
- `IntervalView chord={spellChord(symbol)}` beneath — `onInspectTone` OMITTED (reference-only, tones render as inert, non-interactive spans per IntervalView's existing gated-prop contract; no tap-to-inspect handoff here, this is Learn not Lookup)

Vertical stack, `gap-8` (32px) between the 5 sub-rows (same value as the outer 3-part stack, no new spacing token). No dividers/rules needed beyond the existing card border and spacing — do not invent a new hairline style.

This gives a phone-first single column: quality label → glyph → interval row → quality label → glyph → interval row × 5, which is scannable by scrolling and lets the user visually confirm "the middle gap is always the different one" (maj7/dom7/m7 share m3-then-M3-ish patterns that shift) without any interaction.

### `/practice` Scale practice affordance (LEARN-02) — additive, minimal, non-competing accent

Additive means: do not touch the existing `pageState` machine (`loading`/`pre-start`/`empty-*`/`reviewing`/`complete`/`error`) — the Scale practice affordance renders as an independent block, always present regardless of `pageState`, mirroring the Phase 25 Calibration section precedent ("renders outside the pageState machine... never depends on the backend stats/streak fetch").

Recommend a **collapsed-by-default disclosure**, not an inline-always-expanded section: `/practice`'s primary job is the one-tap "Start practice" smart session (PRAC-01); a full tonic-picker + 2-octave keyboard sitting permanently expanded above or below that would visually compete with the single-CTA simplicity the Practice hub was just built to achieve in Phase 27. A collapsed ghost-variant `Button` toggle keeps the hub visually quiet until the user wants scale practice specifically.

Placement: below the main `pageState`-driven block (after the `pre-start`/`reviewing`/`complete` card, before `</main>`), so it never displaces or crowds the primary flow, matching the Calibration section's own "renders outside/after the pageState machine" placement precedent.

Contract:
- Collapsed state: one ghost `Button` (`aria-expanded="false"`), label "Scale practice", `min-height: 44px` (existing Button floor, unchanged)
- Expanded state: a `border-ink bg-paper-bright border-2 px-4 py-6` card (same card treatment as every other bordered section app-wide) containing:
  - Heading: "Practice a major scale" (`text-heading font-bold`)
  - Body: "Pick a tonic, then play its scale ascending and back down." (`text-body`)
  - Tonic row: reuse `/scales`' exact tonic-button row markup (`MAJOR_SCALE_ROOTS.map`, `Button variant={root===tonic?'primary':'ghost'}`) — the SAME selected-toggle pattern already established, not a new interaction
  - `ScaleKeyboardDrill {notes} {tonic}` beneath, reused verbatim (same props `/scales`' Practice tab already passes)
- Accent discipline: the tonic row's "currently selected" vermilion fill is the pre-existing selected-toggle convention (see Color section), NOT a second competing primary CTA — `/practice`'s "Start practice" button remains the only true action-CTA vermilion on the page. If both the pre-start card and the expanded Scale practice card are visible at once (user expanded it while also having cards due), there is still only one "verb + noun" primary action per card region, which satisfies "vermilion still reserved for the primary Start CTA" from CONTEXT.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|--------------|
| shadcn official | none | not applicable — no shadcn in this project |
| third-party | none | not applicable |

---

## Component Reuse Inventory (for planner/executor — no net-new visual components)

| Component/module | Source | New use in Phase 28 |
|---|---|---|
| `TheoryLessons.svelte` (extracted per CONTEXT DRY decision) | new file, body lifted verbatim from `src/routes/theory/+page.svelte` | Rendered inside `/learn`'s Theory part; `/theory` becomes a thin wrapper around it |
| `ScaleExplorer.svelte` (extracted per CONTEXT DRY decision) | new file, Explore-only body lifted from `src/routes/scales/+page.svelte` (tonic row + `ScaleDegreeStrip` + `InspectRegister`, no mode toggle, no Practice branch) | Rendered inside `/learn`'s Scale Explore part; `/scales` keeps its own mode toggle wrapping the same extracted piece for Explore |
| `IntervalView.svelte` | Phase 26, unchanged | Instantiated 5× in the new Interval Reference block, `onInspectTone` omitted each time |
| `ChordGlyph.svelte` | existing, unchanged | One per quality row in Interval Reference block |
| `spellChord()` | `$lib/theory/chord.ts`, unchanged | Feeds each of the 5 `ChordResult`s into `IntervalView` |
| `Button.svelte` | existing, unchanged | Footer CTA, Scale practice disclosure toggle, tonic row |
| `ScaleKeyboardDrill.svelte` | existing, unchanged | Reused verbatim inside `/practice`'s expanded Scale practice card |
| `MAJOR_SCALE_ROOTS`, `majorScaleNotes()` | `$lib/theory/scale.ts`, unchanged | Drives the tonic row on both `/learn`'s Scale Explore part and `/practice`'s Scale practice card |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
